import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useIntegrations } from '@/hooks/use-supabase';
import { useSyncData, useAwsCredentials, useSyncAwsCredentials } from '@/hooks/use-integrations';
import { useLatestSyncMetrics } from '@/hooks/use-all-sync-data';
import { useCostData } from '@/hooks/use-cost-data';
import { useCostByResource } from '@/hooks/use-cost-by-resource';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft, RefreshCw, Loader2, DollarSign, Server, Zap, Database,
  HardDrive, ShieldAlert, AlertTriangle, CheckCircle2, ArrowRight, Clock, TrendingUp
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useLangPrefix } from '@/hooks/use-lang-prefix';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Helpers ───────────────────────────────────────────
function fmt$(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface ResourceSummary {
  total: number;
  running: number;
  errors: number;
  publicWarnings: number;
}

// ─── Component ─────────────────────────────────────────
export default function AwsIntegrationDetail() {
  const navigate = useNavigate();
  const lp = useLangPrefix();
  const queryClient = useQueryClient();

  // Data sources
  const { data: integrations = [] } = useIntegrations();
  const awsIntegration = integrations.find(i => i.integration_type === 'aws' && i.is_connected);
  const { data: awsCreds } = useAwsCredentials();
  const { data: syncData = [], isLoading: syncLoading } = useSyncData(awsIntegration?.id);
  const { data: allMetrics = [] } = useLatestSyncMetrics();
  const { costByResourceId } = useCostByResource();
  const { totalCost, previousCost } = useCostData(awsCreds?.id, 'monthly');
  const syncAws = useSyncAwsCredentials();
  const [syncing, setSyncing] = useState(false);

  // ─── Derived data ──────────────────────────────────
  const awsMetrics = useMemo(() => allMetrics.filter(m => {
    const meta = m.metadata as Record<string, any> | null;
    return meta?.provider === 'aws';
  }), [allMetrics]);

  const resourcesByCategory = useMemo(() => {
    const cats: Record<string, { items: typeof awsMetrics; summary: ResourceSummary }> = {
      compute: { items: [], summary: { total: 0, running: 0, errors: 0, publicWarnings: 0 } },
      functions: { items: [], summary: { total: 0, running: 0, errors: 0, publicWarnings: 0 } },
      databases: { items: [], summary: { total: 0, running: 0, errors: 0, publicWarnings: 0 } },
      storage: { items: [], summary: { total: 0, running: 0, errors: 0, publicWarnings: 0 } },
    };

    for (const m of awsMetrics) {
      const meta = m.metadata as Record<string, any> | null;
      const type = (meta?.type || '').toUpperCase();
      const status = (meta?.status || '').toLowerCase();
      const isPublic = meta?.publicly_accessible || meta?.public_access;

      let cat = 'compute';
      if (type === 'LAMBDA') cat = 'functions';
      else if (type === 'RDS') cat = 'databases';
      else if (type === 'S3') cat = 'storage';

      cats[cat].items.push(m);
      cats[cat].summary.total++;
      if (status === 'running' || status === 'available' || status === 'active') cats[cat].summary.running++;
      if (meta?.error_rate && meta.error_rate > 5) cats[cat].summary.errors++;
      if (isPublic) cats[cat].summary.publicWarnings++;
    }

    return cats;
  }, [awsMetrics]);

  const totalResources = awsMetrics.length;

  // Security issues
  const securityIssues = useMemo(() => {
    const issues: Array<{ severity: 'critical' | 'warning'; message: string }> = [];
    for (const m of awsMetrics) {
      const meta = m.metadata as Record<string, any> | null;
      if (!meta) continue;
      const type = (meta.type || '').toUpperCase();
      const name = meta.name || m.metric_key;

      if (type === 'S3' && meta.public_access) {
        issues.push({ severity: 'critical', message: `S3 bucket "${name}" is publicly accessible` });
      }
      if (type === 'RDS' && meta.publicly_accessible) {
        issues.push({ severity: 'critical', message: `RDS instance "${name}" is publicly accessible` });
      }
      if (type === 'EC2' && meta.status === 'stopped' && meta.stopped_since) {
        const days = Math.floor((Date.now() - new Date(meta.stopped_since).getTime()) / 86400000);
        if (days > 30) {
          issues.push({ severity: 'warning', message: `EC2 instance "${name}" stopped for ${days} days (potential zombie)` });
        }
      }
    }
    return issues;
  }, [awsMetrics]);

  // Cost breakdown by service
  const costBreakdown = useMemo(() => {
    const byService = new Map<string, number>();
    if (costByResourceId) {
      // Aggregate from cost_by_resource via service grouping in allMetrics
      for (const m of awsMetrics) {
        const meta = m.metadata as Record<string, any> | null;
        const arn = meta?.arn || meta?.url || m.metric_key;
        const cost = costByResourceId.get(arn) || 0;
        const type = (meta?.type || 'Other').toUpperCase();
        const label = type === 'EC2' ? 'EC2 Instances' : type === 'LAMBDA' ? 'Lambda' : type === 'RDS' ? 'RDS' : type === 'S3' ? 'S3' : 'Other';
        byService.set(label, (byService.get(label) || 0) + cost);
      }
    }
    // If no resource-level data, derive from totalCost rough split
    if (byService.size === 0 && totalCost > 0) {
      // Use the cost_by_service data if available — fall back to showing total
      return [{ service: 'All Services', amount: totalCost, percent: 100 }];
    }

    const entries = [...byService.entries()].sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, a]) => s + a, 0) || 1;
    return entries.map(([service, amount]) => ({
      service,
      amount,
      percent: Math.round((amount / total) * 100),
    }));
  }, [awsMetrics, costByResourceId, totalCost]);

  // Cost change %
  const costChange = previousCost > 0 ? Math.round(((totalCost - previousCost) / previousCost) * 100) : 0;

  // Last sync time
  const lastSyncStr = awsCreds?.last_sync_at
    ? formatDistanceToNow(new Date(awsCreds.last_sync_at), { addSuffix: true })
    : awsIntegration?.last_sync
      ? formatDistanceToNow(new Date(awsIntegration.last_sync), { addSuffix: true })
      : 'Never';

  // Sync handler
  const handleSync = async () => {
    if (!awsCreds) return;
    setSyncing(true);
    try {
      await syncAws.mutateAsync(awsCreds.id);
      toast.success('AWS sync completed');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const categoryIcons: Record<string, typeof Server> = {
    compute: Server,
    functions: Zap,
    databases: Database,
    storage: HardDrive,
  };

  const categoryLabels: Record<string, string> = {
    compute: 'Compute',
    functions: 'Functions',
    databases: 'Databases',
    storage: 'Storage',
  };

  const categoryEmojis: Record<string, string> = {
    compute: '💻',
    functions: '⚡',
    databases: '🗄️',
    storage: '🪣',
  };

  // ─── Render ────────────────────────────────────────
  return (
    <AppLayout centered>
      <div className="max-w-5xl animate-fade-in space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${lp}/integrations`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img src="/lovable-uploads/77bc7ad1-714f-4f02-b4b4-490a97f61f9d.png" alt="AWS" className="w-10 h-10 rounded" />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">Amazon Web Services</h1>
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-500 bg-emerald-500/10">
                Connected
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Last sync: {lastSyncStr}</p>
          </div>
          <Button onClick={handleSync} disabled={syncing} className="gap-2">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync now
          </Button>
        </div>

        {/* Section 1 — Account Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Monthly Cost</p>
              <p className="text-3xl font-bold text-foreground mt-1">{fmt$(totalCost)}</p>
              {costChange !== 0 && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${costChange > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                  <TrendingUp className="w-3 h-3" />
                  {costChange > 0 ? '+' : ''}{costChange}% vs last month
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Resources</p>
              <p className="text-3xl font-bold text-foreground mt-1">{totalResources}</p>
              <p className="text-xs text-muted-foreground mt-1">across {Object.values(resourcesByCategory).filter(c => c.summary.total > 0).length} types</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Security Issues</p>
              <p className={`text-3xl font-bold mt-1 ${securityIssues.length > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                {securityIssues.filter(i => i.severity === 'critical').length} critical
              </p>
              {securityIssues.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">need attention</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Last Sync</p>
              <p className="text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
                <Clock className="w-6 h-6 text-muted-foreground" />
                <span className="text-lg">{lastSyncStr}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Section 2 — Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost this month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {costBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cost data available. Run a sync to fetch cost information.</p>
            ) : (
              costBreakdown.map(({ service, amount, percent }) => (
                <div key={service} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-36 truncate">{service}</span>
                  <span className="text-sm font-semibold text-foreground w-20 text-right">{fmt$(amount)}</span>
                  <div className="flex-1">
                    <Progress value={percent} className="h-2" />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">{percent}%</span>
                </div>
              ))
            )}
            <Button
              variant="link"
              className="p-0 h-auto text-sm gap-1"
              onClick={() => navigate(`${lp}/integrations/aws/costs`)}
            >
              View detailed cost explorer <ArrowRight className="w-3 h-3" />
            </Button>
          </CardContent>
        </Card>

        {/* Section 3 — Resources Summary */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Infrastructure</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(['compute', 'functions', 'databases', 'storage'] as const).map(cat => {
              const { summary } = resourcesByCategory[cat];
              const Icon = categoryIcons[cat];
              return (
                <Card
                  key={cat}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`${lp}/cloud-resources?category=${cat}`)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{categoryEmojis[cat]}</span>
                      <span className="text-sm font-semibold text-foreground">{categoryLabels[cat]}</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{summary.total}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {summary.running > 0 && (
                        <span className="text-xs text-emerald-500">{summary.running} running</span>
                      )}
                      {summary.errors > 0 && (
                        <span className="text-xs text-destructive">{summary.errors} error</span>
                      )}
                      {summary.publicWarnings > 0 && (
                        <span className="text-xs text-amber-500">{summary.publicWarnings} public ⚠️</span>
                      )}
                      {summary.total === 0 && (
                        <span className="text-xs text-muted-foreground">No resources</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Section 4 — Security Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Security</CardTitle>
          </CardHeader>
          <CardContent>
            {securityIssues.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">No security issues detected</span>
              </div>
            ) : (
              <div className="space-y-3">
                {securityIssues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {issue.severity === 'critical' ? (
                      <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <span className="text-sm text-foreground">{issue.message}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

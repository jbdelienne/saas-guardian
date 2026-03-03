import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useIntegrations, useServices } from '@/hooks/use-supabase';
import { useAwsCredentials, useSyncAwsCredentials } from '@/hooks/use-integrations';
import { useLatestSyncMetrics } from '@/hooks/use-all-sync-data';
import { useCostData } from '@/hooks/use-cost-data';
import { useCostByResource } from '@/hooks/use-cost-by-resource';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, RefreshCw, Loader2, Server, Zap, Database,
  HardDrive, ShieldAlert, AlertTriangle, CheckCircle2, ArrowRight, Clock, TrendingUp, ExternalLink
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useLangPrefix } from '@/hooks/use-lang-prefix';

// ─── Types ─────────────────────────────────────────────
function fmt$(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface AwsResource {
  id: string;
  name: string;
  type: string; // EC2, LAMBDA, RDS, S3
  status: string;
  detail?: string; // instance type, runtime, engine
  publicIp?: string;
  publiclyAccessible?: boolean;
  publicAccess?: boolean;
  stoppedSince?: string;
}

type ResourceCategory = 'compute' | 'functions' | 'databases' | 'storage';

// ─── Component ─────────────────────────────────────────
export default function AwsIntegrationDetail() {
  const navigate = useNavigate();
  const lp = useLangPrefix();

  // Data sources
  const { data: integrations = [] } = useIntegrations();
  const awsIntegration = integrations.find(i => i.integration_type === 'aws' && i.is_connected);
  const { data: awsCreds } = useAwsCredentials();
  const { data: services = [] } = useServices();
  const { data: syncMetrics = [] } = useLatestSyncMetrics();
  const { costByResourceId } = useCostByResource();
  const { totalCost, previousCost } = useCostData(awsCreds?.id, 'monthly');
  const syncAws = useSyncAwsCredentials();
  const [syncing, setSyncing] = useState(false);

  const CLOUD_TAGS = ['aws', 'ec2', 's3', 'lambda', 'rds'];

  // ─── Extract resources from sync metrics (same as CloudResourcesPage) ──
  const resources = useMemo(() => {
    const res: AwsResource[] = [];
    const seen = new Set<string>();

    // EC2 from sync metrics
    const ec2Detail = syncMetrics.find(m => m.metric_key === 'ec2_instances_detail');
    if (ec2Detail?.metadata) {
      const instances = (ec2Detail.metadata as Record<string, unknown>).instances as Array<{
        id: string; type: string; state: string; name?: string; publicIp?: string; stateTransitionReason?: string;
      }> | undefined;
      if (instances) {
        for (const inst of instances) {
          seen.add(inst.id);
          res.push({
            id: inst.id,
            name: inst.name || inst.id,
            type: 'EC2',
            status: inst.state,
            detail: inst.type,
            publicIp: inst.publicIp,
            stoppedSince: inst.state === 'stopped' ? inst.stateTransitionReason : undefined,
          });
        }
      }
    }

    // Lambda
    const lambdaMetric = syncMetrics.find(m => m.metric_key === 'lambda_total_functions');
    if (lambdaMetric?.metadata) {
      const functions = (lambdaMetric.metadata as Record<string, unknown>).functions as Array<{
        name: string; runtime: string;
      }> | undefined;
      if (functions) {
        for (const fn of functions) {
          seen.add(fn.name);
          res.push({
            id: fn.name,
            name: fn.name,
            type: 'LAMBDA',
            status: 'active',
            detail: fn.runtime,
          });
        }
      }
    }

    // RDS
    const rdsMetric = syncMetrics.find(m => m.metric_key === 'rds_total_instances');
    if (rdsMetric?.metadata) {
      const instances = (rdsMetric.metadata as Record<string, unknown>).instances as Array<{
        id: string; engine: string; status: string; publiclyAccessible?: boolean;
      }> | undefined;
      if (instances) {
        for (const inst of instances) {
          seen.add(inst.id);
          res.push({
            id: inst.id,
            name: inst.id,
            type: 'RDS',
            status: inst.status,
            detail: inst.engine,
            publiclyAccessible: inst.publiclyAccessible,
          });
        }
      }
    }

    // S3
    const s3Metric = syncMetrics.find(m => m.metric_key === 's3_total_buckets');
    if (s3Metric?.metadata) {
      const buckets = (s3Metric.metadata as Record<string, unknown>).buckets as string[] | undefined;
      if (buckets) {
        for (const bucket of buckets) {
          seen.add(bucket);
          res.push({
            id: bucket,
            name: bucket,
            type: 'S3',
            status: 'active',
          });
        }
      }
    }

    return res;
  }, [syncMetrics]);

  // ─── Group by category ─────────────────────────────
  const resourcesByCategory = useMemo(() => {
    const cats: Record<ResourceCategory, AwsResource[]> = {
      compute: [], functions: [], databases: [], storage: [],
    };
    for (const r of resources) {
      if (r.type === 'EC2') cats.compute.push(r);
      else if (r.type === 'LAMBDA') cats.functions.push(r);
      else if (r.type === 'RDS') cats.databases.push(r);
      else if (r.type === 'S3') cats.storage.push(r);
    }
    return cats;
  }, [resources]);

  const totalResources = resources.length;

  // ─── Security issues ───────────────────────────────
  const securityIssues = useMemo(() => {
    const issues: Array<{ severity: 'critical' | 'warning'; message: string }> = [];
    for (const r of resources) {
      if (r.type === 'S3' && r.publicAccess) {
        issues.push({ severity: 'critical', message: `S3 bucket "${r.name}" is publicly accessible` });
      }
      if (r.type === 'RDS' && r.publiclyAccessible) {
        issues.push({ severity: 'critical', message: `RDS instance "${r.name}" is publicly accessible` });
      }
      if (r.type === 'EC2' && r.status === 'stopped' && r.stoppedSince) {
        const match = r.stoppedSince.match(/\((\d{4}-\d{2}-\d{2})/);
        if (match) {
          const days = Math.floor((Date.now() - new Date(match[1]).getTime()) / 86400000);
          if (days > 30) {
            issues.push({ severity: 'warning', message: `EC2 instance "${r.name}" stopped for ${days} days (potential zombie)` });
          }
        }
      }
    }
    return issues;
  }, [resources]);

  // ─── Cost breakdown ────────────────────────────────
  const costBreakdown = useMemo(() => {
    if (totalCost <= 0) return [];
    // Simple: show total as one line if no resource-level data
    return [{ service: 'All Services', amount: totalCost, percent: 100 }];
  }, [totalCost]);

  const costChange = previousCost > 0 ? Math.round(((totalCost - previousCost) / previousCost) * 100) : 0;

  const lastSyncStr = awsCreds?.last_sync_at
    ? formatDistanceToNow(new Date(awsCreds.last_sync_at), { addSuffix: true })
    : awsIntegration?.last_sync
      ? formatDistanceToNow(new Date(awsIntegration.last_sync), { addSuffix: true })
      : 'Never';

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

  const categoryConfig: Record<ResourceCategory, { icon: typeof Server; emoji: string; label: string }> = {
    compute: { icon: Server, emoji: '💻', label: 'Compute' },
    functions: { icon: Zap, emoji: '⚡', label: 'Functions' },
    databases: { icon: Database, emoji: '🗄️', label: 'Databases' },
    storage: { icon: HardDrive, emoji: '🪣', label: 'Storage' },
  };

  function statusBadge(status: string) {
    const s = status.toLowerCase();
    if (['running', 'available', 'active'].includes(s)) {
      return <Badge variant="outline" className="border-emerald-500/50 text-emerald-500 bg-emerald-500/10 text-xs">{status}</Badge>;
    }
    if (s === 'stopped') {
      return <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/10 text-xs">{status}</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }

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
              <p className="text-xs text-muted-foreground mt-1">
                across {Object.values(resourcesByCategory).filter(c => c.length > 0).length} types
              </p>
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
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-lg font-bold text-foreground">{lastSyncStr}</span>
              </div>
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

        {/* Section 3 — Infrastructure with actual resources */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Infrastructure</h2>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => navigate(`${lp}/cloud-resources`)}
            >
              View all <ArrowRight className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-6">
            {(['compute', 'functions', 'databases', 'storage'] as const).map(cat => {
              const items = resourcesByCategory[cat];
              const config = categoryConfig[cat];

              return (
                <div key={cat}>
                  <button
                    className="flex items-center gap-2 mb-3 group cursor-pointer"
                    onClick={() => navigate(`${lp}/cloud-resources?category=${cat}`)}
                  >
                    <span className="text-base">{config.emoji}</span>
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                      {config.label} ({items.length})
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  {items.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {items.map(resource => (
                        <Card key={resource.id} className="hover:border-primary/30 transition-colors">
                          <CardContent className="pt-4 pb-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-foreground text-sm truncate flex-1">{resource.name}</span>
                              {statusBadge(resource.status)}
                            </div>
                            {resource.detail && (
                              <p className="text-xs text-muted-foreground">{resource.detail}</p>
                            )}
                            {resource.publicIp && (
                              <p className="text-xs text-muted-foreground">IP: {resource.publicIp}</p>
                            )}
                            {resource.publiclyAccessible && (
                              <p className="text-xs text-amber-500 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Publicly accessible
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground ml-7 mb-2">No resources</p>
                  )}
                </div>
              );
            })}

            {totalResources === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No resources discovered yet. Run a sync to discover your AWS infrastructure.</p>
              </div>
            )}
          </div>
        </div>

        {/* Section 4 — Security */}
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

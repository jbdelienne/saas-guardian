import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useServices } from '@/hooks/use-supabase';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, Cloud, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { useLatestSyncMetrics } from '@/hooks/use-all-sync-data';

const CLOUD_TAGS = ['aws', 'ec2', 's3', 'lambda', 'rds', 'gcp', 'azure'];

type CostPeriod = 'day' | 'month' | 'year';
const costPeriodLabels: Record<CostPeriod, string> = {
  day: '/jour',
  month: '/mois',
  year: '/an',
};

// Maps AWS Cost Explorer service names to our resource types
const AWS_SERVICE_TYPE_MAP: Record<string, string> = {
  'Amazon Elastic Compute Cloud - Compute': 'EC2',
  'Amazon Elastic Compute Cloud': 'EC2',
  'EC2 - Other': 'EC2',
  'Amazon Simple Storage Service': 'S3',
  'AWS Lambda': 'LAMBDA',
  'Amazon Relational Database Service': 'RDS',
};

function getResourceBaseType(type: string): string {
  // type can be "EC2 (t3.micro)" or "Lambda (nodejs18.x)" etc.
  return type.split(' ')[0].toUpperCase();
}

interface CloudResource {
  id: string;
  name: string;
  arnOrId: string;
  type: string;
  provider: string;
  status: string;
  syncedAt: string;
}

export default function CloudResourcesPage() {
  const { data: services = [], isLoading } = useServices();
  const { t } = useTranslation();
  const [costPeriod, setCostPeriod] = useState<CostPeriod>('month');

  const cloudServices = useMemo(
    () => services.filter(s => s.tags?.some(tag => CLOUD_TAGS.includes(tag))),
    [services],
  );

  const { data: syncMetrics = [] } = useLatestSyncMetrics();

  // Extract cost breakdown from sync metrics (30-day totals from AWS Cost Explorer)
  const costByType = useMemo(() => {
    const map: Record<string, number> = {};
    const costMetric = syncMetrics.find(m => m.metric_key === 'aws_cost_by_service');
    if (costMetric?.metadata) {
      const svcs = (costMetric.metadata as Record<string, unknown>).services as Array<{ service: string; cost: number }> | undefined;
      if (svcs) {
        for (const s of svcs) {
          const mappedType = AWS_SERVICE_TYPE_MAP[s.service];
          if (mappedType) {
            map[mappedType] = (map[mappedType] || 0) + s.cost;
          }
        }
      }
    }
    return map; // 30-day totals per type
  }, [syncMetrics]);

  const cloudResources = useMemo(() => {
    const resources: CloudResource[] = [];
    // Track instance IDs already added from services table to avoid duplicates
    const seenInstanceIds = new Set<string>();

    // Helper: extract instance ID from AWS console URL
    const extractInstanceId = (url: string): string | null => {
      const m = url.match(/instanceId=(i-[a-f0-9]+)/);
      return m ? m[1] : null;
    };

    for (const s of cloudServices) {
      const tags = s.tags || [];
      const type = tags.find(t => ['ec2', 's3', 'lambda', 'rds'].includes(t))?.toUpperCase() || 'Unknown';
      const provider = tags.includes('aws') ? 'AWS' : tags.includes('gcp') ? 'GCP' : tags.includes('azure') ? 'Azure' : 'Cloud';
      const instanceId = extractInstanceId(s.url);
      if (instanceId) seenInstanceIds.add(instanceId);

      // For arnOrId: use extracted instance ID or strip prefix from name
      const arnOrId = instanceId || s.name.replace(/^(EC2|Lambda|RDS|S3)\s+/, '');

      // For name: use the Name tag from sync data if available, otherwise service name
      let displayName = s.name;
      // Try to find a better name from sync metrics
      if (instanceId) {
        const ec2Detail = syncMetrics.find(m => m.metric_key === 'ec2_instances_detail');
        if (ec2Detail?.metadata) {
          const instances = (ec2Detail.metadata as Record<string, unknown>).instances as Array<{ id: string; name?: string }> | undefined;
          const inst = instances?.find(i => i.id === instanceId);
          if (inst?.name) displayName = inst.name;
        }
      }

      resources.push({
        id: s.id,
        name: displayName,
        arnOrId,
        type,
        provider,
        status: s.status,
        syncedAt: s.last_check || s.updated_at,
      });
    }

    // Add resources from sync metrics that aren't already in services table
    for (const m of syncMetrics) {
      if (m.metric_key === 'ec2_instances_detail' && m.metadata) {
        const instances = (m.metadata as Record<string, unknown>).instances as Array<{ id: string; type: string; state: string; name?: string }> | undefined;
        if (instances) {
          for (const inst of instances) {
            if (seenInstanceIds.has(inst.id)) continue;
            seenInstanceIds.add(inst.id);
            resources.push({
              id: `sync-ec2-${inst.id}`,
              name: inst.name || inst.id,
              arnOrId: inst.id,
              type: `EC2 (${inst.type})`,
              provider: 'AWS',
              status: inst.state === 'running' ? 'up' : inst.state === 'stopped' ? 'down' : 'unknown',
              syncedAt: m.synced_at,
            });
          }
        }
      }
      if (m.metric_key === 'lambda_total_functions' && m.metadata) {
        const functions = (m.metadata as Record<string, unknown>).functions as Array<{ name: string; runtime: string }> | undefined;
        if (functions) {
          for (const fn of functions) {
            const lambdaName = `Lambda ${fn.name}`;
            if (cloudServices.some(s => s.name === lambdaName)) continue;
            resources.push({
              id: `sync-lambda-${fn.name}`,
              name: fn.name,
              arnOrId: fn.name,
              type: `Lambda (${fn.runtime})`,
              provider: 'AWS',
              status: 'up',
              syncedAt: m.synced_at,
            });
          }
        }
      }
      if (m.metric_key === 'rds_total_instances' && m.metadata) {
        const instances = (m.metadata as Record<string, unknown>).instances as Array<{ id: string; engine: string; status: string }> | undefined;
        if (instances) {
          for (const inst of instances) {
            const rdsName = `RDS ${inst.id}`;
            if (cloudServices.some(s => s.name === rdsName)) continue;
            resources.push({
              id: `sync-rds-${inst.id}`,
              name: inst.id,
              arnOrId: inst.id,
              type: `RDS (${inst.engine})`,
              provider: 'AWS',
              status: inst.status === 'available' ? 'up' : 'degraded',
              syncedAt: m.synced_at,
            });
          }
        }
      }
      if (m.metric_key === 's3_total_buckets' && m.metadata) {
        const buckets = (m.metadata as Record<string, unknown>).buckets as string[] | undefined;
        if (buckets) {
          for (const bucket of buckets) {
            const s3Name = `S3 ${bucket}`;
            if (cloudServices.some(s => s.name === s3Name)) continue;
            resources.push({
              id: `sync-s3-${bucket}`,
              name: bucket,
              arnOrId: bucket,
              type: 'S3',
              provider: 'AWS',
              status: 'up',
              syncedAt: m.synced_at,
            });
          }
        }
      }
    }

    return resources;
  }, [cloudServices, syncMetrics]);

  // Count resources per base type for cost distribution
  const countByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of cloudResources) {
      const base = getResourceBaseType(r.type);
      counts[base] = (counts[base] || 0) + 1;
    }
    return counts;
  }, [cloudResources]);

  const getResourceCost = (resource: CloudResource): number | null => {
    const baseType = getResourceBaseType(resource.type);
    const total30d = costByType[baseType];
    if (total30d === undefined) return null;
    const count = countByType[baseType] || 1;
    const perResourceMonthly = total30d / count;

    switch (costPeriod) {
      case 'day': return perResourceMonthly / 30;
      case 'month': return perResourceMonthly;
      case 'year': return perResourceMonthly * 12;
    }
  };

  const formatCost = (cost: number | null): string => {
    if (cost === null) return '—';
    if (cost < 0.01) return '< $0.01';
    return `$${cost.toFixed(2)}`;
  };

  const statusConfig: Record<string, { label: string; dotClass: string }> = {
    up: { label: t('services.operational'), dotClass: 'status-dot-up' },
    down: { label: t('services.down'), dotClass: 'status-dot-down' },
    degraded: { label: t('services.degraded'), dotClass: 'status-dot-degraded' },
    unknown: { label: t('services.pending'), dotClass: 'status-dot-unknown' },
  };

  return (
    <AppLayout centered>
      <div className="max-w-6xl animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cloud Resources</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Ressources importées depuis vos cloud providers</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : cloudResources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Cloud className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-2">Aucune ressource cloud importée</p>
            <p className="text-xs text-muted-foreground/70">Connectez un cloud provider depuis l'onglet Intégrations pour voir vos ressources ici.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nom</TableHead>
                  <TableHead>ID / ARN</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium text-xs">
                          Coût ({costPeriodLabels[costPeriod]})
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border z-50">
                        {(Object.keys(costPeriodLabels) as CostPeriod[]).map((p) => (
                          <DropdownMenuItem
                            key={p}
                            onClick={() => setCostPeriod(p)}
                            className={costPeriod === p ? 'bg-accent' : ''}
                          >
                            {costPeriodLabels[p]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableHead>
                  <TableHead>Dernier refresh</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cloudResources.map((resource) => {
                  const status = statusConfig[resource.status] ?? statusConfig.unknown;
                  const cost = getResourceCost(resource);
                  return (
                    <TableRow key={resource.id}>
                      <TableCell className="font-medium text-foreground">{resource.name}</TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                          {resource.arnOrId}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium bg-accent/50 text-accent-foreground px-2 py-0.5 rounded-full">
                          {resource.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">{resource.provider}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={status.dotClass} />
                          <span className="text-xs">{status.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCost(cost)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {resource.syncedAt
                          ? formatDistanceToNow(new Date(resource.syncedAt), { addSuffix: true })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          title="Voir dans la console"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

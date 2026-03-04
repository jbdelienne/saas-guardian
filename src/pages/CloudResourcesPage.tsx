import { useState, useMemo } from 'react';
// layout provided by route
import { useServices } from '@/hooks/use-supabase';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, Cloud, ChevronDown, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import { formatDistanceToNow } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { useLatestSyncMetrics } from '@/hooks/use-all-sync-data';
import { useCostByResource } from '@/hooks/use-cost-by-resource';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const CLOUD_TAGS = ['aws', 'ec2', 's3', 'lambda', 'rds', 'alb', 'cloudfront', 'gcp', 'azure'];

type CostPeriod = 'day' | 'month' | 'year';
const costPeriodLabels: Record<CostPeriod, string> = {
  day: '/jour',
  month: '/mois',
  year: '/an',
};

const AWS_SERVICE_TYPE_MAP: Record<string, string> = {
  'Amazon Elastic Compute Cloud - Compute': 'EC2',
  'Amazon Elastic Compute Cloud': 'EC2',
  'EC2 - Other': 'EC2',
  'Amazon Simple Storage Service': 'S3',
  'AWS Lambda': 'LAMBDA',
  'Amazon Relational Database Service': 'RDS',
  'Elastic Load Balancing': 'ALB',
  'Amazon CloudFront': 'CLOUDFRONT',
};

function getResourceBaseType(type: string): string {
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
  // EC2
  instanceType?: string;
  publicIp?: string;
  stoppedSince?: string;
  // RDS
  storageUsed?: number;
  storageTotal?: number;
  publiclyAccessible?: boolean;
  engine?: string;
  // Lambda
  runtime?: string;
  errorRate?: number;
  invocations24h?: number;
  // S3
  publicAccess?: boolean;
  totalSize?: number;
  // ALB/CloudFront
  requests24h?: number;
  errorRate5xx?: number;
  avgLatency?: number;
}

type ResourceCategory = 'compute' | 'databases' | 'functions' | 'storage' | 'networking';

const categoryLabels: Record<ResourceCategory, string> = {
  compute: 'Compute',
  databases: 'Databases',
  functions: 'Functions',
  storage: 'Storage',
  networking: 'Networking',
};

export default function CloudResourcesPage() {
  const { data: services = [], isLoading } = useServices();
  const { t } = useTranslation();
  const [costPeriod, setCostPeriod] = useState<CostPeriod>('month');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ResourceCategory>('compute');

  const cloudServices = useMemo(
    () => services.filter(s => s.tags?.some(tag => CLOUD_TAGS.includes(tag))),
    [services],
  );

  const { data: syncMetrics = [] } = useLatestSyncMetrics();
  const { costByResourceId } = useCostByResource();
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
    return map;
  }, [syncMetrics]);

  const cloudResources = useMemo(() => {
    const resources: CloudResource[] = [];
    const seenInstanceIds = new Set<string>();

    const extractInstanceId = (url: string): string | null => {
      const m = url.match(/instanceId=(i-[a-f0-9]+)/);
      return m ? m[1] : null;
    };

    for (const s of cloudServices) {
      const tags = s.tags || [];
      const type = tags.find(t => ['ec2', 's3', 'lambda', 'rds', 'alb', 'cloudfront'].includes(t))?.toUpperCase() || 'Unknown';
      const provider = tags.includes('aws') ? 'AWS' : tags.includes('gcp') ? 'GCP' : tags.includes('azure') ? 'Azure' : 'Cloud';
      const instanceId = extractInstanceId(s.url);
      if (instanceId) seenInstanceIds.add(instanceId);

      const arnOrId = instanceId || s.name.replace(/^(EC2|Lambda|RDS|S3|ALB|CLOUDFRONT)\s+/, '');

      let displayName = s.name.replace(/^(EC2|S3|Lambda|RDS|ALB|CLOUDFRONT)\s+/, '');
      if (instanceId) {
        const ec2Detail = syncMetrics.find(m => m.metric_key === 'ec2_instances_detail');
        if (ec2Detail?.metadata) {
          const instances = (ec2Detail.metadata as Record<string, unknown>).instances as Array<{ id: string; name?: string; type?: string; publicIp?: string; state?: string; stateTransitionReason?: string }> | undefined;
          const inst = instances?.find(i => i.id === instanceId);
          if (inst?.name) displayName = inst.name;
          if (inst) {
            resources.push({
              id: s.id,
              name: displayName,
              arnOrId,
              type,
              provider,
              status: s.status,
              syncedAt: s.last_check || s.updated_at,
              instanceType: inst.type,
              publicIp: inst.publicIp,
              stoppedSince: inst.state === 'stopped' ? inst.stateTransitionReason : undefined,
            });
            continue;
          }
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

    // Add from sync metrics
    for (const m of syncMetrics) {
      if (m.metric_key === 'ec2_instances_detail' && m.metadata) {
        const instances = (m.metadata as Record<string, unknown>).instances as Array<{ id: string; type: string; state: string; name?: string; publicIp?: string; stateTransitionReason?: string }> | undefined;
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
              instanceType: inst.type,
              publicIp: inst.publicIp,
              stoppedSince: inst.state === 'stopped' ? inst.stateTransitionReason : undefined,
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
              runtime: fn.runtime,
            });
          }
        }
      }
      if (m.metric_key === 'rds_total_instances' && m.metadata) {
        const instances = (m.metadata as Record<string, unknown>).instances as Array<{ id: string; engine: string; status: string; allocatedStorage?: number; publiclyAccessible?: boolean }> | undefined;
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
              engine: inst.engine,
              storageTotal: inst.allocatedStorage,
              publiclyAccessible: inst.publiclyAccessible,
            });
          }
        }
      }
      if (m.metric_key === 's3_total_buckets' && m.metadata) {
        const buckets = (m.metadata as Record<string, unknown>).buckets as string[] | undefined;
        if (buckets) {
          for (const bucket of buckets) {
            if (cloudServices.some(s => s.name === bucket || s.name === `S3 ${bucket}`)) continue;
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

  // Group resources by category
  const resourcesByCategory = useMemo(() => {
    const groups: Record<ResourceCategory, CloudResource[]> = {
      compute: [], databases: [], functions: [], storage: [], networking: [],
    };
    for (const r of cloudResources) {
      const base = getResourceBaseType(r.type);
      if (base === 'EC2') groups.compute.push(r);
      else if (base === 'RDS') groups.databases.push(r);
      else if (base === 'LAMBDA') groups.functions.push(r);
      else if (base === 'S3') groups.storage.push(r);
      else if (base === 'ALB' || base === 'CLOUDFRONT') groups.networking.push(r);
    }
    return groups;
  }, [cloudResources]);

  const filteredResources = useMemo(() => {
    const list = resourcesByCategory[activeTab];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(r => r.name.toLowerCase().includes(q) || r.arnOrId.toLowerCase().includes(q));
  }, [resourcesByCategory, activeTab, search]);

  const countByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of cloudResources) {
      const base = getResourceBaseType(r.type);
      counts[base] = (counts[base] || 0) + 1;
    }
    return counts;
  }, [cloudResources]);

  type CostResult = { amount: number | null; isExact: boolean };

  const getResourceCost = (resource: CloudResource): CostResult => {
    const exactCost = costByResourceId.get(resource.arnOrId);
    if (exactCost !== undefined) {
      let amount: number;
      switch (costPeriod) {
        case 'day': amount = exactCost / 30; break;
        case 'month': amount = exactCost; break;
        case 'year': amount = exactCost * 12; break;
      }
      return { amount, isExact: true };
    }
    const baseType = getResourceBaseType(resource.type);
    const total30d = costByType[baseType];
    if (total30d === undefined) return { amount: null, isExact: false };
    const count = countByType[baseType] || 1;
    const perResourceMonthly = total30d / count;
    let amount: number;
    switch (costPeriod) {
      case 'day': amount = perResourceMonthly / 30; break;
      case 'month': amount = perResourceMonthly; break;
      case 'year': amount = perResourceMonthly * 12; break;
    }
    return { amount, isExact: false };
  };

  const formatCostDisplay = (cost: CostResult): { text: string; className: string; tooltip?: string } => {
    if (cost.amount === null) return { text: '—', className: 'text-muted-foreground' };
    const formatted = cost.amount < 0.01 ? '< $0.01' : `$${cost.amount.toFixed(2)}`;
    if (cost.isExact) {
      return { text: formatted, className: 'text-foreground' };
    }
    return {
      text: `~${formatted}`,
      className: 'text-muted-foreground',
      tooltip: 'Estimated cost. Enable Resource-level data in AWS Cost Explorer for exact figures.',
    };
  };

  const statusConfig: Record<string, { label: string; dotClass: string }> = {
    up: { label: t('services.operational'), dotClass: 'status-dot-up' },
    down: { label: t('services.down'), dotClass: 'status-dot-down' },
    degraded: { label: t('services.degraded'), dotClass: 'status-dot-degraded' },
    unknown: { label: t('services.pending'), dotClass: 'status-dot-unknown' },
  };

  const CostHeader = () => (
    <TableHead className="text-right">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium text-xs">
            Coût est. ({costPeriodLabels[costPeriod]})
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover border-border z-50">
          {(Object.keys(costPeriodLabels) as CostPeriod[]).map((p) => (
            <DropdownMenuItem key={p} onClick={() => setCostPeriod(p)} className={costPeriod === p ? 'bg-accent' : ''}>
              {costPeriodLabels[p]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </TableHead>
  );

  const CostCell = ({ cost }: { cost: CostResult }) => {
    const display = formatCostDisplay(cost);
    if (!display.tooltip) {
      return <TableCell className={`text-right font-mono text-sm ${display.className}`}>{display.text}</TableCell>;
    }
    return (
      <TableCell className="text-right font-mono text-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`cursor-help ${display.className}`}>{display.text}</span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[220px] text-xs">
              {display.tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
    );
  };

  const StatusCell = ({ status }: { status: string }) => {
    const cfg = statusConfig[status] ?? statusConfig.unknown;
    return (
      <div className="flex items-center gap-2">
        <div className={cfg.dotClass} />
        <span className="text-xs">{cfg.label}</span>
      </div>
    );
  };

  const SecurityBadge = ({ safe, label }: { safe: boolean; label?: string }) => (
    <Badge variant={safe ? 'outline' : 'destructive'} className={`text-xs gap-1 ${safe ? 'border-emerald-500/30 text-emerald-400' : ''}`}>
      {safe ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
      {label ?? (safe ? 'Non' : 'Oui')}
    </Badge>
  );

  const tabCounts = Object.entries(resourcesByCategory).map(([key, list]) => ({ key: key as ResourceCategory, count: list.length }));

  // ── EC2: état + durée + type + IP publique (warning) + coût ──
  const renderEC2Table = () => (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Nom</TableHead>
          <TableHead>État</TableHead>
          <TableHead>Durée</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>IP publique</TableHead>
          <CostHeader />
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredResources.map((r) => {
          const cost = getResourceCost(r);
          const hasPublicIp = !!r.publicIp;
          return (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-foreground">{r.name}</TableCell>
              <TableCell><StatusCell status={r.status} /></TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {r.status === 'down' && r.stoppedSince
                  ? <span className="text-warning flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{r.stoppedSince}</span>
                  : r.syncedAt
                    ? formatDistanceToNow(new Date(r.syncedAt), { addSuffix: true })
                    : '—'}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground font-mono">{r.instanceType || '—'}</TableCell>
              <TableCell>
                {hasPublicIp ? (
                  <span className="text-xs font-mono text-warning flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {r.publicIp}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <CostCell cost={cost} />
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  // ── Lambda: error rate % + invocations 24h + coût ──
  const renderLambdaTable = () => (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Nom</TableHead>
          <TableHead>Error rate</TableHead>
          <TableHead>Invocations (24h)</TableHead>
          <CostHeader />
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredResources.map((r) => {
          const cost = getResourceCost(r);
          return (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-foreground">{r.name}</TableCell>
              <TableCell>
                {r.errorRate !== undefined ? (
                  <span className={`text-xs font-mono ${r.errorRate > 5 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                    {r.errorRate.toFixed(1)}%
                  </span>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground">
                {r.invocations24h !== undefined ? r.invocations24h.toLocaleString() : '—'}
              </TableCell>
              <CostCell cost={cost} />
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  // ── RDS: état + storage % + accès public (critique) + coût ──
  const renderRDSTable = () => (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Nom</TableHead>
          <TableHead>État</TableHead>
          <TableHead>Storage</TableHead>
          <TableHead>Accès public</TableHead>
          <CostHeader />
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredResources.map((r) => {
          const cost = getResourceCost(r);
          const storagePercent = r.storageUsed && r.storageTotal ? Math.round((r.storageUsed / r.storageTotal) * 100) : null;
          const storageAlert = storagePercent !== null && storagePercent >= 80;
          return (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-foreground">{r.name}</TableCell>
              <TableCell><StatusCell status={r.status} /></TableCell>
              <TableCell>
                {storagePercent !== null ? (
                  <span className={`text-xs font-mono ${storageAlert ? 'text-warning font-semibold' : 'text-muted-foreground'}`}>
                    {storageAlert && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                    {storagePercent}%
                  </span>
                ) : r.storageTotal ? (
                  <span className="text-xs text-muted-foreground font-mono">{r.storageTotal} GB</span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {r.publiclyAccessible !== undefined ? (
                  <SecurityBadge safe={!r.publiclyAccessible} label={r.publiclyAccessible ? '⚠️ PUBLIC' : 'Privé'} />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <CostCell cost={cost} />
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  // ── S3: accès public (critique) + taille + coût ──
  const renderS3Table = () => (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Bucket</TableHead>
          <TableHead>Accès public</TableHead>
          <TableHead>Taille</TableHead>
          <CostHeader />
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredResources.map((r) => {
          const cost = getResourceCost(r);
          return (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-foreground">{r.name}</TableCell>
              <TableCell>
                {r.publicAccess !== undefined ? (
                  <SecurityBadge safe={!r.publicAccess} label={r.publicAccess ? '⚠️ PUBLIC' : 'Privé'} />
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground">
                {r.totalSize !== undefined ? `${(r.totalSize / (1024 ** 3)).toFixed(2)} GB` : '—'}
              </TableCell>
              <CostCell cost={cost} />
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  // ── ALB/CloudFront: requests 24h + error rate 5xx + latence ──
  const renderNetworkingTable = () => (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Nom</TableHead>
          <TableHead>Requests (24h)</TableHead>
          <TableHead>Error rate 5xx</TableHead>
          <TableHead>Latence moy.</TableHead>
          <CostHeader />
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredResources.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
              Aucune ressource ALB/CloudFront détectée
            </TableCell>
          </TableRow>
        ) : filteredResources.map((r) => {
          const cost = getResourceCost(r);
          return (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-foreground">{r.name}</TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground">
                {r.requests24h !== undefined ? r.requests24h.toLocaleString() : '—'}
              </TableCell>
              <TableCell>
                {r.errorRate5xx !== undefined ? (
                  <span className={`text-xs font-mono ${r.errorRate5xx > 1 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                    {r.errorRate5xx.toFixed(2)}%
                  </span>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground">
                {r.avgLatency !== undefined
                  ? r.avgLatency > 1000
                    ? `${(r.avgLatency / 1000).toFixed(1)}s`
                    : `${r.avgLatency}ms`
                  : '—'}
              </TableCell>
              <CostCell cost={cost} />
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const renderTable = () => {
    switch (activeTab) {
      case 'compute': return renderEC2Table();
      case 'databases': return renderRDSTable();
      case 'functions': return renderLambdaTable();
      case 'storage': return renderS3Table();
      case 'networking': return renderNetworkingTable();
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground mb-6">Cloud Resources</h1>
      <div className="max-w-6xl mx-auto w-full animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-muted-foreground">Ressources importées depuis vos cloud providers</p>
          <SearchBar value={search} onChange={setSearch} placeholder="Rechercher par nom ou ID…" />
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
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ResourceCategory)}>
            <TabsList className="mb-4">
              {tabCounts.map(({ key, count }) => (
                <TabsTrigger key={key} value={key} className="gap-1.5 text-xs">
                  {categoryLabels[key]}
                  {count > 0 && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold ml-1">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.keys(categoryLabels).map((key) => (
              <TabsContent key={key} value={key}>
                <div className="border border-border rounded-md overflow-hidden bg-card">
                  {renderTable()}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </>
  );
}

import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useServices } from '@/hooks/use-supabase';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, Cloud } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useTranslation } from 'react-i18next';
import { useLatestSyncMetrics } from '@/hooks/use-all-sync-data';

const CLOUD_TAGS = ['aws', 'ec2', 's3', 'lambda', 'rds', 'gcp', 'azure'];

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

  const cloudServices = useMemo(
    () => services.filter(s => s.tags?.some(tag => CLOUD_TAGS.includes(tag))),
    [services],
  );

  const { data: syncMetrics = [] } = useLatestSyncMetrics();

  const cloudResources = useMemo(() => {
    const resources: CloudResource[] = [];

    for (const s of cloudServices) {
      const tags = s.tags || [];
      const type = tags.find(t => ['ec2', 's3', 'lambda', 'rds'].includes(t))?.toUpperCase() || 'Unknown';
      const provider = tags.includes('aws') ? 'AWS' : tags.includes('gcp') ? 'GCP' : tags.includes('azure') ? 'Azure' : 'Cloud';
      resources.push({
        id: s.id,
        name: s.name,
        arnOrId: s.name.replace(/^(EC2|Lambda|RDS|S3)\s+/, ''),
        type,
        provider,
        status: s.status,
        syncedAt: s.last_check || s.updated_at,
      });
    }

    const serviceNames = new Set(cloudServices.map(s => s.name));
    for (const m of syncMetrics) {
      if (m.metric_key === 'ec2_instances_detail' && m.metadata) {
        const instances = (m.metadata as Record<string, unknown>).instances as Array<{ id: string; type: string; state: string; name?: string }> | undefined;
        if (instances) {
          for (const inst of instances) {
            const displayName = inst.name ? `${inst.name} (${inst.id})` : `EC2 ${inst.id}`;
            if (serviceNames.has(displayName)) continue;
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
            const name = `Lambda ${fn.name}`;
            if (serviceNames.has(name)) continue;
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
            const name = `RDS ${inst.id}`;
            if (serviceNames.has(name)) continue;
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
            const name = `S3 ${bucket}`;
            if (serviceNames.has(name)) continue;
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
                  <TableHead>Dernier refresh</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cloudResources.map((resource) => {
                  const status = statusConfig[resource.status] ?? statusConfig.unknown;
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

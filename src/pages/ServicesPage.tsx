import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useServices, useAddService, useDeleteService, useTogglePause, useForceCheck, Service } from '@/hooks/use-supabase';
import AddServiceModal from '@/components/dashboard/AddServiceModal';
import ServiceDetailModal from '@/components/dashboard/ServiceDetailModal';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Pause, Play, ExternalLink, Loader2, ChevronDown, RefreshCw, Cloud, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { UptimePeriod, useUptimeForServices } from '@/hooks/use-uptime';
import { useLatestSyncMetrics } from '@/hooks/use-all-sync-data';
import { toast } from 'sonner';

const periodLabels: Record<UptimePeriod, string> = {
  '24h': '24h',
  '7d': '7 days',
  '30d': '30 days',
  '12m': '12 months',
};

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

export default function ServicesPage() {
  const { data: services = [], isLoading } = useServices();
  const addService = useAddService();
  const deleteService = useDeleteService();
  const togglePause = useTogglePause();
  const forceCheck = useForceCheck();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [uptimePeriod, setUptimePeriod] = useState<UptimePeriod>('12m');
  const { t } = useTranslation();

  // Split services into HTTP (manual) vs Cloud (imported)
  const httpServices = useMemo(
    () => services.filter(s => !s.tags?.some(tag => CLOUD_TAGS.includes(tag))),
    [services],
  );

  const cloudServices = useMemo(
    () => services.filter(s => s.tags?.some(tag => CLOUD_TAGS.includes(tag))),
    [services],
  );

  // Also pull cloud resources from integration_sync_data for richer detail
  const { data: syncMetrics = [] } = useLatestSyncMetrics();

  const cloudResources = useMemo(() => {
    const resources: CloudResource[] = [];

    // From services tagged as cloud
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

    // From sync metrics with detailed metadata (if not already in services)
    const serviceNames = new Set(cloudServices.map(s => s.name));
    for (const m of syncMetrics) {
      if (m.metric_key === 'ec2_instances_detail' && m.metadata) {
        const instances = (m.metadata as Record<string, unknown>).instances as Array<{ id: string; type: string; state: string }> | undefined;
        if (instances) {
          for (const inst of instances) {
            const name = `EC2 ${inst.id}`;
            if (serviceNames.has(name)) continue;
            resources.push({
              id: `sync-ec2-${inst.id}`,
              name,
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

  const serviceIds = httpServices.map((s) => s.id);
  const { data: computedUptimes } = useUptimeForServices(serviceIds, uptimePeriod);

  const getUptime = (service: Service) => {
    if (service.status === 'unknown') return '—';
    if (uptimePeriod === '12m') return `${service.uptime_percentage ?? 0}%`;
    return computedUptimes?.[service.id] !== undefined ? `${computedUptimes[service.id]}%` : '…';
  };

  const statusConfig: Record<string, { label: string; dotClass: string }> = {
    up: { label: t('services.operational'), dotClass: 'status-dot-up' },
    down: { label: t('services.down'), dotClass: 'status-dot-down' },
    degraded: { label: t('services.degraded'), dotClass: 'status-dot-degraded' },
    unknown: { label: t('services.pending'), dotClass: 'status-dot-unknown' },
  };

  const handleAddService = async (svc: { name: string; icon: string; url: string; check_interval: number }) => {
    await addService.mutateAsync(svc);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteService.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <AppLayout centered>
      <div className="max-w-6xl animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('services.title')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t('services.subtitle')}</p>
          </div>
        </div>

        <Tabs defaultValue="http" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="http" className="gap-2">
                <Globe className="w-4 h-4" />
                HTTP Services
              </TabsTrigger>
              <TabsTrigger value="cloud" className="gap-2">
                <Cloud className="w-4 h-4" />
                Cloud Resources
              </TabsTrigger>
            </TabsList>

            <TabsContent value="http" className="mt-0">
              <Button onClick={() => setAddModalOpen(true)} className="gap-2 gradient-primary text-primary-foreground hover:opacity-90">
                <Plus className="w-4 h-4" />
                {t('services.addService')}
              </Button>
            </TabsContent>
          </div>

          {/* ─── HTTP Services Tab ─── */}
          <TabsContent value="http" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : httpServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-muted-foreground mb-4">{t('services.noServices')}</p>
                <Button onClick={() => setAddModalOpen(true)} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" /> {t('services.addService')}
                </Button>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12"></TableHead>
                      <TableHead>{t('services.name')}</TableHead>
                      <TableHead>{t('services.url')}</TableHead>
                      <TableHead>{t('services.status')}</TableHead>
                      <TableHead className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium text-xs">
                              {t('services.uptime')} ({periodLabels[uptimePeriod]})
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-border z-50">
                            {(Object.keys(periodLabels) as UptimePeriod[]).map((p) => (
                              <DropdownMenuItem
                                key={p}
                                onClick={() => setUptimePeriod(p)}
                                className={uptimePeriod === p ? 'bg-accent' : ''}
                              >
                                {periodLabels[p]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableHead>
                      <TableHead className="text-right">{t('services.avgResponse')}</TableHead>
                      <TableHead>{t('services.lastCheck')}</TableHead>
                      <TableHead className="text-right">{t('services.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {httpServices.map((service) => {
                      const status = statusConfig[service.status] ?? statusConfig.unknown;
                      return (
                        <TableRow key={service.id} className="group cursor-pointer" onClick={() => setSelectedService(service)}>
                          <TableCell>
                            <span className="text-lg">{service.icon}</span>
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {service.name}
                            {service.is_paused && (
                              <span className="ml-2 text-[10px] uppercase tracking-wider text-warning font-semibold">{t('services.paused')}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <a
                              href={service.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs max-w-[200px] truncate"
                            >
                              {service.url.replace(/^https?:\/\//, '')}
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </a>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={status.dotClass} />
                              <span className="text-xs">{status.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {getUptime(service)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">
                            {(service.avg_response_time ?? 0) > 0 ? `${service.avg_response_time}ms` : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {service.last_check
                              ? formatDistanceToNow(new Date(service.last_check), { addSuffix: true })
                              : t('services.never')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                title={t('services.forceCheck')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  forceCheck.mutate(service.id, {
                                    onSuccess: () => toast.success(t('services.checkTriggered')),
                                    onError: (err) => toast.error(err.message),
                                  });
                                }}
                                disabled={forceCheck.isPending}
                              >
                                {forceCheck.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                title={service.is_paused ? t('services.resume') : t('services.pause')}
                                onClick={(e) => { e.stopPropagation(); togglePause.mutate({ id: service.id, is_paused: !service.is_paused }); }}
                              >
                                {service.is_paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                title={t('dashboard.delete')}
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(service); }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ─── Cloud Resources Tab ─── */}
          <TabsContent value="cloud" className="mt-0">
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
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                title="Voir dans la console"
                                onClick={() => {
                                  // Find corresponding service to open detail
                                  const svc = cloudServices.find(s => s.id === resource.id);
                                  if (svc) setSelectedService(svc);
                                }}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AddServiceModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onAdd={handleAddService} />

      <ServiceDetailModal
        service={selectedService}
        open={!!selectedService}
        onClose={() => setSelectedService(null)}
        onDelete={(id) => { deleteService.mutateAsync(id); setSelectedService(null); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('services.deleteTitle', { name: deleteTarget?.name })}</AlertDialogTitle>
            <AlertDialogDescription>{t('services.deleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('services.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('dashboard.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

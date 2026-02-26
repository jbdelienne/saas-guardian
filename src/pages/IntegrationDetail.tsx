import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useIntegrations, useUpdateIntegration } from '@/hooks/use-supabase';
import { useSyncData, useAlertThresholds, useUpdateThreshold, useSyncIntegration } from '@/hooks/use-integrations';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, RefreshCw, Loader2, HardDrive, Users, Shield, MessageSquare, Hash, Key, FolderOpen, Trash2, Database, Clock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLangPrefix } from '@/hooks/use-lang-prefix';
import OwnerTagsEditor from '@/components/dashboard/OwnerTagsEditor';

const METRIC_ICONS: Record<string, typeof Users> = {
  users: Users,
  storage: HardDrive,
  drive: HardDrive,
  licenses: Key,
  security: Shield,
  channels: Hash,
  team: MessageSquare,
  shared_drive: FolderOpen,
};

const METRIC_LABELS: Record<string, string> = {
  total_users: 'Utilisateurs totaux',
  active_users: 'Utilisateurs actifs',
  suspended_users: 'Utilisateurs suspendus',
  disabled_users: 'Utilisateurs désactivés',
  inactive_users_30d: 'Inactifs (30j+)',
  deactivated_users: 'Utilisateurs désactivés',
  total_members: 'Membres totaux',
  drive_total_gb: 'Stockage Drive total',
  drive_used_gb: 'Stockage Drive utilisé',
  onedrive_used_gb: 'Stockage OneDrive utilisé',
  total_licenses: 'Licences totales',
  used_licenses: 'Licences utilisées',
  active_licenses: 'Licences actives',
  remaining_licenses: 'Licences restantes',
  mfa_enabled: 'MFA activé',
  mfa_total_users: 'Utilisateurs MFA total',
  mfa_disabled_percent: 'MFA désactivé (%)',
  total_channels: 'Channels totaux',
  archived_channels: 'Channels archivés',
  low_activity_channels: 'Channels peu actifs',
  team_name: 'Nom du workspace',
  drive_quota_total_gb: 'Quota Drive total',
  drive_quota_used_gb: 'Quota Drive utilisé',
  drive_trash_gb: 'Drive corbeille',
  drive_shared_drives_count: 'Drives partagés',
};

const SECTION_LABELS: Record<string, string> = {
  users: 'Utilisateurs',
  storage: 'Stockage',
  drive: 'Google Drive',
  licenses: 'Licences',
  security: 'Sécurité',
  channels: 'Channels',
  team: 'Workspace',
  shared_drive: 'Drives partagés',
};

const PROVIDER_NAMES: Record<string, string> = {
  google: 'Google Workspace',
  microsoft: 'Microsoft 365',
  slack: 'Slack',
};

const PROVIDER_ICONS: Record<string, string> = {
  google: '🔵',
  microsoft: '🟦',
  slack: '💬',
};

export default function IntegrationDetail() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { data: integrations = [] } = useIntegrations();
  const integration = integrations.find((i) => i.integration_type === type && i.is_connected);
  const { data: syncData = [], isLoading: syncLoading } = useSyncData(integration?.id);
  const { data: thresholds = [] } = useAlertThresholds(type);
  const updateThreshold = useUpdateThreshold();
  const syncIntegration = useSyncIntegration();
  const updateIntegration = useUpdateIntegration();
  const { t } = useTranslation();
  const lp = useLangPrefix();

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [syncingDriveIds, setSyncingDriveIds] = useState<Set<string>>(new Set());

  const handleSync = async () => {
    if (!integration) return;
    if (type === 'aws') {
      // AWS uses its own sync edge function, not integration-sync
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        // Fetch the AWS credential ID for this workspace
        const { data: creds } = await supabase.from('aws_credentials').select('id').limit(1).single();
        if (!creds) throw new Error('No AWS credentials found');
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aws-sync?credential_id=${creds.id}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'AWS sync failed');
        }
        queryClient.invalidateQueries({ queryKey: ['sync-data'] });
        queryClient.invalidateQueries({ queryKey: ['integrations'] });
        queryClient.invalidateQueries({ queryKey: ['all-sync-data'] });
        toast.success(t('integrationDetail.syncComplete'));
      } catch (e: any) {
        toast.error(e.message);
      }
      return;
    }
    syncIntegration.mutate(integration.id, {
      onSuccess: () => toast.success(t('integrationDetail.syncComplete')),
      onError: (e) => toast.error(e.message),
    });
  };

  const handleSyncDrive = async (driveId: string, driveName: string) => {
    if (!integration) return;
    setSyncingDriveIds(prev => new Set(prev).add(driveId));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-drive-details?integration_id=${integration.id}&drive_id=${driveId}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!response.ok) throw new Error('Sync failed');
      const data = await response.json();

      if (data.status === 'continuing') {
        toast.info(`"${driveName}" en cours de sync (${data.objectCount.toLocaleString('fr-FR')} objets comptés)...`);
        // Poll until done
        pollDriveSync(driveId, driveName);
      } else {
        toast.success(`"${driveName}" : ${data.objectCount.toLocaleString('fr-FR')} objets`);
        setSyncingDriveIds(prev => { const s = new Set(prev); s.delete(driveId); return s; });
        queryClient.invalidateQueries({ queryKey: ['sync-data'] });
      }
    } catch (e: any) {
      toast.error(`Erreur: ${e.message}`);
      setSyncingDriveIds(prev => { const s = new Set(prev); s.delete(driveId); return s; });
    }
  };

  const pollDriveSync = (driveId: string, driveName: string) => {
    const interval = setInterval(async () => {
      await queryClient.invalidateQueries({ queryKey: ['sync-data'] });
      // Check if still syncing by looking at the data
      const freshData = queryClient.getQueryData<typeof syncData>(['sync-data', integration?.id]);
      const driveRow = freshData?.find(r => r.metric_type === 'shared_drive' && (r.metadata as any)?.drive_id === driveId);
      const meta = (driveRow?.metadata || {}) as Record<string, any>;
      if (!meta.syncing && driveRow && driveRow.metric_value >= 0) {
        clearInterval(interval);
        setSyncingDriveIds(prev => { const s = new Set(prev); s.delete(driveId); return s; });
        toast.success(`"${driveName}" : ${driveRow.metric_value.toLocaleString('fr-FR')} objets`);
      }
    }, 5000);
    // Safety timeout: stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(interval);
      setSyncingDriveIds(prev => { const s = new Set(prev); s.delete(driveId); return s; });
    }, 600000);
  };

  // Group sync data by metric_type, exclude internal types
  const grouped = syncData
    .filter(row => row.metric_type !== 'shared_drive_list')
    .reduce<Record<string, typeof syncData>>((acc, row) => {
      (acc[row.metric_type] = acc[row.metric_type] || []).push(row);
      return acc;
    }, {});

  if (!type) return null;

  return (
    <AppLayout centered>
      <div className="max-w-5xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${lp}/integrations`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-4xl">{PROVIDER_ICONS[type]}</span>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{PROVIDER_NAMES[type]}</h1>
            {integration?.last_sync && (
              <p className="text-xs text-muted-foreground">
                {t('integrationDetail.lastSync', { date: new Date(integration.last_sync).toLocaleString() })}
              </p>
            )}
          </div>
          {integration && (
            <Button onClick={handleSync} disabled={syncIntegration.isPending} className="gap-2">
              {syncIntegration.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {t('integrationDetail.synchronize')}
            </Button>
          )}
        </div>

        {!integration ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground mb-4">{t('integrationDetail.notConnected')}</p>
            <Button onClick={() => navigate(`${lp}/integrations`)}>{t('integrationDetail.backToIntegrations')}</Button>
          </div>
        ) : syncLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : syncData.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground mb-4">{t('integrationDetail.noSyncData')}</p>
            <Button onClick={handleSync} disabled={syncIntegration.isPending} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {t('integrationDetail.syncNow')}
            </Button>
          </div>
        ) : (
          <>
            {/* Owner & Tags */}
            <div className="bg-card border border-border rounded-xl p-4 mb-6">
              <OwnerTagsEditor
                ownerId={(integration as any).owner_id || null}
                tags={(integration as any).tags || []}
                onOwnerChange={(ownerId) => {
                  updateIntegration.mutate({ id: integration.id, owner_id: ownerId }, {
                    onSuccess: () => toast.success('Owner updated'),
                  });
                }}
                onTagsChange={(tags) => {
                  updateIntegration.mutate({ id: integration.id, tags }, {
                    onSuccess: () => toast.success('Tags updated'),
                  });
                }}
              />
            </div>

            {/* Metrics Grid */}
            <div className="space-y-6 mb-10">
              {Object.entries(grouped).map(([metricType, rows]) => {
                const Icon = METRIC_ICONS[metricType] || Users;
                const sectionLabel = SECTION_LABELS[metricType] || metricType;

                // Special rendering for shared drives
                if (metricType === 'shared_drive') {
                  return (
                    <div key={metricType}>
                      <div className="flex items-center gap-2 mb-3">
                        <FolderOpen className="w-4 h-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          {sectionLabel} ({rows.length})
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {rows.map((row) => {
                          const meta = (row.metadata || {}) as Record<string, any>;
                          const objectCount = meta.object_count ?? row.metric_value;
                          const objectLimit = meta.object_limit ?? 500000;
                          const storageGb = meta.storage_used_gb ?? 0;
                          const isPending = objectCount === -1;
                          const isSyncing = objectCount === -2 || syncingDriveIds.has(meta.drive_id);
                          const isDone = objectCount >= 0;
                          const objectPct = isDone ? Math.round((objectCount / objectLimit) * 100) : 0;

                          // Find workspace total quota for the "X Go / Y To" display
                          const quotaTotalRow = syncData.find(r => r.metric_key === 'drive_quota_total_gb');
                          const totalQuotaGb = quotaTotalRow ? Number(quotaTotalRow.metric_value) : 0;
                          const totalQuotaTb = totalQuotaGb >= 1024 ? `${(totalQuotaGb / 1024).toFixed(1)} To` : `${totalQuotaGb} Go`;

                          return (
                            <div key={row.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="w-4 h-4 text-primary" />
                                <span className="font-semibold text-foreground truncate flex-1">{meta.name || row.metric_key}</span>
                                {type === 'google' && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 shrink-0"
                                    disabled={isSyncing}
                                    onClick={() => handleSyncDrive(meta.drive_id, meta.name || row.metric_key)}
                                  >
                                    {isSyncing ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                )}
                              </div>

                              {/* Objects progress bar */}
                              {isSyncing ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Comptage en cours{meta.partial_count ? ` (${meta.partial_count.toLocaleString('fr-FR')} objets)` : ''}...</span>
                                </div>
                              ) : isPending ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>Objets : en attente de sync</span>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>Objets</span>
                                    <span className={objectPct >= 80 ? 'text-destructive font-medium' : ''}>
                                      {objectCount.toLocaleString('fr-FR')} / {objectLimit.toLocaleString('fr-FR')}
                                    </span>
                                  </div>
                                  <Progress value={Math.min(objectPct, 100)} className="h-2" />
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{objectPct}%</p>
                                </div>
                              )}

                              {/* Storage as "X Go / Y To" */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Stockage</span>
                                <span className="text-sm font-semibold text-foreground">
                                  {isDone ? `${storageGb} Go` : '—'} / {totalQuotaTb}
                                </span>
                              </div>

                              {meta.created_time && (
                                <p className="text-[10px] text-muted-foreground">
                                  Créé le {new Date(meta.created_time).toLocaleDateString('fr-FR')}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // Default metric cards
                return (
                  <div key={metricType}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        {sectionLabel}
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {rows.map((row) => (
                        <div key={row.id} className="bg-card border border-border rounded-lg p-4">
                          <p className="text-xs text-muted-foreground mb-1">
                            {METRIC_LABELS[row.metric_key] || row.metric_key}
                          </p>
                          <p className="text-2xl font-bold text-foreground">
                            {row.metric_unit === 'info'
                              ? (row.metadata as any)?.name || '—'
                              : `${Number(row.metric_value).toLocaleString('fr-FR')}${row.metric_unit === 'percent' ? '%' : ''}`}
                          </p>
                          {row.metric_unit !== 'info' && row.metric_unit !== 'percent' && (
                            <p className="text-xs text-muted-foreground mt-1">{row.metric_unit}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Thresholds Config */}
            {thresholds.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">{t('integrationDetail.alertThresholds')}</h2>
                <div className="bg-card border border-border rounded-xl divide-y divide-border">
                  {thresholds.map((t) => (
                    <ThresholdRow key={t.id} threshold={t} onUpdate={updateThreshold.mutate} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function ThresholdRow({
  threshold,
  onUpdate,
}: {
  threshold: {
    id: string;
    label: string | null;
    threshold_value: number;
    severity: string;
    is_enabled: boolean;
    threshold_operator: string;
  };
  onUpdate: (params: { id: string; threshold_value: number; severity: string; is_enabled: boolean }) => void;
}) {
  const [value, setValue] = useState(threshold.threshold_value);
  const [severity, setSeverity] = useState(threshold.severity);
  const [enabled, setEnabled] = useState(threshold.is_enabled);

  const save = () => {
    onUpdate({ id: threshold.id, threshold_value: value, severity, is_enabled: enabled });
    toast.success('Threshold updated');
  };

  return (
    <div className="flex items-center gap-4 p-4 flex-wrap">
      <Switch checked={enabled} onCheckedChange={(v) => { setEnabled(v); }} />
      <span className={`flex-1 text-sm ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
        {threshold.label || threshold.id}
      </span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-20 h-8 text-sm"
          disabled={!enabled}
        />
        <Select value={severity} onValueChange={setSeverity} disabled={!enabled}>
          <SelectTrigger className="w-28 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={save} className="h-8">
          Save
        </Button>
      </div>
    </div>
  );
}

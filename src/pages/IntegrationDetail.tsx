import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useIntegrations } from '@/hooks/use-supabase';
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

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [syncingDrives, setSyncingDrives] = useState(false);

  const handleSync = () => {
    if (!integration) return;
    syncIntegration.mutate(integration.id, {
      onSuccess: () => toast.success('Synchronisation terminée'),
      onError: (e) => toast.error(`Erreur: ${e.message}`),
    });
  };

  const handleSyncDrives = async () => {
    if (!integration) return;
    setSyncingDrives(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-drive-details?integration_id=${integration.id}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!response.ok) throw new Error('Sync failed');
      const data = await response.json();
      const result = data.results?.[0];
      if (result?.status === 'all_fresh') {
        toast.info('Tous les drives sont à jour');
      } else if (result?.drive_name) {
        toast.success(`Drive "${result.drive_name}" synchronisé`);
      }
      queryClient.invalidateQueries({ queryKey: ['sync-data'] });
    } catch (e: any) {
      toast.error(`Erreur: ${e.message}`);
    } finally {
      setSyncingDrives(false);
    }
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
    <AppLayout>
      <div className="max-w-5xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/integrations')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-4xl">{PROVIDER_ICONS[type]}</span>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{PROVIDER_NAMES[type]}</h1>
            {integration?.last_sync && (
              <p className="text-xs text-muted-foreground">
                Dernière sync : {new Date(integration.last_sync).toLocaleString('fr-FR')}
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
              Synchroniser
            </Button>
          )}
        </div>

        {!integration ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground mb-4">Cette intégration n'est pas encore connectée.</p>
            <Button onClick={() => navigate('/integrations')}>Retour aux intégrations</Button>
          </div>
        ) : syncLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : syncData.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground mb-4">Aucune donnée synchronisée. Lancez une première synchronisation.</p>
            <Button onClick={handleSync} disabled={syncIntegration.isPending} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Synchroniser maintenant
            </Button>
          </div>
        ) : (
          <>
            {/* Metrics Grid */}
            <div className="space-y-6 mb-10">
              {Object.entries(grouped).map(([metricType, rows]) => {
                const Icon = METRIC_ICONS[metricType] || Users;
                const sectionLabel = SECTION_LABELS[metricType] || metricType;

                // Special rendering for shared drives
                if (metricType === 'shared_drive') {
                  const syncedCount = rows.filter(r => {
                    const meta = (r.metadata || {}) as Record<string, any>;
                    return !meta.pending && (meta.object_count ?? r.metric_value) >= 0;
                  }).length;
                  const pendingCount = rows.length - syncedCount;

                  return (
                    <div key={metricType}>
                      <div className="flex items-center gap-2 mb-3">
                        <FolderOpen className="w-4 h-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          {sectionLabel} ({rows.length})
                        </h2>
                        {pendingCount > 0 && (
                          <span className="text-xs text-amber-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {pendingCount} en attente
                          </span>
                        )}
                        {type === 'google' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSyncDrives}
                            disabled={syncingDrives}
                            className="ml-auto h-7 text-xs gap-1"
                          >
                            {syncingDrives ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            Sync drives
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {rows.map((row) => {
                          const meta = (row.metadata || {}) as Record<string, any>;
                          const objectCount = meta.object_count ?? row.metric_value;
                          const objectLimit = meta.object_limit ?? 400000;
                          const storageGb = meta.storage_used_gb ?? 0;
                          const isPending = meta.pending || objectCount < 0;
                          const partialCount = meta.object_count_partial;
                          const isPartial = isPending && partialCount > 0;
                          const displayCount = isPartial ? partialCount : objectCount;
                          const objectPct = isPending && !isPartial ? 0 : Math.round((displayCount / objectLimit) * 100);

                          return (
                            <div key={row.id} className={`bg-card border rounded-lg p-4 space-y-3 ${isPending ? 'border-dashed border-amber-500/30' : 'border-border'}`}>
                              <div className="flex items-center gap-2">
                                <FolderOpen className={`w-4 h-4 ${isPending ? 'text-amber-500' : 'text-primary'}`} />
                                <span className="font-semibold text-foreground truncate">{meta.name || row.metric_key}</span>
                                {isPending && <Loader2 className="w-3 h-3 text-amber-500 ml-auto animate-spin" />}
                              </div>

                              {isPending && !isPartial ? (
                                <p className="text-xs text-amber-500">En attente de synchronisation...</p>
                              ) : (
                                <>
                                  <div>
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                      <span>Objets</span>
                                      <span className={objectPct >= 80 ? 'text-destructive font-medium' : ''}>
                                        {isPartial ? '~' : ''}{displayCount.toLocaleString('fr-FR')} / {objectLimit.toLocaleString('fr-FR')}
                                        {isPartial && <span className="text-amber-500 ml-1">(en cours...)</span>}
                                      </span>
                                    </div>
                                    <Progress value={Math.min(objectPct, 100)} className="h-2" />
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{isPartial ? '~' : ''}{objectPct}%</p>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Stockage</span>
                                    <span className="text-sm font-semibold text-foreground">
                                      {isPartial ? '~' : ''}{isPartial ? meta.storage_used_gb_partial || storageGb : storageGb} GB
                                    </span>
                                  </div>
                                </>
                              )}

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
                <h2 className="text-lg font-semibold text-foreground mb-4">⚙️ Seuils d'alertes</h2>
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
    toast.success('Seuil mis à jour');
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
          Sauver
        </Button>
      </div>
    </div>
  );
}

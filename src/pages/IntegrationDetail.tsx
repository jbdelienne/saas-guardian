import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useIntegrations } from '@/hooks/use-supabase';
import { useSyncData, useAlertThresholds, useUpdateThreshold, useSyncIntegration } from '@/hooks/use-integrations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, RefreshCw, Loader2, HardDrive, Users, Shield, MessageSquare, Hash, Key } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const METRIC_ICONS: Record<string, typeof Users> = {
  users: Users,
  storage: HardDrive,
  licenses: Key,
  security: Shield,
  channels: Hash,
  team: MessageSquare,
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

  const handleSync = () => {
    if (!integration) return;
    syncIntegration.mutate(integration.id, {
      onSuccess: () => toast.success('Synchronisation terminée'),
      onError: (e) => toast.error(`Erreur: ${e.message}`),
    });
  };

  // Group sync data by metric_type
  const grouped = syncData.reduce<Record<string, typeof syncData>>((acc, row) => {
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
                return (
                  <div key={metricType}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        {metricType}
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {rows.map((row) => (
                        <div
                          key={row.id}
                          className="bg-card border border-border rounded-lg p-4"
                        >
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

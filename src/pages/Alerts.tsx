import AppLayout from '@/components/layout/AppLayout';
import { useAlerts, useDismissAlert, Alert } from '@/hooks/use-supabase';
import { useNotificationSettings, useUpsertNotificationSettings } from '@/hooks/use-integrations';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Loader2, ChevronDown, ChevronUp, ExternalLink, Clock, Globe, Hash, Timer, Zap, Bell, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

const severityConfig: Record<string, { icon: typeof AlertCircle; dotClass: string; badgeBg: string; badgeText: string }> = {
  critical: { icon: AlertCircle, dotClass: 'bg-destructive', badgeBg: 'bg-destructive/10', badgeText: 'text-destructive' },
  warning: { icon: AlertTriangle, dotClass: 'bg-warning', badgeBg: 'bg-warning/10', badgeText: 'text-warning' },
  info: { icon: Info, dotClass: 'bg-info', badgeBg: 'bg-info/10', badgeText: 'text-info' },
};

type FilterTab = 'active_downtimes' | 'all' | 'critical' | 'warning' | 'dismissed' | 'channels';

function isActiveDowntime(alert: Alert): boolean {
  if (alert.alert_type !== 'downtime' || alert.is_dismissed) return false;
  const meta = alert.metadata as Record<string, any> | null;
  return !meta?.resolved_at;
}

function isResolvedDowntime(alert: Alert): boolean {
  if (alert.alert_type !== 'downtime') return false;
  const meta = alert.metadata as Record<string, any> | null;
  return !!meta?.resolved_at;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function Alerts() {
  const { data: alerts = [], isLoading } = useAlerts();
  const dismissAlert = useDismissAlert();
  const { data: notifSettings } = useNotificationSettings();
  const upsertNotif = useUpsertNotificationSettings();
  const [filter, setFilter] = useState<FilterTab>('active_downtimes');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [minSeverity, setMinSeverity] = useState('warning');
  const [slackUrl, setSlackUrl] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    if (notifSettings) {
      setEmailEnabled(notifSettings.email_enabled);
      setMinSeverity(notifSettings.min_severity);
      setSlackUrl(notifSettings.slack_webhook_url || '');
    }
  }, [notifSettings]);

  const activeDowntimes = alerts.filter(isActiveDowntime);

  const filtered = alerts.filter((a) => {
    if (filter === 'channels') return false;
    if (filter === 'active_downtimes') return isActiveDowntime(a);
    if (filter === 'dismissed') return a.is_dismissed;
    if (filter === 'all') return !a.is_dismissed && !isActiveDowntime(a);
    if (filter === 'critical') return a.severity === 'critical' && !isActiveDowntime(a);
    if (filter === 'warning') return a.severity === 'warning' && !isActiveDowntime(a);
    return false;
  });

  const activeCount = alerts.filter((a) => !a.is_dismissed).length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && !isActiveDowntime(a)).length;
  const warningCount = alerts.filter((a) => a.severity === 'warning' && !isActiveDowntime(a)).length;
  const dismissedCount = alerts.filter((a) => a.is_dismissed && !isResolvedDowntime(a)).length;

  const tabs: { key: FilterTab; label: string; count?: number; icon?: typeof Bell }[] = [
    { key: 'active_downtimes', label: t('alerts.activeDowntimes'), count: activeDowntimes.length },
    { key: 'all', label: t('alerts.all') },
    { key: 'critical', label: t('alerts.critical'), count: criticalCount },
    { key: 'warning', label: t('alerts.warning'), count: warningCount },
    { key: 'dismissed', label: t('alerts.dismissed'), count: dismissedCount },
    { key: 'channels', label: t('alerts.channels', { defaultValue: 'Channels' }), icon: Bell },
  ];

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <AppLayout centered>
      <div className="max-w-3xl animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">{t('alerts.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('alerts.activeAlerts', { count: activeCount })}</p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                filter === tab.key
                  ? tab.key === 'active_downtimes'
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.key === 'active_downtimes' && <Zap className="w-3.5 h-3.5" />}
              {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  filter === tab.key
                    ? 'bg-white/20'
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {filter === 'channels' ? (
          <div className="space-y-4">
            {/* Email notifications */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Email Notifications</h3>
                  <p className="text-xs text-muted-foreground">Receive alerts by email</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Enable email alerts</Label>
                <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Minimum severity</Label>
                <Select value={minSeverity} onValueChange={setMinSeverity}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Slack */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Slack</h3>
                  <p className="text-xs text-muted-foreground">Post alerts to a Slack channel via webhook</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Webhook URL</Label>
                <Input
                  placeholder="https://hooks.slack.com/services/..."
                  value={slackUrl}
                  onChange={(e) => setSlackUrl(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="gradient-primary text-primary-foreground hover:opacity-90"
              onClick={() => {
                upsertNotif.mutate({
                  email_enabled: emailEnabled,
                  min_severity: minSeverity,
                  slack_webhook_url: slackUrl || null,
                }, {
                  onSuccess: () => toast.success(t('alerts.channelsSaved', { defaultValue: 'Notification settings saved' })),
                  onError: (err) => toast.error(err.message),
                });
              }}
              disabled={upsertNotif.isPending}
            >
              {upsertNotif.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save settings
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success" />
            <p className="font-medium text-foreground">
              {filter === 'active_downtimes' ? t('alerts.noActiveDowntimes') : t('alerts.allOperational')}
            </p>
            <p className="text-sm mt-1">
              {filter === 'active_downtimes' ? t('alerts.allServicesUp') : t('alerts.noAlerts')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Active downtimes banner */}
            {filter === 'active_downtimes' && filtered.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <Zap className="w-4 h-4" />
                  {t('alerts.downtimeBanner', { count: filtered.length })}
                </div>
              </div>
            )}

            {filtered.map((alert) => {
              const config = severityConfig[alert.severity] ?? severityConfig.info;
              const Icon = config.icon;
              const isExpanded = expandedId === alert.id;
              const meta = alert.metadata as Record<string, any> | null;
              const isOngoingDowntime = isActiveDowntime(alert);

              // Calculate ongoing duration for active downtimes
              const ongoingMin = isOngoingDowntime
                ? Math.round((Date.now() - new Date(meta?.down_since || alert.created_at).getTime()) / 60000)
                : 0;

              return (
                <div
                  key={alert.id}
                  className={`bg-card border rounded-xl overflow-hidden transition-all ${
                    isOngoingDowntime
                      ? 'border-destructive/40 ring-1 ring-destructive/10'
                      : 'border-border'
                  } ${alert.is_dismissed ? 'opacity-50' : ''}`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg ${config.badgeBg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${config.badgeText}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground text-sm">{alert.title}</h3>
                            {isOngoingDowntime && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-destructive text-destructive-foreground animate-pulse">
                                {formatDuration(ongoingMin)}
                              </span>
                            )}
                            {isResolvedDowntime(alert) && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-success/10 text-success">
                                {t('alerts.resolved')}
                              </span>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${config.badgeBg} ${config.badgeText}`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                        {isOngoingDowntime && (
                          <p className="text-xs text-destructive mt-1.5">
                            {t('alerts.downSince', { time: format(new Date(meta?.down_since || alert.created_at), 'PPp') })}
                          </p>
                        )}
                        {!alert.is_dismissed && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs gap-1.5"
                              onClick={() => toggleExpand(alert.id)}
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              {t('alerts.viewDetails')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-muted-foreground"
                              onClick={() => dismissAlert.mutate(alert.id)}
                              disabled={dismissAlert.isPending}
                            >
                              {t('alerts.dismiss')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30 px-5 py-4 space-y-4 animate-fade-in">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <DetailItem
                          icon={<Clock className="w-3.5 h-3.5" />}
                          label={t('alerts.detailTriggered')}
                          value={format(new Date(alert.created_at), 'PPp')}
                        />
                        <DetailItem
                          icon={<Clock className="w-3.5 h-3.5" />}
                          label={t('alerts.detailTimeAgo')}
                          value={formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        />
                        <DetailItem
                          icon={<Hash className="w-3.5 h-3.5" />}
                          label={t('alerts.detailType')}
                          value={alert.alert_type}
                        />
                        {alert.alert_type === 'downtime' && (
                          <DetailItem
                            icon={<Timer className="w-3.5 h-3.5" />}
                            label={t('alerts.detailDowntime')}
                            value={
                              meta?.resolved_at
                                ? formatDuration(meta.downtime_minutes)
                                : (
                                    <span className="text-destructive font-medium">
                                      {formatDuration(ongoingMin)} ({t('alerts.detailOngoing')})
                                    </span>
                                  )
                            }
                          />
                        )}
                        {meta?.resolved_at && (
                          <DetailItem
                            icon={<CheckCircle className="w-3.5 h-3.5" />}
                            label={t('alerts.detailResolved')}
                            value={format(new Date(meta.resolved_at), 'PPp')}
                          />
                        )}
                        {alert.integration_type && (
                          <DetailItem
                            icon={<Info className="w-3.5 h-3.5" />}
                            label={t('alerts.detailSource')}
                            value={alert.integration_type}
                          />
                        )}
                        {meta?.url && (
                          <div className="col-span-2 sm:col-span-3">
                            <DetailItem
                              icon={<Globe className="w-3.5 h-3.5" />}
                              label={t('alerts.detailURL')}
                              value={
                                <a
                                  href={meta.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  {meta.url}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              }
                            />
                          </div>
                        )}
                      </div>

                      {meta && Object.keys(meta).length > 0 && (
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                            {t('alerts.detailMetadata')}
                          </p>
                          <div className="bg-muted rounded-lg p-3 text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap break-all">
                            {Object.entries(meta).map(([key, val]) => (
                              <div key={key} className="flex gap-2 py-0.5">
                                <span className="text-muted-foreground min-w-[100px]">{key}:</span>
                                <span>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
        {icon}
        {label}
      </div>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

import AppLayout from '@/components/layout/AppLayout';
import { useAlerts, useDismissAlert, Alert } from '@/hooks/use-supabase';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Loader2, ChevronDown, ChevronUp, ExternalLink, Clock, Globe, Hash, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, format } from 'date-fns';

const severityConfig: Record<string, { icon: typeof AlertCircle; dotClass: string; badgeBg: string; badgeText: string }> = {
  critical: { icon: AlertCircle, dotClass: 'bg-destructive', badgeBg: 'bg-destructive/10', badgeText: 'text-destructive' },
  warning: { icon: AlertTriangle, dotClass: 'bg-warning', badgeBg: 'bg-warning/10', badgeText: 'text-warning' },
  info: { icon: Info, dotClass: 'bg-info', badgeBg: 'bg-info/10', badgeText: 'text-info' },
};

type FilterTab = 'all' | 'critical' | 'warning' | 'dismissed';

export default function Alerts() {
  const { data: alerts = [], isLoading } = useAlerts();
  const dismissAlert = useDismissAlert();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { t } = useTranslation();

  const filtered = alerts.filter((a) => {
    if (filter === 'dismissed') return a.is_dismissed;
    if (filter === 'all') return !a.is_dismissed;
    return a.severity === filter && !a.is_dismissed;
  });

  const activeCount = alerts.filter((a) => !a.is_dismissed).length;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('alerts.all') },
    { key: 'critical', label: t('alerts.critical') },
    { key: 'warning', label: t('alerts.warning') },
    { key: 'dismissed', label: t('alerts.dismissed') },
  ];

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <AppLayout>
      <div className="max-w-3xl animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">{t('alerts.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('alerts.activeAlerts', { count: activeCount })}</p>
        </div>

        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success" />
            <p className="font-medium text-foreground">{t('alerts.allOperational')}</p>
            <p className="text-sm mt-1">{t('alerts.noAlerts')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((alert) => {
              const config = severityConfig[alert.severity] ?? severityConfig.info;
              const Icon = config.icon;
              const isExpanded = expandedId === alert.id;
              const meta = alert.metadata as Record<string, any> | null;

              return (
                <div
                  key={alert.id}
                  className={`bg-card border border-border rounded-xl overflow-hidden transition-all ${alert.is_dismissed ? 'opacity-50' : ''}`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg ${config.badgeBg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${config.badgeText}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-foreground text-sm">{alert.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${config.badgeBg} ${config.badgeText}`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
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
                      {/* Metadata grid */}
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
                        {/* Downtime duration */}
                        {alert.alert_type === 'downtime' && (
                          <DetailItem
                            icon={<Timer className="w-3.5 h-3.5" />}
                            label={t('alerts.detailDowntime')}
                            value={
                              meta?.resolved_at
                                ? meta.downtime_minutes < 60
                                  ? `${meta.downtime_minutes}min`
                                  : `${Math.floor(meta.downtime_minutes / 60)}h ${meta.downtime_minutes % 60}min`
                                : (() => {
                                    const downSince = meta?.down_since ? new Date(meta.down_since) : new Date(alert.created_at);
                                    const ongoingMin = Math.round((Date.now() - downSince.getTime()) / 60000);
                                    return (
                                      <span className="text-destructive font-medium">
                                        {ongoingMin < 60 ? `${ongoingMin}min` : `${Math.floor(ongoingMin / 60)}h ${ongoingMin % 60}min`}
                                        {' '}({t('alerts.detailOngoing')})
                                      </span>
                                    );
                                  })()
                            }
                          />
                        )}
                        {/* Resolved at */}
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

                      {/* Raw error / extra metadata */}
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

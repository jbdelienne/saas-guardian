import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { mockAlerts, MockAlert } from '@/lib/mock-data';
import { AlertTriangle, AlertCircle, Info, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const severityConfig = {
  critical: { icon: AlertCircle, dotClass: 'bg-destructive', badgeBg: 'bg-destructive/10', badgeText: 'text-destructive' },
  warning: { icon: AlertTriangle, dotClass: 'bg-warning', badgeBg: 'bg-warning/10', badgeText: 'text-warning' },
  info: { icon: Info, dotClass: 'bg-info', badgeBg: 'bg-info/10', badgeText: 'text-info' },
};

type FilterTab = 'all' | 'critical' | 'warning' | 'dismissed';

export default function Alerts() {
  const [alerts, setAlerts] = useState<MockAlert[]>(mockAlerts);
  const [filter, setFilter] = useState<FilterTab>('all');

  const dismiss = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_dismissed: true } : a)));
  };

  const filtered = alerts.filter((a) => {
    if (filter === 'dismissed') return a.is_dismissed;
    if (filter === 'all') return !a.is_dismissed;
    return a.severity === filter && !a.is_dismissed;
  });

  const activeCount = alerts.filter((a) => !a.is_dismissed).length;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'warning', label: 'Warning' },
    { key: 'dismissed', label: 'Dismissed' },
  ];

  return (
    <AppLayout tvMode={false} onToggleTvMode={() => {}} onAddService={() => {}}>
      <div className="max-w-3xl animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Alerts</h1>
          <p className="text-muted-foreground text-sm">{activeCount} active alerts</p>
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

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success" />
            <p className="font-medium text-foreground">All systems operational ✓</p>
            <p className="text-sm mt-1">No alerts to show</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((alert) => {
              const config = severityConfig[alert.severity];
              const Icon = config.icon;
              return (
                <div
                  key={alert.id}
                  className={`bg-card border border-border rounded-xl p-5 ${alert.is_dismissed ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${config.badgeBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${config.badgeText}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-foreground text-sm">{alert.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badgeBg} ${config.badgeText}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                      {!alert.is_dismissed && (
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm" className="text-xs">View Details</Button>
                          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => dismiss(alert.id)}>
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

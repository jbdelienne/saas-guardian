import { useAlerts, useDismissAlert } from '@/hooks/use-supabase';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, XCircle, Info, X, Loader2 } from 'lucide-react';

const severityIcons: Record<string, typeof AlertTriangle> = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const severityColors: Record<string, string> = {
  critical: 'text-destructive',
  warning: 'text-warning',
  info: 'text-info',
};

export default function AlertListWidget() {
  const { data: alerts = [], isLoading } = useAlerts();
  const dismissAlert = useDismissAlert();

  const activeAlerts = alerts.filter((a) => !a.is_dismissed).slice(0, 8);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activeAlerts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        No active alerts
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <p className="text-xs font-medium text-muted-foreground mb-2">Recent Alerts</p>
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {activeAlerts.map((alert) => {
          const Icon = severityIcons[alert.severity] ?? Info;
          const color = severityColors[alert.severity] ?? 'text-muted-foreground';
          return (
            <div key={alert.id} className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/50 text-xs group">
              <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium truncate">{alert.title}</p>
                <p className="text-muted-foreground truncate">{alert.description}</p>
                <p className="text-muted-foreground/60 text-[10px] mt-0.5">
                  {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                </p>
              </div>
              <button
                onClick={() => dismissAlert.mutate(alert.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useAlerts } from '@/hooks/use-supabase';
import { Loader2 } from 'lucide-react';

export default function AlertCountWidget() {
  const { data: alerts = [], isLoading } = useAlerts();

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const active = alerts.filter(a => !a.is_dismissed);
  const critical = active.filter(a => a.severity === 'critical').length;
  const warning = active.filter(a => a.severity === 'warning').length;
  const info = active.filter(a => a.severity === 'info').length;

  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 p-2">
      <p className="text-xs font-medium text-muted-foreground">Active Alerts</p>
      <div className="flex flex-col gap-2 w-full max-w-[180px]">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-destructive/10">
          <span className="text-sm font-medium text-destructive">🔴 Critical</span>
          <span className="text-lg font-bold text-destructive">{critical}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-warning/10">
          <span className="text-sm font-medium text-warning">🟡 Warning</span>
          <span className="text-lg font-bold text-warning">{warning}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/50">
          <span className="text-sm font-medium text-muted-foreground">ℹ️ Info</span>
          <span className="text-lg font-bold text-muted-foreground">{info}</span>
        </div>
      </div>
    </div>
  );
}

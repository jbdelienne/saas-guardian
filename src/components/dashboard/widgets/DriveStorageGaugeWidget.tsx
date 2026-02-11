import { SyncMetric } from '@/hooks/use-all-sync-data';
import { Progress } from '@/components/ui/progress';
import { HardDrive } from 'lucide-react';

interface Props {
  metrics: SyncMetric[];
}

export default function DriveStorageGaugeWidget({ metrics }: Props) {
  const total = metrics.find((m) => m.metric_key === 'drive_quota_total_gb');
  const used = metrics.find((m) => m.metric_key === 'drive_quota_used_gb');
  const trash = metrics.find((m) => m.metric_key === 'drive_trash_gb');

  if (!total || !used) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        No Drive data — sync your Google integration
      </div>
    );
  }

  const pct = total.metric_value > 0
    ? Math.round((used.metric_value / total.metric_value) * 100)
    : 0;

  const colorClass = pct > 90 ? 'text-destructive' : pct > 70 ? 'text-warning' : 'text-success';

  return (
    <div className="h-full flex flex-col justify-between p-1">
      <div className="flex items-center gap-2 mb-2">
        <HardDrive className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Google Drive Storage</span>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-3">
        <div className="text-center">
          <p className={`text-3xl font-bold tracking-tight ${colorClass}`}>{pct}%</p>
          <p className="text-xs text-muted-foreground">
            {used.metric_value} GB / {total.metric_value} GB
          </p>
        </div>
        <Progress value={pct} className="h-2" />
        {trash && (
          <p className="text-[11px] text-muted-foreground text-center">
            🗑️ {trash.metric_value} GB in trash
          </p>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mt-1">
        Last sync: {new Date(used.synced_at).toLocaleString()}
      </p>
    </div>
  );
}

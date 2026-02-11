import { SyncMetric } from '@/hooks/use-all-sync-data';
import { HardDrive, Database, FileText, FolderOpen, Trash2 } from 'lucide-react';

const METRIC_ICONS: Record<string, typeof HardDrive> = {
  drive_quota_total_gb: Database,
  drive_quota_used_gb: HardDrive,
  drive_trash_gb: Trash2,
  drive_owned_files: FileText,
  drive_shared_with_me: FolderOpen,
  drive_shared_drives: FolderOpen,
};

const METRIC_LABELS: Record<string, string> = {
  drive_quota_total_gb: 'Quota total',
  drive_quota_used_gb: 'Quota utilisé',
  drive_trash_gb: 'Corbeille',
  drive_owned_files: 'Fichiers possédés',
  drive_shared_with_me: 'Partagés avec moi',
  drive_shared_drives: 'Drives partagés',
};

interface Props {
  metricKey: string;
  metrics: SyncMetric[];
}

export default function IntegrationMetricCardWidget({ metricKey, metrics }: Props) {
  const metric = metrics.find((m) => m.metric_key === metricKey);
  const Icon = METRIC_ICONS[metricKey] ?? HardDrive;
  const label = METRIC_LABELS[metricKey] ?? metricKey;

  if (!metric) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        No data — sync your integration first
      </div>
    );
  }

  const displayValue = metric.metric_unit === 'GB'
    ? `${metric.metric_value} GB`
    : metric.metric_value.toLocaleString();

  return (
    <div className="h-full flex flex-col justify-between p-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium truncate">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight mt-2">
        {displayValue}
      </p>
      <p className="text-[10px] text-muted-foreground mt-1">
        Synced {new Date(metric.synced_at).toLocaleString()}
      </p>
    </div>
  );
}

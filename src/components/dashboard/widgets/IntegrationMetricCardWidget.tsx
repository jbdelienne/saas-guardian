import { SyncMetric } from '@/hooks/use-all-sync-data';
import { HardDrive, Database, Trash2, FolderOpen } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const METRIC_ICONS: Record<string, typeof HardDrive> = {
  drive_quota_total_gb: Database,
  drive_quota_used_gb: HardDrive,
  drive_trash_gb: Trash2,
  drive_shared_drives_count: FolderOpen,
};

const METRIC_LABELS: Record<string, string> = {
  drive_quota_total_gb: 'Quota total',
  drive_quota_used_gb: 'Quota utilisé',
  drive_trash_gb: 'Corbeille',
  drive_shared_drives_count: 'Drives partagés',
};

interface Props {
  metricKey: string;
  metrics: SyncMetric[];
}

export default function IntegrationMetricCardWidget({ metricKey, metrics }: Props) {
  // Shared drive detail card
  if (metricKey.startsWith('shared_drive_')) {
    const metric = metrics.find((m) => m.metric_key === metricKey);
    if (!metric) return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data</div>;
    const meta = (metric.metadata || {}) as Record<string, any>;
    const objectCount = meta.object_count ?? metric.metric_value;
    const objectLimit = meta.object_limit ?? 400000;
    const storageGb = meta.storage_used_gb ?? 0;
    const objectPct = Math.round((objectCount / objectLimit) * 100);
    const hasMore = meta.has_more;

    return (
      <div className="h-full flex flex-col justify-between p-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FolderOpen className="w-4 h-4" />
          <span className="text-xs font-medium truncate">{meta.name || metricKey}</span>
        </div>
        <div className="mt-2 space-y-2">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Objets</span>
              <span>{hasMore ? '10 000+' : objectCount.toLocaleString()} / {objectLimit.toLocaleString()}</span>
            </div>
            <Progress value={Math.min(objectPct, 100)} className="h-2" />
          </div>
          <p className="text-sm font-semibold text-foreground">{storageGb} GB utilisés</p>
        </div>
        {meta.created_time && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Créé le {new Date(meta.created_time).toLocaleDateString()}
          </p>
        )}
      </div>
    );
  }

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

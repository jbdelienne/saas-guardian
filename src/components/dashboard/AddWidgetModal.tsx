import { useState } from 'react';
import { Service, useServices, useIntegrations } from '@/hooks/use-supabase';
import { useLatestSyncMetrics } from '@/hooks/use-all-sync-data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity,
  BarChart3,
  Bell,
  Cloud,
  Gauge,
  Loader2,
  Table,
  MonitorCheck,
} from 'lucide-react';

export interface NewWidgetDef {
  widget_type: string;
  title: string;
  config: Record<string, unknown>;
  width: number;
  height: number;
}

const WIDGET_TYPES = [
  { id: 'status_card', label: 'Service Status', icon: MonitorCheck, needsService: true },
  { id: 'uptime_chart', label: 'Uptime Chart', icon: Activity, needsService: true },
  { id: 'response_time_chart', label: 'Response Time', icon: BarChart3, needsService: true },
  { id: 'service_table', label: 'Services Table', icon: Table, needsService: false },
  { id: 'alert_list', label: 'Alert List', icon: Bell, needsService: false },
  { id: 'drive_storage_gauge', label: 'Drive Storage', icon: Gauge, needsService: false },
  { id: 'integration_metric', label: 'Integration Metric', icon: Cloud, needsService: false, needsMetricKey: true },
] as const;

const METRIC_KEYS = [
  { value: 'drive_owned_files', label: 'Fichiers possédés', group: 'Drive' },
  { value: 'drive_shared_with_me', label: 'Partagés avec moi', group: 'Drive' },
  { value: 'drive_shared_drives', label: 'Drives partagés', group: 'Drive' },
  { value: 'drive_trash_gb', label: 'Corbeille (GB)', group: 'Drive' },
  { value: 'drive_quota_used_gb', label: 'Quota utilisé (GB)', group: 'Drive' },
  { value: 'drive_quota_total_gb', label: 'Quota total (GB)', group: 'Drive' },
  { value: 'storage_docs', label: 'Stockage Docs', group: 'Par type' },
  { value: 'storage_sheets', label: 'Stockage Sheets', group: 'Par type' },
  { value: 'storage_slides', label: 'Stockage Slides', group: 'Par type' },
  { value: 'storage_pdfs', label: 'Stockage PDFs', group: 'Par type' },
  { value: 'storage_images', label: 'Stockage Images', group: 'Par type' },
  { value: 'storage_videos', label: 'Stockage Vidéos', group: 'Par type' },
  { value: 'storage_audio', label: 'Stockage Audio', group: 'Par type' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (widget: NewWidgetDef) => void;
  isLoading?: boolean;
}

export default function AddWidgetModal({ open, onOpenChange, onAdd, isLoading }: Props) {
  const { data: services = [] } = useServices();
  const { data: syncMetrics = [] } = useLatestSyncMetrics();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [metricKey, setMetricKey] = useState('');
  const [width, setWidth] = useState(1);
  const [height, setHeight] = useState(1);

  // Build dynamic metric keys including synced shared drives
  const sharedDriveMetrics = syncMetrics
    .filter((m) => m.metric_type === 'shared_drive')
    .map((m) => ({
      value: m.metric_key,
      label: `Drive: ${(m.metadata as any)?.name || m.metric_key}`,
      group: 'Drives partagés',
    }));

  const allMetricKeys = [...METRIC_KEYS, ...sharedDriveMetrics];

  const widgetDef = WIDGET_TYPES.find((w) => w.id === selectedType);

  const reset = () => {
    setSelectedType(null);
    setTitle('');
    setServiceId('');
    setMetricKey('');
    setWidth(1);
    setHeight(1);
  };

  const handleAdd = () => {
    if (!selectedType) return;
    const config: Record<string, unknown> = {};
    if (widgetDef?.needsService && serviceId) config.service_id = serviceId;
    if ('needsMetricKey' in (widgetDef ?? {}) && metricKey) config.metric_key = metricKey;
    onAdd({
      widget_type: selectedType,
      title: title || widgetDef?.label || 'Widget',
      config,
      width,
      height,
    });
    reset();
  };

  const canAdd =
    selectedType &&
    (!widgetDef?.needsService || serviceId) &&
    (!('needsMetricKey' in (widgetDef ?? {})) || !widgetDef || !('needsMetricKey' in widgetDef) || metricKey);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Widget type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {WIDGET_TYPES.map((wt) => (
                <button
                  key={wt.id}
                  onClick={() => { setSelectedType(wt.id); setTitle(wt.label); }}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm text-left transition-all ${
                    selectedType === wt.id
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  <wt.icon className="w-4 h-4 shrink-0" />
                  {wt.label}
                </button>
              ))}
            </div>
          </div>

          {selectedType && (
            <>
              {/* Title */}
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Widget title" />
              </div>

              {/* Service selector */}
              {widgetDef?.needsService && (
                <div className="space-y-2">
                  <Label>Service</Label>
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.icon} {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Metric key selector */}
              {widgetDef && 'needsMetricKey' in widgetDef && (
               <div className="space-y-2">
                  <Label>Metric</Label>
                  <Select value={metricKey} onValueChange={setMetricKey}>
                    <SelectTrigger><SelectValue placeholder="Select metric" /></SelectTrigger>
                    <SelectContent>
                      {allMetricKeys.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Size */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Width (cols)</Label>
                  <Select value={String(width)} onValueChange={(v) => setWidth(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Height (rows)</Label>
                  <Select value={String(height)} onValueChange={(v) => setHeight(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleAdd}
                disabled={!canAdd || isLoading}
                className="w-full gradient-primary text-primary-foreground hover:opacity-90"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Add Widget
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

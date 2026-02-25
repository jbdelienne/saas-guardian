import { useState, useMemo } from 'react';
import { useServices, useIntegrations } from '@/hooks/use-supabase';
import { useLatestSyncMetrics } from '@/hooks/use-all-sync-data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Activity,
  BarChart3,
  Cloud,
  Hash,
  Loader2,
  List,
  MonitorCheck,
  Shield,
  Server,
  ChevronLeft,
  LayoutGrid,
  LineChart,
  BadgeCheck,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NewWidgetDef {
  widget_type: string;
  title: string;
  config: Record<string, unknown>;
  width: number;
  height: number;
}

/* ─── Step definitions ─── */

type Source = 'services' | 'aws' | 'google';
type Metric = 'uptime' | 'response_time' | 'ssl_expiry' | 'cost' | 'storage' | 'status';
type Viz = 'big_number' | 'status_badge' | 'line_chart' | 'list';

const SOURCES: { id: Source; label: string; icon: typeof Server }[] = [
  { id: 'services', label: 'My Services', icon: Server },
  { id: 'aws', label: 'AWS', icon: Cloud },
  { id: 'google', label: 'Google Workspace', icon: LayoutGrid },
];

const METRICS_BY_SOURCE: Record<Source, { id: Metric; label: string; icon: typeof Activity }[]> = {
  services: [
    { id: 'uptime', label: 'Uptime', icon: Activity },
    { id: 'response_time', label: 'Response time', icon: BarChart3 },
    { id: 'ssl_expiry', label: 'SSL expiry', icon: Shield },
    { id: 'status', label: 'Status overview', icon: MonitorCheck },
  ],
  aws: [
    { id: 'cost', label: 'Cost', icon: DollarSign },
    { id: 'status', label: 'Service status', icon: MonitorCheck },
  ],
  google: [
    { id: 'storage', label: 'Drive storage', icon: Hash },
    { id: 'status', label: 'Status overview', icon: MonitorCheck },
  ],
};

const VIZ_OPTIONS: { id: Viz; label: string; icon: typeof Hash }[] = [
  { id: 'big_number', label: 'Big number', icon: Hash },
  { id: 'status_badge', label: 'Status badge', icon: BadgeCheck },
  { id: 'line_chart', label: 'Line chart', icon: LineChart },
  { id: 'list', label: 'List', icon: List },
];

/* Maps source+metric+viz → actual widget_type for WidgetRenderer */
function resolveWidgetType(source: Source, metric: Metric, viz: Viz): string {
  if (metric === 'uptime' && viz === 'line_chart') return 'uptime_chart';
  if (metric === 'response_time' && viz === 'line_chart') return 'response_time_chart';
  if (metric === 'status' && viz === 'list') return 'service_table';
  if (metric === 'status' && viz === 'status_badge') return 'status_card';
  if (metric === 'storage') return 'drive_storage_gauge';
  if (metric === 'cost') return 'integration_metric';
  // Fallback sensible defaults
  if (viz === 'big_number') return 'status_card';
  if (viz === 'status_badge') return 'status_card';
  if (viz === 'list') return 'alert_list';
  return 'status_card';
}

function resolveTitle(source: Source, metric: Metric, viz: Viz): string {
  const metricLabel = METRICS_BY_SOURCE[source]?.find(m => m.id === metric)?.label ?? metric;
  const vizLabel = VIZ_OPTIONS.find(v => v.id === viz)?.label ?? viz;
  return `${metricLabel} — ${vizLabel}`;
}

function resolveSize(viz: Viz): { width: number; height: number } {
  switch (viz) {
    case 'line_chart': return { width: 2, height: 2 };
    case 'list': return { width: 2, height: 2 };
    case 'big_number': return { width: 1, height: 1 };
    case 'status_badge': return { width: 1, height: 1 };
    default: return { width: 1, height: 1 };
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (widget: NewWidgetDef) => void;
  isLoading?: boolean;
}

export default function AddWidgetModal({ open, onOpenChange, onAdd, isLoading }: Props) {
  const { data: services = [] } = useServices();
  const [source, setSource] = useState<Source | null>(null);
  const [metric, setMetric] = useState<Metric | null>(null);
  const [viz, setViz] = useState<Viz | null>(null);
  const [serviceId, setServiceId] = useState('');

  const step = !source ? 1 : !metric ? 2 : 3;
  const availableMetrics = source ? METRICS_BY_SOURCE[source] : [];

  const needsService = source === 'services' && metric && ['uptime', 'response_time', 'ssl_expiry', 'status'].includes(metric);

  const reset = () => {
    setSource(null);
    setMetric(null);
    setViz(null);
    setServiceId('');
  };

  const goBack = () => {
    if (step === 3) { setViz(null); setMetric(null); }
    else if (step === 2) { setMetric(null); setSource(null); }
  };

  const handleAdd = () => {
    if (!source || !metric || !viz) return;
    const config: Record<string, unknown> = {};
    if (needsService && serviceId) config.service_id = serviceId;
    if (source === 'google') config.metric_key = 'drive_quota_used_gb';
    const size = resolveSize(viz);
    onAdd({
      widget_type: resolveWidgetType(source, metric, viz),
      title: resolveTitle(source, metric, viz),
      config,
      ...size,
    });
    reset();
  };

  const canAdd = source && metric && viz && (!needsService || serviceId);

  // Preview data
  const previewLabel = useMemo(() => {
    if (!source || !metric) return null;
    const metricDef = METRICS_BY_SOURCE[source]?.find(m => m.id === metric);
    return metricDef?.label ?? '';
  }, [source, metric]);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step > 1 && (
              <button onClick={goBack} className="text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            Add Widget
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={cn(
                "h-1.5 rounded-full flex-1 transition-all duration-300",
                s <= step ? "bg-primary" : "bg-muted"
              )} />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {/* STEP 1: Source */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">What do you want to monitor?</p>
              <div className="grid grid-cols-3 gap-3">
                {SOURCES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSource(s.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border text-sm transition-all hover:border-primary/50",
                      source === s.id
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    <s.icon className="w-6 h-6" />
                    <span className="font-medium text-xs">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Metric */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">What do you want to see?</p>
              <div className="grid grid-cols-2 gap-3">
                {availableMetrics.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMetric(m.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border text-sm transition-all hover:border-primary/50",
                      metric === m.id
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    <m.icon className="w-5 h-5 shrink-0" />
                    <span className="font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Viz + Service + Preview */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">How do you want to display it?</p>
                <div className="grid grid-cols-2 gap-3">
                  {VIZ_OPTIONS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setViz(v.id)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border text-sm transition-all hover:border-primary/50",
                        viz === v.id
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-card text-muted-foreground"
                      )}
                    >
                      <v.icon className="w-5 h-5 shrink-0" />
                      <span className="font-medium">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Service selector if needed */}
              {needsService && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Which service?</p>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {services.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setServiceId(s.id)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border text-sm text-left transition-all",
                          serviceId === s.id
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        <span>{s.icon}</span>
                        <span className="font-medium truncate">{s.name}</span>
                      </button>
                    ))}
                    {services.length === 0 && (
                      <p className="text-xs text-muted-foreground p-2">No services found. Add one first.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Live preview */}
              {viz && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Preview</p>
                  <WidgetPreview
                    source={source!}
                    metric={metric!}
                    viz={viz}
                    serviceName={needsService ? services.find(s => s.id === serviceId)?.name : undefined}
                  />
                </div>
              )}

              <Button
                onClick={handleAdd}
                disabled={!canAdd || isLoading}
                className="w-full gradient-primary text-primary-foreground hover:opacity-90"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Add to dashboard
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Preview component ─── */

function WidgetPreview({ source, metric, viz, serviceName }: {
  source: Source;
  metric: Metric;
  viz: Viz;
  serviceName?: string;
}) {
  const label = serviceName ?? (source === 'aws' ? 'AWS' : source === 'google' ? 'Google Workspace' : 'Service');

  if (viz === 'big_number') {
    const mockValues: Record<Metric, { value: string; unit: string }> = {
      uptime: { value: '99.98', unit: '%' },
      response_time: { value: '142', unit: 'ms' },
      ssl_expiry: { value: '47', unit: 'days' },
      cost: { value: '$1,234', unit: '/mo' },
      storage: { value: '72', unit: 'GB' },
      status: { value: '4/5', unit: 'up' },
    };
    const mock = mockValues[metric] ?? { value: '—', unit: '' };
    return (
      <div className="text-center py-3">
        <p className="text-3xl font-bold text-foreground tracking-tight">{mock.value}<span className="text-lg text-muted-foreground ml-1">{mock.unit}</span></p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    );
  }

  if (viz === 'status_badge') {
    return (
      <div className="flex items-center gap-3 py-3 justify-center">
        <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
        <span className="font-semibold text-foreground">{label}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">Operational</span>
      </div>
    );
  }

  if (viz === 'line_chart') {
    // Fake SVG sparkline
    return (
      <div className="py-2">
        <p className="text-xs text-muted-foreground mb-2">{label}</p>
        <svg viewBox="0 0 200 50" className="w-full h-12" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            points="0,40 20,35 40,38 60,25 80,30 100,20 120,22 140,15 160,18 180,10 200,12"
          />
          <polyline
            fill="url(#preview-gradient)"
            stroke="none"
            points="0,50 0,40 20,35 40,38 60,25 80,30 100,20 120,22 140,15 160,18 180,10 200,12 200,50"
          />
          <defs>
            <linearGradient id="preview-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  if (viz === 'list') {
    const items = metric === 'status'
      ? ['api.example.com — Up', 'cdn.example.com — Up', 'db.example.com — Degraded']
      : ['Alert: High response time', 'Alert: SSL expires in 7 days', 'Alert: Service down'];
    return (
      <div className="space-y-1.5 py-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className={cn(
              "w-2 h-2 rounded-full shrink-0",
              i < 2 ? "bg-success" : "bg-warning"
            )} />
            {item}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

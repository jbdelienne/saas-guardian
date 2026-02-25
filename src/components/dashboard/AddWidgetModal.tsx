import { useState, useMemo } from 'react';
import { useServices, useIntegrations } from '@/hooks/use-supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Cloud,
  Loader2,
  ChevronLeft,
  LayoutGrid,
  LineChart,
  BadgeCheck,
  Hash,
  List,
  AlertTriangle,
  Server,
  Activity,
  BarChart3,
  Shield,
  MonitorCheck,
  DollarSign,
  TrendingUp,
  HardDrive,
  Users,
  FileWarning,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface NewWidgetDef {
  widget_type: string;
  title: string;
  config: Record<string, unknown>;
  width: number;
  height: number;
}

/* ─── Types ─── */

type SourceType = 'service' | 'aws' | 'google';

interface SourceSelection {
  type: SourceType;
  serviceId?: string; // set when type === 'service'
}

interface MetricDef {
  id: string;
  label: string;
  icon: typeof Activity;
  metricKey: string;
}

type VizType = 'big_number' | 'status_badge' | 'status_list' | 'line_chart' | 'alert_count';

interface VizDef {
  id: VizType;
  label: string;
  icon: typeof Hash;
  description: string;
}

/* ─── Data ─── */

const SERVICE_METRICS: MetricDef[] = [
  { id: 'uptime', label: 'Uptime %', icon: Activity, metricKey: 'service_uptime' },
  { id: 'response_time', label: 'Response time (ms)', icon: BarChart3, metricKey: 'service_response_time' },
  { id: 'ssl_expiry', label: 'SSL expiry (days)', icon: Shield, metricKey: 'service_ssl_expiry' },
  { id: 'status', label: 'Current status', icon: MonitorCheck, metricKey: 'service_status' },
];

const AWS_METRICS: MetricDef[] = [
  { id: 'monthly_cost', label: 'Monthly cost', icon: DollarSign, metricKey: 'aws_monthly_cost' },
  { id: 'cost_trend', label: 'Cost trend vs last month', icon: TrendingUp, metricKey: 'aws_cost_trend' },
  { id: 'resources', label: 'Resources count', icon: Layers, metricKey: 'aws_resources_count' },
  { id: 'alerts', label: 'Active alerts', icon: AlertTriangle, metricKey: 'aws_active_alerts' },
];

const GOOGLE_METRICS: MetricDef[] = [
  { id: 'storage', label: 'Drive storage %', icon: HardDrive, metricKey: 'google_drive_storage' },
  { id: 'licences', label: 'Unused licences', icon: Users, metricKey: 'google_unused_licences' },
  { id: 'public_files', label: 'Publicly shared files', icon: FileWarning, metricKey: 'google_public_files' },
];

const ALL_VIZ: VizDef[] = [
  { id: 'big_number', label: 'Big Number', icon: Hash, description: 'Large value + label + optional trend' },
  { id: 'status_badge', label: 'Status Badge', icon: BadgeCheck, description: '🟢 Up / 🔴 Down / 🟡 Degraded' },
  { id: 'status_list', label: 'Status List', icon: List, description: 'Multiple services, one per line' },
  { id: 'line_chart', label: 'Line Chart', icon: LineChart, description: 'Time series (24h or 7d)' },
  { id: 'alert_count', label: 'Alert Count', icon: AlertTriangle, description: 'Active alerts by severity' },
];

function getAvailableViz(source: SourceSelection, metricId: string): VizType[] {
  if (source.type === 'service') {
    if (metricId === 'status') return ['status_badge', 'status_list', 'big_number'];
    if (metricId === 'uptime' || metricId === 'response_time') return ['big_number', 'line_chart'];
    if (metricId === 'ssl_expiry') return ['big_number'];
  }
  if (source.type === 'aws') {
    if (metricId === 'alerts') return ['alert_count', 'big_number'];
    return ['big_number'];
  }
  if (source.type === 'google') {
    return ['big_number'];
  }
  return ['big_number'];
}

function resolveWidgetType(source: SourceSelection, metricId: string, viz: VizType): string {
  if (viz === 'big_number') return 'big_number';
  if (viz === 'status_badge') return 'status_badge';
  if (viz === 'status_list') return 'status_list';
  if (viz === 'alert_count') return 'alert_count';
  if (viz === 'line_chart') {
    if (metricId === 'uptime') return 'uptime_chart';
    if (metricId === 'response_time') return 'response_time_chart';
  }
  return 'big_number';
}

function resolveDefaultSize(viz: VizType): { width: number; height: number } {
  switch (viz) {
    case 'big_number': return { width: 3, height: 2 };
    case 'status_badge': return { width: 3, height: 2 };
    case 'status_list': return { width: 4, height: 3 };
    case 'line_chart': return { width: 6, height: 3 };
    case 'alert_count': return { width: 3, height: 3 };
    default: return { width: 3, height: 2 };
  }
}

/* ─── Component ─── */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (widget: NewWidgetDef) => void;
  isLoading?: boolean;
}

export default function AddWidgetModal({ open, onOpenChange, onAdd, isLoading }: Props) {
  const { data: services = [] } = useServices();
  const { data: integrations = [] } = useIntegrations();

  const [source, setSource] = useState<SourceSelection | null>(null);
  const [metricId, setMetricId] = useState<string | null>(null);
  const [viz, setViz] = useState<VizType | null>(null);

  const step = !source ? 1 : !metricId ? 2 : 3;

  const hasAws = integrations.some(i => i.integration_type === 'aws' && i.is_connected);
  const hasGoogle = integrations.some(i => i.integration_type === 'google' && i.is_connected);

  const metrics: MetricDef[] = useMemo(() => {
    if (!source) return [];
    if (source.type === 'service') return SERVICE_METRICS;
    if (source.type === 'aws') return AWS_METRICS;
    if (source.type === 'google') return GOOGLE_METRICS;
    return [];
  }, [source]);

  const availableViz = useMemo(() => {
    if (!source || !metricId) return [];
    const ids = getAvailableViz(source, metricId);
    return ALL_VIZ.filter(v => ids.includes(v.id));
  }, [source, metricId]);

  const selectedMetric = metrics.find(m => m.id === metricId);

  const reset = () => { setSource(null); setMetricId(null); setViz(null); };

  const goBack = () => {
    if (step === 3) { setViz(null); setMetricId(null); }
    else if (step === 2) { setMetricId(null); setSource(null); }
  };

  const handleAdd = () => {
    if (!source || !metricId || !viz || !selectedMetric) return;
    const config: Record<string, unknown> = { metric_key: selectedMetric.metricKey };
    if (source.type === 'service' && source.serviceId) config.service_id = source.serviceId;
    if (source.type === 'aws') config.source = 'aws';
    if (source.type === 'google') config.source = 'google';

    const size = resolveDefaultSize(viz);
    onAdd({
      widget_type: resolveWidgetType(source, metricId, viz),
      title: selectedMetric.label,
      config,
      ...size,
    });
    reset();
  };

  const canAdd = source && metricId && viz;

  const stepLabels = ['Source', 'Metric', 'Visualization'];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
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

        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-1.5 flex-1">
              <div className={cn(
                "h-1.5 rounded-full flex-1 transition-all duration-300",
                s <= step ? "bg-primary" : "bg-muted"
              )} />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mb-2">
          Step {step}/3 — {stepLabels[step - 1]}
        </p>

        <div className="flex-1 overflow-hidden">
          {/* STEP 1: Source */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">What do you want to display?</p>

              {/* Services */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" /> Services
                </p>
                <ScrollArea className="h-40 rounded-lg border border-border">
                  <div className="space-y-0.5 p-1.5">
                    {services.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 px-3">No services yet. Add one first.</p>
                    ) : services.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSource({ type: 'service', serviceId: s.id })}
                        className={cn(
                          "flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-left text-xs transition-all hover:bg-primary/5",
                          source?.serviceId === s.id
                            ? "bg-primary/10 text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        <span className="text-sm shrink-0">{s.icon}</span>
                        <span className="font-medium text-foreground truncate flex-1">{s.name}</span>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          s.status === 'up' ? 'bg-success' : s.status === 'down' ? 'bg-destructive' : 'bg-warning'
                        )} />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Integrations */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5" /> Integrations
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => hasAws ? setSource({ type: 'aws' }) : undefined}
                    disabled={!hasAws}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border text-sm transition-all",
                      !hasAws ? "opacity-40 cursor-not-allowed border-border bg-card" :
                      source?.type === 'aws'
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <Cloud className="w-5 h-5 shrink-0" />
                    <div className="text-left">
                      <span className="font-medium block">AWS</span>
                      {!hasAws && <span className="text-[10px] text-muted-foreground">Not connected</span>}
                    </div>
                  </button>
                  <button
                    onClick={() => hasGoogle ? setSource({ type: 'google' }) : undefined}
                    disabled={!hasGoogle}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border text-sm transition-all",
                      !hasGoogle ? "opacity-40 cursor-not-allowed border-border bg-card" :
                      source?.type === 'google'
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <LayoutGrid className="w-5 h-5 shrink-0" />
                    <div className="text-left">
                      <span className="font-medium block">Google Workspace</span>
                      {!hasGoogle && <span className="text-[10px] text-muted-foreground">Not connected</span>}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Metric */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">What metric do you want to see?</p>
              <div className="grid grid-cols-2 gap-2">
                {metrics.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMetricId(m.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border text-sm transition-all hover:border-primary/40",
                      metricId === m.id
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    <m.icon className="w-5 h-5 shrink-0" />
                    <span className="font-medium text-left">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Visualization */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">How do you want to display it?</p>
              <div className="space-y-2">
                {availableViz.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setViz(v.id)}
                    className={cn(
                      "flex items-center gap-3 w-full p-4 rounded-xl border text-sm transition-all hover:border-primary/40 text-left",
                      viz === v.id
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    <v.icon className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="font-medium block text-foreground">{v.label}</span>
                      <span className="text-xs text-muted-foreground">{v.description}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Preview */}
              {viz && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Preview</p>
                  <WidgetPreview
                    source={source!}
                    metricId={metricId!}
                    viz={viz}
                    serviceName={source?.type === 'service' ? services.find(s => s.id === source.serviceId)?.name : undefined}
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

/* ─── Preview ─── */

function WidgetPreview({ source, metricId, viz, serviceName }: {
  source: SourceSelection;
  metricId: string;
  viz: VizType;
  serviceName?: string;
}) {
  const label = serviceName ?? (source.type === 'aws' ? 'AWS' : source.type === 'google' ? 'Google Workspace' : 'Service');

  if (viz === 'big_number') {
    const mockValues: Record<string, { value: string; unit: string }> = {
      uptime: { value: '99.98', unit: '%' },
      response_time: { value: '142', unit: 'ms' },
      ssl_expiry: { value: '47', unit: 'days' },
      monthly_cost: { value: '$2,340', unit: '/mo' },
      cost_trend: { value: '$2,340', unit: '/mo' },
      resources: { value: '23', unit: '' },
      alerts: { value: '7', unit: '' },
      storage: { value: '72', unit: '%' },
      licences: { value: '12', unit: '' },
      public_files: { value: '34', unit: '' },
      status: { value: '4/5', unit: 'up' },
    };
    const mock = mockValues[metricId] ?? { value: '—', unit: '' };
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

  if (viz === 'status_list') {
    return (
      <div className="space-y-1.5 py-1">
        {['api.example.com', 'cdn.example.com', 'db.example.com'].map((name, i) => (
          <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>{i < 2 ? '🟢' : '🟡'}</span>
              <span>{name}</span>
            </div>
            <span className="font-mono">{[142, 89, 234][i]}ms</span>
          </div>
        ))}
      </div>
    );
  }

  if (viz === 'line_chart') {
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

  if (viz === 'alert_count') {
    return (
      <div className="flex flex-col gap-1.5 py-2">
        <div className="flex items-center justify-between text-xs px-2">
          <span className="text-destructive font-medium">🔴 Critical</span>
          <span className="font-bold text-destructive">2</span>
        </div>
        <div className="flex items-center justify-between text-xs px-2">
          <span className="text-warning font-medium">🟡 Warning</span>
          <span className="font-bold text-warning">5</span>
        </div>
      </div>
    );
  }

  return null;
}

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Service, useChecks, useTogglePause, useUpdateService } from '@/hooks/use-supabase';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import { Trash2, Pause, Play, Loader2, Shield, Activity, Clock, ArrowUpCircle, Globe, Zap, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UptimePeriod, useUptimeChart } from '@/hooks/use-uptime';
import OwnerTagsEditor, { OwnerTagsDisplay } from './OwnerTagsEditor';
import { toast } from 'sonner';

const statusDotClass: Record<string, string> = {
  up: 'status-dot-up',
  down: 'status-dot-down',
  degraded: 'status-dot-degraded',
  unknown: 'status-dot-unknown',
};

const statusLabel: Record<string, string> = {
  up: 'Operational',
  down: 'Down',
  degraded: 'Degraded',
  unknown: 'Pending',
};

const periodOptions: { value: UptimePeriod; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '12m', label: '12m' },
];

interface ServiceDetailModalProps {
  service: Service | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export default function ServiceDetailModal({ service, open, onClose, onDelete }: ServiceDetailModalProps) {
  const togglePause = useTogglePause();
  const updateService = useUpdateService();
  const { data: checks = [], isLoading: checksLoading } = useChecks(service?.id, 50);
  const [chartPeriod, setChartPeriod] = useState<UptimePeriod>('7d');
  const { data: uptimeChartData = [], isLoading: chartLoading } = useUptimeChart(service?.id, chartPeriod);

  const responseChartData = checks
    .slice(0, 24)
    .reverse()
    .map((c) => ({
      time: format(new Date(c.checked_at), 'HH:mm'),
      responseTime: c.response_time,
      status: c.status,
    }));

  if (!service) return null;

  const sslExpiry = (service as any).ssl_expiry_date
    ? new Date((service as any).ssl_expiry_date)
    : null;
  const sslDaysLeft = sslExpiry ? differenceInDays(sslExpiry, new Date()) : null;
  const sslIssuer = (service as any).ssl_issuer as string | null;

  const sslColor =
    sslDaysLeft === null
      ? 'text-muted-foreground'
      : sslDaysLeft <= 7
        ? 'text-destructive'
        : sslDaysLeft <= 30
          ? 'text-warning'
          : 'text-emerald-500';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{service.icon}</span>
            <div>
              <DialogTitle className="text-lg">{service.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{service.url}</p>
              <OwnerTagsDisplay ownerId={(service as any).owner_id} tags={(service as any).tags || []} />
            </div>
            <div className={`ml-auto ${statusDotClass[service.status] ?? 'status-dot-unknown'}`} />
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-foreground capitalize">{statusLabel[service.status] ?? 'Unknown'}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Status</p>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <ArrowUpCircle className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-foreground">{service.uptime_percentage ?? 0}%</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Uptime (12 months)</p>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-foreground">{service.avg_response_time ?? 0}ms</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Avg Response</p>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className={`text-xl font-bold ${sslColor}`}>
                  {sslDaysLeft !== null ? `${sslDaysLeft}d` : '—'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">SSL Expires in</p>
                {sslIssuer && (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5" title={sslIssuer}>{sslIssuer}</p>
                )}
              </div>
            </div>

            {/* Check info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Check interval: <strong className="text-foreground">{service.check_interval}min</strong></span>
              <span>·</span>
              <span>Last check: <strong className="text-foreground">
                {service.last_check
                  ? formatDistanceToNow(new Date(service.last_check), { addSuffix: true })
                  : 'Never'}
              </strong></span>
              {(service as any).content_keyword && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    Keyword: <strong className="text-foreground">{(service as any).content_keyword}</strong>
                  </span>
                </>
              )}
            </div>

            {/* Uptime chart with period selector */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground">Uptime History</h4>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                  {periodOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setChartPeriod(opt.value)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
                        chartPeriod === opt.value
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-48 bg-muted/50 rounded-xl p-2">
                {chartLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : uptimeChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No data for this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={uptimeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [`${value}%`, 'Uptime']}
                      />
                      <ReferenceLine y={99.9} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: 'SLA 99.9%', fontSize: 10, fill: 'hsl(var(--destructive))' }} />
                      <Bar dataKey="uptime" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Response time chart */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-foreground">Response Time (last 24 checks)</h4>
              <div className="h-48 bg-muted/50 rounded-xl p-2">
                {checksLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : responseChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No check data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={responseChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="ms" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Line type="monotone" dataKey="responseTime" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {checksLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : checks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No checks recorded yet</p>
            ) : (
              <div className="space-y-1">
                {checks.slice(0, 20).map((check) => {
                  const c = check as any;
                  return (
                    <div key={check.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 text-sm gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={check.status === 'up' ? 'status-dot-up' : check.status === 'degraded' ? 'status-dot-degraded' : 'status-dot-down'} />
                        <span className="text-foreground capitalize">{check.status}</span>
                      </div>
                      <span className="text-muted-foreground whitespace-nowrap">{check.response_time}ms</span>
                      {c.ttfb != null && (
                        <span className="text-muted-foreground whitespace-nowrap text-xs flex items-center gap-0.5" title="Time to First Byte">
                          <Zap className="w-3 h-3" />{c.ttfb}ms
                        </span>
                      )}
                      {c.response_size != null && (
                        <span className="text-muted-foreground whitespace-nowrap text-xs flex items-center gap-0.5" title="Response size">
                          <FileText className="w-3 h-3" />{c.response_size > 1024 ? `${(c.response_size / 1024).toFixed(1)}KB` : `${c.response_size}B`}
                        </span>
                      )}
                      {c.check_region && (
                        <span className="text-muted-foreground whitespace-nowrap text-xs flex items-center gap-0.5" title="Check region">
                          <Globe className="w-3 h-3" />{c.check_region}
                        </span>
                      )}
                      <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(check.checked_at), { addSuffix: true })}
                      </span>
                      {c.error_message && (
                        <span className="text-destructive text-xs truncate max-w-[150px]" title={c.error_message}>
                          {c.error_message}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-4 space-y-4">
            {/* Owner & Tags */}
            <div className="p-4 border border-border rounded-xl">
              <OwnerTagsEditor
                ownerId={(service as any).owner_id || null}
                tags={(service as any).tags || []}
                onOwnerChange={(ownerId) => {
                  updateService.mutate({ id: service.id, owner_id: ownerId }, {
                    onSuccess: () => toast.success('Owner updated'),
                  });
                }}
                onTagsChange={(tags) => {
                  updateService.mutate({ id: service.id, tags }, {
                    onSuccess: () => toast.success('Tags updated'),
                  });
                }}
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-xl">
              <div>
                <p className="font-medium text-foreground text-sm">Pause monitoring</p>
                <p className="text-xs text-muted-foreground">Temporarily stop health checks</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => togglePause.mutate({ id: service.id, is_paused: !service.is_paused })}
                className="gap-2"
                disabled={togglePause.isPending}
              >
                {service.is_paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {service.is_paused ? 'Resume' : 'Pause'}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-xl">
              <div>
                <p className="font-medium text-destructive text-sm">Delete service</p>
                <p className="text-xs text-muted-foreground">Permanently remove this service and its history</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => onDelete?.(service.id)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Service, useChecks, useTogglePause, useUpdateService } from '@/hooks/use-supabase';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { formatDistanceToNow, format, differenceInDays, subDays, subMonths, isAfter } from 'date-fns';
import { Trash2, Pause, Play, Loader2, Shield, Activity, Clock, ArrowUpCircle, Globe, Zap, FileText, Search, Download, TrendingUp, ExternalLink } from 'lucide-react';
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

const statusBadgeClass: Record<string, string> = {
  up: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  down: 'bg-destructive/10 text-destructive border-destructive/20',
  degraded: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  unknown: 'bg-muted text-muted-foreground border-border',
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

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ServiceDetailModal({ service, open, onClose, onDelete }: ServiceDetailModalProps) {
  const togglePause = useTogglePause();
  const updateService = useUpdateService();
  const { data: checks = [], isLoading: checksLoading } = useChecks(service?.id, 50);
  const [chartPeriod, setChartPeriod] = useState<UptimePeriod>('7d');
  const [reportPeriod, setReportPeriod] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
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

  const getFilteredChecks = () => {
    if (reportPeriod === 'all') return checks;
    const now = new Date();
    const cutoff = reportPeriod === '24h' ? subDays(now, 1) : reportPeriod === '7d' ? subDays(now, 7) : subDays(now, 30);
    return checks.filter((c) => isAfter(new Date(c.checked_at), cutoff));
  };

  const reportPeriodLabel: Record<string, string> = { '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days', 'all': 'All time' };

  const handleDownloadCSV = () => {
    const filtered = getFilteredChecks();
    if (filtered.length === 0) { toast.error('No data for this period'); return; }
    const headers = ['Timestamp', 'Status', 'Response Time (ms)', 'TTFB (ms)', 'Status Code', 'Region', 'Error'];
    const rows = filtered.map((c: any) => [c.checked_at, c.status, c.response_time, c.ttfb ?? '', c.status_code ?? '', c.check_region ?? '', c.error_message ?? '']);
    const csv = [headers.join(','), ...rows.map((r: any[]) => r.map((v: any) => `"${v}"`).join(','))].join('\n');
    downloadFile(csv, `${service.name.replace(/\s+/g, '_')}_${reportPeriod}_report.csv`, 'text/csv');
    toast.success(`CSV report downloaded (${reportPeriodLabel[reportPeriod]})`);
  };

  const handleDownloadJSON = () => {
    const filtered = getFilteredChecks();
    if (filtered.length === 0) { toast.error('No data for this period'); return; }
    const report = {
      service: { name: service.name, url: service.url, status: service.status, uptime: service.uptime_percentage, avg_response_time: service.avg_response_time },
      period: reportPeriodLabel[reportPeriod],
      exported_at: new Date().toISOString(),
      checks: filtered.map((c: any) => ({ timestamp: c.checked_at, status: c.status, response_time_ms: c.response_time, ttfb_ms: c.ttfb, status_code: c.status_code, region: c.check_region, error: c.error_message })),
    };
    downloadFile(JSON.stringify(report, null, 2), `${service.name.replace(/\s+/g, '_')}_${reportPeriod}_report.json`, 'application/json');
    toast.success(`JSON report downloaded (${reportPeriodLabel[reportPeriod]})`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Hero header */}
        <div className="relative px-6 pt-6 pb-5 border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-2xl shrink-0">
                {service.icon}
              </div>
              <div className="min-w-0">
                <DialogHeader className="p-0">
                  <DialogTitle className="text-xl font-bold tracking-tight">{service.name}</DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-2 mt-1">
                  <a
                    href={service.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 truncate"
                  >
                    {service.url}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
                <OwnerTagsDisplay ownerId={(service as any).owner_id} tags={(service as any).tags || []} />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadgeClass[service.status] ?? statusBadgeClass.unknown}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${service.status === 'up' ? 'bg-emerald-400' : service.status === 'down' ? 'bg-destructive' : service.status === 'degraded' ? 'bg-amber-400' : 'bg-muted-foreground'}`} />
                {statusLabel[service.status] ?? 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <Tabs defaultValue="overview" className="mt-5">
            <div className="flex items-center justify-between gap-3 mb-5">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="reports" className="gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Reports
                </TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-5 mt-0">
              {/* Stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                  <Activity className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
                  <p className="text-lg font-bold text-foreground capitalize">{statusLabel[service.status] ?? 'Unknown'}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Status</p>
                </div>
                <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                  <ArrowUpCircle className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
                  <p className="text-lg font-bold text-foreground">{service.uptime_percentage ?? 0}%</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Uptime</p>
                </div>
                <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                  <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
                  <p className="text-lg font-bold text-foreground">{service.avg_response_time ?? 0}<span className="text-xs font-normal text-muted-foreground ml-0.5">ms</span></p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Avg Response</p>
                </div>
                <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                  <Shield className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
                  <p className={`text-lg font-bold ${sslColor}`}>
                    {sslDaysLeft !== null ? `${sslDaysLeft}d` : '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">SSL Expires</p>
                  {sslIssuer && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5" title={sslIssuer}>{sslIssuer}</p>
                  )}
                </div>
              </div>

              {/* Check info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground px-1">
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

              {/* Uptime chart */}
              <div className="bg-muted/30 border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Uptime History
                  </h4>
                  <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
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
                <div className="h-44">
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
              <div className="bg-muted/30 border border-border rounded-xl p-4">
                <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-primary" />
                  Response Time <span className="text-muted-foreground font-normal">(last 24 checks)</span>
                </h4>
                <div className="h-44">
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

            <TabsContent value="history" className="mt-0">
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
                      <div key={check.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 text-sm gap-2 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={check.status === 'up' ? 'status-dot-up' : check.status === 'degraded' ? 'status-dot-degraded' : 'status-dot-down'} />
                          <span className="text-foreground capitalize font-medium">{check.status}</span>
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

            {/* Reports tab */}
            <TabsContent value="reports" className="mt-0 space-y-5">
              <div className="text-sm text-muted-foreground">
                Download monitoring reports for <strong className="text-foreground">{service.name}</strong>.
              </div>

              {/* Period selector */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-medium">Period:</span>
                <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                  {(['24h', '7d', '30d', 'all'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setReportPeriod(p)}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors font-medium ${
                        reportPeriod === p
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {p === 'all' ? 'All' : p}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground ml-auto">
                  {getFilteredChecks().length} check{getFilteredChecks().length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="border border-border rounded-xl p-5 flex flex-col gap-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">CSV Report</p>
                      <p className="text-xs text-muted-foreground">Spreadsheet-friendly format</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Export all checks as a CSV file. Ideal for Excel, Google Sheets or custom analysis.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 mt-auto w-full"
                    onClick={handleDownloadCSV}
                    disabled={checksLoading || checks.length === 0}
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </Button>
                </div>

                <div className="border border-border rounded-xl p-5 flex flex-col gap-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">JSON Report</p>
                      <p className="text-xs text-muted-foreground">Developer-friendly format</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Full structured report with service metadata and check history. Perfect for APIs or scripts.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 mt-auto w-full"
                    onClick={handleDownloadJSON}
                    disabled={checksLoading || checks.length === 0}
                  >
                    <Download className="w-4 h-4" />
                    Download JSON
                  </Button>
                </div>
              </div>

            </TabsContent>

            <TabsContent value="settings" className="mt-0 space-y-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

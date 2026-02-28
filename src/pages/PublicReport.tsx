import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Activity, Shield, Clock, TrendingUp, Layers } from 'lucide-react';

export default function PublicReport() {
  const { shareToken } = useParams<{ shareToken: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-report', shareToken],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-report?share_token=${shareToken}`,
        { headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } },
      );
      if (!res.ok) throw new Error('Report not found');
      return res.json();
    },
    enabled: !!shareToken,
  });

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Loading report…</p>
    </div>
  );

  if (error || !data?.report) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Report not found</h1>
        <p className="text-muted-foreground">This report link may be invalid or expired.</p>
      </div>
    </div>
  );

  const report = data.report;
  const services = data.services || [];
  const checks = data.checks || [];

  // Compute metrics
  const serviceMetrics = services.map((service: any) => {
    const sChecks = checks.filter((c: any) => c.service_id === service.id);
    const total = sChecks.length;
    const up = sChecks.filter((c: any) => c.status === 'up').length;
    const uptime = total > 0 ? Math.round((up / total) * 10000) / 100 : null;
    const avgResponse = total > 0
      ? Math.round(sChecks.reduce((sum: number, c: any) => sum + c.response_time, 0) / total)
      : null;

    const incidents: { start: string; end: string; duration: number; cause: string }[] = [];
    let cur: { start: string; end: string; cause: string } | null = null;
    for (const check of sChecks) {
      if (check.status === 'down') {
        if (!cur) cur = { start: check.checked_at, end: check.checked_at, cause: check.error_message || `HTTP ${check.status_code || 'timeout'}` };
        cur.end = check.checked_at;
        if (check.error_message) cur.cause = check.error_message;
      } else if (cur) {
        incidents.push({ ...cur, duration: Math.max(Math.round((new Date(cur.end).getTime() - new Date(cur.start).getTime()) / 60000), 1) });
        cur = null;
      }
    }
    if (cur) incidents.push({ ...cur, duration: Math.max(Math.round((new Date(cur.end).getTime() - new Date(cur.start).getTime()) / 60000), 1) });

    return { service, uptime, avgResponse, total, incidents };
  });

  const validUptimes = serviceMetrics.filter((m: any) => m.uptime !== null);
  const globalUptime = validUptimes.length > 0
    ? Math.round(validUptimes.reduce((s: number, m: any) => s + (m.uptime ?? 0), 0) / validUptimes.length * 100) / 100
    : 0;
  const totalIncidents = serviceMetrics.reduce((s: number, m: any) => s + m.incidents.length, 0);
  const allIncidents = serviceMetrics
    .flatMap((m: any) => m.incidents.map((inc: any) => ({ ...inc, serviceName: m.service.name, serviceIcon: m.service.icon })))
    .sort((a: any, b: any) => new Date(b.start).getTime() - new Date(a.start).getTime());

  const getUptimeBadge = (uptime: number | null) => {
    if (uptime === null) return <Badge variant="secondary">N/A</Badge>;
    if (uptime >= 99.9) return <Badge className="bg-success text-success-foreground">{uptime}%</Badge>;
    if (uptime >= 99) return <Badge className="bg-warning text-warning-foreground">{uptime}%</Badge>;
    return <Badge className="bg-destructive text-destructive-foreground">{uptime}%</Badge>;
  };

  const fmtDuration = (min: number) => min < 60 ? `${min}min` : `${Math.floor(min / 60)}h${min % 60 > 0 ? `${min % 60}min` : ''}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">🦆 MoniDuck Report</h1>
            <p className="text-sm text-muted-foreground">{report.period_label}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Generated {format(new Date(report.created_at), 'PPPp')}
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{globalUptime}%</p>
            <p className="text-xs text-muted-foreground">Global Uptime</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Shield className="w-5 h-5 text-destructive mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{totalIncidents}</p>
            <p className="text-xs text-muted-foreground">Incidents</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-bold text-foreground">{report.period_label}</p>
            <p className="text-xs text-muted-foreground">Period</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Layers className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{services.length}</p>
            <p className="text-xs text-muted-foreground">Services</p>
          </CardContent></Card>
        </div>

        {/* Services Table */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Services Uptime</CardTitle></CardHeader>
          <CardContent>
            {serviceMetrics.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No services in scope</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Uptime %</TableHead>
                  <TableHead className="text-right">Incidents</TableHead>
                  <TableHead className="text-right">Avg Response</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {serviceMetrics.map(({ service, uptime, avgResponse, incidents }: any) => (
                    <TableRow key={service.id}>
                      <TableCell><div className="flex items-center gap-2"><span>{service.icon}</span><span className="font-medium text-foreground">{service.name}</span></div></TableCell>
                      <TableCell className="text-right">{getUptimeBadge(uptime)}</TableCell>
                      <TableCell className="text-right">{incidents.length > 0 ? <Badge variant="destructive" className="text-xs">{incidents.length}</Badge> : <span className="text-success">✓</span>}</TableCell>
                      <TableCell className="text-right text-foreground">{avgResponse !== null ? `${avgResponse}ms` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Incidents */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-destructive" />Incidents Log</CardTitle></CardHeader>
          <CardContent>
            {allIncidents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No incidents during this period 🎉</p>
            ) : (
              <div className="space-y-2">
                {allIncidents.map((inc: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{inc.serviceIcon}</span>
                      <div>
                        <p className="font-medium text-foreground text-sm">{inc.serviceName}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(inc.start), 'PPp')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground max-w-[200px] truncate">{inc.cause}</span>
                      <Badge variant="destructive" className="text-xs whitespace-nowrap">
                        <Clock className="w-3 h-3 mr-1" />{fmtDuration(inc.duration)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground border-t border-border pt-4">
          Generated by MoniDuck · moniduck.io
        </div>
      </div>
    </div>
  );
}

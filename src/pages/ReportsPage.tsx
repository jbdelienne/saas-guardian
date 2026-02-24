import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/hooks/use-workspace';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { subDays, format, formatDistanceToNow } from 'date-fns';
import { fr, enUS, de } from 'date-fns/locale';
import { Download, FileText, Activity, AlertTriangle, Clock, TrendingUp, Shield } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type ReportPeriod = '7d' | '30d';

function getDateLocale(lang: string) {
  if (lang === 'fr') return fr;
  if (lang === 'de') return de;
  return enUS;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { data: workspace } = useWorkspace();
  const workspaceId = workspace?.id;
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState<ReportPeriod>('7d');
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const dateLocale = getDateLocale(i18n.language);

  const periodDays = period === '7d' ? 7 : 30;
  const periodStart = subDays(new Date(), periodDays);
  const periodLabel = period === '7d' ? t('reports.last7days') : t('reports.last30days');

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ['report-services', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('workspace_id', workspaceId!);
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  // Fetch checks for the period
  const serviceIds = services.map((s) => s.id);
  const { data: checks = [] } = useQuery({
    queryKey: ['report-checks', serviceIds, period],
    queryFn: async () => {
      if (serviceIds.length === 0) return [];
      const { data, error } = await supabase
        .from('checks')
        .select('*')
        .in('service_id', serviceIds)
        .gte('checked_at', periodStart.toISOString())
        .order('checked_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: serviceIds.length > 0,
  });

  // Fetch alerts for the period
  const { data: alerts = [] } = useQuery({
    queryKey: ['report-alerts', workspaceId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .gte('created_at', periodStart.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  // Compute metrics per service
  const serviceMetrics = services.map((service) => {
    const sChecks = checks.filter((c) => c.service_id === service.id);
    const total = sChecks.length;
    const up = sChecks.filter((c) => c.status === 'up').length;
    const uptime = total > 0 ? Math.round((up / total) * 10000) / 100 : null;
    const avgResponse = total > 0 ? Math.round(sChecks.reduce((sum, c) => sum + c.response_time, 0) / total) : null;

    // Find downtime incidents (consecutive down checks)
    const incidents: { start: string; end: string | null; duration: number }[] = [];
    let currentIncident: { start: string; end: string | null } | null = null;
    const sortedChecks = [...sChecks].sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime());

    for (const check of sortedChecks) {
      if (check.status === 'down') {
        if (!currentIncident) {
          currentIncident = { start: check.checked_at, end: null };
        }
        currentIncident.end = check.checked_at;
      } else {
        if (currentIncident) {
          const start = new Date(currentIncident.start).getTime();
          const end = new Date(currentIncident.end || currentIncident.start).getTime();
          incidents.push({ start: currentIncident.start, end: currentIncident.end, duration: Math.round((end - start) / 60000) });
          currentIncident = null;
        }
      }
    }
    if (currentIncident) {
      const start = new Date(currentIncident.start).getTime();
      const end = new Date(currentIncident.end || currentIncident.start).getTime();
      incidents.push({ start: currentIncident.start, end: currentIncident.end, duration: Math.round((end - start) / 60000) });
    }

    return { service, uptime, avgResponse, total, incidents };
  });

  // Global stats
  const totalServices = services.length;
  const globalUptime = serviceMetrics.length > 0
    ? Math.round(serviceMetrics.filter((m) => m.uptime !== null).reduce((sum, m) => sum + (m.uptime ?? 0), 0) / Math.max(serviceMetrics.filter((m) => m.uptime !== null).length, 1) * 100) / 100
    : 0;
  const totalIncidents = serviceMetrics.reduce((sum, m) => sum + m.incidents.length, 0);
  const globalAvgResponse = serviceMetrics.filter((m) => m.avgResponse !== null).length > 0
    ? Math.round(serviceMetrics.filter((m) => m.avgResponse !== null).reduce((sum, m) => sum + (m.avgResponse ?? 0), 0) / serviceMetrics.filter((m) => m.avgResponse !== null).length)
    : 0;

  // Alerts by severity
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;
  const warningAlerts = alerts.filter((a) => a.severity === 'warning').length;
  const infoAlerts = alerts.filter((a) => a.severity === 'info').length;

  const getUptimeBadge = (uptime: number | null) => {
    if (uptime === null) return <Badge variant="secondary">{t('reports.noData')}</Badge>;
    if (uptime >= 99.9) return <Badge className="bg-success text-success-foreground">{uptime}%</Badge>;
    if (uptime >= 99) return <Badge className="bg-warning text-warning-foreground">{uptime}%</Badge>;
    return <Badge className="bg-destructive text-destructive-foreground">{uptime}%</Badge>;
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const dateStr = format(new Date(), 'yyyy-MM-dd');
      pdf.save(`moniduck-report-${period}-${dateStr}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              {t('reports.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('reports.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t('reports.last7days')}</SelectItem>
                <SelectItem value="30d">{t('reports.last30days')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExportPDF} disabled={exporting} className="gap-2">
              <Download className="w-4 h-4" />
              {exporting ? t('reports.exporting') : t('reports.exportPdf')}
            </Button>
          </div>
        </div>

        {/* Report content */}
        <div ref={reportRef} className="space-y-6">
          {/* Report Header */}
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {t('reports.reportTitle', { period: periodLabel })}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(periodStart, 'PPP', { locale: dateLocale })} — {format(new Date(), 'PPP', { locale: dateLocale })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t('reports.generatedAt')}</p>
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(), 'PPPp', { locale: dateLocale })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{globalUptime}%</p>
                <p className="text-xs text-muted-foreground">{t('reports.globalUptime')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Activity className="w-5 h-5 text-info mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{globalAvgResponse}ms</p>
                <p className="text-xs text-muted-foreground">{t('reports.avgResponse')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Shield className="w-5 h-5 text-destructive mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{totalIncidents}</p>
                <p className="text-xs text-muted-foreground">{t('reports.incidents')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="w-5 h-5 text-warning mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{alerts.length}</p>
                <p className="text-xs text-muted-foreground">{t('reports.alertsTriggered')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Service Uptime Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                {t('reports.uptimeByService')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {serviceMetrics.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('reports.noServices')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('reports.service')}</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t('reports.status')}</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('reports.uptime')}</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('reports.avgResponseMs')}</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('reports.checks')}</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t('reports.incidentsCol')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceMetrics.map(({ service, uptime, avgResponse, total, incidents }) => (
                        <tr key={service.id} className="border-b border-border/50 hover:bg-muted/10">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span>{service.icon}</span>
                              <span className="font-medium text-foreground">{service.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${service.status === 'up' ? 'bg-success' : service.status === 'down' ? 'bg-destructive' : 'bg-warning'}`} />
                              <span className="text-foreground capitalize">{service.status}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">{getUptimeBadge(uptime)}</td>
                          <td className="py-2.5 px-3 text-right text-foreground">{avgResponse !== null ? `${avgResponse}ms` : '—'}</td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">{total}</td>
                          <td className="py-2.5 px-3 text-right">
                            {incidents.length > 0 ? (
                              <Badge variant="destructive" className="text-xs">{incidents.length}</Badge>
                            ) : (
                              <span className="text-success">✓</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Incidents Detail */}
          {totalIncidents > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-destructive" />
                  {t('reports.incidentDetails')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {serviceMetrics
                    .filter((m) => m.incidents.length > 0)
                    .map(({ service, incidents }) =>
                      incidents.map((inc, idx) => (
                        <div key={`${service.id}-${idx}`} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{service.icon}</span>
                            <div>
                              <p className="font-medium text-foreground text-sm">{service.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(inc.start), 'PPp', { locale: dateLocale })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {inc.duration < 60
                                ? `${inc.duration}min`
                                : `${Math.floor(inc.duration / 60)}h${inc.duration % 60}min`}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alerts Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                {t('reports.alertsSummary')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t('reports.noAlerts')}</p>
              ) : (
                <>
                  <div className="flex gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                      <span className="text-sm text-foreground">{t('reports.critical')}: {criticalAlerts}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                      <span className="text-sm text-foreground">{t('reports.warning')}: {warningAlerts}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-info" />
                      <span className="text-sm text-foreground">{t('reports.info')}: {infoAlerts}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {alerts.slice(0, 10).map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${alert.severity === 'critical' ? 'bg-destructive' : alert.severity === 'warning' ? 'bg-warning' : 'bg-info'}`} />
                          <span className="text-sm font-medium text-foreground">{alert.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: dateLocale })}
                        </span>
                      </div>
                    ))}
                    {alerts.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{alerts.length - 10} {t('reports.moreAlerts')}
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

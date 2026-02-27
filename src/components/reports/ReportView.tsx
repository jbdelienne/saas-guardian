import { type RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/hooks/use-workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { fr, enUS, de } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Activity, Shield, Clock, TrendingUp, Layers } from 'lucide-react';
import type { GeneratedReport } from '@/pages/ReportsPage';

function getDateLocale(lang: string) {
  if (lang === 'fr') return fr;
  if (lang === 'de') return de;
  return enUS;
}

// Known SaaS SLA commitments
const SAAS_SLA_PROMISES: Record<string, number> = {
  google: 99.9,
  microsoft: 99.9,
  aws: 99.99,
  gcp: 99.95,
  azure: 99.95,
  slack: 99.99,
  stripe: 99.99,
};

const SAAS_LABELS: Record<string, string> = {
  google: 'Google Workspace',
  microsoft: 'Microsoft 365',
  aws: 'AWS',
  gcp: 'Google Cloud',
  azure: 'Microsoft Azure',
  slack: 'Slack',
  stripe: 'Stripe',
};

interface ReportViewProps {
  report: GeneratedReport;
  onBack: () => void;
  contentRef?: RefObject<HTMLDivElement>;
}

export default function ReportView({ report, onBack, contentRef }: ReportViewProps) {
  const { user } = useAuth();
  const { data: workspace } = useWorkspace();
  const workspaceId = workspace?.id;
  const { i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);

  const periodStart = report.periodStart;
  const periodEnd = report.periodEnd;

  // Fetch services in scope
  const { data: services = [] } = useQuery({
    queryKey: ['report-view-services', workspaceId, report.serviceIds],
    queryFn: async () => {
      let query = supabase.from('services').select('*').eq('workspace_id', workspaceId!);
      if (report.serviceIds.length > 0) {
        query = query.in('id', report.serviceIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  const serviceIds = services.map((s) => s.id);

  // Fetch checks with pagination
  const { data: checks = [] } = useQuery({
    queryKey: ['report-view-checks', serviceIds, periodStart, periodEnd],
    queryFn: async () => {
      if (serviceIds.length === 0) return [];
      const allChecks: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('checks')
          .select('*')
          .in('service_id', serviceIds)
          .gte('checked_at', periodStart)
          .lte('checked_at', periodEnd)
          .order('checked_at', { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allChecks.push(...(data || []));
        hasMore = (data?.length ?? 0) === pageSize;
        from += pageSize;
      }
      return allChecks;
    },
    enabled: serviceIds.length > 0,
  });

  // Fetch integrations for SLA section
  const { data: integrations = [] } = useQuery({
    queryKey: ['report-view-integrations', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('id, integration_type, is_connected, last_sync')
        .eq('workspace_id', workspaceId!)
        .eq('is_connected', true);
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId && report.includeSla,
  });

  // Fetch integration sync data for SLA calculation
  const integrationIds = integrations.map((i) => i.id);
  const { data: syncData = [] } = useQuery({
    queryKey: ['report-view-sync', integrationIds],
    queryFn: async () => {
      if (integrationIds.length === 0) return [];
      const { data, error } = await supabase
        .from('integration_sync_data')
        .select('*')
        .in('integration_id', integrationIds)
        .gte('synced_at', periodStart)
        .lte('synced_at', periodEnd);
      if (error) throw error;
      return data;
    },
    enabled: integrationIds.length > 0 && report.includeSla,
  });

  // Compute per-service metrics
  const serviceMetrics = services.map((service) => {
    const sChecks = checks.filter((c) => c.service_id === service.id);
    const total = sChecks.length;
    const up = sChecks.filter((c) => c.status === 'up').length;
    const uptime = total > 0 ? Math.round((up / total) * 10000) / 100 : null;
    const avgResponse = total > 0
      ? Math.round(sChecks.reduce((sum: number, c: any) => sum + c.response_time, 0) / total)
      : null;

    // Incidents: consecutive down checks
    const incidents: { start: string; end: string; duration: number; cause: string }[] = [];
    let currentInc: { start: string; end: string; cause: string } | null = null;

    for (const check of sChecks) {
      if (check.status === 'down') {
        if (!currentInc) {
          currentInc = {
            start: check.checked_at,
            end: check.checked_at,
            cause: check.error_message || `HTTP ${check.status_code || 'timeout'}`,
          };
        }
        currentInc.end = check.checked_at;
        if (check.error_message) currentInc.cause = check.error_message;
      } else if (currentInc) {
        const dur = Math.round(
          (new Date(currentInc.end).getTime() - new Date(currentInc.start).getTime()) / 60000
        );
        incidents.push({ ...currentInc, duration: Math.max(dur, 1) });
        currentInc = null;
      }
    }
    if (currentInc) {
      const dur = Math.round(
        (new Date(currentInc.end).getTime() - new Date(currentInc.start).getTime()) / 60000
      );
      incidents.push({ ...currentInc, duration: Math.max(dur, 1) });
    }

    return { service, uptime, avgResponse, total, incidents };
  });

  // Global stats
  const validUptimes = serviceMetrics.filter((m) => m.uptime !== null);
  const globalUptime = validUptimes.length > 0
    ? Math.round(validUptimes.reduce((s, m) => s + (m.uptime ?? 0), 0) / validUptimes.length * 100) / 100
    : 0;
  const totalIncidents = serviceMetrics.reduce((s, m) => s + m.incidents.length, 0);

  // All incidents flat & sorted
  const allIncidents = serviceMetrics
    .flatMap((m) =>
      m.incidents.map((inc) => ({
        ...inc,
        serviceName: m.service.name,
        serviceIcon: m.service.icon,
      }))
    )
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

  // SLA data
  const slaRows = report.includeSla
    ? integrations.map((integ) => {
        const promised = SAAS_SLA_PROMISES[integ.integration_type] ?? 99.9;
        // Compute real SLA from uptime-related sync data or default to promised
        const uptimeMetrics = syncData.filter(
          (d) => d.integration_id === integ.id && d.metric_key === 'uptime_percent'
        );
        const realSla = uptimeMetrics.length > 0
          ? Math.round(uptimeMetrics.reduce((s, d) => s + Number(d.metric_value), 0) / uptimeMetrics.length * 100) / 100
          : null;

        return {
          provider: SAAS_LABELS[integ.integration_type] || integ.integration_type,
          promised,
          real: realSla,
          delta: realSla !== null ? Math.round((realSla - promised) * 100) / 100 : null,
        };
      })
    : [];

  const getUptimeBadge = (uptime: number | null) => {
    if (uptime === null) return <Badge variant="secondary">N/A</Badge>;
    if (uptime >= 99.9) return <Badge className="bg-success text-success-foreground">{uptime}%</Badge>;
    if (uptime >= 99) return <Badge className="bg-warning text-warning-foreground">{uptime}%</Badge>;
    return <Badge className="bg-destructive text-destructive-foreground">{uptime}%</Badge>;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    return `${Math.floor(minutes / 60)}h${minutes % 60 > 0 ? `${minutes % 60}min` : ''}`;
  };

  return (
    <div className="space-y-6" ref={contentRef}>
      {/* Back button + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Report — {report.periodLabel}
          </h2>
          <p className="text-xs text-muted-foreground">
            Generated {format(new Date(report.createdAt), 'PPPp', { locale: dateLocale })}
          </p>
        </div>
      </div>

      {/* Section 1 — Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{globalUptime}%</p>
            <p className="text-xs text-muted-foreground">Global Uptime</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="w-5 h-5 text-destructive mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{totalIncidents}</p>
            <p className="text-xs text-muted-foreground">Incidents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-bold text-foreground">{report.periodLabel}</p>
            <p className="text-xs text-muted-foreground">Period</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Layers className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{services.length}</p>
            <p className="text-xs text-muted-foreground">Services</p>
          </CardContent>
        </Card>
      </div>

      {/* Section 2 — Services Uptime */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Services Uptime
          </CardTitle>
        </CardHeader>
        <CardContent>
          {serviceMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No services in scope</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Uptime %</TableHead>
                  <TableHead className="text-right">Incidents</TableHead>
                  <TableHead className="text-right">Avg Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceMetrics.map(({ service, uptime, avgResponse, incidents }) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{service.icon}</span>
                        <span className="font-medium text-foreground">{service.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{getUptimeBadge(uptime)}</TableCell>
                    <TableCell className="text-right">
                      {incidents.length > 0 ? (
                        <Badge variant="destructive" className="text-xs">{incidents.length}</Badge>
                      ) : (
                        <span className="text-success">✓</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {avgResponse !== null ? `${avgResponse}ms` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Incidents Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-destructive" />
            Incidents Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allIncidents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No incidents during this period 🎉
            </p>
          ) : (
            <div className="space-y-2">
              {allIncidents.map((inc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{inc.serviceIcon}</span>
                    <div>
                      <p className="font-medium text-foreground text-sm">{inc.serviceName}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(inc.start), 'PPp', { locale: dateLocale })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {inc.cause}
                    </span>
                    <Badge variant="destructive" className="text-xs whitespace-nowrap">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDuration(inc.duration)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4 — SaaS SLA */}
      {report.includeSla && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              SaaS Providers SLA
            </CardTitle>
          </CardHeader>
          <CardContent>
            {slaRows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No connected SaaS integrations
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Promised SLA</TableHead>
                    <TableHead className="text-right">Measured SLA</TableHead>
                    <TableHead className="text-right">Delta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slaRows.map((row) => (
                    <TableRow key={row.provider}>
                      <TableCell className="font-medium text-foreground">{row.provider}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.promised}%</TableCell>
                      <TableCell className="text-right">
                        {row.real !== null ? getUptimeBadge(row.real) : <Badge variant="secondary">N/A</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.delta !== null ? (
                          <span className={row.delta >= 0 ? 'text-success' : 'text-destructive'}>
                            {row.delta >= 0 ? '+' : ''}{row.delta}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

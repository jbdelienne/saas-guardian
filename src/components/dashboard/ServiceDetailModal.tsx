import { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Service, useChecks, useTogglePause, useUpdateService, useForceCheck } from '@/hooks/use-supabase';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import { Loader2, ExternalLink, Pencil } from 'lucide-react';
import { UptimePeriod, useUptimeForServices } from '@/hooks/use-uptime';
import { toast } from 'sonner';

const statusLabel: Record<string, string> = {
  up: 'Up',
  down: 'Down',
  degraded: 'Degraded',
  unknown: 'Pending',
};

const statusDotColor: Record<string, string> = {
  up: 'bg-emerald-400',
  down: 'bg-destructive',
  degraded: 'bg-amber-400',
  unknown: 'bg-muted-foreground',
};

interface ServiceDetailModalProps {
  service: Service | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export default function ServiceDetailModal({ service, open, onClose, onDelete }: ServiceDetailModalProps) {
  const { data: checks = [], isLoading: checksLoading } = useChecks(service?.id, 50);
  const [editing, setEditing] = useState(false);
  const updateService = useUpdateService();

  const serviceIds = useMemo(() => service ? [service.id] : [], [service?.id]);
  const { data: uptime24h } = useUptimeForServices(serviceIds, '24h');
  const { data: uptime7d } = useUptimeForServices(serviceIds, '7d');
  const { data: uptime30d } = useUptimeForServices(serviceIds, '30d');

  if (!service) return null;

  const sslExpiry = (service as any).ssl_expiry_date
    ? new Date((service as any).ssl_expiry_date)
    : null;
  const sslDaysLeft = sslExpiry ? differenceInDays(sslExpiry, new Date()) : null;

  // Response time sparkline data (last 24 checks)
  const sparklineData = checks
    .slice(0, 24)
    .reverse()
    .map((c) => ({ v: c.response_time }));

  // Response time stats
  const responseTimes = checks.slice(0, 24).map(c => c.response_time).filter(Boolean);
  const minResponse = responseTimes.length ? Math.min(...responseTimes) : 0;
  const avgResponse = responseTimes.length ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
  const p95Response = responseTimes.length
    ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)] ?? 0
    : 0;

  // Uptime values per period
  const u24 = uptime24h?.[service.id] ?? null;
  const u7 = uptime7d?.[service.id] ?? null;
  const u30 = uptime30d?.[service.id] ?? (service.uptime_percentage ?? null);

  // Incidents: recent checks with status !== 'up'
  const incidents = checks
    .filter(c => c.status !== 'up')
    .slice(0, 10)
    .map(c => {
      const ca = c as any;
      return {
        id: c.id,
        date: format(new Date(c.checked_at), 'MMM dd'),
        duration: ca.response_time ? `${Math.ceil(ca.response_time / 1000)} min` : '—',
        reason: ca.error_message || (ca.status_code ? `${ca.status_code}` : c.status),
      };
    });

  const uptimeBars: { label: string; value: number | null }[] = [
    { label: '24h', value: u24 },
    { label: '7j', value: u7 },
    { label: '30j', value: u30 },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 bg-card border-border">
        {/* Section 1: Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground truncate">{service.name}</h2>
              <a
                href={service.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate block mt-0.5"
              >
                {service.url}
              </a>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <span className={`w-2.5 h-2.5 rounded-full ${statusDotColor[service.status] ?? statusDotColor.unknown}`} />
                {statusLabel[service.status] ?? 'Unknown'}
              </span>
              <button
                onClick={() => setEditing(!editing)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                [Edit]
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Key Metrics */}
        <div className="px-5 py-4 border-b border-border">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{avgResponse}<span className="text-xs font-normal text-muted-foreground">ms</span></p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Response</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{u30 !== null ? `${u30}%` : '—'}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Uptime 30j</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${sslDaysLeft !== null ? (sslDaysLeft <= 7 ? 'text-destructive' : sslDaysLeft <= 30 ? 'text-amber-400' : 'text-foreground') : 'text-muted-foreground'}`}>
                {sslDaysLeft !== null ? `${sslDaysLeft} days` : '—'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">SSL expiry</p>
            </div>
          </div>
        </div>

        {/* Section 3: Response Time Sparkline */}
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-xs font-semibold text-foreground mb-2">Response time – last 24h</h3>
          <div className="h-12">
            {checksLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : sparklineData.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          {responseTimes.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Min {minResponse}ms · Avg {avgResponse}ms · P95 {p95Response}ms
            </p>
          )}
        </div>

        {/* Section 4: Uptime Bars */}
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-xs font-semibold text-foreground mb-3">Uptime</h3>
          <div className="space-y-2.5">
            {uptimeBars.map((bar) => (
              <div key={bar.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{bar.label}</span>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-muted-foreground/50 rounded-full transition-all duration-500"
                    style={{ width: bar.value !== null ? `${bar.value}%` : '0%' }}
                  />
                </div>
                <span className="text-xs font-medium text-foreground w-16 text-right shrink-0">
                  {bar.value !== null ? `${bar.value}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Incidents */}
        <div className="px-5 py-4">
          <h3 className="text-xs font-semibold text-foreground mb-3">Incidents</h3>
          {checksLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : incidents.length === 0 ? (
            <p className="text-xs text-muted-foreground">No incidents recorded</p>
          ) : (
            <div className="space-y-1.5">
              {incidents.map((inc) => (
                <div key={inc.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">{inc.date}</span>
                  <span>·</span>
                  <span>{inc.duration}</span>
                  <span>·</span>
                  <span className="text-destructive truncate">{inc.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

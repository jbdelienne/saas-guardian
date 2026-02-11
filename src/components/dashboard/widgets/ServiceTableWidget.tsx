import { useServices } from '@/hooks/use-supabase';
import { Loader2 } from 'lucide-react';

const statusDot: Record<string, string> = {
  up: 'status-dot-up',
  down: 'status-dot-down',
  degraded: 'status-dot-degraded',
  unknown: 'status-dot-unknown',
};

export default function ServiceTableWidget() {
  const { data: services = [], isLoading } = useServices();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        No services configured
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <p className="text-xs font-medium text-muted-foreground mb-2">All Services</p>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-1.5 font-medium">Service</th>
              <th className="text-left py-1.5 font-medium">Status</th>
              <th className="text-right py-1.5 font-medium">Uptime</th>
              <th className="text-right py-1.5 font-medium">Resp.</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-b border-border/50 last:border-0">
                <td className="py-1.5 text-foreground font-medium">
                  <span className="mr-1.5">{s.icon}</span>{s.name}
                </td>
                <td className="py-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className={statusDot[s.status] ?? 'status-dot-unknown'} />
                    <span className="capitalize">{s.status}</span>
                  </div>
                </td>
                <td className="py-1.5 text-right font-mono">{s.uptime_percentage ?? 0}%</td>
                <td className="py-1.5 text-right font-mono text-muted-foreground">
                  {(s.avg_response_time ?? 0) > 0 ? `${s.avg_response_time}ms` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

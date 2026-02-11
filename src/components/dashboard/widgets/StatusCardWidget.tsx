import { Service } from '@/hooks/use-supabase';
import { CheckCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';

const statusIcons: Record<string, { icon: typeof CheckCircle; colorClass: string }> = {
  up: { icon: CheckCircle, colorClass: 'text-success' },
  down: { icon: XCircle, colorClass: 'text-destructive' },
  degraded: { icon: AlertTriangle, colorClass: 'text-warning' },
  unknown: { icon: HelpCircle, colorClass: 'text-muted-foreground' },
};

export default function StatusCardWidget({ service }: { service: Service | undefined }) {
  if (!service) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Service not found
      </div>
    );
  }

  const { icon: Icon, colorClass } = statusIcons[service.status] ?? statusIcons.unknown;

  return (
    <div className="h-full flex flex-col justify-between p-1">
      <div className="flex items-center gap-2">
        <span className="text-lg">{service.icon}</span>
        <span className="font-medium text-sm text-foreground truncate">{service.name}</span>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <Icon className={`w-8 h-8 ${colorClass}`} />
        <div>
          <p className="text-2xl font-bold text-foreground tracking-tight">
            {service.status === 'unknown' ? '—' : `${service.uptime_percentage ?? 0}%`}
          </p>
          <p className="text-[11px] text-muted-foreground">uptime</p>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {(service.avg_response_time ?? 0) > 0 ? `${service.avg_response_time}ms avg` : 'No data yet'}
      </div>
    </div>
  );
}

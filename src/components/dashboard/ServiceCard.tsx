import { MockService } from '@/lib/mock-data';
import { formatDistanceToNow } from 'date-fns';

interface ServiceCardProps {
  service: MockService;
  onClick: (service: MockService) => void;
}

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

export default function ServiceCard({ service, onClick }: ServiceCardProps) {
  const lastChecked = service.last_check
    ? formatDistanceToNow(new Date(service.last_check), { addSuffix: true })
    : 'Never';

  return (
    <div className="service-card" onClick={() => onClick(service)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{service.icon}</span>
          <h3 className="font-semibold text-card-foreground text-sm">{service.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{statusLabel[service.status]}</span>
          <div className={statusDotClass[service.status]} />
        </div>
      </div>

      <div className="mb-3">
        <span className="text-3xl font-bold text-card-foreground tracking-tight">
          {service.status === 'unknown' ? '—' : `${service.uptime_percentage}%`}
        </span>
        <span className="text-xs text-muted-foreground ml-1.5">uptime</span>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {service.avg_response_time > 0 ? `${service.avg_response_time}ms avg` : '—'}
        </span>
        <span>Checked {lastChecked}</span>
      </div>
    </div>
  );
}

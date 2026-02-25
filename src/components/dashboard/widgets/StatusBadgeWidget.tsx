import { Service } from '@/hooks/use-supabase';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<string, { emoji: string; label: string; colorClass: string; bgClass: string }> = {
  up: { emoji: '🟢', label: 'Operational', colorClass: 'text-success', bgClass: 'bg-success/10' },
  down: { emoji: '🔴', label: 'Down', colorClass: 'text-destructive', bgClass: 'bg-destructive/10' },
  degraded: { emoji: '🟡', label: 'Degraded', colorClass: 'text-warning', bgClass: 'bg-warning/10' },
  unknown: { emoji: '⚪', label: 'Unknown', colorClass: 'text-muted-foreground', bgClass: 'bg-muted' },
};

export default function StatusBadgeWidget({ service }: { service?: Service }) {
  if (!service) {
    return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Service not found</div>;
  }

  const cfg = statusConfig[service.status] ?? statusConfig.unknown;

  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-2 gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">{service.icon}</span>
        <span className="font-semibold text-foreground">{service.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg">{cfg.emoji}</span>
        <span className={`text-sm px-2.5 py-0.5 rounded-full font-medium ${cfg.colorClass} ${cfg.bgClass}`}>
          {cfg.label}
        </span>
      </div>
      {service.last_check && (
        <p className="text-[10px] text-muted-foreground">
          checked {formatDistanceToNow(new Date(service.last_check), { addSuffix: true })}
        </p>
      )}
    </div>
  );
}

import { useServices } from '@/hooks/use-supabase';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusEmoji: Record<string, string> = {
  up: '🟢',
  down: '🔴',
  degraded: '🟡',
  unknown: '⚪',
};

export default function StatusListWidget({ serviceIds }: { serviceIds?: string[] }) {
  const { data: allServices = [], isLoading } = useServices();

  const services = serviceIds?.length
    ? allServices.filter(s => serviceIds.includes(s.id))
    : allServices;

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  if (services.length === 0) {
    return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No services</div>;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <p className="text-xs font-medium text-muted-foreground mb-2">Services Status</p>
      <div className="flex-1 overflow-y-auto space-y-1">
        {services.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0">{statusEmoji[s.status] ?? '⚪'}</span>
              <span className="text-sm font-medium text-foreground truncate">{s.name}</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono shrink-0 ml-2">
              {(s.avg_response_time ?? 0) > 0 ? `${s.avg_response_time}ms` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

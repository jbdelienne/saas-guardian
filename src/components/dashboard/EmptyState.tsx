import { Plus, Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EmptyState({ onAddService }: { onAddService: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Radar className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Start monitoring your SaaS stack</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        Add your first service to get instant visibility into uptime, response times, and operational health.
      </p>
      <Button
        onClick={onAddService}
        className="gradient-primary text-primary-foreground gap-2 px-6 py-3 text-base hover:opacity-90 transition-opacity"
      >
        <Plus className="w-5 h-5" />
        Add Your First Service
      </Button>
    </div>
  );
}

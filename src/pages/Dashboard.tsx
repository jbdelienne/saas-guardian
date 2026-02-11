import { useState, useMemo } from 'react';
import { mockServices, MockService } from '@/lib/mock-data';
import ServiceCard from '@/components/dashboard/ServiceCard';
import EmptyState from '@/components/dashboard/EmptyState';
import AddServiceModal from '@/components/dashboard/AddServiceModal';
import ServiceDetailModal from '@/components/dashboard/ServiceDetailModal';
import AppLayout from '@/components/layout/AppLayout';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function Dashboard() {
  const [services, setServices] = useState<MockService[]>(mockServices);
  const [tvMode, setTvMode] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<MockService | null>(null);

  const stats = useMemo(() => {
    const up = services.filter((s) => s.status === 'up').length;
    const degraded = services.filter((s) => s.status === 'degraded').length;
    const down = services.filter((s) => s.status === 'down').length;
    return { up, degraded, down, total: services.length };
  }, [services]);

  const handleAddService = (svc: { name: string; icon: string; url: string; check_interval: number }) => {
    const newService: MockService = {
      id: crypto.randomUUID(),
      ...svc,
      status: 'unknown',
      uptime_percentage: 0,
      avg_response_time: 0,
      last_check: '',
    };
    setServices((prev) => [...prev, newService]);
  };

  const handleDeleteService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    setSelectedService(null);
  };

  return (
    <AppLayout tvMode={tvMode} onToggleTvMode={() => setTvMode(!tvMode)} onAddService={() => setAddModalOpen(true)}>
      {services.length === 0 ? (
        <EmptyState onAddService={() => setAddModalOpen(true)} />
      ) : (
        <>
          {!tvMode && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-fade-in">
              <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.up}</p>
                  <p className="text-xs text-muted-foreground">Operational</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.degraded}</p>
                  <p className="text-xs text-muted-foreground">Degraded</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.down}</p>
                  <p className="text-xs text-muted-foreground">Down</p>
                </div>
              </div>
            </div>
          )}

          <div className={`grid gap-4 animate-stagger ${
            tvMode
              ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} onClick={setSelectedService} />
            ))}
          </div>
        </>
      )}

      <AddServiceModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onAdd={handleAddService} />
      <ServiceDetailModal
        service={selectedService}
        open={!!selectedService}
        onClose={() => setSelectedService(null)}
        onDelete={handleDeleteService}
      />
    </AppLayout>
  );
}

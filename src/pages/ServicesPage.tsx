import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useServices, useAddService, useDeleteService, useTogglePause, Service } from '@/hooks/use-supabase';
import AddServiceModal from '@/components/dashboard/AddServiceModal';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Pause, Play, ExternalLink, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusConfig: Record<string, { label: string; dotClass: string }> = {
  up: { label: 'Operational', dotClass: 'status-dot-up' },
  down: { label: 'Down', dotClass: 'status-dot-down' },
  degraded: { label: 'Degraded', dotClass: 'status-dot-degraded' },
  unknown: { label: 'Pending', dotClass: 'status-dot-unknown' },
};

export default function ServicesPage() {
  const { data: services = [], isLoading } = useServices();
  const addService = useAddService();
  const deleteService = useDeleteService();
  const togglePause = useTogglePause();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const handleAddService = async (svc: { name: string; icon: string; url: string; check_interval: number }) => {
    await addService.mutateAsync(svc);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteService.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <AppLayout>
      <div className="max-w-5xl animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Services</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage all monitored endpoints
            </p>
          </div>
          <Button onClick={() => setAddModalOpen(true)} className="gap-2 gradient-primary text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4" />
            Add Service
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground mb-4">No services yet. Add your first endpoint to start monitoring.</p>
            <Button onClick={() => setAddModalOpen(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> Add Service
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Uptime</TableHead>
                  <TableHead className="text-right">Avg Response</TableHead>
                  <TableHead>Last Check</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => {
                  const status = statusConfig[service.status] ?? statusConfig.unknown;
                  return (
                    <TableRow key={service.id} className="group">
                      <TableCell>
                        <span className="text-lg">{service.icon}</span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {service.name}
                        {service.is_paused && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-warning font-semibold">Paused</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <a
                          href={service.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs max-w-[200px] truncate"
                        >
                          {service.url.replace(/^https?:\/\//, '')}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={status.dotClass} />
                          <span className="text-xs">{status.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {service.status === 'unknown' ? '—' : `${service.uptime_percentage ?? 0}%`}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {(service.avg_response_time ?? 0) > 0 ? `${service.avg_response_time}ms` : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {service.last_check
                          ? formatDistanceToNow(new Date(service.last_check), { addSuffix: true })
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => togglePause.mutate({ id: service.id, is_paused: !service.is_paused })}
                          >
                            {service.is_paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(service)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AddServiceModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onAdd={handleAddService} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the service and all its monitoring history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

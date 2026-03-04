import { useState } from 'react';
// layout provided by route
import { useSaasDependencies, useAddSaasDependency, useDeleteSaasDependency, useForceCheckSaas, KNOWN_SAAS, DependencyStatus, SaasIncident } from '@/hooks/use-saas-dependencies';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; dotClass: string }> = {
  operational: { label: 'Operational', dotClass: 'status-dot-up' },
  degraded: { label: 'Degraded', dotClass: 'status-dot-degraded' },
  outage: { label: 'Outage', dotClass: 'status-dot-down' },
  unknown: { label: 'Unknown', dotClass: 'status-dot-unknown' },
};

function getProviderIcon(provider: string): string {
  const key = Object.keys(KNOWN_SAAS).find(k => KNOWN_SAAS[k].name.toLowerCase() === provider.toLowerCase());
  return key ? KNOWN_SAAS[key].icon : '📦';
}

export default function SaasStatusPage() {
  const { data: dependencies = [], isLoading } = useSaasDependencies();
  const addDep = useAddSaasDependency();
  const deleteDep = useDeleteSaasDependency();
  const forceCheck = useForceCheckSaas();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DependencyStatus | null>(null);
  const [incidentTarget, setIncidentTarget] = useState<DependencyStatus | null>(null);

  const existingProviders = new Set(dependencies.map(d => d.provider.toLowerCase()));
  const availableSaas = Object.entries(KNOWN_SAAS).filter(([_, v]) => !existingProviders.has(v.name.toLowerCase()));

  const handleAdd = async (key: string) => {
    try {
      await addDep.mutateAsync(key);
      toast.success('SaaS dependency added');
      setAddModalOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteDep.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">SaaS Dependencies</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Monitor your third-party SaaS providers status and SLA compliance.</p>
          </div>
          <Button onClick={() => setAddModalOpen(true)} className="gap-2 gradient-primary text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4" />
            Add SaaS
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : dependencies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground mb-4">No SaaS dependencies monitored yet.</p>
            <Button onClick={() => setAddModalOpen(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> Add your first SaaS
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-md overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">SLA promis</TableHead>
                  <TableHead className="text-right">SLA réel</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <TableHead>Derniers incidents</TableHead>
                  <TableHead>Dernier check</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dependencies.map((dep) => {
                  const status = statusConfig[dep.status] ?? statusConfig.unknown;
                  const delta = dep.sla_actual - dep.sla_promised;
                  const slaBreach = delta < 0;
                  const incidents = dep.incidents || [];
                  const recentIncidents = incidents.slice(0, 3);

                  return (
                    <TableRow key={dep.id}>
                      <TableCell>
                        <span className="text-lg">{getProviderIcon(dep.provider)}</span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {dep.provider}
                          {dep.status_page_url && (
                            <a href={dep.status_page_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={status.dotClass} />
                          <span className="text-xs">{status.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{dep.sla_promised}%</TableCell>
                      <TableCell className={`text-right font-mono text-sm ${slaBreach ? 'text-destructive font-semibold' : ''}`}>
                        {dep.sla_actual}%
                      </TableCell>
                      <TableCell className="text-right">
                        {slaBreach ? (
                          <Badge variant="destructive" className="text-xs font-mono">
                            {delta.toFixed(2)}%
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs font-mono border-emerald-500/30 text-emerald-400">
                            +{delta.toFixed(2)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {recentIncidents.length > 0 ? (
                          <button
                            onClick={() => setIncidentTarget(dep)}
                            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                          >
                            {recentIncidents.length} incident{recentIncidents.length > 1 ? 's' : ''}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {dep.last_check
                          ? formatDistanceToNow(new Date(dep.last_check), { addSuffix: true })
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            title="Force check"
                            onClick={() => {
                              forceCheck.mutate(dep.id, {
                                onSuccess: () => toast.success('Check triggered'),
                                onError: (err) => toast.error(err.message),
                              });
                            }}
                            disabled={forceCheck.isPending}
                          >
                            {forceCheck.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            title="Delete"
                            onClick={() => setDeleteTarget(dep)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add SaaS Modal */}
      <Dialog open={addModalOpen} onOpenChange={(v) => !v && setAddModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add SaaS dependency</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {availableSaas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">All known SaaS providers are already added.</p>
            ) : (
              availableSaas.map(([key, saas]) => (
                <button
                  key={key}
                  onClick={() => handleAdd(key)}
                  disabled={addDep.isPending}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-muted transition-colors text-left"
                >
                  <span className="text-lg">{saas.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{saas.name}</p>
                    <p className="text-[11px] text-muted-foreground">SLA: {saas.defaultSla}%</p>
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Incidents Modal */}
      <Dialog open={!!incidentTarget} onOpenChange={(v) => !v && setIncidentTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{incidentTarget?.provider} — Incidents</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {(incidentTarget?.incidents || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No incidents recorded.</p>
            ) : (
              (incidentTarget?.incidents || []).map((inc: SaasIncident, i: number) => (
                <div key={i} className="border border-border rounded-sm p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{inc.title}</span>
                    <Badge
                      variant={inc.severity === 'critical' ? 'destructive' : 'outline'}
                      className="text-[10px]"
                    >
                      {inc.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{new Date(inc.date).toLocaleDateString()}</span>
                    <span>{inc.duration_minutes}min</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.provider}?</AlertDialogTitle>
            <AlertDialogDescription>This will remove this SaaS dependency from your monitoring.</AlertDialogDescription>
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
    </div>
  );
}

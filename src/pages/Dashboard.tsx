import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useServices, Service } from '@/hooks/use-supabase';
import { useDashboards, useCreateDashboard, useDeleteDashboard, useDashboardWidgets, useCreateDashboardWidgets } from '@/hooks/use-dashboards';
import { templates } from '@/components/dashboard/DashboardTemplates';
import WidgetRenderer, { WidgetConfig } from '@/components/dashboard/WidgetRenderer';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowLeft, Loader2, LayoutDashboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Dashboard() {
  const { data: services = [] } = useServices();
  const { data: dashboards = [], isLoading } = useDashboards();
  const createDashboard = useCreateDashboard();
  const deleteDashboard = useDeleteDashboard();
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const selectedDashboard = dashboards.find((d) => d.id === selectedDashboardId);

  const handleCreate = async () => {
    if (!newName.trim() || !selectedTemplate) return;
    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;

    const dashboard = await createDashboard.mutateAsync({ name: newName, template: selectedTemplate });
    const widgetDefs = template.generateWidgets(services.map((s) => s.id));
    // Widgets will be created via the hook
    await createDashboardWidgets.mutateAsync({
      dashboardId: dashboard.id,
      widgets: widgetDefs,
    });

    setSelectedDashboardId(dashboard.id);
    setCreateOpen(false);
    setNewName('');
    setSelectedTemplate(null);
  };

  // Hook for creating widgets
  const createDashboardWidgets = useCreateDashboardWidgets();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  // Dashboard detail view
  if (selectedDashboard) {
    return (
      <AppLayout>
        <DashboardDetailView
          dashboardId={selectedDashboard.id}
          dashboardName={selectedDashboard.name}
          services={services}
          onBack={() => setSelectedDashboardId(null)}
          onDelete={async () => {
            await deleteDashboard.mutateAsync(selectedDashboard.id);
            setSelectedDashboardId(null);
          }}
        />
      </AppLayout>
    );
  }

  // Dashboard list view
  return (
    <AppLayout>
      <div className="max-w-5xl animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboards</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create custom views from your services and integrations
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 gradient-primary text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4" />
            New Dashboard
          </Button>
        </div>

        {dashboards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <LayoutDashboard className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">No dashboards yet</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Create your first dashboard from a template to visualize your services and integrations data.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2 gradient-primary text-primary-foreground hover:opacity-90">
              <Plus className="w-4 h-4" />
              Create Dashboard
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map((db) => {
              const tmpl = templates.find((t) => t.id === db.template);
              const Icon = tmpl?.icon ?? LayoutDashboard;
              return (
                <button
                  key={db.id}
                  onClick={() => setSelectedDashboardId(db.id)}
                  className="bg-card border border-border rounded-xl p-6 text-left hover:border-primary/30 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">{db.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tmpl?.description ?? 'Custom dashboard'}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-3">
                    Created {new Date(db.created_at).toLocaleDateString()}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dashboard Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Dashboard"
              />
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              <div className="grid grid-cols-2 gap-3">
                {templates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedTemplate === tmpl.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/30'
                    }`}
                  >
                    <tmpl.icon className={`w-5 h-5 mb-2 ${selectedTemplate === tmpl.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-sm font-medium text-foreground">{tmpl.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{tmpl.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {services.length === 0 && (
              <p className="text-xs text-warning">
                ⚠️ No services found. Add services first to populate dashboard widgets.
              </p>
            )}

            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || !selectedTemplate || createDashboard.isPending}
              className="w-full gradient-primary text-primary-foreground hover:opacity-90"
            >
              {createDashboard.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

// Sub-component for dashboard detail view
function DashboardDetailView({
  dashboardId,
  dashboardName,
  services,
  onBack,
  onDelete,
}: {
  dashboardId: string;
  dashboardName: string;
  services: Service[];
  onBack: () => void;
  onDelete: () => void;
}) {
  const { data: widgets = [], isLoading } = useDashboardWidgets(dashboardId);

  const widgetConfigs: WidgetConfig[] = widgets.map((w) => ({
    id: w.id,
    widget_type: w.widget_type,
    title: w.title,
    config: (w.config as Record<string, unknown>) ?? {},
    width: w.width,
    height: w.height,
  }));

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">{dashboardName}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={onDelete} className="gap-2 text-destructive hover:bg-destructive/10">
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : widgetConfigs.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No widgets in this dashboard</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {widgetConfigs.map((widget) => {
            const colSpan = widget.width >= 2 ? 'sm:col-span-2' : '';
            const minHeight = widget.height >= 2 ? 'min-h-[280px]' : 'min-h-[160px]';
            return (
              <div
                key={widget.id}
                className={`bg-card border border-border rounded-xl p-4 ${colSpan} ${minHeight}`}
              >
                <WidgetRenderer widget={widget} services={services} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

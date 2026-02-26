import { useState, useCallback, useRef } from 'react';
import moniduckLogo from '@/assets/moniduck-logo.png';
import AppLayout from '@/components/layout/AppLayout';
import { useServices, Service } from '@/hooks/use-supabase';
import {
  useDashboards,
  useCreateDashboard,
  useDeleteDashboard,
  useRenameDashboard,
  useDashboardWidgets,
  useAddDashboardWidget,
  useUpdateWidgetPositions,
  useDeleteDashboardWidget,
} from '@/hooks/use-dashboards';
import { useLatestSyncMetrics, SyncMetric } from '@/hooks/use-all-sync-data';
import WidgetRenderer, { WidgetConfig } from '@/components/dashboard/WidgetRenderer';
import AddWidgetModal, { NewWidgetDef } from '@/components/dashboard/AddWidgetModal';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowLeft, Loader2, LayoutDashboard, X, Pencil, Check, Monitor } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveGridLayout, useContainerWidth, LayoutItem } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { data: services = [] } = useServices();
  const { data: syncMetrics = [] } = useLatestSyncMetrics();
  const { data: dashboards = [], isLoading } = useDashboards();
  const createDashboard = useCreateDashboard();
  const deleteDashboard = useDeleteDashboard();
  const renameDashboard = useRenameDashboard();
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const { t } = useTranslation();

  const selectedDashboard = dashboards.find((d) => d.id === selectedDashboardId);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const dashboard = await createDashboard.mutateAsync({ name: newName, template: 'custom' });
    setSelectedDashboardId(dashboard.id);
    setCreateOpen(false);
    setNewName('');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (selectedDashboard) {
    return (
      <AppLayout>
        <DashboardDetailView
          dashboardId={selectedDashboard.id}
          dashboardName={selectedDashboard.name}
          services={services}
          syncMetrics={syncMetrics}
          onBack={() => setSelectedDashboardId(null)}
          onDelete={async () => {
            await deleteDashboard.mutateAsync(selectedDashboard.id);
            setSelectedDashboardId(null);
          }}
          onRename={async (name: string) => {
            await renameDashboard.mutateAsync({ id: selectedDashboard.id, name });
          }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t('dashboard.subtitle')}</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 gradient-primary text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4" />
            {t('dashboard.newDashboard')}
          </Button>
        </div>

        {dashboards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <LayoutDashboard className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">{t('dashboard.noDashboards')}</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">{t('dashboard.noDashboardsDesc')}</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2 gradient-primary text-primary-foreground hover:opacity-90">
              <Plus className="w-4 h-4" />
              {t('dashboard.createDashboard')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map((db) => (
              <button
                key={db.id}
                onClick={() => setSelectedDashboardId(db.id)}
                className="bg-card border border-border rounded-xl p-6 text-left hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <LayoutDashboard className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{db.name}</h3>
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-3">
                  {t('dashboard.created')} {new Date(db.created_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Dashboard Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('dashboard.newDashboard')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('dashboard.name')}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Dashboard"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createDashboard.isPending}
              className="w-full gradient-primary text-primary-foreground hover:opacity-90"
            >
              {createDashboard.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('dashboard.create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function DashboardDetailView({
  dashboardId,
  dashboardName,
  services,
  syncMetrics,
  onBack,
  onDelete,
  onRename,
}: {
  dashboardId: string;
  dashboardName: string;
  services: Service[];
  syncMetrics: SyncMetric[];
  onBack: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const { data: widgets = [], isLoading } = useDashboardWidgets(dashboardId);
  const addWidget = useAddDashboardWidget();
  const updatePositions = useUpdateWidgetPositions();
  const deleteWidget = useDeleteDashboardWidget();
  const [addOpen, setAddOpen] = useState(false);
  const [tvMode, setTvMode] = useState(false);

  const enterTvMode = useCallback(() => {
    setTvMode(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const exitTvMode = useCallback(() => {
    setTvMode(false);
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(dashboardName);
  const layoutChangeRef = useRef<LayoutItem[]>([]);
  const { width: containerWidth, ref: containerRef } = useContainerWidth({ initialWidth: 1200 });
  const { t } = useTranslation();

  const widgetConfigs: WidgetConfig[] = widgets.map((w) => ({
    id: w.id,
    widget_type: w.widget_type,
    title: w.title,
    config: (w.config as Record<string, unknown>) ?? {},
    width: w.width,
    height: w.height,
  }));

  const layouts: LayoutItem[] = widgets.map((w) => ({
    i: w.id,
    x: w.position_x,
    y: w.position_y,
    w: w.width,
    h: w.height,
    minW: 1,
    minH: 1,
  }));

  const handleLayoutChange = useCallback(
    (newLayout: LayoutItem[]) => {
      layoutChangeRef.current = newLayout;
    },
    []
  );

  const handleDragOrResizeStop = useCallback(() => {
    const newLayout = layoutChangeRef.current;
    if (newLayout.length === 0) return;
    const updates = newLayout.map((item) => ({
      id: item.i,
      position_x: item.x,
      position_y: item.y,
      width: item.w,
      height: item.h,
    }));
    updatePositions.mutate(updates);
  }, [updatePositions]);

  const handleAddWidget = async (def: NewWidgetDef) => {
    const maxY = widgets.reduce((max, w) => Math.max(max, w.position_y + w.height), 0);
    await addWidget.mutateAsync({
      dashboardId,
      widget: {
        ...def,
        position_x: 0,
        position_y: maxY,
      },
    });
    setAddOpen(false);
  };

  if (tvMode) {
    return (
      <div className="fixed inset-0 z-50 bg-background tv-mode">
        {/* Top bar: dashboard name left, moniduck + exit right */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3">
          <span className="text-4xl font-bold text-foreground">{dashboardName}</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground tracking-wide">moniduck</span>
            <button
              onClick={exitTvMode}
              className="bg-card/80 backdrop-blur border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('topbar.exitTvMode')}
            </button>
          </div>
        </div>
        {/* Logo watermark bottom-right */}
        <img
          src={moniduckLogo}
          alt="MoniDuck"
          className="fixed bottom-4 right-4 w-24 h-24 z-50 pointer-events-none"
        />
        <div className="p-6 pt-14 h-full overflow-auto" ref={containerRef}>
          {widgetConfigs.length > 0 && (
            <ResponsiveGridLayout
              width={containerWidth}
              className="layout"
              layouts={{ lg: layouts }}
              breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 0 }}
              cols={{ lg: 12, md: 8, sm: 4, xs: 2 }}
              rowHeight={80}
              onLayoutChange={handleLayoutChange}
              onDragStop={handleDragOrResizeStop}
              onResizeStop={handleDragOrResizeStop}
              draggableHandle=".widget-drag-handle"
              isResizable={false}
              isDraggable={false}
            >
              {widgetConfigs.map((widget) => (
                <div key={widget.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground truncate">{widget.title}</span>
                  </div>
                  <div className="flex-1 p-3 overflow-hidden">
                    <WidgetRenderer widget={widget} services={services} syncMetrics={syncMetrics} />
                  </div>
                </div>
              ))}
            </ResponsiveGridLayout>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" ref={containerRef}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {isRenaming ? (
            <div className="flex items-center gap-2">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="h-8 text-lg font-bold w-60"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && renameValue.trim()) {
                    onRename(renameValue.trim());
                    setIsRenaming(false);
                  }
                  if (e.key === 'Escape') {
                    setRenameValue(dashboardName);
                    setIsRenaming(false);
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-success"
                onClick={() => {
                  if (renameValue.trim()) {
                    onRename(renameValue.trim());
                    setIsRenaming(false);
                  }
                }}
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{dashboardName}</h1>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setIsRenaming(true)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddOpen(true)} className="gap-2 gradient-primary text-primary-foreground hover:opacity-90" size="sm">
            <Plus className="w-4 h-4" />
            {t('dashboard.addWidget')}
          </Button>
          <Button variant="outline" size="sm" onClick={enterTvMode} className="gap-2" title="TV Mode">
            <Monitor className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="gap-2 text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" />
            {t('dashboard.delete')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : widgetConfigs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <LayoutDashboard className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-foreground mb-1">{t('dashboard.emptyDashboard')}</p>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">{t('dashboard.emptyDashboardDesc')}</p>
          <Button onClick={() => setAddOpen(true)} className="gap-2 gradient-primary text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4" />
            {t('dashboard.addWidget')}
          </Button>
        </div>
      ) : (
        <ResponsiveGridLayout
          width={containerWidth}
          className="layout"
          layouts={{ lg: layouts }}
          breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 0 }}
          cols={{ lg: 12, md: 8, sm: 4, xs: 2 }}
          rowHeight={80}
          onLayoutChange={handleLayoutChange}
          onDragStop={handleDragOrResizeStop}
          onResizeStop={handleDragOrResizeStop}
          draggableHandle=".widget-drag-handle"
          isResizable
          isDraggable
        >
          {widgetConfigs.map((widget) => (
            <div key={widget.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="widget-drag-handle flex items-center justify-between px-3 py-2 bg-muted/30 cursor-grab active:cursor-grabbing border-b border-border">
                <span className="text-xs font-medium text-muted-foreground truncate">{widget.title}</span>
                <button
                  onClick={() => deleteWidget.mutate(widget.id)}
                  className="text-muted-foreground/60 hover:text-destructive transition-colors p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 p-3 overflow-hidden">
                <WidgetRenderer widget={widget} services={services} syncMetrics={syncMetrics} />
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}

      <AddWidgetModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={handleAddWidget}
        isLoading={addWidget.isPending}
      />
    </div>
  );
}

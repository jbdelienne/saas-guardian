import { useState, useCallback, useMemo } from 'react';
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
import { Plus, Trash2, ArrowLeft, Loader2, LayoutDashboard, X, Pencil, Check, Monitor, GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
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

/* ─── Sortable Widget Card ─── */

function SortableWidgetCard({
  widget,
  services,
  syncMetrics,
  onDelete,
  tvMode,
}: {
  widget: WidgetConfig;
  services: Service[];
  syncMetrics: SyncMetric[];
  onDelete: (id: string) => void;
  tvMode?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const colSpan = Math.min(widget.width, 12);
  const rowSpan = widget.height;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
      }}
      className={cn(
        'group relative rounded-2xl border border-border/60 overflow-hidden flex flex-col',
        'bg-card/80 backdrop-blur-sm',
        'shadow-sm hover:shadow-lg hover:border-primary/20',
        'transition-all duration-300 ease-out',
        isDragging && 'opacity-30 scale-[0.98]',
      )}
    >
      {/* Header — entire bar is the drag handle */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2.5',
          'border-b border-border/40',
          'bg-gradient-to-r from-muted/20 to-transparent',
          !tvMode && 'cursor-grab active:cursor-grabbing',
        )}
        {...(tvMode ? {} : { ...attributes, ...listeners })}
      >
        <div className="flex items-center gap-2 min-w-0">
          {!tvMode && (
            <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
          )}
          <span className="text-xs font-medium text-muted-foreground truncate">{widget.title}</span>
        </div>
        {!tvMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(widget.id); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all duration-200 p-1 rounded-md hover:bg-destructive/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden">
        <WidgetRenderer widget={widget} services={services} syncMetrics={syncMetrics} />
      </div>

      {/* Subtle bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}

/* ─── Drag Overlay Card ─── */

function DragOverlayCard({ widget, services, syncMetrics }: { widget: WidgetConfig; services: Service[]; syncMetrics: SyncMetric[] }) {
  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-primary/40 overflow-hidden flex flex-col',
        'bg-card/95 backdrop-blur-md shadow-2xl',
        'ring-4 ring-primary/10',
      )}
      style={{
        width: `${Math.min(widget.width, 6) * 120}px`,
        minHeight: `${widget.height * 80}px`,
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-primary/20 bg-primary/5">
        <GripVertical className="w-4 h-4 text-primary/60" />
        <span className="text-xs font-medium text-foreground truncate">{widget.title}</span>
      </div>
      <div className="flex-1 p-4 overflow-hidden">
        <WidgetRenderer widget={widget} services={services} syncMetrics={syncMetrics} />
      </div>
    </div>
  );
}

/* ─── Dashboard Detail View ─── */

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
  const [activeId, setActiveId] = useState<string | null>(null);

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
  const { t } = useTranslation();

  const widgetConfigs: WidgetConfig[] = useMemo(() =>
    widgets.map((w) => ({
      id: w.id,
      widget_type: w.widget_type,
      title: w.title,
      config: (w.config as Record<string, unknown>) ?? {},
      width: w.width,
      height: w.height,
    })),
    [widgets]
  );

  const sortedIds = useMemo(() => widgetConfigs.map(w => w.id), [widgetConfigs]);
  const activeWidget = activeId ? widgetConfigs.find(w => w.id === activeId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedIds.indexOf(active.id as string);
    const newIndex = sortedIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(sortedIds, oldIndex, newIndex);
    const updates = newOrder.map((id, idx) => {
      const w = widgetConfigs.find(wc => wc.id === id)!;
      return {
        id,
        position_x: 0,
        position_y: idx,
        width: w.width,
        height: w.height,
      };
    });
    updatePositions.mutate(updates);
  }, [sortedIds, widgetConfigs, updatePositions]);

  const handleAddWidget = async (def: NewWidgetDef) => {
    const maxY = widgets.reduce((max, w) => Math.max(max, w.position_y + 1), 0);
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
        <img
          src={moniduckLogo}
          alt="MoniDuck"
          className="fixed bottom-4 right-4 w-24 h-24 z-50 pointer-events-none"
        />
        <div className="p-6 pt-16 h-full overflow-auto">
          <div className="grid grid-cols-12 auto-rows-[80px] gap-4">
            {widgetConfigs.map((widget) => (
              <SortableWidgetCard
                key={widget.id}
                widget={widget}
                services={services}
                syncMetrics={syncMetrics}
                onDelete={() => {}}
                tvMode
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
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

      {/* Grid */}
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortedIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-12 auto-rows-[80px] gap-4">
              {widgetConfigs.map((widget) => (
                <SortableWidgetCard
                  key={widget.id}
                  widget={widget}
                  services={services}
                  syncMetrics={syncMetrics}
                  onDelete={(id) => deleteWidget.mutate(id)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}>
            {activeWidget ? (
              <DragOverlayCard
                widget={activeWidget}
                services={services}
                syncMetrics={syncMetrics}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
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

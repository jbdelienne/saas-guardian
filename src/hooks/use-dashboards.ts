import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardRow {
  id: string;
  user_id: string;
  name: string;
  template: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardWidgetRow {
  id: string;
  dashboard_id: string;
  user_id: string;
  widget_type: string;
  title: string;
  config: unknown;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  created_at: string;
}

export function useDashboards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboards', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DashboardRow[];
    },
    enabled: !!user,
  });
}

export function useCreateDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; template: string }) => {
      // Get user's workspace_id for RLS
      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user!.id)
        .single();

      const { data, error } = await supabase
        .from('dashboards')
        .insert({ ...input, user_id: user!.id, workspace_id: profile?.workspace_id })
        .select()
        .single();
      if (error) throw error;
      return data as DashboardRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboards'] }),
  });
}

export function useDeleteDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dashboards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboards'] }),
  });
}

export function useRenameDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('dashboards').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboards'] }),
  });
}

export function useDashboardWidgets(dashboardId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard_widgets', dashboardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('dashboard_id', dashboardId!)
        .order('position_y', { ascending: true })
        .order('position_x', { ascending: true });
      if (error) throw error;
      return data as DashboardWidgetRow[];
    },
    enabled: !!user && !!dashboardId,
  });
}

export function useCreateDashboardWidgets() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dashboardId,
      widgets,
    }: {
      dashboardId: string;
      widgets: Array<{
        widget_type: string;
        title: string;
        config: Record<string, unknown>;
        width: number;
        height: number;
      }>;
    }) => {
      const rows = widgets.map((w, i) => ({
        dashboard_id: dashboardId,
        user_id: user!.id,
        widget_type: w.widget_type,
        title: w.title,
        config: w.config as unknown as Record<string, never>,
        position_x: i % 4,
        position_y: Math.floor(i / 4),
        width: w.width,
        height: w.height,
      }));
      const { error } = await supabase.from('dashboard_widgets').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard_widgets'] }),
  });
}

export function useAddDashboardWidget() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dashboardId,
      widget,
    }: {
      dashboardId: string;
      widget: {
        widget_type: string;
        title: string;
        config: Record<string, unknown>;
        width: number;
        height: number;
        position_x: number;
        position_y: number;
      };
    }) => {
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .insert({
          dashboard_id: dashboardId,
          user_id: user!.id,
          ...widget,
          config: widget.config as unknown as Record<string, never>,
        })
        .select()
        .single();
      if (error) throw error;
      return data as DashboardWidgetRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard_widgets'] }),
  });
}

export function useUpdateWidgetPositions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      updates: Array<{ id: string; position_x: number; position_y: number; width: number; height: number }>
    ) => {
      for (const u of updates) {
        const { error } = await supabase
          .from('dashboard_widgets')
          .update({ position_x: u.position_x, position_y: u.position_y, width: u.width, height: u.height })
          .eq('id', u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard_widgets'] }),
  });
}

export function useDeleteDashboardWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dashboard_widgets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard_widgets'] }),
  });
}

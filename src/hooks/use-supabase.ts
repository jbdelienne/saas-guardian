import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Service = Tables<'services'>;
export type Check = Tables<'checks'>;
export type Alert = Tables<'alerts'>;
export type Integration = Tables<'integrations'>;

export function useServices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['services', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Service[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useAddService() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (svc: { name: string; icon: string; url: string; check_interval: number; content_keyword?: string; owner_id?: string; tags?: string[] }) => {
      // Get user's workspace_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user!.id)
        .single();

      const { data, error } = await supabase
        .from('services')
        .insert({ ...svc, user_id: user!.id, workspace_id: profile?.workspace_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; owner_id?: string | null; tags?: string[]; content_keyword?: string | null }) => {
      const { error } = await supabase.from('services').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function useUpdateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; owner_id?: string | null; tags?: string[] }) => {
      const { error } = await supabase.from('integrations').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function useTogglePause() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_paused }: { id: string; is_paused: boolean }) => {
      const { error } = await supabase.from('services').update({ is_paused }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function useChecks(serviceId: string | undefined, limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['checks', serviceId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checks')
        .select('*')
        .eq('service_id', serviceId!)
        .order('checked_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Check[];
    },
    enabled: !!user && !!serviceId,
  });
}

export function useAlerts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['alerts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Alert[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('alerts').update({ is_dismissed: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useIntegrations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['integrations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Integration[];
    },
    enabled: !!user,
  });
}

export function useConnectIntegration() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (integrationType: string) => {
      const { data, error } = await supabase
        .from('integrations')
        .insert({ user_id: user!.id, integration_type: integrationType, is_connected: true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}

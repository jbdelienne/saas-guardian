import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
  email?: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  invited_email: string;
  invited_by: string;
  role: 'admin' | 'member';
  status: string;
  created_at: string;
  expires_at: string;
}

export function useWorkspace() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user!.id)
        .single();
      if (!profile?.workspace_id) return null;

      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', profile.workspace_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useWorkspaceMembers() {
  const { user } = useAuth();
  const { data: workspace } = useWorkspace();
  return useQuery({
    queryKey: ['workspace-members', workspace?.id],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .order('joined_at', { ascending: true });
      if (error) throw error;

      // Fetch profiles for each member
      const userIds = (members || []).map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      // Fetch emails via security definer function
      const { data: emails } = await supabase
        .rpc('get_workspace_member_emails', { _workspace_id: workspace!.id });

      return (members || []).map((m: any) => ({
        ...m,
        profile: profiles?.find((p: any) => p.user_id === m.user_id) || null,
        email: (emails as any[])?.find((e: any) => e.user_id === m.user_id)?.email || null,
      })) as WorkspaceMember[];
    },
    enabled: !!workspace?.id,
  });
}

export function useWorkspaceInvitations() {
  const { data: workspace } = useWorkspace();
  return useQuery({
    queryKey: ['workspace-invitations', workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WorkspaceInvitation[];
    },
    enabled: !!workspace?.id,
  });
}

export function useInviteMember() {
  const { data: workspace } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'member' }) => {
      const { data, error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: workspace!.id,
          invited_email: email.toLowerCase().trim(),
          invited_by: user!.id,
          role,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-invitations'] }),
  });
}

export function useCancelInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workspace_invitations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-invitations'] }),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'admin' | 'member' }) => {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-members'] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workspace_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-members'] }),
  });
}

export function useUpdateWorkspaceName() {
  const { data: workspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('workspaces')
        .update({ name })
        .eq('id', workspace!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace'] }),
  });
}

export function useIsWorkspaceAdmin() {
  const { user } = useAuth();
  const { data: members } = useWorkspaceMembers();
  if (!user || !members) return false;
  return members.some((m) => m.user_id === user.id && m.role === 'admin');
}

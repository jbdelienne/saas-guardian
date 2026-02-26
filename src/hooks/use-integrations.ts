import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SyncDataRow {
  id: string;
  user_id: string;
  integration_id: string;
  metric_type: string;
  metric_key: string;
  metric_value: number;
  metric_unit: string;
  metadata: Record<string, unknown>;
  synced_at: string;
}

export interface AlertThreshold {
  id: string;
  user_id: string;
  integration_type: string;
  metric_type: string;
  threshold_value: number;
  threshold_operator: string;
  severity: string;
  is_enabled: boolean;
  label: string | null;
}

export function useSyncData(integrationId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sync-data', integrationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_sync_data')
        .select('*')
        .eq('integration_id', integrationId!)
        .order('synced_at', { ascending: false });
      if (error) throw error;
      return data as unknown as SyncDataRow[];
    },
    enabled: !!user && !!integrationId,
  });
}

export function useAlertThresholds(integrationType: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['alert-thresholds', integrationType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_thresholds')
        .select('*')
        .eq('integration_type', integrationType!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as unknown as AlertThreshold[];
    },
    enabled: !!user && !!integrationType,
  });
}

export function useUpdateThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; threshold_value: number; severity: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('alert_thresholds')
        .update({
          threshold_value: params.threshold_value,
          severity: params.severity,
          is_enabled: params.is_enabled,
        })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-thresholds'] }),
  });
}

export function useStartOAuth() {
  return useMutation({
    mutationFn: async (provider: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integration-oauth?provider=${provider}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to start OAuth');
      }

      const data = await response.json();
      window.location.href = data.url;
    },
  });
}

export function useSyncIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (integrationId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integration-sync?integration_id=${integrationId}&auto_sync_drives=true`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Sync failed');
      }

      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sync-data'] });
      qc.invalidateQueries({ queryKey: ['integrations'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useSyncAwsCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (credentialId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aws-sync?credential_id=${credentialId}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'AWS sync failed');
      }

      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sync-data'] });
      qc.invalidateQueries({ queryKey: ['integrations'] });
      qc.invalidateQueries({ queryKey: ['all-sync-data'] });
      qc.invalidateQueries({ queryKey: ['aws-credentials'] });
    },
  });
}

export function useAwsCredentials() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['aws-credentials', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aws_credentials')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useDisconnectIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (integrationId: string) => {
      const { error } = await supabase
        .from('integrations')
        .update({ is_connected: false, access_token_encrypted: null, refresh_token_encrypted: null })
        .eq('id', integrationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] });
      qc.invalidateQueries({ queryKey: ['sync-data'] });
    },
  });
}

export function useDisconnectAws() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (credentialId: string) => {
      // Delete AWS credentials
      const { error } = await supabase
        .from('aws_credentials')
        .delete()
        .eq('id', credentialId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aws-credentials'] });
      qc.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

export function useNotificationSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notification-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUpsertNotificationSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: { email_enabled: boolean; min_severity: string; slack_webhook_url: string | null }) => {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('notification_settings')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('notification_settings')
          .update(settings)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_settings')
          .insert({ ...settings, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-settings'] }),
  });
}

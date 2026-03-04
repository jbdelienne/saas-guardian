import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SaasIncident {
  date: string;
  title: string;
  duration_minutes: number;
  severity: 'minor' | 'major' | 'critical';
}

export interface DependencyStatus {
  id: string;
  workspace_id: string | null;
  user_id: string;
  provider: string;
  status: string;
  status_page_url: string | null;
  sla_promised: number;
  sla_actual: number;
  incidents: SaasIncident[];
  last_check: string | null;
  created_at: string;
  updated_at: string;
}

const KNOWN_SAAS: Record<string, { name: string; icon: string; statusPageUrl: string; defaultSla: number }> = {
  stripe: { name: 'Stripe', icon: '💳', statusPageUrl: 'https://status.stripe.com', defaultSla: 99.99 },
  github: { name: 'GitHub', icon: '🐙', statusPageUrl: 'https://www.githubstatus.com', defaultSla: 99.95 },
  vercel: { name: 'Vercel', icon: '▲', statusPageUrl: 'https://www.vercel-status.com', defaultSla: 99.99 },
  slack: { name: 'Slack', icon: '💬', statusPageUrl: 'https://status.slack.com', defaultSla: 99.99 },
  datadog: { name: 'Datadog', icon: '🐕', statusPageUrl: 'https://status.datadoghq.com', defaultSla: 99.9 },
  aws: { name: 'AWS', icon: '☁️', statusPageUrl: 'https://health.aws.amazon.com/health/status', defaultSla: 99.99 },
  gcp: { name: 'Google Cloud', icon: '🌐', statusPageUrl: 'https://status.cloud.google.com', defaultSla: 99.95 },
  twilio: { name: 'Twilio', icon: '📱', statusPageUrl: 'https://status.twilio.com', defaultSla: 99.95 },
  sendgrid: { name: 'SendGrid', icon: '📧', statusPageUrl: 'https://status.sendgrid.com', defaultSla: 99.95 },
  cloudflare: { name: 'Cloudflare', icon: '🛡️', statusPageUrl: 'https://www.cloudflarestatus.com', defaultSla: 99.99 },
  linear: { name: 'Linear', icon: '📋', statusPageUrl: 'https://linearstatus.com', defaultSla: 99.9 },
  notion: { name: 'Notion', icon: '📝', statusPageUrl: 'https://status.notion.so', defaultSla: 99.9 },
  supabase: { name: 'Supabase', icon: '⚡', statusPageUrl: 'https://status.supabase.com', defaultSla: 99.99 },
  resend: { name: 'Resend', icon: '✉️', statusPageUrl: 'https://resend-status.com', defaultSla: 99.9 },
};

export { KNOWN_SAAS };

export function useSaasDependencies() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dependency_status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dependency_status')
        .select('*')
        .order('provider', { ascending: true });
      if (error) throw error;
      return (data as unknown as DependencyStatus[]).map(d => ({
        ...d,
        incidents: (Array.isArray(d.incidents) ? d.incidents : []) as SaasIncident[],
      }));
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}

export function useAddSaasDependency() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (provider: string) => {
      const known = KNOWN_SAAS[provider];
      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user!.id)
        .single();

      const { data, error } = await supabase
        .from('dependency_status')
        .insert({
          user_id: user!.id,
          workspace_id: profile?.workspace_id,
          provider: known?.name || provider,
          status_page_url: known?.statusPageUrl || null,
          sla_promised: known?.defaultSla || 99.9,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dependency_status'] }),
  });
}

export function useDeleteSaasDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dependency_status').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dependency_status'] }),
  });
}

export function useForceCheckSaas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-saas-status?dependency_id=${id}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Check failed');
      }
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dependency_status'] });
    },
  });
}

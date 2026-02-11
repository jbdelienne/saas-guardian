import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SyncMetric {
  id: string;
  integration_id: string;
  metric_type: string;
  metric_key: string;
  metric_value: number;
  metric_unit: string | null;
  metadata: Record<string, unknown> | null;
  synced_at: string;
}

export function useAllSyncData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all-sync-data', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_sync_data')
        .select('id, integration_id, metric_type, metric_key, metric_value, metric_unit, metadata, synced_at')
        .order('synced_at', { ascending: false });
      if (error) throw error;
      return data as SyncMetric[];
    },
    enabled: !!user,
  });
}

/** Returns only the latest value per metric_key */
export function useLatestSyncMetrics() {
  const query = useAllSyncData();
  const latest = new Map<string, SyncMetric>();
  if (query.data) {
    for (const row of query.data) {
      if (!latest.has(row.metric_key)) {
        latest.set(row.metric_key, row);
      }
    }
  }
  return { ...query, data: Array.from(latest.values()) };
}

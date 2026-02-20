import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, subWeeks, subMonths, subYears, startOfDay, startOfWeek, startOfMonth, format } from 'date-fns';

export type UptimePeriod = '24h' | '7d' | '30d' | '12m';

function getPeriodStart(period: UptimePeriod): Date {
  const now = new Date();
  switch (period) {
    case '24h': return subDays(now, 1);
    case '7d': return subDays(now, 7);
    case '30d': return subDays(now, 30);
    case '12m': return subYears(now, 1);
  }
}

export function useUptimeForServices(serviceIds: string[], period: UptimePeriod) {
  const { user } = useAuth();
  const start = getPeriodStart(period);

  return useQuery({
    queryKey: ['uptime-checks', serviceIds, period],
    queryFn: async () => {
      if (serviceIds.length === 0) return {};

      // Fetch checks for all services in the period
      const { data, error } = await supabase
        .from('checks')
        .select('service_id, status')
        .in('service_id', serviceIds)
        .gte('checked_at', start.toISOString())
        .order('checked_at', { ascending: false });

      if (error) throw error;

      // Compute uptime % per service
      const result: Record<string, number> = {};
      const counts: Record<string, { total: number; up: number }> = {};

      for (const check of data) {
        if (!counts[check.service_id]) counts[check.service_id] = { total: 0, up: 0 };
        counts[check.service_id].total++;
        if (check.status === 'up') counts[check.service_id].up++;
      }

      for (const id of serviceIds) {
        const c = counts[id];
        result[id] = c ? Math.round((c.up / c.total) * 10000) / 100 : 0;
      }

      return result;
    },
    enabled: !!user && serviceIds.length > 0 && period !== '12m', // 12m uses stored value
  });
}

export interface UptimeChartPoint {
  label: string;
  uptime: number;
}

export function useUptimeChart(serviceId: string | undefined, period: UptimePeriod) {
  const { user } = useAuth();
  const now = new Date();

  return useQuery({
    queryKey: ['uptime-chart', serviceId, period],
    queryFn: async () => {
      if (!serviceId) return [];

      const start = getPeriodStart(period);

      const { data, error } = await supabase
        .from('checks')
        .select('checked_at, status')
        .eq('service_id', serviceId)
        .gte('checked_at', start.toISOString())
        .order('checked_at', { ascending: true });

      if (error) throw error;

      // Group by bucket
      const buckets: Record<string, { total: number; up: number }> = {};

      for (const check of data) {
        const d = new Date(check.checked_at);
        let key: string;
        switch (period) {
          case '24h':
            key = format(d, 'HH:00');
            break;
          case '7d':
            key = format(d, 'EEE');
            break;
          case '30d':
            key = format(d, 'dd/MM');
            break;
          case '12m':
            key = format(d, 'MMM yy');
            break;
        }
        if (!buckets[key]) buckets[key] = { total: 0, up: 0 };
        buckets[key].total++;
        if (check.status === 'up') buckets[key].up++;
      }

      return Object.entries(buckets).map(([label, { total, up }]) => ({
        label,
        uptime: Math.round((up / total) * 10000) / 100,
      })) as UptimeChartPoint[];
    },
    enabled: !!user && !!serviceId,
  });
}

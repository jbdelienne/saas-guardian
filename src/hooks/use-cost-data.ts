import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export type CostView = 'daily' | 'weekly' | 'monthly';

export interface CostByService {
  date: string;
  service_name: string;
  amount: number;
  currency: string;
}

export interface TotalByPeriod {
  date: string;
  amount: number;
  currency: string;
}

export interface CostData {
  source: string;
  cached_at: string;
  cost_by_service: CostByService[];
  total_by_period?: TotalByPeriod[];
  raw_data?: unknown;
  start_date: string;
  end_date: string;
  granularity: string;
}

function aggregateWeekly(dailyTotals: TotalByPeriod[]): TotalByPeriod[] {
  if (!dailyTotals.length) return [];

  // Sort ascending
  const sorted = [...dailyTotals].sort((a, b) => a.date.localeCompare(b.date));

  // Take last 84 days max, group into 12 weekly buckets
  const last84 = sorted.slice(-84);
  const weeks: TotalByPeriod[] = [];

  for (let i = 0; i < last84.length; i += 7) {
    const chunk = last84.slice(i, i + 7);
    const totalAmount = chunk.reduce((sum, d) => sum + d.amount, 0);
    weeks.push({
      date: chunk[0].date,
      amount: Math.round(totalAmount * 100) / 100,
      currency: chunk[0].currency || 'USD',
    });
  }

  return weeks;
}

function aggregateWeeklyByService(dailyData: CostByService[]): CostByService[] {
  if (!dailyData.length) return [];

  const sorted = [...dailyData].sort((a, b) => a.date.localeCompare(b.date));
  const dates = [...new Set(sorted.map(d => d.date))].sort();
  const last84Dates = dates.slice(-84);

  const weekBuckets: Map<string, Map<string, number>> = new Map();

  for (const row of sorted) {
    if (!last84Dates.includes(row.date)) continue;
    const dateIdx = last84Dates.indexOf(row.date);
    const weekIdx = Math.floor(dateIdx / 7);
    const weekStart = last84Dates[weekIdx * 7] || row.date;

    if (!weekBuckets.has(weekStart)) weekBuckets.set(weekStart, new Map());
    const serviceMap = weekBuckets.get(weekStart)!;
    serviceMap.set(row.service_name, (serviceMap.get(row.service_name) || 0) + row.amount);
  }

  const result: CostByService[] = [];
  for (const [weekDate, services] of weekBuckets) {
    for (const [service, amount] of services) {
      result.push({ date: weekDate, service_name: service, amount: Math.round(amount * 100) / 100, currency: 'USD' });
    }
  }
  return result;
}

export function useCostData(credentialId: string | undefined, view: CostView = 'daily') {
  const { user } = useAuth();

  // For weekly view, we fetch daily data and aggregate client-side
  const apiGranularity = view === 'monthly' ? 'monthly' : 'daily';

  const query = useQuery({
    queryKey: ['aws-cost-data', credentialId, apiGranularity],
    queryFn: async (): Promise<CostData> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const params = new URLSearchParams({
        credential_id: credentialId!,
        granularity: apiGranularity,
      });

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aws-cost-sync?${params}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `Cost sync failed: ${res.status}`);
      }

      return await res.json();
    },
    enabled: !!user && !!credentialId,
    staleTime: 5 * 60 * 1000, // 5 min client-side
    refetchOnWindowFocus: false,
  });

  // Derive view-specific data
  const formattedData = useMemo(() => {
    if (!query.data) return { totalByPeriod: [], costByService: [], totalCost: 0, previousCost: 0 };

    const rawTotal = query.data.total_by_period || extractTotalFromRaw(query.data.raw_data);
    const rawByService = query.data.cost_by_service || [];

    let totalByPeriod: TotalByPeriod[];
    let costByService: CostByService[];

    if (view === 'weekly') {
      totalByPeriod = aggregateWeekly(rawTotal);
      costByService = aggregateWeeklyByService(rawByService);
    } else {
      totalByPeriod = rawTotal;
      costByService = rawByService;
    }

    // Calculate summary: current month vs previous month
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];

    let totalCost = 0;
    let previousCost = 0;

    if (view === 'monthly') {
      for (const p of totalByPeriod) {
        if (p.date >= currentMonthStart) totalCost += p.amount;
        else if (p.date >= prevMonthStart && p.date < currentMonthStart) previousCost += p.amount;
      }
    } else {
      // For daily, sum last 30 days as "current", 30 before that as "previous"
      const sorted = [...totalByPeriod].sort((a, b) => b.date.localeCompare(a.date));
      const last30 = sorted.slice(0, 30);
      const prev30 = sorted.slice(30, 60);
      totalCost = last30.reduce((s, d) => s + d.amount, 0);
      previousCost = prev30.reduce((s, d) => s + d.amount, 0);
    }

    return {
      totalByPeriod,
      costByService,
      totalCost: Math.round(totalCost * 100) / 100,
      previousCost: Math.round(previousCost * 100) / 100,
    };
  }, [query.data, view]);

  return {
    ...query,
    ...formattedData,
    source: query.data?.source,
    cachedAt: query.data?.cached_at,
  };
}

function extractTotalFromRaw(rawData: unknown): TotalByPeriod[] {
  if (!rawData || typeof rawData !== 'object') return [];
  const rd = rawData as Record<string, unknown>;

  if (Array.isArray(rd.total_by_period)) return rd.total_by_period;

  // Try to extract from total.ResultsByTime
  const total = rd.total as Record<string, unknown> | undefined;
  if (!total?.ResultsByTime) return [];

  const results = total.ResultsByTime as Array<{
    TimePeriod?: { Start?: string };
    Total?: { UnblendedCost?: { Amount?: string; Unit?: string } };
  }>;

  return results.map(p => ({
    date: p.TimePeriod?.Start || '',
    amount: parseFloat(p.Total?.UnblendedCost?.Amount || '0'),
    currency: p.Total?.UnblendedCost?.Unit || 'USD',
  }));
}

/** Get the top N services by total cost */
export function useTopServices(costByService: CostByService[], topN = 10) {
  return useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of costByService) {
      totals.set(row.service_name, (totals.get(row.service_name) || 0) + row.amount);
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([name, total]) => ({ name, total: Math.round(total * 100) / 100 }));
  }, [costByService, topN]);
}

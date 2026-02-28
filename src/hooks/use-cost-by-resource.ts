import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export interface CostByResource {
  resource_id: string;
  service_name: string;
  amount: number;
  currency: string;
  date: string;
}

/** Fetch per-resource cost data from the cost_by_resource table */
export function useCostByResource() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['cost-by-resource', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_by_resource')
        .select('resource_id, service_name, amount, currency, date')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as CostByResource[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  /** Aggregated monthly cost per resource_id */
  const costByResourceId = useMemo(() => {
    const map = new Map<string, number>();
    if (!query.data) return map;
    for (const row of query.data) {
      map.set(row.resource_id, (map.get(row.resource_id) || 0) + row.amount);
    }
    return map;
  }, [query.data]);

  return { ...query, costByResourceId };
}

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Subscribe to realtime alerts via Supabase Realtime.
 * Shows toast notifications for new alerts and returns unread count.
 */
export function useRealtimeAlerts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial unread count
  useEffect(() => {
    if (!user) return;
    async function fetchCount() {
      const { count } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('is_dismissed', false)
        .is('resolved_at', null);
      setUnreadCount(count || 0);
    }
    fetchCount();
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          const alert = payload.new as any;
          // Show toast
          const severity = alert.severity || 'info';
          if (severity === 'critical') {
            toast.error(alert.title, { description: alert.description, duration: 10000 });
          } else if (severity === 'warning') {
            toast.warning(alert.title, { description: alert.description, duration: 8000 });
          } else {
            toast.info(alert.title, { description: alert.description, duration: 6000 });
          }

          // Update count
          setUnreadCount((prev) => prev + 1);

          // Invalidate alerts query
          qc.invalidateQueries({ queryKey: ['alerts'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          const updated = payload.new as any;
          // If resolved or dismissed, decrement count
          if (updated.is_dismissed || updated.resolved_at) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
          qc.invalidateQueries({ queryKey: ['alerts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  return { unreadCount };
}

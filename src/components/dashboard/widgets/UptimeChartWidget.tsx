import { useChecks } from '@/hooks/use-supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export default function UptimeChartWidget({ serviceId, title }: { serviceId: string; title: string }) {
  const { data: checks = [], isLoading } = useChecks(serviceId, 50);

  const chartData = checks
    .slice(0, 30)
    .reverse()
    .map((c) => ({
      time: format(new Date(c.checked_at), 'HH:mm'),
      uptime: c.status === 'up' ? 100 : c.status === 'degraded' ? 50 : 0,
    }));

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        No data yet
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Line type="monotone" dataKey="uptime" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Service, useChecks, useTogglePause } from '@/hooks/use-supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatDistanceToNow, format } from 'date-fns';
import { Trash2, Pause, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const statusDotClass: Record<string, string> = {
  up: 'status-dot-up',
  down: 'status-dot-down',
  degraded: 'status-dot-degraded',
  unknown: 'status-dot-unknown',
};

interface ServiceDetailModalProps {
  service: Service | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export default function ServiceDetailModal({ service, open, onClose, onDelete }: ServiceDetailModalProps) {
  const togglePause = useTogglePause();
  const { data: checks = [], isLoading: checksLoading } = useChecks(service?.id, 50);

  const chartData = checks
    .slice(0, 24)
    .reverse()
    .map((c) => ({
      time: format(new Date(c.checked_at), 'HH:mm'),
      responseTime: c.response_time,
      status: c.status,
    }));

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{service.icon}</span>
            <div>
              <DialogTitle className="text-lg">{service.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{service.url}</p>
            </div>
            <div className={`ml-auto ${statusDotClass[service.status] ?? 'status-dot-unknown'}`} />
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{service.uptime_percentage ?? 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">Uptime</p>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{service.avg_response_time ?? 0}ms</p>
                <p className="text-xs text-muted-foreground mt-1">Avg Response</p>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{service.check_interval}m</p>
                <p className="text-xs text-muted-foreground mt-1">Interval</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3 text-foreground">Response Time (last 24 checks)</h4>
              <div className="h-48 bg-muted/50 rounded-xl p-2">
                {checksLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No check data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="ms" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Line type="monotone" dataKey="responseTime" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {checksLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : checks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No checks recorded yet</p>
            ) : (
              <div className="space-y-1">
                {checks.slice(0, 15).map((check) => (
                  <div key={check.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={check.status === 'up' ? 'status-dot-up' : 'status-dot-down'} />
                      <span className="text-foreground capitalize">{check.status}</span>
                    </div>
                    <span className="text-muted-foreground">{check.response_time}ms</span>
                    <span className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(check.checked_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-4 space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-xl">
              <div>
                <p className="font-medium text-foreground text-sm">Pause monitoring</p>
                <p className="text-xs text-muted-foreground">Temporarily stop health checks</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => togglePause.mutate({ id: service.id, is_paused: !service.is_paused })}
                className="gap-2"
                disabled={togglePause.isPending}
              >
                {service.is_paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {service.is_paused ? 'Resume' : 'Pause'}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-xl">
              <div>
                <p className="font-medium text-destructive text-sm">Delete service</p>
                <p className="text-xs text-muted-foreground">Permanently remove this service and its history</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => onDelete?.(service.id)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

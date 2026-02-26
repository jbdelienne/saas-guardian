import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useCostData, useTopServices, CostView, CostByService } from '@/hooks/use-cost-data';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Loader2, RefreshCw, DollarSign, BarChart3, Clock } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useLangPrefix } from '@/hooks/use-lang-prefix';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--warning))',
  'hsl(var(--info))',
  'hsl(var(--destructive))',
  'hsl(var(--success))',
];

function formatDate(dateStr: string, view: CostView): string {
  const d = new Date(dateStr);
  if (view === 'monthly') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  if (view === 'weekly') return `W${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AwsCostDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const lp = useLangPrefix();
  const [view, setView] = useState<CostView>('daily');

  // Get AWS credential
  const { data: awsCreds } = useQuery({
    queryKey: ['aws-credentials', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aws_credentials')
        .select('id, region, access_key_id, sync_status')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const credentialId = awsCreds?.id;
  const {
    totalByPeriod,
    costByService,
    totalCost,
    previousCost,
    isLoading,
    isError,
    error,
    refetch,
    source,
    cachedAt,
  } = useCostData(credentialId, view);

  const topServices = useTopServices(costByService);

  // Chart data for history
  const historyChartData = useMemo(() => {
    return totalByPeriod.map(p => ({
      date: formatDate(p.date, view),
      rawDate: p.date,
      amount: p.amount,
    }));
  }, [totalByPeriod, view]);

  // Bar chart data for top services
  const serviceChartData = useMemo(() => {
    return topServices.map((s, i) => ({
      name: s.name.replace('Amazon ', '').replace('AWS ', ''),
      amount: s.total,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [topServices]);

  const percentChange = previousCost > 0
    ? Math.round(((totalCost - previousCost) / previousCost) * 100)
    : null;

  if (!credentialId && !isLoading) {
    return (
      <AppLayout centered>
        <div className="max-w-5xl animate-fade-in">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate(`${lp}/integrations/aws`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">AWS Cost Explorer</h1>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No AWS credentials configured.</p>
              <Button onClick={() => navigate(`${lp}/integrations`)}>Configure AWS</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout centered>
      <div className="max-w-6xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${lp}/integrations/aws`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-primary" />
              AWS Cost Explorer
            </h1>
            {cachedAt && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {source === 'cache' ? 'Cached' : 'Fresh'} — {new Date(cachedAt).toLocaleString()}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>

        {isError && (
          <Card className="mb-6 border-destructive">
            <CardContent className="py-4">
              <p className="text-destructive text-sm">{(error as Error)?.message || 'Failed to load cost data'}</p>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary + View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Summary Card */}
              <Card className="flex-1">
                <CardContent className="py-6">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                    {view === 'monthly' ? 'This Month' : 'Last 30 Days'}
                  </p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-foreground tracking-tight">
                      ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {percentChange !== null && (
                      <div className={`flex items-center gap-1 text-sm font-medium ${
                        percentChange > 0 ? 'text-destructive' : percentChange < 0 ? 'text-success' : 'text-muted-foreground'
                      }`}>
                        {percentChange > 0 ? <TrendingUp className="w-4 h-4" /> :
                         percentChange < 0 ? <TrendingDown className="w-4 h-4" /> :
                         <Minus className="w-4 h-4" />}
                        <span>{percentChange > 0 ? '+' : ''}{percentChange}%</span>
                      </div>
                    )}
                  </div>
                  {previousCost > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      vs ${previousCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} previous period
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* View Toggle */}
              <Card className="sm:w-auto">
                <CardContent className="py-6 flex flex-col items-center justify-center">
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Granularity</p>
                  <Tabs value={view} onValueChange={(v) => setView(v as CostView)}>
                    <TabsList>
                      <TabsTrigger value="daily">Day</TabsTrigger>
                      <TabsTrigger value="weekly">Week</TabsTrigger>
                      <TabsTrigger value="monthly">Month</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* History Chart */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Cost History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-12">No cost data available</p>
                )}
              </CardContent>
            </Card>

            {/* Cost by Service */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Top Services by Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                {serviceChartData.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bar Chart */}
                    <ResponsiveContainer width="100%" height={Math.max(200, serviceChartData.length * 36)}>
                      <BarChart data={serviceChartData} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          width={140}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                          }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
                        />
                        <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                          {serviceChartData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Table */}
                    <div className="space-y-2">
                      {topServices.map((s, i) => (
                        <div key={s.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-sm shrink-0"
                              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                            <span className="text-sm text-foreground truncate max-w-[200px]">
                              {s.name.replace('Amazon ', '').replace('AWS ', '')}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-foreground font-mono">
                            ${s.total.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-12">No service cost data available</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

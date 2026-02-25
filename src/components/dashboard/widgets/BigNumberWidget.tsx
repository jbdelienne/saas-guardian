import { Service, useAlerts } from '@/hooks/use-supabase';
import { SyncMetric } from '@/hooks/use-all-sync-data';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface Props {
  metricKey: string;
  service?: Service;
  services?: Service[];
  syncMetrics?: SyncMetric[];
}

export default function BigNumberWidget({ metricKey, service, services = [], syncMetrics = [] }: Props) {
  const { data: alerts = [] } = useAlerts();

  const resolved = resolveValue(metricKey, service, services, syncMetrics, alerts);

  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-2">
      <p className="text-4xl font-bold text-foreground tracking-tight leading-none">
        {resolved.value}
        {resolved.unit && <span className="text-lg text-muted-foreground ml-1">{resolved.unit}</span>}
      </p>
      <p className="text-xs text-muted-foreground mt-2">{resolved.label}</p>
      {resolved.trend !== undefined && resolved.trend !== null && (
        <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${resolved.trend > 0 ? 'text-success' : resolved.trend < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {resolved.trend > 0 ? <TrendingUp className="w-3 h-3" /> : resolved.trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          <span>{resolved.trend > 0 ? '+' : ''}{resolved.trendLabel}</span>
        </div>
      )}
    </div>
  );
}

interface ResolvedValue {
  value: string;
  unit?: string;
  label: string;
  trend?: number | null;
  trendLabel?: string;
}

function resolveValue(
  metricKey: string,
  service: Service | undefined,
  services: Service[],
  syncMetrics: SyncMetric[],
  alerts: any[]
): ResolvedValue {
  switch (metricKey) {
    case 'service_uptime':
      return {
        value: service ? `${service.uptime_percentage ?? 0}` : '—',
        unit: '%',
        label: service?.name ?? 'Uptime',
      };
    case 'service_response_time':
      return {
        value: service ? `${service.avg_response_time ?? 0}` : '—',
        unit: 'ms',
        label: service?.name ?? 'Response Time',
      };
    case 'service_ssl_expiry': {
      if (!service?.ssl_expiry_date) return { value: '—', label: service?.name ?? 'SSL Expiry' };
      const days = differenceInDays(new Date(service.ssl_expiry_date), new Date());
      return {
        value: `${days}`,
        unit: 'days',
        label: `SSL — ${service.name}`,
      };
    }
    case 'aws_monthly_cost': {
      const cost = syncMetrics.find(m => m.metric_key === 'aws_cost_total');
      return {
        value: cost ? `$${Math.round(cost.metric_value).toLocaleString()}` : '—',
        label: 'AWS Monthly Cost',
      };
    }
    case 'aws_cost_trend': {
      const cost = syncMetrics.find(m => m.metric_key === 'aws_cost_total');
      const prev = syncMetrics.find(m => m.metric_key === 'aws_cost_previous');
      const trend = cost && prev && prev.metric_value > 0
        ? Math.round(((cost.metric_value - prev.metric_value) / prev.metric_value) * 100)
        : null;
      return {
        value: cost ? `$${Math.round(cost.metric_value).toLocaleString()}` : '—',
        label: 'Cost Trend vs Last Month',
        trend,
        trendLabel: trend !== null ? `${trend}%` : undefined,
      };
    }
    case 'aws_resources_count': {
      const awsServices = services.filter(s => s.tags?.includes('aws'));
      return {
        value: `${awsServices.length}`,
        label: 'AWS Resources',
      };
    }
    case 'aws_active_alerts': {
      const awsAlerts = alerts.filter(a => !a.is_dismissed && a.integration_type === 'aws');
      return {
        value: `${awsAlerts.length}`,
        label: 'Active AWS Alerts',
      };
    }
    case 'google_drive_storage': {
      const total = syncMetrics.find(m => m.metric_key === 'drive_quota_total_gb');
      const used = syncMetrics.find(m => m.metric_key === 'drive_quota_used_gb');
      if (!total || !used) return { value: '—', label: 'Drive Storage' };
      const pct = total.metric_value > 0 ? Math.round((used.metric_value / total.metric_value) * 100) : 0;
      return {
        value: `${pct}`,
        unit: '%',
        label: `${used.metric_value} GB / ${total.metric_value} GB`,
      };
    }
    case 'google_unused_licences': {
      const lic = syncMetrics.find(m => m.metric_key === 'google_available_seats');
      return {
        value: lic ? `${Math.round(lic.metric_value)}` : '—',
        label: 'Unused Licences',
      };
    }
    case 'google_public_files': {
      const pub = syncMetrics.find(m => m.metric_key === 'google_public_files_count');
      return {
        value: pub ? `${Math.round(pub.metric_value)}` : '—',
        label: 'Publicly Shared Files',
      };
    }
    default:
      return { value: '—', label: metricKey };
  }
}

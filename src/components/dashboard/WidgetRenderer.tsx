import { Service } from '@/hooks/use-supabase';
import { SyncMetric } from '@/hooks/use-all-sync-data';
import StatusCardWidget from './widgets/StatusCardWidget';
import UptimeChartWidget from './widgets/UptimeChartWidget';
import ResponseTimeChartWidget from './widgets/ResponseTimeChartWidget';
import AlertListWidget from './widgets/AlertListWidget';
import ServiceTableWidget from './widgets/ServiceTableWidget';
import IntegrationMetricCardWidget from './widgets/IntegrationMetricCardWidget';
import DriveStorageGaugeWidget from './widgets/DriveStorageGaugeWidget';
import BigNumberWidget from './widgets/BigNumberWidget';
import StatusBadgeWidget from './widgets/StatusBadgeWidget';
import StatusListWidget from './widgets/StatusListWidget';
import AlertCountWidget from './widgets/AlertCountWidget';

export interface WidgetConfig {
  id: string;
  widget_type: string;
  title: string;
  config: {
    service_id?: string;
    metric_key?: string;
    source?: string;
    [key: string]: unknown;
  };
  width: number;
  height: number;
}

interface WidgetRendererProps {
  widget: WidgetConfig;
  services: Service[];
  syncMetrics?: SyncMetric[];
}

export default function WidgetRenderer({ widget, services, syncMetrics = [] }: WidgetRendererProps) {
  const service = widget.config.service_id
    ? services.find((s) => s.id === widget.config.service_id)
    : undefined;

  switch (widget.widget_type) {
    case 'big_number':
      return (
        <BigNumberWidget
          metricKey={widget.config.metric_key ?? ''}
          service={service}
          services={services}
          syncMetrics={syncMetrics}
        />
      );
    case 'status_badge':
      return <StatusBadgeWidget service={service} />;
    case 'status_list':
      return <StatusListWidget />;
    case 'alert_count':
      return <AlertCountWidget />;
    case 'status_card':
      return <StatusCardWidget service={service} />;
    case 'uptime_chart':
      return <UptimeChartWidget serviceId={widget.config.service_id ?? ''} title={widget.title} />;
    case 'response_time_chart':
      return <ResponseTimeChartWidget serviceId={widget.config.service_id ?? ''} title={widget.title} />;
    case 'alert_list':
      return <AlertListWidget />;
    case 'service_table':
      return <ServiceTableWidget />;
    case 'integration_metric':
      return <IntegrationMetricCardWidget metricKey={widget.config.metric_key ?? ''} metrics={syncMetrics} />;
    case 'drive_storage_gauge':
      return <DriveStorageGaugeWidget metrics={syncMetrics} />;
    default:
      return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Unknown widget</div>;
  }
}

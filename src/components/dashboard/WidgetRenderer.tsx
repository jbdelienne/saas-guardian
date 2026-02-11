import { Service } from '@/hooks/use-supabase';
import StatusCardWidget from './widgets/StatusCardWidget';
import UptimeChartWidget from './widgets/UptimeChartWidget';
import ResponseTimeChartWidget from './widgets/ResponseTimeChartWidget';
import AlertListWidget from './widgets/AlertListWidget';
import ServiceTableWidget from './widgets/ServiceTableWidget';

export interface WidgetConfig {
  id: string;
  widget_type: string;
  title: string;
  config: {
    service_id?: string;
    [key: string]: unknown;
  };
  width: number;
  height: number;
}

interface WidgetRendererProps {
  widget: WidgetConfig;
  services: Service[];
}

export default function WidgetRenderer({ widget, services }: WidgetRendererProps) {
  const service = widget.config.service_id
    ? services.find((s) => s.id === widget.config.service_id)
    : undefined;

  switch (widget.widget_type) {
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
    default:
      return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Unknown widget</div>;
  }
}

import { LayoutGrid, Activity, Table, BarChart3, Cloud } from 'lucide-react';
import { WidgetConfig } from './WidgetRenderer';

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof LayoutGrid;
  /** If true, uses integration metrics instead of services */
  isIntegration?: boolean;
  generateWidgets: (serviceIds: string[]) => Omit<WidgetConfig, 'id'>[];
}

export const templates: DashboardTemplate[] = [
  {
    id: 'overview',
    name: 'Service Overview',
    description: 'Status cards for each service + alert feed',
    icon: LayoutGrid,
    generateWidgets: (serviceIds) => {
      const widgets: Omit<WidgetConfig, 'id'>[] = serviceIds.slice(0, 6).map((sid) => ({
        widget_type: 'status_card',
        title: 'Service Status',
        config: { service_id: sid },
        width: 1,
        height: 1,
      }));
      widgets.push({
        widget_type: 'alert_list',
        title: 'Recent Alerts',
        config: {},
        width: 2,
        height: 2,
      });
      return widgets;
    },
  },
  {
    id: 'performance',
    name: 'Performance Monitor',
    description: 'Response time & uptime charts for each service',
    icon: Activity,
    generateWidgets: (serviceIds) => {
      const widgets: Omit<WidgetConfig, 'id'>[] = [];
      serviceIds.slice(0, 4).forEach((sid) => {
        widgets.push({
          widget_type: 'response_time_chart',
          title: 'Response Time',
          config: { service_id: sid },
          width: 1,
          height: 1,
        });
        widgets.push({
          widget_type: 'uptime_chart',
          title: 'Uptime',
          config: { service_id: sid },
          width: 1,
          height: 1,
        });
      });
      return widgets;
    },
  },
  {
    id: 'compact',
    name: 'Compact Table',
    description: 'All services in a table + top alerts',
    icon: Table,
    generateWidgets: () => [
      { widget_type: 'service_table', title: 'All Services', config: {}, width: 2, height: 2 },
      { widget_type: 'alert_list', title: 'Recent Alerts', config: {}, width: 2, height: 2 },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics Deep Dive',
    description: 'Detailed charts and metrics for all services',
    icon: BarChart3,
    generateWidgets: (serviceIds) => {
      const widgets: Omit<WidgetConfig, 'id'>[] = [
        { widget_type: 'service_table', title: 'All Services', config: {}, width: 2, height: 1 },
      ];
      serviceIds.slice(0, 3).forEach((sid) => {
        widgets.push({
          widget_type: 'response_time_chart',
          title: 'Response Time',
          config: { service_id: sid },
          width: 1,
          height: 1,
        });
      });
      widgets.push({
        widget_type: 'alert_list',
        title: 'Alerts',
        config: {},
        width: 1,
        height: 1,
      });
      return widgets;
    },
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Storage usage, file counts & shared drives',
    icon: Cloud,
    isIntegration: true,
    generateWidgets: () => [
      { widget_type: 'drive_storage_gauge', title: 'Drive Storage', config: {}, width: 2, height: 2 },
      { widget_type: 'integration_metric', title: 'Fichiers possédés', config: { metric_key: 'drive_owned_files' }, width: 1, height: 1 },
      { widget_type: 'integration_metric', title: 'Partagés avec moi', config: { metric_key: 'drive_shared_with_me' }, width: 1, height: 1 },
      { widget_type: 'integration_metric', title: 'Drives partagés', config: { metric_key: 'drive_shared_drives' }, width: 1, height: 1 },
      { widget_type: 'integration_metric', title: 'Corbeille', config: { metric_key: 'drive_trash_gb' }, width: 1, height: 1 },
      { widget_type: 'alert_list', title: 'Alerts', config: {}, width: 2, height: 2 },
    ],
  },
];

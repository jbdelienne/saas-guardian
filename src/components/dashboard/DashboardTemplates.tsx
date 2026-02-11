import { LayoutGrid, Activity, Table, BarChart3 } from 'lucide-react';
import { WidgetConfig } from './WidgetRenderer';

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof LayoutGrid;
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
];

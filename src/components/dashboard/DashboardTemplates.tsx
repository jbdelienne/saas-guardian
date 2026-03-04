import { LayoutGrid, Activity, Monitor, Tv } from 'lucide-react';
import { WidgetConfig } from './WidgetRenderer';

export interface SourceSelection {
  serviceIds: string[];
  integrationIds: string[];
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof LayoutGrid;
  sourceTypes: ('service' | 'integration')[];
  generateWidgets: (sources: SourceSelection) => Omit<WidgetConfig, 'id'>[];
}

export const templates: DashboardTemplate[] = [
  {
    id: 'production',
    name: 'Production Overview',
    description: 'Global uptime, public endpoints, response time & active incidents',
    icon: Activity,
    sourceTypes: ['service'],
    generateWidgets: ({ serviceIds }) => {
      const widgets: Omit<WidgetConfig, 'id'>[] = [
        { widget_type: 'big_number', title: 'Uptime global', config: { metric_key: 'service_uptime' }, width: 3, height: 2 },
        { widget_type: 'big_number', title: 'Uptime public endpoints', config: { metric_key: 'service_uptime_public' }, width: 3, height: 2 },
        { widget_type: 'big_number', title: 'Avg response time', config: { metric_key: 'service_response_time' }, width: 3, height: 2 },
        { widget_type: 'alert_count', title: 'Active incidents', config: {}, width: 3, height: 2 },
      ];
      // Add status cards for first 4 services
      serviceIds.slice(0, 4).forEach((sid) => {
        widgets.push({
          widget_type: 'status_card',
          title: 'Service Status',
          config: { service_id: sid },
          width: 3,
          height: 2,
        });
      });
      widgets.push({
        widget_type: 'alert_list',
        title: 'Recent Alerts',
        config: {},
        width: 6,
        height: 3,
      });
      return widgets;
    },
  },
  {
    id: 'cloud',
    name: 'Cloud Overview',
    description: 'Monthly cost, cost variation, resources with issues',
    icon: Monitor,
    sourceTypes: ['service', 'integration'],
    generateWidgets: () => [
      { widget_type: 'big_number', title: 'Monthly cost', config: { metric_key: 'aws_monthly_cost', source: 'aws' }, width: 4, height: 2 },
      { widget_type: 'big_number', title: 'Cost variation', config: { metric_key: 'aws_cost_trend', source: 'aws' }, width: 4, height: 2 },
      { widget_type: 'big_number', title: 'Resources with issues', config: { metric_key: 'cloud_resources_issues', source: 'aws' }, width: 4, height: 2 },
      { widget_type: 'alert_list', title: 'Cloud Alerts', config: {}, width: 6, height: 3 },
      { widget_type: 'service_table', title: 'All Services', config: {}, width: 6, height: 3 },
    ],
  },
  {
    id: 'tv',
    name: 'TV Mode',
    description: 'Large widgets optimized for wall displays',
    icon: Tv,
    sourceTypes: ['service'],
    generateWidgets: ({ serviceIds }) => {
      const widgets: Omit<WidgetConfig, 'id'>[] = [
        { widget_type: 'big_number', title: 'Uptime global', config: { metric_key: 'service_uptime' }, width: 4, height: 3 },
        { widget_type: 'big_number', title: 'Avg response time', config: { metric_key: 'service_response_time' }, width: 4, height: 3 },
        { widget_type: 'alert_count', title: 'Incidents', config: {}, width: 4, height: 3 },
        { widget_type: 'status_list', title: 'All Services', config: {}, width: 6, height: 4 },
        { widget_type: 'alert_list', title: 'Recent Alerts', config: {}, width: 6, height: 4 },
      ];
      return widgets;
    },
  },
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch',
    icon: LayoutGrid,
    sourceTypes: ['service', 'integration'],
    generateWidgets: () => [],
  },
];

export interface MockService {
  id: string;
  name: string;
  icon: string;
  url: string;
  status: 'up' | 'down' | 'degraded' | 'unknown';
  uptime_percentage: number;
  avg_response_time: number;
  last_check: string;
  check_interval: number;
}

export interface MockCheck {
  id: string;
  service_id: string;
  status: 'up' | 'down';
  response_time: number;
  checked_at: string;
}

export interface MockAlert {
  id: string;
  integration_type: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  is_dismissed: boolean;
  created_at: string;
}

export const mockServices: MockService[] = [
  {
    id: '1', name: 'Stripe API', icon: '💳', url: 'https://api.stripe.com',
    status: 'up', uptime_percentage: 99.98, avg_response_time: 142,
    last_check: new Date(Date.now() - 120000).toISOString(), check_interval: 1,
  },
  {
    id: '2', name: 'GitHub Actions', icon: '🐙', url: 'https://api.github.com',
    status: 'up', uptime_percentage: 99.95, avg_response_time: 234,
    last_check: new Date(Date.now() - 60000).toISOString(), check_interval: 2,
  },
  {
    id: '3', name: 'Slack API', icon: '💬', url: 'https://slack.com/api',
    status: 'degraded', uptime_percentage: 98.50, avg_response_time: 890,
    last_check: new Date(Date.now() - 180000).toISOString(), check_interval: 2,
  },
  {
    id: '4', name: 'AWS S3', icon: '☁️', url: 'https://s3.amazonaws.com',
    status: 'up', uptime_percentage: 99.99, avg_response_time: 89,
    last_check: new Date(Date.now() - 30000).toISOString(), check_interval: 1,
  },
  {
    id: '5', name: 'Vercel Edge', icon: '▲', url: 'https://vercel.com',
    status: 'up', uptime_percentage: 99.97, avg_response_time: 45,
    last_check: new Date(Date.now() - 90000).toISOString(), check_interval: 5,
  },
  {
    id: '6', name: 'Datadog API', icon: '🐕', url: 'https://api.datadoghq.com',
    status: 'down', uptime_percentage: 95.20, avg_response_time: 0,
    last_check: new Date(Date.now() - 300000).toISOString(), check_interval: 1,
  },
  {
    id: '7', name: 'SendGrid', icon: '✉️', url: 'https://api.sendgrid.com',
    status: 'up', uptime_percentage: 99.90, avg_response_time: 178,
    last_check: new Date(Date.now() - 240000).toISOString(), check_interval: 5,
  },
  {
    id: '8', name: 'Twilio', icon: '📞', url: 'https://api.twilio.com',
    status: 'unknown', uptime_percentage: 0, avg_response_time: 0,
    last_check: '', check_interval: 5,
  },
];

export function generateChecks(serviceId: string, count: number = 50): MockCheck[] {
  const checks: MockCheck[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const isUp = Math.random() > 0.05;
    checks.push({
      id: `${serviceId}-check-${i}`,
      service_id: serviceId,
      status: isUp ? 'up' : 'down',
      response_time: isUp ? Math.floor(50 + Math.random() * 400) : 0,
      checked_at: new Date(now - i * 5 * 60000).toISOString(),
    });
  }
  return checks;
}

export const mockAlerts: MockAlert[] = [
  {
    id: 'a1', integration_type: 'google', alert_type: 'storage',
    severity: 'warning', title: 'Google Drive: 85% storage used',
    description: '170GB / 200GB used. Estimated full in 28 days.',
    is_dismissed: false, created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'a2', integration_type: 'microsoft', alert_type: 'licenses',
    severity: 'critical', title: 'Microsoft 365: Only 3 licenses remaining',
    description: '47 of 50 licenses assigned. New hires will be blocked.',
    is_dismissed: false, created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'a3', integration_type: 'slack', alert_type: 'inactive_users',
    severity: 'warning', title: 'Slack: 12 inactive users detected',
    description: '12 users inactive for 90+ days. Potential savings: €144/month.',
    is_dismissed: false, created_at: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'a4', integration_type: 'google', alert_type: 'security',
    severity: 'info', title: 'Google Workspace: 2FA adoption at 94%',
    description: '3 users have not enabled two-factor authentication.',
    is_dismissed: false, created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'a5', integration_type: 'service', alert_type: 'downtime',
    severity: 'critical', title: 'Datadog API: Service is down',
    description: 'No response for 5 minutes. Last successful check at 14:23 UTC.',
    is_dismissed: false, created_at: new Date(Date.now() - 300000).toISOString(),
  },
];

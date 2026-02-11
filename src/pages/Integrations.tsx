import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { CheckCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  connected: boolean;
}

const initialIntegrations: Integration[] = [
  { id: 'google', name: 'Google Workspace', icon: '🔵', description: 'Monitor storage, licenses and inactive users', connected: false },
  { id: 'microsoft', name: 'Microsoft 365', icon: '🟦', description: 'Track license usage, storage and security alerts', connected: false },
  { id: 'slack', name: 'Slack', icon: '💬', description: 'Detect inactive users and optimize workspace costs', connected: false },
];

export default function Integrations() {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const { toast } = useToast();

  const handleConnect = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, connected: true } : i))
    );
    toast({ title: 'Connected!', description: 'Integration is now active with demo data.' });
  };

  return (
    <AppLayout tvMode={false} onToggleTvMode={() => {}} onAddService={() => {}}>
      <div className="max-w-4xl animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Integrations</h1>
          <p className="text-muted-foreground text-sm">Connect your SaaS tools for operational monitoring</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <div key={integration.id} className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center">
              <span className="text-4xl mb-4">{integration.icon}</span>
              <h3 className="font-semibold text-foreground mb-1">{integration.name}</h3>
              <p className="text-xs text-muted-foreground mb-6">{integration.description}</p>

              {integration.connected ? (
                <div className="flex items-center gap-2 text-success text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Connected
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConnect(integration.id)}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Connect
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {['Jira', 'Notion', 'Okta'].map((name) => (
            <div key={name} className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center opacity-60">
              <span className="text-4xl mb-4">🔜</span>
              <h3 className="font-semibold text-foreground mb-1">{name}</h3>
              <p className="text-xs text-muted-foreground mb-6">Coming soon</p>
              <Button variant="outline" size="sm" disabled>Coming Soon</Button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

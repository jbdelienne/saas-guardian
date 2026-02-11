import AppLayout from '@/components/layout/AppLayout';
import { useIntegrations, useConnectIntegration } from '@/hooks/use-supabase';
import { Button } from '@/components/ui/button';
import { CheckCircle, ExternalLink, Loader2 } from 'lucide-react';

const integrationsMeta: Record<string, { name: string; icon: string; description: string }> = {
  google: { name: 'Google Workspace', icon: '🔵', description: 'Monitor storage, licenses and inactive users' },
  microsoft: { name: 'Microsoft 365', icon: '🟦', description: 'Track license usage, storage and security alerts' },
  slack: { name: 'Slack', icon: '💬', description: 'Detect inactive users and optimize workspace costs' },
};

const availableTypes = ['google', 'microsoft', 'slack'];

export default function Integrations() {
  const { data: integrations = [], isLoading } = useIntegrations();
  const connectIntegration = useConnectIntegration();

  const isConnected = (type: string) => integrations.some((i) => i.integration_type === type && i.is_connected);

  return (
    <AppLayout tvMode={false} onToggleTvMode={() => {}} onAddService={() => {}}>
      <div className="max-w-4xl animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Integrations</h1>
          <p className="text-muted-foreground text-sm">Connect your SaaS tools for operational monitoring</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTypes.map((type) => {
              const meta = integrationsMeta[type];
              const connected = isConnected(type);
              return (
                <div key={type} className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center">
                  <span className="text-4xl mb-4">{meta.icon}</span>
                  <h3 className="font-semibold text-foreground mb-1">{meta.name}</h3>
                  <p className="text-xs text-muted-foreground mb-6">{meta.description}</p>

                  {connected ? (
                    <div className="flex items-center gap-2 text-success text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Connected
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => connectIntegration.mutate(type)}
                      className="gap-2"
                      disabled={connectIntegration.isPending}
                    >
                      {connectIntegration.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      Connect
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

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

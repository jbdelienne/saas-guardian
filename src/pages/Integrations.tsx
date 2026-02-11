import AppLayout from '@/components/layout/AppLayout';
import { useIntegrations } from '@/hooks/use-supabase';
import { useStartOAuth, useSyncData, useSyncIntegration } from '@/hooks/use-integrations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ExternalLink, Loader2, RefreshCw, ChevronRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';

const integrationsMeta: Record<string, { name: string; icon: string; description: string; metrics: string[] }> = {
  google: {
    name: 'Google Workspace',
    icon: '🔵',
    description: 'Stockage Drive, licences actives, utilisateurs inactifs, uptime',
    metrics: ['Stockage Drive', 'Licences', 'Utilisateurs', 'Sécurité'],
  },
  microsoft: {
    name: 'Microsoft 365',
    icon: '🟦',
    description: 'Licences, stockage OneDrive/SharePoint, MFA, utilisateurs inactifs',
    metrics: ['Licences', 'Stockage', 'MFA', 'Utilisateurs'],
  },
  slack: {
    name: 'Slack',
    icon: '💬',
    description: 'Channels abandonnés, utilisateurs inactifs, messages/fichiers stats',
    metrics: ['Channels', 'Utilisateurs', 'Activité'],
  },
};

const availableTypes = ['google', 'microsoft', 'slack'];

function MetricPreview({ integrationId }: { integrationId: string }) {
  const { data: syncData = [] } = useSyncData(integrationId);
  if (syncData.length === 0) return <p className="text-xs text-muted-foreground">Aucune donnée — lancez une sync</p>;

  // Show top 3 metrics
  const highlights = syncData
    .filter((d) => d.metric_unit !== 'info')
    .slice(0, 3);

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {highlights.map((m) => (
        <Badge key={m.id} variant="secondary" className="text-xs font-normal">
          {m.metric_key.replace(/_/g, ' ')}: {Number(m.metric_value).toLocaleString('fr-FR')}
          {m.metric_unit === 'percent' ? '%' : m.metric_unit === 'GB' ? ' GB' : ''}
        </Badge>
      ))}
    </div>
  );
}

export default function Integrations() {
  const { data: integrations = [], isLoading } = useIntegrations();
  const startOAuth = useStartOAuth();
  const syncIntegration = useSyncIntegration();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Show toast when returning from OAuth
  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected) {
      toast.success(`${integrationsMeta[connected]?.name || connected} connecté avec succès !`);
      // Clean URL
      window.history.replaceState({}, '', '/integrations');
    }
  }, [searchParams]);

  const getIntegration = (type: string) =>
    integrations.find((i) => i.integration_type === type && i.is_connected);

  return (
    <AppLayout>
      <div className="max-w-4xl animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Intégrations</h1>
          <p className="text-muted-foreground text-sm">Connectez vos outils SaaS pour la supervision opérationnelle</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTypes.map((type) => {
              const meta = integrationsMeta[type];
              const integration = getIntegration(type);
              const connected = !!integration;

              return (
                <div
                  key={type}
                  className={`bg-card border border-border rounded-xl p-6 flex flex-col transition-all duration-200 ${
                    connected ? 'cursor-pointer hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5' : ''
                  }`}
                  onClick={() => connected && navigate(`/integrations/${type}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-4xl">{meta.icon}</span>
                    {connected && (
                      <div className="flex items-center gap-1 text-success text-xs font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Connecté
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-foreground mb-1">{meta.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{meta.description}</p>

                  {/* Metric tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {meta.metrics.map((m) => (
                      <Badge key={m} variant="outline" className="text-[10px] font-normal">
                        {m}
                      </Badge>
                    ))}
                  </div>

                  {connected ? (
                    <div className="mt-auto space-y-3">
                      <MetricPreview integrationId={integration.id} />
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              syncIntegration.mutate(integration.id, {
                                onSuccess: () => toast.success('Sync terminée'),
                                onError: (err) => toast.error(err.message),
                              });
                            }}
                            disabled={syncIntegration.isPending}
                          >
                            {syncIntegration.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            Sync
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              startOAuth.mutate(type);
                            }}
                            disabled={startOAuth.isPending}
                          >
                            {startOAuth.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <ExternalLink className="w-3 h-3" />
                            )}
                            Reconnecter
                          </Button>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startOAuth.mutate(type)}
                      className="gap-2 mt-auto"
                      disabled={startOAuth.isPending}
                    >
                      {startOAuth.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      Connecter via OAuth
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Coming soon */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {['Jira', 'Notion', 'Okta'].map((name) => (
            <div key={name} className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center opacity-60">
              <span className="text-4xl mb-4">🔜</span>
              <h3 className="font-semibold text-foreground mb-1">{name}</h3>
              <p className="text-xs text-muted-foreground mb-6">Bientôt disponible</p>
              <Button variant="outline" size="sm" disabled>Bientôt</Button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

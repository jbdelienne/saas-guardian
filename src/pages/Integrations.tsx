import AppLayout from '@/components/layout/AppLayout';
import { useIntegrations } from '@/hooks/use-supabase';
import { useStartOAuth, useSyncData, useSyncIntegration, useSyncAwsCredentials, useAwsCredentials } from '@/hooks/use-integrations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ExternalLink, Loader2, RefreshCw, ChevronRight, Settings } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AwsConnectModal from '@/components/integrations/AwsConnectModal';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLangPrefix } from '@/hooks/use-lang-prefix';

import googleLogo from '@/assets/logos/google.png';
import microsoftLogo from '@/assets/logos/microsoft.svg';
import awsLogo from '@/assets/logos/aws.svg';
import gcpLogo from '@/assets/logos/gcp.svg';
import azureLogo from '@/assets/logos/azure.svg';

const integrationCategories = [
  {
    key: 'collaboration',
    label: 'Collaboration Suites',
    description: 'Monitor licenses, storage & security across your productivity tools.',
    types: ['google', 'microsoft'] as const,
  },
  {
    key: 'cloud',
    label: 'Cloud Providers',
    description: 'Auto-discover and monitor your cloud infrastructure.',
    types: ['aws', 'gcp', 'azure'] as const,
  },
] as const;

const integrationLogos: Record<string, string> = {
  google: googleLogo,
  microsoft: microsoftLogo,
  aws: awsLogo,
  gcp: gcpLogo,
  azure: azureLogo,
};
const integrationMetricTags: Record<string, string[]> = {
  google: ['Storage', 'Licenses', 'Users', 'Security'],
  microsoft: ['Licenses', 'Storage', 'MFA', 'Users'],
  aws: ['EC2', 'S3', 'Lambda', 'Costs'],
  gcp: ['Compute', 'Storage', 'Functions', 'Costs'],
  azure: ['VMs', 'Storage', 'Functions', 'Costs'],
};

const allIntegrationTypes = integrationCategories.flatMap((c) => c.types);

function MetricPreview({ integrationId }: { integrationId: string }) {
  const { data: syncData = [] } = useSyncData(integrationId);
  const { t } = useTranslation();
  if (syncData.length === 0) return <p className="text-xs text-muted-foreground">{t('integrations.noData')}</p>;

  const highlights = syncData
    .filter((d) => d.metric_unit !== 'info')
    .slice(0, 3);

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {highlights.map((m) => (
        <Badge key={m.id} variant="secondary" className="text-xs font-normal">
          {m.metric_key.replace(/_/g, ' ')}: {Number(m.metric_value).toLocaleString()}
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
  const syncAws = useSyncAwsCredentials();
  const { data: awsCred } = useAwsCredentials();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const lp = useLangPrefix();
  const [awsModalOpen, setAwsModalOpen] = useState(false);

  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected) {
      toast.success(`${t(`integrations.${connected}.name`)} connected!`);
      window.history.replaceState({}, '', `${lp}/integrations`);
    }
  }, [searchParams, t, lp]);

  const getIntegration = (type: string) =>
    integrations.find((i) => i.integration_type === type && i.is_connected);

  return (
    <AppLayout centered>
      <div className="max-w-4xl animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">{t('integrations.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('integrations.subtitle')}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-10">
            {integrationCategories.map((category) => (
              <div key={category.key}>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-foreground">{category.label}</h2>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.types.map((type) => {
                    const integration = getIntegration(type);
                    const connected = !!integration;
                    const isComingSoon = ['gcp', 'azure'].includes(type);
                    const isAws = type === 'aws';

                    if (isAws) {
                      const awsConnected = !!awsCred;
                      const awsIntegration = getIntegration('aws');
                      return (
                        <div
                          key={type}
                          className={`bg-card border border-border rounded-xl p-6 flex flex-col transition-all duration-200 ${
                            awsConnected && awsIntegration ? 'cursor-pointer hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5' : ''
                          }`}
                          onClick={() => awsConnected && awsIntegration && navigate(`${lp}/integrations/aws`)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <img src={integrationLogos[type]} alt={type} className="w-10 h-10 object-contain" />
                            {awsConnected && (
                              <div className="flex items-center gap-1 text-success text-xs font-medium">
                                <CheckCircle className="w-3.5 h-3.5" />
                                {t('integrations.connected')}
                              </div>
                            )}
                          </div>
                          <h3 className="font-semibold text-foreground mb-1">{t(`integrations.${type}.name`, { defaultValue: 'Amazon Web Services' }) as string}</h3>
                          <p className="text-xs text-muted-foreground mb-3">{t(`integrations.${type}.description`, { defaultValue: 'Auto-discover and monitor your AWS infrastructure.' }) as string}</p>
                          <div className="flex flex-wrap gap-1 mb-4">
                            {integrationMetricTags[type].map((m) => (
                              <Badge key={m} variant="outline" className="text-[10px] font-normal">{m}</Badge>
                            ))}
                          </div>
                          {awsConnected ? (
                            <div className="mt-auto space-y-3">
                              {awsIntegration && <MetricPreview integrationId={awsIntegration.id} />}
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      syncAws.mutate(awsCred!.id, {
                                        onSuccess: () => toast.success('AWS sync complete'),
                                        onError: (err) => toast.error(err.message),
                                      });
                                    }}
                                    disabled={syncAws.isPending}
                                  >
                                    {syncAws.isPending ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <RefreshCw className="w-3 h-3" />
                                    )}
                                    {t('integrations.sync')}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1 text-xs text-muted-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAwsModalOpen(true);
                                    }}
                                  >
                                    <Settings className="w-3 h-3" />
                                    Settings
                                  </Button>
                                </div>
                                {awsIntegration && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                              </div>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="mt-auto gap-2" onClick={() => setAwsModalOpen(true)}>
                              <ExternalLink className="w-4 h-4" />
                              Connect AWS
                            </Button>
                          )}
                        </div>
                      );
                    }

                    if (isComingSoon) {
                      return (
                        <div
                          key={type}
                          className="bg-card border border-border rounded-xl p-6 flex flex-col opacity-60"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <img src={integrationLogos[type]} alt={type} className="w-10 h-10 object-contain" />
                            <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
                          </div>
                          <h3 className="font-semibold text-foreground mb-1">{t(`integrations.${type}.name`, { defaultValue: type.toUpperCase() }) as string}</h3>
                          <p className="text-xs text-muted-foreground mb-3">{t(`integrations.${type}.description`, { defaultValue: 'Auto-discover and monitor services.' }) as string}</p>
                          <div className="flex flex-wrap gap-1 mb-4">
                            {integrationMetricTags[type].map((m) => (
                              <Badge key={m} variant="outline" className="text-[10px] font-normal">{m}</Badge>
                            ))}
                          </div>
                          <Button variant="outline" size="sm" disabled className="mt-auto">{t('integrations.soon')}</Button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={type}
                        className={`bg-card border border-border rounded-xl p-6 flex flex-col transition-all duration-200 ${
                          connected ? 'cursor-pointer hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5' : ''
                        }`}
                        onClick={() => connected && navigate(`${lp}/integrations/${type}`)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <img src={integrationLogos[type]} alt={type} className="w-10 h-10 object-contain" />
                          {connected && (
                            <div className="flex items-center gap-1 text-success text-xs font-medium">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {t('integrations.connected')}
                            </div>
                          )}
                        </div>

                        <h3 className="font-semibold text-foreground mb-1">{t(`integrations.${type}.name`)}</h3>
                        <p className="text-xs text-muted-foreground mb-3">{t(`integrations.${type}.description`)}</p>

                        <div className="flex flex-wrap gap-1 mb-4">
                          {integrationMetricTags[type].map((m) => (
                            <Badge key={m} variant="outline" className="text-[10px] font-normal">{m}</Badge>
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
                                      onSuccess: () => toast.success(t('integrationDetail.syncComplete')),
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
                                  {t('integrations.sync')}
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
                                  {t('integrations.reconnect')}
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
                            {t('integrations.connectOAuth')}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <AwsConnectModal open={awsModalOpen} onClose={() => setAwsModalOpen(false)} />
    </AppLayout>
  );
}

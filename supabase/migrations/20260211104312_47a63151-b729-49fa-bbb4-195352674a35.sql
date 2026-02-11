
-- Table for storing synced metrics from integrations
CREATE TABLE public.integration_sync_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- e.g. 'storage_usage', 'license_count', 'inactive_users', 'mfa_status', 'channel_stats', 'uptime'
  metric_key TEXT NOT NULL, -- e.g. 'drive_total_gb', 'drive_used_gb', 'active_licenses', 'total_licenses'
  metric_value NUMERIC NOT NULL DEFAULT 0,
  metric_unit TEXT, -- e.g. 'GB', 'count', 'percent'
  metadata JSONB DEFAULT '{}'::jsonb,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_sync_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync data" ON public.integration_sync_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sync data" ON public.integration_sync_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own sync data" ON public.integration_sync_data FOR DELETE USING (auth.uid() = user_id);

-- Index for fast queries
CREATE INDEX idx_sync_data_integration ON public.integration_sync_data(integration_id, metric_type);
CREATE INDEX idx_sync_data_user ON public.integration_sync_data(user_id, synced_at DESC);

-- Table for user-configurable alert thresholds
CREATE TABLE public.alert_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  integration_type TEXT NOT NULL, -- 'google', 'microsoft', 'slack'
  metric_type TEXT NOT NULL, -- e.g. 'storage_usage', 'inactive_users', 'mfa_disabled'
  threshold_value NUMERIC NOT NULL,
  threshold_operator TEXT NOT NULL DEFAULT 'gt', -- 'gt', 'lt', 'gte', 'lte', 'eq'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  label TEXT, -- user-friendly label
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, integration_type, metric_type)
);

ALTER TABLE public.alert_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own thresholds" ON public.alert_thresholds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own thresholds" ON public.alert_thresholds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own thresholds" ON public.alert_thresholds FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own thresholds" ON public.alert_thresholds FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_alert_thresholds_updated_at
BEFORE UPDATE ON public.alert_thresholds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add OAuth token fields to integrations (encrypted at app level)
ALTER TABLE public.integrations
ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scopes TEXT[],
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- Insert default thresholds function (called after first connection)
CREATE OR REPLACE FUNCTION public.create_default_thresholds(p_user_id UUID, p_integration_type TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_integration_type = 'google' THEN
    INSERT INTO alert_thresholds (user_id, integration_type, metric_type, threshold_value, threshold_operator, severity, label)
    VALUES
      (p_user_id, 'google', 'storage_usage_percent', 85, 'gte', 'warning', 'Stockage Drive > 85%'),
      (p_user_id, 'google', 'inactive_users_days', 30, 'gte', 'info', 'Utilisateurs inactifs > 30j'),
      (p_user_id, 'google', 'suspended_users', 0, 'gt', 'warning', 'Utilisateurs suspendus détectés')
    ON CONFLICT (user_id, integration_type, metric_type) DO NOTHING;
  ELSIF p_integration_type = 'microsoft' THEN
    INSERT INTO alert_thresholds (user_id, integration_type, metric_type, threshold_value, threshold_operator, severity, label)
    VALUES
      (p_user_id, 'microsoft', 'storage_usage_percent', 85, 'gte', 'warning', 'Stockage OneDrive > 85%'),
      (p_user_id, 'microsoft', 'mfa_disabled_percent', 10, 'gte', 'critical', 'MFA désactivé > 10%'),
      (p_user_id, 'microsoft', 'inactive_users_days', 30, 'gte', 'info', 'Utilisateurs inactifs > 30j')
    ON CONFLICT (user_id, integration_type, metric_type) DO NOTHING;
  ELSIF p_integration_type = 'slack' THEN
    INSERT INTO alert_thresholds (user_id, integration_type, metric_type, threshold_value, threshold_operator, severity, label)
    VALUES
      (p_user_id, 'slack', 'inactive_channels_days', 60, 'gte', 'info', 'Channels inactifs > 60j'),
      (p_user_id, 'slack', 'inactive_users_days', 30, 'gte', 'info', 'Utilisateurs inactifs > 30j')
    ON CONFLICT (user_id, integration_type, metric_type) DO NOTHING;
  END IF;
END;
$$;

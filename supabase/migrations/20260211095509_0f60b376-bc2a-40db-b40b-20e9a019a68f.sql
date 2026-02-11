
-- Add missing columns to checks
ALTER TABLE public.checks ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE public.checks ADD COLUMN IF NOT EXISTS status_code integer;

-- Add missing columns to alerts
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

-- Index for fast check queries
CREATE INDEX IF NOT EXISTS idx_checks_service_checked_at ON public.checks (service_id, checked_at DESC);

-- notification_settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email_enabled boolean NOT NULL DEFAULT true,
  slack_webhook_url text,
  min_severity text NOT NULL DEFAULT 'warning',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification settings"
  ON public.notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON public.notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON public.notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable pg_cron and pg_net for scheduled checks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

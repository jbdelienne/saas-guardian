
-- Add per-service alert configuration columns
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS alert_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS alert_checks_threshold integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS maintenance_until timestamp with time zone DEFAULT NULL;

-- Add resolved_at and service_id to alerts for proper tracking
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE SET NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS incident_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false;

-- Index for fast lookup of open alerts per service
CREATE INDEX IF NOT EXISTS idx_alerts_service_open ON public.alerts (service_id, resolved_at) WHERE resolved_at IS NULL AND is_dismissed = false;

-- Enable realtime on alerts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;


-- Add owner and tags to services
ALTER TABLE public.services
  ADD COLUMN owner_id uuid DEFAULT NULL,
  ADD COLUMN tags text[] DEFAULT '{}';

-- Add owner and tags to integrations
ALTER TABLE public.integrations
  ADD COLUMN owner_id uuid DEFAULT NULL,
  ADD COLUMN tags text[] DEFAULT '{}';

-- Add indexes for tag filtering
CREATE INDEX idx_services_tags ON public.services USING GIN(tags);
CREATE INDEX idx_integrations_tags ON public.integrations USING GIN(tags);

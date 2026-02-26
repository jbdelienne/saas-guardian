
-- Cost snapshots: cache layer for AWS Cost Explorer API responses
CREATE TABLE public.cost_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id text NOT NULL,
  user_id uuid NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id),
  granularity text NOT NULL DEFAULT 'daily',
  start_date date NOT NULL,
  end_date date NOT NULL,
  raw_data jsonb NOT NULL DEFAULT '{}',
  cached_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Cost by service: denormalized per-day/month cost per AWS service
CREATE TABLE public.cost_by_service (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id text NOT NULL,
  user_id uuid NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id),
  date date NOT NULL,
  granularity text NOT NULL DEFAULT 'daily',
  service_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cost_snapshots_lookup ON public.cost_snapshots(account_id, granularity, start_date, end_date);
CREATE INDEX idx_cost_by_service_lookup ON public.cost_by_service(account_id, date, granularity);
CREATE INDEX idx_cost_by_service_user ON public.cost_by_service(user_id);

-- RLS
ALTER TABLE public.cost_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_by_service ENABLE ROW LEVEL SECURITY;

-- cost_snapshots policies
CREATE POLICY "Workspace members can view cost snapshots" ON public.cost_snapshots
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can insert cost snapshots" ON public.cost_snapshots
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can delete cost snapshots" ON public.cost_snapshots
  FOR DELETE USING (is_workspace_member(auth.uid(), workspace_id));

-- cost_by_service policies
CREATE POLICY "Workspace members can view cost by service" ON public.cost_by_service
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can insert cost by service" ON public.cost_by_service
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can delete cost by service" ON public.cost_by_service
  FOR DELETE USING (is_workspace_member(auth.uid(), workspace_id));

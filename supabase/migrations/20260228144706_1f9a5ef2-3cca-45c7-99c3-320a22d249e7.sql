
-- Table for per-resource AWS cost data
CREATE TABLE public.cost_by_resource (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  user_id uuid NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id),
  date date NOT NULL,
  granularity text NOT NULL DEFAULT 'daily',
  resource_id text NOT NULL,
  service_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.cost_by_resource ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view cost by resource"
  ON public.cost_by_resource FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can insert cost by resource"
  ON public.cost_by_resource FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can delete cost by resource"
  ON public.cost_by_resource FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Index for fast lookups
CREATE INDEX idx_cost_by_resource_lookup
  ON public.cost_by_resource (account_id, granularity, date);

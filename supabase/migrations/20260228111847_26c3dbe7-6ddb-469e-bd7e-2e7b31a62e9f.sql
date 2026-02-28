
CREATE TABLE public.saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  period text NOT NULL,
  period_label text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  scope text NOT NULL,
  include_sla boolean NOT NULL DEFAULT false,
  service_ids uuid[] NOT NULL DEFAULT '{}'
);

ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view reports"
  ON public.saved_reports FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can insert reports"
  ON public.saved_reports FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can delete reports"
  ON public.saved_reports FOR DELETE
  USING (is_workspace_admin(auth.uid(), workspace_id));

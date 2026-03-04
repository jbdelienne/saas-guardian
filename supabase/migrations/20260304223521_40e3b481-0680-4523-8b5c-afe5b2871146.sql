CREATE TABLE public.dependency_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'operational',
  status_page_url text,
  sla_promised numeric NOT NULL DEFAULT 99.9,
  sla_actual numeric NOT NULL DEFAULT 100,
  incidents jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_check timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, provider)
);

ALTER TABLE public.dependency_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view dependency status"
  ON public.dependency_status FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can insert dependency status"
  ON public.dependency_status FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can update dependency status"
  ON public.dependency_status FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can delete dependency status"
  ON public.dependency_status FOR DELETE TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id));
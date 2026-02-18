
-- Fix permissive INSERT on workspaces: only authenticated users via trigger
DROP POLICY "Users can create workspaces" ON public.workspaces;
CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update existing RLS on services to workspace-based access
DROP POLICY IF EXISTS "Users can view own services" ON public.services;
DROP POLICY IF EXISTS "Users can insert own services" ON public.services;
DROP POLICY IF EXISTS "Users can update own services" ON public.services;
DROP POLICY IF EXISTS "Users can delete own services" ON public.services;

CREATE POLICY "Workspace members can view services"
  ON public.services FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can insert services"
  ON public.services FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can update services"
  ON public.services FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can delete services"
  ON public.services FOR DELETE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- Update dashboards RLS
DROP POLICY IF EXISTS "Users can view own dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Users can insert own dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Users can update own dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Users can delete own dashboards" ON public.dashboards;

CREATE POLICY "Workspace members can view dashboards"
  ON public.dashboards FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can insert dashboards"
  ON public.dashboards FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can update dashboards"
  ON public.dashboards FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can delete dashboards"
  ON public.dashboards FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Update alerts RLS
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can insert own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON public.alerts;

CREATE POLICY "Workspace members can view alerts"
  ON public.alerts FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can insert alerts"
  ON public.alerts FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can update alerts"
  ON public.alerts FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can delete alerts"
  ON public.alerts FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Update integrations RLS
DROP POLICY IF EXISTS "Users can view own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Users can insert own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Users can update own integrations" ON public.integrations;

CREATE POLICY "Workspace members can view integrations"
  ON public.integrations FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can insert integrations"
  ON public.integrations FOR INSERT
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can update integrations"
  ON public.integrations FOR UPDATE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- Update alert_thresholds RLS
DROP POLICY IF EXISTS "Users can view own thresholds" ON public.alert_thresholds;
DROP POLICY IF EXISTS "Users can insert own thresholds" ON public.alert_thresholds;
DROP POLICY IF EXISTS "Users can update own thresholds" ON public.alert_thresholds;
DROP POLICY IF EXISTS "Users can delete own thresholds" ON public.alert_thresholds;

CREATE POLICY "Workspace members can view thresholds"
  ON public.alert_thresholds FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can insert thresholds"
  ON public.alert_thresholds FOR INSERT
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can update thresholds"
  ON public.alert_thresholds FOR UPDATE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can delete thresholds"
  ON public.alert_thresholds FOR DELETE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- Update checks RLS
DROP POLICY IF EXISTS "Users can view own checks" ON public.checks;
DROP POLICY IF EXISTS "Users can insert own checks" ON public.checks;
DROP POLICY IF EXISTS "Users can delete own checks" ON public.checks;

CREATE POLICY "Workspace members can view checks"
  ON public.checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = checks.service_id
      AND public.is_workspace_member(auth.uid(), s.workspace_id)
    )
  );
CREATE POLICY "Service role can insert checks"
  ON public.checks FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Workspace members can delete checks"
  ON public.checks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = checks.service_id
      AND public.is_workspace_member(auth.uid(), s.workspace_id)
    )
  );

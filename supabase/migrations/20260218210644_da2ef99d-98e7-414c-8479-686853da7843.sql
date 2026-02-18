
-- Function to get emails of workspace members (only accessible to fellow workspace members)
CREATE OR REPLACE FUNCTION public.get_workspace_member_emails(_workspace_id uuid)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wm.user_id, u.email::text
  FROM public.workspace_members wm
  JOIN auth.users u ON u.id = wm.user_id
  WHERE wm.workspace_id = _workspace_id
  AND EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = auth.uid()
  )
$$;

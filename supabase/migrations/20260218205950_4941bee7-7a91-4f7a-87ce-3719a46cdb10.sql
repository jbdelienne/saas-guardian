
-- Create a security definer function to get current user's email
CREATE OR REPLACE FUNCTION public.get_auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid()
$$;

-- Replace the problematic policy
DROP POLICY IF EXISTS "Members can view invitations" ON public.workspace_invitations;
CREATE POLICY "Members can view invitations"
  ON public.workspace_invitations FOR SELECT
  USING (
    is_workspace_member(auth.uid(), workspace_id)
    OR invited_email = public.get_auth_email()
  );

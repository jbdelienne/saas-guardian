
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Workspace',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Workspace members table (roles stored separately per security guidelines)
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Workspace invitations table
CREATE TABLE public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  role app_role NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE (workspace_id, invited_email)
);
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Add workspace_id to profiles
ALTER TABLE public.profiles ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id);

-- Security definer function to check workspace membership
CREATE OR REPLACE FUNCTION public.get_user_workspace_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id LIMIT 1
$$;

-- Security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role = 'admin'
  )
$$;

-- Security definer function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

-- RLS: workspaces - members can view, admins can update
CREATE POLICY "Members can view their workspace"
  ON public.workspaces FOR SELECT
  USING (public.is_workspace_member(auth.uid(), id));

CREATE POLICY "Admins can update their workspace"
  ON public.workspaces FOR UPDATE
  USING (public.is_workspace_admin(auth.uid(), id));

CREATE POLICY "Users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (true);

-- RLS: workspace_members
CREATE POLICY "Members can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can insert members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id) OR user_id = auth.uid());

CREATE POLICY "Admins can update members"
  ON public.workspace_members FOR UPDATE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can remove members"
  ON public.workspace_members FOR DELETE
  USING (public.is_workspace_admin(auth.uid(), workspace_id) OR user_id = auth.uid());

-- RLS: workspace_invitations
CREATE POLICY "Members can view invitations"
  ON public.workspace_invitations FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id)
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admins can create invitations"
  ON public.workspace_invitations FOR INSERT
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can update invitations"
  ON public.workspace_invitations FOR UPDATE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete invitations"
  ON public.workspace_invitations FOR DELETE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- Auto-create workspace for new users (update existing trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_workspace_id uuid;
  pending_invite RECORD;
BEGIN
  -- Check if user has a pending invitation
  SELECT wi.workspace_id, wi.role, wi.id INTO pending_invite
  FROM public.workspace_invitations wi
  WHERE wi.invited_email = NEW.email AND wi.status = 'pending'
  ORDER BY wi.created_at DESC LIMIT 1;

  IF pending_invite IS NOT NULL THEN
    -- Accept the invitation
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (pending_invite.workspace_id, NEW.id, pending_invite.role);

    UPDATE public.workspace_invitations SET status = 'accepted' WHERE id = pending_invite.id;

    INSERT INTO public.profiles (user_id, display_name, workspace_id)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), pending_invite.workspace_id);
  ELSE
    -- Create a new workspace for the user
    INSERT INTO public.workspaces (name) VALUES ('My Workspace') RETURNING id INTO new_workspace_id;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, 'admin');

    INSERT INTO public.profiles (user_id, display_name, workspace_id)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), new_workspace_id);
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger (recreate to use updated function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Migrate existing users: create workspaces for users without one
DO $$
DECLARE
  r RECORD;
  ws_id uuid;
BEGIN
  FOR r IN SELECT p.user_id, p.id AS profile_id FROM public.profiles p WHERE p.workspace_id IS NULL
  LOOP
    INSERT INTO public.workspaces (name) VALUES ('My Workspace') RETURNING id INTO ws_id;
    INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (ws_id, r.user_id, 'admin')
    ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET workspace_id = ws_id WHERE id = r.profile_id;
  END LOOP;
END;
$$;

-- Add workspace_id to services, dashboards, alerts, checks, integrations, alert_thresholds
ALTER TABLE public.services ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id);
ALTER TABLE public.dashboards ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id);
ALTER TABLE public.alerts ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id);
ALTER TABLE public.integrations ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id);
ALTER TABLE public.alert_thresholds ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id);

-- Backfill workspace_id for existing data
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT user_id, workspace_id FROM public.profiles WHERE workspace_id IS NOT NULL
  LOOP
    UPDATE public.services SET workspace_id = r.workspace_id WHERE user_id = r.user_id AND workspace_id IS NULL;
    UPDATE public.dashboards SET workspace_id = r.workspace_id WHERE user_id = r.user_id AND workspace_id IS NULL;
    UPDATE public.alerts SET workspace_id = r.workspace_id WHERE user_id = r.user_id AND workspace_id IS NULL;
    UPDATE public.integrations SET workspace_id = r.workspace_id WHERE user_id = r.user_id AND workspace_id IS NULL;
    UPDATE public.alert_thresholds SET workspace_id = r.workspace_id WHERE user_id = r.user_id AND workspace_id IS NULL;
  END LOOP;
END;
$$;

-- Timestamp trigger for workspaces
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

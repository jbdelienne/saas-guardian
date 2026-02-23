
-- Table to store AWS credentials per workspace
CREATE TABLE public.aws_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id),
  access_key_id text NOT NULL,
  secret_access_key text NOT NULL,
  region text NOT NULL DEFAULT 'us-east-1',
  sync_status text NOT NULL DEFAULT 'pending',
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One credential per workspace
CREATE UNIQUE INDEX idx_aws_credentials_workspace ON public.aws_credentials(workspace_id);

-- Enable RLS
ALTER TABLE public.aws_credentials ENABLE ROW LEVEL SECURITY;

-- Workspace members can view
CREATE POLICY "Workspace members can view AWS credentials"
  ON public.aws_credentials FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Only admins can insert
CREATE POLICY "Workspace admins can insert AWS credentials"
  ON public.aws_credentials FOR INSERT
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

-- Only admins can update
CREATE POLICY "Workspace admins can update AWS credentials"
  ON public.aws_credentials FOR UPDATE
  USING (is_workspace_admin(auth.uid(), workspace_id));

-- Only admins can delete
CREATE POLICY "Workspace admins can delete AWS credentials"
  ON public.aws_credentials FOR DELETE
  USING (is_workspace_admin(auth.uid(), workspace_id));

-- Timestamp trigger
CREATE TRIGGER update_aws_credentials_updated_at
  BEFORE UPDATE ON public.aws_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

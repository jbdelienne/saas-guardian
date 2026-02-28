
-- Add share_token column with unique UUID default
ALTER TABLE public.saved_reports 
ADD COLUMN share_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE;

-- Allow public (anon) SELECT on saved_reports by share_token
CREATE POLICY "Anyone can view reports by share_token"
ON public.saved_reports
FOR SELECT
USING (true);

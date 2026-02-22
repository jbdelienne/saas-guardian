
-- Waitlist signups table
CREATE TABLE public.waitlist_signups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  company text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public waitlist)
CREATE POLICY "Anyone can insert waitlist signups"
ON public.waitlist_signups
FOR INSERT
WITH CHECK (true);

-- Only service role can read (admin use)
CREATE POLICY "Service role can read waitlist"
ON public.waitlist_signups
FOR SELECT
USING (false);

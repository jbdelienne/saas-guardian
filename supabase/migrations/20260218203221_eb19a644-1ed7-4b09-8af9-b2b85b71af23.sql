
-- Add SSL certificate fields to services table
ALTER TABLE public.services
ADD COLUMN ssl_expiry_date timestamp with time zone DEFAULT NULL,
ADD COLUMN ssl_issuer text DEFAULT NULL;

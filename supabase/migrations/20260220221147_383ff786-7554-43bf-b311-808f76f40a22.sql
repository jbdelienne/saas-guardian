
-- Add TTFB, response size, and check region to checks table
ALTER TABLE public.checks
  ADD COLUMN ttfb integer DEFAULT NULL,
  ADD COLUMN response_size integer DEFAULT NULL,
  ADD COLUMN check_region text DEFAULT NULL;

-- Add content validation keyword to services table
ALTER TABLE public.services
  ADD COLUMN content_keyword text DEFAULT NULL;

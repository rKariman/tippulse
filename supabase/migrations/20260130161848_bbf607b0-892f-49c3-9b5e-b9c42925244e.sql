-- Fix 1: Add SELECT policy for subscribers table (admin-only read access)
-- This prevents anyone from harvesting subscriber emails
CREATE POLICY "Only admins can view subscribers"
ON public.subscribers
FOR SELECT
USING (is_admin());

-- Fix 2: Add SELECT policy for outbound_clicks table (admin-only read access)
-- Tracking data should not be publicly readable
CREATE POLICY "Only admins can view outbound clicks"
ON public.outbound_clicks
FOR SELECT
USING (is_admin());

-- Fix 3: Restrict sync_runs to admin-only read access
-- Remove the overly permissive public read policy and replace with admin-only
DROP POLICY IF EXISTS "Public read access" ON public.sync_runs;

CREATE POLICY "Only admins can view sync runs"
ON public.sync_runs
FOR SELECT
USING (is_admin());

-- Fix 4: Add database constraint for valid target URLs on free_bets
-- This prevents javascript:, data: and other malicious URL schemes
ALTER TABLE public.free_bets ADD CONSTRAINT valid_target_url_scheme
CHECK (target_url ~ '^https?://');
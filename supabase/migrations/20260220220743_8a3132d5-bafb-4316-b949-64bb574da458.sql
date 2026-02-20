-- Restrict tip_generation_runs to admin-only read access
DROP POLICY IF EXISTS "Public read access for tip_generation_runs" ON public.tip_generation_runs;

CREATE POLICY "Only admins can view tip generation runs"
ON public.tip_generation_runs
FOR SELECT
USING (is_admin());

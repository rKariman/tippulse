
-- Fix sync_runs INSERT policy: restrict to service role instead of allowing everyone
DROP POLICY IF EXISTS "Allow inserts from service role" ON public.sync_runs;

-- The service role bypasses RLS anyway, so we just need to block anon/authenticated
-- No INSERT policy = denied by default (fail-closed), which is correct for sync_runs

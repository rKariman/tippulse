
-- Drop overly permissive "ALL" policies on match_tips and player_tips
-- Service role bypasses RLS, so edge functions will still work
DROP POLICY IF EXISTS "Service role can manage match_tips" ON public.match_tips;
DROP POLICY IF EXISTS "Service role can manage player_tips" ON public.player_tips;

-- Also fix ai_tips_cache and tip_generation_runs which have the same pattern
DROP POLICY IF EXISTS "Service role can manage" ON public.ai_tips_cache;
DROP POLICY IF EXISTS "Service role can manage tip_generation_runs" ON public.tip_generation_runs;

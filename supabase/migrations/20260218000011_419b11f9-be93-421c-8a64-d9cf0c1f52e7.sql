
-- Add ON DELETE CASCADE to all FK constraints referencing fixtures
-- This allows deleting old fixtures without FK violations from tips/previews

-- match_tips -> fixtures
ALTER TABLE public.match_tips DROP CONSTRAINT IF EXISTS match_tips_fixture_id_fkey;
ALTER TABLE public.match_tips ADD CONSTRAINT match_tips_fixture_id_fkey
  FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id) ON DELETE CASCADE;

-- player_tips -> fixtures
ALTER TABLE public.player_tips DROP CONSTRAINT IF EXISTS player_tips_fixture_id_fkey;
ALTER TABLE public.player_tips ADD CONSTRAINT player_tips_fixture_id_fkey
  FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id) ON DELETE CASCADE;

-- ai_tips_cache -> fixtures
ALTER TABLE public.ai_tips_cache DROP CONSTRAINT IF EXISTS ai_tips_cache_fixture_id_fkey;
ALTER TABLE public.ai_tips_cache ADD CONSTRAINT ai_tips_cache_fixture_id_fkey
  FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id) ON DELETE CASCADE;

-- previews -> fixtures
ALTER TABLE public.previews DROP CONSTRAINT IF EXISTS previews_fixture_id_fkey;
ALTER TABLE public.previews ADD CONSTRAINT previews_fixture_id_fkey
  FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id) ON DELETE CASCADE;

-- preview_tips -> previews (cascade so deleting preview cleans up join table)
ALTER TABLE public.preview_tips DROP CONSTRAINT IF EXISTS preview_tips_preview_id_fkey;
ALTER TABLE public.preview_tips ADD CONSTRAINT preview_tips_preview_id_fkey
  FOREIGN KEY (preview_id) REFERENCES public.previews(id) ON DELETE CASCADE;

-- preview_tips -> tips
ALTER TABLE public.preview_tips DROP CONSTRAINT IF EXISTS preview_tips_tip_id_fkey;
ALTER TABLE public.preview_tips ADD CONSTRAINT preview_tips_tip_id_fkey
  FOREIGN KEY (tip_id) REFERENCES public.tips(id) ON DELETE CASCADE;

-- tips -> fixtures
ALTER TABLE public.tips DROP CONSTRAINT IF EXISTS tips_fixture_id_fkey;
ALTER TABLE public.tips ADD CONSTRAINT tips_fixture_id_fkey
  FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id) ON DELETE CASCADE;

-- fixtures -> leagues (SET NULL on league delete, not cascade)
ALTER TABLE public.fixtures DROP CONSTRAINT IF EXISTS fixtures_league_id_fkey;
ALTER TABLE public.fixtures ADD CONSTRAINT fixtures_league_id_fkey
  FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE SET NULL;

-- fixtures -> teams (SET NULL on team delete)
ALTER TABLE public.fixtures DROP CONSTRAINT IF EXISTS fixtures_home_team_id_fkey;
ALTER TABLE public.fixtures ADD CONSTRAINT fixtures_home_team_id_fkey
  FOREIGN KEY (home_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

ALTER TABLE public.fixtures DROP CONSTRAINT IF EXISTS fixtures_away_team_id_fkey;
ALTER TABLE public.fixtures ADD CONSTRAINT fixtures_away_team_id_fkey
  FOREIGN KEY (away_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- teams -> leagues (SET NULL on league delete)
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_league_id_fkey;
ALTER TABLE public.teams ADD CONSTRAINT teams_league_id_fkey
  FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE SET NULL;

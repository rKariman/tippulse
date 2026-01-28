-- Add external ID and sync metadata to leagues table
ALTER TABLE public.leagues 
ADD COLUMN IF NOT EXISTS external_id text,
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'football-data',
ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Add unique constraint on external_id + provider
CREATE UNIQUE INDEX IF NOT EXISTS leagues_external_id_provider_idx ON public.leagues (external_id, provider) WHERE external_id IS NOT NULL;

-- Add external ID and sync metadata to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS external_id text,
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'football-data',
ADD COLUMN IF NOT EXISTS league_id uuid REFERENCES public.leagues(id),
ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Add unique constraint on external_id + provider
CREATE UNIQUE INDEX IF NOT EXISTS teams_external_id_provider_idx ON public.teams (external_id, provider) WHERE external_id IS NOT NULL;

-- Add external ID and sync metadata to fixtures table
ALTER TABLE public.fixtures 
ADD COLUMN IF NOT EXISTS external_id text,
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'football-data',
ADD COLUMN IF NOT EXISTS season text,
ADD COLUMN IF NOT EXISTS round text,
ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Add unique constraint on external_id + provider
CREATE UNIQUE INDEX IF NOT EXISTS fixtures_external_id_provider_idx ON public.fixtures (external_id, provider) WHERE external_id IS NOT NULL;

-- Create sync_runs table for observability
CREATE TABLE IF NOT EXISTS public.sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  job_type text NOT NULL CHECK (job_type IN ('leagues', 'fixtures', 'today', 'cron')),
  provider text NOT NULL,
  params jsonb,
  success boolean NOT NULL,
  upserted_leagues integer DEFAULT 0,
  upserted_teams integer DEFAULT 0,
  upserted_fixtures integer DEFAULT 0,
  error text
);

-- Enable RLS on sync_runs (public read for admin dashboard)
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

-- Public read policy for sync_runs (admin dashboard needs to view)
CREATE POLICY "Public read access" ON public.sync_runs FOR SELECT USING (true);

-- Allow anonymous inserts from edge functions
CREATE POLICY "Allow inserts from service role" ON public.sync_runs FOR INSERT WITH CHECK (true);
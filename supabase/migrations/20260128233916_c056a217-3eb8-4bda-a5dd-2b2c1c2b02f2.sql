-- Add live score tracking columns to fixtures table
ALTER TABLE public.fixtures 
ADD COLUMN IF NOT EXISTS home_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS away_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS phase text DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS phase_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS base_minute integer,
ADD COLUMN IF NOT EXISTS last_live_update_at timestamp with time zone;

-- Add check constraint for valid phases
ALTER TABLE public.fixtures 
ADD CONSTRAINT fixtures_phase_check 
CHECK (phase IN ('scheduled', 'live', 'ht', '2h', 'et1', 'et_ht', 'et2', 'pens', 'finished'));

-- Create index for efficiently finding live matches
CREATE INDEX IF NOT EXISTS idx_fixtures_phase ON public.fixtures(phase) WHERE phase NOT IN ('scheduled', 'finished');

-- Create index for last update tracking
CREATE INDEX IF NOT EXISTS idx_fixtures_last_live_update ON public.fixtures(last_live_update_at) WHERE phase NOT IN ('scheduled', 'finished');
-- Add logo_url column to teams table
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add unique constraint on (provider, external_id) to prevent duplicates
ALTER TABLE public.teams ADD CONSTRAINT teams_provider_external_id_unique UNIQUE (provider, external_id);
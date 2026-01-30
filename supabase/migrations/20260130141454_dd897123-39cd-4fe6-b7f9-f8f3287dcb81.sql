-- Create table for tracking tip generation runs
CREATE TABLE public.tip_generation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_type TEXT NOT NULL DEFAULT 'warm_cache', -- 'warm_cache' or 'cleanup'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  total_fixtures INTEGER DEFAULT 0,
  generated INTEGER DEFAULT 0,
  reused INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_details TEXT,
  params JSONB
);

-- Enable RLS
ALTER TABLE public.tip_generation_runs ENABLE ROW LEVEL SECURITY;

-- Public read access for admin debug panel
CREATE POLICY "Public read access for tip_generation_runs"
ON public.tip_generation_runs
FOR SELECT
USING (true);

-- Service role can insert/update
CREATE POLICY "Service role can manage tip_generation_runs"
ON public.tip_generation_runs
FOR ALL
USING (true)
WITH CHECK (true);
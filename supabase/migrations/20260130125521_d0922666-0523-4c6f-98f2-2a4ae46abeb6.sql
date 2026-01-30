-- Create match_tips table for caching match-level tips
CREATE TABLE public.match_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fixture_id UUID NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  tip_type TEXT NOT NULL,
  title TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  odds TEXT,
  reasoning TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Create player_tips table for caching player-level tips (bet builder)
CREATE TABLE public.player_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fixture_id UUID NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  title TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  reasoning TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE public.match_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_tips ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for match_tips"
ON public.match_tips FOR SELECT
USING (true);

CREATE POLICY "Public read access for player_tips"
ON public.player_tips FOR SELECT
USING (true);

-- Service role can manage (for edge function)
CREATE POLICY "Service role can manage match_tips"
ON public.match_tips FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can manage player_tips"
ON public.player_tips FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for efficient lookups
CREATE INDEX idx_match_tips_fixture_id ON public.match_tips(fixture_id);
CREATE INDEX idx_match_tips_expires_at ON public.match_tips(expires_at);
CREATE INDEX idx_player_tips_fixture_id ON public.player_tips(fixture_id);
CREATE INDEX idx_player_tips_expires_at ON public.player_tips(expires_at);
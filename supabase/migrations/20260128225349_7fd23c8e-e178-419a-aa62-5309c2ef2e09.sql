-- Create table for caching AI-generated tips
CREATE TABLE public.ai_tips_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fixture_id UUID NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  prediction TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('Low', 'Medium', 'High')),
  market TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  UNIQUE(fixture_id)
);

-- Enable RLS
ALTER TABLE public.ai_tips_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access" ON public.ai_tips_cache
  FOR SELECT USING (true);

-- Allow service role to insert/update/delete
CREATE POLICY "Service role can manage" ON public.ai_tips_cache
  FOR ALL USING (true) WITH CHECK (true);

-- Create index for efficient lookups
CREATE INDEX idx_ai_tips_cache_fixture_id ON public.ai_tips_cache(fixture_id);
CREATE INDEX idx_ai_tips_cache_expires_at ON public.ai_tips_cache(expires_at);
-- Outbound click tracking table
CREATE TABLE public.outbound_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  route TEXT,
  offer_slug TEXT,
  bookmaker_slug TEXT,
  target_url TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT
);

-- Enable RLS but allow inserts from edge functions
ALTER TABLE public.outbound_clicks ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for tracking)
CREATE POLICY "Allow anonymous inserts" ON public.outbound_clicks
  FOR INSERT WITH CHECK (true);

-- Newsletter subscribers table
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  email TEXT UNIQUE NOT NULL,
  consent BOOLEAN DEFAULT true,
  source TEXT
);

-- Enable RLS
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for newsletter signups
CREATE POLICY "Allow anonymous inserts" ON public.subscribers
  FOR INSERT WITH CHECK (true);

-- Prevent duplicate emails with a cleaner constraint
CREATE INDEX idx_subscribers_email ON public.subscribers(email);

-- Leagues table for CMS
CREATE TABLE public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sport TEXT DEFAULT 'football',
  country TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.leagues FOR SELECT USING (true);

-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.teams FOR SELECT USING (true);

-- Fixtures table
CREATE TABLE public.fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  league_id UUID REFERENCES public.leagues(id),
  home_team_id UUID REFERENCES public.teams(id),
  away_team_id UUID REFERENCES public.teams(id),
  kickoff_at TIMESTAMPTZ NOT NULL,
  venue TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.fixtures FOR SELECT USING (true);

-- Bookmakers table
CREATE TABLE public.bookmakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  brand_color TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bookmakers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.bookmakers FOR SELECT USING (true);

-- Offers table
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bookmaker_id UUID REFERENCES public.bookmakers(id),
  description TEXT,
  terms TEXT,
  region TEXT,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  target_url TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.offers FOR SELECT USING (true);

-- Tips table
CREATE TABLE public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  market TEXT NOT NULL,
  fixture_id UUID REFERENCES public.fixtures(id),
  selection TEXT NOT NULL,
  odds DECIMAL(10,2) NOT NULL,
  stars INTEGER CHECK (stars >= 1 AND stars <= 5),
  reasoning_short TEXT,
  reasoning_long TEXT,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.tips FOR SELECT USING (true);

-- Previews table (match previews)
CREATE TABLE public.previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  fixture_id UUID REFERENCES public.fixtures(id) NOT NULL,
  intro TEXT,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.previews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.previews FOR SELECT USING (true);

-- Preview tips junction table
CREATE TABLE public.preview_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_id UUID REFERENCES public.previews(id) ON DELETE CASCADE,
  tip_id UUID REFERENCES public.tips(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE public.preview_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.preview_tips FOR SELECT USING (true);

-- Articles table
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  article_type TEXT DEFAULT 'news',
  excerpt TEXT,
  body TEXT,
  is_featured BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.articles FOR SELECT USING (true);
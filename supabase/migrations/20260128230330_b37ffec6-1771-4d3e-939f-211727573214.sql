-- Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Admin users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Security definer admin check (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au WHERE au.user_id = check_user_id
  )
$$;

-- Policies for admin_users
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
CREATE POLICY "Admins can view admin users"
  ON public.admin_users
  FOR SELECT
  USING (public.is_admin());

-- News posts table
CREATE TABLE IF NOT EXISTS public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published news" ON public.news_posts;
DROP POLICY IF EXISTS "Admins can create news" ON public.news_posts;
DROP POLICY IF EXISTS "Admins can update news" ON public.news_posts;
DROP POLICY IF EXISTS "Admins can delete news" ON public.news_posts;

CREATE POLICY "Public can view published news"
  ON public.news_posts
  FOR SELECT
  USING (published = true OR public.is_admin());

CREATE POLICY "Admins can create news"
  ON public.news_posts
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update news"
  ON public.news_posts
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete news"
  ON public.news_posts
  FOR DELETE
  USING (public.is_admin());

-- Free bets table
CREATE TABLE IF NOT EXISTS public.free_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bookmaker TEXT,
  description TEXT NOT NULL,
  terms TEXT,
  target_url TEXT NOT NULL,
  region TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  published BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.free_bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published free bets" ON public.free_bets;
DROP POLICY IF EXISTS "Admins can create free bets" ON public.free_bets;
DROP POLICY IF EXISTS "Admins can update free bets" ON public.free_bets;
DROP POLICY IF EXISTS "Admins can delete free bets" ON public.free_bets;

CREATE POLICY "Public can view published free bets"
  ON public.free_bets
  FOR SELECT
  USING (published = true OR public.is_admin());

CREATE POLICY "Admins can create free bets"
  ON public.free_bets
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update free bets"
  ON public.free_bets
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete free bets"
  ON public.free_bets
  FOR DELETE
  USING (public.is_admin());

-- Triggers (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_news_posts_updated_at') THEN
    DROP TRIGGER update_news_posts_updated_at ON public.news_posts;
  END IF;
  CREATE TRIGGER update_news_posts_updated_at
    BEFORE UPDATE ON public.news_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_free_bets_updated_at') THEN
    DROP TRIGGER update_free_bets_updated_at ON public.free_bets;
  END IF;
  CREATE TRIGGER update_free_bets_updated_at
    BEFORE UPDATE ON public.free_bets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_news_posts_slug ON public.news_posts(slug);
CREATE INDEX IF NOT EXISTS idx_news_posts_published ON public.news_posts(published);
CREATE INDEX IF NOT EXISTS idx_free_bets_slug ON public.free_bets(slug);
CREATE INDEX IF NOT EXISTS idx_free_bets_published ON public.free_bets(published);

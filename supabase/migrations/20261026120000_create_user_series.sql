-- User-created championship series: isolated metadata and starter data tables.
CREATE TABLE IF NOT EXISTS public.series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.series_admin_credentials (
  series_id uuid PRIMARY KEY REFERENCES public.series(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.series_admin_credentials ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.series_admin_credentials TO service_role;

CREATE INDEX IF NOT EXISTS series_created_at_idx ON public.series (created_at DESC);
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public can read series" ON public.series;
CREATE POLICY "public can read series" ON public.series FOR SELECT USING (true);
GRANT SELECT ON public.series TO anon, authenticated;
GRANT ALL ON public.series TO service_role;

-- Each series starts empty; these records are separate from the main RyhäMonoposto tables.
CREATE TABLE IF NOT EXISTS public.series_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  color_key text NOT NULL DEFAULT 'red',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(series_id, slug)
);
CREATE TABLE IF NOT EXISTS public.series_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  flag text NOT NULL DEFAULT '',
  number integer,
  color_key text NOT NULL DEFAULT 'red',
  team_id uuid REFERENCES public.series_teams(id) ON DELETE SET NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(series_id, slug)
);
CREATE TABLE IF NOT EXISTS public.series_races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  flag text NOT NULL DEFAULT '',
  race_date date,
  qualifying_content text NOT NULL DEFAULT '',
  race_content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(series_id, slug)
);
CREATE TABLE IF NOT EXISTS public.series_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(series_id, slug)
);
ALTER TABLE public.series_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read series teams" ON public.series_teams FOR SELECT USING (true);
CREATE POLICY "public read series drivers" ON public.series_drivers FOR SELECT USING (true);
CREATE POLICY "public read series races" ON public.series_races FOR SELECT USING (true);
CREATE POLICY "public read series news" ON public.series_news FOR SELECT USING (true);
GRANT SELECT ON public.series_teams, public.series_drivers, public.series_races, public.series_news TO anon, authenticated;
GRANT ALL ON public.series_teams, public.series_drivers, public.series_races, public.series_news TO service_role;

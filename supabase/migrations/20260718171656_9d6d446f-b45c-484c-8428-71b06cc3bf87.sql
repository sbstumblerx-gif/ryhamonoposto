
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "own upsert profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own update profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Teams
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  flag text NOT NULL DEFAULT '',
  color_key text NOT NULL,
  content text DEFAULT '',
  hero_media_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.teams TO anon, authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read teams" ON public.teams FOR SELECT USING (true);

-- Drivers
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  flag text NOT NULL DEFAULT '',
  number int,
  color_key text NOT NULL,
  team_slug text REFERENCES public.teams(slug) ON DELETE SET NULL,
  content text DEFAULT '',
  hero_media_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.drivers TO anon, authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read drivers" ON public.drivers FOR SELECT USING (true);

-- Races
CREATE TABLE public.races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  flag text NOT NULL DEFAULT '',
  race_date date,
  qualifying_content text DEFAULT '',
  race_content text DEFAULT '',
  qualifying_media_url text,
  race_media_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.races TO anon, authenticated;
GRANT ALL ON public.races TO service_role;
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read races" ON public.races FOR SELECT USING (true);

-- News
CREATE TABLE public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text DEFAULT '',
  content text DEFAULT '',
  hero_media_url text,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news TO anon, authenticated;
GRANT ALL ON public.news TO service_role;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read news" ON public.news FOR SELECT USING (true);

-- Stats pages (singleton per type)
CREATE TABLE public.stats_pages (
  id text PRIMARY KEY, -- 'drivers' | 'teams'
  title text NOT NULL,
  content text DEFAULT '',
  hero_media_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stats_pages TO anon, authenticated;
GRANT ALL ON public.stats_pages TO service_role;
ALTER TABLE public.stats_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read stats" ON public.stats_pages FOR SELECT USING (true);

INSERT INTO public.stats_pages (id, title) VALUES ('drivers', 'Kuljettajien tilastot'), ('teams', 'Valmistajien tilastot');

-- Comments (polymorphic)
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_entity_idx ON public.comments (entity_type, entity_id, created_at DESC);
GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "signed-in insert own" ON public.comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete own or admin" ON public.comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER teams_touch BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER drivers_touch BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER races_touch BEFORE UPDATE ON public.races FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER news_touch BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage: admin can manage; server generates signed URLs for reads
CREATE POLICY "admin manage media" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

-- Seed teams
INSERT INTO public.teams (slug, name, flag, color_key) VALUES
  ('wibedi', 'Wibedi', '🇫🇮', 'red'),
  ('kartsa-racing', 'Kärtsä Racing', '🇫🇮', 'green'),
  ('salkkuracing', 'Salkkuracing', '🇫🇮', 'yellow'),
  ('anskuracing', 'AnskuRacing', '🇫🇮', 'cyan'),
  ('capyracing', 'CapyRacing', '🇫🇮', 'blue'),
  ('iippu-gp', 'Iippu GP', '🇫🇮', 'gray'),
  ('epic-games', 'Epic Games', '🇫🇮', 'gray'),
  ('fox-racing', 'FOX Racing', '🇫🇮', 'darkred'),
  ('sr-juniors', 'SR Juniors', '🇫🇮', 'darkblue'),
  ('rocket-force', 'Rocket Force', '🇩🇪', 'darkgreen'),
  ('rf-mansetti', 'RF-Mansetti', '🇩🇪', 'cyan');

-- Seed drivers
INSERT INTO public.drivers (slug, name, flag, number, color_key) VALUES
  ('stumblerx', 'Stumblerx', '🇫🇮', 88, 'red'),
  ('sebastian-steiner', 'Sebastian Steiner', '🇩🇪', 9, 'red'),
  ('rocky-xrocky', 'Rocky xRocky', '🇫🇮', 7, 'green'),
  ('jere-poyhonen', 'Jere Pöyhönen', '🇫🇮', 2, 'green'),
  ('valkku-salkkunen', 'Valkku Salkkunen', '🇫🇮', 12, 'yellow'),
  ('stefano-rossi', 'Stefano Rossi', '🇮🇹', 50, 'yellow'),
  ('james-robinson', 'James Robinson', '🇬🇧', 80, 'darkblue'),
  ('lionel-gonzalez', 'Lionel Gonzalez', '🇦🇷', 5, 'darkblue'),
  ('iippu', 'Iippu', '🇫🇮', 11, 'gray'),
  ('sitra', 'Sitra', '🇫🇮', 3, 'gray'),
  ('alex-bronton', 'Alex Bronton', '🇦🇹', 16, 'darkred'),
  ('oscar-jippes', 'Oscar Jippes', '🇳🇱', 30, 'darkred'),
  ('karl-friedge', 'Karl Friedge', '🇩🇪', 33, 'darkgreen'),
  ('isa-saad', 'Isa Saad', '🇲🇾', 94, 'darkgreen'),
  ('jack-rayling', 'Jack Rayling', '🇺🇸', 67, 'cyan'),
  ('lars-karlsson', 'Lars Karlsson', '🇸🇪', 45, 'cyan'),
  ('savacchio-rimini', 'Savacchio Rimini', '🇮🇹', 15, 'red'),
  ('dippi-haukkaxd', 'Dippi HaukkaxD', '🇫🇮', 10, 'blue'),
  ('valtteri-bottas', 'Valtteri Bottas', '🇫🇮', 77, 'blue'),
  ('anskuh', 'Anskuh', '🇫🇮', 78, 'cyan'),
  ('pate', 'Pate', '🇫🇮', 69, 'cyan'),
  ('kakkuh', 'Kakkuh', '🇫🇮', 8, 'cyan'),
  ('andreo-torres', 'Andreo Torres', '🇪🇸', 90, 'yellow');

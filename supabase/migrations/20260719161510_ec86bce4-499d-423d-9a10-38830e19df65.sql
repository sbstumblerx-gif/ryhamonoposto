
CREATE TABLE public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seasons TO anon, authenticated;
GRANT ALL ON public.seasons TO service_role;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read seasons" ON public.seasons FOR SELECT USING (true);
CREATE TRIGGER touch_seasons BEFORE UPDATE ON public.seasons FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  url text NOT NULL,
  caption text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_items_scope_idx ON public.media_items(scope, sort_order);
GRANT SELECT ON public.media_items TO anon, authenticated;
GRANT ALL ON public.media_items TO service_role;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read media" ON public.media_items FOR SELECT USING (true);
CREATE TRIGGER touch_media_items BEFORE UPDATE ON public.media_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.seasons (slug, name, sort_order) VALUES
  ('2025', 'Kausi 2025', 2025),
  ('2026', 'Kausi 2026', 2026);

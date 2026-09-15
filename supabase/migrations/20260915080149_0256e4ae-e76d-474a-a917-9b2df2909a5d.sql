CREATE TABLE public.highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_slug text NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  caption text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.highlights TO anon;
GRANT SELECT ON public.highlights TO authenticated;
GRANT ALL ON public.highlights TO service_role;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Highlights are viewable by everyone" ON public.highlights FOR SELECT USING (true);
CREATE INDEX highlights_race_slug_idx ON public.highlights (race_slug, sort_order, created_at);
CREATE TRIGGER highlights_touch BEFORE UPDATE ON public.highlights FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.highlight_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id uuid NOT NULL REFERENCES public.highlights(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (highlight_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.highlight_views TO authenticated;
GRANT ALL ON public.highlight_views TO service_role;
ALTER TABLE public.highlight_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own highlight views" ON public.highlight_views FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.highlight_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id uuid NOT NULL REFERENCES public.highlights(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (highlight_id, user_id)
);
GRANT SELECT ON public.highlight_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.highlight_likes TO authenticated;
GRANT ALL ON public.highlight_likes TO service_role;
ALTER TABLE public.highlight_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Highlight likes are viewable by everyone" ON public.highlight_likes FOR SELECT USING (true);
CREATE POLICY "Users manage own highlight likes" ON public.highlight_likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
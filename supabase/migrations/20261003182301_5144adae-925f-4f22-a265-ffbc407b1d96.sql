CREATE TABLE public.race_extra_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('test','practice')),
  day_number integer NOT NULL DEFAULT 1 CHECK (day_number BETWEEN 1 AND 5),
  content text NOT NULL DEFAULT '',
  youtube_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (race_id, kind, day_number)
);
GRANT SELECT ON public.race_extra_sessions TO anon, authenticated;
GRANT ALL ON public.race_extra_sessions TO service_role;
ALTER TABLE public.race_extra_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Extra sessions readable" ON public.race_extra_sessions FOR SELECT USING (true);
CREATE TRIGGER race_extra_sessions_touch BEFORE UPDATE ON public.race_extra_sessions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
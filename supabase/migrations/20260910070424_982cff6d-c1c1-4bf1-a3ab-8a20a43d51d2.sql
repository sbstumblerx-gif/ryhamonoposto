ALTER TABLE public.prediction_sessions ADD COLUMN IF NOT EXISTS closes_at timestamptz;

CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_admin boolean NOT NULL DEFAULT false,
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.polls TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls TO authenticated;
GRANT ALL ON public.polls TO service_role;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "polls readable by all" ON public.polls FOR SELECT USING (true);
CREATE POLICY "users create own polls" ON public.polls FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "users delete own polls" ON public.polls FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TABLE public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX poll_options_poll_idx ON public.poll_options(poll_id);
GRANT SELECT ON public.poll_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_options TO authenticated;
GRANT ALL ON public.poll_options TO service_role;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll options readable by all" ON public.poll_options FOR SELECT USING (true);
CREATE POLICY "poll owner manages options" ON public.poll_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_id AND p.created_by = auth.uid()));

CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);
CREATE INDEX poll_votes_poll_idx ON public.poll_votes(poll_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read votes" ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "users insert own vote" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own vote" ON public.poll_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own vote" ON public.poll_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER polls_touch BEFORE UPDATE ON public.polls FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
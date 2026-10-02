CREATE TABLE public.race_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  session_type text NOT NULL CHECK (session_type IN ('SQ','S','Q','R')),
  session_date date NOT NULL CHECK (session_date BETWEEN '2026-01-01' AND '2040-12-31'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.race_sessions TO anon, authenticated;
GRANT ALL ON public.race_sessions TO service_role;
ALTER TABLE public.race_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Race sessions are public" ON public.race_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX race_sessions_date_idx ON public.race_sessions (session_date);
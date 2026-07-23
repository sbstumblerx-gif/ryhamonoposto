
CREATE TABLE public.prediction_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','past')),
  result_top3 JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.prediction_sessions TO anon, authenticated;
GRANT ALL ON public.prediction_sessions TO service_role;
ALTER TABLE public.prediction_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions readable" ON public.prediction_sessions FOR SELECT USING (true);

CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.prediction_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  top3 JSONB NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);
GRANT SELECT ON public.predictions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "predictions readable" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "own predictions insert" ON public.predictions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.prediction_sessions s WHERE s.id = session_id AND s.status = 'upcoming'));
CREATE POLICY "own predictions update" ON public.predictions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.prediction_sessions s WHERE s.id = session_id AND s.status = 'upcoming'))
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own predictions delete" ON public.predictions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_prediction_sessions_updated BEFORE UPDATE ON public.prediction_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_predictions_updated BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

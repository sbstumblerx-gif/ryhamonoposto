ALTER TABLE public.race_sessions
  DROP CONSTRAINT IF EXISTS race_sessions_session_type_check;

ALTER TABLE public.race_sessions
  ADD CONSTRAINT race_sessions_session_type_check
  CHECK (session_type IN ('T', 'P', 'SQ', 'S', 'Q', 'R'));

-- Fix the fan-point migration so it is rerunnable in Supabase/Postgres.
DROP POLICY IF EXISTS "Fan point events are readable" ON public.fan_point_events;
CREATE POLICY "Fan point events are readable" ON public.fan_point_events
  FOR SELECT TO authenticated USING (true);

DROP INDEX IF EXISTS public.fan_point_events_event_key_idx;
CREATE UNIQUE INDEX IF NOT EXISTS fan_point_events_event_key_idx
  ON public.fan_point_events (event_key);

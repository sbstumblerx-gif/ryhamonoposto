-- Rolling fan-point rules for official driver/team activity.
-- No historical backfill: only events created after this migration is applied count.

CREATE TABLE IF NOT EXISTS public.fan_point_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('driver','team')),
  entity_slug text NOT NULL,
  points integer NOT NULL CHECK (points <> 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fan_point_events TO authenticated;
GRANT ALL ON public.fan_point_events TO service_role;
ALTER TABLE public.fan_point_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Fan point events are readable" ON public.fan_point_events
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.fan_point_events
  DROP CONSTRAINT IF EXISTS fan_point_events_points_check;

ALTER TABLE public.fan_point_events
  ADD CONSTRAINT fan_point_events_points_check CHECK (points <> 0);

ALTER TABLE public.fan_point_events
  ADD COLUMN IF NOT EXISTS event_key text;

CREATE UNIQUE INDEX IF NOT EXISTS fan_point_events_event_key_idx
  ON public.fan_point_events (event_key)
  WHERE event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS fan_point_events_entity_time_idx
  ON public.fan_point_events (entity_type, entity_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS fan_point_events_time_idx
  ON public.fan_point_events (created_at DESC);

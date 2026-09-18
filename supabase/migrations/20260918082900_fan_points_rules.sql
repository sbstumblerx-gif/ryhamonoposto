-- Rolling fan-point rules for official driver/team activity.
-- Starts from the moment this migration is applied: no historical backfill is performed.

ALTER TABLE public.fan_point_events
  DROP CONSTRAINT IF EXISTS fan_point_events_points_check;

ALTER TABLE public.fan_point_events
  ADD CONSTRAINT fan_point_events_points_check CHECK (points <> 0);

ALTER TABLE public.fan_point_events
  ADD COLUMN IF NOT EXISTS event_key text;

CREATE UNIQUE INDEX IF NOT EXISTS fan_point_events_event_key_idx
  ON public.fan_point_events (event_key)
  WHERE event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS fan_point_events_created_at_idx
  ON public.fan_point_events (created_at DESC);

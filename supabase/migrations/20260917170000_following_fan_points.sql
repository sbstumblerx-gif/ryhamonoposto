-- Following analytics and rolling fan-point events.
CREATE TABLE IF NOT EXISTS public.fan_point_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('driver','team')),
  entity_slug text NOT NULL,
  points integer NOT NULL CHECK (points > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fan_point_events TO authenticated;
GRANT ALL ON public.fan_point_events TO service_role;
ALTER TABLE public.fan_point_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fan point events are readable" ON public.fan_point_events
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS fan_point_events_entity_time_idx
  ON public.fan_point_events (entity_type, entity_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS fan_point_events_time_idx
  ON public.fan_point_events (created_at DESC);

-- Cached counters are intentionally views over follows/events, so they never need weekly resets.
CREATE OR REPLACE VIEW public.entity_follow_stats AS
SELECT entity_type, entity_slug, count(*)::integer AS follower_count
FROM public.follows
GROUP BY entity_type, entity_slug;

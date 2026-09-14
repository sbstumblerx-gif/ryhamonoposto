-- Restore the two per-race driver awards used by statistics.
-- IF NOT EXISTS intentionally preserves any values that may already exist in
-- the production database from the earlier implementation.
ALTER TABLE public.races
  ADD COLUMN IF NOT EXISTS driver_of_the_day_slug text,
  ADD COLUMN IF NOT EXISTS fastest_lap_driver_slug text;

CREATE INDEX IF NOT EXISTS races_driver_of_the_day_idx
  ON public.races (driver_of_the_day_slug);
CREATE INDEX IF NOT EXISTS races_fastest_lap_driver_idx
  ON public.races (fastest_lap_driver_slug);

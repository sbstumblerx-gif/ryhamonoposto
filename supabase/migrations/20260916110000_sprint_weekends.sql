-- Sprint weekend support.
-- A sprint weekend keeps the normal race sessions intact and adds two separate
-- sprint sessions plus sprint-specific awards/statistics.
ALTER TABLE public.races
  ADD COLUMN IF NOT EXISTS is_sprint_weekend boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sprint_qualifying_content text,
  ADD COLUMN IF NOT EXISTS sprint_content text,
  ADD COLUMN IF NOT EXISTS sprint_qualifying_media_url text,
  ADD COLUMN IF NOT EXISTS sprint_media_url text,
  ADD COLUMN IF NOT EXISTS sprint_qualifying_youtube_url text,
  ADD COLUMN IF NOT EXISTS sprint_youtube_url text,
  ADD COLUMN IF NOT EXISTS sprint_fastest_lap_driver_slug text;

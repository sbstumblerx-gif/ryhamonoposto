ALTER TABLE public.races
  ADD COLUMN IF NOT EXISTS qualifying_youtube_url text,
  ADD COLUMN IF NOT EXISTS race_youtube_url text;
ALTER TABLE public.races
  ADD COLUMN IF NOT EXISTS qualifying_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS race_updated_at timestamptz;

UPDATE public.races
SET qualifying_updated_at = COALESCE(qualifying_updated_at, updated_at)
WHERE qualifying_content IS NOT NULL AND length(trim(qualifying_content)) > 0;

UPDATE public.races
SET race_updated_at = COALESCE(race_updated_at, updated_at)
WHERE race_content IS NOT NULL AND length(trim(race_content)) > 0;
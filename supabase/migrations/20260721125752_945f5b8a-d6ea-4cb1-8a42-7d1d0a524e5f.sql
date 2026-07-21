ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS info_card text,
  ADD COLUMN IF NOT EXISTS current_driver_slugs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS former_lineups jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.teams
SET current_driver_slugs = '[]'::jsonb
WHERE current_driver_slugs IS NULL;

UPDATE public.teams
SET former_lineups = '[]'::jsonb
WHERE former_lineups IS NULL;
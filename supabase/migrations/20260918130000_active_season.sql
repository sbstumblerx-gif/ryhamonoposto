-- Mark exactly one season as the active season for current standings/contracts.
ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS seasons_single_active_idx
  ON public.seasons (is_active)
  WHERE is_active = true;

-- Keep the current 2026 season active when this migration is first applied.
UPDATE public.seasons SET is_active = false;
UPDATE public.seasons SET is_active = true WHERE slug = '2026';

-- If 2026 does not exist, leave all seasons inactive rather than guessing.

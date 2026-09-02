ALTER TABLE public.races ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS races_single_live_idx ON public.races (is_live) WHERE is_live;
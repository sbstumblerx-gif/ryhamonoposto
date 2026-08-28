-- "Käynnissä" (live) race shown at the top of the Kilpailut page, picked manually
-- by the admin. The partial unique index guarantees at most one race can be
-- marked live at a time (mirrors the card_packs_unique_session pattern).
ALTER TABLE public.races ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS races_single_live_idx ON public.races (is_live) WHERE is_live;

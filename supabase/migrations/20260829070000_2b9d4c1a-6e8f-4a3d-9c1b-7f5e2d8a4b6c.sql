-- Marks whether a driver's current team assignment is a reserve-driver stint
-- rather than a full seat. Former-team stints already live in the former_teams
-- JSONB array, so their own "is_reserve" flag needs no schema change — it's
-- just a new key in each array entry going forward.
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS current_team_is_reserve BOOLEAN NOT NULL DEFAULT false;

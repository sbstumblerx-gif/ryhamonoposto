-- Add contract end years for team engine agreements.
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS engine_contract_year integer;

ALTER TABLE public.teams
  DROP CONSTRAINT IF EXISTS teams_engine_contract_year_check;

ALTER TABLE public.teams
  ADD CONSTRAINT teams_engine_contract_year_check
  CHECK (engine_contract_year IS NULL OR engine_contract_year BETWEEN 2020 AND 2100);

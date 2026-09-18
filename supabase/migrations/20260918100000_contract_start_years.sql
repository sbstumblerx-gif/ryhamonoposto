-- Add contract start years for drivers, engine suppliers and circuits.
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS contract_start_year integer;

ALTER TABLE public.drivers
  DROP CONSTRAINT IF EXISTS drivers_contract_start_year_check;

ALTER TABLE public.drivers
  ADD CONSTRAINT drivers_contract_start_year_check
  CHECK (contract_start_year IS NULL OR contract_start_year BETWEEN 2020 AND 2100);

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS engine_contract_start_year integer;

ALTER TABLE public.teams
  DROP CONSTRAINT IF EXISTS teams_engine_contract_start_year_check;

ALTER TABLE public.teams
  ADD CONSTRAINT teams_engine_contract_start_year_check
  CHECK (engine_contract_start_year IS NULL OR engine_contract_start_year BETWEEN 2020 AND 2100);

ALTER TABLE public.circuit_contracts
  ADD COLUMN IF NOT EXISTS contract_start_year integer;

ALTER TABLE public.circuit_contracts
  DROP CONSTRAINT IF EXISTS circuit_contracts_start_year_check;

ALTER TABLE public.circuit_contracts
  ADD CONSTRAINT circuit_contracts_start_year_check
  CHECK (contract_start_year IS NULL OR contract_start_year BETWEEN 2020 AND 2100);

NOTIFY pgrst, 'reload schema';

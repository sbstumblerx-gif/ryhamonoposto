ALTER TABLE public.teams
  DROP CONSTRAINT IF EXISTS teams_engine_supplier_check;

ALTER TABLE public.teams
  ADD CONSTRAINT teams_engine_supplier_check
  CHECK (engine_supplier IS NULL OR engine_supplier IN ('Mercedes-AMG','Honda','Audi','Ferrari','Renault','Epic PT'));

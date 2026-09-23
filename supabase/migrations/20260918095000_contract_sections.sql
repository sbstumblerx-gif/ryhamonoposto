-- Contract management for engines and circuits.
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS engine_supplier text;

ALTER TABLE public.teams
  DROP CONSTRAINT IF EXISTS teams_engine_supplier_check;

ALTER TABLE public.teams
  ADD CONSTRAINT teams_engine_supplier_check
  CHECK (engine_supplier IS NULL OR engine_supplier IN ('Mercedes-AMG','Honda','Audi','Ferrari','Renault','Epic PT'));

CREATE TABLE IF NOT EXISTS public.circuit_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  contract_status text NOT NULL DEFAULT 'unknown'
    CHECK (contract_status IN ('active','expired','unknown')),
  contract_year integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (contract_status = 'unknown' AND contract_year IS NULL)
    OR (contract_status IN ('active','expired') AND contract_year IS NOT NULL)
  )
);

GRANT SELECT ON public.circuit_contracts TO authenticated;
GRANT ALL ON public.circuit_contracts TO service_role;
ALTER TABLE public.circuit_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Circuit contracts are readable" ON public.circuit_contracts;
CREATE POLICY "Circuit contracts are readable" ON public.circuit_contracts
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.circuit_contracts (slug, name)
VALUES
  ('australia','Australia'),
  ('kiina','Kiina'),
  ('japani','Japani'),
  ('bahrain','Bahrain'),
  ('saudi-arabia','Saudi-Arabia'),
  ('miami','Miami'),
  ('emilia-romagna','Emilia Romagna'),
  ('monaco','Monaco'),
  ('barcelona','Barcelona'),
  ('kanada','Kanada'),
  ('itavalta','Itävalta'),
  ('iso-britannia','Iso-Britannia'),
  ('belgia','Belgia'),
  ('unkari','Unkari'),
  ('alankomaat','Alankomaat'),
  ('italia','Italia'),
  ('espanja','Espanja (sama kuin Madrid)'),
  ('azerbaidzan','Azerbaidžan'),
  ('singapore','Singapore'),
  ('yhdysvallat','Yhdysvallat'),
  ('meksiko','Meksiko'),
  ('brasilia','Brasilia'),
  ('las-vegas','Las Vegas'),
  ('qatar','Qatar'),
  ('abu-dhabi','Abu Dhabi'),
  ('malesia','Malesia'),
  ('portugali','Portugali'),
  ('saksa','Saksa'),
  ('ranska','Ranska')
ON CONFLICT (slug) DO NOTHING;

CREATE INDEX IF NOT EXISTS circuit_contracts_name_idx
  ON public.circuit_contracts (name);

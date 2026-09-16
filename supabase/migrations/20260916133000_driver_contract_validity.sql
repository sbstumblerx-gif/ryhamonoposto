-- Current driver contract validity.
-- null is not used for the UI choices: the value is explicitly either no contract,
-- unknown, or the final season for which the current contract is valid.
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS current_contract_until text;

ALTER TABLE public.drivers
  DROP CONSTRAINT IF EXISTS drivers_current_contract_until_check;

ALTER TABLE public.drivers
  ADD CONSTRAINT drivers_current_contract_until_check
  CHECK (
    current_contract_until IN (
      'none',
      'unknown',
      '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033',
      '2034', '2035', '2036', '2037', '2038', '2039', '2040'
    )
    OR current_contract_until IS NULL
  );

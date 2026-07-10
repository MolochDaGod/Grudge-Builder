-- Canonical hero grudge code (GRDG-HUMWAR-…) separate from display name
BEGIN;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS grudge_code TEXT;

-- Unique when present (allows legacy NULL during roll-out)
CREATE UNIQUE INDEX IF NOT EXISTS characters_grudge_code_uidx
  ON characters (grudge_code)
  WHERE grudge_code IS NOT NULL;

-- Backfill: rows whose name was the old Foundry code become grudge_code
UPDATE characters
SET grudge_code = UPPER(name)
WHERE grudge_code IS NULL
  AND name ~* '^GRDG-';

COMMIT;

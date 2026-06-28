-- GCS multi-era roster migration
-- Adds per-character game era + per-account era slot caps

BEGIN;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS game_era TEXT NOT NULL DEFAULT 'warlords',
  ADD COLUMN IF NOT EXISTS active_for_era BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS era_slots JSONB DEFAULT '{"warlords":{"max":5,"activeCharacterId":null},"nexus":{"max":2,"activeCharacterId":null},"armada":{"max":2,"activeCharacterId":null}}'::jsonb;

-- Backfill existing characters as warlords-era
UPDATE characters SET game_era = 'warlords' WHERE game_era IS NULL;

COMMIT;
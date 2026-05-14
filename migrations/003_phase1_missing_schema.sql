-- =============================================
-- Phase 1 Missing Schema Migration
-- Created: 2026-05 (schema drift catch-up)
-- Adds all columns + tables that exist in shared/schema.ts
-- but were never applied to the Neon DB.
-- =============================================

BEGIN;

-- ─── characters: new columns ──────────────────────────────────────────────────
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS account_id VARCHAR,
  ADD COLUMN IF NOT EXISTS home_island_id VARCHAR,
  ADD COLUMN IF NOT EXISTS model_3d JSONB DEFAULT '{"baseModelId":"default","equippedMeshes":{},"weaponSlots":{},"faceVariant":"A","skinColor":"#ffffff","armorColor":"#ffffff","capeEnabled":false,"scale":1.0}'::jsonb,
  ADD COLUMN IF NOT EXISTS guild_id VARCHAR,
  ADD COLUMN IF NOT EXISTS unspent_attribute_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skill_points INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS skill_loadouts JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS weapon_skill_level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS weapon_skill_selections JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS equipped_weapon_id TEXT,
  ADD COLUMN IF NOT EXISTS selected_skills JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS personality JSONB,
  ADD COLUMN IF NOT EXISTS chat_temperature INTEGER DEFAULT 70,
  ADD COLUMN IF NOT EXISTS chat_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sprite_config JSONB DEFAULT '{"skinTone":0,"hairColor":0,"armorColor":0,"clothColor":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS cnft_id TEXT,
  ADD COLUMN IF NOT EXISTS cnft_address TEXT,
  ADD COLUMN IF NOT EXISTS revival_time BIGINT;

-- ─── accounts: new columns ────────────────────────────────────────────────────
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS home_island_id VARCHAR,
  ADD COLUMN IF NOT EXISTS home_island BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS home_island_mint_action_id TEXT,
  ADD COLUMN IF NOT EXISTS character_tokens INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS account_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS gbux_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS premium_currency INTEGER NOT NULL DEFAULT 0;

-- ─── home_islands table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS home_islands (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  VARCHAR NOT NULL UNIQUE,
  seed        TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT 'Home Island',
  map_style   TEXT NOT NULL DEFAULT 'iron',
  map_image_url TEXT,
  thumbnail_url TEXT,
  state       JSONB NOT NULL DEFAULT '{}'::jsonb,
  cnft_id     TEXT,
  cnft_address TEXT,
  validated_at BIGINT,
  created_at  BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  updated_at  BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- ─── island_nfts table (used in routes.ts for mint tracking) ─────────────────
CREATE TABLE IF NOT EXISTS island_nfts (
  id                  VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  island_id           VARCHAR NOT NULL,
  account_id          VARCHAR NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  mint_address        TEXT,
  crossmint_action_id TEXT,
  owner_wallet_address TEXT,
  is_compressed       BOOLEAN DEFAULT TRUE,
  created_at          BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_characters_cnft_id         ON characters(cnft_id);
CREATE INDEX IF NOT EXISTS idx_characters_cnft_address    ON characters(cnft_address);
CREATE INDEX IF NOT EXISTS idx_characters_home_island_id  ON characters(home_island_id);
CREATE INDEX IF NOT EXISTS idx_home_islands_validated_at  ON home_islands(validated_at);
CREATE INDEX IF NOT EXISTS idx_island_nfts_island_id      ON island_nfts(island_id);
CREATE INDEX IF NOT EXISTS idx_island_nfts_account_id     ON island_nfts(account_id);

COMMIT;

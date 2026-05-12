-- Phase 1 Character Creation System Migrations
-- =============================================
-- Adds sprite customization, cNFT tracking, and island validation

-- Migration 1: Alter characters table
-- Adds: sprite_config (HSL palette), cnft_id, cnft_address

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS sprite_config JSONB DEFAULT '{"skinTone":0,"hairColor":0,"armorColor":0,"clothColor":0}'::jsonb;

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS cnft_id TEXT,
ADD COLUMN IF NOT EXISTS cnft_address TEXT;

CREATE INDEX IF NOT EXISTS idx_characters_cnft_id ON characters(cnft_id);
CREATE INDEX IF NOT EXISTS idx_characters_cnft_address ON characters(cnft_address);

-- Migration 2: Alter home_islands table
-- Adds: cnft_id, cnft_address, validated_at (commitment timestamp)

ALTER TABLE home_islands
ADD COLUMN IF NOT EXISTS cnft_id TEXT,
ADD COLUMN IF NOT EXISTS cnft_address TEXT;

ALTER TABLE home_islands
ADD COLUMN IF NOT EXISTS validated_at BIGINT;

CREATE INDEX IF NOT EXISTS idx_home_islands_cnft_id ON home_islands(cnft_id);
CREATE INDEX IF NOT EXISTS idx_home_islands_validated_at ON home_islands(validated_at);

-- Migration 3: Ensure character-to-island relationship
-- Foreign key constraint already exists in schema, but add index for performance

CREATE INDEX IF NOT EXISTS idx_characters_home_island_id ON characters(home_island_id);

-- Verify columns exist
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name='characters' AND column_name IN ('sprite_config','cnft_id','cnft_address');

-- SELECT column_name FROM information_schema.columns
-- WHERE table_name='home_islands' AND column_name IN ('cnft_id','cnft_address','validated_at');

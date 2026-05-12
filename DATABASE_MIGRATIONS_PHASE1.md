# Phase 1 Character Creator - Database Migrations

Run these SQL migrations against your Postgres database to add support for character sprite customization and island minting.

## Migration 1: Add Sprite Configuration to Characters

```sql
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS spriteConfig JSONB DEFAULT '{"palette":{"skinTone":0,"hairColor":0,"armorColor":0,"clothColor":0}}';

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS cnftId TEXT;

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS cnftAddress TEXT;
```

## Migration 2: Add Minting Support to Home Islands

```sql
ALTER TABLE home_islands
ADD COLUMN IF NOT EXISTS seed TEXT NOT NULL DEFAULT uuid_generate_v4()::text;

ALTER TABLE home_islands
ADD COLUMN IF NOT EXISTS cnftId TEXT;

ALTER TABLE home_islands
ADD COLUMN IF NOT EXISTS cnftAddress TEXT;

ALTER TABLE home_islands
ADD COLUMN IF NOT EXISTS validatedAt BIGINT;
```

## Migration 3: Ensure Foreign Key

```sql
ALTER TABLE characters
ADD CONSTRAINT IF NOT EXISTS fk_character_homeisland
FOREIGN KEY (homeIslandId) REFERENCES home_islands(id) ON DELETE SET NULL;
```

## What These Columns Do

### Characters Table
- **spriteConfig**: JSON object storing HSL palette values (skinTone, hairColor, armorColor, clothColor) for 2D sprite customization
- **cnftId**: Solana token ID after minting character as cNFT on avatar collection
- **cnftAddress**: Crossmint metadata address for the minted avatar cNFT

### Home Islands Table
- **seed**: UUID seed used for deterministic island generation (ensures same seed = same island structure)
- **cnftId**: Solana token ID after minting island as cNFT on island collection
- **cnftAddress**: Crossmint metadata address for the minted island cNFT
- **validatedAt**: Unix timestamp when island was validated and committed (non-ephemeral)

## Running the Migrations

Using psql:
```bash
psql -h your-db-host -U your-user -d your-database -f DATABASE_MIGRATIONS_PHASE1.md
```

Or run individually via your database client:
1. Copy the SQL from Migration 1 and execute
2. Copy the SQL from Migration 2 and execute
3. Copy the SQL from Migration 3 and execute

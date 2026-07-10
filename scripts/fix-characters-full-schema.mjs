/**
 * Align production characters table with Drizzle schema enough for SELECT * roster queries.
 * Root cause of crafting.puter.site empty roster: GET /api/characters 500s when columns missing.
 */
import dotenv from "dotenv";
import pg from "pg";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });
dotenv.config({ path: join(root, ".env") });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

async function hasColumn(column) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='characters' AND column_name=$1`,
    [column],
  );
  return r.rows.length > 0;
}

async function add(column, ddl) {
  if (await hasColumn(column)) {
    console.log("  exists", column);
    return;
  }
  await client.query(`ALTER TABLE characters ADD COLUMN ${column} ${ddl}`);
  console.log("  ADDED", column);
}

console.log("[fix-characters-full] aligning characters columns…");

// SSOT keys for fleet roster
await add("user_id", "VARCHAR");
await add("account_id", "VARCHAR");
await add("game_era", "TEXT NOT NULL DEFAULT 'warlords'");
await add("active_for_era", "BOOLEAN NOT NULL DEFAULT FALSE");
await add("home_island_id", "VARCHAR");
await add("grudge_code", "TEXT");
await add("name", "TEXT NOT NULL DEFAULT 'Hero'");
await add("race_id", "TEXT NOT NULL DEFAULT 'human'");
await add("class_id", "TEXT NOT NULL DEFAULT 'warrior'");
await add("level", "INTEGER NOT NULL DEFAULT 0");
await add("xp", "INTEGER NOT NULL DEFAULT 0");
await add("hp", "INTEGER NOT NULL DEFAULT 100");
await add("energy", "INTEGER NOT NULL DEFAULT 50");
await add("attributes", "JSONB NOT NULL DEFAULT '{}'::jsonb");
await add("equipment", "JSONB NOT NULL DEFAULT '{}'::jsonb");
await add("inventory", "JSONB NOT NULL DEFAULT '[]'::jsonb");
await add("profession_levels", "JSONB NOT NULL DEFAULT '{}'::jsonb");
await add("revival_time", "BIGINT");
await add("avatar_url", "TEXT");
await add("model_3d", "JSONB");
await add("guild_id", "VARCHAR");
await add("unspent_attribute_points", "INTEGER NOT NULL DEFAULT 0");
await add("skill_points", "INTEGER NOT NULL DEFAULT 1");
await add("skill_loadouts", "JSONB NOT NULL DEFAULT '{}'::jsonb");
await add("weapon_skill_level", "INTEGER NOT NULL DEFAULT 1");
await add("weapon_skill_selections", "JSONB NOT NULL DEFAULT '{}'::jsonb");
await add("equipped_weapon_id", "TEXT");
await add("selected_skills", "JSONB NOT NULL DEFAULT '{}'::jsonb");
await add("personality", "JSONB");
await add("chat_temperature", "INTEGER DEFAULT 70");
await add("chat_history", "JSONB DEFAULT '[]'::jsonb");
await add("sprite_config", "JSONB");
await add("cnft_id", "TEXT");
await add("cnft_address", "TEXT");
await add("created_at", "BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint");

// Backfill user_id
const bf = await client.query(`
  UPDATE characters c
  SET user_id = a.user_id
  FROM accounts a
  WHERE c.account_id IS NOT NULL AND c.account_id = a.id
    AND a.user_id IS NOT NULL AND (c.user_id IS NULL OR c.user_id = '')
`);
console.log("[fix] backfill user_id", bf.rowCount);

await client.query(`CREATE INDEX IF NOT EXISTS characters_user_id_idx ON characters (user_id)`).catch(() => {});
await client.query(`CREATE INDEX IF NOT EXISTS characters_user_id_era_idx ON characters (user_id, game_era)`).catch(() => {});

// Smoke as Drizzle would (list of common columns)
try {
  const r = await client.query(`
    SELECT id, user_id, account_id, game_era, active_for_era, home_island_id,
           grudge_code, name, race_id, class_id, level, xp, hp, energy,
           attributes, equipment, inventory, profession_levels, revival_time,
           avatar_url, model_3d, guild_id, unspent_attribute_points, skill_points, skill_loadouts
    FROM characters
    WHERE user_id IS NOT NULL OR account_id IS NOT NULL
    LIMIT 3
  `);
  console.log("[fix] drizzle-like select OK, rows", r.rows.length);
} catch (e) {
  console.error("[fix] drizzle-like select FAIL", e.message);
  process.exit(1);
}

// Empty roster for a random uuid must return 0 rows not error
const empty = await client.query(
  `SELECT id FROM characters WHERE user_id = $1`,
  ["00000000-0000-0000-0000-000000000000"],
);
console.log("[fix] empty user query OK", empty.rows.length);

await client.end();
console.log("[fix-characters-full] done");

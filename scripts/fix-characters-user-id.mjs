/**
 * Production fix: characters.user_id is missing on legacy Neon.
 * Crafting + fleet roster query by userId — without this column /api/characters 500s.
 */
import dotenv from "dotenv";
import pg from "pg";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });
dotenv.config({ path: join(root, ".env") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
console.log("[fix-characters-user-id] connected");

async function hasColumn(table, column) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [table, column],
  );
  return r.rows.length > 0;
}

if (!(await hasColumn("characters", "user_id"))) {
  await client.query(`ALTER TABLE characters ADD COLUMN user_id VARCHAR`);
  console.log("[fix] added characters.user_id");
} else {
  console.log("[fix] characters.user_id already exists");
}

// Backfill from accounts when possible
const backfill = await client.query(`
  UPDATE characters c
  SET user_id = a.user_id
  FROM accounts a
  WHERE c.account_id IS NOT NULL
    AND c.account_id = a.id
    AND a.user_id IS NOT NULL
    AND (c.user_id IS NULL OR c.user_id = '')
`);
console.log("[fix] backfilled from account_id:", backfill.rowCount);

// Also try grudge_id match accounts.grudge_id → user_id
if (await hasColumn("characters", "grudge_id")) {
  const bf2 = await client.query(`
    UPDATE characters c
    SET user_id = a.user_id
    FROM accounts a
    WHERE c.grudge_id IS NOT NULL
      AND a.grudge_id IS NOT NULL
      AND c.grudge_id = a.grudge_id
      AND a.user_id IS NOT NULL
      AND (c.user_id IS NULL OR c.user_id = '')
  `);
  console.log("[fix] backfilled from grudge_id:", bf2.rowCount);
}

// Ensure game_era / active_for_era
if (!(await hasColumn("characters", "game_era"))) {
  await client.query(
    `ALTER TABLE characters ADD COLUMN game_era TEXT NOT NULL DEFAULT 'warlords'`,
  );
  console.log("[fix] added game_era");
}
if (!(await hasColumn("characters", "active_for_era"))) {
  await client.query(
    `ALTER TABLE characters ADD COLUMN active_for_era BOOLEAN NOT NULL DEFAULT FALSE`,
  );
  console.log("[fix] added active_for_era");
}
if (!(await hasColumn("characters", "grudge_code"))) {
  await client.query(`ALTER TABLE characters ADD COLUMN grudge_code TEXT`);
  console.log("[fix] added grudge_code");
}

// Index for roster queries
await client.query(`
  CREATE INDEX IF NOT EXISTS characters_user_id_idx ON characters (user_id)
`).catch((e) => console.warn("[fix] index:", e.message));
await client.query(`
  CREATE INDEX IF NOT EXISTS characters_user_id_era_idx ON characters (user_id, game_era)
`).catch((e) => console.warn("[fix] era index:", e.message));

const sample = await client.query(`
  SELECT count(*)::int AS total,
         count(user_id)::int AS with_user,
         count(*) FILTER (WHERE user_id IS NULL)::int AS missing_user
  FROM characters
`);
console.log("[fix] stats", sample.rows[0]);

// Smoke: select like API
try {
  const r = await client.query(
    `SELECT id, user_id, account_id, name, game_era FROM characters WHERE user_id IS NOT NULL LIMIT 3`,
  );
  console.log("[fix] smoke rows", r.rows);
} catch (e) {
  console.error("[fix] smoke FAIL", e.message);
  process.exit(1);
}

await client.end();
console.log("[fix-characters-user-id] done");

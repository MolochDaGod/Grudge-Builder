/**
 * Apply additive SQL migrations under migrations/*.sql
 *
 * Policy:
 *   - 000_users_table.sql — only if public.users is missing
 *   - 001–003 — SKIP (legacy drift; use drizzle push / ensure-auth-schema)
 *   - 004–007 — APPLY (idempotent additive: telegram, eras, grudge_code, ships)
 *
 * Usage: node scripts/apply-sql-migrations.mjs
 * Env: DATABASE_URL (from .env.local / .env)
 */
import fs from "fs";
import path from "path";
import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[sql-migrate] DATABASE_URL is required");
  process.exit(1);
}

const dir = path.join(root, "migrations");
const files = fs
  .readdirSync(dir)
  .filter((f) => /^\d+_.*\.sql$/i.test(f))
  .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

/** Migrations that assume an older DB shape — do not run via this runner */
const LEGACY_DRIFT = new Set([
  "001_add_wallet_grudge_id.sql",
  "002_phase1_character_creation.sql",
  "003_phase1_missing_schema.sql",
]);

/** Additive, IF NOT EXISTS / safe re-runs */
const APPLY_ALLOWLIST = new Set([
  "000_users_table.sql",
  "004_telegram_links.sql",
  "005_game_eras.sql",
  "006_character_grudge_code.sql",
  "007_player_ships.sql",
  "009_users_discord_puter_identity.sql",
  "041_account_learned_recipes.sql",
]);

const client = new pg.Client({
  connectionString: url,
  ssl:
    url.includes("localhost") || url.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: false },
});

await client.connect();

const usersCheck = await client.query(
  `SELECT to_regclass('public.users') AS users`,
);
const needsUsers = !usersCheck.rows[0]?.users;

let applied = 0;
let skipped = 0;

for (const file of files) {
  if (file === "000_users_table.sql" && !needsUsers) {
    console.log(`[sql-migrate] skip ${file} (users already exists)`);
    skipped++;
    continue;
  }
  if (LEGACY_DRIFT.has(file)) {
    console.log(
      `[sql-migrate] skip ${file} (legacy drift — use npm run db:push / db:push:drizzle)`,
    );
    skipped++;
    continue;
  }
  if (!APPLY_ALLOWLIST.has(file)) {
    console.log(`[sql-migrate] skip ${file} (not in additive allowlist)`);
    skipped++;
    continue;
  }

  const sql = fs.readFileSync(path.join(dir, file), "utf8");
  console.log(`[sql-migrate] apply ${file}`);
  try {
    await client.query(sql);
    applied++;
  } catch (err) {
    console.error(`[sql-migrate] ${file} failed:`, err.message);
    await client.end();
    process.exit(1);
  }
}

// Verify critical columns / tables from 006 + 007
const verify = await client.query(`
  SELECT
    (SELECT COUNT(*)::int FROM information_schema.columns
      WHERE table_name = 'characters' AND column_name = 'grudge_code') AS grudge_code,
    (SELECT COUNT(*)::int FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'player_ships') AS player_ships
`);
console.log("[sql-migrate] verify:", verify.rows[0]);

await client.end();
console.log(
  `[sql-migrate] done — applied=${applied} skipped=${skipped}`,
);
if (verify.rows[0]?.grudge_code === 0) {
  console.warn("[sql-migrate] WARN: characters.grudge_code still missing");
}
if (verify.rows[0]?.player_ships === 0) {
  console.warn("[sql-migrate] WARN: player_ships table still missing");
}

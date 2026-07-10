/**
 * Apply migrations/007_player_ships.sql against DATABASE_URL.
 * Usage: node --env-file=.env scripts/run-migration-007.mjs
 *    or: node scripts/run-migration-007.mjs (loads dotenv)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const sqlPath = path.join(root, "migrations", "007_player_ships.sql");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");
const client = new pg.Client({
  connectionString: url,
  ssl:
    url.includes("localhost") || url.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: false },
});
await client.connect();
try {
  await client.query(sql);
  console.log("OK: 007_player_ships applied");
  const check = await client.query(`
    SELECT to_regclass('public.player_ships') AS t,
           (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_name = 'characters' AND column_name = 'grudge_code') AS grudge_code_col
  `);
  console.log("Verify:", check.rows[0]);
} finally {
  await client.end();
}

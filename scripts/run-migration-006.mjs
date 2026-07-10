/**
 * Apply migrations/006_character_grudge_code.sql against DATABASE_URL.
 * Usage: node scripts/run-migration-006.mjs
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
const sqlPath = path.join(root, "migrations", "006_character_grudge_code.sql");

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
  console.log("OK: 006_character_grudge_code applied");
  const check = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'grudge_code'
  `);
  console.log("Verify grudge_code column:", check.rows.length ? "present" : "MISSING");
} finally {
  await client.end();
}

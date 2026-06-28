/**
 * Full drizzle-kit pushSchema (non-interactive). May fail on legacy Neon DBs
 * with extra tables — use `npm run db:push` (ensure-auth-schema) for production.
 */
import dotenv from "dotenv";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { pushSchema } from "drizzle-kit/api";
import * as schema from "../shared/schema";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[db:push] DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes("localhost") || url.includes("127.0.0.1")
    ? undefined
    : { rejectUnauthorized: false },
});

const db = drizzle(pool);

console.log("[db:push] Computing diff against public schema...");
const result = await pushSchema(schema, db, ["public"]);

if (result.warnings.length) {
  for (const w of result.warnings) console.warn("[db:push] warning:", w);
}

if (result.statementsToExecute.length === 0) {
  console.log("[db:push] Schema already in sync");
  await pool.end();
  process.exit(0);
}

console.log(`[db:push] Applying ${result.statementsToExecute.length} statement(s)...`);
for (const stmt of result.statementsToExecute) {
  console.log(`  · ${stmt.slice(0, 120)}${stmt.length > 120 ? "…" : ""}`);
}

await result.apply();
console.log("[db:push] Done");
await pool.end();
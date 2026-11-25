import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const { Pool } = pg;

/**
 * Sandbox mode: if no DATABASE_URL, the server starts without a real DB.
 * Colyseus rooms, Three.js scene loading, and the forge editor all work.
 * Only account/inventory persistence is disabled.
 */
export const SANDBOX_MODE = !process.env.DATABASE_URL;

if (SANDBOX_MODE) {
  console.log("[db] ⚠️  SANDBOX MODE — no DATABASE_URL set.");
  console.log("[db]    Colyseus rooms and asset serving work normally.");
  console.log("[db]    Account/inventory persistence is disabled.");
  console.log("[db]    Set DATABASE_URL in .env.local to enable full DB.");
}

// Only create pool if we have a connection string
export const pool = SANDBOX_MODE
  ? null
  : new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production" && !process.env.RAILWAY_ENVIRONMENT_ID
          ? { rejectUnauthorized: false }
          : undefined,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

if (pool) {
  pool.on("error", (err) => {
    console.error("[db] Unexpected pool error:", err.message);
  });
}

// Preserve schema inference in every query. Unconfigured persistence fails explicitly.
const unavailableDatabase = new Proxy({} as NodePgDatabase<typeof schema>, {
  get() { throw new Error("Player persistence is unavailable: DATABASE_URL is not configured."); },
});
export const db: NodePgDatabase<typeof schema> = pool
  ? drizzle(pool, { schema })
  : unavailableDatabase;

/** Quick connectivity check — used by health endpoint */
export async function checkDbHealth(): Promise<boolean> {
  if (SANDBOX_MODE) return false;
  try {
    const client = await pool!.connect();
    try {
      await client.query("SELECT 1");
      return true;
    } finally { client.release(); }
  } catch {
    return false;
  }
}


import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import pg from "pg";
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

// Drizzle ORM instance — null in sandbox mode
export const db = pool
  ? (await import("drizzle-orm/node-postgres")).drizzle(pool, { schema })
  : (null as any);

/** Quick connectivity check — used by health endpoint */
export async function checkDbHealth(): Promise<boolean> {
  if (SANDBOX_MODE) return false;
  try {
    const client = await pool!.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch {
    return false;
  }
}

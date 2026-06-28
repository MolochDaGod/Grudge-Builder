import fs from "fs";
import path from "path";
import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const dir = path.join(root, "migrations");
const files = fs
  .readdirSync(dir)
  .filter((f) => /^\d+_.*\.sql$/i.test(f))
  .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL?.includes("localhost") ||
    process.env.DATABASE_URL?.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: false },
});

await client.connect();

const usersCheck = await client.query(`SELECT to_regclass('public.users') AS users`);
const needsUsers = !usersCheck.rows[0]?.users;

for (const file of files) {
  if (file === "000_users_table.sql" && !needsUsers) {
    console.log(`[sql-migrate] skip ${file} (users already exists)`);
    continue;
  }
  // Legacy numbered migrations assume an older DB shape; programmatic push handles drift.
  if (file !== "000_users_table.sql") {
    console.log(`[sql-migrate] skip ${file} (use drizzle push for schema drift)`);
    continue;
  }
  const sql = fs.readFileSync(path.join(dir, file), "utf8");
  console.log(`[sql-migrate] ${file}`);
  try {
    await client.query(sql);
  } catch (err) {
    console.error(`[sql-migrate] ${file} failed:`, err.message);
    throw err;
  }
}
await client.end();
console.log("[sql-migrate] SQL bootstrap complete");
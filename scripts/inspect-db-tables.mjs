import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });
dotenv.config({ path: join(root, ".env") });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const tables = await client.query(`
  SELECT table_schema, table_name
  FROM information_schema.tables
  WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  ORDER BY 1, 2
`);
console.log(`Found ${tables.rows.length} tables:`);
for (const row of tables.rows) {
  console.log(`  ${row.table_schema}.${row.table_name}`);
}
const users = await client.query(`SELECT to_regclass('public.users') AS users`);
console.log("public.users:", users.rows[0]?.users ?? "MISSING");
await client.end();
import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

dotenv.config({ path: join(root, '.env.local') });
dotenv.config({ path: join(root, '.env') });

const { Client } = pg;
const sql = fs.readFileSync(join(root, 'migrations', '005_game_eras.sql'), 'utf8');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log('Connected to DB');

try {
  await client.query(sql);
  console.log('Migration 005 applied successfully');

  const checks = [
    "SELECT column_name FROM information_schema.columns WHERE table_name='characters' AND column_name='game_era'",
    "SELECT column_name FROM information_schema.columns WHERE table_name='characters' AND column_name='active_for_era'",
    "SELECT column_name FROM information_schema.columns WHERE table_name='accounts' AND column_name='era_slots'",
  ];

  for (const q of checks) {
    const r = await client.query(q);
    if (r.rows.length > 0) {
      console.log(`  OK ${r.rows[0].column_name}`);
    } else {
      console.error(`  MISSING: ${q}`);
      process.exit(1);
    }
  }
} catch (err) {
  console.error('Migration error:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
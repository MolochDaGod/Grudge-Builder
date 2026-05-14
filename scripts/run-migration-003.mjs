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
const sql = fs.readFileSync(join(root, 'migrations', '003_phase1_missing_schema.sql'), 'utf8');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log('Connected to Neon DB');

try {
  await client.query(sql);
  console.log('✅ Migration 003 applied successfully');

  // Verify key items exist
  const checks = [
    "SELECT column_name FROM information_schema.columns WHERE table_name='characters' AND column_name='model_3d'",
    "SELECT column_name FROM information_schema.columns WHERE table_name='accounts' AND column_name='character_tokens'",
    "SELECT table_name FROM information_schema.tables WHERE table_name='home_islands'",
    "SELECT table_name FROM information_schema.tables WHERE table_name='island_nfts'",
  ];

  for (const q of checks) {
    const r = await client.query(q);
    if (r.rows.length > 0) {
      console.log(`  ✅  ${r.rows[0].column_name || r.rows[0].table_name} — exists`);
    } else {
      console.error(`  ❌  query "${q}" returned no rows`);
    }
  }
} catch (err) {
  console.error('❌ Migration error:', err.message);
  process.exit(1);
} finally {
  await client.end();
}

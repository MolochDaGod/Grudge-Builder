import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
dotenv.config({ path: join(root, '.env.local') });
dotenv.config({ path: join(root, '.env') });

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log('Connected');

// Show current columns
const r1 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position");
console.log('users columns:', r1.rows.map(r => r.column_name).join(', '));

const r2 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='accounts' ORDER BY ordinal_position");
console.log('accounts columns:', r2.rows.map(r => r.column_name).join(', '));

// Fix missing columns
const fixes = [
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS grudge_id TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT",
];

for (const sql of fixes) {
  try {
    await client.query(sql);
    console.log('Applied:', sql);
  } catch (err) {
    console.log('Skip (already exists or error):', err.message);
  }
}

// Verify
const r3 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position");
console.log('users columns (after fix):', r3.rows.map(r => r.column_name).join(', '));

await client.end();

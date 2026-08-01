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

// Fix missing columns — includes Discord/Puter identity links (id.grudge-studio.com)
const fixes = [
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS grudge_id TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_username TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_email TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_avatar TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_verified BOOLEAN DEFAULT false",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS puter_user_id TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS puter_username TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS puter_email TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS puter_linked_at TIMESTAMPTZ",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_method TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT",
  `CREATE UNIQUE INDEX IF NOT EXISTS users_discord_id_uidx ON users (discord_id) WHERE discord_id IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_puter_user_id_uidx ON users (puter_user_id) WHERE puter_user_id IS NOT NULL`,
  `UPDATE users SET discord_id = substring(username from 9) WHERE username LIKE 'discord:%' AND (discord_id IS NULL OR discord_id = '')`,
  `UPDATE users SET puter_user_id = substring(username from 7) WHERE username LIKE 'puter:%' AND (puter_user_id IS NULL OR puter_user_id = '')`,
];

for (const sql of fixes) {
  try {
    await client.query(sql);
    console.log('Applied:', sql.slice(0, 80));
  } catch (err) {
    console.log('Skip (already exists or error):', err.message);
  }
}

// Verify
const r3 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position");
console.log('users columns (after fix):', r3.rows.map(r => r.column_name).join(', '));

await client.end();

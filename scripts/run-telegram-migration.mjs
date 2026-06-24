import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const val = m[2].trim().replace(/^"|"$/g, '');
      if (val) process.env[m[1].trim()] = val;
    }
  }
}

loadEnv();
if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, '..', '.env');
  const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
  if (line) process.env.DATABASE_URL = line.slice('DATABASE_URL='.length).trim();
}

const sql = fs.readFileSync(
  path.join(__dirname, '..', 'migrations', '004_telegram_links.sql'),
  'utf8'
);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');

  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  const check = await client.query(
    "SELECT to_regclass('public.telegram_links') AS table_name"
  );
  console.log('telegram_links table:', check.rows[0]?.table_name || 'missing');
  await client.end();
}

main().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
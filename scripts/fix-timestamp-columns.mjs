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

// Check column types for timestamp columns in critical tables
const typesQuery = `
  SELECT table_name, column_name, data_type, udt_name
  FROM information_schema.columns
  WHERE table_name IN ('accounts', 'characters', 'home_islands', 'island_nfts', 'parties')
    AND column_name IN ('created_at', 'updated_at', 'revival_time', 'validated_at', 'unlocked_at', 'unlockedAt')
  ORDER BY table_name, column_name
`;
const r = await client.query(typesQuery);
console.log('\nCurrent timestamp column types:');
r.rows.forEach(row => console.log(`  ${row.table_name}.${row.column_name}: ${row.data_type} (${row.udt_name})`));

// Fix any TIMESTAMP columns in accounts, characters that should be BIGINT
const fixes = [];

for (const row of r.rows) {
  if (row.data_type === 'timestamp without time zone' || row.data_type === 'timestamp with time zone') {
    const col = row.column_name;
    const tbl = row.table_name;
    // Convert TIMESTAMP → BIGINT using epoch milliseconds
    fixes.push({
      table: tbl,
      column: col,
      sql: `ALTER TABLE ${tbl} ALTER COLUMN ${col} TYPE BIGINT USING EXTRACT(EPOCH FROM ${col})::BIGINT * 1000`,
    });
  }
}

if (fixes.length === 0) {
  console.log('\nNo timestamp columns need fixing — all are already BIGINT or compatible.');
} else {
  console.log(`\nFixing ${fixes.length} TIMESTAMP → BIGINT conversions...`);
  for (const fix of fixes) {
    try {
      // 1. Drop the default (may reference NOW() which can't cast to BIGINT)
      await client.query(`ALTER TABLE ${fix.table} ALTER COLUMN ${fix.column} DROP DEFAULT`);
      // 2. Convert the column type, casting existing TIMESTAMP values to epoch milliseconds
      await client.query(fix.sql);
      // 3. Re-add a BIGINT-compatible default
      await client.query(`ALTER TABLE ${fix.table} ALTER COLUMN ${fix.column} SET DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000`);
      console.log(`  ✅  ${fix.table}.${fix.column} converted to BIGINT`);
    } catch (err) {
      console.error(`  ❌  ${fix.table}.${fix.column}: ${err.message}`);
    }
  }
}

// Also verify home_islands column types  
const r2 = await client.query(`
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'home_islands'
  ORDER BY ordinal_position
`);
console.log('\nhome_islands columns:');
r2.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));

await client.end();

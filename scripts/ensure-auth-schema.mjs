/**
 * Idempotent auth schema bootstrap for legacy Neon DBs.
 * drizzle-kit push / pushSchema fails on this DB (TTY + $1 introspection bugs),
 * so Railway start and npm run db:push use this targeted migration instead.
 */
import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });
dotenv.config({ path: join(root, ".env") });

if (!process.env.DATABASE_URL) {
  console.error("[ensure-auth-schema] DATABASE_URL is not set");
  process.exit(1);
}

const ssl =
  process.env.DATABASE_URL.includes("localhost") ||
  process.env.DATABASE_URL.includes("127.0.0.1")
    ? undefined
    : { rejectUnauthorized: false };

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl });
await client.connect();

async function hasColumn(table, column) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [table, column],
  );
  return r.rows.length > 0;
}

async function hasTable(table) {
  const r = await client.query(`SELECT to_regclass($1) AS reg`, [`public.${table}`]);
  return r.rows[0]?.reg != null;
}

async function addColumn(table, column, ddl) {
  if (await hasColumn(table, column)) return false;
  await client.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  console.log(`[ensure-auth-schema] Added ${table}.${column}`);
  return true;
}

console.log("[ensure-auth-schema] Bootstrapping users + accounts for Puter SSO...");

await client.query(`
  CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL DEFAULT '',
    grudge_id TEXT UNIQUE,
    email TEXT
  );
`);

// Identity link columns — required by server/lib/identityLink.ts (Discord / Puter SSO).
// Production id.grudge-studio.com proxies to Railway; missing columns → 500
// "column discord_id does not exist" on Discord login / /me provider merge.
console.log("[ensure-auth-schema] Patching users for Discord / Puter identity links...");
for (const [col, ddl] of [
  ["grudge_id", "TEXT"],
  ["email", "TEXT"],
  ["discord_id", "TEXT"],
  ["discord_username", "TEXT"],
  ["discord_email", "TEXT"],
  ["discord_avatar", "TEXT"],
  ["discord_verified", "BOOLEAN DEFAULT false"],
  ["puter_user_id", "TEXT"],
  ["puter_username", "TEXT"],
  ["puter_email", "TEXT"],
  ["puter_linked_at", "TIMESTAMPTZ"],
  ["auth_method", "TEXT"],
  ["display_name", "TEXT"],
  ["is_admin", "BOOLEAN DEFAULT false"],
  ["last_login_at", "TIMESTAMPTZ"],
  ["avatar_url", "TEXT"],
  ["phone_number", "TEXT"],
]) {
  await addColumn("users", col, ddl);
}
// Unique indexes for fast provider lookups (idempotent)
await client
  .query(
    `CREATE UNIQUE INDEX IF NOT EXISTS users_discord_id_uidx
     ON users (discord_id) WHERE discord_id IS NOT NULL`,
  )
  .catch(() => {});
await client
  .query(
    `CREATE UNIQUE INDEX IF NOT EXISTS users_puter_user_id_uidx
     ON users (puter_user_id) WHERE puter_user_id IS NOT NULL`,
  )
  .catch(() => {});
// Backfill discord_id from username prefix discord:<id> (legacy scoped profiles)
try {
  const bf = await client.query(`
    UPDATE users
    SET discord_id = substring(username from 9)
    WHERE username LIKE 'discord:%'
      AND (discord_id IS NULL OR discord_id = '')
  `);
  if (bf.rowCount) {
    console.log(`[ensure-auth-schema] backfilled discord_id from username: ${bf.rowCount}`);
  }
} catch (e) {
  console.warn("[ensure-auth-schema] discord_id backfill skipped:", e.message);
}
try {
  const bf = await client.query(`
    UPDATE users
    SET puter_user_id = substring(username from 7)
    WHERE username LIKE 'puter:%'
      AND (puter_user_id IS NULL OR puter_user_id = '')
  `);
  if (bf.rowCount) {
    console.log(`[ensure-auth-schema] backfilled puter_user_id from username: ${bf.rowCount}`);
  }
} catch (e) {
  console.warn("[ensure-auth-schema] puter_user_id backfill skipped:", e.message);
}

if (await hasTable("accounts")) {
  const tsDefault = `(extract(epoch from now()) * 1000)::bigint`;

  // Legacy rows may lack column defaults — breaks createAccount inserts.
  for (const [col, ddl] of [
    ["id", "gen_random_uuid()"],
    ["created_at", tsDefault],
    ["updated_at", tsDefault],
  ]) {
    if (await hasColumn("accounts", col)) {
      await client.query(`ALTER TABLE accounts ALTER COLUMN ${col} SET DEFAULT ${ddl}`).catch(() => {});
    }
  }

  await addColumn("accounts", "user_id", "VARCHAR");

  const eraSlotsDefault =
    `'{"warlords":{"max":5,"activeCharacterId":null},"nexus":{"max":2,"activeCharacterId":null},"armada":{"max":2,"activeCharacterId":null}}'::jsonb`;

  // Mirrors shared/schema.ts accounts table — only adds missing columns.
  for (const [col, ddl] of [
    ["grudge_id", "TEXT"],
    ["display_name", "TEXT"],
    ["home_island_id", "VARCHAR"],
    ["home_island", "BOOLEAN NOT NULL DEFAULT false"],
    ["home_island_mint_action_id", "TEXT"],
    ["gold", "INTEGER NOT NULL DEFAULT 0"],
    ["premium_currency", "INTEGER NOT NULL DEFAULT 0"],
    ["gbux_balance", "INTEGER NOT NULL DEFAULT 0"],
    ["character_tokens", "INTEGER NOT NULL DEFAULT 1"],
    ["era_slots", `JSONB DEFAULT ${eraSlotsDefault}`],
    ["account_xp", "INTEGER NOT NULL DEFAULT 0"],
    ["avatar_url", "TEXT"],
    ["wallet_address", "TEXT"],
    ["wallet_type", "TEXT"],
    ["crossmint_wallet_id", "TEXT"],
    ["crossmint_email", "TEXT"],
    ["created_at", `BIGINT NOT NULL DEFAULT ${tsDefault}`],
    ["updated_at", `BIGINT NOT NULL DEFAULT ${tsDefault}`],
  ]) {
    await addColumn("accounts", col, ddl);
  }
} else {
  console.warn("[ensure-auth-schema] public.accounts missing — skipping column patches");
}

await client.query(`
  CREATE TABLE IF NOT EXISTS linked_wallets (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR NOT NULL,
    wallet_address TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'other',
    label TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    verified_at BIGINT,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
  );
`);

await client.query(`
  CREATE TABLE IF NOT EXISTS wallet_purchases (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR NOT NULL,
    linked_wallet_address TEXT,
    currency TEXT NOT NULL,
    amount_in REAL NOT NULL,
    gbux_out INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    tx_signature TEXT,
    treasury_address TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    metadata JSONB,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    confirmed_at BIGINT
  );
`);

// Characters — production Neon historically lacked user_id (only account_id).
// Without user_id, GET /api/characters 500s and crafting.puter.site cannot load Warlords rosters.
if (await hasTable("characters")) {
  console.log("[ensure-auth-schema] Patching characters for fleet roster queries...");
  await addColumn("characters", "user_id", "VARCHAR");
  await addColumn("characters", "game_era", "TEXT NOT NULL DEFAULT 'warlords'");
  await addColumn("characters", "active_for_era", "BOOLEAN NOT NULL DEFAULT FALSE");
  await addColumn("characters", "grudge_code", "TEXT");
  await addColumn("characters", "home_island_id", "VARCHAR");
  // Backfill user_id from accounts when possible
  try {
    const r = await client.query(`
      UPDATE characters c
      SET user_id = a.user_id
      FROM accounts a
      WHERE c.account_id IS NOT NULL
        AND c.account_id = a.id
        AND a.user_id IS NOT NULL
        AND (c.user_id IS NULL OR c.user_id = '')
    `);
    if (r.rowCount) console.log(`[ensure-auth-schema] backfilled characters.user_id: ${r.rowCount}`);
  } catch (e) {
    console.warn("[ensure-auth-schema] user_id backfill skipped:", e.message);
  }
  await client.query(`CREATE INDEX IF NOT EXISTS characters_user_id_idx ON characters (user_id)`).catch(() => {});
  await client.query(`CREATE INDEX IF NOT EXISTS characters_user_id_era_idx ON characters (user_id, game_era)`).catch(() => {});
} else {
  console.warn("[ensure-auth-schema] public.characters missing — skipping roster patches");
}

console.log("[ensure-auth-schema] Bootstrapping treaty chat tables...");

await client.query(`
  CREATE TABLE IF NOT EXISTS treaty_friends (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR NOT NULL,
    friend_account_id VARCHAR NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    initiated_by VARCHAR NOT NULL,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    responded_at BIGINT
  );
`);

await client.query(`
  CREATE TABLE IF NOT EXISTS treaty_dm_threads (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    account_low VARCHAR NOT NULL,
    account_high VARCHAR NOT NULL,
    updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
  );
`);

await client.query(`
  CREATE TABLE IF NOT EXISTS treaty_messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id VARCHAR NOT NULL,
    sender_account_id VARCHAR NOT NULL,
    content TEXT NOT NULL,
    read_at BIGINT,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
  );
`);

console.log("[ensure-auth-schema] Bootstrapping treaty group tables...");

await client.query(`
  CREATE TABLE IF NOT EXISTS treaty_groups (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_account_id VARCHAR NOT NULL,
    avatar_url TEXT,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
  );
`);

await client.query(`
  CREATE TABLE IF NOT EXISTS treaty_group_members (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id VARCHAR NOT NULL,
    account_id VARCHAR NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    last_read_at BIGINT
  );
`);

await client.query(`
  CREATE TABLE IF NOT EXISTS treaty_group_messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id VARCHAR NOT NULL,
    sender_account_id VARCHAR NOT NULL,
    content TEXT NOT NULL,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
  );
`);

await client.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS treaty_group_members_group_account_uidx
    ON treaty_group_members (group_id, account_id)
`).catch(() => {});

console.log("[ensure-auth-schema] Bootstrapping treaty server chat (fleet channels)...");

await client.query(`
  CREATE TABLE IF NOT EXISTS treaty_server_channels (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    game_id TEXT NOT NULL DEFAULT 'fleet',
    is_public INT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
  );
`);

await client.query(`
  CREATE TABLE IF NOT EXISTS treaty_server_messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id VARCHAR NOT NULL,
    sender_account_id VARCHAR NOT NULL,
    content TEXT NOT NULL,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
  );
`);

await client.query(`
  CREATE INDEX IF NOT EXISTS treaty_server_messages_channel_created_idx
    ON treaty_server_messages (channel_id, created_at DESC)
`).catch(() => {});

// Seed default fleet + game channels (idempotent)
const seedChannels = [
  ["fleet-general", "Fleet General", "All Grudge Studio players", "fleet", 0],
  ["fleet-help", "Fleet Help", "Questions and onboarding", "fleet", 1],
  ["warlords", "Grudge Warlords", "Warlords chat", "warlords", 10],
  ["genesis", "Warlord Genesis", "MOBA / RTS siege chat", "genesis", 11],
  ["grudge6", "Grudge6 Lab", "Character lab and HUD", "grudge6", 12],
  ["forge", "Studio Forge", "Map and editor chat", "forge", 13],
  ["crafting", "Crafting", "WCS / professions", "crafting", 14],
  ["lfg", "Looking for Group", "Find party / crew", "fleet", 2],
];
for (const [slug, name, description, gameId, sortOrder] of seedChannels) {
  await client.query(
    `INSERT INTO treaty_server_channels (slug, name, description, game_id, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (slug) DO NOTHING`,
    [slug, name, description, gameId, sortOrder],
  ).catch(() => {});
}

await client.end();
console.log("[ensure-auth-schema] Done");
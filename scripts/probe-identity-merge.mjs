/**
 * Probe Railway identity for split-brain: Puter / Discord / email / grudgeId.
 * Usage: node scripts/probe-identity-merge.mjs
 * Requires DATABASE_URL in env or .env
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv();

const TARGET_GID = process.env.PROBE_GRUDGE_ID || "GRUDGE_MS5O7IJUA54E6";
const TARGET_EMAIL = (process.env.PROBE_EMAIL || "grudgedev@gmail.com").toLowerCase();
const TARGET_USERNAMES = ["grudachain", "molochdadev"];

const ssl =
  process.env.DATABASE_SSL === "0"
    ? undefined
    : { rejectUnauthorized: false };

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

async function q(sql, params = []) {
  return (await client.query(sql, params)).rows;
}

function summarizeUser(u) {
  return {
    id: u.id,
    username: u.username,
    grudge_id: u.grudge_id,
    email: u.email,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }
  await client.connect();

  const userCols = await q(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users' ORDER BY ordinal_position`,
  );
  console.log("users columns:", userCols.map((r) => r.column_name).join(", "));

  const accountCols = await q(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' ORDER BY ordinal_position`,
  );
  console.log("accounts columns:", accountCols.map((r) => r.column_name).join(", "));

  // Broad match: target grudge, email, known admins, provider prefixes for same email
  const users = await q(
    `
    SELECT id, username, grudge_id, email
    FROM users
    WHERE grudge_id = $1
       OR lower(coalesce(email,'')) = $2
       OR lower(username) = ANY($3::text[])
       OR username ILIKE 'discord:%'
       OR (username ILIKE 'puter:%' AND lower(coalesce(email,'')) = $2)
    ORDER BY
      CASE WHEN grudge_id = $1 THEN 0 ELSE 1 END,
      username
    LIMIT 80
    `,
    [TARGET_GID, TARGET_EMAIL, TARGET_USERNAMES],
  );

  // Also pull discord rows that share display patterns / recent
  const discordish = await q(
    `
    SELECT id, username, grudge_id, email
    FROM users
    WHERE username ILIKE 'discord:%'
      AND (
        lower(coalesce(email,'')) = $1
        OR grudge_id = $2
      )
    LIMIT 20
    `,
    [TARGET_EMAIL, TARGET_GID],
  );

  // Puter rows for email or grudge
  const puterish = await q(
    `
    SELECT id, username, grudge_id, email
    FROM users
    WHERE username ILIKE 'puter:%'
      AND (lower(coalesce(email,'')) = $1 OR grudge_id = $2)
    LIMIT 20
    `,
    [TARGET_EMAIL, TARGET_GID],
  );

  // Admin username rows even without email match
  const admins = await q(
    `
    SELECT id, username, grudge_id, email
    FROM users
    WHERE lower(username) = ANY($1::text[])
       OR grudge_id = $2
    LIMIT 20
    `,
    [TARGET_USERNAMES, TARGET_GID],
  );

  const byId = new Map();
  for (const u of [...users, ...discordish, ...puterish, ...admins]) {
    byId.set(u.id, u);
  }
  const all = [...byId.values()];
  console.log("\n=== IDENTITY CANDIDATES ===");
  console.log(JSON.stringify(all.map(summarizeUser), null, 2));

  // Accounts
  let accounts = [];
  try {
    accounts = await q(
      `
      SELECT id, user_id, grudge_id, display_name
      FROM accounts
      WHERE grudge_id = $1
         OR user_id = ANY($2::text[])
         OR lower(coalesce(display_name,'')) = ANY($3::text[])
      LIMIT 40
      `,
      [TARGET_GID, all.map((u) => u.id), TARGET_USERNAMES],
    );
  } catch (e) {
    console.log("accounts query failed:", e.message);
  }
  console.log("\n=== ACCOUNTS ===");
  console.log(JSON.stringify(accounts, null, 2));

  // Character counts per user_id / account
  for (const u of all) {
    const chars = await q(
      `SELECT count(*)::int AS n, count(*) FILTER (WHERE game_era = 'warlords')::int AS warlords
       FROM characters WHERE user_id = $1 OR account_id IN (
         SELECT id FROM accounts WHERE user_id = $1
       )`,
      [u.id],
    ).catch(() => [{ n: -1, warlords: -1 }]);
    console.log(
      `chars user=${u.username} grudge=${u.grudge_id}: total=${chars[0]?.n} warlords=${chars[0]?.warlords}`,
    );
  }

  // Split detection
  const grudgeIds = new Set(all.map((u) => u.grudge_id).filter(Boolean));
  const emails = new Set(all.map((u) => (u.email || "").toLowerCase()).filter(Boolean));
  console.log("\n=== SPLIT CHECK ===");
  console.log({
    unique_grudge_ids: [...grudgeIds],
    unique_emails: [...emails],
    user_rows: all.length,
    split_brain: grudgeIds.size > 1,
    target_canonical: TARGET_GID,
    target_in_set: grudgeIds.has(TARGET_GID),
  });

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

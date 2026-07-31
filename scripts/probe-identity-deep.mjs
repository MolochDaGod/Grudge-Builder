/**
 * Deep identity probe for grudachain / Discord / Puter link fields.
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnv();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function q(sql, params = []) {
  return (await client.query(sql, params)).rows;
}

await client.connect();

const TARGETS = [
  "GRUDGE_MS5O7IJUA54E6",
  "GRUDGE_MPOUIQCG529CA",
  "GID-48fb4fcf",
  "MS5O7IJUA54E6",
];

console.log("=== search grudge_id / strings ===");
for (const t of TARGETS) {
  const u = await q(
    `SELECT id, username, grudge_id, email, puter_user_id, puter_username, puter_email,
            discord_id, discord_username, discord_email, display_name, auth_method, is_admin
     FROM users
     WHERE grudge_id ILIKE $1 OR username ILIKE $1 OR puter_user_id ILIKE $1
        OR discord_id ILIKE $1 OR cast(id as text) ILIKE $1
     LIMIT 10`,
    [`%${t}%`],
  );
  console.log(t, "users", u.length, JSON.stringify(u, null, 2));
  const a = await q(
    `SELECT id, user_id, grudge_id, display_name, puter_uuid, puter_username, email, auth_type
     FROM accounts
     WHERE grudge_id ILIKE $1 OR puter_uuid ILIKE $1 OR display_name ILIKE $1 OR email ILIKE $1
     LIMIT 10`,
    [`%${t}%`],
  );
  console.log(t, "accounts", a.length, JSON.stringify(a, null, 2));
}

console.log("\n=== email grudgedev@gmail.com full user rows ===");
const emailUsers = await q(
  `SELECT id, username, grudge_id, email, puter_user_id, puter_username, puter_email, puter_linked_at,
          discord_id, discord_username, discord_email, discord_verified, display_name, auth_method, is_admin, last_login_at
   FROM users WHERE lower(coalesce(email,'')) = 'grudgedev@gmail.com'
      OR lower(coalesce(puter_email,'')) = 'grudgedev@gmail.com'
      OR lower(coalesce(discord_email,'')) = 'grudgedev@gmail.com'
      OR lower(username) IN ('grudachain','molochdadev')
   ORDER BY last_login_at DESC NULLS LAST`,
);
console.log(JSON.stringify(emailUsers, null, 2));

console.log("\n=== accounts for those user ids + grudge/display ===");
const ids = emailUsers.map((u) => u.id);
const accounts = await q(
  `SELECT id, user_id, grudge_id, display_name, puter_uuid, puter_username, email, auth_type, is_guest
   FROM accounts
   WHERE user_id = ANY($1::text[])
      OR lower(coalesce(email,'')) = 'grudgedev@gmail.com'
      OR lower(coalesce(display_name,'')) IN ('grudachain','molochdadev')
      OR lower(coalesce(puter_username,'')) IN ('grudachain','molochdadev')
   ORDER BY updated_at DESC NULLS LAST
   LIMIT 40`,
  [ids],
);
console.log(JSON.stringify(accounts, null, 2));

// Character ownership by account grudge_id variants
console.log("\n=== characters by account.grudge_id / user ===");
for (const a of accounts) {
  const n = await q(
    `SELECT count(*)::int AS n FROM characters WHERE account_id = $1 OR user_id = $2`,
    [a.id, a.user_id],
  );
  console.log({
    account: a.id,
    grudge_id: a.grudge_id,
    display: a.display_name,
    puter_uuid: a.puter_uuid,
    user_id: a.user_id,
    chars: n[0]?.n,
  });
}

// Any user with puter_username grudachain
console.log("\n=== puter_username / discord_username grudachain ===");
const pu = await q(
  `SELECT id, username, grudge_id, email, puter_user_id, puter_username, discord_id, discord_username
   FROM users
   WHERE lower(coalesce(puter_username,'')) = 'grudachain'
      OR lower(coalesce(discord_username,'')) ILIKE '%grudge%'
      OR lower(coalesce(display_name,'')) = 'grudachain'
   LIMIT 20`,
);
console.log(JSON.stringify(pu, null, 2));

await client.end();

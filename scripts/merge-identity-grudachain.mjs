/**
 * Merge split-brain identity for grudachain / grudgedev@gmail.com / Discord.
 *
 * Canonical (SSOT): users.username GRUDACHAIN → grudge_id GRUDGE_MPOUIQCG529CA
 *   - 27 warlords characters
 * Orphan Discord row: grudgelegion_11303 / GID-48fb4fcf / discord_id 1292303312334618695
 *   - same email, 0 characters
 *
 * Also links known Puter uuid (ae19bdda-…) onto the canonical user and aligns
 * accounts.grudge_id to GRUDGE_MPOUIQCG529CA.
 *
 * Usage:
 *   node scripts/merge-identity-grudachain.mjs           # dry-run
 *   node scripts/merge-identity-grudachain.mjs --confirm # apply
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const CONFIRM = process.argv.includes("--confirm");

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
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
}
loadEnv();

const CANONICAL_USER_ID = "2f415dc8-4d16-44e3-bd9f-f88be48e76a3";
const CANONICAL_GRUDGE_ID = "GRUDGE_MPOUIQCG529CA";
const ORPHAN_USER_ID = "c480fd1b-027e-4cf2-abc8-07b4d81fdf3f";
const DISCORD_ID = "1292303312334618695";
const DISCORD_USERNAME = "grudgelegion_11303";
const PUTER_UUID = "ae19bdda-af53-4421-838f-ca5958be63b0";
const PUTER_USERNAME = "GRUDACHAIN";
const EMAIL = "grudgedev@gmail.com";
/** Claimed client-side id (not in DB) — stored as metadata alias only */
const CLIENT_ALIAS = "GRUDGE_MS5O7IJUA54E6";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function q(sql, params = []) {
  return (await client.query(sql, params)).rows;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }
  await client.connect();
  console.log(CONFIRM ? "=== APPLY MERGE ===" : "=== DRY RUN (pass --confirm to apply) ===");

  const before = await q(
    `SELECT id, username, grudge_id, email, discord_id, discord_username,
            puter_user_id, puter_username, is_admin, auth_method
     FROM users WHERE id = ANY($1::text[])`,
    [[CANONICAL_USER_ID, ORPHAN_USER_ID]],
  );
  console.log("BEFORE users:", JSON.stringify(before, null, 2));

  const charCounts = await q(
    `SELECT user_id, count(*)::int AS n FROM characters
     WHERE user_id = ANY($1::text[]) GROUP BY user_id`,
    [[CANONICAL_USER_ID, ORPHAN_USER_ID]],
  );
  console.log("character counts:", charCounts);

  if (!CONFIRM) {
    console.log("\nPlanned actions:");
    console.log(`1. Stamp discord_id=${DISCORD_ID} on canonical ${CANONICAL_GRUDGE_ID}`);
    console.log(`2. Stamp puter_user_id=${PUTER_UUID} on canonical`);
    console.log(`3. is_admin=true on canonical (grudachain)`);
    console.log(`4. Align accounts.grudge_id → ${CANONICAL_GRUDGE_ID} for user_id=${CANONICAL_USER_ID}`);
    console.log(`5. Soft-disable orphan ${ORPHAN_USER_ID} (clear email+discord, suffix username, null grudge uniqueness conflict)`);
    console.log(`6. Store client alias ${CLIENT_ALIAS} in accounts.metadata`);
    await client.end();
    return;
  }

  await client.query("BEGIN");
  try {
    // 1–3: link providers onto canonical
    await client.query(
      `UPDATE users SET
         discord_id = $2::text,
         discord_username = $3::text,
         discord_email = $4::text,
         puter_user_id = $5::text,
         puter_username = $6::text,
         puter_email = $4::text,
         puter_linked_at = COALESCE(puter_linked_at, NOW()),
         email = COALESCE(email, $4::text),
         is_admin = true,
         auth_method = 'multi',
         last_login_at = NOW()
       WHERE id = $1::text`,
      [
        CANONICAL_USER_ID,
        DISCORD_ID,
        DISCORD_USERNAME,
        EMAIL,
        PUTER_UUID,
        PUTER_USERNAME,
      ],
    );

    // 4: align account grudge_id + metadata
    await client.query(
      `UPDATE accounts SET
         grudge_id = $2::text,
         puter_uuid = COALESCE(puter_uuid, $3::text),
         puter_username = COALESCE(puter_username, $4::text),
         email = COALESCE(email, $5::text),
         display_name = COALESCE(NULLIF(display_name,''), 'GRUDACHAIN'),
         auth_type = 'multi',
         metadata = COALESCE(metadata, '{}'::jsonb) || $6::jsonb,
         updated_at = (extract(epoch from now()) * 1000)::bigint
       WHERE user_id = $1::text`,
      [
        CANONICAL_USER_ID,
        CANONICAL_GRUDGE_ID,
        PUTER_UUID,
        PUTER_USERNAME,
        EMAIL,
        JSON.stringify({
          client_grudge_aliases: [CLIENT_ALIAS],
          identity_merged_at: new Date().toISOString(),
          identity_merge_note:
            "Discord GID-48fb4fcf + Puter ae19bdda linked onto GRUDGE_MPOUIQCG529CA (GRUDACHAIN)",
        }),
      ],
    );

    // 5: neutralize orphan — free email/discord uniqueness, no login
    const orphanSuffix = `_merged_${Date.now().toString(36)}`;
    await client.query(
      `UPDATE users SET
         username = username || $2::text,
         email = NULL,
         discord_id = NULL,
         discord_username = NULL,
         discord_email = NULL,
         grudge_id = ('MERGED_' || substring(coalesce(grudge_id,'X') from 1 for 12))::text,
         auth_method = 'merged_orphan'
       WHERE id = $1::text`,
      [ORPHAN_USER_ID, orphanSuffix],
    );

    // Re-point any orphan-linked characters (should be 0)
    const moved = await client.query(
      `UPDATE characters SET user_id = $1
       WHERE user_id = $2
       RETURNING id`,
      [CANONICAL_USER_ID, ORPHAN_USER_ID],
    );
    console.log("characters reassigned from orphan:", moved.rowCount);

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }

  const after = await q(
    `SELECT id, username, grudge_id, email, discord_id, discord_username,
            puter_user_id, puter_username, is_admin, auth_method
     FROM users WHERE id = $1 OR username ILIKE 'grudgelegion%'
     ORDER BY username`,
    [CANONICAL_USER_ID],
  );
  console.log("\nAFTER users:", JSON.stringify(after, null, 2));

  const emailHits = await q(
    `SELECT id, username, grudge_id, discord_id, puter_user_id
     FROM users WHERE lower(coalesce(email,'')) = $1`,
    [EMAIL],
  );
  console.log("\nemail lookup hits (must be 1):", emailHits.length, JSON.stringify(emailHits, null, 2));

  const discordHits = await q(
    `SELECT id, username, grudge_id FROM users WHERE discord_id = $1`,
    [DISCORD_ID],
  );
  console.log("discord_id hits (must be 1):", discordHits.length, JSON.stringify(discordHits, null, 2));

  const puterHits = await q(
    `SELECT id, username, grudge_id FROM users WHERE puter_user_id = $1`,
    [PUTER_UUID],
  );
  console.log("puter_user_id hits (must be 1):", puterHits.length, JSON.stringify(puterHits, null, 2));

  const chars = await q(
    `SELECT count(*)::int AS n FROM characters WHERE user_id = $1`,
    [CANONICAL_USER_ID],
  );
  console.log("canonical character count:", chars[0]?.n);

  const acc = await q(
    `SELECT id, grudge_id, puter_uuid, display_name, email, metadata
     FROM accounts WHERE user_id = $1`,
    [CANONICAL_USER_ID],
  );
  console.log("canonical account:", JSON.stringify(acc, null, 2));

  const ok =
    emailHits.length === 1 &&
    emailHits[0].grudge_id === CANONICAL_GRUDGE_ID &&
    discordHits.length === 1 &&
    discordHits[0].id === CANONICAL_USER_ID &&
    puterHits.length === 1 &&
    puterHits[0].id === CANONICAL_USER_ID &&
    chars[0]?.n === 27;

  console.log("\n=== PROOF ===", ok ? "PASS single-account SSOT" : "FAIL — inspect above");
  if (!ok) process.exitCode = 2;

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

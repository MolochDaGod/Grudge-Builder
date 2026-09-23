/**
 * Single-account identity resolution — providers LINK onto one users.grudge_id.
 *
 * Production `users` has extra columns (discord_id, puter_user_id, …) beyond
 * shared/schema.ts. Use pool.query for those so we never invent a second account
 * when email or provider id already maps to a human.
 *
 * Law: docs/CANONICAL_IDENTITY.md
 */
import { pool, db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

export type IdentityUser = {
  id: string;
  username: string;
  password: string;
  grudgeId: string | null;
  email: string | null;
  discord_id?: string | null;
  discord_username?: string | null;
  discord_email?: string | null;
  puter_user_id?: string | null;
  puter_username?: string | null;
  puter_email?: string | null;
  spawn_user_id?: string | null;
  spawn_username?: string | null;
  auth_method?: string | null;
  display_name?: string | null;
  is_admin?: boolean | null;
};

function generateGrudgeId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `GRUDGE_${ts}${rand}`.slice(0, 20);
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      resolve(`${salt}:${derived.toString("hex")}`);
    });
  });
}

function mapRow(r: Record<string, unknown>): IdentityUser {
  return {
    id: String(r.id),
    username: String(r.username),
    password: String(r.password ?? ""),
    grudgeId: (r.grudge_id as string | null) ?? (r.grudgeId as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    discord_id: (r.discord_id as string | null) ?? null,
    discord_username: (r.discord_username as string | null) ?? null,
    discord_email: (r.discord_email as string | null) ?? null,
    puter_user_id: (r.puter_user_id as string | null) ?? null,
    puter_username: (r.puter_username as string | null) ?? null,
    puter_email: (r.puter_email as string | null) ?? null,
    spawn_user_id: (r.spawn_user_id as string | null) ?? null,
    spawn_username: (r.spawn_username as string | null) ?? null,
    auth_method: (r.auth_method as string | null) ?? null,
    display_name: (r.display_name as string | null) ?? null,
    is_admin: Boolean(r.is_admin),
  };
}

async function q<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (!pool) throw new Error("DATABASE_URL required for identity link");
  const res = await pool.query(text, params);
  return res.rows as T[];
}

/** Full user row including production link columns. */
export async function fetchIdentityUserById(id: string): Promise<IdentityUser | null> {
  const rows = await q(
    `SELECT id, username, password, grudge_id, email,
            discord_id, discord_username, discord_email,
            puter_user_id, puter_username, puter_email,
            auth_method, display_name, is_admin
     FROM users WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function findUserByEmail(email: string): Promise<IdentityUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const rows = await q(
    `SELECT id, username, password, grudge_id, email,
            discord_id, discord_username, discord_email,
            puter_user_id, puter_username, puter_email,
            auth_method, display_name, is_admin
     FROM users
     WHERE lower(coalesce(email,'')) = $1
        OR lower(coalesce(discord_email,'')) = $1
        OR lower(coalesce(puter_email,'')) = $1
     ORDER BY
       CASE WHEN grudge_id LIKE 'GRUDGE_%' THEN 0 ELSE 1 END,
       CASE WHEN lower(username) IN ('grudachain','molochdadev') THEN 0 ELSE 1 END,
       id
     LIMIT 1`,
    [normalized],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function findUserByDiscordId(discordId: string): Promise<IdentityUser | null> {
  const key = `discord:${discordId}`;
  const rows = await q(
    `SELECT id, username, password, grudge_id, email,
            discord_id, discord_username, discord_email,
            puter_user_id, puter_username, puter_email,
            auth_method, display_name, is_admin
     FROM users
     WHERE discord_id = $1 OR username = $2
     LIMIT 1`,
    [discordId, key],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function findUserByPuterId(puterId: string): Promise<IdentityUser | null> {
  const key = `puter:${puterId}`;
  const rows = await q(
    `SELECT id, username, password, grudge_id, email,
            discord_id, discord_username, discord_email,
            puter_user_id, puter_username, puter_email,
            auth_method, display_name, is_admin
     FROM users
     WHERE puter_user_id = $1 OR username = $2
     LIMIT 1`,
    [puterId, key],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function stampDiscordLink(
  userId: string,
  discord: { id: string; username?: string | null; email?: string | null },
): Promise<void> {
  const email = discord.email?.trim().toLowerCase() || null;
  await q(
    `UPDATE users SET
       discord_id = $2,
       discord_username = $3,
       discord_email = COALESCE($4, discord_email),
       email = COALESCE(email, $4),
       auth_method = COALESCE(auth_method, 'discord'),
       last_login_at = NOW()
     WHERE id = $1`,
    [userId, discord.id, discord.username ?? null, email],
  );
}

export async function stampPuterLink(
  userId: string,
  puter: { id: string; username?: string | null; email?: string | null },
): Promise<void> {
  const email = puter.email?.trim().toLowerCase() || null;
  await q(
    `UPDATE users SET
       puter_user_id = $2,
       puter_username = $3,
       puter_email = COALESCE($4, puter_email),
       puter_linked_at = COALESCE(puter_linked_at, NOW()),
       email = COALESCE(email, $4),
       auth_method = COALESCE(auth_method, 'puter'),
       last_login_at = NOW()
     WHERE id = $1`,
    [userId, puter.id, puter.username ?? null, email],
  );
}

/**
 * Resolve Discord OAuth to a single Grudge user:
 * 1) existing discord_id / username discord:*
 * 2) email match (canonical single-account)
 * 3) create new only if no match
 */
export async function resolveDiscordGrudgeAccount(discord: {
  id: string;
  username?: string | null;
  global_name?: string | null;
  email?: string | null;
}): Promise<{ user: IdentityUser; isNew: boolean; mergedByEmail: boolean }> {
  let mergedByEmail = false;
  let isNew = false;

  let user = await findUserByDiscordId(discord.id);

  if (!user && discord.email) {
    user = await findUserByEmail(discord.email);
    if (user) mergedByEmail = true;
  }

  if (!user) {
    isNew = true;
    const grudgeId = generateGrudgeId();
    const dummyPw = await hashPassword(crypto.randomBytes(32).toString("hex"));
    const discordKey = `discord:${discord.id}`;
    const email = discord.email?.trim().toLowerCase() || null;
    const [created] = await db
      .insert(users)
      .values({
        username: discordKey,
        password: dummyPw,
        grudgeId,
        email,
      })
      .onConflictDoNothing()
      .returning();
    user = created
      ? {
          id: created.id,
          username: created.username,
          password: created.password,
          grudgeId: created.grudgeId,
          email: created.email,
        }
      : (await findUserByDiscordId(discord.id));
    if (!user) throw new Error("Failed to create Discord-linked Grudge account");
  }

  await stampDiscordLink(user.id, {
    id: discord.id,
    username: discord.global_name || discord.username || null,
    email: discord.email,
  });

  const refreshed = await fetchIdentityUserById(user.id);
  if (!refreshed) throw new Error("Discord user vanished after stamp");
  return { user: refreshed, isNew, mergedByEmail };
}

/**
 * Resolve Puter identity to a single Grudge user (same rules as Discord).
 */
export async function resolvePuterIdentity(opts: {
  puterId: string;
  puterUsername?: string | null;
  email?: string | null;
}): Promise<{ user: IdentityUser; isNew: boolean; mergedByEmail: boolean }> {
  let mergedByEmail = false;
  let isNew = false;

  let user = await findUserByPuterId(opts.puterId);

  if (!user && opts.email) {
    user = await findUserByEmail(opts.email);
    if (user) mergedByEmail = true;
  }

  if (!user) {
    isNew = true;
    const grudgeId = generateGrudgeId();
    const dummyPw = await hashPassword(crypto.randomBytes(32).toString("hex"));
    const puterKey = `puter:${opts.puterId}`;
    const email = opts.email?.trim().toLowerCase() || null;
    const [created] = await db
      .insert(users)
      .values({
        username: puterKey,
        password: dummyPw,
        grudgeId,
        email,
      })
      .onConflictDoNothing()
      .returning();
    user = created
      ? {
          id: created.id,
          username: created.username,
          password: created.password,
          grudgeId: created.grudgeId,
          email: created.email,
        }
      : (await findUserByPuterId(opts.puterId));
    if (!user) throw new Error("Failed to create Puter-linked Grudge account");
  }

  await stampPuterLink(user.id, {
    id: opts.puterId,
    username: opts.puterUsername ?? null,
    email: opts.email,
  });

  const refreshed = await fetchIdentityUserById(user.id);
  if (!refreshed) throw new Error("Puter user vanished after stamp");
  return { user: refreshed, isNew, mergedByEmail };
}

let spawnColumnsReady: Promise<void> | null = null;

/** Idempotent. Same columns as migrations/045_users_spawn_identity.sql. */
export function ensureSpawnIdentityColumns(): Promise<void> {
  if (!spawnColumnsReady) {
    spawnColumnsReady = (async () => {
      await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS spawn_user_id TEXT`);
      await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS spawn_username TEXT`);
      await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS spawn_linked_at TIMESTAMPTZ`);
      await q(
        `CREATE UNIQUE INDEX IF NOT EXISTS users_spawn_user_id_uidx
         ON users (spawn_user_id) WHERE spawn_user_id IS NOT NULL`,
      );
    })().catch((err) => {
      spawnColumnsReady = null;
      throw err;
    });
  }
  return spawnColumnsReady;
}

const SPAWN_USER_SELECT = `id, username, password, grudge_id, email,
            discord_id, discord_username, discord_email,
            puter_user_id, puter_username, puter_email,
            spawn_user_id, spawn_username,
            auth_method, display_name, is_admin`;

export async function findUserBySpawnId(spawnUserId: string): Promise<IdentityUser | null> {
  const key = `spawn:${spawnUserId}`;
  const rows = await q(
    `SELECT ${SPAWN_USER_SELECT}
     FROM users
     WHERE spawn_user_id = $1 OR username = $2
     LIMIT 1`,
    [spawnUserId, key],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function readSpawnLink(
  userId: string,
): Promise<{ spawnUserId: string | null; spawnUsername: string | null } | null> {
  try {
    const rows = await q(
      `SELECT spawn_user_id, spawn_username FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    if (!rows[0]) return null;
    return {
      spawnUserId: (rows[0].spawn_user_id as string | null) ?? null,
      spawnUsername: (rows[0].spawn_username as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export class SpawnLinkConflict extends Error {
  constructor() {
    super("spawn_already_linked");
  }
}

export async function stampSpawnLink(
  userId: string,
  spawn: { userId: string; username: string; name?: string | null },
): Promise<void> {
  await q(
    `UPDATE users SET
       spawn_user_id = $2,
       spawn_username = $3,
       display_name = COALESCE(display_name, $4),
       auth_method = COALESCE(auth_method, 'spawn'),
       spawn_linked_at = COALESCE(spawn_linked_at, NOW()),
       last_login_at = NOW()
     WHERE id = $1`,
    [userId, spawn.userId, spawn.username, spawn.name ?? spawn.username],
  );
}

/**
 * Spawn account → one Grudge user.
 * 1) existing spawn_user_id / username spawn:<uuid>
 * 2) else create. Spawn has no email, so it never merges by email.
 */
export async function resolveSpawnGrudgeAccount(spawn: {
  userId: string;
  username: string;
  name?: string | null;
}): Promise<{ user: IdentityUser; isNew: boolean }> {
  await ensureSpawnIdentityColumns();
  let isNew = false;
  let user = await findUserBySpawnId(spawn.userId);

  if (!user) {
    isNew = true;
    const grudgeId = generateGrudgeId();
    const dummyPw = await hashPassword(crypto.randomBytes(32).toString("hex"));
    const spawnKey = `spawn:${spawn.userId}`;
    const [created] = await db
      .insert(users)
      .values({
        username: spawnKey,
        password: dummyPw,
        grudgeId,
      })
      .onConflictDoNothing()
      .returning();
    user = created
      ? {
          id: created.id,
          username: created.username,
          password: created.password,
          grudgeId: created.grudgeId,
          email: created.email,
        }
      : await findUserBySpawnId(spawn.userId);
    if (!user) throw new Error("Failed to create Spawn-linked Grudge account");
  }

  await stampSpawnLink(user.id, spawn);
  const refreshed = await findUserBySpawnId(spawn.userId);
  if (!refreshed) throw new Error("Spawn user vanished after stamp");
  return { user: refreshed, isNew };
}

/**
 * Attach a verified Spawn player to an existing Grudge login.
 * Refuses when that Spawn id already belongs to a different user.
 */
export async function linkSpawnToGrudgeUser(
  grudgeUserId: string,
  spawn: { userId: string; username: string; name?: string | null },
): Promise<IdentityUser> {
  await ensureSpawnIdentityColumns();
  const existing = await findUserBySpawnId(spawn.userId);
  if (existing && existing.id !== grudgeUserId) throw new SpawnLinkConflict();
  await stampSpawnLink(grudgeUserId, spawn);
  const refreshed = await findUserBySpawnId(spawn.userId);
  if (!refreshed) throw new Error("Spawn link did not stick");
  return refreshed;
}

/** Providers visible on an identity row (for /me). */
export function listLinkedProviders(user: IdentityUser): string[] {
  const p = new Set<string>();
  if (user.discord_id || user.username?.startsWith("discord:")) p.add("discord");
  if (user.puter_user_id || user.username?.startsWith("puter:")) p.add("puter");
  if (user.spawn_user_id || user.username?.startsWith("spawn:")) p.add("spawn");
  if (user.username?.startsWith("wallet:")) p.add("phantom");
  if (user.username?.startsWith("phone:")) p.add("phone");
  if (user.email) p.add("email");
  if (p.size === 0) p.add("grudge");
  return [...p];
}

/** Map IdentityUser into drizzle users shape for existing auth response builders. */
export function asSchemaUser(user: IdentityUser): typeof users.$inferSelect {
  return {
    id: user.id,
    username: user.username,
    password: user.password,
    grudgeId: user.grudgeId,
    email: user.email,
  };
}

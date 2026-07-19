/**
 * Canonical Grudge Studio TOP ADMIN / operator allowlist.
 * Used by auth /me role resolution, admin API gates, and dash UX.
 * UX + API must agree — never invent a second admin system.
 */

export const CANONICAL_ADMIN_USERNAMES = [
  "grudachain",
  "molochdadev",
] as const;

export const CANONICAL_ADMIN_EMAILS = [
  "grudgedev@gmail.com",
  "jonbemmons@gmail.com",
] as const;

/** Highest operator — full master role on dash + admin APIs */
export const CANONICAL_MASTER_USERNAMES = ["grudachain"] as const;
export const CANONICAL_MASTER_EMAILS = ["grudgedev@gmail.com"] as const;

export type StudioRole = "player" | "member" | "admin" | "master";

export function normalizeAdminToken(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function envList(name: string): Set<string> {
  const raw = process.env[name];
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => normalizeAdminToken(s))
      .filter(Boolean),
  );
}

function usernameAllowlist(): Set<string> {
  const base = new Set(CANONICAL_ADMIN_USERNAMES.map(normalizeAdminToken));
  for (const u of envList("GRUDGE_ADMIN_USERNAMES")) base.add(u);
  return base;
}

function emailAllowlist(): Set<string> {
  const base = new Set(CANONICAL_ADMIN_EMAILS.map(normalizeAdminToken));
  for (const e of envList("GRUDGE_ADMIN_EMAILS")) base.add(e);
  return base;
}

function grudgeIdAllowlist(): Set<string> {
  return envList("GRUDGE_ADMIN_GRUDGE_IDS");
}

function masterUsernameSet(): Set<string> {
  const base = new Set(CANONICAL_MASTER_USERNAMES.map(normalizeAdminToken));
  for (const u of envList("GRUDGE_MASTER_USERNAMES")) base.add(u);
  return base;
}

function masterEmailSet(): Set<string> {
  const base = new Set(CANONICAL_MASTER_EMAILS.map(normalizeAdminToken));
  for (const e of envList("GRUDGE_MASTER_EMAILS")) base.add(e);
  return base;
}

export interface RoleResolutionInput {
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
  puterUsername?: string | null;
  grudgeId?: string | null;
  /** JWT claim already set */
  jwtRole?: string | null;
  jwtIsAdmin?: boolean | null;
}

/**
 * Resolve fleet studio role for a signed-in identity.
 * Prefer master for TOP ADMIN, then admin allowlist, then player.
 */
export function resolveStudioRole(input: RoleResolutionInput): StudioRole {
  const email = normalizeAdminToken(input.email);
  const names = [
    input.username,
    input.displayName,
    input.puterUsername,
  ]
    .map(normalizeAdminToken)
    .filter(Boolean);
  // Strip puter:uuid storage keys from username matching
  const humanNames = names.filter((n) => !n.startsWith("puter:") && !n.startsWith("wallet:"));

  const grudgeId = normalizeAdminToken(input.grudgeId);
  if (grudgeId && grudgeIdAllowlist().has(grudgeId)) {
    return masterEmailSet().has(email) || humanNames.some((n) => masterUsernameSet().has(n))
      ? "master"
      : "admin";
  }

  if (email && masterEmailSet().has(email)) return "master";
  if (humanNames.some((n) => masterUsernameSet().has(n))) return "master";

  if (email && emailAllowlist().has(email)) return "admin";
  if (humanNames.some((n) => usernameAllowlist().has(n))) return "admin";

  const jwtRole = normalizeAdminToken(input.jwtRole);
  if (jwtRole === "master" || jwtRole === "owner" || jwtRole === "master_admin") return "master";
  if (jwtRole === "admin" || input.jwtIsAdmin === true) return "admin";

  return "player";
}

export function isStudioAdminRole(role: string | null | undefined): boolean {
  const r = normalizeAdminToken(role);
  return r === "admin" || r === "master" || r === "owner" || r === "master_admin" || r === "master-admin";
}

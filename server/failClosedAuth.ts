/**
 * Fail-closed gates for auth-sensitive and mint-sensitive routes.
 *
 * If JWT secrets, mint API keys, or a valid (non-guest) session are missing
 * or invalid, reject with 401 / 403 / 503 and do nothing.
 * No default-allow, no mock success, no fallback mint.
 *
 * Secret readers are live (per-call), never a module-load snapshot.
 * Crossmint keys are checked at request time (503) and never process.exit.
 *
 * `readEnvSecret` / `getJwtSecret` match the shape of Hitch's helpers on
 * `fix/prod-secret-guards` (`server/lib/requiredSecrets.ts`, PR #135). That
 * module is not imported here: it loads dotenv and can `process.exit` at boot,
 * and #135's tip is not final — this branch must not rebase onto it yet.
 * Difference: `jwtSecretsConfigured` / `getJwtSecret` here do **not** accept
 * `GRUDGE_JWT_SECRET` by itself (SESSION_SECRET or JWT_SECRET is required).
 */
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_VERIFY_ALGORITHMS: jwt.Algorithm[] = ["HS256"];

/** Trimmed env value; missing or whitespace-only becomes "". Never logs the value. */
export function readEnvSecret(name: string): string {
  const raw = process.env[name];
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Signing / primary secret: first non-empty trimmed candidate among
 * SESSION_SECRET, JWT_SECRET, and GRUDGE_JWT_SECRET — same candidate order as
 * Hitch's `getJwtSecret`. Throws if SESSION_SECRET and JWT_SECRET are both
 * unset (GRUDGE_JWT_SECRET alone is not accepted). No default secret.
 */
export function getJwtSecret(): string {
  const session = readEnvSecret("SESSION_SECRET");
  const jwtSecret = readEnvSecret("JWT_SECRET");
  if (!session && !jwtSecret) {
    throw new Error(
      "SESSION_SECRET or JWT_SECRET is missing or whitespace-only. Refusing to use a default secret.",
    );
  }
  return session || jwtSecret || readEnvSecret("GRUDGE_JWT_SECRET");
}

/**
 * Live verify-candidate list (SESSION, JWT, GRUDGE), trimmed, no empties.
 * Callers must still require SESSION_SECRET or JWT_SECRET via jwtSecretsConfigured().
 */
export function jwtVerifyCandidates(): string[] {
  return [
    readEnvSecret("SESSION_SECRET"),
    readEnvSecret("JWT_SECRET"),
    readEnvSecret("GRUDGE_JWT_SECRET"),
  ].filter((s) => s.length > 0);
}

/** True only when SESSION_SECRET or JWT_SECRET is set. GRUDGE_JWT_SECRET alone is not enough. */
export function jwtSecretsConfigured(): boolean {
  return !!(readEnvSecret("SESSION_SECRET") || readEnvSecret("JWT_SECRET"));
}

/** Crossmint server key required to mint. Names only — never log values. Request-time only (no boot exit). */
export function mintSecretsConfigured(): boolean {
  const key = (
    readEnvSecret("CROSSMINT_SERVER_API_KEY") ||
    readEnvSecret("CROSSMINT_SECRET_KEY") ||
    readEnvSecret("CROSSMINT_API_KEY")
  );
  return key.length > 0;
}

interface AuthPayload {
  userId?: string;
  grudgeId?: string;
  username?: string;
  sub?: string | number;
  id?: string | number;
}

export function isGuestProductIdentity(id?: string | null, name?: string | null): boolean {
  const a = String(id || "").trim().toLowerCase();
  const n = String(name || "").trim().toLowerCase();
  return (
    a === "guest" ||
    a.startsWith("guest_") ||
    n === "guest" ||
    n.startsWith("guest_")
  );
}

function readBearerToken(req: Request): string | null {
  const authHeader = req.get("Authorization") || req.get("X-Session-Token");
  if (!authHeader) return null;
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
}

function verifyAuthToken(token: string): AuthPayload | null {
  if (!token) return null;
  if (!jwtSecretsConfigured()) return null;
  for (const secret of jwtVerifyCandidates()) {
    try {
      return jwt.verify(token, secret, { algorithms: JWT_VERIFY_ALGORITHMS }) as AuthPayload;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

function userIdFromPayload(payload: AuthPayload): string | null {
  if (payload.userId) return String(payload.userId);
  if (payload.sub != null && payload.sub !== "") return String(payload.sub);
  if (payload.id != null && payload.id !== "") return String(payload.id);
  if (payload.grudgeId) return String(payload.grudgeId);
  return null;
}

/**
 * Identity for a fail-closed handler: `req.userId` set by requireAuthFailClosed.
 * Ignores `req.body.accountId` and `req.accountId`. No guest fallback.
 */
export function authenticatedUserId(req: Request): string | null {
  const id = (req as { userId?: unknown }).userId;
  if (typeof id !== "string" || !id.trim()) return null;
  if (isGuestProductIdentity(id)) return null;
  return id.trim();
}

/** True when the record's accountId is the caller's account. */
export function ownedByAccount(
  recordAccountId: string | null | undefined,
  callerAccountId: string | null | undefined,
): boolean {
  return !!recordAccountId && !!callerAccountId && recordAccountId === callerAccountId;
}

/**
 * A mint call succeeded only when the service reports success and an action id.
 * Empty results (missing key, swallowed errors) are failures — not a mock success.
 */
export function mintDidSucceed<T extends { success?: boolean; actionId?: string; error?: string }>(
  result: T | null | undefined,
): result is T & { actionId: string } {
  return !!result && result.success !== false && !!result.actionId;
}

/**
 * Fail closed on auth:
 *   503 if SESSION_SECRET and JWT_SECRET are both unset (do not skip auth;
 *       GRUDGE_JWT_SECRET alone is not enough)
 *   401 if the token is missing, invalid, wrong algorithm, or a guest identity
 *
 * Sets `req.userId` and `req.grudgeId` on success.
 */
export function requireAuthFailClosed(req: Request, res: Response, next: NextFunction): void {
  if (!jwtSecretsConfigured()) {
    res.status(503).json({ error: "auth_misconfigured" });
    return;
  }
  const token = readBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const payload = verifyAuthToken(token);
  if (!payload) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const userId = userIdFromPayload(payload);
  if (!userId || isGuestProductIdentity(userId, payload.username)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  (req as { userId?: string }).userId = userId;
  (req as { grudgeId?: string | null }).grudgeId = payload.grudgeId
    ? String(payload.grudgeId)
    : null;
  next();
}

/** 503 if mint secrets are missing. Do not mint and do not return success. Never exits the process. */
export function requireMintConfigured(_req: Request, res: Response, next: NextFunction): void {
  if (!mintSecretsConfigured()) {
    res.status(503).json({ error: "mint_misconfigured" });
    return;
  }
  next();
}

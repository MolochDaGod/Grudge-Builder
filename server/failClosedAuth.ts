/**
 * Fail-closed gates for auth-sensitive and mint-sensitive routes.
 *
 * If JWT secrets, mint API keys, or a valid (non-guest) session are missing
 * or invalid, reject with 401 / 403 / 503 and do nothing.
 * No default-allow, no mock success, no fallback mint.
 */
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/** Prefer SESSION_SECRET then JWT_SECRET / GRUDGE_JWT_SECRET — same order as routes.ts. */
export function jwtSecretCandidates(): string[] {
  return [process.env.SESSION_SECRET, process.env.JWT_SECRET, process.env.GRUDGE_JWT_SECRET]
    .map((s) => s?.trim())
    .filter((s): s is string => !!s && s.length > 0);
}

export function jwtSecretsConfigured(): boolean {
  return jwtSecretCandidates().length > 0;
}

/** Crossmint server key required to mint. Names only — never log values. */
export function mintSecretsConfigured(): boolean {
  const key = (
    process.env.CROSSMINT_SERVER_API_KEY ||
    process.env.CROSSMINT_SECRET_KEY ||
    process.env.CROSSMINT_API_KEY ||
    ""
  ).trim();
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
  for (const secret of jwtSecretCandidates()) {
    try {
      return jwt.verify(token, secret) as AuthPayload;
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
 * A mint call succeeded only when the service reports success and an action id.
 * Empty results (missing key, swallowed errors) are failures — not a mock success.
 */
export function mintDidSucceed(
  result: { success?: boolean; actionId?: string; error?: string } | null | undefined,
): boolean {
  return !!result && result.success !== false && !!result.actionId;
}

/**
 * Fail closed on auth:
 *   503 if JWT secrets are unset (misconfigured — do not skip auth)
 *   401 if the token is missing, invalid, or a guest identity
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

/** 503 if mint secrets are missing. Do not mint and do not return success. */
export function requireMintConfigured(_req: Request, res: Response, next: NextFunction): void {
  if (!mintSecretsConfigured()) {
    res.status(503).json({ error: "mint_misconfigured" });
    return;
  }
  next();
}

/**
 * Grudge AI Gateway — Auth Middleware
 *
 * Validates Grudge ID JWT tokens (same JWT_SECRET as VPS).
 * Extracts user info for rate limiting and access control.
 */

import type { Context, Next } from 'hono';
import type { Env, GrudgeUser } from './types';

// ── JWT Helpers (Workers-compatible, no node crypto) ─────────────────────────

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifyHS256(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const signatureInput = encoder.encode(`${parts[0]}.${parts[1]}`);
  const signature = base64UrlDecode(parts[2]);

  const valid = await crypto.subtle.verify('HMAC', key, signature, signatureInput);
  if (!valid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));

    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// ── Rate Limiter (in-memory, per-worker instance) ────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMITS: Record<string, number> = {
  master_admin: 1000,
  admin: 500,
  member: 200,
  pleb: 60,
  default: 30,
};

function checkRateLimit(grudgeId: string, tier: string): boolean {
  const now = Date.now();
  const windowMs = 60_000; // 1 minute
  const maxReqs = RATE_LIMITS[tier] ?? RATE_LIMITS.default;

  let entry = rateLimitMap.get(grudgeId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitMap.set(grudgeId, entry);
  }

  entry.count++;
  return entry.count <= maxReqs;
}

// ── Auth Middleware ──────────────────────────────────────────────────────────

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ ok: false, error: 'Missing Authorization header', request_id: crypto.randomUUID() }, 401);
  }

  const token = authHeader.slice(7);
  const jwtSecret = c.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error('JWT_SECRET not configured');
    return c.json({ ok: false, error: 'Server misconfigured', request_id: crypto.randomUUID() }, 500);
  }

  const payload = await verifyHS256(token, jwtSecret);
  if (!payload) {
    return c.json({ ok: false, error: 'Invalid or expired token', request_id: crypto.randomUUID() }, 401);
  }

  const user: GrudgeUser = {
    grudge_id: (payload.grudge_id as string) || (payload.sub as string) || 'unknown',
    account_id: payload.account_id as string | undefined,
    username: payload.username as string | undefined,
    tier: (payload.tier as GrudgeUser['tier']) || 'pleb',
  };

  // Rate limit check
  if (!checkRateLimit(user.grudge_id, user.tier || 'pleb')) {
    return c.json({
      ok: false,
      error: 'Rate limit exceeded',
      request_id: crypto.randomUUID(),
    }, 429);
  }

  // Attach user to context
  c.set('user', user);
  c.set('requestId', crypto.randomUUID());

  await next();
}

/** Extract user from context (set by authMiddleware) */
export function getUser(c: Context): GrudgeUser {
  return c.get('user') as GrudgeUser;
}

/** Extract request ID from context */
export function getRequestId(c: Context): string {
  return (c.get('requestId') as string) || crypto.randomUUID();
}

/**
 * Auth Routes — Grudge ID system
 *
 * Handles all authentication for grudgewarlords.com and any Grudge Studio app.
 * Every auth method converges to the same Grudge ID + JWT.
 *
 * Endpoints:
 *   POST /api/auth/puter             — Puter UUID login (also used for guest)
 *   POST /api/auth/wallet            — Solana wallet address login
 *   POST /api/auth/login             — Username + password
 *   POST /api/auth/register          — Create account with username + password
 *   GET  /api/auth/verify            — Verify JWT token
 *   GET  /api/auth/me                — Get full user profile from JWT
 *   POST /api/auth/puter-link        — Link Puter UUID to existing account
 *   GET  /api/auth/sso-check         — Cross-app SSO bootstrap (session → return URL)
 *   GET  /api/auth/discord/callback  — Discord OAuth callback
 *   GET  /api/auth/google/start      — Google OAuth (delegates to Puter SDK)
 *   POST /api/auth/phone/send        — Send SMS verification code
 *   POST /api/auth/phone/verify      — Verify SMS code and login
 */

import type { Express, Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { db } from "../db";
import { users, accounts } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { storage } from "../storage";
import { buildScopedProfile } from "../lib/scopedProfile";
import { isFleetAllowedReturnUrl, resolveFleetReturnUrl } from "@shared/fleet/authReturn";

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "grudge-dev-secret";
/**
 * Session JWT lifetime — max allowed “stay signed in” for fleet SSO.
 * Default **365d**. Override JWT_SESSION_TTL (capped at 365d).
 * One login on id.grudge-studio.com covers all *.grudge-studio.com apps.
 */
const JWT_EXPIRES = normalizeSessionTtl(process.env.JWT_SESSION_TTL || process.env.SESSION_TTL || "365d");
/** Cookie Max-Age seconds matching JWT_EXPIRES (default 365 days). */
const SESSION_MAX_AGE_SEC = ttlToSeconds(JWT_EXPIRES);
/** Cross-app handoff launch token (short-lived; bridges to full session). */
const LAUNCH_TTL = process.env.JWT_LAUNCH_TTL || "60m";
const LAUNCH_MAX_AGE_SEC = ttlToSeconds(LAUNCH_TTL);

/** Canonical Discord OAuth redirect — must match Discord Developer Portal + token exchange. */
function discordRedirectUri(): string {
  return (
    process.env.DISCORD_REDIRECT_URI ||
    "https://id.grudge-studio.com/auth/discord/callback"
  );
}

function normalizeSessionTtl(raw: string): string {
  const m = String(raw || "365d").trim().match(/^(\d+)\s*([smhd])$/i);
  if (!m) return "365d";
  const n = Math.max(1, parseInt(m[1], 10));
  const unit = m[2].toLowerCase();
  // Cap at 365 days (max product-allowed “remember me”)
  if (unit === "d" && n > 365) return "365d";
  if (unit === "h" && n > 365 * 24) return "365d";
  if (unit === "m" && n > 365 * 24 * 60) return "365d";
  if (unit === "s" && n > 365 * 24 * 60 * 60) return "365d";
  return `${n}${unit}`;
}

function ttlToSeconds(ttl: string): number {
  const m = String(ttl).trim().match(/^(\d+)\s*([smhd])$/i);
  if (!m) return 365 * 24 * 60 * 60;
  const n = parseInt(m[1], 10);
  switch (m[2].toLowerCase()) {
    case "s":
      return n;
    case "m":
      return n * 60;
    case "h":
      return n * 60 * 60;
    case "d":
    default:
      return n * 24 * 60 * 60;
  }
}

// ── Simple in-memory rate limiter (per-IP, resets every window) ──────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_MAX_AUTH = 20; // max auth attempts per window
const RATE_MAX_PHONE = 5; // max SMS sends per window

function rateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

function getClientIp(req: Request): string {
  return (
    (req.get("cf-connecting-ip") as string) ||
    (req.get("x-forwarded-for") as string)?.split(",")[0]?.trim() ||
    req.ip ||
    "unknown"
  );
}

// ── Grudge ID generator ─────────────────────────────────────────────

function generateGrudgeId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `GRUDGE_${ts}${rand}`.slice(0, 20);
}

// ── Password hashing (native crypto.scrypt, no bcrypt dependency) ───

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      resolve(`${salt}:${derived.toString("hex")}`);
    });
  });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(key, "hex"), derived));
    });
  });
}

// ── JWT helpers ──────────────────────────────────────────────────────

function signToken(payload: {
  userId: string;
  grudgeId: string;
  username: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES as jwt.SignOptions["expiresIn"],
  });
}

/**
 * Detect which auth providers are linked based on username patterns.
 * Provider prefixes in the users table: puter:, wallet:, discord:, phone:
 */
function detectProviders(username: string): string[] {
  const providers: string[] = [];
  if (username.startsWith("puter:")) providers.push("puter");
  else if (username.startsWith("wallet:")) providers.push("phantom");
  else if (username.startsWith("discord:")) providers.push("discord");
  else if (username.startsWith("phone:")) providers.push("phone");
  else providers.push("grudge"); // username+password account
  return providers;
}

function buildAuthResponse(
  user: { id: string; username: string; grudgeId: string | null },
  account: { id: string; walletAddress: string | null; grudgeId: string | null; displayName?: string | null } | null,
) {
  const grudgeId = user.grudgeId || account?.grudgeId || "";
  const providers = detectProviders(user.username);
  // Display name: strip provider prefix for display
  const displayName =
    (account as any)?.displayName ||
    (user.username.includes(":") ? user.username.split(":").slice(1).join(":") : user.username);
  const token = signToken({
    userId: user.id,
    grudgeId,
    username: displayName,
  });

  return {
    success: true,
    token,
    sessionToken: token,
    grudgeId,
    username: displayName,
    userId: user.id,
    user: {
      id: user.id,
      grudgeId,
      username: displayName,
      displayName,
      walletAddress: account?.walletAddress || null,
      providers,
    },
  };
}

// ── Ensure account row exists for a user ─────────────────────
// Delegates to the canonical storage.getOrCreateAccountForUser so Grudge ID
// generation, Crossmint wallet creation, and account defaults are consistent
// across auth routes AND the rest of the app (characters, inventory, etc.).

async function ensureAccount(userId: string) {
  return storage.getOrCreateAccountForUser(userId);
}

const PROFILE_COMPLETE_KEY = "grudge_profile_complete:";

function puterUsernameKey(puterId: string): string {
  return `puter:${puterId}`;
}

function isAutoUsername(username: string): boolean {
  const u = String(username || "").trim();
  if (!u) return true;
  return (
    u.startsWith("puter:") ||
    u.startsWith("Puter_") ||
    u.startsWith("guest_") ||
    u.startsWith("Guest_") ||
    u.startsWith("wallet:") ||
    u.startsWith("discord:") ||
    u.startsWith("phone:") ||
    u.startsWith("google:") ||
    u.startsWith("github:") ||
    /^puter_[a-f0-9]+$/i.test(u) ||
    /^guest_[a-f0-9]+$/i.test(u)
  );
}

/**
 * Human-facing account name already present in account DB / SSO provider.
 * Fleet practice: never force a second "name" form when username/displayName exists.
 */
function resolveAccountDisplayName(
  user: { username: string },
  account: { displayName?: string | null } | null | undefined,
  extras: Array<string | null | undefined> = [],
): string {
  const candidates = [
    account?.displayName,
    ...extras,
    user.username.includes(":")
      ? user.username.split(":").slice(1).join(":")
      : user.username,
  ];
  for (const raw of candidates) {
    const s = typeof raw === "string" ? raw.trim() : "";
    if (!s || isAutoUsername(s)) continue;
    // Prefer provider-looking human handles (3+ chars, not a UUID-ish blob)
    if (s.length >= 2 && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s)) return s.slice(0, 48);
  }
  // Last resort: strip provider prefix even if "auto"
  const fallback = user.username.includes(":")
    ? user.username.split(":").slice(1).join(":")
    : user.username;
  return (fallback || "Player").slice(0, 48);
}

function hasClaimedUsername(
  user: { username: string },
  account: { displayName?: string | null } | null | undefined,
  extras: Array<string | null | undefined> = [],
): boolean {
  const name = resolveAccountDisplayName(user, account, extras);
  return !!name && !isAutoUsername(name) && name.length >= 2;
}

function markProfileComplete(userId: string) {
  rateLimitMap.set(`${PROFILE_COMPLETE_KEY}${userId}`, {
    count: 1,
    resetAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
  });
}

function setSessionCookie(res: Response, token: string) {
  const maxAge = SESSION_MAX_AGE_SEC;
  const secure =
    process.env.NODE_ENV === "production" || process.env.FORCE_SECURE_COOKIES === "1"
      ? "; Secure"
      : "";
  // Host-only on Railway; id-gateway rewrites Domain=.grudge-studio.com for studio-wide SSO.
  res.setHeader(
    "Set-Cookie",
    `grudge_auth_token=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`,
  );
}

function readSessionToken(req: Request): string | null {
  const authHeader = req.get("Authorization") || req.get("X-Session-Token") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  if (authHeader) return authHeader;
  const cookie = req.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)grudge_auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function resolveReturnUrl(req: Request): string {
  const fromQuery = resolveFleetReturnUrl(req.query as Record<string, string | string[] | undefined>, "");
  if (fromQuery) return fromQuery;
  const referer = req.get("referer") || req.get("origin") || "";
  if (referer && isFleetAllowedReturnUrl(referer)) {
    try {
      const u = new URL(referer);
      return `${u.origin}/`;
    } catch {
      /* fall through */
    }
  }
  return "https://grudgewarlords.com/";
}

/**
 * Append dual handoff params for maximum satellite compatibility:
 * - sso_token / token: full session JWT (apps that store Bearer directly)
 * - grudge_token: short launch JWT (apps that call grudge-bridge / session/exchange)
 * Long-lived session also goes in the hash fragment to reduce referrer leakage.
 */
function appendSsoParams(
  returnUrl: string,
  ssoToken: string,
  grudgeId: string,
  username: string,
  launchToken?: string,
): string {
  try {
    const u = new URL(returnUrl);
    u.searchParams.set("sso_token", ssoToken);
    u.searchParams.set("token", ssoToken);
    if (launchToken) u.searchParams.set("grudge_token", launchToken);
    if (grudgeId) {
      u.searchParams.set("grudge_id", grudgeId);
      u.searchParams.set("grudgeId", grudgeId);
    }
    if (username) {
      u.searchParams.set("username", username);
      u.searchParams.set("grudge_username", username);
    }
    // Prefer hash for long-lived session (not sent to intermediate servers)
    const hp = new URLSearchParams(u.hash.startsWith("#") ? u.hash.slice(1) : u.hash);
    hp.set("sso_token", ssoToken);
    if (launchToken) hp.set("grudge_token", launchToken);
    if (grudgeId) hp.set("grudge_id", grudgeId);
    u.hash = hp.toString();
    return u.toString();
  } catch {
    const sep = returnUrl.includes("?") ? "&" : "?";
    const launch = launchToken ? `&grudge_token=${encodeURIComponent(launchToken)}` : "";
    return `${returnUrl}${sep}sso_token=${encodeURIComponent(ssoToken)}&token=${encodeURIComponent(ssoToken)}${launch}&grudge_id=${encodeURIComponent(grudgeId)}&username=${encodeURIComponent(username)}`;
  }
}

function buildSsoUserPayload(
  user: { id: string; username: string; grudgeId: string | null; email?: string | null },
  account: { grudgeId?: string | null; displayName?: string | null; gbuxBalance?: number | null; avatarUrl?: string | null } | null,
  opts: { isNew: boolean; puterUsername?: string | null },
) {
  const grudgeId = user.grudgeId || account?.grudgeId || "";
  const displayName = resolveAccountDisplayName(user, account, [opts.puterUsername]);
  const profileComplete = rateLimitMap.has(`${PROFILE_COMPLETE_KEY}${user.id}`);
  // Fleet practice: if account DB (or SSO provider) already has a real username,
  // do NOT force a "choose name" step — games use accounts.displayName / users.username.
  const claimed = hasClaimedUsername(user, account, [opts.puterUsername]);
  if (claimed && !profileComplete) {
    markProfileComplete(user.id);
  }
  const needsProfile =
    !profileComplete &&
    !claimed &&
    (opts.isNew || isAutoUsername(user.username));

  return {
    id: user.id,
    username: displayName,
    grudgeId,
    displayName,
    avatarUrl: account?.avatarUrl || null,
    gbuxBalance: account?.gbuxBalance ?? 0,
    role: "player",
    needsProfile,
    isNew: opts.isNew,
    email: user.email || null,
  };
}

/**
 * Scoped Puter → Grudge ID resolution:
 * 1) match by Puter UUID (puter:<uuid>)
 * 2) else match by email when provided
 * 3) else create linked Puter + Grudge ID (email stored when available)
 */
async function resolvePuterGrudgeAccount(
  puterId: string,
  puterUsername?: string,
  email?: string,
): Promise<{ user: typeof users.$inferSelect; account: Awaited<ReturnType<typeof ensureAccount>>; isNew: boolean }> {
  const puterKey = puterUsernameKey(puterId);
  let isNew = false;

  let [user] = await db.select().from(users).where(eq(users.username, puterKey)).limit(1);

  if (!user && email) {
    const normalized = email.trim().toLowerCase();
    [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${normalized}`)
      .limit(1);
  }

  if (!user) {
    isNew = true;
    const grudgeId = generateGrudgeId();
    const dummyPw = await hashPassword(crypto.randomBytes(32).toString("hex"));

    [user] = await db
      .insert(users)
      .values({
        username: puterKey,
        password: dummyPw,
        grudgeId,
        email: email?.trim().toLowerCase() || null,
      })
      .onConflictDoNothing()
      .returning();

    if (!user) {
      [user] = await db.select().from(users).where(eq(users.username, puterKey)).limit(1);
    }

  } else if (email && !user.email) {
    await db
      .update(users)
      .set({ email: email.trim().toLowerCase() })
      .where(eq(users.id, user.id));
    user = { ...user, email: email.trim().toLowerCase() };
  }

  if (!user) {
    throw new Error("Failed to create Puter-linked Grudge account");
  }

  let account = await ensureAccount(user.id);
  // Prefer real Puter/handle username as account displayName (not puter:uuid)
  const display = puterUsername?.trim() || undefined;
  if (display && !isAutoUsername(display) && (!account.displayName || isAutoUsername(account.displayName))) {
    await storage.updateAccount(account.id, { displayName: display });
    account = { ...account, displayName: display };
    markProfileComplete(user.id);
  } else if (account.displayName && !isAutoUsername(account.displayName)) {
    markProfileComplete(user.id);
  }

  if (!user.grudgeId && account.grudgeId) {
    await db.update(users).set({ grudgeId: account.grudgeId }).where(eq(users.id, user.id));
    user = { ...user, grudgeId: account.grudgeId };
  }

  return { user, account, isNew };
}

function mintLaunchToken(userId: string, grudgeId: string, audience: string): string {
  return jwt.sign(
    { type: "launch", userId, grudgeId, aud: audience },
    JWT_SECRET,
    { expiresIn: LAUNCH_TTL as jwt.SignOptions["expiresIn"] },
  );
}

// ── Register routes ──────────────────────────────────────────────────

function authAssetPath(file: string): string {
  const candidates = [
    path.join(process.cwd(), "server", "templates", file),
    path.join(process.cwd(), "dist", "templates", file),
    path.join(process.cwd(), "client", "public", file),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
}

export function registerAuthRoutes(app: Express) {

  // ── GET /login — canonical Grudge ID entry (id.grudge-studio.com) ──
  app.get("/login", (req: Request, res: Response) => {
    const q = new URLSearchParams();
    const redirect = resolveFleetReturnUrl(
      req.query as Record<string, string | string[] | undefined>,
      "",
    ) || (req.query.redirect as string) || (req.query.return as string);
    if (redirect) q.set("redirect", redirect);
    const dest = "/api/auth/page" + (q.toString() ? `?${q.toString()}` : "");
    res.redirect(302, dest);
  });

  // ── GET /auth — legacy entry → Grudge ID sign-in page ──
  app.get("/auth", (req: Request, res: Response) => {
    const q = new URLSearchParams();
    const redirect =
      (req.query.redirect as string) ||
      (req.query.return_to as string) ||
      (req.query.return as string);
    if (redirect) q.set("redirect", redirect);
    if (req.query.app) q.set("app", String(req.query.app));
    if (req.query.api) q.set("api", String(req.query.api));
    if (req.query.origin) q.set("origin", String(req.query.origin));
    if (req.query.handoff) q.set("handoff", String(req.query.handoff));
    const dest = "/api/auth/page" + (q.toString() ? `?${q.toString()}` : "");
    res.redirect(302, dest);
  });

  // ── GET /auth/sso-check — legacy alias (id.grudge-studio.com /auth/*) ──
  app.get("/auth/sso-check", (req: Request, res: Response) => {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === "string") q.set(key, value);
    }
    const dest = "/api/auth/sso-check" + (q.toString() ? `?${q.toString()}` : "");
    res.redirect(302, dest);
  });

  /**
   * GET /api/auth/sso-check
   * Cross-app SSO bootstrap: if the browser already has a Grudge session,
   * mint a fresh JWT and redirect back to `return` with ?sso_token=…
   * Otherwise send the user to the Grudge ID sign-in page.
   */
  app.get("/api/auth/sso-check", async (req: Request, res: Response) => {
    const returnUrl = resolveReturnUrl(req);
    const token = readSessionToken(req);

    if (!token) {
      return res.redirect(
        302,
        `/login?redirect_uri=${encodeURIComponent(returnUrl)}`,
      );
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as {
        userId?: string;
        grudgeId?: string;
        username?: string;
      };
      if (!payload.userId) {
        return res.redirect(
          302,
          `/login?redirect_uri=${encodeURIComponent(returnUrl)}`,
        );
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);
      if (!user) {
        return res.redirect(
          302,
          `/login?redirect_uri=${encodeURIComponent(returnUrl)}`,
        );
      }

      const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, user.id))
        .limit(1);
      const displayName =
        account?.displayName ||
        payload.username ||
        (user.username.includes(":")
          ? user.username.split(":").slice(1).join(":")
          : user.username);
      const grudgeId = user.grudgeId || account?.grudgeId || payload.grudgeId || "";
      const ssoToken = signToken({
        userId: user.id,
        grudgeId,
        username: displayName,
      });
      // Dual handoff: full session + short launch for bridge-based satellites
      let launchToken = "";
      try {
        const aud = new URL(returnUrl).origin;
        launchToken = mintLaunchToken(user.id, grudgeId, aud);
      } catch {
        /* ignore */
      }
      setSessionCookie(res, ssoToken);
      res.redirect(302, appendSsoParams(returnUrl, ssoToken, grudgeId, displayName, launchToken));
    } catch {
      res.redirect(
        302,
        `/login?redirect_uri=${encodeURIComponent(returnUrl)}`,
      );
    }
  });

  // ── GET /api/auth/page — Grudge ID sign-in UI (id.grudge-studio.com) ──
  app.get("/api/auth/page", (_req: Request, res: Response) => {
    const pagePath = authAssetPath("auth-page.html");
    if (!fs.existsSync(pagePath)) {
      return res.status(503).send("Auth page unavailable");
    }
    res.setHeader("Cache-Control", "no-store, must-revalidate");
    res.type("html").sendFile(pagePath);
  });

  const serveAuthFavicon = (file: string, type: string) => (_req: Request, res: Response) => {
    const iconPath = authAssetPath(file);
    if (!fs.existsSync(iconPath)) {
      return res.status(404).end();
    }
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.type(type).sendFile(iconPath);
  };

  app.get("/favicon.png", serveAuthFavicon("favicon.png", "png"));
  app.get("/favicon.ico", serveAuthFavicon("favicon.ico", "x-icon"));
  // Brand mark (helmet medallion) for id.grudge-studio.com login UI + oauth row
  app.get("/grudge-id-logo.png", serveAuthFavicon("grudge-id-logo.png", "png"));
  app.get("/brand/logo.png", serveAuthFavicon("grudge-id-logo.png", "png"));
  // Full-page / modal backdrop — Racalvin The Pirate King
  app.get("/auth-bg-racalvin.jpg", serveAuthFavicon("auth-bg-racalvin.jpg", "jpeg"));
  app.get("/brand/auth-bg.jpg", serveAuthFavicon("auth-bg-racalvin.jpg", "jpeg"));

  // Fleet embed modal (id.grudge-studio.com / grudge-auth-modal.js) — login tool for all satellites
  const serveEmbedAsset = (file: string, type: string) => (_req: Request, res: Response) => {
    const assetPath = authAssetPath(file);
    if (!fs.existsSync(assetPath)) {
      return res.status(404).end();
    }
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type(type).sendFile(assetPath);
  };
  app.get("/grudge-auth-modal.js", serveEmbedAsset("grudge-auth-modal.js", "javascript"));
  app.get("/grudge-auth-modal.css", serveEmbedAsset("grudge-auth-modal.css", "css"));

  // ── Rate-limit middleware for auth routes ────────────────────────────
  const authRateLimit = (req: Request, res: Response, next: Function) => {
    const ip = getClientIp(req);
    if (!rateLimit(`auth:${ip}`, RATE_MAX_AUTH)) {
      return res.status(429).json({ success: false, error: "Too many requests. Try again later." });
    }
    next();
  };

  /**
   * POST /api/auth/puter
   * Puter UUID login — creates account if new. Also handles guest logins
   * (puterUuid starts with "guest_").
   */
  /** SPA clients (e.g. ui.grudge-studio.com) use this for silent re-auth: returns JWT in JSON body. */
  app.post("/api/auth/puter", authRateLimit, async (req: Request, res: Response) => {
    try {
      const puterUuid = req.body.puterUuid || req.body.puterId;
      const puterUsername = req.body.puterUsername || req.body.displayName;
      const email = req.body.email as string | undefined;
      if (!puterUuid) {
        return res.status(400).json({ success: false, error: "puterUuid or puterId required" });
      }

      const isGuest = puterUuid.startsWith("guest_");
      const username = puterUsername || (isGuest ? `Guest_${puterUuid.slice(-8)}` : `Puter_${puterUuid.slice(-8)}`);

      const { user, account, isNew } = isGuest
        ? await resolvePuterGrudgeAccount(puterUuid, username, email)
        : await resolvePuterGrudgeAccount(puterUuid, puterUsername, email);

      const response = buildAuthResponse({ ...user, username }, account);
      if (!isGuest) setSessionCookie(res, response.token);
      res.json({ ...response, isNew });
    } catch (e: any) {
      console.error("[Auth/Puter]", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /**
   * POST /api/auth/puter-sso
   * Auth-page flow: simple Puter identity → scoped Grudge ID (email links existing accounts).
   */
  app.post("/api/auth/puter-sso", authRateLimit, async (req: Request, res: Response) => {
    try {
      const puterId = req.body.puterId || req.body.puterUuid;
      const puterUsername = req.body.puterUsername || req.body.displayName;
      const email = req.body.email as string | undefined;
      if (!puterId) {
        return res.status(400).json({ success: false, error: "puterId required" });
      }

      const { user, account, isNew } = await resolvePuterGrudgeAccount(puterId, puterUsername, email);
      const response = buildAuthResponse(
        { id: user.id, username: user.username, grudgeId: user.grudgeId },
        account,
      );
      setSessionCookie(res, response.token);
      res.json({
        ...response,
        ...buildSsoUserPayload(user, account, { isNew, puterUsername }),
        isNew,
      });
    } catch (e: any) {
      console.error("[Auth/Puter-SSO]", e);
      res.status(500).json({ success: false, error: e.message || "SSO failed" });
    }
  });

  /** POST /api/auth/guest — quick guest Grudge ID (Puter cloud slot reserved). */
  app.post("/api/auth/guest", authRateLimit, async (_req: Request, res: Response) => {
    try {
      const guestId = `guest_${crypto.randomBytes(8).toString("hex")}`;
      const { user, account, isNew } = await resolvePuterGrudgeAccount(guestId, "Guest");
      const response = buildAuthResponse(
        { id: user.id, username: user.username, grudgeId: user.grudgeId },
        account,
      );
      setSessionCookie(res, response.token);
      res.json({
        ...buildSsoUserPayload(user, account, { isNew: isNew || true }),
        success: true,
        token: response.token,
        sessionToken: response.sessionToken,
        user: response.user,
      });
    } catch (e: any) {
      console.error("[Auth/Guest]", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /**
   * POST /api/auth/complete-profile — optional claim username after SSO.
   * Name is NOT required when account.displayName / users.username already set
   * from id.grudge-studio.com / Puter / Discord (fleet account DB SSOT).
   */
  app.post("/api/auth/complete-profile", authRateLimit, async (req: Request, res: Response) => {
    try {
      const token = readSessionToken(req);
      if (!token) return res.status(401).json({ success: false, error: "Not authenticated" });

      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      const { username, email, displayName: bodyDisplay } = req.body as {
        username?: string;
        email?: string;
        displayName?: string;
      };

      const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      if (!user) return res.status(404).json({ success: false, error: "User not found" });

      const [account] = await db.select().from(accounts).where(eq(accounts.userId, user.id)).limit(1);

      // Already have account username — allow empty body (skip form)
      const existingName = resolveAccountDisplayName(user, account);
      const requested = (username || bodyDisplay || "").trim();

      if (requested) {
        if (!/^[a-zA-Z0-9_-]{3,30}$/.test(requested)) {
          return res.status(400).json({ success: false, error: "Invalid username" });
        }
        // Only enforce uniqueness on users.username when claiming a non-provider key
        const [taken] = await db.select().from(users).where(eq(users.username, requested)).limit(1);
        if (taken && taken.id !== user.id) {
          return res.status(409).json({ success: false, error: "Username taken" });
        }
        if (account) {
          await storage.updateAccount(account.id, { displayName: requested });
        }
      } else if (!existingName || isAutoUsername(existingName)) {
        // No name provided and none on account — still allow skip with synthetic default
        // rather than 400; games never block on missing optional profile name.
        if (account && !account.displayName) {
          const fallback = resolveAccountDisplayName(user, account);
          await storage.updateAccount(account.id, { displayName: fallback });
        }
      }

      if (email) {
        await db.update(users).set({ email: email.trim().toLowerCase() }).where(eq(users.id, user.id));
      }

      markProfileComplete(user.id);

      const freshAccount = account ? await storage.getAccount(account.id) : await ensureAccount(user.id);
      res.json(
        buildSsoUserPayload(
          { ...user, email: email?.trim().toLowerCase() || user.email },
          freshAccount,
          { isNew: false },
        ),
      );
    } catch (e: any) {
      console.error("[Auth/CompleteProfile]", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /** POST /api/auth/popup-token — mint short-lived launch token for cross-app handoff. */
  app.post("/api/auth/popup-token", authRateLimit, async (req: Request, res: Response) => {
    try {
      const token = readSessionToken(req);
      if (!token) return res.status(401).json({ error: "Authentication required" });

      const payload = jwt.verify(token, JWT_SECRET) as { userId: string; grudgeId?: string };
      const audience = (req.body?.audience as string) || "";
      if (!audience || !/^https?:\/\//i.test(audience)) {
        return res.status(400).json({ error: "Valid audience URL required" });
      }
      // Only fleet / signed production origins may receive launch tokens
      try {
        const originOnly = new URL(audience).origin;
        if (!isFleetAllowedReturnUrl(originOnly) && !isFleetAllowedReturnUrl(originOnly + "/")) {
          return res.status(403).json({ error: "Audience not on fleet allowlist" });
        }
      } catch {
        return res.status(400).json({ error: "Valid audience URL required" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      if (!user) return res.status(404).json({ error: "User not found" });

      const launch = mintLaunchToken(user.id, user.grudgeId || payload.grudgeId || "", audience);
      res.json({
        token: launch,
        expiresIn: LAUNCH_TTL,
        maxAgeSec: LAUNCH_MAX_AGE_SEC,
        sessionTtl: JWT_EXPIRES,
      });
    } catch {
      res.status(401).json({ error: "Authentication required" });
    }
  });

  /**
   * POST /api/auth/refresh — re-mint a full session JWT while the current one is still valid.
   * Call from satellites before expiry so the device stays signed in for the full policy window.
   */
  app.post("/api/auth/refresh", authRateLimit, async (req: Request, res: Response) => {
    try {
      const token = readSessionToken(req) || (req.body?.token as string) || "";
      if (!token) return res.status(401).json({ success: false, error: "Authentication required" });

      const payload = jwt.verify(token, JWT_SECRET) as {
        userId?: string;
        grudgeId?: string;
        username?: string;
        type?: string;
      };
      // Do not refresh launch tokens into sessions here — use session/exchange
      if (payload.type === "launch") {
        return res.status(400).json({
          success: false,
          error: "Launch tokens must use /api/auth/session/exchange or /api/auth/grudge-bridge",
        });
      }
      if (!payload.userId) {
        return res.status(401).json({ success: false, error: "Invalid token" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      if (!user) return res.status(404).json({ success: false, error: "User not found" });

      const account = await ensureAccount(user.id);
      const response = buildAuthResponse(
        { id: user.id, username: user.username, grudgeId: user.grudgeId },
        account,
      );
      setSessionCookie(res, response.token);
      res.json({
        ...response,
        expiresIn: JWT_EXPIRES,
        maxAgeSec: SESSION_MAX_AGE_SEC,
        refreshed: true,
      });
    } catch {
      res.status(401).json({ success: false, error: "Invalid or expired token" });
    }
  });

  /**
   * GET|POST /api/auth/session/claim
   * Silent fleet re-entry: if browser already has a valid Grudge session cookie
   * (Domain=.grudge-studio.com from id login), mint a fresh long-lived JWT for
   * the calling satellite without showing the login UI.
   * Call with credentials: 'include' from any *.grudge-studio.com origin.
   */
  const claimSession = async (req: Request, res: Response) => {
    try {
      const token = readSessionToken(req) || (req.body?.token as string) || "";
      if (!token) {
        return res.status(401).json({
          success: false,
          error: "No session",
          hint: "Sign in once at id.grudge-studio.com — then claim works on all fleet hosts.",
        });
      }

      const payload = jwt.verify(token, JWT_SECRET) as {
        userId?: string;
        grudgeId?: string;
        username?: string;
        type?: string;
      };
      if (payload.type === "launch") {
        return res.status(400).json({
          success: false,
          error: "Launch tokens must use /api/auth/session/exchange",
        });
      }
      if (!payload.userId) {
        return res.status(401).json({ success: false, error: "Invalid session" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      if (!user) return res.status(404).json({ success: false, error: "User not found" });

      const account = await ensureAccount(user.id);
      const response = buildAuthResponse(
        { id: user.id, username: user.username, grudgeId: user.grudgeId },
        account,
      );
      setSessionCookie(res, response.token);
      res.json({
        ...response,
        expiresIn: JWT_EXPIRES,
        maxAgeSec: SESSION_MAX_AGE_SEC,
        claimed: true,
        fleetWide: true,
      });
    } catch {
      res.status(401).json({ success: false, error: "Session expired — sign in again" });
    }
  };
  app.get("/api/auth/session/claim", authRateLimit, claimSession);
  app.post("/api/auth/session/claim", authRateLimit, claimSession);

  /** Resolve id.grudge-studio.com launch JWT → DB user (supports userId, sub, or grudgeId). */
  async function resolveLaunchTokenUser(launchToken: string, audience = "") {
    let grudgeId = "";
    let identityUserId = "";
    let decodedAud = "";

    try {
      const decoded = jwt.verify(launchToken, JWT_SECRET) as {
        type?: string;
        userId?: string;
        grudgeId?: string;
        sub?: string | number;
        aud?: string;
      };
      decodedAud = decoded.aud || "";
      if (decoded.type === "launch" && decoded.userId) {
        identityUserId = decoded.userId;
        grudgeId = decoded.grudgeId || "";
      } else {
        grudgeId = decoded.grudgeId || "";
        if (decoded.sub != null) identityUserId = String(decoded.sub);
        if (decoded.userId) identityUserId = decoded.userId;
      }
    } catch {
      /* fall through to identity API */
    }

    const aud = audience || decodedAud;
    if (aud && decodedAud && aud !== decodedAud) {
      return { error: "Audience mismatch" as const };
    }

    if (!grudgeId) {
      const identityApi = process.env.IDENTITY_API_URL || "https://grudge-studio.com";
      const ex = await fetch(`${identityApi}/api/auth/session/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: launchToken, audience: aud }),
      });
      if (!ex.ok) return { error: "Invalid or expired token" as const };
      const profile = (await ex.json()) as {
        id?: string | number;
        grudgeId?: string;
        userId?: string;
      };
      grudgeId = profile.grudgeId || "";
      if (profile.userId) identityUserId = profile.userId;
      if (profile.id != null) identityUserId = String(profile.id);
    }

    if (!grudgeId && !identityUserId) {
      return { error: "Token missing grudgeId" as const };
    }

    let user: typeof users.$inferSelect | undefined;
    if (grudgeId) {
      [user] = await db.select().from(users).where(eq(users.grudgeId, grudgeId)).limit(1);
    }
    if (!user && identityUserId) {
      [user] = await db.select().from(users).where(eq(users.id, identityUserId)).limit(1);
    }
    if (!user) return { error: "User not found" as const };
    return { user };
  }

  /** POST /api/auth/session/exchange — bridge launch token → session profile + JWT. */
  app.post("/api/auth/session/exchange", authRateLimit, async (req: Request, res: Response) => {
    try {
      const launchToken = req.body?.token as string;
      if (!launchToken) return res.status(400).json({ error: "token required" });

      const audience = (req.body?.audience as string) || "";
      const resolved = await resolveLaunchTokenUser(launchToken, audience);
      if ("error" in resolved) {
        const status =
          resolved.error === "User not found" ? 404 :
          resolved.error === "Audience mismatch" ? 403 : 401;
        return res.status(status).json({ error: resolved.error });
      }

      const { user } = resolved;
      const [account] = await db.select().from(accounts).where(eq(accounts.userId, user.id)).limit(1);
      const displayName =
        account?.displayName ||
        (user.username.includes(":") ? user.username.split(":").slice(1).join(":") : user.username);
      const sessionToken = signToken({
        userId: user.id,
        grudgeId: user.grudgeId || account?.grudgeId || "",
        username: displayName,
      });
      setSessionCookie(res, sessionToken);

      res.json({
        grudgeId: user.grudgeId || account?.grudgeId || "",
        username: displayName,
        displayName,
        email: user.email || null,
        token: sessionToken,
        sessionToken,
      });
    } catch (e: any) {
      console.error("[Auth/SessionExchange]", e);
      res.status(400).json({ error: "Invalid or expired token" });
    }
  });

  /**
   * POST /api/auth/grudge-bridge
   * Fleet SSO for Puter sites (grudge-crafting.puter.site, etc.):
   * exchange id.grudge-studio.com launch JWT → Railway session for the REAL account.
   * Never mint a synthetic puter:grudge_* user (that yields an empty roster).
   */
  app.post("/api/auth/grudge-bridge", authRateLimit, async (req: Request, res: Response) => {
    try {
      const launchToken = req.body?.token as string;
      if (!launchToken) return res.status(400).json({ success: false, error: "token required" });

      const audience = (req.body?.audience as string) || "";
      const resolved = await resolveLaunchTokenUser(launchToken, audience);
      if ("error" in resolved) {
        const status =
          resolved.error === "User not found" ? 404 :
          resolved.error === "Audience mismatch" ? 403 : 401;
        return res.status(status).json({ success: false, error: resolved.error });
      }

      const { user } = resolved;
      const account = await ensureAccount(user.id);
      const response = buildAuthResponse(
        { id: user.id, username: user.username, grudgeId: user.grudgeId },
        account,
      );
      setSessionCookie(res, response.token);
      res.json({ ...response, success: true });
    } catch (e: any) {
      console.error("[Auth/GrudgeBridge]", e);
      res.status(500).json({ success: false, error: e.message || "Bridge failed" });
    }
  });

  /**
   * POST /api/auth/wallet
   * Solana wallet login — creates account if new.
   */
  app.post("/api/auth/wallet", authRateLimit, async (req: Request, res: Response) => {
    try {
      const walletAddress = req.body.wallet_address || req.body.walletAddress;
      if (!walletAddress) {
        return res.status(400).json({ success: false, error: "wallet_address required" });
      }

      const walletKey = `wallet:${walletAddress}`;

      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, walletKey))
        .limit(1);

      if (!user) {
        const grudgeId = generateGrudgeId();
        const dummyPw = await hashPassword(crypto.randomBytes(32).toString("hex"));

        [user] = await db
          .insert(users)
          .values({ username: walletKey, password: dummyPw, grudgeId })
          .onConflictDoNothing()
          .returning();

        if (!user) {
          [user] = await db.select().from(users).where(eq(users.username, walletKey)).limit(1);
        }
      }

      if (!user) {
        return res.status(500).json({ success: false, error: "Failed to create wallet account" });
      }

      const account = await ensureAccount(user.id);

      // Update wallet address on account if not set (external wallet, not Crossmint)
      if (account && !account.walletAddress) {
        await storage.updateAccount(account.id, { walletAddress, walletType: 'external' } as any);
      }

      const shortAddr = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
      res.json(buildAuthResponse({ ...user, username: shortAddr }, { ...account, walletAddress }));
    } catch (e: any) {
      console.error("[Auth/Wallet]", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /**
   * POST /api/auth/login
   * Username + password login.
   */
  app.post("/api/auth/login", authRateLimit, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: "Username and password required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username.trim()))
        .limit(1);

      if (!user) {
        return res.status(401).json({ success: false, error: "Invalid username or password" });
      }

      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        return res.status(401).json({ success: false, error: "Invalid username or password" });
      }

      const account = await ensureAccount(user.id);
      res.json(buildAuthResponse(user, account));
    } catch (e: any) {
      console.error("[Auth/Login]", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /**
   * POST /api/auth/register
   * Create new account with username + password.
   */
  app.post("/api/auth/register", authRateLimit, async (req: Request, res: Response) => {
    try {
      const { username, password, email } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: "Username and password required" });
      }
      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ success: false, error: "Username must be 3-20 characters" });
      }
      if (password.length < 4) {
        return res.status(400).json({ success: false, error: "Password must be at least 4 characters" });
      }

      // Check if username taken
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.username, username.trim()))
        .limit(1);

      if (existing) {
        return res.status(409).json({ success: false, error: "Username already taken" });
      }

      const grudgeId = generateGrudgeId();
      const hashedPw = await hashPassword(password);

      const [user] = await db
        .insert(users)
        .values({
          username: username.trim(),
          password: hashedPw,
          grudgeId,
          email: email || null,
        })
        .returning();

      const account = await ensureAccount(user.id);
      // Register username is the account display name — no second profile step
      if (account && username) {
        await storage.updateAccount(account.id, { displayName: username.trim() });
        markProfileComplete(user.id);
      }
      const fresh = await storage.getAccount(account.id);
      res.json({
        ...buildAuthResponse(user, fresh || account),
        message: "Welcome to Grudge Warlords!",
      });
    } catch (e: any) {
      console.error("[Auth/Register]", e);
      if (e.code === "23505") {
        return res.status(409).json({ success: false, error: "Username already taken" });
      }
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /**
   * GET /api/auth/verify
   * Verify JWT token — returns user info if valid.
   */
  app.get("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      const authHeader = req.get("Authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

      if (!token) {
        return res.json({ success: false, valid: false });
      }

      const payload = jwt.verify(token, JWT_SECRET) as any;
      res.json({
        success: true,
        valid: true,
        userId: payload.userId,
        grudgeId: payload.grudgeId,
        username: payload.username,
      });
    } catch {
      res.json({ success: false, valid: false });
    }
  });

  /**
   * POST /api/auth/puter-link
   * Link a Puter UUID to an existing authenticated account (background call).
   */
  app.post("/api/auth/puter-link", async (req: Request, res: Response) => {
    try {
      const authHeader = req.get("Authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!token) return res.status(401).json({ success: false, error: "Auth required" });

      const payload = jwt.verify(token, JWT_SECRET) as any;
      const { puterUuid } = req.body;
      if (!puterUuid) return res.status(400).json({ success: false, error: "puterUuid required" });

      // Store the puter UUID link — in a real system this would be a separate table,
      // but for now we ensure a puter user row exists and is linked
      res.json({ success: true, linked: true });
    } catch {
      res.json({ success: false, error: "Invalid token" });
    }
  });

  /**
   * GET /api/auth/discord/start (+ /auth/discord/start alias)
   * Discord OAuth on id.grudge-studio.com — identify + email only.
   * Accepts return|returnUrl|redirect|redirect_uri (auth-page uses redirect).
   * Omits prompt=consent so returning users get one-tap approve (easiest re-entry).
   */
  const discordStart = (req: Request, res: Response) => {
    const rawReturn =
      (req.query.return as string) ||
      (req.query.returnUrl as string) ||
      (req.query.redirect as string) ||
      (req.query.redirect_uri as string) ||
      "https://grudgewarlords.com/auth/callback";
    const returnUrl = isFleetAllowedReturnUrl(rawReturn)
      ? rawReturn
      : "https://grudgewarlords.com/auth/callback";
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({ success: false, error: "Discord OAuth not configured" });
    }
    const redirectUri = discordRedirectUri();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      // Minimal scopes — easiest approval
      scope: "identify email",
      state: returnUrl,
    });
    // Do NOT set prompt=consent (forces re-auth every time). Discord only prompts when needed.
    res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
  };
  app.get("/api/auth/discord/start", discordStart);
  app.get("/auth/discord/start", discordStart);

  /**
   * GET /api/auth/scoped-profile
   * Safe account snapshot for Discord cards / bots — masked IDs, no secrets.
   */
  app.get("/api/auth/scoped-profile", async (req: Request, res: Response) => {
    try {
      const authHeader = req.get("Authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!token) return res.status(401).json({ success: false, error: "No token" });

      const payload = jwt.verify(token, JWT_SECRET) as { userId?: string };
      if (!payload.userId) return res.status(401).json({ success: false, error: "Invalid token" });

      const profile = await buildScopedProfile(payload.userId, { mask: true });
      if (!profile) return res.status(404).json({ success: false, error: "User not found" });

      res.json({ success: true, profile });
    } catch {
      res.status(401).json({ success: false, error: "Invalid or expired token" });
    }
  });

  /**
   * GET /api/auth/discord/callback (+ /auth/discord/callback alias)
   * Exchanges code → Discord user → long-lived Grudge session + dual handoff.
   * redirect_uri MUST match discordStart (discordRedirectUri()).
   */
  const discordCallback = async (req: Request, res: Response) => {
    const { code, state, error: oauthError } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };
    const rawReturn = state || "https://grudgewarlords.com/";
    const returnUrl = isFleetAllowedReturnUrl(rawReturn)
      ? rawReturn
      : "https://grudgewarlords.com/";

    if (oauthError || !code) {
      return res.redirect(
        `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}error=${encodeURIComponent(oauthError || "Discord auth cancelled")}`,
      );
    }

    try {
      const clientId = process.env.DISCORD_CLIENT_ID;
      const clientSecret = process.env.DISCORD_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.redirect(`${returnUrl}?error=Discord+not+configured`);
      }

      const redirectUri = discordRedirectUri();
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
      if (!tokenData.access_token) {
        console.error("[Auth/Discord] token exchange failed", tokenData);
        return res.redirect(`${returnUrl}?error=Discord+token+exchange+failed`);
      }

      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const discordUser = (await userRes.json()) as {
        id?: string;
        username?: string;
        global_name?: string;
        email?: string;
      };

      if (!discordUser.id) {
        return res.redirect(`${returnUrl}?error=Discord+user+fetch+failed`);
      }

      const discordKey = `discord:${discordUser.id}`;
      let [user] = await db.select().from(users).where(eq(users.username, discordKey)).limit(1);

      if (!user) {
        const grudgeId = generateGrudgeId();
        const dummyPw = await hashPassword(crypto.randomBytes(32).toString("hex"));
        const insertValues: Record<string, unknown> = {
          username: discordKey,
          password: dummyPw,
          grudgeId,
        };
        if (discordUser.email) insertValues.email = String(discordUser.email).toLowerCase();
        [user] = await db
          .insert(users)
          .values(insertValues as typeof users.$inferInsert)
          .onConflictDoNothing()
          .returning();

        if (!user) {
          [user] = await db.select().from(users).where(eq(users.username, discordKey)).limit(1);
        }
      } else if (discordUser.email && !user.email) {
        await db
          .update(users)
          .set({ email: String(discordUser.email).toLowerCase() })
          .where(eq(users.id, user.id));
      }

      if (!user) {
        return res.redirect(`${returnUrl}?error=Account+creation+failed`);
      }

      const account = await ensureAccount(user.id);
      const displayName =
        discordUser.global_name ||
        discordUser.username ||
        account?.displayName ||
        "Discord Player";
      if (account && (!account.displayName || account.displayName.startsWith("discord:"))) {
        await storage.updateAccount(account.id, { displayName });
      }

      const grudgeId = user.grudgeId || account?.grudgeId || "";
      const ssoToken = signToken({
        userId: user.id,
        grudgeId,
        username: displayName,
      });
      setSessionCookie(res, ssoToken);

      let launchToken = "";
      try {
        const aud = new URL(returnUrl).origin;
        launchToken = mintLaunchToken(user.id, grudgeId, aud);
      } catch {
        /* ignore */
      }

      res.redirect(302, appendSsoParams(returnUrl, ssoToken, grudgeId, displayName, launchToken));
    } catch (e: any) {
      console.error("[Auth/Discord]", e);
      res.redirect(`${returnUrl}?error=Discord+auth+error`);
    }
  };
  app.get("/api/auth/discord/callback", discordCallback);
  app.get("/auth/discord/callback", discordCallback);

  // ── GET /api/auth/me — Full user profile from JWT ─────────────────

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const token = readSessionToken(req);
      if (!token) {
        return res.status(401).json({ success: false, error: "No token provided" });
      }

      const payload = jwt.verify(token, JWT_SECRET) as any;
      const userId = payload.userId;

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      let [account] = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1);

      const providers = detectProviders(user.username);
      const displayName = resolveAccountDisplayName(user, account, [payload.username]);
      const needsProfile =
        !hasClaimedUsername(user, account, [payload.username]) &&
        isAutoUsername(user.username) &&
        !rateLimitMap.has(`${PROFILE_COMPLETE_KEY}${user.id}`);

      res.json({
        success: true,
        id: user.id,
        grudgeId: user.grudgeId || account?.grudgeId || "",
        username: displayName,
        displayName,
        email: user.email || null,
        walletAddress: account?.walletAddress || null,
        gbuxBalance: account?.gbuxBalance || 0,
        accountXp: account?.accountXp || 0,
        isPremium: (account?.premiumCurrency || 0) > 0,
        avatarUrl: account?.avatarUrl || null,
        providers,
        needsProfile,
        role: "player",
      });
    } catch {
      res.status(401).json({ success: false, error: "Invalid or expired token" });
    }
  });

  // ── GET /api/auth/google/start — Google OAuth ─────────────────────
  // Google sign-in routes through the Puter SDK on the client side.
  // This endpoint exists so the client doesn't 404 — it returns
  // instructions to use the Puter SDK popup instead.

  app.get("/api/auth/google/start", (_req: Request, res: Response) => {
    res.json({
      success: false,
      error: "Google OAuth is handled via Puter SDK on the client. Call loginWithPuterSDK() instead.",
      method: "puter_sdk",
    });
  });

  // ── POST /api/auth/phone/send — Send SMS verification code ────────
  // Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

  app.post("/api/auth/phone/send", async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    if (!rateLimit(`phone:${ip}`, RATE_MAX_PHONE)) {
      return res.status(429).json({ success: false, error: "Too many SMS requests. Try again later." });
    }

    try {
      const { phone } = req.body;
      if (!phone || typeof phone !== "string" || phone.length < 10) {
        return res.status(400).json({ success: false, error: "Valid phone number required" });
      }

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        return res.status(501).json({ success: false, error: "SMS not configured. Use another sign-in method." });
      }

      // Generate 6-digit code, store in memory with 10-min TTL
      const code = crypto.randomInt(100000, 999999).toString();
      const codeKey = `phone_code:${phone}`;
      rateLimitMap.set(codeKey, { count: parseInt(code), resetAt: Date.now() + 10 * 60 * 1000 });

      // Send via Twilio REST API (no SDK dependency)
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const twilioAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

      const smsRes = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${twilioAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          From: fromNumber,
          Body: `Your Grudge Warlords code is: ${code}. Valid for 10 minutes.`,
        }),
      });

      if (!smsRes.ok) {
        const err = await smsRes.text();
        console.error("[Auth/Phone] Twilio error:", err);
        return res.status(502).json({ success: false, error: "Failed to send SMS" });
      }

      res.json({ success: true, message: "Verification code sent" });
    } catch (e: any) {
      console.error("[Auth/Phone/Send]", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ── POST /api/auth/phone/verify — Verify SMS code → login ─────────

  app.post("/api/auth/phone/verify", authRateLimit, async (req: Request, res: Response) => {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) {
        return res.status(400).json({ success: false, error: "Phone and code required" });
      }

      // Check stored code
      const codeKey = `phone_code:${phone}`;
      const stored = rateLimitMap.get(codeKey);
      if (!stored || Date.now() > stored.resetAt) {
        return res.status(401).json({ success: false, error: "Code expired. Request a new one." });
      }
      if (stored.count.toString() !== code.toString()) {
        return res.status(401).json({ success: false, error: "Invalid code" });
      }

      // Code valid — consume it
      rateLimitMap.delete(codeKey);

      // Find or create user by phone
      const phoneKey = `phone:${phone}`;
      let [user] = await db.select().from(users).where(eq(users.username, phoneKey)).limit(1);

      if (!user) {
        const grudgeId = generateGrudgeId();
        const dummyPw = await hashPassword(crypto.randomBytes(32).toString("hex"));
        [user] = await db
          .insert(users)
          .values({ username: phoneKey, password: dummyPw, grudgeId })
          .onConflictDoNothing()
          .returning();

        if (!user) {
          [user] = await db.select().from(users).where(eq(users.username, phoneKey)).limit(1);
        }
      }

      if (!user) {
        return res.status(500).json({ success: false, error: "Failed to create phone account" });
      }

      const account = await ensureAccount(user.id);
      const shortPhone = `${phone.slice(0, 3)}***${phone.slice(-4)}`;
      res.json(buildAuthResponse({ ...user, username: shortPhone }, account));
    } catch (e: any) {
      console.error("[Auth/Phone/Verify]", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  console.log(
    `[Auth] Routes registered (session=${JWT_EXPIRES}, launch=${LAUNCH_TTL}): /api/auth/{page,puter,puter-sso,guest,complete-profile,popup-token,refresh,session/exchange,grudge-bridge,wallet,login,register,verify,me,puter-link,discord/callback,google/start,phone/send,phone/verify}`,
  );
}

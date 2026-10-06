import type { CorsOptions, CorsOptionsDelegate, CorsRequest } from "cors";
import { isStudioOrigin, type StudioOriginOpts } from "@shared/fleet/studioOrigins";
import { serverStudioOriginOpts } from "./studioOriginsEnv";

const PUBLIC_READ_PATHS = new Set([
  "/api/health",
  "/grudge-game-bootstrap.js",
  "/grudge-auth-modal.js",
  "/grudge-auth-modal.css",
]);

const ORIGIN_OPTS: StudioOriginOpts = serverStudioOriginOpts();

export function isAllowedOrigin(
  origin: string | undefined,
  opts: StudioOriginOpts = ORIGIN_OPTS,
): boolean {
/**
 * cors.ts — Shared CORS configuration for ALL Grudge backend servers.
 *
 * Single source of truth. Import into index.ts, island-server.ts, and any
 * future Express/Socket.IO service. Keep in sync with:
 *   - client/src/lib/grudgeConfig.ts  (GRUDGE_DOMAINS + GRUDGE_SUBDOMAINS)
 *   - grudge-fleet skill              (CORS Allowlist section)
 *   - Cloudflare Workers CORS headers
 */

// ── Exact-match origins ────────────────────────────────────────────────────────

export const GRUDGE_EXACT_ORIGINS: string[] = [
  // Primary game client
  "https://grudgewarlords.com",
  "https://www.grudgewarlords.com",

  // Studio TLDs
  "https://grudge-studio.com",
  "https://www.grudge-studio.com",
  "https://grudgestudio.org",
  "https://grudgeplatform.io",

  // Puter hosted apps (canonical /gs hub + app launcher)
  "https://puter.com",
  "https://www.puter.com",
  "https://app.puter.com",

  // RTS Grudge 3D client (Vercel)
  "https://rts-grudge.vercel.app",

  // Mine-Loader / Voxel Realms (explicit SPA + edge)
  "https://mine-loader.vercel.app", // legacy Vercel — primary = mine.grudge-studio.com
  "https://mine.grudge-studio.com",

  // Game Studio Tool / Grudge Islands (portal /gst + Vercel satellite)
  "https://grudge-studio-tool.vercel.app",

  // Fleet game clients (explicit until Railway redeploys regex allowlist)
  "https://poker.grudge-studio.com",
  "https://poker.grudge.studio",
  "https://grudge.studio",
  "https://www.grudge.studio",
  "https://metaverse.grudge-studio.com",
  "https://forge.grudge-studio.com",
  "https://play.grudge-studio.com",
  "https://studio.grudge-studio.com",
  "https://client.grudge-studio.com",
  "https://dash.grudge-studio.com",

  // Spawn play + account surfaces (Grudge ID accepts a verified Spawn player)
  "https://www.spawn.co",
  "https://spawn.co",
  "https://play.bigspawn.net",
];

// ── Regex-match origins (subdomains, preview deploys, Puter) ──────────────────

export const GRUDGE_REGEX_ORIGINS: RegExp[] = [
  // All *.grudge-studio.com subdomains (api, id, assets, ai, dash, ws, pvp, etc.)
  /\.grudge-studio\.com$/,
  // Short TLD aliases (poker.grudge.studio, casting.grudge.studio, …)
  /\.grudge\.studio$/,

  // Vercel preview deploys
  /\.vercel\.app$/,

  // Railway preview deploys
  /\.up\.railway\.app$/,

  // Cloudflare Pages / Workers
  /\.pages\.dev$/,
  /\.workers\.dev$/,
  /\.cloudflarepages\.com$/,

  // Puter hosted apps
  /\.puter\.site$/,
  /\.puter\.work$/,

  // Signed static / docs hosts
  /\.github\.io$/,
  /\.netlify\.app$/,
  /\.netlify\.live$/,

  // Grok App Builder live preview — Bearer SSO test, never cookie Domain
  /\.grok-sandbox\.com$/,
];

// ── Combined list for cors() middleware ────────────────────────────────────────

export const GRUDGE_CORS_ORIGINS: (string | RegExp)[] = [
  ...GRUDGE_EXACT_ORIGINS,
  ...GRUDGE_REGEX_ORIGINS,
];

/**
 * Origin checker compatible with the `cors` npm package callback signature.
 * Allows:
 *   1. No origin (server-to-server / curl / health checks)
 *   2. Any http://localhost:* in any environment (dev convenience)
 *   3. Every origin in GRUDGE_CORS_ORIGINS
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return isStudioOrigin(origin, opts);
}

export function isPublicCorsPath(pathname: string | undefined): boolean {
  if (!pathname) return false;
  return PUBLIC_READ_PATHS.has(pathname);
}

const BASE_CORS_OPTIONS: CorsOptions = {
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Session-Token",
    "X-Admin-Mode",
    "X-Spawn-Token",
  ],
};

/**
 * Per-request CORS options. Only an exact allowlisted studio Origin is
 * reflected, and only then is Access-Control-Allow-Credentials sent.
 * Any other Origin gets neither ACAO nor ACAC (and no error is thrown).
 */
export function corsOptionsForOrigin(
  origin: string | undefined,
  opts: StudioOriginOpts = ORIGIN_OPTS,
): CorsOptions {
  if (origin && isStudioOrigin(origin, opts)) {
    return { ...BASE_CORS_OPTIONS, origin, credentials: true };
  }
  return { ...BASE_CORS_OPTIONS, origin: false, credentials: false };
}

/**
 * CORS delegate for Express (`app.use(cors(GRUDGE_CORS_OPTIONS))`).
 * - Allowed studio origins are reflected with credentials.
 * - Disallowed origins are not reflected, get no credentials header, and do not throw.
 * - Known public read-only endpoints may use ACAO "*" without credentials (applyPublicReadCors).
 */
export const GRUDGE_CORS_OPTIONS: CorsOptionsDelegate<CorsRequest> = (req, cb) => {
  const raw = req.headers?.origin;
  const origin = Array.isArray(raw) ? raw[0] : raw;
  cb(null, corsOptionsForOrigin(origin || undefined));
};

/**
 * Optional helper middleware for public endpoints that should be readable
 * cross-origin without credentials.
 */
export function applyPublicReadCors(req: { method: string; path: string }, res: {
  setHeader: (key: string, value: string) => void;
}, next: () => void) {
  if (req.method === "GET" && isPublicCorsPath(req.path)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  next();
}

/**
 * Socket.IO CORS configuration — same strict studio-origin policy.
 */
export const GRUDGE_SOCKETIO_CORS = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean | string) => void) => {
    if (!origin) return cb(null, true);
    if (isAllowedOrigin(origin)) return cb(null, origin);
    return cb(null, false);
  },
  methods: ["GET", "POST"],
  credentials: true,
};

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
];

// ── Regex-match origins (subdomains, preview deploys, Puter) ──────────────────

export const GRUDGE_REGEX_ORIGINS: RegExp[] = [
  // All *.grudge-studio.com subdomains (api, id, assets, ai, dash, ws, pvp, etc.)
  /\.grudge-studio\.com$/,

  // Vercel preview deploys
  /\.vercel\.app$/,

  // Railway preview deploys
  /\.up\.railway\.app$/,

  // Cloudflare Pages
  /\.pages\.dev$/,

  // Puter hosted apps
  /\.puter\.site$/,
  /\.puter\.work$/,
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
  if (origin.startsWith("http://localhost")) return true;
  return GRUDGE_CORS_ORIGINS.some((o) =>
    typeof o === "string" ? o === origin : o.test(origin),
  );
}

/**
 * Pre-built cors options object — drop into `app.use(cors(GRUDGE_CORS_OPTIONS))`.
 */
export const GRUDGE_CORS_OPTIONS = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (isAllowedOrigin(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Session-Token",
    "X-Admin-Mode",
  ],
};

/**
 * Socket.IO compatible CORS config — use in `new Server(httpServer, { cors: GRUDGE_SOCKETIO_CORS })`.
 */
export const GRUDGE_SOCKETIO_CORS = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (isAllowedOrigin(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST"],
  credentials: true,
};

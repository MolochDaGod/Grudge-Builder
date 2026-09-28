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

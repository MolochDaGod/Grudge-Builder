import type { CorsOptions } from "cors";
import { isStudioOrigin } from "@shared/fleet/studioOrigins";
import { serverStudioOriginOpts } from "./studioOriginsEnv";

const PUBLIC_READ_PATHS = new Set([
  "/api/health",
  "/grudge-game-bootstrap.js",
  "/grudge-auth-modal.js",
  "/grudge-auth-modal.css",
]);

const ORIGIN_OPTS = serverStudioOriginOpts();

export function isAllowedOrigin(
  origin: string | undefined,
  opts = ORIGIN_OPTS,
): boolean {
  if (!origin) return true;
  return isStudioOrigin(origin, opts);
}

export function isPublicCorsPath(pathname: string | undefined): boolean {
  if (!pathname) return false;
  return PUBLIC_READ_PATHS.has(pathname);
}

/**
 * CORS options for Express (`app.use(cors(GRUDGE_CORS_OPTIONS))`).
 * - Allowed studio origins are reflected with credentials.
 * - Disallowed origins are not reflected and do not throw errors.
 * - Known public read-only endpoints may use ACAO "*" without credentials.
 */
export const GRUDGE_CORS_OPTIONS: CorsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (isAllowedOrigin(origin)) return cb(null, origin);
    return cb(null, false);
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

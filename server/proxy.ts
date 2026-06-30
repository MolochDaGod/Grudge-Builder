/**
 * Backend Proxy — mirrors Vercel rewrites for local development.
 *
 * In production, vercel.json rewrites handle routing (see @shared/fleet FLEET_VERCEL_REWRITES):
 *   /api/<game-data> → Railway Postgres API (characters, missions, health, …)
 *   /api/game/:path* → Railway /api/:path* (legacy shim)
 *   /api/auth/:path* → id.grudge-studio.com/auth/:path* (after Railway auth exceptions)
 *   /api/assets/:path* → assets.grudge-studio.com/:path*
 *
 * Locally, Express handles /api/island/*, /api/account/*, etc. directly.
 * This proxy catches the external routes that would otherwise 404.
 */
import type { Express, Request, Response } from "express";
import http from "node:http";
import https from "node:https";

interface ProxyRule {
  /** Express route pattern */
  match: string;
  /** Target base URL (no trailing slash) */
  target: string;
  /** How to rewrite the path: 'strip-prefix' removes the match prefix, 'keep' keeps it */
  pathRewrite: "strip-prefix" | "keep";
  /** Path prefix to strip (defaults to match pattern minus wildcard) */
  stripPrefix?: string;
}

/**
 * Proxy rules matching vercel.json rewrites.
 * Only rules for EXTERNAL backends — local Express routes take priority.
 */
/**
 * Routes that are handled LOCALLY by Express and must NOT be proxied.
 * Anything not in this list and not in PROXY_RULES will 404 naturally.
 */
const LOCAL_API_PREFIXES = [
  "/api/health",       // added to server/index.ts
  "/api/auth",         // all auth routes handled locally
  "/api/characters",
  "/api/party",
  "/api/account",
  "/api/island",
  "/api/islands",
  "/api/resources",
  "/api/resource-nodes",
  "/api/crafting",
  "/api/missions",
  "/api/wallet",
  "/api/nfts",
  "/api/island-nfts",
  "/api/admin",
  "/api/races",
  "/api/classes",
  "/api/items",
  "/api/spells",
  "/api/skills",
  "/api/monsters",
  "/api/professions",
  "/api/game",
  "/api/generate-dungeon",
  "/api/harvest",
  "/api/lore",
  "/api/combat",
  "/api/activity",
  "/api/analytics",
  "/api/sprites",
  "/api/object-storage",
  "/api/sheets",
  "/api/maps",
  "/api/launcher",
];

const PROXY_RULES: ProxyRule[] = [
  // ── Asset CDN → Cloudflare R2 (via objectstore worker) ────────────────
  { match: "/api/assets", target: "https://assets.grudge-studio.com", pathRewrite: "strip-prefix", stripPrefix: "/api/assets" },
  // All other /api/* routes are handled locally by Express (auth, characters, etc.)
];

/**
 * Forward an incoming request to a remote backend.
 */
function proxyRequest(req: Request, res: Response, targetUrl: string): void {
  const url = new URL(targetUrl);
  const isHttps = url.protocol === "https:";
  const transport = isHttps ? https : http;

  // Forward relevant headers (include Cloudflare identification headers)
  const headers: Record<string, string> = {};
  for (const key of [
    "authorization", "x-session-token", "content-type", "accept",
    "x-admin-mode", "cf-ray", "cf-connecting-ip", "cf-ipcountry",
    "x-forwarded-proto",
  ]) {
    const val = req.get(key);
    if (val) headers[key] = val;
  }
  headers["host"] = url.host;
  headers["x-forwarded-for"] = req.ip || req.get("cf-connecting-ip") || "127.0.0.1";
  headers["x-grudge-origin"] = "grudge-builder-proxy";

  const options: https.RequestOptions = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: req.method,
    headers,
    timeout: 15000,
  };

  const proxyReq = transport.request(options, (proxyRes) => {
    // Forward status + headers
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    console.error(`[proxy] ${req.method} ${targetUrl} failed:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: "Backend unavailable",
        target: url.origin,
        detail: err.message,
      });
    }
  });

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).json({ error: "Backend timeout", target: url.origin });
    }
  });

  // Forward the request body
  if (req.method !== "GET" && req.method !== "HEAD") {
    if ((req as any).rawBody) {
      proxyReq.write(req.rawBody as Buffer);
      proxyReq.end();
    } else if (req.body && Object.keys(req.body).length > 0) {
      const body = JSON.stringify(req.body);
      proxyReq.setHeader("content-length", Buffer.byteLength(body));
      proxyReq.write(body);
      proxyReq.end();
    } else {
      req.pipe(proxyReq, { end: true });
    }
  } else {
    proxyReq.end();
  }
}

/**
 * Register proxy routes on the Express app.
 * MUST be called AFTER local API routes are registered so local routes take priority.
 */
export function registerBackendProxy(app: Express): void {
  // Skip in production — Vercel rewrites handle this
  if (process.env.NODE_ENV === "production") return;

  for (const rule of PROXY_RULES) {
    const handler = (req: Request, res: Response) => {
      // Never proxy routes that are handled locally
      if (LOCAL_API_PREFIXES.some(p => req.originalUrl === p || req.originalUrl.startsWith(p + "/") || req.originalUrl.startsWith(p + "?"))) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      let targetPath: string;
      if (rule.pathRewrite === "strip-prefix" && rule.stripPrefix) {
        targetPath = req.originalUrl.replace(rule.stripPrefix, "");
        if (!targetPath.startsWith("/")) targetPath = "/" + targetPath;
      } else {
        targetPath = req.originalUrl;
      }

      const targetUrl = rule.target + targetPath;
      console.log(`[proxy] ${req.method} ${req.originalUrl} → ${targetUrl}`);
      proxyRequest(req, res, targetUrl);
    };

    // Register for all HTTP methods
    app.all(`${rule.match}`, handler);
    app.all(`${rule.match}/*`, handler);
  }

  console.log(`[proxy] Registered ${PROXY_RULES.length} backend proxy rules for local dev`);
}

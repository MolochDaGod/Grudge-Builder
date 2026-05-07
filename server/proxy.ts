/**
 * Backend Proxy — mirrors Vercel rewrites for local development.
 *
 * In production, vercel.json rewrites handle routing:
 *   /api/game/:path*   → api.grudge-studio.com/:path*
 *   /api/auth/:path*   → id.grudge-studio.com/auth/:path*
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
const PROXY_RULES: ProxyRule[] = [
  // ── Direct game API routes (match vercel.json explicit rewrites) ────
  // All routes now target id.grudge-studio.com (Railway backend) to match
  // vercel.json — keeps /api/ prefix intact.
  { match: "/api/characters", target: "https://id.grudge-studio.com", pathRewrite: "keep" },
  { match: "/api/professions", target: "https://id.grudge-studio.com", pathRewrite: "keep" },
  { match: "/api/inventory", target: "https://id.grudge-studio.com", pathRewrite: "keep" },
  { match: "/api/nfts", target: "https://id.grudge-studio.com", pathRewrite: "keep" },
  { match: "/api/island-nfts", target: "https://id.grudge-studio.com", pathRewrite: "keep" },
  { match: "/api/wallet", target: "https://id.grudge-studio.com", pathRewrite: "keep" },
  { match: "/api/party", target: "https://id.grudge-studio.com", pathRewrite: "keep" },
  { match: "/api/health", target: "https://id.grudge-studio.com", pathRewrite: "keep" },

  // ── Legacy catch-all: /api/game/* → id.grudge-studio.com/api/* ─────
  {
    match: "/api/game",
    target: "https://id.grudge-studio.com",
    pathRewrite: "strip-prefix",
    stripPrefix: "/api/game",
  },

  // ── Auth routes → id.grudge-studio.com ──────────────────────────────
  // /api/auth/login → id.grudge-studio.com/auth/login (strip /api, keep /auth prefix)
  { match: "/api/auth", target: "https://id.grudge-studio.com", pathRewrite: "strip-prefix", stripPrefix: "/api" },

  // ── Asset & tool routes ────────────────────────────────────────────
  { match: "/api/assets", target: "https://assets.grudge-studio.com", pathRewrite: "strip-prefix", stripPrefix: "/api/assets" },
  { match: "/api/tools", target: "https://id.grudge-studio.com", pathRewrite: "strip-prefix", stripPrefix: "/api" },
  { match: "/api/public", target: "https://id.grudge-studio.com", pathRewrite: "strip-prefix", stripPrefix: "/api" },
];

/**
 * Forward an incoming request to a remote backend.
 */
function proxyRequest(req: Request, res: Response, targetUrl: string): void {
  const url = new URL(targetUrl);
  const isHttps = url.protocol === "https:";
  const transport = isHttps ? https : http;

  // Forward relevant headers
  const headers: Record<string, string> = {};
  for (const key of ["authorization", "x-session-token", "content-type", "accept", "x-admin-mode"]) {
    const val = req.get(key);
    if (val) headers[key] = val;
  }
  headers["host"] = url.host;
  headers["x-forwarded-for"] = req.ip || "127.0.0.1";

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

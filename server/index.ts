import "./instrument"; // Sentry.init() — must run before anything else
import * as Sentry from "@sentry/node";

// ── Crash guard: catch ANY top-level error so Railway logs show the real cause ──
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.message);
  console.error(err.stack);
  Sentry.captureException(err);
  Sentry.flush(2000).finally(() => process.exit(1));
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  Sentry.captureException(reason);
  Sentry.flush(2000).finally(() => process.exit(1));
});

console.log('[boot] Starting grudge-api...');
console.log('[boot] NODE_ENV:', process.env.NODE_ENV);
console.log('[boot] PORT:', process.env.PORT);
console.log('[boot] DATABASE_URL set:', !!process.env.DATABASE_URL);
console.log('[boot] DATABASE_URL length:', (process.env.DATABASE_URL || '').length);
console.log('[boot] RAILWAY_ENVIRONMENT_ID:', process.env.RAILWAY_ENVIRONMENT_ID || 'not set');
console.log('[boot] cwd:', process.cwd());

import dotenv from "dotenv";
// Load .env.local first (gitignored local overrides), then .env as fallback.
// dotenv.config() does NOT override already-set vars, so .env.local wins.
dotenv.config({ path: ".env.local" });
dotenv.config();
import { fileURLToPath } from "url";
import { dirname } from "path";
// import.meta.url is undefined when esbuild bundles to CJS — fall back to cwd
const __filename = import.meta.url ? fileURLToPath(import.meta.url) : '';
const __dirname = __filename ? dirname(__filename) : process.cwd();

console.log('[boot] __dirname resolved to:', __dirname);

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import path from "path";
import cors from "cors";
import { setupColyseus } from "./colyseus/index";
import { registerBackendProxy } from "./proxy";
import { registerSupabaseRoutes } from "./supabase/routes";
import { registerFleetRoutes } from "./fleet/routes";
import { GRUDGE_CORS_OPTIONS } from "./cors";

console.log('[boot] All imports loaded successfully');

const app = express();
const httpServer = createServer(app);

// ── CORS (shared config from server/cors.ts) ─────────────────────────────────
app.use(cors(GRUDGE_CORS_OPTIONS));

// NOTE: Static file serving is registered AFTER API routes (see below).
// This prevents public/index.html from intercepting /api/* requests
// when route registration partially fails.

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ── Body parsing (reduced from 50mb → 5mb default for security) ──────────────
app.use(
  express.json({
    limit: "5mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "5mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// ── Health check (required by Railway / Render load balancers) ───────────────
import { checkDbHealth } from "./db";
// Track route registration status (set by async boot below)
let _routesRegistered = false;

app.get("/api/health", async (_req, res) => {
  const dbOk = await checkDbHealth();
  const mem = process.memoryUsage();
  res.status(200).json({
    status: dbOk && _routesRegistered ? "healthy" : "degraded",
    service: "grudge-api",
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.floor(process.uptime()),
    env: process.env.NODE_ENV || "production",
    database: dbOk ? "connected" : "unreachable",
    routes: _routesRegistered ? "ok" : "FAILED",
    ts: Date.now(),
    memory: { rss: Math.round(mem.rss / 1048576), heap: Math.round(mem.heapUsed / 1048576) },
  });
});

(async () => {
  // ── 1. Register API routes (must come BEFORE static file serving) ────────
  let routesOk = false;
  try {
    await registerRoutes(httpServer, app);
    routesOk = true;
    _routesRegistered = true;
    log('API routes registered successfully');
  } catch (e) {
    log(`API route registration failed: ${(e as Error).message}`, 'error');
    console.error(e);
    // Server continues — health check still works, other routes may partially work
  }

  // ── 2. Colyseus game server ─────────────────────────────────────────────
  try {
    await setupColyseus(httpServer, app);
  } catch (e) {
    log(`Colyseus setup failed: ${(e as Error).message}`, 'error');
    console.error(e);
  }

  // ── 3. Fleet registry + Supabase SDK routes ─────────────────────────────
  try {
    registerFleetRoutes(app);
    registerSupabaseRoutes(app);
    log("Fleet + Supabase routes registered (/api/fleet/*, /api/supabase/*)");
  } catch (e) {
    log(`Fleet/Supabase route registration failed: ${(e as Error).message}`, "error");
  }

  // ── 4. Dev-only proxy for external backends ─────────────────────────────
  registerBackendProxy(app);

  // ── 5. Error handler for API routes ─────────────────────────────────────
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (status >= 500) Sentry.captureException(err); // report server errors
    res.status(status).json({ message });
  });

  // ── 6. API 404 guard — MUST come before static serving ──────────────────
  //    Any /api/* request that wasn't handled by a route gets a JSON 404.
  //    This prevents static/SPA middleware from ever serving HTML for /api/*.
  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({
      error: "API route not found",
      path: _req.originalUrl,
      hint: routesOk
        ? "This endpoint does not exist."
        : "Route registration failed on startup — check Railway logs.",
    });
  });

  // ── 6. Static assets (AFTER API routes so /api/* never gets HTML) ───────
  app.use(express.static(path.resolve(__dirname, "..", "public")));
  app.use(express.static(path.resolve(__dirname, "..", "client", "public")));

  // DiabloWeb sub-app
  app.use("/diabloweb", express.static(path.resolve(__dirname, "..", "diabloweb", "diabloweb-master", "build")));
  app.get("/diabloweb/*", (_req, res) => {
    res.sendFile(path.resolve(__dirname, "..", "diabloweb", "diabloweb-master", "build", "index.html"));
  });

  // ── 7. SPA serving (production) or Vite dev middleware ──────────────────
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    try {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    } catch (e) {
      log(`Vite dev server not available (${(e as Error).message}) — API-only mode`, "warn");
    }
  }

  // ── 8. Fallback root for API-only deploys (Railway) ─────────────────────
  app.get("/", (_req, res) => {
    res.json({
      service: "grudge-api",
      version: process.env.npm_package_version || "1.0.0",
      docs: "/api/health",
      frontend: "https://grudgewarlords.com",
      routes_ok: routesOk,
    });
  });

  // ── 9. Start listening ──────────────────────────────────────────────────
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
      if (!routesOk) {
        log('⚠️  API routes failed to register — only /api/health is available', 'warn');
      }
    },
  );
})();

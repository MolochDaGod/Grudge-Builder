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
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import path from "path";
import cors from "cors";
import { setupColyseus } from "./colyseus/index";
import { registerBackendProxy } from "./proxy";

const app = express();
const httpServer = createServer(app);

// ── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://grudgewarlords.com",
  "https://www.grudgewarlords.com",
  "https://grudge-studio.com",
  "https://www.grudge-studio.com",
  "https://client.grudge-studio.com",
  "https://dash.grudge-studio.com",
  "https://id.grudge-studio.com",
  "https://ai.grudge-studio.com",
  "https://objectstore.grudge-studio.com",
  // Cloudflare Pages (ObjectStore)
  /\.pages\.dev$/,
  // Vercel previews
  /\.vercel\.app$/,
  // Railway previews
  /\.up\.railway\.app$/,
];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow server-to-server (no origin) and localhost in dev
      if (
        !origin ||
        origin.startsWith("http://localhost") ||
        ALLOWED_ORIGINS.some((o) =>
          typeof o === "string" ? o === origin : o.test(origin),
        )
      ) {
        return cb(null, true);
      }
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
  }),
);

// ── Static assets ────────────────────────────────────────────────────────────
app.use(express.static(path.resolve(__dirname, "..", "public")));
app.use(express.static(path.resolve(__dirname, "..", "client", "public")));

// Serve DiabloWeb at /diabloweb
app.use("/diabloweb", express.static(path.resolve(__dirname, "..", "diabloweb", "diabloweb-master", "build")));
app.get("/diabloweb/*", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "..", "diabloweb", "diabloweb-master", "build", "index.html"));
});

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
app.get("/api/health", async (_req, res) => {
  const dbOk = await checkDbHealth();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? "ok" : "degraded",
    service: "grudge-api",
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.floor(process.uptime()),
    env: process.env.NODE_ENV || "production",
    db: dbOk ? "connected" : "unreachable",
    ts: Date.now(),
  });
});

(async () => {
  try {
    await registerRoutes(httpServer, app);
    await setupColyseus(httpServer, app);

    // Register proxy for external backends (Grudge API, auth, assets)
    // Must come AFTER local routes so /api/island/*, /api/account/* are handled locally
    registerBackendProxy(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Setup static serving (production) or Vite dev middleware (development).
    // serveStatic is safe to call even if client dist doesn't exist — it skips gracefully.
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

    // Fallback root for API-only deploys (Railway) — no client bundle present
    app.get("/", (_req, res) => {
      res.json({
        service: "grudge-api",
        version: process.env.npm_package_version || "1.0.0",
        docs: "/api/health",
        frontend: "https://grudgewarlords.com",
      });
    });
  } catch (e) {
    log(`Route registration failed: ${(e as Error).message}`, "error");
    console.error(e);
  }

  // ALWAYS start the server even if route registration partially fails.
  // Health check is registered above and will still work.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();

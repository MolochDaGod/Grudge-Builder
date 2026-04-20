import dotenv from "dotenv";
dotenv.config();
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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
  "https://client.grudge-studio.com",
  "https://dash.grudge-studio.com",
  "https://id.grudge-studio.com",
  "https://ai.grudge-studio.com",
  // Vercel previews
  /\.vercel\.app$/,
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

(async () => {
  await registerRoutes(httpServer, app);
  await setupColyseus(httpServer, app);

  // Register proxy for external backends (Grudge API, auth, assets)
  // Must come AFTER local routes so /api/island/*, /api/account/* are handled locally
  registerBackendProxy(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
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

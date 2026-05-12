import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  // On Railway/backend-only deploys, client dist may not exist — skip gracefully.
  // Vercel serves the frontend; Railway only needs API routes.
  if (!fs.existsSync(distPath) || !fs.existsSync(path.resolve(distPath, "index.html"))) {
    console.log(`[static] No client build at ${distPath} — skipping SPA serving (API-only mode)`);
    return;
  }

  app.use(express.static(distPath));

  // SPA fallback — only for non-API routes
  app.use("*", (req, res, next) => {
    // Never serve HTML for API routes — let them 404 properly
    if (req.originalUrl.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

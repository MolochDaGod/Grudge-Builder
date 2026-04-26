import type { Express, Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  objectStorageClient,
} from "./objectStorage";

/**
 * Routes consumed by the Grudge Dev Tool (Windows tray app) and the
 * scripts/upload-asset-pack.ts CLI uploader.
 *
 * Mounted at /api/objectstore/*. All routes share the auth/admin helpers
 * defined here so this module is self-contained and can be imported from
 * server/routes.ts without leaking internals.
 */

// ---------------------------------------------------------------------------
// Auth helpers (lightweight local copies of the helpers in server/routes.ts —
// kept independent so this file does not create a circular import).
// ---------------------------------------------------------------------------
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "";

interface DevToolPayload {
  userId?: string;
  grudgeId?: string;
  isAdmin?: boolean;
  accountLevel?: "master_admin" | "admin" | "member" | "pleb";
}

function decodeToken(req: Request): DevToolPayload | null {
  const authHeader = req.get("Authorization") || req.get("X-Session-Token");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || null;

  if (!token || !JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as DevToolPayload;
  } catch {
    return null;
  }
}

function getGrudgeId(req: Request): string | null {
  const p = decodeToken(req);
  return p?.grudgeId || p?.userId || null;
}

function isWriter(req: Request): boolean {
  const p = decodeToken(req);
  if (!p) {
    // Dev fallback: X-Admin-Password header for local testing.
    const adminPw = process.env.ADMIN_PASSWORD;
    const headerPw = req.get("X-Admin-Password");
    return !!adminPw && !!headerPw && adminPw === headerPw;
  }
  return (
    p.isAdmin === true ||
    p.accountLevel === "master_admin" ||
    p.accountLevel === "admin"
  );
}

// ---------------------------------------------------------------------------
// Prefix whitelist enforcement.
// ---------------------------------------------------------------------------
const ADMIN_PREFIXES = [
  "asset-packs/",
  "manifests/",
  "shared/",
  "dev/",
];

const USER_PREFIX_PATTERN = /^user-uploads\/([^/]+)\//;

interface PrefixCheck {
  ok: boolean;
  reason?: string;
}

function validatePrefix(req: Request, prefix: string): PrefixCheck {
  if (!prefix || typeof prefix !== "string") {
    return { ok: false, reason: "prefix is required" };
  }
  if (prefix.includes("..") || prefix.startsWith("/")) {
    return { ok: false, reason: "prefix cannot be absolute or contain '..'" };
  }
  if (ADMIN_PREFIXES.some((p) => prefix.startsWith(p))) {
    if (!isWriter(req)) {
      return { ok: false, reason: "admin level required for this prefix" };
    }
    return { ok: true };
  }
  const userMatch = prefix.match(USER_PREFIX_PATTERN);
  if (userMatch) {
    const grudgeId = getGrudgeId(req);
    if (!grudgeId || grudgeId !== userMatch[1]) {
      return {
        ok: false,
        reason: "user-uploads/<grudgeId>/ must match the caller's grudgeId",
      };
    }
    return { ok: true };
  }
  return { ok: false, reason: "prefix not whitelisted" };
}

// ---------------------------------------------------------------------------
// Bucket helpers.
// ---------------------------------------------------------------------------
function getBucket() {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set");
  // PRIVATE_OBJECT_DIR is "/<bucket>/<path>" — pull the bucket name out.
  const parts = dir.replace(/^\/+/, "").split("/");
  const bucketName = parts[0];
  const baseObjectPath = parts.slice(1).join("/");
  return {
    bucket: objectStorageClient.bucket(bucketName),
    bucketName,
    baseObjectPath,
  };
}

function joinObjectPath(base: string, suffix: string): string {
  const left = base.endsWith("/") ? base.slice(0, -1) : base;
  const right = suffix.startsWith("/") ? suffix.slice(1) : suffix;
  return left ? `${left}/${right}` : right;
}

// ---------------------------------------------------------------------------
// Route registration.
// ---------------------------------------------------------------------------
export function registerDevToolObjectStorageRoutes(app: Express): void {
  const svc = new ObjectStorageService();

  /**
   * GET /api/objectstore/list?prefix=&cursor=&limit=
   *
   * Paginated listing of objects under a prefix (relative to PRIVATE_OBJECT_DIR).
   * Returns { items: [{ name, size, contentType, updated }], nextCursor }.
   */
  app.get("/api/objectstore/list", async (req: Request, res: Response) => {
    try {
      const prefix = String(req.query.prefix || "");
      const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
      const limit = Math.min(parseInt(String(req.query.limit || "100"), 10) || 100, 1000);

      // Read access: any authenticated user can list public/asset-packs.
      // Listing user-uploads requires matching grudgeId.
      const userMatch = prefix.match(USER_PREFIX_PATTERN);
      if (userMatch) {
        const grudgeId = getGrudgeId(req);
        if (!grudgeId || grudgeId !== userMatch[1]) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }

      const { bucket, baseObjectPath } = getBucket();
      const fullPrefix = joinObjectPath(baseObjectPath, prefix);

      const [files, nextQuery] = await bucket.getFiles({
        prefix: fullPrefix,
        autoPaginate: false,
        maxResults: limit,
        pageToken: cursor,
      } as any);

      const items = files.map((f: any) => ({
        name: f.name.replace(new RegExp(`^${baseObjectPath}/?`), ""),
        size: Number(f.metadata?.size ?? 0),
        contentType: f.metadata?.contentType ?? "application/octet-stream",
        updated: f.metadata?.updated ?? null,
        md5Hash: f.metadata?.md5Hash ?? null,
      }));

      res.json({
        items,
        nextCursor: (nextQuery as any)?.pageToken ?? null,
        prefix,
        count: items.length,
      });
    } catch (err: any) {
      console.error("[objectstore.list]", err);
      res.status(500).json({ error: err.message || "Failed to list objects" });
    }
  });

  /**
   * GET /api/objectstore/search?q=&category=&pack=
   *
   * Server-side filter against a manifest catalog. Searches the most recent
   * manifest per pack (asset-packs/<pack>/manifest.json) and returns matching
   * entries with their public CDN URLs computed.
   */
  app.get("/api/objectstore/search", async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || "").toLowerCase();
      const category = req.query.category ? String(req.query.category).toLowerCase() : null;
      const packFilter = req.query.pack ? String(req.query.pack) : null;
      const limit = Math.min(parseInt(String(req.query.limit || "200"), 10) || 200, 1000);

      const { bucket, baseObjectPath } = getBucket();

      // Enumerate manifests under asset-packs/*/manifest.json
      const manifestPrefix = joinObjectPath(baseObjectPath, "asset-packs/");
      const [manifestFiles] = await bucket.getFiles({
        prefix: manifestPrefix,
        autoPaginate: false,
        maxResults: 1000,
      } as any);

      const manifests = manifestFiles.filter((f: any) =>
        f.name.endsWith("/manifest.json"),
      );

      const results: any[] = [];
      for (const f of manifests) {
        const packId = f.name
          .replace(new RegExp(`^${baseObjectPath}/?`), "")
          .replace(/^asset-packs\//, "")
          .replace(/\/manifest\.json$/, "");
        if (packFilter && !packId.startsWith(packFilter)) continue;

        try {
          const [data] = await f.download();
          const json = JSON.parse(data.toString("utf8"));
          const entries = Array.isArray(json.entries) ? json.entries : [];
          for (const e of entries) {
            if (category && (e.category || "").toLowerCase() !== category) continue;
            if (q) {
              const haystack = `${e.path || ""} ${e.grudgeUUID || ""} ${e.category || ""}`.toLowerCase();
              if (!haystack.includes(q)) continue;
            }
            results.push({ ...e, packId });
            if (results.length >= limit) break;
          }
        } catch (e) {
          console.warn("[objectstore.search] manifest read failed", f.name, e);
        }
        if (results.length >= limit) break;
      }

      res.json({ count: results.length, items: results });
    } catch (err: any) {
      console.error("[objectstore.search]", err);
      res.status(500).json({ error: err.message || "Failed to search" });
    }
  });

  /**
   * POST /api/objectstore/upload-url
   *
   * Body: { path: "asset-packs/classic64/v0.6/Books/cover.png", contentType, size, sha256? }
   *
   * Validates the path against the prefix whitelist (admin/user) and returns a
   * presigned PUT URL. Path is the *relative* object path under PRIVATE_OBJECT_DIR;
   * the caller does not need to know the bucket name.
   */
  app.post("/api/objectstore/upload-url", async (req: Request, res: Response) => {
    try {
      const { path: targetPath, contentType, size, sha256, allowOverwrite } = req.body || {};

      if (!targetPath || typeof targetPath !== "string") {
        return res.status(400).json({ error: "path is required" });
      }
      const prefix = targetPath.split("/").slice(0, -1).join("/") + "/";
      const check = validatePrefix(req, prefix);
      if (!check.ok) {
        return res.status(403).json({ error: check.reason });
      }

      const { bucket, baseObjectPath } = getBucket();
      const fullObject = joinObjectPath(baseObjectPath, targetPath);

      if (!allowOverwrite) {
        const [exists] = await bucket.file(fullObject).exists();
        if (exists) {
          return res.status(409).json({
            error: "Object already exists",
            objectPath: `/objects/${targetPath}`,
            hint: "Pass allowOverwrite=true to replace.",
          });
        }
      }

      const file = bucket.file(fullObject);
      const [signedUrl] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 900 * 1000,
        contentType: contentType || "application/octet-stream",
      });

      res.json({
        uploadURL: signedUrl,
        objectPath: `/objects/${targetPath}`,
        bucketPath: fullObject,
        ttlSeconds: 900,
        echo: { contentType, size, sha256 },
        uploadId: randomUUID(),
      });
    } catch (err: any) {
      console.error("[objectstore.upload-url]", err);
      res.status(500).json({ error: err.message || "Failed to create upload URL" });
    }
  });

  /**
   * POST /api/objectstore/manifest
   *
   * Body: { packId: "classic64", version: "0.6", entries: [...], meta?: {...} }
   *
   * Writes the JSON catalog to asset-packs/<packId>/manifest.json. Atomic write:
   * goes to manifest.json.tmp first, then copies and deletes the temp.
   */
  app.post("/api/objectstore/manifest", async (req: Request, res: Response) => {
    try {
      if (!isWriter(req)) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const { packId, version, entries, meta } = req.body || {};
      if (!packId || typeof packId !== "string") {
        return res.status(400).json({ error: "packId is required" });
      }
      if (!Array.isArray(entries)) {
        return res.status(400).json({ error: "entries must be an array" });
      }

      const payload = {
        packId,
        version: version || "0.0.0",
        generatedAt: new Date().toISOString(),
        meta: meta || {},
        count: entries.length,
        entries,
      };

      const { bucket, baseObjectPath } = getBucket();
      const finalPath = joinObjectPath(baseObjectPath, `asset-packs/${packId}/manifest.json`);
      const tmpPath = `${finalPath}.tmp`;

      const tmpFile = bucket.file(tmpPath);
      await tmpFile.save(JSON.stringify(payload, null, 2), {
        contentType: "application/json",
        resumable: false,
      });
      await tmpFile.copy(bucket.file(finalPath));
      await tmpFile.delete({ ignoreNotFound: true });

      res.json({
        ok: true,
        packId,
        manifestPath: `/objects/asset-packs/${packId}/manifest.json`,
        count: entries.length,
      });
    } catch (err: any) {
      console.error("[objectstore.manifest]", err);
      res.status(500).json({ error: err.message || "Failed to write manifest" });
    }
  });

  /**
   * GET /api/objectstore/asset/:objectPath(*)
   *
   * Returns either a redirect to the public CDN URL (for public assets) or a
   * short-lived signed GET URL. Lets the dev-tool render previews without
   * needing direct bucket access.
   */
  app.get("/api/objectstore/asset/:objectPath(*)", async (req: Request, res: Response) => {
    try {
      const targetPath = req.params.objectPath;
      if (!targetPath) return res.status(400).json({ error: "objectPath required" });

      // user-uploads gating
      const userMatch = targetPath.match(USER_PREFIX_PATTERN);
      if (userMatch) {
        const grudgeId = getGrudgeId(req);
        if (!grudgeId || grudgeId !== userMatch[1]) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }

      const { bucket, baseObjectPath } = getBucket();
      const fullObject = joinObjectPath(baseObjectPath, targetPath);
      const file = bucket.file(fullObject);
      const [exists] = await file.exists();
      if (!exists) return res.status(404).json({ error: "Not found" });

      const [signedUrl] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 600 * 1000,
      });

      // If the client wants metadata only (HEAD-like), return JSON.
      if (req.query.format === "json") {
        const [metadata] = await file.getMetadata();
        return res.json({
          url: signedUrl,
          ttlSeconds: 600,
          size: Number(metadata.size ?? 0),
          contentType: metadata.contentType ?? null,
          updated: metadata.updated ?? null,
          publicCdn: `https://assets.grudge-studio.com/${targetPath}`,
        });
      }

      res.redirect(302, signedUrl);
    } catch (err: any) {
      if (err instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Not found" });
      }
      console.error("[objectstore.asset]", err);
      res.status(500).json({ error: err.message || "Failed to fetch asset" });
    }
  });
}

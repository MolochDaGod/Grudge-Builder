/**
 * Island 3D build layout — placed props (benches, towers, camps, modular…).
 * Soft API for frontend autosave. Primary store is still localStorage on client;
 * this persists across devices when authenticated.
 *
 * Fail closed: both routes require a valid (non-guest) session.
 * The store key is the authenticated user id — client-supplied accountId is ignored.
 *
 * GET  /api/island/build-layout?islandKey=
 * PATCH /api/island/build-layout  body: BuildLayoutDoc (accountId ignored)
 */
import type { Express, Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { requireAuthFailClosed } from "../failClosedAuth";

interface BuildLayoutDoc {
  version: number;
  updatedAt: number;
  accountId: string;
  islandKey: string;
  seed?: string;
  props: Array<{
    id: string;
    assetId: string;
    x: number;
    y: number;
    z: number;
    rotation: number;
  }>;
}

const memory = new Map<string, BuildLayoutDoc>();

function storeKey(accountId: string, islandKey: string): string {
  return `${accountId || "guest"}::${islandKey || "default"}`;
}

function dataDir(): string {
  const dir = path.join(process.cwd(), ".data", "build-layouts");
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* ignore */
  }
  return dir;
}

function filePath(accountId: string, islandKey: string): string {
  const safe = storeKey(accountId, islandKey).replace(/[^a-zA-Z0-9._-]+/g, "_");
  return path.join(dataDir(), `${safe}.json`);
}

function readDoc(accountId: string, islandKey: string): BuildLayoutDoc | null {
  const k = storeKey(accountId, islandKey);
  const mem = memory.get(k);
  if (mem) return mem;
  try {
    const fp = filePath(accountId, islandKey);
    if (!fs.existsSync(fp)) return null;
    const raw = fs.readFileSync(fp, "utf8");
    const doc = JSON.parse(raw) as BuildLayoutDoc;
    if (!doc?.props) return null;
    memory.set(k, doc);
    return doc;
  } catch {
    return null;
  }
}

function writeDoc(doc: BuildLayoutDoc): void {
  const k = storeKey(doc.accountId, doc.islandKey);
  memory.set(k, doc);
  try {
    fs.writeFileSync(filePath(doc.accountId, doc.islandKey), JSON.stringify(doc), "utf8");
  } catch (e) {
    console.warn("[build-layout] disk write failed", e);
  }
}

export function registerBuildLayoutRoutes(app: Express): void {
  app.get("/api/island/build-layout", requireAuthFailClosed, (req: Request, res: Response) => {
    const accountId = String((req as { userId?: string }).userId || "");
    if (!accountId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const islandKey = String(req.query.islandKey || "default");
    const doc = readDoc(accountId, islandKey);
    if (!doc) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(doc);
  });

  app.patch("/api/island/build-layout", requireAuthFailClosed, (req: Request, res: Response) => {
    const accountId = String((req as { userId?: string }).userId || "");
    if (!accountId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const body = req.body as Partial<BuildLayoutDoc>;
    if (!body || !Array.isArray(body.props)) {
      res.status(400).json({ error: "props array required" });
      return;
    }
    const doc: BuildLayoutDoc = {
      version: 1,
      updatedAt: Date.now(),
      accountId,
      islandKey: String(body.islandKey || "default"),
      seed: body.seed,
      props: body.props.map((p) => ({
        id: String(p.id || `prop_${Math.random().toString(36).slice(2, 8)}`),
        assetId: String(p.assetId),
        x: Number(p.x) || 0,
        y: Number(p.y) || 0,
        z: Number(p.z) || 0,
        rotation: Number(p.rotation) || 0,
      })),
    };
    writeDoc(doc);
    res.json({ ok: true, count: doc.props.length, updatedAt: doc.updatedAt });
  });
}

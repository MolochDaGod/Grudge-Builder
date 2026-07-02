import type { Express, Request, Response } from "express";
import {
  FLEET_SERVICES,
  FLEET_URLS,
  FLEET_VERCEL_REWRITES,
  FLEET_GAME_DATA_API_PREFIXES,
  FLEET_STORAGE,
  FLEET_CLIENT_ENV,
  CROSSMINT_COLLECTIONS,
  FLEET_VIDEO_CATALOG,
} from "@shared/fleet";

/**
 * Fleet registry API — any Grudge app can GET /api/fleet/manifest
 * to discover services without hardcoding URLs.
 */
export function registerFleetRoutes(app: Express) {
  app.get("/api/fleet/manifest", (_req: Request, res: Response) => {
    res.json({
      version: 1,
      generated: "shared/fleet/manifest.ts",
      urls: FLEET_URLS,
      services: FLEET_SERVICES,
      storage: FLEET_STORAGE,
      clientEnv: FLEET_CLIENT_ENV,
      gameDataApiPrefixes: FLEET_GAME_DATA_API_PREFIXES,
      crossmint: CROSSMINT_COLLECTIONS,
      rewrites: FLEET_VERCEL_REWRITES,
    });
  });

  app.get("/api/videos/catalog", (_req: Request, res: Response) => {
    res.json({
      version: 1,
      cdn: FLEET_URLS.assets,
      catalog: FLEET_VIDEO_CATALOG,
    });
  });

  app.get("/api/fleet/health", async (_req: Request, res: Response) => {
    const probes = [
      { id: "game-data", url: `${FLEET_URLS.gameData}/api/health` },
      { id: "assets", url: `${FLEET_URLS.assets}/` },
      { id: "auth", url: `${FLEET_URLS.gameData}/api/auth/verify` },
      { id: "objectstore", url: `${FLEET_URLS.objectStore}/master-items.json` },
    ];

    const results = await Promise.all(
      probes.map(async (p) => {
        try {
          const r = await fetch(p.url, {
            method: p.id === "assets" ? "HEAD" : "GET",
            signal: AbortSignal.timeout(8000),
          });
          const ct = r.headers.get("content-type") ?? "";
          const htmlLeak = ct.includes("text/html") && p.id !== "assets";
          return { ...p, ok: r.ok && !htmlLeak, status: r.status, contentType: ct.split(";")[0] };
        } catch (e: unknown) {
          return { ...p, ok: false, detail: e instanceof Error ? e.message : "unreachable" };
        }
      }),
    );

    const ok = results.filter((r) => r.ok).length;
    res.json({
      score: Math.round((ok / results.length) * 100),
      probes: results,
      layers: FLEET_SERVICES.map((s) => ({ id: s.id, role: s.role, url: s.url })),
    });
  });
}
/**
 * Production map publish API
 *
 * POST /api/production/map/publish
 *   Body: { studioJson, gmapJson, manifestJson?, triggerDeploy?: boolean }
 *   Auth: Authorization: Bearer <PRODUCTION_PUBLISH_TOKEN>
 *         or X-Production-Token: <token>
 *         or requireAuth + admin in production if token unset (dev open)
 *
 * GET  /api/production/map
 *   Returns current published package URLs + version
 *
 * Writes to:
 *   public/production/
 *   public/maps/grudge-open-world/
 *   client/public/maps/grudge-open-world/
 *   production/  (repo root package)
 */
import type { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const FILES = {
  studio: 'grudge-open-world.studio.json',
  gmap: 'grudge-open-world.gmap.json',
  manifest: 'manifest.json',
} as const;

function projectRoot(): string {
  // server runs from repo root or dist/
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'shared'))) return cwd;
  if (fs.existsSync(path.join(cwd, '..', 'shared'))) return path.join(cwd, '..');
  return cwd;
}

function publishDirs(root: string): string[] {
  return [
    path.join(root, 'public', 'production'),
    path.join(root, 'public', 'maps', 'grudge-open-world'),
    path.join(root, 'client', 'public', 'maps', 'grudge-open-world'),
    path.join(root, 'client', 'public', 'production'),
    path.join(root, 'production'),
  ];
}

function authorizePublish(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const expected = process.env.PRODUCTION_PUBLISH_TOKEN || process.env.MAP_PUBLISH_TOKEN;
  const header =
    (req.headers['x-production-token'] as string | undefined) ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined);

  if (expected) {
    if (header !== expected) {
      return { ok: false, status: 401, error: 'Invalid or missing PRODUCTION_PUBLISH_TOKEN' };
    }
    return { ok: true };
  }

  // Dev fallback: allow local without token
  if (process.env.NODE_ENV !== 'production') {
    return { ok: true };
  }

  return {
    ok: false,
    status: 503,
    error: 'PRODUCTION_PUBLISH_TOKEN not configured on server',
  };
}

function writePackage(
  root: string,
  studio: string,
  gmap: string,
  manifest: string,
): { dirs: string[]; bytes: Record<string, number> } {
  const dirs = publishDirs(root);
  const written: string[] = [];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, FILES.studio), studio, 'utf8');
    fs.writeFileSync(path.join(dir, FILES.gmap), gmap, 'utf8');
    fs.writeFileSync(path.join(dir, FILES.manifest), manifest, 'utf8');
    written.push(dir);
  }
  return {
    dirs: written,
    bytes: {
      studio: Buffer.byteLength(studio, 'utf8'),
      gmap: Buffer.byteLength(gmap, 'utf8'),
      manifest: Buffer.byteLength(manifest, 'utf8'),
    },
  };
}

async function triggerDeployHook(): Promise<{ triggered: boolean; status?: number; error?: string }> {
  const hook =
    process.env.PRODUCTION_DEPLOY_HOOK ||
    process.env.VERCEL_DEPLOY_HOOK ||
    process.env.FORGE_DEPLOY_HOOK;
  if (!hook) return { triggered: false };
  try {
    const res = await fetch(hook, { method: 'POST' });
    return { triggered: true, status: res.status };
  } catch (e) {
    return { triggered: false, error: (e as Error).message };
  }
}

function stringifyBody(v: unknown): string {
  if (typeof v === 'string') return v;
  return JSON.stringify(v, null, 2);
}

export function registerProductionMapPublishRoutes(app: Express): void {
  /**
   * Per-sector production content (biomes, heightmaps, seeds, monsters, NPCs,
   * events, harvest, animals). Client and Colyseus use the same seed namespaces.
   */
  app.get('/api/production/dossiers', async (_req, res) => {
    try {
      const root = projectRoot();
      const staticPath = path.join(root, 'client', 'public', 'production', 'dossiers-content.json');
      const publicPath = path.join(root, 'public', 'production', 'dossiers-content.json');
      const p = [staticPath, publicPath].find((f) => fs.existsSync(f));
      if (p) {
        res.type('application/json').send(fs.readFileSync(p, 'utf8'));
        return;
      }
      const { buildDossiersManifest } = await import('../../shared/definitions/sectorDossiers');
      res.json(buildDossiersManifest());
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/production/dossiers/:sectorId', async (req, res) => {
    try {
      const { getSectorDossier } = await import('../../shared/definitions/sectorDossiers');
      const { getSectorProductionContent } = await import(
        '../../shared/definitions/sectorProductionContent'
      );
      const d = getSectorDossier(req.params.sectorId);
      if (!d) return res.status(404).json({ error: `No dossier: ${req.params.sectorId}` });
      const prod = getSectorProductionContent(d.sectorId);
      res.json({
        dossier: d,
        production: prod
          ? {
              ecosystemId: prod.ecosystemId,
              harvest: prod.harvest,
              wildlife: prod.wildlife,
              monsters: prod.monsters,
              events: prod.events,
              terrain: prod.terrain,
            }
          : null,
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/production/sectors', async (_req, res) => {
    try {
      const root = projectRoot();
      const staticPath = path.join(root, 'client', 'public', 'production', 'sectors-content.json');
      const publicPath = path.join(root, 'public', 'production', 'sectors-content.json');
      const p = [staticPath, publicPath].find((f) => fs.existsSync(f));
      if (p) {
        res.type('application/json').send(fs.readFileSync(p, 'utf8'));
        return;
      }
      // Live build from SSOT when static file not yet published
      const { buildSectorProductionManifest } = await import(
        '../../shared/definitions/sectorProductionContent'
      );
      const worldSeed =
        (typeof _req.query.worldSeed === 'string' && _req.query.worldSeed) || 'grudge-world-1';
      res.json(buildSectorProductionManifest(worldSeed));
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/production/sectors/:sectorId', async (req, res) => {
    try {
      const { getSectorProductionContent, resolveSectorSeeds, DEFAULT_WORLD_SEED } = await import(
        '../../shared/definitions/sectorProductionContent'
      );
      const sectorId = req.params.sectorId;
      const content = getSectorProductionContent(sectorId);
      if (!content) {
        return res.status(404).json({ error: `Unknown sector: ${sectorId}` });
      }
      const worldSeed =
        (typeof req.query.worldSeed === 'string' && req.query.worldSeed) || DEFAULT_WORLD_SEED;
      const seeds = resolveSectorSeeds(sectorId, worldSeed);
      const { playUrl: playUrlFn, ...rest } = content;
      res.json({
        ...rest,
        seeds,
        playUrl: playUrlFn(worldSeed),
        island3dUrl: `/island-3d?mode=zone&sector=${sectorId}&worldSeed=${encodeURIComponent(worldSeed)}`,
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/production/map', (_req, res) => {
    const root = projectRoot();
    const candidates = [
      path.join(root, 'public', 'production', FILES.manifest),
      path.join(root, 'production', FILES.manifest),
      path.join(root, 'public', 'maps', 'grudge-open-world', FILES.manifest),
    ];
    const manifestPath = candidates.find((p) => fs.existsSync(p));
    let manifest: Record<string, unknown> | null = null;
    if (manifestPath) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch {
        manifest = null;
      }
    }
    res.json({
      id: 'grudge-open-world',
      published: !!manifest,
      manifest,
      urls: {
        studio: '/production/grudge-open-world.studio.json',
        gmap: '/production/grudge-open-world.gmap.json',
        gmapMaps: '/maps/grudge-open-world/grudge-open-world.gmap.json',
        manifest: '/production/manifest.json',
        sectors: '/production/sectors-content.json',
        sectorsApi: '/api/production/sectors',
      },
      cdn: {
        geometryGltf: 'https://assets.grudge-studio.com/models/lobby/pirate-islands/scene.gltf',
        geometryGlb: 'https://assets.grudge-studio.com/models/lobby/pirate-islands/scene.glb',
        eventFalls: 'https://assets.grudge-studio.com/models/biomes/ethereal/event-falls.glb',
        hiddenMountain:
          'https://assets.grudge-studio.com/models/mountains/mountains-hidden-city.glb',
      },
      publish: {
        method: 'POST',
        path: '/api/production/map/publish',
        auth: 'Bearer PRODUCTION_PUBLISH_TOKEN or X-Production-Token',
      },
    });
  });

  app.get('/api/production/map/gmap', (_req, res) => {
    const root = projectRoot();
    const candidates = [
      path.join(root, 'public', 'production', FILES.gmap),
      path.join(root, 'production', FILES.gmap),
      path.join(root, 'public', 'maps', 'grudge-open-world', FILES.gmap),
      path.join(root, 'client', 'public', 'maps', 'grudge-open-world', FILES.gmap),
    ];
    const p = candidates.find((f) => fs.existsSync(f));
    if (!p) return res.status(404).json({ error: 'gmap not published yet' });
    res.type('application/json').send(fs.readFileSync(p, 'utf8'));
  });

  app.post('/api/production/map/publish', async (req: Request, res: Response) => {
    const auth = authorizePublish(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    try {
      const body = req.body ?? {};
      const studioRaw = body.studioJson ?? body.studio;
      const gmapRaw = body.gmapJson ?? body.gmap;
      if (!studioRaw || !gmapRaw) {
        return res.status(400).json({
          error: 'studioJson and gmapJson required',
        });
      }

      const studio = stringifyBody(studioRaw);
      const gmap = stringifyBody(gmapRaw);

      // Validate JSON
      let gmapObj: any;
      let studioObj: any;
      try {
        gmapObj = typeof gmapRaw === 'string' ? JSON.parse(gmap) : gmapRaw;
        studioObj = typeof studioRaw === 'string' ? JSON.parse(studio) : studioRaw;
      } catch {
        return res.status(400).json({ error: 'Invalid JSON in studioJson or gmapJson' });
      }

      if (!gmapObj.entities && !studioObj.entities) {
        return res.status(400).json({ error: 'Package must include entities' });
      }

      const manifestObj = body.manifestJson
        ? typeof body.manifestJson === 'string'
          ? JSON.parse(body.manifestJson)
          : body.manifestJson
        : {
            id: gmapObj.id ?? 'grudge-open-world',
            version: gmapObj.version ?? '1.0.1',
            schema: gmapObj.schema ?? 2,
            name: gmapObj.name ?? studioObj.name,
            geometry: gmapObj.geometry,
            forge: gmapObj.forge,
            files: FILES,
            systems: gmapObj.systems,
            entityCount: Array.isArray(gmapObj.entities)
              ? gmapObj.entities.length
              : studioObj.entities?.length ?? 0,
            islandCount: Array.isArray(gmapObj.islands) ? gmapObj.islands.length : 0,
            builtAt: new Date().toISOString(),
            source: 'forge-publish-api',
            publishedBy: (req as any).userId ?? 'token',
          };

      const manifest = JSON.stringify(manifestObj, null, 2);
      const root = projectRoot();
      const result = writePackage(root, studio, gmap, manifest);

      let deploy: { triggered: boolean; status?: number; error?: string } = {
        triggered: false,
      };
      if (body.triggerDeploy !== false) {
        deploy = await triggerDeployHook();
      }

      console.info(
        `[production-map] published ${manifestObj.id} entities=${manifestObj.entityCount} dirs=${result.dirs.length}`,
      );

      res.json({
        ok: true,
        id: manifestObj.id,
        version: manifestObj.version,
        entityCount: manifestObj.entityCount,
        written: result.dirs,
        bytes: result.bytes,
        urls: {
          studio: '/production/grudge-open-world.studio.json',
          gmap: '/production/grudge-open-world.gmap.json',
          apiGmap: '/api/production/map/gmap',
        },
        deploy,
      });
    } catch (e) {
      console.error('[production-map] publish failed', e);
      res.status(500).json({ error: (e as Error).message });
    }
  });

  console.log(
    '[production-map] routes: GET/POST /api/production/map[/publish] GET /api/production/map/gmap',
  );
}

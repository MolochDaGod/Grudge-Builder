/**
 * REST multiplayer bootstrap — status, session, asset preload hints.
 * Complements Colyseus WS (matchmake + rooms).
 */
import type { Express, Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import { FLEET_URLS } from '../../shared/fleet/manifest';
import { SYNC_PROTOCOL_VERSION, NETWORK_RATES } from '../../shared/network/syncProtocol';
import { getSectorProductionContent } from '../../shared/definitions/sectorProductionContent';
import { RACE_GRUDGE6 } from '../../shared/fleet/character';

const DEFINED_ROOMS = [
  'tutorial',
  'shipwreck',
  'lobby',
  'dungeon',
  'sector',
  'world',
  'town',
  'home_island',
] as const;

export function registerMultiplayerRoutes(app: Express): void {
  /** Lightweight health for load balancers / client preflight */
  app.get('/api/multiplayer/status', async (_req: Request, res: Response) => {
    let activeRooms = 0;
    try {
      const rooms = await matchMaker.query({});
      activeRooms = rooms?.length ?? 0;
    } catch {
      /* matchMaker may not be ready in some boots */
    }
    res.json({
      ok: true,
      matchMakerReady: matchMaker.state === matchMaker.MatchMakerState.READY,
      matchMakerState: String(matchMaker.state),
      definedRooms: [...DEFINED_ROOMS],
      activeRooms,
      protocolVersion: SYNC_PROTOCOL_VERSION,
      colyseus: FLEET_URLS.colyseus,
      gameData: FLEET_URLS.gameData,
      recommendedSendHz: NETWORK_RATES.moveHz,
      ts: Date.now(),
    });
  });

  /**
   * Session bootstrap for NetworkManager:
   * Colyseus URL, rates, CDN, sector race preload list.
   */
  app.get('/api/multiplayer/session', (req: Request, res: Response) => {
    const sectorId =
      typeof req.query.sector === 'string' ? req.query.sector : undefined;
    const prod = sectorId ? getSectorProductionContent(sectorId) : null;

    // Preload: all playable races + sector landmark paths
    const races = Object.keys(RACE_GRUDGE6);
    const landmarks =
      prod?.events.landmarks.map((l) => l.cdnKey || l.localPath).filter(Boolean) ?? [];

    res.setHeader('Cache-Control', 'public, max-age=30');
    res.json({
      protocolVersion: SYNC_PROTOCOL_VERSION,
      colyseusUrl: FLEET_URLS.colyseus,
      rooms: [...DEFINED_ROOMS],
      matchMakerReady: matchMaker.state === matchMaker.MatchMakerState.READY,
      recommendedSendHz: NETWORK_RATES.moveHz,
      animHeartbeatHz: NETWORK_RATES.animHeartbeatHz,
      remoteLerp: NETWORK_RATES.remoteLerp,
      maxConcurrentAssetLoads: NETWORK_RATES.maxConcurrentAssetLoads,
      assetCdn: FLEET_URLS.assets,
      sectorId: sectorId || null,
      sectorPreload: races,
      landmarkPreload: landmarks,
      ecosystemId: prod?.ecosystemId ?? null,
      bestPractices: [
        'Preload race GLBs before join (AssetLoadQueue priority 0 local, 1 remote)',
        'Send move at 15 Hz; anim on change + 2 Hz heartbeat',
        'Interpolate remote positions; never teleport remotes every packet',
        'Buildings via schema Map + place_building message',
        'VFX as reliable one-shot messages (not schema spam)',
        'Chat server-authoritative broadcast only',
        'CDN assets with long cache; clone GLTF from shared loader cache',
      ],
    });
  });

  /** Asset manifest for a sector (client may prefetch) */
  app.get('/api/multiplayer/assets/:sectorId', (req: Request, res: Response) => {
    const sectorId = req.params.sectorId;
    const prod = getSectorProductionContent(sectorId);
    if (!prod) {
      res.status(404).json({ error: `unknown sector ${sectorId}` });
      return;
    }
    const races = Object.entries(RACE_GRUDGE6).map(([raceId, r]) => ({
      raceId,
      glb: r.cdnPath,
    }));
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json({
      sectorId,
      ecosystemId: prod.ecosystemId,
      groundPbr: prod.harvest.groundPbr,
      landmarks: prod.events.landmarks,
      races,
      animals: prod.wildlife.animals,
      treeCdn: prod.harvest.treeCdn?.slice?.(0, 8) ?? [],
    });
  });
}

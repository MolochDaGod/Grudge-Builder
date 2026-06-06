/**
 * mapAdmin.ts
 * ─────────────────────────────────────────────────────────────
 * REST API routes mounted on the Express app alongside Colyseus.
 *
 * Public endpoints (for Three.js map client):
 *   GET /api/map/world       — full 9-sector snapshot (biomes, difficulty, player counts)
 *   GET /api/map/sector/:id  — detailed sector state (terrain, NPCs, claims, buildings)
 *   GET /api/map/tide        — current tide height
 *
 * Auth endpoints (for logged-in players):
 *   GET /api/map/me          — player's position, allies, claims, buildings
 *   GET /api/map/claims      — all claim flags across all sectors
 *
 * Admin endpoints (for Forge editor / admin map):
 *   GET  /api/admin/players         — all online players with positions
 *   GET  /api/admin/player/:uuid    — search player by UUID/accountId
 *   POST /api/admin/teleport        — teleport player to coordinates
 *   POST /api/admin/sector/:id/edit — push terrain/NPC edits to live sector
 *   GET  /api/admin/sector/:id/export — export full sector state as JSON
 *   POST /api/admin/sector/import     — import sector state from JSON
 * ─────────────────────────────────────────────────────────────
 */

import type { Express, Request, Response } from "express";
import { matchMaker } from "colyseus";
import {
  SECTOR_LORE,
  HERO_ROSTER,
  FACTIONS,
  getTideHeight,
  getHeroesForSector,
  type SectorPosition,
} from "@shared/definitions/lore";
import { SECTOR_IDS, type SectorId } from "../schemas/SectorState";

// ── Auth middleware stub (replace with real Grudge ID auth) ──────

function requireAuth(req: Request, res: Response, next: Function) {
  const token = req.headers["x-auth-token"] || req.query.token;
  if (!token) return res.status(401).json({ error: "Auth required" });
  // TODO: validate token against grudge-id service
  (req as any).accountId = token; // placeholder
  next();
}

function requireAdmin(req: Request, res: Response, next: Function) {
  const token = req.headers["x-admin-token"] || req.query.admin;
  if (!token) return res.status(403).json({ error: "Admin required" });
  // TODO: validate admin role against grudge-id service
  next();
}

// ── Route setup ─────────────────────────────────────────────────

export function setupMapRoutes(app: Express) {

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC: World map snapshot
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /api/map/world
   * Returns all 9 sectors with lore data, live player counts, and tide.
   * Used by the Three.js overhead map on initial load.
   */
  app.get("/api/map/world", async (_req, res) => {
    const sectors: Record<string, any> = {};

    for (const id of SECTOR_IDS) {
      const lore = SECTOR_LORE[id as SectorPosition];
      const heroes = getHeroesForSector(id as SectorPosition);

      // Try to get live room data
      let playerCount = 0;
      let enemyCount = 0;
      try {
        const rooms = await matchMaker.query({ name: "sector", metadata: { sectorId: id } });
        if (rooms.length > 0) {
          playerCount = rooms[0].clients || 0;
        }
      } catch {}

      sectors[id] = {
        sectorId: id,
        name: lore?.name || id,
        subtitle: lore?.subtitle || "",
        biome: lore?.biome || "neutral",
        difficulty: lore?.difficulty || 1,
        description: lore?.description || "",
        controllingFaction: lore?.controllingFaction || null,
        hasVendors: lore?.hasVendors || false,
        hasDockyards: lore?.hasDockyards || false,
        specialFeatures: lore?.specialFeatures || [],
        heroes: heroes.map(h => ({ id: h.id, name: h.name, title: h.title, factionId: h.factionId, level: h.level })),
        playerCount,
        enemyCount,
      };
    }

    res.json({
      sectors,
      tideHeight: getTideHeight(Date.now()),
      serverTime: Date.now(),
      factions: FACTIONS,
    });
  });

  /**
   * GET /api/map/sector/:id
   * Detailed sector data for zoomed-in view.
   */
  app.get("/api/map/sector/:id", async (req, res) => {
    const sectorId = req.params.id.toUpperCase() as SectorId;
    const lore = SECTOR_LORE[sectorId as SectorPosition];
    if (!lore) return res.status(404).json({ error: `Unknown sector: ${sectorId}` });

    const heroes = getHeroesForSector(sectorId as SectorPosition);

    // Get live room state if sector is active
    let liveState: any = null;
    try {
      const rooms = await matchMaker.query({ name: "sector", metadata: { sectorId } });
      if (rooms.length > 0) {
        liveState = {
          roomId: rooms[0].roomId,
          clients: rooms[0].clients,
          active: true,
        };
      }
    } catch {}

    res.json({
      ...lore,
      heroes: heroes.map(h => ({
        id: h.id, name: h.name, title: h.title,
        factionId: h.factionId, raceId: h.raceId,
        classId: h.classId, level: h.level,
      })),
      liveState,
      tideHeight: getTideHeight(Date.now()),
    });
  });

  /**
   * GET /api/map/tide
   * Current tide height — lightweight poll for client sync.
   */
  app.get("/api/map/tide", (_req, res) => {
    res.json({
      tideHeight: getTideHeight(Date.now()),
      serverTime: Date.now(),
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // AUTH: Player-specific map data
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /api/map/me
   * Returns the authenticated player's position, current sector, allies, claims.
   */
  app.get("/api/map/me", requireAuth, async (req, res) => {
    const accountId = (req as any).accountId;
    // TODO: query Colyseus rooms for this player's session
    // For now, return structure the client expects
    res.json({
      accountId,
      currentSector: null,
      position: null,
      allies: [],
      claims: [],
      buildings: [],
      homeIsland: { seed: 0, buildingCount: 0 },
    });
  });

  /**
   * GET /api/map/claims
   * All active claim flags across all sectors.
   */
  app.get("/api/map/claims", async (_req, res) => {
    // TODO: aggregate claim data from active SectorRooms
    res.json({ claims: [] });
  });

  // ═══════════════════════════════════════════════════════════════
  // ADMIN: Forge editor / admin map
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /api/admin/players
   * All online players across all rooms with positions.
   */
  app.get("/api/admin/players", requireAdmin, async (_req, res) => {
    try {
      const rooms = await matchMaker.query({ name: "sector" });
      const players: any[] = [];

      for (const room of rooms) {
        const sectorId = room.metadata?.sectorId;
        // Room clients count — detailed player data requires room inspection
        players.push({
          sectorId,
          roomId: room.roomId,
          clientCount: room.clients || 0,
        });
      }

      res.json({ players, totalOnline: players.reduce((s, p) => s + p.clientCount, 0) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/admin/player/:uuid
   * Search for a player by accountId/UUID.
   */
  app.get("/api/admin/player/:uuid", requireAdmin, async (req, res) => {
    const uuid = req.params.uuid;
    // TODO: search across active Colyseus rooms for matching accountId
    // This requires iterating room states or maintaining a global player registry
    res.json({
      accountId: uuid,
      found: false,
      currentSector: null,
      position: null,
      message: "Player registry not yet implemented — search across rooms TBD",
    });
  });

  /**
   * POST /api/admin/teleport
   * Teleport a player to specific coordinates or sector.
   * Body: { accountId, targetSector, x?, y?, z? }
   */
  app.post("/api/admin/teleport", requireAdmin, async (req, res) => {
    const { accountId, targetSector, x, y, z } = req.body;
    if (!accountId || !targetSector) {
      return res.status(400).json({ error: "accountId and targetSector required" });
    }
    // TODO: find player's current room, remove them, place in target sector room at coords
    res.json({
      ok: true,
      message: `Teleport queued: ${accountId} → ${targetSector} (${x ?? 0}, ${y ?? 0}, ${z ?? 0})`,
    });
  });

  /**
   * GET /api/admin/sector/:id/export
   * Export full sector state as JSON (terrain, NPCs, claims, buildings, nodes).
   */
  app.get("/api/admin/sector/:id/export", requireAdmin, async (req, res) => {
    const sectorId = req.params.id.toUpperCase();
    const lore = SECTOR_LORE[sectorId as SectorPosition];
    if (!lore) return res.status(404).json({ error: `Unknown sector: ${sectorId}` });

    // TODO: pull live state from active SectorRoom if running
    const exported = {
      version: 1,
      exportedAt: new Date().toISOString(),
      sectorId,
      lore,
      heroes: getHeroesForSector(sectorId as SectorPosition),
      terrain: null,     // TODO: heightmap data
      npcs: [],          // TODO: NPC placements
      claimFlags: [],    // TODO: active claims
      buildings: [],     // TODO: player structures
      harvestNodes: [],  // TODO: resource nodes
    };

    res.setHeader("Content-Disposition", `attachment; filename=sector_${sectorId}.json`);
    res.json(exported);
  });

  /**
   * POST /api/admin/sector/import
   * Import a sector state from JSON.
   * Body: full sector export JSON
   */
  app.post("/api/admin/sector/import", requireAdmin, async (req, res) => {
    const data = req.body;
    if (!data?.sectorId) return res.status(400).json({ error: "Invalid sector data" });
    // TODO: validate and push to SectorRoom or store for next room creation
    res.json({ ok: true, message: `Sector ${data.sectorId} import queued` });
  });

  /**
   * POST /api/admin/sector/:id/edit
   * Push live edits to a running SectorRoom (terrain, NPC placement, etc.)
   * Used by the Forge editor for real-time preview.
   */
  app.post("/api/admin/sector/:id/edit", requireAdmin, async (req, res) => {
    const sectorId = req.params.id.toUpperCase();
    const edits = req.body;
    // TODO: find active SectorRoom and broadcast edits to it
    res.json({ ok: true, message: `Edits pushed to ${sectorId}`, edits });
  });

  console.log("[mapAdmin] Map + admin routes registered");
}

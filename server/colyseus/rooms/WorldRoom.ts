/**
 * WorldRoom.ts
 * ─────────────────────────────────────────────────────────────
 * Colyseus room for the 3×3 world overview.
 * Every connected client joins this room first to see the
 * sector grid, player populations, and zone types.
 *
 * Responsibilities:
 *   - Maintain a live summary of all 9 sectors
 *   - Poll active SectorRooms for player/enemy counts
 *   - Handle enter_sector requests (tell client which room to join)
 *   - Cross-game portal: characters from warlords, rts, tactical
 *     all enter through this single WorldRoom
 *
 * Tick rate: 2/sec (lightweight overview, not gameplay)
 * ─────────────────────────────────────────────────────────────
 */

import { Room, Client, matchMaker } from "colyseus";
import {
  WorldState,
  SectorSummary,
  SECTOR_IDS,
  SECTOR_BIOMES,
  type SectorId,
} from "../schemas/SectorState";
import {
  SECTOR_LORE,
  getTideHeight,
  type SectorPosition,
} from "@shared/definitions/lore";
import { sectorHasTown, getTownForSector } from "@shared/definitions/factionTowns";

// ── Join Options ────────────────────────────────────────────────

interface WorldJoinOptions {
  accountId?: string;
  characterId?: string;
  characterName?: string;
  heroClass?: string;
  heroRace?: string;
  faction?: string;
  level?: number;
  sourceGame?: string; // warlords | rts | tactical
}

// ── Connected player tracking (not synced to state) ─────────────

interface WorldClient {
  sessionId: string;
  accountId: string;
  characterName: string;
  sourceGame: string;
  currentSector: SectorId | null;
}

// ── WorldRoom ───────────────────────────────────────────────────

export class WorldRoom extends Room<WorldState> {
  maxClients = 200;
  private clients_: Map<string, WorldClient> = new Map();
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  // ── Lifecycle ───────────────────────────────────────────────

  onCreate(options: any) {
    const state = new WorldState();
    state.ownerId = options.ownerId || "";
    state.homeIslandSeed = options.homeIslandSeed || 0;

    // Initialize all 9 sector summaries from canonical lore
    for (const sectorId of SECTOR_IDS) {
      const lore = SECTOR_LORE[sectorId as SectorPosition];
      const summary = new SectorSummary();
      summary.sectorId = sectorId;
      summary.biome = lore?.biome || SECTOR_BIOMES[sectorId];
      summary.zoneType = lore?.controllingFaction ? "faction_controlled" : "contested";
      summary.difficulty = lore?.difficulty || 1;
      summary.playerCount = 0;
      summary.enemyCount = 0;
      summary.active = false;
      state.sectors.set(sectorId, summary);
    }

    this.setState(state);

    // Lightweight tick — update tide + summaries
    this.setSimulationInterval(() => {
      this.state.tick++;
      this.state.tideHeight = getTideHeight(Date.now());
    }, 500); // 2/sec

    // Poll active SectorRooms every 5s for live counts
    this.pollInterval = setInterval(() => this.pollSectorRooms(), 5000);

    // ── Message handlers ──────────────────────────────────────

    // Client wants to enter a sector
    this.onMessage("enter_sector", async (client, data: {
      sectorId: SectorId;
    }) => {
      await this.handleEnterSector(client, data.sectorId);
    });

    // Client wants the full sector list (one-shot, useful on connect)
    this.onMessage("get_sectors", (client) => {
      const sectors: Record<string, any> = {};
      this.state.sectors.forEach((s, id) => {
        sectors[id] = {
          sectorId: s.sectorId,
          biome: s.biome,
          zoneType: s.zoneType,
          difficulty: s.difficulty,
          playerCount: s.playerCount,
          enemyCount: s.enemyCount,
          active: s.active,
        };
      });
      client.send("sectors_list", sectors);
    });

    // Client wants to enter a town in a sector
    this.onMessage("enter_town", async (client, data: {
      sectorId: SectorId;
    }) => {
      await this.handleEnterTown(client, data.sectorId);
    });

    // Chat (world-wide)
    this.onMessage("world_chat", (client, data: { text: string }) => {
      const wc = this.clients_.get(client.sessionId);
      if (!wc) return;
      this.broadcast("world_chat", {
        senderId: client.sessionId,
        senderName: wc.characterName,
        sourceGame: wc.sourceGame,
        text: String(data.text ?? "").slice(0, 200),
        timestamp: Date.now(),
      });
    });

    console.log("[WorldRoom] Created — 9 sectors initialized");
  }

  // ── Player Join ─────────────────────────────────────────────

  onJoin(client: Client, options: WorldJoinOptions) {
    const wc: WorldClient = {
      sessionId: client.sessionId,
      accountId: options.accountId || "",
      characterName: options.characterName || "Hero",
      sourceGame: options.sourceGame || "warlords",
      currentSector: null,
    };
    this.clients_.set(client.sessionId, wc);

    this.state.totalPlayers = this.clients_.size;

    console.log(
      `[WorldRoom] ${wc.characterName} connected (${wc.sourceGame}) — ` +
      `${this.clients_.size} in world`
    );
  }

  // ── Player Leave ────────────────────────────────────────────

  onLeave(client: Client) {
    const wc = this.clients_.get(client.sessionId);
    this.clients_.delete(client.sessionId);
    this.state.totalPlayers = this.clients_.size;

    console.log(
      `[WorldRoom] ${wc?.characterName || "Unknown"} disconnected — ` +
      `${this.clients_.size} in world`
    );
  }

  // ── Dispose ─────────────────────────────────────────────────

  onDispose() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    console.log("[WorldRoom] Disposed");
  }

  // ── Enter Sector ────────────────────────────────────────────
  //
  // When a client requests a sector, we find or create the
  // SectorRoom for that sector and send back the roomId so the
  // client can join it directly via Colyseus matchmaker.

  private async handleEnterSector(client: Client, sectorId: SectorId) {
    const wc = this.clients_.get(client.sessionId);
    if (!wc) return;

    if (!SECTOR_IDS.includes(sectorId)) {
      client.send("enter_sector_error", { error: `Unknown sector: ${sectorId}` });
      return;
    }

    try {
      // Find existing room for this sector, or create one
      const rooms = await matchMaker.query({ name: "sector", metadata: { sectorId } });
      let roomId: string;

      if (rooms.length > 0) {
        // Join existing
        const reservation = await matchMaker.joinById(rooms[0].roomId, {
          sectorId,
          accountId: wc.accountId,
          characterName: wc.characterName,
          sourceGame: wc.sourceGame,
        });
        roomId = rooms[0].roomId;
      } else {
        // Create new SectorRoom
        const room = await matchMaker.createRoom("sector", {
          sectorId,
          zoneType: sectorId === "CENTER" ? "home" : "wild",
          difficulty: this.defaultDifficulty(sectorId),
        });
        roomId = room.roomId;
      }

      wc.currentSector = sectorId;

      // Update summary
      const summary = this.state.sectors.get(sectorId);
      if (summary) summary.active = true;

      // Send room connection info to client
      client.send("enter_sector_ready", {
        sectorId,
        roomId,
        biome: SECTOR_BIOMES[sectorId],
        difficulty: this.defaultDifficulty(sectorId),
        // Client uses this to call colyseus.joinById(roomId, options)
      });

      console.log(
        `[WorldRoom] ${wc.characterName} → sector ${sectorId} (room ${roomId})`
      );
    } catch (err: any) {
      console.error(`[WorldRoom] Failed to enter sector ${sectorId}:`, err.message);
      client.send("enter_sector_error", { error: err.message });
    }
  }

  // ── Poll SectorRooms ────────────────────────────────────────

  private async pollSectorRooms() {
    try {
      const rooms = await matchMaker.query({ name: "sector" });
      const activeSectors = new Set<string>();

      for (const room of rooms) {
        const sid = room.metadata?.sectorId as string;
        if (!sid) continue;
        activeSectors.add(sid);

        const summary = this.state.sectors.get(sid);
        if (summary) {
          summary.playerCount = room.clients || 0;
          summary.active = true;
        }
      }

      // Mark inactive sectors
      this.state.sectors.forEach((summary, id) => {
        if (!activeSectors.has(id)) {
          summary.playerCount = 0;
          summary.enemyCount = 0;
          summary.active = false;
        }
      });

      // Update total
      let total = 0;
      this.state.sectors.forEach((s) => { total += s.playerCount; });
      this.state.totalPlayers = this.clients_.size;
    } catch {
      // matchMaker query can fail during shutdown
    }
  }

  // ── Enter Town ──────────────────────────────────────────────
  //
  // When a client requests a town, we find or create the TownRoom
  // for the sector and send back the roomId.

  private async handleEnterTown(client: Client, sectorId: SectorId) {
    const wc = this.clients_.get(client.sessionId);
    if (!wc) return;

    if (!sectorHasTown(sectorId as SectorPosition)) {
      client.send("enter_town_error", { error: `No town in sector: ${sectorId}` });
      return;
    }

    const town = getTownForSector(sectorId as SectorPosition);
    if (!town) {
      client.send("enter_town_error", { error: `Town definition missing for: ${sectorId}` });
      return;
    }

    try {
      // Find existing TownRoom for this sector, or create one
      const rooms = await matchMaker.query({ name: "town", metadata: { sectorId } });
      let roomId: string;

      if (rooms.length > 0) {
        roomId = rooms[0].roomId;
      } else {
        const room = await matchMaker.createRoom("town", { sectorId });
        roomId = room.roomId;
      }

      wc.currentSector = sectorId;

      client.send("enter_town_ready", {
        sectorId,
        roomId,
        townId: town.id,
        townName: town.name,
        factionId: town.factionId,
      });

      console.log(
        `[WorldRoom] ${wc.characterName} → town ${town.name} (room ${roomId})`
      );
    } catch (err: any) {
      console.error(`[WorldRoom] Failed to enter town in ${sectorId}:`, err.message);
      client.send("enter_town_error", { error: err.message });
    }
  }

  // ── Default difficulty per sector ───────────────────────────

  private defaultDifficulty(sectorId: SectorId): number {
    const lore = SECTOR_LORE[sectorId as SectorPosition];
    return lore?.difficulty ?? 1;
  }
}

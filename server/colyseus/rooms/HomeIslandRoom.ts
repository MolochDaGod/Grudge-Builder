/**
 * HomeIslandRoom.ts
 * ─────────────────────────────────────────────────────────────
 * Per-account home island instance. Each player gets a unique
 * procedurally generated island based on their Grudge ID seed.
 *
 * Features:
 *   - Auto-harvest: assigned heroes gather resources on timers
 *   - Building system: place structures from crafting output
 *   - Visitors: other players can dock and visit (read-only)
 *   - Persistent: island state saved to DB (home_islands table)
 *   - Tide cycle synced with world
 *
 * Tick rate: 5/sec (idle simulation, not combat-heavy)
 * Max clients: 6 (owner + 5 visitors)
 * ─────────────────────────────────────────────────────────────
 */

import { Room, Client } from "colyseus";
import {
  HomeIslandState,
  SectorPlayer,
  HarvestNode,
  PlacedBuilding,
  getTideHeight,
} from "../schemas/SectorState";
import { db, SANDBOX_MODE } from "../../db";

// ── Join Options ─────────────────────────────────────────────────

interface HomeIslandJoinOptions {
  accountId: string;
  islandUUID?: string;
  islandSeed?: number;
  characterName?: string;
  heroClass?: string;
  heroRace?: string;
  faction?: string;
  level?: number;
  baseModelId?: string;
  equippedWeaponType?: string;
  isVisitor?: boolean; // true if visiting someone else's island
}

// ── Constants ────────────────────────────────────────────────────

const TICK_RATE = 5;
const ISLAND_SIZE = 400;
const AUTO_HARVEST_INTERVAL_MS = 30_000; // 30s per harvest cycle
const NODE_RESPAWN_MS = 120_000;         // 2 min respawn
const SAVE_INTERVAL_MS = 60_000;         // save to DB every 60s
const MAX_HARVEST_NODES = 20;
const MAX_VISITORS = 5;

// Resource types per node
const RESOURCE_TYPES = ["forest", "mining", "fishing", "herbalism"];

// ── HomeIslandRoom ───────────────────────────────────────────────

export class HomeIslandRoom extends Room<HomeIslandState> {
  maxClients = 1 + MAX_VISITORS; // owner + visitors
  private ownerId: string = "";
  private autoHarvestInterval: ReturnType<typeof setInterval> | null = null;
  private saveInterval: ReturnType<typeof setInterval> | null = null;
  private harvestedResources: Record<string, number> = {};

  onCreate(options: HomeIslandJoinOptions) {
    this.ownerId = options.accountId;

    const state = new HomeIslandState();
    state.accountId = options.accountId;
    state.islandUUID = options.islandUUID || options.accountId;
    state.islandSeed = options.islandSeed || this.hashSeed(options.islandUUID || options.accountId);
    state.dockBuilt = true;
    this.setState(state);

    this.setMetadata({
      accountId: options.accountId,
      islandUUID: state.islandUUID,
      ownerName: options.characterName || "Unknown",
    });

    // Seed harvest nodes procedurally from island seed
    this.seedHarvestNodes(state.islandSeed);

    // Load saved state from DB
    this.loadFromDB();

    // Simulation tick
    this.setSimulationInterval(() => {
      state.tick++;
      state.tideHeight = getTideHeight(Date.now());
      this.updateNodeRespawns();
    }, 1000 / TICK_RATE);

    // Auto-harvest timer: heroes assigned to this island gather resources
    this.autoHarvestInterval = setInterval(() => {
      this.runAutoHarvest();
    }, AUTO_HARVEST_INTERVAL_MS);

    // Periodic save to DB
    this.saveInterval = setInterval(() => {
      this.saveToDB();
    }, SAVE_INTERVAL_MS);

    // ── Message Handlers ──────────────────────────────────────

    // Movement
    this.onMessage("move", (client, data: { x: number; y: number; z: number; facing: number; state: string }) => {
      const player = state.players.get(client.sessionId);
      if (!player) return;
      player.x = data.x;
      player.y = data.y;
      player.z = data.z;
      player.facing = data.facing;
      player.state = data.state;
    });

    // Manual harvest (owner only)
    this.onMessage("harvest", (client, data: { nodeId: string; professionId: string }) => {
      if (!this.isOwner(client)) return;
      const node = state.harvestNodes.get(data.nodeId);
      if (!node || node.depleted) return;

      node.depleted = true;
      node.respawnAt = Date.now() + NODE_RESPAWN_MS;

      const resource = node.resourceType;
      this.harvestedResources[resource] = (this.harvestedResources[resource] || 0) + 1;

      this.broadcast("harvest_complete", {
        nodeId: data.nodeId,
        resource,
        quantity: 1,
        gatheredBy: client.sessionId,
      });
    });

    // Place building (owner only) — synced via PlacedBuilding schema
    this.onMessage("place_building", (client, data: {
      id: string; assetId: string; x: number; y: number; z: number; rotation: number;
    }) => {
      if (!this.isOwner(client)) return;
      const player = state.players.get(client.sessionId);
      const building = new PlacedBuilding();
      building.id = data.id;
      building.assetId = data.assetId;
      building.ownerId = client.sessionId;
      building.ownerName = player?.characterName || "Owner";
      building.x = data.x;
      building.y = data.y;
      building.z = data.z;
      building.rotation = data.rotation;
      state.buildings.set(building.id, building);
      state.buildingCount = state.buildings.size;
    });

    // Remove building (owner only)
    this.onMessage("remove_building", (client, data: { id: string }) => {
      if (!this.isOwner(client)) return;
      const building = state.buildings.get(data.id);
      if (!building) return;
      state.buildings.delete(data.id);
      state.buildingCount = state.buildings.size;
    });

    // Get harvested resources
    this.onMessage("get_resources", (client) => {
      client.send("resources", this.harvestedResources);
    });

    // Leave island (back to world)
    this.onMessage("leave_island", (client) => {
      client.send("island_exit", { sectorId: "CENTER" });
    });

    // Chat
    this.onMessage("chat", (client, data: { text: string }) => {
      const player = state.players.get(client.sessionId);
      if (!player) return;
      this.broadcast("chat", {
        senderId: client.sessionId,
        senderName: player.characterName || "Islander",
        text: String(data.text ?? "").slice(0, 200),
        timestamp: Date.now(),
      });
    });

    console.log(
      `[HomeIslandRoom] Created for account ${state.accountId} ` +
      `(seed: ${state.islandSeed}, UUID: ${state.islandUUID})`
    );
  }

  onJoin(client: Client, options: HomeIslandJoinOptions) {
    const isVisitor = options.isVisitor || (options.accountId !== this.ownerId);

    // Enforce visitor limit
    if (isVisitor && this.state.players.size >= this.maxClients) {
      client.send("island_full", { error: "Island is full" });
      client.leave();
      return;
    }

    const player = new SectorPlayer();
    player.id = client.sessionId;
    player.accountId = options.accountId || "";
    player.characterName = options.characterName || "Visitor";
    player.heroClass = options.heroClass || "warrior";
    player.heroRace = options.heroRace || "human";
    player.faction = options.faction || "";
    player.level = options.level || 1;
    player.baseModelId = options.baseModelId || options.heroRace || "human";
    player.equippedWeaponType = options.equippedWeaponType || "sword-shield";

    // Spawn at dock
    player.x = 0;
    player.y = 2;
    player.z = ISLAND_SIZE * 0.4;

    this.state.players.set(client.sessionId, player);

    console.log(
      `[HomeIslandRoom] ${player.characterName} ${isVisitor ? "visiting" : "entered own"} island — ` +
      `${this.state.players.size} on island`
    );
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);

    // If owner leaves, save state
    if (player?.accountId === this.ownerId) {
      this.saveToDB();
    }

    console.log(
      `[HomeIslandRoom] ${player?.characterName || "Unknown"} left — ` +
      `${this.state.players.size} remaining`
    );
  }

  onDispose() {
    if (this.autoHarvestInterval) clearInterval(this.autoHarvestInterval);
    if (this.saveInterval) clearInterval(this.saveInterval);
    this.saveToDB();
    console.log(`[HomeIslandRoom] Disposed (account: ${this.ownerId})`);
  }

  // ── Helpers ────────────────────────────────────────────────────

  private isOwner(client: Client): boolean {
    const player = this.state.players.get(client.sessionId);
    return player?.accountId === this.ownerId;
  }

  private hashSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // ── Procedural node seeding ────────────────────────────────────

  private seedHarvestNodes(seed: number): void {
    // Deterministic RNG from seed
    let rng = seed;
    const next = () => { rng = (rng * 16807 + 0) % 2147483647; return rng / 2147483647; };

    for (let i = 0; i < MAX_HARVEST_NODES; i++) {
      const node = new HarvestNode();
      node.id = `node_${i}`;
      node.resourceType = RESOURCE_TYPES[Math.floor(next() * RESOURCE_TYPES.length)];
      // Place within island bounds, avoiding center (buildings area)
      const angle = next() * Math.PI * 2;
      const dist = 30 + next() * (ISLAND_SIZE * 0.35);
      node.x = Math.cos(angle) * dist;
      node.z = Math.sin(angle) * dist;
      node.depleted = false;
      this.state.harvestNodes.set(node.id, node);
    }
  }

  // ── Node respawn ───────────────────────────────────────────────

  private updateNodeRespawns(): void {
    if (this.state.tick % (TICK_RATE * 10) !== 0) return; // check every 10s
    const now = Date.now();
    this.state.harvestNodes.forEach((node) => {
      if (node.depleted && node.respawnAt > 0 && now >= node.respawnAt) {
        node.depleted = false;
        node.respawnAt = 0;
      }
    });
  }

  // ── Auto-harvest (idle gathering) ──────────────────────────────

  private runAutoHarvest(): void {
    // Count non-depleted nodes by type
    const available: Record<string, string[]> = {};
    this.state.harvestNodes.forEach((node) => {
      if (!node.depleted) {
        if (!available[node.resourceType]) available[node.resourceType] = [];
        available[node.resourceType].push(node.id);
      }
    });

    // Auto-harvest one random node (simulates an assigned hero gathering)
    const types = Object.keys(available);
    if (types.length === 0) return;

    const type = types[Math.floor(Math.random() * types.length)];
    const nodeIds = available[type];
    if (!nodeIds || nodeIds.length === 0) return;

    const nodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    const node = this.state.harvestNodes.get(nodeId);
    if (!node) return;

    node.depleted = true;
    node.respawnAt = Date.now() + NODE_RESPAWN_MS;

    this.harvestedResources[type] = (this.harvestedResources[type] || 0) + 1;

    this.broadcast("auto_harvest", {
      nodeId,
      resource: type,
      quantity: 1,
      total: this.harvestedResources[type],
    });
  }

  // ── DB persistence ─────────────────────────────────────────────

  private async loadFromDB(): Promise<void> {
    if (SANDBOX_MODE || !db) return;
    try {
      const { homeIslands } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await db.select().from(homeIslands).where(eq(homeIslands.accountId, this.ownerId)).limit(1);
      if (rows.length > 0) {
        const saved = rows[0].state as Record<string, any>;
        if (saved?.harvestedResources) {
          this.harvestedResources = saved.harvestedResources;
        }
        if (saved?.buildingCount !== undefined) {
          this.state.buildingCount = saved.buildingCount;
        }
        console.log(`[HomeIslandRoom] Loaded saved state from DB`);
      }
    } catch (err) {
      console.warn(`[HomeIslandRoom] DB load failed:`, err);
    }
  }

  private async saveToDB(): Promise<void> {
    if (SANDBOX_MODE || !db) return;
    try {
      const { homeIslands } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const stateData = {
        harvestedResources: this.harvestedResources,
        buildingCount: this.state.buildingCount,
        savedAt: Date.now(),
      };

      // Upsert
      const existing = await db.select({ id: homeIslands.id })
        .from(homeIslands)
        .where(eq(homeIslands.accountId, this.ownerId))
        .limit(1);

      if (existing.length > 0) {
        await db.update(homeIslands)
          .set({ state: stateData, updatedAt: Date.now() })
          .where(eq(homeIslands.accountId, this.ownerId));
      } else {
        await db.insert(homeIslands).values({
          accountId: this.ownerId,
          seed: this.state.islandUUID || this.ownerId,
          name: "Home Island",
          state: stateData,
        });
      }
    } catch (err) {
      console.warn(`[HomeIslandRoom] DB save failed:`, err);
    }
  }
}

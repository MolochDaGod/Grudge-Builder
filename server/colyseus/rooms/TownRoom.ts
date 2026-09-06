import { authenticateGameJoin } from '../gameAuth';
/**
 * TownRoom.ts
 * ─────────────────────────────────────────────────────────────
 * Colyseus room for faction town instances.
 *
 * Towns are social/merchant hubs — no combat, low tick rate (5 Hz).
 * Handles: player presence, NPC interaction locks, merchant trades,
 * interior transitions, and town-local chat.
 *
 * One TownRoom per town (shared by all players in that town).
 * ─────────────────────────────────────────────────────────────
 */

import { Room, Client } from "colyseus";
import { Schema, MapSchema, type } from "@colyseus/schema";
import { getTownForSector, type FactionTown } from "@shared/definitions/factionTowns";
import type { SectorPosition } from "@shared/definitions/lore";
import { HarvestNode } from "../schemas/SectorState";

// ── State Schemas ────────────────────────────────────────────

class TownPlayer extends Schema {
  @type("string") id: string = "";
  @type("string") accountId: string = "";
  @type("string") characterName: string = "";
  @type("string") faction: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") facing: number = 0;
  @type("string") state: string = "idle"; // idle | walking | interacting
  /** NPC ID currently being interacted with (empty = none) */
  @type("string") interactingWith: string = "";
}

class TownNPCState extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("string") role: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  /** Session ID of the player currently interacting (empty = available) */
  @type("string") lockedBy: string = "";
}

class TownState extends Schema {
  @type("string") townId: string = "";
  @type("string") factionId: string = "";
  @type("string") sectorId: string = "";
  @type("number") tick: number = 0;
  @type({ map: TownPlayer }) players = new MapSchema<TownPlayer>();
  @type({ map: TownNPCState }) npcs = new MapSchema<TownNPCState>();
  @type({ map: HarvestNode }) harvestNodes = new MapSchema<HarvestNode>();
}

// ── Join Options ─────────────────────────────────────────────

interface TownJoinOptions {
  sectorId: string;
  accountId?: string;
  characterName?: string;
  faction?: string;
  sourceGame?: string;
}

// ── TownRoom ─────────────────────────────────────────────────

const TICK_RATE = 5; // 5 Hz — towns are low-activity

export class TownRoom extends Room<{ state: TownState }> {
  async onAuth(client: Client, options: any, context: any) {
    const identity = await authenticateGameJoin(context?.token, options, true);
    Object.assign(options, identity.join);
    return identity;
  }

  maxClients = 100;
  private townDef: FactionTown | null = null;

  onCreate(options: TownJoinOptions) {
    const sectorId = (options.sectorId || "NW") as SectorPosition;
    this.townDef = getTownForSector(sectorId);

    const state = new TownState();
    state.townId = this.townDef?.id || `town_${sectorId}`;
    state.factionId = this.townDef?.factionId || "";
    state.sectorId = sectorId;
    this.setState(state);

    this.setMetadata({
      townId: state.townId,
      sectorId,
      factionId: state.factionId,
      townName: this.townDef?.name || "Unknown Town",
    });

    // Seed NPC state from town definition
    if (this.townDef) {
      for (const npc of this.townDef.npcs) {
        const sp = this.townDef.spawnPoints.find(s => s.id === npc.spawnPointId);
        const npcState = new TownNPCState();
        npcState.id = npc.id;
        npcState.name = npc.name;
        npcState.role = npc.role;
        npcState.x = sp?.position[0] ?? 0;
        npcState.y = sp?.position[1] ?? 0;
        npcState.z = sp?.position[2] ?? 0;
        this.state.npcs.set(npc.id, npcState);
      }
    }

    // Seed town harvest nodes (barrels, crates, herb patches in market area)
    this.seedTownHarvestNodes();

    // Low-frequency tick — also updates NPC patrol positions
    this.setSimulationInterval((delta) => {
      this.state.tick++;
      this.updateNPCPositions(delta);
      this.updateHarvestRespawns();
    }, 1000 / TICK_RATE);

    // ── Message Handlers ─────────────────────────────────────

    // Movement
    this.onMessage("move", (client, data: { x: number; y: number; z: number; facing: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.x = data.x;
      player.y = data.y;
      player.z = data.z;
      player.facing = data.facing;
      player.state = "walking";
    });

    // Stop moving
    this.onMessage("stop", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.state = "idle";
    });

    // Interact with NPC (merchant, quest giver, etc.)
    this.onMessage("interact", (client, data: { npcId: string }) => {
      const player = this.state.players.get(client.sessionId);
      const npc = this.state.npcs.get(data.npcId);
      if (!player || !npc) return;

      // Check if NPC is already locked by another player
      if (npc.lockedBy && npc.lockedBy !== client.sessionId) {
        client.send("interact_error", { npcId: data.npcId, error: "NPC is busy" });
        return;
      }

      // Lock the NPC
      npc.lockedBy = client.sessionId;
      player.interactingWith = data.npcId;
      player.state = "interacting";

      // Send NPC data to client
      const npcDef = this.townDef?.npcs.find(n => n.id === data.npcId);
      client.send("interact_start", {
        npcId: data.npcId,
        npcName: npc.name,
        npcRole: npc.role,
        dialogueSetId: npcDef?.dialogueSetId || null,
        heroId: npcDef?.heroId || null,
      });
    });

    // End interaction
    this.onMessage("interact_end", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (player.interactingWith) {
        const npc = this.state.npcs.get(player.interactingWith);
        if (npc && npc.lockedBy === client.sessionId) {
          npc.lockedBy = "";
        }
        player.interactingWith = "";
      }
      player.state = "idle";
    });

    // Enter building interior
    this.onMessage("enter_interior", (client, data: { interiorId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const interior = this.townDef?.interiors.find(i => i.id === data.interiorId);
      if (!interior) {
        client.send("interior_error", { error: "Unknown interior" });
        return;
      }

      client.send("interior_enter", {
        interiorId: interior.id,
        label: interior.label,
        modelPath: interior.modelPath,
        modelScale: interior.modelScale,
        modelOffset: interior.modelOffset,
        spawnPosition: interior.interiorSpawn,
      });

      player.state = "interacting";
    });

    // Exit interior
    this.onMessage("exit_interior", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.state = "idle";
      client.send("interior_exit", { townId: state.townId });
    });

    // Town chat
    this.onMessage("chat", (client, data: { text: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      this.broadcast("chat", {
        senderId: client.sessionId,
        senderName: player.characterName || "Unknown",
        text: String(data.text ?? "").slice(0, 200),
        timestamp: Date.now(),
      });
    });

    // Harvest town node
    this.onMessage("harvest", (client, data: { nodeId: string }) => {
      const node = this.state.harvestNodes.get(data.nodeId);
      if (!node || node.depleted) return;

      node.depleted = true;
      node.respawnAt = Date.now() + 60_000; // 60s respawn

      const player = this.state.players.get(client.sessionId);
      this.broadcast("harvest_complete", {
        nodeId: data.nodeId,
        resource: node.resourceType,
        quantity: 1,
        gatheredBy: player?.characterName || "Unknown",
      });
    });

    // Leave town (back to sector)
    this.onMessage("leave_town", (client) => {
      client.send("town_exit", { sectorId: state.sectorId });
    });

    console.log(
      `[TownRoom] Created: ${this.townDef?.name || sectorId} ` +
      `(${state.factionId}, ${this.townDef?.npcs.length || 0} NPCs, ` +
      `${this.state.harvestNodes.size} nodes)`
    );
  }

  onJoin(client: Client, options: TownJoinOptions) {
    const player = new TownPlayer();
    player.id = client.sessionId;
    player.accountId = options.accountId || "";
    player.characterName = options.characterName || "Traveler";
    player.faction = options.faction || "";

    // Spawn at first player spawn point
    const spawn = this.townDef?.spawnPoints.find(sp => sp.category === "playerSpawn");
    if (spawn) {
      player.x = spawn.position[0];
      player.y = spawn.position[1];
      player.z = spawn.position[2];
      player.facing = spawn.facing;
    }

    this.state.players.set(client.sessionId, player);

    console.log(
      `[TownRoom:${this.state.townId}] ${player.characterName} entered — ` +
      `${this.state.players.size} in town`
    );
  }

  async onLeave(client: Client, consented?: number) {
    const player = this.state.players.get(client.sessionId);
    const { leaveWithReconnect } = await import("../reconnect");

    await leaveWithReconnect(this, client, consented, () => {
      if (player?.interactingWith) {
        const npc = this.state.npcs.get(player.interactingWith);
        if (npc && npc.lockedBy === client.sessionId) {
          npc.lockedBy = "";
        }
      }
      this.state.players.delete(client.sessionId);
      console.log(
        `[TownRoom:${this.state.townId}] ${player?.characterName || "Unknown"} left — ` +
          `${this.state.players.size} remaining`,
      );
    });
  }

  onDispose() {
    console.log(`[TownRoom:${this.state.townId}] Disposed`);
  }

  // ── Town harvest nodes ──────────────────────────────────────

  private seedTownHarvestNodes(): void {
    if (!this.townDef) return;

    // Place harvestable barrels, crates, and herb patches in the market area
    const townNodes = [
      { id: 'town_barrel_1', type: 'forest',  x: -10, z: 8 },
      { id: 'town_barrel_2', type: 'forest',  x: 14,  z: 12 },
      { id: 'town_crate_1',  type: 'mining',  x: -8,  z: -8 },
      { id: 'town_crate_2',  type: 'mining',  x: 18,  z: -5 },
      { id: 'town_herb_1',   type: 'herbalism', x: -20, z: -15 },
      { id: 'town_herb_2',   type: 'herbalism', x: 22,  z: -18 },
    ];

    for (const n of townNodes) {
      const node = new HarvestNode();
      node.id = n.id;
      node.resourceType = n.type;
      node.x = n.x;
      node.z = n.z;
      node.depleted = false;
      node.respawnAt = 0;
      this.state.harvestNodes.set(n.id, node);
    }
  }

  // ── NPC patrol position updates (server-authoritative) ─────

  private updateNPCPositions(delta: number): void {
    if (!this.townDef) return;

    for (const npcDef of this.townDef.npcs) {
      if (!npcDef.patrolPath || npcDef.patrolPath.length === 0) continue;

      const npcState = this.state.npcs.get(npcDef.id);
      if (!npcState || npcState.lockedBy) continue; // don't move locked NPCs

      // Simple server-side patrol: move toward current waypoint
      const path = npcDef.patrolPath;
      const speed = 3.0;
      const dt = delta / 1000;

      // Use tick-based waypoint index (deterministic across server restarts)
      const cycleLength = path.length * 200; // ~200 ticks per waypoint at 5Hz
      const phase = this.state.tick % cycleLength;
      const waypointIndex = Math.floor(phase / 200) % path.length;
      const target = path[waypointIndex];

      const dx = target[0] - npcState.x;
      const dz = target[2] - npcState.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.5) {
        const step = Math.min(speed * dt, dist);
        npcState.x += (dx / dist) * step;
        npcState.z += (dz / dist) * step;
      }
    }
  }

  // ── Harvest respawn ────────────────────────────────────────

  private updateHarvestRespawns(): void {
    if (this.state.tick % 10 !== 0) return; // check every 2 seconds
    const now = Date.now();
    this.state.harvestNodes.forEach((node) => {
      if (node.depleted && node.respawnAt > 0 && now >= node.respawnAt) {
        node.depleted = false;
        node.respawnAt = 0;
      }
    });
  }
}

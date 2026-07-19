/**
 * SectorRoom.ts
 * ─────────────────────────────────────────────────────────────
 * Colyseus room for a single sector in the 3×3 world grid.
 * Ports island-server.ts gameplay (movement, combat, harvesting)
 * into Colyseus authoritative state sync.
 *
 * One SectorRoom instance per active sector. Clients join when
 * they enter a sector and leave when they transition out.
 *
 * Tick rate: 20/sec (matching island-server.ts intervals)
 * ─────────────────────────────────────────────────────────────
 */

import { Room, Client } from "colyseus";
import {
  SectorState,
  SectorPlayer,
  SectorEnemy,
  HarvestNode,
  PlacedBuilding,
  SECTOR_BIOMES,
  SECTOR_GRID,
  type SectorId,
  type ChatMessage,
} from "../schemas/SectorState";
import {
  SECTOR_LORE,
  FACTIONS,
  getHeroesForSector,
  getTideHeight,
  pickDungeonForSector,
  randomDungeonRespawnMs,
  DUNGEON_SPAWN_CONFIG,
  type SectorPosition,
  type FactionId,
  type DungeonDefinition,
} from "@shared/definitions/lore";
import { resolveZoneSectorId, resolveLegacySectorId } from "@shared/definitions/sectorBridge";
import { getSectorById } from "@shared/definitions/worldMapSectors";
import {
  generateZonePopulation,
  getNodesByCategory,
  type HarvestNode as ZoneHarvestNode,
} from "@shared/definitions/zoneServerNodes";
import {
  getSectorProductionContent,
  resolveSectorSeeds,
} from "@shared/definitions/sectorProductionContent";

// ── Constants (from island-server.ts) ───────────────────────────

// Enemy types per faction — lore-accurate spawns
const FACTION_ENEMIES: Record<string, string[]> = {
  crusade: ["deserter", "rogue_knight", "exile_scout", "war_hound"],
  legion:  ["orc_grunt", "ash_sorcerer", "undead_soldier", "lava_golem", "void_wraith"],
  fabled:  ["corrupted_ent", "rogue_golem", "feral_griffon", "crystal_spider"],
  neutral: ["bandit", "shore_crab", "sea_serpent", "wild_boar", "goblin"],
  pirate:  ["pirate_thug", "cutlass_raider", "powder_monkey", "rum_brute"],
};

/** Get enemy types for a sector based on its controlling faction */
function getEnemyTypesForSector(legacySectorId: SectorId): string[] {
  const lore = SECTOR_LORE[legacySectorId as SectorPosition];
  if (!lore) return FACTION_ENEMIES.neutral;
  const factionEnemies = lore.controllingFaction
    ? FACTION_ENEMIES[lore.controllingFaction] || FACTION_ENEMIES.neutral
    : FACTION_ENEMIES.neutral;
  // Mix in neutral enemies for variety
  return [...factionEnemies, ...FACTION_ENEMIES.neutral.slice(0, 2)];
}
const ENEMY_SPAWN_INTERVAL_MS = 15_000;
const MAX_ENEMIES_DEFAULT = 8;
const NODE_RESPAWN_MS = 60_000;
const SECTOR_SIZE = 10_000; // canonical: 10km per sector, 30km total world
const TICK_RATE = 20;     // 20 ticks/sec

// ── Difficulty scaling ──────────────────────────────────────────

function enemyStatsForDifficulty(difficulty: number, level: number) {
  const baseHp = 40 + level * 20;
  const scale = 1 + (difficulty - 1) * 0.15; // +15% per difficulty
  return {
    maxHp: Math.round(baseHp * scale),
    xpReward: 10 + level * 5,
    goldReward: 5 + level * 2,
  };
}

// ── Join Options ────────────────────────────────────────────────

interface SectorJoinOptions {
  sectorId: string;
  worldSeed?: string;
  accountId?: string;
  characterId?: string;
  characterName?: string;
  heroClass?: string;
  heroRace?: string;
  faction?: string;
  level?: number;
  sourceGame?: string; // warlords | rts | tactical
  zoneType?: string;
  difficulty?: number;
  // 3D model data from character record
  baseModelId?: string;
  equippedMeshes?: Record<string, string>;
  weaponSlots?: Record<string, string>;
  skinColor?: string;
  armorColor?: string;
  equippedWeaponType?: string;
}

// ── SectorRoom ──────────────────────────────────────────────────

/** Active dungeon portal in the sector */
interface DungeonPortal {
  id: string;
  dungeonDef: DungeonDefinition;
  x: number;
  z: number;
  active: boolean;
  respawnAt: number; // epoch ms, 0 = active now
}

export class SectorRoom extends Room<SectorState> {
  maxClients = 50;
  private spawnerInterval: ReturnType<typeof setInterval> | null = null;
  private sectorId: string = "convergence_nexus";
  private legacySectorId: SectorId = "CENTER";
  private worldSeed = "grudge-world-1";
  private dungeonPortals: DungeonPortal[] = [];

  // ── Lifecycle ───────────────────────────────────────────────

  onCreate(options: SectorJoinOptions) {
    this.sectorId = resolveZoneSectorId(options.sectorId || "convergence_nexus");
    this.legacySectorId = resolveLegacySectorId(this.sectorId) || "CENTER";
    this.worldSeed = options.worldSeed || "grudge-world-1";

    const worldSector = getSectorById(this.sectorId);
    const state = new SectorState();
    state.sectorId = this.sectorId;
    state.biome = worldSector?.biome || SECTOR_BIOMES[this.legacySectorId] || "neutral";
    state.zoneType = options.zoneType || (worldSector ? "wild" : "home");
    state.difficulty = options.difficulty || worldSector?.difficultyMin || 1;
    state.maxEnemies = MAX_ENEMIES_DEFAULT;
    state.maxPlayers = worldSector?.terrain3d?.maxPlayers || 50;
    this.setState(state);

    // Room metadata for matchmaking
    this.setMetadata({
      sectorId: this.sectorId,
      worldSeed: this.worldSeed,
      biome: state.biome,
      zoneType: state.zoneType,
      difficulty: state.difficulty,
    });

    // Pre-seed harvest nodes from deterministic zone population
    if (worldSector) {
      this.seedZoneHarvestNodes(worldSector);
    }

    // ── Simulation loop (20 tick/sec) ─────────────────────────
    this.setSimulationInterval((delta) => {
      this.state.tick++;
      this.state.serverTime = Date.now();
      this.updateEnemyAI(delta);
      this.updateHarvestRespawns();
      this.updateDungeonRespawns();
    }, 1000 / TICK_RATE);

    // ── Enemy spawner (every 15s, matching island-server.ts) ──
    this.spawnerInterval = setInterval(() => {
      if (this.state.players.size > 0) {
        this.spawnEnemy();
      }
    }, ENEMY_SPAWN_INTERVAL_MS);

    // ── Message handlers ──────────────────────────────────────

    // Movement (15 Hz) — also refreshes animState for locomotion
    this.onMessage("move", (client, data: {
      x: number; y: number; z: number; facing: number; state: string;
    }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.x = data.x;
      player.y = data.y;
      player.z = data.z;
      player.facing = data.facing;
      player.state = data.state || player.state;
      if (data.state === "moving" || data.state === "walk" || data.state === "run") {
        player.animState = data.state === "run" ? "run" : "walk";
        player.animClip = player.animState;
      } else if (data.state === "idle") {
        player.animState = "idle";
        player.animClip = "idle";
      }
    });

    // PvE attack
    this.onMessage("pve_attack", (client, data: {
      enemyId: string; damage: number;
    }) => {
      this.handlePveAttack(client, data.enemyId, data.damage);
    });

    // PvP attack
    this.onMessage("pvp_attack", (client, data: {
      targetId: string; damage: number;
    }) => {
      this.handlePvpAttack(client, data.targetId, data.damage);
    });

    // Harvest
    this.onMessage("harvest", (client, data: {
      nodeId: string; professionId: string;
    }) => {
      this.handleHarvest(client, data.nodeId, data.professionId);
    });

    // Chat (authoritative server broadcast — all clients see same feed)
    this.onMessage("chat", (client, data: { text: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const msg: ChatMessage = {
        senderId: client.sessionId,
        senderName: player.characterName || "Unknown",
        text: String(data.text ?? "").slice(0, 200),
        timestamp: Date.now(),
      };
      this.broadcast("chat", msg);
    });

    // Animation state (change + heartbeat) — remotes play attack/walk/etc.
    this.onMessage("anim", (client, data: { state?: string; clip?: string; oneshot?: boolean }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const state = String(data?.state || player.state || "idle").slice(0, 32);
      player.animState = state;
      player.animClip = String(data?.clip || state).slice(0, 48);
      if (data?.oneshot) player.animSeq = (player.animSeq + 1) % 1_000_000;
      // Keep coarse locomotion state aligned for older clients
      if (state === "walk" || state === "run" || state === "moving") player.state = "moving";
      else if (state === "attack" || state === "attacking") player.state = "attacking";
      else if (state === "death" || state === "dead") player.state = "dead";
      else if (state === "harvesting") player.state = "harvesting";
      else if (state === "idle") player.state = "idle";
    });

    // One-shot VFX (attack burst, teleport smoke, dash feet) — reliable message
    this.onMessage(
      "fx",
      (
        client,
        data: { kind?: string; x?: number; y?: number; z?: number; id?: string; meta?: string },
      ) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        this.broadcast(
          "fx",
          {
            kind: String(data?.kind || "custom").slice(0, 32),
            x: Number(data?.x) || player.x,
            y: Number(data?.y) || player.y,
            z: Number(data?.z) || player.z,
            id: data?.id,
            meta: data?.meta,
            senderId: client.sessionId,
            timestamp: Date.now(),
          },
          { except: client },
        );
      },
    );

    // Protocol handshake
    this.onMessage("ready", (client, data: { protocolVersion?: number }) => {
      client.send("room_snapshot", {
        sectorId: this.sectorId,
        worldSeed: this.worldSeed,
        protocolVersion: data?.protocolVersion ?? 1,
        playerCount: this.state.players.size,
        buildingCount: this.state.buildings.size,
      });
    });

    // ── Building placement (synced schema — all clients instantiate) ──

    this.onMessage("place_building", (client, data: {
      id: string; assetId: string; x: number; y: number; z: number; rotation: number;
    }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const building = new PlacedBuilding();
      building.id = data.id || `b_${client.sessionId}_${Date.now()}`;
      building.assetId = data.assetId;
      building.ownerId = client.sessionId;
      building.ownerName = player.characterName;
      building.x = data.x;
      building.y = data.y;
      building.z = data.z;
      building.rotation = data.rotation;
      this.state.buildings.set(building.id, building);
      this.broadcast("building_placed", {
        id: building.id,
        assetId: building.assetId,
        ownerId: building.ownerId,
        ownerName: building.ownerName,
        x: building.x,
        y: building.y,
        z: building.z,
        rotation: building.rotation,
      });
    });

    this.onMessage("remove_building", (client, data: { id: string }) => {
      const building = this.state.buildings.get(data.id);
      if (!building) return;
      // Only owner can remove
      if (building.ownerId !== client.sessionId) return;
      this.state.buildings.delete(data.id);
      this.broadcast("building_removed", { id: data.id });
    });

    // Sector transition request
    this.onMessage("request_transition", (client, data: {
      targetSector: SectorId;
    }) => {
      const grid = SECTOR_GRID[data.targetSector];
      if (!grid) return;
      client.send("transition_approved", {
        targetSector: data.targetSector,
        biome: SECTOR_BIOMES[data.targetSector],
      });
    });

    // Dungeon entrance interaction
    this.onMessage("enter_dungeon", (client, data: { portalId: string }) => {
      const portal = this.dungeonPortals.find(p => p.id === data.portalId && p.active);
      if (!portal) {
        client.send("dungeon_error", { error: "Portal not active" });
        return;
      }
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      // Send dungeon config to client so it can create/join a DungeonRoom
      client.send("dungeon_enter", {
        portalId: portal.id,
        dungeonId: portal.dungeonDef.id,
        dungeonName: portal.dungeonDef.name,
        dungeonType: portal.dungeonDef.type,
        floors: portal.dungeonDef.floors,
        difficulty: portal.dungeonDef.minLevel,
        bossId: portal.dungeonDef.bossId,
        bossName: portal.dungeonDef.bossName,
        bossHp: portal.dungeonDef.bossHp,
        enemyTypes: portal.dungeonDef.enemyTypes,
        lootTheme: portal.dungeonDef.lootTheme,
        sourceSector: this.sectorId,
      });
    });

    // Request dungeon portal locations (client needs positions for rendering caves)
    this.onMessage("get_portals", (client) => {
      client.send("portal_list", this.dungeonPortals.map(p => ({
        id: p.id,
        dungeonName: p.dungeonDef.name,
        dungeonType: p.dungeonDef.type,
        minLevel: p.dungeonDef.minLevel,
        x: p.x, z: p.z,
        active: p.active,
        respawnAt: p.respawnAt,
        entranceModel: p.dungeonDef.entranceModel,
      })));
    });

    // ── Spawn hero NPCs for this sector (from lore.ts) ────────
    const sectorHeroes = getHeroesForSector(this.legacySectorId as SectorPosition);
    for (const hero of sectorHeroes) {
      const npc = new SectorEnemy();
      npc.id = `hero_${hero.id}`;
      npc.enemyType = `hero_npc_${hero.factionId}`;
      npc.x = (Math.random() - 0.5) * SECTOR_SIZE * 0.4;
      npc.z = (Math.random() - 0.5) * SECTOR_SIZE * 0.4;
      npc.hp = hero.level * 20;
      npc.maxHp = hero.level * 20;
      npc.level = hero.level;
      npc.state = "idle";
      this.state.enemies.set(npc.id, npc);
    }

    // ── Spawn dungeon cave portals (random on islands) ────────
    this.spawnDungeonPortals();

    const lore = SECTOR_LORE[this.legacySectorId as SectorPosition];
    console.log(
      `[SectorRoom] Created: ${worldSector?.name || lore?.name || this.sectorId} (${state.biome}, ` +
      `difficulty ${state.difficulty}, harvest: ${this.state.harvestNodes.size}, ` +
      `heroes: ${sectorHeroes.map(h => h.name).join(", ") || "none"}, ` +
      `portals: ${this.dungeonPortals.length})`
    );
  }

  /** Seed Colyseus harvest nodes from shared zone population (deterministic). */
  private seedZoneHarvestNodes(worldSector: NonNullable<ReturnType<typeof getSectorById>>) {
    const cfg = worldSector.terrain3d;
    const prod = getSectorProductionContent(this.sectorId);
    const seeds = resolveSectorSeeds(this.sectorId, this.worldSeed);
    const resources = prod?.harvest.resources ?? worldSector.resources;
    const pop = generateZonePopulation(
      this.sectorId,
      this.worldSeed,
      cfg.sizeMeters,
      worldSector.difficultyMin,
      worldSector.difficultyMax,
      resources,
      worldSector.biome,
    );
    const harvestNodes = getNodesByCategory<ZoneHarvestNode>(pop, "harvest");
    for (const node of harvestNodes) {
      const h = new HarvestNode();
      h.id = node.id;
      h.resourceType = node.profession;
      h.x = node.position[0];
      h.z = node.position[2];
      this.state.harvestNodes.set(h.id, h);
    }
    console.log(
      `[SectorRoom] Production content: eco=${prod?.ecosystemId ?? worldSector.biome} ` +
        `pbr=${prod?.harvest.groundPbr ?? worldSector.groundPBR} ` +
        `hm=${prod?.terrain.heightmapModifier ?? cfg.heightmapModifier} ` +
        `popSeed=${seeds.population} harvest=${harvestNodes.length}`,
    );
  }

  /** Pick a spawn point from zone terrain config or fall back to center. */
  private pickSpawnPosition(): { x: number; y: number; z: number } {
    const worldSector = getSectorById(this.sectorId);
    const points = worldSector?.terrain3d?.spawnPoints;
    if (points && points.length > 0) {
      const [x, y, z] = points[Math.floor(Math.random() * points.length)];
      return { x, y, z };
    }
    return {
      x: (Math.random() - 0.5) * SECTOR_SIZE * 0.3,
      y: 0,
      z: (Math.random() - 0.5) * SECTOR_SIZE * 0.3,
    };
  }

  // ── Player Join ─────────────────────────────────────────────

  onJoin(client: Client, options: SectorJoinOptions) {
    const player = new SectorPlayer();
    player.id = client.sessionId;
    player.accountId = options.accountId || "";
    player.characterId = options.characterId || "";
    player.characterName = options.characterName || "Hero";
    player.heroClass = options.heroClass || "Warrior";
    player.heroRace = options.heroRace || "";
    player.faction = options.faction || "";
    player.level = options.level || 1;
    player.sourceGame = options.sourceGame || "warlords";

    // 3D model data — sync to all clients for mesh loading
    player.baseModelId = options.baseModelId || options.heroRace || "human";
    player.equippedMeshJson = JSON.stringify(options.equippedMeshes || {});
    player.weaponSlotsJson = JSON.stringify(options.weaponSlots || {});
    player.skinColor = options.skinColor || "#ffffff";
    player.armorColor = options.armorColor || "#ffffff";
    player.equippedWeaponType = options.equippedWeaponType || "sword-shield";

    const spawn = this.pickSpawnPosition();
    player.x = spawn.x;
    player.y = spawn.y;
    player.z = spawn.z;

    this.state.players.set(client.sessionId, player);

    // Seed initial enemies if this is the first player
    if (this.state.players.size === 1 && this.state.enemies.size === 0) {
      for (let i = 0; i < 3; i++) this.spawnEnemy();
    }

    console.log(
      `[SectorRoom:${this.sectorId}] ${player.characterName} joined ` +
      `(${player.sourceGame}) — ${this.state.players.size} players`
    );
  }

  // ── Player Leave ────────────────────────────────────────────

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    const name = player?.characterName || client.sessionId;
    this.state.players.delete(client.sessionId);

    console.log(
      `[SectorRoom:${this.sectorId}] ${name} left — ` +
      `${this.state.players.size} remaining`
    );
  }

  // ── Room Dispose ────────────────────────────────────────────

  onDispose() {
    if (this.spawnerInterval) clearInterval(this.spawnerInterval);
    console.log(`[SectorRoom:${this.sectorId}] Disposed`);
  }

  // ── Dungeon Portal Management ──────────────────────────────

  private spawnDungeonPortals() {
    const { maxPerSector, spawnChancePerIsland } = DUNGEON_SPAWN_CONFIG;
    const difficulty = this.state.difficulty;
    let spawned = 0;

    // Try to spawn up to maxPerSector portals at random positions
    for (let attempt = 0; attempt < 10 && spawned < maxPerSector; attempt++) {
      if (Math.random() > spawnChancePerIsland) continue;

      const dungeonDef = pickDungeonForSector(this.legacySectorId as SectorPosition, difficulty);
      if (!dungeonDef) continue;

      const portal: DungeonPortal = {
        id: `portal_${this.sectorId}_${spawned}_${Date.now()}`,
        dungeonDef,
        x: (Math.random() - 0.5) * SECTOR_SIZE * 0.7,
        z: (Math.random() - 0.5) * SECTOR_SIZE * 0.7,
        active: true,
        respawnAt: 0,
      };
      this.dungeonPortals.push(portal);
      spawned++;
    }
  }

  /** Check if any cleared portals should respawn with a new dungeon */
  private updateDungeonRespawns() {
    if (this.state.tick % 600 !== 0) return; // check every 30 seconds
    const now = Date.now();
    for (const portal of this.dungeonPortals) {
      if (!portal.active && portal.respawnAt > 0 && now >= portal.respawnAt) {
        // Respawn with a new random dungeon
        const newDef = pickDungeonForSector(this.sectorId as SectorPosition, this.state.difficulty);
        if (newDef) {
          portal.dungeonDef = newDef;
          portal.active = true;
          portal.respawnAt = 0;
          this.broadcast("portal_respawned", {
            id: portal.id,
            dungeonName: newDef.name,
            dungeonType: newDef.type,
            x: portal.x, z: portal.z,
          });
        }
      }
    }
  }

  // ── Enemy Spawning (from island-server.ts) ──────────────────

  private spawnEnemy() {
    if (this.state.enemies.size >= this.state.maxEnemies) return;

    const enemyTypes = getEnemyTypesForSector(this.legacySectorId);
    const typeIdx = Math.floor(Math.random() * enemyTypes.length);
    const level = Math.ceil(Math.random() * 5) + Math.floor(this.state.difficulty / 2);
    const stats = enemyStatsForDifficulty(this.state.difficulty, level);

    const enemy = new SectorEnemy();
    enemy.id = `enemy_${this.sectorId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    enemy.enemyType = enemyTypes[typeIdx];
    enemy.x = (Math.random() - 0.5) * SECTOR_SIZE * 0.8;
    enemy.y = 0;
    enemy.z = (Math.random() - 0.5) * SECTOR_SIZE * 0.8;
    enemy.hp = stats.maxHp;
    enemy.maxHp = stats.maxHp;
    enemy.level = level;
    enemy.state = "idle";

    this.state.enemies.set(enemy.id, enemy);
  }

  // ── Enemy AI (basic patrol + aggro) ─────────────────────────

  private updateEnemyAI(delta: number) {
    this.state.enemies.forEach((enemy) => {
      if (enemy.state === "dead") return;

      // Simple wander when idle
      if (enemy.state === "idle" && Math.random() < 0.005) {
        enemy.x += (Math.random() - 0.5) * 20;
        enemy.z += (Math.random() - 0.5) * 20;
        // Clamp to sector bounds
        const half = SECTOR_SIZE * 0.45;
        enemy.x = Math.max(-half, Math.min(half, enemy.x));
        enemy.z = Math.max(-half, Math.min(half, enemy.z));
      }

      // Aggro: chase nearest player within 60 units
      if (enemy.state === "idle" || enemy.state === "patrol") {
        let nearest: SectorPlayer | null = null;
        let nearestDist = 60;
        this.state.players.forEach((p) => {
          const dx = p.x - enemy.x;
          const dz = p.z - enemy.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = p;
          }
        });
        if (nearest) {
          enemy.state = "chase";
          enemy.targetId = (nearest as SectorPlayer).id;
        }
      }

      // Chase movement
      if (enemy.state === "chase" && enemy.targetId) {
        const target = this.state.players.get(enemy.targetId);
        if (!target) { enemy.state = "idle"; enemy.targetId = ""; return; }
        const dx = target.x - enemy.x;
        const dz = target.z - enemy.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 80) { enemy.state = "idle"; enemy.targetId = ""; return; } // lost aggro
        if (dist > 3) {
          const speed = 1.5;
          enemy.x += (dx / dist) * speed;
          enemy.z += (dz / dist) * speed;
        }
      }
    });
  }

  // ── PvE Combat (from island-server.ts) ──────────────────────

  private handlePveAttack(client: Client, enemyId: string, rawDamage: number) {
    const enemy = this.state.enemies.get(enemyId);
    if (!enemy) return;

    const damage = Math.max(1, Math.round(rawDamage));
    enemy.hp = Math.max(0, enemy.hp - damage);

    this.broadcast("pve_damage", {
      enemyId,
      damage,
      hp: enemy.hp,
      attackerId: client.sessionId,
    });

    if (enemy.hp <= 0) {
      const stats = enemyStatsForDifficulty(this.state.difficulty, enemy.level);
      enemy.state = "dead";

      this.broadcast("pve_kill", {
        enemyId,
        killerId: client.sessionId,
        xp: stats.xpReward,
        gold: stats.goldReward,
        enemyType: enemy.enemyType,
      });

      // Remove after a short delay (let death anim play)
      this.clock.setTimeout(() => {
        this.state.enemies.delete(enemyId);
      }, 2000);
    }
  }

  // ── PvP Combat (from island-server.ts) ──────────────────────

  private handlePvpAttack(client: Client, targetId: string, rawDamage: number) {
    const attacker = this.state.players.get(client.sessionId);
    const target = this.state.players.get(targetId);
    if (!attacker || !target) return;

    const damage = Math.max(1, Math.round(rawDamage));
    target.hp = Math.max(0, target.hp - damage);

    this.broadcast("pvp_damage", {
      attackerId: client.sessionId,
      targetId,
      damage,
      targetHp: target.hp,
    });

    if (target.hp <= 0) {
      this.broadcast("pvp_kill", {
        killerId: client.sessionId,
        killerName: attacker.characterName,
        victimId: targetId,
        victimName: target.characterName,
      });
      // Respawn victim with full HP
      target.hp = target.maxHp;
      target.state = "idle";
    }
  }

  // ── Harvesting (from island-server.ts) ──────────────────────

  private handleHarvest(client: Client, nodeId: string, professionId: string) {
    let node = this.state.harvestNodes.get(nodeId);

    if (node) {
      if (node.depleted) {
        if (Date.now() < node.respawnAt) {
          client.send("harvest_error", {
            nodeId,
            error: "depleted",
            respawnAt: node.respawnAt,
          });
          return;
        }
        // Respawned
        node.depleted = false;
        node.respawnAt = 0;
      }
    } else {
      // First interaction — create node state
      node = new HarvestNode();
      node.id = nodeId;
      node.resourceType = professionId;
      this.state.harvestNodes.set(nodeId, node);
    }

    // Deplete
    node.depleted = true;
    node.respawnAt = Date.now() + NODE_RESPAWN_MS;

    const player = this.state.players.get(client.sessionId);
    this.broadcast("harvest_complete", {
      nodeId,
      playerId: client.sessionId,
      playerName: player?.characterName || "Unknown",
      professionId,
      respawnAt: node.respawnAt,
    });
  }

  // ── Harvest Respawn Check ───────────────────────────────────

  private updateHarvestRespawns() {
    // Only check every ~60 ticks (3 seconds)
    if (this.state.tick % 60 !== 0) return;
    const now = Date.now();
    this.state.harvestNodes.forEach((node, id) => {
      if (node.depleted && now >= node.respawnAt) {
        node.depleted = false;
        node.respawnAt = 0;
      }
    });
  }
}

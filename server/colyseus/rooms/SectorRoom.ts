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
function getEnemyTypesForSector(sectorId: SectorId): string[] {
  const lore = SECTOR_LORE[sectorId as SectorPosition];
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
  sectorId: SectorId;
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
  private sectorId: SectorId = "CENTER";
  private dungeonPortals: DungeonPortal[] = [];

  // ── Lifecycle ───────────────────────────────────────────────

  onCreate(options: SectorJoinOptions) {
    this.sectorId = options.sectorId || "CENTER";

    const state = new SectorState();
    state.sectorId = this.sectorId;
    state.biome = SECTOR_BIOMES[this.sectorId] || "neutral";
    state.zoneType = options.zoneType || "wild";
    state.difficulty = options.difficulty || 1;
    state.maxEnemies = MAX_ENEMIES_DEFAULT;
    this.setState(state);

    // Room metadata for matchmaking
    this.setMetadata({
      sectorId: this.sectorId,
      biome: state.biome,
      zoneType: state.zoneType,
      difficulty: state.difficulty,
    });

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

    // Movement (high frequency — clients send position updates)
    this.onMessage("move", (client, data: {
      x: number; y: number; z: number; facing: number; state: string;
    }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.x = data.x;
      player.y = data.y;
      player.z = data.z;
      player.facing = data.facing;
      player.state = data.state;
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

    // Chat
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
    const sectorHeroes = getHeroesForSector(this.sectorId as SectorPosition);
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

    const lore = SECTOR_LORE[this.sectorId as SectorPosition];
    console.log(
      `[SectorRoom] Created: ${lore?.name || this.sectorId} (${state.biome}, ` +
      `difficulty ${state.difficulty}, heroes: ${sectorHeroes.map(h => h.name).join(", ") || "none"}, ` +
      `portals: ${this.dungeonPortals.length})`
    );
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

    // Spawn position — random within sector center area
    player.x = (Math.random() - 0.5) * SECTOR_SIZE * 0.3;
    player.y = 0;
    player.z = (Math.random() - 0.5) * SECTOR_SIZE * 0.3;

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

      const dungeonDef = pickDungeonForSector(this.sectorId as SectorPosition, difficulty);
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

    const enemyTypes = getEnemyTypesForSector(this.sectorId);
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

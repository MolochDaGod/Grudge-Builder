/**
 * ZoneServerNodes — authoritative zone population layer.
 *
 * Shared between Colyseus server (validation, AI ticks, loot tables) and
 * Three.js client (rendering, interaction prompts). Both sides generate
 * identical node layouts from the same seed so the server never needs to
 * send the full list — only deltas (harvested, killed, captured, etc.).
 *
 * A "zone" is one 4 km × 4 km ocean sector containing:
 *   - Multiple islands (procedural terrain patches above water level)
 *   - Open ocean with sailing hazards and sea creatures
 *   - Docking points, shipwrecks, reefs, whirlpools
 *   - On-island: harvesting nodes, NPC camps, AI patrols, POIs
 */

import { generateSettlement } from './settlementGenerator';

// ── Base Node ────────────────────────────────────────────────────────────────

export type NodeCategory =
  | 'island'
  | 'harvest'
  | 'npc_camp'
  | 'npc_wanderer'
  | 'ai_patrol'
  | 'dock'
  | 'shipwreck'
  | 'ocean_hazard'
  | 'poi'
  | 'boss_arena'
  | 'spawn_point'
  | 'sea_creature'
  | 'current'
  | 'settlement'
  // Instanced zones — portals to separate scenes
  | 'home_island'
  | 'dungeon_entrance'
  | 'building_interior'
  | 'player_home';

export interface ZoneNode {
  /** Unique within this zone (deterministic from seed) */
  id: string;
  category: NodeCategory;
  /** World-space position [x, y, z] within the 4 km zone */
  position: [number, number, number];
  /** Rotation in radians [yaw] — most nodes only need Y rotation */
  rotation?: number;
  /** Server-authoritative state */
  state: 'active' | 'depleted' | 'dead' | 'captured' | 'hidden';
  /** Respawn cooldown in seconds (0 = no respawn) */
  respawnSec: number;
  /** Difficulty tier 1-10 */
  difficulty: number;
}

// ── Island Node ──────────────────────────────────────────────────────────────

export type IslandSize = 'atoll' | 'small' | 'medium' | 'large' | 'fortress';

export interface IslandNode extends ZoneNode {
  category: 'island';
  /** Island terrain seed (passed to IslandTerrainGenerator) */
  islandSeed: string;
  size: IslandSize;
  /** Radius in meters — used for collision and approach detection */
  radiusM: number;
  /** Biome override (inherits from sector if null) */
  biomeOverride?: string;
  /** Whether this island has a dock for ship mooring */
  hasDock: boolean;
  /** Whether this island has an NPC settlement */
  hasSettlement: boolean;
  /** Child node IDs — harvesting nodes, NPCs, etc. placed ON this island */
  childNodeIds: string[];
}

// ── Harvesting Node ──────────────────────────────────────────────────────────

export type HarvestProfession = 'mining' | 'herbalism' | 'woodcutting' | 'skinning' | 'fishing';

export interface HarvestNode extends ZoneNode {
  category: 'harvest';
  profession: HarvestProfession;
  /** Resource item ID from the ObjectStore master-items list */
  resourceId: string;
  /** Display name (e.g. "Iron Vein", "Ancient Oak", "Ethereal Crystal") */
  resourceName: string;
  /** Tier 1-8 — determines profession level required */
  tier: number;
  /** Yield range [min, max] items per harvest */
  yield: [number, number];
  /** Time to harvest in seconds */
  harvestTimeSec: number;
  /** Parent island ID (null = ocean-based, e.g. fishing spot) */
  parentIslandId: string | null;
}

// ── NPC Nodes ────────────────────────────────────────────────────────────────

export type NPCFaction = 'crusade' | 'fabled' | 'legion' | 'worge' | 'neutral' | 'hostile';
export type NPCRole = 'vendor' | 'quest_giver' | 'guard' | 'trainer' | 'innkeeper' | 'blacksmith' | 'faction_rep';

export interface NPCCampNode extends ZoneNode {
  category: 'npc_camp';
  faction: NPCFaction;
  /** Number of NPCs in this camp */
  population: number;
  /** NPC roles available at this camp */
  roles: NPCRole[];
  /** Whether this camp has a Pirate Claim flag (capturable) */
  hasPirateFlag: boolean;
  /** Parent island ID */
  parentIslandId: string;
  /** Camp name */
  name: string;
}

export interface NPCWandererNode extends ZoneNode {
  category: 'npc_wanderer';
  faction: NPCFaction;
  /** NPC template ID (determines model, dialog, loot table) */
  templateId: string;
  /** Wander radius in meters from position */
  wanderRadius: number;
  /** Whether this NPC is hostile on sight */
  hostile: boolean;
  /** Combat level */
  level: number;
  /** Parent island ID (null = on a ship / swimming) */
  parentIslandId: string | null;
}

// ── AI Patrol ────────────────────────────────────────────────────────────────

export interface AIPatrolNode extends ZoneNode {
  category: 'ai_patrol';
  faction: NPCFaction;
  /** Waypoints the patrol follows [x, y, z][] */
  waypoints: [number, number, number][];
  /** Number of units in this patrol */
  unitCount: number;
  /** Unit template IDs */
  unitTemplates: string[];
  /** Whether this is a ship patrol (ocean) or foot patrol (island) */
  isShipPatrol: boolean;
  /** Aggro radius in meters */
  aggroRadius: number;
  /** Combat level */
  level: number;
}

// ── Ocean Features ───────────────────────────────────────────────────────────

export interface DockNode extends ZoneNode {
  category: 'dock';
  /** Parent island ID */
  parentIslandId: string;
  /** Number of ship berths */
  berths: number;
  /** Dock name */
  name: string;
  /** Services available (repair, trade, quest board) */
  services: string[];
}

export interface ShipwreckNode extends ZoneNode {
  category: 'shipwreck';
  /** Loot tier 1-8 */
  lootTier: number;
  /** Whether this wreck is above or below water */
  isSubmerged: boolean;
  /** Wreck model variant key */
  modelVariant: string;
  /** Whether guarded by hostile NPCs/creatures */
  isGuarded: boolean;
}

export interface OceanHazardNode extends ZoneNode {
  category: 'ocean_hazard';
  hazardType: 'whirlpool' | 'reef' | 'storm_cell' | 'sea_monster_lair' | 'mist_zone' | 'current_rip' | 'luminous_vortex';
  /** Radius of effect in meters */
  radiusM: number;
  /** Damage per second (0 = non-damaging, e.g. current just pushes) */
  dps: number;
  /** Force direction + magnitude for currents/whirlpools */
  forceVector?: [number, number, number];
}

export interface SeaCreatureNode extends ZoneNode {
  category: 'sea_creature';
  /** Creature template ID */
  templateId: string;
  /** Creature level */
  level: number;
  /** Swim area radius */
  swimRadius: number;
  /** Whether surfaces periodically (visible from ship) */
  surfaces: boolean;
  /** Hostile to ships */
  hostileToShips: boolean;
}

export interface OceanCurrentNode extends ZoneNode {
  category: 'current';
  /** Start and end positions defining the current path */
  pathStart: [number, number, number];
  pathEnd: [number, number, number];
  /** Width of the current in meters */
  widthM: number;
  /** Speed boost/reduction multiplier for ships in the current */
  speedMultiplier: number;
  /** Whether this current is visible (glowing water trail) */
  isVisible: boolean;
}

// ── POI / Boss Arena ─────────────────────────────────────────────────────────

export type POIType =
  | 'ruins' | 'shrine' | 'lighthouse' | 'cave_entrance'
  | 'treasure_chest' | 'lore_marker' | 'portal' | 'obelisk'
  | 'crystal_formation' | 'waterfall' | 'ancient_tree';

export interface POINode extends ZoneNode {
  category: 'poi';
  poiType: POIType;
  name: string;
  /** Interaction type */
  interaction: 'examine' | 'loot' | 'activate' | 'enter' | 'pray' | 'none';
  /** Optional quest ID this POI is tied to */
  questId?: string;
  /** Parent island ID (null = ocean) */
  parentIslandId: string | null;
}

export interface BossArenaNode extends ZoneNode {
  category: 'boss_arena';
  /** Boss template ID */
  bossTemplateId: string;
  /** Boss display name */
  bossName: string;
  /** Recommended party size */
  partySize: number;
  /** Arena radius in meters */
  arenaRadiusM: number;
  /** Parent island ID */
  parentIslandId: string;
  /** Whether boss is a world boss (visible from afar, multi-group) */
  isWorldBoss: boolean;
}

// ── Spawn Points ───────────────────────────────────────────────────────

export interface SpawnPointNode extends ZoneNode {
  category: 'spawn_point';
  /** Whether this is a player spawn or NPC spawn */
  spawnType: 'player' | 'npc' | 'ship';
  /** Faction restriction (null = any) */
  factionRestriction?: NPCFaction;
  /** Spawn safe radius — no combat within this range */
  safeRadius: number;
}

// ── Instanced Zones (portals to separate scenes) ─────────────────────

/** Home Island — each player’s personal island accessible from any sector dock */
export interface HomeIslandNode extends ZoneNode {
  category: 'home_island';
  /** The dock this portal is attached to */
  parentDockId: string;
  /** Parent island ID */
  parentIslandId: string;
  /** Instance type determines how the home island loads */
  instanceType: 'personal' | 'guild';
  /** Max visitors allowed (0 = owner only) */
  maxVisitors: number;
  /** Island seed — player’s home island uses their account seed */
  ownerSeed: string;
  /** Label shown on the dock UI */
  label: string;
}

/** Dungeon Entrance — portal to an instanced dungeon with waves/boss */
export type DungeonTier = 'normal' | 'heroic' | 'mythic';

export interface DungeonEntranceNode extends ZoneNode {
  category: 'dungeon_entrance';
  /** Dungeon template ID */
  dungeonId: string;
  /** Display name */
  dungeonName: string;
  /** Tier determines mob levels and loot quality */
  tier: DungeonTier;
  /** Recommended party size */
  partySize: number;
  /** Minimum player level to enter */
  minLevel: number;
  /** Number of floors/rooms */
  floorCount: number;
  /** Boss IDs at the end of the dungeon */
  bossIds: string[];
  /** Cooldown between runs (seconds, 0 = no limit) */
  lockoutSec: number;
  /** Parent island ID */
  parentIslandId: string;
  /** Visual: entrance model variant (cave, ruins, portal, gate) */
  entranceModel: 'cave' | 'ruins' | 'portal' | 'gate' | 'tree_hollow';
}

/** Building Interior — enter a building (inn, blacksmith, etc.) as a separate scene */
export interface BuildingInteriorNode extends ZoneNode {
  category: 'building_interior';
  /** Building piece ID from modularBuildings catalog */
  buildingId: string;
  /** Building name shown on approach */
  buildingName: string;
  /** Interior template (determines layout, lighting, NPCs inside) */
  interiorTemplate: 'tavern' | 'forge' | 'shop' | 'mill' | 'stable' | 'tower' | 'house';
  /** NPCs inside this building */
  interiorNPCs: { role: NPCRole; faction: NPCFaction }[];
  /** Whether players can trade inside */
  hasTrade: boolean;
  /** Whether this building has a crafting station */
  hasCraftingStation: boolean;
  /** Parent island ID */
  parentIslandId: string;
}

/** Player Home — entrance to a player-built house interior (furniture, storage, trophies) */
export interface PlayerHomeNode extends ZoneNode {
  category: 'player_home';
  /** Owner’s Grudge ID */
  ownerId: string;
  /** Home name set by the player */
  homeName: string;
  /** Building piece ID that this home is attached to */
  buildingPieceId: string;
  /** Interior size (determines room count and furniture slots) */
  interiorSize: 'small' | 'medium' | 'large' | 'manor';
  /** Number of storage chests */
  storageSlots: number;
  /** Number of trophy display mounts */
  trophySlots: number;
  /** Whether visitors can enter (public/friends/locked) */
  accessLevel: 'public' | 'friends' | 'locked';
  /** Parent island ID */
  parentIslandId: string;
}

// ── Union Type ─────────────────────────────────────────────────────────

// ── Settlement Node ──────────────────────────────────────────────────────────

export interface SettlementNode extends ZoneNode {
  category: 'settlement';
  /** Settlement tier — determines building count and layout complexity */
  settlementTier: import('./settlementGenerator').SettlementTier;
  /** Faction controlling this settlement */
  faction: NPCFaction;
  /** All placed buildings (structures, roads, decorations) */
  buildings: import('./settlementGenerator').SettlementBuilding[];
  /** ID of the safe house building within this settlement (null for hamlets) */
  safeHouseId: string | null;
  /** World-space position of the safe house (precomputed for mission system) */
  safeHousePosition: [number, number, number] | null;
  /** Center of the settlement relative to island center */
  centerOffset: [number, number, number];
  /** Approximate radius of the settlement in meters */
  radiusM: number;
  /** Parent island ID */
  parentIslandId: string;
}

export type AnyZoneNode =
  | IslandNode
  | HarvestNode
  | NPCCampNode
  | NPCWandererNode
  | AIPatrolNode
  | DockNode
  | ShipwreckNode
  | OceanHazardNode
  | SeaCreatureNode
  | OceanCurrentNode
  | POINode
  | BossArenaNode
  | SpawnPointNode
  | SettlementNode
  | HomeIslandNode
  | DungeonEntranceNode
  | BuildingInteriorNode
  | PlayerHomeNode;

// ── Zone Population Snapshot ─────────────────────────────────────────────────

/**
 * Full state of a zone instance — the server holds this as the source of truth.
 * Client generates the same initial layout from seed, then applies server deltas.
 */
export interface ZonePopulation {
  sectorId: string;
  worldSeed: string;
  /** All nodes keyed by ID for O(1) lookup */
  nodes: Map<string, AnyZoneNode>;
  /** Island IDs in this zone (subset of nodes) */
  islandIds: string[];
  /** Server tick timestamp (ms) of last update */
  lastTickMs: number;
  /** Active player count in this instance */
  playerCount: number;
  /** Colyseus room ID for this zone instance */
  roomId?: string;
}

// ── Seeded Population Generator ──────────────────────────────────────────────

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate the initial zone population from a sector definition + world seed.
 * Deterministic — server and client produce identical results.
 *
 * Island count and sizes scale with sector difficulty:
 *   - Safe zones: 4-6 islands, mostly medium/large
 *   - Mid zones: 6-10 islands, mixed sizes
 *   - Endgame: 8-14 islands, more atolls + one fortress
 */
export function generateZonePopulation(
  sectorId: string,
  worldSeed: string,
  sizeMeters: number,
  difficultyMin: number,
  difficultyMax: number,
  resources: string[],
  biome: string,
): ZonePopulation {
  const seed = hashSeed(`${worldSeed}:${sectorId}:pop`);
  const rng = prng(seed);
  const half = sizeMeters / 2;
  const nodes = new Map<string, AnyZoneNode>();
  const islandIds: string[] = [];
  let nodeCounter = 0;

  function nextId(prefix: string): string {
    return `${sectorId}:${prefix}:${nodeCounter++}`;
  }

  function randInZone(): [number, number, number] {
    return [
      (rng() - 0.5) * sizeMeters * 0.85,
      0,
      (rng() - 0.5) * sizeMeters * 0.85,
    ];
  }

  function randOnIsland(ix: number, iz: number, radius: number): [number, number, number] {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * radius * 0.7;
    return [ix + Math.cos(angle) * dist, 0, iz + Math.sin(angle) * dist];
  }

  // ── Islands ──────────────────────────────────────────────
  const avgDiff = (difficultyMin + difficultyMax) / 2;
  const islandCount = Math.floor(4 + avgDiff * 1.2 + rng() * 3);
  const sizes: IslandSize[] = ['atoll', 'small', 'medium', 'large', 'fortress'];
  const sizeRadii: Record<IslandSize, number> = {
    atoll: 60, small: 120, medium: 220, large: 380, fortress: 500,
  };

  for (let i = 0; i < islandCount; i++) {
    const pos = randInZone();
    const sizeIdx = Math.min(sizes.length - 1, Math.floor(rng() * (sizes.length - 1)));
    const size = i === 0 && avgDiff >= 7 ? 'fortress' : sizes[sizeIdx];
    const radius = sizeRadii[size];
    const id = nextId('island');

    const island: IslandNode = {
      id,
      category: 'island',
      position: pos,
      state: 'active',
      respawnSec: 0,
      difficulty: Math.floor(difficultyMin + rng() * (difficultyMax - difficultyMin)),
      islandSeed: `${worldSeed}:${sectorId}:isl:${i}`,
      size,
      radiusM: radius,
      hasDock: size !== 'atoll' && rng() > 0.3,
      hasSettlement: size === 'large' || size === 'fortress' || (size === 'medium' && rng() > 0.5),
      childNodeIds: [],
    };
    nodes.set(id, island);
    islandIds.push(id);

    // ── Dock ──
    if (island.hasDock) {
      const dockId = nextId('dock');
      const dockAngle = rng() * Math.PI * 2;
      const dockPos: [number, number, number] = [
        pos[0] + Math.cos(dockAngle) * radius * 0.95,
        0,
        pos[2] + Math.sin(dockAngle) * radius * 0.95,
      ];
      const dock: DockNode = {
        id: dockId,
        category: 'dock',
        position: dockPos,
        state: 'active',
        respawnSec: 0,
        difficulty: island.difficulty,
        parentIslandId: id,
        berths: size === 'fortress' ? 6 : size === 'large' ? 4 : 2,
        name: `${size.charAt(0).toUpperCase() + size.slice(1)} Dock`,
        services: size === 'fortress'
          ? ['repair', 'trade', 'quest_board', 'inn', 'blacksmith']
          : size === 'large'
            ? ['repair', 'trade', 'quest_board']
            : ['repair'],
      };
      nodes.set(dockId, dock);
      island.childNodeIds.push(dockId);
    }

    // ── Harvesting nodes on island ──
    const harvestCount = Math.floor(2 + radius / 80 + rng() * 3);
    const professions: HarvestProfession[] = ['mining', 'herbalism', 'woodcutting'];
    for (let h = 0; h < harvestCount; h++) {
      const hId = nextId('harvest');
      const prof = professions[Math.floor(rng() * professions.length)];
      const tier = Math.max(1, Math.min(8, Math.floor(island.difficulty * 0.8 + rng() * 2)));
      const resName = resources[Math.floor(rng() * resources.length)] ?? 'stone';
      const hNode: HarvestNode = {
        id: hId,
        category: 'harvest',
        position: randOnIsland(pos[0], pos[2], radius),
        state: 'active',
        respawnSec: 120 + Math.floor(rng() * 180),
        difficulty: tier,
        profession: prof,
        resourceId: resName.toLowerCase().replace(/\s+/g, '_'),
        resourceName: resName,
        tier,
        yield: [1, 2 + Math.floor(rng() * 3)],
        harvestTimeSec: 3 + Math.floor(rng() * 5),
        parentIslandId: id,
      };
      nodes.set(hId, hNode);
      island.childNodeIds.push(hId);
    }

    // ── Settlement (procedural town layout) ──
    if (island.hasSettlement) {
      const factions: NPCFaction[] = ['crusade', 'fabled', 'legion', 'worge', 'neutral'];
      const stlFaction = factions[Math.floor(rng() * factions.length)];
      const layout = generateSettlement(island.islandSeed, island.size, island.difficulty, stlFaction);
      const stlId = nextId('settlement');

      // Compute world-space safe house position
      let safeHouseWorldPos: [number, number, number] | null = null;
      if (layout.safeHouseId) {
        const shBuilding = layout.buildings.find(b => b.id === layout.safeHouseId);
        if (shBuilding) {
          safeHouseWorldPos = [
            pos[0] + shBuilding.position[0],
            shBuilding.position[1],
            pos[2] + shBuilding.position[2],
          ];
        }
      }

      const settlement: SettlementNode = {
        id: stlId,
        category: 'settlement',
        position: [pos[0] + layout.centerPosition[0], 0, pos[2] + layout.centerPosition[2]],
        state: 'active',
        respawnSec: 0,
        difficulty: island.difficulty,
        settlementTier: layout.tier,
        faction: stlFaction,
        buildings: layout.buildings,
        safeHouseId: layout.safeHouseId,
        safeHousePosition: safeHouseWorldPos,
        centerOffset: layout.centerPosition,
        radiusM: layout.radiusM,
        parentIslandId: id,
      };
      nodes.set(stlId, settlement);
      island.childNodeIds.push(stlId);
    }

    // ── NPC Camp (on islands with settlements) ──
    if (island.hasSettlement) {
      const campId = nextId('camp');
      const factions: NPCFaction[] = ['crusade', 'fabled', 'legion', 'worge', 'neutral'];
      const camp: NPCCampNode = {
        id: campId,
        category: 'npc_camp',
        position: randOnIsland(pos[0], pos[2], radius * 0.4),
        state: 'active',
        respawnSec: 0,
        difficulty: island.difficulty,
        faction: factions[Math.floor(rng() * factions.length)],
        population: 3 + Math.floor(rng() * 8),
        roles: ['vendor', 'quest_giver', 'guard'],
        hasPirateFlag: rng() > 0.6,
        parentIslandId: id,
        name: `${island.size === 'fortress' ? 'Stronghold' : 'Camp'} ${i + 1}`,
      };
      nodes.set(campId, camp);
      island.childNodeIds.push(campId);
    }

    // ── NPC Wanderers ──
    const wandererCount = Math.floor(1 + rng() * (island.difficulty * 0.5));
    for (let w = 0; w < wandererCount; w++) {
      const wId = nextId('npc');
      const wanderer: NPCWandererNode = {
        id: wId,
        category: 'npc_wanderer',
        position: randOnIsland(pos[0], pos[2], radius),
        state: 'active',
        respawnSec: 300 + Math.floor(rng() * 300),
        difficulty: island.difficulty,
        faction: rng() > 0.5 ? 'hostile' : 'neutral',
        templateId: `mob_${biome}_${Math.floor(rng() * 5)}`,
        wanderRadius: 30 + rng() * 60,
        hostile: rng() > 0.4,
        level: Math.max(1, island.difficulty + Math.floor(rng() * 3 - 1)),
        parentIslandId: id,
      };
      nodes.set(wId, wanderer);
      island.childNodeIds.push(wId);
    }

    // ── POI on larger islands ──
    if (size === 'large' || size === 'fortress' || (size === 'medium' && rng() > 0.5)) {
      const poiTypes: POIType[] = ['ruins', 'shrine', 'cave_entrance', 'treasure_chest', 'crystal_formation', 'ancient_tree'];
      const pId = nextId('poi');
      const poi: POINode = {
        id: pId,
        category: 'poi',
        position: randOnIsland(pos[0], pos[2], radius * 0.6),
        state: 'active',
        respawnSec: 0,
        difficulty: island.difficulty,
        poiType: poiTypes[Math.floor(rng() * poiTypes.length)],
        name: `${biome.charAt(0).toUpperCase() + biome.slice(1)} ${poiTypes[Math.floor(rng() * poiTypes.length)]}`,
        interaction: rng() > 0.5 ? 'loot' : 'examine',
        parentIslandId: id,
      };
      nodes.set(pId, poi);
      island.childNodeIds.push(pId);
    }

    // ── Boss arena on fortress islands ──
    if (size === 'fortress') {
      const bId = nextId('boss');
      const boss: BossArenaNode = {
        id: bId,
        category: 'boss_arena',
        position: [pos[0], 0, pos[2]], // center of island
        state: 'active',
        respawnSec: 1800,
        difficulty: difficultyMax,
        bossTemplateId: `boss_${biome}_${sectorId}`,
        bossName: `${biome.charAt(0).toUpperCase() + biome.slice(1)} Guardian`,
        partySize: 5,
        arenaRadiusM: 60,
        parentIslandId: id,
        isWorldBoss: avgDiff >= 8,
      };
      nodes.set(bId, boss);
      island.childNodeIds.push(bId);
    }
  }

  // ── Ocean Features ─────────────────────────────────────────

  // Fishing spots scattered in open water
  const fishSpotCount = 4 + Math.floor(rng() * 6);
  for (let f = 0; f < fishSpotCount; f++) {
    const fId = nextId('fish');
    const fNode: HarvestNode = {
      id: fId,
      category: 'harvest',
      position: randInZone(),
      state: 'active',
      respawnSec: 60 + Math.floor(rng() * 120),
      difficulty: Math.floor(difficultyMin + rng() * (difficultyMax - difficultyMin)),
      profession: 'fishing',
      resourceId: resources.find(r => r.toLowerCase().includes('fish')) ?? 'fish',
      resourceName: 'Deep Sea Catch',
      tier: Math.max(1, Math.floor(avgDiff * 0.7)),
      yield: [1, 3],
      harvestTimeSec: 5 + Math.floor(rng() * 5),
      parentIslandId: null,
    };
    nodes.set(fId, fNode);
  }

  // Shipwrecks
  const wreckCount = 1 + Math.floor(rng() * 3);
  for (let s = 0; s < wreckCount; s++) {
    const sId = nextId('wreck');
    const wreck: ShipwreckNode = {
      id: sId,
      category: 'shipwreck',
      position: randInZone(),
      state: 'active',
      respawnSec: 3600,
      difficulty: difficultyMin + Math.floor(rng() * 3),
      lootTier: Math.max(1, Math.floor(avgDiff * 0.6 + rng() * 2)),
      isSubmerged: rng() > 0.4,
      modelVariant: `wreck_${Math.floor(rng() * 4)}`,
      isGuarded: rng() > 0.3,
    };
    nodes.set(sId, wreck);
  }

  // Ocean hazards
  const hazardCount = Math.floor(avgDiff * 0.8 + rng() * 3);
  const hazardTypes: OceanHazardNode['hazardType'][] = [
    'whirlpool', 'reef', 'storm_cell', 'mist_zone', 'current_rip',
  ];
  if (biome === 'ethereal') hazardTypes.push('luminous_vortex');
  if (biome === 'abyssal') hazardTypes.push('sea_monster_lair');

  for (let h = 0; h < hazardCount; h++) {
    const hId = nextId('hazard');
    const hType = hazardTypes[Math.floor(rng() * hazardTypes.length)];
    const hazard: OceanHazardNode = {
      id: hId,
      category: 'ocean_hazard',
      position: randInZone(),
      state: 'active',
      respawnSec: 0,
      difficulty: difficultyMin + Math.floor(rng() * (difficultyMax - difficultyMin)),
      hazardType: hType,
      radiusM: 40 + rng() * 120,
      dps: hType === 'reef' ? 5 : hType === 'whirlpool' ? 10 : hType === 'luminous_vortex' ? 15 : 0,
    };
    nodes.set(hId, hazard);
  }

  // Sea creatures
  const creatureCount = 2 + Math.floor(rng() * avgDiff);
  for (let c = 0; c < creatureCount; c++) {
    const cId = nextId('creature');
    const creature: SeaCreatureNode = {
      id: cId,
      category: 'sea_creature',
      position: randInZone(),
      state: 'active',
      respawnSec: 600 + Math.floor(rng() * 600),
      difficulty: difficultyMin + Math.floor(rng() * (difficultyMax - difficultyMin)),
      templateId: `sea_${biome}_${Math.floor(rng() * 4)}`,
      level: difficultyMin + Math.floor(rng() * (difficultyMax - difficultyMin)),
      swimRadius: 200 + rng() * 400,
      surfaces: rng() > 0.4,
      hostileToShips: rng() > 0.5 && avgDiff > 4,
    };
    nodes.set(cId, creature);
  }

  // Ship patrols (AI faction ships sailing the zone)
  const patrolCount = Math.floor(1 + avgDiff * 0.4);
  for (let p = 0; p < patrolCount; p++) {
    const pId = nextId('patrol');
    const wp1 = randInZone();
    const wp2 = randInZone();
    const wp3 = randInZone();
    const factions: NPCFaction[] = ['crusade', 'fabled', 'legion', 'hostile'];
    const patrol: AIPatrolNode = {
      id: pId,
      category: 'ai_patrol',
      position: wp1,
      state: 'active',
      respawnSec: 900,
      difficulty: difficultyMin + Math.floor(rng() * (difficultyMax - difficultyMin)),
      faction: factions[Math.floor(rng() * factions.length)],
      waypoints: [wp1, wp2, wp3],
      unitCount: 1,
      unitTemplates: [`ship_${biome}_${Math.floor(rng() * 3)}`],
      isShipPatrol: true,
      aggroRadius: 150 + rng() * 200,
      level: difficultyMin + Math.floor(rng() * (difficultyMax - difficultyMin)),
    };
    nodes.set(pId, patrol);
  }

  // Ocean currents (trade routes / hazard lanes)
  const currentCount = 1 + Math.floor(rng() * 2);
  for (let c = 0; c < currentCount; c++) {
    const cId = nextId('current');
    const start = randInZone();
    const end = randInZone();
    const current: OceanCurrentNode = {
      id: cId,
      category: 'current',
      position: [(start[0] + end[0]) / 2, 0, (start[2] + end[2]) / 2],
      state: 'active',
      respawnSec: 0,
      difficulty: 0,
      pathStart: start,
      pathEnd: end,
      widthM: 30 + rng() * 60,
      speedMultiplier: 1.3 + rng() * 0.7,
      isVisible: biome === 'ethereal' || biome === 'nexus' || rng() > 0.6,
    };
    nodes.set(cId, current);
  }

  // ── Player Spawn Points ────────────────────────────────────
  // Place spawns at docks, or fallback to sector config
  const dockNodes = [...nodes.values()].filter(n => n.category === 'dock') as DockNode[];
  if (dockNodes.length > 0) {
    for (const dock of dockNodes) {
      const spId = nextId('spawn');
      const sp: SpawnPointNode = {
        id: spId,
        category: 'spawn_point',
        position: [dock.position[0] + 10, dock.position[1], dock.position[2]],
        state: 'active',
        respawnSec: 0,
        difficulty: 0,
        spawnType: 'player',
        safeRadius: 50,
      };
      nodes.set(spId, sp);
    }
  }
  // Ship spawn in open water
  const shipSpawnId = nextId('spawn');
  nodes.set(shipSpawnId, {
    id: shipSpawnId,
    category: 'spawn_point',
    position: [0, 0, half * 0.8],
    state: 'active',
    respawnSec: 0,
    difficulty: 0,
    spawnType: 'ship',
    safeRadius: 100,
  } as SpawnPointNode);

  // ── Instance Nodes (portals to separate scenes) ────────────

  // Home Island portals — one at every dock
  for (const dock of dockNodes) {
    const hiId = nextId('home_island');
    const hi: HomeIslandNode = {
      id: hiId,
      category: 'home_island',
      position: [dock.position[0] - 5, dock.position[1], dock.position[2]],
      state: 'active',
      respawnSec: 0,
      difficulty: 0,
      parentDockId: dock.id,
      parentIslandId: dock.parentIslandId,
      instanceType: 'personal',
      maxVisitors: 4,
      ownerSeed: '', // filled at runtime with player's account seed
      label: 'Sail to Home Island',
    };
    nodes.set(hiId, hi);
  }

  // Dungeon entrances — on medium+ islands, biome-themed
  const dungeonTemplates: Record<string, { name: string; model: DungeonEntranceNode['entranceModel']; floors: number; bosses: string[] }> = {
    ethereal:  { name: 'Spectral Hollow',       model: 'portal',      floors: 5, bosses: ['boss_phantom_warden'] },
    frozen:    { name: 'Glacial Depths',         model: 'cave',        floors: 4, bosses: ['boss_frost_wyrm'] },
    storm:     { name: 'Tempest Grotto',         model: 'cave',        floors: 3, bosses: ['boss_storm_elemental'] },
    forest:    { name: 'Thornwood Labyrinth',    model: 'tree_hollow', floors: 4, bosses: ['boss_ancient_treant'] },
    desert:    { name: 'Sunken Tomb',            model: 'ruins',       floors: 5, bosses: ['boss_sand_pharaoh'] },
    nexus:     { name: 'Ley Line Nexus',         model: 'portal',      floors: 6, bosses: ['boss_void_avatar', 'boss_gould_flame'] },
    abyssal:   { name: 'Drowned Cathedral',      model: 'ruins',       floors: 5, bosses: ['boss_leviathan_priest'] },
    volcanic:  { name: 'Magma Core',             model: 'gate',        floors: 4, bosses: ['boss_fire_colossus'] },
    tropical:  { name: 'Pirate\'s Crypt',        model: 'cave',        floors: 3, bosses: ['boss_undead_captain'] },
  };

  const allIslands = getNodesByCategory<IslandNode>({ sectorId, worldSeed, nodes, islandIds, lastTickMs: 0, playerCount: 0 }, 'island');
  const dungeonIslands = allIslands.filter(i => i.size === 'large' || i.size === 'fortress' || (i.size === 'medium' && rng() > 0.6));
  const dt = dungeonTemplates[biome] ?? dungeonTemplates.tropical;
  const tiers: DungeonTier[] = ['normal', 'heroic', 'mythic'];

  for (let d = 0; d < Math.min(dungeonIslands.length, 2); d++) {
    const dIsland = dungeonIslands[d];
    const dId = nextId('dungeon');
    const tier = tiers[Math.min(d, tiers.length - 1)];
    const dungeon: DungeonEntranceNode = {
      id: dId,
      category: 'dungeon_entrance',
      position: randOnIsland(dIsland.position[0], dIsland.position[2], dIsland.radiusM * 0.5),
      state: 'active',
      respawnSec: 0,
      difficulty: difficultyMax,
      dungeonId: `${biome}_dungeon_${d}`,
      dungeonName: dt.name,
      tier,
      partySize: tier === 'mythic' ? 5 : tier === 'heroic' ? 3 : 1,
      minLevel: Math.max(1, difficultyMin * 2),
      floorCount: dt.floors + (tier === 'mythic' ? 2 : tier === 'heroic' ? 1 : 0),
      bossIds: dt.bosses,
      lockoutSec: tier === 'mythic' ? 86400 : tier === 'heroic' ? 3600 : 0,
      parentIslandId: dIsland.id,
      entranceModel: dt.model,
    };
    nodes.set(dId, dungeon);
    dIsland.childNodeIds.push(dId);
  }

  // Building interiors — on settlement islands
  const settlementIslands = allIslands.filter(i => i.hasSettlement);
  const interiorTemplates: BuildingInteriorNode['interiorTemplate'][] = ['tavern', 'forge', 'shop', 'stable'];

  for (const sIsland of settlementIslands) {
    // Each settlement gets 1-3 enterable buildings based on size
    const buildingCount = sIsland.size === 'fortress' ? 3 : sIsland.size === 'large' ? 2 : 1;
    for (let b = 0; b < buildingCount; b++) {
      const bId = nextId('interior');
      const template = interiorTemplates[b % interiorTemplates.length];
      const interior: BuildingInteriorNode = {
        id: bId,
        category: 'building_interior',
        position: randOnIsland(sIsland.position[0], sIsland.position[2], sIsland.radiusM * 0.35),
        state: 'active',
        respawnSec: 0,
        difficulty: 0,
        buildingId: template === 'tavern' ? 'inn' : template === 'forge' ? 'blacksmith' : template === 'shop' ? 'market_stand_1' : 'stable',
        buildingName: template === 'tavern' ? 'The Salty Anchor' : template === 'forge' ? 'Iron Anvil Forge' : template === 'shop' ? 'Trade Post' : 'Stables',
        interiorTemplate: template,
        interiorNPCs: template === 'tavern'
          ? [{ role: 'innkeeper', faction: 'neutral' }, { role: 'vendor', faction: 'neutral' }]
          : template === 'forge'
            ? [{ role: 'blacksmith', faction: 'neutral' }]
            : template === 'shop'
              ? [{ role: 'vendor', faction: 'neutral' }, { role: 'quest_giver', faction: 'neutral' }]
              : [{ role: 'trainer', faction: 'neutral' }],
        hasTrade: template === 'tavern' || template === 'shop',
        hasCraftingStation: template === 'forge',
        parentIslandId: sIsland.id,
      };
      nodes.set(bId, interior);
      sIsland.childNodeIds.push(bId);
    }
  }

  // Player home plots — on medium+ islands with docks (places where players can build homes)
  const homeIslands = allIslands.filter(i => i.hasDock && (i.size === 'medium' || i.size === 'large' || i.size === 'fortress'));
  for (const hIsland of homeIslands) {
    const plotCount = hIsland.size === 'fortress' ? 6 : hIsland.size === 'large' ? 4 : 2;
    for (let p = 0; p < plotCount; p++) {
      const phId = nextId('player_home');
      const sizeOptions: PlayerHomeNode['interiorSize'][] = ['small', 'medium', 'large', 'manor'];
      const plotSize = sizeOptions[Math.min(p, sizeOptions.length - 1)];
      const home: PlayerHomeNode = {
        id: phId,
        category: 'player_home',
        position: randOnIsland(hIsland.position[0], hIsland.position[2], hIsland.radiusM * 0.6),
        state: 'active',
        respawnSec: 0,
        difficulty: 0,
        ownerId: '', // claimed at runtime
        homeName: `Plot ${p + 1}`,
        buildingPieceId: plotSize === 'manor' ? 'house_3' : plotSize === 'large' ? 'house_2' : 'house_1',
        interiorSize: plotSize,
        storageSlots: plotSize === 'manor' ? 12 : plotSize === 'large' ? 8 : plotSize === 'medium' ? 5 : 3,
        trophySlots: plotSize === 'manor' ? 8 : plotSize === 'large' ? 5 : plotSize === 'medium' ? 3 : 1,
        accessLevel: 'locked', // default locked until claimed
        parentIslandId: hIsland.id,
      };
      nodes.set(phId, home);
      hIsland.childNodeIds.push(phId);
    }
  }

  return {
    sectorId,
    worldSeed,
    nodes,
    islandIds,
    lastTickMs: Date.now(),
    playerCount: 0,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Get all nodes of a specific category */
export function getNodesByCategory<T extends AnyZoneNode>(
  pop: ZonePopulation,
  category: NodeCategory,
): T[] {
  return [...pop.nodes.values()].filter(n => n.category === category) as T[];
}

/** Get all child nodes of an island */
export function getIslandChildren(pop: ZonePopulation, islandId: string): AnyZoneNode[] {
  const island = pop.nodes.get(islandId) as IslandNode | undefined;
  if (!island) return [];
  return island.childNodeIds.map(id => pop.nodes.get(id)).filter(Boolean) as AnyZoneNode[];
}

/** Serialize for network transport (Colyseus state delta) */
export function serializePopulation(pop: ZonePopulation): string {
  const obj = {
    sectorId: pop.sectorId,
    worldSeed: pop.worldSeed,
    nodes: Object.fromEntries(pop.nodes),
    islandIds: pop.islandIds,
    lastTickMs: pop.lastTickMs,
    playerCount: pop.playerCount,
    roomId: pop.roomId,
  };
  return JSON.stringify(obj);
}

/** Deserialize from network */
export function deserializePopulation(json: string): ZonePopulation {
  const obj = JSON.parse(json);
  return {
    ...obj,
    nodes: new Map(Object.entries(obj.nodes)),
  };
}

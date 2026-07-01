/**
 * Island Generation System
 * ========================
 * Deterministic island generation using seeded RNG.
 * Same seed always produces identical island structure.
 * Used for character home islands in Phase 1 character creation.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  generateMountainTriadSeed,
  HOME_ISLAND_ZONE_TYPES,
  type MountainTriadSeed,
} from '@shared/definitions/homeIslandSeed';
import {
  HOME_ISLAND_ANIMAL_TARGET,
  HOME_ISLAND_CLEARING_HALF_PCT,
  HOME_ISLAND_NODE_BUDGET,
  HOME_ISLAND_NODE_TARGET,
} from '@shared/definitions/homeIslandQuality';
import {
  deriveCampPositionFromZones,
  deriveTerrainZonesFromRtsHeightmap,
  type RtsHeightmapPayload,
} from '@shared/definitions/rtsTerrainBridge';
import {
  generateRtsNatureScatter,
  type RtsNatureScatterPayload,
} from '@shared/definitions/rtsNatureScatter';

/**
 * Seeded Random Number Generator
 * Uses linear congruential generator for determinism.
 * Same seed produces identical sequence across all calls.
 */
export function seededRandom(seed: string): () => number {
  // Convert seed string to numeric state
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = ((state << 5) - state) + seed.charCodeAt(i);
    state = state & state; // Convert to 32-bit integer
  }

  // Ensure positive state
  state = Math.abs(state) || 1;

  return () => {
    // LCG (Linear Congruential Generator): state = (a * state + c) mod m
    // Using standard constants: a=1664525, c=1013904223, m=2^32
    state = (state * 1664525 + 1013904223) >>> 0; // Unsigned 32-bit
    return (state >>> 0) / 0x100000000; // Normalize to [0, 1)
  };
}

/**
 * Resource Node Configuration
 * Defines which resources can spawn in which terrain zones
 */
export const NODE_TYPES_BY_ZONE: Record<string, string[]> = {
  mountain: ['ore', 'stone', 'gem', 'crystal'],
  forest: ['wood', 'hemp', 'herb'],
  field: ['hemp', 'herb'],
  shore: ['stone', 'shell'],
  water: ['fish'],
  clearing: ['herb'],
};

export const RESOURCE_RARITY_WEIGHTS: Record<string, number[]> = {
  common: [60],
  rare: [25],
  epic: [12],
  legendary: [3],
};

export const RESOURCE_DROPS: Record<string, Record<string, number>> = {
  ore: { ore_chunk: 1, mineral_dust: 1 },
  stone: { stone_block: 2, stone_dust: 1 },
  gem: { rough_gem: 1 },
  crystal: { raw_crystal: 1 },
  wood: { wood_log: 1, wood_splinter: 2 },
  hemp: { hemp_fiber: 2 },
  herb: { herb_bundle: 1 },
  shell: { shell_fragment: 2 },
  fish: { raw_fish: 2, fish_scale: 1 },
};

export interface ResourceNode {
  id: string;
  type: string;
  x: number;
  y: number;
  drops: Record<string, number>;
  tier: 'common' | 'rare' | 'epic' | 'legendary';
  profession: 'mining' | 'woodcutting' | 'herbalism' | 'fishing';
}

export interface Animal {
  id: string;
  type: 'hare' | 'fox' | 'deer' | 'boar';
  x: number;
  y: number;
  hp: number;
}

export interface TerrainZone {
  type: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface IslandState {
  id: string;
  characterId?: string;
  seed: string;
  name: string;
  mapStyle: string;
  nodes: ResourceNode[];
  animals: Animal[];
  terrainZones: TerrainZone[];
  campPosition: { x: number; y: number };
  clearings: Array<{ x: number; y: number; radius: number }>;
  mountainTriad?: MountainTriadSeed;
  rtsHeightmap?: RtsHeightmapPayload;
  rtsNatureScatter?: RtsNatureScatterPayload;
  stats: {
    nodeCount: number;
    animalCount: number;
    terrainZoneCount: number;
    resourceBreakdown: Record<string, number>;
  };
  createdAt?: number;
  updatedAt?: number;
  lastUpdate?: number;
}

/**
 * Roll node rarity based on weighted distribution
 */
function rollNodeRarity(rng: () => number): 'common' | 'rare' | 'epic' | 'legendary' {
  const roll = rng() * 100;
  if (roll < 60) return 'common';
  if (roll < 85) return 'rare';
  if (roll < 97) return 'epic';
  return 'legendary';
}

/**
 * Generate terrain zones
 * Creates 6 main zones: mountain, forest, field, shore, water, clearing
 */
export function generateTerrainZones(
  rng: () => number,
  mapWidth: number = 100,
  mapHeight: number = 100
): TerrainZone[] {
  const zones: TerrainZone[] = [];

  // Mountain zone (upper-left area, 25-35% size)
  zones.push({
    type: 'mountain',
    bounds: {
      x: mapWidth * (0.05 + rng() * 0.15),
      y: mapHeight * (0.05 + rng() * 0.15),
      width: mapWidth * (0.25 + rng() * 0.1),
      height: mapHeight * (0.25 + rng() * 0.1),
    },
  });

  // Forest zone (left-center, 28-45% size)
  zones.push({
    type: 'forest',
    bounds: {
      x: mapWidth * (0.35 + rng() * 0.1),
      y: mapHeight * (0.35 + rng() * 0.1),
      width: mapWidth * (0.28 + rng() * 0.17),
      height: mapHeight * (0.28 + rng() * 0.17),
    },
  });

  // Field zone (center, 35-45% size)
  zones.push({
    type: 'field',
    bounds: {
      x: mapWidth * (0.1 + rng() * 0.15),
      y: mapHeight * (0.1 + rng() * 0.15),
      width: mapWidth * (0.35 + rng() * 0.1),
      height: mapHeight * (0.35 + rng() * 0.1),
    },
  });

  // Shore zone (bottom, 15-20% height)
  zones.push({
    type: 'shore',
    bounds: {
      x: 0,
      y: mapHeight * (0.75 + rng() * 0.05),
      width: mapWidth,
      height: mapHeight * (0.15 + rng() * 0.05),
    },
  });

  // Water zone (bottom-right, 20-25% size)
  zones.push({
    type: 'water',
    bounds: {
      x: mapWidth * (0.7 + rng() * 0.15),
      y: mapHeight * (0.05 + rng() * 0.1),
      width: mapWidth * (0.2 + rng() * 0.05),
      height: mapHeight * (0.2 + rng() * 0.05),
    },
  });

  // Clearing zone (center) — large buildable hub for camps + structures
  const clearHalf = HOME_ISLAND_CLEARING_HALF_PCT + rng() * 2;
  zones.push({
    type: 'clearing',
    bounds: {
      x: mapWidth * 0.5 - clearHalf,
      y: mapHeight * 0.5 - clearHalf,
      width: clearHalf * 2,
      height: clearHalf * 2,
    },
  });

  return zones;
}

/** Ensure every canonical home-island zone type exists (seed design requirement). */
export function assertAllHomeIslandZones(zones: TerrainZone[]): TerrainZone[] {
  const present = new Set(zones.map((z) => z.type));
  for (const type of HOME_ISLAND_ZONE_TYPES) {
    if (!present.has(type)) {
      zones.push({
        type,
        bounds: { x: 40, y: 40, width: 12, height: 12 },
      });
    }
  }
  return zones;
}

/**
 * Check if two circles overlap (collision detection)
 */
function circlesOverlap(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < r1 + r2;
}

function spawnResourceNodeInZone(
  terrainZones: TerrainZone[],
  zoneType: string,
  rng: () => number,
  nodes: ResourceNode[],
  mapWidth: number,
  mapHeight: number,
  nodeRadius = 3.0,
): ResourceNode | null {
  const zones = terrainZones.filter((z) => z.type === zoneType);
  if (zones.length === 0) return null;

  const validTypes = NODE_TYPES_BY_ZONE[zoneType] || [];
  if (validTypes.length === 0) return null;

  for (let attempt = 0; attempt < 24; attempt++) {
    const zone = zones[Math.floor(rng() * zones.length)];
    const x = zone.bounds.x + rng() * zone.bounds.width;
    const y = zone.bounds.y + rng() * zone.bounds.height;

    if (x < 0 || x > mapWidth || y < 0 || y > mapHeight) continue;

    const tooClose = nodes.some((node) =>
      circlesOverlap(x, y, nodeRadius, node.x, node.y, nodeRadius),
    );
    if (tooClose) continue;

    const type = validTypes[Math.floor(rng() * validTypes.length)];
    const tier = rollNodeRarity(rng);
    const baseDrops = RESOURCE_DROPS[type] || { [type]: 1 };
    const drops = { ...baseDrops };
    const rarityMultiplier = tier === 'common' ? 1 : tier === 'rare' ? 1.5 : tier === 'epic' ? 2.5 : 4;
    Object.keys(drops).forEach((key) => {
      drops[key] = Math.ceil(drops[key] * rarityMultiplier);
    });

    let profession: ResourceNode['profession'] = 'mining';
    if (type === 'wood') profession = 'woodcutting';
    if (type === 'herb' || type === 'hemp') profession = 'herbalism';
    if (type === 'fish') profession = 'fishing';

    return {
      id: uuidv4(),
      type,
      x,
      y,
      drops,
      tier: tier as 'common' | 'rare' | 'epic' | 'legendary',
      profession,
    };
  }
  return null;
}

/**
 * Generate resource nodes — per-zone budget sums to HOME_ISLAND_NODE_TARGET.
 */
export function generateResourceNodes(
  terrainZones: TerrainZone[],
  rng: () => number,
  targetCount: number = HOME_ISLAND_NODE_TARGET,
  mapWidth: number = 100,
  mapHeight: number = 100
): ResourceNode[] {
  const nodes: ResourceNode[] = [];

  for (const [zoneType, budget] of Object.entries(HOME_ISLAND_NODE_BUDGET)) {
    if (budget <= 0) continue;
    for (let i = 0; i < budget; i++) {
      const node = spawnResourceNodeInZone(terrainZones, zoneType, rng, nodes, mapWidth, mapHeight);
      if (node) nodes.push(node);
    }
  }

  let safety = 0;
  while (nodes.length < targetCount && safety < targetCount * 4) {
    safety++;
    const fillZones = ['field', 'forest', 'mountain', 'shore'];
    const zoneType = fillZones[Math.floor(rng() * fillZones.length)];
    const node = spawnResourceNodeInZone(terrainZones, zoneType, rng, nodes, mapWidth, mapHeight, 2.5);
    if (node) nodes.push(node);
  }

  return nodes;
}

/**
 * Generate animals
 * Weight-based spawning in valid terrain zones
 */
export function generateAnimals(
  terrainZones: TerrainZone[],
  rng: () => number,
  targetCount: number = 8,
  mapWidth: number = 100,
  mapHeight: number = 100
): Animal[] {
  const animals: Animal[] = [];

  // Animal type weights (total = 100)
  const animalWeights: Record<string, number> = {
    hare: 50,  // 50% hares
    fox: 30,   // 30% foxes
    deer: 15,  // 15% deer
    boar: 5,   // 5% boars
  };

  // Zone compatibility
  const zoneCompat: Record<string, string[]> = {
    hare: ['forest', 'field', 'clearing'],
    fox: ['forest', 'mountain'],
    deer: ['field', 'forest'],
    boar: ['mountain', 'forest'],
  };

  const maxAttempts = targetCount * 5;
  let attempts = 0;

  while (animals.length < targetCount && attempts < maxAttempts) {
    attempts++;

    // Pick animal type by weight
    const roll = rng() * 100;
    let type = 'hare';
    let sum = 0;
    for (const [name, weight] of Object.entries(animalWeights)) {
      sum += weight;
      if (roll <= sum) {
        type = name;
        break;
      }
    }

    // Random position
    const x = rng() * mapWidth;
    const y = rng() * mapHeight;

    // Check if position is in compatible zone
    const zone = terrainZones.find((z) => {
      return (
        x >= z.bounds.x &&
        x <= z.bounds.x + z.bounds.width &&
        y >= z.bounds.y &&
        y <= z.bounds.y + z.bounds.height
      );
    });

    if (!zone || !zoneCompat[type]?.includes(zone.type)) continue;

    // Base HP varies by type
    const baseHp: Record<string, number> = { hare: 5, fox: 15, deer: 20, boar: 30 };
    const hp = baseHp[type] || 10;

    animals.push({
      id: uuidv4(),
      type: type as 'hare' | 'fox' | 'deer' | 'boar',
      x,
      y,
      hp,
    });
  }

  return animals;
}

/**
 * Validate island state structure
 */
export function validateIslandAssets(
  state: IslandState
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!state.nodes || state.nodes.length === 0) {
    errors.push('No resource nodes generated');
  }

  if (!state.animals || state.animals.length === 0) {
    errors.push('No animals generated');
  }

  if (!state.terrainZones || state.terrainZones.length === 0) {
    errors.push('No terrain zones generated');
  }

  if (!state.campPosition) {
    errors.push('No camp position defined');
  } else if (state.campPosition.x < 0 || state.campPosition.x > 100 ||
             state.campPosition.y < 0 || state.campPosition.y > 100) {
    errors.push('Camp position out of bounds');
  }

  if (!state.stats) {
    errors.push('No stats calculated');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate complete island state
 * Orchestrator function that calls all generation functions
 */
export function generateIslandState(
  characterId: string,
  seed: string,
  mapWidth: number = 100,
  mapHeight: number = 100
): IslandState {
  // Initialize seeded RNG
  const rng = seededRandom(seed);

  // Generate all components (all 6 zone types + Sketchfab mountain triad from seed)
  const terrainZones = assertAllHomeIslandZones(generateTerrainZones(rng, mapWidth, mapHeight));
  const nodes = generateResourceNodes(terrainZones, rng, HOME_ISLAND_NODE_TARGET, mapWidth, mapHeight);
  const animals = generateAnimals(terrainZones, rng, HOME_ISLAND_ANIMAL_TARGET, mapWidth, mapHeight);
  const mountainTriad = generateMountainTriadSeed(seed);

  // Camp position: center of clearing zone (if available)
  const clearingZone = terrainZones.find((z) => z.type === 'clearing');
  const campPosition = clearingZone
    ? {
        x: clearingZone.bounds.x + clearingZone.bounds.width / 2,
        y: clearingZone.bounds.y + clearingZone.bounds.height / 2,
      }
    : {
        x: mapWidth / 2,
        y: mapHeight / 2,
      };

  // Calculate resource breakdown
  const resourceBreakdown: Record<string, number> = {};
  nodes.forEach((node) => {
    resourceBreakdown[node.type] = (resourceBreakdown[node.type] || 0) + 1;
  });

  // Create island state
  const islandState: IslandState = {
    id: uuidv4(),
    characterId,
    seed,
    name: `Island of ${characterId.substring(0, 8)}`,
    mapStyle: ['iron', 'fantasy', 'tactical', 'night'][Math.floor(rng() * 4)],
    nodes,
    animals,
    terrainZones,
    campPosition,
    clearings: terrainZones
      .filter((z) => z.type === 'clearing')
      .map((z) => ({
        x: z.bounds.x + z.bounds.width / 2,
        y: z.bounds.y + z.bounds.height / 2,
        radius: Math.min(z.bounds.width, z.bounds.height) / 2,
      })),
    mountainTriad,
    stats: {
      nodeCount: nodes.length,
      animalCount: animals.length,
      terrainZoneCount: terrainZones.length,
      resourceBreakdown,
    },
    createdAt: Date.now(),
    lastUpdate: Date.now(),
  };

  return islandState;
}

/** Persistable island state (client + DB canonical shape with sheep alias). */
export function islandStateForStorage(
  characterId: string,
  seed: string,
): IslandState & { sheep: Animal[] } {
  const generated = generateIslandState(characterId, seed);
  return { ...generated, sheep: generated.animals };
}

/** True when the stored island has no playable content yet. */
export function islandStateNeedsGeneration(state: Record<string, unknown> | null | undefined): boolean {
  if (!state) return true;
  const nodes = state.nodes;
  return !Array.isArray(nodes) || nodes.length === 0;
}

export interface RtsExportInput {
  gridX: number;
  gridZ: number;
  seed: number;
  biome: string;
  heightmap?: RtsHeightmapPayload;
}

/** Merge RTS grid export + optional heightmap into canonical island state. */
export function mergeRtsExportIntoIslandState(
  base: IslandState,
  rts: RtsExportInput,
): IslandState {
  const mergedSeed = `${base.seed}_rts_${rts.gridX}_${rts.gridZ}_${rts.seed}`;
  const mountainTriad = generateMountainTriadSeed(mergedSeed);

  if (!rts.heightmap) {
    return {
      ...base,
      mountainTriad,
      lastUpdate: Date.now(),
    };
  }

  const terrainZones = deriveTerrainZonesFromRtsHeightmap(rts.heightmap);
  const campPosition = deriveCampPositionFromZones(terrainZones);
  const clearings = terrainZones
    .filter((z) => z.type === 'clearing')
    .map((z) => ({
      x: z.bounds.x + z.bounds.width / 2,
      y: z.bounds.y + z.bounds.height / 2,
      radius: Math.min(z.bounds.width, z.bounds.height) / 2,
    }));

  const rtsNatureScatter = generateRtsNatureScatter(rts.seed, rts.biome, rts.heightmap);

  return {
    ...base,
    terrainZones: assertAllHomeIslandZones(terrainZones),
    campPosition,
    clearings: clearings.length > 0 ? clearings : base.clearings,
    mountainTriad,
    rtsHeightmap: rts.heightmap,
    rtsNatureScatter,
    stats: {
      ...base.stats,
      terrainZoneCount: terrainZones.length,
    },
    lastUpdate: Date.now(),
  };
}

// Note: seededRandom, generateTerrainZones, generateResourceNodes, generateAnimals
// are already exported at their declaration sites above.

/**
 * Home Island Spec — canonical meters, assets, textures, and regrow regions.
 * SSOT for Railway generation, 3D engine, Colyseus, and /api/island/spec.
 */
import {
  HOME_ISLAND_RTS_SIZE_M,
  HOME_ISLAND_WORLD_SIZE_M,
  MOUNTAIN_TRIAD_ISLAND_FRACTION,
  SKETCHFAB_EVIL_MOUNTAIN_TRIAD,
  MOUNTAIN_TRIAD_PEAK_MODEL_PATHS,
  DUNGEON_ENTRANCE_HEIGHT_M,
} from './homeIslandSeed';
import {
  HOME_ISLAND_ANIMAL_TARGET,
  HOME_ISLAND_CAMP_CLEAR_RADIUS_M,
  HOME_ISLAND_CAMP_PLATEAU_HEIGHT_M,
  HOME_ISLAND_HARVEST_ZONE_COUNT,
  HOME_ISLAND_NODE_TARGET,
} from './homeIslandQuality';
import {
  DRIFTWOOD_BAY,
  IRONFANG_SPIRE,
  exportHomeIslandFoundationsDoc,
  resolveHomeIslandFoundation,
  type HomeIslandFoundationId,
} from './homeIslandFoundations';
import {
  harvestRockPack,
  harvestTreePack,
  ORGANIZED_NATURE_SCATTER_PATHS,
  exportNatureAssetCatalogDoc,
} from './natureAssetCatalog';

export const HOME_ISLAND_SPEC_VERSION = '2.2.0';

// ── Character reference (ALL world props scale relative to this) ─────────────

/**
 * Canonical player height in world meters. Race GLB scale=1.0 ≈ this height.
 * Trees ~5.5–9.5m, rocks ~1.8–3.8m, animals use ISLAND_ANIMALS heightM.
 * Studio editor + Island3DEngine + nature scatter must honor this.
 */
export const CHARACTER_REFERENCE_HEIGHT_M = 2.0;

/** Race model `scale` multipliers stay relative to CHARACTER_REFERENCE_HEIGHT_M. */
export const RACE_HEIGHT_MULT = {
  human: 1.0,
  elf: 1.0,
  undead: 1.0,
  dwarf: 0.85,
  barbarian: 1.1,
  orc: 1.15,
} as const;

// ── World scale ─────────────────────────────────────────────────────────────

export const ISLAND_SCALE = {
  /** 2D logical map (percent coords, north = low Y) */
  mapPercent: 100,
  /** 3D + Colyseus world diameter (meters) */
  worldSizeM: HOME_ISLAND_WORLD_SIZE_M,
  /** RTS procedural core upsampled into terrain center */
  rtsCoreSizeM: HOME_ISLAND_RTS_SIZE_M,
  /** Player / NPC character height reference */
  characterHeightM: CHARACTER_REFERENCE_HEIGHT_M,
  /** meters per 1% on 2D map */
  metersPerPercent: HOME_ISLAND_WORLD_SIZE_M / 100,
  /** 2D map pixels are NOT 1:1 meters — use this for world↔percent */
  percentToMeters: (pct: number) => (pct / 100) * HOME_ISLAND_WORLD_SIZE_M,
  metersToPercent: (m: number) => (m / HOME_ISLAND_WORLD_SIZE_M) * 100,
} as const;

/**
 * Convert a desired real-world height (meters) into a GLB root scale factor
 * given the mesh's current axis-aligned height in model units.
 */
export function scaleFactorForTargetHeightM(
  meshHeightModelUnits: number,
  targetHeightM: number,
): number {
  if (meshHeightModelUnits <= 1e-6) return 1;
  return targetHeightM / meshHeightModelUnits;
}

/** Wildlife GLB scale helper — target animal height relative to 2m character. */
export function wildlifeScaleForHeightM(
  defScale: number,
  targetHeightM: number,
  meshHeightModelUnits = CHARACTER_REFERENCE_HEIGHT_M,
): number {
  const fit = scaleFactorForTargetHeightM(meshHeightModelUnits, targetHeightM);
  return defScale * fit;
}

// ── Heightmap / terrain system ──────────────────────────────────────────────

export const ISLAND_HEIGHTMAP = {
  meshSegments: 63,
  minHeightM: -30,
  maxHeightM: 80,
  /** Camp flattened plateau */
  plateauHeightM: HOME_ISLAND_CAMP_PLATEAU_HEIGHT_M,
  plateauRadiusM: HOME_ISLAND_CAMP_CLEAR_RADIUS_M,
  /** Biome elevation thresholds (normalized 0–1 noise) */
  biomeWaterBelow: 0.28,
  biomeBeachBelow: 0.36,
  biomeRockAbove: 0.72,
  biomeForestMoistureAbove: 0.58,
  /** Beach ring along shoreline (world meters from water edge inward) */
  beachBandDepthM: 18,
  beachBandMinHeightM: -2,
  beachBandMaxHeightM: 4,
  /** RTS heightmap blend: center 200m core, outer ring procedural */
  rtsBlendStartRadiusM: HOME_ISLAND_RTS_SIZE_M / 2,
  rtsBlendEndRadiusM: HOME_ISLAND_RTS_SIZE_M / 2 + 120,
} as const;

// ── Textures (3D terrain) ───────────────────────────────────────────────────

export const ISLAND_TERRAIN_TEXTURES = {
  mode: 'blended_procedural' as const,
  cdnBase: '/textures/pbr/ground',
  /** Primary home-island blend layers (height + slope) */
  blendLayers: [
    { id: 'seafloor', name: 'Seafloor', heightRangeM: [-30, -8] },
    { id: 'sand', name: 'Beach Sand', heightRangeM: [-10, 12] },
    { id: 'grass_short', name: 'Coastal Grass', heightRangeM: [8, 55] },
    { id: 'grass_tall', name: 'Inland Forest Floor', heightRangeM: [30, 70] },
    { id: 'rock', name: 'Cliff Rock', slopeDriven: true },
  ],
  /** Optional 4K PBR ground set (assets.grudge-studio.com) — ~8m/tile at 2.4× repeat */
  pbrGroundCatalog: [
    { id: 'ground_1', name: 'Tropical Shore', repeatTiles: 29 },
    { id: 'ground_2', name: 'Verdant Meadow', repeatTiles: 24 },
    { id: 'ground_3', name: 'Sun-Baked Dunes', repeatTiles: 19 },
    { id: 'ground_4', name: 'Storm Reef Gravel', repeatTiles: 14 },
    { id: 'ground_5', name: 'Volcanic Ash', repeatTiles: 17 },
    { id: 'ground_6', name: 'Thornwood Floor', repeatTiles: 22 },
    { id: 'ground_7', name: 'Frostbite Tundra', repeatTiles: 24 },
    { id: 'ground_8', name: 'Ethereal Moss', repeatTiles: 19 },
    { id: 'ground_9', name: 'Abyssal Silt', repeatTiles: 26 },
    { id: 'ground_10', name: 'Nexus Fracture', repeatTiles: 12 },
  ],
  /** 2D tilemap (percent map) */
  tilemap2d: {
    sheet: '/sprites/2d-island/tiles/water-island-tiles.png',
    tileSizePx: 16,
    terrain: ['grass', 'sand', 'shallowWater', 'deepWater'] as const,
  },
} as const;

// ── Mountain triad + cave ───────────────────────────────────────────────────

export const ISLAND_MOUNTAIN = {
  modelCombined: SKETCHFAB_EVIL_MOUNTAIN_TRIAD.modelPath,
  modelLegacy: SKETCHFAB_EVIL_MOUNTAIN_TRIAD.legacyModelPath,
  peakModels: [...MOUNTAIN_TRIAD_PEAK_MODEL_PATHS],
  sketchfabUid: SKETCHFAB_EVIL_MOUNTAIN_TRIAD.uid,
  /** Triad spans 10% of island = 102.4m on 1024m world */
  footprintSpanM: HOME_ISLAND_WORLD_SIZE_M * MOUNTAIN_TRIAD_ISLAND_FRACTION,
  peakCount: 3,
  peakOffsetsM: [
    { x: -55, z: 0 },
    { x: 0, z: 0 },
    { x: 55, z: 0 },
  ],
  /** Scaled per-island from combined GLB bounds */
  entranceHeightM: DUNGEON_ENTRANCE_HEIGHT_M,
  caveDiscoverRadiusM: 32,
  approachRadiusM: 120,
  /** Northern belt anchor on 2D map (percent) */
  anchorPercentRange: { x: [48, 56], y: [8, 18] },
} as const;

// ── Animals (world meters: height = top-to-bottom, width = side-to-side) ────

export interface AnimalWorldScale {
  id: 'hare' | 'fox' | 'deer' | 'boar';
  name: string;
  heightM: number;
  widthM: number;
  /** Body length nose-to-tail for quadrupeds */
  depthM: number;
  hp: number;
  spawnWeight: number;
  sprite2d: { walk: string; death: string; framePx: number; displayScale: number };
}

export const ISLAND_ANIMALS: Record<AnimalWorldScale['id'], AnimalWorldScale> = {
  hare: {
    id: 'hare',
    name: 'Hare',
    heightM: 0.38,
    widthM: 0.22,
    depthM: 0.42,
    hp: 5,
    spawnWeight: 50,
    sprite2d: {
      walk: '/sprites/topdown/animals/Tiled/Hare_Walk_with_shadow.png',
      death: '/sprites/topdown/animals/Tiled/Hare_Death_with_shadow.png',
      framePx: 32,
      displayScale: 1.5,
    },
  },
  fox: {
    id: 'fox',
    name: 'Fox',
    heightM: 0.55,
    widthM: 0.28,
    depthM: 0.85,
    hp: 15,
    spawnWeight: 30,
    sprite2d: {
      walk: '/sprites/topdown/animals/Tiled/Fox_walk_with_shadow.png',
      death: '/sprites/topdown/animals/Tiled/Fox_Death_with_shadow.png',
      framePx: 32,
      displayScale: 1.5,
    },
  },
  deer: {
    id: 'deer',
    name: 'Deer',
    heightM: 1.35,
    widthM: 0.55,
    depthM: 1.6,
    hp: 20,
    spawnWeight: 15,
    sprite2d: {
      walk: '/sprites/topdown/animals/Tiled/Deer_Walk_with_shadow.png',
      death: '/sprites/topdown/animals/Tiled/Deer_Death_with_shadow.png',
      framePx: 32,
      displayScale: 1.5,
    },
  },
  boar: {
    id: 'boar',
    name: 'Boar',
    heightM: 0.95,
    widthM: 0.65,
    depthM: 1.25,
    hp: 30,
    spawnWeight: 5,
    sprite2d: {
      walk: '/sprites/topdown/animals/Tiled/Boar_Run_with_shadow.png',
      death: '/sprites/topdown/animals/Tiled/Boar_Death_with_shadow.png',
      framePx: 32,
      displayScale: 1.5,
    },
  },
};

export const ISLAND_ANIMAL_TARGET = HOME_ISLAND_ANIMAL_TARGET;

// ── Harvest nodes (3D world meters) ─────────────────────────────────────────

export interface HarvestNodeScale {
  type: string;
  heightM: { min: number; max: number };
  widthM: { min: number; max: number };
  modelPath: string;
  variants?: string[];
  respawnMs: number;
  health: number;
}

const _harvestTree = harvestTreePack();
const _harvestRock = harvestRockPack();

export const ISLAND_HARVEST_NODES: Record<string, HarvestNodeScale> = {
  tree: {
    type: 'tree',
    heightM: { min: _harvestTree.heightM[0], max: _harvestTree.heightM[1] },
    widthM: { min: 3.5, max: 6.0 },
    /** Interim pack — low-poly megakit banned; HQ under /models/nature/realistic/trees/ */
    modelPath: _harvestTree.path,
    variants: [..._harvestTree.variants],
    respawnMs: 4 * 60 * 60 * 1000, // 4h generative seed regen
    health: 5,
  },
  rock: {
    type: 'rock',
    heightM: { min: _harvestRock.heightM[0], max: _harvestRock.heightM[1] },
    widthM: { min: 2.0, max: 4.5 },
    /** Interim pack — Rock_Medium megakit banned; HQ under /models/nature/realistic/rocks/ */
    modelPath: _harvestRock.path,
    variants: [..._harvestRock.variants],
    respawnMs: 4 * 60 * 60 * 1000,
    health: 4,
  },
  ore: {
    type: 'ore',
    heightM: { min: 2.0, max: 4.2 },
    widthM: { min: 2.2, max: 5.0 },
    modelPath: '/models/environment/harvest_gold_rocks.glb',
    variants: ['Rock', 'rock', 'Gold', 'Cube', 'Mesh'],
    respawnMs: 4 * 60 * 60 * 1000,
    health: 5,
  },
  gem: {
    type: 'gem',
    heightM: { min: 1.6, max: 2.8 },
    widthM: { min: 1.2, max: 2.4 },
    modelPath: '/models/environment/gem_cluster.glb',
    variants: ['Sphere', 'Sphere.001', 'Sphere.002'],
    respawnMs: 4 * 60 * 60 * 1000,
    health: 3,
  },
  hemp: {
    type: 'hemp',
    heightM: { min: 1.8, max: 2.8 },
    widthM: { min: 0.8, max: 1.4 },
    modelPath: 'procedural',
    respawnMs: 4 * 60 * 60 * 1000,
    health: 2,
  },
  flower: {
    type: 'flower',
    heightM: { min: 0.4, max: 1.1 },
    widthM: { min: 0.9, max: 1.8 },
    modelPath: 'procedural',
    respawnMs: 4 * 60 * 60 * 1000,
    health: 2,
  },
  scrap: {
    type: 'scrap',
    heightM: { min: 0.5, max: 1.2 },
    widthM: { min: 1.2, max: 2.0 },
    modelPath: 'procedural',
    respawnMs: 4 * 60 * 60 * 1000,
    health: 2,
  },
  stump: {
    type: 'stump',
    heightM: { min: 0.6, max: 1.0 },
    widthM: { min: 0.8, max: 1.4 },
    modelPath: '/models/environment/harvest_stump.glb',
    respawnMs: 0,
    health: 0,
  },
  log: {
    type: 'log',
    heightM: { min: 0.5, max: 1.0 },
    widthM: { min: 0.3, max: 0.5 },
    modelPath: '/models/environment/harvest_logs.glb',
    respawnMs: 0,
    health: 0,
  },
  debris: {
    type: 'debris',
    heightM: { min: 0.25, max: 0.55 },
    widthM: { min: 0.4, max: 0.9 },
    modelPath: '/models/environment/harvest_rock_debris.glb',
    respawnMs: 0,
    health: 0,
  },
};

/** Target fit height for GLB mount (meters) — midpoint of spec range × scale multiplier */
export function harvestFitHeightM(type: keyof typeof ISLAND_HARVEST_NODES, scale = 1): number {
  const spec = ISLAND_HARVEST_NODES[type];
  if (!spec) return 2 * scale;
  const mid = (spec.heightM.min + spec.heightM.max) / 2;
  return mid * scale;
}

// ── Nature scatter — organized assets only (no low-poly megakit) ────────────

const _scatterTree = ORGANIZED_NATURE_SCATTER_PATHS.tree;
const _scatterPine = ORGANIZED_NATURE_SCATTER_PATHS.pine;
const _scatterRock = ORGANIZED_NATURE_SCATTER_PATHS.rock;

/**
 * Home-island foliage catalog. CommonTree / Twisted / DeadTree / Rock_Medium
 * and other Quaternius megakit paths are removed. Empty model lists mean
 * "skip category until realistic GLB is on R2".
 */
export const ISLAND_NATURE_SCATTER = {
  policy: 'realistic_or_interim_pack_only' as const,
  banned: 'CommonTree, TwistedTree, DeadTree, Rock_Medium, Pine_* megakit, lowpoly/*',
  foundations: {
    driftwood_bay: DRIFTWOOD_BAY.id,
    ironfang_spire: IRONFANG_SPIRE.id,
  },
  totalInstances: 48,
  categories: {
    tree: { count: 14, models: _scatterTree, scaleM: [4.5, 9.0] as [number, number] },
    pine: { count: 12, models: _scatterPine, scaleM: [3.6, 7.5] as [number, number] },
    // deadTree / twisted deliberately omitted (low-poly ban)
    rock: { count: 10, models: _scatterRock, scaleM: [1.6, 4.0] as [number, number] },
    // Groundcover megakit banned until realistic groundcover GLBs exist
    bush: { count: 0, models: [] as string[], scaleM: [0.8, 1.5] as [number, number] },
    grass: { count: 0, models: [] as string[], scaleM: [0.6, 1.2] as [number, number] },
    mushroom: { count: 0, models: [] as string[], scaleM: [0.25, 0.5] as [number, number] },
    flower: { count: 0, models: [] as string[], scaleM: [0.4, 0.8] as [number, number] },
    fern: { count: 0, models: [] as string[], scaleM: [0.5, 1.0] as [number, number] },
    plant: { count: 0, models: [] as string[], scaleM: [0.5, 1.2] as [number, number] },
  },
} as const;

// ── Regrowing anchor regions (always present on every home island) ──────────

export type HomeIslandRegrowRegionId = 'forest_grove' | 'quarry' | 'beach_shells';

export interface HomeIslandRegrowRegion {
  id: HomeIslandRegrowRegionId;
  label: string;
  /** Center on 2D percent map */
  centerPercent: { x: number; y: number };
  radiusM: number;
  regrow: true;
  respawnMs: number;
  /** 3D harvest zone type */
  harvestZoneType: 'forest' | 'rock_field' | 'gem_vein' | 'mixed';
  nodeSlots: Array<{ type: 'tree' | 'rock' | 'crystal' | 'hemp' | 'flower' | 'scrap'; count: number }>;
  dbNodeTypes: string[];
}

/** Deterministic anchor offsets from seed — regions orbit fixed compass slots */
export function generateRegrowRegions(seed: string): HomeIslandRegrowRegion[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h) + seed.charCodeAt(i) | 0;
  const jitter = (n: number) => ((Math.abs(h + n * 9973) % 100) - 50) / 50;

  return [
    {
      id: 'forest_grove',
      label: 'Regrowing Timber Grove',
      centerPercent: { x: 28 + jitter(1) * 4, y: 42 + jitter(2) * 4 },
      radiusM: 95,
      regrow: true,
      respawnMs: ISLAND_HARVEST_NODES.tree.respawnMs,
      harvestZoneType: 'forest',
      nodeSlots: [{ type: 'tree', count: 14 }],
      dbNodeTypes: ['wood', 'herb'],
    },
    {
      id: 'quarry',
      label: 'Regrowing Stone Quarry',
      centerPercent: { x: 72 + jitter(3) * 3, y: 38 + jitter(4) * 3 },
      radiusM: 78,
      regrow: true,
      respawnMs: ISLAND_HARVEST_NODES.rock.respawnMs,
      harvestZoneType: 'rock_field',
      nodeSlots: [
        { type: 'rock', count: 8 },
        { type: 'crystal', count: 2 },
      ],
      dbNodeTypes: ['stone', 'ore', 'gem'],
    },
    {
      id: 'beach_shells',
      label: 'Shoreline Beach',
      centerPercent: { x: 50 + jitter(5) * 6, y: 88 + jitter(6) * 2 },
      radiusM: ISLAND_HEIGHTMAP.beachBandDepthM * 4,
      regrow: true,
      respawnMs: 4 * 60 * 60 * 1000,
      harvestZoneType: 'mixed',
      nodeSlots: [
        { type: 'flower', count: 4 },
        { type: 'scrap', count: 2 },
      ],
      dbNodeTypes: ['shell', 'fish'],
    },
  ];
}

// ── Summary export for API / tooling ────────────────────────────────────────

export function getHomeIslandSpecSummary() {
  return {
    version: HOME_ISLAND_SPEC_VERSION,
    scale: ISLAND_SCALE,
    heightmap: ISLAND_HEIGHTMAP,
    textures: ISLAND_TERRAIN_TEXTURES,
    mountain: ISLAND_MOUNTAIN,
    animals: ISLAND_ANIMALS,
    harvestNodes: ISLAND_HARVEST_NODES,
    natureScatter: ISLAND_NATURE_SCATTER,
    /** Driftwood Bay + Ironfang Spire size foundations */
    foundations: exportHomeIslandFoundationsDoc(),
    natureAssets: exportNatureAssetCatalogDoc(),
    targets: {
      dbNodes: HOME_ISLAND_NODE_TARGET,
      animals: HOME_ISLAND_ANIMAL_TARGET,
      harvestZones: HOME_ISLAND_HARVEST_ZONE_COUNT,
      campRadiusM: HOME_ISLAND_CAMP_CLEAR_RADIUS_M,
      plateauHeightM: HOME_ISLAND_CAMP_PLATEAU_HEIGHT_M,
    },
    terrainZoneTypes: ['mountain', 'forest', 'field', 'shore', 'water', 'clearing'] as const,
    regrowRegionTemplate: generateRegrowRegions('example-seed'),
  };
}

/** Resolve foundation layout for a seed/biome (used by generators + API). */
export function foundationForIsland(seed: string, biome?: string | null) {
  return resolveHomeIslandFoundation(seed, biome);
}

export type { HomeIslandFoundationId };
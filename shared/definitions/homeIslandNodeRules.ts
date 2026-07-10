/**
 * Home-island node placement ruleset (SSOT).
 *
 * Rule: resource nodes sit on **dry terrain**.
 * Only **fishing** nodes may be in / at water.
 * Docks sit on **shore** (beach band), not open ocean.
 *
 * Used by:
 *  - client NodePlacer / HarvestZonePlacer / HarvestZoneBuilder
 *  - TerrainNavMesh walkability (same dry band as land nodes)
 *  - 2D island map generators (optional import)
 */

/** Meters above water surface required for land nodes (trees, rocks, etc.) */
export const NODE_LAND_CLEARANCE_M = 0.75;

/** Max slope (radians) for land node placement */
export const NODE_LAND_MAX_SLOPE_RAD = 0.55;

/** Fishing: Y must be within [waterLevel - below, waterLevel + above] */
export const FISHING_Y_BELOW_WATER_M = 2.0;
export const FISHING_Y_ABOVE_WATER_M = 1.25;

/** Dock: on beach / shore band slightly above water */
export const DOCK_MIN_Y_ABOVE_WATER_M = 0.1;
export const DOCK_MAX_Y_ABOVE_WATER_M = 3.5;

export type NodeSurfaceKind = 'land' | 'fishing' | 'shore';

export type HomeIslandNodeType =
  | 'tree'
  | 'rock'
  | 'bush'
  | 'herb'
  | 'fish'
  | 'crystal'
  | 'hemp'
  | 'flower'
  | 'scrap'
  | 'dock'
  | 'mine'
  | 'ore';

/** Surface class for each harvest / placeable node type */
export const NODE_SURFACE: Record<HomeIslandNodeType, NodeSurfaceKind> = {
  tree: 'land',
  rock: 'land',
  bush: 'land',
  herb: 'land',
  crystal: 'land',
  hemp: 'land',
  flower: 'land',
  scrap: 'land',
  mine: 'land',
  ore: 'land',
  /** Only type allowed in water / shallows */
  fish: 'fishing',
  /** Shore only — pier roots on beach, not mid-ocean */
  dock: 'shore',
};

export type BiomeLike = 'water' | 'beach' | 'grass' | 'forest' | 'rock' | string;

export interface NodePlacementContext {
  type: HomeIslandNodeType | string;
  worldY: number;
  waterLevel: number;
  biome?: BiomeLike | null;
  /** Optional slope in radians (from terrain normal) */
  slopeRad?: number | null;
}

/**
 * Canonical gate: may this node type sit at (y, biome) given waterLevel?
 */
export function isValidNodePlacement(ctx: NodePlacementContext): boolean {
  const surface = NODE_SURFACE[ctx.type as HomeIslandNodeType] ?? 'land';
  const y = ctx.worldY;
  const wl = ctx.waterLevel;
  const biome = (ctx.biome ?? '').toLowerCase();

  if (surface === 'fishing') {
    // Fish / fishing spots: in water OR shallow beach edge
    if (y < wl - FISHING_Y_BELOW_WATER_M) return false;
    if (y > wl + FISHING_Y_ABOVE_WATER_M) return false;
    // Prefer water / beach biomes when known
    if (biome && biome !== 'water' && biome !== 'beach') return false;
    return true;
  }

  if (surface === 'shore') {
    if (y < wl + DOCK_MIN_Y_ABOVE_WATER_M) return false;
    if (y > wl + DOCK_MAX_Y_ABOVE_WATER_M) return false;
    if (biome === 'water') return false;
    // Beach preferred; allow grass edge
    if (biome && biome !== 'beach' && biome !== 'grass') return false;
    return true;
  }

  // ── Land (default) — never in water ──────────────────────────────
  if (biome === 'water') return false;
  if (y < wl + NODE_LAND_CLEARANCE_M) return false;
  if (ctx.slopeRad != null && ctx.slopeRad > NODE_LAND_MAX_SLOPE_RAD) return false;
  return true;
}

/** True if this type is allowed to sit at/below water (fishing only). */
export function allowsWaterSurface(type: string): boolean {
  return NODE_SURFACE[type as HomeIslandNodeType] === 'fishing';
}

/** True if walkable land for pathfinding (mirrors land-node dry band). */
export function isDryWalkableTerrain(opts: {
  worldY: number;
  waterLevel: number;
  biome?: BiomeLike | null;
  slopeRad?: number | null;
  /** Override dry clearance (default NODE_LAND_CLEARANCE_M) */
  clearanceM?: number;
  /** Optional max slope for walk; default slightly looser than node place */
  maxSlopeRad?: number;
}): boolean {
  const biome = (opts.biome ?? '').toLowerCase();
  if (biome === 'water') return false;
  const clear = opts.clearanceM ?? NODE_LAND_CLEARANCE_M;
  if (opts.worldY < opts.waterLevel + clear) return false;
  const maxSlope = opts.maxSlopeRad ?? 0.85;
  if (opts.slopeRad != null && opts.slopeRad > maxSlope) return false;
  return true;
}

/** Serialize rules for dash / ObjectStore docs */
export const HOME_ISLAND_NODE_RULESET_META = {
  version: '1.0.0',
  landClearanceM: NODE_LAND_CLEARANCE_M,
  fishingOnlyInWater: true,
  rule: 'Nodes on terrain (dry). Only fishing nodes may be in water.',
} as const;

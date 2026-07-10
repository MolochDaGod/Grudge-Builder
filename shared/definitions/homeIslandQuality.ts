/**
 * Home island quality bar — shared between Railway generation, 2D gameplay, and 3D engine.
 * User home islands are durable account assets; these targets define minimum richness
 * for a full generative play surface (terrain, zones, harvest, nav, ocean).
 */
import { HOME_ISLAND_WORLD_SIZE_M } from './homeIslandSeed';

/** Harvestable resource nodes on the 2D map + DB state */
export const HOME_ISLAND_NODE_TARGET = 48;

/** Passive wildlife (skinning / ambience) */
export const HOME_ISLAND_ANIMAL_TARGET = 18;

/**
 * 3D harvest zones across 1024m: regrow anchors (forest/quarry/beach) + procedural
 * patches covering forest / rock / gem / hemp / flower / scrap biomes.
 * (+4 forest emphasis vs historical 28 — denser board without second full scatter)
 */
export const HOME_ISLAND_HARVEST_ZONE_COUNT = 32;

/** Min spacing between 3D harvest zones (meters) — denser than RTS core */
export const HOME_ISLAND_HARVEST_ZONE_SPACING_M = 48;

/**
 * Extra canopy layers (understory → emergent) around forest zones.
 * These are NOT a second island-wide nature deploy.
 */
export const HOME_ISLAND_TREE_CANOPY_LAYERS = 4;

/** Home island board cell size (meters) — hero feet snap to cell centers */
export const HOME_ISLAND_BOARD_CELL_M = 4;

/** Procedural home island: no Gerstner ocean plane (board play surface) */
export const HOME_ISLAND_DISABLE_OCEAN = true;

/** Flat build hub radius in world meters (1024m island) */
export const HOME_ISLAND_CAMP_CLEAR_RADIUS_M = 88;

/** Heightmap mesh resolution (segments per axis). 127 ≈ 8 m/vertex on 1024 m. */
export const HOME_ISLAND_TERRAIN_SEGMENTS = 127;

/** NavMesh grid cell size (meters) for ally / wildlife pathing */
export const HOME_ISLAND_NAVMESH_CELL_M = 8;

/** Ocean plane diameter (meters) — extends past island for depth horizon */
export const HOME_ISLAND_OCEAN_SIZE_M = 2048;

/** Ocean mesh segments (wave detail) */
export const HOME_ISLAND_OCEAN_SEGMENTS = 48;

/** Seafloor depth under water plane (meters, local height) */
export const HOME_ISLAND_SEAFLOOR_DEPTH_M = -22;

/** Nature foliage instance budget for full 1024m island */
export const HOME_ISLAND_NATURE_INSTANCE_BUDGET = 480;

/** 2D logical map clearing — half-width on 0–100% coords (~28% diameter) */
export const HOME_ISLAND_CLEARING_HALF_PCT = 14;

/** Max terrain slope for foundation / prop placement (radians) */
export const HOME_ISLAND_BUILDABLE_MAX_SLOPE_RAD = 0.38;

/** Allowed build height band (meters above water) */
export const HOME_ISLAND_BUILDABLE_MIN_HEIGHT_M = 0.5;
export const HOME_ISLAND_BUILDABLE_MAX_HEIGHT_M = 48;

/** Flattened camp plateau height (meters) */
export const HOME_ISLAND_CAMP_PLATEAU_HEIGHT_M = 7;

/** Colyseus + 3D engine world diameter */
export const HOME_ISLAND_SYNC_SIZE_M = HOME_ISLAND_WORLD_SIZE_M;

/** Per-zone node budget (sums to HOME_ISLAND_NODE_TARGET) */
export const HOME_ISLAND_NODE_BUDGET: Record<string, number> = {
  mountain: 8,
  forest: 10,
  field: 8,
  shore: 4,
  water: 2,
  clearing: 0,
};

/** Convert percent camp coords (north = low y) to world XZ on square terrain */
export function campPercentToWorld(
  percent: { x: number; y: number },
  terrainSizeM = HOME_ISLAND_WORLD_SIZE_M,
): { x: number; z: number } {
  return {
    x: (percent.x / 100 - 0.5) * terrainSizeM,
    z: (percent.y / 100 - 0.5) * terrainSizeM,
  };
}

/** Default central camp when state has no committed position yet */
export const HOME_ISLAND_DEFAULT_CAMP_PERCENT = { x: 50, y: 52 } as const;
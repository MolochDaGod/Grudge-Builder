/**
 * Home island quality bar — shared between Railway generation, 2D gameplay, and 3D engine.
 *
 * Production Warlords rule: the home island is a full open-play MMO surface, not a
 * board-only preview. These values intentionally bias toward the highest-quality
 * terrain, water, ecosystem density, navigation, and profession gameplay that the
 * canonical Three.js/Rapier client can sustain.
 */
import { HOME_ISLAND_WORLD_SIZE_M } from './homeIslandSeed';

/** Harvestable resource nodes on the 2D map + DB state */
export const HOME_ISLAND_NODE_TARGET = 64;

/** Passive wildlife (skinning / ambience / ecosystem play) */
export const HOME_ISLAND_ANIMAL_TARGET = 24;

/**
 * 3D harvest zones across 1024m: regrow anchors (forest/quarry/beach) + procedural
 * patches covering forest / rock / gem / hemp / flower / scrap biomes.
 */
export const HOME_ISLAND_HARVEST_ZONE_COUNT = 36;

/** Min spacing between 3D harvest zones (meters) */
export const HOME_ISLAND_HARVEST_ZONE_SPACING_M = 44;

/** Extra canopy layers (understory → emergent) around forest zones. */
export const HOME_ISLAND_TREE_CANOPY_LAYERS = 5;

/** Home island board cell size (meters) — still used for deterministic placement/snap. */
export const HOME_ISLAND_BOARD_CELL_M = 4;

/**
 * Production Warlords home islands use the canonical Gerstner ocean + reflect/refract
 * + underwater post stack. Keep this false unless intentionally running a diagnostic
 * dry-board scene.
 */
export const HOME_ISLAND_DISABLE_OCEAN = false;

/** Flat build hub radius in world meters (1024m island) */
export const HOME_ISLAND_CAMP_CLEAR_RADIUS_M = 96;

/**
 * Heightmap mesh resolution (segments per axis). 255 gives ~4m terrain samples across
 * a 1024m island and materially improves shorelines, cliffs, Rapier ground contact,
 * and large-form terrain silhouette versus the former ~8m grid.
 */
export const HOME_ISLAND_TERRAIN_SEGMENTS = 255;

/** NavMesh grid cell size (meters) for ally / wildlife / NPC pathing */
export const HOME_ISLAND_NAVMESH_CELL_M = 6;

/** Ocean plane diameter (meters) — generous horizon around the 1024m landmass */
export const HOME_ISLAND_OCEAN_SIZE_M = 4096;

/** Ocean mesh segments (Gerstner wave detail; reflection/refraction remains the polish layer) */
export const HOME_ISLAND_OCEAN_SEGMENTS = 128;

/** Seafloor depth under water plane (meters, local height) */
export const HOME_ISLAND_SEAFLOOR_DEPTH_M = -30;

/** Nature foliage instance budget for full 1024m island */
export const HOME_ISLAND_NATURE_INSTANCE_BUDGET = 900;

/** 2D logical map clearing — half-width on 0–100% coords */
export const HOME_ISLAND_CLEARING_HALF_PCT = 14;

/** Max terrain slope for foundation / prop placement (radians) */
export const HOME_ISLAND_BUILDABLE_MAX_SLOPE_RAD = 0.42;

/** Allowed build height band (meters above water) */
export const HOME_ISLAND_BUILDABLE_MIN_HEIGHT_M = 0.5;
export const HOME_ISLAND_BUILDABLE_MAX_HEIGHT_M = 64;

/** Flattened camp plateau height (meters) */
export const HOME_ISLAND_CAMP_PLATEAU_HEIGHT_M = 7;

/** Colyseus + 3D engine world diameter */
export const HOME_ISLAND_SYNC_SIZE_M = HOME_ISLAND_WORLD_SIZE_M;

/** Per-zone node budget — exactly HOME_ISLAND_NODE_TARGET. */
export const HOME_ISLAND_NODE_BUDGET: Record<string, number> = {
  mountain: 12,
  forest: 22,
  field: 14,
  shore: 10,
  water: 6,
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

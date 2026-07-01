/**
 * Home island quality bar — shared between Railway generation, 2D gameplay, and 3D engine.
 * User home islands are durable account assets; these targets define minimum richness.
 */
import { HOME_ISLAND_WORLD_SIZE_M } from './homeIslandSeed';

/** Harvestable resource nodes on the 2D map + DB state */
export const HOME_ISLAND_NODE_TARGET = 32;

/** Passive wildlife (skinning / ambience) */
export const HOME_ISLAND_ANIMAL_TARGET = 12;

/** 3D harvest zones: 3 regrow anchors (forest/quarry/beach) + 16 procedural */
export const HOME_ISLAND_HARVEST_ZONE_COUNT = 19;

/** Min spacing between 3D harvest zones (meters) */
export const HOME_ISLAND_HARVEST_ZONE_SPACING_M = 78;

/** Flat build hub radius in world meters (1024m island) */
export const HOME_ISLAND_CAMP_CLEAR_RADIUS_M = 88;

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
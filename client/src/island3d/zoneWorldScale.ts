/**
 * Zone / home-island scale calibration.
 * Character reference = 2.0m (CHARACTER_REFERENCE_HEIGHT_M in homeIslandSpec).
 * Trees/rocks need upscale on large sectors; wildlife GLBs are often oversized.
 */
import { CHARACTER_REFERENCE_HEIGHT_M } from '@shared/definitions/homeIslandSpec';

export { CHARACTER_REFERENCE_HEIGHT_M };

/** Human-scale player capsule / race GLB target height (meters). */
export const PLAYER_HEIGHT_M = CHARACTER_REFERENCE_HEIGHT_M;

export const TREE_TERRAIN_SCALE = 3;
export const ROCK_TERRAIN_SCALE = 3;
/**
 * Multiply CreatureManifest.scale by this so animals sit correctly vs 2m heroes.
 * Tune only after measuring CDN GLB bound heights.
 */
export const WILDLIFE_SIZE_FACTOR = 0.65;

export function calibrateHarvestScale(profession: string, tier: number): number {
  const base = 0.75 + tier * 0.08;
  if (profession === 'woodcutting') return base * TREE_TERRAIN_SCALE;
  if (profession === 'mining') return base * ROCK_TERRAIN_SCALE;
  return base;
}

/** Scale a prop so its vertical extent matches targetHeightM (post-load bbox). */
export function fitMeshHeightToMeters(
  meshHeightModelUnits: number,
  targetHeightM: number,
): number {
  if (meshHeightModelUnits <= 1e-6) return 1;
  return targetHeightM / meshHeightModelUnits;
}
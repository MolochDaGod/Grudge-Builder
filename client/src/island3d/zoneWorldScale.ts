/**
 * Zone-world scale calibration — mirrors grudge-studio worldScale for legacy zones.
 * Trees/rocks read small on 10 km sectors; wildlife GLBs need a slight down-scale.
 */

export const TREE_TERRAIN_SCALE = 3;
export const ROCK_TERRAIN_SCALE = 3;
export const WILDLIFE_SIZE_FACTOR = 0.65;

export function calibrateHarvestScale(profession: string, tier: number): number {
  const base = 0.75 + tier * 0.08;
  if (profession === 'woodcutting') return base * TREE_TERRAIN_SCALE;
  if (profession === 'mining') return base * ROCK_TERRAIN_SCALE;
  return base;
}
/**
 * Zone-world scale calibration — mirrors grudge-studio worldScale for legacy zones.
 * Trees/rocks read small on 10 km sectors; wildlife GLBs need a slight down-scale.
 */

export const TREE_TERRAIN_SCALE = 3;
export const ROCK_TERRAIN_SCALE = 3;
export const WILDLIFE_SIZE_FACTOR = 0.65;

/** Tactical Infinity sailing map size (meters); aligns with ZONE_SIZE in worldMapSectors. */
export const TACTICAL_OCEAN_SIZE = 10_000;

export type ZoneLayoutProfile = 'open_sea' | 'archipelago' | 'balanced';

export function layoutProfileForBiome(biome: string): ZoneLayoutProfile {
  switch (biome) {
    case 'desert':
    case 'abyssal':
      return 'open_sea';
    case 'tropical':
    case 'forest':
      return 'archipelago';
    default:
      return 'balanced';
  }
}

export function calibrateHarvestScale(profession: string, tier: number): number {
  const base = 0.75 + tier * 0.08;
  if (profession === 'woodcutting') return base * TREE_TERRAIN_SCALE;
  if (profession === 'mining') return base * ROCK_TERRAIN_SCALE;
  return base;
}
/**
 * Shared zone layout + tactical ocean sizing.
 * Single source of truth for server population, client engine, and tactical map.
 */

/** Default 3D zone diameter (meters) — matches Tactical Infinity ocean. */
export const ZONE_DEFAULT_SIZE_METERS = 10_000;

/** Tactical Infinity sailing map diameter (meters). */
export const TACTICAL_OCEAN_SIZE_METERS = ZONE_DEFAULT_SIZE_METERS;

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
/**
 * sectorBridge.ts — maps legacy Colyseus 3×3 grid IDs to worldMapSectors zone IDs.
 *
 * Legacy (lore.ts / SectorState):  NW, N, NE, W, CENTER, E, SW, S, SE
 * Zone (worldMapSectors.ts):       ethereal_falls, frostbite_expanse, …
 */

export type LegacySectorId =
  | 'NW' | 'N' | 'NE'
  | 'W' | 'CENTER' | 'E'
  | 'SW' | 'S' | 'SE';

/** 3×3 grid position → named zone id */
export const LEGACY_TO_ZONE_ID: Record<LegacySectorId, string> = {
  NW: 'ethereal_falls',
  N: 'frostbite_expanse',
  NE: 'thornwood_wilds',
  W: 'stormbreak_reef',
  CENTER: 'convergence_nexus',
  E: 'ashen_wastes',
  SW: 'abyssal_trench',
  S: 'haven_shore',
  SE: 'ember_depths',
};

export const ZONE_TO_LEGACY_ID: Record<string, LegacySectorId> = Object.fromEntries(
  Object.entries(LEGACY_TO_ZONE_ID).map(([legacy, zone]) => [zone, legacy]),
) as Record<string, LegacySectorId>;

export const LEGACY_SECTOR_IDS = Object.keys(LEGACY_TO_ZONE_ID) as LegacySectorId[];

export function isLegacySectorId(id: string): id is LegacySectorId {
  return id in LEGACY_TO_ZONE_ID;
}

/** Normalize any sector id to the canonical worldMapSectors snake_case id. */
export function resolveZoneSectorId(id: string): string {
  if (isLegacySectorId(id)) return LEGACY_TO_ZONE_ID[id];
  return id;
}

/** Map a zone id (or legacy id) back to the lore grid key, if known. */
export function resolveLegacySectorId(id: string): LegacySectorId | null {
  if (isLegacySectorId(id)) return id;
  return ZONE_TO_LEGACY_ID[id] ?? null;
}
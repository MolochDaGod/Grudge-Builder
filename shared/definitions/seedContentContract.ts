/**
 * Per-seed content contract — every Warlords world seed should expose these
 * land/water/sky layers somewhere in the map (not necessarily every sector).
 *
 * Referenced by biomeEcosystemCatalog / island planners. Validation helpers
 * stay lightweight so catalog exports never fail the client build.
 */

export const SEED_LAND_LAYERS = [
  'wood',
  'stone',
  'crystal',
  'animals',
  'flowers',
  'hemp',
  'scrap',
  'pve_fight_zones',
] as const;

export const SEED_WATER_LAYERS = ['fishing', 'enemy_ships'] as const;

export const SEED_SKY_LAYERS = ['birds', 'weather', 'dragons', 'air_mounts'] as const;

export const SEED_OPTIONAL_POINTS = [
  'dungeon_entrance',
  'boss',
  'enemy_camp',
  'monster_node',
  'treasure',
] as const;

export type SeedLandLayer = (typeof SEED_LAND_LAYERS)[number];
export type SeedWaterLayer = (typeof SEED_WATER_LAYERS)[number];
export type SeedSkyLayer = (typeof SEED_SKY_LAYERS)[number];
export type SeedOptionalPoint = (typeof SEED_OPTIONAL_POINTS)[number];

export interface SeedContentPresence {
  land: Partial<Record<SeedLandLayer, boolean>>;
  water: Partial<Record<SeedWaterLayer, boolean>>;
  sky: Partial<Record<SeedSkyLayer, boolean>>;
  optional: Partial<Record<SeedOptionalPoint, boolean>>;
}

/** Soft check: returns missing land layers (never throws). */
export function missingLandLayers(present: SeedContentPresence['land']): SeedLandLayer[] {
  return SEED_LAND_LAYERS.filter((k) => !present[k]);
}

/** True when all required land layers are marked present. */
export function seedLandComplete(present: SeedContentPresence['land']): boolean {
  return missingLandLayers(present).length === 0;
}

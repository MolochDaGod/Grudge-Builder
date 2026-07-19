/**
 * Hidden Mountain City — Thornwood Wilds (world map top-right / NE).
 *
 * Asset: mountainshiddencity.glb (MouseWithoutBorders → R2)
 * Gameplay: defeat the island boss to unseal the door into the city under the mountain.
 */

export const HIDDEN_MOUNTAIN_CITY_ID = 'hidden_mountain_city' as const;
export const HIDDEN_MOUNTAIN_CITY_SECTOR = 'thornwood_wilds' as const;

/** CDN path after upload; local authoring under client/public */
export const HIDDEN_MOUNTAIN_CITY_MODEL = {
  localPath: '/models/mountains/mountains-hidden-city.glb',
  cdnKey: 'models/mountains/mountains-hidden-city.glb',
  cdnUrl: 'https://assets.grudge-studio.com/models/mountains/mountains-hidden-city.glb',
  authoringPath:
    'C:/Users/david/OneDrive/Desktop/MouseWithoutBorders/mountainshiddencity.glb',
  /** Fit footprint (m) — large mountain */
  targetHeightM: 180,
} as const;

export const HIDDEN_MOUNTAIN_CITY_BOSS = {
  id: 'mountain_city_warden',
  name: 'Warden of the Hidden Gate',
  title: 'Boss of the Mountain Isle',
  maxHp: 12_000,
  /** Approx level recommendation */
  recommendedLevel: 8,
  /** Melee hit radius from boss (m) */
  hitRadiusM: 5.5,
  /** Damage per player attack tick when in range + combat mode */
  damagePerHit: 420,
  /** Aggro / engage radius */
  aggroRadiusM: 28,
  /** Offset from mountain root local space (tuned after fit) */
  localOffset: [0, 0, 42] as [number, number, number],
} as const;

export const HIDDEN_MOUNTAIN_CITY_DOOR = {
  id: 'hidden_city_door',
  name: 'Door to the City Under the Mountain',
  /** Local offset toward mountain face / cave mouth */
  localOffset: [0, 4, -18] as [number, number, number],
  interactRadiusM: 6,
  lockedMessage: 'Defeat the Warden of the Hidden Gate to unseal the city door.',
  unlockedMessage: 'The mountain door stands open. Press E to enter the Hidden City.',
  dungeonId: 'hidden_mountain_city',
  dungeonName: 'Hidden City Under the Mountain',
} as const;

export interface HiddenMountainCityDef {
  id: typeof HIDDEN_MOUNTAIN_CITY_ID;
  sectorId: typeof HIDDEN_MOUNTAIN_CITY_SECTOR;
  /** World map grid note: top-right (col 2, row 0) = thornwood_wilds */
  mapCorner: 'NE' | 'top_right';
  name: string;
  lore: string;
  model: typeof HIDDEN_MOUNTAIN_CITY_MODEL;
  boss: typeof HIDDEN_MOUNTAIN_CITY_BOSS;
  door: typeof HIDDEN_MOUNTAIN_CITY_DOOR;
  /** Fraction of zone size for placement (island pocket NE of center) */
  zoneAnchorFrac: { ox: number; oz: number };
}

export const HIDDEN_MOUNTAIN_CITY: HiddenMountainCityDef = {
  id: HIDDEN_MOUNTAIN_CITY_ID,
  sectorId: HIDDEN_MOUNTAIN_CITY_SECTOR,
  mapCorner: 'top_right',
  name: 'Mountains Hidden City',
  lore:
    'Deep in the Thornwood Wilds, a mountain rises over an island of stone. ' +
    'The Warden of the Hidden Gate bars the only door into the city carved under the peak. ' +
    'Only when the Warden falls does the mountain open its heart.',
  model: HIDDEN_MOUNTAIN_CITY_MODEL,
  boss: HIDDEN_MOUNTAIN_CITY_BOSS,
  door: HIDDEN_MOUNTAIN_CITY_DOOR,
  // NE pocket of the sector zone (top-right feel relative to map)
  zoneAnchorFrac: { ox: 0.28, oz: -0.32 },
};

export function isHiddenMountainCitySector(sectorId: string | undefined | null): boolean {
  return sectorId === HIDDEN_MOUNTAIN_CITY_SECTOR;
}

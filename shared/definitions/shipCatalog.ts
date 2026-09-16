/**
 * shipCatalog — single source of truth for ships across 2D world-map,
 * 3D tactical ocean, RTS lobby dock, and Colyseus zones.
 */
import type { HullColor, SailColor, ShipSize } from './islandAssetManifest';

export type { ShipSize, HullColor, SailColor };

export type ShipClass = 'sloop' | 'brigantine' | 'galleon' | 'warship' | 'frigate' | 'manOWar';

/** Canonical dock ids (RTS lobby + zone nodes). */
export type DockId = 'south-dock' | 'north-harbor' | 'home_south' | 'zone_dock';

export interface ShipCatalogEntry {
  /** 2D / persistence tier */
  size: ShipSize;
  /** 3D prefab key (game/sailing/ShipPrefabs SHIP_PREFAB_CONFIGS) */
  prefabKey: string;
  /** 3D stats class */
  shipClass: ShipClass;
  label: string;
  glbModel: string;
  cannonSlots: number;
  crewCap: number;
  maxHp: number;
  oceanSpeed: number;
  craftGold: number;
  craftWood: number;
  craftIron: number;
  craftCloth: number;
  starterFree: boolean;
}

export const DOCK_GLB = '/models/buildings/village/dock.glb';

/**
 * Grudge Warlords intro cinema ship (LeviathanOceanCinema SSOT).
 * Prefer this over craftable fleet hulls for production intro / shipwreck cut.
 */
export const CINEMA_INTRO_SHIP_GLB = [
  'https://assets.grudge-studio.com/models/cinema/tz-pirate-ship.glb',
  '/models/cinema/tz-pirate-ship.glb',
] as const;

/**
 * Player craftable fleet sizes (ShipSize SSOT).
 * Prefab keys map into game/sailing/ShipPrefabs SHIP_PREFAB_CONFIGS
 * (raft, skiff, sloop, brigantine, galleon, large, ghost, wreck, enemy).
 * GLB paths load when present; procedural hull+sail colliders always fall back.
 */
export const SHIP_CATALOG: ShipCatalogEntry[] = [
  {
    size: 'rowboat',
    prefabKey: 'skiff',
    shipClass: 'sloop',
    label: 'Rowboat',
    glbModel: '/models/ships/ship-pirate-small.glb',
    cannonSlots: 0,
    crewCap: 2,
    maxHp: 30,
    oceanSpeed: 4,
    craftGold: 0,
    craftWood: 0,
    craftIron: 0,
    craftCloth: 0,
    starterFree: true,
  },
  {
    size: 'sloop',
    prefabKey: 'sloop',
    shipClass: 'sloop',
    label: 'Sloop',
    glbModel: '/models/ships/ship-medium.glb',
    cannonSlots: 4,
    crewCap: 5,
    maxHp: 80,
    oceanSpeed: 3,
    craftGold: 500,
    craftWood: 200,
    craftIron: 50,
    craftCloth: 30,
    starterFree: false,
  },
  {
    size: 'galleon',
    prefabKey: 'galleon',
    shipClass: 'galleon',
    label: 'Galleon',
    glbModel: '/models/ships/ship-pirate-large.glb',
    cannonSlots: 12,
    crewCap: 16,
    maxHp: 200,
    oceanSpeed: 2,
    craftGold: 2000,
    craftWood: 800,
    craftIron: 200,
    craftCloth: 100,
    starterFree: false,
  },
];

/** Full prefab roster used by tactical ocean / enemy spawns (not all craftable). */
export const OCEAN_SHIP_PREFAB_KEYS = [
  'raft',
  'skiff',
  'sloop',
  'brigantine',
  'galleon',
  'large',
  'enemy',
  'ghost',
  'wreck',
] as const;

export const SHIP_CATALOG_BY_SIZE: Record<ShipSize, ShipCatalogEntry> = Object.fromEntries(
  SHIP_CATALOG.map((e) => [e.size, e]),
) as Record<ShipSize, ShipCatalogEntry>;

export function getShipCatalogEntry(size: ShipSize): ShipCatalogEntry {
  return SHIP_CATALOG_BY_SIZE[size];
}

export function getPrefabKeyForSize(size: ShipSize): string {
  return getShipCatalogEntry(size).prefabKey;
}

/** RTS lobby south dock — matches LobbyGameplay capture point id. */
export const RTS_SOUTH_DOCK = {
  id: 'south-dock' as DockId,
  label: 'South Harbor Dock',
  boardRadius: 12,
  buildEnabled: true,
  oceanDeployEnabled: true,
};

/**
 * Extra hulls that keep ShipSize (rowboat/sloop/galleon) but swap mesh + unlock.
 * Long Row Boat is still a rowboat — not a fourth ocean size.
 */
export interface ShipHullVariant {
  id: string;
  size: ShipSize;
  prefabKey: string;
  label: string;
  glbModel: string;
  lengthM: number;
  widthM: number;
  crewCap: number;
  cannonSlots: number;
  oceanSpeed: number;
  maxHp: number;
  craftGold: number;
  craftWood: number;
  craftIron: number;
  craftCloth: number;
  starterFree: false;
  unlockRecipeId: string;
  vendorNpcId: string;
  vendorServiceId: string;
}

export const LONG_ROW_BOAT_HULL: ShipHullVariant = {
  id: 'long_row_boat',
  size: 'rowboat',
  prefabKey: 'skiff',
  label: 'Long Row Boat',
  glbModel: '/models/ships/long_row_boat.glb',
  lengthM: 11.7,
  widthM: 7.0,
  crewCap: 8,
  cannonSlots: 0,
  oceanSpeed: 3.6,
  maxHp: 55,
  craftGold: 80,
  craftWood: 40,
  craftIron: 4,
  craftCloth: 6,
  starterFree: false,
  unlockRecipeId: 'recipe_long_row_boat',
  vendorNpcId: 'barbarian_dock_master',
  vendorServiceId: 'shop_barbarian_dock_master',
};

export const SHIP_HULL_VARIANTS: ShipHullVariant[] = [LONG_ROW_BOAT_HULL];

export function getShipHullVariant(id: string | null | undefined): ShipHullVariant | undefined {
  if (!id) return undefined;
  return SHIP_HULL_VARIANTS.find((h) => h.id === id);
}

/** Resolve play mesh: hull variant first, else size catalog. */
export function glbForShip(opts: { size: ShipSize; name?: string; hullId?: string | null }): string {
  const byId = getShipHullVariant(opts.hullId);
  if (byId) return byId.glbModel;
  if (opts.name && /long.?row/i.test(opts.name)) return LONG_ROW_BOAT_HULL.glbModel;
  return getShipCatalogEntry(opts.size).glbModel;
}

export const BARBARIAN_DOCK_MASTER = {
  npcId: 'barbarian_dock_master',
  name: 'Stormfang Dock Master',
  role: 'dock_master' as const,
  serviceId: 'shop_barbarian_dock_master',
  dialogueSetId: 'barbarian_dock_master',
  sellsRecipeIds: ['recipe_long_row_boat'] as const,
  raceId: 'barbarian' as const,
};

export const BARBARIAN_DOCK_MASTER_DIALOGUE = {
  id: 'barbarian_dock_master',
  greetings: [
    'Stormfang dock. I sell one recipe — the Long Row Boat. Oars, not cannon.',
    'Barbarian timber, long hull. Buy the recipe, then craft it at the dock.',
    'The small raft is free. The long row boat is earned from me.',
  ],
  sell: [
    'Recipe: Long Row Boat. Wood, cloth, a little iron. Learn it once.',
  ],
  alreadyKnown: [
    'You already know the long hull. Craft it at the dock.',
  ],
} as const;
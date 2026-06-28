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

export const SHIP_CATALOG: ShipCatalogEntry[] = [
  {
    size: 'rowboat',
    prefabKey: 'skiff',
    shipClass: 'sloop',
    label: 'Rowboat',
    glbModel: '/models/ships/ship-small.glb',
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
    cannonSlots: 3,
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
    glbModel: '/models/ships/ship-large.glb',
    cannonSlots: 5,
    crewCap: 10,
    maxHp: 200,
    oceanSpeed: 2,
    craftGold: 2000,
    craftWood: 800,
    craftIron: 200,
    craftCloth: 100,
    starterFree: false,
  },
];

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
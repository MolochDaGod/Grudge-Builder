/**
 * Ingest asset layers — SSOT for Documents/Downloads → warlords/intake.
 *
 * Maps filesystem layers to fleet systems:
 *   R2 CDN · D1 asset_registry · ObjectStore · zone/island loaders
 *
 * Generated catalogs: staging/ingest/registry-3h.json +
 * client/public/models/warlords/ingest/<layer>/_layer.json
 */

export type IngestLayerId =
  | 'anims/combat'
  | 'equipment/weapons'
  | 'equipment/tools'
  | 'equipment/bags'
  | 'harvest/gems'
  | 'harvest/crops'
  | 'harvest/food'
  | 'nature/rocks'
  | 'nature/scene'
  | 'islands/shells'
  | 'terrain/heightfield'
  | 'terrain/desert'
  | 'terrain/water'
  | 'buildings/houses'
  | 'buildings/fortress'
  | 'buildings/vendor'
  | 'ships/pirate'
  | 'maps/city'
  | 'maps/dungeon'
  | 'creatures/hero'
  | 'creatures/wildlife'
  | 'props/misc'
  | 'multipacks/weapons'
  | 'multipacks/environment'
  | 'unsorted';

export interface IngestLayerDef {
  id: IngestLayerId;
  /** Fleet system that consumes these assets */
  system:
    | 'combat'
    | 'equipment'
    | 'harvest'
    | 'nature'
    | 'island'
    | 'terrain'
    | 'building'
    | 'ship'
    | 'map'
    | 'creature'
    | 'prop'
    | 'multipack'
    | 'unknown';
  /** Physics / world layer hint */
  worldLayer: 'Default' | 'Terrain' | 'Item' | 'NPC' | 'Trigger' | 'Water' | 'IgnoreRaycast';
  /** Multipack isolation required before placement */
  isolateMeshes: boolean;
  description: string;
}

export const INGEST_LAYERS: Record<IngestLayerId, IngestLayerDef> = {
  'anims/combat': {
    id: 'anims/combat',
    system: 'combat',
    worldLayer: 'Default',
    isolateMeshes: false,
    description: 'Combat animation sources → retarget Bip001 / weapon packs',
  },
  'equipment/weapons': {
    id: 'equipment/weapons',
    system: 'equipment',
    worldLayer: 'Item',
    isolateMeshes: true,
    description: '1H/2H weapons → hand bone attach / equip mesh toggle',
  },
  'equipment/tools': {
    id: 'equipment/tools',
    system: 'equipment',
    worldLayer: 'Item',
    isolateMeshes: true,
    description: 'Harvest tools (axe, pick, rod)',
  },
  'equipment/bags': {
    id: 'equipment/bags',
    system: 'equipment',
    worldLayer: 'Item',
    isolateMeshes: false,
    description: 'Back / bag props',
  },
  'harvest/gems': {
    id: 'harvest/gems',
    system: 'harvest',
    worldLayer: 'Default',
    isolateMeshes: true,
    description: 'Mining / crystal harvest nodes',
  },
  'harvest/crops': {
    id: 'harvest/crops',
    system: 'harvest',
    worldLayer: 'Default',
    isolateMeshes: true,
    description: 'Farm crops / farmable land scatter',
  },
  'harvest/food': {
    id: 'harvest/food',
    system: 'harvest',
    worldLayer: 'Default',
    isolateMeshes: false,
    description: 'Food / cook props',
  },
  'nature/rocks': {
    id: 'nature/rocks',
    system: 'nature',
    worldLayer: 'Terrain',
    isolateMeshes: true,
    description: 'Rock / mountain multipacks — meshName isolation',
  },
  'nature/scene': {
    id: 'nature/scene',
    system: 'nature',
    worldLayer: 'Default',
    isolateMeshes: true,
    description: 'Nature scene scatter',
  },
  'islands/shells': {
    id: 'islands/shells',
    system: 'island',
    worldLayer: 'Terrain',
    isolateMeshes: false,
    description: 'Island shells for section / event / conquerable islands',
  },
  'terrain/heightfield': {
    id: 'terrain/heightfield',
    system: 'terrain',
    worldLayer: 'Terrain',
    isolateMeshes: false,
    description: 'Terrain / hill / landscape shells',
  },
  'terrain/desert': {
    id: 'terrain/desert',
    system: 'terrain',
    worldLayer: 'Terrain',
    isolateMeshes: false,
    description: 'Ashen / desert biome kits',
  },
  'terrain/water': {
    id: 'terrain/water',
    system: 'terrain',
    worldLayer: 'Water',
    isolateMeshes: false,
    description: 'River / water shells',
  },
  'buildings/houses': {
    id: 'buildings/houses',
    system: 'building',
    worldLayer: 'Default',
    isolateMeshes: false,
    description: 'Homes / interiors / market stalls',
  },
  'buildings/fortress': {
    id: 'buildings/fortress',
    system: 'building',
    worldLayer: 'Default',
    isolateMeshes: false,
    description: 'Fortress / castle / ruins sector landmarks',
  },
  'buildings/vendor': {
    id: 'buildings/vendor',
    system: 'building',
    worldLayer: 'NPC',
    isolateMeshes: false,
    description: 'Vendor / shop game-flow buildings',
  },
  'ships/pirate': {
    id: 'ships/pirate',
    system: 'ship',
    worldLayer: 'Default',
    isolateMeshes: false,
    description: 'Pirate ships / lobby sailing',
  },
  'maps/city': {
    id: 'maps/city',
    system: 'map',
    worldLayer: 'Terrain',
    isolateMeshes: false,
    description: 'City / town sector shells',
  },
  'maps/dungeon': {
    id: 'maps/dungeon',
    system: 'map',
    worldLayer: 'Terrain',
    isolateMeshes: false,
    description: 'Dungeon / danger room / underground',
  },
  'creatures/hero': {
    id: 'creatures/hero',
    system: 'creature',
    worldLayer: 'NPC',
    isolateMeshes: false,
    description: 'Hero props / climb / masks',
  },
  'creatures/wildlife': {
    id: 'creatures/wildlife',
    system: 'creature',
    worldLayer: 'NPC',
    isolateMeshes: false,
    description: 'Wildlife / boss-adjacent creatures',
  },
  'props/misc': {
    id: 'props/misc',
    system: 'prop',
    worldLayer: 'Default',
    isolateMeshes: true,
    description: 'Generic props',
  },
  'multipacks/weapons': {
    id: 'multipacks/weapons',
    system: 'multipack',
    worldLayer: 'Item',
    isolateMeshes: true,
    description: 'Weapon multipacks — isolate before equip',
  },
  'multipacks/environment': {
    id: 'multipacks/environment',
    system: 'multipack',
    worldLayer: 'Default',
    isolateMeshes: true,
    description: 'Environment multipacks — isolate meshName',
  },
  unsorted: {
    id: 'unsorted',
    system: 'unknown',
    worldLayer: 'Default',
    isolateMeshes: true,
    description: 'Needs manual review',
  },
};

export const INGEST_PUBLIC_ROOT = '/models/warlords/ingest';
export const INGEST_CDN_PREFIX = 'models/warlords/ingest';

/**
 * BuildAssetManifest — registry of all buildable/placeable objects.
 *
 * Two placement modes:
 *   STRUCTURAL — snaps to sockets on other pieces (foundations, walls, etc.)
 *   PROP       — freely placed on terrain or foundation surfaces
 *
 * Models served from R2 CDN at assets.grudge-studio.com/models/buildings/
 * FBX packs need batch conversion to GLB before upload:
 *   Medieval Megapack → models/buildings/medieval/{name}.glb
 *   Fantastic Village  → models/buildings/village/{name}.glb
 *   Base Blend         → models/terrain/base/{name}.glb
 *
 * Until GLBs are on R2, the system renders placeholder geometry with the
 * correct dimensions and color so placement logic works immediately.
 */

import { ASSET_CDN_BASE } from '@/lib/assetConfig';

const CDN = ASSET_CDN_BASE;

// ── Types ────────────────────────────────────────────────────────────────────

export type PlacementMode = 'structural' | 'prop';

export type BuildCategory =
  | 'structure'    // foundations, walls, ceilings, stairs
  | 'furniture'    // benches, beds, tables, chairs
  | 'storage'      // chests, barrels, crates, bags
  | 'crafting'     // forge, anvil, cooking fire, tanning rack
  | 'farming'      // fields, crops, planters
  | 'defense'      // fences, walls, watchtowers, training dummy
  | 'transport'    // cart, wagon, boat dock
  | 'decoration'   // flags, banners, signs, lanterns
  | 'nature'       // placed trees, rocks, stumps (landscaping)
  | 'terrain';     // terrain tiles, boulders (base blend)

export interface BuildAssetDef {
  id: string;
  name: string;
  category: BuildCategory;
  placement: PlacementMode;
  /** CDN path to GLB model (null = use placeholder geometry) */
  modelPath: string | null;
  /** Placeholder color when no model is loaded */
  color: number;
  /** Bounding box dimensions for placement collision */
  size: [number, number, number]; // [width, height, depth]
  /** Scale multiplier for the loaded model */
  scale: number;
  /** Can be rotated during placement (default true) */
  rotatable: boolean;
  /** Requires a foundation/floor beneath it */
  requiresFloor: boolean;
  /** Can be placed directly on terrain */
  terrainPlaceable: boolean;

  // ── Crafting cost ──────────────────────────────────────────────────────
  cost: Array<{ itemId: string; quantity: number }>;

  // ── Gameplay effects (optional) ────────────────────────────────────────
  /** Passive effect while placed */
  effect?: {
    type: 'storage' | 'crafting' | 'training' | 'transport' | 'comfort' | 'defense' | 'farming';
    /** Numeric bonus (e.g. storage slots, XP rate, carry capacity) */
    value: number;
    description: string;
  };
}

// ── Asset Definitions ────────────────────────────────────────────────────────

const B = (prefix: string) => `${CDN}/models/buildings/${prefix}`;

export const BUILD_ASSETS: Record<string, BuildAssetDef> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // FURNITURE
  // ═══════════════════════════════════════════════════════════════════════════

  bench_1: {
    id: 'bench_1', name: 'Wooden Bench', category: 'furniture',
    placement: 'prop', modelPath: B('medieval/bench_1.glb'),
    color: 0x8B6914, size: [2, 1, 0.6], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 4 }],
    effect: { type: 'comfort', value: 5, description: '+5 stamina regen while seated' },
  },
  bench_2: {
    id: 'bench_2', name: 'Stone Bench', category: 'furniture',
    placement: 'prop', modelPath: B('medieval/bench_2.glb'),
    color: 0x888888, size: [2.5, 1, 0.6], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'stone', quantity: 6 }],
    effect: { type: 'comfort', value: 8, description: '+8 stamina regen while seated' },
  },
  bed: {
    id: 'bed', name: 'Bed', category: 'furniture',
    placement: 'prop', modelPath: B('medieval/bed.glb'),
    color: 0x8B4513, size: [2, 1.2, 3], scale: 1.0,
    rotatable: true, requiresFloor: true, terrainPlaceable: false,
    cost: [{ itemId: 'wood', quantity: 8 }, { itemId: 'cloth', quantity: 4 }],
    effect: { type: 'comfort', value: 20, description: 'Set respawn point + full rest' },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STORAGE
  // ═══════════════════════════════════════════════════════════════════════════

  chest: {
    id: 'chest', name: 'Storage Chest', category: 'storage',
    placement: 'prop', modelPath: B('medieval/chest.glb'),
    color: 0x654321, size: [1.2, 0.8, 0.8], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 6 }, { itemId: 'iron', quantity: 2 }],
    effect: { type: 'storage', value: 20, description: '20 item slots' },
  },
  barrel: {
    id: 'barrel', name: 'Barrel', category: 'storage',
    placement: 'prop', modelPath: B('medieval/barrel.glb'),
    color: 0x8B5E3C, size: [0.8, 1.2, 0.8], scale: 1.0,
    rotatable: false, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 4 }],
    effect: { type: 'storage', value: 8, description: '8 liquid/food slots' },
  },
  crate: {
    id: 'crate', name: 'Supply Crate', category: 'storage',
    placement: 'prop', modelPath: B('medieval/bag_1.glb'),
    color: 0x9B7653, size: [1, 1, 1], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 3 }],
    effect: { type: 'storage', value: 12, description: '12 resource slots' },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CRAFTING STATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  fireplace: {
    id: 'fireplace', name: 'Campfire', category: 'crafting',
    placement: 'prop', modelPath: B('medieval/fireplace.glb'),
    color: 0xCC4400, size: [1.5, 0.5, 1.5], scale: 1.0,
    rotatable: false, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'stone', quantity: 8 }, { itemId: 'wood', quantity: 4 }],
    effect: { type: 'crafting', value: 1, description: 'Cook food, smelt basic ore' },
  },
  forge: {
    id: 'forge', name: 'Blacksmith Forge', category: 'crafting',
    placement: 'prop', modelPath: B('medieval/bellows.glb'),
    color: 0x333333, size: [2, 2, 1.5], scale: 1.0,
    rotatable: true, requiresFloor: true, terrainPlaceable: false,
    cost: [{ itemId: 'stone', quantity: 20 }, { itemId: 'iron', quantity: 10 }],
    effect: { type: 'crafting', value: 3, description: 'Craft weapons, armor, tools' },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFENSE
  // ═══════════════════════════════════════════════════════════════════════════

  fence_wood: {
    id: 'fence_wood', name: 'Wooden Fence', category: 'defense',
    placement: 'prop', modelPath: B('medieval/fence_1_1.glb'),
    color: 0x8B6914, size: [4, 1.5, 0.2], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 3 }],
    effect: { type: 'defense', value: 10, description: 'Blocks creature pathing' },
  },
  fence_bar: {
    id: 'fence_bar', name: 'Iron Fence', category: 'defense',
    placement: 'prop', modelPath: B('medieval/fence_bar.glb'),
    color: 0x555555, size: [4, 2, 0.15], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'iron', quantity: 4 }],
    effect: { type: 'defense', value: 25, description: 'Strong creature barrier' },
  },
  training_dummy: {
    id: 'training_dummy', name: 'Training Dummy', category: 'defense',
    placement: 'prop', modelPath: null, // placeholder until asset created
    color: 0xBB9944, size: [0.6, 2, 0.6], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 6 }, { itemId: 'cloth', quantity: 2 }],
    effect: { type: 'training', value: 2, description: '+2x weapon XP when attacking' },
  },
  watchtower: {
    id: 'watchtower', name: 'Watchtower', category: 'defense',
    placement: 'prop', modelPath: B('village/SM_PROP_watchtower_wood_01.glb'),
    color: 0x7A5C3A, size: [3, 8, 3], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 20 }, { itemId: 'stone', quantity: 10 }],
    effect: { type: 'defense', value: 50, description: 'Reveals nearby enemies on minimap' },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSPORT
  // ═══════════════════════════════════════════════════════════════════════════

  cart: {
    id: 'cart', name: 'Harvest Cart', category: 'transport',
    placement: 'prop', modelPath: B('medieval/cart_1.glb'),
    color: 0x8B6914, size: [2, 1.5, 3], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 12 }, { itemId: 'iron', quantity: 4 }],
    effect: { type: 'transport', value: 20, description: 'Allies carry +20 items during auto-harvest' },
  },
  wagon: {
    id: 'wagon', name: 'Supply Wagon', category: 'transport',
    placement: 'prop', modelPath: null,
    color: 0x654321, size: [2.5, 2, 5], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 20 }, { itemId: 'iron', quantity: 8 }, { itemId: 'cloth', quantity: 4 }],
    effect: { type: 'transport', value: 50, description: 'Allies carry +50 items, doubles auto-harvest range' },
  },
  boat_dock: {
    id: 'boat_dock', name: 'Boat Dock', category: 'transport',
    placement: 'prop', modelPath: B('medieval/boat.glb'),
    color: 0x5A4A3A, size: [4, 1, 8], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 30 }, { itemId: 'rope', quantity: 6 }],
    effect: { type: 'transport', value: 0, description: 'Enables sailing to other islands' },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FARMING
  // ═══════════════════════════════════════════════════════════════════════════

  field_small: {
    id: 'field_small', name: 'Small Farm Plot', category: 'farming',
    placement: 'prop', modelPath: B('medieval/field_s.glb'),
    color: 0x5A3E1B, size: [4, 0.3, 4], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 4 }, { itemId: 'stone', quantity: 2 }],
    effect: { type: 'farming', value: 2, description: 'Grow 2 crops at a time' },
  },
  field_medium: {
    id: 'field_medium', name: 'Farm Plot', category: 'farming',
    placement: 'prop', modelPath: B('medieval/field_m.glb'),
    color: 0x5A3E1B, size: [6, 0.3, 6], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 8 }, { itemId: 'stone', quantity: 4 }],
    effect: { type: 'farming', value: 5, description: 'Grow 5 crops at a time' },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DECORATION
  // ═══════════════════════════════════════════════════════════════════════════

  flag_totem: {
    id: 'flag_totem', name: 'Faction Flag', category: 'decoration',
    placement: 'prop', modelPath: B('medieval/flag_totem.glb'),
    color: 0xCC0000, size: [0.4, 4, 0.4], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 2 }, { itemId: 'cloth', quantity: 3 }],
  },
  sign: {
    id: 'sign', name: 'Wooden Sign', category: 'decoration',
    placement: 'prop', modelPath: B('village/SM_PROP_sign_01.glb'),
    color: 0x8B6914, size: [1.5, 2, 0.3], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 2 }],
  },
  lantern: {
    id: 'lantern', name: 'Hanging Lantern', category: 'decoration',
    placement: 'prop', modelPath: B('village/SM_PROP_lamp_01.glb'),
    color: 0xFFAA00, size: [0.4, 0.6, 0.4], scale: 1.0,
    rotatable: false, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'iron', quantity: 2 }, { itemId: 'glass', quantity: 1 }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NATURE / LANDSCAPING
  // ═══════════════════════════════════════════════════════════════════════════

  placed_tree: {
    id: 'placed_tree', name: 'Oak Tree', category: 'nature',
    placement: 'prop', modelPath: B('village/SM_ENV_TREE_village.glb'),
    color: 0x2D7A2D, size: [3, 8, 3], scale: 1.0,
    rotatable: false, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'sapling', quantity: 1 }],
  },
  log_stump: {
    id: 'log_stump', name: 'Log Stump', category: 'nature',
    placement: 'prop', modelPath: B('medieval/chump.glb'),
    color: 0x5A3E1B, size: [1, 0.5, 1], scale: 1.0,
    rotatable: false, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 1 }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TERRAIN TILES (Base Blend — GLB ready)
  // ═══════════════════════════════════════════════════════════════════════════

  boulder_1: {
    id: 'boulder_1', name: 'Boulder (Small)', category: 'terrain',
    placement: 'prop', modelPath: `${CDN}/models/terrain/base/boulder_1_bl.glb`,
    color: 0x777777, size: [3, 2, 3], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [],
  },
  rock_cluster: {
    id: 'rock_cluster', name: 'Rock Cluster', category: 'terrain',
    placement: 'prop', modelPath: `${CDN}/models/terrain/base/rock_1_bl.glb`,
    color: 0x666666, size: [2, 1.5, 2], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getBuildAsset(id: string): BuildAssetDef | undefined {
  return BUILD_ASSETS[id];
}

export function getBuildAssetsByCategory(category: BuildCategory): BuildAssetDef[] {
  return Object.values(BUILD_ASSETS).filter(a => a.category === category);
}

export function getAllBuildCategories(): BuildCategory[] {
  const cats = new Set<BuildCategory>();
  for (const a of Object.values(BUILD_ASSETS)) cats.add(a.category);
  return Array.from(cats);
}

export function getTerrainPlaceableAssets(): BuildAssetDef[] {
  return Object.values(BUILD_ASSETS).filter(a => a.terrainPlaceable);
}

/** Check if a player has the resources to build something */
export function canAfford(
  asset: BuildAssetDef,
  inventory: Record<string, number>,
): boolean {
  return asset.cost.every(c => (inventory[c.itemId] || 0) >= c.quantity);
}

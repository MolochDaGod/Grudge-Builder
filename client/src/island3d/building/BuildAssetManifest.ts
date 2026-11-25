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
import { allUmmorpgDeployables } from '@shared/definitions/ummorpgDeployables';
import { MOBILE_OBSTACLES_MODEL } from '@shared/definitions/mobileGameObstacles';

const CDN = ASSET_CDN_BASE;
/** Trap multipack — same key on R2 (`assets.grudge-studio.com`) and local public/. */
const TRAP_PACK = MOBILE_OBSTACLES_MODEL;

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
  | 'terrain'      // terrain tiles, boulders (base blend)
  | 'camp'         // NPC / faction camps + camp upgrades
  | 'units'        // captains, travelers, bandits, mounts (uMMORPG / 30grudge6)
  | 'siege'        // catapult, bolt-thrower
  | 'monsters';     // wildlife / monster deployables

export interface BuildAssetDef {
  id: string;
  name: string;
  category: BuildCategory;
  placement: PlacementMode;
  /** CDN path to GLB model (null = use placeholder geometry) */
  modelPath: string | null;
  /**
   * Multipack GLB: clone only this node (survival kit / towers).
   * See shared/definitions/survivalKitBuildCatalog.ts
   */
  nodeName?: string;
  /** Extra nodes composed into the placeable (e.g. hammer + paper on workbench) */
  extraNodes?: string[];
  /** Y offset after ground sample (docks = +0.2 above water) */
  placeYOffset?: number;
  /** Floating foundation / dock pad */
  floating?: boolean;
  /** Build layer SSOT */
  buildLayer?: 'quick' | 'camp' | 'bench' | 'modular' | 'rts' | 'dock' | 'race_home';
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
    type: 'storage' | 'crafting' | 'training' | 'transport' | 'comfort' | 'defense' | 'farming' | 'respawn' | 'train_unit' | 'foundation';
    /** Numeric bonus (e.g. storage slots, XP rate, carry capacity) */
    value: number;
    description: string;
  };
}

// ── Asset Definitions ────────────────────────────────────────────────────────

const B = (prefix: string) => `${CDN}/models/buildings/${prefix}`;

export const BUILD_ASSETS: Record<string, BuildAssetDef> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // NPC / FACTION CAMPS (stylized_enemy_camp_scene.glb)
  // Same faction = ally · other faction = enemy · expand with bench/storage/tower
  // ═══════════════════════════════════════════════════════════════════════════

  npc_camp_base: {
    id: 'npc_camp_base',
    name: 'Outpost Camp',
    category: 'camp',
    placement: 'prop',
    modelPath: '/models/camps/stylized_enemy_camp_scene.glb',
    color: 0x6b4423,
    size: [20, 6, 20],
    scale: 1.0,
    rotatable: true,
    requiresFloor: false,
    terrainPlaceable: true,
    cost: [
      { itemId: 'wood', quantity: 40 },
      { itemId: 'stone', quantity: 20 },
      { itemId: 'cloth', quantity: 8 },
    ],
    effect: {
      type: 'defense',
      value: 25,
      description: 'Found a faction camp. Same faction = ally; others are enemies. Add benches, storage, towers.',
    },
  },
  // Camp upgrade ghosts — models overwritten after survival kit register (bench_workbench etc.)
  camp_bench_upgrade: {
    id: 'camp_bench_upgrade',
    name: 'Camp Bench',
    category: 'camp',
    placement: 'prop',
    modelPath: null,
    color: 0x8b6914,
    size: [2, 1, 0.6],
    scale: 1.0,
    rotatable: true,
    requiresFloor: false,
    terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 4 }],
    effect: { type: 'comfort', value: 5, description: 'Place near camp for ally rest' },
  },
  camp_storage_upgrade: {
    id: 'camp_storage_upgrade',
    name: 'Camp Storage',
    category: 'camp',
    placement: 'prop',
    modelPath: null,
    color: 0x654321,
    size: [1.2, 0.8, 0.8],
    scale: 1.0,
    rotatable: true,
    requiresFloor: false,
    terrainPlaceable: true,
    cost: [
      { itemId: 'wood', quantity: 6 },
      { itemId: 'iron', quantity: 2 },
    ],
    effect: { type: 'storage', value: 20, description: 'Camp shared storage (20 slots)' },
  },
  camp_tower_upgrade: {
    id: 'camp_tower_upgrade',
    name: 'Camp Watchtower',
    category: 'camp',
    placement: 'prop',
    modelPath: null,
    color: 0x7a5c3a,
    size: [3, 8, 3],
    scale: 1.0,
    rotatable: true,
    requiresFloor: false,
    terrainPlaceable: true,
    cost: [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'stone', quantity: 10 },
    ],
    effect: { type: 'defense', value: 50, description: 'Camp defense / spot enemies' },
  },

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

  // ── Mobile-game obstacle traps (PBR multipack) ───────────────────────────
  // models/obstacles/mobile_game_obstacles.glb — nodeName isolation
  trap_spike: {
    id: 'trap_spike',
    name: 'Spike Trap',
    category: 'defense',
    placement: 'prop',
    modelPath: TRAP_PACK,
    nodeName: 'spike-obstacle_8',
    color: 0x444850,
    size: [1.4, 1.2, 1.4],
    scale: 1.15,
    rotatable: true,
    requiresFloor: false,
    terrainPlaceable: true,
    cost: [
      { itemId: 'iron', quantity: 3 },
      { itemId: 'wood', quantity: 2 },
    ],
    effect: { type: 'defense', value: 18, description: 'Damages enemies that step on spikes' },
  },
  trap_spike_tall: {
    id: 'trap_spike_tall',
    name: 'Rising Spikes',
    category: 'defense',
    placement: 'prop',
    modelPath: TRAP_PACK,
    nodeName: 'spike-obstacle.002_11',
    color: 0xcc2200,
    size: [1.2, 1.6, 1.2],
    scale: 1.2,
    rotatable: true,
    requiresFloor: false,
    terrainPlaceable: true,
    cost: [
      { itemId: 'iron', quantity: 5 },
      { itemId: 'stone', quantity: 2 },
    ],
    effect: { type: 'defense', value: 22, description: 'Animated spike riser — high damage' },
  },
  trap_cylinder: {
    id: 'trap_cylinder',
    name: 'Spinning Barrel',
    category: 'defense',
    placement: 'prop',
    modelPath: TRAP_PACK,
    nodeName: 'CylinderObstacle_6',
    color: 0x333840,
    size: [1.6, 1.8, 1.6],
    scale: 1.1,
    rotatable: true,
    requiresFloor: false,
    terrainPlaceable: true,
    cost: [
      { itemId: 'iron', quantity: 4 },
      { itemId: 'wood', quantity: 4 },
    ],
    effect: { type: 'defense', value: 14, description: 'Spinning cylinder barrier + contact damage' },
  },
  trap_gear: {
    id: 'trap_gear',
    name: 'Gear Crusher',
    category: 'defense',
    placement: 'prop',
    modelPath: TRAP_PACK,
    nodeName: 'gear-base_7',
    color: 0x888a90,
    size: [2.0, 1.4, 2.0],
    scale: 1.05,
    rotatable: true,
    requiresFloor: false,
    terrainPlaceable: true,
    cost: [
      { itemId: 'iron', quantity: 8 },
      { itemId: 'stone', quantity: 3 },
    ],
    effect: { type: 'defense', value: 28, description: 'Rotating gear trap — solid obstacle' },
  },
  trap_bomb: {
    id: 'trap_bomb',
    name: 'Bomb Mine',
    category: 'defense',
    placement: 'prop',
    modelPath: TRAP_PACK,
    nodeName: 'Bomb_5',
    color: 0xcc1100,
    size: [0.9, 1.0, 0.9],
    scale: 1.0,
    rotatable: true,
    requiresFloor: false,
    terrainPlaceable: true,
    cost: [
      { itemId: 'iron', quantity: 2 },
      { itemId: 'ember_core', quantity: 1 },
    ],
    effect: { type: 'defense', value: 45, description: 'One-shot explosive mine (hidden until trip)' },
  },
  trap_spike_base: {
    id: 'trap_spike_base',
    name: 'Spike Plate',
    category: 'defense',
    placement: 'prop',
    modelPath: TRAP_PACK,
    nodeName: 'SpikeBase_16',
    color: 0x555555,
    size: [2.4, 0.6, 2.4],
    scale: 1.0,
    rotatable: true,
    requiresFloor: false,
    terrainPlaceable: true,
    cost: [
      { itemId: 'iron', quantity: 6 },
      { itemId: 'stone', quantity: 4 },
    ],
    effect: { type: 'defense', value: 20, description: 'Wide floor plate with embedded spikes' },
  },
  trap_spiral: {
    id: 'trap_spiral',
    name: 'Spiral Plate',
    category: 'defense',
    placement: 'prop',
    modelPath: TRAP_PACK,
    nodeName: 'SpiralBase_15',
    color: 0xaaaaaa,
    size: [2.2, 0.5, 2.2],
    scale: 1.0,
    rotatable: true,
    requiresFloor: false,
    terrainPlaceable: true,
    cost: [
      { itemId: 'iron', quantity: 4 },
      { itemId: 'stone', quantity: 2 },
    ],
    effect: { type: 'defense', value: 12, description: 'Spinning ground plate — slows & damages' },
  },
  trap_grid: {
    id: 'trap_grid',
    name: 'Hazard Grid',
    category: 'defense',
    placement: 'prop',
    modelPath: TRAP_PACK,
    nodeName: 'GridGround_4',
    color: 0x222222,
    size: [2.5, 0.2, 2.5],
    scale: 1.0,
    rotatable: true,
    requiresFloor: false,
    terrainPlaceable: true,
    cost: [
      { itemId: 'iron', quantity: 3 },
      { itemId: 'stone', quantity: 3 },
    ],
    effect: { type: 'defense', value: 10, description: 'Electrified / hazard floor grid' },
  },
  defense_door: {
    id: 'defense_door',
    name: 'Trap Door Plate',
    category: 'defense',
    placement: 'prop',
    modelPath: TRAP_PACK,
    nodeName: 'GroundDoor01_2',
    color: 0x1a1a1a,
    size: [2.0, 0.35, 2.0],
    scale: 1.0,
    rotatable: true,
    requiresFloor: false,
    terrainPlaceable: true,
    cost: [
      { itemId: 'iron', quantity: 4 },
      { itemId: 'wood', quantity: 4 },
    ],
    effect: { type: 'defense', value: 15, description: 'Floor hatch / barricade plate' },
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
  // boat_dock + survival kit pieces registered from survivalKitBuildCatalog (below)

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

  // Nature props — battle NatureDecor pack ONLY (no stylized multi-pack trees)
  placed_tree: {
    id: 'placed_tree', name: 'Common Tree', category: 'nature',
    placement: 'prop', modelPath: `${CDN}/models/nature/CommonTree_1.gltf`,
    color: 0x2D7A2D, size: [3, 8, 3], scale: 1.0,
    rotatable: false, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'sapling', quantity: 1 }],
  },
  placed_pine: {
    id: 'placed_pine', name: 'Pine Tree', category: 'nature',
    placement: 'prop', modelPath: `${CDN}/models/nature/Pine_1.gltf`,
    color: 0x1B5E20, size: [2.5, 10, 2.5], scale: 1.0,
    rotatable: false, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'sapling', quantity: 1 }],
  },
  // Palm uses CommonTree_5 as battle stand-in (no stylized tropical dump in placeables)
  placed_palm: {
    id: 'placed_palm', name: 'Palm Tree', category: 'nature',
    placement: 'prop', modelPath: `${CDN}/models/nature/CommonTree_5.gltf`,
    color: 0x2E7D32, size: [3, 10, 3], scale: 1.1,
    rotatable: false, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'sapling', quantity: 1 }],
  },
  placed_bush: {
    id: 'placed_bush', name: 'Bush', category: 'nature',
    placement: 'prop', modelPath: `${CDN}/models/nature/Bush_Common.gltf`,
    color: 0x3D8B37, size: [1.2, 0.8, 1.2], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'herb', quantity: 2 }],
  },
  placed_rock: {
    id: 'placed_rock', name: 'Pebble Rock', category: 'nature',
    placement: 'prop', modelPath: `${CDN}/models/nature/Pebble_Round_1.gltf`,
    color: 0x666666, size: [1.5, 1, 1.5], scale: 1.5,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'stone', quantity: 3 }],
  },
  placed_fern: {
    id: 'placed_fern', name: 'Fern Bush', category: 'nature',
    placement: 'prop', modelPath: `${CDN}/models/nature/Bush_Common_Flowers.gltf`,
    color: 0x4CAF50, size: [1, 1.5, 1], scale: 0.85,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'herb', quantity: 1 }],
  },
  log_stump: {
    id: 'log_stump', name: 'Log Stump', category: 'nature',
    placement: 'prop', modelPath: `${CDN}/models/environment/harvest_stump.glb`,
    color: 0x5A3E1B, size: [1, 0.5, 1], scale: 0.6,
    rotatable: false, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'wood', quantity: 1 }],
  },
  // Ruins / ore still use stylized multipacks (non-tree) via node extract at place time
  placed_ruins_pillar: {
    id: 'placed_ruins_pillar', name: 'Temple Pillar', category: 'decoration',
    placement: 'prop', modelPath: `${CDN}/models/nature/stylized/ruins/temple_ruins.glb`,
    nodeName: 'Stone_Pillar',
    color: 0x8B8680, size: [2, 6, 2], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'stone', quantity: 8 }],
  },
  placed_ruins_wall: {
    id: 'placed_ruins_wall', name: 'Temple Wall', category: 'decoration',
    placement: 'prop', modelPath: `${CDN}/models/nature/stylized/ruins/temple_ruins.glb`,
    nodeName: 'Tall_Stone_Wall_Plain',
    color: 0x7A756F, size: [4, 4, 1], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'stone', quantity: 12 }],
  },
  placed_ore_node: {
    id: 'placed_ore_node', name: 'Ore Node', category: 'nature',
    placement: 'prop', modelPath: `${CDN}/models/nature/stylized/harvest/ore_nodes.glb`,
    nodeName: 'Iron_Node',
    color: 0x6B5B4B, size: [2, 1.5, 2], scale: 1.0,
    rotatable: true, requiresFloor: false, terrainPlaceable: true,
    cost: [{ itemId: 'stone', quantity: 4 }],
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

// ── Register survival kit SSOT (single write path — no hand-duplicated entries) ─
import { ALL_SURVIVAL_BUILD_PIECES } from '@shared/definitions/survivalKitBuildCatalog';
import { FANTASY_VILLAGE_PIECES } from '@shared/definitions/fantasyVillageBuildCatalog';
import { ICE_BIOME_BUILD_PIECES } from '@shared/definitions/iceBiomeCatalog';
import type { BuildPieceDef } from '@shared/definitions/buildSystem';

function pieceCategory(p: BuildPieceDef): BuildCategory {
  // Harvestable rocks/stones/trees from multipacks → nature tab
  if (p.notes?.includes('Harvestable')) return 'nature';
  // Ice biome terrain backdrops
  if (p.id.startsWith('ice_mountain_') || p.id.startsWith('ice_iceberg_') || p.id.startsWith('ice_snowy_mountain_')) {
    return 'terrain';
  }
  // Interior furniture ids
  if (p.id.startsWith('fv_furniture_') || p.id.startsWith('ice_sandman_bed') || p.category === 'sleep') {
    return 'furniture';
  }
  // Food / table props
  if (p.id.startsWith('fv_food_')) return 'decoration';
  switch (p.category) {
    case 'foundation':
    case 'wall':
    case 'floor':
    case 'roof':
      return 'structure';
    case 'tent':
      return 'camp';
    case 'fire':
    case 'bench':
    case 'tool':
      return 'crafting';
    case 'storage':
      return 'storage';
    case 'fence':
      return 'defense';
    case 'tower':
    case 'rts_building':
      return 'defense';
    case 'dock':
      return 'transport';
    case 'race_home':
      return 'camp';
    default:
      return 'decoration';
  }
}

const LAYER_COLORS: Record<string, number> = {
  camp: 0xc4a35a,
  bench: 0x8b6914,
  modular: 0x6b5428,
  dock: 0x5a4a3a,
  rts: 0x555555,
  race_home: 0x886644,
};

/** Catalog sourceGlb is `/models/...` → full CDN URL for runtime loaders */
function resolveCatalogModelPath(sourceGlb: string): string {
  if (sourceGlb.startsWith('http://') || sourceGlb.startsWith('https://')) {
    return sourceGlb;
  }
  const rel = sourceGlb.startsWith('/') ? sourceGlb : `/${sourceGlb}`;
  return `${CDN}${rel}`;
}

function survivalPieceToAsset(p: BuildPieceDef): BuildAssetDef {
  const nodeName = p.nodeName === 'root' ? undefined : p.nodeName;
  return {
    id: p.id,
    name: p.name,
    category: pieceCategory(p),
    placement: p.placement,
    modelPath: resolveCatalogModelPath(p.sourceGlb),
    nodeName,
    extraNodes: p.extraNodes,
    placeYOffset: p.placeYOffset,
    floating: p.floating,
    buildLayer: p.layer,
    color: LAYER_COLORS[p.layer] ?? 0x888888,
    size: p.size,
    scale: p.scale,
    rotatable: true,
    requiresFloor: p.requiresFloor,
    terrainPlaceable: p.terrainPlaceable,
    cost: p.cost,
    effect: p.effect
      ? {
          type: p.effect.type as NonNullable<BuildAssetDef['effect']>['type'],
          value: p.effect.value,
          description: p.effect.description,
        }
      : undefined,
  };
}

for (const piece of ALL_SURVIVAL_BUILD_PIECES) {
  BUILD_ASSETS[piece.id] = survivalPieceToAsset(piece);
}

// Fantasy village multipack — modular walls, towers, gates, houses, storage, carts
for (const piece of FANTASY_VILLAGE_PIECES) {
  BUILD_ASSETS[piece.id] = survivalPieceToAsset(piece);
}

// Ice / snow / mountain event multipack — frostbite + event island props
for (const piece of ICE_BIOME_BUILD_PIECES) {
  BUILD_ASSETS[piece.id] = survivalPieceToAsset(piece);
}

// Mirror survival pieces onto legacy camp-upgrade manifest ids
function aliasCampUpgrade(legacyId: string, survivalId: string): void {
  const src = BUILD_ASSETS[survivalId];
  const dst = BUILD_ASSETS[legacyId];
  if (!src || !dst) return;
  dst.modelPath = src.modelPath;
  dst.nodeName = src.nodeName;
  dst.extraNodes = src.extraNodes;
  dst.scale = src.scale;
  dst.size = src.size;
  dst.buildLayer = src.buildLayer;
  dst.placeYOffset = src.placeYOffset;
}

aliasCampUpgrade('camp_bench_upgrade', 'bench_workbench');
aliasCampUpgrade('camp_storage_upgrade', 'mod_chest');
aliasCampUpgrade('camp_tower_upgrade', 'tower_medieval_a');

// Legacy aliases — BuildModePanel / older saves
if (BUILD_ASSETS.dock_foundation && !BUILD_ASSETS.boat_dock) {
  BUILD_ASSETS.boat_dock = {
    ...BUILD_ASSETS.dock_foundation,
    id: 'boat_dock',
    name: 'Boat Dock',
    category: 'transport',
  };
}
// Fireplace → survival kit campfire (node extract)
if (BUILD_ASSETS.camp_fire_soup && BUILD_ASSETS.fireplace) {
  const fp = BUILD_ASSETS.fireplace;
  fp.modelPath = BUILD_ASSETS.camp_fire_soup.modelPath;
  fp.nodeName = BUILD_ASSETS.camp_fire_soup.nodeName;
  fp.buildLayer = 'camp';
}

// ── uMMORPG / 30grudge6 deployables (edit / build mode) ──────────────────────
// Captains, travelers, bandits, mounts, catapults, bolt-throwers, monsters
for (const d of allUmmorpgDeployables()) {
  if (BUILD_ASSETS[d.id]) continue;
  BUILD_ASSETS[d.id] = {
    id: d.id,
    name: d.name,
    category: d.buildCategory,
    placement: 'prop',
    modelPath: d.modelPath,
    color: d.color,
    size: d.size,
    scale: d.scale,
    rotatable: true,
    requiresFloor: false,
    terrainPlaceable: true,
    cost: [],
    effect: {
      type: d.kind === 'siege' ? 'defense' : d.kind === 'monster' ? 'train_unit' : 'train_unit',
      value: 1,
      description: d.description,
    },
  };
}

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

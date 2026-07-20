/**
 * Farming SSOT — Warlords RTS garden plots.
 *
 * Flow: hoe tills a **square** bed → seed plants into 4×4 cells (16) → water
 * hydrates planted crops → growth stages F1→F2→F3 from crops_low_poly.glb →
 * RMB harvest on final form walks player to plant, removes mesh, grants inventory.
 *
 * Pack: `/models/nature/stylized/harvest/crops_low_poly.glb`
 *   Carrot / Potatoe / Tomatoe / Wheat each with F1, F2, F3 + Soil dirt tiles.
 */

/** Cell pitch inside a garden bed (meters). */
export const FARM_CELL_SIZE_M = 1.0;

/** Plants per axis — 4×4 = 16 plant slots per plot. */
export const FARM_PLOT_CELLS = 4;

/** Full plot side length (meters). */
export const FARM_PLOT_SIZE_M = FARM_CELL_SIZE_M * FARM_PLOT_CELLS;

/** Half-side for hit tests / brush. */
export const FARM_PLOT_HALF_M = FARM_PLOT_SIZE_M / 2;

/** Shovel / legacy circular ground-tool diameter (meters). */
export const GROUND_TOOL_DIAMETER_M = 2;

/** Shovel circle radius (meters). */
export const GROUND_TOOL_RADIUS_M = GROUND_TOOL_DIAMETER_M / 2;

/** Player must be this close (XZ) to harvest after RMB approach. */
export const FARM_HARVEST_RANGE_M = 1.75;

/** Crop multipack path (local public + R2 CDN). */
export const CROPS_PACK_PATH = '/models/nature/stylized/harvest/crops_low_poly.glb';

/** Item ids */
export const ITEM_EMPTY_BUCKET = 'bucket_empty';
export const ITEM_WATER_BUCKET = 'bucket_water';
export const ITEM_HOE = 'toolHoe';
export const ITEM_SHOVEL = 'toolShovel';

export type FarmPlotState =
  | 'tilled'    // hoe turned soil — ready for seed
  | 'planted'   // at least one seed, dry
  | 'watered'   // watered, growing
  | 'ready'     // at least one cell harvestable
  | 'wilted';   // dried out (no water too long)

/** Growth stage mesh index: 0=sprout F1, 1=mid F2, 2=final F3 */
export type CropStage = 0 | 1 | 2;

export type CropKind = 'carrot' | 'potato' | 'tomato' | 'wheat';

export interface CropPackMeshMap {
  kind: CropKind;
  /** Parent node names in crops_low_poly.glb */
  stages: [string, string, string];
  /** Optional alternate mesh names if parent missing */
  meshStages?: [string, string, string];
}

/**
 * Node names from crops_low_poly.glb (Sketchfab Crops.fbx hierarchy).
 * Spelling matches the pack: Potatoe / Tomatoe.
 */
export const CROP_PACK_MESHES: Record<CropKind, CropPackMeshMap> = {
  carrot: {
    kind: 'carrot',
    stages: ['Carrot_F1', 'Carrot_F2', 'Carrot_F3'],
    meshStages: ['Carrot_F1_Carrot_0', 'Carrot_F2_Carrot_0', 'Carrot_F3_Carrot_0'],
  },
  potato: {
    kind: 'potato',
    stages: ['Potatoe_F1', 'Potatoe_F2', 'Potatoe_F3'],
    meshStages: ['Potatoe_F1_Potatoe_0', 'Potatoe_F2_Potatoe_0', 'Potatoe_F3_Potatoe_0'],
  },
  tomato: {
    kind: 'tomato',
    stages: ['Tomatoe_F1', 'Tomatoe_F2', 'Tomatoe_F3'],
    meshStages: ['Tomatoe_F1_Tomatoe_0', 'Tomatoe_F2_Tomatoe_0', 'Tomatoe_F3_Tomatoe_0'],
  },
  wheat: {
    kind: 'wheat',
    stages: ['Wheat_F1', 'Wheat_F2', 'Wheat_F3'],
    meshStages: ['Wheat_F1_Wheat_0', 'Wheat_F2_Wheat_0', 'Wheat_F3_Wheat_0'],
  },
};

/** Soil tile node names for plot bed visuals. */
export const CROP_SOIL_NODES = ['Soil', 'Soil.001', 'Soil.002', 'Soil.003'] as const;

export interface SeedDef {
  id: string;
  name: string;
  icon: string;
  /** Inventory item id for the seed stack */
  itemId: string;
  /** Resource granted on harvest */
  harvestItemId: string;
  harvestQtyMin: number;
  harvestQtyMax: number;
  /** Growth time after watering (ms) */
  growMs: number;
  /** Must be watered at least once to finish */
  requiresWater: boolean;
  /** Crop mesh color (placeholder fallback) */
  cropColor: number;
  /** Mature plant height (m) — used to fit pack meshes */
  matureHeight: number;
  /** Pack crop kind for stage meshes */
  cropKind: CropKind;
}

export const FARM_SEEDS: SeedDef[] = [
  {
    id: 'seed_carrot',
    name: 'Carrot Seeds',
    icon: '🥕',
    itemId: 'seed_carrot',
    harvestItemId: 'carrot',
    harvestQtyMin: 1,
    harvestQtyMax: 3,
    growMs: 45_000,
    requiresWater: true,
    cropColor: 0xe67e22,
    matureHeight: 0.55,
    cropKind: 'carrot',
  },
  {
    id: 'seed_wheat',
    name: 'Wheat Seeds',
    icon: '🌾',
    itemId: 'seed_wheat',
    harvestItemId: 'wheat',
    harvestQtyMin: 2,
    harvestQtyMax: 5,
    growMs: 60_000,
    requiresWater: true,
    cropColor: 0xd4a84b,
    matureHeight: 0.95,
    cropKind: 'wheat',
  },
  {
    id: 'seed_potato',
    name: 'Potato Seeds',
    icon: '🥔',
    itemId: 'seed_potato',
    harvestItemId: 'potato',
    harvestQtyMin: 1,
    harvestQtyMax: 4,
    growMs: 50_000,
    requiresWater: true,
    cropColor: 0xc4a574,
    matureHeight: 0.5,
    cropKind: 'potato',
  },
  {
    id: 'seed_tomato',
    name: 'Tomato Seeds',
    icon: '🍅',
    itemId: 'seed_tomato',
    harvestItemId: 'tomato',
    harvestQtyMin: 2,
    harvestQtyMax: 5,
    growMs: 55_000,
    requiresWater: true,
    cropColor: 0xe74c3c,
    matureHeight: 0.7,
    cropKind: 'tomato',
  },
  // Legacy aliases kept for existing inventory / craft recipes
  {
    id: 'seed_turnip',
    name: 'Turnip Seeds',
    icon: '🟣',
    itemId: 'seed_turnip',
    harvestItemId: 'turnip',
    harvestQtyMin: 1,
    harvestQtyMax: 3,
    growMs: 40_000,
    requiresWater: true,
    cropColor: 0x9b59b6,
    matureHeight: 0.45,
    cropKind: 'potato',
  },
  {
    id: 'seed_flax',
    name: 'Flax Seeds',
    icon: '🔵',
    itemId: 'seed_flax',
    harvestItemId: 'flax',
    harvestQtyMin: 2,
    harvestQtyMax: 4,
    growMs: 55_000,
    requiresWater: true,
    cropColor: 0x5dade2,
    matureHeight: 0.7,
    cropKind: 'wheat',
  },
  {
    id: 'seed_berry',
    name: 'Berry Seeds',
    icon: '🫐',
    itemId: 'seed_berry',
    harvestItemId: 'berries',
    harvestQtyMin: 2,
    harvestQtyMax: 6,
    growMs: 50_000,
    requiresWater: true,
    cropColor: 0x8e44ad,
    matureHeight: 0.5,
    cropKind: 'tomato',
  },
];

export function getSeedById(id: string): SeedDef | undefined {
  return FARM_SEEDS.find((s) => s.id === id || s.itemId === id);
}

export function isSeedItemId(itemId: string): boolean {
  const id = itemId.toLowerCase();
  if (id.startsWith('seed_') || id.endsWith('_seed') || id.endsWith('_seeds')) return true;
  return FARM_SEEDS.some((s) => s.itemId === itemId || s.id === itemId);
}

/** Map grow progress 0–1 → pack stage F1/F2/F3. */
export function growProgressToStage(progress: number): CropStage {
  if (progress >= 1) return 2;
  if (progress >= 0.55) return 1;
  return 0;
}

/** Starter seed stacks when inventory has none (solo / tutorial feel). */
export const STARTER_SEED_STACKS: Record<string, number> = {
  seed_carrot: 16,
  seed_wheat: 12,
  seed_potato: 12,
  seed_tomato: 10,
  seed_turnip: 4,
  seed_flax: 4,
  seed_berry: 3,
};

/** Crafting / auto-craft recipes that consume a water bucket charge. */
export interface WaterCraftRecipe {
  id: string;
  name: string;
  /** Output item */
  outputItemId: string;
  outputQty: number;
  /** Inputs besides water */
  inputs: Array<{ itemId: string; qty: number }>;
  /** Water bucket charges (1 charge = one water_bucket use) */
  waterCharges: number;
  /** Station hint */
  station: 'hand' | 'cooking' | 'alchemy' | 'auto';
  autoCraft?: boolean;
}

export const WATER_CRAFT_RECIPES: WaterCraftRecipe[] = [
  {
    id: 'dough_basic',
    name: 'Dough',
    outputItemId: 'dough',
    outputQty: 2,
    inputs: [{ itemId: 'wheat', qty: 2 }],
    waterCharges: 1,
    station: 'cooking',
    autoCraft: true,
  },
  {
    id: 'berry_mash',
    name: 'Berry Mash',
    outputItemId: 'berry_mash',
    outputQty: 1,
    inputs: [{ itemId: 'berries', qty: 4 }],
    waterCharges: 1,
    station: 'cooking',
    autoCraft: true,
  },
  {
    id: 'tomato_sauce',
    name: 'Tomato Sauce',
    outputItemId: 'tomato_sauce',
    outputQty: 1,
    inputs: [{ itemId: 'tomato', qty: 3 }],
    waterCharges: 1,
    station: 'cooking',
    autoCraft: true,
  },
  {
    id: 'flax_fiber_wash',
    name: 'Washed Flax Fiber',
    outputItemId: 'flax_fiber',
    outputQty: 3,
    inputs: [{ itemId: 'flax', qty: 2 }],
    waterCharges: 1,
    station: 'hand',
    autoCraft: true,
  },
  {
    id: 'healing_salve',
    name: 'Healing Salve',
    outputItemId: 'healing_salve',
    outputQty: 1,
    inputs: [{ itemId: 'carrot', qty: 1 }, { itemId: 'berries', qty: 2 }],
    waterCharges: 1,
    station: 'alchemy',
    autoCraft: false,
  },
];

export function getAutoWaterCraftRecipes(): WaterCraftRecipe[] {
  return WATER_CRAFT_RECIPES.filter((r) => r.autoCraft);
}

/**
 * Attempt a water-consuming craft against a simple bag of stacks.
 * Returns null if ingredients / water insufficient.
 */
export function tryWaterCraft(
  recipeId: string,
  inventory: Record<string, number>,
  waterChargesAvailable: number,
): {
  inventory: Record<string, number>;
  waterChargesSpent: number;
  outputItemId: string;
  outputQty: number;
} | null {
  const recipe = WATER_CRAFT_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return null;
  if (waterChargesAvailable < recipe.waterCharges) return null;

  const next = { ...inventory };
  for (const input of recipe.inputs) {
    if ((next[input.itemId] ?? 0) < input.qty) return null;
  }
  for (const input of recipe.inputs) {
    next[input.itemId] = (next[input.itemId] ?? 0) - input.qty;
    if (next[input.itemId] <= 0) delete next[input.itemId];
  }
  next[recipe.outputItemId] = (next[recipe.outputItemId] ?? 0) + recipe.outputQty;
  return {
    inventory: next,
    waterChargesSpent: recipe.waterCharges,
    outputItemId: recipe.outputItemId,
    outputQty: recipe.outputQty,
  };
}

/** Auto-craft: first matching recipe that can run. */
export function tryAutoWaterCraft(
  inventory: Record<string, number>,
  waterChargesAvailable: number,
): ReturnType<typeof tryWaterCraft> {
  for (const recipe of getAutoWaterCraftRecipes()) {
    const result = tryWaterCraft(recipe.id, inventory, waterChargesAvailable);
    if (result) return result;
  }
  return null;
}

/**
 * Farming SSOT — Valheim-like cultivation loop for Warlords.
 *
 * Ground tools (shovel / hoe / seed / water) use a fixed 2 m wide circle.
 * Flow: hoe tills dirt → seed plants on tilled patch → water bucket hydrates
 * → crop grows → harvest. Water bucket also feeds crafting / auto-craft recipes.
 */

/** Diameter of the ground-tool brush (meters). */
export const GROUND_TOOL_DIAMETER_M = 2;

/** Radius used by mesh brushes / plot placement (= half of diameter). */
export const GROUND_TOOL_RADIUS_M = GROUND_TOOL_DIAMETER_M / 2;

/** Item ids */
export const ITEM_EMPTY_BUCKET = 'bucket_empty';
export const ITEM_WATER_BUCKET = 'bucket_water';
export const ITEM_HOE = 'toolHoe';
export const ITEM_SHOVEL = 'toolShovel';

export type FarmPlotState =
  | 'tilled'    // hoe turned soil — ready for seed
  | 'planted'   // seed placed, dry
  | 'watered'   // watered, growing
  | 'ready'     // harvestable
  | 'wilted';   // dried out (no water too long)

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
  /** Crop mesh color (placeholder plant) */
  cropColor: number;
  /** Mature plant height (m) */
  matureHeight: number;
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
    matureHeight: 0.9,
  },
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

/** Starter seed stacks when inventory has none (solo / tutorial feel). */
export const STARTER_SEED_STACKS: Record<string, number> = {
  seed_carrot: 8,
  seed_wheat: 6,
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

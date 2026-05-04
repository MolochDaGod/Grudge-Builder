/**
 * Resource Bridge — Connects Island Harvesting to Crafting System
 *
 * Maps island-gathered resources (from islandSystem.ts CRAFTING_RESOURCES)
 * to the WCS crafting material tier system (wcsTaxonomy.ts MATERIAL_TIERS).
 *
 * This is the glue that makes the gameplay loop work:
 *   Island auto-harvest → resources → crafting materials → equipment → combat
 */

import { MATERIAL_TIERS, type AllTier } from "@/data/crafting/wcsTaxonomy";

// ── Island resource item ID → crafting material mapping ──────────────
// Keys are item IDs from islandSystem.ts CRAFTING_RESOURCES,
// values are { materialType, tier } that the crafting system understands.

export interface CraftingMaterialRef {
  materialType: "ingot" | "plank" | "cloth" | "leather" | "gem";
  tier: AllTier;
  /** How many of this resource convert into 1 crafting material */
  conversionRate: number;
}

/**
 * Maps island drop item IDs to their crafting material equivalents.
 * When a player harvests ORE_IRON_T1, they get materials that can be
 * smelted/processed into iron-ingot (tier 2) at a crafting bench.
 */
export const RESOURCE_TO_MATERIAL: Record<string, CraftingMaterialRef> = {
  // ── Ore → Ingots ─────────────────────────────────────────────────
  ORE_COPPER_T1:   { materialType: "ingot", tier: 1, conversionRate: 3 },
  ORE_IRON_T1:     { materialType: "ingot", tier: 2, conversionRate: 3 },
  ORE_TIN_T1:      { materialType: "ingot", tier: 1, conversionRate: 4 },
  ORE_STEEL_T2:    { materialType: "ingot", tier: 3, conversionRate: 4 },
  ORE_MITHRIL_T3:  { materialType: "ingot", tier: 4, conversionRate: 5 },

  // ── Wood → Planks ────────────────────────────────────────────────
  WOOD_PINE_T1:      { materialType: "plank", tier: 1, conversionRate: 2 },
  WOOD_OAK_T1:       { materialType: "plank", tier: 2, conversionRate: 3 },
  WOOD_BIRCH_T1:     { materialType: "plank", tier: 1, conversionRate: 2 },
  WOOD_IRONWOOD_T2:  { materialType: "plank", tier: 3, conversionRate: 4 },
  WOOD_ELDERWOOD_T3: { materialType: "plank", tier: 4, conversionRate: 5 },

  // ── Hemp/Fiber → Cloth ───────────────────────────────────────────
  LOOM_HEMP_FIBER: { materialType: "cloth", tier: 1, conversionRate: 3 },
  LOOM_COTTON:     { materialType: "cloth", tier: 1, conversionRate: 3 },
  LOOM_LINEN:      { materialType: "cloth", tier: 2, conversionRate: 2 },
  LOOM_SILK_T2:    { materialType: "cloth", tier: 3, conversionRate: 4 },

  // ── Leather/Hides → Leather ──────────────────────────────────────
  LEATHER_ROUGH:     { materialType: "leather", tier: 1, conversionRate: 2 },
  LEATHER_THICK:     { materialType: "leather", tier: 2, conversionRate: 3 },
  LEATHER_FINE:      { materialType: "leather", tier: 3, conversionRate: 3 },
  LEATHER_SHEEP:     { materialType: "leather", tier: 1, conversionRate: 2 },
  HIDE_BEAST:        { materialType: "leather", tier: 1, conversionRate: 3 },
  HIDE_DEER:         { materialType: "leather", tier: 2, conversionRate: 2 },
  HIDE_BOAR:         { materialType: "leather", tier: 3, conversionRate: 2 },
  LEATHER_EXOTIC:    { materialType: "leather", tier: 4, conversionRate: 4 },
  LEATHER_LEGENDARY: { materialType: "leather", tier: 5, conversionRate: 5 },

  // ── Gems ─────────────────────────────────────────────────────────
  GEM_ROUGH:         { materialType: "gem", tier: 1, conversionRate: 2 },
  GEM_SAPPHIRE:      { materialType: "gem", tier: 2, conversionRate: 1 },
  GEM_EMERALD:       { materialType: "gem", tier: 2, conversionRate: 1 },
  GEM_RUBY:          { materialType: "gem", tier: 3, conversionRate: 1 },
  GEM_DIAMOND:       { materialType: "gem", tier: 4, conversionRate: 1 },
  GEM_VOID_CRYSTAL:  { materialType: "gem", tier: 5, conversionRate: 1 },
  PEARL:             { materialType: "gem", tier: 2, conversionRate: 1 },
};

/**
 * Given a player's gathered resources, calculate how many processed
 * crafting materials they can produce at each tier.
 */
export function calculateCraftableMaterials(
  inventory: Record<string, number>
): Record<string, { materialId: string; materialName: string; quantity: number; tier: AllTier }> {
  const result: Record<string, { materialId: string; materialName: string; quantity: number; tier: AllTier }> = {};

  for (const [itemId, quantity] of Object.entries(inventory)) {
    const ref = RESOURCE_TO_MATERIAL[itemId];
    if (!ref || quantity <= 0) continue;

    const tierMats = MATERIAL_TIERS[ref.tier];
    if (!tierMats) continue;

    const materialId = tierMats[ref.materialType];
    const craftable = Math.floor(quantity / ref.conversionRate);
    if (craftable <= 0) continue;

    if (result[materialId]) {
      result[materialId].quantity += craftable;
    } else {
      result[materialId] = {
        materialId,
        materialName: materialId.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        quantity: craftable,
        tier: ref.tier,
      };
    }
  }

  return result;
}

/**
 * Check if a player has enough raw resources to craft a specific material.
 */
export function canProcessResource(
  itemId: string,
  inventoryCount: number
): { canProcess: boolean; outputMaterial: string; outputCount: number } {
  const ref = RESOURCE_TO_MATERIAL[itemId];
  if (!ref) return { canProcess: false, outputMaterial: "", outputCount: 0 };

  const tierMats = MATERIAL_TIERS[ref.tier];
  if (!tierMats) return { canProcess: false, outputMaterial: "", outputCount: 0 };

  const outputCount = Math.floor(inventoryCount / ref.conversionRate);
  return {
    canProcess: outputCount > 0,
    outputMaterial: tierMats[ref.materialType],
    outputCount,
  };
}

/**
 * Get the tier of a harvested resource item.
 */
export function getResourceTier(itemId: string): AllTier | null {
  return RESOURCE_TO_MATERIAL[itemId]?.tier ?? null;
}

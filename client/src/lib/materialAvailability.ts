type MaterialRow = { itemId: string; quantity?: number | null };

/** Merge account inventory items + resource tallies into one lookup map (by itemId). */
export function buildMaterialMap(
  inventory: MaterialRow[],
  resources: Record<string, number> = {},
): Record<string, number> {
  const map: Record<string, number> = { ...resources };
  for (const row of inventory) {
    if (!row.itemId) continue;
    map[row.itemId] = (map[row.itemId] || 0) + (row.quantity || 0);
  }
  return map;
}

export function getMaterialCount(map: Record<string, number>, itemId: string): number {
  return map[itemId] || 0;
}

export function canAffordRecipe(
  map: Record<string, number>,
  ingredients: Array<{ itemId: string; quantity: number }>,
): { ok: boolean; missing: Array<{ itemId: string; need: number; have: number }> } {
  const missing: Array<{ itemId: string; need: number; have: number }> = [];
  for (const ing of ingredients) {
    const have = getMaterialCount(map, ing.itemId);
    if (have < ing.quantity) {
      missing.push({ itemId: ing.itemId, need: ing.quantity, have });
    }
  }
  return { ok: missing.length === 0, missing };
}
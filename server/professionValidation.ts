/**
 * Server-side Profession & Crafting Validation
 *
 * Uses shared/professionService for XP calculations and shared/schema for DB types.
 * Provides helpers the route handlers call to validate gather/craft requests.
 */

import {
  calculateProfessionXPGain,
  getBaseXPForActivity,
  getLevelFromXP,
  type XPGainSource,
} from "@shared/professionService";
import type { IStorage } from "./storage";

// ── Tier unlock thresholds (mirrors client GATHERING_PROFESSIONS_CONFIG logic) ─
// Tier N is unlocked when profession level >= TIER_UNLOCK[N]
export const TIER_UNLOCK: Record<number, number> = {
  1: 1,
  2: 13,
  3: 25,
  4: 38,
  5: 50,
  6: 63,
  7: 76,
  8: 88,
};

export function getTierUnlocked(level: number): number {
  let highest = 1;
  for (const [tier, req] of Object.entries(TIER_UNLOCK)) {
    if (level >= req) highest = Number(tier);
  }
  return highest;
}

export function validateTierAccess(professionLevel: number, resourceTier: number): boolean {
  return getTierUnlocked(professionLevel) >= resourceTier;
}

// ── Gathering XP ──────────────────────────────────────────────────────────────

export function computeGatherResult(
  professionLevel: number,
  currentXp: number,
  resourceTier: number,
) {
  const baseXp = getBaseXPForActivity("gather_resource", resourceTier);
  const result = calculateProfessionXPGain(baseXp, "gathering", professionLevel, currentXp);
  return result;
}

// ── Crafting XP ───────────────────────────────────────────────────────────────

export function computeCraftResult(
  professionLevel: number,
  currentXp: number,
  recipeTier: number,
) {
  const baseXp = getBaseXPForActivity("craft_item", recipeTier);
  const result = calculateProfessionXPGain(baseXp, "crafting", professionLevel, currentXp);
  return result;
}

// ── Recipe ingredient validation ──────────────────────────────────────────────

export interface RecipeIngredient {
  itemId: string;
  quantity: number;
}

/**
 * Check that the account has enough of each ingredient.
 * Returns `{ valid: true }` or `{ valid: false, missing }`.
 */
export async function validateRecipeIngredients(
  storage: IStorage,
  accountId: string,
  ingredients: RecipeIngredient[],
): Promise<{ valid: true } | { valid: false; missing: { itemId: string; need: number; have: number }[] }> {
  const acctResources = await storage.getAccountResources(accountId);
  const resourceMap = acctResources?.resources || {};

  // Also check account inventory for non-resource items
  const inventoryItems = await storage.getAccountInventory(accountId);
  const inventoryMap: Record<string, number> = {};
  for (const item of inventoryItems) {
    inventoryMap[item.itemId] = (inventoryMap[item.itemId] || 0) + item.quantity;
  }

  const missing: { itemId: string; need: number; have: number }[] = [];

  for (const ing of ingredients) {
    const haveResource = resourceMap[ing.itemId] || 0;
    const haveInventory = inventoryMap[ing.itemId] || 0;
    const totalHave = haveResource + haveInventory;

    if (totalHave < ing.quantity) {
      missing.push({ itemId: ing.itemId, need: ing.quantity, have: totalHave });
    }
  }

  if (missing.length > 0) return { valid: false, missing };
  return { valid: true };
}

/**
 * Deduct ingredients from account resources first, then account inventory overflow.
 */
export async function deductIngredients(
  storage: IStorage,
  accountId: string,
  ingredients: RecipeIngredient[],
): Promise<void> {
  const acctResources = await storage.getAccountResources(accountId);
  const resourceMap = { ...(acctResources?.resources || {}) };
  const inventoryItems = await storage.getAccountInventory(accountId);

  for (const ing of ingredients) {
    let remaining = ing.quantity;

    // Deduct from resources first
    if (resourceMap[ing.itemId] && resourceMap[ing.itemId] > 0) {
      const take = Math.min(remaining, resourceMap[ing.itemId]);
      resourceMap[ing.itemId] -= take;
      remaining -= take;
    }

    // Deduct remainder from inventory items
    if (remaining > 0) {
      const matchingItems = inventoryItems
        .filter((i) => i.itemId === ing.itemId && i.quantity > 0)
        .sort((a, b) => a.quantity - b.quantity); // consume smallest stacks first

      for (const invItem of matchingItems) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, invItem.quantity);
        remaining -= take;
        if (take >= invItem.quantity) {
          await storage.removeAccountInventoryItem(invItem.id);
        } else {
          await storage.updateAccountInventoryItem(invItem.id, {
            quantity: invItem.quantity - take,
          });
        }
      }
    }
  }

  // Persist resource changes
  await storage.updateAccountResources(accountId, resourceMap);
}

// ── Migrate legacy character.professionLevels → characterProfessions table ───

export async function migrateProfessionLevels(
  storage: IStorage,
  characterId: string,
  legacyLevels: Record<string, { level: number; xp: number }>,
): Promise<void> {
  const existing = await storage.getCharacterProfessions(characterId);
  const existingIds = new Set(existing.map((p) => p.professionId));

  for (const [profId, data] of Object.entries(legacyLevels)) {
    const normalizedId = profId.toLowerCase();
    if (existingIds.has(normalizedId)) continue; // already migrated
    await storage.updateCharacterProfession(characterId, normalizedId, {
      level: data.level,
      xp: data.xp,
      lastGainAt: Date.now(),
    });
  }
}

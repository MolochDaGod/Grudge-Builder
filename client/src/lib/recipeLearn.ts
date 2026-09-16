/**
 * Recipe learn system — stand over a world asset and press E once per character.
 *
 * Sources: chest, camp fire/station, NPC base prop, deserted/event island prop.
 * Persistence: localStorage cache + optional Railway unlocked_recipes table.
 */
import {
  ICE_BIOME_LEARNABLES,
  type IceBiomePiece,
} from "@shared/definitions/iceBiomeCatalog";
import {
  getIceBiomeRecipeByAssetId,
  type IceBiomeRecipe,
} from "@shared/definitions/iceBiomeRecipes";

const STORAGE_KEY = "grudge_learned_recipes";

export type LearnPrompt = {
  assetId: string;
  nodeName: string;
  name: string;
  recipeId: string;
  alreadyKnown: boolean;
  source: string;
  description: string;
};

function readCache(characterId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${characterId}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeCache(characterId: string, set: Set<string>): void {
  localStorage.setItem(
    `${STORAGE_KEY}_${characterId}`,
    JSON.stringify([...set]),
  );
}

export function getActiveCharacterId(): string | null {
  const grudgeId =
    localStorage.getItem("grudge_account_id") ||
    localStorage.getItem("gruda_account_id") ||
    "guest";
  return (
    localStorage.getItem(`gruda_active_character_${grudgeId}`) ||
    localStorage.getItem("grudge_active_character") ||
    localStorage.getItem("gruda_active_character_guest")
  );
}

export function hasLearnedRecipe(
  characterId: string,
  recipeId: string,
): boolean {
  return readCache(characterId).has(recipeId);
}

/**
 * Map world mesh / placeable id → ice biome learnable piece.
 */
export function findLearnableByNodeOrAsset(
  nodeNameOrAssetId: string,
): IceBiomePiece | undefined {
  return ICE_BIOME_LEARNABLES.find(
    (p) =>
      p.nodeName === nodeNameOrAssetId ||
      p.id === nodeNameOrAssetId ||
      p.itemId === nodeNameOrAssetId,
  );
}

export function buildLearnPrompt(
  nodeNameOrAssetId: string,
  characterId?: string | null,
): LearnPrompt | null {
  const piece = findLearnableByNodeOrAsset(nodeNameOrAssetId);
  if (!piece?.recipeId || !piece.learnable) return null;
  const cid = characterId ?? getActiveCharacterId();
  if (!cid) return null;
  const recipe = getIceBiomeRecipeByAssetId(piece.id);
  return {
    assetId: piece.id,
    nodeName: piece.nodeName,
    name: piece.name,
    recipeId: piece.recipeId,
    alreadyKnown: hasLearnedRecipe(cid, piece.recipeId),
    source: piece.learnSource ?? "world_prop",
    description:
      recipe?.description ??
      `Press E to learn how to craft ${piece.name} (once).`,
  };
}

export type LearnResult =
  | { ok: true; recipe: IceBiomeRecipe; firstTime: boolean }
  | { ok: false; reason: string };

/**
 * Attempt to learn the recipe for the asset the player is standing over.
 * Idempotent: second E returns already-known success without double-write.
 */
export async function tryLearnRecipeFromAsset(
  nodeNameOrAssetId: string,
  opts?: { characterId?: string; source?: string },
): Promise<LearnResult> {
  const cid = opts?.characterId ?? getActiveCharacterId();
  if (!cid) return { ok: false, reason: "No active character" };

  const piece = findLearnableByNodeOrAsset(nodeNameOrAssetId);
  if (!piece?.recipeId) {
    return { ok: false, reason: "Nothing to learn here" };
  }

  const recipe = getIceBiomeRecipeByAssetId(piece.id);
  if (!recipe) return { ok: false, reason: "Recipe missing for asset" };

  const known = hasLearnedRecipe(cid, recipe.id);
  if (known) {
    return { ok: true, recipe, firstTime: false };
  }

  const set = readCache(cid);
  set.add(recipe.id);
  writeCache(cid, set);

  // Best-effort server persist (table: unlocked_recipes)
  try {
    await fetch(`/api/characters/${encodeURIComponent(cid)}/recipes/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipeId: recipe.id,
        sourceAssetId: piece.id,
        source: opts?.source ?? piece.learnSource ?? "world_prop",
        nodeName: piece.nodeName,
      }),
    });
  } catch {
    // Offline-tolerant: local cache remains source until sync
  }

  return { ok: true, recipe, firstTime: true };
}

/**
 * Vendor sale — learn a catalog recipe id (not an ice-biome world prop).
 * Same unlock API + local cache as E-learn.
 */
export async function tryLearnRecipeFromVendor(
  recipeId: string,
  opts?: { characterId?: string; vendorId?: string },
): Promise<{ ok: true; firstTime: boolean } | { ok: false; reason: string }> {
  const cid = opts?.characterId ?? getActiveCharacterId();
  if (!cid) return { ok: false, reason: 'No active character' };
  const id = String(recipeId || '').trim();
  if (!id) return { ok: false, reason: 'Missing recipe' };

  if (hasLearnedRecipe(cid, id)) {
    return { ok: true, firstTime: false };
  }

  const set = readCache(cid);
  set.add(id);
  writeCache(cid, set);

  try {
    await fetch(`/api/characters/${encodeURIComponent(cid)}/recipes/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipeId: id,
        source: 'vendor',
        vendorId: opts?.vendorId ?? null,
      }),
    });
  } catch {
    /* local cache holds until sync */
  }
  return { ok: true, firstTime: true };
}

export function listLearnedRecipeIds(characterId?: string | null): string[] {
  const cid = characterId ?? getActiveCharacterId();
  if (!cid) return [];
  return [...readCache(cid)];
}

/** HUD line when near a learnable prop */
export function learnHudLabel(prompt: LearnPrompt): string {
  if (prompt.alreadyKnown) {
    return `${prompt.name} — recipe known`;
  }
  return `E — Learn recipe: ${prompt.name}`;
}

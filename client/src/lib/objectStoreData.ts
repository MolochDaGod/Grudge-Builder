/**
 * ObjectStore Live Data Layer
 *
 * Fetches canonical item, recipe, and material data from ObjectStore.
 * Source of truth: https://objectstore.grudge-studio.com/api/v1/
 *
 * Data shape matches master-items.json, master-recipes.json, master-materials.json.
 * React Query hooks cache with 5-min stale time; falls back to local data on error.
 */

import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/assetConfig";

// ── ObjectStore JSON base (same-origin /api/objectstore via fleet rewrites) ──
const osEndpoint = (path: string) => apiUrl(path.startsWith('/') ? path : `/${path}`);

// ── TypeScript interfaces (match ObjectStore JSON schema) ────────────

export interface OSItemStats {
  damage: number;
  speed: number;
  crit: number;
  block: number;
  defense: number;
}

export interface OSItem {
  uuid: string;
  baseUuid: string;
  name: string;
  baseName: string;
  category: string;
  type: string;           // "weapon" | "armor" | "food" | "potion" | "offhand-tome" | "artifact"
  subCategory: string;    // "1h" | "2h" | "offhand" etc.
  tier: number;
  tierLabel: string;
  tierColor: string;
  iconUrl: string;
  description: string;
  stats: OSItemStats;
  craftedBy: string;
  recipeUuid: string;
  abilities: string[];
  signature: string;
  passives: string[];
  /** Artifact-only fields */
  discovery?: {
    hiddenUntilFound: boolean;
    source: string;
    revealCondition: string;
  };
  /** Artifact: level scaling (no tiers — stats scale with character level) */
  levelScaling?: {
    enabled: boolean;
    minLevel: number;
    maxLevel: number;
    scaleFactor: number;
    description: string;
  };
  /** Artifact: weapon subtype (sword, greatsword, axe, hammer, spear, staff, tome, bow, mace) */
  weaponSubtype?: string;
  /** Artifact: 1h or 2h */
  handedness?: '1h' | '2h';
  /** Artifact: element type (lightning, fire, frost, holy, shadow, arcane, nature, etc.) */
  artifactType?: string;
  /** Artifact: how to obtain */
  dropSources?: {
    primary: string;
    alternates: string[];
    factionVendor: { faction: string; reputationRequired: string } | null;
    eventOnly: boolean;
    bossDropTable: string[];
    locationHints: string[];
  };
  /** Artifact: 3D asset references for rendering */
  prefab?: {
    modelId: string;
    modelUrl: string;
    effectUrl: string;
    soundOnEquip: string;
    soundOnSwing: string;
    soundSignature: string;
    particleColor: string;
    glowIntensity: number;
    trailEnabled: boolean;
  };
  /** Basic ability (artifacts + weapons) */
  basicAbility?: string;
  /** Tome-only */
  skillGrants?: string[];
}

export interface OSRecipeMaterial {
  uuid: string;
  name: string;
  quantity: number;
}

export interface OSRecipe {
  uuid: string;
  name: string;
  resultItemId: string;
  resultName: string;
  profession: string;
  category: string;
  materials: OSRecipeMaterial[];
}

export interface OSMaterial {
  uuid: string;
  name: string;
  tier: number;
  tierLabel: string;
  category: string;       // "ore" | "ingot" | "wood" | "cloth" | "leather" | "essence" | "gem" | "herb" | etc.
  iconUrl?: string;
  description?: string;
}

export interface OSItemsResponse {
  version: string;
  generated: string;
  totalItems: number;
  totalRecipes: number;
  totalMaterials: number;
  items: OSItem[];
}

export interface OSRecipesResponse {
  version: string;
  generated: string;
  totalRecipes: number;
  recipes: OSRecipe[];
}

export interface OSMaterialsResponse {
  version: string;
  generated: string;
  totalMaterials: number;
  materials: OSMaterial[];
}

// ── Raw fetch helpers ────────────────────────────────────────────────

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`ObjectStore fetch failed: ${res.status} ${url}`);
  return res.json();
}

export async function fetchItems(): Promise<OSItemsResponse> {
  return fetchJSON<OSItemsResponse>(osEndpoint('/master-items.json'));
}

export async function fetchRecipes(): Promise<OSRecipesResponse> {
  return fetchJSON<OSRecipesResponse>(osEndpoint('/master-recipes.json'));
}

export async function fetchMaterials(): Promise<OSMaterialsResponse> {
  return fetchJSON<OSMaterialsResponse>(osEndpoint('/master-materials.json'));
}

// ── React Query hooks (5-min stale, 30-min GC) ──────────────────────

const STALE_MS = 5 * 60 * 1000;
const GC_MS = 30 * 60 * 1000;

export function useOSItems() {
  return useQuery<OSItemsResponse>({
    queryKey: ["objectstore", "items"],
    queryFn: fetchItems,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    retry: 2,
  });
}

export function useOSRecipes() {
  return useQuery<OSRecipesResponse>({
    queryKey: ["objectstore", "recipes"],
    queryFn: fetchRecipes,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    retry: 2,
  });
}

export function useOSMaterials() {
  return useQuery<OSMaterialsResponse>({
    queryKey: ["objectstore", "materials"],
    queryFn: fetchMaterials,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    retry: 2,
  });
}

/**
 * Combined hook — fetches all three ObjectStore datasets in parallel.
 * Returns { items, recipes, materials, isLoading, error }.
 */
export function useObjectStoreData() {
  const itemsQ = useOSItems();
  const recipesQ = useOSRecipes();
  const materialsQ = useOSMaterials();

  return {
    items: itemsQ.data?.items ?? [],
    recipes: recipesQ.data?.recipes ?? [],
    materials: materialsQ.data?.materials ?? [],
    totalItems: itemsQ.data?.totalItems ?? 0,
    totalRecipes: recipesQ.data?.totalRecipes ?? 0,
    totalMaterials: materialsQ.data?.totalMaterials ?? 0,
    isLoading: itemsQ.isLoading || recipesQ.isLoading || materialsQ.isLoading,
    error: itemsQ.error || recipesQ.error || materialsQ.error,
    version: itemsQ.data?.version ?? null,
  };
}

// ── Artifact helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute level-scaled stats for an artifact weapon.
 * Artifacts have no tier system — their stats scale with the character’s level.
 *
 * Formula: stat = baseValue * (1 + (characterLevel - 1) * scaleFactor)
 * At level 1: 1x base. At level 100: ~5x base (with 0.04 factor).
 *
 * @example
 *   const scaled = getArtifactStatsAtLevel(artifact, 50);
 *   // { damage: 255, speed: 330, crit: 36, ... }
 */
export function getArtifactStatsAtLevel(
  artifact: OSItem,
  characterLevel: number
): Record<string, number> {
  const scaling = artifact.levelScaling;
  if (!scaling?.enabled) return artifact.stats as unknown as Record<string, number>;

  const level = Math.max(scaling.minLevel, Math.min(characterLevel, scaling.maxLevel));
  const multiplier = 1 + (level - 1) * scaling.scaleFactor;

  const scaled: Record<string, number> = {};
  for (const [key, value] of Object.entries(artifact.stats)) {
    if (typeof value === 'number' && value !== 0) {
      scaled[key] = Math.round(value * multiplier);
    }
  }
  return scaled;
}

/**
 * Check if a player has discovered an artifact (visible in codex).
 * Artifacts with discovery.hiddenUntilFound=true should be hidden
 * until the player’s discoveredArtifacts set includes the UUID.
 */
export function isArtifactDiscovered(
  artifact: OSItem,
  discoveredUuids: Set<string>
): boolean {
  if (!artifact.discovery?.hiddenUntilFound) return true;
  return discoveredUuids.has(artifact.uuid);
}

/** Fetch master artifacts (level-scaled legendary weapons, hidden until found) */
export async function fetchArtifacts() {
  return fetchJSON<{ artifacts: OSItem[]; total: number }>(osEndpoint('/master-artifacts.json'));
}

export function useOSArtifacts() {
  return useQuery<{ artifacts: OSItem[]; total: number }>({
    queryKey: ["objectstore", "artifacts"],
    queryFn: fetchArtifacts,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    retry: 2,
  });
}

// ── Utility helpers ────────────────────────────────────────────────────────────────────

/** Get unique weapon categories from items list */
export function getWeaponCategories(items: OSItem[]): string[] {
  const cats = new Set<string>();
  for (const item of items) {
    if (item.type === "weapon") cats.add(item.category);
  }
  return Array.from(cats).sort();
}

/** Get all unique professions from recipes */
export function getRecipeProfessions(recipes: OSRecipe[]): string[] {
  const profs = new Set<string>();
  for (const r of recipes) profs.add(r.profession);
  return Array.from(profs).sort();
}

/** Group items by base weapon (T1 only = base items) */
export function getBaseItems(items: OSItem[]): OSItem[] {
  return items.filter(i => i.uuid === i.baseUuid);
}

/** Get all tier variants for a base item */
export function getTierVariants(items: OSItem[], baseUuid: string): OSItem[] {
  return items.filter(i => i.baseUuid === baseUuid).sort((a, b) => a.tier - b.tier);
}

/** Find recipe for an item */
export function findRecipeForItem(recipes: OSRecipe[], recipeUuid: string): OSRecipe | undefined {
  return recipes.find(r => r.uuid === recipeUuid);
}

/** Build a lookup map: itemUUID → OSItem */
export function buildItemMap(items: OSItem[]): Map<string, OSItem> {
  const map = new Map<string, OSItem>();
  for (const item of items) map.set(item.uuid, item);
  return map;
}

/** Build a lookup map: recipeUUID → OSRecipe */
export function buildRecipeMap(recipes: OSRecipe[]): Map<string, OSRecipe> {
  const map = new Map<string, OSRecipe>();
  for (const r of recipes) map.set(r.uuid, r);
  return map;
}

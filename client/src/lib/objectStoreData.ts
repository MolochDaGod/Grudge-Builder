/**
 * ObjectStore Live Data Layer
 *
 * Fetches canonical item, recipe, and material data from the ObjectStore CDN.
 * Source of truth: https://molochdagod.github.io/ObjectStore/api/v1/
 *
 * Data shape matches master-items.json, master-recipes.json, master-materials.json.
 * React Query hooks cache with 5-min stale time; falls back to local data on error.
 */

import { useQuery } from "@tanstack/react-query";

// ── CDN Base ─────────────────────────────────────────────────────────
const OS_CDN = "https://molochdagod.github.io/ObjectStore/api/v1";

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
  return fetchJSON<OSItemsResponse>(`${OS_CDN}/master-items.json`);
}

export async function fetchRecipes(): Promise<OSRecipesResponse> {
  return fetchJSON<OSRecipesResponse>(`${OS_CDN}/master-recipes.json`);
}

export async function fetchMaterials(): Promise<OSMaterialsResponse> {
  return fetchJSON<OSMaterialsResponse>(`${OS_CDN}/master-materials.json`);
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

// ── Utility helpers ──────────────────────────────────────────────────

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

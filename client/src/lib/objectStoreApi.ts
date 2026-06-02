/**
 * ObjectStore API Client
 *
 * Centralized fetcher for all game data from the Grudge Studio ObjectStore.
 * Data is served as static JSON from GitHub Pages at /api/v1/*.json.
 *
 * Features:
 *   - Typed fetch functions for each data category
 *   - In-memory cache (avoids re-fetching during session)
 *   - Stale-while-revalidate pattern for fast subsequent loads
 *   - Graceful fallback on fetch failure (returns cached or empty data)
 *
 * @see https://objectstore.grudge-studio.com/docs
 */

import { apiUrl, OBJECT_STORE_VERSION } from "@/lib/assetConfig";

// ── Cache ────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  version: string;
}

const cache = new Map<string, CacheEntry<unknown>>();

/** Default cache TTL: 10 minutes */
const CACHE_TTL_MS = 10 * 60 * 1000;

// ── Core fetcher ─────────────────────────────────────────────────────────────

async function fetchObjectStoreData<T>(
  endpoint: string,
  fallback: T,
  ttl = CACHE_TTL_MS,
): Promise<T> {
  const cacheKey = endpoint;
  const cached = cache.get(cacheKey) as CacheEntry<T> | undefined;

  // Return fresh cache hit
  if (
    cached &&
    cached.version === OBJECT_STORE_VERSION &&
    Date.now() - cached.fetchedAt < ttl
  ) {
    return cached.data;
  }

  try {
    const url = apiUrl(endpoint);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ObjectStore ${endpoint}: HTTP ${res.status}`);
    const data = (await res.json()) as T;

    cache.set(cacheKey, {
      data,
      fetchedAt: Date.now(),
      version: OBJECT_STORE_VERSION,
    });

    return data;
  } catch (err) {
    console.warn(`[ObjectStore] Failed to fetch ${endpoint}:`, err);
    // Return stale cache if available, otherwise fallback
    if (cached) return cached.data;
    return fallback;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Fetch all weapons (17 categories × 6 items × 8 tiers) */
export function fetchWeapons() {
  return fetchObjectStoreData<Record<string, unknown>>("/weapons.json", {});
}

/** Fetch all armor sets (6 sets × 8 slots × 3 materials + gems) */
export function fetchArmor() {
  return fetchObjectStoreData<Record<string, unknown>>("/armor.json", {});
}

/** Fetch all crafting materials (ore, wood, cloth, leather, gems, herbs) */
export function fetchMaterials() {
  return fetchObjectStoreData<Record<string, unknown>>("/materials.json", {});
}

/** Fetch all consumables (chef foods, potions, engineer items) */
export function fetchConsumables() {
  return fetchObjectStoreData<Record<string, unknown>>("/consumables.json", {});
}

/** Fetch weapon skills (207 skills across 17 types with cast times, projectiles, physics, damage types) */
export function fetchWeaponSkills() {
  return fetchObjectStoreData<Record<string, unknown>>(
    "/weaponSkills.json",
    {},
  );
}

/** Fetch weapon skills for a specific class (via Worker API) */
export async function fetchWeaponSkillsForClass(className: string) {
  try {
    const { workerUrl } = await import('@/lib/assetConfig');
    const res = await fetch(workerUrl(`/v1/weapon-skills/class/${className}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[ObjectStore] Failed to fetch weapon skills for ${className}:`, err);
    return null;
  }
}

/** Fetch full skill tree for a specific weapon type (via Worker API) */
export async function fetchWeaponSkillTree(weaponType: string) {
  try {
    const { workerUrl } = await import('@/lib/assetConfig');
    const res = await fetch(workerUrl(`/v1/weapon-skills/${weaponType}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[ObjectStore] Failed to fetch skill tree for ${weaponType}:`, err);
    return null;
  }
}

/** Fetch all enemies (38 enemies across 8 tiers) */
export function fetchEnemies() {
  return fetchObjectStoreData<Record<string, unknown>>("/enemies.json", {});
}

/** Fetch all bosses (12 bosses with multi-phase mechanics) */
export function fetchBosses() {
  return fetchObjectStoreData<Record<string, unknown>>("/bosses.json", {});
}

/** Fetch effect sprites (147 VFX sprite sheets) */
export function fetchEffectSprites() {
  return fetchObjectStoreData<Record<string, unknown>>(
    "/effectSprites.json",
    {},
  );
}

/** Fetch ability effects (209 abilities with effect chains) */
export function fetchAbilityEffects() {
  return fetchObjectStoreData<Record<string, unknown>>(
    "/abilityEffects.json",
    {},
  );
}

/** Fetch 2D sprites registry (5,485 sprites across 13 categories) */
export function fetchSprites2d() {
  return fetchObjectStoreData<Record<string, unknown>>("/sprites2d.json", {});
}

/** Fetch sprite path mappings for weapons and armor icons */
export function fetchSpriteMaps() {
  return fetchObjectStoreData<Record<string, unknown>>("/spriteMaps.json", {});
}

/** Fetch all classes (Warrior, Mage Priest, Worge, Ranger) */
export function fetchClasses() {
  return fetchObjectStoreData<Record<string, unknown>>("/classes.json", {});
}

/** Fetch all races (Human, Orc, Elf, Undead, Barbarian, Dwarf) */
export function fetchRaces() {
  return fetchObjectStoreData<Record<string, unknown>>("/races.json", {});
}

/** Fetch all factions (Crusade, Legion, Fabled) */
export function fetchFactions() {
  return fetchObjectStoreData<Record<string, unknown>>("/factions.json", {});
}

/** Fetch all attributes (STR, INT, VIT, DEX, END, WIS, AGI, TAC) */
export function fetchAttributes() {
  return fetchObjectStoreData<Record<string, unknown>>("/attributes.json", {});
}

/** Fetch all professions (5 crafting + 6 gathering, 363+ recipes) */
export function fetchProfessions() {
  return fetchObjectStoreData<Record<string, unknown>>(
    "/professions.json",
    {},
  );
}

/** Fetch skill trees */
export function fetchSkillTrees() {
  return fetchObjectStoreData<Record<string, unknown>>("/skillTrees.json", {});
}

/** Fetch full items database (unified weapons + armor + materials + consumables) */
export function fetchItemsDatabase() {
  return fetchObjectStoreData<Record<string, unknown>>(
    "/items-database.json",
    {},
  );
}

/** Fetch equipment data */
export function fetchEquipment() {
  return fetchObjectStoreData<Record<string, unknown>>("/equipment.json", {});
}

/** Fetch missions */
export function fetchMissions() {
  return fetchObjectStoreData<Record<string, unknown>>("/missions.json", {});
}

/** Fetch world map data */
export function fetchWorldMap() {
  return fetchObjectStoreData<Record<string, unknown>>("/worldMap.json", {});
}

/** Fetch lore entries */
export function fetchLore() {
  return fetchObjectStoreData<Record<string, unknown>>("/lore.json", {});
}

/** Fetch quests */
export function fetchQuests() {
  return fetchObjectStoreData<Record<string, unknown>>("/quests.json", {});
}

/** Fetch master items (with GRUDGE UUIDs, tier expansion, recipe links) */
export function fetchMasterItems() {
  return fetchObjectStoreData<Record<string, unknown>>("/master-items.json", {});
}

/** Fetch master recipes (with GRUDGE UUIDs, material links) */
export function fetchMasterRecipes() {
  return fetchObjectStoreData<Record<string, unknown>>("/master-recipes.json", {});
}

/** Fetch master materials (with GRUDGE UUIDs) */
export function fetchMasterMaterials() {
  return fetchObjectStoreData<Record<string, unknown>>("/master-materials.json", {});
}

/** Fetch master artifacts (D3 - end-game world-found items; honor discovery.hiddenUntilFound) */
export function fetchMasterArtifacts() {
  return fetchObjectStoreData<Record<string, unknown>>("/master-artifacts.json", {});
}

/** Fetch combined master registry (UUID index across items + artifacts + professions + skills) */
export function fetchMasterRegistry() {
  return fetchObjectStoreData<Record<string, unknown>>("/master-registry.json", {});
}

/** Fetch master professions (WCS-consolidated, 6 gathering + 5 crafting with 148 skill-tree nodes) */
export function fetchMasterProfessions() {
  return fetchObjectStoreData<Record<string, unknown>>("/master-professions.json", {});
}

/** Fetch master class skill trees (4 classes, 69 skills, each with a GRUDGE SKIL UUID) */
export function fetchMasterSkillTrees() {
  return fetchObjectStoreData<Record<string, unknown>>("/master-skillTrees.json", {});
}

/** Fetch master weapon skills (17 weapon types, 207 skills + class-restriction map) */
export function fetchMasterWeaponSkills() {
  return fetchObjectStoreData<Record<string, unknown>>("/master-weaponSkills.json", {});
}

/** Fetch projectile sprite metadata (GrudgeOrigins missiles + CDN paths) */
export function fetchProjectiles() {
  return fetchObjectStoreData<Record<string, unknown>>("/projectiles.json", {});
}

/** Fetch 3D race models (6 races, equipment slots, bone containers, textures, mounts) */
export function fetchRaceModels() {
  return fetchObjectStoreData<Record<string, unknown>>("/race-models.json", {});
}

// ── 3D Character Model Helpers ───────────────────────────────────────────────

const RACE_CDN_BASE = 'https://assets.grudge-studio.com/asset-packs/toon-rts-characters';

/** Get the CDN URL for a race's character GLB (texture-baked, ready to load with GLTFLoader) */
export function getRaceCharacterUrl(raceId: string): string {
  return `${RACE_CDN_BASE}/glb/characters/${raceId}.glb`;
}

/** Get the CDN URL for a shared animation GLB */
export function getRaceAnimUrl(animName: string): string {
  return `${RACE_CDN_BASE}/glb/anim_${animName}.glb`;
}

/** Get the CDN URL for a weapon animation FBX pack file */
export function getWeaponAnimUrl(weaponType: string, filename: string): string {
  return `${RACE_CDN_BASE}/weapons/${weaponType}/${encodeURIComponent(filename)}`;
}

/** All 6 race character GLB URLs for bulk preloading */
export function getAllRaceCharacterUrls(): Record<string, string> {
  return {
    human: getRaceCharacterUrl('human'),
    barbarian: getRaceCharacterUrl('barbarian'),
    elf: getRaceCharacterUrl('elf'),
    dwarf: getRaceCharacterUrl('dwarf'),
    orc: getRaceCharacterUrl('orc'),
    undead: getRaceCharacterUrl('undead'),
  };
}

// ── Cache management

/** Clear the entire ObjectStore data cache */
export function clearObjectStoreCache(): void {
  cache.clear();
}

/** Clear a specific endpoint from cache */
export function invalidateEndpoint(endpoint: string): void {
  cache.delete(endpoint);
}

/** Get cache stats for debugging */
export function getCacheStats(): {
  entries: number;
  endpoints: string[];
  version: string;
} {
  return {
    entries: cache.size,
    endpoints: Array.from(cache.keys()),
    version: OBJECT_STORE_VERSION,
  };
}

/**
 * Prefetch commonly used data endpoints in parallel.
 * Call this on app init to warm the cache.
 */
export async function prefetchCoreData(): Promise<void> {
  await Promise.allSettled([
    fetchWeapons(),
    fetchArmor(),
    fetchMaterials(),
    fetchClasses(),
    fetchRaces(),
    fetchFactions(),
    fetchAttributes(),
    fetchSpriteMaps(),
    fetchWeaponSkills(),
  ]);
}

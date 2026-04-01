/**
 * useObjectStore — React hook for consuming ObjectStore game data
 *
 * Wraps the objectStoreApi fetch functions with React state management,
 * providing loading/error/data states and automatic refetch on mount.
 *
 * @example
 *   const { data: weapons, isLoading } = useObjectStore('weapons', fetchWeapons);
 *   const { data: classes } = useObjectStore('classes', fetchClasses);
 */

import { useState, useEffect, useCallback, useRef } from "react";

type FetchFn<T> = () => Promise<T>;

interface UseObjectStoreResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Generic hook for fetching any ObjectStore endpoint.
 *
 * @param key - Unique key for this data (used for dedup)
 * @param fetchFn - The objectStoreApi fetch function to call
 * @param fallback - Optional fallback data if fetch fails
 */
export function useObjectStore<T>(
  key: string,
  fetchFn: FetchFn<T>,
  fallback?: T,
): UseObjectStoreResult<T> {
  const [data, setData] = useState<T | null>(fallback ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
        setIsLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      }
    }
  }, [fetchFn]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [key, load]);

  return { data, isLoading, error, refetch: load };
}

// ── Pre-built hooks for common data ──────────────────────────────────────────

import {
  fetchWeapons,
  fetchArmor,
  fetchMaterials,
  fetchConsumables,
  fetchClasses,
  fetchRaces,
  fetchFactions,
  fetchAttributes,
  fetchEnemies,
  fetchBosses,
  fetchProfessions,
  fetchSkillTrees,
  fetchItemsDatabase,
  fetchWeaponSkills,
  fetchSpriteMaps,
  fetchWorldMap,
  fetchMissions,
  fetchLore,
} from "@/lib/objectStoreApi";

export const useWeapons = () => useObjectStore("weapons", fetchWeapons);
export const useArmor = () => useObjectStore("armor", fetchArmor);
export const useMaterials = () => useObjectStore("materials", fetchMaterials);
export const useConsumables = () =>
  useObjectStore("consumables", fetchConsumables);
export const useClasses = () => useObjectStore("classes", fetchClasses);
export const useRaces = () => useObjectStore("races", fetchRaces);
export const useFactions = () => useObjectStore("factions", fetchFactions);
export const useAttributes = () =>
  useObjectStore("attributes", fetchAttributes);
export const useEnemies = () => useObjectStore("enemies", fetchEnemies);
export const useBosses = () => useObjectStore("bosses", fetchBosses);
export const useProfessions = () =>
  useObjectStore("professions", fetchProfessions);
export const useSkillTrees = () =>
  useObjectStore("skillTrees", fetchSkillTrees);
export const useItemsDatabase = () =>
  useObjectStore("items-database", fetchItemsDatabase);
export const useWeaponSkills = () =>
  useObjectStore("weaponSkills", fetchWeaponSkills);
export const useSpriteMaps = () =>
  useObjectStore("spriteMaps", fetchSpriteMaps);
export const useWorldMap = () => useObjectStore("worldMap", fetchWorldMap);
export const useMissions = () => useObjectStore("missions", fetchMissions);
export const useLore = () => useObjectStore("lore", fetchLore);

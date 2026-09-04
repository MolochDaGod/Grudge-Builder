/**
 * Island / camp building prefabs — SI 4 m (2× character).
 *
 * Catalog SSOT: ObjectStore api/v1/island-building-prefabs.json
 * Script:       ObjectStore js/island-building-prefabs.js (window.GrudgeIslandBuildings)
 * Bake:         ObjectStore scripts/bake-island-buildings.mjs  (glb2glb --height 4)
 *
 * Binary identity: glTF magic + exact catalog byte length.
 * CDN v2.2.1 still serves the 8.9 MB raw cantina on R2 — reject it, use info.*.
 * Never GET models/_optimized/buildings/* until CDN 2.3 html-guard is live.
 */

export const CHARACTER_HEIGHT_M = 2;
export const BUILDING_HEIGHT_M = 4;

export const ASSETS_CDN = 'https://assets.grudge-studio.com';
export const INFO_ORIGIN = 'https://info.grudge-studio.com';

/** JSON catalog. Browser uses same-origin objectstore proxy → info. */
export const ISLAND_BUILDING_CATALOG_URLS = [
  '/api/objectstore/v1/island-building-prefabs.json',
  `${INFO_ORIGIN}/api/v1/island-building-prefabs.json`,
  'https://objectstore.grudge-studio.com/api/v1/island-building-prefabs.json',
] as const;

export type IslandBuildingId =
  | 'cantina'
  | 'tavern'
  | 'inn'
  | 'house'
  | 'blacksmith'
  | 'market';

export interface IslandBuildingPrefab {
  id: IslandBuildingId | string;
  name: string;
  role: string;
  r2Key: string;
  r2KeyOptimized?: string;
  cdnUrl: string;
  infoUrl: string;
  bytes: number;
  md5: string;
  heightM: number;
  craftStation: boolean;
}

/** Baked 4 m identity — used when catalog fetch fails. */
export const ISLAND_BUILDINGS: IslandBuildingPrefab[] = [
  {
    id: 'cantina',
    name: 'Cantina',
    role: 'tavern_bar',
    r2Key: 'models/buildings/cantina.glb',
    r2KeyOptimized: 'models/_optimized/buildings/cantina.glb',
    cdnUrl: `${ASSETS_CDN}/models/buildings/cantina.glb`,
    infoUrl: `${INFO_ORIGIN}/models/buildings/cantina.glb`,
    bytes: 158656,
    md5: '3f2ead9e89a8aaa076433494ddec8874',
    heightM: BUILDING_HEIGHT_M,
    craftStation: false,
  },
  {
    id: 'tavern',
    name: 'Tavern',
    role: 'tavern',
    r2Key: 'models/buildings/tavern.glb',
    r2KeyOptimized: 'models/_optimized/buildings/tavern.glb',
    cdnUrl: `${ASSETS_CDN}/models/buildings/tavern.glb`,
    infoUrl: `${INFO_ORIGIN}/models/buildings/tavern.glb`,
    bytes: 158656,
    md5: '135ec54080525b5fe23cc73601b9d27f',
    heightM: BUILDING_HEIGHT_M,
    craftStation: false,
  },
  {
    id: 'inn',
    name: 'Inn',
    role: 'lodging',
    r2Key: 'models/buildings/inn.glb',
    r2KeyOptimized: 'models/_optimized/buildings/inn.glb',
    cdnUrl: `${ASSETS_CDN}/models/buildings/inn.glb`,
    infoUrl: `${INFO_ORIGIN}/models/buildings/inn.glb`,
    bytes: 79924,
    md5: 'e7364c95ffc24343cd0944ef51d2e014',
    heightM: BUILDING_HEIGHT_M,
    craftStation: false,
  },
  {
    id: 'house',
    name: 'House',
    role: 'dwelling',
    r2Key: 'models/buildings/house.glb',
    r2KeyOptimized: 'models/_optimized/buildings/house.glb',
    cdnUrl: `${ASSETS_CDN}/models/buildings/house.glb`,
    infoUrl: `${INFO_ORIGIN}/models/buildings/house.glb`,
    bytes: 53180,
    md5: 'ca7c36642ca961ff3e4b71099898be32',
    heightM: BUILDING_HEIGHT_M,
    craftStation: false,
  },
  {
    id: 'blacksmith',
    name: 'Blacksmith',
    role: 'craft_station',
    r2Key: 'models/buildings/blacksmith.glb',
    r2KeyOptimized: 'models/_optimized/buildings/blacksmith.glb',
    cdnUrl: `${ASSETS_CDN}/models/buildings/blacksmith.glb`,
    infoUrl: `${INFO_ORIGIN}/models/buildings/blacksmith.glb`,
    bytes: 59148,
    md5: '8423f86eb041a1ae8fcbf2694eb1e316',
    heightM: BUILDING_HEIGHT_M,
    craftStation: true,
  },
  {
    id: 'market',
    name: 'Market',
    role: 'market',
    r2Key: 'models/buildings/market.glb',
    r2KeyOptimized: 'models/_optimized/buildings/market.glb',
    cdnUrl: `${ASSETS_CDN}/models/buildings/market.glb`,
    infoUrl: `${INFO_ORIGIN}/models/buildings/market.glb`,
    bytes: 71848,
    md5: 'bd319838fd1745923c699aa23a9367c5',
    heightM: BUILDING_HEIGHT_M,
    craftStation: false,
  },
];

const BY_ID = new Map(ISLAND_BUILDINGS.map((b) => [b.id, b]));

export function getIslandBuilding(id: string): IslandBuildingPrefab | null {
  return BY_ID.get(id) || null;
}

export function looksLikeGlb(bytes: Uint8Array): boolean {
  return !!bytes && bytes.length >= 4 && bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46;
}

export function looksLikeHtmlHub(bytes: Uint8Array): boolean {
  if (!bytes?.length) return false;
  let i = 0;
  const n = Math.min(bytes.length, 96);
  while (i < n && (bytes[i] === 0x20 || bytes[i] === 0x09 || bytes[i] === 0x0a || bytes[i] === 0x0d)) i++;
  return bytes[i] === 0x3c;
}

export function identityError(buf: Uint8Array, prefab: IslandBuildingPrefab): string | null {
  if (looksLikeHtmlHub(buf) || !looksLikeGlb(buf)) return 'html-hub-rejected';
  if (prefab.bytes && buf.byteLength !== prefab.bytes) {
    return `size-mismatch ${buf.byteLength}!=${prefab.bytes}`;
  }
  return null;
}

/** CDN canonical then info.* same key. Never _optimized on 2.2.1. */
export function buildingFetchUrls(id: string): string[] {
  const b = BY_ID.get(id);
  if (!b) return [];
  return [b.cdnUrl, b.infoUrl];
}

export async function fetchIslandBuildingCatalog(
  init?: RequestInit,
): Promise<{ count: number; prefabs: IslandBuildingPrefab[] } | null> {
  for (const url of ISLAND_BUILDING_CATALOG_URLS) {
    try {
      const r = await fetch(url, init);
      if (!r.ok) continue;
      const json = (await r.json()) as { count?: number; prefabs?: IslandBuildingPrefab[] };
      if (Array.isArray(json.prefabs) && json.prefabs.length) {
        return { count: json.count ?? json.prefabs.length, prefabs: json.prefabs };
      }
    } catch {
      /* try next */
    }
  }
  return { count: ISLAND_BUILDINGS.length, prefabs: ISLAND_BUILDINGS };
}

export async function fetchBuildingGlb(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ id: string; url: string; bytes: Uint8Array; prefab: IslandBuildingPrefab }> {
  const b = BY_ID.get(id);
  if (!b) throw new Error(`unknown island building ${id}`);
  let lastErr: Error | null = null;
  for (const url of buildingFetchUrls(id)) {
    try {
      const res = await fetchImpl(url);
      if (!res.ok) {
        lastErr = new Error(`${res.status} ${url}`);
        continue;
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      const why = identityError(buf, b);
      if (why) {
        lastErr = new Error(`${why} ${url}`);
        continue;
      }
      return { id, url, bytes: buf, prefab: b };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr || new Error(`no GLB for ${id}`);
}

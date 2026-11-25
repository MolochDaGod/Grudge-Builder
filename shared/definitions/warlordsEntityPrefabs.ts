/**
 * Warlords-era entity prefabs SSOT (icons + game metadata).
 *
 * Source icons: Desktop `icons/icons/entities` (118 PNGs)
 * Live catalog: https://objectstore.grudge-studio.com/api/v1/warlords-entity-prefabs.json
 * Local JSON: ObjectStore `api/v1/warlords-entity-prefabs.json` (mirrored here as JSON)
 * Icon shard: ObjectStore `api/v1/icon-shards/entity.json`
 *
 * Regenerate / deploy:
 *   cd ObjectStore && node scripts/inventory-unity-warlords-migration.mjs
 *   cd ObjectStore && node scripts/deploy-unity-warlords-entities.mjs --all
 *   cd ObjectStore && node scripts/upload-entity-icons-r2.mjs
 *
 * Rules:
 *  - Inventory/craft items stay on master-item-prefabs (not this file).
 *  - These are world entities: units, structures, siege, mounts, vehicles.
 *  - Profession XP remains per character; placeables are account/world.
 *  - Units prefer grudge6 CDN race FBX; siege/mounts use models/warlords/entities/*.glb
 */

export type WarlordsEntityKind = 'unit' | 'structure' | 'siege' | 'mount' | 'vehicle' | 'prop';

export type WarlordsEntityCategory =
  | 'unit'
  | 'mount'
  | 'siege'
  | 'ship'
  | 'airship'
  | 'structure'
  | 'race_home'
  | 'camp_building'
  | 'bench'
  | 'tent'
  | 'fire'
  | 'fortification'
  | 'claim_flag'
  | 'furniture'
  | 'prop';

export type EntityMeshStatus =
  | 'kit_linked'
  | 'pack_linked'
  | 'icon_only'
  | 'cdn_ready'
  | 'local_glb'
  | 'unity_source'
  | 'unity_prefab_only';

export interface WarlordsEntityIcon {
  uuid: string;
  path: string;
  cdnUrl: string;
  cdnUrlAlt?: string;
}

export interface WarlordsEntityMesh {
  r2Key: string | null;
  cdnUrl: string | null;
  contentType: string | null;
  status: EntityMeshStatus;
  note?: string;
}

export interface WarlordsEntityPrefab {
  prefabId: string;
  id: string;
  kind: WarlordsEntityKind;
  category: WarlordsEntityCategory;
  name: string;
  displayName: string;
  era: 'warlords';
  layer: string;
  race?: string | null;
  role?: string | null;
  faction?: string | null;
  tags: string[];
  icon: WarlordsEntityIcon;
  mesh: WarlordsEntityMesh;
  stats: Record<string, number | boolean>;
  si: { heightM: number; unit: 'meter' };
  game: {
    placeable: boolean;
    trainable: boolean;
    mountable: boolean;
    craftStation: boolean;
    claimFlag: boolean;
    buildLayer: string | null;
  };
  package: string;
  status: EntityMeshStatus;
}

/** CDN base for entity pack icons (also mirrored under game-assets/). */
export const WARLORDS_ENTITY_ICON_CDN =
  'https://assets.grudge-studio.com/icons/pack/entities';

export const WARLORDS_ENTITY_ICON_CDN_ALT =
  'https://assets.grudge-studio.com/game-assets/icons/pack/entities';

/** Converted Unity → Warlords entity meshes (siege, mounts, role shells). */
export const WARLORDS_ENTITY_MESH_CDN =
  'https://assets.grudge-studio.com/models/warlords/entities';

/** Live ObjectStore catalog (preferred at runtime). */
export const WARLORDS_ENTITY_CATALOG_URL =
  'https://objectstore.grudge-studio.com/api/v1/warlords-entity-prefabs.json';

/** SI-baked camp buildings (4 m). Prefer mesh.cdnUrl from island-building-prefabs when islandPack is set. */
export const ISLAND_BUILDING_PREFABS_URL =
  'https://info.grudge-studio.com/api/v1/island-building-prefabs.json';

export function entityMeshUrl(slugOrId: string): string {
  const slug = String(slugOrId)
    .replace(/^entities\//, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  if (/^https?:\/\//i.test(slugOrId)) return slugOrId;
  return `${WARLORDS_ENTITY_MESH_CDN}/${slug}.glb`;
}

/** Fetch live catalog (ObjectStore → R2 static-json). */
export async function fetchWarlordsEntityCatalog(
  init?: RequestInit,
): Promise<{ count: number; prefabs: WarlordsEntityPrefab[] } | null> {
  try {
    const r = await fetch(WARLORDS_ENTITY_CATALOG_URL, init);
    if (!r.ok) return null;
    return (await r.json()) as { count: number; prefabs: WarlordsEntityPrefab[] };
  } catch {
    return null;
  }
}

/**
 * Resolve a display icon URL for an entity slug or prefab id.
 * Prefer game-assets path used by ObjectStore shard; fall back to pack path.
 */
export function entityIconUrl(slugOrId: string): string {
  const slug = String(slugOrId)
    .replace(/^entities\//, '')
    .replace(/^PFAB-ENT-/i, '')
    .trim();
  // If caller already passed a full URL
  if (/^https?:\/\//i.test(slugOrId)) return slugOrId;
  const file = slug.includes('/') ? slug.split('/').pop()! : slug;
  const base = file.endsWith('.png') ? file : `${file}.png`;
  return `${WARLORDS_ENTITY_ICON_CDN_ALT}/${base}`;
}

/** Normalize desktop filename / display name → catalog slug */
export function entitySlugFromName(name: string): string {
  return String(name)
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Lightweight in-memory index — load full JSON at runtime via fetch when needed:
 *   const catalog = await fetch('/api/v1/warlords-entity-prefabs.json').then(r => r.json())
 * This module exports types + helpers so client/server stay typed without bundling 100KB+ JSON.
 */
export interface WarlordsEntityCatalog {
  version: string;
  updatedAt: string;
  description: string;
  era: 'warlords';
  cdnBase: string;
  iconCdnPath: string;
  count: number;
  countsByKind: Record<string, number>;
  countsByCategory: Record<string, number>;
  prefabs: WarlordsEntityPrefab[];
}

export function indexEntityPrefabs(catalog: WarlordsEntityCatalog): {
  byId: Map<string, WarlordsEntityPrefab>;
  byPrefabId: Map<string, WarlordsEntityPrefab>;
  byKind: Map<string, WarlordsEntityPrefab[]>;
  byCategory: Map<string, WarlordsEntityPrefab[]>;
} {
  const byId = new Map<string, WarlordsEntityPrefab>();
  const byPrefabId = new Map<string, WarlordsEntityPrefab>();
  const byKind = new Map<string, WarlordsEntityPrefab[]>();
  const byCategory = new Map<string, WarlordsEntityPrefab[]>();
  for (const p of catalog.prefabs || []) {
    byId.set(p.id, p);
    byPrefabId.set(p.prefabId, p);
    if (!byKind.has(p.kind)) byKind.set(p.kind, []);
    byKind.get(p.kind)!.push(p);
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category)!.push(p);
  }
  return { byId, byPrefabId, byKind, byCategory };
}

/** ObjectStore / info fetch paths */
export const WARLORDS_ENTITY_CATALOG_URLS = [
  'https://info.grudge-studio.com/api/v1/warlords-entity-prefabs.json',
  'https://objectstore.grudge-studio.com/api/v1/warlords-entity-prefabs.json',
  '/api/v1/warlords-entity-prefabs.json',
] as const;

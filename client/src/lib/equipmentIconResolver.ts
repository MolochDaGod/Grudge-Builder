/**
 * Equipment icon resolver — icon must represent the **actual** selected mesh.
 *
 * HARD RULE (user-confirmed):
 *   Cool / fancy weapon assets are fine. The UI icon MUST be of that weapon
 *   in fact — generate from the GLB/Object3D, do not show a random pack plate.
 *
 * Priority:
 *  1. item.image if set (explicit override)
 *  2. Session-generated mesh render (data URL, from equip or warm)
 *  3. Pre-baked /icons/weapons/generated/{prefabId}.png
 *  4. Prefab catalog iconUrl (curated art that matches that mesh, e.g. shields)
 *  5. Live generate from mesh GLB (async path)
 *  6. Generic pack fallback (last resort only)
 */
import { assetUrl, resolveIconUrl, getPackIconForCategory } from '@/lib/assetConfig';
import {
  getWeaponPrefab,
  getPrefabIconUrl,
  listPrefabsForType,
  type WeaponStyleId,
  type WeaponStyleIndex,
} from '@shared/definitions/weaponPrefabCatalog';
import {
  bakedEquipmentIconPath,
  generateEquipmentIconFromUrl,
  generateEquipmentIconFromObject3D,
  getCachedEquipmentIcon,
  resolveEquipmentIcon,
} from '@/lib/equipmentIconFromMesh';
import {
  getShieldIconPath,
  getGunStyleIconPath,
  getWeaponSpritePath,
  SHIELD_ICON_CATALOG,
} from '@/data/weaponSpriteMap';
import type { Object3D } from 'three';

export interface EquipmentIconItem {
  weaponId?: string;
  weaponType?: string;
  type?: string;
  slot?: string;
  name?: string;
  image?: string;
  prefabId?: string;
  styleId?: string | number;
  meshUrl?: string;
  /** When true, never use generic pack — force mesh-true path */
  preferMeshIcon?: boolean;
}

function isShieldLike(item: EquipmentIconItem, wt: string): boolean {
  return (
    wt === 'SHIELD' ||
    (item.slot || '').toLowerCase().includes('off') ||
    (item.name || '').toLowerCase().includes('shield')
  );
}

/** Sync path for img src — baked / session cache / catalog only (no async generate). */
export function getEquipmentIconSync(item: EquipmentIconItem): string {
  if (item.image && !item.preferMeshIcon) {
    return resolveIconUrl(item.image, {
      weaponType: item.weaponType,
      category: item.weaponType || item.type,
    });
  }

  const wt = (item.weaponType || item.type || '').toUpperCase();
  const style = (item.styleId as WeaponStyleId | WeaponStyleIndex) ?? 1;
  const prefab =
    (item.prefabId ? getWeaponPrefab(wt, style) : null) ||
    getWeaponPrefab(wt, style);
  const prefabId = item.prefabId || prefab?.id;

  // 1) Session mesh-true render (cool weapons after equip generate)
  if (prefabId) {
    const mem = getCachedEquipmentIcon(prefabId);
    if (mem) return mem;
  }

  // 2) Shields: curated art keyed to selected style (matches that mesh family)
  if (isShieldLike(item, wt)) {
    if (prefab?.iconUrl) {
      return prefab.iconUrl.startsWith('http')
        ? prefab.iconUrl
        : assetUrl(prefab.iconUrl);
    }
    return getShieldIconPath(
      item.weaponId || item.prefabId || String(item.styleId || 'copper'),
    );
  }

  // 3) Baked mesh-true PNG (prebake pipeline) — always preferred over pack
  if (prefabId) {
    const baked = assetUrl(bakedEquipmentIconPath(prefabId));
    // 4) Catalog curated icon only if set for THIS prefab (not generic pack)
    if (prefab?.iconUrl) {
      // Prefer baked URL for img src; onError UI can fall back to iconUrl.
      // Return iconUrl when it's an explicit match plate for this style.
      return prefab.iconUrl.startsWith('http')
        ? prefab.iconUrl
        : assetUrl(prefab.iconUrl);
    }
    return baked;
  }

  if (wt === 'GUN' && item.styleId) {
    return getGunStyleIconPath(String(item.styleId));
  }

  if (item.weaponId) {
    return getWeaponSpritePath(item.weaponId, item.weaponType || '');
  }

  return getPackIconForCategory({
    weaponType: item.weaponType,
    category: item.weaponType || item.type,
  });
}

/**
 * Async: ensure icon is truly the weapon mesh (generate if needed).
 * Call when opening inventory / equipping cool unique gear.
 * Cool assets OK — we render that exact GLB.
 */
export async function getEquipmentIconAsync(
  item: EquipmentIconItem,
): Promise<string> {
  const wt = (item.weaponType || item.type || 'SWORD').toUpperCase();
  const style = (item.styleId as WeaponStyleId | WeaponStyleIndex) ?? 1;
  const prefab = getWeaponPrefab(wt, style);
  const prefabId =
    item.prefabId || prefab?.id || `${wt.toLowerCase()}_style_${style}`;
  const meshUrl =
    item.meshUrl || prefab?.localPath || prefab?.cdnUrl || null;

  // Explicit image only when not forcing mesh-true
  if (item.image && !item.preferMeshIcon) {
    return resolveIconUrl(item.image, { weaponType: wt });
  }

  // Always prefer generating from the actual mesh when we have a URL
  return resolveEquipmentIcon({
    prefabId,
    meshUrl,
    catalogIconUrl: prefab?.iconUrl ?? getPrefabIconUrl(wt, style),
    preferGenerate: true,
  });
}

export type EquipmentIconItemEx = EquipmentIconItem & {
  preferMeshIcon?: boolean;
};

/**
 * Generate + cache an icon from a **live equipped mesh** (cool weapon already loaded).
 * Call from equip / applyToWeapon so inventory shows that exact weapon.
 */
export function ensureMeshTrueIconFromObject3D(
  weaponRoot: Object3D,
  prefabId: string,
  opts?: { size?: number; tint?: number },
): string {
  return generateEquipmentIconFromObject3D(weaponRoot, {
    prefabId,
    size: opts?.size,
    tint: opts?.tint,
  });
}

/**
 * Fire-and-forget: on equip, cache mesh-true icon for inventory.
 * Safe to call every equip — uses session cache after first render.
 * Cool weapons OK — icon is a product shot of that exact mesh.
 */
export function cacheIconFromEquippedWeapon(
  weaponRoot: Object3D,
  prefabId: string | null | undefined,
  opts?: { size?: number; tint?: number },
): string | null {
  if (!prefabId) return null;
  try {
    if (getCachedEquipmentIcon(prefabId)) {
      return getCachedEquipmentIcon(prefabId);
    }
    return ensureMeshTrueIconFromObject3D(weaponRoot, prefabId, opts);
  } catch (e) {
    console.warn('[equipmentIcon] equip-time generate failed', prefabId, e);
    return null;
  }
}

/**
 * Warm-generate icons for all ready prefabs of a type (inventory preload).
 * Cool weapons included — each icon is a render of that prefab's mesh.
 */
export async function warmGenerateIconsForType(
  weaponType: string,
  onProgress?: (done: number, total: number, prefabId: string) => void,
): Promise<number> {
  const list = listPrefabsForType(weaponType).filter(
    (p) => p.productionReady && (p.localPath || p.cdnUrl),
  );
  let done = 0;
  for (const p of list) {
    const mesh = p.localPath || p.cdnUrl;
    if (!mesh) continue;
    if (getCachedEquipmentIcon(p.id)) {
      done++;
      onProgress?.(done, list.length, p.id);
      continue;
    }
    try {
      await generateEquipmentIconFromUrl(mesh, { prefabId: p.id });
    } catch {
      /* skip missing CDN / decode errors */
    }
    done++;
    onProgress?.(done, list.length, p.id);
  }
  return done;
}

/** Warm all production-ready types (background inventory boot). */
export async function warmGenerateAllReadyIcons(
  onProgress?: (done: number, total: number, prefabId: string) => void,
): Promise<number> {
  const types = [
    'SWORD',
    'AXE',
    'GUN',
    'SHIELD',
    'SCYTHE',
    'PICKAXE',
    'SHOVEL',
    'GREATSWORD',
    'CHAIN_KNIFE',
  ];
  let totalDone = 0;
  for (const t of types) {
    totalDone += await warmGenerateIconsForType(t, onProgress);
  }
  return totalDone;
}

export { SHIELD_ICON_CATALOG, bakedEquipmentIconPath };

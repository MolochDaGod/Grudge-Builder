/**
 * Equipment icon resolver ΓÇö icon must represent the **actual** selected mesh.
 *
 * Priority:
 *  1. item.image if set (explicit)
 *  2. Pre-baked /icons/weapons/generated/{prefabId}.png
 *  3. Prefab catalog iconUrl (craftpix / curated ΓÇö shields etc.)
 *  4. Live generate from mesh GLB (data URL, cached)
 *  5. Generic pack fallback
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
  getCachedEquipmentIcon,
  resolveEquipmentIcon,
} from '@/lib/equipmentIconFromMesh';
import {
  getShieldIconPath,
  getGunStyleIconPath,
  getWeaponSpritePath,
  SHIELD_ICON_CATALOG,
} from '@/data/weaponSpriteMap';

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
}

/** Sync path for img src ΓÇö uses baked/catalog only (no async generate). */
export function getEquipmentIconSync(item: EquipmentIconItem): string {
  if (item.image) {
    return resolveIconUrl(item.image, {
      weaponType: item.weaponType,
      category: item.weaponType || item.type,
    });
  }

  const wt = (item.weaponType || item.type || '').toUpperCase();
  const style = (item.styleId as WeaponStyleId | WeaponStyleIndex) ?? 1;
  const prefab =
    (item.prefabId && getWeaponPrefab(wt, style)) ||
    getWeaponPrefab(wt, style);

  // Shields always use selected shield art
  if (
    wt === 'SHIELD' ||
    (item.slot || '').toLowerCase().includes('off') ||
    (item.name || '').toLowerCase().includes('shield')
  ) {
    return getShieldIconPath(
      item.weaponId || item.prefabId || String(item.styleId || 'copper'),
    );
  }

  if (prefab?.id) {
    // Prefer baked mesh-true icon if we know it was generated
    const baked = bakedEquipmentIconPath(prefab.id);
    // Catalog curated icon (still better than wrong pack)
    if (prefab.iconUrl) {
      return prefab.iconUrl.startsWith('http')
        ? prefab.iconUrl
        : assetUrl(prefab.iconUrl);
    }
    // Session-generated
    const mem = getCachedEquipmentIcon(prefab.id);
    if (mem) return mem;
    // Point to baked path (UI can onError ΓåÆ pack)
    return assetUrl(baked);
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

  if (item.image && !item.preferMeshIcon) {
    return resolveIconUrl(item.image, { weaponType: wt });
  }

  return resolveEquipmentIcon({
    prefabId,
    meshUrl,
    catalogIconUrl: prefab?.iconUrl ?? getPrefabIconUrl(wt, style),
    preferGenerate: true,
  });
}

// Augment type for optional flag
declare module '@/lib/equipmentIconResolver' {
  // no-op ΓÇö preferMeshIcon on item via cast
}
export type EquipmentIconItemEx = EquipmentIconItem & {
  preferMeshIcon?: boolean;
};

/**
 * Warm-generate icons for all ready prefabs of a type (inventory preload).
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
      /* skip */
    }
    done++;
    onProgress?.(done, list.length, p.id);
  }
  return done;
}

export { SHIELD_ICON_CATALOG, bakedEquipmentIconPath };

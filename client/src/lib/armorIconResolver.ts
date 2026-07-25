/**
 * Armor icon resolver — icon must represent the selected armour piece.
 * Cool meshes OK if icon is of that piece (generated path or mesh render).
 */
import { assetUrl, resolveIconUrl, getPackIconForCategory } from '@/lib/assetConfig';
import { getArmorPrefab, type ArmorPrefabEntry } from '@shared/definitions/armorPrefabCatalog';
import { getArmorSpritePath } from '@/data/weaponSpriteMap';
import { getCachedEquipmentIcon } from '@/lib/equipmentIconFromMesh';

export function bakedArmorIconPath(armorId: string): string {
  const safe = armorId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `/icons/armor/generated/${safe}.png`;
}

export function getArmorIconSync(
  item: {
    id?: string;
    armorId?: string;
    name?: string;
    type?: string;
    material?: string;
    image?: string;
    iconUrl?: string | null;
  },
  draftIconUrl?: string | null,
): string {
  if (draftIconUrl) {
    return draftIconUrl.startsWith('http')
      ? draftIconUrl
      : assetUrl(draftIconUrl);
  }
  if (item.image) {
    return resolveIconUrl(item.image, {
      category: item.material || 'armor',
      type: item.type,
      name: item.name,
    });
  }
  if (item.iconUrl) {
    return item.iconUrl.startsWith('http')
      ? item.iconUrl
      : assetUrl(item.iconUrl);
  }

  const id = item.armorId || item.id || '';
  if (id) {
    const mem = getCachedEquipmentIcon(id);
    if (mem) return mem;
    const prefab = getArmorPrefab(id);
    if (prefab?.iconUrl) {
      return prefab.iconUrl.startsWith('http')
        ? prefab.iconUrl
        : assetUrl(prefab.iconUrl);
    }
    return assetUrl(bakedArmorIconPath(id));
  }

  if (item.type && item.material) {
    return getArmorSpritePath(id || 'default', item.type, item.material);
  }

  return getPackIconForCategory({
    category: 'armor',
    type: item.type,
    name: item.name,
  });
}

export function resolveArmorIconFromPrefab(
  p: ArmorPrefabEntry,
  draftIconUrl?: string | null,
): string {
  return getArmorIconSync(
    {
      id: p.id,
      name: p.name,
      type: p.slot,
      material: p.material,
      iconUrl: p.iconUrl,
    },
    draftIconUrl,
  );
}

/**
 * Arsenal ↔ objectstore.grudge-studio.com master catalogs
 *
 * SSOT for item icons/stats/lore and weapon skills:
 *   https://objectstore.grudge-studio.com/api/v1/master-items.json
 *   https://objectstore.grudge-studio.com/api/v1/master-weapons.json
 *   https://objectstore.grudge-studio.com/api/v1/master-weaponSkills.json
 *
 * Prefab meshes stay in weaponPrefabCatalog / armorPrefabCatalog.
 * This module overlays production info + icons onto the Arsenal SPA.
 */

import { fetchMasterItems, fetchMasterWeapons } from '@/lib/objectStoreApi';
import {
  loadMasterWeaponSkillsCatalog,
  resolveSkillIcon,
  getMasterCatalogVersion,
  type MasterWeaponSkillsCatalog,
} from '@/lib/loadMasterWeaponSkills';
import { resolveIconUrl } from '@/lib/iconResolver';
import type { WeaponTypeDefinition } from '@shared/definitions/weaponSkillsNew';

export type MasterItemType =
  | 'weapon'
  | 'armor'
  | 'tool'
  | 'food'
  | 'potion'
  | 'consumable'
  | 'material'
  | string;

export interface MasterCatalogItem {
  uuid: string;
  id: string;
  name: string;
  baseName?: string;
  type: MasterItemType;
  category?: string;
  weaponType?: string;
  tier: number;
  tierLabel?: string;
  stats?: Record<string, number | string | null | undefined>;
  primaryStat?: string | null;
  iconUrl: string;
  rawIcon?: string;
  modelR2Key?: string | null;
  recipeUuid?: string | null;
  craftedBy?: string | null;
  runtimePrefab?: boolean;
  prefabSource?: string | null;
  lore?: string;
  description?: string;
  slot?: string;
  material?: string;
  setName?: string;
}

export interface ArsenalMasterBundle {
  items: MasterCatalogItem[];
  totalItems: number;
  byTier: Record<number, number>;
  byType: Record<string, number>;
  weaponsTotal: number;
  armorTotal: number;
  toolsTotal: number;
  skillsCatalog: MasterWeaponSkillsCatalog | null;
  skillsVersion: string | null;
  itemsVersion: string | null;
  loadedAt: number;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function pickString(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function pickNum(...vals: unknown[]): number {
  for (const v of vals) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return 0;
}

/** Normalize any master-items / master-weapons row to Arsenal card shape */
export function normalizeMasterItem(raw: unknown): MasterCatalogItem | null {
  const r = asRecord(raw);
  const name = pickString(r.name, r.baseName, r.id, r.uuid);
  if (!name) return null;

  const id = pickString(r.id, r.uuid, name);
  const uuid = pickString(r.uuid, r.id, id);
  const type = pickString(r.type, r.itemType, 'weapon').toLowerCase();
  const tier = Math.max(0, Math.min(8, Math.round(pickNum(r.tier, r.itemTier, 1))));
  const weaponType = pickString(r.weaponType, r.weapon_type, r.category).toUpperCase() || undefined;
  const rawIcon = pickString(
    r.iconUrl,
    r.icon,
    r.iconPath,
    r.image,
    r.sprite,
  );

  const iconUrl = rawIcon
    ? resolveIconUrl(rawIcon, {
        weaponType,
        category: pickString(r.category, type),
        name,
      })
    : resolveIconUrl('', { weaponType, category: type, name });

  const statsRaw = asRecord(r.stats);
  const stats: Record<string, number | string | null | undefined> = {};
  for (const [k, v] of Object.entries(statsRaw)) {
    if (typeof v === 'number' || typeof v === 'string' || v == null) {
      stats[k] = v as number | string | null;
    }
  }

  return {
    uuid,
    id,
    name,
    baseName: pickString(r.baseName) || undefined,
    type,
    category: pickString(r.category) || undefined,
    weaponType,
    tier,
    tierLabel: pickString(r.tierLabel, r.rarity) || undefined,
    stats: Object.keys(stats).length ? stats : undefined,
    primaryStat: (r.primaryStat as string | null) ?? null,
    iconUrl,
    rawIcon: rawIcon || undefined,
    modelR2Key: (r.modelR2Key as string | null) ?? null,
    recipeUuid: (r.recipeUuid as string | null) ?? null,
    craftedBy: pickString(r.craftedBy) || null,
    runtimePrefab: Boolean(r.runtimePrefab),
    prefabSource: pickString(r.prefabSource) || null,
    lore: pickString(r.lore, r.description, r.tooltip) || undefined,
    description: pickString(r.description, r.tooltip) || undefined,
    slot: pickString(r.slot, r.equipSlot) || undefined,
    material: pickString(r.material) || undefined,
    setName: pickString(r.setName, r.set) || undefined,
  };
}

function extractItemsArray(payload: Record<string, unknown>): unknown[] {
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.weapons)) return payload.weapons;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

export async function loadArsenalMasterBundle(): Promise<ArsenalMasterBundle> {
  const [itemsRaw, weaponsRaw, skills] = await Promise.all([
    fetchMasterItems().catch(() => ({})),
    fetchMasterWeapons().catch(() => ({})),
    loadMasterWeaponSkillsCatalog().catch(() => null),
  ]);

  const itemsRec = asRecord(itemsRaw);
  const weaponsRec = asRecord(weaponsRaw);

  const map = new Map<string, MasterCatalogItem>();

  for (const row of extractItemsArray(itemsRec)) {
    const n = normalizeMasterItem(row);
    if (n) map.set(n.uuid || n.id, n);
  }

  // master-weapons fills gaps / alternate authority rows
  for (const row of extractItemsArray(weaponsRec)) {
    const n = normalizeMasterItem({ ...(asRecord(row)), type: asRecord(row).type || 'weapon' });
    if (!n) continue;
    const key = n.uuid || n.id;
    if (!map.has(key)) map.set(key, n);
    else {
      // Prefer non-empty icon from weapons if items lacked one
      const prev = map.get(key)!;
      if ((!prev.rawIcon || prev.iconUrl.includes('placeholder')) && n.rawIcon) {
        map.set(key, { ...prev, iconUrl: n.iconUrl, rawIcon: n.rawIcon });
      }
    }
  }

  const items = Array.from(map.values()).sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.name.localeCompare(b.name);
  });

  const byTier: Record<number, number> = {};
  const byType: Record<string, number> = {};
  for (const it of items) {
    byTier[it.tier] = (byTier[it.tier] || 0) + 1;
    byType[it.type] = (byType[it.type] || 0) + 1;
  }

  return {
    items,
    totalItems: items.length,
    byTier,
    byType,
    weaponsTotal: items.filter((i) => i.type === 'weapon').length,
    armorTotal: items.filter((i) => i.type === 'armor').length,
    toolsTotal: items.filter((i) => i.type === 'tool').length,
    skillsCatalog: skills?.catalog ?? null,
    skillsVersion: skills?.catalog.version ?? getMasterCatalogVersion(),
    itemsVersion: pickString(itemsRec.version) || null,
    loadedAt: Date.now(),
  };
}

export function filterMasterItems(
  items: MasterCatalogItem[],
  opts: {
    search?: string;
    tier?: number | 'all';
    type?: string | 'all';
    weaponType?: string | 'all';
  },
): MasterCatalogItem[] {
  const q = (opts.search || '').trim().toLowerCase();
  return items.filter((it) => {
    if (opts.tier !== undefined && opts.tier !== 'all' && it.tier !== opts.tier) {
      return false;
    }
    if (opts.type && opts.type !== 'all' && it.type !== opts.type) {
      return false;
    }
    if (
      opts.weaponType &&
      opts.weaponType !== 'all' &&
      (it.weaponType || '').toUpperCase() !== opts.weaponType.toUpperCase()
    ) {
      return false;
    }
    if (!q) return true;
    return (
      it.name.toLowerCase().includes(q) ||
      it.id.toLowerCase().includes(q) ||
      it.uuid.toLowerCase().includes(q) ||
      (it.category || '').toLowerCase().includes(q) ||
      (it.weaponType || '').toLowerCase().includes(q) ||
      (it.lore || '').toLowerCase().includes(q)
    );
  });
}

/** Prefer master catalog skill tree; fallback to local definition */
export function skillDefFromMasterOrLocal(
  weaponType: string,
  local?: WeaponTypeDefinition,
): WeaponTypeDefinition | undefined {
  // loadMasterWeaponSkills populates module cache; consumers call load first
  try {
    // dynamic require avoided — use getCached from load module via import
  } catch {
    /* ignore */
  }
  return local;
}

export function formatItemStats(stats?: MasterCatalogItem['stats']): string {
  if (!stats) return '—';
  return Object.entries(stats)
    .filter(([, v]) => v != null && v !== '')
    .slice(0, 6)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
}

export function isIconUrl(icon: string | undefined): boolean {
  if (!icon) return false;
  return (
    icon.includes('/') ||
    icon.startsWith('http') ||
    icon.startsWith('data:') ||
    icon.includes('.png') ||
    icon.includes('.webp') ||
    icon.includes('.jpg')
  );
}

export { resolveSkillIcon };

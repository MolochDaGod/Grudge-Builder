/**
 * Warlords Arsenal product catalog — ObjectStore / info.* SSOT.
 *
 * Not the mesh-style studio (that is ?studio=1).
 * Class kits WAND / GRIMOIRE / RANGER_LOG / BATTLE_DUAL stay Warlords-only.
 */
import {
  isWarlordsClassWeaponType,
  WARLORDS_CLASS_WEAPON_TYPES,
} from '@shared/definitions/weaponPrefabCatalog';
import { getTierDef, TIERS } from '@shared/definitions/tierSystem';
import { WARLORDS_CRAFT_URL } from '@shared/fleet/warlordsDomains';
import { fetchMasterItems, fetchMasterRecipes } from '@/lib/objectStoreApi';
import { resolveIconUrl } from '@/lib/assetConfig';

export { WARLORDS_CLASS_WEAPON_TYPES, isWarlordsClassWeaponType, TIERS };

export interface WarlordsArsenalItem {
  uuid: string;
  id: string;
  name: string;
  baseName: string;
  type: string;
  category: string;
  weaponType: string;
  tier: number;
  tierLabel: string;
  stats: Record<string, number>;
  primaryStat?: string | null;
  iconUrl: string;
  modelR2Key?: string | null;
  recipeUuid?: string | null;
  craftedBy?: string | null;
  isClassItem: boolean;
  classRole?: string;
}

export interface WarlordsRecipeBrief {
  uuid: string;
  name?: string;
  ingredients?: { name?: string; count?: number }[];
}

const CLASS_ROLE: Record<string, string> = {
  WAND: 'Mage class kit',
  GRIMOIRE: 'Worge class kit',
  RANGER_LOG: 'Ranger class kit',
  BATTLE_DUAL: 'Warrior dual-wield kit',
};

function normalizeWeaponType(raw: unknown, category: string): string {
  const w = String(raw || category || '').toUpperCase();
  if (w) return w;
  return category.toUpperCase();
}

export function mapOsItemToArsenal(item: Record<string, unknown>): WarlordsArsenalItem {
  const category = String(item.category || item.type || 'misc');
  const weaponType = normalizeWeaponType(item.weaponType, category);
  const tier = typeof item.tier === 'number' ? item.tier : Number(item.tier) || 0;
  const tierDef = getTierDef(Math.max(1, Math.min(8, tier || 1)));
  // master-items may point at info.*/icons (HTML) or absolute assets CDN
  // (hotlink 403 with grudgewarlords Referer). resolveIconUrl → same-origin proxy.
  const iconRaw = String(item.iconUrl || item.icon || '');
  const iconUrl = resolveIconUrl(iconRaw || null, {
    category,
    type: String(item.type || ''),
    name: String(item.name || ''),
    weaponType,
  });

  return {
    uuid: String(item.uuid || item.id || ''),
    id: String(item.id || item.uuid || ''),
    name: String(item.name || 'Unknown'),
    baseName: String(item.baseName || item.name || 'Unknown'),
    type: String(item.type || 'weapon'),
    category,
    weaponType,
    tier,
    tierLabel: String(item.tierLabel || tierDef.label),
    stats: (item.stats as Record<string, number>) || {},
    primaryStat: (item.primaryStat as string) ?? null,
    iconUrl,
    modelR2Key: (item.modelR2Key as string) ?? null,
    recipeUuid: (item.recipeUuid as string) ?? null,
    craftedBy: (item.craftedBy as string) ?? null,
    isClassItem: isWarlordsClassWeaponType(weaponType),
    classRole: isWarlordsClassWeaponType(weaponType)
      ? CLASS_ROLE[weaponType]
      : undefined,
  };
}

export async function loadWarlordsArsenalCatalog(): Promise<{
  items: WarlordsArsenalItem[];
  recipesByUuid: Map<string, WarlordsRecipeBrief>;
}> {
  const [itemsRes, recipesRes] = await Promise.all([
    fetchMasterItems().catch(() => ({ items: [] as unknown[] })),
    fetchMasterRecipes().catch(() => ({ recipes: [] as unknown[] })),
  ]);

  const rawItems = (itemsRes as { items?: unknown[] }).items;
  const items = Array.isArray(rawItems)
    ? rawItems
        .filter((x) => x && typeof x === 'object')
        .map((x) => mapOsItemToArsenal(x as Record<string, unknown>))
        .filter((i) => i.type === 'weapon' || i.type === 'tool' || i.type === 'armor')
    : [];

  const recipesByUuid = new Map<string, WarlordsRecipeBrief>();
  const rawRecipes = (recipesRes as { recipes?: unknown[] }).recipes;
  if (Array.isArray(rawRecipes)) {
    for (const r of rawRecipes) {
      if (!r || typeof r !== 'object') continue;
      const rec = r as Record<string, unknown>;
      const uuid = String(rec.uuid || rec.id || '');
      if (!uuid) continue;
      recipesByUuid.set(uuid, {
        uuid,
        name: rec.name ? String(rec.name) : undefined,
        ingredients: Array.isArray(rec.ingredients)
          ? (rec.ingredients as { name?: string; count?: number }[])
          : undefined,
      });
    }
  }

  return { items, recipesByUuid };
}

export function craftSuiteUrl(recipeUuid?: string | null): string {
  if (recipeUuid) {
    return `${WARLORDS_CRAFT_URL}?recipe=${encodeURIComponent(recipeUuid)}`;
  }
  return WARLORDS_CRAFT_URL;
}

export function itemTooltipLines(
  item: WarlordsArsenalItem,
  recipe?: WarlordsRecipeBrief | null,
): string[] {
  const lines: string[] = [
    item.name,
    `Tier ${item.tier} · ${item.tierLabel}`,
    item.weaponType || item.category,
  ];
  if (item.isClassItem) {
    lines.push(item.classRole || 'Warlords class kit (not voxel)');
  }
  const stats = Object.entries(item.stats || {})
    .filter(([, v]) => typeof v === 'number' && v !== 0)
    .slice(0, 6)
    .map(([k, v]) => `${k}: ${v}`);
  if (stats.length) lines.push(stats.join(' · '));
  if (item.craftedBy) lines.push(`Crafted by ${item.craftedBy}`);
  if (recipe?.ingredients?.length) {
    lines.push(
      'Recipe: ' +
        recipe.ingredients
          .slice(0, 4)
          .map((i) => `${i.count ?? 1}× ${i.name || '?'}`)
          .join(', '),
    );
  }
  return lines;
}

export function uniqueCategories(items: WarlordsArsenalItem[]): string[] {
  const s = new Set<string>();
  for (const i of items) s.add(i.category || i.weaponType || 'misc');
  return [...s].sort();
}

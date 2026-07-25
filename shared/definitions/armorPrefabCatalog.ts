/**
 * Production armor / equipment catalog — SSOT for arsenal + codex.
 *
 * Mirrors weaponPrefabCatalog discipline for armour:
 *   · Icon must represent the selected piece (sprite / generated / mesh-true)
 *   · Cool assets OK if icon is of that piece
 *   · Production status + R2/CDN paths for deploy
 *   · Editable via Production Arsenal drafts → export merge
 *
 * Base stats/lore: equipmentData.ts
 * Sprite map: client weaponSpriteMap ARMOR_SPRITE_MAP
 */

import {
  ALL_EQUIPMENT,
  EQUIPMENT_SETS,
  EQUIPMENT_SLOTS,
  ARMOR_MATERIALS,
  type EquipmentItem,
  type EquipmentStats,
  calculateStatsAtTier,
} from './equipmentData';

export type ArmorPrefabStatus = 'ready' | 'fallback' | 'missing';

export interface ArmorPrefabEntry {
  /** Same as EquipmentItem.id — cloth-bloodfeud-helm */
  id: string;
  name: string;
  slot: EquipmentItem['type'];
  material: EquipmentItem['material'];
  /** Set family: Bloodfeud, Wraithfang, … */
  setName: string;
  lore: string;
  stats: EquipmentStats;
  passive: string;
  attribute: string;
  effect: string;
  proc: string;
  setBonus: string;
  /** Production / codex */
  status: ArmorPrefabStatus;
  productionReady: boolean;
  /** Curated or generated icon (preferred for UI) */
  iconUrl: string | null;
  /** R2 key under grudge-assets when mesh exists */
  r2Key: string | null;
  cdnUrl: string | null;
  localPath: string | null;
  /** Mesh-true generate path after prebake */
  generatedIconPath: string;
  /** Codex share slug */
  codexSlug: string;
  notes?: string;
}

const CDN = 'https://assets.grudge-studio.com';

function setFromId(id: string, name: string): string {
  const known = EQUIPMENT_SETS.find((s) =>
    id.toLowerCase().includes(s.toLowerCase()) ||
    name.toLowerCase().includes(s.toLowerCase()),
  );
  if (known) return known;
  const parts = id.split('-');
  // cloth-bloodfeud-helm → bloodfeud
  if (parts.length >= 2) {
    const mid = parts[1]!;
    return mid.charAt(0).toUpperCase() + mid.slice(1);
  }
  return 'Unknown';
}

/** Convention paths for armor icons (sprite pack + generated). */
export function armorSpriteIconPath(
  item: Pick<EquipmentItem, 'id' | 'type' | 'material'>,
): string {
  const slot = item.type.toLowerCase();
  const mat = item.material.toLowerCase();
  // Named sprite convention from ARMOR_SPRITE_MAP pattern
  const setPart = item.id.replace(/^(cloth|leather|metal|gem)-/, '').replace(/-/g, '_');
  return `/icons/armor/${slot}/${setPart}.png`;
}

export function armorGeneratedIconPath(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `/icons/armor/generated/${safe}.png`;
}

export function armorMeshPaths(
  item: Pick<EquipmentItem, 'id' | 'type' | 'material'>,
): { r2Key: string; cdnUrl: string; localPath: string } {
  const slot = item.type.toLowerCase();
  const mat = item.material.toLowerCase();
  const r2Key = `models/codex/armor/${mat}/${slot}/${item.id}.glb`;
  return {
    r2Key,
    cdnUrl: `${CDN}/${r2Key}`,
    localPath: `/models/codex/armor/${mat}/${slot}/${item.id}.glb`,
  };
}

function toPrefab(item: EquipmentItem): ArmorPrefabEntry {
  const setName = setFromId(item.id, item.name);
  const mesh = armorMeshPaths(item);
  const iconPath = armorSpriteIconPath(item);
  // Until meshes land on CDN, mark as fallback (stats ready, art pending)
  // Gems/accessories often icon-only → ready with sprite convention
  const isAccessory = ['Ring', 'Necklace', 'Relic', 'Offhand'].includes(item.type);
  const status: ArmorPrefabStatus = isAccessory ? 'ready' : 'fallback';

  return {
    id: item.id,
    name: item.name,
    slot: item.type,
    material: item.material,
    setName,
    lore: item.lore,
    stats: item.stats,
    passive: item.passive,
    attribute: item.attribute,
    effect: item.effect,
    proc: item.proc,
    setBonus: item.setBonus,
    status,
    productionReady: status !== 'missing',
    iconUrl: iconPath,
    r2Key: isAccessory ? null : mesh.r2Key,
    cdnUrl: isAccessory ? null : mesh.cdnUrl,
    localPath: isAccessory ? null : mesh.localPath,
    generatedIconPath: armorGeneratedIconPath(item.id),
    codexSlug: item.id,
    notes: isAccessory
      ? 'Accessory — icon plate primary'
      : 'Mesh path reserved on codex armor tree; use sprite/generated icon until GLB ready',
  };
}

/** Full production matrix — every equipment row as armor prefab. */
export const ARMOR_PREFAB_MATRIX: ArmorPrefabEntry[] = ALL_EQUIPMENT.map(toPrefab);

const byId = new Map(ARMOR_PREFAB_MATRIX.map((p) => [p.id, p]));

export function getArmorPrefab(id: string): ArmorPrefabEntry | null {
  return byId.get(id) ?? null;
}

export function listArmorPrefabs(filters?: {
  material?: string;
  slot?: string;
  setName?: string;
  status?: ArmorPrefabStatus;
}): ArmorPrefabEntry[] {
  let list = ARMOR_PREFAB_MATRIX;
  if (!filters) return list;
  if (filters.material && filters.material !== 'all') {
    list = list.filter((p) => p.material === filters.material);
  }
  if (filters.slot && filters.slot !== 'all') {
    list = list.filter((p) => p.slot === filters.slot);
  }
  if (filters.setName && filters.setName !== 'all') {
    list = list.filter(
      (p) => p.setName.toLowerCase() === filters.setName!.toLowerCase(),
    );
  }
  if (filters.status) {
    list = list.filter((p) => p.status === filters.status);
  }
  return list;
}

export interface ArmorCoverageReport {
  generatedAt: string;
  total: number;
  ready: number;
  fallback: number;
  missing: number;
  byMaterial: Record<string, number>;
  bySlot: Record<string, number>;
  bySet: Record<string, number>;
  productionReadyCount: number;
}

export function buildArmorPrefabCoverage(): ArmorCoverageReport {
  let ready = 0;
  let fallback = 0;
  let missing = 0;
  const byMaterial: Record<string, number> = {};
  const bySlot: Record<string, number> = {};
  const bySet: Record<string, number> = {};
  let productionReadyCount = 0;

  for (const p of ARMOR_PREFAB_MATRIX) {
    if (p.status === 'ready') ready++;
    else if (p.status === 'fallback') fallback++;
    else missing++;
    byMaterial[p.material] = (byMaterial[p.material] ?? 0) + 1;
    bySlot[p.slot] = (bySlot[p.slot] ?? 0) + 1;
    bySet[p.setName] = (bySet[p.setName] ?? 0) + 1;
    if (p.productionReady) productionReadyCount++;
  }

  return {
    generatedAt: new Date().toISOString(),
    total: ARMOR_PREFAB_MATRIX.length,
    ready,
    fallback,
    missing,
    byMaterial,
    bySlot,
    bySet,
    productionReadyCount,
  };
}

/** Codex-facing production row (weapons + armor share this shape loosely). */
export interface CodexEquipmentRow {
  kind: 'armor' | 'weapon';
  id: string;
  name: string;
  category: string;
  subcategory: string;
  tierRange: [number, number];
  iconUrl: string | null;
  meshUrl: string | null;
  r2Key: string | null;
  status: string;
  productionReady: boolean;
  statsAtT1: Record<string, number>;
  statsAtT8: Record<string, number>;
  passive?: string;
  effect?: string;
  proc?: string;
  setBonus?: string;
  lore?: string;
  codexSlug: string;
  notes?: string;
}

export function armorToCodexRow(
  p: ArmorPrefabEntry,
  overrides?: Partial<ArmorPrefabEntry>,
): CodexEquipmentRow {
  const e = { ...p, ...overrides };
  const t1 = calculateStatsAtTier(
    {
      id: e.id,
      name: e.name,
      type: e.slot,
      material: e.material,
      lore: e.lore,
      stats: e.stats,
      passive: e.passive,
      attribute: e.attribute,
      effect: e.effect,
      proc: e.proc,
      setBonus: e.setBonus,
    },
    1,
  );
  const t8 = calculateStatsAtTier(
    {
      id: e.id,
      name: e.name,
      type: e.slot,
      material: e.material,
      lore: e.lore,
      stats: e.stats,
      passive: e.passive,
      attribute: e.attribute,
      effect: e.effect,
      proc: e.proc,
      setBonus: e.setBonus,
    },
    8,
  );
  return {
    kind: 'armor',
    id: e.id,
    name: e.name,
    category: e.material,
    subcategory: e.slot,
    tierRange: [1, 8],
    iconUrl: e.iconUrl,
    meshUrl: e.cdnUrl ?? e.localPath,
    r2Key: e.r2Key,
    status: e.status,
    productionReady: e.productionReady,
    statsAtT1: t1,
    statsAtT8: t8,
    passive: e.passive,
    effect: e.effect,
    proc: e.proc,
    setBonus: e.setBonus,
    lore: e.lore,
    codexSlug: e.codexSlug,
    notes: e.notes,
  };
}

export function listArmorCodexRows(): CodexEquipmentRow[] {
  return ARMOR_PREFAB_MATRIX.map((p) => armorToCodexRow(p));
}

export {
  EQUIPMENT_SETS,
  EQUIPMENT_SLOTS,
  ARMOR_MATERIALS,
  calculateStatsAtTier,
};

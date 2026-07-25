/**
 * Production Arsenal draft store — edit weapons, armour, skills, stats in SPA.
 * Persist locally; export JSON / codex package for merge + deploy.
 *
 * SSOT remains TypeScript catalogs. Drafts never auto-write the repo.
 */

import type { WeaponSkillOption } from '@shared/definitions/weaponSkillsNew';
import type { EquipmentStats } from '@shared/definitions/equipmentData';

export const ARSENAL_DRAFT_KEY = 'grudge_arsenal_drafts_v2';
/** Migrate from v1 if present */
const ARSENAL_DRAFT_KEY_V1 = 'grudge_arsenal_drafts_v1';

export interface SkillDraftPatch {
  name?: string;
  description?: string;
  damage?: number;
  cooldown?: number;
  tier?: number;
  effects?: string[];
}

export interface PrefabDraftPatch {
  notes?: string;
  iconUrl?: string | null;
  label?: string;
}

export interface ArmorDraftPatch {
  name?: string;
  lore?: string;
  passive?: string;
  attribute?: string;
  effect?: string;
  proc?: string;
  setBonus?: string;
  notes?: string;
  iconUrl?: string | null;
  status?: 'ready' | 'fallback' | 'missing';
  productionReady?: boolean;
  /** Partial stat base overrides (not per-tier) */
  stats?: Partial<EquipmentStats>;
}

export interface ArsenalDrafts {
  version: 2;
  updatedAt: string;
  skills: Record<string, Record<string, SkillDraftPatch>>;
  prefabs: Record<string, PrefabDraftPatch>;
  /** armor piece id → patch */
  armor: Record<string, ArmorDraftPatch>;
  systemNotes: string;
}

function emptyDrafts(): ArsenalDrafts {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    skills: {},
    prefabs: {},
    armor: {},
    systemNotes: '',
  };
}

export function loadArsenalDrafts(): ArsenalDrafts {
  try {
    if (typeof localStorage === 'undefined') return emptyDrafts();
    let raw = localStorage.getItem(ARSENAL_DRAFT_KEY);
    if (!raw) {
      raw = localStorage.getItem(ARSENAL_DRAFT_KEY_V1);
    }
    if (!raw) return emptyDrafts();
    const parsed = JSON.parse(raw) as Partial<ArsenalDrafts> & { version?: number };
    return {
      ...emptyDrafts(),
      ...parsed,
      version: 2,
      skills: parsed.skills ?? {},
      prefabs: parsed.prefabs ?? {},
      armor: (parsed as ArsenalDrafts).armor ?? {},
      systemNotes: parsed.systemNotes ?? '',
    };
  } catch {
    return emptyDrafts();
  }
}

export function saveArsenalDrafts(drafts: ArsenalDrafts): void {
  const next = { ...drafts, version: 2 as const, updatedAt: new Date().toISOString() };
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(ARSENAL_DRAFT_KEY, JSON.stringify(next));
  } catch {
    /* quota / private */
  }
}

export function patchSkillDraft(
  drafts: ArsenalDrafts,
  weaponType: string,
  skillId: string,
  patch: SkillDraftPatch,
): ArsenalDrafts {
  const wt = weaponType.toUpperCase();
  const byType = { ...(drafts.skills[wt] ?? {}) };
  byType[skillId] = { ...byType[skillId], ...patch };
  return {
    ...drafts,
    skills: { ...drafts.skills, [wt]: byType },
    updatedAt: new Date().toISOString(),
  };
}

export function patchPrefabDraft(
  drafts: ArsenalDrafts,
  prefabId: string,
  patch: PrefabDraftPatch,
): ArsenalDrafts {
  return {
    ...drafts,
    prefabs: {
      ...drafts.prefabs,
      [prefabId]: { ...drafts.prefabs[prefabId], ...patch },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function patchArmorDraft(
  drafts: ArsenalDrafts,
  armorId: string,
  patch: ArmorDraftPatch,
): ArsenalDrafts {
  const prev = drafts.armor[armorId] ?? {};
  const stats =
    patch.stats != null
      ? { ...(prev.stats ?? {}), ...patch.stats }
      : prev.stats;
  return {
    ...drafts,
    armor: {
      ...drafts.armor,
      [armorId]: { ...prev, ...patch, stats },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function applySkillDraft(
  skill: WeaponSkillOption,
  weaponType: string,
  drafts: ArsenalDrafts,
): WeaponSkillOption {
  const p = drafts.skills[weaponType.toUpperCase()]?.[skill.id];
  if (!p) return skill;
  return {
    ...skill,
    name: p.name ?? skill.name,
    description: p.description ?? skill.description,
    damage: p.damage ?? skill.damage,
    cooldown: p.cooldown ?? skill.cooldown,
    tier: p.tier ?? skill.tier,
    effects: p.effects ?? skill.effects,
  };
}

export function clearArsenalDrafts(): ArsenalDrafts {
  const empty = emptyDrafts();
  try {
    localStorage.removeItem(ARSENAL_DRAFT_KEY);
    localStorage.removeItem(ARSENAL_DRAFT_KEY_V1);
  } catch {
    /* private mode */
  }
  return empty;
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadArsenalDrafts(drafts: ArsenalDrafts, filename?: string): void {
  downloadJson(
    drafts,
    filename ?? `arsenal-drafts-${new Date().toISOString().slice(0, 10)}.json`,
  );
}

export function countDraftPatches(drafts: ArsenalDrafts): {
  skills: number;
  prefabs: number;
  armor: number;
} {
  let skills = 0;
  for (const m of Object.values(drafts.skills)) {
    skills += Object.keys(m).length;
  }
  return {
    skills,
    prefabs: Object.keys(drafts.prefabs).length,
    armor: Object.keys(drafts.armor).length,
  };
}

/**
 * Production Arsenal draft store — edit weapons/skills/stats in the SPA,
 * persist locally, export JSON for merge into shared/definitions SSOT.
 *
 * Source of truth remains TypeScript catalogs (weaponPrefabCatalog,
 * weaponSkillsNew, weaponTierVisuals). Drafts never auto-write the repo;
 * they are a content-authoring layer for production improvement.
 */

import type { WeaponSkillOption } from '@shared/definitions/weaponSkillsNew';

export const ARSENAL_DRAFT_KEY = 'grudge_arsenal_drafts_v1';

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
  /** Optional override icon path (mesh-true or curated) */
  iconUrl?: string | null;
  label?: string;
}

export interface ArsenalDrafts {
  version: 1;
  updatedAt: string;
  /** weaponType → skillId → patch */
  skills: Record<string, Record<string, SkillDraftPatch>>;
  /** prefabId → patch */
  prefabs: Record<string, PrefabDraftPatch>;
  /** freeform system notes for combat systems work */
  systemNotes: string;
}

function emptyDrafts(): ArsenalDrafts {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    skills: {},
    prefabs: {},
    systemNotes: '',
  };
}

export function loadArsenalDrafts(): ArsenalDrafts {
  try {
    if (typeof localStorage === 'undefined') return emptyDrafts();
    const raw = localStorage.getItem(ARSENAL_DRAFT_KEY);
    if (!raw) return emptyDrafts();
    const parsed = JSON.parse(raw) as ArsenalDrafts;
    if (parsed?.version !== 1) return emptyDrafts();
    return {
      ...emptyDrafts(),
      ...parsed,
      skills: parsed.skills ?? {},
      prefabs: parsed.prefabs ?? {},
      systemNotes: parsed.systemNotes ?? '',
    };
  } catch {
    return emptyDrafts();
  }
}

export function saveArsenalDrafts(drafts: ArsenalDrafts): void {
  const next = { ...drafts, updatedAt: new Date().toISOString() };
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
  } catch {
    /* private mode */
  }
  return empty;
}

/** Download drafts as JSON for PR / agent merge into shared definitions. */
export function downloadArsenalDrafts(drafts: ArsenalDrafts, filename?: string): void {
  const blob = new Blob([JSON.stringify(drafts, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    filename ??
    `arsenal-drafts-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function countDraftPatches(drafts: ArsenalDrafts): {
  skills: number;
  prefabs: number;
} {
  let skills = 0;
  for (const m of Object.values(drafts.skills)) {
    skills += Object.keys(m).length;
  }
  return {
    skills,
    prefabs: Object.keys(drafts.prefabs).length,
  };
}

/**
 * Character Data Adapter
 *
 * Bridges the gap between Grudge Builder's rich character model (JSON blobs for
 * inventory, equipment, skills, professions, etc.) and the backend game-api's flat
 * character table (id, grudge_id, name, race, class, level, hp, stats).
 *
 * Strategy:
 *   - Basic fields (name, race, class, level, hp, stats) → backend
 *   - Extended fields (inventory, equipment, professions, skills) → localStorage
 *     keyed by backend character ID, until backend schema is extended.
 */

import type { Character } from "./characterManager";

const EXT_PREFIX = "grudge_char_ext_";

// ── backend character shape (Railway /api/characters SSOT) ──
export interface BackendCharacter {
  id: number;
  grudge_id: string;
  name: string;
  race: string;
  class: string;
  faction: string | null;
  hp: number;
  max_hp: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  level: number;
  mining_lvl: number;
  fishing_lvl: number;
  woodcutting_lvl: number;
  farming_lvl: number;
  hunting_lvl: number;
  island: string | null;
  pos_x: number | null;
  pos_y: number | null;
  pos_z: number | null;
  created_at?: string;
}

// ── Extended data stored in localStorage ──────────────────────
interface ExtendedCharacterData {
  attributes: Record<string, number>;
  equipment: Record<string, string | null>;
  inventory: Array<{ itemId: string; quantity: number; tier?: number }>;
  professionLevels: Record<string, { level: number; xp: number }>;
  xp: number;
  energy: number;
  revivalTime: number | null;
  avatarUrl: string | null;
  unspentAttributePoints: number;
  skillPoints: number;
  skillLoadouts: Record<string, unknown>;
  weaponSkillLevel: number | null;
  weaponSkillSelections: Record<string, unknown> | null;
  equippedWeaponId: string | null;
  selectedSkills: Record<number, string>;
  actionBar?: Record<number, string>;
  personality: unknown | null;
  chatTemperature: number;
  chatHistory: Array<unknown>;
}

// ── Convert builder character → backend create payload ───────────
export function toBackendCreatePayload(char: Partial<Character>): {
  name: string;
  race: string;
  class: string;
} {
  return {
    name: char.name || "Hero",
    race: (char.raceId || "human").toLowerCase(),
    class: (char.classId || "warrior").toLowerCase(),
  };
}

// ── Convert backend character → Builder character (backend is truth, localStorage is fallback) ──
export function fromBackendCharacter(src: BackendCharacter): Character {
  const ext = loadExtendedData(String(src.id));
  // backend character may now carry extended fields directly (JSONB columns)
  const v = src as any;
  const hasBackendExtended = v.professionLevels || v.skillLoadouts || v.equipment;

  return {
    id: String(src.id),
    name: src.name,
    raceId: src.race,
    classId: src.class,
    level: src.level || 1,
    xp: v.xp ?? ext?.xp ?? 0,
    hp: src.hp ?? ext?.hp ?? 100,
    energy: v.energy ?? ext?.energy ?? 50,
    attributes: v.attributes ?? ext?.attributes ?? {
      strength: src.strength || 10,
      dexterity: src.dexterity || 10,
      intelligence: src.intelligence || 10,
    },
    equipment: v.equipment ?? ext?.equipment ?? {},
    inventory: v.inventory ?? ext?.inventory ?? [],
    professionLevels: v.professionLevels ?? ext?.professionLevels ?? {
      mining: { level: src.mining_lvl || 1, xp: 0 },
      fishing: { level: src.fishing_lvl || 1, xp: 0 },
      woodcutting: { level: src.woodcutting_lvl || 1, xp: 0 },
      farming: { level: src.farming_lvl || 1, xp: 0 },
      hunting: { level: src.hunting_lvl || 1, xp: 0 },
    },
    revivalTime: v.revivalTime ?? ext?.revivalTime ?? null,
    avatarUrl: v.avatarUrl ?? ext?.avatarUrl ?? null,
    unspentAttributePoints: v.unspentAttributePoints ?? ext?.unspentAttributePoints ?? 0,
    skillPoints: v.skillPoints ?? ext?.skillPoints ?? 1,
    skillLoadouts: (v.skillLoadouts ?? ext?.skillLoadouts ?? {}) as any,
    weaponSkillLevel: v.weaponSkillLevel ?? ext?.weaponSkillLevel ?? 1,
    weaponSkillSelections: (v.weaponSkillSelections ?? ext?.weaponSkillSelections ?? {}) as any,
    equippedWeaponId: v.equippedWeaponId ?? ext?.equippedWeaponId ?? null,
    selectedSkills: v.selectedSkills ?? ext?.selectedSkills ?? {},
    actionBar: v.actionBar ?? ext?.actionBar ?? {},
    createdAt: src.created_at ? new Date(src.created_at).getTime() : Date.now(),
  };
}

// ── Save extended builder data (backend-authoritative + localStorage cache) ──
export async function saveExtendedData(
  charId: string,
  char: Partial<Character>,
): Promise<void> {
  const data: ExtendedCharacterData = {
    attributes: char.attributes ?? {},
    equipment: char.equipment ?? {},
    inventory: char.inventory ?? [],
    professionLevels: char.professionLevels ?? {},
    xp: char.xp ?? 0,
    energy: char.energy ?? 50,
    revivalTime: char.revivalTime ?? null,
    avatarUrl: char.avatarUrl ?? null,
    unspentAttributePoints: char.unspentAttributePoints ?? 0,
    skillPoints: char.skillPoints ?? 1,
    skillLoadouts: char.skillLoadouts ?? {},
    weaponSkillLevel: char.weaponSkillLevel ?? 1,
    weaponSkillSelections: char.weaponSkillSelections ?? null,
    equippedWeaponId: char.equippedWeaponId ?? null,
    selectedSkills: char.selectedSkills ?? {},
    personality: null,
    chatTemperature: 70,
    chatHistory: [],
  };

  // Backend write — send ALL extended fields (characters table has JSONB columns for all of these)
  try {
    const { authHeaders } = await import('@/lib/grudgeBackend');
    const res = await fetch(`/api/characters/${charId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        attributes: data.attributes,
        equipment: data.equipment,
        inventory: data.inventory,
        professionLevels: data.professionLevels,
        xp: data.xp,
        energy: data.energy,
        avatarUrl: data.avatarUrl,
        unspentAttributePoints: data.unspentAttributePoints,
        skillPoints: data.skillPoints,
        skillLoadouts: data.skillLoadouts,
        weaponSkillLevel: data.weaponSkillLevel,
        weaponSkillSelections: data.weaponSkillSelections,
        equippedWeaponId: data.equippedWeaponId,
        selectedSkills: data.selectedSkills,
      }),
    });
    if (!res.ok) console.warn(`backend character save failed: ${res.status}`);
  } catch (e) {
    console.warn('backend character sync failed, localStorage has the data:', e);
  }

  // Always cache locally for fast reads + offline fallback
  localStorage.setItem(EXT_PREFIX + charId, JSON.stringify(data));
}

// ── Load extended builder data (localStorage cache) ──────────
export function loadExtendedData(
  charId: string,
): ExtendedCharacterData | null {
  try {
    const raw = localStorage.getItem(EXT_PREFIX + charId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Delete extended data when character is deleted ────────────
export function deleteExtendedData(charId: string): void {
  localStorage.removeItem(EXT_PREFIX + charId);
}

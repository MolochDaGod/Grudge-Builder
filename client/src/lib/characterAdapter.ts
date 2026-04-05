/**
 * Character Data Adapter
 *
 * Bridges the gap between Grudge Builder's rich character model (JSON blobs for
 * inventory, equipment, skills, professions, etc.) and the VPS game-api's flat
 * character table (id, grudge_id, name, race, class, level, hp, stats).
 *
 * Strategy:
 *   - Basic fields (name, race, class, level, hp, stats) → VPS
 *   - Extended fields (inventory, equipment, professions, skills) → localStorage
 *     keyed by VPS character ID, until VPS schema is extended.
 */

import type { Character } from "./characterManager";

const EXT_PREFIX = "grudge_char_ext_";

// ── VPS character shape (what api.grudge-studio.com returns) ──
export interface VpsCharacter {
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
  personality: unknown | null;
  chatTemperature: number;
  chatHistory: Array<unknown>;
}

// ── Convert builder character → VPS create payload ───────────
export function toVpsCreatePayload(char: Partial<Character>): {
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

// ── Convert VPS character → Builder character (VPS is truth, localStorage is fallback) ──
export function fromVpsCharacter(vps: VpsCharacter): Character {
  const ext = loadExtendedData(String(vps.id));
  // VPS character may now carry extended fields directly (JSONB columns)
  const v = vps as any;
  const hasVpsExtended = v.professionLevels || v.skillLoadouts || v.equipment;

  return {
    id: String(vps.id),
    name: vps.name,
    raceId: vps.race,
    classId: vps.class,
    level: vps.level || 1,
    xp: v.xp ?? ext?.xp ?? 0,
    hp: vps.hp ?? ext?.hp ?? 100,
    energy: v.energy ?? ext?.energy ?? 50,
    attributes: v.attributes ?? ext?.attributes ?? {
      strength: vps.strength || 10,
      dexterity: vps.dexterity || 10,
      intelligence: vps.intelligence || 10,
    },
    equipment: v.equipment ?? ext?.equipment ?? {},
    inventory: v.inventory ?? ext?.inventory ?? [],
    professionLevels: v.professionLevels ?? ext?.professionLevels ?? {
      mining: { level: vps.mining_lvl || 1, xp: 0 },
      fishing: { level: vps.fishing_lvl || 1, xp: 0 },
      woodcutting: { level: vps.woodcutting_lvl || 1, xp: 0 },
      farming: { level: vps.farming_lvl || 1, xp: 0 },
      hunting: { level: vps.hunting_lvl || 1, xp: 0 },
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
    createdAt: vps.created_at ? new Date(vps.created_at).getTime() : Date.now(),
  };
}

// ── Save extended builder data (VPS-authoritative + localStorage cache) ──
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

  // VPS write — send ALL extended fields (characters table has JSONB columns for all of these)
  try {
    const res = await fetch(`/api/game/characters/${charId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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
    if (!res.ok) console.warn(`VPS character save failed: ${res.status}`);
  } catch (e) {
    console.warn('VPS character sync failed, localStorage has the data:', e);
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

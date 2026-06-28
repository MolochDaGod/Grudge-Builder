/**
 * Hotbar layout — production Grudge Warlords binding scheme:
 *   1–5        weapon skills
 *   6–8        consumables (inventory item ids)
 *   Shift+1–5  class abilities
 */
export type HotbarSlotMap = Record<number, string | null>;

export const WEAPON_SKILL_SLOTS = [1, 2, 3, 4, 5] as const;
export const CONSUMABLE_SLOTS = [6, 7, 8] as const;
export const CLASS_ABILITY_SLOTS = [1, 2, 3, 4, 5] as const;

export interface PlayerHotbar {
  weaponSkills: HotbarSlotMap;
  consumables: HotbarSlotMap;
  classAbilities: HotbarSlotMap;
}

export function emptyWeaponBar(): HotbarSlotMap {
  return { 1: null, 2: null, 3: null, 4: null, 5: null };
}

export function emptyConsumableBar(): HotbarSlotMap {
  return { 6: null, 7: null, 8: null };
}

export function emptyClassAbilityBar(): HotbarSlotMap {
  return { 1: null, 2: null, 3: null, 4: null, 5: null };
}

export function emptyHotbar(): PlayerHotbar {
  return {
    weaponSkills: emptyWeaponBar(),
    consumables: emptyConsumableBar(),
    classAbilities: emptyClassAbilityBar(),
  };
}

/** Class ability slots use 100+slot in cooldown / HUD active keys. */
export function classAbilityHudKey(slot: number): number {
  return 100 + slot;
}

export function isClassAbilityHudKey(key: number): boolean {
  return key >= 101 && key <= 105;
}

/** Migrate legacy actionBar (1–5 mixed skills) → weaponSkills. */
export function hotbarFromCharacter(char?: {
  actionBar?: Record<number, string | null>;
  weaponBar?: Record<number, string | null>;
  consumableBar?: Record<number, string | null>;
  classAbilityBar?: Record<number, string | null>;
} | null): PlayerHotbar {
  const base = emptyHotbar();
  if (!char) return base;

  const legacy = char.actionBar ?? {};
  for (const s of WEAPON_SKILL_SLOTS) {
    base.weaponSkills[s] =
      char.weaponBar?.[s] ?? legacy[s] ?? null;
  }
  for (const s of CONSUMABLE_SLOTS) {
    base.consumables[s] = char.consumableBar?.[s] ?? null;
  }
  for (const s of CLASS_ABILITY_SLOTS) {
    base.classAbilities[s] = char.classAbilityBar?.[s] ?? null;
  }
  return base;
}

export function hotbarToCharacterFields(hotbar: PlayerHotbar): {
  actionBar: HotbarSlotMap;
  weaponBar: HotbarSlotMap;
  consumableBar: HotbarSlotMap;
  classAbilityBar: HotbarSlotMap;
} {
  return {
    actionBar: { ...hotbar.weaponSkills },
    weaponBar: { ...hotbar.weaponSkills },
    consumableBar: { ...hotbar.consumables },
    classAbilityBar: { ...hotbar.classAbilities },
  };
}
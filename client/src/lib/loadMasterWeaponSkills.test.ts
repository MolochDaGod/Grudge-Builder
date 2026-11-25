import { describe, it, expect } from 'vitest';
import { getWeaponTypeDefinition, normalizeWeaponTypeId } from '@shared/definitions/weaponSkillsNew';
import { WEAPON_TYPES } from '@shared/definitions/weaponDatabase';
import {
  listAllSkillTreeWeaponTypeIds,
  listNamedWeaponsForType,
  getSkillTreeTypeMeta,
  resolveSkillTreeWeaponDef,
} from './loadMasterWeaponSkills';

describe('skill-tree weapon catalog union', () => {
  it('aliases existing types instead of inventing parallel trees', () => {
    expect(normalizeWeaponTypeId('LANCE')).toBe('SPEAR');
    expect(normalizeWeaponTypeId('NIMBLE_FINGERS')).toBe('RANGER_QUICK_FINGERS');
    expect(normalizeWeaponTypeId('DUAL_WIELD')).toBe('WARRIOR_BATTLE');
    expect(getWeaponTypeDefinition('LANCE')?.id).toBe('SPEAR');
    expect(getWeaponTypeDefinition('GREATSWORD')?.id).toBe('TWO_HAND_SWORD');
  });

  it('lists every local weapon type and named weapon', () => {
    const ids = listAllSkillTreeWeaponTypeIds();
    expect(ids).toContain('SWORD');
    expect(ids).toContain('CROSSBOW');
    expect(ids).toContain('GUN');
    expect(ids).toContain('SCYTHE');
    expect(ids).toContain('WAND');
    expect(ids).toContain('GRIMOIRE');
    expect(ids.length).toBeGreaterThanOrEqual(Object.keys(WEAPON_TYPES).length);

    const swords = listNamedWeaponsForType('SWORD');
    expect(swords.length).toBe(WEAPON_TYPES.SWORD.weapons.length);
    expect(swords.some((w) => w.id === 'sword_bloodfeud')).toBe(true);

    const spears = listNamedWeaponsForType('SPEAR');
    expect(spears.some((w) => w.id.startsWith('lance_'))).toBe(true);

    const swordMeta = getSkillTreeTypeMeta('SWORD');
    expect(swordMeta.skillCount).toBeGreaterThan(0);
    expect(swordMeta.weaponCount).toBeGreaterThan(0);
    expect(resolveSkillTreeWeaponDef('SWORD')?.slots.length).toBeGreaterThan(0);
  });
});

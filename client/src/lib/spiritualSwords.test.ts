import { describe, expect, it } from 'vitest';
import {
  SPIRITUAL_SWORD_BY_COLOR,
  SPIRITUAL_SWORD_COLORS,
  SPIRITUAL_SWORD_STACK,
  listSpiritualSwordColors,
  spiritualColorFromSchool,
} from '@shared/definitions/spiritualSwords';

describe('spiritualSwords catalog', () => {
  it('has four deployable colors', () => {
    expect(SPIRITUAL_SWORD_COLORS).toEqual(['blue', 'green', 'white', 'lava']);
    expect(listSpiritualSwordColors()).toHaveLength(4);
  });

  it('maps free sword ids and texture paths', () => {
    expect(SPIRITUAL_SWORD_BY_COLOR.blue.freeSwordId).toBe('Sword6');
    expect(SPIRITUAL_SWORD_BY_COLOR.green.freeSwordId).toBe('Sword7');
    expect(SPIRITUAL_SWORD_BY_COLOR.white.freeSwordId).toBe('Sword8');
    expect(SPIRITUAL_SWORD_BY_COLOR.lava.freeSwordId).toBe('Sword15');
    for (const c of SPIRITUAL_SWORD_COLORS) {
      const d = SPIRITUAL_SWORD_BY_COLOR[c];
      expect(d.albedoPath).toContain(`/spiritual-swords/${c}/albedo.png`);
      expect(d.emissionPath).toContain(`/spiritual-swords/${c}/emission.png`);
    }
  });

  it('maps schools to colors', () => {
    expect(spiritualColorFromSchool('fire')).toBe('lava');
    expect(spiritualColorFromSchool('frost')).toBe('blue');
    expect(spiritualColorFromSchool('nature')).toBe('green');
    expect(spiritualColorFromSchool('holy')).toBe('white');
    expect(spiritualColorFromSchool('arcane')).toBe('blue');
  });

  it('stack limits support one-sword-per-stack UX', () => {
    expect(SPIRITUAL_SWORD_STACK.max).toBe(8);
    expect(SPIRITUAL_SWORD_STACK.playerRadius).toBeGreaterThan(0.5);
    expect(SPIRITUAL_SWORD_STACK.enemyHeadY).toBeGreaterThan(1.5);
  });
});

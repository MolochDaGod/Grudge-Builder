/**
 * Spiritual Swords — color-organized FreeSwords (Blink LowPoly) pack.
 *
 * Source textures: FreeSwords Sword6 Blue · Sword7 Green · Sword8 White · Sword15 Lava
 * Deploy path: /models/vfx/spiritual-swords/{color}/albedo.png|emission.png
 *
 * Uses:
 *  - spiritual / projectile blades
 *  - auras + spin magic FX
 *  - fall rain (multiples)
 *  - block fan
 *  - stack orbs: small swords around player or over enemy head (1 per stack)
 */

export const SPIRITUAL_SWORD_COLORS = ['blue', 'green', 'white', 'lava'] as const;
export type SpiritualSwordColor = (typeof SPIRITUAL_SWORD_COLORS)[number];

export const SPIRITUAL_SWORD_MODES = [
  'projectile',
  'aura',
  'spin',
  'fall',
  'block',
  'stack_player',
  'stack_enemy',
] as const;
export type SpiritualSwordMode = (typeof SPIRITUAL_SWORD_MODES)[number];

export type SpiritualSwordColorDef = {
  id: SpiritualSwordColor;
  /** FreeSwords source id */
  freeSwordId: 'Sword6' | 'Sword7' | 'Sword8' | 'Sword15';
  label: string;
  /** Damage / school mapping */
  school: 'frost' | 'nature' | 'holy' | 'fire';
  damageType: 'frost' | 'nature' | 'holy' | 'fire';
  /** Primary / emissive hex for tint fallback */
  hex: number;
  emissiveHex: number;
  /** Local public paths (served from client) */
  albedoPath: string;
  emissionPath: string;
  /** Optional future GLB when mesh bake ships */
  meshPath?: string;
};

const BASE = '/models/vfx/spiritual-swords';

export const SPIRITUAL_SWORD_BY_COLOR: Record<SpiritualSwordColor, SpiritualSwordColorDef> = {
  blue: {
    id: 'blue',
    freeSwordId: 'Sword6',
    label: 'Spirit Blue',
    school: 'frost',
    damageType: 'frost',
    hex: 0x3aa8ff,
    emissiveHex: 0x00c9c9,
    albedoPath: `${BASE}/blue/albedo.png`,
    emissionPath: `${BASE}/blue/emission.png`,
  },
  green: {
    id: 'green',
    freeSwordId: 'Sword7',
    label: 'Spirit Green',
    school: 'nature',
    damageType: 'nature',
    hex: 0x44dd66,
    emissiveHex: 0x22ff88,
    albedoPath: `${BASE}/green/albedo.png`,
    emissionPath: `${BASE}/green/emission.png`,
  },
  white: {
    id: 'white',
    freeSwordId: 'Sword8',
    label: 'Spirit White',
    school: 'holy',
    damageType: 'holy',
    hex: 0xf4f0e0,
    emissiveHex: 0xfff6c8,
    albedoPath: `${BASE}/white/albedo.png`,
    emissionPath: `${BASE}/white/emission.png`,
  },
  lava: {
    id: 'lava',
    freeSwordId: 'Sword15',
    label: 'Spirit Lava',
    school: 'fire',
    damageType: 'fire',
    hex: 0xff5522,
    emissiveHex: 0xff8800,
    albedoPath: `${BASE}/lava/albedo.png`,
    emissionPath: `${BASE}/lava/emission.png`,
  },
};

/** Map damage type / school string → spiritual color */
export function spiritualColorFromSchool(
  schoolOrDamage?: string | null,
): SpiritualSwordColor {
  const s = (schoolOrDamage ?? '').toLowerCase();
  if (s.includes('fire') || s.includes('lava') || s.includes('flame')) return 'lava';
  if (s.includes('nature') || s.includes('poison') || s.includes('earth')) return 'green';
  if (s.includes('holy') || s.includes('light') || s.includes('spirit') || s.includes('white')) {
    return 'white';
  }
  if (s.includes('frost') || s.includes('ice') || s.includes('arcane') || s.includes('water')) {
    return 'blue';
  }
  return 'white';
}

export function listSpiritualSwordColors(): SpiritualSwordColorDef[] {
  return SPIRITUAL_SWORD_COLORS.map((c) => SPIRITUAL_SWORD_BY_COLOR[c]);
}

/** Default scale in metres (blade length ~0.9 m full, stacks ~0.35) */
export const SPIRITUAL_SWORD_SCALE = {
  full: 1,
  projectile: 0.85,
  aura: 0.7,
  spin: 0.95,
  fall: 0.9,
  block: 0.75,
  stack: 0.38,
} as const;

export const SPIRITUAL_SWORD_STACK = {
  max: 8,
  /** Orbit radius around player (m) */
  playerRadius: 1.15,
  playerHeight: 1.15,
  /** Hover height above enemy head (m) */
  enemyHeadY: 2.15,
  enemySpread: 0.28,
  spinSpeed: 1.8,
} as const;

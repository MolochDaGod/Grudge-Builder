/**
 * Greatsword / 2H samurai combat pack — from sworattackssamurai.glb retarget.
 *
 * Source: C:\Users\nugye\Documents\sworattackssamurai.glb
 * Staged: /models/warlords/ingest/anims/combat/sworattackssamurai.glb
 * Target skeleton: Bip001 (grudge6) — retarget offline (Mesh2Motion / Blender / bake)
 *
 * Slot map (product):
 *   Slot 1 — normal attack: 2combo_1 → 3combo_2 (two-hit combo)
 *   Slot 2 — focus skill: 4combo standalone + teleport
 *   Slot 3 — 2H opener: attack1 slashing dash
 *   Slot 4 — flaming fissure: sword pack cast anim + ground fire fissure VFX
 */

export const SAMURAI_SOURCE_GLB =
  '/models/warlords/ingest/anims/combat/sworattackssamurai.glb';

export const SAMURAI_CDN_KEY =
  'models/warlords/ingest/anims/combat/sworattackssamurai.glb';

/** Expected clip names inside source GLB (fuzzy-match allowed at runtime). */
export const SAMURAI_SOURCE_CLIPS = [
  'attack1',
  '2combo_1',
  '3combo_2',
  '4combo',
] as const;

export type SamuraiClipId = (typeof SAMURAI_SOURCE_CLIPS)[number];

/** After retarget → Bip001 baked clip keys (fleet naming). */
export const SAMURAI_RETARGET_KEYS = {
  attack1: 'gs_samurai_dash_opener',
  '2combo_1': 'gs_samurai_combo_a',
  '3combo_2': 'gs_samurai_combo_b',
  '4combo': 'gs_samurai_teleport_strike',
} as const;

/** Use existing sword_shield / magic pack for cast channel. */
export const FISSURE_CAST_ANIM_KEYS = [
  'magic_cast',
  'staffattack',
  'sword_block', // fallback
] as const;

export interface GreatswordSkillBinding {
  id: string;
  label: string;
  hotbarSlot: 1 | 2 | 3 | 4;
  slotKind: 'primary' | 'secondary' | 'ability';
  /** Source clip(s) before retarget */
  sourceClips: string[];
  /** Fleet anim key after Bip001 bake */
  animKey: string;
  /** Optional second clip for multi-hit */
  animKeyB?: string;
  movement?: 'none' | 'dash' | 'teleport';
  vfx: string[];
  description: string;
  cooldown?: number;
  power: number;
  cost: { stamina?: number; mana?: number };
  damageType: 'physical' | 'fire';
}

export const GREATSWORD_SAMURAI_SKILLS: GreatswordSkillBinding[] = [
  {
    id: 'gs_samurai_cleave_combo',
    label: 'Twin Slash Combo',
    hotbarSlot: 1,
    slotKind: 'primary',
    sourceClips: ['2combo_1', '3combo_2'],
    animKey: SAMURAI_RETARGET_KEYS['2combo_1'],
    animKeyB: SAMURAI_RETARGET_KEYS['3combo_2'],
    movement: 'none',
    vfx: ['fx.warrior.cleave', 'fx.warrior.slash_trail'],
    description: 'Two-hit 2H combo — normal attack / LMB chain',
    power: 2.1,
    cost: { stamina: 8 },
    damageType: 'physical',
  },
  {
    id: 'gs_samurai_teleport_strike',
    label: 'Shadow Step Strike',
    hotbarSlot: 2,
    slotKind: 'secondary',
    sourceClips: ['4combo'],
    animKey: SAMURAI_RETARGET_KEYS['4combo'],
    movement: 'teleport',
    vfx: ['fx.warrior.cleave', 'fx.mage.blink'],
    description: 'Standalone skill — teleport to target then 4combo strike',
    cooldown: 10,
    power: 2.6,
    cost: { stamina: 16 },
    damageType: 'physical',
  },
  {
    id: 'gs_samurai_dash_opener',
    label: 'Slashing Dash',
    hotbarSlot: 3,
    slotKind: 'primary',
    sourceClips: ['attack1'],
    animKey: SAMURAI_RETARGET_KEYS.attack1,
    movement: 'dash',
    vfx: ['fx.warrior.cleave', 'fx.warrior.dash'],
    description: '2H sword opener — slashing dash into range',
    cooldown: 5,
    power: 2.4,
    cost: { stamina: 12 },
    damageType: 'physical',
  },
  {
    id: 'gs_flaming_fissure',
    label: 'Flaming Fissure',
    hotbarSlot: 4,
    slotKind: 'ability',
    sourceClips: [...FISSURE_CAST_ANIM_KEYS],
    animKey: 'magic_cast',
    movement: 'none',
    vfx: ['fx.mage.fire_fissure', 'fx.warrior.ground_slam'],
    description: 'Cast flaming ground fissure toward enemy (sword pack cast anim)',
    cooldown: 14,
    power: 3.2,
    cost: { stamina: 10, mana: 18 },
    damageType: 'fire',
  },
];

/** apiWeaponMatrix-compatible nodes for GREATSWORD override / merge. */
export function greatswordSamuraiMatrixNodes() {
  return GREATSWORD_SAMURAI_SKILLS.map((s) => ({
    id: s.id,
    label: s.label,
    rank: s.hotbarSlot,
    animKey: s.animKey,
    effects: s.vfx,
    cooldown: s.cooldown,
    power: s.power,
    cost: s.cost,
    damageType: s.damageType,
    description: s.description,
    hotbarSlot: s.hotbarSlot,
    slotKind: s.slotKind,
    movement: s.movement,
    animKeyB: s.animKeyB,
    sourceClips: s.sourceClips,
  }));
}

export const GREATSWORD_SAMURAI_PACK = {
  id: 'greatsword_samurai_v1',
  weaponApiId: 'GREATSWORD',
  sourceGlb: SAMURAI_SOURCE_GLB,
  cdnKey: SAMURAI_CDN_KEY,
  targetSkeleton: 'bip001' as const,
  retargetKeys: SAMURAI_RETARGET_KEYS,
  skills: GREATSWORD_SAMURAI_SKILLS,
  bakeNotes: [
    'Export clips from sworattackssamurai.glb',
    'Retarget to Bip001 (Mesh2Motion desktop or Blender NLA)',
    'glb2glb bake rotation-only JSON or GLB clips into /anims/baked',
    'Register clip names in anim catalog + GREATSWORD matrix',
  ],
} as const;

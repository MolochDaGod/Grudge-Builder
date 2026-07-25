/**
 * Greatsword / 2H samurai combat pack — from sworattackssamurai.glb retarget.
 *
 * Source: C:\Users\nugye\Documents\sworattackssamurai.glb
 * Staged: /models/warlords/ingest/anims/combat/sworattackssamurai.glb
 * Target skeleton: Bip001 (grudge6) — Core_01 → Bip001, **rotation-only bake**
 *
 * ## Retarget best practices (HARD)
 * - **Naming:** fleet keys `gs_samurai_*` (not raw source `1Attack` / Core_01)
 * - **Y hip:** strip ALL `.position` tracks (hip/root) — ban hip-float
 * - **XZ:** center on Bip001 Pelvis at runtime; ground feet from body bbox min.y
 * - **Units:** kit fit ~1.8 m human; 1 unit = 1 m
 * - **Tracks:** quaternion-only on Bip001 bones; rematch spaces/underscores
 *
 * Slot map (product):
 *   Slot 1 — normal attack: 2Combo_1 → 3Combo_2 (two-hit combo)
 *   Slot 2 — focus skill: 4Combo_3 standalone + teleport
 *   Slot 3 — 2H opener: 1Attack slashing dash
 *   Slot 4 — flaming fissure: magic_cast + ground fire fissure VFX
 */

export const SAMURAI_SOURCE_GLB =
  '/models/warlords/ingest/anims/combat/sworattackssamurai.glb';

export const SAMURAI_CDN_KEY =
  'models/warlords/ingest/anims/combat/sworattackssamurai.glb';

/** Same-origin + CDN baked pack root (rotation-only JSON). */
export const GREATSWORD_SAMURAI_BAKED_PATH = '/anims/baked/greatsword_samurai';
export const GREATSWORD_SAMURAI_CDN_PATH =
  'https://assets.grudge-studio.com/anims/baked/greatsword_samurai';

/**
 * Actual clip names inside sworattackssamurai.glb (verified glTF parse).
 * Skeleton: custom Core_01 / Belly_02 / Cheast_03 (NOT Mixamo / Bip001).
 */
export const SAMURAI_SOURCE_CLIPS = [
  '1Attack',
  '2Combo_1',
  '3Combo_2',
  '4Combo_3',
  '5Idle',
  '6Idle_sword',
  '7Jump',
  '8Jump_sword',
  '9Rurring',
  '10Rurring_sword',
  '11Sword_On',
  '11Sword_Off',
  '12Walking',
  '13Walking_Sword',
] as const;

export type SamuraiClipId = (typeof SAMURAI_SOURCE_CLIPS)[number];

/** After retarget → Bip001 baked clip keys (fleet naming). */
export const SAMURAI_RETARGET_KEYS = {
  '1Attack': 'gs_samurai_dash_opener',
  '2Combo_1': 'gs_samurai_combo_a',
  '3Combo_2': 'gs_samurai_combo_b',
  '4Combo_3': 'gs_samurai_teleport_strike',
  '5Idle': 'gs_samurai_idle',
  '6Idle_sword': 'gs_samurai_idle_sword',
  '7Jump': 'gs_samurai_jump',
  '8Jump_sword': 'gs_samurai_jump_sword',
  '9Rurring': 'gs_samurai_run',
  '10Rurring_sword': 'gs_samurai_run_sword',
  '11Sword_On': 'gs_samurai_sword_on',
  '11Sword_Off': 'gs_samurai_sword_off',
  '12Walking': 'gs_samurai_walk',
  '13Walking_Sword': 'gs_samurai_walk_sword',
} as const;

/** Relative path under /anims/baked for a baked key. */
export function greatswordSamuraiBakedRel(key: string): string {
  return `greatsword_samurai/${key}`;
}

/** Full URL candidates (same-origin first, then assets CDN). */
export function greatswordSamuraiClipUrls(key: string): string[] {
  const file = `${key}.json`;
  return [
    `${GREATSWORD_SAMURAI_BAKED_PATH}/${file}`,
    `${GREATSWORD_SAMURAI_CDN_PATH}/${file}`,
  ];
}

/**
 * Runtime grounding contract when applying this pack to a grudge6 kit.
 * Mirrors grudge-character-correctness (do not re-argue).
 */
export const GREATSWORD_SAMURAI_GROUNDING = {
  /** Never play hip/root position tracks on a grounded kit */
  stripPositionTracks: true,
  /** Feet at world Y = groundY after sample — NOT pelvis Y = 0 */
  groundFromFeetBbox: true,
  /** Center XZ on Bip001 Pelvis, not full prop AABB */
  centerXZOnPelvis: true,
  /** Average human fit */
  humanHeightM: 1.8,
  /** Y = up, ground = XZ plane */
  upAxis: 'Y' as const,
  groundPlane: 'XZ' as const,
  /** Hip bone name after bake */
  hipBone: 'Bip001_Pelvis',
  /** Forbidden: treating hip world Y as feet */
  banPelvisAsFeet: true,
} as const;

/** Core_01 skeleton → Bip001 (for bake + Mesh2Motion docs). */
export const SAMURAI_TO_BIP001_BONES: Record<string, string> = {
  Core_01: 'Bip001_Pelvis',
  Belly_02: 'Bip001_Spine',
  Cheast_03: 'Bip001_Spine1',
  Nesk_04: 'Bip001_Neck',
  Head_05: 'Bip001_Head',
  L_Arm_A_06: 'Bip001_L_Clavicle',
  L_Arm_B_07: 'Bip001_L_UpperArm',
  L_Arm_C_08: 'Bip001_L_Forearm',
  L_Arm_D_09: 'Bip001_L_Hand',
  R_Arm_A_020: 'Bip001_R_Clavicle',
  R_Arm_B_021: 'Bip001_R_UpperArm',
  R_Arm_C_022: 'Bip001_R_Forearm',
  R_Arm_D_023: 'Bip001_R_Hand',
  L_Leg_A_00: 'Bip001_L_Thigh',
  L_Leg_B_035: 'Bip001_L_Calf',
  L_Leg_C_036: 'Bip001_L_Foot',
  L_Leg_D_037: 'Bip001_L_Toe0',
  R_Leg_A_039: 'Bip001_R_Thigh',
  R_Leg_B_040: 'Bip001_R_Calf',
  R_Leg_C_041: 'Bip001_R_Foot',
  R_Leg_D_042: 'Bip001_R_Toe0',
};

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
    sourceClips: ['2Combo_1', '3Combo_2'],
    animKey: SAMURAI_RETARGET_KEYS['2Combo_1'],
    animKeyB: SAMURAI_RETARGET_KEYS['3Combo_2'],
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
    sourceClips: ['4Combo_3'],
    animKey: SAMURAI_RETARGET_KEYS['4Combo_3'],
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
    sourceClips: ['1Attack'],
    animKey: SAMURAI_RETARGET_KEYS['1Attack'],
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

/**
 * Map legacy TWO_HAND_SWORD skill ids → samurai baked anim keys
 * so ProductionSkillCombatRuntime plays gs_samurai_* one-shots.
 */
export const TWO_HAND_TO_SAMURAI_ANIM: Record<string, string> = {
  '2h_heavy_slash': SAMURAI_RETARGET_KEYS['2Combo_1'],
  '2h_overhead_slam': SAMURAI_RETARGET_KEYS['3Combo_2'],
  '2h_sweeping_strike': SAMURAI_RETARGET_KEYS['2Combo_1'],
  '2h_colossus_charge': SAMURAI_RETARGET_KEYS['1Attack'],
  '2h_cleaving_combo': SAMURAI_RETARGET_KEYS['2Combo_1'],
  '2h_mortal_strike': SAMURAI_RETARGET_KEYS['4Combo_3'],
  '2h_impale': SAMURAI_RETARGET_KEYS['4Combo_3'],
  '2h_bladestorm': SAMURAI_RETARGET_KEYS['3Combo_2'],
  '2h_executioner': SAMURAI_RETARGET_KEYS['4Combo_3'],
  // Direct samurai skill ids (hotbar product map)
  gs_samurai_cleave_combo: SAMURAI_RETARGET_KEYS['2Combo_1'],
  gs_samurai_teleport_strike: SAMURAI_RETARGET_KEYS['4Combo_3'],
  gs_samurai_dash_opener: SAMURAI_RETARGET_KEYS['1Attack'],
  gs_flaming_fissure: 'magic_cast',
};

export const GREATSWORD_SAMURAI_PACK = {
  id: 'greatsword_samurai_v1',
  weaponApiId: 'GREATSWORD',
  /** Also drives TWO_HAND_SWORD / 2h_melee profiles */
  aliasWeaponIds: ['GREATSWORD', 'TWO_HAND_SWORD', 'greatsword'] as const,
  sourceGlb: SAMURAI_SOURCE_GLB,
  cdnKey: SAMURAI_CDN_KEY,
  bakedPath: GREATSWORD_SAMURAI_BAKED_PATH,
  cdnPath: GREATSWORD_SAMURAI_CDN_PATH,
  targetSkeleton: 'bip001' as const,
  sourceSkeleton: 'Core_01' as const,
  retargetKeys: SAMURAI_RETARGET_KEYS,
  grounding: GREATSWORD_SAMURAI_GROUNDING,
  skills: GREATSWORD_SAMURAI_SKILLS,
  animOverrideMap: TWO_HAND_TO_SAMURAI_ANIM,
  bakeNotes: [
    'Parse sworattackssamurai.glb clips (Core_01 skeleton)',
    'Map bones Core_01→Bip001_Pelvis, arms/legs per SAMURAI_TO_BIP001_BONES',
    'Strip ALL .position tracks (Y hip lock / no hip-float)',
    'Name clips gs_samurai_* under /anims/baked/greatsword_samurai/',
    'Runtime: centerXZOnPelvis + groundFeetLocal after idle/attack sample',
    'Register in anim manifest + GREATSWORD / TWO_HAND_SWORD combat catalog',
  ],
} as const;

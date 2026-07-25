/**
 * Weapon Combat Geometry + Grip / Wrist IK — CANONICAL SSOT
 *
 * Used by:
 *  - Combat Lab editor (/combat-lab)
 *  - grudge6 weapon attach (hand bone + wrist lock)
 *  - Melee hit reach / collider placement
 *  - Force patterns: push, pull, knock-up, uppercut, back-uppercut
 *
 * Design goals:
 *  1. Grip offsets keep the mesh in the palm (no blade through torso on run/attack).
 *  2. Wrist lock Euler damps extreme bone twists that cause mesh penetration.
 *  3. Hit collider sits along the blade/edge at optimal reach for the weapon class.
 *  4. Attack force profiles drive impulse + status application consistently.
 */

import { holsterClassForWeaponType, type HolsterClass } from './weaponAttachSystem';

// ── Types ────────────────────────────────────────────────────────────────────

export type ForcePatternId =
  | 'slash'
  | 'thrust'
  | 'smash'
  | 'push'
  | 'pull'
  | 'knockup'
  | 'uppercut'
  | 'back_uppercut'
  | 'cleave'
  | 'pierce'
  | 'shot'
  | 'cast';

export interface WristLock {
  /** Max wrist pitch (rad) relative to forearm — clamps animation extremes */
  maxPitch: number;
  /** Max wrist yaw (rad) */
  maxYaw: number;
  /** Max wrist roll (rad) — stops blade from rotating into the body */
  maxRoll: number;
  /** Soft spring strength 0–1 when correcting toward grip pose each frame */
  spring: number;
  /**
   * Bias Euler (XYZ rad) applied after animation so the grip faces outward.
   * Tuned so edge/blade points away from torso when idle/run.
   */
  biasEuler: [number, number, number];
}

export interface WeaponGripPose {
  /** Local offset from R_hand_container / L_hand_container (metres) */
  offset: [number, number, number];
  /** Local Euler XYZ (rad) */
  rotation: [number, number, number];
  scale: number;
  /** Prefer left hand socket when true */
  leftHand?: boolean;
}

/** Capsule/box hit volume in weapon local space (metres, SI) */
export interface WeaponHitCollider {
  shape: 'capsule' | 'box' | 'sphere';
  /** Center along weapon local +Y (blade direction) from grip */
  center: [number, number, number];
  /** Capsule: radius + halfHeight; box: half-extents; sphere: radius in x */
  size: [number, number, number];
  /** Optimal melee reach from character origin (m) */
  reachM: number;
  /** Horizontal attack arc half-angle (rad) for cone checks */
  arcHalfRad: number;
  /** Vertical sweet-spot height bias (m) — chest for slash, feet for sweep */
  heightBiasM: number;
}

export interface ForceImpulse {
  /** Planar knockback strength (m/s impulse scale) */
  push: number;
  /** Pull toward attacker (m/s) — negative of push direction */
  pull: number;
  /** Upward lift (m/s) */
  knockUp: number;
  /** Extra upward + slight back for uppercut style */
  uppercut: number;
  /** Spin/yaw impulse on target (rad/s feel) */
  yawTorque: number;
  /** Stun/hard-CC chance 0–1 when force lands clean */
  staggerChance: number;
  /** Default status ids applied on hit (stack rules from statusEffects SSOT) */
  applyStatusIds: string[];
  /** Status stacks per hit */
  statusStacks: number;
}

export interface WeaponCombatProfile {
  weaponTypeId: string;
  displayName: string;
  holsterClass: HolsterClass;
  grip: WeaponGripPose;
  wrist: WristLock;
  collider: WeaponHitCollider;
  /** Primary attack pattern for LMB / skill-1 */
  primaryForce: ForcePatternId;
  /** Heavy / skill-2 pattern */
  heavyForce: ForcePatternId;
  forces: Partial<Record<ForcePatternId, ForceImpulse>>;
  /** Passive damage scale (editor / balance) */
  damageScale: number;
  /** Passive stamina cost scale */
  staminaScale: number;
  /** Passive passive ids from catalog (applied while weapon equipped) */
  passiveIds: string[];
  /** Trail / impact VFX keys */
  vfx: { trail?: string; impact?: string; cast?: string };
}

// ── Force presets ────────────────────────────────────────────────────────────

export const FORCE_PRESETS: Record<ForcePatternId, ForceImpulse> = {
  slash: {
    push: 2.2,
    pull: 0,
    knockUp: 0.4,
    uppercut: 0,
    yawTorque: 0.8,
    staggerChance: 0.12,
    applyStatusIds: [],
    statusStacks: 1,
  },
  thrust: {
    push: 3.5,
    pull: 0,
    knockUp: 0.15,
    uppercut: 0,
    yawTorque: 0.1,
    staggerChance: 0.18,
    applyStatusIds: [],
    statusStacks: 1,
  },
  smash: {
    push: 4.0,
    pull: 0,
    knockUp: 1.2,
    uppercut: 0.3,
    yawTorque: 0.4,
    staggerChance: 0.35,
    applyStatusIds: ['stunned'],
    statusStacks: 1,
  },
  push: {
    push: 6.0,
    pull: 0,
    knockUp: 0.6,
    uppercut: 0,
    yawTorque: 0.2,
    staggerChance: 0.25,
    applyStatusIds: [],
    statusStacks: 1,
  },
  pull: {
    push: 0,
    pull: 5.5,
    knockUp: 0.3,
    uppercut: 0,
    yawTorque: 0,
    staggerChance: 0.1,
    applyStatusIds: ['snared'],
    statusStacks: 1,
  },
  knockup: {
    push: 1.0,
    pull: 0,
    knockUp: 5.5,
    uppercut: 1.0,
    yawTorque: 0.3,
    staggerChance: 0.4,
    applyStatusIds: [],
    statusStacks: 1,
  },
  uppercut: {
    push: 1.5,
    pull: 0,
    knockUp: 4.0,
    uppercut: 3.5,
    yawTorque: 0.5,
    staggerChance: 0.3,
    applyStatusIds: [],
    statusStacks: 1,
  },
  back_uppercut: {
    push: -2.0, // slight pull into the rising arc
    pull: 1.5,
    knockUp: 4.5,
    uppercut: 4.0,
    yawTorque: 1.2,
    staggerChance: 0.35,
    applyStatusIds: [],
    statusStacks: 1,
  },
  cleave: {
    push: 2.8,
    pull: 0,
    knockUp: 0.8,
    uppercut: 0,
    yawTorque: 1.5,
    staggerChance: 0.2,
    applyStatusIds: [],
    statusStacks: 1,
  },
  pierce: {
    push: 2.0,
    pull: 0,
    knockUp: 0.1,
    uppercut: 0,
    yawTorque: 0,
    staggerChance: 0.15,
    applyStatusIds: ['bleeding'],
    statusStacks: 1,
  },
  shot: {
    push: 1.2,
    pull: 0,
    knockUp: 0.05,
    uppercut: 0,
    yawTorque: 0,
    staggerChance: 0.08,
    applyStatusIds: [],
    statusStacks: 1,
  },
  cast: {
    push: 0.8,
    pull: 0,
    knockUp: 0.2,
    uppercut: 0,
    yawTorque: 0,
    staggerChance: 0.05,
    applyStatusIds: [],
    statusStacks: 1,
  },
};

// ── Defaults by holster / weapon family ──────────────────────────────────────

const WRIST_1H: WristLock = {
  maxPitch: 0.55,
  maxYaw: 0.45,
  maxRoll: 0.7,
  spring: 0.35,
  biasEuler: [0.15, 0, -0.35], // tip outward / down from torso
};

const WRIST_2H: WristLock = {
  maxPitch: 0.4,
  maxYaw: 0.35,
  maxRoll: 0.5,
  spring: 0.4,
  biasEuler: [0.1, 0.05, -0.25],
};

const WRIST_BOW: WristLock = {
  maxPitch: 0.3,
  maxYaw: 0.5,
  maxRoll: 0.35,
  spring: 0.3,
  biasEuler: [0, Math.PI * 0.5, 0],
};

function grip1h(extra: Partial<WeaponGripPose> = {}): WeaponGripPose {
  return {
    offset: [0.02, 0.04, 0.01],
    rotation: [Math.PI * 0.5, 0, 0],
    scale: 1,
    ...extra,
  };
}

function colliderBlade(reachM: number, length = 0.55, radius = 0.06): WeaponHitCollider {
  return {
    shape: 'capsule',
    center: [0, length * 0.55, 0],
    size: [radius, length * 0.45, radius],
    reachM,
    arcHalfRad: 0.85,
    heightBiasM: 1.15,
  };
}

function colliderPole(reachM: number): WeaponHitCollider {
  return {
    shape: 'capsule',
    center: [0, 0.85, 0],
    size: [0.05, 0.75, 0.05],
    reachM,
    arcHalfRad: 0.35,
    heightBiasM: 1.2,
  };
}

function colliderBlunt(reachM: number): WeaponHitCollider {
  return {
    shape: 'sphere',
    center: [0, 0.55, 0],
    size: [0.14, 0.14, 0.14],
    reachM,
    arcHalfRad: 0.7,
    heightBiasM: 1.1,
  };
}

function baseForces(
  primary: ForcePatternId,
  heavy: ForcePatternId,
  extra: Partial<Record<ForcePatternId, ForceImpulse>> = {},
): Partial<Record<ForcePatternId, ForceImpulse>> {
  return {
    slash: FORCE_PRESETS.slash,
    thrust: FORCE_PRESETS.thrust,
    smash: FORCE_PRESETS.smash,
    push: FORCE_PRESETS.push,
    pull: FORCE_PRESETS.pull,
    knockup: FORCE_PRESETS.knockup,
    uppercut: FORCE_PRESETS.uppercut,
    back_uppercut: FORCE_PRESETS.back_uppercut,
    cleave: FORCE_PRESETS.cleave,
    pierce: FORCE_PRESETS.pierce,
    shot: FORCE_PRESETS.shot,
    cast: FORCE_PRESETS.cast,
    [primary]: FORCE_PRESETS[primary],
    [heavy]: FORCE_PRESETS[heavy],
    ...extra,
  };
}

function makeProfile(
  weaponTypeId: string,
  displayName: string,
  partial: Omit<WeaponCombatProfile, 'weaponTypeId' | 'displayName' | 'holsterClass'> & {
    holsterClass?: HolsterClass;
  },
): WeaponCombatProfile {
  return {
    weaponTypeId,
    displayName,
    holsterClass: partial.holsterClass ?? holsterClassForWeaponType(weaponTypeId),
    grip: partial.grip,
    wrist: partial.wrist,
    collider: partial.collider,
    primaryForce: partial.primaryForce,
    heavyForce: partial.heavyForce,
    forces: partial.forces,
    damageScale: partial.damageScale,
    staminaScale: partial.staminaScale,
    passiveIds: partial.passiveIds,
    vfx: partial.vfx,
  };
}

// ── Canonical catalog ────────────────────────────────────────────────────────

export const WEAPON_COMBAT_PROFILES: Record<string, WeaponCombatProfile> = {
  SWORD: makeProfile('SWORD', 'Sword', {
    grip: grip1h({ rotation: [Math.PI * 0.52, 0.05, -0.1] }),
    wrist: WRIST_1H,
    collider: colliderBlade(2.15, 0.5, 0.055),
    primaryForce: 'slash',
    heavyForce: 'uppercut',
    forces: baseForces('slash', 'uppercut', {
      uppercut: { ...FORCE_PRESETS.uppercut, applyStatusIds: [] },
      back_uppercut: FORCE_PRESETS.back_uppercut,
    }),
    damageScale: 1,
    staminaScale: 1,
    passiveIds: ['weapon_stack_slash'],
    vfx: { trail: 'slash_arc', impact: 'spark_metal' },
  }),
  AXE: makeProfile('AXE', 'Axe', {
    grip: grip1h({ offset: [0.02, 0.05, 0.02], rotation: [Math.PI * 0.48, 0, -0.15] }),
    wrist: { ...WRIST_1H, maxRoll: 0.55, biasEuler: [0.12, 0, -0.4] },
    collider: colliderBlade(2.05, 0.42, 0.08),
    primaryForce: 'cleave',
    heavyForce: 'smash',
    forces: baseForces('cleave', 'smash'),
    damageScale: 1.15,
    staminaScale: 1.15,
    passiveIds: ['weapon_stack_cleave'],
    vfx: { trail: 'cleave_arc', impact: 'spark_heavy' },
  }),
  DAGGER: makeProfile('DAGGER', 'Dagger', {
    grip: grip1h({ scale: 0.85, offset: [0.01, 0.03, 0], rotation: [Math.PI * 0.55, 0, 0] }),
    wrist: { ...WRIST_1H, maxPitch: 0.7, spring: 0.45 },
    collider: colliderBlade(1.55, 0.28, 0.04),
    primaryForce: 'pierce',
    heavyForce: 'pull',
    forces: baseForces('pierce', 'pull', {
      pierce: { ...FORCE_PRESETS.pierce, applyStatusIds: ['bleeding'], statusStacks: 1 },
    }),
    damageScale: 0.75,
    staminaScale: 0.7,
    passiveIds: ['weapon_stack_bleed'],
    vfx: { trail: 'stab_line', impact: 'blood_dot' },
  }),
  SPEAR: makeProfile('SPEAR', 'Spear', {
    grip: grip1h({ offset: [0.03, 0.08, 0], rotation: [Math.PI * 0.45, 0, 0], scale: 1.15 }),
    wrist: WRIST_2H,
    collider: colliderPole(2.9),
    primaryForce: 'thrust',
    heavyForce: 'push',
    forces: baseForces('thrust', 'push'),
    damageScale: 1.05,
    staminaScale: 1.05,
    passiveIds: ['weapon_stack_pierce'],
    vfx: { trail: 'thrust_line', impact: 'pierce_hit' },
  }),
  GREATSWORD: makeProfile('GREATSWORD', 'Greatsword', {
    holsterClass: '2h_back',
    grip: grip1h({ offset: [0.03, 0.06, 0.02], rotation: [Math.PI * 0.5, 0.08, -0.12], scale: 1.2 }),
    wrist: WRIST_2H,
    collider: colliderBlade(2.55, 0.75, 0.07),
    primaryForce: 'cleave',
    heavyForce: 'knockup',
    forces: baseForces('cleave', 'knockup'),
    damageScale: 1.35,
    staminaScale: 1.4,
    passiveIds: ['weapon_stack_cleave'],
    vfx: { trail: 'great_arc', impact: 'spark_heavy' },
  }),
  HAMMER: makeProfile('HAMMER', 'Hammer', {
    grip: grip1h({ offset: [0.02, 0.05, 0.02], rotation: [Math.PI * 0.5, 0, -0.2], scale: 1.05 }),
    wrist: { ...WRIST_1H, maxRoll: 0.45 },
    collider: colliderBlunt(2.0),
    primaryForce: 'smash',
    heavyForce: 'knockup',
    forces: baseForces('smash', 'knockup', {
      smash: { ...FORCE_PRESETS.smash, applyStatusIds: ['stunned'], statusStacks: 1 },
    }),
    damageScale: 1.25,
    staminaScale: 1.3,
    passiveIds: ['weapon_stack_crush'],
    vfx: { trail: 'blunt_arc', impact: 'ground_thud' },
  }),
  MACE: makeProfile('MACE', 'Mace', {
    grip: grip1h(),
    wrist: WRIST_1H,
    collider: colliderBlunt(1.95),
    primaryForce: 'smash',
    heavyForce: 'push',
    forces: baseForces('smash', 'push'),
    damageScale: 1.1,
    staminaScale: 1.15,
    passiveIds: ['weapon_stack_crush'],
    vfx: { trail: 'blunt_arc', impact: 'spark_heavy' },
  }),
  SCYTHE: makeProfile('SCYTHE', 'Scythe', {
    holsterClass: '2h_back',
    grip: grip1h({ offset: [0.04, 0.1, 0], rotation: [Math.PI * 0.4, 0.2, -0.3], scale: 1.15 }),
    wrist: WRIST_2H,
    collider: {
      shape: 'capsule',
      center: [0.15, 0.7, 0],
      size: [0.08, 0.5, 0.08],
      reachM: 2.6,
      arcHalfRad: 1.1,
      heightBiasM: 1.0,
    },
    primaryForce: 'cleave',
    heavyForce: 'back_uppercut',
    forces: baseForces('cleave', 'back_uppercut', {
      cleave: { ...FORCE_PRESETS.cleave, applyStatusIds: ['bleeding'], statusStacks: 1 },
    }),
    damageScale: 1.2,
    staminaScale: 1.25,
    passiveIds: ['weapon_stack_bleed'],
    vfx: { trail: 'scythe_arc', impact: 'blood_dot' },
  }),
  BOW: makeProfile('BOW', 'Bow', {
    holsterClass: 'bow_back',
    grip: { offset: [0, 0.05, 0], rotation: [0, Math.PI * 0.5, 0], scale: 1, leftHand: true },
    wrist: WRIST_BOW,
    collider: {
      shape: 'box',
      center: [0, 0.3, 0],
      size: [0.08, 0.45, 0.08],
      reachM: 18,
      arcHalfRad: 0.08,
      heightBiasM: 1.35,
    },
    primaryForce: 'shot',
    heavyForce: 'pierce',
    forces: baseForces('shot', 'pierce'),
    damageScale: 1,
    staminaScale: 0.85,
    passiveIds: ['weapon_stack_precision'],
    vfx: { trail: 'arrow_trail', impact: 'arrow_hit' },
  }),
  CROSSBOW: makeProfile('CROSSBOW', 'Crossbow', {
    holsterClass: 'bow_back',
    grip: grip1h({ rotation: [Math.PI * 0.35, 0, 0] }),
    wrist: WRIST_1H,
    collider: {
      shape: 'box',
      center: [0, 0.25, 0.1],
      size: [0.12, 0.2, 0.2],
      reachM: 16,
      arcHalfRad: 0.06,
      heightBiasM: 1.3,
    },
    primaryForce: 'shot',
    heavyForce: 'pierce',
    forces: baseForces('shot', 'pierce'),
    damageScale: 1.1,
    staminaScale: 0.9,
    passiveIds: ['weapon_stack_precision'],
    vfx: { trail: 'bolt_trail', impact: 'arrow_hit' },
  }),
  GUN: makeProfile('GUN', 'Gun', {
    grip: grip1h({ rotation: [Math.PI * 0.35, 0, 0] }),
    wrist: WRIST_1H,
    collider: {
      shape: 'box',
      center: [0, 0.2, 0.15],
      size: [0.06, 0.15, 0.25],
      reachM: 22,
      arcHalfRad: 0.05,
      heightBiasM: 1.35,
    },
    primaryForce: 'shot',
    heavyForce: 'push',
    forces: baseForces('shot', 'push'),
    damageScale: 1.2,
    staminaScale: 0.8,
    passiveIds: [],
    vfx: { trail: 'muzzle', impact: 'bullet_hit' },
  }),
  STAFF: makeProfile('STAFF', 'Staff', {
    holsterClass: '2h_back',
    grip: grip1h({ offset: [0.02, 0.1, 0], rotation: [Math.PI * 0.4, 0, 0], scale: 1.15 }),
    wrist: WRIST_2H,
    collider: colliderPole(2.4),
    primaryForce: 'cast',
    heavyForce: 'knockup',
    forces: baseForces('cast', 'knockup', {
      cast: { ...FORCE_PRESETS.cast, applyStatusIds: ['shocked'], statusStacks: 1 },
    }),
    damageScale: 1.05,
    staminaScale: 0.95,
    passiveIds: ['weapon_stack_arcane'],
    vfx: { cast: 'arcane_cast', impact: 'arcane_burst' },
  }),
  WAND: makeProfile('WAND', 'Wand', {
    holsterClass: 'belt_tool',
    grip: grip1h({ scale: 0.75, offset: [0.01, 0.04, 0] }),
    wrist: WRIST_1H,
    collider: {
      shape: 'sphere',
      center: [0, 0.25, 0],
      size: [0.08, 0.08, 0.08],
      reachM: 12,
      arcHalfRad: 0.2,
      heightBiasM: 1.35,
    },
    primaryForce: 'cast',
    heavyForce: 'pull',
    forces: baseForces('cast', 'pull'),
    damageScale: 0.95,
    staminaScale: 0.75,
    passiveIds: ['weapon_stack_arcane'],
    vfx: { cast: 'wand_bolt', impact: 'arcane_burst' },
  }),
  TOME: makeProfile('TOME', 'Tome', {
    holsterClass: 'belt_tool',
    grip: { offset: [0.02, 0.06, 0.02], rotation: [0.2, 0, 0], scale: 0.9, leftHand: true },
    wrist: WRIST_1H,
    collider: {
      shape: 'box',
      center: [0, 0.1, 0],
      size: [0.12, 0.15, 0.05],
      reachM: 10,
      arcHalfRad: 0.4,
      heightBiasM: 1.3,
    },
    primaryForce: 'cast',
    heavyForce: 'push',
    forces: baseForces('cast', 'push'),
    damageScale: 0.9,
    staminaScale: 0.7,
    passiveIds: ['weapon_stack_arcane'],
    vfx: { cast: 'tome_glyph', impact: 'arcane_burst' },
  }),
  SHIELD: makeProfile('SHIELD', 'Shield', {
    holsterClass: 'shield_back',
    grip: { offset: [0.02, 0.05, 0.04], rotation: [0, Math.PI * 0.5, 0], scale: 1, leftHand: true },
    wrist: { ...WRIST_1H, biasEuler: [0, 0.4, 0] },
    collider: {
      shape: 'box',
      center: [0, 0.15, 0.05],
      size: [0.25, 0.3, 0.08],
      reachM: 1.4,
      arcHalfRad: 1.2,
      heightBiasM: 1.1,
    },
    primaryForce: 'push',
    heavyForce: 'smash',
    forces: baseForces('push', 'smash'),
    damageScale: 0.5,
    staminaScale: 1.1,
    passiveIds: ['weapon_stack_guard'],
    vfx: { impact: 'shield_bash' },
  }),
  FIST: makeProfile('FIST', 'Fist', {
    holsterClass: 'none',
    grip: grip1h({ scale: 0.6, offset: [0, 0.02, 0.04] }),
    wrist: { ...WRIST_1H, maxPitch: 0.9, spring: 0.5 },
    collider: {
      shape: 'sphere',
      center: [0, 0.08, 0.08],
      size: [0.1, 0.1, 0.1],
      reachM: 1.45,
      arcHalfRad: 0.6,
      heightBiasM: 1.25,
    },
    primaryForce: 'uppercut',
    heavyForce: 'back_uppercut',
    forces: baseForces('uppercut', 'back_uppercut'),
    damageScale: 0.85,
    staminaScale: 0.85,
    passiveIds: ['weapon_stack_crush'],
    vfx: { impact: 'fist_hit' },
  }),
  WHIP: makeProfile('WHIP', 'Whip', {
    grip: grip1h({ offset: [0.02, 0.04, 0], rotation: [Math.PI * 0.55, 0, 0] }),
    wrist: { ...WRIST_1H, maxPitch: 0.85 },
    collider: {
      shape: 'capsule',
      center: [0, 0.9, 0],
      size: [0.04, 0.7, 0.04],
      reachM: 3.2,
      arcHalfRad: 1.0,
      heightBiasM: 1.1,
    },
    primaryForce: 'pull',
    heavyForce: 'slash',
    forces: baseForces('pull', 'slash', {
      pull: { ...FORCE_PRESETS.pull, applyStatusIds: ['snared'], statusStacks: 1 },
    }),
    damageScale: 0.9,
    staminaScale: 0.95,
    passiveIds: [],
    vfx: { trail: 'whip_crack', impact: 'lash_hit' },
  }),
};

// ── Weapon passives (stacking — status ids applied as buffs while equipped) ─

export interface WeaponPassiveDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Status applied to self or on-hit target */
  onHitStatusId?: string;
  onEquipStatusId?: string;
  stacksPerHit: number;
  maxStacks: number;
  /** Hits required to proc empowered next skill */
  primeEvery: number;
}

export const WEAPON_PASSIVES: Record<string, WeaponPassiveDef> = {
  weapon_stack_slash: {
    id: 'weapon_stack_slash',
    name: 'Edge Stacks',
    description: 'Each slash builds Edge. At 3 stacks next skill-1 is empowered.',
    icon: '/icons/misc/Slash_07.png',
    onHitStatusId: 'bleeding',
    stacksPerHit: 1,
    maxStacks: 5,
    primeEvery: 3,
  },
  weapon_stack_cleave: {
    id: 'weapon_stack_cleave',
    name: 'Cleave Momentum',
    description: 'Wide hits build Momentum. 5 stacks → next heavy knocks up.',
    icon: '/icons/misc/Firestar.png',
    stacksPerHit: 1,
    maxStacks: 5,
    primeEvery: 5,
  },
  weapon_stack_bleed: {
    id: 'weapon_stack_bleed',
    name: 'Deep Cuts',
    description: 'Hits apply Bleeding (stacks).',
    icon: '/icons/misc/Loot_27.png',
    onHitStatusId: 'bleeding',
    stacksPerHit: 1,
    maxStacks: 5,
    primeEvery: 3,
  },
  weapon_stack_pierce: {
    id: 'weapon_stack_pierce',
    name: 'Piercing Line',
    description: 'Thrusts ignore a portion of armor; stacks Precision.',
    icon: '/icons/misc/Core.png',
    onHitStatusId: 'precision',
    stacksPerHit: 1,
    maxStacks: 3,
    primeEvery: 3,
  },
  weapon_stack_crush: {
    id: 'weapon_stack_crush',
    name: 'Crushing Blows',
    description: 'Blunt hits chance to Stun; builds Crush stacks.',
    icon: '/icons/misc/Glow.png',
    onHitStatusId: 'stunned',
    stacksPerHit: 1,
    maxStacks: 3,
    primeEvery: 3,
  },
  weapon_stack_precision: {
    id: 'weapon_stack_precision',
    name: 'Marksman Stacks',
    description: 'Shots build Precision. At 3, next shot always applies poison/mark.',
    icon: '/icons/misc/Core.png',
    onHitStatusId: 'precision',
    stacksPerHit: 1,
    maxStacks: 3,
    primeEvery: 3,
  },
  weapon_stack_arcane: {
    id: 'weapon_stack_arcane',
    name: 'Arcane Charge',
    description: 'Casts build Arcane Charge. Empowers next skill.',
    icon: '/icons/misc/AquaCircle.png',
    onEquipStatusId: 'empowered',
    stacksPerHit: 1,
    maxStacks: 5,
    primeEvery: 3,
  },
  weapon_stack_guard: {
    id: 'weapon_stack_guard',
    name: 'Guard Rhythm',
    description: 'Blocks and bashes build Guard. Perfect Counter when primed.',
    icon: '/icons/weapons/shield_01.png',
    onEquipStatusId: 'shielded',
    stacksPerHit: 1,
    maxStacks: 3,
    primeEvery: 3,
  },
};

// ── API ──────────────────────────────────────────────────────────────────────

export function normalizeWeaponTypeId(raw: string): string {
  const t = (raw || 'SWORD').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (WEAPON_COMBAT_PROFILES[t]) return t;
  // common aliases
  if (t.includes('GREAT') && t.includes('SWORD')) return 'GREATSWORD';
  if (t.includes('GREAT') && t.includes('AXE')) return 'AXE';
  if (t === 'LONGBOW') return 'BOW';
  if (t === 'MAGIC') return 'STAFF';
  if (t === '1HSWORD' || t === 'SWORD1H') return 'SWORD';
  return 'SWORD';
}

export function getWeaponCombatProfile(weaponTypeId: string): WeaponCombatProfile {
  const id = normalizeWeaponTypeId(weaponTypeId);
  return WEAPON_COMBAT_PROFILES[id] ?? WEAPON_COMBAT_PROFILES.SWORD;
}

export function getForceImpulse(
  profile: WeaponCombatProfile,
  pattern: ForcePatternId,
): ForceImpulse {
  return profile.forces[pattern] ?? FORCE_PRESETS[pattern] ?? FORCE_PRESETS.slash;
}

/**
 * Resolve world-space impulse vector for a hit.
 * attackerForwardXZ should be unit vector on XZ plane.
 */
export function resolveHitImpulse(
  pattern: ForcePatternId,
  profile: WeaponCombatProfile,
  attackerForwardXZ: { x: number; z: number },
): { vx: number; vy: number; vz: number; applyStatusIds: string[]; statusStacks: number; staggerChance: number } {
  const f = getForceImpulse(profile, pattern);
  const fx = attackerForwardXZ.x;
  const fz = attackerForwardXZ.z;
  let vx = fx * f.push - fx * f.pull;
  let vz = fz * f.push - fz * f.pull;
  let vy = f.knockUp + f.uppercut * 0.65;
  if (pattern === 'back_uppercut') {
    // Lift then slight reverse (into the arc)
    vx = -fx * Math.abs(f.push) + fx * f.pull * 0.3;
    vz = -fz * Math.abs(f.push) + fz * f.pull * 0.3;
    vy = f.knockUp + f.uppercut;
  }
  return {
    vx,
    vy,
    vz,
    applyStatusIds: f.applyStatusIds,
    statusStacks: f.statusStacks,
    staggerChance: f.staggerChance,
  };
}

/** Mutable editor update (Combat Lab) */
export function updateWeaponCombatProfile(
  weaponTypeId: string,
  partial: Partial<WeaponCombatProfile>,
): WeaponCombatProfile {
  const id = normalizeWeaponTypeId(weaponTypeId);
  const cur = WEAPON_COMBAT_PROFILES[id] ?? WEAPON_COMBAT_PROFILES.SWORD;
  const next = {
    ...cur,
    ...partial,
    grip: { ...cur.grip, ...partial.grip },
    wrist: { ...cur.wrist, ...partial.wrist },
    collider: { ...cur.collider, ...partial.collider },
    forces: { ...cur.forces, ...partial.forces },
    vfx: { ...cur.vfx, ...partial.vfx },
  };
  WEAPON_COMBAT_PROFILES[id] = next;
  return next;
}

export const FORCE_PATTERN_LIST: { id: ForcePatternId; label: string; description: string }[] = [
  { id: 'slash', label: 'Slash', description: 'Horizontal edge cut with light push' },
  { id: 'thrust', label: 'Thrust', description: 'Forward pierce, high push' },
  { id: 'smash', label: 'Smash', description: 'Overhead blunt — stun chance' },
  { id: 'push', label: 'Push', description: 'Strong planar knockback' },
  { id: 'pull', label: 'Pull', description: 'Yank target toward attacker' },
  { id: 'knockup', label: 'Knock Up', description: 'Launch airborne' },
  { id: 'uppercut', label: 'Uppercut', description: 'Rising strike + lift' },
  { id: 'back_uppercut', label: 'Back Uppercut', description: 'Pull into rising reverse arc' },
  { id: 'cleave', label: 'Cleave', description: 'Wide arc multi-target feel' },
  { id: 'pierce', label: 'Pierce', description: 'Armor line + bleed' },
  { id: 'shot', label: 'Shot', description: 'Ranged projectile impulse' },
  { id: 'cast', label: 'Cast', description: 'Spell impact impulse' },
];

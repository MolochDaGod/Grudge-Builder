/**
 * Weapon Attach / Holster SSOT — CANONICAL
 *
 * Weapons hang on body sockets when not in combat readiness:
 *   - 1H melee / shield  → hip_r / hip_l (side scabbard)
 *   - 2H melee / staff   → quiver_back / Bone_bag (back scabbard)
 *   - Bow / crossbow     → Quiver_container + quiver utility
 *   - Wand / grimoire    → hip_r_belt (shared with CAST_TOOL_ATTACH)
 *
 * Transitions:
 *   Z key (player)     → toggle draw / holster anytime (except forced contexts)
 *   climb attach / edge grab / swim-to-edge → auto holster (hands free)
 *   enter build mode   → auto holster (hands free for Build Hammer)
 *   attack while sheathed → auto draw then swing (gameplay convenience)
 *   Tab / control mode does NOT draw or holster weapons
 *   water free-swim may keep weapons drawn until near climb edge
 */

import { CAST_TOOL_ATTACH } from './grimoireCastSystem';

// ── Socket ids (logical — mapped to GLB bone names at runtime) ───────────────

export type SheathSocketId =
  | 'hand_r'
  | 'hand_l'
  | 'hip_r'
  | 'hip_l'
  | 'hip_r_belt'
  | 'quiver_back'
  | 'back_bag'
  | 'cast_float';

/** GLB bone / container name candidates per logical socket */
export const SOCKET_BONE_CANDIDATES: Record<SheathSocketId, string[]> = {
  hand_r: ['R_hand_container', 'RightHand', 'mixamorig:RightHand', 'Hand_R', 'hand_r'],
  hand_l: ['L_hand_container', 'LeftHand', 'mixamorig:LeftHand', 'Hand_L', 'hand_l'],
  hip_r: ['hip_r_belt', 'Hip_R', 'mixamorig:RightUpLeg', 'RightUpLeg', 'pelvis'],
  hip_l: ['hip_l_belt', 'Hip_L', 'mixamorig:LeftUpLeg', 'LeftUpLeg', 'pelvis'],
  hip_r_belt: ['hip_r_belt', 'R_hand_container', 'Hip_R', 'mixamorig:Hips', 'Hips', 'pelvis'],
  quiver_back: ['Quiver_container', 'Bone_bag', 'Spine2', 'mixamorig:Spine2', 'Chest'],
  back_bag: ['Bone_bag', 'Quiver_container', 'Spine2', 'mixamorig:Spine2', 'Chest'],
  cast_float: ['R_hand_container', 'Spine2', 'mixamorig:Spine2', 'Chest'],
};

// ── Holster class (where the weapon hangs) ───────────────────────────────────

export type HolsterClass =
  | '1h_hip'       // swords, axes, hammers 1h, daggers → right hip
  | '1h_hip_l'     // offhand / dual left
  | 'shield_back'  // shield on back when holstered (or hip_l)
  | '2h_back'      // great weapons, spears, staves → back
  | 'bow_back'     // bow / crossbow → quiver back
  | 'belt_tool'    // wand / grimoire → hip belt
  | 'none';         // unarmed / nothing to move

/** Map WeaponType string (modelManifest / fleet) → holster class */
export function holsterClassForWeaponType(weaponType: string): HolsterClass {
  const wt = (weaponType || 'unarmed').toLowerCase();
  if (wt === 'unarmed') return 'none';
  if (wt.includes('bow') || wt === 'crossbow' || wt === 'longbow' || wt === 'gun') return 'bow_back';
  if (wt.includes('tome') || wt === 'wand' || wt === 'magic') return 'belt_tool';
  if (
    wt.includes('staff') ||
    wt.includes('great') ||
    wt === 'spear' ||
    wt === 'hammer2h' ||
    wt === 'greataxe' ||
    wt === 'greatsword'
  ) {
    return '2h_back';
  }
  if (wt.includes('shield')) return 'shield_back';
  // 1h melee default
  return '1h_hip';
}

/** Mesh slot names from Grudge6 equipment → holster class */
export function holsterClassForMeshSlot(slot: string): HolsterClass {
  const s = slot.toLowerCase();
  if (s === 'bow') return 'bow_back';
  if (s === 'staff' || s === 'spear') return '2h_back';
  if (s === 'shield') return 'shield_back';
  if (s === 'sword' || s === 'axe' || s === 'hammer' || s === 'pick' || s === 'dagger') return '1h_hip';
  return '1h_hip';
}

export interface SocketPose {
  socket: SheathSocketId;
  /** Local offset on socket */
  offset: [number, number, number];
  /** Euler XYZ radians */
  rotation: [number, number, number];
  scale?: number;
}

export interface HolsterProfile {
  class: HolsterClass;
  drawn: SocketPose;
  holstered: SocketPose;
  /** Prefer draw clip when entering combat */
  drawAnim: 'draw' | 'idle';
  /** Prefer sheath motion when leaving combat (reuses draw reversed feel via fade) */
  holsterAnim: 'draw' | 'idle';
  transitionSec: number;
}

const HAND_R: SocketPose = {
  socket: 'hand_r',
  offset: [0, 0, 0],
  rotation: [0, 0, 0],
};

const HAND_L: SocketPose = {
  socket: 'hand_l',
  offset: [0, 0, 0],
  rotation: [0, 0, 0],
};

export const HOLSTER_PROFILES: Record<HolsterClass, HolsterProfile> = {
  none: {
    class: 'none',
    drawn: HAND_R,
    holstered: HAND_R,
    drawAnim: 'idle',
    holsterAnim: 'idle',
    transitionSec: 0,
  },
  '1h_hip': {
    class: '1h_hip',
    drawn: HAND_R,
    holstered: {
      socket: 'hip_r',
      offset: [0.12, 0.05, 0.02],
      rotation: [0, 0, Math.PI * 0.55],
      scale: 1,
    },
    drawAnim: 'draw',
    holsterAnim: 'draw',
    transitionSec: 0.45,
  },
  '1h_hip_l': {
    class: '1h_hip_l',
    drawn: HAND_L,
    holstered: {
      socket: 'hip_l',
      offset: [-0.12, 0.05, 0.02],
      rotation: [0, 0, -Math.PI * 0.55],
    },
    drawAnim: 'draw',
    holsterAnim: 'draw',
    transitionSec: 0.45,
  },
  shield_back: {
    class: 'shield_back',
    drawn: HAND_L,
    holstered: {
      socket: 'back_bag',
      offset: [-0.15, 0.1, -0.18],
      rotation: [0, Math.PI * 0.5, 0],
    },
    drawAnim: 'draw',
    holsterAnim: 'draw',
    transitionSec: 0.4,
  },
  '2h_back': {
    class: '2h_back',
    drawn: HAND_R,
    holstered: {
      socket: 'quiver_back',
      offset: [0.05, 0.15, -0.22],
      rotation: [0, 0, Math.PI * 0.15],
    },
    drawAnim: 'draw',
    holsterAnim: 'draw',
    transitionSec: 0.55,
  },
  bow_back: {
    class: 'bow_back',
    drawn: HAND_L,
    holstered: {
      socket: 'quiver_back',
      offset: [0.08, 0.12, -0.2],
      rotation: [0, Math.PI * 0.1, Math.PI * 0.05],
    },
    drawAnim: 'draw',
    holsterAnim: 'draw',
    transitionSec: 0.5,
  },
  belt_tool: {
    class: 'belt_tool',
    drawn: {
      socket: CAST_TOOL_ATTACH.readySocketWand === 'hand_r' ? 'hand_r' : 'cast_float',
      offset: [0, 0.05, 0],
      rotation: [0, 0, 0],
    },
    holstered: {
      socket: CAST_TOOL_ATTACH.idleSocket,
      offset: [0.14, 0.02, 0.04],
      rotation: [0.2, 0.4, 0.1],
    },
    drawAnim: 'draw',
    holsterAnim: 'draw',
    transitionSec: 0.35,
  },
};

// ── When weapons must be holstered ───────────────────────────────────────────

export type HolsterReason =
  | 'player_toggle'   // Z put-away
  | 'enter_build'     // auto — hands free for hammer
  | 'enter_harvest'   // auto — sheath combat weapons, equip harvest tool
  | 'climb_attach'    // auto
  | 'edge_grab'       // auto
  | 'swim_to_edge'    // auto
  | 'forced';

export type DrawReason =
  | 'player_toggle'   // Z pull-out
  | 'auto_attack'     // LMB / skill while sheathed
  | 'leave_build'     // restore prior preference
  | 'leave_harvest'   // restore prior preference after harvest
  | 'forced';

/**
 * Contexts that force weapons holstered (player cannot draw with Z until free).
 * Climbing / edge grab / harvest tools / active build hammer.
 */
export function isForcedHolsterContext(opts: {
  movementState: string;
  controlMode: 'harvest' | 'combat' | 'build';
}): boolean {
  if (opts.movementState === 'climbing') return true;
  if (opts.controlMode === 'build') return true;
  // Harvest owns hands (hatchet / pick / knife / rod / hammer) — combat weapons stay sheathed
  if (opts.controlMode === 'harvest') return true;
  return false;
}

/** @deprecated Control mode no longer drives draw state — kept for callers */
export function shouldWeaponsBeDrawn(_controlMode: 'harvest' | 'combat' | 'build'): boolean {
  return false;
}

/** Hotkey for manual sheath / draw (not Tab, not combat mode) */
export const WEAPON_TOGGLE_KEY = 'z' as const;

// ── Climb / Conan-style locomotion SSOT ──────────────────────────────────────

export interface ClimbRules {
  /** Hold Space near climbable surface to attach */
  attachKey: ' ';
  /** Detach key while climbing */
  detachKey: 'x';
  /** Min hold time on Space before attach (seconds) — 0 = immediate on press while near wall */
  attachHoldSec: number;
  /** Max ray distance to detect climbable wall (m) */
  wallDetectDist: number;
  /** Max wall normal Y (near vertical) */
  climbableMaxNormalY: number;
  /** Vertical climb speed m/s (W/S) */
  climbSpeedVertical: number;
  /** Lateral shimmy speed m/s (A/D) */
  climbSpeedLateral: number;
  /** Pull body toward wall (m) */
  wallStickDistance: number;
  /** Stamina cost per second while on wall (always, even idle hang) */
  staminaDrainPerSec: number;
  /** Extra drain mult while actively moving on wall */
  moveDrainMult: number;
  /** No stamina regen while climbing (Conan Exiles style) */
  blockStaminaRegen: boolean;
  /** Drop off wall when stamina hits 0 */
  detachOnStaminaEmpty: boolean;
  /** Force holster before climb attach */
  holsterBeforeClimb: boolean;
  /** Holster duration when quick-sheathing for climb / edge */
  quickHolsterSec: number;
  /** Distance to edge (water→land climb) that triggers swim-edge quick holster */
  swimEdgeHolsterDist: number;
}

export const CLIMB_RULES: ClimbRules = {
  attachKey: ' ',
  detachKey: 'x',
  attachHoldSec: 0.12,
  wallDetectDist: 2.0,
  climbableMaxNormalY: 0.35,
  climbSpeedVertical: 2.8,
  climbSpeedLateral: 2.2,
  wallStickDistance: 0.45,
  staminaDrainPerSec: 8,
  moveDrainMult: 1.35,
  blockStaminaRegen: true,
  detachOnStaminaEmpty: true,
  holsterBeforeClimb: true,
  quickHolsterSec: 0.22,
  swimEdgeHolsterDist: 3.5,
};

export const STAMINA_LOCOMOTION = {
  /** Base regen /s when free (not climbing, not exhausted sprint) */
  regenPerSec: 12,
  /** Delay after drain before regen starts */
  regenDelaySec: 0.8,
  maxStamina: 100,
  /** Swim drain (existing feel) */
  swimDrainPerSec: 5,
} as const;

/**
 * HitResponseSystem — stun, knockback, knock-up, hit-react anim, impact VFX.
 *
 * Production SSOT for every weapon skill hit / creature strike:
 *   1. Resolve HitResponse from skill flags + damage
 *   2. Play hit-react / air / land anim keys
 *   3. Apply horizontal knockback + optional Y knock-up (CCT desired movement or impulse)
 *   4. WorldFx impact + camera punch hook
 *
 * Pair with ProductionSkillCombatRuntime.onHit and CharacterController3D.
 * Rapier: use applyRapierImpulse when PhysicsWorld body is available.
 *
 * SI meters · fixed-step friendly (apply once per hit, not per frame).
 */

import * as THREE from 'three';
import type { ProductionSkillCombatDef } from '@shared/definitions/weaponSkillCombatCatalog';
import type { SkillHitEvent } from './ProductionSkillCombatRuntime';

// ── Response tiers ───────────────────────────────────────────────────────────

export type HitReactAnim =
  | 'hit_light'
  | 'hit_heavy'
  | 'hit_air'
  | 'knockup_rise'
  | 'knockup_fall'
  | 'knockup_land'
  | 'stun_loop'
  | 'death';

export interface HitResponse {
  /** Horizontal push (m/s impulse-like) */
  knockback: number;
  /** Upward launch (m/s) — 0 = grounded only */
  knockUp: number;
  /** Stun / hit-stop lockout (seconds) */
  stunSec: number;
  /** Which anim one-shot to fire first */
  anim: HitReactAnim;
  /** Impact VFX scale */
  impactScale: number;
  /** Camera punch 0–1 */
  cameraPunch: number;
  /** Direction of knockback (world XZ unit); set by system */
  dir: THREE.Vector3;
}

export interface HitResponseTarget {
  id: string;
  position: THREE.Vector3;
  /** Optional root for VFX attach */
  object?: THREE.Object3D;
  /** If set, Y velocity is added for air state */
  velocity?: THREE.Vector3;
  /** Grounded before hit */
  grounded?: boolean;
  /** Mass scale — heavier → less knockback (default 1) */
  massScale?: number;
  /** Invuln / super armor */
  armor?: number;
}

export interface HitResponseHost {
  /** Play one-shot anim on victim */
  playAnim?: (targetId: string, anim: HitReactAnim, fade?: number) => void;
  /** Apply displacement / velocity (CCT or kinematic) */
  applyMotion?: (targetId: string, deltaVel: THREE.Vector3, stunSec: number) => void;
  /** Optional Rapier impulse on dynamic body */
  applyImpulse?: (targetId: string, impulse: THREE.Vector3, point?: THREE.Vector3) => void;
  /** Impact VFX */
  spawnImpact?: (point: THREE.Vector3, scale: number, school?: string) => void;
  /** Camera */
  cameraPunch?: (strength: number) => void;
}

// ── Catalog helpers ──────────────────────────────────────────────────────────

const KNOCKUP_FX = /knock.?up|launch|sky|aerial|uppercut|lift|juggle|cyclone|whirlwind|geyser/i;
const KNOCKBACK_FX = /knock.?back|blast|slam|shockwave|cleave|bash|charge|ram|cannon/i;
const HEAVY_FX = /heavy|crush|execute|finisher|ultimate|apocalypse|demon|wrath/i;

/**
 * Derive hit response from skill combat def + hit event.
 * Uses stunSec / damage / effect keywords from catalog.
 */
export function resolveHitResponse(
  skill: ProductionSkillCombatDef,
  hit: SkillHitEvent,
  attackerPos: THREE.Vector3,
  targetPos: THREE.Vector3,
): HitResponse {
  const effects = (skill.effects ?? []).join(' ');
  const blob = `${skill.name} ${skill.description} ${effects} ${skill.vfxKey}`;

  const dir = new THREE.Vector3(
    targetPos.x - attackerPos.x,
    0,
    targetPos.z - attackerPos.z,
  );
  if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
  else dir.normalize();

  const dmg = hit.damage;
  const baseKb = Math.min(14, 2.2 + dmg * 0.045 + skill.stunSec * 1.8);
  let knockback = baseKb;
  let knockUp = 0;
  let anim: HitReactAnim = dmg > 40 || HEAVY_FX.test(blob) ? 'hit_heavy' : 'hit_light';
  let impactScale = 1.2 + Math.min(2.5, dmg * 0.02);
  let cameraPunch = dmg > 50 ? 0.45 : dmg > 25 ? 0.22 : 0.1;

  if (KNOCKUP_FX.test(blob) || skill.style === 'melee' && skill.dashMeters > 2.5) {
    knockUp = Math.min(12, 4.5 + dmg * 0.035 + skill.stunSec * 2.5);
    knockback *= 0.55;
    anim = 'knockup_rise';
    impactScale *= 1.25;
    cameraPunch = Math.max(cameraPunch, 0.35);
  } else if (KNOCKBACK_FX.test(blob)) {
    knockback = Math.min(18, baseKb * 1.55);
    anim = 'hit_heavy';
  }

  if (hit.isExecute) {
    knockback *= 1.35;
    knockUp = Math.max(knockUp, 3.5);
    anim = knockUp > 0 ? 'knockup_rise' : 'hit_heavy';
    cameraPunch = Math.max(cameraPunch, 0.55);
  }

  // Stun from skill; heavy hits add floor
  let stunSec = Math.max(hit.stunSec, skill.stunSec);
  if (HEAVY_FX.test(blob)) stunSec = Math.max(stunSec, 0.35);
  if (knockUp > 0) stunSec = Math.max(stunSec, 0.45);

  return {
    knockback,
    knockUp,
    stunSec,
    anim,
    impactScale,
    cameraPunch,
    dir,
  };
}

/**
 * Apply response to a target via host adapters.
 * Call once per SkillHitEvent from ProductionSkillCombatRuntime.onHit.
 */
export function applyHitResponse(
  host: HitResponseHost,
  target: HitResponseTarget,
  response: HitResponse,
  opts?: { school?: string; useRapierImpulse?: boolean },
): void {
  const mass = Math.max(0.25, target.massScale ?? 1);
  const armor = Math.max(0, Math.min(0.9, target.armor ?? 0));
  const scale = (1 - armor) / mass;

  const kb = response.knockback * scale;
  const ku = response.knockUp * scale;
  const delta = response.dir.clone().multiplyScalar(kb);
  delta.y = ku;

  host.playAnim?.(target.id, response.anim, 0.08);
  host.applyMotion?.(target.id, delta, response.stunSec * (1 - armor * 0.5));

  if (opts?.useRapierImpulse && host.applyImpulse) {
    // Impulse ≈ Δv * mass proxy
    const impulse = delta.clone().multiplyScalar(mass * 12);
    host.applyImpulse(target.id, impulse, target.position);
  }

  host.spawnImpact?.(
    target.position.clone().add(new THREE.Vector3(0, 1.1, 0)),
    response.impactScale,
    opts?.school,
  );
  host.cameraPunch?.(response.cameraPunch * scale);
}

/**
 * Per-frame follow-up for airborne knock-up victims (anim stages).
 * Call while target.velocity.y > 0.15 or falling after launch.
 */
export function knockUpAnimPhase(
  vy: number,
  airborneTime: number,
): HitReactAnim {
  if (airborneTime < 0.12) return 'knockup_rise';
  if (vy > 0.5) return 'hit_air';
  if (vy > -1.5) return 'knockup_fall';
  return 'knockup_land';
}

/** Fleet rules checklist for agents */
export const HIT_RESPONSE_RULES = [
  'Apply hit response once per hit window — not every frame',
  'Knock-up: set Y velocity + airborne anim; cancel ground CCT snap while airborne',
  'Knockback dir = target - attacker on XZ (never pure Y)',
  'Heavier massScale / armor reduce push; super armor can zero motion',
  'Prefer CCT desired movement delta for kinematic players; Rapier impulse for dynamic props/NPCs',
  'Stun locks skill input; allow tech window after land (recovery)',
  'Camera punch scaled by damage tier — never permanent FOV change',
  'SI meters: knockback ~2–18 m/s scale, knock-up ~0–12 m/s',
] as const;

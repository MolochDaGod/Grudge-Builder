/**
 * ProductionSkillCombatRuntime — unique combat for every weapon skill.
 *
 * Pipeline (realistic fight game feel):
 *   1. Resolve ProductionSkillCombatDef (catalog from weaponSkillsNew)
 *   2. Range / facing gate (unless dash/ignore)
 *   3. Start cooldown + spend mana
 *   4. Play anim one-shot (orchestrator)
 *   5. Schedule hit window(s) after windup
 *   6. Melee: sphere/arc/line collider query → damage + VFX
 *   7. Ranged/magic: spawn projectile → impact VFX + damage
 *   8. Dash / buff / summon side effects
 *
 * Integrates: soft-lock target, WorldFxBus supernova, ScriptableSkillRuntime pulse.
 */

import * as THREE from 'three';
import {
  getProductionSkillCombat,
  ensureWeaponSkillCombatCatalog,
  type ProductionSkillCombatDef,
} from '@shared/definitions/weaponSkillCombatCatalog';
import {
  distXZ,
  angleToTargetDeg,
  inMeleeRange,
} from '@shared/definitions/productionWeaponCombat';
import { spawnSupernovaImpact } from '../vfx/SupernovaImpactSystem';
import type { WorldFxBus } from '../vfx/WorldFxBus';

export interface CombatTarget {
  id: string;
  position: THREE.Vector3;
  /** Optional HP fraction 0–1 for execute */
  hpFrac?: number;
  /** Root object for attach */
  object?: THREE.Object3D;
}

export interface SkillCastContext {
  casterPos: THREE.Vector3;
  /** Radians yaw facing */
  casterYaw: number;
  /** Soft/hard lock preferred target */
  lockTarget: CombatTarget | null;
  /** All nearby hostiles for AoE */
  hostiles: CombatTarget[];
  weaponType?: string;
}

export interface SkillHitEvent {
  skillId: string;
  targetId: string;
  damage: number;
  damageType: string;
  point: THREE.Vector3;
  stunSec: number;
  lifesteal: number;
  isExecute: boolean;
}

export interface SkillCastResult {
  ok: boolean;
  reason?: string;
  skill?: ProductionSkillCombatDef;
  hits?: SkillHitEvent[];
}

type OnAnim = (animKey: string, skill: ProductionSkillCombatDef) => void;
type OnHit = (hit: SkillHitEvent, skill: ProductionSkillCombatDef) => void;
type OnDash = (meters: number, yaw: number) => void;
type OnBuff = (skill: ProductionSkillCombatDef) => void;

interface Flight {
  mesh: THREE.Object3D;
  t: number;
  duration: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  skill: ProductionSkillCombatDef;
  targetId: string | null;
  damage: number;
}

const MAX_FLIGHTS = 64;
const _tmp = new THREE.Vector3();
const _fwd = new THREE.Vector3();

export class ProductionSkillCombatRuntime {
  private scene: THREE.Scene;
  private worldFx: WorldFxBus | null = null;
  private cooldowns = new Map<string, number>();
  private flights: Flight[] = [];
  private pendingTimers: Array<ReturnType<typeof setTimeout>> = [];
  private root = new THREE.Group();

  onAnim: OnAnim | null = null;
  onHit: OnHit | null = null;
  onDash: OnDash | null = null;
  onBuff: OnBuff | null = null;

  constructor(scene: THREE.Scene, worldFx?: WorldFxBus | null) {
    this.scene = scene;
    this.worldFx = worldFx ?? null;
    this.root.name = 'production_skill_projectiles';
    scene.add(this.root);
    ensureWeaponSkillCombatCatalog();
  }

  setWorldFx(fx: WorldFxBus | null) {
    this.worldFx = fx;
  }

  isReady(skillId: string, now = performance.now()): boolean {
    return now >= (this.cooldowns.get(skillId) ?? 0);
  }

  remainingCd(skillId: string, now = performance.now()): number {
    return Math.max(0, ((this.cooldowns.get(skillId) ?? 0) - now) / 1000);
  }

  /** Cooldown progress 0 ready → 1 just cast (for HUD). */
  cooldownProgress(skillId: string, skillCd: number, now = performance.now()): number {
    if (skillCd <= 0) return 0;
    const rem = this.remainingCd(skillId, now);
    return Math.min(1, rem / skillCd);
  }

  getDef(skillId: string): ProductionSkillCombatDef | null {
    return getProductionSkillCombat(skillId);
  }

  /**
   * Cast a production skill by id.
   */
  cast(skillId: string, ctx: SkillCastContext): SkillCastResult {
    const skill = getProductionSkillCombat(skillId);
    if (!skill) return { ok: false, reason: 'unknown_skill' };

    const now = performance.now();
    if (!this.isReady(skillId, now)) {
      return { ok: false, reason: 'cooldown', skill };
    }

    // Resolve primary target
    let target = ctx.lockTarget;
    if (skill.requiresTarget && !target) {
      target = this.nearestHostile(ctx.casterPos, ctx.hostiles, skill.range * 1.15);
    }

    // Range gate
    if (!skill.ignoreRangeGate && skill.hitCollider !== 'none' && skill.style !== 'buff' && skill.style !== 'defense' && skill.style !== 'summon') {
      if (skill.requiresTarget && target) {
        const d = distXZ(ctx.casterPos, target.position);
        if (d > skill.range + 0.35) {
          return { ok: false, reason: 'out_of_range', skill };
        }
        // Facing for melee (soft)
        if (skill.style === 'melee') {
          const ang = angleToTargetDeg(ctx.casterPos, ctx.casterYaw, target.position);
          if (ang > 110) {
            return { ok: false, reason: 'facing', skill };
          }
        }
      } else if (skill.requiresTarget && !target) {
        return { ok: false, reason: 'no_target', skill };
      }
    }

    // Commit CD
    this.cooldowns.set(skillId, now + skill.cooldown * 1000);

    // Anim
    this.onAnim?.(skill.animKey, skill);

    // Surrounding cast aura (dragon_koi multipack) for windup — multi color/shader by school
    // Auto-ends when cast duration finishes; cancel via endCastAura if interrupted.
    if (this.worldFx && skill.windup >= 0.12) {
      const castToken = this.worldFx.beginCastAura({
        position: ctx.casterPos.clone(),
        school: skill.school,
        damageType: skill.damageType,
        skillId: skill.id,
        vfxKey: skill.vfxKey,
        animKey: skill.animKey,
        windup: skill.windup,
        active: skill.active,
        recovery: skill.recovery,
      });
      const castMs = (skill.windup + skill.active + Math.min(skill.recovery, 0.35)) * 1000;
      const endTimer = setTimeout(() => {
        this.worldFx?.endCastAura(castToken);
      }, castMs);
      this.pendingTimers.push(endTimer);
    }

    // Dash / blink
    if (skill.dashMeters > 0) {
      let yaw = ctx.casterYaw;
      if (target) {
        const dx = target.position.x - ctx.casterPos.x;
        const dz = target.position.z - ctx.casterPos.z;
        yaw = Math.atan2(dx, dz);
      }
      this.onDash?.(skill.dashMeters, yaw);
      this.worldFx?.dashFootSmoke?.(ctx.casterPos, yaw);
      // CodePen trail ribbon along dash (KwaNNap trace style)
      if (this.worldFx) {
        const dashDir = new THREE.Vector3(-Math.sin(yaw), 0.05, -Math.cos(yaw));
        this.worldFx.spawnTrail(ctx.casterPos, dashDir, {
          length: 1.1,
          width: 0.12,
          life: 0.32,
          color: 0xcce8ff,
        });
      }
    }

    // Buff / defense / summon — immediate
    if (skill.hitCollider === 'none' || skill.style === 'buff' || skill.style === 'defense' || skill.style === 'summon') {
      this.onBuff?.(skill);
      this.spawnImpactVfx(ctx.casterPos, skill, skill.aoeRadius > 0 ? skill.aoeRadius : 1.4);
      return { ok: true, skill, hits: [] };
    }

    // Schedule hit windows
    const hits: SkillHitEvent[] = [];
    const pulses = Math.max(1, skill.hitCount);
    for (let i = 0; i < pulses; i++) {
      const delay = (skill.windup + (skill.active * (i + 0.5)) / pulses) * 1000;
      const timer = setTimeout(() => {
        const pulseHits = this.resolveHitWindow(skill, ctx, target);
        for (const h of pulseHits) {
          hits.push(h);
          this.onHit?.(h, skill);
        }
      }, delay);
      this.pendingTimers.push(timer);
    }

    return { ok: true, skill, hits };
  }

  private resolveHitWindow(
    skill: ProductionSkillCombatDef,
    ctx: SkillCastContext,
    preferred: CombatTarget | null,
  ): SkillHitEvent[] {
    const hits: SkillHitEvent[] = [];

    // Projectile flight — damage on impact
    if (skill.hitCollider === 'projectile' || skill.projectile !== 'none') {
      const aim = preferred?.position.clone()
        ?? this.forwardPoint(ctx.casterPos, ctx.casterYaw, skill.range);
      const from = ctx.casterPos.clone().add(new THREE.Vector3(0, 1.35, 0));
      // Hand offset along facing
      _fwd.set(Math.sin(ctx.casterYaw), 0, Math.cos(ctx.casterYaw));
      from.addScaledVector(_fwd, 0.45);
      this.spawnProjectile(skill, from, aim, preferred?.id ?? null);
      return hits;
    }

    // Melee / AoE colliders
    const candidates = this.collectColliderTargets(skill, ctx, preferred);
    for (const t of candidates) {
      const dmg = this.computeDamage(skill, t);
      const point = t.position.clone().add(new THREE.Vector3(0, 1.1, 0));
      const isExecute =
        skill.executeMult > 1
        && (t.hpFrac ?? 1) < skill.executeThreshold;
      const hit: SkillHitEvent = {
        skillId: skill.id,
        targetId: t.id,
        damage: dmg,
        damageType: skill.damageType,
        point,
        stunSec: skill.stunSec,
        lifesteal: skill.lifesteal,
        isExecute,
      };
      hits.push(hit);
      this.spawnImpactVfx(point, skill, 1.6);
    }

    // Self AoE empty — still show VFX
    if (!hits.length && (skill.hitCollider === 'aoe_self' || skill.hitCollider === 'aoe_target')) {
      const at = preferred?.position ?? ctx.casterPos;
      this.spawnImpactVfx(at, skill, Math.max(2.2, skill.aoeRadius * 0.6));
    }

    return hits;
  }

  private collectColliderTargets(
    skill: ProductionSkillCombatDef,
    ctx: SkillCastContext,
    preferred: CombatTarget | null,
  ): CombatTarget[] {
    const out: CombatTarget[] = [];
    const pool = ctx.hostiles.length ? ctx.hostiles : preferred ? [preferred] : [];

    for (const t of pool) {
      switch (skill.hitCollider) {
        case 'sphere':
        case 'line': {
          if (inMeleeRange(ctx.casterPos, t.position, skill.range)) {
            if (skill.hitCollider === 'line') {
              const ang = angleToTargetDeg(ctx.casterPos, ctx.casterYaw, t.position);
              if (ang <= skill.arcDeg * 0.5 + 15) out.push(t);
            } else {
              out.push(t);
            }
          }
          break;
        }
        case 'arc': {
          if (inMeleeRange(ctx.casterPos, t.position, skill.range + skill.aoeRadius * 0.25)) {
            const ang = angleToTargetDeg(ctx.casterPos, ctx.casterYaw, t.position);
            if (ang <= skill.arcDeg * 0.5 + 10) out.push(t);
          }
          break;
        }
        case 'aoe_self': {
          if (distXZ(ctx.casterPos, t.position) <= (skill.aoeRadius || 3.5)) out.push(t);
          break;
        }
        case 'aoe_target': {
          const center = preferred?.position ?? ctx.casterPos;
          if (distXZ(center, t.position) <= (skill.aoeRadius || 4)) out.push(t);
          break;
        }
        default:
          break;
      }
    }

    // Single-target skills: only nearest in set
    if (
      skill.hitCollider !== 'aoe_self'
      && skill.hitCollider !== 'aoe_target'
      && skill.hitCollider !== 'arc'
      && out.length > 1
    ) {
      out.sort((a, b) => distXZ(ctx.casterPos, a.position) - distXZ(ctx.casterPos, b.position));
      return [out[0]];
    }
    return out;
  }

  private computeDamage(skill: ProductionSkillCombatDef, t: CombatTarget): number {
    let d = skill.damage;
    if (skill.executeMult > 1 && (t.hpFrac ?? 1) < skill.executeThreshold) {
      d *= skill.executeMult;
    }
    return Math.max(1, Math.round(d));
  }

  private spawnProjectile(
    skill: ProductionSkillCombatDef,
    from: THREE.Vector3,
    to: THREE.Vector3,
    targetId: string | null,
  ): void {
    if (this.flights.length >= MAX_FLIGHTS) {
      const old = this.flights.shift();
      if (old) this.disposeFlight(old);
    }

    const mesh = this.makeProjectileMesh(skill);
    mesh.position.copy(from);
    this.root.add(mesh);

    const dist = from.distanceTo(to);
    const speed = Math.max(8, skill.projectileSpeed);
    const duration = Math.min(2.2, Math.max(0.12, dist / speed));

    this.flights.push({
      mesh,
      t: 0,
      duration,
      from: from.clone(),
      to: to.clone().add(new THREE.Vector3(0, 1.1, 0)),
      skill,
      targetId,
      damage: skill.damage,
    });
  }

  private makeProjectileMesh(skill: ProductionSkillCombatDef): THREE.Object3D {
    const g = new THREE.Group();
    const color =
      skill.damageType === 'fire' ? 0xff6622
      : skill.damageType === 'frost' ? 0x66ccff
      : skill.damageType === 'arcane' ? 0xaa66ff
      : skill.damageType === 'shadow' ? 0x6633aa
      : skill.damageType === 'nature' ? 0x44cc66
      : skill.damageType === 'holy' ? 0xffee88
      : 0xcccccc;

    if (skill.projectile === 'arrow' || skill.projectile === 'bolt') {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.025, 0.9, 6),
        new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 }),
      );
      shaft.rotation.x = Math.PI / 2;
      g.add(shaft);
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.16, 6),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 }),
      );
      tip.rotation.x = Math.PI / 2;
      tip.position.z = 0.5;
      g.add(tip);
    } else if (skill.projectile === 'bullet') {
      const b = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffcc44 }),
      );
      g.add(b);
    } else {
      // Magic orb
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 12),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
      );
      g.add(core);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 10, 10),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, depthWrite: false }),
      );
      g.add(glow);
    }
    return g;
  }

  update(dt: number): void {
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i];
      f.t += dt;
      const u = Math.min(1, f.t / f.duration);
      // Ballistic arc for arrows; flatter for bullets/magic
      const arc =
        f.skill.projectile === 'arrow' || f.skill.projectile === 'bolt'
          ? Math.sin(u * Math.PI) * Math.min(4, f.from.distanceTo(f.to) * 0.12)
          : Math.sin(u * Math.PI) * 0.35;
      _tmp.lerpVectors(f.from, f.to, u);
      _tmp.y += arc;
      f.mesh.position.copy(_tmp);
      f.mesh.lookAt(f.to);

      if (u >= 1) {
        // Impact
        const point = f.to.clone();
        this.spawnImpactVfx(point, f.skill, f.skill.aoeRadius > 0 ? f.skill.aoeRadius * 0.5 : 1.8);
        if (f.targetId) {
          const hit: SkillHitEvent = {
            skillId: f.skill.id,
            targetId: f.targetId,
            damage: f.damage,
            damageType: f.skill.damageType,
            point,
            stunSec: f.skill.stunSec,
            lifesteal: f.skill.lifesteal,
            isExecute: false,
          };
          this.onHit?.(hit, f.skill);
        }
        this.disposeFlight(f);
        this.flights.splice(i, 1);
      }
    }
  }

  private spawnImpactVfx(at: THREE.Vector3, skill: ProductionSkillCombatDef, scale: number) {
    spawnSupernovaImpact({
      position: at.clone(),
      school: skill.school,
      damageType: skill.damageType,
      vfxKey: skill.vfxKey,
      scale,
    });
    this.worldFx?.spellImpact?.(at, {
      school: skill.school,
      damageType: skill.damageType,
      vfxKey: skill.vfxKey,
      scale: scale * 0.85,
      withParticles: true,
    });
  }

  private nearestHostile(
    from: THREE.Vector3,
    list: CombatTarget[],
    maxR: number,
  ): CombatTarget | null {
    let best: CombatTarget | null = null;
    let bestD = maxR;
    for (const t of list) {
      const d = distXZ(from, t.position);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  }

  private forwardPoint(from: THREE.Vector3, yaw: number, dist: number): THREE.Vector3 {
    return new THREE.Vector3(
      from.x + Math.sin(yaw) * dist,
      from.y,
      from.z + Math.cos(yaw) * dist,
    );
  }

  private disposeFlight(f: Flight) {
    this.root.remove(f.mesh);
    f.mesh.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
        else (m.material as THREE.Material).dispose();
      }
    });
  }

  dispose(): void {
    for (const t of this.pendingTimers) clearTimeout(t);
    this.pendingTimers = [];
    for (const f of this.flights) this.disposeFlight(f);
    this.flights = [];
    this.scene.remove(this.root);
  }
}

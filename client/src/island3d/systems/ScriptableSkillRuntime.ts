/**
 * ScriptableSkillRuntime — data-driven skills (Unity ScriptableObject parity).
 *
 * Skill JSON fields map to cast → VFX → damage application without per-skill code.
 * Sources:
 *   - weaponSkillsNew / weaponDatabase (existing hotbar skills)
 *   - spells.ts / spellAnimations.ts
 *   - future CDN vfx/warlords-vfx-catalog.json
 *
 * Status: scaffold — resolve + play hooks; wire combat damage pipeline next.
 */
import * as THREE from 'three';
import {
  createDissolveMaterial,
  createRimGlowMaterial,
} from '../player/SkillEffects';
import { r2CdnUrl } from '@shared/fleet/r2Layout';
import { spawnSupernovaImpact } from '../vfx/SupernovaImpactSystem';
import {
  resolveSupernovaVariant,
  type SupernovaImpactVariant,
} from '@shared/definitions/supernovaImpactVfx';

export type SkillTargeting =
  | 'self'
  | 'enemy_single'
  | 'enemy_aoe'
  | 'ally_single'
  | 'cone'
  | 'projectile';

export interface ScriptableSkillDef {
  id: string;
  name: string;
  description?: string;
  manaCost: number;
  cooldownSec: number;
  castTimeSec: number;
  range: number;
  targeting: SkillTargeting;
  damage?: { amount: number; type: string };
  heal?: { amount: number };
  /** Animation clip key on character */
  animKey?: string;
  /** CDN VFX key under vfx/skills/{vfxKey}/ */
  vfxKey?: string;
  /** Spell school / element for supernova impact tint */
  school?: string;
  /** Force supernova color: original | blue | purple | yellow */
  impactVariant?: SupernovaImpactVariant;
  /** Impact scale multiplier (default 1) */
  impactScale?: number;
  icon?: string;
  effects?: string[];
}

export interface VfxCatalogEntry {
  id: string;
  castUrl?: string;
  impactUrl?: string;
  loopUrl?: string;
  color?: string;
}

export interface VfxCatalog {
  version: string;
  entries: Record<string, VfxCatalogEntry>;
}

const DEFAULT_VFX_CATALOG = r2CdnUrl('vfx/warlords-vfx-catalog.json');

export class ScriptableSkillRuntime {
  private skills = new Map<string, ScriptableSkillDef>();
  private cooldowns = new Map<string, number>(); // skillId → readyAt ms
  private vfxCatalog: VfxCatalog | null = null;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  register(skill: ScriptableSkillDef): void {
    this.skills.set(skill.id, skill);
  }

  registerMany(list: ScriptableSkillDef[]): void {
    for (const s of list) this.register(s);
  }

  get(id: string): ScriptableSkillDef | undefined {
    return this.skills.get(id);
  }

  /** Load optional VFX catalog from CDN. */
  async loadVfxCatalog(url = DEFAULT_VFX_CATALOG): Promise<VfxCatalog | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        this.vfxCatalog = { version: '0', entries: {} };
        return this.vfxCatalog;
      }
      this.vfxCatalog = (await res.json()) as VfxCatalog;
      return this.vfxCatalog;
    } catch {
      this.vfxCatalog = { version: '0', entries: {} };
      return this.vfxCatalog;
    }
  }

  isReady(skillId: string, now = performance.now()): boolean {
    const readyAt = this.cooldowns.get(skillId) ?? 0;
    return now >= readyAt;
  }

  remainingCooldown(skillId: string, now = performance.now()): number {
    const readyAt = this.cooldowns.get(skillId) ?? 0;
    return Math.max(0, (readyAt - now) / 1000);
  }

  /**
   * Attempt to cast. Returns false if on cooldown or unknown.
   * Caller supplies hooks for anim/damage so this stays engine-agnostic.
   */
  cast(
    skillId: string,
    opts: {
      caster: THREE.Object3D;
      targetPos?: THREE.Vector3;
      onAnim?: (animKey: string) => void;
      onDamage?: (skill: ScriptableSkillDef) => void;
      onHeal?: (skill: ScriptableSkillDef) => void;
      onVfx?: (entry: VfxCatalogEntry | null, skill: ScriptableSkillDef) => void;
    },
  ): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;
    const now = performance.now();
    if (!this.isReady(skillId, now)) return false;

    this.cooldowns.set(skillId, now + skill.cooldownSec * 1000);

    if (skill.animKey) opts.onAnim?.(skill.animKey);

    const vfx =
      (skill.vfxKey && this.vfxCatalog?.entries[skill.vfxKey]) || null;
    opts.onVfx?.(vfx, skill);

    // Surrounding dragon-koi cast aura for channel/cast time (multi color/shader)
    const castSec = skill.castTimeSec ?? 0;
    if (castSec > 0.05) {
      void import('../vfx/WorldFxBus').then(({ getWorldFxBus }) => {
        const bus = getWorldFxBus();
        if (!bus) return;
        const token = bus.beginCastAura({
          attachTo: opts.caster,
          school: skill.school,
          damageType: skill.damage?.type,
          skillId: skill.id,
          vfxKey: skill.vfxKey ?? skill.id,
          animKey: skill.animKey,
          castTimeSec: castSec,
        });
        window.setTimeout(() => bus.endCastAura(token), castSec * 1000);
      });
    }

    // Supernova impact (4-color pack) at target or caster
    const impactPos =
      opts.targetPos?.clone() ??
      opts.caster.getWorldPosition(new THREE.Vector3());
    const aoe = skill.targeting === 'enemy_aoe' || skill.targeting === 'cone';
    const baseScale = aoe ? 3.2 : 2.0;
    const scale = baseScale * (skill.impactScale ?? 1);
    const variant = resolveSupernovaVariant({
      variant: skill.impactVariant,
      school: skill.school,
      damageType: skill.damage?.type,
      vfxKey: skill.vfxKey ?? skill.id,
    });
    spawnSupernovaImpact({
      position: impactPos,
      variant,
      school: skill.school,
      damageType: skill.damage?.type,
      vfxKey: skill.vfxKey ?? skill.id,
      scale,
    });

    // Fallback pulse if catalog missing (tint matches variant)
    if (!vfx) {
      const colorMap: Record<SupernovaImpactVariant, number> = {
        original: 0xff8833,
        blue: 0x38bdf8,
        purple: 0xa855f7,
        yellow: 0xfacc15,
      };
      this.spawnPulse(impactPos, aoe ? 2.4 : 1.1, colorMap[variant]);
    }

    if (skill.damage) opts.onDamage?.(skill);
    if (skill.heal) opts.onHeal?.(skill);

    return true;
  }

  /** Simple emissive pulse placeholder until mesh VFX packs upload. */
  spawnPulse(pos: THREE.Vector3, radius: number, color = 0x88aaff): void {
    const geo = new THREE.SphereGeometry(radius, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);

    const start = performance.now();
    const duration = 400;
    const tick = () => {
      const t = (performance.now() - start) / duration;
      if (t >= 1) {
        this.scene.remove(mesh);
        geo.dispose();
        mat.dispose();
        return;
      }
      mesh.scale.setScalar(1 + t * 1.5);
      mat.opacity = 0.55 * (1 - t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /**
   * Helper: map a weapon skill option into a ScriptableSkillDef.
   * Use when wiring weaponSkillsNew hotbar into this runtime.
   */
  static fromWeaponSkillOption(opt: {
    id: string;
    name: string;
    description: string;
    icon: string;
    damage: number;
    cooldown: number;
    effects: string[];
    damageType?: string;
    school?: string;
    impactVariant?: SupernovaImpactVariant;
  }): ScriptableSkillDef {
    const dmgType = opt.damageType ?? 'physical';
    return {
      id: opt.id,
      name: opt.name,
      description: opt.description,
      manaCost: 0,
      cooldownSec: opt.cooldown || 1,
      castTimeSec: 0,
      range: 8,
      targeting: 'enemy_single',
      damage: { amount: opt.damage, type: dmgType },
      animKey: 'attack',
      vfxKey: opt.id,
      school: opt.school,
      impactVariant: opt.impactVariant,
      icon: opt.icon,
      effects: opt.effects,
    };
  }

  /** Rim-glow material for buff overlay meshes (SkillEffects). */
  createRimGlow(color = new THREE.Color(0x66ccff)): THREE.ShaderMaterial {
    return createRimGlowMaterial(color);
  }

  /** Dissolve material replacing a base mesh material. */
  createDissolve(base: THREE.MeshStandardMaterial): THREE.ShaderMaterial {
    return createDissolveMaterial(base);
  }
}

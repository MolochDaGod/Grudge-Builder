/**
 * Production combat catalog for EVERY weapon skill option.
 *
 * Builds unique combat defs from weaponSkillsNew (264+ skills):
 *   anim · VFX · collider · projectile · hit window · range · school
 *
 * Used by ProductionSkillCombatRuntime + ScriptableSkillRuntime.
 */

import {
  WEAPON_TYPE_DEFINITIONS,
  type WeaponSkillOption,
  type WeaponTypeDefinition,
} from './weaponSkillsNew';
import {
  getWeaponCombatProfile,
  type CombatStyle,
  type HitColliderKind,
  type ProjectileKind,
  type WeaponCombatProfile,
} from './productionWeaponCombat';
import {
  GREATSWORD_SAMURAI_SKILLS,
  TWO_HAND_TO_SAMURAI_ANIM,
} from './greatswordSamuraiCombat';

export interface ProductionSkillCombatDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  weaponType: string;
  slotType: string;
  tier: number;
  damage: number;
  cooldown: number;
  effects: string[];

  /** Resolved combat */
  style: CombatStyle;
  range: number;
  aoeRadius: number;
  arcDeg: number;
  windup: number;
  active: number;
  recovery: number;
  hitCollider: HitColliderKind;
  projectile: ProjectileKind;
  projectileSpeed: number;
  damageType: WeaponCombatProfile['damageType'];
  school: string;
  /** Animation one-shot key (orchestrator / director) */
  animKey: string;
  /** Multi-hit pulses during active window */
  hitCount: number;
  /** Lifesteal fraction 0–1 */
  lifesteal: number;
  /** Stun duration seconds */
  stunSec: number;
  /** Dash distance meters */
  dashMeters: number;
  /** Damage multiplier when target HP < executeThreshold */
  executeMult: number;
  executeThreshold: number;
  manaCost: number;
  /** Unique VFX key for catalog / supernova tint */
  vfxKey: string;
  /** Whether skill requires soft/hard lock target */
  requiresTarget: boolean;
  /** Allow cast out of range (dash / leap skills) */
  ignoreRangeGate: boolean;
}

const catalog = new Map<string, ProductionSkillCombatDef>();
let built = false;

function inferFromEffects(
  opt: WeaponSkillOption,
  base: WeaponCombatProfile,
  weaponType: string,
): Partial<ProductionSkillCombatDef> {
  const e = (opt.effects || []).join(' ').toLowerCase();
  const id = opt.id.toLowerCase();
  const name = opt.name.toLowerCase();
  const blob = `${e} ${id} ${name}`;

  let style: CombatStyle = base.style;
  let hitCollider: HitColliderKind = base.hitCollider;
  let projectile: ProjectileKind = base.projectile;
  let range = base.range;
  let aoeRadius = base.aoeRadius ?? 0;
  let animKey = base.attackAnim;
  let hitCount = 1;
  let lifesteal = 0;
  let stunSec = 0;
  let dashMeters = 0;
  let executeMult = 1;
  let executeThreshold = 0.3;
  let damageType = base.damageType;
  let school = damageType;
  let requiresTarget = true;
  let ignoreRangeGate = false;
  let windup = base.windup;
  let active = base.active;
  let recovery = base.recovery;
  let projectileSpeed = base.projectileSpeed ?? 30;

  // ── Targeting / shape ──────────────────────────────────────────
  if (/aoe|cleave|whirl|nova|blast|explosion|rain|meteor|cone|sweep|spin/.test(blob)) {
    if (/self|whirl|nova|spin|around/.test(blob)) {
      hitCollider = 'aoe_self';
      aoeRadius = Math.max(aoeRadius, 3.5);
      requiresTarget = false;
    } else if (/cone|cleave|sweep/.test(blob)) {
      hitCollider = 'arc';
      aoeRadius = Math.max(aoeRadius, 3.2);
    } else {
      hitCollider = 'aoe_target';
      aoeRadius = Math.max(aoeRadius, 4.0);
      if (base.style === 'ranged' || base.style === 'magic') {
        projectile = projectile === 'none' ? 'magic_orb' : projectile;
        hitCollider = 'projectile';
      }
    }
    animKey = /cast|meteor|blast|arcane|fire|frost|magic/.test(blob) ? 'cast' : 'attack2';
  }

  if (/dash|charge|lunge|leap|blink|gap.?closer|rush|step/.test(blob)) {
    style = 'mobility';
    dashMeters = /blink/.test(blob) ? 10 : /charge|rush/.test(blob) ? 8 : 6;
    ignoreRangeGate = true;
    windup = Math.min(windup, 0.12);
    animKey = 'attack2';
    if (/blink|teleport/.test(blob)) {
      requiresTarget = false;
      hitCollider = 'aoe_self';
      aoeRadius = 2.5;
    }
  }

  if (/block|parry|ward|shield|fortify|barrier|reflect|dr\b|defense/.test(blob) && opt.damage <= 0) {
    style = 'defense';
    hitCollider = 'none';
    requiresTarget = false;
    animKey = 'block';
    projectile = 'none';
  }

  if (/buff|aura|empower|surge|haste|fortify/.test(blob) && opt.damage <= 20) {
    if (style !== 'defense') style = 'buff';
    requiresTarget = false;
    if (hitCollider === 'sphere' || hitCollider === 'arc') hitCollider = 'none';
  }

  if (/summon|minion|conjure|pack|avatar/.test(blob)) {
    style = 'summon';
    requiresTarget = false;
    hitCollider = 'none';
    animKey = 'cast';
  }

  if (/projectile|shot|arrow|bolt|missile|bullet|orb|fireball/.test(blob) || base.style === 'ranged' || base.style === 'magic') {
    if (style === 'melee' && /shot|arrow|bolt|missile/.test(blob)) {
      style = base.style === 'magic' ? 'magic' : 'ranged';
      hitCollider = 'projectile';
      projectile = base.projectile !== 'none' ? base.projectile : 'arrow';
      range = Math.max(range, 18);
    }
  }

  // ── Elemental school ───────────────────────────────────────────
  if (/fire|flame|burn|meteor|inferno|crimson/.test(blob)) {
    damageType = 'fire';
    school = 'fire';
    if (hitCollider === 'projectile') projectile = 'fireball';
  } else if (/frost|ice|freeze|cold|chill/.test(blob)) {
    damageType = 'frost';
    school = 'frost';
    if (hitCollider === 'projectile') projectile = 'ice_shard';
  } else if (/arcane|mana|mystic|void|shadow|dark|death|scythe/.test(blob)) {
    damageType = /shadow|dark|death|scythe/.test(blob) ? 'shadow' : 'arcane';
    school = damageType;
    if (hitCollider === 'projectile') projectile = 'arcane_missile';
  } else if (/nature|poison|venom|bleed|thorn|root/.test(blob)) {
    damageType = 'nature';
    school = 'nature';
  } else if (/holy|light|heal|smite/.test(blob)) {
    damageType = 'holy';
    school = 'holy';
  }

  // ── Special combat tags ────────────────────────────────────────
  if (/bleed|dot|stack/.test(blob)) hitCount = Math.max(hitCount, 1);
  if (/multi|combo|rapid|triple|3 rapid/.test(blob)) {
    hitCount = 3;
    active = Math.max(active, 0.45);
    windup = Math.min(windup, 0.12);
  }
  if (/lifesteal|heal per|vampir|drain/.test(blob)) lifesteal = 0.2;
  if (/stun|knock|fear|root|cc/.test(blob)) stunSec = /fear/.test(blob) ? 2 : 1;
  if (/execute|below 30|low hp|<30/.test(blob)) {
    executeMult = /3x|3×/.test(blob) ? 3 : 2;
    executeThreshold = 0.3;
  }
  if (/thrust|lunge|pierce|spear/.test(blob) && style === 'melee') {
    hitCollider = 'line';
    range = Math.max(range, 3.2);
  }

  // Ultimates: longer windup, bigger feel
  if (opt.tier >= 4 || /ultimate|reprisal|meteor|avatar/.test(blob)) {
    windup = Math.max(windup, 0.35);
    recovery = Math.max(recovery, 0.5);
    if (aoeRadius > 0) aoeRadius = Math.max(aoeRadius, 5);
  }

  // Primary zero-CD strikes stay snappy
  if (opt.cooldown === 0 && style === 'melee') {
    windup = Math.min(windup, 0.18);
    recovery = Math.min(recovery, 0.28);
  }

  return {
    style,
    range,
    aoeRadius,
    arcDeg: base.arcDeg,
    windup,
    active,
    recovery,
    hitCollider,
    projectile,
    projectileSpeed,
    damageType,
    school,
    animKey,
    hitCount,
    lifesteal,
    stunSec,
    dashMeters,
    executeMult,
    executeThreshold,
    manaCost: style === 'magic' ? Math.max(8, Math.floor(opt.damage * 0.15)) : 0,
    vfxKey: opt.id,
    requiresTarget,
    ignoreRangeGate,
  };
}

function buildSkill(
  opt: WeaponSkillOption,
  weaponType: string,
  slotType: string,
): ProductionSkillCombatDef {
  const base = getWeaponCombatProfile(weaponType);
  const inferred = inferFromEffects(opt, base, weaponType);
  return {
    id: opt.id,
    name: opt.name,
    description: opt.description,
    icon: opt.icon,
    weaponType,
    slotType,
    tier: opt.tier,
    damage: opt.damage,
    cooldown: opt.cooldown > 0 ? opt.cooldown : base.cd,
    effects: opt.effects || [],
    style: inferred.style ?? base.style,
    range: inferred.range ?? base.range,
    aoeRadius: inferred.aoeRadius ?? base.aoeRadius ?? 0,
    arcDeg: inferred.arcDeg ?? base.arcDeg,
    windup: inferred.windup ?? base.windup,
    active: inferred.active ?? base.active,
    recovery: inferred.recovery ?? base.recovery,
    hitCollider: inferred.hitCollider ?? base.hitCollider,
    projectile: inferred.projectile ?? base.projectile,
    projectileSpeed: inferred.projectileSpeed ?? base.projectileSpeed ?? 30,
    damageType: inferred.damageType ?? base.damageType,
    school: inferred.school ?? base.damageType,
    animKey: inferred.animKey ?? base.attackAnim,
    hitCount: inferred.hitCount ?? 1,
    lifesteal: inferred.lifesteal ?? 0,
    stunSec: inferred.stunSec ?? 0,
    dashMeters: inferred.dashMeters ?? 0,
    executeMult: inferred.executeMult ?? 1,
    executeThreshold: inferred.executeThreshold ?? 0.3,
    manaCost: inferred.manaCost ?? 0,
    vfxKey: inferred.vfxKey ?? opt.id,
    requiresTarget: inferred.requiresTarget ?? true,
    ignoreRangeGate: inferred.ignoreRangeGate ?? false,
  };
}

export function buildWeaponSkillCombatCatalog(
  defs: Record<string, WeaponTypeDefinition> = WEAPON_TYPE_DEFINITIONS,
): Map<string, ProductionSkillCombatDef> {
  const map = new Map<string, ProductionSkillCombatDef>();
  for (const [weaponType, def] of Object.entries(defs)) {
    for (const slot of def.slots) {
      for (const skill of slot.skills) {
        map.set(skill.id, buildSkill(skill, weaponType, slot.type));
      }
    }
    // Form skills (grimoire shapeshift etc.)
    if (def.formSkills) {
      for (const form of def.formSkills) {
        for (const skill of form.skills) {
          map.set(skill.id, buildSkill(skill, weaponType, 'form'));
        }
      }
    }
  }
  return map;
}

/**
 * Wire baked samurai 2H clips into production combat:
 * - Override TWO_HAND_SWORD skill animKeys → gs_samurai_*
 * - Register hotbar product skills (cleave / teleport / dash / fissure)
 */
function applyGreatswordSamuraiOverrides(map: Map<string, ProductionSkillCombatDef>): void {
  for (const [skillId, animKey] of Object.entries(TWO_HAND_TO_SAMURAI_ANIM)) {
    const existing = map.get(skillId);
    if (existing) {
      existing.animKey = animKey;
      if (animKey === 'gs_samurai_dash_opener') {
        existing.dashMeters = Math.max(existing.dashMeters, 6);
        existing.ignoreRangeGate = true;
        existing.style = 'mobility';
      }
      if (animKey === 'gs_samurai_teleport_strike') {
        existing.dashMeters = Math.max(existing.dashMeters, 10);
        existing.ignoreRangeGate = true;
        existing.style = 'mobility';
      }
      if (skillId === 'gs_flaming_fissure' || animKey === 'magic_cast') {
        existing.damageType = 'fire';
        existing.school = 'fire';
        existing.hitCollider = 'aoe_target';
        existing.aoeRadius = Math.max(existing.aoeRadius, 4);
      }
      continue;
    }
  }

  const base2h = getWeaponCombatProfile('GREATSWORD');
  for (const s of GREATSWORD_SAMURAI_SKILLS) {
    if (map.has(s.id)) {
      const def = map.get(s.id)!;
      def.animKey = s.animKey;
      continue;
    }
    const isFissure = s.id === 'gs_flaming_fissure';
    const isDash = s.movement === 'dash';
    const isTeleport = s.movement === 'teleport';
    map.set(s.id, {
      id: s.id,
      name: s.label,
      description: s.description,
      icon: isFissure ? '🔥' : '⚔️',
      weaponType: 'GREATSWORD',
      slotType: s.slotKind,
      tier: s.hotbarSlot,
      damage: Math.round(40 * s.power),
      cooldown: s.cooldown ?? base2h.cd,
      effects: s.vfx,
      style: isFissure
        ? 'magic'
        : isDash || isTeleport
          ? 'mobility'
          : 'melee',
      range: isFissure ? 12 : base2h.range,
      aoeRadius: isFissure ? 4.5 : 0,
      arcDeg: base2h.arcDeg,
      windup: isDash ? 0.12 : base2h.windup,
      active: base2h.active,
      recovery: base2h.recovery,
      hitCollider: isFissure
        ? 'aoe_target'
        : isTeleport
          ? 'aoe_self'
          : base2h.hitCollider,
      projectile: 'none',
      projectileSpeed: 0,
      damageType: s.damageType === 'fire' ? 'fire' : 'physical',
      school: s.damageType === 'fire' ? 'fire' : 'physical',
      animKey: s.animKey,
      hitCount: s.animKeyB ? 2 : 1,
      lifesteal: 0,
      stunSec: isTeleport ? 0.4 : 0,
      dashMeters: isTeleport ? 10 : isDash ? 6 : 0,
      executeMult: 1,
      executeThreshold: 0.3,
      manaCost: s.cost.mana ?? 0,
      vfxKey: s.vfx[0] ?? s.id,
      requiresTarget: !isTeleport,
      ignoreRangeGate: isDash || isTeleport,
    });
  }
}

export function ensureWeaponSkillCombatCatalog(): Map<string, ProductionSkillCombatDef> {
  if (!built) {
    for (const [k, v] of buildWeaponSkillCombatCatalog()) {
      catalog.set(k, v);
    }
    applyGreatswordSamuraiOverrides(catalog);
    built = true;
  }
  return catalog;
}

export function getProductionSkillCombat(skillId: string): ProductionSkillCombatDef | null {
  ensureWeaponSkillCombatCatalog();
  return catalog.get(skillId) ?? null;
}

export function listProductionSkillCombat(): ProductionSkillCombatDef[] {
  ensureWeaponSkillCombatCatalog();
  return [...catalog.values()];
}

export function productionSkillCount(): number {
  return ensureWeaponSkillCombatCatalog().size;
}

/** Debug / QA summary by style */
export function productionSkillStyleBreakdown(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of listProductionSkillCombat()) {
    out[s.style] = (out[s.style] ?? 0) + 1;
  }
  return out;
}

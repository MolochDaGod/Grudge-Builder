/**
 * Production weapon combat profiles — ranges, hit windows, projectile physics.
 * SSOT aligned with grudge6-combat-runtime references/attack-ranges.md
 *
 * Units: meters, seconds. Ground combat uses flat XZ distance.
 */

export type CombatStyle = 'melee' | 'ranged' | 'magic' | 'defense' | 'mobility' | 'summon' | 'buff';

export type HitColliderKind =
  | 'sphere' // point / small hit
  | 'arc' // frontal cone / slash
  | 'line' // thrust / spear
  | 'aoe_self' // whirl / nova around caster
  | 'aoe_target' // rain / meteor at point
  | 'projectile' // ballistic / straight shot
  | 'none'; // pure buff

export type ProjectileKind =
  | 'arrow'
  | 'bolt'
  | 'bullet'
  | 'magic_orb'
  | 'fireball'
  | 'ice_shard'
  | 'arcane_missile'
  | 'thrown'
  | 'none';

export type AnimPackId =
  | 'sword_shield'
  | '2h_melee'
  | 'greatsword_samurai'
  | 'longbow'
  | 'rifle'
  | 'magic'
  | 'unarmed'
  | 'spear';

export interface WeaponCombatProfile {
  style: CombatStyle;
  range: number;
  arcDeg: number;
  windup: number;
  active: number;
  recovery: number;
  /** Global GCD-ish after basic attack */
  cd: number;
  projectileSpeed?: number;
  aoeRadius?: number;
  animPack: AnimPackId;
  /** Default one-shot clip key for basic attack */
  attackAnim: string;
  hitCollider: HitColliderKind;
  projectile: ProjectileKind;
  damageType: 'physical' | 'fire' | 'frost' | 'arcane' | 'nature' | 'shadow' | 'holy';
}

/** Per weapon-class combat feel (melee feel realistic, not MMO range cheese). */
export const GRUDGE6_WEAPON_COMBAT: Record<string, WeaponCombatProfile> = {
  sword: {
    style: 'melee', range: 2.5, arcDeg: 90,
    windup: 0.22, active: 0.28, recovery: 0.35, cd: 0.45,
    animPack: 'sword_shield', attackAnim: 'attack', hitCollider: 'arc',
    projectile: 'none', damageType: 'physical',
  },
  sword_shield: {
    style: 'melee', range: 2.4, arcDeg: 80,
    windup: 0.2, active: 0.26, recovery: 0.32, cd: 0.5,
    animPack: 'sword_shield', attackAnim: 'attack', hitCollider: 'arc',
    projectile: 'none', damageType: 'physical',
  },
  SWORD: {
    style: 'melee', range: 2.5, arcDeg: 90,
    windup: 0.22, active: 0.28, recovery: 0.35, cd: 0.45,
    animPack: 'sword_shield', attackAnim: 'attack', hitCollider: 'arc',
    projectile: 'none', damageType: 'physical',
  },
  AXE: {
    style: 'melee', range: 2.8, arcDeg: 110,
    windup: 0.28, active: 0.3, recovery: 0.4, cd: 0.55,
    animPack: '2h_melee', attackAnim: 'attack', hitCollider: 'arc',
    projectile: 'none', damageType: 'physical',
  },
  HAMMER: {
    style: 'melee', range: 2.7, arcDeg: 100,
    windup: 0.3, active: 0.32, recovery: 0.45, cd: 0.6,
    animPack: '2h_melee', attackAnim: 'attack', hitCollider: 'arc',
    projectile: 'none', damageType: 'physical',
  },
  MACE: {
    style: 'melee', range: 2.6, arcDeg: 95,
    windup: 0.26, active: 0.28, recovery: 0.38, cd: 0.52,
    animPack: 'sword_shield', attackAnim: 'attack', hitCollider: 'arc',
    projectile: 'none', damageType: 'physical',
  },
  SPEAR: {
    style: 'melee', range: 3.6, arcDeg: 40,
    windup: 0.18, active: 0.22, recovery: 0.3, cd: 0.48,
    animPack: 'spear', attackAnim: 'attack', hitCollider: 'line',
    projectile: 'none', damageType: 'physical',
  },
  DAGGER: {
    style: 'melee', range: 1.9, arcDeg: 70,
    windup: 0.12, active: 0.18, recovery: 0.22, cd: 0.32,
    animPack: 'sword_shield', attackAnim: 'attack', hitCollider: 'arc',
    projectile: 'none', damageType: 'physical',
  },
  TWO_HAND_SWORD: {
    style: 'melee', range: 3.2, arcDeg: 120,
    windup: 0.32, active: 0.34, recovery: 0.48, cd: 0.65,
    animPack: 'greatsword_samurai', attackAnim: 'gs_samurai_combo_a', hitCollider: 'arc',
    projectile: 'none', damageType: 'physical',
  },
  /** Alias for arsenal / tier visuals apiId GREATSWORD */
  GREATSWORD: {
    style: 'melee', range: 3.2, arcDeg: 120,
    windup: 0.32, active: 0.34, recovery: 0.48, cd: 0.65,
    animPack: 'greatsword_samurai', attackAnim: 'gs_samurai_combo_a', hitCollider: 'arc',
    projectile: 'none', damageType: 'physical',
  },
  greatsword: {
    style: 'melee', range: 3.2, arcDeg: 120,
    windup: 0.32, active: 0.34, recovery: 0.48, cd: 0.65,
    animPack: 'greatsword_samurai', attackAnim: 'gs_samurai_combo_a', hitCollider: 'arc',
    projectile: 'none', damageType: 'physical',
  },
  SCYTHE: {
    style: 'melee', range: 3.0, arcDeg: 130,
    windup: 0.3, active: 0.32, recovery: 0.42, cd: 0.6,
    animPack: '2h_melee', attackAnim: 'attack', hitCollider: 'arc',
    projectile: 'none', damageType: 'shadow',
  },
  SHIELD: {
    style: 'defense', range: 2.2, arcDeg: 60,
    windup: 0.1, active: 0.15, recovery: 0.25, cd: 0.4,
    animPack: 'sword_shield', attackAnim: 'block', hitCollider: 'sphere',
    projectile: 'none', damageType: 'physical',
  },
  BOW: {
    style: 'ranged', range: 24, arcDeg: 15,
    windup: 0.35, active: 0.05, recovery: 0.4, cd: 0.55,
    projectileSpeed: 42, animPack: 'longbow', attackAnim: 'attack',
    hitCollider: 'projectile', projectile: 'arrow', damageType: 'physical',
  },
  CROSSBOW: {
    style: 'ranged', range: 28, arcDeg: 10,
    windup: 0.45, active: 0.05, recovery: 0.55, cd: 0.85,
    projectileSpeed: 55, animPack: 'rifle', attackAnim: 'attack',
    hitCollider: 'projectile', projectile: 'bolt', damageType: 'physical',
  },
  GUN: {
    style: 'ranged', range: 30, arcDeg: 8,
    windup: 0.1, active: 0.02, recovery: 0.2, cd: 0.25,
    projectileSpeed: 80, animPack: 'rifle', attackAnim: 'attack',
    hitCollider: 'projectile', projectile: 'bullet', damageType: 'physical',
  },
  STAFF: {
    style: 'magic', range: 18, arcDeg: 20,
    windup: 0.4, active: 0.08, recovery: 0.45, cd: 0.7,
    projectileSpeed: 28, aoeRadius: 0, animPack: 'magic', attackAnim: 'cast',
    hitCollider: 'projectile', projectile: 'magic_orb', damageType: 'arcane',
  },
  WAND: {
    style: 'magic', range: 16, arcDeg: 18,
    windup: 0.25, active: 0.06, recovery: 0.3, cd: 0.5,
    projectileSpeed: 32, animPack: 'magic', attackAnim: 'cast',
    hitCollider: 'projectile', projectile: 'arcane_missile', damageType: 'arcane',
  },
  GRIMOIRE: {
    style: 'magic', range: 15, arcDeg: 25,
    windup: 0.5, active: 0.1, recovery: 0.55, cd: 0.9,
    projectileSpeed: 24, aoeRadius: 2.5, animPack: 'magic', attackAnim: 'cast',
    hitCollider: 'projectile', projectile: 'fireball', damageType: 'shadow',
  },
  unarmed: {
    style: 'melee', range: 2.0, arcDeg: 80,
    windup: 0.14, active: 0.2, recovery: 0.25, cd: 0.35,
    animPack: 'unarmed', attackAnim: 'attack', hitCollider: 'sphere',
    projectile: 'none', damageType: 'physical',
  },
  WARRIOR_BATTLE: {
    style: 'melee', range: 2.6, arcDeg: 95,
    windup: 0.22, active: 0.28, recovery: 0.35, cd: 0.48,
    animPack: 'sword_shield', attackAnim: 'attack', hitCollider: 'arc',
    projectile: 'none', damageType: 'physical',
  },
  MAGE_ARCANE: {
    style: 'magic', range: 18, arcDeg: 20,
    windup: 0.38, active: 0.08, recovery: 0.42, cd: 0.65,
    projectileSpeed: 30, animPack: 'magic', attackAnim: 'cast',
    hitCollider: 'projectile', projectile: 'arcane_missile', damageType: 'arcane',
  },
  RANGER_QUICK_FINGERS: {
    style: 'ranged', range: 22, arcDeg: 12,
    windup: 0.28, active: 0.05, recovery: 0.35, cd: 0.48,
    projectileSpeed: 48, animPack: 'longbow', attackAnim: 'attack',
    hitCollider: 'projectile', projectile: 'arrow', damageType: 'physical',
  },
  WORGE_GRIMOIRE: {
    style: 'melee', range: 2.1, arcDeg: 90,
    windup: 0.15, active: 0.22, recovery: 0.28, cd: 0.4,
    animPack: 'unarmed', attackAnim: 'attack', hitCollider: 'sphere',
    projectile: 'none', damageType: 'nature',
  },
};

export function getWeaponCombatProfile(weaponKey: string): WeaponCombatProfile {
  const k = weaponKey || 'sword';
  return (
    GRUDGE6_WEAPON_COMBAT[k]
    || GRUDGE6_WEAPON_COMBAT[k.toUpperCase()]
    || GRUDGE6_WEAPON_COMBAT[k.toLowerCase()]
    || GRUDGE6_WEAPON_COMBAT.sword
  );
}

export function distXZ(
  a: { x: number; z: number },
  b: { x: number; z: number },
): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function inMeleeRange(
  self: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
  range: number,
  ySlack = 2.5,
): boolean {
  if (Math.abs(self.y - target.y) > ySlack) return false;
  return distXZ(self, target) <= range;
}

/** Facing: angle between forward yaw and target (degrees). */
export function angleToTargetDeg(
  self: { x: number; z: number },
  yaw: number,
  target: { x: number; z: number },
): number {
  const dx = target.x - self.x;
  const dz = target.z - self.z;
  const targetYaw = Math.atan2(dx, dz);
  let d = Math.abs(targetYaw - yaw);
  while (d > Math.PI) d = Math.abs(d - Math.PI * 2);
  return (d * 180) / Math.PI;
}

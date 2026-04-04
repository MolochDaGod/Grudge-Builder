/**
 * Pirate Crew Unit System
 *
 * Non-NFT game units recruited at docks. Stationed on capturable islands
 * for defense, resource gathering, and ship crew duty.
 * Uses Scallywag Pirates sprite sheets (4 color variants = 4 faction colors).
 */

import { v4 as uuidv4 } from 'uuid';
import { PIRATE_SHEETS, PIRATE_COLORS, type PirateColor } from '@shared/definitions/islandAssetManifest';

// ── Faction → Color Mapping ───────────────────────────────────────────────────

export const FACTION_PIRATE_COLORS: Record<string, PirateColor> = {
  Crusade:  'blue',
  Horde:    'red',
  Forsaken: 'gray',
  Neutral:  'green',
};

// ── Unit Types ────────────────────────────────────────────────────────────────

export type PirateRole = 'guard' | 'gunner' | 'worker' | 'sailor';

export interface PirateUnit {
  id: string;
  name: string;
  color: PirateColor;
  role: PirateRole;
  /** Grid position on the island */
  x: number;
  y: number;
  /** Current AI state */
  state: PirateAIState;
  /** Patrol waypoints (for guard role) */
  patrolPath: { x: number; y: number }[];
  patrolIndex: number;
  /** Combat stats (flat, no leveling) */
  hp: number;
  maxHp: number;
  damage: number;
  attackRange: number; // tiles
  attackCooldownMs: number;
  lastAttackAt: number;
  /** Current animation */
  animation: PirateAnimation;
  /** Which island/zone this unit is stationed on */
  stationedZoneX: number;
  stationedZoneY: number;
  /** Ship crew assignment (null = on island) */
  shipId: string | null;
  createdAt: number;
}

export type PirateAnimation = 'idle' | 'walk' | 'sword' | 'shoot' | 'shovel';

export type PirateAIState =
  | 'idle'
  | 'patrolling'
  | 'chasing'
  | 'attacking_melee'
  | 'attacking_ranged'
  | 'digging'       // resource gathering
  | 'returning'     // returning to patrol start
  | 'boarding_ship' // moving to ship dock
  | 'dead';

// ── Role Stats ────────────────────────────────────────────────────────────────

const ROLE_STATS: Record<PirateRole, {
  hp: number; damage: number; attackRange: number; attackCooldownMs: number;
}> = {
  guard:  { hp: 60, damage: 8,  attackRange: 1.5, attackCooldownMs: 1200 },
  gunner: { hp: 40, damage: 12, attackRange: 5.0, attackCooldownMs: 2000 },
  worker: { hp: 35, damage: 3,  attackRange: 1.0, attackCooldownMs: 1500 },
  sailor: { hp: 50, damage: 6,  attackRange: 1.5, attackCooldownMs: 1400 },
};

// ── Recruitment Costs ─────────────────────────────────────────────────────────

export interface RecruitCost {
  gold: number;
  food?: number;
}

export const RECRUIT_COSTS: Record<PirateRole, RecruitCost> = {
  guard:  { gold: 50,  food: 10 },
  gunner: { gold: 80,  food: 15 },
  worker: { gold: 30,  food: 5 },
  sailor: { gold: 40,  food: 8 },
};

// ── Unit Factory ──────────────────────────────────────────────────────────────

const PIRATE_NAMES = [
  'Barnacle Bill', 'Captain Hooks', 'Salty Pete', 'Rum Runner',
  'Blackbeard Jr.', 'One-Eye Jack', 'Scurvy Sam', 'Peg Leg Pat',
  'Cutlass Kate', 'Anchor Andy', 'Grog Gary', 'Plank Walker',
  'Tide Turner', 'Storm Chaser', 'Wave Rider', 'Reef Raider',
];

export function recruitPirate(
  role: PirateRole,
  faction: string,
  stationX: number,
  stationY: number,
  zoneX: number,
  zoneY: number,
): PirateUnit {
  const stats = ROLE_STATS[role];
  const color = FACTION_PIRATE_COLORS[faction] || 'green';
  const name = PIRATE_NAMES[Math.floor(Math.random() * PIRATE_NAMES.length)];

  return {
    id: uuidv4(),
    name,
    color,
    role,
    x: stationX,
    y: stationY,
    state: 'idle',
    patrolPath: [],
    patrolIndex: 0,
    hp: stats.hp,
    maxHp: stats.hp,
    damage: stats.damage,
    attackRange: stats.attackRange,
    attackCooldownMs: stats.attackCooldownMs,
    lastAttackAt: 0,
    animation: 'idle',
    stationedZoneX: zoneX,
    stationedZoneY: zoneY,
    shipId: null,
    createdAt: Date.now(),
  };
}

// ── AI State Machine ──────────────────────────────────────────────────────────

interface AIContext {
  enemies: { id: string; x: number; y: number; isDead: boolean }[];
  dockPosition?: { x: number; y: number };
  resourcePosition?: { x: number; y: number };
}

/** Update a pirate unit's AI state based on context */
export function updatePirateAI(unit: PirateUnit, ctx: AIContext, deltaMs: number): PirateUnit {
  if (unit.state === 'dead') return unit;

  // Find nearest alive enemy
  let nearestEnemy: typeof ctx.enemies[number] | null = null;
  let nearestDist = Infinity;
  for (const enemy of ctx.enemies) {
    if (enemy.isDead) continue;
    const dx = enemy.x - unit.x;
    const dy = enemy.y - unit.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      nearestEnemy = enemy;
      nearestDist = dist;
    }
  }

  // Guard/gunner: prioritize combat
  if ((unit.role === 'guard' || unit.role === 'gunner') && nearestEnemy) {
    if (nearestDist <= unit.attackRange) {
      // In range — attack
      const isRanged = unit.role === 'gunner';
      return {
        ...unit,
        state: isRanged ? 'attacking_ranged' : 'attacking_melee',
        animation: isRanged ? 'shoot' : 'sword',
      };
    } else if (nearestDist < 10) {
      // Chase
      const dx = nearestEnemy.x - unit.x;
      const dy = nearestEnemy.y - unit.y;
      const moveSpeed = 2.0 * (deltaMs / 1000); // tiles per second
      const moveDist = Math.min(moveSpeed, nearestDist - unit.attackRange * 0.8);
      const angle = Math.atan2(dy, dx);
      return {
        ...unit,
        x: unit.x + Math.cos(angle) * moveDist,
        y: unit.y + Math.sin(angle) * moveDist,
        state: 'chasing',
        animation: 'walk',
      };
    }
  }

  // Worker: dig at resource positions
  if (unit.role === 'worker' && ctx.resourcePosition && unit.state !== 'digging') {
    const dx = ctx.resourcePosition.x - unit.x;
    const dy = ctx.resourcePosition.y - unit.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1.5) {
      return { ...unit, state: 'digging', animation: 'shovel' };
    }
  }

  // Patrol logic for guards when no enemies
  if (unit.role === 'guard' && unit.patrolPath.length > 0 && !nearestEnemy) {
    const target = unit.patrolPath[unit.patrolIndex % unit.patrolPath.length];
    const dx = target.x - unit.x;
    const dy = target.y - unit.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.5) {
      // Reached waypoint — advance to next
      return {
        ...unit,
        patrolIndex: (unit.patrolIndex + 1) % unit.patrolPath.length,
        state: 'patrolling',
        animation: 'walk',
      };
    } else {
      const moveSpeed = 1.5 * (deltaMs / 1000);
      const angle = Math.atan2(dy, dx);
      return {
        ...unit,
        x: unit.x + Math.cos(angle) * Math.min(moveSpeed, dist),
        y: unit.y + Math.sin(angle) * Math.min(moveSpeed, dist),
        state: 'patrolling',
        animation: 'walk',
      };
    }
  }

  // Default: idle
  if (unit.state !== 'idle' && unit.state !== 'digging') {
    return { ...unit, state: 'idle', animation: 'idle' };
  }

  return unit;
}

// ── Combat ────────────────────────────────────────────────────────────────────

/** Check if pirate can attack (cooldown) */
export function canPirateAttack(unit: PirateUnit): boolean {
  return Date.now() - unit.lastAttackAt >= unit.attackCooldownMs;
}

/** Apply pirate attack to an enemy, returns damage dealt */
export function pirateAttack(unit: PirateUnit): { unit: PirateUnit; damage: number } {
  return {
    unit: { ...unit, lastAttackAt: Date.now() },
    damage: unit.damage,
  };
}

/** Take damage — returns updated unit */
export function takeDamage(unit: PirateUnit, damage: number): PirateUnit {
  const newHp = Math.max(0, unit.hp - damage);
  return {
    ...unit,
    hp: newHp,
    state: newHp <= 0 ? 'dead' : unit.state,
    animation: newHp <= 0 ? 'idle' : unit.animation,
  };
}

/** Check if unit is dead */
export function isPirateDead(unit: PirateUnit): boolean {
  return unit.hp <= 0 || unit.state === 'dead';
}

// ── Patrol Path Generation ────────────────────────────────────────────────────

/** Generate a rectangular patrol path around a center point */
export function generatePatrolPath(
  centerX: number,
  centerY: number,
  radius: number = 3,
): { x: number; y: number }[] {
  return [
    { x: centerX - radius, y: centerY - radius },
    { x: centerX + radius, y: centerY - radius },
    { x: centerX + radius, y: centerY + radius },
    { x: centerX - radius, y: centerY + radius },
  ];
}

// ── Sprite Helpers ────────────────────────────────────────────────────────────

/** Get the sprite sheet descriptor for a pirate's color */
export function getPirateSpriteSheet(color: PirateColor) {
  return PIRATE_SHEETS[color];
}

/** Get the animation row and frame count for a pirate animation */
export function getPirateAnimationInfo(color: PirateColor, animation: PirateAnimation) {
  const sheet = PIRATE_SHEETS[color];
  return sheet.animations[animation] || sheet.animations.idle;
}

/** Assign pirate to a ship crew */
export function assignToShip(unit: PirateUnit, shipId: string): PirateUnit {
  return { ...unit, shipId, state: 'boarding_ship', animation: 'walk' };
}

/** Remove pirate from ship crew */
export function removeFromShip(unit: PirateUnit): PirateUnit {
  return { ...unit, shipId: null, state: 'idle', animation: 'idle' };
}

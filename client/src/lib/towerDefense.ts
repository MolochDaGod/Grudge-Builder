/**
 * Tower Defense System
 *
 * Handles tower targeting, projectile flight, impact effects, and PvE wave spawning.
 * Towers are placed on capturable wild/fort islands (not home islands).
 * Uses Spire TowerPack assets for visuals.
 */

import { v4 as uuidv4 } from 'uuid';
import { TOWER_ASSETS, type TowerAssetDescriptor } from '@shared/definitions/islandAssetManifest';

// ── Enemy Types ───────────────────────────────────────────────────────────────

export interface Enemy {
  id: string;
  type: 'raider' | 'brute' | 'scout' | 'boss';
  hp: number;
  maxHp: number;
  speed: number; // tiles per second
  damage: number;
  /** World position in tile coords */
  x: number;
  y: number;
  /** Path waypoints to follow */
  path: { x: number; y: number }[];
  pathIndex: number;
  isDead: boolean;
  /** Loot dropped on death */
  goldReward: number;
  xpReward: number;
}

export const ENEMY_TEMPLATES: Record<Enemy['type'], Omit<Enemy, 'id' | 'x' | 'y' | 'path' | 'pathIndex' | 'isDead'>> = {
  scout:  { type: 'scout',  hp: 20,  maxHp: 20,  speed: 3.0, damage: 2,  goldReward: 5,   xpReward: 10 },
  raider: { type: 'raider', hp: 50,  maxHp: 50,  speed: 1.5, damage: 5,  goldReward: 10,  xpReward: 25 },
  brute:  { type: 'brute',  hp: 120, maxHp: 120, speed: 0.8, damage: 12, goldReward: 25,  xpReward: 50 },
  boss:   { type: 'boss',   hp: 500, maxHp: 500, speed: 0.5, damage: 30, goldReward: 100, xpReward: 200 },
};

// ── Tower Instance ────────────────────────────────────────────────────────────

export type TowerType = 'beam_tower' | 'catapult_tower';

export interface TowerInstance {
  id: string;
  type: TowerType;
  level: number; // 1-3
  /** Grid position */
  gridX: number;
  gridY: number;
  /** Targeting */
  range: number; // tiles
  fireRate: number; // shots per second
  damage: number;
  splashRadius: number; // 0 = single target (beam), > 0 = AoE (catapult)
  /** Current target */
  targetId: string | null;
  lastFiredAt: number;
}

const TOWER_STATS: Record<TowerType, { range: number; fireRate: number; damage: number[]; splashRadius: number }> = {
  beam_tower:     { range: 6, fireRate: 2.0, damage: [8, 14, 22],  splashRadius: 0 },
  catapult_tower: { range: 8, fireRate: 0.6, damage: [15, 25, 40], splashRadius: 2 },
};

export function createTowerInstance(
  type: TowerType,
  gridX: number,
  gridY: number,
  level: number = 1,
): TowerInstance {
  const stats = TOWER_STATS[type];
  return {
    id: uuidv4(),
    type,
    level: Math.min(3, Math.max(1, level)),
    gridX,
    gridY,
    range: stats.range,
    fireRate: stats.fireRate,
    damage: stats.damage[level - 1] || stats.damage[0],
    splashRadius: stats.splashRadius,
    targetId: null,
    lastFiredAt: 0,
  };
}

/** Upgrade tower to next level (max 3) */
export function upgradeTower(tower: TowerInstance): TowerInstance {
  if (tower.level >= 3) return tower;
  const newLevel = tower.level + 1;
  const stats = TOWER_STATS[tower.type];
  return {
    ...tower,
    level: newLevel,
    damage: stats.damage[newLevel - 1],
  };
}

// ── Projectile ────────────────────────────────────────────────────────────────

export interface Projectile {
  id: string;
  towerId: string;
  towerType: TowerType;
  /** Start position (tower) */
  startX: number;
  startY: number;
  /** Target position */
  targetX: number;
  targetY: number;
  damage: number;
  splashRadius: number;
  /** Flight time in ms */
  flightDuration: number;
  firedAt: number;
  hasImpacted: boolean;
}

export function createProjectile(tower: TowerInstance, targetX: number, targetY: number): Projectile {
  const dx = targetX - tower.gridX;
  const dy = targetY - tower.gridY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const flightSpeed = tower.type === 'beam_tower' ? 20 : 8; // tiles per second
  const flightDuration = (dist / flightSpeed) * 1000;

  return {
    id: uuidv4(),
    towerId: tower.id,
    towerType: tower.type,
    startX: tower.gridX,
    startY: tower.gridY,
    targetX,
    targetY,
    damage: tower.damage,
    splashRadius: tower.splashRadius,
    flightDuration,
    firedAt: Date.now(),
    hasImpacted: false,
  };
}

/** Get projectile position at current time (0-1 lerp) */
export function getProjectilePosition(proj: Projectile): { x: number; y: number; progress: number } {
  const elapsed = Date.now() - proj.firedAt;
  const progress = Math.min(1, elapsed / proj.flightDuration);
  return {
    x: proj.startX + (proj.targetX - proj.startX) * progress,
    y: proj.startY + (proj.targetY - proj.startY) * progress,
    progress,
  };
}

export function hasProjectileImpacted(proj: Projectile): boolean {
  return Date.now() - proj.firedAt >= proj.flightDuration;
}

// ── Targeting Logic ───────────────────────────────────────────────────────────

/** Find the closest enemy within tower range */
export function findTarget(tower: TowerInstance, enemies: Enemy[]): Enemy | null {
  let closest: Enemy | null = null;
  let closestDist = Infinity;

  for (const enemy of enemies) {
    if (enemy.isDead) continue;
    const dx = enemy.x - tower.gridX;
    const dy = enemy.y - tower.gridY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= tower.range && dist < closestDist) {
      closest = enemy;
      closestDist = dist;
    }
  }

  return closest;
}

/** Check if tower can fire (cooldown elapsed) */
export function canFire(tower: TowerInstance): boolean {
  const cooldownMs = 1000 / tower.fireRate;
  return Date.now() - tower.lastFiredAt >= cooldownMs;
}

// ── Damage Application ────────────────────────────────────────────────────────

/** Apply projectile impact damage to enemies */
export function applyImpact(
  proj: Projectile,
  enemies: Enemy[],
): { damaged: { enemyId: string; damage: number }[]; killed: string[] } {
  const damaged: { enemyId: string; damage: number }[] = [];
  const killed: string[] = [];

  for (const enemy of enemies) {
    if (enemy.isDead) continue;

    const dx = enemy.x - proj.targetX;
    const dy = enemy.y - proj.targetY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Single target: must be very close. AoE: within splash radius.
    const hitRadius = proj.splashRadius > 0 ? proj.splashRadius : 0.5;
    if (dist <= hitRadius) {
      // Damage falls off with distance for AoE
      const falloff = proj.splashRadius > 0 ? 1 - (dist / (proj.splashRadius + 0.1)) : 1;
      const finalDamage = Math.ceil(proj.damage * Math.max(0.3, falloff));

      enemy.hp -= finalDamage;
      damaged.push({ enemyId: enemy.id, damage: finalDamage });

      if (enemy.hp <= 0) {
        enemy.isDead = true;
        killed.push(enemy.id);
      }
    }
  }

  return { damaged, killed };
}

// ── Wave System ───────────────────────────────────────────────────────────────

export interface Wave {
  waveNumber: number;
  enemies: { type: Enemy['type']; count: number }[];
  spawnDelayMs: number; // ms between each enemy spawn
  /** Total gold/xp reward for clearing the wave */
  bonusGold: number;
  bonusXp: number;
}

/** Generate a wave based on difficulty (1-10) and wave number */
export function generateWave(difficulty: number, waveNumber: number): Wave {
  const scaledDifficulty = difficulty + Math.floor(waveNumber / 3);

  const enemies: Wave['enemies'] = [];
  // Scouts
  enemies.push({ type: 'scout', count: 2 + Math.floor(scaledDifficulty * 0.5) });
  // Raiders (appear from difficulty 3+)
  if (scaledDifficulty >= 3) {
    enemies.push({ type: 'raider', count: 1 + Math.floor((scaledDifficulty - 2) * 0.4) });
  }
  // Brutes (appear from difficulty 6+)
  if (scaledDifficulty >= 6) {
    enemies.push({ type: 'brute', count: Math.floor((scaledDifficulty - 5) * 0.3) });
  }
  // Boss every 5th wave
  if (waveNumber > 0 && waveNumber % 5 === 0) {
    enemies.push({ type: 'boss', count: 1 });
  }

  return {
    waveNumber,
    enemies,
    spawnDelayMs: Math.max(500, 2000 - scaledDifficulty * 100),
    bonusGold: 20 * waveNumber + difficulty * 5,
    bonusXp: 30 * waveNumber + difficulty * 10,
  };
}

/** Create enemy instances from a wave definition, spawning at the given position */
export function spawnWaveEnemies(
  wave: Wave,
  spawnX: number,
  spawnY: number,
  path: { x: number; y: number }[],
): Enemy[] {
  const spawned: Enemy[] = [];
  for (const group of wave.enemies) {
    const template = ENEMY_TEMPLATES[group.type];
    for (let i = 0; i < group.count; i++) {
      spawned.push({
        ...template,
        id: uuidv4(),
        x: spawnX,
        y: spawnY,
        path,
        pathIndex: 0,
        isDead: false,
      });
    }
  }
  return spawned;
}

// ── Asset Helpers ─────────────────────────────────────────────────────────────

/** Get the tower asset descriptor for a tower type */
export function getTowerAsset(type: TowerType): TowerAssetDescriptor | undefined {
  return TOWER_ASSETS.find(a => a.id === type);
}

/** Get the weapon spritesheet path for a tower at a specific level */
export function getTowerWeaponSprite(type: TowerType, level: number): string | undefined {
  const asset = getTowerAsset(type);
  if (!asset) return undefined;
  const weaponLevel = asset.weaponLevels.find(w => w.level === level);
  return weaponLevel?.path;
}

/**
 * WarAIBrain — lightweight goal-oriented AI for battle units.
 * Inspired by Dive/Yuka GOAP + existing CreatureBrain / AllyController.
 *
 * Goals (desirability scored each arbitration tick):
 *   hold   — hold spawn / banner line
 *   chase  — pursue nearest hostile in aggro
 *   attack — in range, face and strike
 *   flank  — circle to side of target
 *   flee   — low HP retreat toward spawn
 *   dead   — terminal
 */
import * as THREE from 'three';
import type { WarFactionId, WarRole } from '@shared/definitions/medievalBattleScene';
import { areFactionsHostile } from '@shared/definitions/medievalBattleScene';

function isHostileTo(
  self: WarFactionId,
  other: WarFactionId | 'structure',
): boolean {
  if (other === 'structure') return true; // siege walls/gates
  return areFactionsHostile(self, other);
}

export type WarGoal = 'hold' | 'chase' | 'attack' | 'flank' | 'flee' | 'siege' | 'dead';

export interface WarBrainConfig {
  faction: WarFactionId;
  role: WarRole;
  maxHp: number;
  attackRange: number;
  aggroRadius: number;
  moveSpeed: number;
}

export interface WarSenseTarget {
  id: string;
  faction: WarFactionId | 'structure';
  position: THREE.Vector3;
  hp: number;
  dead: boolean;
  /** wall fortification — siege target */
  kind?: 'unit' | 'wall';
}

export class WarAIBrain {
  goal: WarGoal = 'hold';
  targetId: string | null = null;
  private repathTimer = 0;
  private goalTimer = 0;
  private flankSign = Math.random() > 0.5 ? 1 : -1;
  readonly spawn = new THREE.Vector3();
  readonly moveDir = new THREE.Vector3();
  path: THREE.Vector3[] = [];
  pathIndex = 0;

  constructor(public cfg: WarBrainConfig) {}

  setSpawn(p: THREE.Vector3): void {
    this.spawn.copy(p);
  }

  /** Call ~4Hz */
  arbitrate(
    selfPos: THREE.Vector3,
    hp: number,
    hostiles: WarSenseTarget[],
    dt: number,
  ): WarGoal {
    this.goalTimer -= dt;
    if (hp <= 0) {
      this.goal = 'dead';
      this.targetId = null;
      return this.goal;
    }

    const nearestUnit = this.pickNearestHostile(selfPos, hostiles, 'unit');
    const nearestWall = this.pickNearestHostile(selfPos, hostiles, 'wall');
    const nearest = nearestUnit ?? nearestWall;
    const hpRatio = hp / Math.max(1, this.cfg.maxHp);

    // Desirability scores
    let hold = 0.25;
    let chase = 0;
    let attack = 0;
    let flank = 0;
    let flee = 0;
    let siege = 0;

    if (hpRatio < 0.22) flee = 0.95;
    if (!nearest) {
      hold = 0.7;
      // Idle infantry slowly pressure nearest wall
      if (nearestWall && (this.cfg.role === 'infantry' || this.cfg.role === 'captain')) {
        siege = 0.4;
      }
    } else {
      const dist = selfPos.distanceTo(nearest.position);
      const isWall = nearest.kind === 'wall';
      if (dist <= this.cfg.attackRange * (isWall ? 1.4 : 1.15)) {
        attack = isWall ? 0.88 : 0.9;
        if (!isWall && (this.cfg.role === 'infantry' || this.cfg.role === 'captain')) {
          flank = 0.35;
        }
      } else if (dist <= this.cfg.aggroRadius * (isWall ? 1.5 : 1)) {
        if (isWall) {
          siege = 0.72 + (1 - dist / (this.cfg.aggroRadius * 1.5)) * 0.2;
        } else {
          chase = 0.75 + (1 - dist / this.cfg.aggroRadius) * 0.2;
          if (this.cfg.role === 'archer' && dist < this.cfg.attackRange * 0.45) flee = 0.55;
        }
      } else {
        hold = 0.55;
        if (nearestWall && !nearestUnit) siege = 0.35;
      }
      if (this.cfg.role === 'captain') {
        chase += 0.1;
        siege += 0.08;
      }
      if (this.cfg.role === 'archer' && dist > 6 && dist < this.cfg.attackRange && !isWall) {
        attack = Math.max(attack, 0.85);
        chase *= 0.5;
      }
    }

    // Prefer fighting units over walls when both available
    if (nearestUnit && nearestWall) {
      siege *= 0.55;
    }

    const scores: Array<[WarGoal, number]> = [
      ['hold', hold],
      ['chase', chase],
      ['attack', attack],
      ['flank', flank],
      ['flee', flee],
      ['siege', siege],
    ];
    scores.sort((a, b) => b[1] - a[1]);
    const next = scores[0]![0];

    if (this.goalTimer <= 0 || next !== this.goal) {
      this.goal = next;
      this.goalTimer = 0.25 + Math.random() * 0.15;
      if (next === 'flee' || next === 'hold') {
        this.targetId = null;
      } else if (next === 'siege') {
        this.targetId = nearestWall?.id ?? null;
      } else {
        this.targetId = nearestUnit?.id ?? nearest?.id ?? null;
      }
      if (next === 'flank') this.flankSign *= -1;
    }

    return this.goal;
  }

  pickNearestHostile(
    selfPos: THREE.Vector3,
    hostiles: WarSenseTarget[],
    kind?: 'unit' | 'wall',
  ): WarSenseTarget | null {
    let best: WarSenseTarget | null = null;
    let bestD = Infinity;
    for (const h of hostiles) {
      if (h.dead || h.hp <= 0) continue;
      if (kind === 'wall' && h.kind !== 'wall') continue;
      if (kind === 'unit' && h.kind === 'wall') continue;
      if (!isHostileTo(this.cfg.faction, h.faction)) continue;
      const d = selfPos.distanceToSquared(h.position);
      if (d < bestD) {
        bestD = d;
        best = h;
      }
    }
    return best;
  }

  /** Steering target for current goal */
  computeMoveTarget(
    selfPos: THREE.Vector3,
    target: WarSenseTarget | null,
  ): THREE.Vector3 | null {
    switch (this.goal) {
      case 'hold': {
        if (selfPos.distanceTo(this.spawn) > 2.5) return this.spawn.clone();
        return null;
      }
      case 'flee':
        return this.spawn.clone();
      case 'chase':
      case 'siege':
        return target ? target.position.clone() : null;
      case 'flank': {
        if (!target) return null;
        const to = new THREE.Vector3().subVectors(target.position, selfPos);
        to.y = 0;
        if (to.lengthSq() < 0.01) return target.position.clone();
        to.normalize();
        const side = new THREE.Vector3(-to.z, 0, to.x).multiplyScalar(this.flankSign * 4);
        return target.position.clone().add(side);
      }
      case 'attack':
        // Kite slightly for archers (not vs walls)
        if (this.cfg.role === 'archer' && target && target.kind !== 'wall') {
          const dist = selfPos.distanceTo(target.position);
          if (dist < this.cfg.attackRange * 0.4) {
            const away = new THREE.Vector3().subVectors(selfPos, target.position).normalize();
            return selfPos.clone().add(away.multiplyScalar(3));
          }
        }
        // Approach wall until in melee/siege range
        if (target?.kind === 'wall') {
          const dist = selfPos.distanceTo(target.position);
          if (dist > this.cfg.attackRange * 1.1) return target.position.clone();
        }
        return null; // face and strike
      default:
        return null;
    }
  }

  shouldAttack(selfPos: THREE.Vector3, target: WarSenseTarget | null): boolean {
    if (
      this.goal !== 'attack' &&
      this.goal !== 'chase' &&
      this.goal !== 'flank' &&
      this.goal !== 'siege'
    ) {
      return false;
    }
    if (!target || target.dead) return false;
    const rangeMul = target.kind === 'wall' ? 1.45 : 1.2;
    const dist = selfPos.distanceTo(target.position);
    return dist <= this.cfg.attackRange * rangeMul;
  }
}

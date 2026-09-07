/**
 * Stage-aware tank / healer / DPS for the lava Caesar room.
 * Deterministic target pick (no Math.random). Uses AllyController + TerrainNavMesh.
 */
import * as THREE from 'three';
import type { AllyController, CombatTarget } from '../ai/AllyController';

export type LavaAllyRole = 'tank' | 'healer' | 'dps';

export interface LavaPartySnapshot {
  bossState: string;
  bossPos: THREE.Vector3;
  bossHpRatio: number;
  threatened: number;
  minions: CombatTarget[];
  fireballs: THREE.Vector3[];
  loadSlots: THREE.Vector3[];
  combatT: number;
}

function hashPick(seed: string, n: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return n <= 0 ? 0 : Math.abs(h) % n;
}

export class LavaCaesarPartyBrain {
  private members: { ally: AllyController; role: LavaAllyRole }[] = [];

  attach(ally: AllyController, role: LavaAllyRole): void {
    this.members.push({ ally, role });
    ally.commandAttackAggressive();
  }

  tick(dt: number, playerPos: THREE.Vector3, snap: LavaPartySnapshot): void {
    const living = this.members.filter((m) => m.ally.state !== 'dead');
    for (const m of living) {
      if (m.role === 'healer') this.tickHealer(m.ally, playerPos, snap, living);
      else if (m.role === 'tank') this.tickTank(m.ally, snap);
      else this.tickDps(m.ally, snap);
    }
    void dt;
  }

  private tickTank(ally: AllyController, snap: LavaPartySnapshot): void {
    const slot = snap.loadSlots[snap.threatened] ?? snap.loadSlots[0];
    if (snap.minions.length) {
      const onPad = snap.minions.filter((e) => {
        const p = snap.loadSlots[snap.threatened];
        return p ? e.position.distanceTo(p) < 8 : true;
      });
      const pool = onPad.length ? onPad : snap.minions;
      const i = hashPick(`tank:${snap.combatT.toFixed(0)}`, pool.length);
      ally.commandAttackTarget(pool[i]!);
      return;
    }
    if (snap.bossState === 'stunned' || snap.bossHpRatio < 0.35) {
      this.forceTarget(ally, {
        id: 'lava_caesar',
        position: snap.bossPos,
        hp: Math.max(1, snap.bossHpRatio * 100),
        dead: false,
      });
      return;
    }
    if (slot) ally.commandGuard();
  }

  private tickDps(ally: AllyController, snap: LavaPartySnapshot): void {
    if (snap.minions.length) {
      const i = hashPick(`dps:${ally.id}:${Math.floor(snap.combatT)}`, snap.minions.length);
      this.forceTarget(ally, snap.minions[i]!);
      return;
    }
    if (snap.fireballs.length && snap.bossState !== 'stunned') {
      ally.commandFollow(snap.fireballs[0]!);
      return;
    }
    this.forceTarget(ally, {
      id: 'lava_caesar',
      position: snap.bossPos,
      hp: Math.max(1, snap.bossHpRatio * 100),
      dead: snap.bossHpRatio <= 0,
    });
  }

  private tickHealer(
    ally: AllyController,
    playerPos: THREE.Vector3,
    snap: LavaPartySnapshot,
    living: { ally: AllyController; role: LavaAllyRole }[],
  ): void {
    const wounded = [...living, { ally: { hp: 1, stats: { maxHp: 1 }, model: { position: playerPos } } as AllyController, role: 'dps' as const }]
      .map((m) => m.ally)
      .filter((a) => a.hp / Math.max(1, a.stats.maxHp) < 0.72)
      .sort((a, b) => a.hp / a.stats.maxHp - b.hp / b.stats.maxHp);
    const need = wounded[0];
    if (need && need !== ally) {
      ally.commandFollow(need.model.position);
      need.hp = Math.min(need.stats.maxHp, need.hp + 12);
      return;
    }
    const safe = snap.loadSlots.find((_, i) => i !== snap.threatened) ?? snap.loadSlots[0];
    if (safe) ally.commandFollow(safe);
  }

  private forceTarget(ally: AllyController, t: CombatTarget): void {
    ally.commandAttackTarget(t);
  }

  clear(): void {
    this.members.length = 0;
  }
}

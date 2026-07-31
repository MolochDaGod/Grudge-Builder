/**
 * PIP Skull–style large boss fight SSOT
 *
 * Reference: https://bandinopla.github.io/pip-skull-demo/
 *   Three.js + Cannon-es action demo — giant skeleton boss, shockwaves,
 *   meteors/rocks, electric shocks, post FX (bloom / shockwave / VHS),
 *   intro roar, multi-phase agony.
 *
 * Also absorbs annihilate RobotBoss patterns: telegraphs, weakness windows,
 * sweeping beams, whirlwind, phase transitions.
 *
 * Used by: dungeon boss rooms, PvE boss_arena nodes, Hoth/event instances.
 */

export type PipBossPhaseId = 'intro' | 'phase1' | 'phase2' | 'phase3' | 'enrage' | 'dead';

export type PipBossAttackId =
  | 'idle_roar'
  | 'ground_slam'
  | 'shockwave_ring'
  | 'meteor_rain'
  | 'rock_throw'
  | 'electric_shock'
  | 'sweep_beam'
  | 'whirlwind_arms'
  | 'charge_stomp'
  | 'weakness_expose';

export interface PipBossAttackDef {
  id: PipBossAttackId;
  name: string;
  /** Wind-up before damage (s) — player reads telegraph */
  telegraphSec: number;
  /** Active damage window (s) */
  activeSec: number;
  /** Recovery after hit (s) */
  recoverSec: number;
  cooldownSec: number;
  damage: number;
  /** Hit shape */
  shape: 'melee_cone' | 'aoe_ring' | 'projectile' | 'beam' | 'radial_arms' | 'none';
  rangeM: number;
  /** For aoe_ring: inner dead zone (safe close?) — 0 = full disk */
  innerRadiusM?: number;
  arcRad?: number;
  /** Knock player down / stun */
  knockdown?: boolean;
  stunSec?: number;
  /** Horizontal knock speed (m/s) when hit — physical push */
  knockbackMps?: number;
  /** Upward launch (m/s) on hit */
  knockUpMps?: number;
  /** Spawns VFX key on WorldFxBus / BossCinemaFx */
  vfx: string;
  /** Weight for AI pick in phase */
  weight: number;
  /** After this attack, open weakness window */
  opensWeakness?: boolean;
}

export interface PipBossPhaseDef {
  id: PipBossPhaseId;
  name: string;
  /** Enter when HP ratio ≤ this (1 = start) */
  hpThreshold: number;
  scaleMult: number;
  speedMult: number;
  damageMult: number;
  attacks: PipBossAttackId[];
  /** Ambient FX intensity 0–1 (bloom pulse, aura) */
  cinemaIntensity: number;
  color: number;
}

export interface PipBossFightConfig {
  id: string;
  name: string;
  /** Human-relative scale (1.8 m human → boss height ≈ scale * 1.8 * heightMult) */
  baseScale: number;
  heightMult: number;
  maxHP: number;
  arenaRadiusM: number;
  leashRadiusM: number;
  aggroRadiusM: number;
  /** Weakness window after opensWeakness attacks */
  weaknessSec: number;
  /** Damage mult while weak (player DPS up) */
  weakDamageTakenMult: number;
  phases: PipBossPhaseDef[];
  attacks: Record<PipBossAttackId, PipBossAttackDef>;
  /** Hosts: boss room instance, boss_arena nodes, dungeon end */
  hostKinds: Array<'boss_room' | 'boss_arena' | 'dungeon' | 'event_island'>;
}

/** Default PIP-inspired giant skull / colossus kit. */
export const PIP_SKULL_BOSS_FIGHT: PipBossFightConfig = {
  id: 'pip_skull_colossus',
  name: 'Colossus Skull',
  baseScale: 4.5,
  heightMult: 2.2,
  maxHP: 48000,
  arenaRadiusM: 28,
  leashRadiusM: 42,
  aggroRadiusM: 36,
  weaknessSec: 6.5,
  weakDamageTakenMult: 2.4,
  hostKinds: ['boss_room', 'boss_arena', 'dungeon', 'event_island'],
  phases: [
    {
      id: 'intro',
      name: 'Awakening',
      hpThreshold: 1.0,
      scaleMult: 1.0,
      speedMult: 0.85,
      damageMult: 0.9,
      attacks: ['idle_roar', 'ground_slam'],
      cinemaIntensity: 0.45,
      color: 0x94a3b8,
    },
    {
      id: 'phase1',
      name: 'Stone Tyrant',
      hpThreshold: 0.99,
      scaleMult: 1.0,
      speedMult: 1.0,
      damageMult: 1.0,
      attacks: ['ground_slam', 'rock_throw', 'shockwave_ring', 'charge_stomp'],
      cinemaIntensity: 0.55,
      color: 0xcbd5e1,
    },
    {
      id: 'phase2',
      name: 'Meteor Crown',
      hpThreshold: 0.6,
      scaleMult: 1.08,
      speedMult: 1.15,
      damageMult: 1.25,
      attacks: [
        'meteor_rain',
        'shockwave_ring',
        'sweep_beam',
        'rock_throw',
        'ground_slam',
      ],
      cinemaIntensity: 0.75,
      color: 0xf97316,
    },
    {
      id: 'phase3',
      name: 'Storm Skull',
      hpThreshold: 0.3,
      scaleMult: 1.15,
      speedMult: 1.35,
      damageMult: 1.5,
      attacks: [
        'electric_shock',
        'whirlwind_arms',
        'meteor_rain',
        'shockwave_ring',
        'sweep_beam',
        'charge_stomp',
      ],
      cinemaIntensity: 1.0,
      color: 0xa78bfa,
    },
    {
      id: 'enrage',
      name: 'Agony',
      hpThreshold: 0.12,
      scaleMult: 1.22,
      speedMult: 1.55,
      damageMult: 1.85,
      attacks: [
        'electric_shock',
        'meteor_rain',
        'shockwave_ring',
        'whirlwind_arms',
        'charge_stomp',
      ],
      cinemaIntensity: 1.15,
      color: 0xef4444,
    },
  ],
  attacks: {
    idle_roar: {
      id: 'idle_roar',
      name: 'Roar',
      telegraphSec: 0.8,
      activeSec: 0.4,
      recoverSec: 0.6,
      cooldownSec: 12,
      damage: 0,
      shape: 'none',
      rangeM: 0,
      vfx: 'boss_roar',
      weight: 0.4,
      opensWeakness: false,
    },
    ground_slam: {
      id: 'ground_slam',
      name: 'Ground Slam',
      telegraphSec: 1.1,
      activeSec: 0.35,
      recoverSec: 0.9,
      cooldownSec: 5.5,
      damage: 420,
      shape: 'aoe_ring',
      rangeM: 9,
      knockdown: true,
      stunSec: 0.55,
      knockbackMps: 11,
      knockUpMps: 6.5,
      vfx: 'ground_slam',
      weight: 1.4,
      opensWeakness: true,
    },
    shockwave_ring: {
      id: 'shockwave_ring',
      name: 'Shockwave',
      telegraphSec: 0.95,
      activeSec: 0.55,
      recoverSec: 0.7,
      cooldownSec: 7,
      damage: 380,
      shape: 'aoe_ring',
      rangeM: 16,
      innerRadiusM: 2.2,
      knockdown: true,
      stunSec: 0.4,
      knockbackMps: 14,
      knockUpMps: 4.5,
      vfx: 'shockwave',
      weight: 1.3,
    },
    meteor_rain: {
      id: 'meteor_rain',
      name: 'Meteor Rain',
      telegraphSec: 1.4,
      activeSec: 2.2,
      recoverSec: 1.0,
      cooldownSec: 14,
      damage: 320,
      shape: 'projectile',
      rangeM: 22,
      knockdown: true,
      stunSec: 0.35,
      knockbackMps: 7,
      knockUpMps: 5,
      vfx: 'meteor_rain',
      weight: 1.1,
    },
    rock_throw: {
      id: 'rock_throw',
      name: 'Rock Throw',
      telegraphSec: 0.7,
      activeSec: 0.45,
      recoverSec: 0.5,
      cooldownSec: 4,
      damage: 280,
      shape: 'projectile',
      rangeM: 24,
      knockdown: true,
      stunSec: 0.3,
      knockbackMps: 9,
      knockUpMps: 3.5,
      vfx: 'rock_throw',
      weight: 1.5,
    },
    electric_shock: {
      id: 'electric_shock',
      name: 'Electric Shock',
      telegraphSec: 0.85,
      activeSec: 0.9,
      recoverSec: 0.8,
      cooldownSec: 11,
      damage: 260,
      shape: 'aoe_ring',
      rangeM: 12,
      stunSec: 1.4,
      knockbackMps: 3,
      knockUpMps: 1.2,
      vfx: 'electric_shock',
      weight: 1.2,
      opensWeakness: true,
    },
    sweep_beam: {
      id: 'sweep_beam',
      name: 'Sweep Beam',
      telegraphSec: 1.0,
      activeSec: 1.8,
      recoverSec: 0.6,
      cooldownSec: 13,
      damage: 300,
      shape: 'beam',
      rangeM: 20,
      arcRad: Math.PI * 0.9,
      stunSec: 0.25,
      knockbackMps: 8,
      knockUpMps: 2,
      vfx: 'sweep_beam',
      weight: 1.0,
    },
    whirlwind_arms: {
      id: 'whirlwind_arms',
      name: 'Whirlwind',
      telegraphSec: 0.9,
      activeSec: 2.0,
      recoverSec: 1.0,
      cooldownSec: 15,
      damage: 240,
      shape: 'radial_arms',
      rangeM: 11,
      knockdown: true,
      stunSec: 0.45,
      knockbackMps: 12,
      knockUpMps: 5.5,
      vfx: 'whirlwind',
      weight: 0.95,
    },
    charge_stomp: {
      id: 'charge_stomp',
      name: 'Charge Stomp',
      telegraphSec: 0.75,
      activeSec: 0.5,
      recoverSec: 0.7,
      cooldownSec: 8,
      damage: 360,
      shape: 'melee_cone',
      rangeM: 8,
      arcRad: Math.PI * 0.7,
      knockdown: true,
      stunSec: 0.5,
      knockbackMps: 13,
      knockUpMps: 4,
      vfx: 'charge_stomp',
      weight: 1.25,
    },
    weakness_expose: {
      id: 'weakness_expose',
      name: 'Exposed Core',
      telegraphSec: 0.2,
      activeSec: 0.1,
      recoverSec: 0.1,
      cooldownSec: 99,
      damage: 0,
      shape: 'none',
      rangeM: 0,
      vfx: 'weakness',
      weight: 0,
    },
  },
};

export function phaseForHpRatio(
  hpRatio: number,
  cfg: PipBossFightConfig = PIP_SKULL_BOSS_FIGHT,
): PipBossPhaseDef {
  if (hpRatio <= 0) {
    return {
      id: 'dead',
      name: 'Fallen',
      hpThreshold: 0,
      scaleMult: 1,
      speedMult: 0,
      damageMult: 0,
      attacks: [],
      cinemaIntensity: 0.2,
      color: 0x444444,
    };
  }
  // Lowest matching threshold
  let best = cfg.phases[0]!;
  for (const p of cfg.phases) {
    if (hpRatio <= p.hpThreshold + 1e-6) best = p;
  }
  // Prefer the phase with the lowest threshold that still >= hp
  const eligible = cfg.phases
    .filter((p) => hpRatio <= p.hpThreshold + 1e-6)
    .sort((a, b) => a.hpThreshold - b.hpThreshold);
  return eligible[0] ?? best;
}

export function pickPipBossAttack(
  phase: PipBossPhaseDef,
  cooldowns: Map<string, number>,
  cfg: PipBossFightConfig = PIP_SKULL_BOSS_FIGHT,
  rng: () => number = Math.random,
): PipBossAttackDef | null {
  const pool: { atk: PipBossAttackDef; w: number }[] = [];
  for (const id of phase.attacks) {
    const atk = cfg.attacks[id];
    if (!atk) continue;
    const cd = cooldowns.get(id) ?? 0;
    if (cd > 0) continue;
    pool.push({ atk, w: atk.weight });
  }
  if (!pool.length) return null;
  const total = pool.reduce((s, p) => s + p.w, 0);
  let r = rng() * total;
  for (const p of pool) {
    r -= p.w;
    if (r <= 0) return p.atk;
  }
  return pool[pool.length - 1]!.atk;
}

/** SI height of boss mesh (m). */
export function pipBossHeightM(cfg: PipBossFightConfig = PIP_SKULL_BOSS_FIGHT): number {
  return 1.8 * cfg.baseScale * cfg.heightMult;
}

/** Player is inside expanding shockwave band. */
export function inShockwaveBand(
  dist: number,
  waveRadius: number,
  thickness = 1.6,
  innerSafe = 0,
): boolean {
  if (dist < innerSafe) return false;
  return dist >= waveRadius - thickness && dist <= waveRadius + thickness * 0.35;
}

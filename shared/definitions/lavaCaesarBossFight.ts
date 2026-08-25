/**
 * Lava Caesar platform fight — volcanic instance kit on LargeBossFightSystem.
 *
 * Author look: scene (3) = lava arena + dark_slayer_caesar + tornado.
 * Recolor: Caesar albedo shifted to stylized-fire-tornado / lava palette.
 *
 * Loop: surface → dive under lava → rise + tornado (1) up through one platform
 * → 3 lava_monster adds (one / platform, Mixamo + annihilate chase/attack)
 * → kill all before boss returns or they explode and crack that platform
 * → fire_twister linear path toward player
 * → dead add becomes fireball (2); walk-through stuns boss
 *   Dead clip → 2.5 s, then 2.5↔2.0 × 16 (8 s extra damage), rewind Dead.
 */
import {
  PIP_SKULL_BOSS_FIGHT,
  type PipBossFightConfig,
} from './pipSkullBossFight';

export const LAVA_CAESAR_CDN = {
  boss: 'https://assets.grudge-studio.com/models/bosses/lava-caesar/dark_slayer_caesar_fire.glb',
  tornado: 'https://assets.grudge-studio.com/models/bosses/lava-caesar/fire_tornado.glb',
  tornadoUp: 'https://assets.grudge-studio.com/models/bosses/lava-caesar/fire_tornado_up.glb',
  minion: 'https://assets.grudge-studio.com/models/bosses/lava-caesar/lava_monster.glb',
  fireball: 'https://assets.grudge-studio.com/models/bosses/lava-caesar/fireball_stun.glb',
  flame: 'https://assets.grudge-studio.com/models/bosses/lava-caesar/cartoonish_flame.glb',
  explorer: 'https://assets.grudge-studio.com/models/characters/explorer/adventurer.glb',
} as const;

export const LAVA_CAESAR_LOCAL = {
  boss: '/models/bosses/lava-caesar/dark_slayer_caesar_fire.glb',
  tornado: '/models/bosses/lava-caesar/fire_tornado.glb',
  tornadoUp: '/models/bosses/lava-caesar/fire_tornado_up.glb',
  minion: '/models/bosses/lava-caesar/lava_monster.glb',
  fireball: '/models/bosses/lava-caesar/fireball_stun.glb',
  flame: '/models/bosses/lava-caesar/cartoonish_flame.glb',
  explorer: '/models/characters/explorer/adventurer.glb',
} as const;

export const LAVA_CAESAR_LOAD = {
  boss: [LAVA_CAESAR_CDN.boss, LAVA_CAESAR_LOCAL.boss],
  tornado: [LAVA_CAESAR_CDN.tornado, LAVA_CAESAR_LOCAL.tornado],
  tornadoUp: [LAVA_CAESAR_CDN.tornadoUp, LAVA_CAESAR_LOCAL.tornadoUp],
  minion: [LAVA_CAESAR_CDN.minion, LAVA_CAESAR_LOCAL.minion],
  fireball: [LAVA_CAESAR_CDN.fireball, LAVA_CAESAR_LOCAL.fireball],
  flame: [LAVA_CAESAR_CDN.flame, LAVA_CAESAR_LOCAL.flame],
  explorer: [LAVA_CAESAR_CDN.explorer, LAVA_CAESAR_LOCAL.explorer],
} as const;

export interface LavaCaesarKitDef {
  platformCount: number;
  /** Adventurer load-on slots (one per platform). */
  loadSlots: number;
  /** Ring radius from arena center (m) */
  platformRadiusM: number;
  /** Platform deck height above lava (m) */
  platformDeckM: number;
  platformRadiusSizeM: number;
  /** Time to kill all three before explode */
  minionKillWindowSec: number;
  minionHp: number;
  minionHeightM: number;
  minionAttackRangeM: number;
  minionAttackCooldownSec: number;
  minionDamage: number;
  minionSpeedMps: number;
  /** Mixamo clip windows on the single lava_monster mixamo.com take */
  minionClip: {
    idle: [number, number];
    walk: [number, number];
    attack: [number, number];
  };
  tornadoUpDurationSec: number;
  twisterSpeedMps: number;
  twisterHitRadiusM: number;
  twisterLifeSec: number;
  fireballPickupRadiusM: number;
  /** Collapse: play Dead from 0 to this mark */
  stunDeadToSec: number;
  /** Stun loop window on Dead (2.0 ↔ 2.5) */
  stunLoopMinSec: number;
  stunLoopMaxSec: number;
  /** One-way trips (2.5→2, 2→2.5, …) during the 8s stun */
  stunLoopRepeats: number;
  stunHandsLoopSec: number;
  stunRewindSec: number;
  stunDamageTakenMult: number;
  submergedDamageTakenMult: number;
  platformExplodeDamage: number;
  lavaSplashDamage: number;
  lavaSplashRadiusM: number;
  lavaSplashCooldownSec: number;
  lavaStandDepthM: number;
  minionKillBossHpFrac: number;
  landingAoeDamage: number;
  landingAoeRadiusM: number;
  flamePatchLifeSec: number;
  flamePatchRadiusM: number;
  flameDpsPerStack: number;
  flameMaxStacks: number;
  gravityScale: number;
  diveDurationSec: number;
  submergedSec: number;
  riseDurationSec: number;
  bossHeightM: number;
}

export const LAVA_CAESAR_KIT: LavaCaesarKitDef = {
  platformCount: 4,
  loadSlots: 4,
  platformRadiusM: 14,
  platformDeckM: 3.4,
  platformRadiusSizeM: 3.6,
  minionKillWindowSec: 22,
  minionHp: 720,
  minionHeightM: 2.0,
  minionAttackRangeM: 2.4,
  minionAttackCooldownSec: 1.6,
  minionDamage: 85,
  minionSpeedMps: 3.4,
  // 8.767 s Mixamo take: hold / travel / strike (annihilate Mutant cadence)
  minionClip: {
    idle: [0.0, 2.1],
    walk: [2.1, 5.1],
    attack: [5.1, 8.76],
  },
  tornadoUpDurationSec: 1.7,
  twisterSpeedMps: 7.2,
  twisterHitRadiusM: 2.3,
  twisterLifeSec: 6.2,
  fireballPickupRadiusM: 1.6,
  stunDeadToSec: 2.5,
  stunLoopMinSec: 2.0,
  stunLoopMaxSec: 2.5,
  stunLoopRepeats: 16,
  stunHandsLoopSec: 8,
  stunRewindSec: 2,
  stunDamageTakenMult: 3.0,
  submergedDamageTakenMult: 0.2,
  platformExplodeDamage: 220,
  lavaSplashDamage: 55,
  lavaSplashRadiusM: 3.2,
  lavaSplashCooldownSec: 0.85,
  lavaStandDepthM: 0.55,
  minionKillBossHpFrac: 0.04,
  landingAoeDamage: 180,
  landingAoeRadiusM: 3.5,
  flamePatchLifeSec: 6.5,
  flamePatchRadiusM: 2.4,
  flameDpsPerStack: 18,
  flameMaxStacks: 5,
  gravityScale: 0.5,
  diveDurationSec: 1.8,
  submergedSec: 2.4,
  riseDurationSec: 1.9,
  bossHeightM: 6.5,
};

export const LAVA_CAESAR_BOSS_FIGHT: PipBossFightConfig = {
  id: 'lava_caesar_slayer',
  name: 'Caesar Ember-Slayer',
  baseScale: 3.6,
  heightMult: 1.0,
  maxHP: 36000,
  arenaRadiusM: 26,
  leashRadiusM: 38,
  aggroRadiusM: 34,
  weaknessSec: 8,
  weakDamageTakenMult: 3.0,
  hostKinds: ['boss_room', 'boss_arena', 'dungeon', 'event_island'],
  phases: [
    {
      id: 'intro',
      name: 'Awakening',
      hpThreshold: 1.0,
      scaleMult: 1.0,
      speedMult: 0.9,
      damageMult: 0.95,
      attacks: ['idle_roar'],
      cinemaIntensity: 0.55,
      color: 0xff6a00,
    },
    {
      id: 'phase1',
      name: 'Magma Crown',
      hpThreshold: 0.99,
      scaleMult: 1.0,
      speedMult: 1.0,
      damageMult: 1.0,
      attacks: ['fire_twister', 'ground_slam', 'charge_stomp', 'lava_dive'],
      cinemaIntensity: 0.7,
      color: 0xff4d00,
    },
    {
      id: 'phase2',
      name: 'Brood Tide',
      hpThreshold: 0.62,
      scaleMult: 1.05,
      speedMult: 1.12,
      damageMult: 1.2,
      attacks: ['fire_twister', 'lava_dive', 'ground_slam', 'charge_stomp', 'shockwave_ring'],
      cinemaIntensity: 0.85,
      color: 0xff2200,
    },
    {
      id: 'phase3',
      name: 'Ash Cyclone',
      hpThreshold: 0.32,
      scaleMult: 1.1,
      speedMult: 1.28,
      damageMult: 1.4,
      attacks: ['fire_twister', 'lava_dive', 'whirlwind_arms', 'charge_stomp'],
      cinemaIntensity: 1.0,
      color: 0xffb347,
    },
    {
      id: 'enrage',
      name: 'Crustbreak',
      hpThreshold: 0.12,
      scaleMult: 1.16,
      speedMult: 1.45,
      damageMult: 1.7,
      attacks: ['fire_twister', 'lava_dive', 'ground_slam', 'whirlwind_arms'],
      cinemaIntensity: 1.15,
      color: 0xef4444,
    },
  ],
  attacks: {
    ...PIP_SKULL_BOSS_FIGHT.attacks,
    ground_slam: {
      ...PIP_SKULL_BOSS_FIGHT.attacks.ground_slam,
      name: 'Magma Slam',
      vfx: 'ground_slam',
      damage: 380,
    },
    lava_dive: {
      ...PIP_SKULL_BOSS_FIGHT.attacks.lava_dive,
      weight: 1.2,
    },
    lava_rise_tornado: PIP_SKULL_BOSS_FIGHT.attacks.lava_rise_tornado,
    spawn_lava_minions: PIP_SKULL_BOSS_FIGHT.attacks.spawn_lava_minions,
    fire_twister: PIP_SKULL_BOSS_FIGHT.attacks.fire_twister,
  },
};

export function isLavaCaesarFight(cfg: { id?: string } | null | undefined): boolean {
  return cfg?.id === LAVA_CAESAR_BOSS_FIGHT.id;
}

export function lavaPlatformLocal(index: number, kit: LavaCaesarKitDef = LAVA_CAESAR_KIT) {
  const ang = (index / kit.platformCount) * Math.PI * 2 - Math.PI / 2;
  return {
    x: Math.cos(ang) * kit.platformRadiusM,
    z: Math.sin(ang) * kit.platformRadiusM,
    ang,
  };
}

/** Wall-clock of the Dead ping-pong: 16 × 0.5 s = 8 s. */
export function lavaStunLoopDurationSec(kit: LavaCaesarKitDef = LAVA_CAESAR_KIT): number {
  const win = Math.max(0.01, kit.stunLoopMaxSec - kit.stunLoopMinSec);
  return kit.stunLoopRepeats * win;
}

export function clipNameIncludes(name: string, ...needles: string[]): boolean {
  const n = name.toLowerCase();
  return needles.some((k) => n.includes(k.toLowerCase()));
}

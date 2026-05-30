/**
 * Orc Warrior Boss — "Ghar'Thok the Unbroken"
 *
 * A 3-phase boss enemy using the Meshy AI Orc Warrior biped model.
 * 20 baked GLB animations with full mesh (withSkin).
 *
 * Phase 1 (100-60% HP): Sword & Shield — measured attacks, blocks, shield bashes.
 * Phase 2 (60-25% HP):  Enraged — drops shield, charged slashes, faster combos.
 * Phase 3 (25-0% HP):   Berserker — spartan kicks, dodge rolls, relentless aggro.
 *
 * Server-authoritative: the server runs the FSM and validates damage.
 * Client renders animations and VFX based on state snapshots.
 */

// ── Model Path ───────────────────────────────────────────────────────────────

export const ORC_BOSS_MODEL_BASE = 'D:/Games/Models/OrcWarriorBoss/Meshy_AI_Orc_Warrior_biped';
export const ORC_BOSS_MODEL_PREFIX = 'Meshy_AI_Orc_Warrior_biped_Animation_';

// ── Animation Map ────────────────────────────────────────────────────────────

/** Every GLB animation keyed by a short action name */
export const ORC_BOSS_ANIMS = {
  // Combat
  attack:           `${ORC_BOSS_MODEL_PREFIX}Attack_withSkin.glb`,
  charged_slash:    `${ORC_BOSS_MODEL_PREFIX}Charged_Slash_withSkin.glb`,
  spartan_kick:     `${ORC_BOSS_MODEL_PREFIX}Spartan_Kick_withSkin.glb`,
  shield_push:      `${ORC_BOSS_MODEL_PREFIX}Shield_Push_Left_withSkin.glb`,
  bow_charge:       `${ORC_BOSS_MODEL_PREFIX}Female_Bow_Charge_Left_Hand_inplace_withSkin.glb`,
  // Defense
  block:            `${ORC_BOSS_MODEL_PREFIX}Block5_withSkin.glb`,
  dodge_roll:       `${ORC_BOSS_MODEL_PREFIX}Roll_Dodge_3_withSkin.glb`,
  knock_down:       `${ORC_BOSS_MODEL_PREFIX}Knock_Down_1_withSkin.glb`,
  stand_up:         `${ORC_BOSS_MODEL_PREFIX}Stand_Up1_withSkin.glb`,
  // Movement
  walk:             `${ORC_BOSS_MODEL_PREFIX}Walking_withSkin.glb`,
  run:              `${ORC_BOSS_MODEL_PREFIX}Running_withSkin.glb`,
  run_fast:         `${ORC_BOSS_MODEL_PREFIX}run_fast_6_inplace_withSkin.glb`,
  turn_left:        `${ORC_BOSS_MODEL_PREFIX}Idle_Turn_Left_withSkin.glb`,
  turn_right:       `${ORC_BOSS_MODEL_PREFIX}Idle_Turn_Right_withSkin.glb`,
  jump:             `${ORC_BOSS_MODEL_PREFIX}Basic_Jump_withSkin.glb`,
  // State
  idle:             `${ORC_BOSS_MODEL_PREFIX}Idle_03_withSkin.glb`,
  idle_alt:         `${ORC_BOSS_MODEL_PREFIX}Idle_7_withSkin.glb`,
  combat_stance:    `${ORC_BOSS_MODEL_PREFIX}Combat_Stance_withSkin.glb`,
  hit_reaction:     `${ORC_BOSS_MODEL_PREFIX}Face_Punch_Reaction_1_withSkin.glb`,
  dead:             `${ORC_BOSS_MODEL_PREFIX}Dead_withSkin.glb`,
} as const;

export type OrcBossAnimKey = keyof typeof ORC_BOSS_ANIMS;

// ── Stats ────────────────────────────────────────────────────────────────────

export interface OrcBossStats {
  maxHP: number;
  currentHP: number;
  defense: number;
  attackPower: number;
  moveSpeed: number;        // meters per second
  runSpeed: number;
  aggroRadius: number;      // meters — detects players within this range
  leashRadius: number;      // meters — resets if pulled beyond this from spawn
  turnRate: number;         // radians per second
  level: number;
  /** Scale multiplier (1.0 = normal orc size, boss is 1.8x) */
  scale: number;
}

export const ORC_BOSS_BASE_STATS: OrcBossStats = {
  maxHP: 25000,
  currentHP: 25000,
  defense: 180,
  attackPower: 350,
  moveSpeed: 3.5,
  runSpeed: 7.0,
  aggroRadius: 30,
  leashRadius: 80,
  turnRate: Math.PI * 1.5,
  level: 8,
  scale: 1.8,
};

// ── Boss Phases ──────────────────────────────────────────────────────────────

export type BossPhase = 'phase1' | 'phase2' | 'phase3';

export interface PhaseConfig {
  /** Phase triggers when HP drops to this % (1.0 = 100%) */
  hpThreshold: number;
  /** Phase display name */
  name: string;
  /** Available attack actions in this phase */
  attacks: AttackPattern[];
  /** Movement speed multiplier for this phase */
  speedMultiplier: number;
  /** Defense multiplier */
  defenseMultiplier: number;
  /** Attack power multiplier */
  attackMultiplier: number;
  /** Transition animation when entering this phase */
  enterAnim: OrcBossAnimKey;
  /** Phase-specific VFX key */
  vfxKey: string;
}

export interface AttackPattern {
  id: string;
  /** Animation to play */
  anim: OrcBossAnimKey;
  /** Damage dealt on hit */
  damage: number;
  /** Hitbox range in meters */
  range: number;
  /** Hitbox arc in radians (π = 180° frontal cone) */
  arc: number;
  /** Cooldown in seconds before this attack can be used again */
  cooldownSec: number;
  /** Wind-up time in seconds (telegraph duration — player can dodge) */
  telegraphSec: number;
  /** Whether this attack can be blocked by the player */
  blockable: boolean;
  /** Whether this attack knocks the player down */
  knockdown: boolean;
  /** Priority weight for AI selection (higher = more likely) */
  weight: number;
  /** Optional follow-up attack ID (combo chain) */
  comboFollowUp?: string;
}

export const ORC_BOSS_PHASES: Record<BossPhase, PhaseConfig> = {
  /** Phase 1: Sword & Shield — deliberate, defensive, tests the player */
  phase1: {
    hpThreshold: 1.0,
    name: 'The Unbroken',
    speedMultiplier: 1.0,
    defenseMultiplier: 1.3,  // extra tanky with shield
    attackMultiplier: 1.0,
    enterAnim: 'combat_stance',
    vfxKey: 'boss_aura_green',
    attacks: [
      {
        id: 'slash',
        anim: 'attack',
        damage: 280,
        range: 3.5,
        arc: Math.PI * 0.6,
        cooldownSec: 2.0,
        telegraphSec: 0.6,
        blockable: true,
        knockdown: false,
        weight: 40,
      },
      {
        id: 'shield_bash',
        anim: 'shield_push',
        damage: 180,
        range: 2.5,
        arc: Math.PI * 0.4,
        cooldownSec: 5.0,
        telegraphSec: 0.4,
        blockable: false,
        knockdown: true,
        weight: 25,
        comboFollowUp: 'slash',
      },
      {
        id: 'block_counter',
        anim: 'block',
        damage: 0,
        range: 0,
        arc: Math.PI,
        cooldownSec: 3.0,
        telegraphSec: 0.0,
        blockable: false,
        knockdown: false,
        weight: 20,
      },
      {
        id: 'bow_shot',
        anim: 'bow_charge',
        damage: 200,
        range: 25,
        arc: Math.PI * 0.1,
        cooldownSec: 8.0,
        telegraphSec: 1.2,
        blockable: true,
        knockdown: false,
        weight: 15,
      },
    ],
  },

  /** Phase 2: Enraged — drops shield, faster, charged slashes, more damage */
  phase2: {
    hpThreshold: 0.6,
    name: 'Enraged',
    speedMultiplier: 1.3,
    defenseMultiplier: 0.8,  // shield dropped, less defense
    attackMultiplier: 1.5,
    enterAnim: 'stand_up',   // roar animation on phase transition
    vfxKey: 'boss_aura_orange',
    attacks: [
      {
        id: 'charged_slash',
        anim: 'charged_slash',
        damage: 500,
        range: 4.0,
        arc: Math.PI * 0.8,
        cooldownSec: 4.0,
        telegraphSec: 1.0,
        blockable: true,
        knockdown: true,
        weight: 35,
      },
      {
        id: 'fast_slash',
        anim: 'attack',
        damage: 320,
        range: 3.5,
        arc: Math.PI * 0.6,
        cooldownSec: 1.5,
        telegraphSec: 0.3,
        blockable: true,
        knockdown: false,
        weight: 35,
        comboFollowUp: 'fast_slash',  // can chain into itself
      },
      {
        id: 'kick',
        anim: 'spartan_kick',
        damage: 250,
        range: 2.8,
        arc: Math.PI * 0.3,
        cooldownSec: 6.0,
        telegraphSec: 0.5,
        blockable: false,
        knockdown: true,
        weight: 20,
      },
      {
        id: 'dodge_reposition',
        anim: 'dodge_roll',
        damage: 0,
        range: 0,
        arc: 0,
        cooldownSec: 4.0,
        telegraphSec: 0.0,
        blockable: false,
        knockdown: false,
        weight: 10,
      },
    ],
  },

  /** Phase 3: Berserker — no defense, maximum aggression, rapid combos */
  phase3: {
    hpThreshold: 0.25,
    name: 'Berserker',
    speedMultiplier: 1.6,
    defenseMultiplier: 0.5,
    attackMultiplier: 2.0,
    enterAnim: 'stand_up',
    vfxKey: 'boss_aura_red',
    attacks: [
      {
        id: 'berserker_combo',
        anim: 'attack',
        damage: 400,
        range: 3.5,
        arc: Math.PI * 0.7,
        cooldownSec: 1.0,
        telegraphSec: 0.2,
        blockable: true,
        knockdown: false,
        weight: 30,
        comboFollowUp: 'berserker_kick',
      },
      {
        id: 'berserker_kick',
        anim: 'spartan_kick',
        damage: 350,
        range: 3.0,
        arc: Math.PI * 0.4,
        cooldownSec: 3.0,
        telegraphSec: 0.3,
        blockable: false,
        knockdown: true,
        weight: 25,
        comboFollowUp: 'charged_finisher',
      },
      {
        id: 'charged_finisher',
        anim: 'charged_slash',
        damage: 700,
        range: 4.5,
        arc: Math.PI,
        cooldownSec: 6.0,
        telegraphSec: 1.2,
        blockable: true,
        knockdown: true,
        weight: 20,
      },
      {
        id: 'leap_slam',
        anim: 'jump',
        damage: 450,
        range: 5.0,
        arc: Math.PI * 2,  // 360° AoE on landing
        cooldownSec: 8.0,
        telegraphSec: 0.8,
        blockable: false,
        knockdown: true,
        weight: 15,
      },
      {
        id: 'dodge_counter',
        anim: 'dodge_roll',
        damage: 0,
        range: 0,
        arc: 0,
        cooldownSec: 2.0,
        telegraphSec: 0.0,
        blockable: false,
        knockdown: false,
        weight: 10,
      },
    ],
  },
};

// ── AI Behavior Parameters ───────────────────────────────────────────────────

export interface OrcBossAIConfig {
  /** Time between AI decision ticks (seconds) */
  decisionInterval: number;
  /** Preferred combat distance (meters) — boss tries to stay at this range */
  preferredRange: number;
  /** If player is beyond this range, boss charges (run_fast) */
  chargeRange: number;
  /** Boss blocks when player attacks within this window (seconds before hit) */
  blockReactionWindow: number;
  /** Chance (0-1) to dodge incoming attack per phase */
  dodgeChance: Record<BossPhase, number>;
  /** Seconds of idle before boss taunts or repositions */
  idleTimeout: number;
  /** Max combo chain length per phase */
  maxComboLength: Record<BossPhase, number>;
}

export const ORC_BOSS_AI_CONFIG: OrcBossAIConfig = {
  decisionInterval: 0.3,
  preferredRange: 3.0,
  chargeRange: 12.0,
  blockReactionWindow: 0.4,
  dodgeChance: { phase1: 0.1, phase2: 0.25, phase3: 0.4 },
  idleTimeout: 3.0,
  maxComboLength: { phase1: 2, phase2: 3, phase3: 4 },
};

// ── Loot Table ───────────────────────────────────────────────────────────────

export interface LootDrop {
  itemId: string;
  name: string;
  dropChance: number;  // 0-1
  minQuantity: number;
  maxQuantity: number;
  tier: number;        // T1-T8
}

export const ORC_BOSS_LOOT: LootDrop[] = [
  // Guaranteed drops
  { itemId: 'orc_boss_trophy',      name: "Ghar'Thok's Tusk",           dropChance: 1.0,  minQuantity: 1, maxQuantity: 1, tier: 6 },
  { itemId: 'rare_ore',             name: 'Blackiron Ore',               dropChance: 1.0,  minQuantity: 3, maxQuantity: 8, tier: 5 },
  // Rare drops
  { itemId: 'orc_boss_weapon',      name: "Unbroken Cleaver",            dropChance: 0.15, minQuantity: 1, maxQuantity: 1, tier: 7 },
  { itemId: 'orc_boss_shield',      name: "Warlord's Bulwark",           dropChance: 0.12, minQuantity: 1, maxQuantity: 1, tier: 7 },
  { itemId: 'orc_boss_armor',       name: "Berserker's Plate",           dropChance: 0.10, minQuantity: 1, maxQuantity: 1, tier: 7 },
  // Uncommon drops
  { itemId: 'fire_crystals',        name: 'Fire Crystal',                dropChance: 0.40, minQuantity: 1, maxQuantity: 3, tier: 5 },
  { itemId: 'beast_hides',          name: 'Thick Orc Hide',              dropChance: 0.60, minQuantity: 2, maxQuantity: 5, tier: 4 },
  { itemId: 'gouldstone_fragment',  name: 'Gouldstone Fragment',         dropChance: 0.05, minQuantity: 1, maxQuantity: 1, tier: 8 },
];

// ── FSM State Types ──────────────────────────────────────────────────────────

export type OrcBossState =
  | 'idle'
  | 'patrol'
  | 'alert'
  | 'chase'
  | 'engage'
  | 'attacking'
  | 'telegraphing'
  | 'blocking'
  | 'dodging'
  | 'hit_stagger'
  | 'knocked_down'
  | 'standing_up'
  | 'phase_transition'
  | 'dead'
  | 'leash_reset';

/** Determine which phase the boss is in based on current HP ratio */
export function getBossPhase(currentHP: number, maxHP: number): BossPhase {
  const ratio = currentHP / maxHP;
  if (ratio <= ORC_BOSS_PHASES.phase3.hpThreshold) return 'phase3';
  if (ratio <= ORC_BOSS_PHASES.phase2.hpThreshold) return 'phase2';
  return 'phase1';
}

/** Pick a weighted-random attack from the current phase */
export function pickAttack(phase: BossPhase, cooldowns: Map<string, number>): AttackPattern | null {
  const attacks = ORC_BOSS_PHASES[phase].attacks.filter(
    a => !cooldowns.has(a.id) || cooldowns.get(a.id)! <= 0
  );
  if (attacks.length === 0) return null;

  const totalWeight = attacks.reduce((s, a) => s + a.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const atk of attacks) {
    roll -= atk.weight;
    if (roll <= 0) return atk;
  }
  return attacks[attacks.length - 1];
}

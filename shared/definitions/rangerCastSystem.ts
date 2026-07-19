/**
 * Ranger (Rager) Cast / Stealth SSOT — CANONICAL
 *
 * F        = Fade / Invis (core stealth)
 * Shift+1  = Clean Strike (invis) | Poison Strike (melee visible) | Power Shot leap (ranged)
 * Shift+2  = Multi Shot | Shadow Step
 * Shift+3  = Explosive Shot | Poison Blade (dual poison) | Trap Mastery
 * Shift+4  = Rain of Arrows (vis) / Headshot (invis) | Assassinate
 * Shift+5  = Storm of Arrows (clone) | Shadow Master
 *
 * Poisons configured in Log Book UI; apply % on hit, 100% on crit / Precision.
 * Exhaustion stacks punish failed assassinate / triple rain hits.
 */

import { BIND, type CastBinding } from './grimoireCastSystem';

export { BIND };

// ── Stealth / Fade ───────────────────────────────────────────────────────────

export interface FadeInvisRules {
  abilityId: 'ranger_fade';
  name: 'Fade';
  /** Seconds before ability usable again */
  cooldownSec: number;
  /** Activation / channel to enter invis */
  activateSec: number;
  /** Move speed multiplier while faded (0.8 = −20%) */
  moveSpeedMult: number;
  /** Cleanse all damage-over-time on successful Fade */
  cleanseDotOnEnter: boolean;
  /** Not targetable by single-target until broken */
  untargetable: boolean;
  /** Break conditions */
  break: {
    /** Direct hit / direct contact */
    directContact: boolean;
    /** Any AoE that hits the ranger */
    aoeHit: boolean;
    /**
     * Face-cone reveal: only if the *detector* unit has been stationary
     * (not moving) for at least `detectorStationarySec` seconds, AND the
     * invisible unit is within faceProximityMeters of their face cone.
     * Moving NPCs/players never face-reveal stealth.
     */
    faceProximityMeters: number;
    /** Face cone half-angle degrees (forward FOV) */
    faceConeDeg: number;
    /** Detector must not have moved for this long before face-cone can reveal */
    detectorStationarySec: number;
    /** Max horizontal speed (m/s) treated as "stationary" for the detector */
    detectorStationarySpeedMax: number;
    /** Player attack that is not stealth-tagged */
    offensiveActionUnlessStealthSkill: boolean;
  };
}

export const RANGER_FADE: FadeInvisRules = {
  abilityId: 'ranger_fade',
  name: 'Fade',
  cooldownSec: 30,
  activateSec: 0.2,
  moveSpeedMult: 0.8,
  cleanseDotOnEnter: true,
  untargetable: true,
  break: {
    directContact: true,
    aoeHit: true,
    faceProximityMeters: 1.0,
    faceConeDeg: 60,
    detectorStationarySec: 2.0,
    detectorStationarySpeedMax: 0.15,
    offensiveActionUnlessStealthSkill: true,
  },
};

/**
 * Pure helper: can unit A face-reveal invisible unit B?
 * A must be facing B within cone, distance ≤ 1m, and A stationary ≥ 2s.
 */
export function canFaceRevealInvis(opts: {
  detectorSpeedMps: number;
  detectorStationaryForSec: number;
  /** Dot product of detector forward · direction to invisible (normalized) */
  facingDot: number;
  distanceM: number;
  rules?: FadeInvisRules['break'];
}): boolean {
  const r = opts.rules ?? RANGER_FADE.break;
  if (opts.detectorSpeedMps > r.detectorStationarySpeedMax) return false;
  if (opts.detectorStationaryForSec < r.detectorStationarySec) return false;
  if (opts.distanceM > r.faceProximityMeters) return false;
  const minDot = Math.cos((r.faceConeDeg * Math.PI) / 180);
  return opts.facingDot >= minDot;
}

/** Time after leaving invis still counts as "stealth window" for Assassinate bonus */
export const STEALTH_LINGER_SEC = 3;

// ── Exhaustion ───────────────────────────────────────────────────────────────

export interface ExhaustionRules {
  /** Applied when Assassinate fails to kill (visible mode) */
  onFailedAssassinate: number;
  /** Applied when hit by all 3 Rain of Arrows volleys */
  onTripleRainHit: number;
  /** Max stacks */
  maxStacks: number;
  /** Per stack: +% ability GCD or −% move (design: mild combat tax) */
  moveSlowPerStack: number;
  abilityCostMultPerStack: number;
  durationSec: number;
}

export const EXHAUSTION_RULES: ExhaustionRules = {
  onFailedAssassinate: 1,
  onTripleRainHit: 1,
  maxStacks: 5,
  moveSlowPerStack: 0.05,
  abilityCostMultPerStack: 0.08,
  durationSec: 20,
};

// ── Poisons (Log Book UI) ────────────────────────────────────────────────────

export type PoisonId = 'slow' | 'dot' | 'drain' | 'armor_break';

export interface PoisonDef {
  id: PoisonId;
  name: string;
  description: string;
  /** Base chance on any attack when this poison is selected */
  applyChance: number;
  maxStacks: number;
  /** Duration of each stack application */
  durationSec: number;
  /** Stack effect summary */
  stackEffect: string;
}

/**
 * Player may equip up to 2 poisons when Poison Blade is chosen (Shift+3 path).
 * Default: one poison without mastery.
 */
export const RANGER_POISONS: PoisonDef[] = [
  {
    id: 'slow',
    name: 'Crippling Toxin',
    description: 'Slows the target. Stacks intensify the slow.',
    applyChance: 0.2,
    maxStacks: 3,
    durationSec: 5,
    stackEffect: 'Slow stacks up to 3× (design: ~5–8% move per stack, capped).',
  },
  {
    id: 'dot',
    name: 'Venom Burn',
    description: '1% of target max HP as DoT over 10s per stack.',
    applyChance: 0.2,
    maxStacks: 5,
    durationSec: 10,
    stackEffect: '1% max HP over 10s per stack (up to 5).',
  },
  {
    id: 'drain',
    name: 'Mana Leech Toxin',
    description: 'Increases target mana & stamina ability costs.',
    applyChance: 0.3,
    maxStacks: 2,
    durationSec: 12,
    stackEffect: '+5% mana/stamina costs per stack (max 2 → +10%).',
  },
  {
    id: 'armor_break',
    name: 'Corrosive Oil',
    description: 'Reduces armor.',
    applyChance: 0.5,
    maxStacks: 5,
    durationSec: 12,
    stackEffect: '−2% armor per stack (max 5 → −10%).',
  },
];

export const POISON_APPLY = {
  /** Always apply selected poison(s) on critical hits */
  onCrit: 1.0,
  /** Precision / Hunter's Instinct tagged hits */
  onPrecision: 1.0,
  /** Trap Mastery: traps always apply poison */
  onTrapWithMastery: 1.0,
} as const;

export interface PoisonBladeState {
  /** Max 2 when Poison Blade talent active; else 1 */
  selected: PoisonId[];
  dualPoisonUnlocked: boolean;
}

// ── Shift bar option trees ───────────────────────────────────────────────────

export type RangerWeaponContext = 'melee' | 'ranged' | 'any';
export type RangerStealthContext = 'invis' | 'visible' | 'stealth_window' | 'any';

export interface RangerAbilityOption {
  abilityId: string;
  name: string;
  description: string;
  cooldownSec: number;
  /** When this option is available */
  requiresStealth?: RangerStealthContext;
  requiresWeapon?: RangerWeaponContext;
  skillTreeId?: string;
  tags?: string[];
}

export interface RangerSlotDef {
  bind: CastBinding;
  /** Spec / loadout pick among options */
  options: RangerAbilityOption[];
  defaultAbilityId: string;
}

export const RANGER_SHIFT_BAR: RangerSlotDef[] = [
  // ── F: Fade ──────────────────────────────────────────────────────────────
  {
    bind: BIND.F,
    defaultAbilityId: 'ranger_fade',
    options: [
      {
        abilityId: 'ranger_fade',
        name: 'Fade',
        description:
          '0.2s enter invis. −20% move. Untargetable. Cleanse DoTs. Broken by AoE, contact, or 1m face proximity. 30s CD.',
        cooldownSec: 30,
        tags: ['stealth', 'defensive'],
        skillTreeId: 'ranger_10_vanish',
      },
    ],
  },

  // ── Shift+1 ──────────────────────────────────────────────────────────────
  {
    bind: BIND.S1,
    defaultAbilityId: 'ranger_clean_strike',
    options: [
      {
        abilityId: 'ranger_clean_strike',
        name: 'Clean Strike',
        description:
          'Stealth strike from Fade. If stealthed on hit: stun target 3s. Breaks Fade on hit.',
        cooldownSec: 8,
        requiresStealth: 'invis',
        requiresWeapon: 'any',
        tags: ['stealth', 'melee', 'stun'],
        skillTreeId: 'ranger_1_stealth_strike',
      },
      {
        abilityId: 'ranger_poison_strike',
        name: 'Poison Strike',
        description:
          '2m throw or dash stab with toxin. Target slowed 5% for 5s. Applies selected poisons (chance). 10s CD.',
        cooldownSec: 10,
        requiresStealth: 'visible',
        requiresWeapon: 'melee',
        tags: ['melee', 'poison'],
      },
      {
        abilityId: 'ranger_powershot',
        name: 'Power Shot',
        description:
          'Leap back ~2m into the air, aim 1s at crosshair, fire headshot-class shot. AoE push on hit + self recoil push. 8s CD.',
        cooldownSec: 8,
        requiresStealth: 'any',
        requiresWeapon: 'ranged',
        tags: ['ranged', 'mobility', 'knockback'],
        skillTreeId: 'ranger_0_powershot',
      },
    ],
  },

  // ── Shift+2 ──────────────────────────────────────────────────────────────
  {
    bind: BIND.S2,
    defaultAbilityId: 'ranger_multishot',
    options: [
      {
        abilityId: 'ranger_multishot',
        name: 'Multi Shot',
        description:
          'Fire at the 3 closest enemies. If fewer than 3, remaining arrows hit the same target again.',
        cooldownSec: 6,
        requiresWeapon: 'ranged',
        tags: ['ranged', 'aoe'],
        skillTreeId: 'ranger_1_multishot',
      },
      {
        abilityId: 'ranger_shadow_step',
        name: 'Shadow Step',
        description:
          'Teleport strike: appear on target, stun, enter Fade (invis). Uses Fade rules; does not consume Fade CD if already invis.',
        cooldownSec: 15,
        tags: ['stealth', 'mobility', 'stun'],
        skillTreeId: 'ranger_5_shadow_step',
      },
    ],
  },

  // ── Shift+3 ──────────────────────────────────────────────────────────────
  {
    bind: BIND.S3,
    defaultAbilityId: 'ranger_explosive_shot',
    options: [
      {
        abilityId: 'ranger_explosive_shot',
        name: 'Explosive Shot',
        description:
          'Select ground AoE: large explosion, heavy pushback. 12s CD.',
        cooldownSec: 12,
        requiresWeapon: 'ranged',
        tags: ['ranged', 'aoe', 'knockback'],
        skillTreeId: 'ranger_5_explosive_arrow',
      },
      {
        abilityId: 'ranger_poison_blade',
        name: 'Poison Blade',
        description:
          'Toggle mastery: apply two Log Book poisons at once on attacks. Passive once unlocked.',
        cooldownSec: 0,
        tags: ['poison', 'passive_toggle'],
      },
      {
        abilityId: 'ranger_trap_mastery',
        name: 'Trap Mastery',
        description:
          'Up to 2 traps deployed at once. Traps deal +50% damage, +50% AoE, and apply poison at 100%.',
        cooldownSec: 0,
        tags: ['trap', 'passive_toggle'],
        skillTreeId: 'ranger_10_trap',
      },
    ],
  },

  // ── Shift+4 ──────────────────────────────────────────────────────────────
  {
    bind: BIND.S4,
    defaultAbilityId: 'ranger_rain_of_arrows',
    options: [
      {
        abilityId: 'ranger_rain_of_arrows',
        name: 'Rain of Arrows',
        description:
          'Visible only. Select ground: three volleys. Hit 1× = slow; 2× = stun; 3× = Exhaustion stack on target.',
        cooldownSec: 20,
        requiresStealth: 'visible',
        requiresWeapon: 'ranged',
        tags: ['ranged', 'aoe', 'cc'],
        skillTreeId: 'ranger_10_arrow_volley',
      },
      {
        abilityId: 'ranger_headshot',
        name: 'Headshot',
        description:
          'Invis only. 3s cast → 200% crit attack. If not blocked: 1.5s stun. Breaks Fade on release.',
        cooldownSec: 18,
        requiresStealth: 'invis',
        requiresWeapon: 'ranged',
        tags: ['ranged', 'stealth', 'crit', 'stun'],
      },
      {
        abilityId: 'ranger_assassinate',
        name: 'Assassinate',
        description:
          'Visible: teleport crit if target <10% HP; fail kill → Exhaustion. Invis or ≤3s out of Fade: 2× poison apply + 10% HP as DoT over 6s; poisons deal 2× for 10s.',
        cooldownSec: 25,
        tags: ['melee', 'execute', 'poison', 'stealth'],
      },
    ],
  },

  // ── Shift+5 ──────────────────────────────────────────────────────────────
  {
    bind: BIND.S5,
    defaultAbilityId: 'ranger_storm_of_arrows',
    options: [
      {
        abilityId: 'ranger_storm_of_arrows',
        name: 'Storm of Arrows',
        description:
          'Place a clone locked on your focus target. Clone Power Shots 3× or until melee-hit → stun trap on attacker (2s).',
        cooldownSec: 45,
        requiresWeapon: 'ranged',
        tags: ['ultimate', 'clone', 'ranged'],
      },
      {
        abilityId: 'ranger_shadow_master',
        name: 'Shadow Master',
        description:
          'Near-invis phase 7s. Stealth skills usable with 1s GCD. Return 40% damage taken to attacker for duration.',
        cooldownSec: 90,
        tags: ['ultimate', 'stealth', 'reflect'],
      },
    ],
  },
];

// ── Traps ────────────────────────────────────────────────────────────────────

export interface TrapRules {
  maxDeployedDefault: number;
  maxDeployedWithMastery: number;
  masteryDamageMult: number;
  masteryAoeMult: number;
  masteryPoisonChance: number;
  rootDurationSec: number;
}

export const TRAP_RULES: TrapRules = {
  maxDeployedDefault: 1,
  maxDeployedWithMastery: 2,
  masteryDamageMult: 1.5,
  masteryAoeMult: 1.5,
  masteryPoisonChance: 1.0,
  rootDurationSec: 4,
};

// ── Power Shot detail ────────────────────────────────────────────────────────

export const POWER_SHOT = {
  leapBackMeters: 2,
  leapHeightMeters: 2,
  aimSec: 1.0,
  aoePush: true,
  selfRecoilPush: true,
  headshotFocus: true,
} as const;

// ── Multi Shot ───────────────────────────────────────────────────────────────

export const MULTI_SHOT = {
  maxTargets: 3,
  /** If only 1–2 enemies, spare shots re-hit primary */
  refillSameTarget: true,
} as const;

// ── Rain of Arrows / Headshot ────────────────────────────────────────────────

export const RAIN_OF_ARROWS = {
  volleys: 3,
  onHitOnce: 'slow' as const,
  onHitTwice: 'stun' as const,
  onHitThrice: 'exhaustion' as const,
} as const;

export const HEADSHOT = {
  castSec: 3,
  damageCritMult: 2.0,
  stunIfUnblockedSec: 1.5,
} as const;

// ── Assassinate ──────────────────────────────────────────────────────────────

export const ASSASSINATE = {
  visibleExecuteHpFrac: 0.1,
  failGivesExhaustion: true,
  stealthBonus: {
    poisonApplications: 2,
    hpDotFrac: 0.1,
    hpDotDurationSec: 6,
    poisonEffectMult: 2,
    poisonEffectDurationSec: 10,
  },
  stealthWindowSec: STEALTH_LINGER_SEC,
} as const;

// ── Storm / Shadow Master ────────────────────────────────────────────────────

export const STORM_OF_ARROWS = {
  clonePowerShots: 3,
  cloneBreaksOnMelee: true,
  meleeBreakStunTrapSec: 2,
} as const;

export const SHADOW_MASTER = {
  durationSec: 7,
  stealthAbilityGcdSec: 1,
  damageReflectFrac: 0.4,
  nearInvis: true,
} as const;

// ── Loadout UI state ─────────────────────────────────────────────────────────

export type RangerSlotKey = 's1' | 's2' | 's3' | 's4' | 's5';

export interface RangerLoadoutState {
  /** Chosen option abilityId per Shift slot */
  choices: Partial<Record<RangerSlotKey, string>>;
  poisons: PoisonBladeState;
  trapMasteryActive: boolean;
  poisonBladeActive: boolean;
  /** Shadow Master / Storm pick lives in choices.s5 */
}

export const DEFAULT_RANGER_LOADOUT: RangerLoadoutState = {
  choices: {
    s1: 'ranger_poison_strike',
    s2: 'ranger_multishot',
    s3: 'ranger_explosive_shot',
    s4: 'ranger_rain_of_arrows',
    s5: 'ranger_storm_of_arrows',
  },
  poisons: { selected: ['slow'], dualPoisonUnlocked: false },
  trapMasteryActive: false,
  poisonBladeActive: false,
};

// ── Resolve cast ─────────────────────────────────────────────────────────────

export interface RangerCastContext {
  isInvisible: boolean;
  /** Seconds since Fade broke (null if never / long ago) */
  secSinceVisible: number | null;
  weapon: RangerWeaponContext;
  loadout: RangerLoadoutState;
  /** Fade still on CD */
  fadeOnCooldown: boolean;
}

export type RangerResolved =
  | { kind: 'ability'; abilityId: string; bind: CastBinding; variantNote?: string }
  | { kind: 'none'; reason: string };

function stealthCtx(ctx: RangerCastContext): RangerStealthContext {
  if (ctx.isInvisible) return 'invis';
  if (ctx.secSinceVisible != null && ctx.secSinceVisible <= STEALTH_LINGER_SEC) {
    return 'stealth_window';
  }
  return 'visible';
}

function optionMatches(
  opt: RangerAbilityOption,
  ctx: RangerCastContext,
  sc: RangerStealthContext,
): boolean {
  if (opt.requiresWeapon && opt.requiresWeapon !== 'any' && opt.requiresWeapon !== ctx.weapon) {
    return false;
  }
  if (!opt.requiresStealth || opt.requiresStealth === 'any') return true;
  if (opt.requiresStealth === 'invis') return sc === 'invis';
  if (opt.requiresStealth === 'visible') return sc === 'visible';
  if (opt.requiresStealth === 'stealth_window') {
    return sc === 'invis' || sc === 'stealth_window';
  }
  return true;
}

/**
 * Auto-pick Shift+1 / Shift+4 variant from stealth + weapon when player
 * left default multi-option; otherwise honor loadout choice if valid.
 */
export function resolveRangerCast(
  ctx: RangerCastContext,
  bind: CastBinding,
): RangerResolved {
  const slot = RANGER_SHIFT_BAR.find((s) => s.bind.id === bind.id);
  if (!slot) return { kind: 'none', reason: 'Unknown bind' };

  const sc = stealthCtx(ctx);

  // F = Fade always
  if (bind.id === BIND.F.id) {
    if (ctx.fadeOnCooldown) return { kind: 'none', reason: 'Fade on cooldown (30s)' };
    if (ctx.isInvisible) return { kind: 'none', reason: 'Already faded' };
    return { kind: 'ability', abilityId: 'ranger_fade', bind };
  }

  const key: RangerSlotKey | null =
    bind.id === BIND.S1.id
      ? 's1'
      : bind.id === BIND.S2.id
        ? 's2'
        : bind.id === BIND.S3.id
          ? 's3'
          : bind.id === BIND.S4.id
            ? 's4'
            : bind.id === BIND.S5.id
              ? 's5'
              : null;

  if (!key) return { kind: 'none', reason: 'Not a ranger combat bind' };

  // Dynamic S1: stealth vs melee vs ranged if choice invalid
  if (key === 's1') {
    const preferred = ctx.loadout.choices.s1;
    const preferredOpt = slot.options.find((o) => o.abilityId === preferred);
    if (preferredOpt && optionMatches(preferredOpt, ctx, sc)) {
      return { kind: 'ability', abilityId: preferredOpt.abilityId, bind };
    }
    // Auto: invis → clean strike; ranged → powershot; else poison strike
    if (sc === 'invis') {
      return {
        kind: 'ability',
        abilityId: 'ranger_clean_strike',
        bind,
        variantNote: 'auto:stealthed',
      };
    }
    if (ctx.weapon === 'ranged') {
      return {
        kind: 'ability',
        abilityId: 'ranger_powershot',
        bind,
        variantNote: 'auto:ranged',
      };
    }
    return {
      kind: 'ability',
      abilityId: 'ranger_poison_strike',
      bind,
      variantNote: 'auto:melee_visible',
    };
  }

  // Dynamic S4: rain vs headshot by stealth; assassinate if chosen
  if (key === 's4') {
    const preferred = ctx.loadout.choices.s4;
    if (preferred === 'ranger_assassinate') {
      return { kind: 'ability', abilityId: 'ranger_assassinate', bind };
    }
    if (sc === 'invis') {
      return {
        kind: 'ability',
        abilityId: 'ranger_headshot',
        bind,
        variantNote: 'auto:invis_headshot',
      };
    }
    if (preferred === 'ranger_headshot' || preferred === 'ranger_rain_of_arrows' || !preferred) {
      return {
        kind: 'ability',
        abilityId: preferred === 'ranger_headshot' ? 'ranger_rain_of_arrows' : preferred || 'ranger_rain_of_arrows',
        bind,
      };
    }
    const opt = slot.options.find((o) => o.abilityId === preferred);
    if (opt && optionMatches(opt, ctx, sc)) {
      return { kind: 'ability', abilityId: opt.abilityId, bind };
    }
    return { kind: 'ability', abilityId: 'ranger_rain_of_arrows', bind };
  }

  // S2 / S3 / S5 — honor loadout if valid
  const chosenId = ctx.loadout.choices[key] ?? slot.defaultAbilityId;
  const opt = slot.options.find((o) => o.abilityId === chosenId) ?? slot.options[0];
  if (!opt) return { kind: 'none', reason: 'No option' };
  if (!optionMatches(opt, ctx, sc)) {
    const fallback = slot.options.find((o) => optionMatches(o, ctx, sc));
    if (!fallback) return { kind: 'none', reason: 'No valid option for state' };
    return { kind: 'ability', abilityId: fallback.abilityId, bind };
  }

  // Toggle talents
  if (opt.abilityId === 'ranger_poison_blade') {
    return {
      kind: 'ability',
      abilityId: 'ranger_poison_blade',
      bind,
      variantNote: 'toggle dual-poison mode',
    };
  }
  if (opt.abilityId === 'ranger_trap_mastery') {
    return {
      kind: 'ability',
      abilityId: 'ranger_trap_mastery',
      bind,
      variantNote: 'toggle trap mastery',
    };
  }

  return { kind: 'ability', abilityId: opt.abilityId, bind };
}

// ── Poison application helper ────────────────────────────────────────────────

export function poisonApplyChance(
  base: number,
  isCrit: boolean,
  isPrecision: boolean,
): number {
  if (isCrit || isPrecision) return POISON_APPLY.onCrit;
  return base;
}

export function maxSelectedPoisons(loadout: RangerLoadoutState): number {
  return loadout.poisonBladeActive || loadout.poisons.dualPoisonUnlocked ? 2 : 1;
}

// ── Log Book / UI copy ───────────────────────────────────────────────────────

export const RANGER_UI_COPY = {
  title: 'Ranger Log Book',
  fadeHint: 'F — Fade (30s CD · 0.2s · cleanse DoT · −20% speed · untargetable)',
  poisonHint: 'Select up to 2 poisons when Poison Blade is active (Shift+3 path).',
  stealthHint:
    'Invis breaks: AoE, contact, or 1m face-cone only if detector has been stationary ≥2s. Clean Strike / Headshot need Fade.',
  exhaustionHint: 'Failed Assassinate or triple Rain hits apply Exhaustion.',
} as const;

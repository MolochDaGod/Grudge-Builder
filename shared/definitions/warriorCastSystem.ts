/**
 * Warrior Cast / Stance SSOT — CANONICAL
 *
 * F        = Charge (uMMORPG weapon skill) — dash, 0.5s stun/disrupt, 6s CD
 * Shift+1  = Invincible (personal immunity + AoE taunt)
 * Shift+2  = Taunt  OR  Quick Strike (next attack hits 2×)
 *            Damage Surge + Guardian's Aura = PASSIVES (no hotkey)
 * Shift+3  = Life Drain | Shield Wall | Dual Combo Stun  (level-10 pick)
 * Shift+4  = Execute | Double Strike
 * Shift+5  = Avatar of War | Perfect Counter
 */

import { BIND, type CastBinding } from './grimoireCastSystem';

export { BIND };

// ── F: Charge (uMMORPG) ──────────────────────────────────────────────────────

export interface ChargeRules {
  abilityId: 'warrior_charge';
  name: 'Charge';
  /** Source: uMMORPG weapon skill family */
  source: 'ummorpg_weapon_skill';
  cooldownSec: number;
  /** Stun + interrupt / disrupt duration on first hit */
  stunDisruptSec: number;
  /** Dash toward target or cursor */
  dash: boolean;
  staminaCost: number;
  tags: string[];
}

export const WARRIOR_CHARGE: ChargeRules = {
  abilityId: 'warrior_charge',
  name: 'Charge',
  source: 'ummorpg_weapon_skill',
  cooldownSec: 6,
  stunDisruptSec: 0.5,
  dash: true,
  staminaCost: 15,
  tags: ['gapclose', 'stun', 'interrupt', 'ummorpg'],
};

// ── Passives (no hotkey) ─────────────────────────────────────────────────────

export interface DamageSurgePassive {
  abilityId: 'warrior_damage_surge_passive';
  name: 'Damage Surge';
  skillTreeId: 'warrior_5_damage_surge';
  /** Enter surge if this fraction of max HP is taken within window */
  damageTakenFrac: number;
  windowSec: number;
  buff: {
    durationSec: number;
    damageMult: number;
    critChanceAdd: number;
    attacksCauseBleed: boolean;
  };
  /** Internal CD so surge cannot re-proc instantly */
  internalCdSec: number;
}

/** If character takes ≥10% max HP damage in ≤2s → Damage Surge buff */
export const DAMAGE_SURGE_PASSIVE: DamageSurgePassive = {
  abilityId: 'warrior_damage_surge_passive',
  name: 'Damage Surge',
  skillTreeId: 'warrior_5_damage_surge',
  damageTakenFrac: 0.1,
  windowSec: 2,
  buff: {
    durationSec: 6,
    damageMult: 1.4,
    critChanceAdd: 0.25,
    attacksCauseBleed: true,
  },
  internalCdSec: 20,
};

export interface GuardiansAuraPassive {
  abilityId: 'warrior_guardian_aura_passive';
  name: "Guardian's Aura";
  skillTreeId: 'warrior_5_guardian_aura';
  radiusM: number;
  allyDefenseMult: number;
  /** Fraction of ally damage redirected to warrior */
  shareAllyDamageFrac: number;
  alwaysOn: true;
}

/** Always-on passive — no hotkey */
export const GUARDIANS_AURA_PASSIVE: GuardiansAuraPassive = {
  abilityId: 'warrior_guardian_aura_passive',
  name: "Guardian's Aura",
  skillTreeId: 'warrior_5_guardian_aura',
  radiusM: 5,
  allyDefenseMult: 1.3,
  shareAllyDamageFrac: 0.15,
  alwaysOn: true,
};

// ── Shift bar ────────────────────────────────────────────────────────────────

export interface WarriorAbilityOption {
  abilityId: string;
  name: string;
  description: string;
  cooldownSec: number;
  durationSec?: number;
  skillTreeId?: string;
  tags?: string[];
  /** Level gate for UI */
  minLevel?: number;
}

export interface WarriorSlotDef {
  bind: CastBinding;
  options: WarriorAbilityOption[];
  defaultAbilityId: string;
}

export const WARRIOR_SHIFT_BAR: WarriorSlotDef[] = [
  {
    bind: BIND.F,
    defaultAbilityId: 'warrior_charge',
    options: [
      {
        abilityId: 'warrior_charge',
        name: 'Charge',
        description:
          'uMMORPG dash into target. On contact: 0.5s stun + disrupt/interrupt. 6s CD.',
        cooldownSec: 6,
        tags: ['gapclose', 'stun', 'ummorpg'],
      },
    ],
  },
  {
    bind: BIND.S1,
    defaultAbilityId: 'warrior_invincible',
    options: [
      {
        abilityId: 'warrior_invincible',
        name: 'Invincible',
        description:
          'Brief immunity to damage + AoE taunt. On use: removes all cleansable debuffs (same as Mana Shield).',
        cooldownSec: 45,
        durationSec: 3,
        skillTreeId: 'warrior_invincibility',
        tags: ['immunity', 'taunt', 'aoe', 'cleanse'],
      },
    ],
  },
  {
    bind: BIND.S2,
    defaultAbilityId: 'warrior_taunt',
    options: [
      {
        abilityId: 'warrior_taunt',
        name: 'Taunt',
        description:
          'Force nearby enemies to attack you for 3s. +20% damage reduction while active.',
        cooldownSec: 8,
        durationSec: 3,
        skillTreeId: 'warrior_1_taunt',
        tags: ['taunt', 'threat'],
      },
      {
        abilityId: 'warrior_quick_strike',
        name: 'Quick Strike',
        description:
          'Buff: your next attack hits 2× (double strike on next swing). Low cost, short CD.',
        cooldownSec: 4,
        skillTreeId: 'warrior_1_quickstrike',
        tags: ['buff', 'damage'],
      },
    ],
  },
  {
    bind: BIND.S3,
    defaultAbilityId: 'warrior_life_drain',
    options: [
      {
        abilityId: 'warrior_life_drain',
        name: 'Life Drain',
        description:
          'Strike that heals you for a portion of damage dealt. Sustain path (level 10).',
        cooldownSec: 12,
        minLevel: 10,
        tags: ['lifesteal', 'sustain'],
      },
      {
        abilityId: 'warrior_shield_wall',
        name: 'Shield Wall',
        description:
          'Raise defense: block most frontal damage, reflect a portion. Best with shield.',
        cooldownSec: 18,
        skillTreeId: 'warrior_10_shield_wall',
        minLevel: 10,
        tags: ['defense', 'block'],
      },
      {
        abilityId: 'warrior_dual_combo_stun',
        name: 'Dual Combo Stun',
        description:
          'Two-hit combo: second hit stuns. Dual-wield / 1H path (level 10).',
        cooldownSec: 14,
        minLevel: 10,
        tags: ['stun', 'combo', 'melee'],
      },
    ],
  },
  {
    bind: BIND.S4,
    defaultAbilityId: 'warrior_execute',
    options: [
      {
        abilityId: 'warrior_execute',
        name: 'Execute',
        description:
          'Finisher vs wounded foes. High damage below 30% HP; execute threshold below 10%. CD reset on kill.',
        cooldownSec: 15,
        skillTreeId: 'warrior_10_execute',
        tags: ['execute', 'damage'],
      },
      {
        abilityId: 'warrior_double_strike',
        name: 'Double Strike',
        description:
          'Immediately attack twice with full weapon damage. Short gap-filler CD.',
        cooldownSec: 8,
        tags: ['damage', 'melee'],
      },
    ],
  },
  {
    bind: BIND.S5,
    defaultAbilityId: 'warrior_avatar',
    options: [
      {
        abilityId: 'warrior_avatar',
        name: 'Avatar of War',
        description:
          '25s battle form. Magic immune. +20% attack. +100% armor. Attacks: 25% stun, 10% Exhaustion. 2 min CD.',
        cooldownSec: 120,
        durationSec: 25,
        skillTreeId: 'warrior_20_avatar',
        tags: ['ultimate', 'immunity', 'buff'],
      },
      {
        abilityId: 'warrior_perfect_counter',
        name: 'Perfect Counter',
        description:
          '3.5s spiritual guard: every incoming attack is a perfect parry + knockback. 25s CD.',
        cooldownSec: 25,
        durationSec: 3.5,
        tags: ['ultimate', 'parry', 'knockback'],
      },
    ],
  },
];

// ── Avatar / Perfect Counter detail ──────────────────────────────────────────

export const AVATAR_OF_WAR = {
  abilityId: 'warrior_avatar' as const,
  durationSec: 25,
  cooldownSec: 120,
  magicImmune: true,
  attackMult: 1.2,
  /** +100% armor → multiply armor by 2 */
  armorMult: 2.0,
  onHitStunChance: 0.25,
  onHitExhaustionChance: 0.1,
} as const;

export const PERFECT_COUNTER = {
  abilityId: 'warrior_perfect_counter' as const,
  durationSec: 3.5,
  cooldownSec: 25,
  perfectParryAllIncoming: true,
  knockbackOnParry: true,
  spiritualHelpVfx: true,
} as const;

export const INVINCIBLE = {
  abilityId: 'warrior_invincible' as const,
  /** Duration of damage immunity — tune in combat balance */
  durationSec: 3,
  cooldownSec: 45,
  aoeTaunt: true,
  tauntRadiusM: 8,
  tauntDurationSec: 3,
} as const;

export const QUICK_STRIKE = {
  abilityId: 'warrior_quick_strike' as const,
  /** Next attack deals 2 hits / 2× damage events */
  nextAttackHitCount: 2,
  cooldownSec: 4,
} as const;

// ── Loadout ──────────────────────────────────────────────────────────────────

export type WarriorSlotKey = 's2' | 's3' | 's4' | 's5';

export interface WarriorLoadoutState {
  choices: Partial<Record<WarriorSlotKey, string>>;
  /** Level-10 path for Shift+3 */
  level10Path?: 'life_drain' | 'shield_wall' | 'dual_combo_stun';
  /** Apex */
  apex?: 'avatar' | 'perfect_counter';
}

export const DEFAULT_WARRIOR_LOADOUT: WarriorLoadoutState = {
  choices: {
    s2: 'warrior_taunt',
    s3: 'warrior_shield_wall',
    s4: 'warrior_execute',
    s5: 'warrior_avatar',
  },
  level10Path: 'shield_wall',
  apex: 'avatar',
};

// ── Resolve ──────────────────────────────────────────────────────────────────

export interface WarriorCastContext {
  loadout: WarriorLoadoutState;
  level: number;
  chargeOnCd: boolean;
  invincibleOnCd: boolean;
}

export type WarriorResolved =
  | { kind: 'ability'; abilityId: string; bind: CastBinding }
  | { kind: 'none'; reason: string };

export function resolveWarriorCast(
  ctx: WarriorCastContext,
  bind: CastBinding,
): WarriorResolved {
  const slot = WARRIOR_SHIFT_BAR.find((s) => s.bind.id === bind.id);
  if (!slot) return { kind: 'none', reason: 'Unknown bind' };

  if (bind.id === BIND.F.id) {
    if (ctx.chargeOnCd) return { kind: 'none', reason: 'Charge on cooldown (6s)' };
    return { kind: 'ability', abilityId: 'warrior_charge', bind };
  }

  if (bind.id === BIND.S1.id) {
    if (ctx.invincibleOnCd) return { kind: 'none', reason: 'Invincible on cooldown' };
    return {
      kind: 'ability',
      abilityId: 'warrior_invincible',
      bind,
      // runtime: cleanseAllCleansableDebuffs via CLEANSE_ON_ABILITY
    };
  }

  const key: WarriorSlotKey | null =
    bind.id === BIND.S2.id
      ? 's2'
      : bind.id === BIND.S3.id
        ? 's3'
        : bind.id === BIND.S4.id
          ? 's4'
          : bind.id === BIND.S5.id
            ? 's5'
            : null;

  if (!key) return { kind: 'none', reason: 'Not a warrior combat bind' };

  // Level 10 gate for S3
  if (key === 's3' && ctx.level < 10) {
    return { kind: 'none', reason: 'Shift+3 unlocks at level 10' };
  }

  let chosen =
    ctx.loadout.choices[key] ??
    (key === 's5' && ctx.loadout.apex === 'perfect_counter'
      ? 'warrior_perfect_counter'
      : key === 's5' && ctx.loadout.apex === 'avatar'
        ? 'warrior_avatar'
        : key === 's3' && ctx.loadout.level10Path === 'life_drain'
          ? 'warrior_life_drain'
          : key === 's3' && ctx.loadout.level10Path === 'dual_combo_stun'
            ? 'warrior_dual_combo_stun'
            : key === 's3' && ctx.loadout.level10Path === 'shield_wall'
              ? 'warrior_shield_wall'
              : slot.defaultAbilityId);

  const opt = slot.options.find((o) => o.abilityId === chosen) ?? slot.options[0];
  if (!opt) return { kind: 'none', reason: 'No option' };
  if (opt.minLevel != null && ctx.level < opt.minLevel) {
    return { kind: 'none', reason: `Requires level ${opt.minLevel}` };
  }
  return { kind: 'ability', abilityId: opt.abilityId, bind };
}

// ── UI copy ──────────────────────────────────────────────────────────────────

export const WARRIOR_UI_COPY = {
  title: 'Warrior Stance Book',
  chargeHint: 'F — Charge (uMMORPG dash · 0.5s stun/disrupt · 6s CD)',
  invincibleHint: 'Shift+1 — Invincible + AoE taunt + cleanse all cleansable debuffs',
  passiveHint:
    "Passives (no keys): Damage Surge (take 10% HP in 2s → fury buff) · Guardian's Aura (always on)",
  s2Hint: 'Shift+2 — Taunt or Quick Strike (next hit ×2)',
  s3Hint: 'Shift+3 — Life Drain / Shield Wall / Dual Combo Stun (level 10)',
  s4Hint: 'Shift+4 — Execute or Double Strike',
  s5Hint:
    'Shift+5 — Avatar (25s, 2m CD) or Perfect Counter (3.5s parry-all, 25s CD)',
} as const;

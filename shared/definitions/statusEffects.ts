/**
 * Status Effects (Buffs / Debuffs) — CANONICAL SSOT
 *
 * Applied by combat, poisons, ranger/mage/warrior bars, traps, etc.
 * Icons render above unit frames (CombatUnitStatus, PlayerStatusBars, nameplates).
 *
 * Icon paths are public URL paths under assets CDN / local public (icons/misc/*).
 * emojiFallback is always available for HUD if art is missing.
 */

export type StatusPolarity = 'buff' | 'debuff' | 'neutral';
export type StatusCategory =
  | 'dot'
  | 'control'
  | 'movement'
  | 'stat'
  | 'resource'
  | 'stealth'
  | 'immunity'
  | 'special';

export type StatusStackRule = 'refresh' | 'stack' | 'ignore' | 'stronger';

export interface StatusEffectDef {
  id: string;
  name: string;
  polarity: StatusPolarity;
  category: StatusCategory;
  description: string;
  /** Primary icon path (CDN/public) */
  icon: string;
  /** Unicode glyph for frame badge fallback */
  emoji: string;
  /** Tailwind-ish ring color key for UI */
  color: string;
  /** Max stacks (1 = non-stacking) */
  maxStacks: number;
  stackRule: StatusStackRule;
  /** Default duration seconds (0 = until removed) */
  defaultDurationSec: number;
  /** Tick interval for DoT/HoT (0 = no tick) */
  tickIntervalSec: number;
  /** Dispel rules */
  cleansable: boolean;
  /** Fade (ranger) cleanses DoTs — true for damage-over-time debuffs */
  isDot: boolean;
  /**
   * Movement impairment — wiped on worge form swap (roots, slows, chilled, etc.)
   * Distinct from full debuff cleanse (mana shield / invincible).
   */
  isMovementImpair?: boolean;
  /**
   * Ground trap / snare marker — wiped on worge form swap.
   * (Logical status; traps themselves are destroyed separately.)
   */
  isTrapDebuff?: boolean;
  /** Prevents player actions / interrupts */
  isHardCc?: boolean;
  /** Hides from some UIs until discovered */
  secret?: boolean;
}

/** Cleanse profiles used by abilities / transforms */
export type CleanseProfile =
  | 'none'
  | 'dots_only' // ranger Fade
  | 'all_cleansable_debuffs' // mana shield, invincible
  | 'traps_and_movement'; // worge form swap

export const CLEANSE_ON_ABILITY: Record<string, CleanseProfile> = {
  mage_shield: 'all_cleansable_debuffs',
  mage_mana_shield: 'all_cleansable_debuffs',
  warrior_invincible: 'all_cleansable_debuffs',
  ranger_fade: 'dots_only',
  worge_form_swap: 'traps_and_movement',
  worg_form_swap: 'traps_and_movement',
};

// ── Debuffs ──────────────────────────────────────────────────────────────────

export const DEBUFF_DEFS: StatusEffectDef[] = [
  {
    id: 'burning',
    name: 'Burning',
    polarity: 'debuff',
    category: 'dot',
    description: 'Fire DoT. Takes damage over time.',
    icon: '/icons/misc/Fires.png',
    emoji: '🔥',
    color: '#ef4444',
    maxStacks: 5,
    stackRule: 'stack',
    defaultDurationSec: 6,
    tickIntervalSec: 1,
    cleansable: true,
    isDot: true,
  },
  {
    id: 'poisoned',
    name: 'Poisoned',
    polarity: 'debuff',
    category: 'dot',
    description: 'Toxin DoT (ranger venoms, traps).',
    icon: '/icons/misc/Leaf.png',
    emoji: '☠️',
    color: '#22c55e',
    maxStacks: 5,
    stackRule: 'stack',
    defaultDurationSec: 10,
    tickIntervalSec: 1,
    cleansable: true,
    isDot: true,
  },
  {
    id: 'poison_slow',
    name: 'Crippling Toxin',
    polarity: 'debuff',
    category: 'movement',
    description: 'Poison slow stacks (ranger).',
    icon: '/icons/misc/Leaf.png',
    emoji: '🐌',
    color: '#84cc16',
    maxStacks: 3,
    stackRule: 'stack',
    defaultDurationSec: 5,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
    isMovementImpair: true,
  },
  {
    id: 'poison_drain',
    name: 'Mana Leech Toxin',
    polarity: 'debuff',
    category: 'resource',
    description: 'Increased mana/stamina costs.',
    icon: '/icons/misc/AquaCore.png',
    emoji: '💧',
    color: '#06b6d4',
    maxStacks: 2,
    stackRule: 'stack',
    defaultDurationSec: 12,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'poison_armor',
    name: 'Corrosive Oil',
    polarity: 'debuff',
    category: 'stat',
    description: 'Armor reduced per stack.',
    icon: '/icons/misc/Lava.png',
    emoji: '🛡',
    color: '#a3a3a3',
    maxStacks: 5,
    stackRule: 'stack',
    defaultDurationSec: 12,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'bleeding',
    name: 'Bleeding',
    polarity: 'debuff',
    category: 'dot',
    description: 'Physical bleed DoT.',
    icon: '/icons/misc/Burns.png',
    emoji: '🩸',
    color: '#b91c1c',
    maxStacks: 5,
    stackRule: 'stack',
    defaultDurationSec: 8,
    tickIntervalSec: 1,
    cleansable: true,
    isDot: true,
  },
  {
    id: 'slowed',
    name: 'Slowed',
    polarity: 'debuff',
    category: 'movement',
    description: 'Reduced movement speed.',
    icon: '/icons/misc/Flow.png',
    emoji: '❄',
    color: '#38bdf8',
    maxStacks: 3,
    stackRule: 'stack',
    defaultDurationSec: 5,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
    isMovementImpair: true,
  },
  {
    id: 'exhausted',
    name: 'Exhausted',
    polarity: 'debuff',
    category: 'stat',
    description: 'Combat tax: slower move, higher ability costs (ranger/warrior).',
    icon: '/icons/misc/Chaos.png',
    emoji: '😮‍💨',
    color: '#78716c',
    maxStacks: 5,
    stackRule: 'stack',
    defaultDurationSec: 20,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'stunned',
    name: 'Stunned',
    polarity: 'debuff',
    category: 'control',
    description: 'Cannot act. Hard CC.',
    icon: '/icons/misc/Chaos_2.png',
    emoji: '💫',
    color: '#fbbf24',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 2,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
    isHardCc: true,
  },
  {
    id: 'frozen',
    name: 'Frozen',
    polarity: 'debuff',
    category: 'control',
    description: 'Rooted in ice; cannot move or act.',
    icon: '/icons/tomes/frost.png',
    emoji: '🧊',
    color: '#7dd3fc',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 3,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
    isHardCc: true,
    isMovementImpair: true,
  },
  {
    id: 'rooted',
    name: 'Rooted',
    polarity: 'debuff',
    category: 'control',
    description: 'Cannot move (nature roots). Can still act.',
    icon: '/icons/misc/Leaf.png',
    emoji: '🌿',
    color: '#16a34a',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 4,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
    isMovementImpair: true,
    isTrapDebuff: true,
  },
  {
    id: 'weakened',
    name: 'Weakened',
    polarity: 'debuff',
    category: 'stat',
    description: 'Reduced damage dealt and/or defense.',
    icon: '/icons/misc/Effect.png',
    emoji: '📉',
    color: '#a78bfa',
    maxStacks: 3,
    stackRule: 'stack',
    defaultDurationSec: 10,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'cursed',
    name: 'Cursed',
    polarity: 'debuff',
    category: 'special',
    description: 'Dark hex — healing reduced, vulnerability increased.',
    icon: '/icons/misc/ChaosCircle.png',
    emoji: '💀',
    color: '#7c3aed',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 15,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'silenced',
    name: 'Silenced',
    polarity: 'debuff',
    category: 'control',
    description: 'Cannot cast spells / abilities that cost mana.',
    icon: '/icons/misc/Core.png',
    emoji: '🔇',
    color: '#6366f1',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 3,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
    isHardCc: true,
  },
  {
    id: 'feared',
    name: 'Feared',
    polarity: 'debuff',
    category: 'control',
    description: 'Forced flee / reduced combat effectiveness.',
    icon: '/icons/misc/Burns.png',
    emoji: '😱',
    color: '#f97316',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 3,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
    isHardCc: true,
  },
  {
    id: 'blinded',
    name: 'Blinded',
    polarity: 'debuff',
    category: 'stat',
    description: 'Miss chance increased.',
    icon: '/icons/misc/Effect.png',
    emoji: '👁',
    color: '#525252',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 4,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'disarmed',
    name: 'Disarmed',
    polarity: 'debuff',
    category: 'control',
    description: 'Cannot use weapons for duration.',
    icon: '/icons/misc/Slash_07.png',
    emoji: '⚔',
    color: '#d97706',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 3,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'marked',
    name: 'Marked',
    polarity: 'debuff',
    category: 'special',
    description: 'Hunter/assassin mark — takes increased damage.',
    icon: '/icons/misc/Firestar.png',
    emoji: '🎯',
    color: '#e11d48',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 12,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'chilled',
    name: 'Chilled',
    polarity: 'debuff',
    category: 'movement',
    description: 'Mild freeze slow; stacks toward Frozen.',
    icon: '/icons/tomes/frost.png',
    emoji: '🌬',
    color: '#bae6fd',
    maxStacks: 3,
    stackRule: 'stack',
    defaultDurationSec: 4,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
    isMovementImpair: true,
  },
  {
    id: 'snared',
    name: 'Snared',
    polarity: 'debuff',
    category: 'control',
    description: 'Trap snare — movement locked by ground trap.',
    icon: '/icons/misc/Loot_27.png',
    emoji: '🪤',
    color: '#a16207',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 4,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
    isMovementImpair: true,
    isTrapDebuff: true,
  },
  {
    id: 'shocked',
    name: 'Shocked',
    polarity: 'debuff',
    category: 'dot',
    description: 'Lightning residual damage / interrupt vulnerability.',
    icon: '/icons/misc/Glow.png',
    emoji: '⚡',
    color: '#fde047',
    maxStacks: 3,
    stackRule: 'stack',
    defaultDurationSec: 5,
    tickIntervalSec: 1,
    cleansable: true,
    isDot: true,
  },
];

// ── Buffs ────────────────────────────────────────────────────────────────────

export const BUFF_DEFS: StatusEffectDef[] = [
  {
    id: 'regenerating',
    name: 'Regenerating',
    polarity: 'buff',
    category: 'dot',
    description: 'HoT — health over time (nature tome, heals).',
    icon: '/icons/misc/Life.png',
    emoji: '💚',
    color: '#4ade80',
    maxStacks: 3,
    stackRule: 'stack',
    defaultDurationSec: 10,
    tickIntervalSec: 1,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'shielded',
    name: 'Shielded',
    polarity: 'buff',
    category: 'immunity',
    description: 'Absorption / mage shield / armor barrier.',
    icon: '/icons/weapons/shield_01.png',
    emoji: '🛡',
    color: '#60a5fa',
    maxStacks: 1,
    stackRule: 'stronger',
    defaultDurationSec: 12,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'invincible',
    name: 'Invincible',
    polarity: 'buff',
    category: 'immunity',
    description: 'Full damage immunity (warrior Invincible).',
    icon: '/icons/misc/Glow.png',
    emoji: '✨',
    color: '#fbbf24',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 3,
    tickIntervalSec: 0,
    cleansable: false,
    isDot: false,
  },
  {
    id: 'hasted',
    name: 'Hasted',
    polarity: 'buff',
    category: 'movement',
    description: 'Increased move and/or attack speed.',
    icon: '/icons/misc/Flow.png',
    emoji: '💨',
    color: '#67e8f9',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 8,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'empowered',
    name: 'Empowered',
    polarity: 'buff',
    category: 'stat',
    description: 'Increased damage (Damage Surge, auras).',
    icon: '/icons/misc/Firestar.png',
    emoji: '💪',
    color: '#f97316',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 6,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'damage_surge',
    name: 'Damage Surge',
    polarity: 'buff',
    category: 'stat',
    description: 'Warrior passive fury after heavy damage intake.',
    icon: '/icons/misc/Fires.png',
    emoji: '💢',
    color: '#ef4444',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 6,
    tickIntervalSec: 0,
    cleansable: false,
    isDot: false,
  },
  {
    id: 'guardian_aura',
    name: "Guardian's Aura",
    polarity: 'buff',
    category: 'stat',
    description: 'Ally defense aura from warrior.',
    icon: '/icons/armor/Shield_01.png',
    emoji: '🔰',
    color: '#94a3b8',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 0,
    tickIntervalSec: 0,
    cleansable: false,
    isDot: false,
  },
  {
    id: 'stealthed',
    name: 'Faded',
    polarity: 'buff',
    category: 'stealth',
    description:
      'Invisible / untargetable (ranger Fade). Face-cone reveal only if detector stationary ≥2s and within 1m of face.',
    icon: '/icons/misc/Chaos.png',
    emoji: '👤',
    color: '#64748b',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 0,
    tickIntervalSec: 0,
    cleansable: false,
    isDot: false,
  },
  {
    id: 'shadow_master',
    name: 'Shadow Master',
    polarity: 'buff',
    category: 'stealth',
    description: 'Near-invis phase; reflect damage; stealth skill spam.',
    icon: '/icons/misc/ChaosCircle.png',
    emoji: '🌑',
    color: '#312e81',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 7,
    tickIntervalSec: 0,
    cleansable: false,
    isDot: false,
  },
  {
    id: 'berserk',
    name: 'Berserk',
    polarity: 'buff',
    category: 'stat',
    description: 'High damage, reduced defense.',
    icon: '/icons/misc/Firestar.png',
    emoji: '😡',
    color: '#dc2626',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 8,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'avatar',
    name: 'Avatar of War',
    polarity: 'buff',
    category: 'special',
    description: 'Warrior apex form — magic immune, armor/attack surge.',
    icon: '/icons/misc/Glow.png',
    emoji: '👑',
    color: '#f59e0b',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 25,
    tickIntervalSec: 0,
    cleansable: false,
    isDot: false,
  },
  {
    id: 'perfect_counter',
    name: 'Perfect Counter',
    polarity: 'buff',
    category: 'immunity',
    description: 'All incoming attacks parried + knockback.',
    icon: '/icons/weapons/shield_01.png',
    emoji: '⚔',
    color: '#e2e8f0',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 3.5,
    tickIntervalSec: 0,
    cleansable: false,
    isDot: false,
  },
  {
    id: 'quick_strike_ready',
    name: 'Quick Strike',
    polarity: 'buff',
    category: 'special',
    description: 'Next attack hits twice.',
    icon: '/icons/misc/Slash_07.png',
    emoji: '⚡',
    color: '#facc15',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 8,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'mana_shield',
    name: 'Mage Shield',
    polarity: 'buff',
    category: 'immunity',
    description: 'Mana-based absorption / arcane barrier.',
    icon: '/icons/misc/AquaCircle.png',
    emoji: '🔵',
    color: '#3b82f6',
    maxStacks: 1,
    stackRule: 'stronger',
    defaultDurationSec: 15,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'blessed',
    name: 'Blessed',
    polarity: 'buff',
    category: 'stat',
    description: 'Holy power — heal amp / damage buff.',
    icon: '/icons/misc/Lights.png',
    emoji: '✝',
    color: '#fef08a',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 12,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'taunted',
    name: 'Taunted',
    polarity: 'debuff',
    category: 'control',
    description: 'Forced to attack the taunter.',
    icon: '/icons/misc/Burns.png',
    emoji: '📢',
    color: '#fb923c',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 3,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'precision',
    name: 'Precision',
    polarity: 'buff',
    category: 'stat',
    description: 'Next hits treat as precision (poisons always apply).',
    icon: '/icons/misc/Core.png',
    emoji: '◎',
    color: '#a5f3fc',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 6,
    tickIntervalSec: 0,
    cleansable: true,
    isDot: false,
  },
  {
    id: 'in_form',
    name: 'Beast Form',
    polarity: 'buff',
    category: 'special',
    description: 'Worge shapeshift active.',
    icon: '/icons/misc/NatureFlower.png',
    emoji: '🐺',
    color: '#86efac',
    maxStacks: 1,
    stackRule: 'refresh',
    defaultDurationSec: 0,
    tickIntervalSec: 0,
    cleansable: false,
    isDot: false,
  },
];

// ── Combined registry ────────────────────────────────────────────────────────

export const STATUS_EFFECT_DEFS: StatusEffectDef[] = [...DEBUFF_DEFS, ...BUFF_DEFS];

export const STATUS_EFFECT_BY_ID: Record<string, StatusEffectDef> = Object.fromEntries(
  STATUS_EFFECT_DEFS.map((d) => [d.id, d]),
);

export function getStatusDef(id: string): StatusEffectDef | undefined {
  return STATUS_EFFECT_BY_ID[id];
}

export function listDebuffs(): StatusEffectDef[] {
  return STATUS_EFFECT_DEFS.filter((d) => d.polarity === 'debuff');
}

export function listBuffs(): StatusEffectDef[] {
  return STATUS_EFFECT_DEFS.filter((d) => d.polarity === 'buff');
}

export function listDotDebuffs(): StatusEffectDef[] {
  return STATUS_EFFECT_DEFS.filter((d) => d.isDot);
}

// ── Runtime instance (on a unit) ─────────────────────────────────────────────

export interface ActiveStatusInstance {
  /** Unique instance id for React keys */
  instanceId: string;
  /** Catalog id */
  statusId: string;
  stacks: number;
  /** Remaining seconds; Infinity for permanent */
  remainingSec: number;
  /** Who applied (character id) */
  sourceId?: string;
  /** Optional strength multiplier (assassinate 2× poison) */
  potency?: number;
}

export function createStatusInstance(
  statusId: string,
  opts?: Partial<Pick<ActiveStatusInstance, 'stacks' | 'remainingSec' | 'sourceId' | 'potency'>>,
): ActiveStatusInstance | null {
  const def = getStatusDef(statusId);
  if (!def) return null;
  return {
    instanceId: `${statusId}_${Math.random().toString(36).slice(2, 9)}`,
    statusId,
    stacks: Math.min(opts?.stacks ?? 1, def.maxStacks),
    remainingSec: opts?.remainingSec ?? def.defaultDurationSec,
    sourceId: opts?.sourceId,
    potency: opts?.potency ?? 1,
  };
}

/**
 * Apply or refresh a status on a list (pure helper for combat systems).
 */
export function applyStatus(
  list: ActiveStatusInstance[],
  statusId: string,
  opts?: Partial<Pick<ActiveStatusInstance, 'stacks' | 'remainingSec' | 'sourceId' | 'potency'>>,
): ActiveStatusInstance[] {
  const def = getStatusDef(statusId);
  if (!def) return list;
  const next = [...list];
  const existing = next.find((s) => s.statusId === statusId);
  const addStacks = opts?.stacks ?? 1;
  const duration = opts?.remainingSec ?? def.defaultDurationSec;

  if (!existing) {
    const inst = createStatusInstance(statusId, opts);
    return inst ? [...next, inst] : next;
  }

  switch (def.stackRule) {
    case 'stack':
      existing.stacks = Math.min(def.maxStacks, existing.stacks + addStacks);
      existing.remainingSec = Math.max(existing.remainingSec, duration);
      break;
    case 'refresh':
      existing.remainingSec = duration;
      existing.stacks = Math.max(existing.stacks, addStacks);
      break;
    case 'stronger':
      if ((opts?.potency ?? 1) >= (existing.potency ?? 1)) {
        existing.remainingSec = duration;
        existing.potency = opts?.potency ?? 1;
        existing.stacks = Math.max(existing.stacks, addStacks);
      }
      break;
    case 'ignore':
      break;
  }
  if (opts?.sourceId) existing.sourceId = opts.sourceId;
  return next;
}

/** Remove DoTs (ranger Fade cleanse) */
export function cleanseDots(list: ActiveStatusInstance[]): ActiveStatusInstance[] {
  return list.filter((s) => {
    const def = getStatusDef(s.statusId);
    return !def?.isDot;
  });
}

/**
 * Full cleansable debuff wipe — Mana Shield + Invincible on use.
 * Removes all debuffs with cleansable=true (keeps uncleansable boss marks, etc.).
 */
export function cleanseAllCleansableDebuffs(
  list: ActiveStatusInstance[],
): ActiveStatusInstance[] {
  return list.filter((s) => {
    const def = getStatusDef(s.statusId);
    if (!def) return true;
    if (def.polarity !== 'debuff') return true;
    return !def.cleansable;
  });
}

/** @deprecated use cleanseAllCleansableDebuffs */
export function cleanseAllCleansable(list: ActiveStatusInstance[]): ActiveStatusInstance[] {
  return cleanseAllCleansableDebuffs(list);
}

/**
 * Worge form swap: only traps + movement impairments.
 * Does NOT clear burns, poisons DoT, curses, stuns, etc.
 */
export function cleanseTrapsAndMovement(
  list: ActiveStatusInstance[],
): ActiveStatusInstance[] {
  return list.filter((s) => {
    const def = getStatusDef(s.statusId);
    if (!def) return true;
    if (def.isTrapDebuff || def.isMovementImpair) return false;
    return true;
  });
}

/** Apply cleanse profile by ability id */
export function applyCleanseProfile(
  list: ActiveStatusInstance[],
  profile: CleanseProfile,
): ActiveStatusInstance[] {
  switch (profile) {
    case 'dots_only':
      return cleanseDots(list);
    case 'all_cleansable_debuffs':
      return cleanseAllCleansableDebuffs(list);
    case 'traps_and_movement':
      return cleanseTrapsAndMovement(list);
    default:
      return list;
  }
}

export function cleanseForAbility(
  list: ActiveStatusInstance[],
  abilityId: string,
): ActiveStatusInstance[] {
  const profile = CLEANSE_ON_ABILITY[abilityId] ?? 'none';
  return applyCleanseProfile(list, profile);
}

export function tickStatuses(
  list: ActiveStatusInstance[],
  dtSec: number,
): { list: ActiveStatusInstance[]; expired: string[] } {
  const expired: string[] = [];
  const next: ActiveStatusInstance[] = [];
  for (const s of list) {
    if (!Number.isFinite(s.remainingSec) || s.remainingSec <= 0) {
      // permanent (0 duration means until removed) — keep if default was 0
      const def = getStatusDef(s.statusId);
      if (def && def.defaultDurationSec === 0 && s.remainingSec === 0) {
        next.push(s);
        continue;
      }
    }
    const rem = s.remainingSec - dtSec;
    if (rem <= 0 && getStatusDef(s.statusId)?.defaultDurationSec !== 0) {
      expired.push(s.statusId);
    } else {
      next.push({ ...s, remainingSec: Math.max(0, rem) });
    }
  }
  return { list: next, expired };
}

// ── Display helpers ──────────────────────────────────────────────────────────

export function statusTooltip(statusId: string, stacks = 1): string {
  const def = getStatusDef(statusId);
  if (!def) return statusId;
  const stack = stacks > 1 ? ` ×${stacks}` : '';
  return `${def.name}${stack}: ${def.description}`;
}

/** Map ability/poison ids → status for apply hooks */
export const ABILITY_TO_STATUS: Record<string, string> = {
  mage_fireball: 'burning',
  nature_regen: 'regenerating',
  nature_roots: 'rooted',
  ranger_fade: 'stealthed',
  ranger_shadow_master: 'shadow_master',
  warrior_invincible: 'invincible',
  warrior_taunt: 'taunted',
  warrior_quick_strike: 'quick_strike_ready',
  warrior_avatar: 'avatar',
  warrior_perfect_counter: 'perfect_counter',
  warrior_damage_surge_passive: 'damage_surge',
  warrior_guardian_aura_passive: 'guardian_aura',
  poison_slow: 'poison_slow',
  poison_dot: 'poisoned',
  poison_drain: 'poison_drain',
  poison_armor: 'poison_armor',
  mage_shield: 'mana_shield',
  mage_archmage: 'empowered',
};

export interface AttributeStatBonus {
  flat: number;
  percent: number;
}

/**
 * Canonical 37 derived-stat keys. Every key here is rendered in the
 * character UI; if any are unfilled by the 8 attributes they show as 0%,
 * which the design rule explicitly forbids ("way too many 0s").
 *
 * Coverage rule: every derived stat MUST be touched by at least 2 attributes
 * (one primary contributor + one secondary), and every attribute MUST touch
 * at least 12 derived stats. This eliminates dead stats AND prevents any
 * single attribute from monopolising a stat — keeping multiple viable build
 * routes on the table.
 */
export type DerivedStatKey =
  // Primary pools
  | "health" | "mana" | "stamina" | "damage" | "defense" | "armor"
  // Block / crit family
  | "blockChance" | "blockFactor" | "blockPenetration"
  | "criticalChance" | "criticalFactor" | "criticalEvasion"
  // Hit / mitigation family
  | "accuracy" | "evasion" | "dodge" | "resistance" | "damageReduction"
  // Speed / pacing family
  | "attackSpeed" | "movementSpeed" | "reflexTime"
  | "cooldownReduction" | "comboCooldownRed" | "abilityCost"
  // Penetration / break family
  | "defenseBreak" | "armorPenetration"
  // Resist family
  | "cdrResist" | "defenseBreakResist" | "bleedResist" | "ccResistance"
  | "spellblock" | "statusEffect"
  // Caster utility
  | "spellAccuracy" | "manaRegen" | "healthRegen"
  // Sustain / sundry
  | "drainHealth" | "stagger" | "fallDamage";

export interface AttributeDefinition {
  id: string;
  name: string;
  primaryRole: string;
  focus: string;
  color: string;
  icon: string;
  stats: Partial<Record<DerivedStatKey, AttributeStatBonus>>;
}

export const ATTRIBUTE_DEFINITIONS: Record<string, AttributeDefinition> = {
  // ── STRENGTH — Tank/Melee Damage ──
  // Primary: raw HP, physical damage, blocking power, crit damage.
  // Touches everything physical; modest taps on regen, sustain, and stagger.
  Strength: {
    id: "Strength",
    name: "Strength",
    primaryRole: "Tank/Melee Damage",
    focus: "Health, melee damage, and crushing combat modifiers — best for warriors and barbarians.",
    color: "red",
    icon: "💪",
    stats: {
      // Primary
      health: { flat: 26, percent: 0.8 },
      damage: { flat: 3, percent: 2 },
      defense: { flat: 12, percent: 1.5 },
      // Block / crit
      blockChance: { flat: 0.5, percent: 5 },
      blockFactor: { flat: 0.85, percent: 26.3 },
      criticalChance: { flat: 0.32, percent: 7 },
      criticalFactor: { flat: 1.1, percent: 1.5 },
      // Penetration / break
      defenseBreak: { flat: 0.4, percent: 0.5 },
      armorPenetration: { flat: 0.35, percent: 0.4 },
      blockPenetration: { flat: 0.2, percent: 0.3 },
      // Mitigation / armor
      armor: { flat: 0.6, percent: 0.4 },
      damageReduction: { flat: 0.05, percent: 0.1 },
      // Sustain
      drainHealth: { flat: 0.05, percent: 0.1 },
      healthRegen: { flat: 0.1, percent: 0 },
      stagger: { flat: 0.6, percent: 1 },
      // Resists / minor utility
      bleedResist: { flat: 0.1, percent: 0 },
      defenseBreakResist: { flat: 0.15, percent: 0 },
      attackSpeed: { flat: 0.1, percent: 0 },
      // Tertiary touches
      accuracy: { flat: 0.1, percent: 0 },
      resistance: { flat: 0.3, percent: 0 },
      criticalEvasion: { flat: 0.05, percent: 0 },
      spellblock: { flat: 0.05, percent: 0 },
      comboCooldownRed: { flat: 0.05, percent: 0 },
    },
  },

  // ── VITALITY — Tank/Survivability ──
  // Primary: enormous HP pool, mitigation, regen, CC immunity.
  // Touches all sustain/resist stats; light damage and crit influence.
  Vitality: {
    id: "Vitality",
    name: "Vitality",
    primaryRole: "Tank/Survivability",
    focus: "HP, mitigation, regeneration, and resistance to debilitating effects.",
    color: "green",
    icon: "❤️",
    stats: {
      // Primary
      health: { flat: 25, percent: 0.5 },
      defense: { flat: 12, percent: 0 },
      damageReduction: { flat: 0.5, percent: 1 },
      // Pools
      mana: { flat: 2, percent: 0.2 },
      stamina: { flat: 5, percent: 0.1 },
      damage: { flat: 2, percent: 0.1 },
      // Block / crit
      blockFactor: { flat: 0.3, percent: 17 },
      criticalFactor: { flat: 0.1, percent: 1 },
      blockChance: { flat: 0.15, percent: 0 },
      // Mitigation / armor
      armor: { flat: 1.2, percent: 1 },
      resistance: { flat: 0.5, percent: 0 },
      // Regen / sustain
      healthRegen: { flat: 0.4, percent: 0.5 },
      manaRegen: { flat: 0.05, percent: 0 },
      // Resists
      ccResistance: { flat: 0.4, percent: 0.5 },
      defenseBreakResist: { flat: 0.5, percent: 0.5 },
      bleedResist: { flat: 0.3, percent: 0 },
      // Tertiary
      stagger: { flat: 0.1, percent: 0 },
      spellblock: { flat: 0.1, percent: 0 },
      statusEffect: { flat: 0.05, percent: 0 },
      criticalEvasion: { flat: 0.1, percent: 0 },
      fallDamage: { flat: 0.5, percent: 0 },
    },
  },

  // ── ENDURANCE — Tank/Defensive Specialist ──
  // Primary: defense, block, armor.
  // Touches every defensive stat; minor speed/regen.
  Endurance: {
    id: "Endurance",
    name: "Endurance",
    primaryRole: "Tank/Defensive Specialist",
    focus: "Defense, block mechanics, armor, and resistance to physical wear.",
    color: "amber",
    icon: "🛡️",
    stats: {
      // Primary
      defense: { flat: 12, percent: 12 },
      blockChance: { flat: 0.11, percent: 73.5 },
      armor: { flat: 1.5, percent: 1.5 },
      // Pools
      health: { flat: 10, percent: 0.1 },
      stamina: { flat: 1, percent: 0.3 },
      // Block / crit
      blockFactor: { flat: 0.27, percent: 0 },
      criticalEvasion: { flat: 0.3, percent: 0.3 },
      // Mitigation
      resistance: { flat: 0.46, percent: 0 },
      damageReduction: { flat: 0.4, percent: 0.5 },
      // Resists
      defenseBreakResist: { flat: 0.6, percent: 0.5 },
      bleedResist: { flat: 0.5, percent: 0.5 },
      ccResistance: { flat: 0.2, percent: 0 },
      // Sundry
      fallDamage: { flat: 0.6, percent: 0.5 },
      stagger: { flat: 0.2, percent: 0 },
      // Sustain / utility tertiaries
      healthRegen: { flat: 0.15, percent: 0 },
      spellblock: { flat: 0.15, percent: 0 },
      dodge: { flat: 0.05, percent: 0 },
      movementSpeed: { flat: 0.05, percent: 0 },
      reflexTime: { flat: 0.05, percent: 0 },
    },
  },

  // ── INTELLECT — Mage/Caster ──
  // Primary: mana pool, spell damage, spell accuracy.
  // Touches all caster utility stats: CDR, ability cost, spellblock, status.
  Intellect: {
    id: "Intellect",
    name: "Intellect",
    primaryRole: "Mage/Caster",
    focus: "Mana, spell damage, spell accuracy, and arcane utility.",
    color: "blue",
    icon: "🔮",
    stats: {
      // Primary
      mana: { flat: 5, percent: 5 },
      damage: { flat: 4, percent: 2.5 },
      spellAccuracy: { flat: 0.5, percent: 1 },
      // Hit / mitigation
      defense: { flat: 2, percent: 0 },
      accuracy: { flat: 0.12, percent: 33.8 },
      resistance: { flat: 0.38, percent: 17 },
      // Crit
      criticalChance: { flat: 0.23, percent: 0.1 },
      criticalFactor: { flat: 0.1, percent: 0 },
      // Caster utility
      cooldownReduction: { flat: 0.25, percent: 0.5 },
      abilityCost: { flat: -0.25, percent: 0.5 },
      spellblock: { flat: 0.4, percent: 0.5 },
      statusEffect: { flat: 0.4, percent: 0.5 },
      manaRegen: { flat: 0.5, percent: 0 },
      cdrResist: { flat: 0.15, percent: 0 },
      // Tertiary
      reflexTime: { flat: 0.05, percent: 0 },
      evasion: { flat: 0.05, percent: 0 },
      comboCooldownRed: { flat: 0.05, percent: 0 },
      armorPenetration: { flat: 0.05, percent: 0 },
      blockPenetration: { flat: 0.05, percent: 0 },
    },
  },

  // ── WISDOM — Healer/Support Caster ──
  // Primary: mana regen, healing, ability efficiency.
  // Touches all regen/CDR/resist-debuff stats.
  Wisdom: {
    id: "Wisdom",
    name: "Wisdom",
    primaryRole: "Healer/Support Caster",
    focus: "Mana efficiency, regeneration, debuff resistance, and spell sustain.",
    color: "purple",
    icon: "📖",
    stats: {
      // Primary
      mana: { flat: 20, percent: 3 },
      manaRegen: { flat: 0.6, percent: 1 },
      healthRegen: { flat: 0.5, percent: 0.8 },
      // Pools / damage
      health: { flat: 10, percent: 0 },
      damage: { flat: 2, percent: 1.5 },
      defense: { flat: 2, percent: 0 },
      // Crit
      criticalChance: { flat: 0.5, percent: 0.15 },
      criticalFactor: { flat: 0.05, percent: 0 },
      // Resists / mitigation
      resistance: { flat: 0.5, percent: 0 },
      spellblock: { flat: 0.5, percent: 0.5 },
      ccResistance: { flat: 0.3, percent: 0.4 },
      cdrResist: { flat: 0.4, percent: 0.5 },
      // Caster utility
      cooldownReduction: { flat: 0.3, percent: 0.5 },
      abilityCost: { flat: -0.3, percent: 0.5 },
      spellAccuracy: { flat: 0.4, percent: 0.5 },
      // Tertiary
      accuracy: { flat: 0.1, percent: 0 },
      statusEffect: { flat: 0.15, percent: 0 },
      reflexTime: { flat: 0.05, percent: 0 },
      damageReduction: { flat: 0.05, percent: 0 },
    },
  },

  // ── DEXTERITY — Rogue/Precision Fighter ──
  // Primary: crit chance, accuracy, attack speed.
  // Touches mobility, penetration, sustain via lifesteal.
  Dexterity: {
    id: "Dexterity",
    name: "Dexterity",
    primaryRole: "Rogue/Precision Fighter",
    focus: "Critical strikes, accuracy, attack speed, and reflexive precision.",
    color: "orange",
    icon: "🎯",
    stats: {
      // Primary
      damage: { flat: 3, percent: 1.8 },
      criticalChance: { flat: 0.5, percent: 1.2 },
      accuracy: { flat: 0.7, percent: 1.5 },
      // Block / crit
      defense: { flat: 10, percent: 1 },
      blockChance: { flat: 0.41, percent: 1 },
      criticalFactor: { flat: 0.4, percent: 0.5 },
      // Speed family
      attackSpeed: { flat: 0.4, percent: 0.6 },
      evasion: { flat: 0.4, percent: 0.6 },
      reflexTime: { flat: 0.4, percent: 0.5 },
      comboCooldownRed: { flat: 0.3, percent: 0.4 },
      // Penetration / break
      blockPenetration: { flat: 0.3, percent: 0.4 },
      armorPenetration: { flat: 0.15, percent: 0.2 },
      defenseBreak: { flat: 0.1, percent: 0 },
      // Sustain
      drainHealth: { flat: 0.15, percent: 0.2 },
      // Tertiary
      dodge: { flat: 0.3, percent: 0 },
      criticalEvasion: { flat: 0.1, percent: 0 },
      bleedResist: { flat: 0.05, percent: 0 },
      stagger: { flat: 0.05, percent: 0 },
      statusEffect: { flat: 0.05, percent: 0 },
      spellAccuracy: { flat: 0.1, percent: 0 },
      cooldownReduction: { flat: 0.05, percent: 0 },
    },
  },

  // ── AGILITY — Mobile DPS/Dodge Tank ──
  // Primary: movement speed, evasion, attack speed.
  // Touches dodge/reflex; modest sustain via lifesteal and crit.
  Agility: {
    id: "Agility",
    name: "Agility",
    primaryRole: "Mobile DPS/Dodge Tank",
    focus: "Mobility, evasion, attack pacing, and reflex-driven survivability.",
    color: "cyan",
    icon: "⚡",
    stats: {
      // Primary
      stamina: { flat: 5, percent: 0.5 },
      evasion: { flat: 0.5, percent: 0.8 },
      movementSpeed: { flat: 0.5, percent: 0.8 },
      // Pools / damage
      health: { flat: 2, percent: 0.6 },
      damage: { flat: 3, percent: 1.6 },
      defense: { flat: 5, percent: 0.8 },
      // Crit
      criticalChance: { flat: 0.42, percent: 1 },
      criticalFactor: { flat: 0.05, percent: 0 },
      // Speed family
      attackSpeed: { flat: 0.45, percent: 0.7 },
      reflexTime: { flat: 0.45, percent: 0.6 },
      comboCooldownRed: { flat: 0.4, percent: 0.5 },
      dodge: { flat: 0.5, percent: 0.7 },
      criticalEvasion: { flat: 0.25, percent: 0.3 },
      // Sustain / break
      drainHealth: { flat: 0.15, percent: 0.15 },
      armorPenetration: { flat: 0.1, percent: 0 },
      blockPenetration: { flat: 0.1, percent: 0 },
      // Tertiary
      accuracy: { flat: 0.1, percent: 0 },
      bleedResist: { flat: 0.05, percent: 0 },
      fallDamage: { flat: 0.2, percent: 0 },
      stagger: { flat: 0.05, percent: 0 },
    },
  },

  // ── TACTICS — Strategic Fighter/Commander ──
  // Primary: penetration, debuff effectiveness, balanced stats.
  // Touches every family lightly — the "jack of all trades" splash attribute.
  Tactics: {
    id: "Tactics",
    name: "Tactics",
    primaryRole: "Strategic Fighter/Commander",
    focus: "Penetration, debuff power, and balanced contribution across every combat family.",
    color: "slate",
    icon: "⚔️",
    stats: {
      // Primary
      damage: { flat: 3, percent: 0.2 },
      defense: { flat: 5, percent: 0.5 },
      defenseBreak: { flat: 0.45, percent: 0.5 },
      // Pools
      health: { flat: 10, percent: 8.4 },
      mana: { flat: 0, percent: 8.2 },
      stamina: { flat: 1, percent: 0 },
      // Block / crit
      blockChance: { flat: 0.27, percent: 0.8 },
      criticalChance: { flat: 0.02, percent: 2 },
      criticalFactor: { flat: 0.15, percent: 0.3 },
      // Hit
      accuracy: { flat: 0.2, percent: 0.3 },
      // Penetration / break
      armorPenetration: { flat: 0.4, percent: 0.5 },
      blockPenetration: { flat: 0.4, percent: 0.5 },
      // Debuff / status / utility
      statusEffect: { flat: 0.5, percent: 0.5 },
      cdrResist: { flat: 0.3, percent: 0.4 },
      cooldownReduction: { flat: 0.2, percent: 0.3 },
      ccResistance: { flat: 0.15, percent: 0 },
      abilityCost: { flat: -0.1, percent: 0 },
      spellAccuracy: { flat: 0.1, percent: 0 },
      // Tertiary touches across remaining families
      drainHealth: { flat: 0.05, percent: 0 },
      reflexTime: { flat: 0.1, percent: 0 },
      evasion: { flat: 0.05, percent: 0 },
      dodge: { flat: 0.05, percent: 0 },
      comboCooldownRed: { flat: 0.2, percent: 0 },
      criticalEvasion: { flat: 0.1, percent: 0 },
      stagger: { flat: 0.1, percent: 0 },
      defenseBreakResist: { flat: 0.1, percent: 0 },
    },
  },
};

export const STAT_LABELS: Record<string, { label: string; shortLabel: string; color: string }> = {
  // Pools
  health: { label: "Health", shortLabel: "HP", color: "red" },
  mana: { label: "Mana", shortLabel: "MP", color: "blue" },
  stamina: { label: "Stamina", shortLabel: "SP", color: "green" },
  damage: { label: "Damage", shortLabel: "DMG", color: "amber" },
  defense: { label: "Defense", shortLabel: "DEF", color: "slate" },
  armor: { label: "Armor", shortLabel: "ARM", color: "slate" },
  // Block / crit
  blockChance: { label: "Block Chance", shortLabel: "BLK%", color: "amber" },
  blockFactor: { label: "Block Effect", shortLabel: "BLK×", color: "amber" },
  blockPenetration: { label: "Block Penetration", shortLabel: "BPEN", color: "amber" },
  criticalChance: { label: "Critical Chance", shortLabel: "CRT%", color: "orange" },
  criticalFactor: { label: "Critical Damage", shortLabel: "CRT×", color: "orange" },
  criticalEvasion: { label: "Critical Evasion", shortLabel: "CEVA", color: "cyan" },
  // Hit / mitigation
  accuracy: { label: "Accuracy", shortLabel: "ACC", color: "cyan" },
  evasion: { label: "Evasion", shortLabel: "EVA", color: "cyan" },
  dodge: { label: "Dodge", shortLabel: "DDG", color: "cyan" },
  resistance: { label: "Resistance", shortLabel: "RES", color: "purple" },
  damageReduction: { label: "Damage Reduction", shortLabel: "DR", color: "slate" },
  // Speed / pacing
  attackSpeed: { label: "Attack Speed", shortLabel: "ASP", color: "orange" },
  movementSpeed: { label: "Movement Speed", shortLabel: "MSP", color: "cyan" },
  reflexTime: { label: "Reflex Time", shortLabel: "RFX", color: "cyan" },
  cooldownReduction: { label: "Cooldown Reduction", shortLabel: "CDR", color: "blue" },
  comboCooldownRed: { label: "Combo CD Red.", shortLabel: "CCDR", color: "orange" },
  abilityCost: { label: "Ability Cost", shortLabel: "COST", color: "blue" },
  // Penetration / break
  defenseBreak: { label: "Defense Break", shortLabel: "DBRK", color: "amber" },
  armorPenetration: { label: "Armor Penetration", shortLabel: "APEN", color: "red" },
  // Resist family
  cdrResist: { label: "CDR Resist", shortLabel: "CDRR", color: "purple" },
  defenseBreakResist: { label: "Def. Break Resist", shortLabel: "DBRR", color: "slate" },
  bleedResist: { label: "Bleed Resist", shortLabel: "BLDR", color: "red" },
  ccResistance: { label: "CC Resistance", shortLabel: "CCR", color: "green" },
  spellblock: { label: "Spellblock", shortLabel: "SBLK", color: "purple" },
  statusEffect: { label: "Status Effect", shortLabel: "STAT", color: "orange" },
  // Caster utility
  spellAccuracy: { label: "Spell Accuracy", shortLabel: "SACC", color: "blue" },
  manaRegen: { label: "Mana Regen", shortLabel: "MR", color: "blue" },
  healthRegen: { label: "Health Regen", shortLabel: "HR", color: "red" },
  // Sustain / sundry
  drainHealth: { label: "Drain Health", shortLabel: "DRN♥", color: "red" },
  stagger: { label: "Stagger", shortLabel: "STG", color: "amber" },
  fallDamage: { label: "Fall Damage Red.", shortLabel: "FALL", color: "slate" },
  // Legacy keys still emitted by older callers — keep to avoid breaking renders
  drainHealthFactor: { label: "Drain Health", shortLabel: "DRN♥", color: "red" },
  drainManaFactor: { label: "Drain Mana", shortLabel: "DRN◆", color: "blue" },
  reflectDamageFactor: { label: "Reflect Damage", shortLabel: "RFLCT", color: "purple" },
  defenseBreakFactor: { label: "Defense Break", shortLabel: "DBRK", color: "amber" },
  blockBreakFactor: { label: "Block Break", shortLabel: "BBRK", color: "amber" },
  absorbHealthFactor: { label: "Absorb Health", shortLabel: "ABS♥", color: "red" },
  absorbManaFactor: { label: "Absorb Mana", shortLabel: "ABS◆", color: "blue" },
};

/**
 * The full set of derived stat keys the UI knows how to render.
 * Used to seed `calculateAttributeBonuses` so the "Show All" toggle
 * always shows every stat (even if it currently sums to 0).
 */
export const ALL_DERIVED_STAT_KEYS: DerivedStatKey[] = [
  "health", "mana", "stamina", "damage", "defense", "armor",
  "blockChance", "blockFactor", "blockPenetration",
  "criticalChance", "criticalFactor", "criticalEvasion",
  "accuracy", "evasion", "dodge", "resistance", "damageReduction",
  "attackSpeed", "movementSpeed", "reflexTime",
  "cooldownReduction", "comboCooldownRed", "abilityCost",
  "defenseBreak", "armorPenetration",
  "cdrResist", "defenseBreakResist", "bleedResist", "ccResistance",
  "spellblock", "statusEffect",
  "spellAccuracy", "manaRegen", "healthRegen",
  "drainHealth", "stagger", "fallDamage",
];

export function calculateAttributeBonuses(
  attributes: Record<string, number>,
  baseStats: Record<string, number> = {}
): Record<string, number> {
  // Seed every known derived stat to 0 so consumers can iterate the full
  // 37-stat list and never hit `undefined`. Saves the caller from doing
  // `value ?? 0` on every read.
  const result: Record<string, number> = {};
  for (const key of ALL_DERIVED_STAT_KEYS) result[key] = 0;

  for (const [attrId, points] of Object.entries(attributes)) {
    const attrDef = ATTRIBUTE_DEFINITIONS[attrId];
    if (!attrDef || points <= 0) continue;

    for (const [statKey, bonus] of Object.entries(attrDef.stats)) {
      if (!bonus) continue;
      const baseStat = baseStats[statKey] || 0;
      const flatBonus = bonus.flat * points;
      const percentBonus = baseStat * (bonus.percent / 100) * points;

      result[statKey] = (result[statKey] || 0) + flatBonus + percentBonus;
    }
  }

  return result;
}

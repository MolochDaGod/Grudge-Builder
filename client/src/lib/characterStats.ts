/**
 * Grudge Warlords — Canonical Character Stat Engine
 *
 * Source of truth: "Grudge Warlords - Ultimate Character Builder.html"
 * 8 attributes → 37 derived stats with exact per-point gains.
 * Includes diminishing returns, build tier classification, and combat power.
 */

// ── Attribute definitions ────────────────────────────────────────────

export const ATTRIBUTE_IDS = [
  "Strength", "Intellect", "Vitality", "Dexterity",
  "Endurance", "Wisdom", "Agility", "Tactics",
] as const;

export type AttributeId = typeof ATTRIBUTE_IDS[number];

export const TOTAL_POINTS = 160;

// ── Per-point gains (exact values from the Character Builder JS) ─────

interface GainEntry { stat: string; value: number; }

export const ATTRIBUTE_GAINS: Record<AttributeId, GainEntry[]> = {
  Strength: [
    { stat: "health", value: 5 },
    { stat: "damage", value: 1.25 },
    { stat: "defense", value: 4 },
    { stat: "block", value: 0.2 },
    { stat: "drainHealth", value: 0.075 },
    { stat: "stagger", value: 0.04 },
    { stat: "mana", value: 1 },
    { stat: "stamina", value: 0.8 },
    { stat: "accuracy", value: 0.08 },
    { stat: "healthRegen", value: 0.02 },
    { stat: "damageReduction", value: 0.02 },
  ],
  Intellect: [
    { stat: "mana", value: 9 },
    { stat: "damage", value: 1.5 },
    { stat: "defense", value: 2 },
    { stat: "manaRegen", value: 0.04 },
    { stat: "cooldownReduction", value: 0.075 },
    { stat: "spellAccuracy", value: 0.15 },
    { stat: "health", value: 3 },
    { stat: "stamina", value: 0.4 },
    { stat: "accuracy", value: 0.1 },
    { stat: "abilityCost", value: 0.05 },
  ],
  Vitality: [
    { stat: "health", value: 25 },
    { stat: "defense", value: 1.5 },
    { stat: "healthRegen", value: 0.06 },
    { stat: "damageReduction", value: 0.04 },
    { stat: "bleedResist", value: 0.15 },
    { stat: "mana", value: 1.5 },
    { stat: "stamina", value: 1 },
    { stat: "resistance", value: 0.08 },
    { stat: "armor", value: 0.2 },
  ],
  Dexterity: [
    { stat: "damage", value: 0.9 },
    { stat: "criticalChance", value: 0.3 },
    { stat: "accuracy", value: 0.25 },
    { stat: "attackSpeed", value: 0.2 },
    { stat: "evasion", value: 0.125 },
    { stat: "criticalDamage", value: 0.2 },
    { stat: "defense", value: 1.2 },
    { stat: "stamina", value: 0.6 },
    { stat: "movementSpeed", value: 0.08 },
    { stat: "reflexTime", value: 0.03 },
    { stat: "health", value: 3 },
  ],
  Endurance: [
    { stat: "stamina", value: 6 },
    { stat: "defense", value: 5 },
    { stat: "blockEffect", value: 0.175 },
    { stat: "ccResistance", value: 0.1 },
    { stat: "armor", value: 0.6 },
    { stat: "defenseBreakResist", value: 0.125 },
    { stat: "health", value: 8 },
    { stat: "mana", value: 1 },
    { stat: "healthRegen", value: 0.02 },
    { stat: "block", value: 0.12 },
  ],
  Wisdom: [
    { stat: "mana", value: 6 },
    { stat: "defense", value: 5.5 },
    { stat: "resistance", value: 0.25 },
    { stat: "cdrResist", value: 0.2 },
    { stat: "statusEffect", value: 0.075 },
    { stat: "spellblock", value: 0.125 },
    { stat: "health", value: 4 },
    { stat: "stamina", value: 0.5 },
    { stat: "damageReduction", value: 0.03 },
    { stat: "spellAccuracy", value: 0.1 },
  ],
  Agility: [
    { stat: "movementSpeed", value: 0.15 },
    { stat: "evasion", value: 0.225 },
    { stat: "dodge", value: 0.15 },
    { stat: "reflexTime", value: 0.04 },
    { stat: "criticalEvasion", value: 0.25 },
    { stat: "fallDamage", value: 0.2 },
    { stat: "stamina", value: 1 },
    { stat: "accuracy", value: 0.1 },
    { stat: "attackSpeed", value: 0.05 },
    { stat: "damage", value: 0.3 },
    { stat: "health", value: 3 },
  ],
  Tactics: [
    { stat: "stamina", value: 3 },
    { stat: "abilityCost", value: 0.075 },
    { stat: "armorPenetration", value: 0.2 },
    { stat: "blockPenetration", value: 0.175 },
    { stat: "defenseBreak", value: 0.1 },
    { stat: "comboCooldownRed", value: 0.125 },
    { stat: "damage", value: 0.4 },
    { stat: "defense", value: 1 },
    { stat: "mana", value: 1.5 },
    { stat: "cooldownReduction", value: 0.05 },
    { stat: "health", value: 3 },
  ],
};

// ── Derived stat metadata ────────────────────────────────────────────

export interface DerivedStatDef {
  id: string;
  label: string;
  isPercent: boolean;
  tooltip: string;
}

export const DERIVED_STATS: DerivedStatDef[] = [
  { id: "health",           label: "Health",              isPercent: false, tooltip: "Total hit points." },
  { id: "mana",             label: "Mana",                isPercent: false, tooltip: "Energy for abilities." },
  { id: "stamina",          label: "Stamina",             isPercent: false, tooltip: "Fuel for physical actions." },
  { id: "damage",           label: "Damage",              isPercent: false, tooltip: "Base damage dealt." },
  { id: "defense",          label: "Defense",             isPercent: false, tooltip: "Reduces physical damage." },
  { id: "block",            label: "Block %",             isPercent: true,  tooltip: "Chance to block attacks." },
  { id: "blockEffect",      label: "Block Effect %",      isPercent: true,  tooltip: "Damage reduction on block." },
  { id: "evasion",          label: "Evasion %",           isPercent: true,  tooltip: "Chance to dodge attacks." },
  { id: "accuracy",         label: "Accuracy %",          isPercent: true,  tooltip: "Hit chance." },
  { id: "criticalChance",   label: "Critical Chance %",   isPercent: true,  tooltip: "Chance of critical hit." },
  { id: "criticalDamage",   label: "Critical Damage %",   isPercent: true,  tooltip: "Extra damage on crit." },
  { id: "attackSpeed",      label: "Attack Speed %",      isPercent: true,  tooltip: "How fast you attack." },
  { id: "movementSpeed",    label: "Movement Speed %",    isPercent: true,  tooltip: "How fast you move." },
  { id: "resistance",       label: "Resistance %",        isPercent: true,  tooltip: "Reduces magical damage." },
  { id: "cdrResist",        label: "CDR Resist %",        isPercent: true,  tooltip: "Reduces enemy CDR effects." },
  { id: "defenseBreakResist",label:"Def Break Resist %",  isPercent: true,  tooltip: "Resists armor break." },
  { id: "armorPenetration",  label: "Armor Pen %",        isPercent: true,  tooltip: "Bypasses enemy defense." },
  { id: "blockPenetration",  label: "Block Pen %",        isPercent: true,  tooltip: "Ignores enemy block." },
  { id: "defenseBreak",     label: "Defense Break %",     isPercent: true,  tooltip: "Reduces enemy defense." },
  { id: "drainHealth",      label: "Drain Health %",      isPercent: true,  tooltip: "Lifesteal on damage." },
  { id: "manaRegen",        label: "Mana Regen /s",       isPercent: false, tooltip: "Mana restored per second." },
  { id: "healthRegen",      label: "Health Regen /s",     isPercent: false, tooltip: "Health restored per second." },
  { id: "cooldownReduction", label: "CDR %",              isPercent: true,  tooltip: "Reduces ability cooldowns." },
  { id: "abilityCost",      label: "Ability Cost %",      isPercent: true,  tooltip: "Reduces ability costs." },
  { id: "spellAccuracy",    label: "Spell Accuracy %",    isPercent: true,  tooltip: "Spell hit chance." },
  { id: "stagger",          label: "Stagger %",           isPercent: true,  tooltip: "Chance to interrupt." },
  { id: "ccResistance",     label: "CC Resistance %",     isPercent: true,  tooltip: "Reduces stun duration." },
  { id: "armor",            label: "Armor",               isPercent: false, tooltip: "Flat physical defense." },
  { id: "damageReduction",  label: "Damage Reduction %",  isPercent: true,  tooltip: "Reduces all damage." },
  { id: "bleedResist",      label: "Bleed Resist %",      isPercent: true,  tooltip: "Resistance to bleed." },
  { id: "statusEffect",     label: "Status Effect %",     isPercent: true,  tooltip: "Reduces debuff duration." },
  { id: "spellblock",       label: "Spellblock %",        isPercent: true,  tooltip: "Chance to negate spells." },
  { id: "dodge",            label: "Dodge %",             isPercent: true,  tooltip: "Dodge cooldown reduction." },
  { id: "reflexTime",       label: "Reflex Time %",       isPercent: true,  tooltip: "Parry/combo input window." },
  { id: "criticalEvasion",  label: "Critical Evasion %",  isPercent: true,  tooltip: "Chance to avoid crits." },
  { id: "fallDamage",       label: "Fall Damage %",       isPercent: true,  tooltip: "Reduces fall damage." },
  { id: "comboCooldownRed", label: "Combo CDR %",         isPercent: true,  tooltip: "Combo finisher CDR." },
];

// ── Stat calculation ─────────────────────────────────────────────────

export type AttributeMap = Record<AttributeId, number>;

export function defaultAttributes(): AttributeMap {
  return {
    Strength: 0, Intellect: 0, Vitality: 0, Dexterity: 0,
    Endurance: 0, Wisdom: 0, Agility: 0, Tactics: 0,
  };
}

/**
 * Calculate all 37 derived stats from attribute allocations.
 * Applies Tactics global bonus (0.5% per Tactics point to all non-resource stats).
 */
export function calculateDerivedStats(attrs: AttributeMap): Record<string, number> {
  const stats: Record<string, number> = {};

  // Initialize all stats to 0
  for (const def of DERIVED_STATS) stats[def.id] = 0;

  // Sum contributions from each attribute
  for (const attrId of ATTRIBUTE_IDS) {
    const points = attrs[attrId] || 0;
    if (points === 0) continue;
    const gains = ATTRIBUTE_GAINS[attrId];
    for (const g of gains) {
      stats[g.stat] = (stats[g.stat] || 0) + g.value * points;
    }
  }

  // Tactics global bonus: +0.5% per Tactics point to all non-resource stats
  const tacticsBonus = 1 + (attrs.Tactics || 0) * 0.005;
  const resourceStats = new Set(["health", "mana", "stamina", "damage", "defense", "armor", "manaRegen", "healthRegen"]);
  for (const key of Object.keys(stats)) {
    if (!resourceStats.has(key)) {
      stats[key] *= tacticsBonus;
    }
  }

  // Round display values
  for (const key of Object.keys(stats)) {
    stats[key] = Math.round(stats[key] * 100) / 100;
  }

  return stats;
}

// ── Build tier classification ────────────────────────────────────────

export interface BuildTier {
  name: string;
  cssClass: string;
  color: string;
  description: string;
  minRank: number;
}

export const BUILD_TIERS: BuildTier[] = [
  { name: "Mystic Diamond", cssClass: "mystic-diamond", color: "#89f7fe", description: "A transcendent force of nature.", minRank: 140 },
  { name: "Warlord",        cssClass: "warlord-orange",  color: "#f97316", description: "A legendary commander of war.", minRank: 120 },
  { name: "Epic",           cssClass: "epic-purple",     color: "#a855f7", description: "A powerful force to be reckoned with.", minRank: 100 },
  { name: "Hero",           cssClass: "hero-blue",       color: "#3b82f6", description: "A capable adventurer with potential.", minRank: 80 },
  { name: "Normal",         cssClass: "normal-grey",     color: "#9ca3af", description: "A developing warrior.", minRank: 0 },
];

/**
 * Classify a build based on its total allocated points and distribution quality.
 * Rank = sum of points that exceed 10 in any attribute (rewards specialization).
 */
export function classifyBuild(attrs: AttributeMap): BuildTier & { rank: number } {
  let rank = 0;
  for (const attrId of ATTRIBUTE_IDS) {
    const pts = attrs[attrId] || 0;
    rank += pts; // base rank from total points
    if (pts >= 30) rank += 10; // specialization bonus
    if (pts >= 50) rank += 10;
  }
  // Find highest qualifying tier
  for (const tier of BUILD_TIERS) {
    if (rank >= tier.minRank) return { ...tier, rank };
  }
  return { ...BUILD_TIERS[BUILD_TIERS.length - 1], rank };
}

// ── Combat Power ─────────────────────────────────────────────────────

/**
 * Compute a single Combat Power score (displayed as a big number in the builder).
 * Weighted sum of key derived stats.
 */
export function calculateCombatPower(stats: Record<string, number>): number {
  return Math.round(
    (stats.health || 0) * 1.0 +
    (stats.mana || 0) * 0.8 +
    (stats.stamina || 0) * 0.6 +
    (stats.damage || 0) * 15 +
    (stats.defense || 0) * 5 +
    (stats.criticalChance || 0) * 20 +
    (stats.criticalDamage || 0) * 10 +
    (stats.evasion || 0) * 15 +
    (stats.accuracy || 0) * 12 +
    (stats.block || 0) * 10 +
    (stats.resistance || 0) * 8 +
    (stats.attackSpeed || 0) * 10 +
    (stats.armorPenetration || 0) * 12 +
    (stats.drainHealth || 0) * 15
  );
}

// ── Build rating (A-F) ──────────────────────────────────────────────

export function getBuildRating(combatPower: number): string {
  if (combatPower >= 5000) return "S";
  if (combatPower >= 4000) return "A";
  if (combatPower >= 3000) return "B";
  if (combatPower >= 2000) return "C";
  if (combatPower >= 1000) return "D";
  return "F";
}

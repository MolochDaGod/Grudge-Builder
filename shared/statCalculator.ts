/**
 * Canonical per-point attribute gains.
 * Source of truth: "Grudge Warlords - Ultimate Character Builder.html" (JS section)
 * Also see: client/src/lib/characterStats.ts for the full 37-stat engine.
 *
 * Format: { stat: perPointValue }
 */
export const CANONICAL_GAINS: Record<string, Record<string, number>> = {
  Strength:  { health: 5, damage: 1.25, defense: 4, block: 0.2, drainHealth: 0.075, stagger: 0.04, mana: 1, stamina: 0.8, accuracy: 0.08, healthRegen: 0.02, damageReduction: 0.02 },
  Intellect: { mana: 9, damage: 1.5, defense: 2, manaRegen: 0.04, cooldownReduction: 0.075, spellAccuracy: 0.15, health: 3, stamina: 0.4, accuracy: 0.1, abilityCost: 0.05 },
  Vitality:  { health: 25, defense: 1.5, healthRegen: 0.06, damageReduction: 0.04, bleedResist: 0.15, mana: 1.5, stamina: 1, resistance: 0.08, armor: 0.2 },
  Dexterity: { damage: 0.9, criticalChance: 0.3, accuracy: 0.25, attackSpeed: 0.2, evasion: 0.125, criticalDamage: 0.2, defense: 1.2, stamina: 0.6, movementSpeed: 0.08, reflexTime: 0.03, health: 3 },
  Endurance: { stamina: 6, defense: 5, blockEffect: 0.175, ccResistance: 0.1, armor: 0.6, defenseBreakResist: 0.125, health: 8, mana: 1, healthRegen: 0.02, block: 0.12 },
  Wisdom:    { mana: 6, defense: 5.5, resistance: 0.25, cdrResist: 0.2, statusEffect: 0.075, spellblock: 0.125, health: 4, stamina: 0.5, damageReduction: 0.03, spellAccuracy: 0.1 },
  Agility:   { movementSpeed: 0.15, evasion: 0.225, dodge: 0.15, reflexTime: 0.04, criticalEvasion: 0.25, fallDamage: 0.2, stamina: 1, accuracy: 0.1, attackSpeed: 0.05, damage: 0.3, health: 3 },
  Tactics:   { stamina: 3, abilityCost: 0.075, armorPenetration: 0.2, blockPenetration: 0.175, defenseBreak: 0.1, comboCooldownRed: 0.125, damage: 0.4, defense: 1, mana: 1.5, cooldownReduction: 0.05, health: 3 },
};

// Legacy re-export for any code still referencing the old shape
export const ATTRIBUTE_GAINS = CANONICAL_GAINS;

export const CLASS_BASE_STATS: Record<string, { hp: number; mana: number; stamina: number }> = {
  warrior: { hp: 150, mana: 30, stamina: 100 },
  mage: { hp: 80, mana: 150, stamina: 50 },
  ranger: { hp: 100, mana: 60, stamina: 120 },
  shapeshifter: { hp: 120, mana: 80, stamina: 80 },
};

// Base stats at level 0
const BASE_DAMAGE = 20;
const BASE_DEFENSE = 10;

export const ATTRIBUTE_POINTS_PER_LEVEL = 7;
export const STARTING_ATTRIBUTE_POINTS = 20;

export interface DerivedStats {
  maxHealth: number;
  maxMana: number;
  maxStamina: number;
  physDmg: number;
  magDmg: number;
  physDef: number;
  magDef: number;
  crit: number;
  critDmg: number;
  accuracy: number;
  attackSpeed: number;
  blockChance: number;
  evasion: number;
  moveSpeed: number;
  speed: number;
}

export function calculateDerivedStats(
  attributes: Record<string, number>,
  classId: string
): DerivedStats {
  const baseStats = CLASS_BASE_STATS[classId] || CLASS_BASE_STATS.warrior;
  
  const str = attributes.Strength || 0;
  const int = attributes.Intellect || 0;
  const vit = attributes.Vitality || 0;
  const dex = attributes.Dexterity || 0;
  const end = attributes.Endurance || 0;
  const wis = attributes.Wisdom || 0;
  const agi = attributes.Agility || 0;
  const tac = attributes.Tactics || 0;

  // Health: STR (26 + 0.8%), VIT (25 + 0.5%), END (10 + 0.1%), WIS (10), AGI (2 + 0.6%), TAC (10 + 8.4%)
  const healthFlat = (str * 26) + (vit * 25) + (end * 10) + (wis * 10) + (agi * 2) + (tac * 10);
  const healthPercent = baseStats.hp * ((str * 0.008) + (vit * 0.005) + (end * 0.001) + (agi * 0.006) + (tac * 0.084));
  
  // Mana: INT (5 + 5%), VIT (2 + 0.2%), WIS (20 + 3%), TAC (0 + 8.2%)
  const manaFlat = (int * 5) + (vit * 2) + (wis * 20);
  const manaPercent = baseStats.mana * ((int * 0.05) + (vit * 0.002) + (wis * 0.03) + (tac * 0.082));
  
  // Stamina: VIT (5 + 0.1%), END (1 + 0.3%), AGI (5 + 0.5%), TAC (1)
  const staminaFlat = (vit * 5) + (end * 1) + (agi * 5) + (tac * 1);
  const staminaPercent = baseStats.stamina * ((vit * 0.001) + (end * 0.003) + (agi * 0.005));
  
  // Physical Damage: STR (3 + 2%), VIT (2 + 0.1%), DEX (3 + 1.8%), AGI (3 + 1.6%), TAC (3 + 0.2%)
  const physDmgFlat = (str * 3) + (vit * 2) + (dex * 3) + (agi * 3) + (tac * 3);
  const physDmgPercent = BASE_DAMAGE * ((str * 0.02) + (vit * 0.001) + (dex * 0.018) + (agi * 0.016) + (tac * 0.002));
  
  // Magic Damage: INT (4 + 2.5%), WIS (2 + 1.5%)
  const magDmgFlat = (int * 4) + (wis * 2);
  const magDmgPercent = BASE_DAMAGE * ((int * 0.025) + (wis * 0.015));
  
  // Physical Defense: STR (12 + 1.5%), VIT (12), END (12 + 12%), INT (2), WIS (2), DEX (10 + 1%), AGI (5 + 0.8%), TAC (5 + 0.5%)
  const physDefFlat = (str * 12) + (vit * 12) + (end * 12) + (int * 2) + (wis * 2) + (dex * 10) + (agi * 5) + (tac * 5);
  const physDefPercent = BASE_DEFENSE * ((str * 0.015) + (end * 0.12) + (dex * 0.01) + (agi * 0.008) + (tac * 0.005));
  
  // Magic Defense (Resistance): INT (0.38 + 17%), VIT (0.5), END (0.46), WIS (0.5)
  const magDefFlat = (int * 0.38) + (vit * 0.5) + (end * 0.46) + (wis * 0.5);
  const magDefPercent = 10 * ((int * 0.17)); // Using base 10 for percentage calculation
  
  // Crit Chance: STR (0.32 + 7%), INT (0.23 + 0.1%), WIS (0.5 + 0.15%), DEX (0.5 + 1.2%), AGI (0.42 + 1%), TAC (0.02 + 2%)
  const critFlat = (str * 0.32) + (int * 0.23) + (wis * 0.5) + (dex * 0.5) + (agi * 0.42) + (tac * 0.02);
  const critPercent = 5 * ((str * 0.07) + (int * 0.001) + (wis * 0.0015) + (dex * 0.012) + (agi * 0.01) + (tac * 0.02));

  // Block Chance: STR (0.5 + 5%), END (0.11 + 73.5%), DEX (0.41 + 1%), TAC (0.27 + 0.8%)
  const blockFlat = (str * 0.5) + (end * 0.11) + (dex * 0.41) + (tac * 0.27);
  const blockPercent = 5 * ((str * 0.05) + (end * 0.735) + (dex * 0.01) + (tac * 0.008));

  // Evasion: DEX (0.125), AGI (0.225)
  const evasionVal = (dex * 0.125) + (agi * 0.225);

  // Accuracy: INT (0.12 + 33.8%), DEX (0.7 + 1.5%)
  const accuracyFlat = (int * 0.12) + (dex * 0.7);
  const accuracyPercent = 50 * ((int * 0.338) + (dex * 0.015));

  // Attack Speed: DEX (0.2), AGI (0.05)
  const atkSpeedVal = (dex * 0.2) + (agi * 0.05);

  // Crit Damage Multiplier: base 150% + STR (1.1 + 1.5%)
  const critDmgFlat = 150 + (str * 1.1);
  const critDmgPercent = 150 * (str * 0.015);

  return {
    maxHealth: Math.floor(baseStats.hp + healthFlat + healthPercent),
    maxMana: Math.floor(baseStats.mana + manaFlat + manaPercent),
    maxStamina: Math.floor(baseStats.stamina + staminaFlat + staminaPercent),
    physDmg: Math.floor(BASE_DAMAGE + physDmgFlat + physDmgPercent),
    magDmg: Math.floor(BASE_DAMAGE + magDmgFlat + magDmgPercent),
    physDef: Math.floor(BASE_DEFENSE + physDefFlat + physDefPercent),
    magDef: Math.floor(magDefFlat + magDefPercent),
    crit: critFlat + critPercent,
    critDmg: critDmgFlat + critDmgPercent,
    accuracy: Math.min(100, accuracyFlat + accuracyPercent),
    attackSpeed: atkSpeedVal,
    blockChance: Math.min(75, blockFlat + blockPercent),
    evasion: Math.min(60, evasionVal),
    moveSpeed: 100 + (agi * 0.15),
    speed: 100 + (agi * 0.15),
  };
}

export function calculateUnspentPointsForLevel(level: number): number {
  return STARTING_ATTRIBUTE_POINTS + (level * ATTRIBUTE_POINTS_PER_LEVEL);
}

/**
 * Single Combat Power number representing overall character strength.
 * Adapted from the Grudge Warlords character builder reference.
 */
export function calculateCombatPower(stats: DerivedStats): number {
  const ehp = stats.maxHealth * (1 + stats.physDef / 1000) * (1 + stats.magDef / 100);
  const dps = (stats.physDmg + stats.magDmg) *
    (1 + (stats.crit / 100) * (stats.critDmg / 100)) *
    (1 + stats.attackSpeed / 100);
  const utility = stats.moveSpeed * 2 + stats.evasion * 3 + stats.blockChance * 2;
  return Math.floor(ehp * 0.4 + dps * 2.5 + utility * 5);
}

export function getBuildRating(combatPower: number): { letter: string; color: string } {
  if (combatPower >= 5000) return { letter: 'S+', color: '#fbbf24' };
  if (combatPower >= 4000) return { letter: 'S', color: '#f59e0b' };
  if (combatPower >= 3000) return { letter: 'A', color: '#a855f7' };
  if (combatPower >= 2000) return { letter: 'B', color: '#3b82f6' };
  if (combatPower >= 1500) return { letter: 'C', color: '#10b981' };
  if (combatPower >= 1000) return { letter: 'D', color: '#9ca3af' };
  return { letter: 'F', color: '#4b5563' };
}

// ── Full 37-stat engine (canonical) ──────────────────────────────────────────
// Re-export the full stat engine so pages can import either the legacy DerivedStats
// or the complete 37-stat breakdown from a single module.

export {
  ATTRIBUTE_IDS,
  DERIVED_STATS,
  BUILD_TIERS,
  calculateDerivedStats as calculateFullStats,
  classifyBuild,
  calculateCombatPower as calculateFullCombatPower,
  getBuildRating as getFullBuildRating,
  type AttributeMap,
  type DerivedStatDef,
  type BuildTier,
  type AttributeId,
} from "../client/src/lib/characterStats";

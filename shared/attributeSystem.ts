/**
 * GRUDGE WARLORDS - Complete Attributes & Stats System
 * 
 * 8 Core Attributes with flat bonuses and percentage bonuses per point.
 * Includes diminishing returns after 25 points and stat caps.
 */

// ============================================
// ATTRIBUTE DEFINITIONS
// ============================================

export const ATTRIBUTE_IDS = [
  'strength',
  'vitality', 
  'endurance',
  'intellect',
  'wisdom',
  'dexterity',
  'agility',
  'tactics'
] as const;

export type AttributeId = typeof ATTRIBUTE_IDS[number];

export interface AttributeDefinition {
  id: AttributeId;
  name: string;
  abbrev: string;
  role: string;
  description: string;
  color: string;
  icon: string;
  effects: StatEffect[];
}

export interface StatEffect {
  stat: SecondaryStatId;
  flat: number;      // Fixed amount per point
  percent: number;   // Percentage of base stat per point (as decimal, e.g., 0.008 = 0.8%)
}

// ============================================
// SECONDARY STATS (Derived from Attributes)
// ============================================

export const SECONDARY_STAT_IDS = [
  // Primary Resources
  'health',
  'mana',
  'stamina',
  // Combat Stats
  'damage',
  'defense',
  // Chance Stats (%)
  'blockChance',
  'criticalChance',
  'accuracy',
  'resistance',
  // Factor Stats (multipliers)
  'blockFactor',
  'criticalFactor',
  // Advanced Combat
  'drainHealthFactor',
  'drainManaFactor',
  'reflectFactor',
  'absorbHealthFactor',
  'absorbManaFactor',
  'defenseBreakFactor',
  'blockBreakFactor',
  'critEvasion'
] as const;

export type SecondaryStatId = typeof SECONDARY_STAT_IDS[number];

export interface StatDefinition {
  id: SecondaryStatId;
  name: string;
  abbrev: string;
  description: string;
  isPercentage: boolean;
  minValue: number;
  maxValue: number;
  defaultValue: number;
}

// ============================================
// STAT CAPS & LIMITS
// ============================================

export const STAT_CAPS: Record<SecondaryStatId, { min: number; max: number }> = {
  health: { min: 1, max: 999999 },
  mana: { min: 0, max: 999999 },
  stamina: { min: 0, max: 999 },
  damage: { min: 1, max: 99999 },
  defense: { min: 0, max: 9999 },
  blockChance: { min: 0, max: 0.75 },        // 75% cap
  criticalChance: { min: 0, max: 0.75 },     // 75% cap
  accuracy: { min: 0, max: 0.95 },           // 95% cap
  resistance: { min: 0, max: 0.95 },         // 95% cap
  blockFactor: { min: 0, max: 0.90 },        // 90% cap (blocks 90% damage)
  criticalFactor: { min: 1, max: 3.0 },      // 300% damage cap
  drainHealthFactor: { min: 0, max: 0.50 },  // 50% lifesteal cap
  drainManaFactor: { min: 0, max: 0.50 },    // 50% manasteal cap
  reflectFactor: { min: 0, max: 0.50 },      // 50% reflect cap
  absorbHealthFactor: { min: 0, max: 0.50 }, // 50% absorb cap
  absorbManaFactor: { min: 0, max: 0.50 },   // 50% absorb cap
  defenseBreakFactor: { min: 0, max: 0.75 }, // 75% defense ignore cap
  blockBreakFactor: { min: 0, max: 0.75 },   // 75% block ignore cap
  critEvasion: { min: 0, max: 0.50 },        // 50% crit evasion cap
};

// ============================================
// DIMINISHING RETURNS SYSTEM
// ============================================

export const DIMINISHING_RETURNS = {
  enabled: true,
  threshold: 25,        // DR kicks in after 25 points
  tier1Efficiency: 0.5, // 50% efficiency for points 26-50
  tier2Efficiency: 0.25 // 25% efficiency for points 51+
};

/**
 * Calculate effective attribute points with diminishing returns
 */
export function getEffectivePoints(actualPoints: number): number {
  if (!DIMINISHING_RETURNS.enabled || actualPoints <= DIMINISHING_RETURNS.threshold) {
    return actualPoints;
  }
  
  let effective = DIMINISHING_RETURNS.threshold; // First 25 points at 100%
  
  if (actualPoints <= 50) {
    // Points 26-50 at 50% efficiency
    const tier1Points = actualPoints - DIMINISHING_RETURNS.threshold;
    effective += tier1Points * DIMINISHING_RETURNS.tier1Efficiency;
  } else {
    // Points 26-50 at 50%
    effective += 25 * DIMINISHING_RETURNS.tier1Efficiency;
    // Points 51+ at 25%
    const tier2Points = actualPoints - 50;
    effective += tier2Points * DIMINISHING_RETURNS.tier2Efficiency;
  }
  
  return effective;
}

// ============================================
// THE 8 ATTRIBUTES (CORRECTED VALUES)
// ============================================

export const ATTRIBUTES: Record<AttributeId, AttributeDefinition> = {
  strength: {
    id: 'strength',
    name: 'Strength',
    abbrev: 'STR',
    role: 'Tank / Melee DPS',
    description: 'High health, damage, and defense with strong combat modifiers',
    color: '#e74c3c',
    icon: '/assets/ui/sigils/strength.png',
    effects: [
      { stat: 'health', flat: 26, percent: 0.008 },
      { stat: 'damage', flat: 3, percent: 0.02 },        // Fixed from -39.1% to +2%
      { stat: 'defense', flat: 12, percent: 0.015 },     // Fixed from -79.2% to +1.5%
      { stat: 'blockChance', flat: 0.005, percent: 0.05 },
      { stat: 'criticalChance', flat: 0.0032, percent: 0.07 },
      { stat: 'blockFactor', flat: 0.0085, percent: 0.263 },
      { stat: 'criticalFactor', flat: 0.011, percent: 0.015 }, // Fixed from -53% to +1.5%
    ]
  },
  
  vitality: {
    id: 'vitality',
    name: 'Vitality',
    abbrev: 'VIT',
    role: 'Tank / Survivability',
    description: 'Maximum health, defense, and damage mitigation',
    color: '#27ae60',
    icon: '/assets/ui/sigils/vitality.png',
    effects: [
      { stat: 'health', flat: 25, percent: 0.005 },
      { stat: 'mana', flat: 2, percent: 0.002 },
      { stat: 'stamina', flat: 5, percent: 0.001 },
      { stat: 'damage', flat: 2, percent: 0.001 },
      { stat: 'defense', flat: 12, percent: 0 },
      { stat: 'blockFactor', flat: 0.003, percent: 0.17 },
      { stat: 'resistance', flat: 0.005, percent: 0 },
    ]
  },
  
  endurance: {
    id: 'endurance',
    name: 'Endurance',
    abbrev: 'END',
    role: 'Defensive Specialist',
    description: 'Defense, block mechanics, and critical evasion',
    color: '#95a5a6',
    icon: '/assets/ui/sigils/endurance.png',
    effects: [
      { stat: 'health', flat: 10, percent: 0.001 },
      { stat: 'stamina', flat: 1, percent: 0.003 },
      { stat: 'defense', flat: 12, percent: 0.12 },
      { stat: 'blockChance', flat: 0.0011, percent: 0.735 },
      { stat: 'blockFactor', flat: 0.0027, percent: 0 },
      { stat: 'resistance', flat: 0.0046, percent: 0 },
    ]
  },
  
  intellect: {
    id: 'intellect',
    name: 'Intellect',
    abbrev: 'INT',
    role: 'Mage / Caster',
    description: 'Mana, magic damage, and spell accuracy',
    color: '#3498db',
    icon: '/assets/ui/sigils/intellect.png',
    effects: [
      { stat: 'mana', flat: 5, percent: 0.05 },
      { stat: 'damage', flat: 4, percent: 0.025 },       // Fixed from -23.7% to +2.5%
      { stat: 'defense', flat: 2, percent: 0 },
      { stat: 'criticalChance', flat: 0.0023, percent: 0.001 },
      { stat: 'accuracy', flat: 0.0012, percent: 0.338 },
      { stat: 'resistance', flat: 0.0038, percent: 0.17 },
    ]
  },
  
  wisdom: {
    id: 'wisdom',
    name: 'Wisdom',
    abbrev: 'WIS',
    role: 'Healer / Support',
    description: 'Mana efficiency, survivability, and spell effectiveness',
    color: '#9b59b6',
    icon: '/assets/ui/sigils/wisdom.png',
    effects: [
      { stat: 'health', flat: 10, percent: 0 },
      { stat: 'mana', flat: 20, percent: 0.03 },         // Fixed from +0.2% to +3%
      { stat: 'damage', flat: 2, percent: 0.015 },       // Fixed from -10% to +1.5%
      { stat: 'defense', flat: 2, percent: 0 },
      { stat: 'criticalChance', flat: 0.005, percent: 0.0015 },
      { stat: 'resistance', flat: 0.005, percent: 0 },
    ]
  },
  
  dexterity: {
    id: 'dexterity',
    name: 'Dexterity',
    abbrev: 'DEX',
    role: 'Rogue / Precision Fighter',
    description: 'Critical strikes, accuracy, and evasion',
    color: '#f39c12',
    icon: '/assets/ui/sigils/dexterity.png',
    effects: [
      { stat: 'damage', flat: 3, percent: 0.018 },       // Fixed from -26.1% to +1.8%
      { stat: 'defense', flat: 10, percent: 0.01 },
      { stat: 'blockChance', flat: 0.0041, percent: 0.01 }, // Fixed from -53.8% to +1%
      { stat: 'criticalChance', flat: 0.005, percent: 0.012 }, // Fixed from -66.1% to +1.2%
      { stat: 'accuracy', flat: 0.007, percent: 0.015 }, // Fixed from -50.1% to +1.5%
    ]
  },
  
  agility: {
    id: 'agility',
    name: 'Agility',
    abbrev: 'AGI',
    role: 'Mobile DPS / Dodge Tank',
    description: 'Mobility, critical strikes, and defensive penetration',
    color: '#1abc9c',
    icon: '/assets/ui/sigils/agility.png',
    effects: [
      { stat: 'health', flat: 2, percent: 0.006 },
      { stat: 'stamina', flat: 5, percent: 0.005 },      // Fixed from 0% to +0.5%
      { stat: 'damage', flat: 3, percent: 0.016 },       // Fixed from -25.1% to +1.6%
      { stat: 'defense', flat: 5, percent: 0.008 },      // Fixed from -44.4% to +0.8%
      { stat: 'criticalChance', flat: 0.0042, percent: 0.01 }, // Fixed from -41.8% to +1%
    ]
  },
  
  tactics: {
    id: 'tactics',
    name: 'Tactics',
    abbrev: 'TAC',
    role: 'Strategic Fighter / Commander',
    description: 'Balanced combat stats with penetration abilities',
    color: '#34495e',
    icon: '/assets/ui/sigils/tactics.png',
    effects: [
      { stat: 'health', flat: 10, percent: 0.084 },
      { stat: 'mana', flat: 0, percent: 0.082 },
      { stat: 'stamina', flat: 1, percent: 0 },
      { stat: 'damage', flat: 3, percent: 0.002 },
      { stat: 'defense', flat: 5, percent: 0.005 },
      { stat: 'blockChance', flat: 0.0027, percent: 0.008 }, // Fixed from -65.4% to +0.8%
    ]
  }
};

// ============================================
// STAT DEFINITIONS
// ============================================

export const STAT_DEFINITIONS: Record<SecondaryStatId, StatDefinition> = {
  health: {
    id: 'health',
    name: 'Health',
    abbrev: 'HP',
    description: 'Total hit points. Reaching 0 means defeat.',
    isPercentage: false,
    minValue: 1,
    maxValue: 999999,
    defaultValue: 100
  },
  mana: {
    id: 'mana',
    name: 'Mana',
    abbrev: 'MP',
    description: 'Magical energy for casting spells and abilities.',
    isPercentage: false,
    minValue: 0,
    maxValue: 999999,
    defaultValue: 50
  },
  stamina: {
    id: 'stamina',
    name: 'Stamina',
    abbrev: 'STA',
    description: 'Physical energy for special attacks and movement.',
    isPercentage: false,
    minValue: 0,
    maxValue: 999,
    defaultValue: 100
  },
  damage: {
    id: 'damage',
    name: 'Damage',
    abbrev: 'DMG',
    description: 'Base physical/magical damage output.',
    isPercentage: false,
    minValue: 1,
    maxValue: 99999,
    defaultValue: 10
  },
  defense: {
    id: 'defense',
    name: 'Defense',
    abbrev: 'DEF',
    description: 'Reduces incoming damage via mitigation formula.',
    isPercentage: false,
    minValue: 0,
    maxValue: 9999,
    defaultValue: 0
  },
  blockChance: {
    id: 'blockChance',
    name: 'Block Chance',
    abbrev: 'BLK%',
    description: 'Chance to block incoming attacks.',
    isPercentage: true,
    minValue: 0,
    maxValue: 0.75,
    defaultValue: 0
  },
  criticalChance: {
    id: 'criticalChance',
    name: 'Critical Chance',
    abbrev: 'CRIT%',
    description: 'Chance to deal critical damage.',
    isPercentage: true,
    minValue: 0,
    maxValue: 0.75,
    defaultValue: 0.05
  },
  accuracy: {
    id: 'accuracy',
    name: 'Accuracy',
    abbrev: 'ACC',
    description: 'Chance to successfully apply debuffs.',
    isPercentage: true,
    minValue: 0,
    maxValue: 0.95,
    defaultValue: 0.5
  },
  resistance: {
    id: 'resistance',
    name: 'Resistance',
    abbrev: 'RES',
    description: 'Chance to resist incoming debuffs.',
    isPercentage: true,
    minValue: 0,
    maxValue: 0.95,
    defaultValue: 0
  },
  blockFactor: {
    id: 'blockFactor',
    name: 'Block Factor',
    abbrev: 'BLK×',
    description: 'Percentage of damage blocked on successful block.',
    isPercentage: true,
    minValue: 0,
    maxValue: 0.90,
    defaultValue: 0.3
  },
  criticalFactor: {
    id: 'criticalFactor',
    name: 'Critical Factor',
    abbrev: 'CRIT×',
    description: 'Damage multiplier on critical hits.',
    isPercentage: false,
    minValue: 1,
    maxValue: 3.0,
    defaultValue: 1.5
  },
  drainHealthFactor: {
    id: 'drainHealthFactor',
    name: 'Health Drain',
    abbrev: 'DRAIN',
    description: 'Percentage of damage dealt restored as health.',
    isPercentage: true,
    minValue: 0,
    maxValue: 0.50,
    defaultValue: 0
  },
  drainManaFactor: {
    id: 'drainManaFactor',
    name: 'Mana Drain',
    abbrev: 'MDRAIN',
    description: 'Percentage of damage dealt restored as mana.',
    isPercentage: true,
    minValue: 0,
    maxValue: 0.50,
    defaultValue: 0
  },
  reflectFactor: {
    id: 'reflectFactor',
    name: 'Reflect',
    abbrev: 'REFL',
    description: 'Percentage of damage received reflected back.',
    isPercentage: true,
    minValue: 0,
    maxValue: 0.50,
    defaultValue: 0
  },
  absorbHealthFactor: {
    id: 'absorbHealthFactor',
    name: 'Health Absorb',
    abbrev: 'ABSH',
    description: 'Percentage of damage received converted to health.',
    isPercentage: true,
    minValue: 0,
    maxValue: 0.50,
    defaultValue: 0
  },
  absorbManaFactor: {
    id: 'absorbManaFactor',
    name: 'Mana Absorb',
    abbrev: 'ABSM',
    description: 'Percentage of damage received converted to mana.',
    isPercentage: true,
    minValue: 0,
    maxValue: 0.50,
    defaultValue: 0
  },
  defenseBreakFactor: {
    id: 'defenseBreakFactor',
    name: 'Defense Break',
    abbrev: 'DBRK',
    description: 'Percentage of target defense ignored.',
    isPercentage: true,
    minValue: 0,
    maxValue: 0.75,
    defaultValue: 0
  },
  blockBreakFactor: {
    id: 'blockBreakFactor',
    name: 'Block Break',
    abbrev: 'BBRK',
    description: 'Reduces target block chance.',
    isPercentage: true,
    minValue: 0,
    maxValue: 0.75,
    defaultValue: 0
  },
  critEvasion: {
    id: 'critEvasion',
    name: 'Critical Evasion',
    abbrev: 'CEVA',
    description: 'Reduces incoming critical chance.',
    isPercentage: true,
    minValue: 0,
    maxValue: 0.50,
    defaultValue: 0
  }
};

// ============================================
// BASE STATS BY LEVEL
// ============================================

export interface BaseStats {
  health: number;
  mana: number;
  stamina: number;
  damage: number;
}

export function getBaseStatsByLevel(level: number): BaseStats {
  return {
    health: 100 + (level * 10),
    mana: 50 + (level * 5),
    stamina: 100,
    damage: 10 + (level * 2)
  };
}

// ============================================
// STAT CALCULATION
// ============================================

export interface CharacterAttributes {
  strength: number;
  vitality: number;
  endurance: number;
  intellect: number;
  wisdom: number;
  dexterity: number;
  agility: number;
  tactics: number;
}

export interface ComputedStats {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  damage: number;
  defense: number;
  blockChance: number;
  criticalChance: number;
  accuracy: number;
  resistance: number;
  blockFactor: number;
  criticalFactor: number;
  drainHealthFactor: number;
  drainManaFactor: number;
  reflectFactor: number;
  absorbHealthFactor: number;
  absorbManaFactor: number;
  defenseBreakFactor: number;
  blockBreakFactor: number;
  critEvasion: number;
}

/**
 * Calculate all derived stats from attributes
 */
export function calculateStats(
  level: number,
  attributes: CharacterAttributes,
  equipmentBonuses?: Partial<Record<SecondaryStatId, number>>
): ComputedStats {
  const baseStats = getBaseStatsByLevel(level);
  
  // Initialize stats with defaults (these are the base values for percentage calculations)
  const initStats: Record<SecondaryStatId, number> = {
    health: baseStats.health,
    mana: baseStats.mana,
    stamina: baseStats.stamina,
    damage: baseStats.damage,
    defense: 0,
    blockChance: 0,
    criticalChance: 0.05,
    accuracy: 0.5,
    resistance: 0,
    blockFactor: 0.3,
    criticalFactor: 1.5,
    drainHealthFactor: 0,
    drainManaFactor: 0,
    reflectFactor: 0,
    absorbHealthFactor: 0,
    absorbManaFactor: 0,
    defenseBreakFactor: 0,
    blockBreakFactor: 0,
    critEvasion: 0
  };
  
  // Clone for modification
  const stats = { ...initStats };
  
  // Apply attribute bonuses
  for (const attrId of ATTRIBUTE_IDS) {
    const attrDef = ATTRIBUTES[attrId];
    const rawPoints = attributes[attrId] || 0;
    const effectivePoints = getEffectivePoints(rawPoints);
    
    for (const effect of attrDef.effects) {
      const baseValue = getBaseValueForStat(effect.stat, baseStats, initStats);
      const flatBonus = effect.flat * effectivePoints;
      const percentBonus = baseValue * effect.percent * effectivePoints;
      stats[effect.stat] += flatBonus + percentBonus;
    }
  }
  
  // Apply equipment bonuses
  if (equipmentBonuses) {
    for (const [statId, bonus] of Object.entries(equipmentBonuses)) {
      if (bonus && statId in stats) {
        stats[statId as SecondaryStatId] += bonus;
      }
    }
  }
  
  // Apply stat caps
  for (const statId of SECONDARY_STAT_IDS) {
    const cap = STAT_CAPS[statId];
    stats[statId] = Math.max(cap.min, Math.min(cap.max, stats[statId]));
  }
  
  return {
    health: Math.floor(stats.health),
    maxHealth: Math.floor(stats.health),
    mana: Math.floor(stats.mana),
    maxMana: Math.floor(stats.mana),
    stamina: Math.floor(stats.stamina),
    maxStamina: Math.floor(stats.stamina),
    damage: Math.floor(stats.damage),
    defense: Math.floor(stats.defense),
    blockChance: stats.blockChance,
    criticalChance: stats.criticalChance,
    accuracy: stats.accuracy,
    resistance: stats.resistance,
    blockFactor: stats.blockFactor,
    criticalFactor: stats.criticalFactor,
    drainHealthFactor: stats.drainHealthFactor,
    drainManaFactor: stats.drainManaFactor,
    reflectFactor: stats.reflectFactor,
    absorbHealthFactor: stats.absorbHealthFactor,
    absorbManaFactor: stats.absorbManaFactor,
    defenseBreakFactor: stats.defenseBreakFactor,
    blockBreakFactor: stats.blockBreakFactor,
    critEvasion: stats.critEvasion
  };
}

function getBaseValueForStat(statId: SecondaryStatId, baseStats: BaseStats, initStats: Record<SecondaryStatId, number>): number {
  switch (statId) {
    case 'health': return baseStats.health;
    case 'mana': return baseStats.mana;
    case 'stamina': return baseStats.stamina;
    case 'damage': return baseStats.damage;
    default: 
      // For percentage-based stats, use the initialized value as the base
      // This allows percentage bonuses to scale properly
      return initStats[statId] > 0 ? initStats[statId] : STAT_DEFINITIONS[statId].defaultValue || 1;
  }
}

// ============================================
// COMBAT CALCULATIONS
// ============================================

export interface CombatResult {
  rawDamage: number;
  mitigatedDamage: number;
  finalDamage: number;
  blocked: boolean;
  critical: boolean;
  healthDrained: number;
  manaDrained: number;
  reflected: number;
  healthAbsorbed: number;
  manaAbsorbed: number;
}

/**
 * Calculate damage mitigation from defense
 * Formula: Damage Taken = Incoming × (100 - √Defense) / 100
 */
export function calculateMitigation(incomingDamage: number, defense: number): number {
  const sqrtDefense = Math.sqrt(Math.max(0, defense));
  const reduction = Math.min(sqrtDefense, 90); // Cap at 90% reduction
  return incomingDamage * (100 - reduction) / 100;
}

/**
 * Full combat damage calculation with all factors
 */
export function calculateCombatDamage(
  attacker: ComputedStats,
  defender: ComputedStats,
  randomVariance: boolean = true
): CombatResult {
  let damage = attacker.damage;
  
  // Step 1: Apply random variance (±25%)
  if (randomVariance) {
    const variance = 0.75 + Math.random() * 0.5; // 0.75 to 1.25
    damage = Math.floor(damage * variance);
  }
  
  const rawDamage = damage;
  
  // Step 2: Apply defense break
  let effectiveDefense = defender.defense;
  if (attacker.defenseBreakFactor > 0) {
    effectiveDefense = effectiveDefense * (1 - attacker.defenseBreakFactor);
  }
  
  // Step 3: Calculate mitigation
  const mitigatedDamage = calculateMitigation(damage, effectiveDefense);
  damage = mitigatedDamage;
  
  // Step 4: Check block
  let blocked = false;
  let effectiveBlockChance = defender.blockChance - attacker.blockBreakFactor;
  effectiveBlockChance = Math.max(0, Math.min(0.75, effectiveBlockChance));
  
  if (Math.random() < effectiveBlockChance) {
    blocked = true;
    damage = damage * (1 - defender.blockFactor);
  }
  
  // Step 5: Check critical (only if not blocked)
  let critical = false;
  if (!blocked) {
    let effectiveCritChance = attacker.criticalChance - defender.critEvasion;
    effectiveCritChance = Math.max(0, Math.min(0.75, effectiveCritChance));
    
    if (Math.random() < effectiveCritChance) {
      critical = true;
      damage = damage * attacker.criticalFactor;
    }
  }
  
  const finalDamage = Math.max(1, Math.floor(damage));
  
  // Step 6: Calculate drain/lifesteal
  const healthDrained = Math.floor(finalDamage * attacker.drainHealthFactor);
  const manaDrained = Math.floor(finalDamage * attacker.drainManaFactor);
  
  // Step 7: Calculate reflect (not on blocked hits)
  const reflected = blocked ? 0 : Math.floor(finalDamage * defender.reflectFactor);
  
  // Step 8: Calculate absorb
  const healthAbsorbed = Math.floor(finalDamage * defender.absorbHealthFactor);
  const manaAbsorbed = Math.floor(finalDamage * defender.absorbManaFactor);
  
  return {
    rawDamage,
    mitigatedDamage: Math.floor(mitigatedDamage),
    finalDamage,
    blocked,
    critical,
    healthDrained,
    manaDrained,
    reflected,
    healthAbsorbed,
    manaAbsorbed
  };
}

/**
 * Check if debuff lands (accuracy vs resistance)
 */
export function checkDebuffSuccess(attackerAccuracy: number, defenderResistance: number): boolean {
  const successChance = Math.max(0.05, Math.min(0.95, attackerAccuracy - defenderResistance));
  return Math.random() < successChance;
}

// ============================================
// ATTRIBUTE POINT ALLOCATION
// ============================================

export const POINTS_PER_LEVEL = 7;    // 7 attribute points per level up
export const STARTING_POINTS = 20;    // 20 starting points at character creation
export const MAX_LEVEL = 20;          // Character hero level cap (Note: Professions have 100 levels)

/**
 * Calculate total attribute points available for a level
 */
export function getTotalAttributePoints(level: number): number {
  return STARTING_POINTS + (level * POINTS_PER_LEVEL);
}

/**
 * Calculate unspent attribute points
 */
export function getUnspentPoints(level: number, attributes: CharacterAttributes): number {
  const total = getTotalAttributePoints(level);
  const spent = Object.values(attributes).reduce((sum, val) => sum + val, 0);
  return total - spent;
}

/**
 * Validate attribute allocation
 */
export function validateAttributes(level: number, attributes: CharacterAttributes): boolean {
  const total = getTotalAttributePoints(level);
  const spent = Object.values(attributes).reduce((sum, val) => sum + val, 0);
  
  // Check not over budget
  if (spent > total) return false;
  
  // Check no negative values
  for (const val of Object.values(attributes)) {
    if (val < 0) return false;
  }
  
  return true;
}

// ============================================
// DEFAULT STARTING ATTRIBUTES
// ============================================

export function getDefaultAttributes(): CharacterAttributes {
  return {
    strength: 0,
    vitality: 0,
    endurance: 0,
    intellect: 0,
    wisdom: 0,
    dexterity: 0,
    agility: 0,
    tactics: 0
  };
}

/**
 * Get recommended starting attributes based on class (uses 20 starting points)
 * Tank builds: STR/VIT/END
 * Physical DPS: STR/DEX/AGI
 * Magic DPS: INT/WIS
 * Balanced Hybrid: STR/DEX/AGI/TAC
 */
export function getClassStartingAttributes(classId: string): CharacterAttributes {
  switch (classId.toLowerCase()) {
    case 'warrior':
      // Tank focus: 10 STR, 5 VIT, 5 END = 20 points
      return { strength: 10, vitality: 5, endurance: 5, intellect: 0, wisdom: 0, dexterity: 0, agility: 0, tactics: 0 };
    case 'mage':
      // Magic focus: 10 INT, 10 WIS = 20 points
      return { strength: 0, vitality: 0, endurance: 0, intellect: 10, wisdom: 10, dexterity: 0, agility: 0, tactics: 0 };
    case 'rogue':
      // Physical DPS focus: 6 STR, 7 DEX, 7 AGI = 20 points
      return { strength: 6, vitality: 0, endurance: 0, intellect: 0, wisdom: 0, dexterity: 7, agility: 7, tactics: 0 };
    case 'cleric':
      // Healer focus: 5 VIT, 5 INT, 10 WIS = 20 points
      return { strength: 0, vitality: 5, endurance: 0, intellect: 5, wisdom: 10, dexterity: 0, agility: 0, tactics: 0 };
    default:
      // Balanced hybrid: 5 STR, 5 VIT, 5 DEX, 5 TAC = 20 points
      return { strength: 5, vitality: 5, endurance: 0, intellect: 0, wisdom: 0, dexterity: 5, agility: 0, tactics: 5 };
  }
}

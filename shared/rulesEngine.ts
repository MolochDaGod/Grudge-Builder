/**
 * GRUDGE WARLORDS - Unified Rules Engine
 * 
 * Central hub for all combat, stat, and skill calculations.
 * ALL game modes (combat, dungeon, island) MUST use these functions.
 */

import {
  calculateStats,
  calculateCombatDamage,
  calculateMitigation,
  checkDebuffSuccess,
  type CharacterAttributes,
  type ComputedStats,
  type CombatResult,
  getDefaultAttributes,
  ATTRIBUTE_IDS,
  type AttributeId
} from './attributeSystem';

// ============================================
// ATTRIBUTE NORMALIZATION
// ============================================

/**
 * Normalize attribute keys to lowercase (canonical format)
 * Handles legacy uppercase keys like "Strength" -> "strength"
 */
export function normalizeAttributes(attrs: Record<string, number> | CharacterAttributes): CharacterAttributes {
  const normalized: CharacterAttributes = getDefaultAttributes();
  
  if (!attrs) return normalized;
  
  for (const [key, value] of Object.entries(attrs)) {
    const lowercaseKey = key.toLowerCase() as AttributeId;
    if (ATTRIBUTE_IDS.includes(lowercaseKey)) {
      normalized[lowercaseKey] = typeof value === 'number' ? value : 0;
    }
  }
  
  return normalized;
}

// ============================================
// CHARACTER STATS DERIVATION
// ============================================

export interface CharacterData {
  id: string;
  name: string;
  level: number;
  classId: string;
  raceId: string;
  attributes: Record<string, number>;
  equipment?: Record<string, string>;
}

export interface CombatUnit {
  id: string;
  name: string;
  level: number;
  classId: string;
  raceId: string;
  stats: ComputedStats;
  currentHp: number;
  currentMana: number;
  currentStamina: number;
  buffs: CombatBuff[];
  debuffs: CombatDebuff[];
}

export interface CombatBuff {
  id: string;
  name: string;
  duration: number;
  statModifiers: Partial<Record<keyof ComputedStats, number>>;
}

export interface CombatDebuff {
  id: string;
  name: string;
  duration: number;
  statModifiers: Partial<Record<keyof ComputedStats, number>>;
}

/**
 * Derive full combat stats from a character
 * This is the SINGLE SOURCE OF TRUTH for character stats
 */
export function deriveCharacterStats(
  character: CharacterData,
  equipmentBonuses?: Partial<Record<string, number>>
): ComputedStats {
  const normalizedAttrs = normalizeAttributes(character.attributes);
  return calculateStats(character.level, normalizedAttrs, equipmentBonuses as any);
}

/**
 * Create a combat-ready unit from a character
 */
export function createCombatUnit(character: CharacterData): CombatUnit {
  const stats = deriveCharacterStats(character);
  
  return {
    id: character.id,
    name: character.name,
    level: character.level,
    classId: character.classId,
    raceId: character.raceId,
    stats,
    currentHp: stats.maxHealth,
    currentMana: stats.maxMana,
    currentStamina: stats.maxStamina,
    buffs: [],
    debuffs: []
  };
}

/**
 * Apply buffs/debuffs to get effective stats
 */
export function getEffectiveStats(unit: CombatUnit): ComputedStats {
  const effective = { ...unit.stats };
  
  for (const buff of unit.buffs) {
    for (const [stat, modifier] of Object.entries(buff.statModifiers)) {
      if (stat in effective) {
        (effective as any)[stat] += modifier;
      }
    }
  }
  
  for (const debuff of unit.debuffs) {
    for (const [stat, modifier] of Object.entries(debuff.statModifiers)) {
      if (stat in effective) {
        (effective as any)[stat] -= modifier;
      }
    }
  }
  
  return effective;
}

// ============================================
// COMBAT RESOLUTION
// ============================================

export interface ActionContext {
  actionType: 'attack' | 'skill' | 'spell' | 'item';
  skillId?: string;
  spellId?: string;
  itemId?: string;
  targetIds: string[];
}

export interface ActionResult {
  success: boolean;
  damage: number;
  healing: number;
  effects: string[];
  combatResult?: CombatResult;
  blocked: boolean;
  critical: boolean;
  message: string;
}

/**
 * Resolve a combat action between attacker and defender
 * This is the UNIFIED damage calculation for ALL game modes
 */
export function resolveAttack(
  attacker: CombatUnit,
  defender: CombatUnit,
  useRandomVariance: boolean = true
): ActionResult {
  const attackerStats = getEffectiveStats(attacker);
  const defenderStats = getEffectiveStats(defender);
  
  const combatResult = calculateCombatDamage(attackerStats, defenderStats, useRandomVariance);
  
  let message = `${attacker.name} attacks ${defender.name} for ${combatResult.finalDamage} damage`;
  
  if (combatResult.blocked) {
    message += ` (BLOCKED!)`;
  }
  if (combatResult.critical) {
    message += ` (CRITICAL!)`;
  }
  if (combatResult.healthDrained > 0) {
    message += ` [+${combatResult.healthDrained} HP drained]`;
  }
  
  return {
    success: true,
    damage: combatResult.finalDamage,
    healing: combatResult.healthDrained,
    effects: [],
    combatResult,
    blocked: combatResult.blocked,
    critical: combatResult.critical,
    message
  };
}

/**
 * Apply damage to a unit
 */
export function applyDamage(unit: CombatUnit, damage: number): CombatUnit {
  return {
    ...unit,
    currentHp: Math.max(0, unit.currentHp - damage)
  };
}

/**
 * Apply healing to a unit
 */
export function applyHealing(unit: CombatUnit, healing: number): CombatUnit {
  return {
    ...unit,
    currentHp: Math.min(unit.stats.maxHealth, unit.currentHp + healing)
  };
}

/**
 * Check if unit is defeated
 */
export function isDefeated(unit: CombatUnit): boolean {
  return unit.currentHp <= 0;
}

// ============================================
// SKILL EXECUTION
// ============================================

export interface SkillData {
  id: string;
  name: string;
  manaCost: number;
  staminaCost: number;
  damageMultiplier: number;
  healingMultiplier: number;
  effects: string[];
}

/**
 * Execute a skill attack
 */
export function executeSkill(
  attacker: CombatUnit,
  defender: CombatUnit,
  skill: SkillData
): ActionResult {
  if (attacker.currentMana < skill.manaCost) {
    return {
      success: false,
      damage: 0,
      healing: 0,
      effects: [],
      blocked: false,
      critical: false,
      message: `${attacker.name} doesn't have enough mana for ${skill.name}!`
    };
  }
  
  if (attacker.currentStamina < skill.staminaCost) {
    return {
      success: false,
      damage: 0,
      healing: 0,
      effects: [],
      blocked: false,
      critical: false,
      message: `${attacker.name} doesn't have enough stamina for ${skill.name}!`
    };
  }
  
  const baseResult = resolveAttack(attacker, defender, true);
  const scaledDamage = Math.floor(baseResult.damage * skill.damageMultiplier);
  
  return {
    ...baseResult,
    damage: scaledDamage,
    message: `${attacker.name} uses ${skill.name} on ${defender.name} for ${scaledDamage} damage!`
  };
}

// ============================================
// WEAPON SKILL BONUSES
// ============================================

export interface WeaponSkillBonus {
  damagePercent: number;
  critChanceBonus: number;
  specialEffect?: string;
}

/**
 * Get weapon skill bonus based on weapon type mastery level
 */
export function getWeaponSkillBonus(weaponType: string, masteryLevel: number): WeaponSkillBonus {
  const baseDamagePercent = masteryLevel * 2;
  const critChanceBonus = masteryLevel * 0.005;
  
  let specialEffect: string | undefined;
  
  if (masteryLevel >= 10) {
    switch (weaponType.toLowerCase()) {
      case 'sword':
        specialEffect = 'Bleeding (5% chance)';
        break;
      case 'axe':
        specialEffect = 'Armor Break (3% chance)';
        break;
      case 'mace':
        specialEffect = 'Stun (2% chance)';
        break;
      case 'dagger':
        specialEffect = 'Poison (8% chance)';
        break;
      case 'staff':
        specialEffect = 'Mana Drain (5% chance)';
        break;
      case 'bow':
        specialEffect = 'Pierce (ignore 10% defense)';
        break;
    }
  }
  
  return {
    damagePercent: baseDamagePercent,
    critChanceBonus,
    specialEffect
  };
}

/**
 * Apply weapon skill bonuses to computed stats
 */
export function applyWeaponSkillBonus(
  stats: ComputedStats,
  bonus: WeaponSkillBonus
): ComputedStats {
  return {
    ...stats,
    damage: Math.floor(stats.damage * (1 + bonus.damagePercent / 100)),
    criticalChance: Math.min(0.75, stats.criticalChance + bonus.critChanceBonus)
  };
}

// ============================================
// CLASS ABILITY HELPERS
// ============================================

export interface ClassAbility {
  id: string;
  name: string;
  classId: string;
  tier: number;
  manaCost: number;
  cooldown: number;
  description: string;
  execute: (attacker: CombatUnit, targets: CombatUnit[]) => ActionResult[];
}

/**
 * Check if a class ability can be used
 */
export function canUseAbility(
  unit: CombatUnit,
  ability: ClassAbility,
  cooldowns: Record<string, number>
): { canUse: boolean; reason?: string } {
  if (unit.currentMana < ability.manaCost) {
    return { canUse: false, reason: 'Not enough mana' };
  }
  
  if (cooldowns[ability.id] && cooldowns[ability.id] > 0) {
    return { canUse: false, reason: `On cooldown (${cooldowns[ability.id]} turns)` };
  }
  
  if (unit.classId !== ability.classId) {
    return { canUse: false, reason: 'Wrong class for this ability' };
  }
  
  return { canUse: true };
}

// ============================================
// ENEMY CREATION (for dungeon/combat modes)
// ============================================

export interface EnemyTemplate {
  id: string;
  name: string;
  level: number;
  baseHealth: number;
  baseDamage: number;
  baseDefense: number;
  abilities: string[];
  loot: { itemId: string; chance: number }[];
}

/**
 * Create a combat unit from an enemy template
 */
export function createEnemyUnit(template: EnemyTemplate): CombatUnit {
  const baseStats: ComputedStats = {
    health: template.baseHealth,
    maxHealth: template.baseHealth,
    mana: 50,
    maxMana: 50,
    stamina: 100,
    maxStamina: 100,
    damage: template.baseDamage,
    defense: template.baseDefense,
    blockChance: 0.1,
    criticalChance: 0.05,
    accuracy: 0.5,
    resistance: 0.1,
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
  
  return {
    id: template.id,
    name: template.name,
    level: template.level,
    classId: 'monster',
    raceId: 'monster',
    stats: baseStats,
    currentHp: baseStats.maxHealth,
    currentMana: baseStats.maxMana,
    currentStamina: baseStats.maxStamina,
    buffs: [],
    debuffs: []
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  calculateStats,
  calculateCombatDamage,
  calculateMitigation,
  checkDebuffSuccess,
  type CharacterAttributes,
  type ComputedStats,
  type CombatResult
};

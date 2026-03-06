// Combat Damage Calculations with Elemental Resistances and Class Combos
// Formula: ((physical_damage + magic_damage + stats + boosts) - resistances%) / 2 = final_damage

import type { ElementType, WeaponAbility } from './definitions/weaponArsenal';

export type ClassType = 'warrior' | 'ranger' | 'worg' | 'mage';

export interface CombatStats {
  physicalDamage: number;
  magicalDamage: number;
  physicalDefense: number;
  magicalDefense: number;
  critChance: number;
  critDamage: number;
  blockChance: number;
  blockReduction: number;
  attackSpeed: number;
  accuracy: number;
  evasion: number;
}

export interface ElementalResistances {
  fire: number;
  ice: number;
  lightning: number;
  arcane: number;
  holy: number;
  nature: number;
  physical: number;
}

export interface Combatant {
  id: string;
  name: string;
  classType: ClassType;
  level: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  stats: CombatStats;
  resistances: ElementalResistances;
  buffs: CombatBuff[];
  debuffs: CombatDebuff[];
  comboState: ComboState;
}

export interface CombatBuff {
  id: string;
  name: string;
  duration: number;
  statBonus: { stat: keyof CombatStats; value: number }[];
}

export interface CombatDebuff {
  id: string;
  name: string;
  duration: number;
  statPenalty: { stat: keyof CombatStats; value: number }[];
}

export interface ComboState {
  comboCounter: number;
  lastAbilityUsed: string | null;
  canCombo: boolean;
  counterTarget: string | null; // For worg counter mechanic
}

export interface DamageResult {
  physicalDamage: number;
  magicalDamage: number;
  totalDamage: number;
  isCrit: boolean;
  isBlocked: boolean;
  elementApplied: ElementType | null;
  comboTriggered: boolean;
  effects: string[];
}

// Default resistances
export const DEFAULT_RESISTANCES: ElementalResistances = {
  fire: 0,
  ice: 0,
  lightning: 0,
  arcane: 0,
  holy: 0,
  nature: 0,
  physical: 0
};

// Cap resistances at 75%
const RESISTANCE_CAP = 75;

// Apply resistance cap
function capResistance(value: number): number {
  return Math.min(RESISTANCE_CAP, Math.max(-50, value)); // Can go negative for vulnerability
}

// Calculate effective stats with buffs/debuffs
function getEffectiveStats(combatant: Combatant): CombatStats {
  const stats = { ...combatant.stats };
  
  // Apply buffs
  for (const buff of combatant.buffs) {
    for (const bonus of buff.statBonus) {
      stats[bonus.stat] = (stats[bonus.stat] || 0) + bonus.value;
    }
  }
  
  // Apply debuffs
  for (const debuff of combatant.debuffs) {
    for (const penalty of debuff.statPenalty) {
      stats[penalty.stat] = (stats[penalty.stat] || 0) - penalty.value;
    }
  }
  
  return stats;
}

// Main damage calculation
export function calculateDamage(
  attacker: Combatant,
  defender: Combatant,
  ability: WeaponAbility,
  weaponDamage: { physical: number; magical: number }
): DamageResult {
  const attackerStats = getEffectiveStats(attacker);
  const defenderStats = getEffectiveStats(defender);
  
  // Step 1: Calculate base damage
  const baseDamage = (weaponDamage.physical + weaponDamage.magical) * ability.damageMultiplier;
  
  // Step 2: Add attribute scaling
  const attributeBonus = getAttributeBonus(attacker, ability);
  const totalBaseDamage = baseDamage + attributeBonus;
  
  // Step 3: Split into physical and magical components
  const physicalRatio = weaponDamage.physical / (weaponDamage.physical + weaponDamage.magical || 1);
  const magicalRatio = 1 - physicalRatio;
  
  let physicalDamage = totalBaseDamage * physicalRatio;
  let magicalDamage = totalBaseDamage * magicalRatio;
  
  // Step 4: Apply element-specific resistance for magical damage
  const element = ability.element || 'physical';
  const elementResist = capResistance(defender.resistances[element] || 0);
  
  // Apply resistances
  const physicalResist = capResistance(defender.resistances.physical);
  physicalDamage = physicalDamage * (1 - physicalResist / 100);
  magicalDamage = magicalDamage * (1 - elementResist / 100);
  
  // Step 5: Apply defense mitigation (sqrt formula)
  const physDefMitigation = Math.min(90, Math.sqrt(defenderStats.physicalDefense));
  const magDefMitigation = Math.min(90, Math.sqrt(defenderStats.magicalDefense));
  
  physicalDamage = physicalDamage * (100 - physDefMitigation) / 100;
  magicalDamage = magicalDamage * (100 - magDefMitigation) / 100;
  
  // Step 6: Apply variance (±25%)
  const variance = 0.75 + Math.random() * 0.5;
  physicalDamage *= variance;
  magicalDamage *= variance;
  
  // Step 7: Check block (physical only)
  let isBlocked = false;
  if (Math.random() * 100 < Math.min(75, defenderStats.blockChance)) {
    isBlocked = true;
    physicalDamage *= (1 - Math.min(0.9, defenderStats.blockReduction / 100));
  }
  
  // Step 8: Check critical (cannot crit if blocked)
  let isCrit = false;
  if (!isBlocked && Math.random() * 100 < Math.min(75, attackerStats.critChance)) {
    isCrit = true;
    const critMult = Math.min(3, attackerStats.critDamage / 100);
    physicalDamage *= critMult;
    magicalDamage *= critMult;
  }
  
  // Combine damage using formula: (phys + mag) / 2 after resists applied individually
  const totalDamage = Math.max(1, Math.floor((physicalDamage + magicalDamage) / 2));
  
  // Check for combo trigger
  const comboTriggered = checkComboTrigger(attacker, ability);
  
  return {
    physicalDamage: Math.floor(physicalDamage),
    magicalDamage: Math.floor(magicalDamage),
    totalDamage,
    isCrit,
    isBlocked,
    elementApplied: ability.element || null,
    comboTriggered,
    effects: ability.effects || []
  };
}

// Get attribute bonus based on ability scaling
function getAttributeBonus(attacker: Combatant, ability: WeaponAbility): number {
  const scalingStat = ability.scaling.stat;
  const ratio = ability.scaling.ratio;
  
  // Map ability scaling stat to actual stat values
  // This would connect to the character's attributes system
  const baseStatValue = 10; // Placeholder - would come from character attributes
  
  return baseStatValue * ratio;
}

// Check if combo is triggered based on class
function checkComboTrigger(attacker: Combatant, ability: WeaponAbility): boolean {
  if (!attacker.comboState.canCombo) return false;
  
  // Different classes have different combo mechanics
  switch (attacker.classType) {
    case 'warrior':
      // Warrior: Chain attacks together (basic attack followed by attack)
      return ability.type !== 'basic' && attacker.comboState.lastAbilityUsed === 'basic';
    case 'ranger':
      // Ranger: Combo grants 50% reduced time to next turn
      return attacker.comboState.comboCounter >= 2;
    case 'worg':
      // Worg: Counter attack when damaged
      return attacker.comboState.counterTarget !== null;
    case 'mage':
      // Mage: Recast same spell at 1/2 damage, no mana
      return ability.type.startsWith('spell') && 
             attacker.comboState.lastAbilityUsed === ability.id;
    default:
      return false;
  }
}

// Class-specific combo effects
export interface ComboResult {
  damageMultiplier: number;
  turnSpeedModifier: number;
  manaCostMultiplier: number;
  staminaCostMultiplier: number;
  additionalEffects: string[];
}

export function getClassComboEffect(attacker: Combatant, ability: WeaponAbility): ComboResult {
  const baseResult: ComboResult = {
    damageMultiplier: 1,
    turnSpeedModifier: 1,
    manaCostMultiplier: 1,
    staminaCostMultiplier: 1,
    additionalEffects: []
  };
  
  if (!checkComboTrigger(attacker, ability)) {
    return baseResult;
  }
  
  switch (attacker.classType) {
    case 'warrior':
      // Chain attack bonus
      return {
        ...baseResult,
        damageMultiplier: 1.25,
        additionalEffects: ['combo_chain']
      };
      
    case 'ranger':
      // 50% reduced time to next turn
      return {
        ...baseResult,
        turnSpeedModifier: 0.5,
        additionalEffects: ['swift_action']
      };
      
    case 'worg':
      // Counter attack
      return {
        ...baseResult,
        damageMultiplier: 1.5,
        additionalEffects: ['counter_strike']
      };
      
    case 'mage':
      // Recast at half damage, no mana
      return {
        ...baseResult,
        damageMultiplier: 0.5,
        manaCostMultiplier: 0,
        additionalEffects: ['echo_cast']
      };
      
    default:
      return baseResult;
  }
}

// Apply elemental damage from melee/ranged abilities
export function applyElementalDamage(
  baseDamage: number,
  element: ElementType,
  targetResistances: ElementalResistances
): number {
  if (element === 'physical') {
    return baseDamage * (1 - capResistance(targetResistances.physical) / 100);
  }
  
  const resistance = capResistance(targetResistances[element] || 0);
  return baseDamage * (1 - resistance / 100);
}

// Calculate healing
export function calculateHealing(
  healer: Combatant,
  target: Combatant,
  baseHeal: number,
  scalingStat: 'INT' | 'WIS' = 'WIS'
): number {
  // Healing scales with WIS or INT
  const statBonus = 10; // Placeholder - would come from attributes
  const healing = baseHeal + (statBonus * 0.5);
  
  // Apply variance
  const variance = 0.9 + Math.random() * 0.2;
  
  return Math.floor(healing * variance);
}

// Turn order calculation based on speed
export function calculateTurnOrder(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) => {
    const aSpeed = getEffectiveStats(a).attackSpeed;
    const bSpeed = getEffectiveStats(b).attackSpeed;
    
    // Higher speed goes first
    if (bSpeed !== aSpeed) {
      return bSpeed - aSpeed;
    }
    
    // Tie-breaker: higher level
    return b.level - a.level;
  });
}

// Weapon Arsenal System - T1 to T8 Progression with Abilities
// Colored bars represent normalized 0-100 values for UI display

export type ElementType = 'fire' | 'ice' | 'lightning' | 'arcane' | 'holy' | 'nature' | 'physical';
export type WeaponType = 'sword' | 'axe' | 'mace' | 'dagger' | 'bow' | 'staff' | 'wand' | 'polearm';
export type WeaponHand = '1h' | '2h' | 'offhand';

export interface WeaponAbility {
  id: string;
  name: string;
  description: string;
  type: 'basic' | 'signature' | 'attack1' | 'attack2' | 'attack3' | 'spell1' | 'spell2' | 'spell3';
  element?: ElementType;
  damageMultiplier: number;
  manaCost: number;
  staminaCost: number;
  cooldown: number; // in turns
  effects?: string[];
  scaling: {
    stat: 'STR' | 'DEX' | 'INT' | 'WIS' | 'AGI';
    ratio: number;
  };
}

export interface WeaponPassive {
  id: string;
  name: string;
  description: string;
  unlockTier: number; // T1-T8
  bonuses: {
    stat: string;
    flatBonus?: number;
    percentBonus?: number;
  }[];
}

export interface WeaponArsenal {
  id: string;
  name: string;
  description: string;
  lore: string;
  weaponType: WeaponType;
  hand: WeaponHand;
  craftedBy: string; // profession
  
  // Colored bars (0-100 normalized for UI)
  bars: {
    damage: number;
    speed: number;
    combo: number;
    crit: number;
    block: number;
    defense: number;
  };
  
  // Base stats at T1, scales with tier multiplier
  baseStats: {
    physicalDamage: number;
    magicalDamage: number;
    attackSpeed: number;
    critChance: number;
    critDamage: number;
    blockChance: number;
    defense: number;
  };
  
  // Element affinity for magic damage
  element?: ElementType;
  
  // Abilities granted by weapon
  basicAttack: WeaponAbility;
  signature: WeaponAbility;
  attacks: WeaponAbility[]; // attack1, attack2, attack3
  spells: WeaponAbility[]; // spell1, spell2, spell3
  
  // Passives unlock at different tiers
  passives: WeaponPassive[];
  
  // Tier-specific multipliers (T1=1.0 base)
  tierProgression: TierProgression;
}

export interface TierProgression {
  t0?: TierStats; // Starter tier - basic attack only, no ultimate, limited skills
  t1: TierStats;
  t2: TierStats;
  t3: TierStats;
  t4: TierStats;
  t5: TierStats;
  t6: TierStats;
  t7: TierStats;
  t8: TierStats;
}

export interface TierStats {
  statMultiplier: number;
  abilityMultiplier: number;
  passivesUnlocked: string[];
  requiredLevel: number;
  craftingCost: {
    gold: number;
    essences: { id: string; quantity: number }[];
    materials: { id: string; quantity: number }[];
  };
}

// Tier stat bonus progression
// T1: Base damage only + minor combo bonus (HP/Mana/Defense)
// T2-T4: Gain one additional stat/attribute per tier
// T5+: Unlock passives and enhanced attribute/stat bonuses
export interface TierStatBonuses {
  damage: number;        // Base damage multiplier
  hp?: number;           // Flat HP bonus
  mana?: number;         // Flat Mana bonus
  defense?: number;      // Flat Defense bonus
  critChance?: number;   // Crit chance bonus %
  attackSpeed?: number;  // Attack speed bonus %
  attribute?: string;    // Attribute bonus (e.g., "STR", "DEX")
  attributeBonus?: number; // Amount of attribute bonus
}

export const TIER_STAT_BONUSES: Record<string, TierStatBonuses> = {
  t0: { damage: 0.7, hp: 0, mana: 0, defense: 0 },                    // Starter tier - basic damage only, no bonuses
  t1: { damage: 1.0, hp: 5, mana: 3, defense: 2 },                    // Base damage + small combo
  t2: { damage: 1.1, hp: 10, mana: 5, defense: 4, critChance: 2 },    // +Crit Chance
  t3: { damage: 1.2, hp: 15, mana: 8, defense: 6, critChance: 3, attackSpeed: 3 }, // +Attack Speed
  t4: { damage: 1.35, hp: 20, mana: 12, defense: 8, critChance: 4, attackSpeed: 5, attribute: 'primary', attributeBonus: 1 }, // +1 Primary Attribute
  t5: { damage: 1.5, hp: 30, mana: 18, defense: 12, critChance: 6, attackSpeed: 7, attribute: 'primary', attributeBonus: 2 }, // Passives unlock + +2 Primary
  t6: { damage: 1.7, hp: 45, mana: 25, defense: 18, critChance: 8, attackSpeed: 10, attribute: 'primary', attributeBonus: 3 }, // +3 Primary
  t7: { damage: 1.9, hp: 65, mana: 35, defense: 25, critChance: 10, attackSpeed: 12, attribute: 'dual', attributeBonus: 4 }, // +4 Dual Attributes
  t8: { damage: 2.2, hp: 100, mana: 50, defense: 35, critChance: 12, attackSpeed: 15, attribute: 'dual', attributeBonus: 5 }, // +5 Dual Attributes
};

// T0 starter tier - basic attack only, no ultimate, no 3rd ability slot
export const T0_TIER_STATS: TierStats = {
  statMultiplier: 0.7,
  abilityMultiplier: 0.8,
  passivesUnlocked: [],
  requiredLevel: 0,
  craftingCost: { gold: 10, essences: [], materials: [] }
};

// Standard tier progression curve
// Passives: None until T5, then unlock progressively
export const STANDARD_TIER_PROGRESSION: TierProgression = {
  t0: T0_TIER_STATS,
  t1: {
    statMultiplier: 1.0,
    abilityMultiplier: 1.0,
    passivesUnlocked: [],
    requiredLevel: 1,
    craftingCost: { gold: 100, essences: [], materials: [] }
  },
  t2: {
    statMultiplier: 1.1,
    abilityMultiplier: 1.0,
    passivesUnlocked: [],
    requiredLevel: 5,
    craftingCost: { gold: 500, essences: [{ id: 'essence_common', quantity: 5 }], materials: [] }
  },
  t3: {
    statMultiplier: 1.2,
    abilityMultiplier: 1.05,
    passivesUnlocked: [],
    requiredLevel: 10,
    craftingCost: { gold: 1500, essences: [{ id: 'essence_uncommon', quantity: 3 }], materials: [] }
  },
  t4: {
    statMultiplier: 1.35,
    abilityMultiplier: 1.1,
    passivesUnlocked: [],
    requiredLevel: 15,
    craftingCost: { gold: 4000, essences: [{ id: 'essence_rare', quantity: 2 }], materials: [] }
  },
  t5: {
    statMultiplier: 1.5,
    abilityMultiplier: 1.2,
    passivesUnlocked: ['passive_1'],
    requiredLevel: 25,
    craftingCost: { gold: 10000, essences: [{ id: 'essence_rare', quantity: 5 }], materials: [] }
  },
  t6: {
    statMultiplier: 1.7,
    abilityMultiplier: 1.35,
    passivesUnlocked: ['passive_1', 'passive_2'],
    requiredLevel: 35,
    craftingCost: { gold: 25000, essences: [{ id: 'essence_epic', quantity: 3 }], materials: [] }
  },
  t7: {
    statMultiplier: 1.9,
    abilityMultiplier: 1.5,
    passivesUnlocked: ['passive_1', 'passive_2'],
    requiredLevel: 45,
    craftingCost: { gold: 60000, essences: [{ id: 'essence_epic', quantity: 5 }], materials: [] }
  },
  t8: {
    statMultiplier: 2.2,
    abilityMultiplier: 1.7,
    passivesUnlocked: ['passive_1', 'passive_2', 'passive_3'],
    requiredLevel: 55,
    craftingCost: { gold: 150000, essences: [{ id: 'essence_legendary', quantity: 3 }], materials: [] }
  }
};

// Example weapon: Bloodfeud Blade
export const BLOODFEUD_BLADE: WeaponArsenal = {
  id: 'bloodfeud_blade',
  name: 'Bloodfeud Blade',
  description: 'Forged in endless clan blood feuds',
  lore: 'A sword tempered by the flames of vengeance, passed down through generations of warriors who swore oaths in blood.',
  weaponType: 'sword',
  hand: '1h',
  craftedBy: 'Miner',
  
  bars: {
    damage: 75,
    speed: 60,
    combo: 85,
    crit: 50,
    block: 40,
    defense: 30
  },
  
  baseStats: {
    physicalDamage: 45,
    magicalDamage: 0,
    attackSpeed: 1.2,
    critChance: 12,
    critDamage: 150,
    blockChance: 8,
    defense: 5
  },
  
  basicAttack: {
    id: 'vengeful_slash',
    name: 'Vengeful Slash',
    description: 'Single-target slash, builds 1 Grudge Mark stack (max 3)',
    type: 'basic',
    damageMultiplier: 1.0,
    manaCost: 0,
    staminaCost: 10,
    cooldown: 0,
    effects: ['grudge_mark_stack'],
    scaling: { stat: 'STR', ratio: 1.0 }
  },
  
  signature: {
    id: 'crimson_reprisal',
    name: 'Crimson Reprisal',
    description: 'Large AoE slash, heals per enemy hit',
    type: 'signature',
    damageMultiplier: 1.8,
    manaCost: 25,
    staminaCost: 30,
    cooldown: 3,
    effects: ['aoe_damage', 'lifesteal_per_hit'],
    scaling: { stat: 'STR', ratio: 1.2 }
  },
  
  attacks: [
    {
      id: 'blood_rend',
      name: 'Blood Rend',
      description: 'Vicious slash that causes bleeding',
      type: 'attack1',
      damageMultiplier: 1.2,
      manaCost: 0,
      staminaCost: 15,
      cooldown: 1,
      effects: ['bleed_3_turns'],
      scaling: { stat: 'STR', ratio: 0.8 }
    },
    {
      id: 'feud_strike',
      name: 'Feud Strike',
      description: 'Consume Grudge Marks for bonus damage',
      type: 'attack2',
      damageMultiplier: 1.5,
      manaCost: 0,
      staminaCost: 20,
      cooldown: 2,
      effects: ['consume_grudge_marks'],
      scaling: { stat: 'STR', ratio: 1.0 }
    },
    {
      id: 'vendetta',
      name: 'Vendetta',
      description: 'Deal increased damage to enemies who damaged you',
      type: 'attack3',
      damageMultiplier: 2.0,
      manaCost: 10,
      staminaCost: 25,
      cooldown: 3,
      effects: ['bonus_vs_attacker'],
      scaling: { stat: 'STR', ratio: 1.1 }
    }
  ],
  
  spells: [],
  
  passives: [
    {
      id: 'bloodlust',
      name: 'Bloodlust',
      description: 'Gain 5% attack speed after killing an enemy',
      unlockTier: 5,
      bonuses: [{ stat: 'attackSpeed', percentBonus: 5 }]
    },
    {
      id: 'swift_vengeance',
      name: 'Swift Vengeance',
      description: 'Critical hits reduce cooldowns by 1 turn',
      unlockTier: 6,
      bonuses: [{ stat: 'cooldownReduction', flatBonus: 1 }]
    },
    {
      id: 'deep_cuts',
      name: 'Deep Cuts',
      description: 'Bleeding effects deal 25% more damage',
      unlockTier: 8,
      bonuses: [{ stat: 'bleedDamage', percentBonus: 25 }]
    }
  ],
  
  tierProgression: STANDARD_TIER_PROGRESSION
};

// Weapon arsenal collection
export const WEAPON_ARSENAL: Record<string, WeaponArsenal> = {
  bloodfeud_blade: BLOODFEUD_BLADE,
};

// Extended weapon stats including tier bonuses
export interface WeaponStatsAtTier {
  physicalDamage: number;
  magicalDamage: number;
  attackSpeed: number;
  critChance: number;
  critDamage: number;
  blockChance: number;
  defense: number;
  bonusHp: number;
  bonusMana: number;
  bonusDefense: number;
  bonusCritChance: number;
  bonusAttackSpeed: number;
  attributeBonus?: { type: string; amount: number };
  passivesUnlocked: boolean;
}

// Helper to get weapon stats at specific tier (includes tier bonuses)
export function getWeaponStatsAtTier(weapon: WeaponArsenal, tier: number): WeaponStatsAtTier {
  const clampedTier = Math.min(8, Math.max(0, tier));
  const tierKey = `t${clampedTier}` as keyof TierProgression;
  const tierData = weapon.tierProgression[tierKey] ?? weapon.tierProgression.t1;
  const tierBonuses = TIER_STAT_BONUSES[tierKey] ?? TIER_STAT_BONUSES.t1;
  const mult = tierData.statMultiplier;
  
  return {
    physicalDamage: Math.floor(weapon.baseStats.physicalDamage * tierBonuses.damage),
    magicalDamage: Math.floor(weapon.baseStats.magicalDamage * tierBonuses.damage),
    attackSpeed: +(weapon.baseStats.attackSpeed * (1 + (tierBonuses.attackSpeed || 0) / 100)).toFixed(2),
    critChance: Math.min(75, weapon.baseStats.critChance + (tierBonuses.critChance || 0)),
    critDamage: Math.floor(weapon.baseStats.critDamage * mult),
    blockChance: Math.min(75, Math.floor(weapon.baseStats.blockChance * mult)),
    defense: weapon.baseStats.defense + (tierBonuses.defense || 0),
    bonusHp: tierBonuses.hp || 0,
    bonusMana: tierBonuses.mana || 0,
    bonusDefense: tierBonuses.defense || 0,
    bonusCritChance: tierBonuses.critChance || 0,
    bonusAttackSpeed: tierBonuses.attackSpeed || 0,
    attributeBonus: tierBonuses.attribute && tierBonuses.attributeBonus 
      ? { type: tierBonuses.attribute, amount: tierBonuses.attributeBonus }
      : undefined,
    passivesUnlocked: clampedTier >= 5
  };
}

// Helper to get unlocked passives at tier
export function getUnlockedPassives(weapon: WeaponArsenal, tier: number): WeaponPassive[] {
  return weapon.passives.filter(p => p.unlockTier <= tier);
}

// Helper to get ability damage at tier
export function getAbilityDamageAtTier(ability: WeaponAbility, weapon: WeaponArsenal, tier: number): number {
  const clampedTier = Math.min(8, Math.max(0, tier));
  const tierKey = `t${clampedTier}` as keyof TierProgression;
  const tierData = weapon.tierProgression[tierKey] ?? weapon.tierProgression.t1;
  const stats = getWeaponStatsAtTier(weapon, tier);
  
  const baseDamage = stats.physicalDamage + stats.magicalDamage;
  return Math.floor(baseDamage * ability.damageMultiplier * tierData.abilityMultiplier);
}

// Helper to get tier stat bonuses
export function getTierStatBonuses(tier: number): TierStatBonuses {
  const tierKey = `t${Math.min(8, Math.max(1, tier))}` as keyof typeof TIER_STAT_BONUSES;
  return TIER_STAT_BONUSES[tierKey];
}

// Helper to check if passives are unlocked at tier (T5+)
export function hasPassivesUnlocked(tier: number): boolean {
  return tier >= 5;
}

// Helper to describe what unlocks at each tier
export function getTierUnlockDescription(tier: number): string[] {
  switch (tier) {
    case 0: return ['Basic attack only', 'No ultimate ability', 'No 3rd ability slot', '70% damage'];
    case 1: return ['Base damage', '+5 HP', '+3 Mana', '+2 Defense', 'All abilities unlocked'];
    case 2: return ['All T1 bonuses', '+Crit Chance'];
    case 3: return ['All T2 bonuses', '+Attack Speed'];
    case 4: return ['All T3 bonuses', '+1 Primary Attribute'];
    case 5: return ['All T4 bonuses', '+2 Primary Attribute', 'First Passive Unlocked'];
    case 6: return ['All T5 bonuses', '+3 Primary Attribute', 'Second Passive Unlocked'];
    case 7: return ['All T6 bonuses', '+4 Dual Attributes'];
    case 8: return ['All T7 bonuses', '+5 Dual Attributes', 'Third Passive Unlocked'];
    default: return [];
  }
}

// T0 ability restrictions
export interface T0AbilityRestrictions {
  hasBasicAttack: boolean;
  hasSignature: boolean; // Ultimate - NO for T0
  maxAttackSlots: number; // 1 for T0 (attack1 only), 3 for T1+
  maxSpellSlots: number; // 1 for T0 (spell1 only), 3 for T1+
}

export function getAbilityRestrictionsForTier(tier: number): T0AbilityRestrictions {
  if (tier === 0) {
    return {
      hasBasicAttack: true,
      hasSignature: false,
      maxAttackSlots: 1,
      maxSpellSlots: 1
    };
  }
  return {
    hasBasicAttack: true,
    hasSignature: true,
    maxAttackSlots: 3,
    maxSpellSlots: 3
  };
}

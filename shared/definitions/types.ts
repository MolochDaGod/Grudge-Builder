export type DamageType = 
  | "physical" 
  | "fire" 
  | "ice" 
  | "electric" 
  | "poison" 
  | "holy" 
  | "shadow" 
  | "nature" 
  | "arcane" 
  | "bleed";

export type TargetType = "self" | "single_enemy" | "all_enemies" | "single_ally" | "all_allies" | "aoe";

export type AbilityCategory = "attack" | "spell" | "skill" | "passive" | "ultimate";

export type WeaponType = "sword" | "axe" | "mace" | "dagger" | "bow" | "staff" | "wand" | "spear" | "fist";

export type AnimationType = 
  | "slash" 
  | "thrust" 
  | "overhead" 
  | "projectile" 
  | "beam" 
  | "explosion" 
  | "aura" 
  | "buff" 
  | "debuff" 
  | "heal" 
  | "summon"
  | "transform";

export type EffectVisual = 
  | "slash" 
  | "fire" 
  | "ice" 
  | "electric" 
  | "poison" 
  | "holy" 
  | "shadow" 
  | "nature" 
  | "arcane"
  | "blood"
  | "crit"
  | "stun"
  | "heal"
  | "defense"
  | "buff_attack"
  | "buff_defense"
  | "debuff";

export interface StatusEffect {
  id: string;
  name: string;
  duration: number;
  stackable: boolean;
  type: "buff" | "debuff";
  statModifiers?: Record<string, number>;
  dotDamage?: number;
  dotType?: DamageType;
}

export interface AbilityDefinition {
  id: string;
  name: string;
  referenceName: string; // No spaces - used for scripting and internal references (e.g., "BearForm" instead of "Bear Form")
  description: string;
  icon: string;
  category: AbilityCategory;
  damageType: DamageType;
  targetType: TargetType;
  baseDamage: number;
  damageScaling: {
    stat: string;
    ratio: number;
  };
  manaCost: number;
  staminaCost: number;
  cooldown: number;
  castTime: number;
  animation: AnimationType;
  visualEffect: EffectVisual;
  soundEffect?: string;
  statusEffects?: StatusEffect[];
  classRestriction?: string[];
  weaponRestriction?: WeaponType[];
  levelRequirement: number;
  critBonus?: number;
}

export interface SpellDefinition extends AbilityDefinition {
  category: "spell";
  school: "fire" | "ice" | "lightning" | "holy" | "shadow" | "nature" | "arcane";
  aoeRadius?: number;
  projectileCount?: number;
  chainTargets?: number;
}

export interface SkillDefinition extends AbilityDefinition {
  category: "skill" | "attack";
  weaponType: WeaponType;
  comboPosition?: number;
  bonusVsType?: string;
}

export interface PassiveDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "passive";
  effects: {
    stat: string;
    value: number;
    isPercent: boolean;
  }[];
  classRestriction?: string[];
  levelRequirement: number;
}

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: "weapon" | "armor" | "accessory" | "consumable" | "material" | "quest";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
  weaponType?: WeaponType;
  armorSlot?: "head" | "chest" | "hands" | "legs" | "feet" | "back";
  stats?: Record<string, number>;
  abilities?: string[];
  levelRequirement: number;
  sellValue: number;
  stackable: boolean;
  maxStack?: number;
  // Crafting usage - tracks which higher tier items use this as an ingredient
  usedInT2Crafting?: string[];
  usedInT3Crafting?: string[];
  usedInT4Crafting?: string[];
  usedInT5Crafting?: string[];
  usedInT6Crafting?: string[];
  usedInT7Crafting?: string[];
  usedInT8Crafting?: string[];
}

export interface MonsterDefinition {
  id: string;
  name: string;
  description: string;
  spriteSet: string;
  level: number;
  baseHp: number;
  baseDamage: number;
  baseDefense: number;
  damageType: DamageType;
  abilities: string[];
  weaknesses: DamageType[];
  resistances: DamageType[];
  lootTable: { itemId: string; chance: number }[];
  xpReward: number;
  goldReward: { min: number; max: number };
  isBoss?: boolean;
}

export interface TileDefinition {
  id: string;
  name: string;
  spriteIndex: number;
  walkable: boolean;
  transparent: boolean;
  interactable?: boolean;
  interactionType?: "door" | "chest" | "trap" | "portal" | "npc";
}

export interface DungeonFloorDefinition {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  width: number;
  height: number;
  roomCount: { min: number; max: number };
  monsterDensity: number;
  lootDensity: number;
  tileSet: string;
  ambiance: string;
  bossId?: string;
}

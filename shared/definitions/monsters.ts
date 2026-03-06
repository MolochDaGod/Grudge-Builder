import type { MonsterDefinition, DamageType } from "./types";

export const MONSTERS: Record<string, MonsterDefinition> = {
  "monster_skeleton": {
    id: "monster_skeleton",
    name: "Skeleton Warrior",
    description: "A reanimated skeleton wielding a rusty sword.",
    spriteSet: "Skeleton",
    level: 1,
    baseHp: 40,
    baseDamage: 8,
    baseDefense: 2,
    damageType: "physical",
    abilities: ["skill_slash"],
    weaknesses: ["holy", "bleed"],
    resistances: ["poison", "ice"],
    lootTable: [
      { itemId: "item_bone", chance: 0.6 },
      { itemId: "item_rusty_sword", chance: 0.1 },
      { itemId: "item_gold_small", chance: 0.8 }
    ],
    xpReward: 25,
    goldReward: { min: 5, max: 15 }
  },
  
  "monster_skeleton_archer": {
    id: "monster_skeleton_archer",
    name: "Skeleton Archer",
    description: "A skeletal archer with unerring aim.",
    spriteSet: "Skeleton",
    level: 2,
    baseHp: 30,
    baseDamage: 12,
    baseDefense: 1,
    damageType: "physical",
    abilities: ["skill_aimed_shot"],
    weaknesses: ["holy", "bleed"],
    resistances: ["poison"],
    lootTable: [
      { itemId: "item_bone", chance: 0.5 },
      { itemId: "item_arrow_bundle", chance: 0.3 },
      { itemId: "item_gold_small", chance: 0.8 }
    ],
    xpReward: 30,
    goldReward: { min: 8, max: 18 }
  },
  
  "monster_zombie": {
    id: "monster_zombie",
    name: "Shambling Zombie",
    description: "A rotting corpse that hungers for flesh.",
    spriteSet: "Zombie",
    level: 2,
    baseHp: 60,
    baseDamage: 10,
    baseDefense: 3,
    damageType: "physical",
    abilities: ["skill_feral_strike"],
    weaknesses: ["fire", "holy"],
    resistances: ["poison", "shadow"],
    lootTable: [
      { itemId: "item_rotten_flesh", chance: 0.7 },
      { itemId: "item_gold_small", chance: 0.6 }
    ],
    xpReward: 35,
    goldReward: { min: 3, max: 12 }
  },
  
  "monster_goblin": {
    id: "monster_goblin",
    name: "Goblin Scout",
    description: "A sneaky goblin with a sharp dagger.",
    spriteSet: "Goblin",
    level: 1,
    baseHp: 25,
    baseDamage: 6,
    baseDefense: 1,
    damageType: "physical",
    abilities: ["skill_backstab"],
    weaknesses: ["fire"],
    resistances: [],
    lootTable: [
      { itemId: "item_goblin_ear", chance: 0.5 },
      { itemId: "item_dagger", chance: 0.08 },
      { itemId: "item_gold_small", chance: 0.9 }
    ],
    xpReward: 20,
    goldReward: { min: 8, max: 25 }
  },
  
  "monster_goblin_shaman": {
    id: "monster_goblin_shaman",
    name: "Goblin Shaman",
    description: "A goblin wielding dark magic.",
    spriteSet: "Goblin",
    level: 4,
    baseHp: 35,
    baseDamage: 15,
    baseDefense: 2,
    damageType: "fire",
    abilities: ["spell_fireball", "spell_poison_cloud"],
    weaknesses: ["ice"],
    resistances: ["fire"],
    lootTable: [
      { itemId: "item_goblin_ear", chance: 0.5 },
      { itemId: "item_magic_scroll", chance: 0.15 },
      { itemId: "item_gold_medium", chance: 0.7 }
    ],
    xpReward: 50,
    goldReward: { min: 15, max: 40 }
  },
  
  "monster_orc_warrior": {
    id: "monster_orc_warrior",
    name: "Orc Warrior",
    description: "A fierce orc warrior with a brutal axe.",
    spriteSet: "Orc",
    level: 3,
    baseHp: 80,
    baseDamage: 14,
    baseDefense: 5,
    damageType: "physical",
    abilities: ["skill_cleave", "skill_raging_blow"],
    weaknesses: ["holy"],
    resistances: ["physical"],
    lootTable: [
      { itemId: "item_orc_tusk", chance: 0.4 },
      { itemId: "item_battle_axe", chance: 0.05 },
      { itemId: "item_gold_medium", chance: 0.8 }
    ],
    xpReward: 60,
    goldReward: { min: 20, max: 45 }
  },
  
  "monster_imp": {
    id: "monster_imp",
    name: "Fire Imp",
    description: "A small demon wreathed in flames.",
    spriteSet: "Demon",
    level: 3,
    baseHp: 30,
    baseDamage: 12,
    baseDefense: 2,
    damageType: "fire",
    abilities: ["spell_fireball"],
    weaknesses: ["ice", "holy"],
    resistances: ["fire"],
    lootTable: [
      { itemId: "item_demon_heart", chance: 0.3 },
      { itemId: "item_fire_essence", chance: 0.2 },
      { itemId: "item_gold_small", chance: 0.7 }
    ],
    xpReward: 45,
    goldReward: { min: 10, max: 30 }
  },
  
  "monster_shadow_stalker": {
    id: "monster_shadow_stalker",
    name: "Shadow Stalker",
    description: "A creature born from pure darkness.",
    spriteSet: "Shadow",
    level: 5,
    baseHp: 50,
    baseDamage: 18,
    baseDefense: 3,
    damageType: "shadow",
    abilities: ["spell_shadow_bolt", "skill_shadow_dance"],
    weaknesses: ["holy", "fire"],
    resistances: ["shadow", "poison"],
    lootTable: [
      { itemId: "item_shadow_essence", chance: 0.25 },
      { itemId: "item_dark_cloak", chance: 0.05 },
      { itemId: "item_gold_medium", chance: 0.7 }
    ],
    xpReward: 75,
    goldReward: { min: 25, max: 50 }
  },
  
  "monster_giant_spider": {
    id: "monster_giant_spider",
    name: "Giant Spider",
    description: "A massive arachnid with venomous fangs.",
    spriteSet: "Spider",
    level: 3,
    baseHp: 45,
    baseDamage: 10,
    baseDefense: 2,
    damageType: "poison",
    abilities: ["skill_envenom", "skill_feral_strike"],
    weaknesses: ["fire"],
    resistances: ["poison"],
    lootTable: [
      { itemId: "item_spider_silk", chance: 0.5 },
      { itemId: "item_venom_gland", chance: 0.3 },
      { itemId: "item_gold_small", chance: 0.6 }
    ],
    xpReward: 40,
    goldReward: { min: 8, max: 22 }
  },
  
  "monster_frost_elemental": {
    id: "monster_frost_elemental",
    name: "Frost Elemental",
    description: "A being of living ice and cold.",
    spriteSet: "Elemental",
    level: 6,
    baseHp: 70,
    baseDamage: 16,
    baseDefense: 6,
    damageType: "ice",
    abilities: ["spell_frostbolt", "spell_blizzard"],
    weaknesses: ["fire"],
    resistances: ["ice", "physical"],
    lootTable: [
      { itemId: "item_ice_crystal", chance: 0.4 },
      { itemId: "item_frost_core", chance: 0.15 },
      { itemId: "item_gold_medium", chance: 0.7 }
    ],
    xpReward: 85,
    goldReward: { min: 30, max: 60 }
  },
  
  "monster_boss_lich": {
    id: "monster_boss_lich",
    name: "The Lich King",
    description: "An ancient undead sorcerer of terrible power.",
    spriteSet: "Lich",
    level: 10,
    baseHp: 300,
    baseDamage: 35,
    baseDefense: 12,
    damageType: "shadow",
    abilities: ["spell_shadow_bolt", "spell_drain_life", "spell_chain_lightning", "spell_poison_cloud"],
    weaknesses: ["holy", "fire"],
    resistances: ["shadow", "poison", "ice"],
    lootTable: [
      { itemId: "item_lich_crown", chance: 0.1 },
      { itemId: "item_dark_grimoire", chance: 0.2 },
      { itemId: "item_legendary_staff", chance: 0.05 },
      { itemId: "item_gold_large", chance: 1.0 }
    ],
    xpReward: 500,
    goldReward: { min: 200, max: 400 },
    isBoss: true
  },
  
  "monster_boss_dragon": {
    id: "monster_boss_dragon",
    name: "Ancient Fire Dragon",
    description: "A colossal dragon that breathes devastating flames.",
    spriteSet: "Dragon",
    level: 15,
    baseHp: 500,
    baseDamage: 50,
    baseDefense: 20,
    damageType: "fire",
    abilities: ["spell_fireball", "spell_inferno"],
    weaknesses: ["ice"],
    resistances: ["fire", "physical"],
    lootTable: [
      { itemId: "item_dragon_scale", chance: 0.5 },
      { itemId: "item_dragon_fang", chance: 0.3 },
      { itemId: "item_legendary_sword", chance: 0.08 },
      { itemId: "item_gold_large", chance: 1.0 }
    ],
    xpReward: 1000,
    goldReward: { min: 500, max: 1000 },
    isBoss: true
  },
  
  "monster_boss_demon_lord": {
    id: "monster_boss_demon_lord",
    name: "Demon Lord Azrael",
    description: "A powerful demon lord from the abyss.",
    spriteSet: "Demon",
    level: 20,
    baseHp: 800,
    baseDamage: 65,
    baseDefense: 25,
    damageType: "shadow",
    abilities: ["spell_shadow_bolt", "spell_inferno", "spell_drain_life", "skill_skull_splitter"],
    weaknesses: ["holy"],
    resistances: ["fire", "shadow", "poison"],
    lootTable: [
      { itemId: "item_demon_heart", chance: 1.0 },
      { itemId: "item_abyssal_armor", chance: 0.1 },
      { itemId: "item_legendary_axe", chance: 0.1 },
      { itemId: "item_gold_large", chance: 1.0 }
    ],
    xpReward: 2000,
    goldReward: { min: 1000, max: 2000 },
    isBoss: true
  },
  
  "monster_vampire_girl": {
    id: "monster_vampire_girl",
    name: "Vampire Fledgling",
    description: "A young vampire with deadly speed and blood magic.",
    spriteSet: "Vampire_Girl",
    level: 5,
    baseHp: 55,
    baseDamage: 16,
    baseDefense: 4,
    damageType: "shadow",
    abilities: ["skill_backstab", "spell_drain_life"],
    weaknesses: ["holy", "fire"],
    resistances: ["shadow", "poison"],
    lootTable: [
      { itemId: "item_vampire_fang", chance: 0.4 },
      { itemId: "item_blood_vial", chance: 0.3 },
      { itemId: "item_gold_medium", chance: 0.8 }
    ],
    xpReward: 70,
    goldReward: { min: 25, max: 50 }
  },
  
  "monster_converted_vampire": {
    id: "monster_converted_vampire",
    name: "Converted Vampire",
    description: "A recently turned vampire, still learning their dark powers.",
    spriteSet: "Converted_Vampire",
    level: 4,
    baseHp: 50,
    baseDamage: 14,
    baseDefense: 3,
    damageType: "shadow",
    abilities: ["skill_feral_strike", "spell_drain_life"],
    weaknesses: ["holy", "fire"],
    resistances: ["shadow"],
    lootTable: [
      { itemId: "item_vampire_fang", chance: 0.3 },
      { itemId: "item_blood_vial", chance: 0.25 },
      { itemId: "item_gold_small", chance: 0.9 }
    ],
    xpReward: 55,
    goldReward: { min: 18, max: 40 }
  },
  
  "monster_boss_countess_vampire": {
    id: "monster_boss_countess_vampire",
    name: "Countess Valdara",
    description: "An ancient vampire countess with mastery over blood magic.",
    spriteSet: "Countess_Vampire",
    level: 12,
    baseHp: 350,
    baseDamage: 40,
    baseDefense: 15,
    damageType: "shadow",
    abilities: ["spell_drain_life", "spell_shadow_bolt", "skill_shadow_dance", "spell_blood_charge"],
    weaknesses: ["holy", "fire"],
    resistances: ["shadow", "poison", "ice"],
    lootTable: [
      { itemId: "item_vampire_fang", chance: 1.0 },
      { itemId: "item_blood_crown", chance: 0.15 },
      { itemId: "item_crimson_cloak", chance: 0.1 },
      { itemId: "item_gold_large", chance: 1.0 }
    ],
    xpReward: 600,
    goldReward: { min: 250, max: 500 },
    isBoss: true
  }
};

export function getMonster(id: string): MonsterDefinition | undefined {
  return MONSTERS[id];
}

export function getMonstersByLevel(minLevel: number, maxLevel: number): MonsterDefinition[] {
  return Object.values(MONSTERS).filter(m => m.level >= minLevel && m.level <= maxLevel && !m.isBoss);
}

export function getBosses(): MonsterDefinition[] {
  return Object.values(MONSTERS).filter(m => m.isBoss);
}

export function getMonstersByWeakness(weakness: DamageType): MonsterDefinition[] {
  return Object.values(MONSTERS).filter(m => m.weaknesses.includes(weakness));
}

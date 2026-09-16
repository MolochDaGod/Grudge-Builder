import type { ItemDefinition, WeaponType } from "./types";

export const ITEMS: Record<string, ItemDefinition> = {
  "item_rusty_sword": {
    id: "item_rusty_sword",
    name: "Rusty Sword",
    description: "A worn and rusty sword. Better than nothing.",
    icon: "🗡️",
    type: "weapon",
    rarity: "common",
    weaponType: "sword",
    stats: { "Phys Dmg": 5, Accuracy: -5 },
    levelRequirement: 1,
    sellValue: 5,
    stackable: false
  },
  
  "item_iron_sword": {
    id: "item_iron_sword",
    name: "Iron Sword",
    description: "A sturdy iron sword.",
    icon: "⚔️",
    type: "weapon",
    rarity: "common",
    weaponType: "sword",
    stats: { "Phys Dmg": 12 },
    abilities: ["skill_slash", "skill_power_strike"],
    levelRequirement: 3,
    sellValue: 25,
    stackable: false
  },
  
  "item_steel_sword": {
    id: "item_steel_sword",
    name: "Steel Sword",
    description: "A well-forged steel blade.",
    icon: "⚔️",
    type: "weapon",
    rarity: "uncommon",
    weaponType: "sword",
    stats: { "Phys Dmg": 20, Crit: 5 },
    abilities: ["skill_slash", "skill_power_strike", "skill_whirlwind"],
    levelRequirement: 8,
    sellValue: 80,
    stackable: false
  },
  
  "item_battle_axe": {
    id: "item_battle_axe",
    name: "Battle Axe",
    description: "A heavy battle axe that cleaves through armor.",
    icon: "🪓",
    type: "weapon",
    rarity: "uncommon",
    weaponType: "axe",
    stats: { "Phys Dmg": 25, "Armor Pen": 10 },
    abilities: ["skill_cleave", "skill_raging_blow"],
    levelRequirement: 5,
    sellValue: 60,
    stackable: false
  },
  
  "item_dagger": {
    id: "item_dagger",
    name: "Steel Dagger",
    description: "A swift and deadly dagger.",
    icon: "🗡️",
    type: "weapon",
    rarity: "common",
    weaponType: "dagger",
    stats: { "Phys Dmg": 8, Crit: 15, "Atk Spd": 10 },
    abilities: ["skill_backstab", "skill_envenom"],
    levelRequirement: 1,
    sellValue: 20,
    stackable: false
  },
  
  "item_hunting_bow": {
    id: "item_hunting_bow",
    name: "Hunting Bow",
    description: "A reliable bow for hunting game.",
    icon: "🏹",
    type: "weapon",
    rarity: "common",
    weaponType: "bow",
    stats: { "Phys Dmg": 10, Accuracy: 10 },
    abilities: ["skill_aimed_shot", "skill_multi_shot"],
    levelRequirement: 1,
    sellValue: 30,
    stackable: false
  },
  
  "item_oak_staff": {
    id: "item_oak_staff",
    name: "Oak Staff",
    description: "A simple wooden staff that channels magic.",
    icon: "🪄",
    type: "weapon",
    rarity: "common",
    weaponType: "staff",
    stats: { "Mag Dmg": 10, Mana: 20 },
    abilities: ["skill_staff_strike", "spell_arcane_missiles"],
    levelRequirement: 1,
    sellValue: 25,
    stackable: false
  },
  
  "item_fire_staff": {
    id: "item_fire_staff",
    name: "Staff of Flames",
    description: "A staff imbued with the power of fire.",
    icon: "🔥",
    type: "weapon",
    rarity: "rare",
    weaponType: "staff",
    stats: { "Mag Dmg": 25, Mana: 40, "Fire Dmg": 15 },
    abilities: ["spell_fireball", "spell_inferno"],
    levelRequirement: 10,
    sellValue: 150,
    stackable: false
  },
  
  "item_leather_armor": {
    id: "item_leather_armor",
    name: "Leather Armor",
    description: "Basic leather protection.",
    icon: "🥋",
    type: "armor",
    rarity: "common",
    armorSlot: "chest",
    stats: { "Phys Def": 10, Evasion: 5 },
    levelRequirement: 1,
    sellValue: 20,
    stackable: false
  },
  
  "item_chainmail": {
    id: "item_chainmail",
    name: "Chainmail Armor",
    description: "Interlocking metal rings for protection.",
    icon: "🛡️",
    type: "armor",
    rarity: "uncommon",
    armorSlot: "chest",
    stats: { "Phys Def": 25, "Mag Def": 5 },
    levelRequirement: 5,
    sellValue: 75,
    stackable: false
  },
  
  "item_plate_armor": {
    id: "item_plate_armor",
    name: "Plate Armor",
    description: "Heavy plate armor for maximum protection.",
    icon: "⚔️",
    type: "armor",
    rarity: "rare",
    armorSlot: "chest",
    stats: { "Phys Def": 50, "Mag Def": 15, Speed: -5 },
    levelRequirement: 12,
    sellValue: 200,
    stackable: false
  },
  
  "item_health_potion": {
    id: "item_health_potion",
    name: "Health Potion",
    description: "Restores 50 health when consumed.",
    icon: "❤️",
    type: "consumable",
    rarity: "common",
    levelRequirement: 1,
    sellValue: 10,
    stackable: true,
    maxStack: 20
  },
  
  "item_mana_potion": {
    id: "item_mana_potion",
    name: "Mana Potion",
    description: "Restores 40 mana when consumed.",
    icon: "💙",
    type: "consumable",
    rarity: "common",
    levelRequirement: 1,
    sellValue: 12,
    stackable: true,
    maxStack: 20
  },
  
  "item_bone": {
    id: "item_bone",
    name: "Bone",
    description: "A bone from a skeleton. Used in crafting.",
    icon: "🦴",
    type: "material",
    rarity: "common",
    levelRequirement: 1,
    sellValue: 2,
    stackable: true,
    maxStack: 99
  },
  
  "item_goblin_ear": {
    id: "item_goblin_ear",
    name: "Goblin Ear",
    description: "Proof of a slain goblin.",
    icon: "👂",
    type: "material",
    rarity: "common",
    levelRequirement: 1,
    sellValue: 3,
    stackable: true,
    maxStack: 99
  },
  
  "item_spider_silk": {
    id: "item_spider_silk",
    name: "Spider Silk",
    description: "Strong silk from a giant spider.",
    icon: "🕸️",
    type: "material",
    rarity: "uncommon",
    levelRequirement: 1,
    sellValue: 8,
    stackable: true,
    maxStack: 99
  },
  
  "item_fire_essence": {
    id: "item_fire_essence",
    name: "Fire Essence",
    description: "The crystallized essence of fire.",
    icon: "🔥",
    type: "material",
    rarity: "rare",
    levelRequirement: 1,
    sellValue: 25,
    stackable: true,
    maxStack: 50
  },
  
  "item_ice_crystal": {
    id: "item_ice_crystal",
    name: "Ice Crystal",
    description: "A shard of eternal ice.",
    icon: "❄️",
    type: "material",
    rarity: "rare",
    levelRequirement: 1,
    sellValue: 25,
    stackable: true,
    maxStack: 50
  },
  
  "item_shadow_essence": {
    id: "item_shadow_essence",
    name: "Shadow Essence",
    description: "Pure darkness in physical form.",
    icon: "🌑",
    type: "material",
    rarity: "rare",
    levelRequirement: 1,
    sellValue: 30,
    stackable: true,
    maxStack: 50
  },
  
  "item_dragon_scale": {
    id: "item_dragon_scale",
    name: "Dragon Scale",
    description: "A scale from an ancient dragon.",
    icon: "🐉",
    type: "material",
    rarity: "legendary",
    levelRequirement: 1,
    sellValue: 100,
    stackable: true,
    maxStack: 20
  },
  
  "item_gold_small": {
    id: "item_gold_small",
    name: "Gold Coins",
    description: "A small pouch of gold coins.",
    icon: "💰",
    type: "material",
    rarity: "common",
    levelRequirement: 1,
    sellValue: 0,
    stackable: true,
    maxStack: 9999
  },
  
  "item_gold_medium": {
    id: "item_gold_medium",
    name: "Gold Purse",
    description: "A purse filled with gold coins.",
    icon: "💰",
    type: "material",
    rarity: "uncommon",
    levelRequirement: 1,
    sellValue: 0,
    stackable: true,
    maxStack: 9999
  },
  
  "item_gold_large": {
    id: "item_gold_large",
    name: "Gold Chest",
    description: "A chest overflowing with gold.",
    icon: "💰",
    type: "material",
    rarity: "rare",
    levelRequirement: 1,
    sellValue: 0,
    stackable: true,
    maxStack: 9999
  },
  
  "item_long_row_boat": {
    id: "item_long_row_boat",
    name: "Long Row Boat",
    description:
      "Barbarian long oar hull (~11.7 m). Recipe from the Stormfang Dock Master. Craft at a dock.",
    icon: "🚣",
    type: "vehicle",
    rarity: "uncommon",
    levelRequirement: 1,
    sellValue: 40,
    stackable: false,
  },

  "item_legendary_sword": {
    id: "item_legendary_sword",
    name: "Excalibur",
    description: "A legendary blade of incredible power.",
    icon: "⚔️",
    type: "weapon",
    rarity: "legendary",
    weaponType: "sword",
    stats: { "Phys Dmg": 75, Crit: 25, "Atk Spd": 15, Health: 100 },
    abilities: ["skill_slash", "skill_power_strike", "skill_whirlwind", "spell_holy_light"],
    levelRequirement: 20,
    sellValue: 1000,
    stackable: false
  },
  
  "item_legendary_staff": {
    id: "item_legendary_staff",
    name: "Staff of the Archmage",
    description: "A staff of unfathomable magical power.",
    icon: "🔮",
    type: "weapon",
    rarity: "legendary",
    weaponType: "staff",
    stats: { "Mag Dmg": 60, Mana: 150, "Mag Def": 30, "Cost Red": 20 },
    abilities: ["spell_chain_lightning", "spell_inferno", "spell_blizzard", "spell_arcane_missiles"],
    levelRequirement: 20,
    sellValue: 1000,
    stackable: false
  }
};

export function getItem(id: string): ItemDefinition | undefined {
  return ITEMS[id];
}

export function getItemsByType(type: ItemDefinition["type"]): ItemDefinition[] {
  return Object.values(ITEMS).filter(i => i.type === type);
}

export function getItemsByRarity(rarity: ItemDefinition["rarity"]): ItemDefinition[] {
  return Object.values(ITEMS).filter(i => i.rarity === rarity);
}

export function getWeapons(): ItemDefinition[] {
  return Object.values(ITEMS).filter(i => i.type === "weapon");
}

export function getWeaponsByType(weaponType: WeaponType): ItemDefinition[] {
  return Object.values(ITEMS).filter(i => i.type === "weapon" && i.weaponType === weaponType);
}

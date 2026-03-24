import { assetUrl } from "@/lib/assetConfig";

export type AttributeKey = "Strength" | "Intellect" | "Vitality" | "Dexterity" | "Endurance" | "Wisdom" | "Agility" | "Tactics";

export interface AttributeDef {
  description: string;
  gains: Record<string, number>;
}

export const ATTRIBUTES: Record<AttributeKey, AttributeDef> = {
  Strength: {
    description: "Physical might and raw power.",
    gains: { Health: 5, "Phys Dmg": 1.25, "Phys Def": 4 }
  },
  Intellect: {
    description: "Mental acuity and spellcasting power.",
    gains: { Mana: 9, "Mag Dmg": 1.5, "Mag Def": 2 }
  },
  Vitality: {
    description: "Physical endurance and life force.",
    gains: { Health: 25, "Phys Def": 1.5, "HP Regen": 0.06 }
  },
  Dexterity: {
    description: "Hand-eye coordination and finesse.",
    gains: { Crit: 0.3, "Atk Spd": 0.2, Accuracy: 0.25 }
  },
  Endurance: {
    description: "Stamina reserves and physical resistance.",
    gains: { Stamina: 6, "Phys Def": 5, Block: 0.175 }
  },
  Wisdom: {
    description: "Mental fortitude and magical resilience.",
    gains: { Mana: 6, "Mag Def": 5.5, Resist: 0.25 }
  },
  Agility: {
    description: "Speed, reflexes, and positioning.",
    gains: { Speed: 0.15, Evasion: 0.225, Dodge: 0.15 }
  },
  Tactics: {
    description: "Strategic thinking and ability control.",
    gains: { Stamina: 3, "Armor Pen": 0.2, "Cost Red": 0.075 }
  }
};

export type Faction = "Crusade" | "Legion" | "Fabled";

export interface RaceDef {
  id: string;
  name: string;
  faction: Faction;
  description: string;
  image: string;
  baseStats: Record<AttributeKey, number>; // 5 points spread based on race
  spriteSet: string;
}

export const RACES: RaceDef[] = [
  {
    id: "human",
    name: "Human",
    faction: "Crusade",
    description: "Noble warriors of honor and chivalry, the Humans form the backbone of the Crusade's disciplined armies.",
    image: assetUrl("/images/portraits/human.png"),
    baseStats: { Strength: 2, Intellect: 1, Vitality: 2, Dexterity: 0, Endurance: 0, Wisdom: 0, Agility: 0, Tactics: 0 }, // 5 total
    spriteSet: "Soldier"
  },
  {
    id: "barbarian",
    name: "Barbarian",
    faction: "Crusade",
    description: "Fierce tribal warriors who fight alongside the Humans, the Barbarians bring raw strength to the Crusade.",
    image: assetUrl("/images/portraits/barbarian.png"),
    baseStats: { Strength: 2, Intellect: 0, Vitality: 2, Dexterity: 0, Endurance: 1, Wisdom: 0, Agility: 0, Tactics: 0 }, // 5 total
    spriteSet: "Armored Axeman"
  },
  {
    id: "undead",
    name: "Undead",
    faction: "Legion",
    description: "Risen from death itself, the Undead serve the Legion with unwavering loyalty and dark magic.",
    image: assetUrl("/images/portraits/undead.png"),
    baseStats: { Strength: 0, Intellect: 2, Vitality: 0, Dexterity: 0, Endurance: 0, Wisdom: 3, Agility: 0, Tactics: 0 }, // 5 total
    spriteSet: "Skeleton"
  },
  {
    id: "orc",
    name: "Orc",
    faction: "Legion",
    description: "Brutal and savage, the Orcs crush their enemies with overwhelming force for the glory of the Legion.",
    image: assetUrl("/images/portraits/orc.png"),
    baseStats: { Strength: 2, Intellect: 0, Vitality: 1, Dexterity: 0, Endurance: 2, Wisdom: 0, Agility: 0, Tactics: 0 }, // 5 total
    spriteSet: "Orc"
  },
  {
    id: "elf",
    name: "Elf",
    faction: "Fabled",
    description: "Ancient and wise, the Elves wield nature's power and arcane arts in defense of the Fabled lands.",
    image: assetUrl("/images/portraits/elf.png"),
    baseStats: { Strength: 0, Intellect: 2, Vitality: 0, Dexterity: 1, Endurance: 0, Wisdom: 2, Agility: 0, Tactics: 0 }, // 5 total
    spriteSet: "Archer"
  },
  {
    id: "dwarf",
    name: "Dwarf",
    faction: "Fabled",
    description: "Master craftsmen and resilient fighters, the Dwarves stand as the Fabled faction's mountain stronghold.",
    image: assetUrl("/images/portraits/dwarf.png"),
    baseStats: { Strength: 0, Intellect: 0, Vitality: 2, Dexterity: 0, Endurance: 2, Wisdom: 1, Agility: 0, Tactics: 0 }, // 5 total
    spriteSet: "Knight"
  }
];

export interface ClassDef {
  id: string;
  name: string;
  description: string;
  role: string;
  baseStats: Record<AttributeKey, number>; // 5 points spread based on class
  spriteSetOverride?: string;
  startingWeapon: string; // Default weapon type for this class
}

export const CLASSES: ClassDef[] = [
  {
    id: "worg",
    name: "Worg Shapeshifter",
    description: "Transform into different animal forms, each with unique stats, abilities, and roles. No longer a pet master - YOU become the beast!\n\nLevel 0: Primal Shift\n🐻 Bear Form: Transform into WorgBear asset. Massive HP/Defense boost, threat generation, damage reduction abilities. Primary tank form.\n\nLevel 1: Pack Instincts\nHowl - AoE fear/debuff enemies\nPack Hunt - Damage bonus near allies\nLevel 5: Primal Mastery\nFeral Rage - Attack speed/damage boost\nAlpha Call - Summon temporary wolf allies",
    role: "Tank / DPS / Utility",
    baseStats: { Strength: 1, Intellect: 0, Vitality: 2, Dexterity: 0, Endurance: 1, Wisdom: 0, Agility: 1, Tactics: 0 }, // 5 total
    spriteSetOverride: "Werewolf",
    startingWeapon: "axe"
  },
  {
    id: "warrior",
    name: "Warrior",
    description: "Most flexible class - can spec into tanking, DPS, or paladin support roles. Adaptable to any team composition need.\n\nLevel 0: Invincibility\n🛡️ Temporary Invulnerability: 1-4 seconds of complete damage immunity. Duration scales with trait level.\n\nLevel 1: Combat Basics\nTaunt - Force enemies to target you\nQuick Strike - Fast attack with speed bonus\nLevel 5: Specialization\nDamage Surge - Temporary damage boost\nGuardian's Aura - Defense buff for nearby allies",
    role: "Tank / DPS / Support",
    baseStats: { Strength: 2, Intellect: 0, Vitality: 1, Dexterity: 0, Endurance: 1, Wisdom: 0, Agility: 0, Tactics: 1 }, // 5 total
    startingWeapon: "sword"
  },
  {
    id: "mage",
    name: "Mage Priest",
    description: "Passive shield based on mana %. Directional Blink teleportation. Portal system for team mobility.\n\nLevel 0: Arcane Affinity\n🛡️ Mana Shield: Passive - Charges when not taking damage, creates shield = % of current mana. Active - 15s massive crit/spell damage boost.\n\nLevel 1: Basic Arts\nMagic Missile - Multi-projectile damage\nHeal - Direct healing spell\nLevel 5: Specialization\nFireball - AoE damage spell\nGreater Heal - Powerful single-target heal",
    role: "Healer / DPS / Utility",
    baseStats: { Strength: 0, Intellect: 3, Vitality: 0, Dexterity: 0, Endurance: 0, Wisdom: 2, Agility: 0, Tactics: 0 }, // 5 total
    spriteSetOverride: "Wizard",
    startingWeapon: "staff"
  },
  {
    id: "ranger",
    name: "Ranger Scout",
    description: "Choose between Ranged Mastery (bow/gun excellence) or Melee Assassin (stealth/crit) paths. No pets - pure skill-based combat.\n\nLevel 0: Hunter's Instinct\n🎯 Precision: Passive accuracy/crit bonus. Enhanced tracking and resource gathering. Movement speed bonus in natural environments.\n\nLevel 1: Basic Training\nPower Shot - High damage ranged attack\nStealth Strike - Melee attack from stealth\nLevel 5: Specialization Path\nMulti Shot - Fire multiple arrows/bullets\nShadow Step - Short-range teleport behind enemy",
    role: "DPS / Utility / Off-Tank",
    baseStats: { Strength: 0, Intellect: 0, Vitality: 0, Dexterity: 2, Endurance: 0, Wisdom: 0, Agility: 2, Tactics: 1 }, // 5 total
    startingWeapon: "bow"
  }
];

export const FACTION_COLORS = {
  Crusade: { border: "border-blue-500", text: "text-blue-400", bg: "bg-blue-900/20", glow: "shadow-blue-500/50" },
  Legion: { border: "border-red-600", text: "text-red-500", bg: "bg-red-900/20", glow: "shadow-red-600/50" },
  Fabled: { border: "border-green-500", text: "text-green-400", bg: "bg-green-900/20", glow: "shadow-green-500/50" }
};

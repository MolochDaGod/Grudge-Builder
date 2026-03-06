export interface AttributeStatBonus {
  flat: number;
  percent: number;
}

export interface AttributeDefinition {
  id: string;
  name: string;
  primaryRole: string;
  focus: string;
  color: string;
  icon: string;
  stats: {
    health?: AttributeStatBonus;
    mana?: AttributeStatBonus;
    stamina?: AttributeStatBonus;
    damage?: AttributeStatBonus;
    defense?: AttributeStatBonus;
    blockChance?: AttributeStatBonus;
    criticalChance?: AttributeStatBonus;
    blockFactor?: AttributeStatBonus;
    criticalFactor?: AttributeStatBonus;
    accuracy?: AttributeStatBonus;
    resistance?: AttributeStatBonus;
    drainHealthFactor?: AttributeStatBonus;
    drainManaFactor?: AttributeStatBonus;
    reflectDamageFactor?: AttributeStatBonus;
    defenseBreakFactor?: AttributeStatBonus;
    blockBreakFactor?: AttributeStatBonus;
    criticalEvasion?: AttributeStatBonus;
    absorbHealthFactor?: AttributeStatBonus;
    absorbManaFactor?: AttributeStatBonus;
  };
}

export const ATTRIBUTE_DEFINITIONS: Record<string, AttributeDefinition> = {
  Strength: {
    id: "Strength",
    name: "Strength",
    primaryRole: "Tank/Melee Damage",
    focus: "High health, damage, and defense with strong combat modifiers",
    color: "red",
    icon: "💪",
    stats: {
      health: { flat: 26, percent: 0.8 },
      damage: { flat: 3, percent: 2 },
      defense: { flat: 12, percent: 1.5 },
      blockChance: { flat: 0.5, percent: 5 },
      criticalChance: { flat: 0.32, percent: 7 },
      blockFactor: { flat: 0.85, percent: 26.3 },
      criticalFactor: { flat: 1.1, percent: 1.5 },
      accuracy: { flat: 0.1, percent: 0 },
      resistance: { flat: 0.3, percent: 0 },
    },
  },
  Vitality: {
    id: "Vitality",
    name: "Vitality",
    primaryRole: "Tank/Survivability",
    focus: "Maximum health, defense, and damage mitigation",
    color: "green",
    icon: "❤️",
    stats: {
      health: { flat: 25, percent: 0.5 },
      mana: { flat: 2, percent: 0.2 },
      stamina: { flat: 5, percent: 0.1 },
      damage: { flat: 2, percent: 0.1 },
      defense: { flat: 12, percent: 0 },
      blockFactor: { flat: 0.3, percent: 17 },
      criticalFactor: { flat: 0.1, percent: 1 },
      resistance: { flat: 0.5, percent: 0 },
    },
  },
  Endurance: {
    id: "Endurance",
    name: "Endurance",
    primaryRole: "Tank/Defensive Specialist",
    focus: "Defense, block mechanics, and critical evasion",
    color: "amber",
    icon: "🛡️",
    stats: {
      health: { flat: 10, percent: 0.1 },
      stamina: { flat: 1, percent: 0.3 },
      defense: { flat: 12, percent: 12 },
      blockChance: { flat: 0.11, percent: 73.5 },
      blockFactor: { flat: 0.27, percent: 0 },
      resistance: { flat: 0.46, percent: 0 },
    },
  },
  Intellect: {
    id: "Intellect",
    name: "Intellect",
    primaryRole: "Mage/Caster",
    focus: "Mana, magic damage, and spell accuracy",
    color: "blue",
    icon: "🔮",
    stats: {
      mana: { flat: 5, percent: 5 },
      damage: { flat: 4, percent: 2.5 },
      defense: { flat: 2, percent: 0 },
      criticalChance: { flat: 0.23, percent: 0.1 },
      accuracy: { flat: 0.12, percent: 33.8 },
      resistance: { flat: 0.38, percent: 17 },
    },
  },
  Wisdom: {
    id: "Wisdom",
    name: "Wisdom",
    primaryRole: "Healer/Support Caster",
    focus: "Mana efficiency, survivability, and spell effectiveness",
    color: "purple",
    icon: "📖",
    stats: {
      health: { flat: 10, percent: 0 },
      mana: { flat: 20, percent: 3 },
      damage: { flat: 2, percent: 1.5 },
      defense: { flat: 2, percent: 0 },
      criticalChance: { flat: 0.5, percent: 0.15 },
      resistance: { flat: 0.5, percent: 0 },
    },
  },
  Dexterity: {
    id: "Dexterity",
    name: "Dexterity",
    primaryRole: "Rogue/Precision Fighter",
    focus: "Critical strikes, accuracy, and evasion",
    color: "orange",
    icon: "🎯",
    stats: {
      damage: { flat: 3, percent: 1.8 },
      defense: { flat: 10, percent: 1 },
      blockChance: { flat: 0.41, percent: 1 },
      criticalChance: { flat: 0.5, percent: 1.2 },
      accuracy: { flat: 0.7, percent: 1.5 },
    },
  },
  Agility: {
    id: "Agility",
    name: "Agility",
    primaryRole: "Mobile DPS/Dodge Tank",
    focus: "Mobility, critical strikes, and defensive penetration",
    color: "cyan",
    icon: "⚡",
    stats: {
      health: { flat: 2, percent: 0.6 },
      stamina: { flat: 5, percent: 0.5 },
      damage: { flat: 3, percent: 1.6 },
      defense: { flat: 5, percent: 0.8 },
      criticalChance: { flat: 0.42, percent: 1 },
    },
  },
  Tactics: {
    id: "Tactics",
    name: "Tactics",
    primaryRole: "Strategic Fighter/Commander",
    focus: "Balanced combat stats with penetration abilities",
    color: "slate",
    icon: "⚔️",
    stats: {
      health: { flat: 10, percent: 8.4 },
      mana: { flat: 0, percent: 8.2 },
      stamina: { flat: 1, percent: 0 },
      damage: { flat: 3, percent: 0.2 },
      defense: { flat: 5, percent: 0.5 },
      blockChance: { flat: 0.27, percent: 0.8 },
      criticalChance: { flat: 0.02, percent: 2 },
    },
  },
};

export const STAT_LABELS: Record<string, { label: string; shortLabel: string; color: string }> = {
  health: { label: "Health", shortLabel: "HP", color: "red" },
  mana: { label: "Mana", shortLabel: "MP", color: "blue" },
  stamina: { label: "Stamina", shortLabel: "SP", color: "green" },
  damage: { label: "Damage", shortLabel: "DMG", color: "amber" },
  defense: { label: "Defense", shortLabel: "DEF", color: "slate" },
  blockChance: { label: "Block Chance", shortLabel: "BLK%", color: "amber" },
  criticalChance: { label: "Critical Chance", shortLabel: "CRT%", color: "orange" },
  blockFactor: { label: "Block Factor", shortLabel: "BLK×", color: "amber" },
  criticalFactor: { label: "Critical Factor", shortLabel: "CRT×", color: "orange" },
  accuracy: { label: "Accuracy", shortLabel: "ACC", color: "cyan" },
  resistance: { label: "Resistance", shortLabel: "RES", color: "purple" },
  drainHealthFactor: { label: "Drain Health", shortLabel: "DRN♥", color: "red" },
  drainManaFactor: { label: "Drain Mana", shortLabel: "DRN◆", color: "blue" },
  reflectDamageFactor: { label: "Reflect Damage", shortLabel: "RFLCT", color: "purple" },
  defenseBreakFactor: { label: "Defense Break", shortLabel: "DBRK", color: "amber" },
  blockBreakFactor: { label: "Block Break", shortLabel: "BBRK", color: "amber" },
  criticalEvasion: { label: "Critical Evasion", shortLabel: "CEVA", color: "cyan" },
  absorbHealthFactor: { label: "Absorb Health", shortLabel: "ABS♥", color: "red" },
  absorbManaFactor: { label: "Absorb Mana", shortLabel: "ABS◆", color: "blue" },
};

export function calculateAttributeBonuses(
  attributes: Record<string, number>,
  baseStats: Record<string, number> = {}
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [attrId, points] of Object.entries(attributes)) {
    const attrDef = ATTRIBUTE_DEFINITIONS[attrId];
    if (!attrDef || points <= 0) continue;

    for (const [statKey, bonus] of Object.entries(attrDef.stats)) {
      if (!bonus) continue;
      const baseStat = baseStats[statKey] || 0;
      const flatBonus = bonus.flat * points;
      const percentBonus = baseStat * (bonus.percent / 100) * points;
      
      result[statKey] = (result[statKey] || 0) + flatBonus + percentBonus;
    }
  }

  return result;
}

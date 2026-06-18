/**
 * Profession System — synchronous game logic for XP, levels, gathering, and crafting.
 *
 * XP TABLE SOURCE OF TRUTH: professionSync.ts loads from ObjectStore.
 * This file uses a local fallback table that gets overwritten once ObjectStore data loads.
 * All consumers import from here (synchronous); professionSync.ts hydrates the table async.
 */

export interface ProfessionLevel {
  level: number;
  xp: number;
}

export interface ProfessionXPResult {
  profession: string;
  xpGained: number;
  newLevel: number;
  newXp: number;
  leveledUp: boolean;
}

/**
 * XP table — local fallback, overwritten by ObjectStore data via hydrateXpTable().
 * Do NOT duplicate this table elsewhere; use professionSync.loadProfessions() to update it.
 */
export let PROFESSION_XP_TABLE: Record<number, number> = {
  1: 0,
  2: 100,
  3: 250,
  4: 500,
  5: 850,
  6: 1300,
  7: 1900,
  8: 2700,
  9: 3700,
  10: 5000,
  15: 12000,
  20: 25000,
  30: 60000,
  40: 120000,
  50: 250000,
  75: 750000,
  100: 2000000,
};

/**
 * Called by professionSync.ts after ObjectStore data loads.
 * Replaces the local XP table with the authoritative one.
 */
export function hydrateXpTable(table: Record<string, number>): void {
  const converted: Record<number, number> = {};
  for (const [k, v] of Object.entries(table)) {
    converted[Number(k)] = v;
  }
  if (Object.keys(converted).length > 0) {
    PROFESSION_XP_TABLE = converted;
  }
}

export function getXpForLevel(level: number): number {
  if (PROFESSION_XP_TABLE[level] !== undefined) {
    return PROFESSION_XP_TABLE[level];
  }
  const levels = Object.keys(PROFESSION_XP_TABLE).map(Number).sort((a, b) => a - b);
  let prevLevel = 1, nextLevel = 100;
  for (let i = 0; i < levels.length - 1; i++) {
    if (levels[i] <= level && levels[i + 1] > level) {
      prevLevel = levels[i];
      nextLevel = levels[i + 1];
      break;
    }
  }
  const prevXp = PROFESSION_XP_TABLE[prevLevel];
  const nextXp = PROFESSION_XP_TABLE[nextLevel];
  const progress = (level - prevLevel) / (nextLevel - prevLevel);
  return Math.floor(prevXp + (nextXp - prevXp) * progress);
}

export function calculateLevelFromXp(totalXp: number): { level: number; xpInLevel: number; xpForNextLevel: number } {
  let level = 1;
  for (let l = 1; l <= 100; l++) {
    const xpNeeded = getXpForLevel(l + 1);
    if (totalXp < xpNeeded) {
      level = l;
      break;
    }
    if (l === 100) {
      level = 100;
    }
  }
  const xpForCurrentLevel = getXpForLevel(level);
  const xpForNextLevel = getXpForLevel(level + 1);
  const xpInLevel = totalXp - xpForCurrentLevel;
  return { level, xpInLevel, xpForNextLevel: xpForNextLevel - xpForCurrentLevel };
}

export const RESOURCE_TO_PROFESSION: Record<string, string> = {
  ore: "Mining",
  stone: "Mining",
  wood: "Logging",
  hemp: "Herbalism",
  herb: "Herbalism",
  berry: "Herbalism",
  fish: "Fishing",
  leather: "Skinning",
  hide: "Skinning",
  fat: "Skinning",
  bone: "Skinning",
  gem: "Mining",
};

export const CRAFTING_PROFESSION_MAP: Record<string, string> = {
  Blacksmithing: "Blacksmithing",
  Armorsmithing: "Armorsmithing",
  Tailoring: "Tailoring",
  Jewelcrafting: "Jewelcrafting",
  Enchanting: "Enchanting",
  Alchemy: "Alchemy",
};

/** Emoji fallbacks for gathering/crafting profession labels (not CDN image art). */
export const GATHERING_PROFESSION_EMOJIS: Record<string, string> = {
  Mining: "⛏️",
  Logging: "🪓",
  Herbalism: "🌿",
  Skinning: "🔪",
  Fishing: "🎣",
  Blacksmithing: "🔨",
  Armorsmithing: "🛡️",
  Tailoring: "🧵",
  Jewelcrafting: "💎",
  Enchanting: "✨",
  Alchemy: "⚗️",
};

export function getGatherXp(resourceType: string, tier: number = 1): number {
  const baseXp = 10;
  return Math.floor(baseXp * (1 + (tier - 1) * 0.5));
}

export function getCraftXp(itemTier: number, itemRarity: string): number {
  const baseXp = 25;
  const tierMult = 1 + (itemTier - 1) * 0.5;
  const rarityMult = itemRarity === "Common" ? 1 : 
                     itemRarity === "Uncommon" ? 1.5 :
                     itemRarity === "Rare" ? 2.5 :
                     itemRarity === "Epic" ? 4 : 6;
  return Math.floor(baseXp * tierMult * rarityMult);
}

export function addProfessionXp(
  currentLevels: Record<string, ProfessionLevel>,
  profession: string,
  xpGained: number
): { updatedLevels: Record<string, ProfessionLevel>; result: ProfessionXPResult } {
  const current = currentLevels[profession] || { level: 1, xp: 0 };
  const newXp = current.xp + xpGained;
  const { level: newLevel, xpInLevel, xpForNextLevel } = calculateLevelFromXp(newXp);
  
  const updatedLevels = {
    ...currentLevels,
    [profession]: { level: newLevel, xp: newXp }
  };
  
  return {
    updatedLevels,
    result: {
      profession,
      xpGained,
      newLevel,
      newXp,
      leveledUp: newLevel > current.level
    }
  };
}

export function getResourceDiscoveryChance(professionLevel: number, resourceTier: number): number {
  const levelDiff = professionLevel - (resourceTier * 10 - 9);
  if (levelDiff < -10) return 0;
  if (levelDiff < 0) return Math.max(0.1, 0.5 + levelDiff * 0.04);
  return Math.min(1, 0.5 + levelDiff * 0.05);
}

export function getRareDropChance(professionLevel: number): number {
  return Math.min(0.3, 0.05 + professionLevel * 0.005);
}

// ==========================================
// GATHERING PROFESSION BONUSES (Level 1-100)
// ==========================================

export interface GatheringBonuses {
  qualityBonus: number;
  quantityBonus: number;
  gearDropChance: number;
  harvestSpeedReduction: number;
  rareResourceChance: number;
  criticalGatherChance: number;
  xpGainBonus: number;
  tierUnlocked: number;
}

export function getGatheringBonuses(level: number): GatheringBonuses {
  const clampedLevel = Math.max(1, Math.min(100, level));
  
  return {
    qualityBonus: Math.floor(clampedLevel * 0.5),
    quantityBonus: Math.floor(clampedLevel / 10),
    gearDropChance: Math.min(0.25, 0.01 + (clampedLevel * 0.0024)),
    harvestSpeedReduction: Math.min(0.65, clampedLevel * 0.0065),
    rareResourceChance: Math.min(0.40, 0.02 + (clampedLevel * 0.0038)),
    criticalGatherChance: Math.min(0.35, clampedLevel * 0.0035),
    xpGainBonus: Math.floor(clampedLevel / 20) * 0.1,
    tierUnlocked: Math.min(8, Math.ceil(clampedLevel / 12.5)),
  };
}

export const GATHERING_LEVEL_MILESTONES: { level: number; unlock: string; description: string }[] = [
  { level: 1, unlock: "Tier 1 Resources", description: "Basic resources like Iron Ore, Pine Logs, Common Fish" },
  { level: 10, unlock: "+1 Quantity", description: "Gather +1 additional resource per harvest" },
  { level: 13, unlock: "Tier 2 Resources", description: "Copper Ore, Oak Logs, Salmon, Fine Leather" },
  { level: 20, unlock: "+2 Quantity", description: "Gather +2 additional resources per harvest" },
  { level: 25, unlock: "Tier 3 Resources", description: "Steel Ore, Ironwood, Tuna, Moonpetal" },
  { level: 30, unlock: "+3 Quantity", description: "Gather +3 additional resources per harvest" },
  { level: 35, unlock: "5% Gear Drop", description: "5% chance for equipment drops while gathering" },
  { level: 38, unlock: "Tier 4 Resources", description: "Gold Ore, Elderwood, Golden Fish, Dragon's Breath" },
  { level: 40, unlock: "+4 Quantity", description: "Gather +4 additional resources per harvest" },
  { level: 50, unlock: "Tier 5 Resources", description: "Mythril Ore, Ancient Wood, Void Gems" },
  { level: 55, unlock: "10% Gear Drop", description: "10% chance for equipment drops while gathering" },
  { level: 60, unlock: "+6 Quantity", description: "Gather +6 additional resources per harvest" },
  { level: 63, unlock: "Tier 6 Resources", description: "Adamantine, Sunwood, Prismatic Gems" },
  { level: 70, unlock: "+7 Quantity", description: "Gather +7 additional resources per harvest" },
  { level: 75, unlock: "15% Gear Drop", description: "15% chance for equipment drops while gathering" },
  { level: 76, unlock: "Tier 7 Resources", description: "Celestial Ore, World Tree Bark, Divine Pearls" },
  { level: 80, unlock: "+8 Quantity", description: "Gather +8 additional resources per harvest" },
  { level: 88, unlock: "Tier 8 Resources", description: "Legendary materials - Starmetal, Godwood, Infinity Gems" },
  { level: 90, unlock: "+9 Quantity", description: "Gather +9 additional resources per harvest" },
  { level: 95, unlock: "20% Gear Drop", description: "20% chance for rare/epic equipment drops" },
  { level: 100, unlock: "Grandmaster", description: "Maximum gathering efficiency, 25% legendary drop chance, +10 quantity" },
];

export function getMilestonesForLevel(level: number): typeof GATHERING_LEVEL_MILESTONES {
  return GATHERING_LEVEL_MILESTONES.filter(m => m.level <= level);
}

export function getNextMilestone(level: number): typeof GATHERING_LEVEL_MILESTONES[0] | null {
  return GATHERING_LEVEL_MILESTONES.find(m => m.level > level) || null;
}

export const GATHERING_PROFESSIONS_CONFIG = {
  Mining: {
    icon: "⛏️",
    color: "slate",
    resources: ["Stone", "Ore", "Gems", "Crystals", "Mythril", "Gold", "Buried Treasure"],
    tierResources: {
      1: ["Iron Ore", "Copper Ore", "Rough Stone"],
      2: ["Steel Ore", "Silver Ore", "Granite"],
      3: ["Gold Ore", "Mithril Ore", "Marble"],
      4: ["Adamantine Ore", "Platinum Ore", "Obsidian"],
      5: ["Celestial Ore", "Void Stone", "Prismatic Crystal"],
      6: ["Starmetal", "Moonstone", "Sunstone"],
      7: ["Dragon Scale Ore", "Phoenix Metal", "Leviathan Stone"],
      8: ["Infinity Ore", "Godmetal", "Worldcore Gem"],
    },
    feedsInto: ["Miner", "Engineer", "Mystic"],
  },
  Logging: {
    icon: "🪓",
    color: "green",
    resources: ["Wood", "Planks", "Boat Wood", "Sticks", "Hemp", "Berries", "Sap", "Health Goo", "Mana Goo"],
    tierResources: {
      1: ["Pine Log", "Oak Log", "Birch Log"],
      2: ["Ironwood Log", "Cedar Log", "Maple Log"],
      3: ["Elderwood Log", "Ash Log", "Yew Log"],
      4: ["Bloodwood", "Frostoak", "Shadowbark"],
      5: ["Ancient Oak", "Spirit Wood", "Dreamwood"],
      6: ["World Tree Branch", "Ether Wood", "Starwood"],
      7: ["Dragon Root", "Phoenix Ash", "Titan Timber"],
      8: ["Godwood", "Infinity Bark", "Cosmic Heartwood"],
    },
    feedsInto: ["Forester", "Engineer"],
  },
  Skinning: {
    icon: "🔪",
    color: "amber",
    resources: ["Hide", "Leather", "Bones", "Fishing Lures", "Elder Moss", "Fuel", "Gems"],
    tierResources: {
      1: ["Rough Leather", "Thick Leather", "Beast Hide"],
      2: ["Fine Leather", "Tough Hide", "Large Bones"],
      3: ["Exotic Leather", "Monster Hide", "Reinforced Bones"],
      4: ["Dragon Hide", "Demon Leather", "Ancient Bones"],
      5: ["Celestial Hide", "Void Leather", "Spirit Bones"],
      6: ["Titan Skin", "Elder Dragon Scale", "Primordial Bone"],
      7: ["Phoenix Feather", "Leviathan Scale", "God Bone"],
      8: ["Infinity Hide", "Cosmic Scale", "Worldsoul Bone"],
    },
    feedsInto: ["Forester", "Chef", "Mystic"],
  },
  Fishing: {
    icon: "🎣",
    color: "blue",
    resources: ["Fish", "Shellfish", "Bones", "Random Items"],
    tierResources: {
      1: ["Common Fish", "Salmon", "Clam"],
      2: ["Tuna", "Lobster", "Sea Urchin"],
      3: ["Golden Fish", "Giant Crab", "Pearl Oyster"],
      4: ["Moonfish", "Kraken Tentacle", "Black Pearl"],
      5: ["Void Fish", "Abyssal Eel", "Star Pearl"],
      6: ["Celestial Koi", "Leviathan Scale", "Moon Pearl"],
      7: ["Phoenix Fin", "Dragon Turtle", "Sun Pearl"],
      8: ["Infinity Fish", "Worldsea Creature", "Cosmic Pearl"],
    },
    feedsInto: ["Chef", "Mystic"],
  },
  Herbalism: {
    icon: "🌿",
    color: "emerald",
    resources: ["Hemp", "Berries", "Rope", "Cloth", "Herbs", "Potions"],
    tierResources: {
      1: ["Red Flower", "Blue Mushroom", "Common Herb"],
      2: ["Moonpetal", "Sunleaf", "Healing Moss"],
      3: ["Dragon's Breath", "Nightshade", "Mana Bloom"],
      4: ["Ethereal Orchid", "Shadow Lotus", "Life Root"],
      5: ["Celestial Bloom", "Void Flower", "Spirit Herb"],
      6: ["Starflower", "Moonbloom", "Sunpetal"],
      7: ["Phoenix Ash Flower", "Dragon Heart Herb", "Titan Root"],
      8: ["Infinity Bloom", "Godherb", "Cosmic Lotus"],
    },
    feedsInto: ["Chef", "Mystic", "Forester"],
  },
  Scavenging: {
    icon: "🧲",
    color: "purple",
    resources: ["Cogs", "Metals", "Mechanical Parts", "Rare Components"],
    tierResources: {
      1: ["Scrap Metal", "Rusty Cogs", "Broken Parts"],
      2: ["Iron Gears", "Copper Wire", "Spring Coil"],
      3: ["Steel Components", "Precision Gears", "Power Cell"],
      4: ["Mythril Circuits", "Magic Capacitor", "Energy Core"],
      5: ["Void Engine Parts", "Dark Matter Coil", "Quantum Gear"],
      6: ["Celestial Machinery", "Star Engine", "Moon Core"],
      7: ["Dragon Tech", "Phoenix Reactor", "Titan Engine"],
      8: ["Infinity Machine", "God Engine", "Cosmic Core"],
    },
    feedsInto: ["Engineer", "Miner"],
  },
};

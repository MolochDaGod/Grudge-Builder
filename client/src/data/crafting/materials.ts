export interface CraftingMaterial {
  id: string;
  name: string;
  tier: number;
  category: "ore" | "wood" | "cloth" | "essence" | "ingredient" | "component" | "gem" | "leather" | "infusion";
  gatheredBy: "Miner" | "Forester" | "Mystic" | "Chef" | "Engineer" | null;
  description: string;
  icon: string;
  dropSource?: string;
  unlockNode?: string;
}

export const CRAFTING_MATERIALS: CraftingMaterial[] = [
  { id: "copper-ore", name: "Copper Ore", tier: 1, category: "ore", gatheredBy: "Miner", description: "Basic ore for beginner smithing", icon: "🪨" },
  { id: "iron-ore", name: "Iron Ore", tier: 2, category: "ore", gatheredBy: "Miner", description: "Common ore for reliable weapons", icon: "⛏️" },
  { id: "steel-ore", name: "Steel Ore", tier: 3, category: "ore", gatheredBy: "Miner", description: "Refined ore for quality gear", icon: "🔩" },
  { id: "mithril-ore", name: "Mithril Ore", tier: 4, category: "ore", gatheredBy: "Miner", description: "Rare lightweight metal", icon: "✨" },
  { id: "adamantine-ore", name: "Adamantine Ore", tier: 5, category: "ore", gatheredBy: "Miner", description: "Nearly indestructible ore", icon: "💎" },
  { id: "orichalcum-ore", name: "Orichalcum Ore", tier: 6, category: "ore", gatheredBy: "Miner", description: "Legendary mythical metal", icon: "🌟" },
  { id: "starmetal-ore", name: "Starmetal Ore", tier: 7, category: "ore", gatheredBy: "Miner", description: "Fallen from the heavens", icon: "☄️" },
  { id: "divine-ore", name: "Divine Ore", tier: 8, category: "ore", gatheredBy: "Miner", description: "Ore blessed by the gods", icon: "👑" },
  
  { id: "copper-ingot", name: "Copper Ingot", tier: 1, category: "component", gatheredBy: null, description: "Smelted copper bar", icon: "🟫" },
  { id: "iron-ingot", name: "Iron Ingot", tier: 2, category: "component", gatheredBy: null, description: "Smelted iron bar", icon: "⬛" },
  { id: "steel-ingot", name: "Steel Ingot", tier: 3, category: "component", gatheredBy: null, description: "Refined steel bar", icon: "⬜" },
  { id: "mithril-ingot", name: "Mithril Ingot", tier: 4, category: "component", gatheredBy: null, description: "Lightweight mithril bar", icon: "🔵" },
  { id: "adamantine-ingot", name: "Adamantine Ingot", tier: 5, category: "component", gatheredBy: null, description: "Indestructible bar", icon: "🟣" },
  { id: "orichalcum-ingot", name: "Orichalcum Ingot", tier: 6, category: "component", gatheredBy: null, description: "Mythical metal bar", icon: "🟡" },
  { id: "starmetal-ingot", name: "Starmetal Ingot", tier: 7, category: "component", gatheredBy: null, description: "Celestial metal bar", icon: "⭐" },
  { id: "divine-ingot", name: "Divine Ingot", tier: 8, category: "component", gatheredBy: null, description: "Godly metal bar", icon: "👑" },

  { id: "pine-log", name: "Pine Log", tier: 1, category: "wood", gatheredBy: "Forester", description: "Common softwood", icon: "🪵" },
  { id: "oak-log", name: "Oak Log", tier: 2, category: "wood", gatheredBy: "Forester", description: "Sturdy hardwood", icon: "🌳" },
  { id: "maple-log", name: "Maple Log", tier: 3, category: "wood", gatheredBy: "Forester", description: "Flexible quality wood", icon: "🍁" },
  { id: "ash-log", name: "Ash Log", tier: 4, category: "wood", gatheredBy: "Forester", description: "Strong and resilient", icon: "🌲" },
  { id: "ironwood-log", name: "Ironwood Log", tier: 5, category: "wood", gatheredBy: "Forester", description: "Hardwood with metal properties", icon: "🪓" },
  { id: "ebony-log", name: "Ebony Log", tier: 6, category: "wood", gatheredBy: "Forester", description: "Dark legendary timber", icon: "🖤" },
  { id: "wyrmwood-log", name: "Wyrmwood Log", tier: 7, category: "wood", gatheredBy: "Forester", description: "Dragon-touched lumber", icon: "🐉" },
  { id: "worldtree-log", name: "Worldtree Log", tier: 8, category: "wood", gatheredBy: "Forester", description: "Sacred wood from Yggdrasil", icon: "🌍" },

  { id: "pine-plank", name: "Pine Plank", tier: 1, category: "component", gatheredBy: null, description: "Processed pine wood", icon: "📏" },
  { id: "oak-plank", name: "Oak Plank", tier: 2, category: "component", gatheredBy: null, description: "Sturdy oak boards", icon: "🪵" },
  { id: "maple-plank", name: "Maple Plank", tier: 3, category: "component", gatheredBy: null, description: "Quality maple boards", icon: "🍂" },
  { id: "ash-plank", name: "Ash Plank", tier: 4, category: "component", gatheredBy: null, description: "Resilient ash boards", icon: "🌿" },
  { id: "ironwood-plank", name: "Ironwood Plank", tier: 5, category: "component", gatheredBy: null, description: "Metal-hard planks", icon: "🔨" },
  { id: "ebony-plank", name: "Ebony Plank", tier: 6, category: "component", gatheredBy: null, description: "Dark legendary planks", icon: "⬛" },
  { id: "wyrmwood-plank", name: "Wyrmwood Plank", tier: 7, category: "component", gatheredBy: null, description: "Dragon-touched planks", icon: "🔥" },
  { id: "worldtree-plank", name: "Worldtree Plank", tier: 8, category: "component", gatheredBy: null, description: "Sacred world planks", icon: "🌟" },

  { id: "linen-thread", name: "Linen Thread", tier: 1, category: "cloth", gatheredBy: "Mystic", description: "Basic plant fiber", icon: "🧵" },
  { id: "wool-thread", name: "Wool Thread", tier: 2, category: "cloth", gatheredBy: "Mystic", description: "Warm animal fiber", icon: "🐑" },
  { id: "cotton-thread", name: "Cotton Thread", tier: 3, category: "cloth", gatheredBy: "Mystic", description: "Soft quality fiber", icon: "☁️" },
  { id: "silk-thread", name: "Silk Thread", tier: 4, category: "cloth", gatheredBy: "Mystic", description: "Luxurious spider silk", icon: "🕸️" },
  { id: "moonweave-thread", name: "Moonweave Thread", tier: 5, category: "cloth", gatheredBy: "Mystic", description: "Lunar-infused fiber", icon: "🌙" },
  { id: "starweave-thread", name: "Starweave Thread", tier: 6, category: "cloth", gatheredBy: "Mystic", description: "Celestial fabric", icon: "⭐" },
  { id: "voidweave-thread", name: "Voidweave Thread", tier: 7, category: "cloth", gatheredBy: "Mystic", description: "Darkness-touched cloth", icon: "🕳️" },
  { id: "divine-thread", name: "Divine Thread", tier: 8, category: "cloth", gatheredBy: "Mystic", description: "Godly fabric", icon: "✨" },

  { id: "linen-cloth", name: "Linen Cloth", tier: 1, category: "component", gatheredBy: null, description: "Woven linen", icon: "📜" },
  { id: "wool-cloth", name: "Wool Cloth", tier: 2, category: "component", gatheredBy: null, description: "Woven wool fabric", icon: "🧣" },
  { id: "cotton-cloth", name: "Cotton Cloth", tier: 3, category: "component", gatheredBy: null, description: "Quality cotton fabric", icon: "🎗️" },
  { id: "silk-cloth", name: "Silk Cloth", tier: 4, category: "component", gatheredBy: null, description: "Luxurious silk fabric", icon: "👘" },
  { id: "moonweave-cloth", name: "Moonweave Cloth", tier: 5, category: "component", gatheredBy: null, description: "Lunar fabric", icon: "🌛" },
  { id: "starweave-cloth", name: "Starweave Cloth", tier: 6, category: "component", gatheredBy: null, description: "Star fabric", icon: "🌠" },
  { id: "voidweave-cloth", name: "Voidweave Cloth", tier: 7, category: "component", gatheredBy: null, description: "Void fabric", icon: "🌑" },
  { id: "divine-cloth", name: "Divine Cloth", tier: 8, category: "component", gatheredBy: null, description: "Holy fabric", icon: "💫" },

  { id: "rawhide", name: "Rawhide", tier: 1, category: "leather", gatheredBy: "Forester", description: "Untanned animal hide", icon: "🦴" },
  { id: "thick-hide", name: "Thick Hide", tier: 2, category: "leather", gatheredBy: "Forester", description: "Sturdy animal hide", icon: "🐂" },
  { id: "rugged-leather", name: "Rugged Leather", tier: 3, category: "leather", gatheredBy: "Forester", description: "Tanned quality hide", icon: "🧥" },
  { id: "hardened-leather", name: "Hardened Leather", tier: 4, category: "leather", gatheredBy: "Forester", description: "Reinforced leather", icon: "🛡️" },
  { id: "wyrm-leather", name: "Wyrm Leather", tier: 5, category: "leather", gatheredBy: "Forester", description: "Dragon scale leather", icon: "🐲" },
  { id: "infernal-leather", name: "Infernal Leather", tier: 6, category: "leather", gatheredBy: "Forester", description: "Demon hide leather", icon: "😈" },
  { id: "titan-leather", name: "Titan Leather", tier: 7, category: "leather", gatheredBy: "Forester", description: "Giant skin leather", icon: "🦣" },
  { id: "divine-leather", name: "Divine Leather", tier: 8, category: "leather", gatheredBy: "Forester", description: "Godly leather", icon: "👼" },

  { id: "minor-essence", name: "Minor Essence", tier: 1, category: "essence", gatheredBy: "Mystic", description: "Faint magical power", icon: "💧" },
  { id: "lesser-essence", name: "Lesser Essence", tier: 2, category: "essence", gatheredBy: "Mystic", description: "Weak magical energy", icon: "💙" },
  { id: "greater-essence", name: "Greater Essence", tier: 3, category: "essence", gatheredBy: "Mystic", description: "Moderate magic power", icon: "💜" },
  { id: "superior-essence", name: "Superior Essence", tier: 4, category: "essence", gatheredBy: "Mystic", description: "Strong magical force", icon: "🔮" },
  { id: "refined-essence", name: "Refined Essence", tier: 5, category: "essence", gatheredBy: "Mystic", description: "Purified magic", icon: "⚗️" },
  { id: "perfect-essence", name: "Perfect Essence", tier: 6, category: "essence", gatheredBy: "Mystic", description: "Flawless magical power", icon: "💎" },
  { id: "ancient-essence", name: "Ancient Essence", tier: 7, category: "essence", gatheredBy: "Mystic", description: "Primordial magic", icon: "🌀" },
  { id: "divine-essence", name: "Divine Essence", tier: 8, category: "essence", gatheredBy: "Mystic", description: "Godly magic power", icon: "👑" },

  { id: "rough-gem", name: "Rough Gem", tier: 1, category: "gem", gatheredBy: "Miner", description: "Uncut common stone", icon: "💠" },
  { id: "flawed-gem", name: "Flawed Gem", tier: 2, category: "gem", gatheredBy: "Miner", description: "Imperfect gemstone", icon: "🔷" },
  { id: "standard-gem", name: "Standard Gem", tier: 3, category: "gem", gatheredBy: "Miner", description: "Common quality gem", icon: "🔶" },
  { id: "fine-gem", name: "Fine Gem", tier: 4, category: "gem", gatheredBy: "Miner", description: "Quality gemstone", icon: "💎" },
  { id: "pristine-gem", name: "Pristine Gem", tier: 5, category: "gem", gatheredBy: "Miner", description: "Near-perfect gem", icon: "♦️" },
  { id: "flawless-gem", name: "Flawless Gem", tier: 6, category: "gem", gatheredBy: "Miner", description: "Perfect gemstone", icon: "🌟" },
  { id: "radiant-gem", name: "Radiant Gem", tier: 7, category: "gem", gatheredBy: "Miner", description: "Glowing magical gem", icon: "✨" },
  { id: "divine-gem", name: "Divine Gem", tier: 8, category: "gem", gatheredBy: "Miner", description: "Godly gemstone", icon: "👑" },

  { id: "coal", name: "Coal", tier: 1, category: "component", gatheredBy: "Miner", description: "Fuel for smelting", icon: "⚫" },
  { id: "flux", name: "Flux", tier: 2, category: "component", gatheredBy: "Miner", description: "Smelting additive", icon: "🧪" },
  { id: "string", name: "String", tier: 1, category: "component", gatheredBy: "Forester", description: "Plant fiber string", icon: "🧶" },
  { id: "bowstring", name: "Bowstring", tier: 2, category: "component", gatheredBy: "Forester", description: "Reinforced string", icon: "🎯" },

  { id: "salt", name: "Salt", tier: 1, category: "ingredient", gatheredBy: "Chef", description: "Cooking essential", icon: "🧂" },
  { id: "spice", name: "Spice", tier: 2, category: "ingredient", gatheredBy: "Chef", description: "Flavor enhancer", icon: "🌶️" },
  { id: "herb", name: "Herb", tier: 1, category: "ingredient", gatheredBy: "Chef", description: "Healing plant", icon: "🌿" },
  { id: "mushroom", name: "Mushroom", tier: 2, category: "ingredient", gatheredBy: "Chef", description: "Forest fungus", icon: "🍄" },
  { id: "raw-meat", name: "Raw Meat", tier: 1, category: "ingredient", gatheredBy: "Chef", description: "Animal protein", icon: "🥩" },
  { id: "prime-meat", name: "Prime Meat", tier: 3, category: "ingredient", gatheredBy: "Chef", description: "Quality cut", icon: "🍖" },
  { id: "raw-fish", name: "Raw Fish", tier: 1, category: "ingredient", gatheredBy: "Chef", description: "Fresh catch", icon: "🐟" },
  { id: "vegetables", name: "Vegetables", tier: 1, category: "ingredient", gatheredBy: "Chef", description: "Garden produce", icon: "🥕" },
  { id: "grain", name: "Grain", tier: 1, category: "ingredient", gatheredBy: "Chef", description: "Wheat and barley", icon: "🌾" },
  { id: "flour", name: "Flour", tier: 2, category: "component", gatheredBy: null, description: "Ground grain", icon: "🥖" },
  { id: "honey", name: "Honey", tier: 2, category: "ingredient", gatheredBy: "Chef", description: "Sweet bee nectar", icon: "🍯" },
  { id: "rare-spice", name: "Rare Spice", tier: 4, category: "ingredient", gatheredBy: "Chef", description: "Exotic flavoring", icon: "⭐" },
  { id: "dragon-pepper", name: "Dragon Pepper", tier: 6, category: "ingredient", gatheredBy: "Chef", description: "Extremely spicy", icon: "🔥" },
  { id: "celestial-herb", name: "Celestial Herb", tier: 7, category: "ingredient", gatheredBy: "Chef", description: "Heavenly plant", icon: "🌠" },
  { id: "divine-nectar", name: "Divine Nectar", tier: 8, category: "ingredient", gatheredBy: "Chef", description: "Godly ambrosia", icon: "👑" },

  { id: "bronze-gear", name: "Bronze Gear", tier: 1, category: "component", gatheredBy: null, description: "Basic mechanism", icon: "⚙️" },
  { id: "iron-gear", name: "Iron Gear", tier: 2, category: "component", gatheredBy: null, description: "Standard gear", icon: "🔧" },
  { id: "steel-gear", name: "Steel Gear", tier: 3, category: "component", gatheredBy: null, description: "Quality mechanism", icon: "🔩" },
  { id: "precision-gear", name: "Precision Gear", tier: 4, category: "component", gatheredBy: null, description: "Fine mechanism", icon: "⏱️" },
  { id: "clockwork-core", name: "Clockwork Core", tier: 5, category: "component", gatheredBy: null, description: "Complex mechanism", icon: "🎰" },
  { id: "arcane-gear", name: "Arcane Gear", tier: 6, category: "component", gatheredBy: null, description: "Magic-infused gear", icon: "🔮" },
  { id: "void-gear", name: "Void Gear", tier: 7, category: "component", gatheredBy: null, description: "Dimensional mechanism", icon: "🕳️" },
  { id: "divine-gear", name: "Divine Gear", tier: 8, category: "component", gatheredBy: null, description: "Godly mechanism", icon: "👑" },

  { id: "gunpowder", name: "Gunpowder", tier: 3, category: "component", gatheredBy: "Engineer", description: "Explosive powder", icon: "💥" },
  { id: "circuit", name: "Circuit", tier: 4, category: "component", gatheredBy: "Engineer", description: "Electrical component", icon: "📟" },
  { id: "lens", name: "Lens", tier: 3, category: "component", gatheredBy: "Engineer", description: "Optical glass", icon: "🔍" },
  { id: "spring", name: "Spring", tier: 2, category: "component", gatheredBy: "Engineer", description: "Coiled metal", icon: "🌀" },

  // INFUSION ESSENCES - Drops and Profession Tree Unlocks
  // Universal drops (can drop from any content)
  { id: "minor-infusion", name: "Minor Infusion Essence", tier: 1, category: "infusion", gatheredBy: null, description: "Basic upgrade material. +1 item iteration.", icon: "🔸", dropSource: "Common enemies" },
  { id: "lesser-infusion", name: "Lesser Infusion Essence", tier: 2, category: "infusion", gatheredBy: null, description: "Common upgrade material. +1 item iteration.", icon: "🔶", dropSource: "Uncommon enemies" },
  { id: "greater-infusion", name: "Greater Infusion Essence", tier: 3, category: "infusion", gatheredBy: null, description: "Quality upgrade material. +1 item iteration.", icon: "🟠", dropSource: "Rare enemies" },
  { id: "superior-infusion", name: "Superior Infusion Essence", tier: 4, category: "infusion", gatheredBy: null, description: "High-quality upgrade material. +2 item iterations.", icon: "🟧", dropSource: "Elite enemies" },
  { id: "perfect-infusion", name: "Perfect Infusion Essence", tier: 5, category: "infusion", gatheredBy: null, description: "Premium upgrade material. +2 item iterations.", icon: "💠", dropSource: "Boss drops" },
  
  // Miner Profession Infusions
  { id: "forge-infusion", name: "Forge Infusion Essence", tier: 3, category: "infusion", gatheredBy: "Miner", description: "Adds fire damage to weapons. Unlocked via Miner tree.", icon: "🔥", unlockNode: "Forge Master" },
  { id: "earthen-infusion", name: "Earthen Infusion Essence", tier: 4, category: "infusion", gatheredBy: "Miner", description: "Adds armor penetration. Unlocked via Miner tree.", icon: "🪨", unlockNode: "Deep Earth Mastery" },
  { id: "crystal-infusion", name: "Crystal Infusion Essence", tier: 5, category: "infusion", gatheredBy: "Miner", description: "Adds critical damage bonus. Unlocked via Miner tree.", icon: "💎", unlockNode: "Gem Cutter" },
  
  // Forester Profession Infusions
  { id: "verdant-infusion", name: "Verdant Infusion Essence", tier: 3, category: "infusion", gatheredBy: "Forester", description: "Adds nature damage. Unlocked via Forester tree.", icon: "🌿", unlockNode: "Nature's Touch" },
  { id: "beast-infusion", name: "Beast Infusion Essence", tier: 4, category: "infusion", gatheredBy: "Forester", description: "Adds lifesteal on hit. Unlocked via Forester tree.", icon: "🐾", unlockNode: "Beast Mastery" },
  { id: "primal-infusion", name: "Primal Infusion Essence", tier: 5, category: "infusion", gatheredBy: "Forester", description: "Adds attack speed bonus. Unlocked via Forester tree.", icon: "🦁", unlockNode: "Primal Fury" },
  
  // Mystic Profession Infusions
  { id: "arcane-infusion", name: "Arcane Infusion Essence", tier: 3, category: "infusion", gatheredBy: "Mystic", description: "Adds spell damage. Unlocked via Mystic tree.", icon: "✨", unlockNode: "Arcane Mastery" },
  { id: "void-infusion", name: "Void Infusion Essence", tier: 4, category: "infusion", gatheredBy: "Mystic", description: "Adds mana drain on hit. Unlocked via Mystic tree.", icon: "🌀", unlockNode: "Void Walker" },
  { id: "celestial-infusion", name: "Celestial Infusion Essence", tier: 5, category: "infusion", gatheredBy: "Mystic", description: "Adds cooldown reduction. Unlocked via Mystic tree.", icon: "⭐", unlockNode: "Celestial Weaver" },
  
  // Chef Profession Infusions
  { id: "vitality-infusion", name: "Vitality Infusion Essence", tier: 3, category: "infusion", gatheredBy: "Chef", description: "Adds health regeneration. Unlocked via Chef tree.", icon: "❤️", unlockNode: "Life Cook" },
  { id: "stamina-infusion", name: "Stamina Infusion Essence", tier: 4, category: "infusion", gatheredBy: "Chef", description: "Adds stamina regeneration. Unlocked via Chef tree.", icon: "💚", unlockNode: "Endurance Brewer" },
  { id: "elixir-infusion", name: "Elixir Infusion Essence", tier: 5, category: "infusion", gatheredBy: "Chef", description: "Adds buff duration bonus. Unlocked via Chef tree.", icon: "🧪", unlockNode: "Grand Alchemist" },
  
  // Engineer Profession Infusions
  { id: "mechanical-infusion", name: "Mechanical Infusion Essence", tier: 3, category: "infusion", gatheredBy: "Engineer", description: "Adds reload speed. Unlocked via Engineer tree.", icon: "⚙️", unlockNode: "Gear Master" },
  { id: "explosive-infusion", name: "Explosive Infusion Essence", tier: 4, category: "infusion", gatheredBy: "Engineer", description: "Adds area damage. Unlocked via Engineer tree.", icon: "💥", unlockNode: "Demolition Expert" },
  { id: "automaton-infusion", name: "Automaton Infusion Essence", tier: 5, category: "infusion", gatheredBy: "Engineer", description: "Adds summon damage bonus. Unlocked via Engineer tree.", icon: "🤖", unlockNode: "Automata Master" },
];

export const TIER_COSTS = {
  1: { gold: 100, materials: 5 },
  2: { gold: 200, materials: 10 },
  3: { gold: 400, materials: 15 },
  4: { gold: 800, materials: 20 },
  5: { gold: 1600, materials: 30 },
  6: { gold: 3200, materials: 45 },
  7: { gold: 6400, materials: 60 },
  8: { gold: 12800, materials: 80, requiresDivineEssence: true },
} as const;

export function getMaterialsByTier(tier: number): CraftingMaterial[] {
  return CRAFTING_MATERIALS.filter(m => m.tier === tier);
}

export function getMaterialsByCategory(category: CraftingMaterial["category"]): CraftingMaterial[] {
  return CRAFTING_MATERIALS.filter(m => m.category === category);
}

export function getMaterialsByProfession(profession: string): CraftingMaterial[] {
  return CRAFTING_MATERIALS.filter(m => m.gatheredBy === profession);
}

export function getMaterialById(id: string): CraftingMaterial | undefined {
  return CRAFTING_MATERIALS.find(m => m.id === id);
}

export function getTierCost(tier: number) {
  return TIER_COSTS[tier as keyof typeof TIER_COSTS] || TIER_COSTS[1];
}

export function getInfusionEssences(): CraftingMaterial[] {
  return CRAFTING_MATERIALS.filter(m => m.category === "infusion");
}

export function getDroppableInfusions(): CraftingMaterial[] {
  return CRAFTING_MATERIALS.filter(m => m.category === "infusion" && m.dropSource);
}

export function getProfessionInfusions(profession: string): CraftingMaterial[] {
  return CRAFTING_MATERIALS.filter(m => m.category === "infusion" && m.gatheredBy === profession);
}

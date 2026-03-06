import * as fs from 'fs';

const RED_PREFIXES = ["Classic", "Prime", "Grilled", "Slow-Cooked", "Herb-Crusted", "Marinated", "Smoked", "Seared"];
const GREEN_PREFIXES = ["Traditional", "Stuffed", "Veggie-Loaded", "Creamy", "Spicy", "Baked", "Grilled", "Herbed"];
const BLUE_PREFIXES = ["Traditional", "Spicy", "Creamy", "Broth-Based", "Grilled", "Stewed", "Raw", "Smoked"];

interface FoodEffect {
  stat: string;
  value: number;
  scaling: number;
}

interface FoodIngredient {
  name: string;
  amount: number;
  tierScaling: number;
}

interface FoodRecipe {
  id: string;
  baseName: string;
  category: "red" | "green" | "blue";
  effects: FoodEffect[];
  special?: string;
  specialTier?: number;
  tierPrefixes: string[];
  baseIngredients: FoodIngredient[];
  baseCookTime: number;
  cookTimePerTier: number;
}

const RED_FOODS: FoodRecipe[] = [
  {
    id: "beef-wellington", baseName: "Beef Wellington", category: "red",
    effects: [{ stat: "health", value: 10, scaling: 10 }],
    special: "Heal boost on low health (+25% heal received when below 30% HP)", specialTier: 5,
    tierPrefixes: RED_PREFIXES,
    baseIngredients: [
      { name: "Beast Hide", amount: 2, tierScaling: 1 },
      { name: "Common Herb", amount: 1, tierScaling: 1 },
      { name: "Blue Mushroom", amount: 1, tierScaling: 1 },
      { name: "Rough Leather", amount: 1, tierScaling: 0 }
    ],
    baseCookTime: 45, cookTimePerTier: 5
  },
  {
    id: "osso-buco", baseName: "Osso Buco", category: "red",
    effects: [{ stat: "damage", value: 3, scaling: 2 }],
    special: "Enhanced life steal (+50% lifesteal effectiveness)", specialTier: 5,
    tierPrefixes: RED_PREFIXES,
    baseIngredients: [
      { name: "Large Bones", amount: 2, tierScaling: 1 },
      { name: "Red Flower", amount: 2, tierScaling: 1 },
      { name: "Healing Moss", amount: 1, tierScaling: 1 },
      { name: "Common Herb", amount: 1, tierScaling: 0 }
    ],
    baseCookTime: 120, cookTimePerTier: 10
  },
  {
    id: "rack-of-lamb", baseName: "Rack of Lamb", category: "red",
    effects: [{ stat: "passiveHealing", value: 2, scaling: 2 }],
    special: "Regeneration persists through combat", specialTier: 5,
    tierPrefixes: RED_PREFIXES,
    baseIngredients: [
      { name: "Fine Leather", amount: 1, tierScaling: 1 },
      { name: "Sunleaf", amount: 2, tierScaling: 1 },
      { name: "Moonpetal", amount: 2, tierScaling: 1 },
      { name: "Common Herb", amount: 1, tierScaling: 0 }
    ],
    baseCookTime: 35, cookTimePerTier: 5
  },
  {
    id: "beef-bourguignon", baseName: "Beef Bourguignon", category: "red",
    effects: [
      { stat: "health", value: 8, scaling: 8 },
      { stat: "damage", value: 3, scaling: 2 }
    ],
    special: "Warm comfort (+10% all resistances)", specialTier: 5,
    tierPrefixes: RED_PREFIXES,
    baseIngredients: [
      { name: "Exotic Leather", amount: 3, tierScaling: 1 },
      { name: "Dragon's Breath", amount: 2, tierScaling: 1 },
      { name: "Mana Bloom", amount: 2, tierScaling: 1 },
      { name: "Thick Leather", amount: 2, tierScaling: 1 }
    ],
    baseCookTime: 180, cookTimePerTier: 15
  },
  {
    id: "steak-frites", baseName: "Steak Frites", category: "red",
    effects: [
      { stat: "damage", value: 4, scaling: 3 },
      { stat: "passiveHealing", value: 1, scaling: 1 }
    ],
    special: "Power surge (+15% attack speed for 30s after eating)", specialTier: 5,
    tierPrefixes: RED_PREFIXES,
    baseIngredients: [
      { name: "Monster Hide", amount: 1, tierScaling: 1 },
      { name: "Life Root", amount: 2, tierScaling: 1 },
      { name: "Healing Moss", amount: 1, tierScaling: 1 },
      { name: "Rough Stone", amount: 1, tierScaling: 0 }
    ],
    baseCookTime: 25, cookTimePerTier: 3
  },
  {
    id: "shepherds-pie", baseName: "Shepherd's Pie", category: "red",
    effects: [
      { stat: "health", value: 6, scaling: 5 },
      { stat: "passiveHealing", value: 2, scaling: 1.5 }
    ],
    special: "Comfort food (removes 1 debuff on consumption)", specialTier: 5,
    tierPrefixes: RED_PREFIXES,
    baseIngredients: [
      { name: "Fine Leather", amount: 2, tierScaling: 1 },
      { name: "Ethereal Orchid", amount: 2, tierScaling: 1 },
      { name: "Nightshade", amount: 2, tierScaling: 1 },
      { name: "Reinforced Bones", amount: 1, tierScaling: 1 }
    ],
    baseCookTime: 60, cookTimePerTier: 5
  },
  {
    id: "korean-bulgogi", baseName: "Korean Bulgogi", category: "red",
    effects: [
      { stat: "health", value: 5, scaling: 5 },
      { stat: "damage", value: 4, scaling: 3 },
      { stat: "passiveHealing", value: 1, scaling: 0.5 }
    ],
    special: "Fire affinity (+10% fire damage dealt)", specialTier: 5,
    tierPrefixes: RED_PREFIXES,
    baseIngredients: [
      { name: "Dragon Hide", amount: 2, tierScaling: 1 },
      { name: "Shadow Lotus", amount: 2, tierScaling: 1 },
      { name: "Spirit Herb", amount: 1, tierScaling: 1 },
      { name: "Ancient Bones", amount: 1, tierScaling: 1 }
    ],
    baseCookTime: 20, cookTimePerTier: 2
  },
  {
    id: "texas-brisket", baseName: "Texas-Style Smoked Brisket", category: "red",
    effects: [
      { stat: "health", value: 10, scaling: 8 },
      { stat: "damage", value: 3, scaling: 2 },
      { stat: "passiveHealing", value: 2, scaling: 1 }
    ],
    special: "Smoke infusion (+20% bleed resistance)", specialTier: 5,
    tierPrefixes: RED_PREFIXES,
    baseIngredients: [
      { name: "Celestial Hide", amount: 3, tierScaling: 2 },
      { name: "Celestial Bloom", amount: 2, tierScaling: 1 },
      { name: "Elderwood Log", amount: 2, tierScaling: 1 },
      { name: "Void Leather", amount: 2, tierScaling: 1 }
    ],
    baseCookTime: 720, cookTimePerTier: 60
  },
  {
    id: "venison-medallions", baseName: "Venison Medallions", category: "red",
    effects: [
      { stat: "health", value: 7, scaling: 6 },
      { stat: "damage", value: 5, scaling: 3 },
      { stat: "passiveHealing", value: 2, scaling: 1 }
    ],
    special: "Hunter's focus (+5% critical hit chance)", specialTier: 5,
    tierPrefixes: RED_PREFIXES,
    baseIngredients: [
      { name: "Titan Skin", amount: 2, tierScaling: 1 },
      { name: "Starflower", amount: 3, tierScaling: 1 },
      { name: "Spirit Wood", amount: 1, tierScaling: 1 },
      { name: "Blue Mushroom", amount: 2, tierScaling: 1 }
    ],
    baseCookTime: 30, cookTimePerTier: 4
  },
  {
    id: "chimichurri-steak", baseName: "Argentinian Chimichurri Skirt Steak", category: "red",
    effects: [
      { stat: "health", value: 8, scaling: 7 },
      { stat: "damage", value: 6, scaling: 4 },
      { stat: "passiveHealing", value: 2, scaling: 1 }
    ],
    special: "Herb vitality (+15% healing received)", specialTier: 5,
    tierPrefixes: RED_PREFIXES,
    baseIngredients: [
      { name: "Phoenix Feather", amount: 2, tierScaling: 1 },
      { name: "Phoenix Ash Flower", amount: 3, tierScaling: 2 },
      { name: "Dragon Heart Herb", amount: 2, tierScaling: 1 },
      { name: "Titan Root", amount: 2, tierScaling: 1 }
    ],
    baseCookTime: 20, cookTimePerTier: 2
  }
];

const GREEN_FOODS: FoodRecipe[] = [
  {
    id: "eggplant-parmesan", baseName: "Eggplant Parmesan", category: "green",
    effects: [{ stat: "stamina", value: 10, scaling: 8 }],
    special: "Quick reflexes (+10% dodge chance for 60s)", specialTier: 5,
    tierPrefixes: GREEN_PREFIXES,
    baseIngredients: [
      { name: "Red Flower", amount: 2, tierScaling: 1 },
      { name: "Blue Mushroom", amount: 2, tierScaling: 1 },
      { name: "Common Herb", amount: 1, tierScaling: 1 },
      { name: "Pine Log", amount: 1, tierScaling: 0 }
    ],
    baseCookTime: 45, cookTimePerTier: 5
  },
  {
    id: "spinach-lasagna", baseName: "Spinach and Ricotta Lasagna", category: "green",
    effects: [{ stat: "crit", value: 2, scaling: 1.5 }],
    special: "Iron fortitude (+15% stamina regeneration)", specialTier: 5,
    tierPrefixes: GREEN_PREFIXES,
    baseIngredients: [
      { name: "Moonpetal", amount: 3, tierScaling: 1 },
      { name: "Sunleaf", amount: 3, tierScaling: 1 },
      { name: "Healing Moss", amount: 2, tierScaling: 1 },
      { name: "Oak Log", amount: 1, tierScaling: 0 }
    ],
    baseCookTime: 60, cookTimePerTier: 5
  },
  {
    id: "mushroom-risotto", baseName: "Mushroom Risotto", category: "green",
    effects: [{ stat: "speed", value: 3, scaling: 2 }],
    special: "Earth attunement (+10% nature damage)", specialTier: 5,
    tierPrefixes: GREEN_PREFIXES,
    baseIngredients: [
      { name: "Blue Mushroom", amount: 4, tierScaling: 2 },
      { name: "Mana Bloom", amount: 2, tierScaling: 1 },
      { name: "Common Herb", amount: 2, tierScaling: 1 },
      { name: "Ironwood Log", amount: 1, tierScaling: 0 }
    ],
    baseCookTime: 35, cookTimePerTier: 4
  },
  {
    id: "chana-masala", baseName: "Chana Masala", category: "green",
    effects: [
      { stat: "stamina", value: 8, scaling: 6 },
      { stat: "crit", value: 2, scaling: 1 }
    ],
    special: "Spice rush (+20% movement speed burst on dodge)", specialTier: 5,
    tierPrefixes: GREEN_PREFIXES,
    baseIngredients: [
      { name: "Dragon's Breath", amount: 3, tierScaling: 1 },
      { name: "Nightshade", amount: 2, tierScaling: 1 },
      { name: "Life Root", amount: 2, tierScaling: 1 },
      { name: "Cedar Log", amount: 1, tierScaling: 1 }
    ],
    baseCookTime: 40, cookTimePerTier: 5
  },
  {
    id: "ratatouille", baseName: "Ratatouille", category: "green",
    effects: [
      { stat: "speed", value: 3, scaling: 2 },
      { stat: "dodge", value: 3, scaling: 1.5 }
    ],
    special: "Garden grace (+25% poison resistance)", specialTier: 5,
    tierPrefixes: GREEN_PREFIXES,
    baseIngredients: [
      { name: "Ethereal Orchid", amount: 2, tierScaling: 1 },
      { name: "Shadow Lotus", amount: 2, tierScaling: 1 },
      { name: "Mana Bloom", amount: 2, tierScaling: 1 },
      { name: "Elderwood Log", amount: 2, tierScaling: 1 }
    ],
    baseCookTime: 50, cookTimePerTier: 5
  },
  {
    id: "falafel-platter", baseName: "Falafel Platter", category: "green",
    effects: [
      { stat: "stamina", value: 7, scaling: 5 },
      { stat: "speed", value: 3, scaling: 2 }
    ],
    special: "Desert endurance (+20% stamina efficiency)", specialTier: 5,
    tierPrefixes: GREEN_PREFIXES,
    baseIngredients: [
      { name: "Spirit Herb", amount: 3, tierScaling: 1 },
      { name: "Celestial Bloom", amount: 2, tierScaling: 1 },
      { name: "Void Flower", amount: 2, tierScaling: 1 },
      { name: "Frostoak", amount: 1, tierScaling: 1 }
    ],
    baseCookTime: 30, cookTimePerTier: 3
  },
  {
    id: "butternut-ravioli", baseName: "Butternut Squash Ravioli", category: "green",
    effects: [
      { stat: "stamina", value: 6, scaling: 5 },
      { stat: "crit", value: 1, scaling: 1 },
      { stat: "speed", value: 2, scaling: 1 },
      { stat: "dodge", value: 2, scaling: 1 }
    ],
    special: "Autumn blessing (+10% all green food effects)", specialTier: 5,
    tierPrefixes: GREEN_PREFIXES,
    baseIngredients: [
      { name: "Starflower", amount: 2, tierScaling: 1 },
      { name: "Moonbloom", amount: 2, tierScaling: 1 },
      { name: "Sunpetal", amount: 1, tierScaling: 1 },
      { name: "Ancient Oak", amount: 2, tierScaling: 1 }
    ],
    baseCookTime: 45, cookTimePerTier: 5
  },
  {
    id: "quinoa-peppers", baseName: "Quinoa Stuffed Bell Peppers", category: "green",
    effects: [
      { stat: "stamina", value: 8, scaling: 6 },
      { stat: "crit", value: 1, scaling: 0.5 },
      { stat: "speed", value: 2, scaling: 1 },
      { stat: "dodge", value: 2, scaling: 1 }
    ],
    special: "Complete nutrition (+5% all stats for 5 min)", specialTier: 5,
    tierPrefixes: GREEN_PREFIXES,
    baseIngredients: [
      { name: "Phoenix Ash Flower", amount: 3, tierScaling: 1 },
      { name: "Dragon Heart Herb", amount: 2, tierScaling: 1 },
      { name: "Titan Root", amount: 2, tierScaling: 1 },
      { name: "World Tree Branch", amount: 1, tierScaling: 1 }
    ],
    baseCookTime: 40, cookTimePerTier: 4
  },
  {
    id: "vegetable-pad-thai", baseName: "Vegetable Pad Thai", category: "green",
    effects: [
      { stat: "stamina", value: 5, scaling: 4 },
      { stat: "crit", value: 2, scaling: 1.5 },
      { stat: "speed", value: 3, scaling: 2 },
      { stat: "dodge", value: 1, scaling: 0.5 }
    ],
    special: "Swift strikes (+10% attack speed)", specialTier: 5,
    tierPrefixes: GREEN_PREFIXES,
    baseIngredients: [
      { name: "Infinity Bloom", amount: 2, tierScaling: 1 },
      { name: "Godherb", amount: 2, tierScaling: 1 },
      { name: "Cosmic Lotus", amount: 2, tierScaling: 1 },
      { name: "Godwood", amount: 1, tierScaling: 1 }
    ],
    baseCookTime: 20, cookTimePerTier: 2
  },
  {
    id: "lentil-dahl", baseName: "Lentil Dahl", category: "green",
    effects: [
      { stat: "stamina", value: 7, scaling: 5 },
      { stat: "crit", value: 1, scaling: 1 },
      { stat: "speed", value: 2, scaling: 1 },
      { stat: "dodge", value: 3, scaling: 1.5 }
    ],
    special: "Inner warmth (+15% cold resistance)", specialTier: 5,
    tierPrefixes: GREEN_PREFIXES,
    baseIngredients: [
      { name: "Spirit Herb", amount: 3, tierScaling: 1 },
      { name: "Dreamwood", amount: 2, tierScaling: 1 },
      { name: "Life Root", amount: 2, tierScaling: 1 },
      { name: "Ether Wood", amount: 1, tierScaling: 1 }
    ],
    baseCookTime: 35, cookTimePerTier: 4
  }
];

const BLUE_FOODS: FoodRecipe[] = [
  {
    id: "bouillabaisse", baseName: "Bouillabaisse", category: "blue",
    effects: [{ stat: "mana", value: 15, scaling: 12 }],
    special: "Ocean's blessing (+15% water spell damage)", specialTier: 5,
    tierPrefixes: BLUE_PREFIXES,
    baseIngredients: [
      { name: "Common Fish", amount: 3, tierScaling: 1 },
      { name: "Clam", amount: 2, tierScaling: 1 },
      { name: "Salmon", amount: 1, tierScaling: 1 },
      { name: "Rough Stone", amount: 1, tierScaling: 0 }
    ],
    baseCookTime: 60, cookTimePerTier: 8
  },
  {
    id: "pan-seared-salmon", baseName: "Pan-Seared Salmon", category: "blue",
    effects: [{ stat: "spellDamage", value: 4, scaling: 3 }],
    special: "Mind clarity (+10% cooldown reduction)", specialTier: 5,
    tierPrefixes: BLUE_PREFIXES,
    baseIngredients: [
      { name: "Salmon", amount: 2, tierScaling: 1 },
      { name: "Sunleaf", amount: 1, tierScaling: 1 },
      { name: "Common Herb", amount: 2, tierScaling: 1 },
      { name: "Iron Ore", amount: 1, tierScaling: 0 }
    ],
    baseCookTime: 15, cookTimePerTier: 2
  },
  {
    id: "grilled-lobster", baseName: "Grilled Lobster", category: "blue",
    effects: [{ stat: "manaRegen", value: 3, scaling: 2 }],
    special: "Arcane surge (+20% max mana for 5 min)", specialTier: 5,
    tierPrefixes: BLUE_PREFIXES,
    baseIngredients: [
      { name: "Lobster", amount: 1, tierScaling: 1 },
      { name: "Healing Moss", amount: 2, tierScaling: 1 },
      { name: "Moonpetal", amount: 2, tierScaling: 1 },
      { name: "Copper Ore", amount: 1, tierScaling: 0 }
    ],
    baseCookTime: 20, cookTimePerTier: 3
  },
  {
    id: "seared-tuna", baseName: "Seared Tuna Steak", category: "blue",
    effects: [
      { stat: "mana", value: 10, scaling: 8 },
      { stat: "spellDamage", value: 5, scaling: 3 }
    ],
    special: "Precision casting (+15% spell critical damage)", specialTier: 5,
    tierPrefixes: BLUE_PREFIXES,
    baseIngredients: [
      { name: "Tuna", amount: 2, tierScaling: 1 },
      { name: "Sea Urchin", amount: 2, tierScaling: 1 },
      { name: "Dragon's Breath", amount: 1, tierScaling: 1 },
      { name: "Gold Ore", amount: 1, tierScaling: 0 }
    ],
    baseCookTime: 10, cookTimePerTier: 1
  },
  {
    id: "seafood-paella", baseName: "Seafood Paella", category: "blue",
    effects: [
      { stat: "manaRegen", value: 3, scaling: 2 },
      { stat: "spellCrit", value: 3, scaling: 1.5 }
    ],
    special: "Party feast (+5% all stats to nearby allies)", specialTier: 5,
    tierPrefixes: BLUE_PREFIXES,
    baseIngredients: [
      { name: "Golden Fish", amount: 2, tierScaling: 1 },
      { name: "Giant Crab", amount: 2, tierScaling: 1 },
      { name: "Pearl Oyster", amount: 2, tierScaling: 1 },
      { name: "Mithril Ore", amount: 1, tierScaling: 1 }
    ],
    baseCookTime: 45, cookTimePerTier: 5
  },
  {
    id: "crab-cakes", baseName: "Crab Cakes", category: "blue",
    effects: [
      { stat: "mana", value: 8, scaling: 6 },
      { stat: "manaRegen", value: 3, scaling: 2 }
    ],
    special: "Shell shield (+15% magic damage reduction)", specialTier: 5,
    tierPrefixes: BLUE_PREFIXES,
    baseIngredients: [
      { name: "Giant Crab", amount: 3, tierScaling: 1 },
      { name: "Black Pearl", amount: 1, tierScaling: 1 },
      { name: "Moonfish", amount: 1, tierScaling: 1 },
      { name: "Obsidian", amount: 1, tierScaling: 0 }
    ],
    baseCookTime: 20, cookTimePerTier: 2
  },
  {
    id: "shrimp-scampi", baseName: "Shrimp Scampi", category: "blue",
    effects: [
      { stat: "mana", value: 10, scaling: 8 },
      { stat: "spellDamage", value: 3, scaling: 2 },
      { stat: "manaRegen", value: 3, scaling: 2 },
      { stat: "spellCrit", value: 1, scaling: 0.5 }
    ],
    special: "Mana fountain (+25% mana regeneration)", specialTier: 5,
    tierPrefixes: BLUE_PREFIXES,
    baseIngredients: [
      { name: "Void Fish", amount: 2, tierScaling: 1 },
      { name: "Abyssal Eel", amount: 2, tierScaling: 1 },
      { name: "Star Pearl", amount: 1, tierScaling: 1 },
      { name: "Prismatic Crystal", amount: 1, tierScaling: 1 }
    ],
    baseCookTime: 25, cookTimePerTier: 3
  },
  {
    id: "fish-tacos", baseName: "Fish Tacos", category: "blue",
    effects: [
      { stat: "mana", value: 6, scaling: 5 },
      { stat: "spellDamage", value: 3, scaling: 2 },
      { stat: "manaRegen", value: 2, scaling: 1 },
      { stat: "spellCrit", value: 3, scaling: 1.5 }
    ],
    special: "Lucky catch (+10% rare drop chance)", specialTier: 5,
    tierPrefixes: BLUE_PREFIXES,
    baseIngredients: [
      { name: "Celestial Koi", amount: 2, tierScaling: 1 },
      { name: "Moon Pearl", amount: 2, tierScaling: 1 },
      { name: "Spirit Herb", amount: 2, tierScaling: 1 },
      { name: "Moonstone", amount: 1, tierScaling: 1 }
    ],
    baseCookTime: 15, cookTimePerTier: 2
  },
  {
    id: "clam-chowder", baseName: "Clam Chowder", category: "blue",
    effects: [
      { stat: "mana", value: 12, scaling: 10 },
      { stat: "spellDamage", value: 2, scaling: 1 },
      { stat: "manaRegen", value: 4, scaling: 2 },
      { stat: "spellCrit", value: 1, scaling: 0.5 }
    ],
    special: "Coastal resilience (+20% frost resistance)", specialTier: 5,
    tierPrefixes: BLUE_PREFIXES,
    baseIngredients: [
      { name: "Phoenix Fin", amount: 2, tierScaling: 1 },
      { name: "Dragon Turtle", amount: 2, tierScaling: 1 },
      { name: "Sun Pearl", amount: 1, tierScaling: 1 },
      { name: "Dragon Scale Ore", amount: 1, tierScaling: 1 }
    ],
    baseCookTime: 40, cookTimePerTier: 5
  },
  {
    id: "octopus-carpaccio", baseName: "Octopus Carpaccio", category: "blue",
    effects: [
      { stat: "mana", value: 10, scaling: 8 },
      { stat: "spellDamage", value: 5, scaling: 4 },
      { stat: "manaRegen", value: 2, scaling: 1 },
      { stat: "spellCrit", value: 2, scaling: 1 }
    ],
    special: "Tentacle touch (+2 spell multi-target)", specialTier: 5,
    tierPrefixes: BLUE_PREFIXES,
    baseIngredients: [
      { name: "Infinity Fish", amount: 2, tierScaling: 1 },
      { name: "Worldsea Creature", amount: 1, tierScaling: 1 },
      { name: "Cosmic Pearl", amount: 1, tierScaling: 1 },
      { name: "Worldcore Gem", amount: 1, tierScaling: 1 }
    ],
    baseCookTime: 90, cookTimePerTier: 10
  }
];

const ALL_FOOD_RECIPES = [...RED_FOODS, ...GREEN_FOODS, ...BLUE_FOODS];

function generateTieredFood(recipe: FoodRecipe, tier: number) {
  const prefix = recipe.tierPrefixes[tier - 1] || recipe.tierPrefixes[0];
  const effects = recipe.effects.map(e => ({
    stat: e.stat,
    value: Math.floor(e.value + e.scaling * (tier - 1))
  }));
  
  const hasSpecial = recipe.special && recipe.specialTier && tier >= recipe.specialTier;
  
  const ingredients = recipe.baseIngredients.map(ing => ({
    name: ing.name,
    amount: ing.amount + Math.floor((ing.tierScaling || 0) * (tier - 1))
  }));
  
  const cookTime = recipe.baseCookTime + recipe.cookTimePerTier * (tier - 1);
  
  return {
    id: `${recipe.id}-t${tier}`,
    name: `${prefix} ${recipe.baseName}`,
    baseName: recipe.baseName,
    tier,
    category: recipe.category,
    effects,
    special: hasSpecial ? recipe.special : undefined,
    specialTier: recipe.specialTier,
    ingredients,
    cookTime
  };
}

function generateCSV(): string {
  const headers = [
    'ID', 'Name', 'Base Name', 'Tier', 'Category',
    'Effect 1', 'Effect 1 Value', 'Effect 2', 'Effect 2 Value',
    'Effect 3', 'Effect 3 Value', 'Effect 4', 'Effect 4 Value',
    'Special Effect', 'Special Tier',
    'Ingredient 1', 'Amount 1', 'Ingredient 2', 'Amount 2',
    'Ingredient 3', 'Amount 3', 'Ingredient 4', 'Amount 4',
    'Cook Time (min)'
  ];
  
  const rows: string[][] = [headers];
  
  for (const recipe of ALL_FOOD_RECIPES) {
    for (let tier = 1; tier <= 8; tier++) {
      const food = generateTieredFood(recipe, tier);
      
      const row: string[] = [
        food.id,
        food.name,
        food.baseName,
        tier.toString(),
        food.category.toUpperCase(),
      ];
      
      for (let i = 0; i < 4; i++) {
        if (food.effects[i]) {
          row.push(food.effects[i].stat, food.effects[i].value.toString());
        } else {
          row.push('', '');
        }
      }
      
      row.push(food.special || '', food.specialTier?.toString() || '');
      
      for (let i = 0; i < 4; i++) {
        if (food.ingredients[i]) {
          row.push(food.ingredients[i].name, food.ingredients[i].amount.toString());
        } else {
          row.push('', '');
        }
      }
      
      row.push(food.cookTime.toString());
      
      rows.push(row);
    }
  }
  
  return rows.map(row => row.map(cell => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  }).join(',')).join('\n');
}

const csv = generateCSV();
fs.writeFileSync('foods_export.csv', csv);
console.log('CSV file generated: foods_export.csv');
console.log(`Total rows: ${ALL_FOOD_RECIPES.length * 8} foods (${ALL_FOOD_RECIPES.length} recipes × 8 tiers)`);

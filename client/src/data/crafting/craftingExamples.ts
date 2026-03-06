/**
 * GRUDGE Warlords - Scriptable Crafting Examples
 * 
 * This file provides examples for extending the crafting system.
 * Use these templates to add new weapons, armor, consumables, and resources.
 * 
 * IMPORTANT: This file imports canonical data from tieredCrafting.ts.
 * Always use the exported constants from there to ensure consistency.
 */

import { 
  TIERS,
  TIER_LABELS,
  TIER_MATERIALS,
  TIER_COSTS,
  WEAPON_SETS,
  ARMOR_SETS,
  ARMOR_SLOTS,
  ARMOR_MATERIALS,
  CONSUMABLE_SETS,
} from './tieredCrafting';
import type { TieredRecipe, Tier, SkillCraftingBonus } from './tieredCrafting';

// ============================================================================
// RE-EXPORT CANONICAL DATA FOR SCRIPTING REFERENCE
// ============================================================================

/**
 * These are the canonical tier system constants from tieredCrafting.ts
 * Use these directly when scripting new content.
 */
export { TIERS, TIER_LABELS, TIER_MATERIALS, TIER_COSTS };

/**
 * Profession stations map - use when setting recipe.station
 */
export const PROFESSION_STATIONS: Record<string, string> = {
  Miner: 'Smithing Table',
  Forester: 'Lumber Table',
  Mystic: 'Loom Table',
  Chef: 'Cooking Table',
  Engineer: 'Tinker Table',
};

/**
 * Helper to get material name for a specific tier
 */
export function getMaterialForTier(tier: Tier, category: keyof typeof TIER_MATERIALS): string {
  return TIER_MATERIALS[category][tier - 1];
}

// ============================================================================
// EXAMPLE 1: NEW WEAPON DEFINITION
// ============================================================================

/**
 * To add a new weapon type, define it in a weapon set array.
 * Each weapon needs: id, name, lore, primaryStat, secondaryStat
 * Optional: element (for magic weapons)
 */
export const EXAMPLE_NEW_WEAPON_SET = {
  spears: [
    { 
      id: 'iron-spear', 
      name: 'Iron Spear', 
      lore: 'A basic polearm for thrusting attacks', 
      primaryStat: 'damage', 
      secondaryStat: 'reach' 
    },
    { 
      id: 'war-pike', 
      name: 'War Pike', 
      lore: 'Military-grade piercing weapon', 
      primaryStat: 'armorPen', 
      secondaryStat: 'damage' 
    },
    { 
      id: 'dragon-lance', 
      name: 'Dragon Lance', 
      lore: 'Forged to pierce dragon scales', 
      primaryStat: 'damage', 
      secondaryStat: 'critChance' 
    },
  ],
};

/**
 * Example: Generate tiered recipes for a new weapon set
 * This shows how the generator creates T1-T8 versions
 */
export function generateSpearRecipes(): TieredRecipe[] {
  const recipes: TieredRecipe[] = [];
  
  for (const spear of EXAMPLE_NEW_WEAPON_SET.spears) {
    for (const tier of TIERS) {
      const baseCount = TIER_COSTS.baseMaterialCount[tier - 1];
      
      const materials: Record<string, number> = {
        [getMaterialForTier(tier, 'ingot')]: baseCount,
        [getMaterialForTier(tier, 'plank')]: Math.max(1, Math.floor(baseCount / 2)),
      };
      
      if (tier >= 4) {
        materials[getMaterialForTier(tier, 'essence')] = Math.floor((tier - 3) * 1.5);
      }
      if (tier >= 5) {
        materials[getMaterialForTier(tier, 'gem')] = Math.floor((tier - 4) / 2) + 1;
      }
      
      recipes.push({
        id: `${spear.id}-t${tier}`,
        baseId: spear.id,
        name: `${spear.name} T${tier}`,
        tier,
        tierLabel: `T${tier}`,
        type: 'weapon',
        subtype: 'Spear',
        station: PROFESSION_STATIONS.Miner,
        craftingTime: TIER_COSTS.craftingTime[tier - 1],
        successChance: TIER_COSTS.successChance[tier - 1],
        materials,
        description: spear.lore,
        craftedBy: 'Miner',
        primaryStat: spear.primaryStat,
        secondaryStat: spear.secondaryStat,
      });
    }
  }
  
  return recipes;
}

// ============================================================================
// EXAMPLE 2: NEW ARMOR SET DEFINITION
// ============================================================================

/**
 * Armor sets have a name, lore, and set bonus.
 * Each set can be crafted in metal, leather, or cloth variants.
 */
export const EXAMPLE_NEW_ARMOR_SET = {
  ironclad: {
    name: 'Ironclad',
    lore: 'Forged in the deepest mines, unyielding and heavy',
    setBonus: 'Ironclad Fortitude: +25% block chance when below 50% HP',
    slots: ['helm', 'shoulder', 'chest', 'hands', 'feet', 'ring', 'necklace', 'relic'],
  },
};

/**
 * Example armor piece recipe (T1 and T8 comparison)
 */
export const EXAMPLE_ARMOR_RECIPES: TieredRecipe[] = [
  {
    id: 'ironclad-metal-chest-t1',
    baseId: 'ironclad-metal-chest',
    name: 'Ironclad Chestplate (Metal) T1',
    tier: 1,
    tierLabel: 'T1',
    type: 'armor',
    subtype: 'Metal Chest',
    station: 'Smithing Table',
    craftingTime: '5',
    successChance: 100,
    materials: {
      'Copper Ingot': 5,
      'Rawhide': 2,
    },
    description: 'Forged in the deepest mines, unyielding and heavy',
    craftedBy: 'Miner',
    setName: 'Ironclad',
    slot: 'chest',
  },
  {
    id: 'ironclad-metal-chest-t8',
    baseId: 'ironclad-metal-chest',
    name: 'Ironclad Chestplate (Metal) T8',
    tier: 8,
    tierLabel: 'T8',
    type: 'armor',
    subtype: 'Metal Chest',
    station: 'Smithing Table',
    craftingTime: '600',
    successChance: 45,
    materials: {
      'Divine Ingot': 75,
      'Divine Hide': 25,
      'Divine Essence': 5,
      'Divine Gem': 2,
    },
    description: 'Forged in the deepest mines, unyielding and heavy',
    craftedBy: 'Miner',
    setName: 'Ironclad',
    slot: 'chest',
  },
];

// ============================================================================
// EXAMPLE 3: NEW CONSUMABLE DEFINITION
// ============================================================================

/**
 * Consumables include potions, bandages, grenades, traps, etc.
 * Each has an id, name, lore, and effect description.
 */
export const EXAMPLE_NEW_CONSUMABLES = {
  potions: [
    { 
      id: 'health-potion', 
      name: 'Health Potion', 
      lore: 'Restores vitality instantly', 
      effect: 'Instantly restores 20% HP (scales with tier)' 
    },
    { 
      id: 'mana-potion', 
      name: 'Mana Potion', 
      lore: 'Replenishes magical energy', 
      effect: 'Instantly restores 20% Mana (scales with tier)' 
    },
    { 
      id: 'rage-elixir', 
      name: 'Rage Elixir', 
      lore: 'Fury in a bottle', 
      effect: '+30% damage for 15 seconds' 
    },
  ],
  
  scrolls: [
    { 
      id: 'teleport-scroll', 
      name: 'Teleport Scroll', 
      lore: 'Rips through space itself', 
      effect: 'Teleport to bound location' 
    },
    { 
      id: 'identify-scroll', 
      name: 'Identify Scroll', 
      lore: 'Reveals hidden properties', 
      effect: 'Identifies unknown items' 
    },
  ],
};

/**
 * Example: Generate tiered potion recipes
 */
export function generatePotionRecipes(): TieredRecipe[] {
  const recipes: TieredRecipe[] = [];
  
  for (const potion of EXAMPLE_NEW_CONSUMABLES.potions) {
    for (const tier of TIERS) {
      const materials: Record<string, number> = {
        [getMaterialForTier(tier, 'essence')]: tier,
        'Herbs': tier * 2,
        'Glass Vial': 1,
      };
      
      recipes.push({
        id: `${potion.id}-t${tier}`,
        baseId: potion.id,
        name: `${potion.name} T${tier}`,
        tier,
        tierLabel: `T${tier}`,
        type: 'consumable',
        subtype: 'Potion',
        station: PROFESSION_STATIONS.Chef,
        craftingTime: TIER_COSTS.craftingTime[tier - 1],
        successChance: TIER_COSTS.successChance[tier - 1] + 5,
        materials,
        description: potion.effect,
        craftedBy: 'Chef',
      });
    }
  }
  
  return recipes;
}

// ============================================================================
// EXAMPLE 4: NEW RESOURCE/MATERIAL DEFINITION
// ============================================================================

/**
 * Refined resources are crafted from raw materials.
 * Each tier has a specific raw material and refined output.
 */
export const EXAMPLE_NEW_REFINING = {
  gemCutting: {
    profession: 'Miner' as const,
    type: 'Gem Cutting',
    rawMaterials: [
      'Rough Crystal', 'Flawed Crystal', 'Standard Crystal', 'Fine Crystal',
      'Pristine Crystal', 'Flawless Crystal', 'Radiant Crystal', 'Divine Crystal'
    ],
    refinedOutputs: [
      'Cut Rough Gem', 'Cut Flawed Gem', 'Cut Standard Gem', 'Cut Fine Gem',
      'Cut Pristine Gem', 'Cut Flawless Gem', 'Cut Radiant Gem', 'Cut Divine Gem'
    ],
  },
};

/**
 * Example: Generate gem cutting refining recipes
 */
export function generateGemCuttingRecipes(): TieredRecipe[] {
  const recipes: TieredRecipe[] = [];
  const config = EXAMPLE_NEW_REFINING.gemCutting;
  
  for (const tier of TIERS) {
    const inputMaterial = config.rawMaterials[tier - 1];
    const outputMaterial = config.refinedOutputs[tier - 1];
    const baseCount = TIER_COSTS.baseMaterialCount[tier - 1];
    
    const materials: Record<string, number> = {
      [inputMaterial]: baseCount,
    };
    
    if (tier >= 5) {
      materials[getMaterialForTier(tier, 'essence')] = 1;
    }
    
    recipes.push({
      id: `refine-gem-t${tier}`,
      baseId: 'refine-gem',
      name: outputMaterial,
      tier,
      tierLabel: `T${tier}`,
      type: 'material',
      subtype: config.type,
      station: PROFESSION_STATIONS[config.profession],
      craftingTime: TIER_COSTS.craftingTime[tier - 1],
      successChance: Math.min(100, TIER_COSTS.successChance[tier - 1] + 5),
      materials,
      description: `Refined ${config.type.toLowerCase()}`,
      craftedBy: config.profession,
    });
  }
  
  return recipes;
}

// ============================================================================
// EXAMPLE 5: SKILL CRAFTING BONUSES
// ============================================================================

/**
 * Skill nodes can provide crafting bonuses.
 * Types: materialReduction, successChance, qualityBoost, speedBoost, tierUnlock
 */
export const EXAMPLE_SKILL_BONUSES: SkillCraftingBonus[] = [
  {
    skillNodeId: 'miner-spears-1',
    bonusType: 'materialReduction',
    bonusValue: 5,
    affectedRecipes: ['Spear'],
    description: '5% material reduction for spear crafting',
  },
  {
    skillNodeId: 'miner-spears-2',
    bonusType: 'successChance',
    bonusValue: 5,
    affectedRecipes: ['Spear'],
    description: '+5% spear crafting success rate',
  },
  {
    skillNodeId: 'miner-spears-3',
    bonusType: 'tierUnlock',
    bonusValue: 1,
    affectedRecipes: ['Spear'],
    description: 'Unlock T7 spear crafting',
  },
  {
    skillNodeId: 'miner-spears-4',
    bonusType: 'tierUnlock',
    bonusValue: 1,
    affectedRecipes: ['Spear'],
    description: 'Unlock T8 spear crafting',
  },
  {
    skillNodeId: 'chef-potions-1',
    bonusType: 'qualityBoost',
    bonusValue: 15,
    affectedRecipes: ['Potion'],
    description: '15% chance for enhanced potion effects',
  },
  {
    skillNodeId: 'chef-potions-2',
    bonusType: 'speedBoost',
    bonusValue: 25,
    affectedRecipes: ['Potion'],
    description: '25% faster potion brewing',
  },
];

// ============================================================================
// EXAMPLE 6: TIER PROGRESSION TABLE
// ============================================================================

/**
 * Quick reference for tier progression and material scaling
 */
export const TIER_PROGRESSION_TABLE = {
  headers: ['Tier', 'Label', 'Materials', 'Gold', 'Time (s)', 'Success %', 'Essence?', 'Gems?'],
  rows: [
    ['T1', 'Basic',     3,  100,   5, 100, 'No', 'No'],
    ['T2', 'Common',    5,  200,  10,  98, 'No', 'No'],
    ['T3', 'Uncommon',  8,  400,  20,  95, 'No', 'No'],
    ['T4', 'Rare',     12,  800,  40,  90, 'Yes (T4+)', 'No'],
    ['T5', 'Epic',     18, 1600,  80,  82, 'Yes', 'Yes (T5+)'],
    ['T6', 'Legendary',25, 3200, 160,  72, 'Yes', 'Yes'],
    ['T7', 'Mythic',   35, 6400, 320,  60, 'Yes', 'Yes'],
    ['T8', 'Divine',   50,12800, 600,  45, 'Yes', 'Yes'],
  ],
};

// ============================================================================
// EXAMPLE 7: PROFESSION CRAFTING ASSIGNMENTS
// ============================================================================

/**
 * Reference for which profession crafts what
 */
export const PROFESSION_CRAFTING_GUIDE = {
  Miner: {
    station: 'Smithing Table',
    primaryMaterial: 'ingot',
    crafts: ['Metal Armor', 'Swords', 'Greatswords', 'Daggers', '2H Hammers'],
    refines: ['Ore → Ingot'],
  },
  Forester: {
    station: 'Lumber Table',
    primaryMaterial: 'plank',
    crafts: ['Leather Armor', 'Bows', '1H/2H Axes', 'Nature Staves', 'Shared Daggers'],
    refines: ['Log → Plank'],
  },
  Mystic: {
    station: 'Loom Table',
    primaryMaterial: 'fabric',
    crafts: ['Cloth Armor', 'Capes/Backs', 'Bandages', 'Fire/Frost/Holy/Lightning/Arcane Staves'],
    refines: ['Thread → Fabric'],
  },
  Engineer: {
    station: 'Tinker Table',
    primaryMaterial: 'ingot',
    crafts: ['Crossbows', 'Guns', '1H Hammers', 'ThunderGrudge Staff', 'Grenades', 'Scopes', 'Traps', 'Siege Equipment', 'Fishing Lures'],
    refines: ['Components', 'Gunpowder'],
  },
  Chef: {
    station: 'Cooking Table',
    primaryMaterial: 'ingredients',
    crafts: ['Potions', 'Buff Foods', 'Elixirs'],
    refines: ['Ingredients', 'Herbs'],
  },
};

// ============================================================================
// HELPER: Calculate crafting cost for a recipe
// ============================================================================

export function calculateCraftingCost(recipe: TieredRecipe): {
  goldCost: number;
  totalMaterials: number;
  estimatedTime: string;
} {
  const tier = recipe.tier;
  const goldCost = TIER_COSTS.gold[tier - 1];
  const totalMaterials = Object.values(recipe.materials).reduce((sum, count) => sum + count, 0);
  
  const estimatedTime = recipe.craftingTime;
  
  return { goldCost, totalMaterials, estimatedTime };
}

// ============================================================================
// USAGE EXAMPLE: Printing recipe details
// ============================================================================

export function printRecipeDetails(recipe: TieredRecipe): void {
  const cost = calculateCraftingCost(recipe);
  
  console.log(`\n=== ${recipe.name} ===`);
  console.log(`Type: ${recipe.type} | Subtype: ${recipe.subtype}`);
  console.log(`Tier: ${recipe.tierLabel} | Crafted By: ${recipe.craftedBy}`);
  console.log(`Station: ${recipe.station}`);
  console.log(`Success Chance: ${recipe.successChance}%`);
  console.log(`Crafting Time: ${cost.estimatedTime}`);
  console.log(`Gold Cost: ${cost.goldCost}g`);
  console.log('\nMaterials:');
  for (const [material, count] of Object.entries(recipe.materials)) {
    console.log(`  - ${material}: ${count}`);
  }
  console.log(`\n"${recipe.description}"`);
}

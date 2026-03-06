export type CraftingBonusType = 
  | 'qualityBoost'      // % chance for higher quality item
  | 'successChance'     // % increase to crafting success
  | 'materialReduction' // % reduction in material costs
  | 'speedBoost'        // % faster crafting time
  | 'tierUnlock'        // unlocks higher tier crafting
  | 'doubleYield'       // % chance to produce 2 items
  | 'socketChance'      // % chance to add gem socket
  | 'enchantPower'      // % stronger enchantments
  | 'essenceEfficiency' // % less essence consumed
  | 'gemQuality';       // % chance for better gem cuts

export interface CraftingBonus {
  type: CraftingBonusType;
  value: number;
  target?: string; // specific item type affected (e.g., "staffs", "cloth", "gems")
}

export type NodeType = 'stat' | 'effect' | 'combat' | 'recipe';

export interface TreeNode {
  id: number;
  n: string; // name
  x: number; // x position %
  y: number; // y position %
  req: number; // level required
  p: number | null; // parent id
  desc?: string; // tooltip description
  branch?: string; // constellation/branch name
  bonuses?: CraftingBonus[]; // crafting bonuses granted
  unlocks?: string[]; // recipes/items unlocked
  nodeType?: NodeType; // stat=circle, effect=diamond, combat=star, recipe=scroll
  icon?: string; // URL to custom icon image
}

export type FoodCategory = 'red' | 'green' | 'blue';

export interface ProfessionRecipe {
  id: number | string;
  n: string; // name
  lvl?: number;
  icon?: string; // emoji or url
  mats?: Record<string, number>; // material name -> quantity
  spec?: number | null; // specialized node id requirement
  type?: string; // Weapon, Armor, Potion, etc.
  desc?: string;
  category?: FoodCategory; // For Chef: red=meats, green=veggies, blue=stews
}

export interface ProfessionData {
  name: string;
  role: string;
  color: string;
  icon: string;
  bgImage?: string; // Added background image
  treeData: TreeNode[];
  recipes: ProfessionRecipe[];
  inventory: Record<string, number>;
}

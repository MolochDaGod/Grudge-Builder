export type CraftingBonusType = 
  | 'qualityBoost'
  | 'successChance'
  | 'materialReduction'
  | 'speedBoost'
  | 'tierUnlock'
  | 'doubleYield'
  | 'socketChance'
  | 'enchantPower'
  | 'essenceEfficiency'
  | 'gemQuality';

export interface CraftingBonus {
  type: CraftingBonusType;
  value: number;
  target?: string;
}

export type NodeType = 'stat' | 'effect' | 'combat' | 'recipe';

export interface TreeNode {
  id: number;
  n: string;
  x: number;
  y: number;
  req: number;
  p: number | null;
  desc?: string;
  branch?: string;
  bonuses?: CraftingBonus[];
  unlocks?: string[];
  nodeType?: NodeType;
  icon?: string;
}

export type FoodCategory = 'red' | 'green' | 'blue';

export interface Recipe {
  id: number | string;
  n: string;
  lvl?: number;
  icon?: string;
  mats?: Record<string, number>;
  spec?: number | null;
  type?: string;
  desc?: string;
  category?: FoodCategory;
}

export interface ProfessionData {
  name: string;
  role: string;
  color: string;
  icon: string;
  bgImage?: string;
  treeData: TreeNode[];
  recipes: Recipe[];
  inventory: Record<string, number>;
}

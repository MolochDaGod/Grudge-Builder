import { puterKV, puterIslandKV, isPuterAvailable } from "./puterIntegration";
import { v4 as uuidv4 } from 'uuid';
import { assetUrl } from "@/lib/assetConfig";

export interface LootDrop {
  itemId: string;
  name: string;
  chance: number;
  minQuantity: number;
  maxQuantity: number;
  tier?: number;
  rarity?: string;
}

export type NodeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface NodeRarityConfig {
  name: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  spawnChance: number;
  gatherBonus: number;
  xpMultiplier: number;
  lootMultiplier: number;
  animated?: boolean;
}

export const NODE_RARITY_CONFIG: Record<NodeRarity, NodeRarityConfig> = {
  common: {
    name: 'Common',
    color: '#d4d4d4',
    textColor: 'text-slate-300',
    bgColor: 'bg-slate-700/80',
    borderColor: 'border-slate-500',
    spawnChance: 0.65,
    gatherBonus: 0,
    xpMultiplier: 1.0,
    lootMultiplier: 1.0,
  },
  rare: {
    name: 'Rare',
    color: '#3b82f6',
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-900/80',
    borderColor: 'border-blue-500',
    spawnChance: 0.25,
    gatherBonus: 0.15,
    xpMultiplier: 1.5,
    lootMultiplier: 1.25,
  },
  epic: {
    name: 'Epic',
    color: '#a855f7',
    textColor: 'text-purple-400',
    bgColor: 'bg-purple-900/80',
    borderColor: 'border-purple-500',
    spawnChance: 0.08,
    gatherBonus: 0.30,
    xpMultiplier: 2.0,
    lootMultiplier: 1.5,
  },
  legendary: {
    name: 'Legendary',
    color: '#9333ea',
    textColor: 'text-violet-300',
    bgColor: 'bg-gradient-to-r from-violet-900/90 to-purple-800/90',
    borderColor: 'border-violet-400',
    spawnChance: 0.02,
    gatherBonus: 0.50,
    xpMultiplier: 3.0,
    lootMultiplier: 2.0,
    animated: true,
  },
};

export function rollNodeRarity(rng: () => number): NodeRarity {
  const roll = rng();
  if (roll < NODE_RARITY_CONFIG.legendary.spawnChance) return 'legendary';
  if (roll < NODE_RARITY_CONFIG.legendary.spawnChance + NODE_RARITY_CONFIG.epic.spawnChance) return 'epic';
  if (roll < NODE_RARITY_CONFIG.legendary.spawnChance + NODE_RARITY_CONFIG.epic.spawnChance + NODE_RARITY_CONFIG.rare.spawnChance) return 'rare';
  return 'common';
}

export interface ResourceNode {
  id: string;
  name: string;
  type: "ore" | "wood" | "hemp" | "herb" | "fish" | "oil" | "gem" | "stone" | "leather";
  x: number;
  y: number;
  tier: number;
  nodeLevel: number;
  rarity: NodeRarity;
  profession: string;
  icon: string;
  color: string;
  isWaterNode: boolean;
  uptime: number;
  cooldownHours: number;
  spawnedAt?: number;
  expiresAt?: number;
  assignedHeroId?: string;
  lastHarvest?: number;
  harvestIntervalMinutes: number;
  drops: LootDrop[];
}

export interface CollisionBody {
  id: string;
  entityType: 'hero' | 'sheep' | 'node' | 'skinning';
  position: { x: number; y: number };
  collisionRadius: number;
  velocity: { x: number; y: number };
  mass: number;
  isStatic: boolean;
}

export const COLLISION_DEFAULTS = {
  hero: { radius: 2.5, mass: 1.0 },
  sheep: { radius: 2.0, mass: 0.5 },
  node: { radius: 3.0, mass: Infinity },
  skinning: { radius: 2.5, mass: Infinity },
} as const;

export function createCollisionBody(
  id: string,
  entityType: CollisionBody['entityType'],
  x: number,
  y: number,
  overrides?: Partial<Omit<CollisionBody, 'id' | 'entityType'>>
): CollisionBody {
  const defaults = COLLISION_DEFAULTS[entityType];
  return {
    id,
    entityType,
    position: { x, y },
    collisionRadius: overrides?.collisionRadius ?? defaults.radius,
    velocity: overrides?.velocity ?? { x: 0, y: 0 },
    mass: overrides?.mass ?? defaults.mass,
    isStatic: overrides?.isStatic ?? (entityType === 'node' || entityType === 'skinning'),
  };
}

export function checkBodyCollision(a: CollisionBody, b: CollisionBody): boolean {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (a.collisionRadius + b.collisionRadius);
}

export function resolveCollision(a: CollisionBody, b: CollisionBody): { x: number; y: number } | null {
  if (!checkBodyCollision(a, b)) return null;
  if (a.id === b.id) return null;
  
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) {
    return { x: a.position.x + (Math.random() - 0.5) * 2, y: a.position.y + (Math.random() - 0.5) * 2 };
  }
  
  const overlap = (a.collisionRadius + b.collisionRadius) - distance;
  const normalX = dx / distance;
  const normalY = dy / distance;
  
  const pushDistance = overlap + 0.5;
  return {
    x: a.position.x + normalX * pushDistance,
    y: a.position.y + normalY * pushDistance,
  };
}

export function findNonCollidingPosition(
  targetX: number,
  targetY: number,
  bodyId: string,
  allBodies: CollisionBody[],
  newBodyRadius: number = COLLISION_DEFAULTS.hero.radius
): { x: number; y: number } {
  const testBody = createCollisionBody(bodyId, 'hero', targetX, targetY, { collisionRadius: newBodyRadius });
  
  const hasCollision = allBodies.some(b => b.id !== bodyId && checkBodyCollision(testBody, b));
  if (!hasCollision) return { x: targetX, y: targetY };
  
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  const minSeparation = newBodyRadius * 2 + 1;
  const distances = [minSeparation, minSeparation * 1.5, minSeparation * 2];
  
  for (const dist of distances) {
    for (const angle of angles) {
      const rad = (angle * Math.PI) / 180;
      const newX = Math.max(5, Math.min(95, targetX + Math.cos(rad) * dist));
      const newY = Math.max(5, Math.min(95, targetY + Math.sin(rad) * dist));
      
      testBody.position = { x: newX, y: newY };
      const collision = allBodies.some(b => b.id !== bodyId && checkBodyCollision(testBody, b));
      if (!collision) return { x: newX, y: newY };
    }
  }
  
  return { x: targetX + (Math.random() - 0.5) * 10, y: targetY + (Math.random() - 0.5) * 10 };
}

export type AnimalType = 'hare' | 'fox' | 'deer' | 'boar';
export type AnimalRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface AnimalConfig {
  type: AnimalType;
  name: string;
  rarity: AnimalRarity;
  spawnWeight: number;
  walkSprite: string;
  deathSprite: string;
  frameWidth: number;
  frameHeight: number;
  walkFrames: number;
  deathFrames: number;
  scale: number;
}

export const ANIMAL_CONFIGS: Record<AnimalType, AnimalConfig> = {
  hare: {
    type: 'hare',
    name: 'Hare',
    rarity: 'common',
    spawnWeight: 50,
    walkSprite: assetUrl("/sprites/topdown/animals/Tiled/Hare_Walk_with_shadow.png"),
    deathSprite: assetUrl("/sprites/topdown/animals/Tiled/Hare_Death_with_shadow.png"),
    frameWidth: 32,
    frameHeight: 32,
    walkFrames: 5,
    deathFrames: 6,
    scale: 1.5,
  },
  fox: {
    type: 'fox',
    name: 'Fox',
    rarity: 'rare',
    spawnWeight: 30,
    walkSprite: assetUrl("/sprites/topdown/animals/Tiled/Fox_walk_with_shadow.png"),
    deathSprite: assetUrl("/sprites/topdown/animals/Tiled/Fox_Death_with_shadow.png"),
    frameWidth: 32,
    frameHeight: 32,
    walkFrames: 6,
    deathFrames: 6,
    scale: 1.5,
  },
  deer: {
    type: 'deer',
    name: 'Deer',
    rarity: 'epic',
    spawnWeight: 15,
    walkSprite: assetUrl("/sprites/topdown/animals/Tiled/Deer_Walk_with_shadow.png"),
    deathSprite: assetUrl("/sprites/topdown/animals/Tiled/Deer_Death_with_shadow.png"),
    frameWidth: 32,
    frameHeight: 32,
    walkFrames: 6,
    deathFrames: 7,
    scale: 1.5,
  },
  boar: {
    type: 'boar',
    name: 'Boar',
    rarity: 'legendary',
    spawnWeight: 5,
    walkSprite: assetUrl("/sprites/topdown/animals/Tiled/Boar_Run_with_shadow.png"),
    deathSprite: assetUrl("/sprites/topdown/animals/Tiled/Boar_Death_with_shadow.png"),
    frameWidth: 32,
    frameHeight: 32,
    walkFrames: 5,
    deathFrames: 6,
    scale: 1.5,
  },
};

export const ANIMAL_RARITY_COLORS: Record<AnimalRarity, { text: string; border: string; bg: string }> = {
  common: { text: 'text-gray-400', border: 'border-gray-500', bg: 'bg-gray-500/20' },
  rare: { text: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500/20' },
  epic: { text: 'text-purple-400', border: 'border-purple-500', bg: 'bg-purple-500/20' },
  legendary: { text: 'text-amber-400', border: 'border-amber-500', bg: 'bg-amber-500/20' },
};

export interface Animal {
  id: string;
  type: AnimalType;
  x: number;
  y: number;
  spawnedAt: number;
  state: 'alive' | 'dying' | 'dead';
  direction: 'down' | 'up' | 'left' | 'right';
  killedAt?: number;
  killedBy?: string;
}

export interface Sheep extends Animal {}

export function getAnimalConfig(type: AnimalType): AnimalConfig {
  return ANIMAL_CONFIGS[type];
}

export interface SkinningNode {
  id: string;
  sheepId: string;
  animalType?: AnimalType;
  x: number;
  y: number;
  createdAt: number;
  expiresAt: number;
  assignedHeroId?: string;
  lastHarvest?: number;
  harvestIntervalMinutes: number;
  profession: string;
  drops: LootDrop[];
}

// Terrain zone types for proper node placement
export type TerrainZone = 'mountain' | 'forest' | 'field' | 'shore' | 'water' | 'clearing';

export interface TerrainArea {
  zone: TerrainZone;
  x: number; // Percentage (0-100)
  y: number;
  width: number;
  height: number;
}

export interface IslandState {
  id: string;
  name: string; // User-given name
  mapStyle: 'iron' | 'fantasy' | 'tactical' | 'night';
  mapImageUrl?: string;
  nodes: ResourceNode[];
  sheep: Sheep[];
  skinningNodes: SkinningNode[];
  assignedHeroes: Record<string, string>;
  terrainZones: TerrainArea[]; // Terrain areas for proper node placement
  campPosition?: { x: number; y: number }; // Permanent camp location
  clearings: { x: number; y: number; width: number; height: number }[]; // Cleared areas for building
  isFirstVisit: boolean; // True until cutscene completed
  createdAt: number;
  lastUpdate: number;
}

export const CRAFTING_RESOURCES: Record<string, LootDrop[]> = {
  ore: [
    { itemId: "ORE_IRON_T1", name: "Iron Ore", chance: 1.0, minQuantity: 1, maxQuantity: 3, tier: 1 },
    { itemId: "ORE_COPPER_T1", name: "Copper Ore", chance: 0.7, minQuantity: 1, maxQuantity: 2, tier: 1 },
    { itemId: "ORE_TIN_T1", name: "Tin Ore", chance: 0.5, minQuantity: 1, maxQuantity: 2, tier: 1 },
    { itemId: "ORE_STEEL_T2", name: "Steel Ore", chance: 0.15, minQuantity: 1, maxQuantity: 1, tier: 2 },
    { itemId: "ORE_MITHRIL_T3", name: "Mithril Ore", chance: 0.05, minQuantity: 1, maxQuantity: 1, tier: 3, rarity: "Rare" },
    { itemId: "GEM_RUBY", name: "Ruby", chance: 0.02, minQuantity: 1, maxQuantity: 1, rarity: "Rare" },
    { itemId: "GRUDA_WPN_HAMMER_T1", name: "Miner's Hammer", chance: 0.008, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ARM_HANDS_T1", name: "Mining Gloves", chance: 0.005, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ACC_RING_T1", name: "Stone Ring", chance: 0.003, minQuantity: 1, maxQuantity: 1, rarity: "Rare" },
    { itemId: "GRUDA_WPN_AXE_T2", name: "Forged War Axe", chance: 0.001, minQuantity: 1, maxQuantity: 1, rarity: "Epic" },
  ],
  wood: [
    { itemId: "WOOD_PINE_T1", name: "Pine Log", chance: 1.0, minQuantity: 2, maxQuantity: 5, tier: 1 },
    { itemId: "WOOD_OAK_T1", name: "Oak Log", chance: 0.6, minQuantity: 1, maxQuantity: 3, tier: 1 },
    { itemId: "WOOD_BIRCH_T1", name: "Birch Log", chance: 0.4, minQuantity: 1, maxQuantity: 2, tier: 1 },
    { itemId: "WOOD_IRONWOOD_T2", name: "Ironwood Log", chance: 0.12, minQuantity: 1, maxQuantity: 1, tier: 2 },
    { itemId: "WOOD_ELDERWOOD_T3", name: "Elderwood Log", chance: 0.04, minQuantity: 1, maxQuantity: 1, tier: 3, rarity: "Rare" },
    { itemId: "RESIN_SAP", name: "Tree Sap", chance: 0.3, minQuantity: 1, maxQuantity: 2 },
    { itemId: "GRUDA_WPN_BOW_T1", name: "Wooden Longbow", chance: 0.008, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_WPN_STAFF_T1", name: "Oak Staff", chance: 0.006, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ARM_CHEST_T1", name: "Woodsman's Vest", chance: 0.004, minQuantity: 1, maxQuantity: 1, rarity: "Rare" },
    { itemId: "GRUDA_WPN_BOW_T2", name: "Composite Bow", chance: 0.001, minQuantity: 1, maxQuantity: 1, rarity: "Epic" },
  ],
  hemp: [
    { itemId: "LOOM_HEMP_FIBER", name: "Hemp Fiber", chance: 1.0, minQuantity: 2, maxQuantity: 4, tier: 1 },
    { itemId: "LOOM_COTTON", name: "Cotton", chance: 0.5, minQuantity: 1, maxQuantity: 3, tier: 1 },
    { itemId: "LOOM_LINEN", name: "Linen Thread", chance: 0.3, minQuantity: 1, maxQuantity: 2, tier: 1 },
    { itemId: "LOOM_SILK_T2", name: "Raw Silk", chance: 0.08, minQuantity: 1, maxQuantity: 1, tier: 2, rarity: "Uncommon" },
    { itemId: "DYE_BLUE", name: "Blue Dye", chance: 0.15, minQuantity: 1, maxQuantity: 1 },
    { itemId: "GRUDA_ARM_HANDS_T1", name: "Woven Gloves", chance: 0.008, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ARM_HEAD_T1", name: "Hemp Hood", chance: 0.006, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ACC_WAIST_T1", name: "Woven Belt", chance: 0.004, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ARM_CHEST_T2", name: "Silk Robe", chance: 0.001, minQuantity: 1, maxQuantity: 1, rarity: "Epic" },
  ],
  herb: [
    { itemId: "POT_RED_FLOWER", name: "Red Flower", chance: 1.0, minQuantity: 1, maxQuantity: 3, tier: 1 },
    { itemId: "POT_BLUE_MUSHROOM", name: "Blue Mushroom", chance: 0.6, minQuantity: 1, maxQuantity: 2, tier: 1 },
    { itemId: "POT_MOONPETAL", name: "Moonpetal", chance: 0.25, minQuantity: 1, maxQuantity: 1, tier: 2 },
    { itemId: "POT_DRAGONS_BREATH", name: "Dragon's Breath", chance: 0.05, minQuantity: 1, maxQuantity: 1, tier: 3, rarity: "Rare" },
    { itemId: "POT_NIGHTSHADE", name: "Nightshade", chance: 0.1, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "POTION_HEALTH_MINOR", name: "Minor Health Potion", chance: 0.02, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_WPN_STAFF_T1", name: "Druid's Staff", chance: 0.006, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ACC_RING_T1", name: "Nature Ring", chance: 0.004, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ACC_NECK_T1", name: "Herbalist's Amulet", chance: 0.003, minQuantity: 1, maxQuantity: 1, rarity: "Rare" },
    { itemId: "GRUDA_WPN_STAFF_T2", name: "Elder Staff", chance: 0.001, minQuantity: 1, maxQuantity: 1, rarity: "Epic" },
  ],
  fish: [
    { itemId: "FOOD_FISH", name: "Common Fish", chance: 1.0, minQuantity: 1, maxQuantity: 3, tier: 1 },
    { itemId: "FOOD_SALMON", name: "Salmon", chance: 0.4, minQuantity: 1, maxQuantity: 2, tier: 1 },
    { itemId: "FOOD_TUNA", name: "Tuna", chance: 0.25, minQuantity: 1, maxQuantity: 1, tier: 2 },
    { itemId: "FOOD_GOLDEN_FISH", name: "Golden Fish", chance: 0.03, minQuantity: 1, maxQuantity: 1, tier: 3, rarity: "Rare" },
    { itemId: "PEARL", name: "Pearl", chance: 0.05, minQuantity: 1, maxQuantity: 1, rarity: "Rare" },
    { itemId: "GRUDA_WPN_SPEAR_T1", name: "Fisherman's Trident", chance: 0.008, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ARM_FEET_T1", name: "Waders", chance: 0.005, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ACC_NECK_T1", name: "Sea Shell Amulet", chance: 0.003, minQuantity: 1, maxQuantity: 1, rarity: "Rare" },
    { itemId: "GRUDA_WPN_SPEAR_T2", name: "Neptune's Trident", chance: 0.001, minQuantity: 1, maxQuantity: 1, rarity: "Epic" },
  ],
  oil: [
    { itemId: "OIL_CRUDE", name: "Crude Oil", chance: 1.0, minQuantity: 2, maxQuantity: 5, tier: 1 },
    { itemId: "OIL_REFINED", name: "Refined Oil", chance: 0.3, minQuantity: 1, maxQuantity: 2, tier: 2 },
    { itemId: "OIL_WHALE", name: "Whale Oil", chance: 0.1, minQuantity: 1, maxQuantity: 1, tier: 2, rarity: "Uncommon" },
    { itemId: "TAR", name: "Tar", chance: 0.5, minQuantity: 1, maxQuantity: 3 },
    { itemId: "GRUDA_ARM_CHEST_T1", name: "Oiled Leather Vest", chance: 0.008, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ARM_HANDS_T1", name: "Oiled Gloves", chance: 0.005, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ACC_RING_T1", name: "Black Pearl Ring", chance: 0.003, minQuantity: 1, maxQuantity: 1, rarity: "Rare" },
    { itemId: "GRUDA_WPN_MACE_T2", name: "Oil-Forged Mace", chance: 0.001, minQuantity: 1, maxQuantity: 1, rarity: "Epic" },
  ],
  gem: [
    { itemId: "GEM_ROUGH", name: "Rough Gem", chance: 1.0, minQuantity: 1, maxQuantity: 2, tier: 1 },
    { itemId: "GEM_SAPPHIRE", name: "Sapphire", chance: 0.2, minQuantity: 1, maxQuantity: 1, tier: 2, rarity: "Uncommon" },
    { itemId: "GEM_EMERALD", name: "Emerald", chance: 0.15, minQuantity: 1, maxQuantity: 1, tier: 2, rarity: "Uncommon" },
    { itemId: "GEM_DIAMOND", name: "Diamond", chance: 0.03, minQuantity: 1, maxQuantity: 1, tier: 3, rarity: "Rare" },
    { itemId: "GEM_VOID_CRYSTAL", name: "Void Crystal", chance: 0.01, minQuantity: 1, maxQuantity: 1, tier: 4, rarity: "Epic" },
    { itemId: "GRUDA_ACC_RING_T1", name: "Gem-Studded Ring", chance: 0.015, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ACC_RING_T2", name: "Emerald Ring", chance: 0.008, minQuantity: 1, maxQuantity: 1, rarity: "Rare" },
    { itemId: "GRUDA_ACC_NECK_T2", name: "Diamond Pendant", chance: 0.003, minQuantity: 1, maxQuantity: 1, rarity: "Epic" },
    { itemId: "GRUDA_WPN_DAGGER_T2", name: "Crystalline Dagger", chance: 0.001, minQuantity: 1, maxQuantity: 1, rarity: "Epic" },
  ],
  stone: [
    { itemId: "STONE_ROUGH", name: "Rough Stone", chance: 1.0, minQuantity: 2, maxQuantity: 5, tier: 1 },
    { itemId: "STONE_GRANITE", name: "Granite", chance: 0.4, minQuantity: 1, maxQuantity: 3, tier: 1 },
    { itemId: "STONE_MARBLE", name: "Marble", chance: 0.15, minQuantity: 1, maxQuantity: 1, tier: 2, rarity: "Uncommon" },
    { itemId: "STONE_OBSIDIAN", name: "Obsidian", chance: 0.05, minQuantity: 1, maxQuantity: 1, tier: 3, rarity: "Rare" },
    { itemId: "FOSSIL", name: "Ancient Fossil", chance: 0.02, minQuantity: 1, maxQuantity: 1, rarity: "Rare" },
    { itemId: "GRUDA_WPN_HAMMER_T1", name: "Stone Hammer", chance: 0.008, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ARM_SHOULDER_T1", name: "Stone Pauldrons", chance: 0.005, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ACC_RING_T1", name: "Fossil Ring", chance: 0.003, minQuantity: 1, maxQuantity: 1, rarity: "Rare" },
    { itemId: "GRUDA_WPN_MACE_T2", name: "Obsidian Mace", chance: 0.001, minQuantity: 1, maxQuantity: 1, rarity: "Epic" },
  ],
  leather: [
    { itemId: "LEATHER_ROUGH", name: "Rough Leather", chance: 1.0, minQuantity: 1, maxQuantity: 3, tier: 1 },
    { itemId: "LEATHER_THICK", name: "Thick Leather", chance: 0.4, minQuantity: 1, maxQuantity: 2, tier: 1 },
    { itemId: "LEATHER_FINE", name: "Fine Leather", chance: 0.15, minQuantity: 1, maxQuantity: 1, tier: 2, rarity: "Uncommon" },
    { itemId: "HIDE_BEAST", name: "Beast Hide", chance: 0.3, minQuantity: 1, maxQuantity: 2 },
    { itemId: "FAT_ANIMAL", name: "Animal Fat", chance: 0.5, minQuantity: 1, maxQuantity: 3 },
    { itemId: "BONE", name: "Bone", chance: 0.4, minQuantity: 1, maxQuantity: 2 },
    { itemId: "GRUDA_ARM_CHEST_T1", name: "Beast Hide Vest", chance: 0.008, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ARM_LEGS_T1", name: "Leather Leggings", chance: 0.006, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ARM_FEET_T1", name: "Hunter's Boots", chance: 0.005, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_WPN_DAGGER_T1", name: "Skinning Knife", chance: 0.004, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
    { itemId: "GRUDA_ACC_NECK_T1", name: "Beast Tooth Necklace", chance: 0.003, minQuantity: 1, maxQuantity: 1, rarity: "Rare" },
    { itemId: "GRUDA_ARM_CHEST_T2", name: "Predator's Vest", chance: 0.001, minQuantity: 1, maxQuantity: 1, rarity: "Epic" },
  ],
  sheepSkinning: [
    { itemId: "WOOL_RAW", name: "Raw Wool", chance: 1.0, minQuantity: 2, maxQuantity: 5, tier: 1 },
    { itemId: "LEATHER_SHEEP", name: "Sheep Leather", chance: 0.8, minQuantity: 1, maxQuantity: 3, tier: 1 },
    { itemId: "FUR_SOFT", name: "Soft Fur", chance: 0.6, minQuantity: 1, maxQuantity: 2, tier: 1 },
    { itemId: "HIDE_SHEEP", name: "Sheep Hide", chance: 0.5, minQuantity: 1, maxQuantity: 2, tier: 1 },
    { itemId: "FAT_SHEEP", name: "Sheep Fat", chance: 0.4, minQuantity: 1, maxQuantity: 2, tier: 1 },
    { itemId: "MUTTON_RAW", name: "Raw Mutton", chance: 0.7, minQuantity: 1, maxQuantity: 3, tier: 1 },
    { itemId: "BONE", name: "Bone", chance: 0.3, minQuantity: 1, maxQuantity: 2 },
    { itemId: "WOOL_FINE", name: "Fine Wool", chance: 0.15, minQuantity: 1, maxQuantity: 1, tier: 2, rarity: "Uncommon" },
    { itemId: "GRUDA_ARM_CHEST_T1", name: "Wool-Lined Vest", chance: 0.01, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
  ],
  hareSkinning: [
    { itemId: "FUR_HARE", name: "Hare Fur", chance: 1.0, minQuantity: 1, maxQuantity: 3, tier: 1 },
    { itemId: "MEAT_HARE", name: "Hare Meat", chance: 0.8, minQuantity: 1, maxQuantity: 2, tier: 1 },
    { itemId: "BONE_SMALL", name: "Small Bone", chance: 0.5, minQuantity: 1, maxQuantity: 2, tier: 1 },
    { itemId: "LEATHER_SOFT", name: "Soft Leather", chance: 0.3, minQuantity: 1, maxQuantity: 1, tier: 1 },
  ],
  foxSkinning: [
    { itemId: "FUR_FOX", name: "Fox Fur", chance: 1.0, minQuantity: 1, maxQuantity: 3, tier: 2, rarity: "Uncommon" },
    { itemId: "MEAT_FOX", name: "Fox Meat", chance: 0.7, minQuantity: 1, maxQuantity: 2, tier: 1 },
    { itemId: "BONE", name: "Bone", chance: 0.4, minQuantity: 1, maxQuantity: 2, tier: 1 },
    { itemId: "LEATHER_FINE", name: "Fine Leather", chance: 0.4, minQuantity: 1, maxQuantity: 2, tier: 2, rarity: "Uncommon" },
    { itemId: "FANG_FOX", name: "Fox Fang", chance: 0.2, minQuantity: 1, maxQuantity: 1, tier: 2, rarity: "Uncommon" },
    { itemId: "GRUDA_ARM_HANDS_T1", name: "Fox Fur Gloves", chance: 0.02, minQuantity: 1, maxQuantity: 1, rarity: "Uncommon" },
  ],
  deerSkinning: [
    { itemId: "HIDE_DEER", name: "Deer Hide", chance: 1.0, minQuantity: 2, maxQuantity: 4, tier: 2, rarity: "Uncommon" },
    { itemId: "VENISON_RAW", name: "Raw Venison", chance: 0.9, minQuantity: 2, maxQuantity: 4, tier: 2, rarity: "Uncommon" },
    { itemId: "ANTLER", name: "Antler", chance: 0.6, minQuantity: 1, maxQuantity: 2, tier: 2, rarity: "Uncommon" },
    { itemId: "BONE_LARGE", name: "Large Bone", chance: 0.4, minQuantity: 1, maxQuantity: 2, tier: 2 },
    { itemId: "LEATHER_EXOTIC", name: "Exotic Leather", chance: 0.2, minQuantity: 1, maxQuantity: 1, tier: 3, rarity: "Rare" },
    { itemId: "SINEW", name: "Sinew", chance: 0.3, minQuantity: 1, maxQuantity: 2, tier: 2, rarity: "Uncommon" },
    { itemId: "GRUDA_ARM_CHEST_T2", name: "Deerhide Vest", chance: 0.015, minQuantity: 1, maxQuantity: 1, rarity: "Rare" },
    { itemId: "GRUDA_WPN_BOW_T2", name: "Antler Bow", chance: 0.01, minQuantity: 1, maxQuantity: 1, rarity: "Rare" },
  ],
  boarSkinning: [
    { itemId: "HIDE_BOAR", name: "Boar Hide", chance: 1.0, minQuantity: 2, maxQuantity: 5, tier: 3, rarity: "Rare" },
    { itemId: "PORK_RAW", name: "Raw Pork", chance: 0.95, minQuantity: 3, maxQuantity: 6, tier: 2 },
    { itemId: "TUSK_BOAR", name: "Boar Tusk", chance: 0.7, minQuantity: 1, maxQuantity: 2, tier: 3, rarity: "Rare" },
    { itemId: "FAT_ANIMAL", name: "Animal Fat", chance: 0.8, minQuantity: 2, maxQuantity: 4, tier: 1 },
    { itemId: "BONE_LARGE", name: "Large Bone", chance: 0.5, minQuantity: 2, maxQuantity: 3, tier: 2 },
    { itemId: "LEATHER_THICK", name: "Thick Leather", chance: 0.4, minQuantity: 1, maxQuantity: 2, tier: 2, rarity: "Uncommon" },
    { itemId: "LEATHER_LEGENDARY", name: "Legendary Hide", chance: 0.1, minQuantity: 1, maxQuantity: 1, tier: 4, rarity: "Epic" },
    { itemId: "GRUDA_ARM_CHEST_T3", name: "Boarskin Cuirass", chance: 0.02, minQuantity: 1, maxQuantity: 1, rarity: "Epic" },
    { itemId: "GRUDA_WPN_DAGGER_T3", name: "Tusk Dagger", chance: 0.015, minQuantity: 1, maxQuantity: 1, rarity: "Epic" },
    { itemId: "GRUDA_ACC_NECK_T3", name: "Tusk Amulet", chance: 0.01, minQuantity: 1, maxQuantity: 1, rarity: "Legendary" },
  ],
};

export function getAnimalDrops(animalType: AnimalType): LootDrop[] {
  switch (animalType) {
    case 'hare': return CRAFTING_RESOURCES.hareSkinning;
    case 'fox': return CRAFTING_RESOURCES.foxSkinning;
    case 'deer': return CRAFTING_RESOURCES.deerSkinning;
    case 'boar': return CRAFTING_RESOURCES.boarSkinning;
    default: return CRAFTING_RESOURCES.hareSkinning;
  }
}

export const MAX_ANIMALS = 4;
export const MAX_SHEEP = MAX_ANIMALS; // Backwards compatibility
export const ANIMAL_SPAWN_INTERVAL_MS = 5 * 60 * 1000;
export const SHEEP_SPAWN_INTERVAL_MS = ANIMAL_SPAWN_INTERVAL_MS;
export const SKINNING_NODE_DURATION_MS = 30 * 60 * 1000;

const ANIMAL_SPAWN_POSITIONS = [
  { x: 42, y: 35 }, { x: 55, y: 40 }, { x: 38, y: 55 },
  { x: 60, y: 52 }, { x: 48, y: 62 }, { x: 35, y: 45 },
  { x: 62, y: 38 }, { x: 45, y: 48 },
];
const SHEEP_SPAWN_POSITIONS = ANIMAL_SPAWN_POSITIONS; // Backwards compatibility

function selectRandomAnimalType(): AnimalType {
  const totalWeight = Object.values(ANIMAL_CONFIGS).reduce((sum, cfg) => sum + cfg.spawnWeight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [type, config] of Object.entries(ANIMAL_CONFIGS)) {
    random -= config.spawnWeight;
    if (random <= 0) {
      return type as AnimalType;
    }
  }
  return 'hare'; // Default fallback
}

function getRandomDirection(): Animal['direction'] {
  const directions: Animal['direction'][] = ['down', 'up', 'left', 'right'];
  return directions[Math.floor(Math.random() * directions.length)];
}

export function spawnAnimal(existingAnimals: Animal[]): Animal | null {
  const aliveAnimals = existingAnimals.filter(a => a.state === 'alive');
  if (aliveAnimals.length >= MAX_ANIMALS) return null;
  
  const usedPositions = new Set(existingAnimals.map(a => `${Math.round(a.x)},${Math.round(a.y)}`));
  const availablePositions = ANIMAL_SPAWN_POSITIONS.filter(
    pos => !usedPositions.has(`${pos.x},${pos.y}`)
  );
  
  if (availablePositions.length === 0) return null;
  
  const pos = availablePositions[Math.floor(Math.random() * availablePositions.length)];
  const now = Date.now();
  const animalType = selectRandomAnimalType();
  
  return {
    id: uuidv4(),
    type: animalType,
    x: pos.x + (Math.random() - 0.5) * 6,
    y: pos.y + (Math.random() - 0.5) * 6,
    spawnedAt: now,
    state: 'alive',
    direction: getRandomDirection(),
  };
}

export function spawnSheep(existingSheep: Sheep[]): Sheep | null {
  return spawnAnimal(existingSheep);
}

export function killAnimal(animal: Animal, heroId: string): Animal {
  return {
    ...animal,
    state: 'dead',
    killedAt: Date.now(),
    killedBy: heroId,
  };
}

export function killSheep(sheep: Sheep, heroId: string): Sheep {
  return killAnimal(sheep, heroId);
}

export function createSkinningNode(animal: Animal): SkinningNode {
  const now = Date.now();
  const animalType = animal.type || 'hare';
  const config = ANIMAL_CONFIGS[animalType];
  
  return {
    id: uuidv4(),
    sheepId: animal.id,
    animalType: animalType,
    x: animal.x,
    y: animal.y,
    createdAt: now,
    expiresAt: now + SKINNING_NODE_DURATION_MS,
    harvestIntervalMinutes: 5,
    profession: "Skinning",
    drops: getAnimalDrops(animalType),
  };
}

export function isSkinningNodeExpired(node: SkinningNode): boolean {
  return Date.now() > node.expiresAt;
}

export function getSkinningNodeTimeRemaining(node: SkinningNode): number {
  return Math.max(0, node.expiresAt - Date.now());
}

export function canHarvestSkinningNode(node: SkinningNode, characterLevel: number): boolean {
  if (!node.lastHarvest) return true;
  const effectiveInterval = getEffectiveHarvestInterval(node.harvestIntervalMinutes, characterLevel);
  const timeSinceLastHarvest = Date.now() - node.lastHarvest;
  return timeSinceLastHarvest >= effectiveInterval * 60 * 1000;
}

const NODE_TEMPLATES: Omit<ResourceNode, 'id' | 'x' | 'y' | 'spawnedAt' | 'expiresAt' | 'rarity' | 'nodeLevel'>[] = [
  { name: "Iron Deposit", type: "ore", tier: 1, profession: "Mining", icon: "⛏️", color: "text-slate-400", isWaterNode: false, uptime: 4, cooldownHours: 4, harvestIntervalMinutes: 30, drops: CRAFTING_RESOURCES.ore },
  { name: "Copper Vein", type: "ore", tier: 1, profession: "Mining", icon: "⛏️", color: "text-orange-400", isWaterNode: false, uptime: 6, cooldownHours: 6, harvestIntervalMinutes: 30, drops: CRAFTING_RESOURCES.ore },
  { name: "Ancient Oak", type: "wood", tier: 1, profession: "Logging", icon: "🪓", color: "text-amber-600", isWaterNode: false, uptime: 3, cooldownHours: 3, harvestIntervalMinutes: 20, drops: CRAFTING_RESOURCES.wood },
  { name: "Pine Grove", type: "wood", tier: 1, profession: "Logging", icon: "🌲", color: "text-green-700", isWaterNode: false, uptime: 4, cooldownHours: 4, harvestIntervalMinutes: 25, drops: CRAFTING_RESOURCES.wood },
  { name: "Hemp Field", type: "hemp", tier: 1, profession: "Herbalism", icon: "🌿", color: "text-green-500", isWaterNode: false, uptime: 2, cooldownHours: 2, harvestIntervalMinutes: 15, drops: CRAFTING_RESOURCES.hemp },
  { name: "Herb Garden", type: "herb", tier: 1, profession: "Herbalism", icon: "🌸", color: "text-pink-400", isWaterNode: false, uptime: 3, cooldownHours: 3, harvestIntervalMinutes: 20, drops: CRAFTING_RESOURCES.herb },
  { name: "Berry Bush", type: "herb", tier: 1, profession: "Herbalism", icon: "🍇", color: "text-purple-400", isWaterNode: false, uptime: 2, cooldownHours: 2, harvestIntervalMinutes: 15, drops: CRAFTING_RESOURCES.herb },
  { name: "Stone Quarry", type: "stone", tier: 1, profession: "Mining", icon: "🪨", color: "text-stone-400", isWaterNode: false, uptime: 8, cooldownHours: 8, harvestIntervalMinutes: 45, drops: CRAFTING_RESOURCES.stone },
  { name: "Gem Deposit", type: "gem", tier: 2, profession: "Mining", icon: "💎", color: "text-cyan-400", isWaterNode: false, uptime: 12, cooldownHours: 12, harvestIntervalMinutes: 60, drops: CRAFTING_RESOURCES.gem },
  { name: "Fishing Spot", type: "fish", tier: 1, profession: "Fishing", icon: "🎣", color: "text-blue-400", isWaterNode: true, uptime: 6, cooldownHours: 6, harvestIntervalMinutes: 30, drops: CRAFTING_RESOURCES.fish },
  { name: "Deep Waters", type: "fish", tier: 2, profession: "Fishing", icon: "🐟", color: "text-blue-600", isWaterNode: true, uptime: 8, cooldownHours: 8, harvestIntervalMinutes: 40, drops: CRAFTING_RESOURCES.fish },
  { name: "Oil Well", type: "oil", tier: 2, profession: "Mining", icon: "🛢️", color: "text-gray-800", isWaterNode: true, uptime: 10, cooldownHours: 10, harvestIntervalMinutes: 50, drops: CRAFTING_RESOURCES.oil },
  { name: "Beast Den", type: "leather", tier: 1, profession: "Skinning", icon: "🦴", color: "text-yellow-700", isWaterNode: false, uptime: 5, cooldownHours: 5, harvestIntervalMinutes: 35, drops: CRAFTING_RESOURCES.leather },
];

const LAND_POSITIONS = [
  { x: 45, y: 18 }, { x: 65, y: 15 }, { x: 80, y: 22 },
  { x: 35, y: 35 }, { x: 55, y: 32 }, { x: 75, y: 38 },
  { x: 25, y: 50 }, { x: 50, y: 48 }, { x: 70, y: 52 },
  { x: 30, y: 68 }, { x: 50, y: 72 }, { x: 72, y: 70 },
  { x: 40, y: 58 }, { x: 60, y: 42 }, { x: 85, y: 55 },
];

const WATER_POSITIONS = [
  { x: 12, y: 35 }, { x: 88, y: 45 }, { x: 15, y: 70 },
  { x: 85, y: 75 }, { x: 50, y: 88 }, { x: 10, y: 55 },
];

export function generateIslandNodes(seed: string, terrainZones?: TerrainArea[]): ResourceNode[] {
  const rng = seededRandom(seed);
  const nodes: ResourceNode[] = [];
  const zones = terrainZones || generateDefaultTerrainZones();
  
  const landTemplates = NODE_TEMPLATES.filter(t => !t.isWaterNode);
  const waterTemplates = NODE_TEMPLATES.filter(t => t.isWaterNode);
  
  // Generate terrain-aware positions for larger island
  const generateZonePositions = (zoneType: TerrainZone): { x: number; y: number }[] => {
    const positions: { x: number; y: number }[] = [];
    const zoneAreas = zones.filter(z => z.zone === zoneType);
    for (const area of zoneAreas) {
      // Generate multiple positions within each zone area
      const count = Math.floor(rng() * 3) + 2;
      for (let i = 0; i < count; i++) {
        positions.push({
          x: area.x + rng() * area.width,
          y: area.y + rng() * area.height,
        });
      }
    }
    return positions.sort(() => rng() - 0.5);
  };

  // Generate ore nodes in mountain zones
  const mountainPositions = generateZonePositions('mountain');
  const oreTemplates = landTemplates.filter(t => t.type === 'ore' || t.type === 'stone' || t.type === 'gem');
  for (let i = 0; i < Math.min(3, mountainPositions.length); i++) {
    const template = oreTemplates[Math.floor(rng() * oreTemplates.length)] || landTemplates[0];
    const pos = mountainPositions[i];
    const now = Date.now();
    const rarity = rollNodeRarity(rng);
    const nodeLevel = Math.floor(rng() * 5) + 1 + (rarity === 'legendary' ? 3 : rarity === 'epic' ? 2 : rarity === 'rare' ? 1 : 0);
    
    nodes.push({
      ...template,
      id: uuidv4(),
      x: pos.x,
      y: pos.y,
      spawnedAt: now,
      expiresAt: now + template.uptime * 60 * 60 * 1000,
      rarity,
      nodeLevel,
    });
  }

  // Generate wood nodes in forest zones
  const forestPositions = generateZonePositions('forest');
  const woodTemplates = landTemplates.filter(t => t.type === 'wood' || t.type === 'herb');
  for (let i = 0; i < Math.min(4, forestPositions.length); i++) {
    const template = woodTemplates[Math.floor(rng() * woodTemplates.length)] || landTemplates[0];
    const pos = forestPositions[i];
    const now = Date.now();
    const rarity = rollNodeRarity(rng);
    const nodeLevel = Math.floor(rng() * 5) + 1 + (rarity === 'legendary' ? 3 : rarity === 'epic' ? 2 : rarity === 'rare' ? 1 : 0);
    
    nodes.push({
      ...template,
      id: uuidv4(),
      x: pos.x,
      y: pos.y,
      spawnedAt: now,
      expiresAt: now + template.uptime * 60 * 60 * 1000,
      rarity,
      nodeLevel,
    });
  }

  // Generate herb/hemp nodes in field zones
  const fieldPositions = generateZonePositions('field');
  const fieldTemplates = landTemplates.filter(t => t.type === 'hemp' || t.type === 'herb');
  for (let i = 0; i < Math.min(3, fieldPositions.length); i++) {
    const template = fieldTemplates[Math.floor(rng() * fieldTemplates.length)] || landTemplates[0];
    const pos = fieldPositions[i];
    const now = Date.now();
    const rarity = rollNodeRarity(rng);
    const nodeLevel = Math.floor(rng() * 5) + 1 + (rarity === 'legendary' ? 3 : rarity === 'epic' ? 2 : rarity === 'rare' ? 1 : 0);
    
    nodes.push({
      ...template,
      id: uuidv4(),
      x: pos.x,
      y: pos.y,
      spawnedAt: now,
      expiresAt: now + template.uptime * 60 * 60 * 1000,
      rarity,
      nodeLevel,
    });
  }

  // Generate fish nodes in shore zones
  const shorePositions = generateZonePositions('shore');
  for (let i = 0; i < Math.min(3, shorePositions.length, waterTemplates.length > 0 ? 3 : 0); i++) {
    const template = waterTemplates[Math.floor(rng() * waterTemplates.length)];
    if (!template) continue;
    const pos = shorePositions[i];
    const now = Date.now();
    const rarity = rollNodeRarity(rng);
    const nodeLevel = Math.floor(rng() * 5) + 1 + (rarity === 'legendary' ? 3 : rarity === 'epic' ? 2 : rarity === 'rare' ? 1 : 0);
    
    nodes.push({
      ...template,
      id: uuidv4(),
      x: pos.x,
      y: pos.y,
      spawnedAt: now,
      expiresAt: now + template.uptime * 60 * 60 * 1000,
      rarity,
      nodeLevel,
    });
  }
  
  return nodes;
}

function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return function() {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
}

export function getEffectiveHarvestInterval(baseIntervalMinutes: number, characterLevel: number): number {
  const reduction = Math.min(0.65, 0.015 * (characterLevel - 1));
  return Math.max(baseIntervalMinutes * 0.35, baseIntervalMinutes * (1 - reduction));
}

export function getGatherSuccessChance(professionLevel: number, nodeLevel: number = 1, nodeRarity: NodeRarity = 'common'): number {
  const levelDiff = professionLevel - nodeLevel;
  const rarityConfig = NODE_RARITY_CONFIG[nodeRarity];
  
  let baseSuccess = 0.50;
  if (levelDiff >= 5) baseSuccess = 0.90;
  else if (levelDiff >= 3) baseSuccess = 0.80;
  else if (levelDiff >= 1) baseSuccess = 0.70;
  else if (levelDiff >= -1) baseSuccess = 0.55;
  else if (levelDiff >= -3) baseSuccess = 0.40;
  else if (levelDiff >= -5) baseSuccess = 0.25;
  else baseSuccess = 0.15;
  
  const rarityBonus = rarityConfig.gatherBonus;
  const profBonus = 0.01 * Math.floor(professionLevel / 5);
  
  return Math.min(0.98, Math.max(0.10, baseSuccess + rarityBonus + profBonus));
}

export function getDropChanceMultiplier(professionLevel: number, dropTier: number = 1, dropRarity?: string): number {
  const rarityThresholds: Record<string, number> = {
    'Uncommon': 5,
    'Rare': 15,
    'Epic': 30,
  };
  
  if (dropRarity && rarityThresholds[dropRarity]) {
    if (professionLevel < rarityThresholds[dropRarity]) {
      return 0;
    }
  }
  
  const tierScale = 0.05 * Math.max(0, professionLevel - dropTier);
  const profBonus = 0.01 * Math.floor(professionLevel / 5);
  
  return 1 + tierScale + profBonus;
}

export function rollGatherSuccess(professionLevel: number): boolean {
  const successChance = getGatherSuccessChance(professionLevel);
  return Math.random() < successChance;
}

export function rollLoot(drops: LootDrop[], professionLevel: number = 1): { itemId: string; name: string; quantity: number }[] {
  const loot: { itemId: string; name: string; quantity: number }[] = [];
  
  for (const drop of drops) {
    const multiplier = getDropChanceMultiplier(professionLevel, drop.tier || 1, drop.rarity);
    if (multiplier === 0) continue;
    
    const adjustedChance = Math.min(0.95, drop.chance * multiplier);
    if (Math.random() < adjustedChance) {
      const bonusQuantity = Math.floor(professionLevel / 10);
      const quantity = Math.floor(Math.random() * (drop.maxQuantity - drop.minQuantity + 1)) + drop.minQuantity + bonusQuantity;
      loot.push({ itemId: drop.itemId, name: drop.name, quantity });
    }
  }
  
  if (loot.length === 0 && drops.length > 0) {
    const guaranteed = drops[0];
    loot.push({ 
      itemId: guaranteed.itemId, 
      name: guaranteed.name, 
      quantity: guaranteed.minQuantity 
    });
  }
  
  return loot;
}

export async function saveIslandState(userId: string, state: IslandState): Promise<boolean> {
  // Stamp lastUpdate so VPS vs cache conflicts resolve correctly
  state.lastUpdate = Date.now();

  // VPS-authoritative: puterIslandKV.saveState writes to VPS first,
  // then caches in Puter KV + localStorage. Returns false if VPS rejects.
  const saved = await puterIslandKV.saveState(state.id || userId, state);
  if (saved) return true;

  // VPS was down — puterIslandKV already queued a dirty write in Puter KV.
  // Also cache in localStorage as offline fallback.
  try { localStorage.setItem(`grudge_island_${userId}`, JSON.stringify(state)); } catch {}
  return false;
}

export async function loadIslandState(userId: string): Promise<IslandState | null> {
  // puterIslandKV.loadState reads KV cache + VPS truth, compares lastUpdate,
  // and auto-syncs dirty writes. Returns the freshest state.
  const raw = await puterIslandKV.loadState<IslandState>(userId, userId);
  if (raw) return normalizeIslandStateData(raw, userId);

  // If puterIslandKV returned null (no KV, no VPS), try localStorage
  try {
    const cached = localStorage.getItem(`grudge_island_${userId}`);
    if (cached) return normalizeIslandStateData(JSON.parse(cached), userId);
  } catch { /* corrupt localStorage */ }

  return null;
}

/** Normalize any island state shape into the canonical IslandState format */
function normalizeIslandStateData(raw: any, userId: string): IslandState {
  const island = raw._island || {};
  return {
    id: raw.id || island.seed || userId,
    name: raw.name || island.name || "Home Island",
    mapStyle: validateMapStyle(raw.mapStyle || island.mapStyle),
    mapImageUrl: raw.mapImageUrl || island.mapImageUrl,
    nodes: Array.isArray(raw.nodes) ? raw.nodes : [],
    sheep: Array.isArray(raw.sheep) ? raw.sheep : [],
    skinningNodes: Array.isArray(raw.skinningNodes) ? raw.skinningNodes : [],
    assignedHeroes: raw.assignedHeroes || {},
    terrainZones: Array.isArray(raw.terrainZones) ? raw.terrainZones : generateDefaultTerrainZones(),
    campPosition: raw.campPosition,
    clearings: Array.isArray(raw.clearings) ? raw.clearings : [],
    isFirstVisit: raw.isFirstVisit ?? !raw.campPosition,
    createdAt: raw.createdAt || island.createdAt || Date.now(),
    lastUpdate: raw.lastUpdate || island.updatedAt || Date.now(),
  };
}

function validateMapStyle(style: string | undefined): IslandState['mapStyle'] {
  const validStyles: IslandState['mapStyle'][] = ['iron', 'fantasy', 'tactical', 'night'];
  if (style && validStyles.includes(style as IslandState['mapStyle'])) {
    return style as IslandState['mapStyle'];
  }
  return 'iron'; // Default fallback
}

// Generate default terrain zones for a larger island (4x size with more land)
export function generateDefaultTerrainZones(): TerrainArea[] {
  return [
    // Central clearing (24x24 building area) - larger for camp and buildings
    { zone: 'clearing', x: 38, y: 38, width: 24, height: 24 },
    
    // Mountain range (north) - ore nodes spawn here
    { zone: 'mountain', x: 20, y: 5, width: 60, height: 20 },
    
    // Forest areas (east and west) - wood nodes spawn here
    { zone: 'forest', x: 5, y: 25, width: 25, height: 40 },
    { zone: 'forest', x: 70, y: 25, width: 25, height: 40 },
    
    // Fields (south-central) - sheep, herbs spawn here
    { zone: 'field', x: 25, y: 65, width: 50, height: 25 },
    
    // Shore areas (borders) - fish nodes spawn here
    { zone: 'shore', x: 0, y: 0, width: 100, height: 8 },
    { zone: 'shore', x: 0, y: 92, width: 100, height: 8 },
    { zone: 'shore', x: 0, y: 8, width: 8, height: 84 },
    { zone: 'shore', x: 92, y: 8, width: 8, height: 84 },
  ];
}

// Get terrain zone at a specific position
export function getTerrainZoneAt(x: number, y: number, zones: TerrainArea[]): TerrainZone {
  // Check zones in order (clearing has priority)
  for (const area of zones) {
    if (x >= area.x && x <= area.x + area.width &&
        y >= area.y && y <= area.y + area.height) {
      return area.zone;
    }
  }
  return 'field'; // Default to field
}

// Map terrain zones to appropriate node types
export function getNodeTypesForZone(zone: TerrainZone): ResourceNode['type'][] {
  switch (zone) {
    case 'mountain': return ['ore', 'stone', 'gem'];
    case 'forest': return ['wood', 'herb'];
    case 'field': return ['hemp', 'herb'];
    case 'shore': return ['fish'];
    case 'water': return ['fish'];
    case 'clearing': return []; // No nodes in building areas
    default: return ['wood', 'ore', 'herb'];
  }
}

export function createNewIsland(userId: string, islandName: string = "Home Island"): IslandState {
  const styles: IslandState['mapStyle'][] = ['iron', 'fantasy', 'tactical', 'night'];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];
  
  const terrainZones = generateDefaultTerrainZones();
  
  const initialSheep: Sheep[] = [];
  for (let i = 0; i < 3; i++) { // Start with 3 sheep on larger island
    const sheep = spawnSheep(initialSheep);
    if (sheep) initialSheep.push(sheep);
  }
  
  return {
    id: userId,
    name: islandName,
    mapStyle: randomStyle,
    nodes: generateIslandNodes(userId, terrainZones),
    sheep: initialSheep,
    skinningNodes: [],
    assignedHeroes: {},
    terrainZones,
    campPosition: undefined, // Set when user completes cutscene
    clearings: [{ x: 38, y: 38, width: 24, height: 24 }], // Initial central clearing
    isFirstVisit: true, // Show cutscene on first visit
    createdAt: Date.now(),
    lastUpdate: Date.now(),
  };
}

export function getNodeStatus(node: ResourceNode): 'active' | 'expired' | 'harvesting' {
  const now = Date.now();
  if (node.expiresAt && now > node.expiresAt) return 'expired';
  if (node.assignedHeroId) return 'harvesting';
  return 'active';
}

export function canHarvest(node: ResourceNode, characterLevel: number = 1): boolean {
  if (!node.assignedHeroId) return false;
  if (!node.lastHarvest) return true;
  
  const effectiveInterval = getEffectiveHarvestInterval(node.harvestIntervalMinutes, characterLevel);
  const timeSinceHarvest = Date.now() - node.lastHarvest;
  const intervalMs = effectiveInterval * 60 * 1000;
  return timeSinceHarvest >= intervalMs;
}

export function getTimeUntilNextHarvest(node: ResourceNode): number {
  if (!node.lastHarvest) return 0;
  const timeSinceHarvest = Date.now() - node.lastHarvest;
  const intervalMs = node.harvestIntervalMinutes * 60 * 1000;
  return Math.max(0, intervalMs - timeSinceHarvest);
}

export function getNodeTimeRemaining(node: ResourceNode): number {
  if (!node.expiresAt) return Infinity;
  return Math.max(0, node.expiresAt - Date.now());
}

export function formatTimeRemaining(ms: number): string {
  if (ms === Infinity) return "∞";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

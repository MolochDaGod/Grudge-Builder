import { assetUrl } from "@/lib/assetConfig";
/**
 * Island Building System
 * Defines buildings placeable on islands using MiniWorld sprite assets.
 * Buildings provide passive bonuses to harvesting, stamina, XP, and storage.
 */

export type BuildingType =
  | 'keep'
  | 'tavern'
  | 'workshop'
  | 'market'
  | 'barracks'
  | 'tower'
  | 'chapel'
  | 'dock'
  | 'farm'
  | 'house'
  | 'hut'
  | 'beam_tower'
  | 'catapult_tower';

export type BuildingColor = 'Wood' | 'Cyan' | 'Lime' | 'Purple' | 'Red';

export interface BuildingDef {
  type: BuildingType;
  name: string;
  icon: string;
  description: string;
  /** Grid footprint in tiles (e.g. 2×2) */
  sizeX: number;
  sizeY: number;
  /** Resource cost to build */
  cost: { gold: number; wood?: number; stone?: number };
  /** Must have Keep built before placing this */
  requiresKeep: boolean;
  /** Max instances per island */
  maxCount: number;
  /** Sprite file name within /sprites/miniworld/Buildings/{color}/ */
  spriteFile: string;
  /** Sprite sheet frame: { x, y, w, h } in pixels for the specific building variant */
  spriteFrame: { x: number; y: number; w: number; h: number };
  /** Passive bonuses this building provides */
  bonuses: Partial<IslandBonuses>;
}

export interface IslandBuilding {
  id: string;
  type: BuildingType;
  /** World coordinates (0-100) for positioning */
  worldX: number;
  worldY: number;
  /** Tile grid coordinates (0-199) */
  gridX: number;
  gridY: number;
  level: number; // 1-3
  color: BuildingColor;
  builtAt: number;
}

export interface IslandBonuses {
  /** Multiplier on harvest interval (0.85 = 15% faster) */
  harvestSpeedMult: number;
  /** Multiplier on stamina recovery rate while sleeping */
  staminaRecoveryMult: number;
  /** Multiplier on profession XP gained */
  xpMult: number;
  /** Flat bonus to fishing harvest speed (0.3 = 30% faster) */
  fishingSpeedBonus: number;
  /** Extra max heroes allowed on island */
  extraHeroSlots: number;
  /** Extra resource storage capacity */
  extraStorage: number;
  /** Gold sell price multiplier */
  goldSellMult: number;
  /** Passive food generated per 10-min tick */
  passiveFood: number;
  /** Passive herb generated per 10-min tick */
  passiveHerbs: number;
  /** Enables dock (boat travel, water access) */
  hasDock: boolean;
  /** Enables tower (wider vision) */
  hasTower: boolean;
}

// ── Building Definitions ──────────────────────────────────────

const BASE_PATH = assetUrl("/sprites/miniworld/Buildings");

export const BUILDING_DEFS: Record<BuildingType, BuildingDef> = {
  keep: {
    type: 'keep',
    name: 'Keep',
    icon: '🏰',
    description: 'Island HQ. Required before other buildings. +1 hero slot.',
    sizeX: 2, sizeY: 2,
    cost: { gold: 500, wood: 200, stone: 150 },
    requiresKeep: false,
    maxCount: 1,
    spriteFile: 'Keep.png',
    spriteFrame: { x: 0, y: 0, w: 64, h: 64 },
    bonuses: { extraHeroSlots: 1 },
  },
  tavern: {
    type: 'tavern',
    name: 'Tavern',
    icon: '🍺',
    description: 'Heroes recover stamina 2× faster while sleeping.',
    sizeX: 2, sizeY: 2,
    cost: { gold: 300, wood: 100 },
    requiresKeep: true,
    maxCount: 2,
    spriteFile: 'Taverns.png',
    spriteFrame: { x: 0, y: 0, w: 48, h: 48 },
    bonuses: { staminaRecoveryMult: 2.0 },
  },
  workshop: {
    type: 'workshop',
    name: 'Workshop',
    icon: '⚒️',
    description: 'Harvest interval reduced by 15% for all heroes.',
    sizeX: 2, sizeY: 2,
    cost: { gold: 400, wood: 150, stone: 50 },
    requiresKeep: true,
    maxCount: 2,
    spriteFile: 'Workshops.png',
    spriteFrame: { x: 0, y: 0, w: 48, h: 48 },
    bonuses: { harvestSpeedMult: 0.85 },
  },
  market: {
    type: 'market',
    name: 'Market',
    icon: '🏪',
    description: 'Crafted items sell for 20% more gold.',
    sizeX: 2, sizeY: 2,
    cost: { gold: 350, wood: 100 },
    requiresKeep: true,
    maxCount: 1,
    spriteFile: 'Market.png',
    spriteFrame: { x: 0, y: 0, w: 48, h: 48 },
    bonuses: { goldSellMult: 1.2 },
  },
  barracks: {
    type: 'barracks',
    name: 'Barracks',
    icon: '⚔️',
    description: '+1 hero slot on island. Combat stat bonuses.',
    sizeX: 2, sizeY: 2,
    cost: { gold: 450, wood: 200, stone: 100 },
    requiresKeep: true,
    maxCount: 2,
    spriteFile: 'Barracks.png',
    spriteFrame: { x: 0, y: 0, w: 64, h: 48 },
    bonuses: { extraHeroSlots: 1 },
  },
  tower: {
    type: 'tower',
    name: 'Tower',
    icon: '🗼',
    description: 'Wider terrain vision. Alerts on enemy spawn.',
    sizeX: 1, sizeY: 2,
    cost: { gold: 250, stone: 100 },
    requiresKeep: true,
    maxCount: 4,
    spriteFile: 'Tower.png',
    spriteFrame: { x: 0, y: 0, w: 32, h: 64 },
    bonuses: { hasTower: true },
  },
  chapel: {
    type: 'chapel',
    name: 'Chapel',
    icon: '⛪',
    description: '+25% profession XP for all heroes.',
    sizeX: 2, sizeY: 2,
    cost: { gold: 400, wood: 100, stone: 100 },
    requiresKeep: true,
    maxCount: 1,
    spriteFile: 'Chapels.png',
    spriteFrame: { x: 0, y: 0, w: 48, h: 48 },
    bonuses: { xpMult: 1.25 },
  },
  dock: {
    type: 'dock',
    name: 'Dock',
    icon: '⚓',
    description: 'Fishing +30% speed. Enables boat travel.',
    sizeX: 2, sizeY: 2,
    cost: { gold: 300, wood: 200 },
    requiresKeep: true,
    maxCount: 2,
    spriteFile: 'Docks.png',
    spriteFrame: { x: 0, y: 0, w: 64, h: 48 },
    bonuses: { fishingSpeedBonus: 0.3, hasDock: true },
  },
  farm: {
    type: 'farm',
    name: 'Farm',
    icon: '🌾',
    description: 'Generates food & herbs every 10 minutes passively.',
    sizeX: 2, sizeY: 2,
    cost: { gold: 200, wood: 50 },
    requiresKeep: true,
    maxCount: 3,
    spriteFile: 'Resources.png',
    spriteFrame: { x: 0, y: 0, w: 48, h: 48 },
    bonuses: { passiveFood: 5, passiveHerbs: 2 },
  },
  house: {
    type: 'house',
    name: 'House',
    icon: '🏠',
    description: '+50 resource storage capacity.',
    sizeX: 1, sizeY: 1,
    cost: { gold: 100, wood: 50 },
    requiresKeep: true,
    maxCount: 6,
    spriteFile: 'Houses.png',
    spriteFrame: { x: 0, y: 0, w: 32, h: 32 },
    bonuses: { extraStorage: 50 },
  },
  hut: {
    type: 'hut',
    name: 'Hut',
    icon: '🛖',
    description: 'Cheap starter building. +25 storage.',
    sizeX: 1, sizeY: 1,
    cost: { gold: 50, wood: 25 },
    requiresKeep: false,
    maxCount: 4,
    spriteFile: 'Huts.png',
    spriteFrame: { x: 0, y: 0, w: 32, h: 32 },
    bonuses: { extraStorage: 25 },
  },
  beam_tower: {
    type: 'beam_tower',
    name: 'Beam Tower',
    icon: '⚡',
    description: 'Sci-fi beam tower. 3 upgrade levels. Fast, single-target.',
    sizeX: 2, sizeY: 2,
    cost: { gold: 600, stone: 150 },
    requiresKeep: true,
    maxCount: 4,
    spriteFile: 'tower-07.png', // Spire TowerPack
    spriteFrame: { x: 0, y: 0, w: 64, h: 64 },
    bonuses: { hasTower: true },
  },
  catapult_tower: {
    type: 'catapult_tower',
    name: 'Catapult Tower',
    icon: '💣',
    description: 'Catapult tower. 3 upgrade levels. Slow, AoE splash.',
    sizeX: 2, sizeY: 2,
    cost: { gold: 700, wood: 200, stone: 100 },
    requiresKeep: true,
    maxCount: 3,
    spriteFile: 'tower-08.png', // Spire TowerPack
    spriteFrame: { x: 0, y: 0, w: 64, h: 64 },
    bonuses: { hasTower: true },
  },
};

// ── Bonus Computation ─────────────────────────────────────────

const DEFAULT_BONUSES: IslandBonuses = {
  harvestSpeedMult: 1.0,
  staminaRecoveryMult: 1.0,
  xpMult: 1.0,
  fishingSpeedBonus: 0,
  extraHeroSlots: 0,
  extraStorage: 0,
  goldSellMult: 1.0,
  passiveFood: 0,
  passiveHerbs: 0,
  hasDock: false,
  hasTower: false,
};

/**
 * Compute aggregate bonuses from all buildings on an island.
 * Multiplicative bonuses stack multiplicatively; additive ones sum.
 */
export function getIslandBonuses(buildings: IslandBuilding[]): IslandBonuses {
  const result = { ...DEFAULT_BONUSES };

  for (const building of buildings) {
    const def = BUILDING_DEFS[building.type];
    if (!def) continue;

    const b = def.bonuses;
    const levelMult = 1 + (building.level - 1) * 0.25; // Level 2 = 1.25×, Level 3 = 1.5×

    if (b.harvestSpeedMult !== undefined) {
      // Multiply closer to 1 — e.g. 0.85 × 0.85 = 0.7225
      result.harvestSpeedMult *= 1 - (1 - b.harvestSpeedMult) * levelMult;
    }
    if (b.staminaRecoveryMult !== undefined) {
      result.staminaRecoveryMult = Math.max(result.staminaRecoveryMult, b.staminaRecoveryMult * levelMult);
    }
    if (b.xpMult !== undefined) {
      result.xpMult *= 1 + (b.xpMult - 1) * levelMult;
    }
    if (b.fishingSpeedBonus !== undefined) {
      result.fishingSpeedBonus += b.fishingSpeedBonus * levelMult;
    }
    if (b.extraHeroSlots !== undefined) {
      result.extraHeroSlots += b.extraHeroSlots;
    }
    if (b.extraStorage !== undefined) {
      result.extraStorage += Math.floor(b.extraStorage * levelMult);
    }
    if (b.goldSellMult !== undefined) {
      result.goldSellMult *= 1 + (b.goldSellMult - 1) * levelMult;
    }
    if (b.passiveFood !== undefined) {
      result.passiveFood += Math.floor(b.passiveFood * levelMult);
    }
    if (b.passiveHerbs !== undefined) {
      result.passiveHerbs += Math.floor(b.passiveHerbs * levelMult);
    }
    if (b.hasDock) result.hasDock = true;
    if (b.hasTower) result.hasTower = true;
  }

  return result;
}

// ── Placement Validation ──────────────────────────────────────

export function getBuildingSpriteUrl(type: BuildingType, color: BuildingColor = 'Wood'): string {
  const def = BUILDING_DEFS[type];
  if (!def) return '';

  // Spire TowerPack buildings use local 2d-island paths, not MiniWorld CDN
  if (type === 'beam_tower' || type === 'catapult_tower') {
    return `/sprites/2d-island/towers/${def.spriteFile}`;
  }

  // MiniWorld buildings from CDN
  if (color === 'Wood') {
    return `${BASE_PATH}/Wood/${def.spriteFile}`;
  }
  // Colored variants: e.g. CyanKeep.png, CyanHouses.png
  const coloredName = `${color}${def.spriteFile}`;
  return `${BASE_PATH}/${color}/${coloredName}`;
}

export interface PlacementResult {
  valid: boolean;
  reason?: string;
}

/**
 * Check if a building can be placed at the given position.
 */
export function canPlaceBuilding(
  type: BuildingType,
  existingBuildings: IslandBuilding[],
): PlacementResult {
  const def = BUILDING_DEFS[type];
  if (!def) return { valid: false, reason: 'Unknown building type' };

  // Check Keep requirement
  if (def.requiresKeep) {
    const hasKeep = existingBuildings.some(b => b.type === 'keep');
    if (!hasKeep) return { valid: false, reason: 'Build a Keep first!' };
  }

  // Check max count
  const count = existingBuildings.filter(b => b.type === type).length;
  if (count >= def.maxCount) {
    return { valid: false, reason: `Max ${def.maxCount} ${def.name}(s) allowed` };
  }

  return { valid: true };
}

/**
 * Get all building types available to build, with their status.
 */
export function getAvailableBuildings(existingBuildings: IslandBuilding[]): Array<{
  def: BuildingDef;
  canBuild: boolean;
  reason?: string;
  currentCount: number;
}> {
  return Object.values(BUILDING_DEFS).map(def => {
    const result = canPlaceBuilding(def.type, existingBuildings);
    const currentCount = existingBuildings.filter(b => b.type === def.type).length;
    return {
      def,
      canBuild: result.valid,
      reason: result.reason,
      currentCount,
    };
  });
}

/** Base max hero slots (before buildings) */
export const BASE_HERO_SLOTS = 5;

/** Get effective max heroes for an island */
export function getMaxHeroes(buildings: IslandBuilding[]): number {
  const bonuses = getIslandBonuses(buildings);
  return BASE_HERO_SLOTS + bonuses.extraHeroSlots;
}

/**
 * Island Asset Manifest
 *
 * Catalogs every tile sheet and sprite used by the tile-based island system.
 * All paths are relative to /sprites/2d-island/ (resolved via assetUrl at runtime).
 * Prefix follows the project rule: all 2D assets use '2d-' prefix to distinguish from 3D (BabylonJS).
 */

// ── Tile Sheet Descriptors ────────────────────────────────────────────────────

export interface TileSheetDescriptor {
  /** Path relative to /sprites/2d-island/ */
  path: string;
  /** Pixel size of a single tile */
  tileSize: number;
  /** Number of tile columns in the sheet */
  columns: number;
  /** Number of tile rows in the sheet */
  rows: number;
  /** Total tiles in the sheet */
  totalTiles: number;
}

export interface TileRegion {
  /** Starting column (0-indexed) */
  col: number;
  /** Starting row (0-indexed) */
  row: number;
  /** Width in tiles */
  w: number;
  /** Height in tiles */
  h: number;
}

export interface AnimatedTileRegion extends TileRegion {
  frameCount: number;
  /** Frames per second for animation */
  fps: number;
}

// ── Water & Island Tileset (Scallywag WaterAndIslands) ────────────────────────
// Sheet: 368×96 pixels → 23 columns × 6 rows at 16×16

export const WATER_ISLAND_SHEET: TileSheetDescriptor = {
  path: 'tiles/water-island-tiles.png',
  tileSize: 16,
  columns: 23,
  rows: 6,
  totalTiles: 138,
};

/**
 * Named tile regions within water-island-tiles.png.
 * Coordinates from visual inspection of the tileset:
 * - Top-left: green grass block (3×3)
 * - Next: sand/shore block (3×3)
 * - Next: shallow water (3×3)
 * - Next: deep water (3×3)
 * - Right side rows: decoration objects (buildings, barrels, palms, rocks, boats, campfires)
 */
export const WATER_ISLAND_TILES = {
  // Terrain base tiles (3×3 blocks with edges/corners)
  grass: { col: 0, row: 0, w: 3, h: 3 } as TileRegion,
  sand: { col: 3, row: 0, w: 3, h: 3 } as TileRegion,
  shallowWater: { col: 6, row: 0, w: 3, h: 3 } as TileRegion,
  deepWater: { col: 9, row: 0, w: 3, h: 3 } as TileRegion,

  // Individual terrain tiles for auto-tiling (extracted from blocks above)
  grassCenter: { col: 1, row: 1, w: 1, h: 1 } as TileRegion,
  grassEdgeN: { col: 1, row: 0, w: 1, h: 1 } as TileRegion,
  grassEdgeS: { col: 1, row: 2, w: 1, h: 1 } as TileRegion,
  grassEdgeW: { col: 0, row: 1, w: 1, h: 1 } as TileRegion,
  grassEdgeE: { col: 2, row: 1, w: 1, h: 1 } as TileRegion,
  grassCornerNW: { col: 0, row: 0, w: 1, h: 1 } as TileRegion,
  grassCornerNE: { col: 2, row: 0, w: 1, h: 1 } as TileRegion,
  grassCornerSW: { col: 0, row: 2, w: 1, h: 1 } as TileRegion,
  grassCornerSE: { col: 2, row: 2, w: 1, h: 1 } as TileRegion,

  sandCenter: { col: 4, row: 1, w: 1, h: 1 } as TileRegion,
  sandEdgeN: { col: 4, row: 0, w: 1, h: 1 } as TileRegion,
  sandEdgeS: { col: 4, row: 2, w: 1, h: 1 } as TileRegion,
  sandEdgeW: { col: 3, row: 1, w: 1, h: 1 } as TileRegion,
  sandEdgeE: { col: 5, row: 1, w: 1, h: 1 } as TileRegion,
  sandCornerNW: { col: 3, row: 0, w: 1, h: 1 } as TileRegion,
  sandCornerNE: { col: 5, row: 0, w: 1, h: 1 } as TileRegion,
  sandCornerSW: { col: 3, row: 2, w: 1, h: 1 } as TileRegion,
  sandCornerSE: { col: 5, row: 2, w: 1, h: 1 } as TileRegion,

  waterShallowCenter: { col: 7, row: 1, w: 1, h: 1 } as TileRegion,
  waterDeepCenter: { col: 10, row: 1, w: 1, h: 1 } as TileRegion,

  // Decoration objects (right side of sheet, rows 0-5)
  palmTree: { col: 13, row: 0, w: 1, h: 2 } as TileRegion,
  rock1: { col: 12, row: 4, w: 1, h: 1 } as TileRegion,
  rock2: { col: 13, row: 4, w: 1, h: 1 } as TileRegion,
  rockCluster: { col: 12, row: 5, w: 2, h: 1 } as TileRegion,
  hutSmall: { col: 14, row: 0, w: 2, h: 2 } as TileRegion,
  hutLarge: { col: 16, row: 0, w: 2, h: 2 } as TileRegion,
  barrel: { col: 18, row: 0, w: 1, h: 1 } as TileRegion,
  campfire: { col: 19, row: 0, w: 1, h: 1 } as TileRegion,
  boatSmall: { col: 18, row: 1, w: 1, h: 2 } as TileRegion,
  sign: { col: 20, row: 0, w: 1, h: 1 } as TileRegion,
  chest: { col: 20, row: 1, w: 1, h: 1 } as TileRegion,
  flag: { col: 21, row: 0, w: 1, h: 2 } as TileRegion,
  tent: { col: 14, row: 2, w: 2, h: 2 } as TileRegion,
} as const;

// ── Fort Tileset (Scallywag Fort) ─────────────────────────────────────────────
// Sheet: 432×208 pixels → 27 columns × 13 rows at 16×16

export const FORT_SHEET: TileSheetDescriptor = {
  path: 'tiles/fort-tiles.png',
  tileSize: 16,
  columns: 27,
  rows: 13,
  totalTiles: 351,
};

export const FORT_TILES = {
  // Wall segments (top-left block)
  wallHorizontal: { col: 1, row: 0, w: 1, h: 1 } as TileRegion,
  wallVertical: { col: 0, row: 1, w: 1, h: 1 } as TileRegion,
  wallCornerNW: { col: 0, row: 0, w: 1, h: 1 } as TileRegion,
  wallCornerNE: { col: 3, row: 0, w: 1, h: 1 } as TileRegion,
  wallCornerSW: { col: 0, row: 3, w: 1, h: 1 } as TileRegion,
  wallCornerSE: { col: 3, row: 3, w: 1, h: 1 } as TileRegion,
  wallTJunctionN: { col: 2, row: 0, w: 1, h: 1 } as TileRegion,
  wallTJunctionS: { col: 2, row: 3, w: 1, h: 1 } as TileRegion,
  wallCenter: { col: 1, row: 1, w: 1, h: 1 } as TileRegion,

  // Cannon placements
  cannonN: { col: 22, row: 0, w: 2, h: 2 } as TileRegion,
  cannonS: { col: 22, row: 2, w: 2, h: 2 } as TileRegion,
  cannonE: { col: 24, row: 0, w: 2, h: 2 } as TileRegion,
  cannonW: { col: 24, row: 2, w: 2, h: 2 } as TileRegion,

  // Dock planks
  dockHorizontal: { col: 10, row: 10, w: 3, h: 1 } as TileRegion,
  dockVertical: { col: 10, row: 8, w: 1, h: 3 } as TileRegion,
  dockEnd: { col: 13, row: 10, w: 1, h: 1 } as TileRegion,

  // Bridge
  bridgeHorizontal: { col: 14, row: 11, w: 3, h: 1 } as TileRegion,

  // Gate
  gate: { col: 6, row: 11, w: 2, h: 1 } as TileRegion,

  // Items (right column)
  gem: { col: 22, row: 5, w: 1, h: 1 } as TileRegion,
  coin: { col: 23, row: 5, w: 1, h: 1 } as TileRegion,
  food: { col: 24, row: 5, w: 1, h: 1 } as TileRegion,
  bomb: { col: 25, row: 5, w: 1, h: 1 } as TileRegion,
  flagRed: { col: 22, row: 6, w: 1, h: 1 } as TileRegion,
} as const;

// ── Ship Tileset (Scallywag Ships) ────────────────────────────────────────────
// Sheet: 720×688 pixels — modular ship parts at 16×16 tile grid

export const SHIPS_SHEET: TileSheetDescriptor = {
  path: 'ships/ships-tiles.png',
  tileSize: 16,
  columns: 45,  // 720px / 16px
  rows: 43,     // 688px / 16px
  totalTiles: 1935,
};

/**
 * Ship mockup — 7 pre-assembled ships for MVP rendering.
 * Use these instead of composing from modular parts until the ship builder is ready.
 * Slice from ships-mockup.png (1280×720). Ships are centered on a blue background.
 */
export const SHIP_MOCKUPS = {
  path: 'ships/ships-mockup.png',
  /** Approximate bounding boxes for each assembled ship in the mockup */
  ships: [
    { id: 'small_brown',   color: 'brown'  as HullColor, size: 'rowboat' as ShipSize, x: 248, y: 48,  w: 48,  h: 72  },
    { id: 'small_green',   color: 'brown'  as HullColor, size: 'rowboat' as ShipSize, x: 844, y: 48,  w: 48,  h: 72  },
    { id: 'medium_green',  color: 'brown'  as HullColor, size: 'sloop'   as ShipSize, x: 368, y: 180, w: 64,  h: 108 },
    { id: 'medium_gold',   color: 'gold'   as HullColor, size: 'sloop'   as ShipSize, x: 768, y: 180, w: 64,  h: 108 },
    { id: 'large_red',     color: 'red'    as HullColor, size: 'galleon' as ShipSize, x: 128, y: 340, w: 96,  h: 180 },
    { id: 'large_brown',   color: 'brown'  as HullColor, size: 'galleon' as ShipSize, x: 568, y: 340, w: 96,  h: 180 },
    { id: 'large_blue',    color: 'blue'   as HullColor, size: 'galleon' as ShipSize, x: 968, y: 340, w: 96,  h: 180 },
  ],
} as const;

/** Hull color variants — each is a full ship column in the tileset */
export type HullColor = 'brown' | 'orange' | 'gold' | 'red' | 'dark' | 'blue' | 'grey';

export const HULL_COLORS: HullColor[] = ['brown', 'orange', 'gold', 'red', 'dark', 'blue', 'grey'];

/** Ship size tiers */
export type ShipSize = 'rowboat' | 'sloop' | 'galleon';

export const SHIP_SIZES: { type: ShipSize; label: string; cannonSlots: number; crewCap: number }[] = [
  { type: 'rowboat', label: 'Rowboat', cannonSlots: 0, crewCap: 2 },
  { type: 'sloop', label: 'Sloop', cannonSlots: 3, crewCap: 5 },
  { type: 'galleon', label: 'Galleon', cannonSlots: 5, crewCap: 10 },
];

/** Sail color variants */
export type SailColor = 'white' | 'green' | 'yellow' | 'blue' | 'red' | 'brown';
export const SAIL_COLORS: SailColor[] = ['white', 'green', 'yellow', 'blue', 'red', 'brown'];

/**
 * Ship parts from ships-tiles.png (720×688, 16px grid).
 *
 * ACTUAL LAYOUT (from visual inspection):
 * - Rows 0-5: Small hulls (7 colors packed L→R, ~3 tiles wide each = 21 cols)
 * - Rows 6-13: Medium hulls (7 colors, ~4 tiles wide = 28 cols)
 * - Rows 14-24: Large hulls (7 colors, ~5 tiles wide = 35 cols) + damaged variants on right
 * - Rows 14-17 (right): Damaged large hulls (grey/brown/cracked)
 * - Rows 25-26: Sails/canopies (7 colors, curved shapes)
 * - Rows 27-28: Banners/flags (7 colors + triangular sails)
 * - Rows 29-30: Masts, crow’s nests, rigging parts
 * - Rows 31-32: Railings, oar locks, side cannon bumps
 * - Rows 33-34: Figureheads, rudders, ornamental bow pieces
 * - Rows 35-39: Water FX (splashes, wake foam, cannon smoke)
 * - Rows 40-42: Cannonballs, barrel/wheel decorations
 */
export const SHIP_PARTS = {
  // Hull regions — each color variant is offset by stride tiles horizontally
  hullSmall:  { col: 0, row: 0,  w: 3, h: 5,  stride: 3 } as TileRegion & { stride: number },
  hullMedium: { col: 0, row: 6,  w: 4, h: 7,  stride: 4 } as TileRegion & { stride: number },
  hullLarge:  { col: 0, row: 14, w: 5, h: 10, stride: 5 } as TileRegion & { stride: number },

  // Damaged hull overlays (right side of sheet)
  hullDamageLarge: { col: 30, row: 14, w: 5, h: 10 } as TileRegion,

  // Sails/canopies
  sailRow: { col: 0, row: 25, w: 2, h: 2 } as TileRegion, // 7 colors, stride 3

  // Banners/flags
  bannerRow: { col: 0, row: 27, w: 2, h: 2 } as TileRegion,

  // Structural parts
  masts:       { col: 0, row: 29, w: 45, h: 2 } as TileRegion, // full row of mast parts
  railings:    { col: 0, row: 31, w: 45, h: 2 } as TileRegion,
  figureheads: { col: 0, row: 33, w: 30, h: 2 } as TileRegion,

  // Water FX (bottom-right)
  wakeTrail:   { col: 35, row: 35, w: 4, h: 2 } as TileRegion,
  splash:      { col: 35, row: 37, w: 2, h: 2 } as TileRegion,
  cannonSmoke: { col: 37, row: 37, w: 2, h: 2 } as TileRegion,

  // Projectiles & misc (bottom row)
  cannonball:  { col: 0,  row: 40, w: 1, h: 1 } as TileRegion,
  barrel:      { col: 2,  row: 40, w: 1, h: 1 } as TileRegion,
  wheel:       { col: 4,  row: 40, w: 1, h: 1 } as TileRegion,
} as const;

/** Get hull tile region for a specific color (0-6 index) and ship size */
export function getShipHullRegion(size: ShipSize, colorIndex: number): TileRegion {
  const base = size === 'rowboat' ? SHIP_PARTS.hullSmall
    : size === 'sloop' ? SHIP_PARTS.hullMedium
    : SHIP_PARTS.hullLarge;
  return {
    col: base.col + colorIndex * base.stride,
    row: base.row,
    w: base.w,
    h: base.h,
  };
}

// ── Pirate Sprite Sheets ──────────────────────────────────────────────────────

export type PirateColor = 'blue' | 'gray' | 'green' | 'red';
export const PIRATE_COLORS: PirateColor[] = ['blue', 'gray', 'green', 'red'];

export interface PirateSpriteDescriptor {
  color: PirateColor;
  path: string;
  /** Frame size in pixels */
  frameWidth: number;
  frameHeight: number;
  animations: Record<string, { row: number; frames: number }>;
}

export const PIRATE_SHEETS: Record<PirateColor, PirateSpriteDescriptor> = {
  blue: {
    color: 'blue',
    path: 'pirates/pirates-blue-sprite-sheet.png',
    frameWidth: 32,
    frameHeight: 32,
    animations: {
      idle: { row: 0, frames: 6 },
      walk: { row: 1, frames: 6 },
      sword: { row: 2, frames: 6 },
      shoot: { row: 3, frames: 6 },
      shovel: { row: 4, frames: 6 },
    },
  },
  gray: {
    color: 'gray',
    path: 'pirates/pirates-gray-sprite-sheet.png',
    frameWidth: 32,
    frameHeight: 32,
    animations: {
      idle: { row: 0, frames: 6 },
      walk: { row: 1, frames: 6 },
      sword: { row: 2, frames: 6 },
      shoot: { row: 3, frames: 6 },
      shovel: { row: 4, frames: 6 },
    },
  },
  green: {
    color: 'green',
    path: 'pirates/pirates-green-sprite-sheet.png',
    frameWidth: 32,
    frameHeight: 32,
    animations: {
      idle: { row: 0, frames: 6 },
      walk: { row: 1, frames: 6 },
      sword: { row: 2, frames: 6 },
      shoot: { row: 3, frames: 6 },
      shovel: { row: 4, frames: 6 },
    },
  },
  red: {
    color: 'red',
    path: 'pirates/pirates-red-sprite-sheet.png',
    frameWidth: 32,
    frameHeight: 32,
    animations: {
      idle: { row: 0, frames: 6 },
      walk: { row: 1, frames: 6 },
      sword: { row: 2, frames: 6 },
      shoot: { row: 3, frames: 6 },
      shovel: { row: 4, frames: 6 },
    },
  },
};

// ── Tower Assets (Spire TowerPack 4) ──────────────────────────────────────────

export interface TowerAssetDescriptor {
  id: string;
  name: string;
  basePath: string;
  weaponLevels: { level: number; path: string; frameWidth: number; frameHeight: number; frames: number }[];
  projectile: { path: string; frameWidth: number; frameHeight: number; frames: number };
  impact: { path: string; frameWidth: number; frameHeight: number; frames: number };
}

export const TOWER_ASSETS: TowerAssetDescriptor[] = [
  {
    id: 'beam_tower',
    name: 'Beam Tower',
    basePath: 'towers/tower-07.png',
    weaponLevels: [
      { level: 1, path: 'towers/tower-07---level-01---weapon.png', frameWidth: 64, frameHeight: 64, frames: 8 },
      { level: 2, path: 'towers/tower-07---level-02---weapon.png', frameWidth: 64, frameHeight: 64, frames: 8 },
      { level: 3, path: 'towers/tower-07---level-03---weapon.png', frameWidth: 64, frameHeight: 64, frames: 8 },
    ],
    projectile: { path: 'towers/tower-07---level-x---projectile.png', frameWidth: 16, frameHeight: 16, frames: 4 },
    impact: { path: 'towers/tower-07---level-x---projectile---impact.png', frameWidth: 32, frameHeight: 32, frames: 6 },
  },
  {
    id: 'catapult_tower',
    name: 'Catapult Tower',
    basePath: 'towers/tower-08.png',
    weaponLevels: [
      { level: 1, path: 'towers/tower-08---level-01---weapon.png', frameWidth: 64, frameHeight: 64, frames: 8 },
      { level: 2, path: 'towers/tower-08---level-02---weapon.png', frameWidth: 64, frameHeight: 64, frames: 8 },
      { level: 3, path: 'towers/tower-08---level-03---weapon.png', frameWidth: 64, frameHeight: 64, frames: 8 },
    ],
    projectile: { path: 'towers/tower-08---level-x---projectile.png', frameWidth: 16, frameHeight: 16, frames: 4 },
    impact: { path: 'towers/tower-08---level-x---projectile---impact.png', frameWidth: 32, frameHeight: 32, frames: 6 },
  },
];

// ── Builder Assets (Spire BuilderPack) ────────────────────────────────────────

export const BUILDER_ASSETS = {
  wisp: {
    path: 'builder/wisp---animations.png',
    frameWidth: 64,
    frameHeight: 64,
    animations: {
      idle: { row: 0, frames: 8 },
      walk: { row: 1, frames: 8 },
      build: { row: 2, frames: 8 },
      celebrate: { row: 3, frames: 8 },
      powered: { row: 4, frames: 8 },
      poweredCelebrate: { row: 5, frames: 8 },
    },
  },
  towerConstruction: {
    path: 'builder/tower-construction.png',
    frameWidth: 128,
    frameHeight: 192,
    frames: 26,
  },
  towerCollapse: {
    path: 'builder/tower---collapse.png',
    frameWidth: 128,
    frameHeight: 192,
    frames: 26,
  },
} as const;

// ── Cute Islands Decorations ──────────────────────────────────────────────────

export interface DecorationSprite {
  id: string;
  path: string;
  biome: 'desert' | 'grass' | 'snow' | 'extras';
  /** Grid footprint in tiles (at 16px/tile scale) */
  tileWidth: number;
  tileHeight: number;
}

export const DECORATION_SPRITES: DecorationSprite[] = [
  // Desert
  { id: 'cactus1', path: 'decorations/sprite-cactus1.png', biome: 'desert', tileWidth: 1, tileHeight: 2 },
  { id: 'cactus2', path: 'decorations/sprite-cactus2.png', biome: 'desert', tileWidth: 1, tileHeight: 2 },
  { id: 'cactus3', path: 'decorations/sprite-cactus3.png', biome: 'desert', tileWidth: 1, tileHeight: 1 },
  { id: 'cactus4', path: 'decorations/sprite-cactus4.png', biome: 'desert', tileWidth: 1, tileHeight: 1 },
  { id: 'cactus5', path: 'decorations/sprite-cactus5.png', biome: 'desert', tileWidth: 1, tileHeight: 2 },
  { id: 'cactus6', path: 'decorations/sprite-cactus6.png', biome: 'desert', tileWidth: 1, tileHeight: 1 },
  { id: 'cactus7', path: 'decorations/sprite-cactus7.png', biome: 'desert', tileWidth: 1, tileHeight: 2 },
  { id: 'cactus8', path: 'decorations/sprite-cactus8.png', biome: 'desert', tileWidth: 1, tileHeight: 1 },
  { id: 'cactus9', path: 'decorations/sprite-cactus9.png', biome: 'desert', tileWidth: 1, tileHeight: 1 },
  { id: 'cactus10', path: 'decorations/sprite-cactus10.png', biome: 'desert', tileWidth: 1, tileHeight: 2 },
  { id: 'desert_bush', path: 'decorations/sprite-bush.png', biome: 'desert', tileWidth: 1, tileHeight: 1 },
  { id: 'desert_bush_sm', path: 'decorations/sprite-bushsmall.png', biome: 'desert', tileWidth: 1, tileHeight: 1 },

  // Grass/Extras
  { id: 'tree1', path: 'decorations/sprite-tree1.png', biome: 'grass', tileWidth: 2, tileHeight: 3 },
  { id: 'tree2', path: 'decorations/sprite-tree2.png', biome: 'grass', tileWidth: 2, tileHeight: 3 },
  { id: 'tree3', path: 'decorations/sprite-tree3.png', biome: 'grass', tileWidth: 2, tileHeight: 3 },
  { id: 'bush1', path: 'decorations/sprite-bush1.png', biome: 'extras', tileWidth: 1, tileHeight: 1 },
  { id: 'bush2', path: 'decorations/sprite-bush2.png', biome: 'extras', tileWidth: 1, tileHeight: 1 },
  { id: 'bush3', path: 'decorations/sprite-bush3.png', biome: 'extras', tileWidth: 1, tileHeight: 1 },
  { id: 'rock_sm', path: 'decorations/sprite-rock.png', biome: 'extras', tileWidth: 1, tileHeight: 1 },
  { id: 'rock_lg', path: 'decorations/sprite-rock2.png', biome: 'extras', tileWidth: 1, tileHeight: 1 },
  { id: 'mushroom', path: 'decorations/sprite-mushroom.png', biome: 'extras', tileWidth: 1, tileHeight: 1 },
  { id: 'treasure_chest', path: 'decorations/sprite-treasurechest.png', biome: 'extras', tileWidth: 1, tileHeight: 1 },
  { id: 'skull', path: 'decorations/sprite-skull.png', biome: 'extras', tileWidth: 1, tileHeight: 1 },
  { id: 'sign', path: 'decorations/sprite-sign.png', biome: 'extras', tileWidth: 1, tileHeight: 1 },
  { id: 'flag', path: 'decorations/sprite-flag.png', biome: 'extras', tileWidth: 1, tileHeight: 2 },
  { id: 'coin', path: 'decorations/sprite-coin.png', biome: 'extras', tileWidth: 1, tileHeight: 1 },
  { id: 'star', path: 'decorations/sprite-star.png', biome: 'extras', tileWidth: 1, tileHeight: 1 },
  { id: 'seashell', path: 'decorations/sprite-seashell.png', biome: 'extras', tileWidth: 1, tileHeight: 1 },
  { id: 'boat', path: 'decorations/sprite-boat.png', biome: 'extras', tileWidth: 2, tileHeight: 1 },
  { id: 'pirate_ship', path: 'decorations/sprite-pirateship.png', biome: 'extras', tileWidth: 3, tileHeight: 4 },

  // Snow
  { id: 'snow_bush', path: 'decorations/sprite-bushsnow.png', biome: 'snow', tileWidth: 1, tileHeight: 1 },
  { id: 'snow_bush2', path: 'decorations/sprite-bushsnow2.png', biome: 'snow', tileWidth: 1, tileHeight: 1 },
  { id: 'snow_tree1', path: 'decorations/sprite-snowtree1.png', biome: 'snow', tileWidth: 2, tileHeight: 3 },
  { id: 'snow_tree2', path: 'decorations/sprite-snowtree2.png', biome: 'snow', tileWidth: 2, tileHeight: 3 },
];

// ── UI Packs (Gold, Iron, Paper, Platinum, Steel, Wood) ──────────────────────

export type UIPackTheme = 'gold' | 'iron' | 'paper' | 'platinum' | 'steel' | 'wood';

export interface UIPackDescriptor {
  theme: UIPackTheme;
  /** Main UI elements sheet (buttons, panels, bars, frames) */
  elements: string;
  /** Icons sheet (game icons, status icons) */
  icons?: string;
  /** Logos sheet (social/brand logos) */
  logos?: string;
  /** Font sheet (bitmap font glyphs) */
  fontA?: string;
  fontB?: string;
  shadowFontA?: string;
  shadowFontB?: string;
}

export const UI_PACKS: Record<UIPackTheme, UIPackDescriptor> = {
  gold: {
    theme: 'gold',
    elements: 'ui/gold/ui_gold.png',
    icons: 'ui/gold/ui_gold_icons_free.png',
    logos: 'ui/gold/ui_gold_logos_free.png',
  },
  iron: {
    theme: 'iron',
    elements: 'ui/iron/ui_iron.png',
    icons: 'ui/iron/ui_iron_icons_free.png',
    logos: 'ui/iron/ui_iron_logos_free.png',
  },
  paper: {
    theme: 'paper',
    elements: 'ui/paper/ui_paper.png',
    icons: 'ui/paper/ui_paper_icons_free.png',
    logos: 'ui/paper/ui_paper_logos_free.png',
  },
  platinum: {
    theme: 'platinum',
    elements: 'ui/platinum/ui_platinum.png',
    icons: 'ui/platinum/ui_platinum_icons_free.png',
    logos: 'ui/platinum/ui_platinum_logos_free.png',
  },
  steel: {
    theme: 'steel',
    elements: 'ui/steel/ui_steel.png',
    icons: 'ui/steel/ui_steel_icons_free.png',
    logos: 'ui/steel/ui_steel_logos_free.png',
  },
  wood: {
    theme: 'wood',
    elements: 'ui/wood/ui_wood_logos_free.png', // Wood pack has logos + fonts only
    fontA: 'ui/wood/ui_font_a.png',
    fontB: 'ui/wood/ui_font_b.png',
    shadowFontA: 'ui/wood/ui_shadow_font_a.png',
    shadowFontB: 'ui/wood/ui_shadow_font_b.png',
  },
};

// ── Boss Sprites ──────────────────────────────────────────────────────────────

export interface BossSpriteDescriptor {
  id: string;
  name: string;
  /** Animations keyed by action name */
  animations: Record<string, { path: string; frameWidth: number; frameHeight: number; frames: number; cols: number }>;
}

export const BOSS_SPRITES: BossSpriteDescriptor[] = [
  {
    id: 'badger',
    name: 'Badger',
    animations: {
      idle:      { path: 'bosses/badger/badger_idle.png',      frameWidth: 128, frameHeight: 64, frames: 5, cols: 5 },
      move:      { path: 'bosses/badger/badger_move.png',      frameWidth: 128, frameHeight: 64, frames: 5, cols: 5 },
      hurt:      { path: 'bosses/badger/badger_hurt.png',      frameWidth: 128, frameHeight: 64, frames: 3, cols: 3 },
      attackA:   { path: 'bosses/badger/badger_attack_a.png',  frameWidth: 128, frameHeight: 64, frames: 5, cols: 5 },
      attackB:   { path: 'bosses/badger/badger_attack_b.png',  frameWidth: 128, frameHeight: 64, frames: 5, cols: 5 },
      ability:   { path: 'bosses/badger/badger_ability.png',   frameWidth: 128, frameHeight: 64, frames: 5, cols: 5 },
    },
  },
  {
    id: 'frogger',
    name: 'Frogger',
    animations: {
      idle:    { path: 'bosses/frogger/frogger_idle.png',    frameWidth: 128, frameHeight: 128, frames: 5, cols: 5 },
      move:    { path: 'bosses/frogger/frogger_move.png',    frameWidth: 128, frameHeight: 128, frames: 5, cols: 5 },
      hurt:    { path: 'bosses/frogger/frogger_hurt.png',    frameWidth: 128, frameHeight: 128, frames: 3, cols: 3 },
      spit:    { path: 'bosses/frogger/frogger_spit.png',    frameWidth: 128, frameHeight: 128, frames: 5, cols: 5 },
      tongue:  { path: 'bosses/frogger/frogger_tongue.png',  frameWidth: 128, frameHeight: 128, frames: 5, cols: 5 },
      heal:    { path: 'bosses/frogger/frogger_heal.png',    frameWidth: 128, frameHeight: 128, frames: 5, cols: 5 },
    },
  },
  {
    id: 'gollux',
    name: 'Gollux',
    animations: {
      idle:    { path: 'bosses/gollux/gollux_idle.png',      frameWidth: 128, frameHeight: 128, frames: 5, cols: 5 },
      move:    { path: 'bosses/gollux/gollux_move.png',      frameWidth: 128, frameHeight: 128, frames: 5, cols: 5 },
      hit:     { path: 'bosses/gollux/gollux_hit.png',       frameWidth: 128, frameHeight: 128, frames: 3, cols: 3 },
      attackA: { path: 'bosses/gollux/gollux_attack_a.png',  frameWidth: 128, frameHeight: 128, frames: 5, cols: 5 },
      attackB: { path: 'bosses/gollux/gollux_attack_b.png',  frameWidth: 128, frameHeight: 128, frames: 5, cols: 5 },
      healing: { path: 'bosses/gollux/gollux_healing.png',   frameWidth: 128, frameHeight: 128, frames: 5, cols: 5 },
    },
  },
];

// ── Enemy Sprites (Enemy Galore) ──────────────────────────────────────────────

export interface EnemySpriteDescriptor {
  id: string;
  name: string;
  /** Island type affinity — which island profiles spawn this enemy */
  affinity: ('wild' | 'fort' | 'boss')[];
  animations: Record<string, { path: string; frameWidth: number; frameHeight: number; frames: number; cols: number }>;
}

export const ENEMY_SPRITES: EnemySpriteDescriptor[] = [
  {
    id: 'bat', name: 'Bat', affinity: ['wild', 'fort'],
    animations: {
      fly:    { path: 'enemies/bat/bat_fly.png',    frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
      attack: { path: 'enemies/bat/bat_attack.png',  frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
      hit:    { path: 'enemies/bat/bat_hit.png',    frameWidth: 64, frameHeight: 64, frames: 2, cols: 2 },
      death:  { path: 'enemies/bat/bat_death.png',  frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
    },
  },
  {
    id: 'crab', name: 'Crab', affinity: ['wild'],
    animations: {
      idle:     { path: 'enemies/crab/crab_idle.png',     frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
      run:      { path: 'enemies/crab/crab_run.png',      frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
      attackA:  { path: 'enemies/crab/crab_attacka.png',  frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
      attackB:  { path: 'enemies/crab/crab_attackb.png',  frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
      death:    { path: 'enemies/crab/crab_death.png',    frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
    },
  },
  {
    id: 'rat', name: 'Rat', affinity: ['wild', 'fort'],
    animations: {
      idle:    { path: 'enemies/rat/rat_idle.png',    frameWidth: 48, frameHeight: 48, frames: 4, cols: 4 },
      run:     { path: 'enemies/rat/rat_run.png',     frameWidth: 48, frameHeight: 48, frames: 4, cols: 4 },
      attack:  { path: 'enemies/rat/rat_attack.png',  frameWidth: 48, frameHeight: 48, frames: 4, cols: 4 },
      hit:     { path: 'enemies/rat/rat_hit.png',     frameWidth: 48, frameHeight: 48, frames: 2, cols: 2 },
      death:   { path: 'enemies/rat/rat_death.png',   frameWidth: 48, frameHeight: 48, frames: 4, cols: 4 },
    },
  },
  {
    id: 'slime', name: 'Spiked Slime', affinity: ['wild'],
    animations: {
      idle:    { path: 'enemies/slime/slime_spiked_idle.png',    frameWidth: 48, frameHeight: 48, frames: 4, cols: 4 },
      run:     { path: 'enemies/slime/slime_spiked_run.png',     frameWidth: 48, frameHeight: 48, frames: 4, cols: 4 },
      jump:    { path: 'enemies/slime/slime_spiked_jump.png',    frameWidth: 48, frameHeight: 48, frames: 4, cols: 4 },
      ability: { path: 'enemies/slime/slime_spiked_ability.png', frameWidth: 48, frameHeight: 48, frames: 4, cols: 4 },
      hit:     { path: 'enemies/slime/slime_spiked_hit.png',     frameWidth: 48, frameHeight: 48, frames: 2, cols: 2 },
      death:   { path: 'enemies/slime/slime_spiked_death.png',   frameWidth: 48, frameHeight: 48, frames: 4, cols: 4 },
    },
  },
  {
    id: 'golem', name: 'Golem', affinity: ['fort', 'boss'],
    animations: {
      idleA:    { path: 'enemies/golem/golem_idlea.png',    frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
      run:      { path: 'enemies/golem/golem_run.png',      frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
      attackA:  { path: 'enemies/golem/golem_attacka.png',  frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
      attackB:  { path: 'enemies/golem/golem_attackb.png',  frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
      deathA:   { path: 'enemies/golem/golem_deatha.png',   frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
    },
  },
  {
    id: 'golem_armored', name: 'Armored Golem', affinity: ['fort', 'boss'],
    animations: {
      idle:       { path: 'enemies/golem-armored/golem_armor_idle.png',       frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
      run:        { path: 'enemies/golem-armored/golem_armor_run.png',        frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
      attackA:    { path: 'enemies/golem-armored/golem_armor_attacka.png',    frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
      armorBreak: { path: 'enemies/golem-armored/golem_armor_armorbreak.png', frameWidth: 64, frameHeight: 64, frames: 4, cols: 4 },
      hit:        { path: 'enemies/golem-armored/golem_armor_hit.png',        frameWidth: 64, frameHeight: 64, frames: 2, cols: 2 },
    },
  },
  {
    id: 'pebble', name: 'Pebble', affinity: ['wild'],
    animations: {
      idle:  { path: 'enemies/pebble/pebble_idle.png',  frameWidth: 32, frameHeight: 32, frames: 4, cols: 4 },
      run:   { path: 'enemies/pebble/pebble_run.png',   frameWidth: 32, frameHeight: 32, frames: 4, cols: 4 },
      hit:   { path: 'enemies/pebble/pebble_hit.png',   frameWidth: 32, frameHeight: 32, frames: 2, cols: 2 },
      death: { path: 'enemies/pebble/pebble_death.png', frameWidth: 32, frameHeight: 32, frames: 4, cols: 4 },
    },
  },
  {
    id: 'skull', name: 'Flying Skull', affinity: ['fort', 'boss'],
    animations: {
      idle:  { path: 'enemies/skull/bones_singleskull_idle.png',  frameWidth: 48, frameHeight: 48, frames: 4, cols: 4 },
      fly:   { path: 'enemies/skull/bones_singleskull_fly.png',   frameWidth: 48, frameHeight: 48, frames: 4, cols: 4 },
      hit:   { path: 'enemies/skull/bones_singleskull_hit.png',   frameWidth: 48, frameHeight: 48, frames: 2, cols: 2 },
      death: { path: 'enemies/skull/bones_singleskull_death.png', frameWidth: 48, frameHeight: 48, frames: 4, cols: 4 },
    },
  },
];

// ── Animal Sprites (Skinning targets — Monster Pack 21 Bovine) ────────────────

export interface AnimalSpriteDescriptor {
  id: string;
  name: string;
  /** Skinning profession drops mapping */
  skinningDropKey: string;
  animations: Record<string, { path: string; frameWidth: number; frameHeight: number; frames: number; cols: number; rows: number }>;
}

export const ANIMAL_SPRITES: AnimalSpriteDescriptor[] = [
  {
    id: 'boar_bovine', name: 'Wild Boar', skinningDropKey: 'boarSkinning',
    animations: {
      idle:   { path: 'animals/boar/boar_idle.png',   frameWidth: 128, frameHeight: 128, frames: 16, cols: 4, rows: 4 },
      move:   { path: 'animals/boar/boar_move.png',   frameWidth: 128, frameHeight: 128, frames: 16, cols: 4, rows: 4 },
      attack: { path: 'animals/boar/boar_attack.png', frameWidth: 128, frameHeight: 128, frames: 16, cols: 4, rows: 4 },
    },
  },
  {
    id: 'pig', name: 'Wild Pig', skinningDropKey: 'sheepSkinning',
    animations: {
      idle: { path: 'animals/pig/pig_idle.png', frameWidth: 128, frameHeight: 128, frames: 16, cols: 4, rows: 4 },
      move: { path: 'animals/pig/pig_move.png', frameWidth: 128, frameHeight: 128, frames: 16, cols: 4, rows: 4 },
    },
  },
  {
    id: 'piggy', name: 'Piglet', skinningDropKey: 'hareSkinning',
    animations: {
      idle: { path: 'animals/piggy/piggy_idle.png', frameWidth: 128, frameHeight: 128, frames: 16, cols: 4, rows: 4 },
      move: { path: 'animals/piggy/piggy_move.png', frameWidth: 128, frameHeight: 128, frames: 16, cols: 4, rows: 4 },
    },
  },
];

// ── Treasure Chests (Animated) ────────────────────────────────────────────────

export const TREASURE_CHEST_SPRITES = {
  /** Standard chests: brown (closed→open), red/gold (closed→open), blue/ice (closed→open) */
  standard: {
    path: 'treasure/chests.png',
    /** 6 columns × 6 rows, each row is a chest variant, each col is an open animation frame */
    frameWidth: 32,
    frameHeight: 32,
    variants: [
      { name: 'wooden',   row: 0, frames: 6 },
      { name: 'iron',     row: 1, frames: 6 },
      { name: 'ornate',   row: 2, frames: 6 },
      { name: 'gold',     row: 3, frames: 6 },
      { name: 'royal',    row: 4, frames: 6 },
      { name: 'ice',      row: 5, frames: 6 },
    ],
  },
  /** Snow/ice chest variants */
  snow: {
    path: 'treasure/chests_snow.png',
    frameWidth: 32,
    frameHeight: 32,
    variants: [
      { name: 'snow_wooden', row: 0, frames: 6 },
      { name: 'snow_iron',   row: 1, frames: 6 },
      { name: 'snow_ornate', row: 2, frames: 6 },
      { name: 'snow_gold',   row: 3, frames: 6 },
      { name: 'snow_royal',  row: 4, frames: 6 },
      { name: 'snow_ice',    row: 5, frames: 6 },
    ],
  },
} as const;

// ── Undead Sprites (Monster Pack 40 — Skeletons) ──────────────────────────────
// Undead race characters use these as their sprite base

export const UNDEAD_SPRITES = {
  skeleton: {
    idle: { path: 'undead/skeleton/skeleton_idle.png', frameWidth: 128, frameHeight: 128, frames: 16, cols: 4, rows: 4 },
    move: { path: 'undead/skeleton/skeleton_move.png', frameWidth: 128, frameHeight: 128, frames: 16, cols: 4, rows: 4 },
  },
  witchDoctor: {
    idle:  { path: 'undead/witch-doctor/witch_doctor_idle.png',  frameWidth: 128, frameHeight: 128, frames: 16, cols: 4, rows: 4 },
    move:  { path: 'undead/witch-doctor/witch_doctor_move.png',  frameWidth: 128, frameHeight: 128, frames: 16, cols: 4, rows: 4 },
    skill: { path: 'undead/witch-doctor/witch_doctor_skill.png', frameWidth: 128, frameHeight: 128, frames: 16, cols: 4, rows: 4 },
  },
} as const;

// ── Helper: resolve asset path to full URL ────────────────────────────────────

/** Resolve an island asset path to its full URL (via assetUrl) */
export function resolveIslandAssetPath(relativePath: string): string {
  return `/sprites/2d-island/${relativePath}`;
}

/** Get the pixel rect for a tile region within a sheet */
export function getTileRect(
  sheet: TileSheetDescriptor,
  region: TileRegion,
): { x: number; y: number; w: number; h: number } {
  return {
    x: region.col * sheet.tileSize,
    y: region.row * sheet.tileSize,
    w: region.w * sheet.tileSize,
    h: region.h * sheet.tileSize,
  };
}

/** Get a single tile's pixel position by column/row index */
export function getTilePosition(
  sheet: TileSheetDescriptor,
  col: number,
  row: number,
): { x: number; y: number } {
  return {
    x: col * sheet.tileSize,
    y: row * sheet.tileSize,
  };
}

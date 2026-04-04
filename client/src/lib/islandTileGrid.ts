/**
 * Island Tile Grid System
 * 
 * Grid: 200x200 tiles = 40,000 total squares
 * Island area: ~125x125 with 80% land coverage
 * Land tiles: 18,000-20,032 (must be single connected island)
 * Height: ocean floor -15, water 0, island 1-50
 * Camp zone: 14x14 tiles in center, pre-cleared
 */

export const GRID_CONFIG = {
  gridWidth: 200,
  gridHeight: 200,
  tileSize: 32, // pixels per tile
  islandRadius: 62, // ~125x125 area
  minLandTiles: 18000,
  maxLandTiles: 20032,
  campSize: 14,
  maxHeight: 50,
  waterHeight: 0,
  oceanFloorHeight: -15,
} as const;

export type TileType = 
  | 'deep_water'    // Ocean floor, height -15
  | 'shallow_water' // Near shore, height -5 to 0
  | 'shore'         // Beach/shoreline, height 0-1
  | 'grass'         // Normal land, height 1-25
  | 'hill'          // Elevated land, height 25-40
  | 'mountain'      // Peak areas, height 40-50
  | 'cleared'       // Cultivated/built land (village tiles)
  | 'camp';         // Starting camp area

export interface IslandTile {
  x: number;
  y: number;
  type: TileType;
  height: number;
  tilesetIndex: number; // Index into tileset sprite sheet
  isWalkable: boolean;
  isBuildable: boolean;
  isCleared: boolean;
  overlayTileIndex?: number; // For cleared areas using village tiles
  isWaterEdge?: boolean; // True if this water tile touches land (boat docking zone)
  isDockable?: boolean; // True if this land tile touches water (can board boat)
}

export interface IslandTileGrid {
  id: string;
  width: number;
  height: number;
  tileSize: number;
  tiles: IslandTile[][];
  campCenter: { x: number; y: number };
  campTiles: { x: number; y: number }[];
  landTileCount: number;
  seed: number;
  createdAt: number;
  waterEdgeTiles?: { x: number; y: number }[]; // Water tiles that touch land (boat stops here)
  dockableTiles?: { x: number; y: number }[]; // Land tiles that touch water (can board boat)
}

// ── Scallywag Water & Island tileset (16×16 tiles, 23 cols × 6 rows) ──────────
// Tile indices are (row * columns + col) for the water-island-tiles.png sheet.
// Grass block starts at col 0, Sand at col 3, Shallow water at col 6, Deep water at col 9.

const WI_COLS = 23; // columns in water-island-tiles.png
const wi = (col: number, row: number) => row * WI_COLS + col;

export const SCALLYWAG_TILES = {
  // Grass 3×3 block (col 0-2, row 0-2)
  GRASS_CENTER:    [wi(1, 1)],
  GRASS_EDGE_N:    [wi(1, 0)],
  GRASS_EDGE_S:    [wi(1, 2)],
  GRASS_EDGE_W:    [wi(0, 1)],
  GRASS_EDGE_E:    [wi(2, 1)],
  GRASS_CORNER_NW: [wi(0, 0)],
  GRASS_CORNER_NE: [wi(2, 0)],
  GRASS_CORNER_SW: [wi(0, 2)],
  GRASS_CORNER_SE: [wi(2, 2)],

  // Sand/shore 3×3 block (col 3-5, row 0-2)
  SAND_CENTER:    [wi(4, 1)],
  SAND_EDGE_N:    [wi(4, 0)],
  SAND_EDGE_S:    [wi(4, 2)],
  SAND_EDGE_W:    [wi(3, 1)],
  SAND_EDGE_E:    [wi(5, 1)],
  SAND_CORNER_NW: [wi(3, 0)],
  SAND_CORNER_NE: [wi(5, 0)],
  SAND_CORNER_SW: [wi(3, 2)],
  SAND_CORNER_SE: [wi(5, 2)],

  // Shallow water 3×3 block (col 6-8, row 0-2)
  WATER_SHALLOW_CENTER: [wi(7, 1)],
  WATER_SHALLOW_EDGE_N: [wi(7, 0)],
  WATER_SHALLOW_EDGE_S: [wi(7, 2)],
  WATER_SHALLOW_EDGE_W: [wi(6, 1)],
  WATER_SHALLOW_EDGE_E: [wi(8, 1)],

  // Deep water 3×3 block (col 9-11, row 0-2)
  WATER_DEEP_CENTER: [wi(10, 1)],
  WATER_DEEP: [wi(10, 1), wi(9, 1), wi(11, 1), wi(10, 0)],

  // Decorations (right side of sheet)
  PALM_TREE: [wi(13, 0)],
  ROCK1:     [wi(12, 4)],
  ROCK2:     [wi(13, 4)],
  HUT_SMALL: [wi(14, 0)],
  HUT_LARGE: [wi(16, 0)],
  BARREL:    [wi(18, 0)],
  CAMPFIRE:  [wi(19, 0)],
  CHEST:     [wi(20, 1)],
  SIGN:      [wi(20, 0)],
  FLAG:      [wi(21, 0)],
} as const;

// Backward-compat aliases for existing code that references old names
export const TERRAIN_TILES = {
  GRASS_CENTER:    SCALLYWAG_TILES.GRASS_CENTER,
  GRASS_EDGE_TOP:  SCALLYWAG_TILES.GRASS_EDGE_N,
  GRASS_EDGE_BOTTOM: SCALLYWAG_TILES.GRASS_EDGE_S,
  GRASS_EDGE_LEFT: SCALLYWAG_TILES.GRASS_EDGE_W,
  GRASS_EDGE_RIGHT: SCALLYWAG_TILES.GRASS_EDGE_E,
  GRASS_CORNER_TL: SCALLYWAG_TILES.GRASS_CORNER_NW,
  GRASS_CORNER_TR: SCALLYWAG_TILES.GRASS_CORNER_NE,
  GRASS_CORNER_BL: SCALLYWAG_TILES.GRASS_CORNER_SW,
  GRASS_CORNER_BR: SCALLYWAG_TILES.GRASS_CORNER_SE,
  GRASS_INNER_TL:  SCALLYWAG_TILES.GRASS_CORNER_NW,
  GRASS_INNER_TR:  SCALLYWAG_TILES.GRASS_CORNER_NE,
  GRASS_INNER_BL:  SCALLYWAG_TILES.GRASS_CORNER_SW,
  GRASS_INNER_BR:  SCALLYWAG_TILES.GRASS_CORNER_SE,
  WATER_DEEP:      SCALLYWAG_TILES.WATER_DEEP,
  WATER_SHALLOW:   SCALLYWAG_TILES.WATER_SHALLOW_CENTER,
  SHORE:           SCALLYWAG_TILES.SAND_CENTER,
} as const;

export const VILLAGE_TILES = {
  FIELD_GRASS:   SCALLYWAG_TILES.GRASS_CENTER,
  FIELD_DIRT:    SCALLYWAG_TILES.SAND_CENTER,
  FIELD_PATH:    SCALLYWAG_TILES.SAND_EDGE_N,
  FIELD_PLANTED: SCALLYWAG_TILES.GRASS_EDGE_S,
} as const;

// ── 4-bit bitmask auto-tiling ─────────────────────────────────────────────────
// Bits: N=8, E=4, S=2, W=1.  A set bit means "same terrain in that direction".
// Returns the appropriate tile index for a terrain transition.

export function autoTileIndex(
  tileType: TileType,
  neighborN: boolean,
  neighborE: boolean,
  neighborS: boolean,
  neighborW: boolean,
  rng: () => number,
): number {
  const mask = (neighborN ? 8 : 0) | (neighborE ? 4 : 0) | (neighborS ? 2 : 0) | (neighborW ? 1 : 0);

  // Select tileset based on terrain type
  const tiles = tileType === 'shore'
    ? SCALLYWAG_TILES
    : tileType === 'deep_water' || tileType === 'shallow_water'
      ? SCALLYWAG_TILES
      : SCALLYWAG_TILES; // all use same sheet

  // For grass/hill/mountain tiles
  if (tileType === 'grass' || tileType === 'hill' || tileType === 'mountain' || tileType === 'camp' || tileType === 'cleared') {
    switch (mask) {
      case 0b1111: return tiles.GRASS_CENTER[0];    // surrounded
      case 0b0111: return tiles.GRASS_EDGE_N[0];    // open N
      case 0b1011: return tiles.GRASS_EDGE_E[0];    // open E  
      case 0b1101: return tiles.GRASS_EDGE_S[0];    // open S
      case 0b1110: return tiles.GRASS_EDGE_W[0];    // open W
      case 0b0101: return tiles.GRASS_CORNER_NW[0];  // open N+S (use NW corner)
      case 0b0011: return tiles.GRASS_CORNER_NE[0];  // open N+E
      case 0b1100: return tiles.GRASS_CORNER_SW[0];
      case 0b1001: return tiles.GRASS_CORNER_SE[0];
      default:     return tiles.GRASS_CENTER[0];
    }
  }

  // For shore/sand tiles
  if (tileType === 'shore') {
    switch (mask) {
      case 0b1111: return tiles.SAND_CENTER[0];
      case 0b0111: return tiles.SAND_EDGE_N[0];
      case 0b1011: return tiles.SAND_EDGE_E[0];
      case 0b1101: return tiles.SAND_EDGE_S[0];
      case 0b1110: return tiles.SAND_EDGE_W[0];
      case 0b0011: return tiles.SAND_CORNER_NE[0];
      case 0b0101: return tiles.SAND_CORNER_NW[0];
      case 0b1100: return tiles.SAND_CORNER_SW[0];
      case 0b1001: return tiles.SAND_CORNER_SE[0];
      default:     return tiles.SAND_CENTER[0];
    }
  }

  // Water tiles
  if (tileType === 'deep_water') {
    return tiles.WATER_DEEP[Math.floor(rng() * tiles.WATER_DEEP.length)];
  }
  if (tileType === 'shallow_water') {
    return tiles.WATER_SHALLOW_CENTER[0];
  }

  return tiles.GRASS_CENTER[0];
}

// Seeded random number generator
function createRNG(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// Simplex-like noise for natural island shapes
function noise2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function octaveNoise(x: number, y: number, seed: number, octaves: number = 4): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    total += noise2D(x * frequency / 20, y * frequency / 20, seed + i * 1000) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  return total / maxValue;
}

// Calculate distance from center with irregular edges for natural look
function getIslandDistance(x: number, y: number, centerX: number, centerY: number, seed: number): number {
  const dx = x - centerX;
  const dy = y - centerY;
  const baseDistance = Math.sqrt(dx * dx + dy * dy);
  
  // Add noise for irregular coastline
  const angle = Math.atan2(dy, dx);
  const noiseValue = octaveNoise(Math.cos(angle) * 50 + centerX, Math.sin(angle) * 50 + centerY, seed, 3);
  const edgeVariation = (noiseValue - 0.5) * 15; // ±15 tile variation
  
  return baseDistance - edgeVariation;
}

// Generate height based on distance from center and noise
function calculateHeight(x: number, y: number, normalizedDistance: number, seed: number): number {
  if (normalizedDistance > 1) {
    // Water area
    const waterDepth = Math.min((normalizedDistance - 1) * 20, 15);
    return -waterDepth;
  }
  
  // Land area - height decreases toward edges
  const baseHeight = (1 - normalizedDistance) * GRID_CONFIG.maxHeight;
  const noiseModifier = (octaveNoise(x, y, seed + 5000, 3) - 0.5) * 10;
  
  return Math.max(1, Math.min(GRID_CONFIG.maxHeight, baseHeight + noiseModifier));
}

// Determine tile type based on height
function getTileType(height: number, isCleared: boolean, isCamp: boolean): TileType {
  if (isCamp) return 'camp';
  if (isCleared) return 'cleared';
  if (height <= GRID_CONFIG.oceanFloorHeight + 5) return 'deep_water';
  if (height <= -5) return 'shallow_water';
  if (height <= 1) return 'shore';
  if (height <= 25) return 'grass';
  if (height <= 40) return 'hill';
  return 'mountain';
}

// Select appropriate tileset index based on tile type and neighbors
function selectTilesetIndex(type: TileType, rng: () => number): number {
  switch (type) {
    case 'deep_water':
      return TERRAIN_TILES.WATER_DEEP[Math.floor(rng() * TERRAIN_TILES.WATER_DEEP.length)];
    case 'shallow_water':
      return TERRAIN_TILES.WATER_SHALLOW[Math.floor(rng() * TERRAIN_TILES.WATER_SHALLOW.length)];
    case 'shore':
      return TERRAIN_TILES.SHORE[Math.floor(rng() * TERRAIN_TILES.SHORE.length)];
    case 'grass':
    case 'hill':
    case 'mountain':
      return TERRAIN_TILES.GRASS_CENTER[Math.floor(rng() * TERRAIN_TILES.GRASS_CENTER.length)];
    case 'cleared':
    case 'camp':
      return VILLAGE_TILES.FIELD_GRASS[Math.floor(rng() * VILLAGE_TILES.FIELD_GRASS.length)];
    default:
      return 0;
  }
}

// Check if tile is land (not water)
function isLandTile(type: TileType): boolean {
  return type !== 'deep_water' && type !== 'shallow_water';
}

// Flood fill to verify single connected island
function verifyConnectedIsland(tiles: IslandTile[][], width: number, height: number): boolean {
  const visited = new Set<string>();
  let startX = -1, startY = -1;
  
  // Find first land tile
  for (let y = 0; y < height && startX === -1; y++) {
    for (let x = 0; x < width; x++) {
      if (isLandTile(tiles[y][x].type)) {
        startX = x;
        startY = y;
        break;
      }
    }
  }
  
  if (startX === -1) return false;
  
  // BFS flood fill
  const queue: [number, number][] = [[startX, startY]];
  visited.add(`${startX},${startY}`);
  
  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const neighbors = [
      [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
      [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
    ];
    
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const key = `${nx},${ny}`;
        if (!visited.has(key) && isLandTile(tiles[ny][nx].type)) {
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
    }
  }
  
  // Count total land tiles and compare
  let totalLand = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isLandTile(tiles[y][x].type)) totalLand++;
    }
  }
  
  return visited.size === totalLand;
}

// Add coves for natural coastline
function addCoves(tiles: IslandTile[][], centerX: number, centerY: number, seed: number, rng: () => number): void {
  const numCoves = 3 + Math.floor(rng() * 3); // 3-5 coves
  
  for (let i = 0; i < numCoves; i++) {
    const angle = (i / numCoves) * Math.PI * 2 + rng() * 0.5;
    const distance = GRID_CONFIG.islandRadius * (0.6 + rng() * 0.3);
    const coveX = Math.floor(centerX + Math.cos(angle) * distance);
    const coveY = Math.floor(centerY + Math.sin(angle) * distance);
    const coveRadius = 5 + Math.floor(rng() * 8);
    
    // Create cove inlet
    for (let dy = -coveRadius; dy <= coveRadius; dy++) {
      for (let dx = -coveRadius; dx <= coveRadius; dx++) {
        const tx = coveX + dx;
        const ty = coveY + dy;
        if (tx >= 0 && tx < GRID_CONFIG.gridWidth && ty >= 0 && ty < GRID_CONFIG.gridHeight) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < coveRadius * 0.7) {
            // Deepen the cove
            tiles[ty][tx].height = Math.max(-10, tiles[ty][tx].height - 15);
            tiles[ty][tx].type = getTileType(tiles[ty][tx].height, false, false);
          }
        }
      }
    }
  }
}

// Main island generation function
export function generateIslandGrid(seed?: number): IslandTileGrid {
  const actualSeed = seed ?? Date.now();
  const rng = createRNG(actualSeed);
  
  const centerX = Math.floor(GRID_CONFIG.gridWidth / 2);
  const centerY = Math.floor(GRID_CONFIG.gridHeight / 2);
  
  // Initialize tile grid
  const tiles: IslandTile[][] = [];
  
  for (let y = 0; y < GRID_CONFIG.gridHeight; y++) {
    tiles[y] = [];
    for (let x = 0; x < GRID_CONFIG.gridWidth; x++) {
      // Calculate distance from center with natural variation
      const distance = getIslandDistance(x, y, centerX, centerY, actualSeed);
      const normalizedDistance = distance / GRID_CONFIG.islandRadius;
      
      // Calculate height
      const height = calculateHeight(x, y, normalizedDistance, actualSeed);
      
      // Check if this is camp area (14x14 in center)
      const campHalfSize = Math.floor(GRID_CONFIG.campSize / 2);
      const isCamp = Math.abs(x - centerX) <= campHalfSize && Math.abs(y - centerY) <= campHalfSize;
      
      const type = getTileType(height, false, isCamp);
      
      tiles[y][x] = {
        x,
        y,
        type,
        height: isCamp ? 10 : height, // Camp is flat at height 10
        tilesetIndex: selectTilesetIndex(type, rng),
        isWalkable: type !== 'deep_water' && type !== 'mountain',
        isBuildable: type === 'grass' || type === 'cleared' || type === 'camp',
        isCleared: isCamp,
        overlayTileIndex: isCamp ? VILLAGE_TILES.FIELD_GRASS[Math.floor(rng() * VILLAGE_TILES.FIELD_GRASS.length)] : undefined,
      };
    }
  }
  
  // Add coves for natural coastline
  addCoves(tiles, centerX, centerY, actualSeed, rng);
  
  // Collect camp tiles
  const campTiles: { x: number; y: number }[] = [];
  const campHalfSize = Math.floor(GRID_CONFIG.campSize / 2);
  for (let dy = -campHalfSize; dy <= campHalfSize; dy++) {
    for (let dx = -campHalfSize; dx <= campHalfSize; dx++) {
      const tx = centerX + dx;
      const ty = centerY + dy;
      if (tx >= 0 && tx < GRID_CONFIG.gridWidth && ty >= 0 && ty < GRID_CONFIG.gridHeight) {
        campTiles.push({ x: tx, y: ty });
      }
    }
  }
  
  // Count land tiles
  let landTileCount = 0;
  for (let y = 0; y < GRID_CONFIG.gridHeight; y++) {
    for (let x = 0; x < GRID_CONFIG.gridWidth; x++) {
      if (isLandTile(tiles[y][x].type)) {
        landTileCount++;
      }
    }
  }
  
  // Verify constraints
  const isConnected = verifyConnectedIsland(tiles, GRID_CONFIG.gridWidth, GRID_CONFIG.gridHeight);
  console.log(`Island generated: ${landTileCount} land tiles, connected: ${isConnected}`);
  
  if (landTileCount < GRID_CONFIG.minLandTiles || landTileCount > GRID_CONFIG.maxLandTiles) {
    console.warn(`Land tile count ${landTileCount} outside range [${GRID_CONFIG.minLandTiles}, ${GRID_CONFIG.maxLandTiles}]`);
  }
  
  const grid: IslandTileGrid = {
    id: `island_${actualSeed}`,
    width: GRID_CONFIG.gridWidth,
    height: GRID_CONFIG.gridHeight,
    tileSize: GRID_CONFIG.tileSize,
    tiles,
    campCenter: { x: centerX, y: centerY },
    campTiles,
    landTileCount,
    seed: actualSeed,
    createdAt: Date.now(),
  };
  
  // Identify water edge tiles for boat docking
  identifyWaterEdges(grid);
  
  return grid;
}

// Identify water edge tiles (where water touches land - boats dock here)
// and dockable tiles (where land touches water - players can board boats)
export function identifyWaterEdges(grid: IslandTileGrid): void {
  const waterEdgeTiles: { x: number; y: number }[] = [];
  const dockableTiles: { x: number; y: number }[] = [];
  const directions = [
    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
  ];

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const tile = grid.tiles[y][x];
      const isWater = tile.type === 'deep_water' || tile.type === 'shallow_water';
      const isLand = isLandTile(tile.type);

      let touchesLand = false;
      let touchesWater = false;

      for (const dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (nx >= 0 && nx < grid.width && ny >= 0 && ny < grid.height) {
          const neighbor = grid.tiles[ny][nx];
          if (isLandTile(neighbor.type)) touchesLand = true;
          if (neighbor.type === 'deep_water' || neighbor.type === 'shallow_water') touchesWater = true;
        }
      }

      if (isWater && touchesLand) {
        tile.isWaterEdge = true;
        waterEdgeTiles.push({ x, y });
      }

      if (isLand && touchesWater) {
        tile.isDockable = true;
        dockableTiles.push({ x, y });
      }
    }
  }

  grid.waterEdgeTiles = waterEdgeTiles;
  grid.dockableTiles = dockableTiles;
}

// Clear a 2x2 area for cultivation
export function clearLand(grid: IslandTileGrid, tileX: number, tileY: number): boolean {
  const rng = createRNG(tileX * 1000 + tileY);
  
  // Check if all 4 tiles are clearable (grass/hill, not water/mountain/already cleared)
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      const tx = tileX + dx;
      const ty = tileY + dy;
      if (tx >= grid.width || ty >= grid.height) return false;
      
      const tile = grid.tiles[ty][tx];
      if (tile.isCleared || tile.type === 'deep_water' || tile.type === 'shallow_water' || tile.type === 'mountain') {
        return false;
      }
    }
  }
  
  // Clear the 2x2 area
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      const tx = tileX + dx;
      const ty = tileY + dy;
      const tile = grid.tiles[ty][tx];
      
      tile.type = 'cleared';
      tile.isCleared = true;
      tile.isBuildable = true;
      tile.overlayTileIndex = VILLAGE_TILES.FIELD_GRASS[Math.floor(rng() * VILLAGE_TILES.FIELD_GRASS.length)];
    }
  }
  
  return true;
}

// Convert tile coordinates to world pixels
export function tileToWorld(tileX: number, tileY: number): { x: number; y: number } {
  return {
    x: tileX * GRID_CONFIG.tileSize,
    y: tileY * GRID_CONFIG.tileSize,
  };
}

// Convert world pixels to tile coordinates
export function worldToTile(worldX: number, worldY: number): { x: number; y: number } {
  return {
    x: Math.floor(worldX / GRID_CONFIG.tileSize),
    y: Math.floor(worldY / GRID_CONFIG.tileSize),
  };
}

// Get tile at world position
export function getTileAtWorld(grid: IslandTileGrid, worldX: number, worldY: number): IslandTile | null {
  const { x, y } = worldToTile(worldX, worldY);
  if (x >= 0 && x < grid.width && y >= 0 && y < grid.height) {
    return grid.tiles[y][x];
  }
  return null;
}

// Check if position is walkable
export function isWalkableAt(grid: IslandTileGrid, worldX: number, worldY: number): boolean {
  const tile = getTileAtWorld(grid, worldX, worldY);
  return tile?.isWalkable ?? false;
}

// Serialize grid for storage (compressed format)
export function serializeGrid(grid: IslandTileGrid): string {
  // Store only essential data, tiles can be regenerated from seed
  return JSON.stringify({
    id: grid.id,
    seed: grid.seed,
    createdAt: grid.createdAt,
    clearedTiles: grid.tiles.flat().filter(t => t.isCleared && t.type === 'cleared').map(t => ({ x: t.x, y: t.y })),
  });
}

// Deserialize and regenerate grid
export function deserializeGrid(data: string): IslandTileGrid {
  const parsed = JSON.parse(data);
  const grid = generateIslandGrid(parsed.seed);
  
  // Re-apply cleared tiles
  for (const cleared of parsed.clearedTiles || []) {
    if (grid.tiles[cleared.y]?.[cleared.x]) {
      grid.tiles[cleared.y][cleared.x].isCleared = true;
      grid.tiles[cleared.y][cleared.x].type = 'cleared';
    }
  }
  
  return grid;
}

// ── Island Generation Profiles ────────────────────────────────────────────────
// Different island types for the open-world map system.

export type IslandProfile = 'home' | 'wild' | 'fort' | 'boss';

export interface IslandProfileConfig {
  profile: IslandProfile;
  gridWidth: number;
  gridHeight: number;
  islandRadius: number;
  campSize: number; // 0 = no camp
  maxHeight: number;
  /** Resource density multiplier (1.0 = normal) */
  resourceDensity: number;
  /** Pre-placed fort walls (fort profile only) */
  hasFortWalls: boolean;
  /** Boss arena in center (boss profile only) */
  hasBossArena: boolean;
}

export const ISLAND_PROFILES: Record<IslandProfile, IslandProfileConfig> = {
  home: {
    profile: 'home',
    gridWidth: 200,
    gridHeight: 200,
    islandRadius: 62,
    campSize: 14,
    maxHeight: 50,
    resourceDensity: 1.0,
    hasFortWalls: false,
    hasBossArena: false,
  },
  wild: {
    profile: 'wild',
    gridWidth: 100,
    gridHeight: 100,
    islandRadius: 35,
    campSize: 0, // No camp — capturable
    maxHeight: 35,
    resourceDensity: 1.5, // Rich in resources
    hasFortWalls: false,
    hasBossArena: false,
  },
  fort: {
    profile: 'fort',
    gridWidth: 60,
    gridHeight: 60,
    islandRadius: 22,
    campSize: 0,
    maxHeight: 15, // Mostly flat
    resourceDensity: 0.5,
    hasFortWalls: true,
    hasBossArena: false,
  },
  boss: {
    profile: 'boss',
    gridWidth: 80,
    gridHeight: 80,
    islandRadius: 28,
    campSize: 0,
    maxHeight: 45,
    resourceDensity: 0.3,
    hasFortWalls: false,
    hasBossArena: true,
  },
};

/**
 * Generate an island grid for a specific profile.
 * Uses the same noise-based algorithm but with different dimensions and features.
 */
export function generateProfiledIsland(profile: IslandProfile, seed?: number): IslandTileGrid {
  const config = ISLAND_PROFILES[profile];
  const actualSeed = seed ?? Date.now();
  const rng = createRNG(actualSeed);

  const centerX = Math.floor(config.gridWidth / 2);
  const centerY = Math.floor(config.gridHeight / 2);

  const tiles: IslandTile[][] = [];

  for (let y = 0; y < config.gridHeight; y++) {
    tiles[y] = [];
    for (let x = 0; x < config.gridWidth; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const baseDistance = Math.sqrt(dx * dx + dy * dy);

      // Irregular coastline
      const angle = Math.atan2(dy, dx);
      const noiseValue = octaveNoise(
        Math.cos(angle) * 50 + centerX,
        Math.sin(angle) * 50 + centerY,
        actualSeed,
        3,
      );
      const edgeVariation = (noiseValue - 0.5) * (config.islandRadius * 0.2);
      const distance = baseDistance - edgeVariation;
      const normalizedDistance = distance / config.islandRadius;

      // Height
      let height: number;
      if (normalizedDistance > 1) {
        height = -Math.min((normalizedDistance - 1) * 20, 15);
      } else {
        const baseHeight = (1 - normalizedDistance) * config.maxHeight;
        const noiseMod = (octaveNoise(x, y, actualSeed + 5000, 3) - 0.5) * 8;
        height = Math.max(1, Math.min(config.maxHeight, baseHeight + noiseMod));
      }

      // Camp area
      const campHalf = Math.floor(config.campSize / 2);
      const isCamp = config.campSize > 0 && Math.abs(dx) <= campHalf && Math.abs(dy) <= campHalf;

      // Boss arena: 10×10 flat clearing in center
      const isBossArena =
        config.hasBossArena && Math.abs(dx) <= 5 && Math.abs(dy) <= 5;

      const type = isBossArena
        ? 'cleared'
        : getTileType(isCamp ? 10 : height, false, isCamp);

      tiles[y][x] = {
        x,
        y,
        type,
        height: isCamp || isBossArena ? 10 : height,
        tilesetIndex: selectTilesetIndex(type, rng),
        isWalkable: type !== 'deep_water' && type !== 'mountain',
        isBuildable: type === 'grass' || type === 'cleared' || type === 'camp',
        isCleared: isCamp || isBossArena,
        overlayTileIndex:
          isCamp || isBossArena
            ? VILLAGE_TILES.FIELD_GRASS[Math.floor(rng() * VILLAGE_TILES.FIELD_GRASS.length)]
            : undefined,
      };
    }
  }

  // Add coves
  addCoves(tiles, centerX, centerY, actualSeed, rng);

  // Fort walls: ring of wall tiles around the cleared interior
  if (config.hasFortWalls) {
    const wallDist = Math.floor(config.islandRadius * 0.6);
    for (let y = 0; y < config.gridHeight; y++) {
      for (let x = 0; x < config.gridWidth; x++) {
        const dx = Math.abs(x - centerX);
        const dy = Math.abs(y - centerY);
        if (
          (dx === wallDist || dy === wallDist) &&
          dx <= wallDist &&
          dy <= wallDist &&
          isLandTile(tiles[y][x].type)
        ) {
          tiles[y][x].type = 'cleared';
          tiles[y][x].isCleared = true;
          tiles[y][x].isBuildable = true;
          // Use fort wall tile index — these will be rendered using fort-tiles.png
          tiles[y][x].tilesetIndex = SCALLYWAG_TILES.HUT_SMALL[0]; // placeholder
        }
      }
    }
  }

  // Count land tiles
  const campTiles: { x: number; y: number }[] = [];
  let landTileCount = 0;
  for (let y = 0; y < config.gridHeight; y++) {
    for (let x = 0; x < config.gridWidth; x++) {
      if (isLandTile(tiles[y][x].type)) landTileCount++;
      if (tiles[y][x].type === 'camp') campTiles.push({ x, y });
    }
  }

  const grid: IslandTileGrid = {
    id: `${profile}_${actualSeed}`,
    width: config.gridWidth,
    height: config.gridHeight,
    tileSize: GRID_CONFIG.tileSize,
    tiles,
    campCenter: { x: centerX, y: centerY },
    campTiles,
    landTileCount,
    seed: actualSeed,
    createdAt: Date.now(),
  };

  identifyWaterEdges(grid);
  return grid;
}

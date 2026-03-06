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

// Tileset indices for Tiny Swords terrain (Tilemap_color1.png is 10x10 tiles)
export const TERRAIN_TILES = {
  // Grass tiles (center pieces)
  GRASS_CENTER: [44, 45, 54, 55],
  GRASS_EDGE_TOP: [34, 35],
  GRASS_EDGE_BOTTOM: [64, 65],
  GRASS_EDGE_LEFT: [43, 53],
  GRASS_EDGE_RIGHT: [46, 56],
  GRASS_CORNER_TL: [33],
  GRASS_CORNER_TR: [36],
  GRASS_CORNER_BL: [63],
  GRASS_CORNER_BR: [66],
  // Inner corners
  GRASS_INNER_TL: [37],
  GRASS_INNER_TR: [38],
  GRASS_INNER_BL: [47],
  GRASS_INNER_BR: [48],
  // Water
  WATER_DEEP: [0, 1, 10, 11],
  WATER_SHALLOW: [2, 3, 12, 13],
  // Shore/sand
  SHORE: [22, 23, 32],
} as const;

// Village tileset indices for cleared land (FieldsTileset.png)
export const VILLAGE_TILES = {
  FIELD_GRASS: [1, 2, 3, 4, 5],
  FIELD_DIRT: [17, 18, 19, 20, 21],
  FIELD_PATH: [33, 34, 35, 36, 37],
  FIELD_PLANTED: [49, 50, 51, 52, 53],
} as const;

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

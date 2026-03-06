import { v4 as uuidv4 } from 'uuid';

export interface WorldMapConfig {
  width: number;
  height: number;
  tileSize: number;
  seed: string;
  islandDensity: number;
}

export type TileType = 'deep_ocean' | 'shallow_water' | 'island' | 'reef' | 'port' | 'whirlpool';

export interface WorldMapTile {
  x: number;
  y: number;
  type: TileType;
  discovered: boolean;
  islandId?: string;
  elevation: number;
}

export interface WorldIsland {
  id: string;
  name: string;
  worldX: number;
  worldY: number;
  seed: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  biome: 'tropical' | 'temperate' | 'volcanic' | 'frozen' | 'desert';
  discovered: boolean;
  explored: boolean;
  resources: string[];
  difficulty: number;
}

export interface Ship {
  id: string;
  name: string;
  position: { x: number; y: number };
  direction: 'up' | 'down' | 'left' | 'right';
  speed: number;
  health: number;
  maxHealth: number;
  isDocked: boolean;
  dockedIslandId?: string;
  cannonAngle: number;
  cannonPower: number;
  isReloading: boolean;
  reloadTimeRemaining: number;
}

export interface Cannonball {
  id: string;
  position: { x: number; y: number };
  velocity: { vx: number; vy: number };
  active: boolean;
  fromShipId: string;
}

export interface WorldMapState {
  config: WorldMapConfig;
  tiles: WorldMapTile[][];
  islands: WorldIsland[];
  playerShip: Ship;
  cannonballs: Cannonball[];
  discoveredTileCount: number;
  fogOfWarRadius: number;
}

function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return function() {
    hash = Math.sin(hash) * 10000;
    return hash - Math.floor(hash);
  };
}

function noise2D(x: number, y: number, seed: string): number {
  const rng = seededRandom(`${seed}-${x}-${y}`);
  return rng();
}

function smoothNoise(x: number, y: number, seed: string, scale: number = 1): number {
  const sx = x / scale;
  const sy = y / scale;
  
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  
  const fx = sx - x0;
  const fy = sy - y0;
  
  const v00 = noise2D(x0, y0, seed);
  const v10 = noise2D(x1, y0, seed);
  const v01 = noise2D(x0, y1, seed);
  const v11 = noise2D(x1, y1, seed);
  
  const i1 = v00 * (1 - fx) + v10 * fx;
  const i2 = v01 * (1 - fx) + v11 * fx;
  
  return i1 * (1 - fy) + i2 * fy;
}

export function generateWorldMap(config: WorldMapConfig): WorldMapState {
  const { width, height, seed, islandDensity } = config;
  const rng = seededRandom(seed);
  const tiles: WorldMapTile[][] = [];
  const islands: WorldIsland[] = [];
  
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      const elevation = 
        smoothNoise(x, y, seed, 20) * 0.5 +
        smoothNoise(x, y, `${seed}-detail`, 5) * 0.3 +
        smoothNoise(x, y, `${seed}-micro`, 2) * 0.2;
      
      let type: TileType = 'deep_ocean';
      if (elevation > 0.7) {
        type = 'island';
      } else if (elevation > 0.55) {
        type = 'shallow_water';
      } else if (elevation > 0.5 && rng() < 0.1) {
        type = 'reef';
      }
      
      tiles[y][x] = {
        x,
        y,
        type,
        discovered: false,
        elevation
      };
    }
  }
  
  const islandClusters: { x: number; y: number; size: number }[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x].type === 'island') {
        let belongsToCluster = false;
        for (const cluster of islandClusters) {
          const dist = Math.sqrt((x - cluster.x) ** 2 + (y - cluster.y) ** 2);
          if (dist < 5) {
            cluster.size++;
            cluster.x = (cluster.x * (cluster.size - 1) + x) / cluster.size;
            cluster.y = (cluster.y * (cluster.size - 1) + y) / cluster.size;
            belongsToCluster = true;
            break;
          }
        }
        if (!belongsToCluster) {
          islandClusters.push({ x, y, size: 1 });
        }
      }
    }
  }
  
  const biomes: WorldIsland['biome'][] = ['tropical', 'temperate', 'volcanic', 'frozen', 'desert'];
  const sizes: WorldIsland['size'][] = ['tiny', 'small', 'medium', 'large', 'huge'];
  
  for (const cluster of islandClusters) {
    if (cluster.size < 3) continue;
    
    const islandId = uuidv4();
    const islandRng = seededRandom(`${seed}-island-${cluster.x}-${cluster.y}`);
    
    const size = sizes[Math.min(Math.floor(cluster.size / 5), sizes.length - 1)];
    const biome = biomes[Math.floor(islandRng() * biomes.length)];
    
    const resourcePool = getResourcesForBiome(biome);
    const numResources = 2 + Math.floor(islandRng() * 4);
    const resources: string[] = [];
    for (let i = 0; i < numResources; i++) {
      resources.push(resourcePool[Math.floor(islandRng() * resourcePool.length)]);
    }
    
    const island: WorldIsland = {
      id: islandId,
      name: generateIslandName(islandRng),
      worldX: Math.round(cluster.x),
      worldY: Math.round(cluster.y),
      seed: `${seed}-${islandId}`,
      size,
      biome,
      discovered: false,
      explored: false,
      resources: Array.from(new Set(resources)),
      difficulty: 1 + Math.floor(islandRng() * 10)
    };
    
    islands.push(island);
    
    const centerX = Math.round(cluster.x);
    const centerY = Math.round(cluster.y);
    if (centerY >= 0 && centerY < height && centerX >= 0 && centerX < width) {
      tiles[centerY][centerX].islandId = islandId;
    }
  }
  
  const startX = Math.floor(width / 2);
  const startY = Math.floor(height / 2);
  
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const tx = startX + dx;
      const ty = startY + dy;
      if (ty >= 0 && ty < height && tx >= 0 && tx < width) {
        if (tiles[ty][tx].type === 'island' || tiles[ty][tx].type === 'reef') {
          tiles[ty][tx].type = 'shallow_water';
          tiles[ty][tx].islandId = undefined;
        }
        tiles[ty][tx].discovered = true;
      }
    }
  }
  
  const playerShip: Ship = {
    id: uuidv4(),
    name: "The Grudge",
    position: { x: startX, y: startY },
    direction: 'right',
    speed: 1,
    health: 100,
    maxHealth: 100,
    isDocked: false,
    cannonAngle: 0,
    cannonPower: 5,
    isReloading: false,
    reloadTimeRemaining: 0
  };
  
  return {
    config,
    tiles,
    islands,
    playerShip,
    cannonballs: [],
    discoveredTileCount: 49,
    fogOfWarRadius: 3
  };
}

function getResourcesForBiome(biome: WorldIsland['biome']): string[] {
  switch (biome) {
    case 'tropical':
      return ['coconut', 'banana', 'palm_frond', 'crab', 'fish', 'shells', 'hardwood'];
    case 'temperate':
      return ['wood', 'herbs', 'berries', 'iron_ore', 'clay', 'flax'];
    case 'volcanic':
      return ['obsidian', 'sulfur', 'gems', 'rare_ore', 'fire_crystals'];
    case 'frozen':
      return ['ice', 'frost_herbs', 'whale_bone', 'arctic_fish', 'crystals'];
    case 'desert':
      return ['sand', 'cactus', 'gold_ore', 'ancient_relics', 'scorpion_venom'];
    default:
      return ['wood', 'stone', 'herbs'];
  }
}

function generateIslandName(rng: () => number): string {
  const prefixes = ['Shadow', 'Storm', 'Serpent', 'Skull', 'Dragon', 'Phantom', 'Crimson', 'Thunder', 'Moonlit', 'Forsaken', 'Emerald', 'Golden', 'Silver', 'Iron', 'Coral'];
  const suffixes = ['Isle', 'Cove', 'Bay', 'Haven', 'Reef', 'Atoll', 'Key', 'Shore', 'Point', 'Rock', 'Sanctuary', 'Outpost', 'Landing'];
  
  const prefix = prefixes[Math.floor(rng() * prefixes.length)];
  const suffix = suffixes[Math.floor(rng() * suffixes.length)];
  
  return `${prefix} ${suffix}`;
}

export function moveShip(state: WorldMapState, direction: Ship['direction']): WorldMapState {
  const { playerShip, tiles, config } = state;
  if (playerShip.isDocked) return state;
  
  let newX = playerShip.position.x;
  let newY = playerShip.position.y;
  
  switch (direction) {
    case 'up': newY -= 1; break;
    case 'down': newY += 1; break;
    case 'left': newX -= 1; break;
    case 'right': newX += 1; break;
  }
  
  if (newX < 0 || newX >= config.width || newY < 0 || newY >= config.height) {
    return state;
  }
  
  const targetTile = tiles[newY][newX];
  if (targetTile.type === 'island' || targetTile.type === 'reef') {
    return state;
  }
  
  const newTiles = tiles.map(row => row.map(tile => ({ ...tile })));
  const { fogOfWarRadius } = state;
  
  for (let dy = -fogOfWarRadius; dy <= fogOfWarRadius; dy++) {
    for (let dx = -fogOfWarRadius; dx <= fogOfWarRadius; dx++) {
      const tx = newX + dx;
      const ty = newY + dy;
      if (ty >= 0 && ty < config.height && tx >= 0 && tx < config.width) {
        if (!newTiles[ty][tx].discovered) {
          newTiles[ty][tx].discovered = true;
        }
      }
    }
  }
  
  const newIslands = state.islands.map(island => {
    if (!island.discovered) {
      const dist = Math.sqrt((island.worldX - newX) ** 2 + (island.worldY - newY) ** 2);
      if (dist <= fogOfWarRadius + 2) {
        return { ...island, discovered: true };
      }
    }
    return island;
  });
  
  return {
    ...state,
    tiles: newTiles,
    islands: newIslands,
    playerShip: {
      ...playerShip,
      position: { x: newX, y: newY },
      direction
    }
  };
}

export function dockAtIsland(state: WorldMapState, islandId: string): WorldMapState {
  const island = state.islands.find(i => i.id === islandId);
  if (!island) return state;
  
  const { playerShip } = state;
  const dist = Math.sqrt(
    (island.worldX - playerShip.position.x) ** 2 +
    (island.worldY - playerShip.position.y) ** 2
  );
  
  if (dist > 2) return state;
  
  return {
    ...state,
    playerShip: {
      ...playerShip,
      isDocked: true,
      dockedIslandId: islandId
    },
    islands: state.islands.map(i => 
      i.id === islandId ? { ...i, explored: true } : i
    )
  };
}

export function undock(state: WorldMapState): WorldMapState {
  return {
    ...state,
    playerShip: {
      ...state.playerShip,
      isDocked: false,
      dockedIslandId: undefined
    }
  };
}

export function aimCannon(state: WorldMapState, angle: number): WorldMapState {
  return {
    ...state,
    playerShip: {
      ...state.playerShip,
      cannonAngle: angle
    }
  };
}

export function fireCannon(state: WorldMapState): WorldMapState {
  const { playerShip, cannonballs } = state;
  
  if (playerShip.isReloading) return state;
  
  const radians = playerShip.cannonAngle * Math.PI / 180;
  const speed = playerShip.cannonPower * 2;
  
  const newBall: Cannonball = {
    id: uuidv4(),
    position: { 
      x: playerShip.position.x, 
      y: playerShip.position.y 
    },
    velocity: {
      vx: Math.cos(radians) * speed,
      vy: Math.sin(radians) * speed
    },
    active: true,
    fromShipId: playerShip.id
  };
  
  return {
    ...state,
    playerShip: {
      ...playerShip,
      isReloading: true,
      reloadTimeRemaining: 3
    },
    cannonballs: [...cannonballs, newBall]
  };
}

export function updateCannonballs(state: WorldMapState, deltaTime: number): WorldMapState {
  const GRAVITY = 0.5;
  
  const updatedBalls = state.cannonballs
    .map(ball => {
      if (!ball.active) return ball;
      
      return {
        ...ball,
        position: {
          x: ball.position.x + ball.velocity.vx * deltaTime,
          y: ball.position.y + ball.velocity.vy * deltaTime
        },
        velocity: {
          vx: ball.velocity.vx * 0.99,
          vy: ball.velocity.vy + GRAVITY * deltaTime
        }
      };
    })
    .map(ball => {
      if (!ball.active) return ball;
      
      const { x, y } = ball.position;
      if (x < 0 || x >= state.config.width || y < 0 || y >= state.config.height) {
        return { ...ball, active: false };
      }
      
      const tx = Math.floor(x);
      const ty = Math.floor(y);
      if (state.tiles[ty]?.[tx]?.type === 'island') {
        return { ...ball, active: false };
      }
      
      return ball;
    })
    .filter(ball => ball.active);
  
  let newShip = state.playerShip;
  if (newShip.isReloading) {
    const newReloadTime = newShip.reloadTimeRemaining - deltaTime;
    if (newReloadTime <= 0) {
      newShip = { ...newShip, isReloading: false, reloadTimeRemaining: 0 };
    } else {
      newShip = { ...newShip, reloadTimeRemaining: newReloadTime };
    }
  }
  
  return {
    ...state,
    cannonballs: updatedBalls,
    playerShip: newShip
  };
}

export function getTileColor(tile: WorldMapTile, discovered: boolean): string {
  if (!discovered) return '#1a1a2e';
  
  switch (tile.type) {
    case 'deep_ocean':
      return `rgb(${20 + tile.elevation * 20}, ${40 + tile.elevation * 30}, ${100 + tile.elevation * 50})`;
    case 'shallow_water':
      return `rgb(${40 + tile.elevation * 30}, ${100 + tile.elevation * 40}, ${180 + tile.elevation * 30})`;
    case 'island':
      return `rgb(${60 + tile.elevation * 50}, ${120 + tile.elevation * 60}, ${40 + tile.elevation * 30})`;
    case 'reef':
      return `rgb(${150 + tile.elevation * 30}, ${100 + tile.elevation * 40}, ${80 + tile.elevation * 30})`;
    case 'port':
      return '#8b7355';
    case 'whirlpool':
      return '#4a90d9';
    default:
      return '#1e3a5f';
  }
}

export const WORLD_MAP_DEFAULTS: WorldMapConfig = {
  width: 100,
  height: 100,
  tileSize: 16,
  seed: uuidv4(),
  islandDensity: 0.15
};

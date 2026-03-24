import { assetUrl } from "@/lib/assetConfig";
export const TILE_SIZE = 16;
export const RENDER_SCALE = 2;
export const SCALED_TILE_SIZE = TILE_SIZE * RENDER_SCALE;

export interface TilesetConfig {
  image: string;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
}

export const DUNGEON_TILESET: TilesetConfig = {
  image: assetUrl("/sprites/dampdungeons/Dungeon_WallsAndFloors.png"),
  tileWidth: 16,
  tileHeight: 16,
  columns: 6,
  rows: 32
};

export const DECORATIONS_TILESET: TilesetConfig = {
  image: assetUrl("/sprites/dampdungeons/DungeonDecorations.png"),
  tileWidth: 16,
  tileHeight: 16,
  columns: 16,
  rows: 16
};

export const OBJECTS_TILESET: TilesetConfig = {
  image: assetUrl("/sprites/dampdungeons/Dungeon_ObjectsDungeon.png"),
  tileWidth: 16,
  tileHeight: 16,
  columns: 8,
  rows: 8
};

export const TILE_TYPES = {
  FLOOR_DARK: 0,
  FLOOR_MEDIUM: 1,
  FLOOR_LIGHT: 2,
  FLOOR_CRACKED: 3,
  FLOOR_MOSSY: 4,
  FLOOR_STONE: 5,
  
  WALL_TOP: 6,
  WALL_TOP_LEFT: 7,
  WALL_TOP_RIGHT: 8,
  WALL_LEFT: 12,
  WALL_RIGHT: 13,
  WALL_BOTTOM: 18,
  WALL_BOTTOM_LEFT: 19,
  WALL_BOTTOM_RIGHT: 20,
  WALL_SOLID: 14,
  
  DOOR_CLOSED: 24,
  DOOR_OPEN: 25,
  
  STAIRS_UP: 30,
  STAIRS_DOWN: 31,
  
  CHEST_CLOSED: 36,
  CHEST_OPEN: 37,
  
  TRAP_HIDDEN: 42,
  TRAP_VISIBLE: 43,
  
  WATER: 48,
  LAVA: 49,
  
  PILLAR_TOP: 54,
  PILLAR_BOTTOM: 55,
} as const;

export interface TileMapping {
  floor: number[];
  wall: number[];
  door: number[];
  stairs_up: number[];
  stairs_down: number[];
  chest: number[];
  trap: number[];
}

export const DEFAULT_TILE_MAPPING: TileMapping = {
  floor: [0, 1, 2, 3, 4, 5],
  wall: [6, 7, 8, 12, 13, 14, 18, 19, 20],
  door: [24, 25],
  stairs_up: [30],
  stairs_down: [31],
  chest: [36, 37],
  trap: [42, 43]
};

export function getTileCoords(tileIndex: number, tileset: TilesetConfig): { x: number; y: number } {
  const col = tileIndex % tileset.columns;
  const row = Math.floor(tileIndex / tileset.columns);
  return {
    x: col * tileset.tileWidth,
    y: row * tileset.tileHeight
  };
}

export function selectWallTile(
  hasTop: boolean,
  hasBottom: boolean,
  hasLeft: boolean,
  hasRight: boolean
): number {
  if (!hasTop && !hasBottom && !hasLeft && !hasRight) return TILE_TYPES.WALL_SOLID;
  if (!hasTop && hasBottom) return TILE_TYPES.WALL_TOP;
  if (hasTop && !hasBottom) return TILE_TYPES.WALL_BOTTOM;
  if (!hasLeft && hasRight) return TILE_TYPES.WALL_LEFT;
  if (hasLeft && !hasRight) return TILE_TYPES.WALL_RIGHT;
  if (!hasTop && !hasLeft) return TILE_TYPES.WALL_TOP_LEFT;
  if (!hasTop && !hasRight) return TILE_TYPES.WALL_TOP_RIGHT;
  if (!hasBottom && !hasLeft) return TILE_TYPES.WALL_BOTTOM_LEFT;
  if (!hasBottom && !hasRight) return TILE_TYPES.WALL_BOTTOM_RIGHT;
  return TILE_TYPES.WALL_SOLID;
}

export function selectFloorTile(seed: number): number {
  const floors = [
    TILE_TYPES.FLOOR_DARK,
    TILE_TYPES.FLOOR_MEDIUM,
    TILE_TYPES.FLOOR_LIGHT,
    TILE_TYPES.FLOOR_STONE
  ];
  if (seed % 20 === 0) return TILE_TYPES.FLOOR_CRACKED;
  if (seed % 15 === 0) return TILE_TYPES.FLOOR_MOSSY;
  return floors[seed % floors.length];
}

export interface TiledLayer {
  name: string;
  type: 'tilelayer' | 'objectgroup';
  data?: number[];
  objects?: TiledObject[];
  width: number;
  height: number;
  visible: boolean;
}

export interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: Record<string, string | number | boolean>;
}

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: {
    firstgid: number;
    name: string;
    image: string;
    imagewidth: number;
    imageheight: number;
    tilewidth: number;
    tileheight: number;
    columns: number;
    tilecount: number;
  }[];
}

export function parseTiledMap(json: TiledMap): {
  backgroundLayer: number[][];
  collisionLayer: boolean[][];
  objects: TiledObject[];
  width: number;
  height: number;
} {
  const { width, height, layers } = json;
  
  const backgroundLayer: number[][] = [];
  const collisionLayer: boolean[][] = [];
  let objects: TiledObject[] = [];
  
  for (let y = 0; y < height; y++) {
    backgroundLayer[y] = [];
    collisionLayer[y] = [];
    for (let x = 0; x < width; x++) {
      backgroundLayer[y][x] = 0;
      collisionLayer[y][x] = false;
    }
  }
  
  for (const layer of layers) {
    if (layer.type === 'tilelayer' && layer.data) {
      const isCollision = layer.name.toLowerCase().includes('block') || 
                          layer.name.toLowerCase().includes('collision') ||
                          layer.name.toLowerCase().includes('wall');
      
      for (let i = 0; i < layer.data.length; i++) {
        const x = i % width;
        const y = Math.floor(i / width);
        const tileId = layer.data[i];
        
        if (tileId > 0) {
          if (isCollision) {
            collisionLayer[y][x] = true;
          }
          backgroundLayer[y][x] = tileId - 1;
        }
      }
    } else if (layer.type === 'objectgroup' && layer.objects) {
      objects = objects.concat(layer.objects);
    }
  }
  
  return { backgroundLayer, collisionLayer, objects, width, height };
}

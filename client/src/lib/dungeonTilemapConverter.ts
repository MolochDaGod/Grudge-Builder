import type { GeneratedDungeon, DungeonTile, DungeonEntity } from './dungeonGenerator';
import { TILE_TYPES, selectFloorTile, SCALED_TILE_SIZE } from './dungeonTileset';
import type { Direction, AnimationState } from './dungeonSpriteConfig';

export interface TilemapDungeon {
  tiles: number[][];
  collision: boolean[][];
  visibility: boolean[][];
  explored: boolean[][];
  entities: TilemapEntity[];
  width: number;
  height: number;
  entrance: { x: number; y: number };
  exit: { x: number; y: number };
  seed: number;
}

export interface TilemapEntity {
  id: string;
  type: 'player' | 'monster' | 'item' | 'chest';
  tileX: number;
  tileY: number;
  pixelX: number;
  pixelY: number;
  targetPixelX?: number;
  targetPixelY?: number;
  velocityX: number;
  velocityY: number;
  spriteId: string;
  direction: Direction;
  animation: AnimationState;
  hp?: number;
  maxHp?: number;
  damage?: number;
  speed: number;
  isMoving: boolean;
  data?: any;
}

export function convertToTilemap(dungeon: GeneratedDungeon): TilemapDungeon {
  const { width, height, tiles, entities, entrance, exit, seed } = dungeon;
  
  const tilemapTiles: number[][] = [];
  const collision: boolean[][] = [];
  const visibility: boolean[][] = [];
  const explored: boolean[][] = [];
  
  for (let y = 0; y < height; y++) {
    tilemapTiles[y] = [];
    collision[y] = [];
    visibility[y] = [];
    explored[y] = [];
    
    for (let x = 0; x < width; x++) {
      const tile = tiles[y][x];
      tilemapTiles[y][x] = getTileIndex(tile, x, y, tiles, width, height);
      collision[y][x] = tile.type === 'wall';
      visibility[y][x] = tile.visible;
      explored[y][x] = tile.explored;
    }
  }
  
  const tilemapEntities: TilemapEntity[] = entities.map(entity => 
    convertEntity(entity)
  );
  
  return {
    tiles: tilemapTiles,
    collision,
    visibility,
    explored,
    entities: tilemapEntities,
    width,
    height,
    entrance,
    exit,
    seed
  };
}

function getTileIndex(
  tile: DungeonTile, 
  x: number, 
  y: number, 
  tiles: DungeonTile[][], 
  width: number, 
  height: number
): number {
  const tileHash = x * 31 + y * 17;
  
  switch (tile.type) {
    case 'floor':
      return selectFloorTile(tileHash);
    
    case 'wall':
      return getWallTile(x, y, tiles, width, height);
    
    case 'door':
      return TILE_TYPES.DOOR_CLOSED;
    
    case 'stairs_up':
      return TILE_TYPES.STAIRS_UP;
    
    case 'stairs_down':
      return TILE_TYPES.STAIRS_DOWN;
    
    case 'chest':
      return TILE_TYPES.CHEST_CLOSED;
    
    case 'trap':
      return TILE_TYPES.TRAP_HIDDEN;
    
    default:
      return TILE_TYPES.FLOOR_DARK;
  }
}

function getWallTile(
  x: number, 
  y: number, 
  tiles: DungeonTile[][], 
  width: number, 
  height: number
): number {
  const isFloor = (tx: number, ty: number): boolean => {
    if (tx < 0 || tx >= width || ty < 0 || ty >= height) return false;
    return tiles[ty][tx].type !== 'wall';
  };
  
  const hasFloorAbove = isFloor(x, y - 1);
  const hasFloorBelow = isFloor(x, y + 1);
  const hasFloorLeft = isFloor(x - 1, y);
  const hasFloorRight = isFloor(x + 1, y);
  
  if (hasFloorBelow && !hasFloorAbove && !hasFloorLeft && !hasFloorRight) {
    return TILE_TYPES.WALL_TOP;
  }
  if (hasFloorAbove && !hasFloorBelow && !hasFloorLeft && !hasFloorRight) {
    return TILE_TYPES.WALL_BOTTOM;
  }
  if (hasFloorRight && !hasFloorLeft) {
    if (hasFloorBelow) return TILE_TYPES.WALL_TOP_LEFT;
    if (hasFloorAbove) return TILE_TYPES.WALL_BOTTOM_LEFT;
    return TILE_TYPES.WALL_LEFT;
  }
  if (hasFloorLeft && !hasFloorRight) {
    if (hasFloorBelow) return TILE_TYPES.WALL_TOP_RIGHT;
    if (hasFloorAbove) return TILE_TYPES.WALL_BOTTOM_RIGHT;
    return TILE_TYPES.WALL_RIGHT;
  }
  if (hasFloorBelow && hasFloorRight) return TILE_TYPES.WALL_TOP_LEFT;
  if (hasFloorBelow && hasFloorLeft) return TILE_TYPES.WALL_TOP_RIGHT;
  if (hasFloorAbove && hasFloorRight) return TILE_TYPES.WALL_BOTTOM_LEFT;
  if (hasFloorAbove && hasFloorLeft) return TILE_TYPES.WALL_BOTTOM_RIGHT;
  
  return TILE_TYPES.WALL_SOLID;
}

function convertEntity(entity: DungeonEntity): TilemapEntity {
  const pixelX = entity.x * SCALED_TILE_SIZE;
  const pixelY = entity.y * SCALED_TILE_SIZE;
  
  let spriteId = 'slime';
  if (entity.type === 'monster' && entity.monster) {
    const spriteSet = entity.monster.spriteSet?.toLowerCase() || '';
    if (spriteSet.includes('orc')) spriteId = 'orc';
    else if (spriteSet.includes('goblin')) spriteId = 'goblin';
    else if (spriteSet.includes('slime')) spriteId = 'slime';
    else spriteId = 'monster';
  }
  
  const direction = (entity.direction || 'down') as Direction;
  const animation = (entity.spriteState === 'dead' ? 'death' : 
                     entity.spriteState || 'idle') as AnimationState;
  
  return {
    id: entity.id,
    type: entity.type === 'monster' ? 'monster' : 
          entity.type === 'loot' ? 'item' : 'player',
    tileX: entity.x,
    tileY: entity.y,
    pixelX,
    pixelY,
    velocityX: 0,
    velocityY: 0,
    spriteId,
    direction,
    animation,
    hp: entity.hp,
    maxHp: entity.maxHp,
    damage: entity.monster?.baseDamage,
    speed: 150,
    isMoving: false,
    data: entity.monster
  };
}

export function updateVisibility(
  tilemap: TilemapDungeon,
  dungeonRef: GeneratedDungeon
): void {
  for (let y = 0; y < tilemap.height; y++) {
    for (let x = 0; x < tilemap.width; x++) {
      tilemap.visibility[y][x] = dungeonRef.tiles[y][x].visible;
      tilemap.explored[y][x] = dungeonRef.tiles[y][x].explored;
    }
  }
}

export function tileToPixel(tileX: number, tileY: number): { x: number; y: number } {
  return {
    x: tileX * SCALED_TILE_SIZE,
    y: tileY * SCALED_TILE_SIZE
  };
}

export function pixelToTile(pixelX: number, pixelY: number): { x: number; y: number } {
  return {
    x: Math.floor(pixelX / SCALED_TILE_SIZE),
    y: Math.floor(pixelY / SCALED_TILE_SIZE)
  };
}

export function canMoveTo(
  tilemap: TilemapDungeon,
  tileX: number,
  tileY: number
): boolean {
  if (tileX < 0 || tileX >= tilemap.width || tileY < 0 || tileY >= tilemap.height) {
    return false;
  }
  return !tilemap.collision[tileY][tileX];
}

export function moveEntity(
  entity: TilemapEntity,
  targetTileX: number,
  targetTileY: number,
  tilemap: TilemapDungeon
): boolean {
  if (!canMoveTo(tilemap, targetTileX, targetTileY)) {
    return false;
  }
  
  const blocked = tilemap.entities.some(other =>
    other.id !== entity.id &&
    other.tileX === targetTileX &&
    other.tileY === targetTileY &&
    other.type === 'monster' &&
    other.hp && other.hp > 0
  );
  
  if (blocked) {
    return false;
  }
  
  entity.targetPixelX = targetTileX * SCALED_TILE_SIZE;
  entity.targetPixelY = targetTileY * SCALED_TILE_SIZE;
  entity.tileX = targetTileX;
  entity.tileY = targetTileY;
  entity.isMoving = true;
  entity.animation = 'walk';
  
  const dx = targetTileX * SCALED_TILE_SIZE - entity.pixelX;
  const dy = targetTileY * SCALED_TILE_SIZE - entity.pixelY;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    entity.direction = dx > 0 ? 'right' : 'left';
  } else {
    entity.direction = dy > 0 ? 'down' : 'up';
  }
  
  return true;
}

export function updateEntityPhysics(
  entity: TilemapEntity,
  deltaTime: number
): void {
  if (!entity.isMoving || entity.targetPixelX === undefined || entity.targetPixelY === undefined) {
    return;
  }
  
  const dx = entity.targetPixelX - entity.pixelX;
  const dy = entity.targetPixelY - entity.pixelY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < 1) {
    entity.pixelX = entity.targetPixelX;
    entity.pixelY = entity.targetPixelY;
    entity.isMoving = false;
    entity.animation = 'idle';
    entity.velocityX = 0;
    entity.velocityY = 0;
    return;
  }
  
  const moveDistance = entity.speed * (deltaTime / 1000);
  const ratio = Math.min(moveDistance / distance, 1);
  
  entity.velocityX = dx * ratio / (deltaTime / 1000);
  entity.velocityY = dy * ratio / (deltaTime / 1000);
  
  entity.pixelX += dx * ratio;
  entity.pixelY += dy * ratio;
}

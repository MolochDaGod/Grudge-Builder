import * as ROT from "rot-js";
import { v4 as uuidv4 } from 'uuid';
import { DUNGEON_FLOORS, MONSTERS, getMonstersByLevel } from "@shared/definitions";
import type { DungeonFloorDefinition, MonsterDefinition } from "@shared/definitions/types";
import type { TiledMapFormat, TiledLayer, TiledObjectData, TiledTileset } from "./tiledMapLoader";
import { assetUrl } from "@/lib/assetConfig";

export const TILE_IDS = {
  FLOOR: 1,
  FLOOR_CRACKED: 2,
  FLOOR_SPECIAL: 3,
  CHEST: 4,
  SHRINE: 5,
  TOP_LEFT: 6,
  LEFT: 7,
  RIGHT: 8,
  BOTTOM_LEFT: 19,
  BOTTOM: 18,
  BOTTOM_RIGHT: 20,
  WALL: 16,
  DOOR: 32,
  STAIRS_UP: 65,
  STAIRS_DOWN: 64,
  TRAP: 49,
  WATER: 80,
  LAVA: 81
} as const;

export interface DungeonTile {
  type: "floor" | "wall" | "door" | "stairs_up" | "stairs_down" | "chest" | "trap";
  explored: boolean;
  visible: boolean;
  spriteIndex: number;
}

export type EntityDirection = "down" | "left" | "right" | "up";
export type EntityState = "idle" | "walk" | "attack" | "hurt" | "dead";

export interface DungeonEntity {
  id: string;
  type: "monster" | "loot" | "player";
  x: number;
  y: number;
  monster?: MonsterDefinition;
  loot?: { itemId: string; quantity: number }[];
  hp?: number;
  maxHp?: number;
  direction?: EntityDirection;
  spriteState?: EntityState;
  lastMoveTime?: number;
  aggroRange?: number;
  isAggro?: boolean;
}

export interface GeneratedDungeon {
  width: number;
  height: number;
  tiles: DungeonTile[][];
  entities: DungeonEntity[];
  entrance: { x: number; y: number };
  exit: { x: number; y: number };
  rooms: { x: number; y: number; w: number; h: number }[];
  seed: number;
}

export function generateDungeon(floorId: string, seed?: number): GeneratedDungeon {
  const floor = DUNGEON_FLOORS[floorId];
  if (!floor) {
    throw new Error(`Unknown dungeon floor: ${floorId}`);
  }
  
  const dungeonSeed = seed ?? Math.floor(Math.random() * 1000000);
  ROT.RNG.setSeed(dungeonSeed);
  
  const { width, height } = floor;
  const tiles: DungeonTile[][] = [];
  const rooms: { x: number; y: number; w: number; h: number }[] = [];
  
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      tiles[y][x] = {
        type: "wall",
        explored: false,
        visible: false,
        spriteIndex: 16
      };
    }
  }
  
  const digger = new ROT.Map.Digger(width, height, {
    roomWidth: [5, 12],
    roomHeight: [5, 10],
    corridorLength: [3, 10],
    dugPercentage: 0.4
  });
  
  digger.create((x, y, value) => {
    if (value === 0) {
      tiles[y][x] = {
        type: "floor",
        explored: false,
        visible: false,
        spriteIndex: 0
      };
    }
  });
  
  const diggerRooms = digger.getRooms();
  diggerRooms.forEach(room => {
    rooms.push({
      x: room.getLeft(),
      y: room.getTop(),
      w: room.getRight() - room.getLeft() + 1,
      h: room.getBottom() - room.getTop() + 1
    });
    
    room.getDoors((x, y) => {
      tiles[y][x] = {
        type: "door",
        explored: false,
        visible: false,
        spriteIndex: 32
      };
    });
  });
  
  let entrance = { x: 0, y: 0 };
  let exit = { x: 0, y: 0 };
  
  if (rooms.length >= 2) {
    const entranceRoom = rooms[0];
    entrance = {
      x: entranceRoom.x + Math.floor(entranceRoom.w / 2),
      y: entranceRoom.y + Math.floor(entranceRoom.h / 2)
    };
    tiles[entrance.y][entrance.x] = {
      type: "stairs_up",
      explored: true,
      visible: true,
      spriteIndex: 65
    };
    
    const exitRoom = rooms[rooms.length - 1];
    exit = {
      x: exitRoom.x + Math.floor(exitRoom.w / 2),
      y: exitRoom.y + Math.floor(exitRoom.h / 2)
    };
    tiles[exit.y][exit.x] = {
      type: "stairs_down",
      explored: false,
      visible: false,
      spriteIndex: 64
    };
  }
  
  const entities: DungeonEntity[] = [];
  const availableMonsters = getMonstersByLevel(floor.minLevel, floor.maxLevel);
  
  rooms.forEach((room, roomIndex) => {
    if (roomIndex === 0) return;
    
    const monsterCount = Math.floor(ROT.RNG.getUniform() * 3) + 1;
    
    for (let i = 0; i < monsterCount; i++) {
      if (ROT.RNG.getUniform() > floor.monsterDensity) continue;
      
      const monster = availableMonsters[Math.floor(ROT.RNG.getUniform() * availableMonsters.length)];
      if (!monster) continue;
      
      const mx = room.x + 1 + Math.floor(ROT.RNG.getUniform() * (room.w - 2));
      const my = room.y + 1 + Math.floor(ROT.RNG.getUniform() * (room.h - 2));
      
      if (tiles[my][mx].type === "floor") {
        const directions: EntityDirection[] = ["down", "left", "right", "up"];
        entities.push({
          id: uuidv4(),
          type: "monster",
          x: mx,
          y: my,
          monster,
          hp: monster.baseHp,
          maxHp: monster.baseHp,
          direction: directions[Math.floor(ROT.RNG.getUniform() * 4)],
          spriteState: "idle",
          lastMoveTime: 0,
          aggroRange: 6,
          isAggro: false
        });
      }
    }
    
    if (ROT.RNG.getUniform() < floor.lootDensity) {
      const lx = room.x + 1 + Math.floor(ROT.RNG.getUniform() * (room.w - 2));
      const ly = room.y + 1 + Math.floor(ROT.RNG.getUniform() * (room.h - 2));
      
      if (tiles[ly][lx].type === "floor") {
        tiles[ly][lx] = {
          type: "chest",
          explored: false,
          visible: false,
          spriteIndex: 48
        };
      }
    }
    
    if (ROT.RNG.getUniform() < 0.1) {
      const tx = room.x + 1 + Math.floor(ROT.RNG.getUniform() * (room.w - 2));
      const ty = room.y + 1 + Math.floor(ROT.RNG.getUniform() * (room.h - 2));
      
      if (tiles[ty][tx].type === "floor") {
        tiles[ty][tx] = {
          type: "trap",
          explored: false,
          visible: false,
          spriteIndex: 49
        };
      }
    }
  });
  
  if (floor.bossId) {
    const bossRoom = rooms[rooms.length - 1];
    const boss = MONSTERS[floor.bossId];
    if (boss) {
      entities.push({
        id: uuidv4(),
        type: "monster",
        x: bossRoom.x + Math.floor(bossRoom.w / 2),
        y: bossRoom.y + Math.floor(bossRoom.h / 2) + 1,
        monster: boss,
        hp: boss.baseHp,
        maxHp: boss.baseHp,
        direction: "down",
        spriteState: "idle",
        lastMoveTime: 0,
        aggroRange: 10,
        isAggro: false
      });
    }
  }
  
  return {
    width,
    height,
    tiles,
    entities,
    entrance,
    exit,
    rooms,
    seed: dungeonSeed
  };
}

export function computeFOV(
  dungeon: GeneratedDungeon,
  playerX: number,
  playerY: number,
  radius: number = 8
): void {
  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) {
      dungeon.tiles[y][x].visible = false;
    }
  }
  
  const fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
    if (x < 0 || x >= dungeon.width || y < 0 || y >= dungeon.height) return false;
    return dungeon.tiles[y][x].type !== "wall";
  });
  
  fov.compute(playerX, playerY, radius, (x, y, r, visibility) => {
    if (x >= 0 && x < dungeon.width && y >= 0 && y < dungeon.height) {
      dungeon.tiles[y][x].visible = true;
      dungeon.tiles[y][x].explored = true;
    }
  });
}

export function findPath(
  dungeon: GeneratedDungeon,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  
  const passable = (x: number, y: number): boolean => {
    if (x < 0 || x >= dungeon.width || y < 0 || y >= dungeon.height) return false;
    const tile = dungeon.tiles[y][x];
    return tile.type !== "wall";
  };
  
  const astar = new ROT.Path.AStar(endX, endY, passable, { topology: 8 });
  
  astar.compute(startX, startY, (x, y) => {
    path.push({ x, y });
  });
  
  return path;
}

export function getVisibleEntities(dungeon: GeneratedDungeon): DungeonEntity[] {
  return dungeon.entities.filter(entity => {
    if (entity.y < 0 || entity.y >= dungeon.height) return false;
    if (entity.x < 0 || entity.x >= dungeon.width) return false;
    return dungeon.tiles[entity.y][entity.x].visible;
  });
}

export interface AITickResult {
  entityId: string;
  action: "move" | "attack" | "idle";
  newX?: number;
  newY?: number;
  direction?: EntityDirection;
  damage?: number;
}

export function tickEnemyAI(
  dungeon: GeneratedDungeon,
  playerX: number,
  playerY: number,
  currentTime: number
): AITickResult[] {
  const results: AITickResult[] = [];
  const MOVE_COOLDOWN = 500;
  
  for (const entity of dungeon.entities) {
    if (entity.type !== "monster" || !entity.hp || entity.hp <= 0) continue;
    
    const dx = playerX - entity.x;
    const dy = playerY - entity.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= (entity.aggroRange || 6)) {
      entity.isAggro = true;
    } else if (distance > (entity.aggroRange || 6) + 2) {
      entity.isAggro = false;
    }
    
    if (!entity.isAggro) {
      if (entity.spriteState !== "idle") {
        entity.spriteState = "idle";
      }
      continue;
    }
    
    const isAdjacent = Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && distance > 0 && distance < 2;
    
    if (isAdjacent) {
      const attackDirection: EntityDirection = 
        Math.abs(dx) > Math.abs(dy) 
          ? (dx > 0 ? "right" : "left") 
          : (dy > 0 ? "down" : "up");
      
      entity.direction = attackDirection;
      entity.spriteState = "attack";
      
      const damage = entity.monster?.baseDamage || 5;
      results.push({
        entityId: entity.id,
        action: "attack",
        direction: attackDirection,
        damage
      });
      
      entity.lastMoveTime = currentTime;
    } else {
      if (currentTime - (entity.lastMoveTime || 0) < MOVE_COOLDOWN) {
        continue;
      }
      
      const path = findPath(dungeon, entity.x, entity.y, playerX, playerY);
      
      if (path.length >= 2) {
        const nextStep = path[1];
        
        const blocked = dungeon.entities.some(other => 
          other.id !== entity.id && 
          other.x === nextStep.x && 
          other.y === nextStep.y &&
          other.type === "monster" &&
          other.hp && other.hp > 0
        );
        
        if (!blocked && !(nextStep.x === playerX && nextStep.y === playerY)) {
          const moveDx = nextStep.x - entity.x;
          const moveDy = nextStep.y - entity.y;
          const moveDirection: EntityDirection = 
            Math.abs(moveDx) > Math.abs(moveDy) 
              ? (moveDx > 0 ? "right" : "left") 
              : (moveDy > 0 ? "down" : "up");
          
          entity.x = nextStep.x;
          entity.y = nextStep.y;
          entity.direction = moveDirection;
          entity.spriteState = "walk";
          entity.lastMoveTime = currentTime;
          
          results.push({
            entityId: entity.id,
            action: "move",
            newX: nextStep.x,
            newY: nextStep.y,
            direction: moveDirection
          });
        }
      }
    }
  }
  
  return results;
}

export function resetEntityAnimations(dungeon: GeneratedDungeon): void {
  for (const entity of dungeon.entities) {
    if (entity.type === "monster" && (entity.spriteState === "attack" || entity.spriteState === "walk")) {
      entity.spriteState = "idle";
    }
  }
}

function spriteIndexToTileId(spriteIndex: number, tileType: DungeonTile['type']): number {
  if (spriteIndex > 0) {
    return spriteIndex;
  }
  switch (tileType) {
    case "floor": return TILE_IDS.FLOOR;
    case "wall": return TILE_IDS.WALL;
    case "door": return TILE_IDS.DOOR;
    case "stairs_up": return TILE_IDS.STAIRS_UP;
    case "stairs_down": return TILE_IDS.STAIRS_DOWN;
    case "chest": return TILE_IDS.CHEST;
    case "trap": return TILE_IDS.TRAP;
    default: return TILE_IDS.FLOOR;
  }
}

export function dungeonToTiledFormat(dungeon: GeneratedDungeon): TiledMapFormat {
  const TILE_HEIGHT = 16;
  const backgroundData: number[] = [];
  const collisionData: number[] = [];
  const objects: TiledObjectData[] = [];
  let objectId = 1;
  
  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) {
      const tile = dungeon.tiles[y][x];
      
      const bgTileId = spriteIndexToTileId(tile.spriteIndex, tile.type);
      const isCollision = tile.type === "wall" ? 1 : 0;
      
      if (tile.type === "stairs_up") {
        objects.push({
          id: objectId++,
          name: "Entrance",
          type: "playerStart",
          x: x * TILE_HEIGHT,
          y: (y + 1) * TILE_HEIGHT,
          width: 16,
          height: 16
        });
      } else if (tile.type === "stairs_down") {
        objects.push({
          id: objectId++,
          name: "Exit",
          type: "door",
          x: x * TILE_HEIGHT,
          y: (y + 1) * TILE_HEIGHT,
          width: 16,
          height: 16,
          properties: { targetTilemap: "next_floor" }
        });
      } else if (tile.type === "chest") {
        objects.push({
          id: objectId++,
          name: "Chest",
          type: "chest",
          x: x * TILE_HEIGHT,
          y: (y + 1) * TILE_HEIGHT,
          width: 16,
          height: 16,
          properties: { loot: "random", amount: 1 }
        });
      } else if (tile.type === "trap") {
        objects.push({
          id: objectId++,
          name: "Trap",
          type: "trap",
          x: x * TILE_HEIGHT,
          y: (y + 1) * TILE_HEIGHT,
          width: 16,
          height: 16,
          properties: { damage: 10 }
        });
      }
      
      backgroundData.push(bgTileId);
      collisionData.push(isCollision);
    }
  }
  
  for (const entity of dungeon.entities) {
    if (entity.type === "monster" && entity.monster) {
      objects.push({
        id: objectId++,
        name: entity.monster.name,
        type: "monster",
        x: entity.x * TILE_HEIGHT,
        y: (entity.y + 1) * TILE_HEIGHT,
        width: 16,
        height: 16,
        properties: {
          monsterId: entity.monster.id,
          sprite: entity.monster.spriteKey || entity.monster.id
        }
      });
    }
  }
  
  const backgroundLayer: TiledLayer = {
    name: "background",
    type: "tilelayer",
    width: dungeon.width,
    height: dungeon.height,
    visible: true,
    data: backgroundData
  };
  
  const collisionLayer: TiledLayer = {
    name: "collision",
    type: "tilelayer",
    width: dungeon.width,
    height: dungeon.height,
    visible: true,
    data: collisionData
  };
  
  const objectsLayer: TiledLayer = {
    name: "objects",
    type: "objectgroup",
    width: dungeon.width,
    height: dungeon.height,
    visible: true,
    objects
  };
  
  const tileset: TiledTileset = {
    firstgid: 1,
    name: "dungeon",
    image: assetUrl("/sprites/dampdungeons/Dungeon_WallsAndFloors.png"),
    imagewidth: 96,
    imageheight: 512,
    tilewidth: 16,
    tileheight: 16,
    columns: 6,
    tilecount: 192
  };
  
  return {
    width: dungeon.width,
    height: dungeon.height,
    tilewidth: 16,
    tileheight: 16,
    layers: [backgroundLayer, collisionLayer, objectsLayer],
    tilesets: [tileset]
  };
}

export function applyRoomDecorations(dungeon: GeneratedDungeon): void {
  for (const room of dungeon.rooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (y < 0 || y >= dungeon.height || x < 0 || x >= dungeon.width) continue;
        const tile = dungeon.tiles[y][x];
        
        if (tile.type === "floor") {
          const isTopEdge = y === room.y;
          const isBottomEdge = y === room.y + room.h - 1;
          const isLeftEdge = x === room.x;
          const isRightEdge = x === room.x + room.w - 1;
          
          if (isTopEdge && isLeftEdge) {
            tile.spriteIndex = TILE_IDS.TOP_LEFT;
          } else if (isTopEdge) {
            tile.spriteIndex = TILE_IDS.TOP_LEFT;
          } else if (isBottomEdge && isLeftEdge) {
            tile.spriteIndex = TILE_IDS.BOTTOM_LEFT;
          } else if (isBottomEdge && isRightEdge) {
            tile.spriteIndex = TILE_IDS.BOTTOM_RIGHT;
          } else if (isBottomEdge) {
            tile.spriteIndex = TILE_IDS.BOTTOM;
          } else if (isLeftEdge) {
            tile.spriteIndex = TILE_IDS.LEFT;
          } else if (isRightEdge) {
            tile.spriteIndex = TILE_IDS.RIGHT;
          } else {
            tile.spriteIndex = ROT.RNG.getUniform() > 0.85 ? TILE_IDS.FLOOR_CRACKED : TILE_IDS.FLOOR;
          }
        }
      }
    }
  }
}

export type DungeonTheme = 'dungeon' | 'cave' | 'crypt' | 'shrine' | 'mine';

export interface DungeonGenerationOptions {
  floorId: string;
  seed?: number;
  theme?: DungeonTheme;
  roomDensity?: number;
  trapDensity?: number;
  waterFeatures?: boolean;
  specialRooms?: boolean;
}

export function generateThemedDungeon(options: DungeonGenerationOptions): GeneratedDungeon {
  const dungeon = generateDungeon(options.floorId, options.seed);
  
  if (options.waterFeatures && ROT.RNG.getUniform() > 0.5) {
    addWaterPools(dungeon);
  }
  
  if (options.specialRooms && dungeon.rooms.length > 3) {
    addSpecialRoom(dungeon, dungeon.rooms[Math.floor(dungeon.rooms.length / 2)]);
  }
  
  applyRoomDecorations(dungeon);
  
  return dungeon;
}

function addWaterPools(dungeon: GeneratedDungeon): void {
  const poolCount = Math.floor(ROT.RNG.getUniform() * 2) + 1;
  
  for (let i = 0; i < poolCount; i++) {
    if (dungeon.rooms.length < 3) break;
    const room = dungeon.rooms[1 + Math.floor(ROT.RNG.getUniform() * (dungeon.rooms.length - 2))];
    
    const centerX = room.x + Math.floor(room.w / 2);
    const centerY = room.y + Math.floor(room.h / 2);
    const radius = Math.min(2, Math.floor(Math.min(room.w, room.h) / 3));
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const wx = centerX + dx;
          const wy = centerY + dy;
          if (wy > 0 && wy < dungeon.height - 1 && wx > 0 && wx < dungeon.width - 1) {
            if (dungeon.tiles[wy][wx].type === "floor") {
              dungeon.tiles[wy][wx].spriteIndex = TILE_IDS.WATER;
            }
          }
        }
      }
    }
  }
}

function addSpecialRoom(dungeon: GeneratedDungeon, room: { x: number; y: number; w: number; h: number }): void {
  const centerX = room.x + Math.floor(room.w / 2);
  const centerY = room.y + Math.floor(room.h / 2);
  
  if (centerY > 0 && centerY < dungeon.height && centerX > 0 && centerX < dungeon.width) {
    if (dungeon.tiles[centerY][centerX].type === "floor") {
      dungeon.tiles[centerY][centerX].type = "chest";
      dungeon.tiles[centerY][centerX].spriteIndex = TILE_IDS.SHRINE;
    }
  }
}

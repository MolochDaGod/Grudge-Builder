import type { DungeonFloorDefinition, TileDefinition } from "./types";

export const TILES: Record<string, TileDefinition> = {
  "tile_floor_stone": {
    id: "tile_floor_stone",
    name: "Stone Floor",
    spriteIndex: 0,
    walkable: true,
    transparent: true
  },
  "tile_floor_dirt": {
    id: "tile_floor_dirt",
    name: "Dirt Floor",
    spriteIndex: 1,
    walkable: true,
    transparent: true
  },
  "tile_floor_wood": {
    id: "tile_floor_wood",
    name: "Wooden Floor",
    spriteIndex: 2,
    walkable: true,
    transparent: true
  },
  "tile_floor_grass": {
    id: "tile_floor_grass",
    name: "Grass",
    spriteIndex: 3,
    walkable: true,
    transparent: true
  },
  "tile_wall_stone": {
    id: "tile_wall_stone",
    name: "Stone Wall",
    spriteIndex: 16,
    walkable: false,
    transparent: false
  },
  "tile_wall_brick": {
    id: "tile_wall_brick",
    name: "Brick Wall",
    spriteIndex: 17,
    walkable: false,
    transparent: false
  },
  "tile_wall_cave": {
    id: "tile_wall_cave",
    name: "Cave Wall",
    spriteIndex: 18,
    walkable: false,
    transparent: false
  },
  "tile_door_closed": {
    id: "tile_door_closed",
    name: "Closed Door",
    spriteIndex: 32,
    walkable: false,
    transparent: false,
    interactable: true,
    interactionType: "door"
  },
  "tile_door_open": {
    id: "tile_door_open",
    name: "Open Door",
    spriteIndex: 33,
    walkable: true,
    transparent: true
  },
  "tile_chest": {
    id: "tile_chest",
    name: "Treasure Chest",
    spriteIndex: 48,
    walkable: false,
    transparent: true,
    interactable: true,
    interactionType: "chest"
  },
  "tile_trap_spikes": {
    id: "tile_trap_spikes",
    name: "Spike Trap",
    spriteIndex: 49,
    walkable: true,
    transparent: true,
    interactable: true,
    interactionType: "trap"
  },
  "tile_stairs_down": {
    id: "tile_stairs_down",
    name: "Stairs Down",
    spriteIndex: 64,
    walkable: true,
    transparent: true,
    interactable: true,
    interactionType: "portal"
  },
  "tile_stairs_up": {
    id: "tile_stairs_up",
    name: "Stairs Up",
    spriteIndex: 65,
    walkable: true,
    transparent: true,
    interactable: true,
    interactionType: "portal"
  },
  "tile_water": {
    id: "tile_water",
    name: "Water",
    spriteIndex: 80,
    walkable: false,
    transparent: true
  },
  "tile_lava": {
    id: "tile_lava",
    name: "Lava",
    spriteIndex: 81,
    walkable: false,
    transparent: true
  },
  "tile_void": {
    id: "tile_void",
    name: "Void",
    spriteIndex: 255,
    walkable: false,
    transparent: false
  }
};

export const DUNGEON_FLOORS: Record<string, DungeonFloorDefinition> = {
  "dungeon_crypt_1": {
    id: "dungeon_crypt_1",
    name: "The Forgotten Crypt - Level 1",
    minLevel: 1,
    maxLevel: 3,
    width: 50,
    height: 50,
    roomCount: { min: 5, max: 8 },
    monsterDensity: 0.15,
    lootDensity: 0.05,
    tileSet: "crypt",
    ambiance: "dark_ambient"
  },
  "dungeon_crypt_2": {
    id: "dungeon_crypt_2",
    name: "The Forgotten Crypt - Level 2",
    minLevel: 3,
    maxLevel: 5,
    width: 60,
    height: 60,
    roomCount: { min: 6, max: 10 },
    monsterDensity: 0.18,
    lootDensity: 0.06,
    tileSet: "crypt",
    ambiance: "dark_ambient"
  },
  "dungeon_crypt_boss": {
    id: "dungeon_crypt_boss",
    name: "The Lich's Lair",
    minLevel: 5,
    maxLevel: 10,
    width: 40,
    height: 40,
    roomCount: { min: 3, max: 5 },
    monsterDensity: 0.1,
    lootDensity: 0.08,
    tileSet: "crypt_dark",
    ambiance: "boss_ambient",
    bossId: "monster_boss_lich"
  },
  "dungeon_caves_1": {
    id: "dungeon_caves_1",
    name: "Goblin Caves - Level 1",
    minLevel: 1,
    maxLevel: 4,
    width: 70,
    height: 70,
    roomCount: { min: 8, max: 12 },
    monsterDensity: 0.2,
    lootDensity: 0.04,
    tileSet: "cave",
    ambiance: "cave_ambient"
  },
  "dungeon_caves_2": {
    id: "dungeon_caves_2",
    name: "Goblin Caves - Level 2",
    minLevel: 4,
    maxLevel: 7,
    width: 80,
    height: 80,
    roomCount: { min: 10, max: 15 },
    monsterDensity: 0.22,
    lootDensity: 0.05,
    tileSet: "cave",
    ambiance: "cave_ambient"
  },
  "dungeon_fire_temple_1": {
    id: "dungeon_fire_temple_1",
    name: "Temple of Flames - Level 1",
    minLevel: 8,
    maxLevel: 12,
    width: 60,
    height: 60,
    roomCount: { min: 7, max: 10 },
    monsterDensity: 0.18,
    lootDensity: 0.06,
    tileSet: "fire_temple",
    ambiance: "fire_ambient"
  },
  "dungeon_fire_temple_boss": {
    id: "dungeon_fire_temple_boss",
    name: "Dragon's Sanctum",
    minLevel: 12,
    maxLevel: 15,
    width: 50,
    height: 50,
    roomCount: { min: 4, max: 6 },
    monsterDensity: 0.12,
    lootDensity: 0.1,
    tileSet: "fire_temple",
    ambiance: "boss_ambient",
    bossId: "monster_boss_dragon"
  },
  "dungeon_abyss_1": {
    id: "dungeon_abyss_1",
    name: "The Abyss - Level 1",
    minLevel: 15,
    maxLevel: 18,
    width: 70,
    height: 70,
    roomCount: { min: 8, max: 12 },
    monsterDensity: 0.2,
    lootDensity: 0.07,
    tileSet: "abyss",
    ambiance: "shadow_ambient"
  },
  "dungeon_abyss_boss": {
    id: "dungeon_abyss_boss",
    name: "Throne of the Demon Lord",
    minLevel: 18,
    maxLevel: 20,
    width: 60,
    height: 60,
    roomCount: { min: 5, max: 7 },
    monsterDensity: 0.15,
    lootDensity: 0.12,
    tileSet: "abyss",
    ambiance: "boss_ambient",
    bossId: "monster_boss_demon_lord"
  }
};

export interface DungeonRoom {
  x: number;
  y: number;
  width: number;
  height: number;
  doors: { x: number; y: number; connected: boolean }[];
}

export interface GeneratedDungeon {
  id: string;
  floorId: string;
  seed: number;
  width: number;
  height: number;
  tiles: number[][];
  rooms: DungeonRoom[];
  monsters: { id: string; x: number; y: number }[];
  loot: { id: string; x: number; y: number }[];
  entrance: { x: number; y: number };
  exit: { x: number; y: number };
}

export function getTile(id: string): TileDefinition | undefined {
  return TILES[id];
}

export function getDungeonFloor(id: string): DungeonFloorDefinition | undefined {
  return DUNGEON_FLOORS[id];
}

export function getDungeonsByLevelRange(minLevel: number, maxLevel: number): DungeonFloorDefinition[] {
  return Object.values(DUNGEON_FLOORS).filter(
    d => d.minLevel <= maxLevel && d.maxLevel >= minLevel
  );
}

export function getBossFloors(): DungeonFloorDefinition[] {
  return Object.values(DUNGEON_FLOORS).filter(d => d.bossId !== undefined);
}

import { TiledMap, parseTiledMap, TiledObject } from './dungeonTileset';
import { Direction, AnimationState } from './dungeonSpriteConfig';

export interface LoadedMap {
  tiles: number[][];
  collision: boolean[][];
  objects: MapObject[];
  width: number;
  height: number;
  playerStart?: { x: number; y: number };
  exits: { x: number; y: number; target?: string }[];
}

export interface MapObject {
  id: number;
  type: 'item' | 'door' | 'monster' | 'npc' | 'chest' | 'trigger' | 'playerStart';
  x: number;
  y: number;
  tileX: number;
  tileY: number;
  properties: Record<string, string | number | boolean>;
  spriteId?: string;
  direction?: Direction;
  animation?: AnimationState;
}

export async function loadTiledMap(url: string): Promise<LoadedMap> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load map: ${url}`);
  }
  
  const json: TiledMap = await response.json();
  const { backgroundLayer, collisionLayer, objects, width, height } = parseTiledMap(json);
  
  const mapObjects: MapObject[] = [];
  let playerStart: { x: number; y: number } | undefined;
  const exits: { x: number; y: number; target?: string }[] = [];
  
  for (const obj of objects) {
    const tileX = Math.floor(obj.x / json.tilewidth);
    const tileY = Math.floor((obj.y - json.tileheight) / json.tileheight);
    
    const objType = obj.properties?.type as string || obj.type || 'trigger';
    
    if (objType === 'playerStart') {
      playerStart = { x: tileX, y: tileY };
    } else if (objType === 'door') {
      exits.push({
        x: tileX,
        y: tileY,
        target: obj.properties?.targetTilemap as string
      });
    }
    
    const mapType = getMapObjectType(objType);
    
    mapObjects.push({
      id: obj.id,
      type: mapType,
      x: obj.x,
      y: obj.y,
      tileX,
      tileY,
      properties: obj.properties || {},
      spriteId: obj.properties?.sprite as string,
      direction: 'down',
      animation: 'idle'
    });
  }
  
  return {
    tiles: backgroundLayer,
    collision: collisionLayer,
    objects: mapObjects,
    width,
    height,
    playerStart,
    exits
  };
}

function getMapObjectType(type: string): MapObject['type'] {
  switch (type.toLowerCase()) {
    case 'item': return 'item';
    case 'door': return 'door';
    case 'monster': case 'enemy': return 'monster';
    case 'npc': return 'npc';
    case 'chest': return 'chest';
    case 'playerstart': return 'playerStart';
    default: return 'trigger';
  }
}

export const SPECIAL_DUNGEON_MAPS: Record<string, string> = {
  'boss_lair': '/maps/boss_lair.json',
  'treasure_vault': '/maps/treasure_vault.json',
  'hidden_shrine': '/maps/hidden_shrine.json',
  'level1': '/maps/level1.json'
};

export interface TiledMapFormat {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: TiledTileset[];
}

export interface TiledLayer {
  name: string;
  type: 'tilelayer' | 'objectgroup';
  width: number;
  height: number;
  visible: boolean;
  data?: number[];
  objects?: TiledObjectData[];
}

export interface TiledObjectData {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: Record<string, string | number | boolean>;
}

export interface TiledTileset {
  firstgid: number;
  name: string;
  image: string;
  imagewidth: number;
  imageheight: number;
  tilewidth: number;
  tileheight: number;
  columns: number;
  tilecount: number;
}

export function isSpecialDungeon(floorId: string): boolean {
  return floorId in SPECIAL_DUNGEON_MAPS;
}

export async function loadSpecialDungeon(floorId: string): Promise<LoadedMap | null> {
  const mapUrl = SPECIAL_DUNGEON_MAPS[floorId];
  if (!mapUrl) return null;
  
  try {
    return await loadTiledMap(mapUrl);
  } catch (e) {
    console.warn(`Failed to load special dungeon ${floorId}:`, e);
    return null;
  }
}

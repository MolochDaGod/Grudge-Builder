export interface SpriteFrame {
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

export interface SpriteSheetMeta {
  sheetWidth: number;
  sheetHeight: number;
  frameWidth: number;
  frameHeight: number;
  framesPerRow: number;
  framesPerColumn: number;
  anchorX: number;
  anchorY: number;
  animations: Record<string, {
    row: number;
    frameCount: number;
    frameDuration: number;
  }>;
}

export const DAMPDUNGEONS_HERO: SpriteSheetMeta = {
  sheetWidth: 288,
  sheetHeight: 256,
  frameWidth: 48,
  frameHeight: 64,
  framesPerRow: 6,
  framesPerColumn: 4,
  anchorX: 0.5,
  anchorY: 1.0,
  animations: {
    idle_down: { row: 0, frameCount: 1, frameDuration: 200 },
    walk_down: { row: 0, frameCount: 3, frameDuration: 150 },
    attack_down: { row: 0, frameCount: 3, frameDuration: 80 },
    idle_left: { row: 1, frameCount: 1, frameDuration: 200 },
    walk_left: { row: 1, frameCount: 3, frameDuration: 150 },
    attack_left: { row: 1, frameCount: 3, frameDuration: 80 },
    idle_right: { row: 2, frameCount: 1, frameDuration: 200 },
    walk_right: { row: 2, frameCount: 3, frameDuration: 150 },
    attack_right: { row: 2, frameCount: 3, frameDuration: 80 },
    idle_up: { row: 3, frameCount: 1, frameDuration: 200 },
    walk_up: { row: 3, frameCount: 3, frameDuration: 150 },
    attack_up: { row: 3, frameCount: 3, frameDuration: 80 },
  }
};

export const DAMPDUNGEONS_MONSTER: SpriteSheetMeta = {
  sheetWidth: 288,
  sheetHeight: 256,
  frameWidth: 48,
  frameHeight: 64,
  framesPerRow: 6,
  framesPerColumn: 4,
  anchorX: 0.5,
  anchorY: 1.0,
  animations: {
    idle_down: { row: 0, frameCount: 1, frameDuration: 200 },
    walk_down: { row: 0, frameCount: 3, frameDuration: 150 },
    attack_down: { row: 0, frameCount: 3, frameDuration: 80 },
    idle_left: { row: 1, frameCount: 1, frameDuration: 200 },
    walk_left: { row: 1, frameCount: 3, frameDuration: 150 },
    attack_left: { row: 1, frameCount: 3, frameDuration: 80 },
    idle_right: { row: 2, frameCount: 1, frameDuration: 200 },
    walk_right: { row: 2, frameCount: 3, frameDuration: 150 },
    attack_right: { row: 2, frameCount: 3, frameDuration: 80 },
    idle_up: { row: 3, frameCount: 1, frameDuration: 200 },
    walk_up: { row: 3, frameCount: 3, frameDuration: 150 },
    attack_up: { row: 3, frameCount: 3, frameDuration: 80 },
  }
};

export interface SpellMeta {
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameDuration: number;
  anchorX: number;
  anchorY: number;
  scale: number;
}

export const SPELL_METADATA: Record<string, SpellMeta> = {
  "fire-ball": {
    frameWidth: 640,
    frameHeight: 640,
    frameCount: 8,
    frameDuration: 80,
    anchorX: 0.5,
    anchorY: 0.5,
    scale: 0.1
  },
  "fire-arrow": {
    frameWidth: 640,
    frameHeight: 640,
    frameCount: 8,
    frameDuration: 80,
    anchorX: 0.5,
    anchorY: 0.5,
    scale: 0.1
  },
  "fire-spell": {
    frameWidth: 640,
    frameHeight: 640,
    frameCount: 8,
    frameDuration: 80,
    anchorX: 0.5,
    anchorY: 0.5,
    scale: 0.1
  },
  "water-ball": {
    frameWidth: 640,
    frameHeight: 640,
    frameCount: 12,
    frameDuration: 80,
    anchorX: 0.5,
    anchorY: 0.5,
    scale: 0.1
  },
  "water-arrow": {
    frameWidth: 640,
    frameHeight: 640,
    frameCount: 8,
    frameDuration: 80,
    anchorX: 0.5,
    anchorY: 0.5,
    scale: 0.1
  },
  "water-spell": {
    frameWidth: 640,
    frameHeight: 640,
    frameCount: 8,
    frameDuration: 80,
    anchorX: 0.5,
    anchorY: 0.5,
    scale: 0.1
  }
};

export function calculateSpritePosition(
  tileX: number,
  tileY: number,
  tileSize: number,
  frameWidth: number,
  frameHeight: number,
  anchorX: number,
  anchorY: number,
  scale: number = 1
): { x: number; y: number } {
  const tileCenterX = tileX * tileSize + tileSize / 2;
  const tileCenterY = tileY * tileSize + tileSize / 2;
  
  const scaledWidth = frameWidth * scale;
  const scaledHeight = frameHeight * scale;
  
  const tileBottomY = tileY * tileSize + tileSize;
  
  const x = tileCenterX - scaledWidth * anchorX;
  const y = tileBottomY - scaledHeight * anchorY;
  
  return { x: Math.round(x), y: Math.round(y) };
}

export function calculateProjectilePosition(
  worldX: number,
  worldY: number,
  cameraX: number,
  cameraY: number,
  tileSize: number,
  viewportOffset: number,
  frameWidth: number,
  frameHeight: number,
  anchorX: number,
  anchorY: number,
  scale: number = 1
): { x: number; y: number } {
  const screenX = (worldX - cameraX + viewportOffset) * tileSize + tileSize / 2;
  const screenY = (worldY - cameraY + viewportOffset) * tileSize + tileSize / 2;
  
  const scaledWidth = frameWidth * scale;
  const scaledHeight = frameHeight * scale;
  
  const x = screenX - scaledWidth * anchorX;
  const y = screenY - scaledHeight * anchorY;
  
  return { x: Math.round(x), y: Math.round(y) };
}

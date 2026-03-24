import { useRef, useEffect, useCallback, useState } from 'react';
import {
  MINIWORLD_MONSTER_SPRITES, 
  MINIWORLD_HERO_SPRITES,
  getMonsterMiniWorldSprite,
  type MiniWorldSpriteSheet 
} from '@/lib/dungeonSpriteConfig';
import { assetUrl } from "@/lib/assetConfig";

const TILE_SIZE = 16;
const RENDER_SCALE = 2;
const SCALED_TILE_SIZE = TILE_SIZE * RENDER_SCALE;

interface MiniWorldEntity {
  id: string;
  type: 'player' | 'monster' | 'npc';
  tileX: number;
  tileY: number;
  pixelX?: number;
  pixelY?: number;
  spriteId: string;
  animation: 'idle' | 'walk' | 'attack';
  frame: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  hp?: number;
  maxHp?: number;
  name?: string;
  monsterId?: string;
}

interface MiniWorldRendererProps {
  tiles: number[][];
  visibilityMask?: boolean[][];
  exploredMask?: boolean[][];
  entities: MiniWorldEntity[];
  viewportWidth: number;
  viewportHeight: number;
  cameraX: number;
  cameraY: number;
  groundTileset: 'grass' | 'winter' | 'deadland' | 'shore' | 'dungeon';
  onTileClick?: (x: number, y: number) => void;
}

const GROUND_TILESETS: Record<string, string> = {
  grass: assetUrl("/sprites/miniworld/Ground/Grass.png"),
  winter: assetUrl("/sprites/miniworld/Ground/Winter.png"),
  deadland: assetUrl("/sprites/miniworld/Ground/DeadGrass.png"),
  shore: assetUrl("/sprites/miniworld/Ground/Shore.png"),
  dungeon: assetUrl("/sprites/dampdungeons/Dungeon_WallsAndFloors.png")
};

const TILESET_COLUMNS: Record<string, number> = {
  grass: 16,
  winter: 16,
  deadland: 16,
  shore: 16,
  dungeon: 6
};

const NATURE_SPRITES = {
  trees: assetUrl("/sprites/miniworld/Nature/Trees.png"),
  rocks: assetUrl("/sprites/miniworld/Nature/Rocks.png"),
  deadTrees: assetUrl("/sprites/miniworld/Nature/DeadTrees.png")
};

const OBJECT_SPRITES = {
  chests: assetUrl("/sprites/miniworld/Miscellaneous/Chests.png"),
  portal: assetUrl("/sprites/miniworld/Miscellaneous/Portal.png"),
  tombstones: assetUrl("/sprites/miniworld/Miscellaneous/Tombstones.png")
};

export function MiniWorldRenderer({
  tiles,
  visibilityMask,
  exploredMask,
  entities,
  viewportWidth,
  viewportHeight,
  cameraX,
  cameraY,
  groundTileset = 'grass',
  onTileClick
}: MiniWorldRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const imagesToLoad: string[] = [
      GROUND_TILESETS[groundTileset],
      ...Object.values(NATURE_SPRITES),
      ...Object.values(OBJECT_SPRITES),
      ...Object.values(MINIWORLD_MONSTER_SPRITES).map(s => s.imagePath),
      ...Object.values(MINIWORLD_HERO_SPRITES).map(s => s.imagePath)
    ];

    const uniqueImages = Array.from(new Set(imagesToLoad));
    let loadedCount = 0;
    const imageMap = new Map<string, HTMLImageElement>();

    uniqueImages.forEach(src => {
      const img = new Image();
      img.onload = () => {
        imageMap.set(src, img);
        loadedCount++;
        if (loadedCount === uniqueImages.length) {
          setLoadedImages(imageMap);
          setIsLoaded(true);
        }
      };
      img.onerror = () => {
        console.warn('Failed to load image:', src);
        loadedCount++;
        if (loadedCount === uniqueImages.length) {
          setLoadedImages(imageMap);
          setIsLoaded(true);
        }
      };
      img.src = src;
    });
  }, [groundTileset]);

  const getGroundTileCoords = useCallback((tileType: number): { x: number; y: number } => {
    const col = tileType % 16;
    const row = Math.floor(tileType / 16);
    return { x: col * TILE_SIZE, y: row * TILE_SIZE };
  }, []);

  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !isLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    animationFrameRef.current = Math.floor(timestamp / 200) % 4;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const groundImg = loadedImages.get(GROUND_TILESETS[groundTileset]);
    if (!groundImg) return;

    const tilesX = Math.ceil(viewportWidth / SCALED_TILE_SIZE) + 1;
    const tilesY = Math.ceil(viewportHeight / SCALED_TILE_SIZE) + 1;

    const startTileX = Math.floor(cameraX / SCALED_TILE_SIZE);
    const startTileY = Math.floor(cameraY / SCALED_TILE_SIZE);
    const offsetX = -(cameraX % SCALED_TILE_SIZE);
    const offsetY = -(cameraY % SCALED_TILE_SIZE);

    for (let dy = 0; dy < tilesY; dy++) {
      for (let dx = 0; dx < tilesX; dx++) {
        const tileX = startTileX + dx;
        const tileY = startTileY + dy;

        if (tileY < 0 || tileY >= tiles.length || tileX < 0 || tileX >= (tiles[0]?.length || 0)) {
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(
            offsetX + dx * SCALED_TILE_SIZE,
            offsetY + dy * SCALED_TILE_SIZE,
            SCALED_TILE_SIZE,
            SCALED_TILE_SIZE
          );
          continue;
        }

        const isExplored = exploredMask ? exploredMask[tileY]?.[tileX] : true;
        const isVisible = visibilityMask ? visibilityMask[tileY]?.[tileX] : true;

        if (!isExplored) {
          ctx.fillStyle = '#0a0a0f';
          ctx.fillRect(
            offsetX + dx * SCALED_TILE_SIZE,
            offsetY + dy * SCALED_TILE_SIZE,
            SCALED_TILE_SIZE,
            SCALED_TILE_SIZE
          );
          continue;
        }

        const tileType = tiles[tileY][tileX];
        let srcX = 0;
        let srcY = 0;
        const columns = TILESET_COLUMNS[groundTileset] || 6;

        if (groundTileset === 'dungeon') {
          srcX = (tileType % columns) * TILE_SIZE;
          srcY = Math.floor(tileType / columns) * TILE_SIZE;
        } else {
          if (tileType >= 0 && tileType <= 15) {
            srcX = (tileType % columns) * TILE_SIZE;
            srcY = 0;
          } else {
            srcX = (tileType % columns) * TILE_SIZE;
            srcY = Math.floor(tileType / columns) * TILE_SIZE;
          }
        }

        ctx.drawImage(
          groundImg,
          srcX, srcY,
          TILE_SIZE, TILE_SIZE,
          offsetX + dx * SCALED_TILE_SIZE,
          offsetY + dy * SCALED_TILE_SIZE,
          SCALED_TILE_SIZE,
          SCALED_TILE_SIZE
        );

        if (tileType >= 30 && tileType <= 35) {
          const rocksImg = loadedImages.get(NATURE_SPRITES.rocks);
          if (rocksImg) {
            const rockIndex = (tileType - 30) % 6;
            ctx.drawImage(
              rocksImg,
              rockIndex * TILE_SIZE, 0,
              TILE_SIZE, TILE_SIZE,
              offsetX + dx * SCALED_TILE_SIZE,
              offsetY + dy * SCALED_TILE_SIZE,
              SCALED_TILE_SIZE,
              SCALED_TILE_SIZE
            );
          }
        }

        if (tileType === 36) {
          const chestsImg = loadedImages.get(OBJECT_SPRITES.chests);
          if (chestsImg) {
            ctx.drawImage(
              chestsImg,
              0, 0,
              TILE_SIZE, TILE_SIZE,
              offsetX + dx * SCALED_TILE_SIZE,
              offsetY + dy * SCALED_TILE_SIZE,
              SCALED_TILE_SIZE,
              SCALED_TILE_SIZE
            );
          }
        }

        if (tileType === 30 || tileType === 31) {
          const portalImg = loadedImages.get(OBJECT_SPRITES.portal);
          if (portalImg) {
            const portalFrame = animationFrameRef.current;
            ctx.drawImage(
              portalImg,
              portalFrame * TILE_SIZE, 0,
              TILE_SIZE, TILE_SIZE,
              offsetX + dx * SCALED_TILE_SIZE,
              offsetY + dy * SCALED_TILE_SIZE,
              SCALED_TILE_SIZE,
              SCALED_TILE_SIZE
            );
          }
        }

        if (!isVisible) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(
            offsetX + dx * SCALED_TILE_SIZE,
            offsetY + dy * SCALED_TILE_SIZE,
            SCALED_TILE_SIZE,
            SCALED_TILE_SIZE
          );
        }
      }
    }

    entities.forEach(entity => {
      const entityPixelX = entity.pixelX ?? (entity.tileX * SCALED_TILE_SIZE);
      const entityPixelY = entity.pixelY ?? (entity.tileY * SCALED_TILE_SIZE);
      const screenX = entityPixelX - cameraX;
      const screenY = entityPixelY - cameraY;

      if (screenX < -SCALED_TILE_SIZE || screenX > viewportWidth ||
          screenY < -SCALED_TILE_SIZE || screenY > viewportHeight) {
        return;
      }

      const isVisible = visibilityMask ? visibilityMask[entity.tileY]?.[entity.tileX] : true;
      if (!isVisible) return;

      let spriteSheet: MiniWorldSpriteSheet | null = null;
      
      if (entity.type === 'player') {
        spriteSheet = MINIWORLD_HERO_SPRITES[entity.spriteId] || MINIWORLD_HERO_SPRITES['swordsman_red'];
      } else if (entity.type === 'monster') {
        spriteSheet = entity.monsterId 
          ? getMonsterMiniWorldSprite(entity.monsterId) 
          : MINIWORLD_MONSTER_SPRITES[entity.spriteId];
      }

      if (!spriteSheet) {
        ctx.fillStyle = entity.type === 'player' ? '#4ade80' : '#ef4444';
        ctx.fillRect(screenX + 4, screenY + 4, SCALED_TILE_SIZE - 8, SCALED_TILE_SIZE - 8);
        return;
      }

      const spriteImg = loadedImages.get(spriteSheet.imagePath);
      if (!spriteImg) {
        ctx.fillStyle = entity.type === 'player' ? '#4ade80' : '#ef4444';
        ctx.fillRect(screenX + 4, screenY + 4, SCALED_TILE_SIZE - 8, SCALED_TILE_SIZE - 8);
        return;
      }

      const animRow = spriteSheet.rowLayout[entity.animation] || 0;
      const frameIndex = animationFrameRef.current % spriteSheet.framesPerRow;
      
      const flipHorizontal = entity.direction === 'left';
      
      if (flipHorizontal) {
        ctx.save();
        ctx.translate(screenX + SCALED_TILE_SIZE, screenY);
        ctx.scale(-1, 1);
        ctx.drawImage(
          spriteImg,
          frameIndex * spriteSheet.frameWidth,
          animRow * spriteSheet.frameHeight,
          spriteSheet.frameWidth,
          spriteSheet.frameHeight,
          0,
          0,
          SCALED_TILE_SIZE,
          SCALED_TILE_SIZE
        );
        ctx.restore();
      } else {
        ctx.drawImage(
          spriteImg,
          frameIndex * spriteSheet.frameWidth,
          animRow * spriteSheet.frameHeight,
          spriteSheet.frameWidth,
          spriteSheet.frameHeight,
          screenX,
          screenY,
          SCALED_TILE_SIZE,
          SCALED_TILE_SIZE
        );
      }

      if (entity.hp !== undefined && entity.maxHp !== undefined && entity.type === 'monster') {
        const hpPercent = entity.hp / entity.maxHp;
        const barWidth = SCALED_TILE_SIZE - 4;
        const barHeight = 4;
        
        ctx.fillStyle = '#1f1f1f';
        ctx.fillRect(screenX + 2, screenY - 8, barWidth, barHeight);
        
        ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(screenX + 2, screenY - 8, barWidth * hpPercent, barHeight);
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX + 2, screenY - 8, barWidth, barHeight);
      }
    });

    requestAnimationFrame(render);
  }, [tiles, visibilityMask, exploredMask, entities, viewportWidth, viewportHeight, cameraX, cameraY, groundTileset, loadedImages, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      const animId = requestAnimationFrame(render);
      return () => cancelAnimationFrame(animId);
    }
  }, [render, isLoaded]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onTileClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const tileX = Math.floor((clickX + cameraX) / SCALED_TILE_SIZE);
    const tileY = Math.floor((clickY + cameraY) / SCALED_TILE_SIZE);

    onTileClick(tileX, tileY);
  }, [cameraX, cameraY, onTileClick]);

  return (
    <canvas
      ref={canvasRef}
      width={viewportWidth}
      height={viewportHeight}
      onClick={handleClick}
      style={{ 
        imageRendering: 'pixelated',
        display: 'block'
      }}
      data-testid="miniworld-renderer-canvas"
    />
  );
}

export default MiniWorldRenderer;

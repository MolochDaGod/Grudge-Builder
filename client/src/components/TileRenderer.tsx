import { useRef, useEffect, useCallback, useState } from 'react';
import { 
  DUNGEON_TILESET, 
  TILE_SIZE, 
  RENDER_SCALE, 
  SCALED_TILE_SIZE,
  getTileCoords,
  TilesetConfig
} from '@/lib/dungeonTileset';

interface TileRendererProps {
  tiles: number[][];
  visibilityMask?: boolean[][];
  exploredMask?: boolean[][];
  viewportWidth: number;
  viewportHeight: number;
  cameraX: number;
  cameraY: number;
  tileset?: TilesetConfig;
  fogColor?: string;
  unexploredColor?: string;
  onTileClick?: (x: number, y: number) => void;
}

export function TileRenderer({
  tiles,
  visibilityMask,
  exploredMask,
  viewportWidth,
  viewportHeight,
  cameraX,
  cameraY,
  tileset = DUNGEON_TILESET,
  fogColor = 'rgba(0, 0, 0, 0.6)',
  unexploredColor = '#0a0a0f',
  onTileClick
}: TileRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tilesetImage, setTilesetImage] = useState<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setTilesetImage(img);
      setIsLoaded(true);
    };
    img.onerror = () => {
      console.error('Failed to load tileset:', tileset.image);
    };
    img.src = tileset.image;
  }, [tileset.image]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !tilesetImage || !isLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
          ctx.fillStyle = unexploredColor;
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
          ctx.fillStyle = unexploredColor;
          ctx.fillRect(
            offsetX + dx * SCALED_TILE_SIZE,
            offsetY + dy * SCALED_TILE_SIZE,
            SCALED_TILE_SIZE,
            SCALED_TILE_SIZE
          );
          continue;
        }

        const tileIndex = tiles[tileY][tileX];
        const { x: srcX, y: srcY } = getTileCoords(tileIndex, tileset);

        ctx.drawImage(
          tilesetImage,
          srcX,
          srcY,
          TILE_SIZE,
          TILE_SIZE,
          offsetX + dx * SCALED_TILE_SIZE,
          offsetY + dy * SCALED_TILE_SIZE,
          SCALED_TILE_SIZE,
          SCALED_TILE_SIZE
        );

        if (!isVisible) {
          ctx.fillStyle = fogColor;
          ctx.fillRect(
            offsetX + dx * SCALED_TILE_SIZE,
            offsetY + dy * SCALED_TILE_SIZE,
            SCALED_TILE_SIZE,
            SCALED_TILE_SIZE
          );
        }
      }
    }
  }, [tiles, visibilityMask, exploredMask, viewportWidth, viewportHeight, cameraX, cameraY, tilesetImage, isLoaded, tileset, fogColor, unexploredColor]);

  useEffect(() => {
    render();
  }, [render]);

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
      data-testid="tile-renderer-canvas"
    />
  );
}

export default TileRenderer;

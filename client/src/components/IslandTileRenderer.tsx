import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  IslandTileGrid, 
  IslandTile, 
  GRID_CONFIG,
  tileToWorld,
  worldToTile,
  TileType
} from '@/lib/islandTileGrid';
import { GRASS_DECORATIONS, getRandomGrass } from '@shared/definitions/characterAnimations';
import { assetUrl } from "@/lib/assetConfig";

interface IslandTileRendererProps {
  grid: IslandTileGrid;
  camera: { x: number; y: number; zoom: number };
  viewportWidth: number;
  viewportHeight: number;
  showGrid?: boolean;
  onTileClick?: (tile: IslandTile, worldX: number, worldY: number) => void;
  onTileHover?: (tile: IslandTile | null) => void;
  selectedTile?: { x: number; y: number } | null;
}

// Color palette for tile types (fallback when tileset not loaded)
const TILE_COLORS: Record<TileType, string> = {
  deep_water: '#1a365d',
  shallow_water: '#2563eb',
  shore: '#fcd34d',
  grass: '#22c55e',
  hill: '#65a30d',
  mountain: '#78716c',
  cleared: '#a3e635',
  camp: '#facc15',
};

// Animated water colors with ripple effect
function getAnimatedWaterColor(x: number, y: number, time: number, isDeep: boolean, isWaterEdge: boolean): string {
  // Create ripple effect using sin waves
  const ripple1 = Math.sin((x * 0.3 + y * 0.2 + time * 0.002) * Math.PI) * 0.5 + 0.5;
  const ripple2 = Math.sin((x * 0.2 - y * 0.3 + time * 0.003) * Math.PI) * 0.5 + 0.5;
  const ripple3 = Math.sin((x * 0.1 + y * 0.1 + time * 0.001) * Math.PI) * 0.5 + 0.5;
  const combinedRipple = (ripple1 + ripple2 + ripple3) / 3;
  
  // Water edge tiles get a distinct foam/wave appearance
  if (isWaterEdge) {
    const foam = Math.sin((x * 0.5 + y * 0.5 + time * 0.005) * Math.PI) * 0.5 + 0.5;
    const r = Math.floor(100 + foam * 80 + combinedRipple * 30);
    const g = Math.floor(180 + foam * 50 + combinedRipple * 30);
    const b = Math.floor(200 + foam * 40 + combinedRipple * 20);
    return `rgb(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)})`;
  }
  
  // Deep water - darker blue with subtle animation
  if (isDeep) {
    const r = Math.floor(20 + combinedRipple * 15);
    const g = Math.floor(50 + combinedRipple * 30);
    const b = Math.floor(100 + combinedRipple * 40);
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  // Shallow water - brighter blue with more visible ripples
  const r = Math.floor(30 + combinedRipple * 25);
  const g = Math.floor(90 + combinedRipple * 50);
  const b = Math.floor(180 + combinedRipple * 50);
  return `rgb(${r}, ${g}, ${b})`;
}

// Height-based color modulation
function getHeightModulatedColor(baseColor: string, height: number): string {
  const brightness = Math.max(0.6, Math.min(1.2, 1 + height / 100));
  
  // Parse hex color
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  
  // Apply brightness
  const nr = Math.min(255, Math.floor(r * brightness));
  const ng = Math.min(255, Math.floor(g * brightness));
  const nb = Math.min(255, Math.floor(b * brightness));
  
  return `rgb(${nr}, ${ng}, ${nb})`;
}

export function IslandTileRenderer({
  grid,
  camera,
  viewportWidth,
  viewportHeight,
  showGrid = false,
  onTileClick,
  onTileHover,
  selectedTile,
}: IslandTileRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [terrainTileset, setTerrainTileset] = useState<HTMLImageElement | null>(null);
  const [villageTileset, setVillageTileset] = useState<HTMLImageElement | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  
  const [grassSprites, setGrassSprites] = useState<Record<string, HTMLImageElement>>({});
  const [grassPositions, setGrassPositions] = useState<Array<{x: number, y: number, spriteId: string, offsetX: number, offsetY: number}>>([]);
  
  // Load tilesets
  useEffect(() => {
    const terrainImg = new Image();
    terrainImg.src = assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Terrain/Tilemap_color1.png");
    terrainImg.onload = () => setTerrainTileset(terrainImg);
    
    const villageImg = new Image();
    villageImg.src = assetUrl("/sprites/2dassets/tileset-village/1 Tiles/FieldsTileset.png");
    villageImg.onload = () => setVillageTileset(villageImg);
    
    // Load grass decoration sprites
    const loadGrass = async () => {
      const loaded: Record<string, HTMLImageElement> = {};
      for (const grass of GRASS_DECORATIONS) {
        const img = new Image();
        img.src = grass.path;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
        loaded[grass.id] = img;
      }
      setGrassSprites(loaded);
    };
    loadGrass();
  }, []);
  
  // Generate grass decoration positions based on grid
  useEffect(() => {
    if (!grid || !grid.tiles) return;
    
    const positions: typeof grassPositions = [];
    const seededRandom = (x: number, y: number) => {
      const seed = x * 10000 + y;
      return ((Math.sin(seed) * 10000) % 1 + 1) % 1;
    };
    
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.tiles[y]?.[x];
        if (!tile) continue;
        
        // Only add grass to grass and hill tiles
        if (tile.type === 'grass' || tile.type === 'hill') {
          const rand = seededRandom(x, y);
          // 30% chance of grass decoration
          if (rand < 0.3) {
            const grassIndex = Math.floor(seededRandom(x + 100, y) * GRASS_DECORATIONS.length);
            const grass = GRASS_DECORATIONS[grassIndex];
            positions.push({
              x,
              y,
              spriteId: grass.id,
              offsetX: seededRandom(x + 200, y) * (GRID_CONFIG.tileSize - grass.width),
              offsetY: seededRandom(x, y + 300) * (GRID_CONFIG.tileSize - grass.height)
            });
          }
        }
      }
    }
    setGrassPositions(positions);
  }, [grid]);
  
  // Calculate visible tile range
  const getVisibleRange = useCallback(() => {
    const worldWidth = viewportWidth / camera.zoom;
    const worldHeight = viewportHeight / camera.zoom;
    
    const startX = Math.max(0, Math.floor((camera.x - worldWidth / 2) / GRID_CONFIG.tileSize) - 1);
    const startY = Math.max(0, Math.floor((camera.y - worldHeight / 2) / GRID_CONFIG.tileSize) - 1);
    const endX = Math.min(grid.width - 1, Math.ceil((camera.x + worldWidth / 2) / GRID_CONFIG.tileSize) + 1);
    const endY = Math.min(grid.height - 1, Math.ceil((camera.y + worldHeight / 2) / GRID_CONFIG.tileSize) + 1);
    
    return { startX, startY, endX, endY };
  }, [camera, viewportWidth, viewportHeight, grid.width, grid.height]);
  
  // Animation loop for water ripples
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const renderFrame = (time: number) => {
      // Clear canvas with dark water base
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);
      
      const { startX, startY, endX, endY } = getVisibleRange();
      const tileSize = GRID_CONFIG.tileSize * camera.zoom;
      
      // Calculate offset for camera centering
      const offsetX = viewportWidth / 2 - camera.x * camera.zoom;
      const offsetY = viewportHeight / 2 - camera.y * camera.zoom;
      
      // Draw tiles
      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          const tile = grid.tiles[y]?.[x];
          if (!tile) continue;
          
          const screenX = x * GRID_CONFIG.tileSize * camera.zoom + offsetX;
          const screenY = y * GRID_CONFIG.tileSize * camera.zoom + offsetY;
          
          // Skip tiles outside viewport
          if (screenX + tileSize < 0 || screenX > viewportWidth ||
              screenY + tileSize < 0 || screenY > viewportHeight) {
            continue;
          }
          
          // Draw water tiles with animation
          if (tile.type === 'deep_water' || tile.type === 'shallow_water') {
            const isDeep = tile.type === 'deep_water';
            ctx.fillStyle = getAnimatedWaterColor(x, y, time, isDeep, tile.isWaterEdge || false);
            ctx.fillRect(screenX, screenY, tileSize + 1, tileSize + 1);
            
            // Draw dock indicator for water edge tiles
            if (tile.isWaterEdge) {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
              ctx.lineWidth = 2;
              ctx.strokeRect(screenX + 2, screenY + 2, tileSize - 4, tileSize - 4);
              ctx.lineWidth = 1;
            }
          } else {
            // Draw land tile color (fallback or base layer)
            const baseColor = TILE_COLORS[tile.type] || '#333';
            ctx.fillStyle = getHeightModulatedColor(baseColor, tile.height);
            ctx.fillRect(screenX, screenY, tileSize + 1, tileSize + 1);
            
            // Highlight dockable land tiles (where player can board boat)
            if (tile.isDockable) {
              ctx.fillStyle = 'rgba(100, 200, 255, 0.15)';
              ctx.fillRect(screenX, screenY, tileSize + 1, tileSize + 1);
            }
          }
        
          // Draw tileset sprite for non-water tiles if available
          if (terrainTileset && !tile.isCleared && tile.type !== 'deep_water' && tile.type !== 'shallow_water') {
            const tilesetCols = 10; // Tiny Swords tileset is 10 columns
            const srcTileSize = 64; // Source tile size in tileset
            const srcX = (tile.tilesetIndex % tilesetCols) * srcTileSize;
            const srcY = Math.floor(tile.tilesetIndex / tilesetCols) * srcTileSize;
            
            ctx.globalAlpha = 0.8;
            ctx.drawImage(
              terrainTileset,
              srcX, srcY, srcTileSize, srcTileSize,
              screenX, screenY, tileSize, tileSize
            );
            ctx.globalAlpha = 1;
          }
          
          // Draw village tileset for cleared areas
          if (villageTileset && tile.isCleared && tile.overlayTileIndex !== undefined) {
            const tilesetCols = 8; // Village tileset columns
            const srcTileSize = 16; // Source tile size
            const srcX = (tile.overlayTileIndex % tilesetCols) * srcTileSize;
            const srcY = Math.floor(tile.overlayTileIndex / tilesetCols) * srcTileSize;
            
            ctx.drawImage(
              villageTileset,
              srcX, srcY, srcTileSize, srcTileSize,
              screenX, screenY, tileSize, tileSize
            );
          }
          
          // Draw grid lines if enabled
          if (showGrid) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.strokeRect(screenX, screenY, tileSize, tileSize);
          }
          
          // Highlight hovered tile
          if (hoveredTile && hoveredTile.x === x && hoveredTile.y === y) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, tileSize, tileSize);
            ctx.lineWidth = 1;
          }
          
          // Highlight selected tile
          if (selectedTile && selectedTile.x === x && selectedTile.y === y) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3;
            ctx.strokeRect(screenX, screenY, tileSize, tileSize);
            ctx.lineWidth = 1;
          }
          
          // Draw camp marker
          if (tile.type === 'camp') {
            ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
          }
        }
      }
      
      // Draw grass decorations on top of tiles
      if (Object.keys(grassSprites).length > 0) {
        for (const grassPos of grassPositions) {
          // Skip if outside visible range
          if (grassPos.x < startX || grassPos.x > endX || 
              grassPos.y < startY || grassPos.y > endY) continue;
          
          const grassDef = GRASS_DECORATIONS.find(g => g.id === grassPos.spriteId);
          const grassImg = grassSprites[grassPos.spriteId];
          if (!grassDef || !grassImg) continue;
          
          const screenX = grassPos.x * GRID_CONFIG.tileSize * camera.zoom + offsetX + grassPos.offsetX * camera.zoom;
          const screenY = grassPos.y * GRID_CONFIG.tileSize * camera.zoom + offsetY + grassPos.offsetY * camera.zoom;
          
          // Scale grass decorations (they're tiny, so scale up 3x)
          const grassScale = 3 * camera.zoom;
          ctx.drawImage(
            grassImg,
            screenX,
            screenY,
            grassDef.width * grassScale,
            grassDef.height * grassScale
          );
        }
      }
      
      // Draw camp center marker
      const campScreenX = grid.campCenter.x * GRID_CONFIG.tileSize * camera.zoom + offsetX;
      const campScreenY = grid.campCenter.y * GRID_CONFIG.tileSize * camera.zoom + offsetY;
      
      ctx.beginPath();
      ctx.arc(campScreenX + tileSize / 2, campScreenY + tileSize / 2, 5 * camera.zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.stroke();
      
      // Request next frame for water animation
      animationRef.current = requestAnimationFrame(renderFrame);
    };
    
    // Start animation loop
    animationRef.current = requestAnimationFrame(renderFrame);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [grid, camera, viewportWidth, viewportHeight, terrainTileset, villageTileset, showGrid, hoveredTile, selectedTile, getVisibleRange, grassSprites, grassPositions]);
  
  // Handle mouse events
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert screen to world coordinates
    const offsetX = viewportWidth / 2 - camera.x * camera.zoom;
    const offsetY = viewportHeight / 2 - camera.y * camera.zoom;
    
    const worldX = (mouseX - offsetX) / camera.zoom;
    const worldY = (mouseY - offsetY) / camera.zoom;
    
    const tileCoords = worldToTile(worldX, worldY);
    
    if (tileCoords.x >= 0 && tileCoords.x < grid.width &&
        tileCoords.y >= 0 && tileCoords.y < grid.height) {
      setHoveredTile(tileCoords);
      onTileHover?.(grid.tiles[tileCoords.y][tileCoords.x]);
    } else {
      setHoveredTile(null);
      onTileHover?.(null);
    }
  }, [camera, viewportWidth, viewportHeight, grid, onTileHover]);
  
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const offsetX = viewportWidth / 2 - camera.x * camera.zoom;
    const offsetY = viewportHeight / 2 - camera.y * camera.zoom;
    
    const worldX = (mouseX - offsetX) / camera.zoom;
    const worldY = (mouseY - offsetY) / camera.zoom;
    
    const tileCoords = worldToTile(worldX, worldY);
    
    if (tileCoords.x >= 0 && tileCoords.x < grid.width &&
        tileCoords.y >= 0 && tileCoords.y < grid.height) {
      onTileClick?.(grid.tiles[tileCoords.y][tileCoords.x], worldX, worldY);
    }
  }, [camera, viewportWidth, viewportHeight, grid, onTileClick]);
  
  const handleMouseLeave = useCallback(() => {
    setHoveredTile(null);
    onTileHover?.(null);
  }, [onTileHover]);
  
  return (
    <canvas
      ref={canvasRef}
      width={viewportWidth}
      height={viewportHeight}
      className="absolute inset-0"
      style={{ imageRendering: 'pixelated' }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onMouseLeave={handleMouseLeave}
      data-testid="island-tile-canvas"
    />
  );
}

export default IslandTileRenderer;

import { useRef, useEffect, useCallback, useState } from 'react';
import { IslandEngine } from '../engine/IslandEngine';
import { CharacterActor } from '../actors/CharacterActor';
import { ResourceNodeActor } from '../actors/ResourceNodeActor';

interface IslandRendererProps {
  engine: IslandEngine;
  width: number;
  height: number;
  backgroundImage?: string;
  onTileClick?: (worldX: number, worldY: number) => void;
}

interface LoadedSprites {
  [key: string]: HTMLImageElement;
}

export function IslandRenderer({
  engine,
  width,
  height,
  backgroundImage,
  onTileClick,
}: IslandRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<LoadedSprites>({});
  const animationFrameRef = useRef<number>();
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const loadSprite = useCallback((src: string): Promise<HTMLImageElement> => {
    if (spritesRef.current[src]) {
      return Promise.resolve(spritesRef.current[src]);
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        spritesRef.current[src] = img;
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load: ${src}`));
      img.src = src;
    });
  }, []);

  const drawCharacter = useCallback((
    ctx: CanvasRenderingContext2D,
    character: CharacterActor,
    screenX: number,
    screenY: number
  ) => {
    const sprite = spritesRef.current[character.spriteConfig.spriteSheet];
    
    if (sprite) {
      const frame = character.getCurrentFrame();
      const scale = character.spriteConfig.scale || 1;
      const drawWidth = frame.width * scale;
      const drawHeight = frame.height * scale;
      
      ctx.save();
      
      if (character.direction === 'left') {
        ctx.scale(-1, 1);
        ctx.drawImage(
          sprite,
          frame.x, frame.y, frame.width, frame.height,
          -screenX - drawWidth / 2, screenY - drawHeight / 2,
          drawWidth, drawHeight
        );
      } else {
        ctx.drawImage(
          sprite,
          frame.x, frame.y, frame.width, frame.height,
          screenX - drawWidth / 2, screenY - drawHeight / 2,
          drawWidth, drawHeight
        );
      }
      
      ctx.restore();
    } else {
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(screenX, screenY, 16, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#166534';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(character.id.slice(0, 3), screenX, screenY + 3);
    }
    
    if (character.state === 'sleeping') {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('zzz', screenX + 15, screenY - 20);
    }
    
    const staminaBarWidth = 30;
    const staminaBarHeight = 4;
    const staminaX = screenX - staminaBarWidth / 2;
    const staminaY = screenY + 25;
    
    ctx.fillStyle = '#374151';
    ctx.fillRect(staminaX, staminaY, staminaBarWidth, staminaBarHeight);
    
    const staminaPercent = character.stamina / character.maxStamina;
    ctx.fillStyle = staminaPercent > 0.3 ? '#22c55e' : '#ef4444';
    ctx.fillRect(staminaX, staminaY, staminaBarWidth * staminaPercent, staminaBarHeight);
  }, []);

  const drawResourceNode = useCallback((
    ctx: CanvasRenderingContext2D,
    node: ResourceNodeActor,
    screenX: number,
    screenY: number
  ) => {
    const color = node.getRarityColor();
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 20, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = '#1f2937';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.nodeData.icon, screenX, screenY);
    
    if (node.isBeingHarvested) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(screenX, screenY, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, width, height);
    
    const bgSprite = backgroundImage ? spritesRef.current[backgroundImage] : null;
    if (bgSprite) {
      const camera = engine.getCamera();
      const scale = camera.zoom;
      const offsetX = width / 2 - camera.x * scale;
      const offsetY = height / 2 - camera.y * scale;
      
      ctx.drawImage(bgSprite, offsetX, offsetY, bgSprite.width * scale, bgSprite.height * scale);
    } else {
      ctx.fillStyle = '#1a472a';
      ctx.fillRect(0, 0, width, height);
    }
    
    const nodes = Array.from(engine.resourceNodes.values());
    for (const node of nodes) {
      const screen = engine.worldToScreen(node.x, node.y, width, height);
      if (screen.visible) {
        drawResourceNode(ctx, node, screen.x, screen.y);
      }
    }
    
    const sortedCharacters = Array.from(engine.characters.values())
      .sort((a, b) => a.y - b.y);
    
    for (const character of sortedCharacters) {
      const screen = engine.worldToScreen(character.x, character.y, width, height);
      if (screen.visible) {
        drawCharacter(ctx, character, screen.x, screen.y);
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(render);
  }, [engine, width, height, backgroundImage, drawCharacter, drawResourceNode]);

  useEffect(() => {
    render();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  useEffect(() => {
    if (backgroundImage) {
      loadSprite(backgroundImage);
    }
    
    const characters = Array.from(engine.characters.values());
    for (const character of characters) {
      loadSprite(character.spriteConfig.spriteSheet);
    }
  }, [engine, backgroundImage, loadSprite]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    
    engine.panCamera(dx, dy);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = engine.screenToWorld(mouseX, mouseY, width, height);
    
    const delta = e.deltaY > 0 ? -1 : 1;
    engine.zoomCamera(delta, worldPos.x, worldPos.y);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = engine.screenToWorld(mouseX, mouseY, width, height);
    
    onTileClick?.(worldPos.x, worldPos.y);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
      data-testid="island-canvas"
    />
  );
}

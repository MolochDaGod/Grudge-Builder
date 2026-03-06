import { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Direction, 
  AnimationState, 
  DirectionalSpriteSheet,
  AVAILABLE_SPRITES 
} from '@/lib/dungeonSpriteConfig';
import { RENDER_SCALE, SCALED_TILE_SIZE } from '@/lib/dungeonTileset';

interface AnimatedSpriteProps {
  spriteId: string;
  x: number;
  y: number;
  direction: Direction;
  animation: AnimationState;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  onAnimationComplete?: () => void;
}

interface SpriteCache {
  [key: string]: HTMLImageElement;
}

const spriteCache: SpriteCache = {};

function loadSprite(path: string): Promise<HTMLImageElement> {
  if (spriteCache[path]) {
    return Promise.resolve(spriteCache[path]);
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      spriteCache[path] = img;
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load sprite: ${path}`));
    img.src = path;
  });
}

export function AnimatedSprite({
  spriteId,
  x,
  y,
  direction,
  animation,
  scale = RENDER_SCALE,
  offsetX = 0,
  offsetY = 0,
  onAnimationComplete
}: AnimatedSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spriteImage, setSpriteImage] = useState<HTMLImageElement | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(0);

  const spriteConfig = AVAILABLE_SPRITES[spriteId];

  useEffect(() => {
    if (!spriteConfig) return;
    
    const spritePath = spriteConfig.getSpritePath(direction, animation);
    loadSprite(spritePath)
      .then(setSpriteImage)
      .catch(console.error);
  }, [spriteConfig, direction, animation]);

  useEffect(() => {
    setCurrentFrame(0);
  }, [animation, direction]);

  useEffect(() => {
    if (!spriteConfig || !spriteImage) return;

    const animConfig = spriteConfig.animations[animation];
    if (!animConfig) return;

    const animate = (timestamp: number) => {
      if (timestamp - lastFrameTime.current >= animConfig.frameDuration) {
        lastFrameTime.current = timestamp;
        
        setCurrentFrame(prev => {
          const nextFrame = prev + 1;
          if (nextFrame >= animConfig.frameCount) {
            if (animConfig.loop) {
              return 0;
            } else {
              if (onAnimationComplete) {
                onAnimationComplete();
              }
              return prev;
            }
          }
          return nextFrame;
        });
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [spriteConfig, spriteImage, animation, onAnimationComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !spriteImage || !spriteConfig) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { frameWidth, frameHeight } = spriteConfig;
    
    let srcX = currentFrame * frameWidth;
    let srcY = 0;
    
    const dirIndex = spriteConfig.directions.indexOf(direction);
    if (dirIndex !== -1 && spriteConfig.directions.length > 1) {
      srcY = dirIndex * frameHeight;
    }

    ctx.drawImage(
      spriteImage,
      srcX,
      srcY,
      frameWidth,
      frameHeight,
      0,
      0,
      frameWidth * scale,
      frameHeight * scale
    );
  }, [spriteImage, spriteConfig, currentFrame, direction, scale]);

  if (!spriteConfig) {
    return null;
  }

  const { frameWidth, frameHeight } = spriteConfig;
  const displayWidth = frameWidth * scale;
  const displayHeight = frameHeight * scale;

  const centerOffsetX = (SCALED_TILE_SIZE - displayWidth) / 2;
  const centerOffsetY = SCALED_TILE_SIZE - displayHeight;

  return (
    <canvas
      ref={canvasRef}
      width={displayWidth}
      height={displayHeight}
      style={{
        position: 'absolute',
        left: x + centerOffsetX + offsetX,
        top: y + centerOffsetY + offsetY,
        imageRendering: 'pixelated',
        pointerEvents: 'none',
        zIndex: Math.floor(y / SCALED_TILE_SIZE) + 1
      }}
      data-testid={`animated-sprite-${spriteId}`}
    />
  );
}

interface SpriteEntityProps {
  spriteId: string;
  tileX: number;
  tileY: number;
  cameraX: number;
  cameraY: number;
  direction: Direction;
  animation: AnimationState;
  scale?: number;
  onAnimationComplete?: () => void;
}

export function SpriteEntity({
  spriteId,
  tileX,
  tileY,
  cameraX,
  cameraY,
  direction,
  animation,
  scale = RENDER_SCALE,
  onAnimationComplete
}: SpriteEntityProps) {
  const screenX = tileX * SCALED_TILE_SIZE - cameraX;
  const screenY = tileY * SCALED_TILE_SIZE - cameraY;

  return (
    <AnimatedSprite
      spriteId={spriteId}
      x={screenX}
      y={screenY}
      direction={direction}
      animation={animation}
      scale={scale}
      onAnimationComplete={onAnimationComplete}
    />
  );
}

export default AnimatedSprite;

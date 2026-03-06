import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type Direction = "down" | "left" | "right" | "up";
export type SpriteState = "idle" | "walk" | "attack" | "hurt" | "cast";

interface DirectionalSpriteProps {
  spriteSheet: string;
  direction: Direction;
  state: SpriteState;
  className?: string;
  scale?: number;
  onAnimationComplete?: () => void;
  loop?: boolean;
  frameWidth?: number;
  frameHeight?: number;
  framesPerRow?: number;
}

const DIRECTION_ROW: Record<Direction, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

const STATE_CONFIG_6: Record<SpriteState, { startFrame: number; frameCount: number; fps: number; loop: boolean }> = {
  idle: { startFrame: 0, frameCount: 1, fps: 1, loop: true },
  walk: { startFrame: 0, frameCount: 3, fps: 8, loop: true },
  attack: { startFrame: 3, frameCount: 3, fps: 12, loop: false },
  hurt: { startFrame: 0, frameCount: 2, fps: 6, loop: false },
  cast: { startFrame: 3, frameCount: 3, fps: 10, loop: false },
};

const STATE_CONFIG_4: Record<SpriteState, { startFrame: number; frameCount: number; fps: number; loop: boolean }> = {
  idle: { startFrame: 0, frameCount: 1, fps: 1, loop: true },
  walk: { startFrame: 0, frameCount: 3, fps: 8, loop: true },
  attack: { startFrame: 0, frameCount: 4, fps: 12, loop: false },
  hurt: { startFrame: 0, frameCount: 2, fps: 6, loop: false },
  cast: { startFrame: 0, frameCount: 4, fps: 10, loop: false },
};

export default function DirectionalSprite({
  spriteSheet,
  direction,
  state,
  className,
  scale = 1,
  onAnimationComplete,
  loop: loopOverride,
  frameWidth = 48,
  frameHeight = 64,
  framesPerRow = 6,
}: DirectionalSpriteProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [error, setError] = useState(false);
  
  const stateConfig = framesPerRow <= 4 ? STATE_CONFIG_4 : STATE_CONFIG_6;
  const config = stateConfig[state];
  const shouldLoop = loopOverride !== undefined ? loopOverride : config.loop;
  const row = DIRECTION_ROW[direction];
  
  useEffect(() => {
    setFrameIndex(0);
    setError(false);
  }, [spriteSheet, direction, state]);

  useEffect(() => {
    if (state === "idle") return;
    
    const interval = setInterval(() => {
      setFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= config.frameCount) {
          if (!shouldLoop) {
            clearInterval(interval);
            if (onAnimationComplete) onAnimationComplete();
            return prev;
          }
          if (onAnimationComplete) onAnimationComplete();
          return 0;
        }
        return next;
      });
    }, 1000 / config.fps);

    return () => clearInterval(interval);
  }, [state, config.frameCount, config.fps, shouldLoop, onAnimationComplete]);

  if (error) {
    return (
      <div 
        className={cn("flex items-center justify-center bg-red-900/20 text-red-500 text-[10px]", className)} 
        style={{ width: frameWidth * scale, height: frameHeight * scale }}
      >
        No Sprite
      </div>
    );
  }

  const containerWidth = frameWidth * scale;
  const containerHeight = frameHeight * scale;
  const actualFrame = config.startFrame + frameIndex;
  
  return (
    <div 
      className={cn("overflow-hidden relative", className)}
      style={{
        width: containerWidth,
        height: containerHeight,
        backgroundImage: `url(${spriteSheet})`,
        backgroundPosition: `-${actualFrame * containerWidth}px -${row * containerHeight}px`,
        backgroundSize: `${framesPerRow * containerWidth}px auto`,
        imageRendering: 'pixelated',
      }}
      onLoad={() => setError(false)}
    >
      <img 
        src={spriteSheet} 
        onError={() => setError(true)} 
        style={{ display: 'none' }}
        alt=""
      />
    </div>
  );
}

export function DungeonHeroSprite({
  direction,
  state,
  scale = 2,
  hasSword = false,
  className,
  onAnimationComplete,
}: {
  direction: Direction;
  state: SpriteState;
  scale?: number;
  hasSword?: boolean;
  className?: string;
  onAnimationComplete?: () => void;
}) {
  const spriteSheet = hasSword 
    ? "/sprites/dampdungeons/animations/Dungeon_HeroManSword1.png"
    : "/sprites/dampdungeons/animations/Dungeon_HeroMan1.png";
  
  const frameWidth = hasSword ? 47 : 48;
  const frameHeight = hasSword ? 63 : 64;
  
  return (
    <DirectionalSprite
      spriteSheet={spriteSheet}
      direction={direction}
      state={state}
      scale={scale}
      frameWidth={frameWidth}
      frameHeight={frameHeight}
      className={className}
      onAnimationComplete={onAnimationComplete}
      framesPerRow={hasSword ? 4 : 6}
    />
  );
}

export function DungeonMonsterSprite({
  monsterSheet,
  monsterIndex = 0,
  direction,
  state,
  scale = 2,
  className,
}: {
  monsterSheet: "monsters1" | "monsters2" | "slimes" | "mushroom";
  monsterIndex?: number;
  direction: Direction;
  state: SpriteState;
  scale?: number;
  className?: string;
}) {
  const sheetPaths: Record<string, string> = {
    monsters1: "/sprites/dampdungeons/animations/Dungeon_Monsters1.png",
    monsters2: "/sprites/dampdungeons/animations/Dungeon_Monsters2.png",
    slimes: "/sprites/dampdungeons/animations/Dungeon_Slimes1.png",
    mushroom: "/sprites/dampdungeons/animations/Dungeon_MushroomMan.png",
  };
  
  return (
    <DirectionalSprite
      spriteSheet={sheetPaths[monsterSheet]}
      direction={direction}
      state={state}
      scale={scale}
      frameWidth={48}
      frameHeight={64}
      className={className}
    />
  );
}

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { AnimalType, AnimalConfig, ANIMAL_CONFIGS, ANIMAL_RARITY_COLORS } from "@/lib/islandSystem";

interface AnimalSpriteProps {
  animalType: AnimalType;
  direction?: 'down' | 'up' | 'left' | 'right';
  state?: 'alive' | 'dying' | 'dead';
  scale?: number;
  className?: string;
  onClick?: () => void;
  showRarityGlow?: boolean;
}

const FPS = 6;

export default function AnimalSprite({
  animalType,
  direction = 'down',
  state = 'alive',
  scale = 1,
  className,
  onClick,
  showRarityGlow = true,
}: AnimalSpriteProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [currentDirection, setCurrentDirection] = useState(direction);
  const [isDying, setIsDying] = useState(false);
  const [deathFrame, setDeathFrame] = useState(0);

  const config = useMemo(() => ANIMAL_CONFIGS[animalType], [animalType]);
  const rarityColors = ANIMAL_RARITY_COLORS[config.rarity];

  const directionRow: Record<string, number> = {
    down: 0,
    up: 1,
    left: 2,
    right: 3,
  };

  useEffect(() => {
    if (state === 'dying' || state === 'dead') {
      setIsDying(true);
      return;
    }
    
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % config.walkFrames);
    }, 1000 / FPS);

    return () => clearInterval(interval);
  }, [config.walkFrames, state]);

  useEffect(() => {
    if (state === 'alive') {
      const directionInterval = setInterval(() => {
        if (Math.random() < 0.2) {
          const directions: ('down' | 'up' | 'left' | 'right')[] = ['down', 'up', 'left', 'right'];
          setCurrentDirection(directions[Math.floor(Math.random() * directions.length)]);
        }
      }, 3000);
      return () => clearInterval(directionInterval);
    }
  }, [state]);

  useEffect(() => {
    if (isDying && deathFrame < config.deathFrames - 1) {
      const timeout = setTimeout(() => {
        setDeathFrame(prev => Math.min(prev + 1, config.deathFrames - 1));
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [isDying, deathFrame, config.deathFrames]);

  const displayWidth = config.frameWidth * config.scale * scale;
  const displayHeight = config.frameHeight * config.scale * scale;
  const rowIndex = directionRow[currentDirection] || 0;

  const spriteSrc = isDying ? config.deathSprite : config.walkSprite;
  const currentFrame = isDying ? deathFrame : frameIndex;
  const frameCount = isDying ? config.deathFrames : config.walkFrames;

  return (
    <div
      className={cn(
        "cursor-pointer group relative", 
        showRarityGlow && config.rarity !== 'common' && `animate-pulse`,
        className
      )}
      onClick={onClick}
      style={{
        width: displayWidth,
        height: displayHeight,
      }}
      data-testid={`animal-sprite-${animalType}`}
    >
      {showRarityGlow && config.rarity !== 'common' && (
        <div 
          className={cn(
            "absolute inset-0 rounded-full blur-md -z-10",
            config.rarity === 'rare' && "bg-blue-500/40",
            config.rarity === 'epic' && "bg-purple-500/50",
            config.rarity === 'legendary' && "bg-amber-500/60 animate-pulse"
          )}
          style={{
            transform: 'scale(1.3)',
          }}
        />
      )}
      
      <div
        style={{
          width: displayWidth,
          height: displayHeight,
          overflow: "hidden",
          position: "relative",
        }}
        className="transition-transform group-hover:scale-110"
      >
        <img
          src={spriteSrc}
          alt={config.name}
          draggable={false}
          style={{
            position: "absolute",
            left: -(currentFrame * displayWidth),
            top: -(rowIndex * displayHeight),
            width: frameCount * displayWidth,
            height: 4 * displayHeight,
            imageRendering: "pixelated",
            maxWidth: "none",
            opacity: state === 'dead' && deathFrame >= config.deathFrames - 1 ? 0.5 : 1,
          }}
        />
      </div>
      
      {state === 'alive' && (
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 top-full mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 border",
          rarityColors.bg,
          rarityColors.text,
          rarityColors.border
        )}>
          Hunt {config.name}
        </div>
      )}
      
      {showRarityGlow && config.rarity !== 'common' && state === 'alive' && (
        <div className={cn(
          "absolute -top-1 -right-1 text-[8px] font-bold px-1 rounded",
          rarityColors.bg,
          rarityColors.text,
          "border",
          rarityColors.border
        )}>
          {config.rarity.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export function AnimalCorpseSprite({
  animalType,
  direction = 'down',
  scale = 1,
  className,
}: {
  animalType: AnimalType;
  direction?: 'down' | 'up' | 'left' | 'right';
  scale?: number;
  className?: string;
}) {
  const config = ANIMAL_CONFIGS[animalType];
  const rarityColors = ANIMAL_RARITY_COLORS[config.rarity];
  
  const directionRow: Record<string, number> = {
    down: 0,
    up: 1,
    left: 2,
    right: 3,
  };

  const displayWidth = config.frameWidth * config.scale * scale;
  const displayHeight = config.frameHeight * config.scale * scale;
  const rowIndex = directionRow[direction] || 0;
  const lastFrame = config.deathFrames - 1;

  return (
    <div
      className={cn("relative", className)}
      style={{
        width: displayWidth,
        height: displayHeight,
      }}
      data-testid={`animal-corpse-${animalType}`}
    >
      <div
        style={{
          width: displayWidth,
          height: displayHeight,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <img
          src={config.deathSprite}
          alt={`${config.name} remains`}
          draggable={false}
          style={{
            position: "absolute",
            left: -(lastFrame * displayWidth),
            top: -(rowIndex * displayHeight),
            width: config.deathFrames * displayWidth,
            height: 4 * displayHeight,
            imageRendering: "pixelated",
            maxWidth: "none",
            opacity: 0.7,
          }}
        />
      </div>
      
      <div className={cn(
        "absolute inset-0 flex items-center justify-center"
      )}>
        <div className={cn(
          "text-xl animate-pulse",
          rarityColors.text
        )}>
          🦴
        </div>
      </div>
    </div>
  );
}

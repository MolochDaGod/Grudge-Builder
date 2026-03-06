import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getSpriteUnit, getAnimation, getSpriteSheetPath, ColorPalette, COLOR_PALETTES, AnimationState } from "@/lib/spriteManifest";

export type SpriteAction = "Idle" | "Attack" | "Attack2" | "Attack3" | "Hurt" | "Cast" | "Heal" | "Death" | "Walk" | "Walk2" | "Run" | "Block";

interface SpriteAnimatorProps {
  spriteSet: string;
  action: SpriteAction;
  className?: string;
  scale?: number;
  onAnimationComplete?: () => void;
  loop?: boolean;
  flip?: boolean;
  palette?: ColorPalette;
  customTint?: string;
  isUndead?: boolean;
  paused?: boolean;
}

const ACTION_MAP: Record<SpriteAction, AnimationState> = {
  Idle: "idle",
  Attack: "attack",
  Attack2: "attack2",
  Attack3: "attack3",
  Hurt: "hurt",
  Cast: "cast",
  Heal: "heal",
  Death: "death",
  Walk: "walk",
  Walk2: "walk2",
  Run: "run",
  Block: "block",
};

export default function SpriteAnimator({ 
  spriteSet, 
  action, 
  className, 
  scale = 1,
  onAnimationComplete,
  loop,
  flip = false,
  palette,
  customTint,
  isUndead = false,
  paused = false,
}: SpriteAnimatorProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [error, setError] = useState(false);
  
  const unit = getSpriteUnit(spriteSet);
  const animState = ACTION_MAP[action];
  const animation = getAnimation(unit, animState);
  const shouldLoop = loop ?? animation.loop;
  const spriteSheetPath = getSpriteSheetPath(unit, animation);
  
  useEffect(() => {
    setFrameIndex(0);
    setError(false);
  }, [spriteSet, action]);

  useEffect(() => {
    if (animation.frameCount <= 1 || paused) return;
    
    const interval = setInterval(() => {
      setFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= animation.frameCount) {
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
    }, 1000 / animation.fps);

    return () => clearInterval(interval);
  }, [animation.frameCount, animation.fps, shouldLoop, onAnimationComplete, paused]);

  const containerWidth = unit.frameWidth * scale;
  const containerHeight = unit.frameHeight * scale;
  
  // Undead filter for dark, ghostly appearance
  const undeadFilter = 'invert(0.85) hue-rotate(180deg) saturate(0.7) brightness(0.9) contrast(1.2)';
  const baseFilter = customTint || (palette ? COLOR_PALETTES[palette] : unit.defaultTint) || "";
  const filter = isUndead ? undeadFilter : baseFilter;

  if (error) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-800/50 text-slate-500 text-[8px] border border-slate-700", className)} style={{ width: containerWidth, height: containerHeight }}>
        ?
      </div>
    );
  }

  return (
    <div 
      className={cn("overflow-hidden relative", className)}
      data-testid="sprite-animator"
      data-sprite-set={spriteSet}
      data-sprite-path={spriteSheetPath}
      style={{
        width: containerWidth,
        height: containerHeight,
        backgroundImage: `url("${spriteSheetPath}")`,
        backgroundPosition: `-${frameIndex * unit.frameWidth * scale}px 0px`,
        backgroundSize: `${animation.frameCount * unit.frameWidth * scale}px ${unit.frameHeight * scale}px`,
        imageRendering: 'pixelated',
        filter: filter,
        transform: flip ? "scaleX(-1)" : undefined,
      }}
    >
      <img 
        src={spriteSheetPath} 
        onError={() => setError(true)} 
        style={{ display: 'none' }}
        alt=""
      />
    </div>
  );
}

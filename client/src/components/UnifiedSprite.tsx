import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  getSpriteUnit, 
  getAnimation,
  getSpriteSheetPath, 
  AnimationState, 
  ColorPalette, 
  COLOR_PALETTES,
  SpriteUnit
} from "@/lib/spriteManifest";

interface UnifiedSpriteProps {
  unitId: string;
  state: AnimationState;
  direction?: "down" | "left" | "right" | "up";
  className?: string;
  scale?: number;
  palette?: ColorPalette;
  customTint?: string;
  onAnimationComplete?: () => void;
  loop?: boolean;
}

const DIRECTION_ROW: Record<string, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

export default function UnifiedSprite({
  unitId,
  state,
  direction = "down",
  className,
  scale = 1,
  palette,
  customTint,
  onAnimationComplete,
  loop: loopOverride,
}: UnifiedSpriteProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [error, setError] = useState(false);
  
  const unit = getSpriteUnit(unitId);
  const animation = getAnimation(unit, state);
  const shouldLoop = loopOverride !== undefined ? loopOverride : animation.loop;
  const row = DIRECTION_ROW[direction] ?? 0;
  
  useEffect(() => {
    setFrameIndex(0);
    setError(false);
  }, [unitId, state, direction]);

  useEffect(() => {
    if (animation.frameCount <= 1) return;
    
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
  }, [animation.frameCount, animation.fps, shouldLoop, onAnimationComplete]);

  const containerWidth = unit.frameWidth * scale;
  const containerHeight = unit.frameHeight * scale;
  
  const filter = customTint || (palette ? COLOR_PALETTES[palette] : unit.defaultTint) || "";

  if (error) {
    return (
      <div 
        className={cn("flex items-center justify-center bg-slate-800/50 text-slate-500 text-[8px] border border-slate-700", className)} 
        style={{ width: containerWidth, height: containerHeight }}
      >
        ?
      </div>
    );
  }

  const framesPerRow = Math.max(animation.frameCount, 3);
  
  return (
    <div 
      className={cn("overflow-hidden relative", className)}
      style={{
        width: containerWidth,
        height: containerHeight,
        backgroundImage: `url(${getSpriteSheetPath(unit, animation)})`,
        backgroundPosition: `-${frameIndex * containerWidth}px -${row * containerHeight}px`,
        backgroundSize: `${framesPerRow * containerWidth}px auto`,
        imageRendering: 'pixelated',
        filter: filter,
      }}
    >
      <img 
        src={getSpriteSheetPath(unit, animation)} 
        onError={() => setError(true)} 
        style={{ display: 'none' }}
        alt=""
      />
    </div>
  );
}

export function SpritePreview({ 
  unitId, 
  size = 64,
  palette,
}: { 
  unitId: string; 
  size?: number;
  palette?: ColorPalette;
}) {
  const scale = size / 48;
  return (
    <UnifiedSprite 
      unitId={unitId} 
      state="idle" 
      scale={scale} 
      palette={palette}
    />
  );
}

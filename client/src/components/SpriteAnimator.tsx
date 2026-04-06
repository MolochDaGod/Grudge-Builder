import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getSpriteUnit, getAnimation, getSpriteSheetPath, ColorPalette, COLOR_PALETTES, AnimationState, type EffectType } from "@/lib/spriteManifest";

export type SpriteAction = "Idle" | "Attack" | "Attack2" | "Attack3" | "Hurt" | "Cast" | "Heal" | "Death" | "Walk" | "Walk2" | "Run" | "Block" | "Roll" | "Dash";

interface SpriteAnimatorProps {
  spriteSet: string;
  action: SpriteAction;
  className?: string;
  scale?: number;
  onAnimationComplete?: () => void;
  /** When true, one-shot anims (attack, hurt, death) auto-return to idle after finishing */
  returnToIdle?: boolean;
  loop?: boolean;
  flip?: boolean;
  palette?: ColorPalette;
  customTint?: string;
  isUndead?: boolean;
  paused?: boolean;
  /** Show weapon/spell effect overlay (split effect sprite rendered on top) */
  showEffects?: boolean;
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
  Roll: "run",   // Roll uses run frames (closest motion) until dedicated roll sheets exist
  Dash: "run",   // Dash uses run frames at higher FPS
};

/** Map actions to their corresponding weapon/spell effect overlay */
const EFFECT_MAP: Partial<Record<SpriteAction, EffectType>> = {
  Attack: "attack_effect",
  Attack2: "attack2_effect",
  Attack3: "attack3_effect",
  Cast: "cast_effect",
  Heal: "heal_effect",
};

/** One-shot actions that should auto-return to idle when returnToIdle is true */
const ONE_SHOT_ACTIONS = new Set<SpriteAction>(["Attack", "Attack2", "Attack3", "Hurt", "Cast", "Heal", "Block", "Roll", "Dash"]);

export default function SpriteAnimator({ 
  spriteSet, 
  action, 
  className, 
  scale = 1,
  onAnimationComplete,
  returnToIdle = false,
  loop,
  flip = false,
  palette,
  customTint,
  isUndead = false,
  paused = false,
  showEffects = false,
}: SpriteAnimatorProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [effectFrameIndex, setEffectFrameIndex] = useState(0);
  const [error, setError] = useState(false);
  const [activeAction, setActiveAction] = useState(action);
  
  const unit = getSpriteUnit(spriteSet);
  const animState = ACTION_MAP[activeAction];
  const animation = getAnimation(unit, animState);
  const shouldLoop = loop ?? animation.loop;
  const spriteSheetPath = getSpriteSheetPath(unit, animation);

  // Resolve effect overlay (weapon/spell VFX layer)
  const effectType = showEffects ? EFFECT_MAP[activeAction] : undefined;
  const effectAnim = effectType && unit.effects?.[effectType] ? unit.effects[effectType] : null;
  const effectPath = effectAnim?.file || null;
  
  // Sync activeAction with external action prop
  useEffect(() => {
    setActiveAction(action);
    setFrameIndex(0);
    setEffectFrameIndex(0);
    setError(false);
  }, [spriteSet, action]);

  // Main animation tick — plays ALL frames from start to finish
  useEffect(() => {
    if (animation.frameCount <= 1 || paused) return;
    
    // For Roll/Dash, boost FPS
    const fps = (activeAction === 'Roll' || activeAction === 'Dash') ? animation.fps * 1.5 : animation.fps;
    
    const interval = setInterval(() => {
      setFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= animation.frameCount) {
          if (!shouldLoop) {
            clearInterval(interval);
            onAnimationComplete?.();
            // Auto-return to idle after one-shot anims
            if (returnToIdle && ONE_SHOT_ACTIONS.has(activeAction) && activeAction !== 'Death') {
              setActiveAction('Idle');
              return 0;
            }
            return prev; // Hold last frame
          }
          onAnimationComplete?.();
          return 0;
        }
        return next;
      });
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [animation.frameCount, animation.fps, shouldLoop, onAnimationComplete, paused, activeAction, returnToIdle]);

  // Effect overlay tick (independent timing from main sprite)
  useEffect(() => {
    if (!effectAnim || effectAnim.frameCount <= 1 || paused) return;
    
    const interval = setInterval(() => {
      setEffectFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= effectAnim.frameCount) {
          if (!effectAnim.loop) { clearInterval(interval); return prev; }
          return 0;
        }
        return next;
      });
    }, 1000 / effectAnim.fps);

    return () => clearInterval(interval);
  }, [effectAnim, paused]);

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
      className={cn("relative", className)}
      data-testid="sprite-animator"
      data-sprite-set={spriteSet}
      data-sprite-path={spriteSheetPath}
      style={{
        width: containerWidth,
        height: containerHeight,
        transform: flip ? "scaleX(-1)" : undefined,
      }}
    >
      {/* Base character sprite layer */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          backgroundImage: `url("${spriteSheetPath}")`,
          backgroundPosition: `-${frameIndex * unit.frameWidth * scale}px 0px`,
          backgroundSize: `${animation.frameCount * unit.frameWidth * scale}px ${unit.frameHeight * scale}px`,
          imageRendering: 'pixelated',
          filter: filter,
        }}
      />
      {/* Weapon/spell effect overlay layer (rendered on top, same frame timing) */}
      {effectPath && effectAnim && (
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{
            backgroundImage: `url("${effectPath}")`,
            backgroundPosition: `-${effectFrameIndex * unit.frameWidth * scale}px 0px`,
            backgroundSize: `${effectAnim.frameCount * unit.frameWidth * scale}px ${unit.frameHeight * scale}px`,
            imageRendering: 'pixelated',
            mixBlendMode: 'screen',
          }}
        />
      )}
      <img 
        src={spriteSheetPath} 
        onError={() => setError(true)} 
        style={{ display: 'none' }}
        alt=""
      />
    </div>
  );
}

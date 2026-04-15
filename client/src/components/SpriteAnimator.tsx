import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getSpriteUnit, getAnimation, getSpriteSheetPath, ColorPalette, COLOR_PALETTES, AnimationState, type EffectType } from "@/lib/spriteManifest";

export type SpriteAction =
  // ─── Locomotion
  | "Idle" | "Walk" | "Walk2" | "Run"
  | "Jump"  | "Swim"  | "Climb" | "Turn" | "GetUp"
  | "Dodge" | "Roll"  | "Dash"
  // ─── Movement variants
  | "Move1" | "Move2" | "Move3" | "Move4"
  // ─── Attacks
  | "Attack" | "Attack2" | "Attack3" | "Attack4"
  // ─── Class skills
  | "Class1" | "Class2" | "Class3"
  // ─── Special / magic
  | "Special" | "Cast" | "Heal"
  // ─── Air
  | "JumpAttack"
  // ─── Visual effects (one-shot)
  | "Effect1" | "Effect2" | "Effect3" | "Effect4"
  // ─── Auras (looping overlay)
  | "Aura1" | "Aura2"
  // ─── Defense
  | "Block" | "Parry"
  // ─── Damage / death
  | "Hurt" | "Death";

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
  // ─── Locomotion
  Idle:       "idle",
  Walk:       "walk",
  Walk2:      "walk2",
  Run:        "run",
  Jump:       "jump",
  Swim:       "swim",
  Climb:      "climb",
  Turn:       "turn",
  GetUp:      "getup",
  Dodge:      "dodge",
  Roll:       "roll",
  Dash:       "run",    // Dash uses run frames at higher FPS until Dash sheet exists
  Move1:      "move1",
  Move2:      "move2",
  Move3:      "move3",
  Move4:      "move4",
  // ─── Attacks
  Attack:     "attack",
  Attack2:    "attack2",
  Attack3:    "attack3",
  Attack4:    "attack4",
  // ─── Class skills
  Class1:     "class1",
  Class2:     "class2",
  Class3:     "class3",
  // ─── Special / magic
  Special:    "special",
  Cast:       "cast",
  Heal:       "heal",
  // ─── Air
  JumpAttack: "jumpattack",
  // ─── Visual effects
  Effect1:    "effect1",
  Effect2:    "effect2",
  Effect3:    "effect3",
  Effect4:    "effect4",
  // ─── Auras
  Aura1:      "aura1",
  Aura2:      "aura2",
  // ─── Defense
  Block:      "block",
  Parry:      "parry",
  // ─── Damage / death
  Hurt:       "hurt",
  Death:      "death",
};

/** Map actions to their corresponding weapon/spell effect overlay */
const EFFECT_MAP: Partial<Record<SpriteAction, EffectType>> = {
  Attack:     "attack_effect",
  Attack2:    "attack2_effect",
  Attack3:    "attack3_effect",
  Attack4:    "attack3_effect",
  Class1:     "attack_effect",
  Class2:     "attack2_effect",
  Class3:     "attack3_effect",
  Special:    "attack3_effect",
  JumpAttack: "attack_effect",
  Effect1:    "cast_effect",
  Effect2:    "cast_effect",
  Effect3:    "attack3_effect",
  Effect4:    "attack3_effect",
  Cast:       "cast_effect",
  Heal:       "heal_effect",
};

/** One-shot actions that should auto-return to idle when returnToIdle is true */
const ONE_SHOT_ACTIONS = new Set<SpriteAction>([
  // Attacks
  "Attack", "Attack2", "Attack3", "Attack4",
  // Class / special
  "Class1", "Class2", "Class3",
  "Special", "Cast", "Heal",
  // Air
  "JumpAttack", "Jump",
  // Effects (one-shot bursts)
  "Effect1", "Effect2", "Effect3", "Effect4",
  // Defense
  "Block", "Parry",
  // Mobility
  "Dodge", "Roll", "Dash",
  "Turn", "GetUp",
  // Damage
  "Hurt",
  // NOTE: Move1-4 and Aura1-2 are NOT in ONE_SHOT — they loop
]);

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

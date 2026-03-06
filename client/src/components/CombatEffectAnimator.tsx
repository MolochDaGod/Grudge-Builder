import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getSpriteUnit, getEffectForAnimation, AnimationState, EffectAnimation } from "@/lib/spriteManifest";

export interface CombatEffect {
  id: string;
  spriteId: string;
  animState: AnimationState;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  onComplete?: () => void;
}

interface CombatEffectAnimatorProps {
  effects: CombatEffect[];
  onEffectComplete?: (effectId: string) => void;
  scale?: number;
}

interface ActiveEffect extends CombatEffect {
  currentX: number;
  currentY: number;
  frameIndex: number;
  startTime: number;
  effectAnim: EffectAnimation;
}

export default function CombatEffectAnimator({
  effects,
  onEffectComplete,
  scale = 1,
}: CombatEffectAnimatorProps) {
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);

  useEffect(() => {
    const newEffects: ActiveEffect[] = [];
    
    effects.forEach(effect => {
      const existingEffect = activeEffects.find(ae => ae.id === effect.id);
      if (existingEffect) return;
      
      const effectAnim = getEffectForAnimation(effect.spriteId, effect.animState);
      if (!effectAnim) return;
      
      newEffects.push({
        ...effect,
        currentX: effect.startX,
        currentY: effect.startY,
        frameIndex: 0,
        startTime: Date.now(),
        effectAnim,
      });
    });
    
    if (newEffects.length > 0) {
      setActiveEffects(prev => [...prev, ...newEffects]);
    }
  }, [effects]);

  useEffect(() => {
    if (activeEffects.length === 0) return;
    
    const animationFrame = requestAnimationFrame(() => {
      const now = Date.now();
      
      setActiveEffects(prev => {
        const updated: ActiveEffect[] = [];
        const completed: string[] = [];
        
        prev.forEach(effect => {
          const elapsed = now - effect.startTime;
          const frameDuration = 1000 / effect.effectAnim.fps;
          const newFrameIndex = Math.floor(elapsed / frameDuration);
          
          if (effect.effectAnim.type === "projectile" && effect.effectAnim.travelSpeed) {
            const dx = effect.targetX - effect.startX;
            const dy = effect.targetY - effect.startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const travelTime = (distance / effect.effectAnim.travelSpeed) * 1000;
            const progress = Math.min(1, elapsed / travelTime);
            
            const newX = effect.startX + dx * progress;
            const newY = effect.startY + dy * progress;
            
            if (progress >= 1) {
              completed.push(effect.id);
              effect.onComplete?.();
            } else {
              updated.push({
                ...effect,
                currentX: newX,
                currentY: newY,
                frameIndex: newFrameIndex % effect.effectAnim.frameCount,
              });
            }
          } else if (effect.effectAnim.type === "impact" || effect.effectAnim.type === "aoe") {
            if (newFrameIndex >= effect.effectAnim.frameCount) {
              completed.push(effect.id);
              effect.onComplete?.();
            } else {
              updated.push({
                ...effect,
                currentX: effect.targetX,
                currentY: effect.targetY,
                frameIndex: newFrameIndex,
              });
            }
          } else {
            updated.push({
              ...effect,
              frameIndex: newFrameIndex % effect.effectAnim.frameCount,
            });
          }
        });
        
        completed.forEach(id => onEffectComplete?.(id));
        
        return updated;
      });
    });
    
    return () => cancelAnimationFrame(animationFrame);
  }, [activeEffects, onEffectComplete]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {activeEffects.map(effect => {
        const unit = getSpriteUnit(effect.spriteId);
        const frameWidth = unit.frameWidth * scale;
        const frameHeight = unit.frameHeight * scale;
        
        const angle = effect.effectAnim.type === "projectile" 
          ? Math.atan2(effect.targetY - effect.startY, effect.targetX - effect.startX) * (180 / Math.PI)
          : 0;
        
        return (
          <div
            key={effect.id}
            className="absolute"
            style={{
              left: effect.currentX - frameWidth / 2,
              top: effect.currentY - frameHeight / 2,
              width: frameWidth,
              height: frameHeight,
              backgroundImage: `url("${encodeURI(effect.effectAnim.file)}")`,
              backgroundPosition: `-${effect.frameIndex * frameWidth}px 0px`,
              backgroundSize: `${effect.effectAnim.frameCount * frameWidth}px ${frameHeight}px`,
              imageRendering: 'pixelated',
              transform: `rotate(${angle}deg)`,
              zIndex: 100,
            }}
            data-testid={`combat-effect-${effect.id}`}
          />
        );
      })}
    </div>
  );
}

export function useCombatEffects() {
  const [effects, setEffects] = useState<CombatEffect[]>([]);
  const [effectCounter, setEffectCounter] = useState(0);

  const triggerEffect = useCallback((
    spriteId: string,
    animState: AnimationState,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    onComplete?: () => void
  ) => {
    const effectId = `effect-${effectCounter}`;
    setEffectCounter(prev => prev + 1);
    
    const effectAnim = getEffectForAnimation(spriteId, animState);
    if (!effectAnim) {
      onComplete?.();
      return effectId;
    }
    
    setEffects(prev => [...prev, {
      id: effectId,
      spriteId,
      animState,
      startX,
      startY,
      targetX,
      targetY,
      onComplete,
    }]);
    
    return effectId;
  }, [effectCounter]);

  const handleEffectComplete = useCallback((effectId: string) => {
    setEffects(prev => prev.filter(e => e.id !== effectId));
  }, []);

  return {
    effects,
    triggerEffect,
    handleEffectComplete,
  };
}

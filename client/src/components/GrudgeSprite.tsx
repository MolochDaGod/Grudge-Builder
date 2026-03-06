import { useState, useEffect } from "react";

export type SpriteState = "idle" | "walk" | "attack" | "hurt" | "death";

interface SpriteConfig {
  idle: string;
  walk: string;
  attack: string;
  hurt: string;
  death: string;
  frames: Record<SpriteState, number>;
  size: number;
}

const CLASS_SPRITES: Record<string, SpriteConfig> = {
  'adventurer': {
    idle: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Swordsman/Swordsman/Swordsman-Idle.png',
    walk: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Swordsman/Swordsman/Swordsman-Walk.png',
    attack: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Swordsman/Swordsman/Swordsman-Attack01.png',
    hurt: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Swordsman/Swordsman/Swordsman-Hurt.png',
    death: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Swordsman/Swordsman/Swordsman-Death.png',
    frames: { idle: 4, walk: 6, attack: 5, hurt: 2, death: 6 },
    size: 100
  },
  'worg': {
    idle: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werebear/Werebear/Werebear-Idle.png',
    walk: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werebear/Werebear/Werebear-Walk.png',
    attack: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werebear/Werebear/Werebear-Attack01.png',
    hurt: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werebear/Werebear/Werebear-Hurt.png',
    death: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werebear/Werebear/Werebear-Death.png',
    frames: { idle: 4, walk: 6, attack: 6, hurt: 3, death: 6 },
    size: 100
  },
  'warrior': {
    idle: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Knight/Knight/Knight-Idle.png',
    walk: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Knight/Knight/Knight-Walk.png',
    attack: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Knight/Knight/Knight-Attack01.png',
    hurt: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Knight/Knight/Knight-Hurt.png',
    death: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Knight/Knight/Knight-Death.png',
    frames: { idle: 4, walk: 6, attack: 5, hurt: 2, death: 6 },
    size: 100
  },
  'mage': {
    idle: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Wizard/Wizard/Wizard-Idle.png',
    walk: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Wizard/Wizard/Wizard-Walk.png',
    attack: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Wizard/Wizard/Wizard-Attack01.png',
    hurt: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Wizard/Wizard/Wizard-Hurt.png',
    death: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Wizard/Wizard/Wizard-DEATH.png',
    frames: { idle: 4, walk: 6, attack: 8, hurt: 3, death: 5 },
    size: 100
  },
  'ranger': {
    idle: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Archer/Archer/Archer-Idle.png',
    walk: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Archer/Archer/Archer-Walk.png',
    attack: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Archer/Archer/Archer-Attack01.png',
    hurt: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Archer/Archer/Archer-Hurt.png',
    death: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Archer/Archer/Archer-Death.png',
    frames: { idle: 4, walk: 6, attack: 5, hurt: 3, death: 6 },
    size: 100
  }
};

const MONSTER_SPRITES: Record<string, SpriteConfig> = {
  'slime': {
    idle: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Slime/Slime/Slime-Idle.png',
    walk: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Slime/Slime/Slime-Walk.png',
    attack: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Slime/Slime/Slime-Attack01.png',
    hurt: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Slime/Slime/Slime-Hurt.png',
    death: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Slime/Slime/Slime-Death.png',
    frames: { idle: 4, walk: 4, attack: 7, hurt: 3, death: 4 },
    size: 100
  },
  'skeleton': {
    idle: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Skeleton/Skeleton/Skeleton-Idle.png',
    walk: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Skeleton/Skeleton/Skeleton-Walk.png',
    attack: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Skeleton/Skeleton/Skeleton-Attack01.png',
    hurt: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Skeleton/Skeleton/Skeleton-Hurt.png',
    death: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Skeleton/Skeleton/Skeleton-Death.png',
    frames: { idle: 4, walk: 4, attack: 8, hurt: 4, death: 4 },
    size: 100
  },
  'orc': {
    idle: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Orc/Orc/Orc-Idle.png',
    walk: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Orc/Orc/Orc-Walk.png',
    attack: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Orc/Orc/Orc-Attack01.png',
    hurt: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Orc/Orc/Orc-Hurt.png',
    death: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Orc/Orc/Orc-Death.png',
    frames: { idle: 4, walk: 4, attack: 6, hurt: 4, death: 4 },
    size: 100
  },
  'werewolf': {
    idle: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werewolf/Werewolf/Werewolf-Idle.png',
    walk: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werewolf/Werewolf/Werewolf-Walk.png',
    attack: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werewolf/Werewolf/Werewolf-Attack01.png',
    hurt: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werewolf/Werewolf/Werewolf-Hurt.png',
    death: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Werewolf/Werewolf/Werewolf-Death.png',
    frames: { idle: 4, walk: 6, attack: 6, hurt: 3, death: 6 },
    size: 100
  },
  'armored_skeleton': {
    idle: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Armored Skeleton/Armored Skeleton/Armored Skeleton-Idle.png',
    walk: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Armored Skeleton/Armored Skeleton/Armored Skeleton-Walk.png',
    attack: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Armored Skeleton/Armored Skeleton/Armored Skeleton-Attack01.png',
    hurt: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Armored Skeleton/Armored Skeleton/Armored Skeleton-Hurt.png',
    death: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Armored Skeleton/Armored Skeleton/Armored Skeleton-Death.png',
    frames: { idle: 4, walk: 4, attack: 5, hurt: 4, death: 4 },
    size: 100
  },
  'elite_orc': {
    idle: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Elite Orc/Elite Orc/Elite Orc-Idle.png',
    walk: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Elite Orc/Elite Orc/Elite Orc-Walk.png',
    attack: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Elite Orc/Elite Orc/Elite Orc-Attack01.png',
    hurt: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Elite Orc/Elite Orc/Elite Orc-Hurt.png',
    death: '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Elite Orc/Elite Orc/Elite Orc-Death.png',
    frames: { idle: 4, walk: 4, attack: 5, hurt: 4, death: 4 },
    size: 100
  }
};

const STATE_FPS: Record<SpriteState, number> = {
  idle: 6,
  walk: 10,
  attack: 14,
  hurt: 8,
  death: 8
};

interface GrudgeSpriteProps {
  spriteType: string;
  state: SpriteState;
  facingRight?: boolean;
  scale?: number;
  className?: string;
  isMonster?: boolean;
  onAnimationComplete?: () => void;
}

export function GrudgeSprite({
  spriteType,
  state,
  facingRight = true,
  scale = 1,
  className = "",
  isMonster = false,
  onAnimationComplete
}: GrudgeSpriteProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [error, setError] = useState(false);
  
  const spriteMap = isMonster ? MONSTER_SPRITES : CLASS_SPRITES;
  const config = spriteMap[spriteType.toLowerCase()] || spriteMap[Object.keys(spriteMap)[0]];
  
  const spriteSheet = config[state];
  const frameCount = config.frames[state];
  const frameSize = config.size;
  const fps = STATE_FPS[state];
  
  const shouldLoop = state === "idle" || state === "walk";
  
  useEffect(() => {
    setFrameIndex(0);
  }, [state, spriteSheet]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex(prev => {
        const nextFrame = prev + 1;
        if (nextFrame >= frameCount) {
          if (shouldLoop) {
            return 0;
          } else {
            onAnimationComplete?.();
            return prev;
          }
        }
        return nextFrame;
      });
    }, 1000 / fps);
    
    return () => clearInterval(interval);
  }, [frameCount, fps, shouldLoop, onAnimationComplete]);
  
  const containerWidth = frameSize * scale;
  const containerHeight = frameSize * scale;
  
  if (error) {
    return (
      <div 
        className={`bg-purple-900/50 flex items-center justify-center ${className}`}
        style={{ width: containerWidth, height: containerHeight }}
      >
        <span className="text-xs text-purple-300">?</span>
      </div>
    );
  }
  
  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        width: containerWidth,
        height: containerHeight,
        backgroundImage: `url(${encodeURI(spriteSheet)})`,
        backgroundPosition: `-${frameIndex * containerWidth}px 0px`,
        backgroundSize: `${frameCount * containerWidth}px ${containerHeight}px`,
        imageRendering: 'pixelated',
        transform: facingRight ? 'scaleX(1)' : 'scaleX(-1)'
      }}
      onError={() => setError(true)}
    />
  );
}

export function GrudgeHeroSprite({
  classId,
  state,
  facingRight = true,
  scale = 1,
  className = "",
  onAnimationComplete
}: {
  classId: string;
  state: SpriteState;
  facingRight?: boolean;
  scale?: number;
  className?: string;
  onAnimationComplete?: () => void;
}) {
  return (
    <GrudgeSprite
      spriteType={classId}
      state={state}
      facingRight={facingRight}
      scale={scale}
      className={className}
      isMonster={false}
      onAnimationComplete={onAnimationComplete}
    />
  );
}

export function GrudgeMonsterSprite({
  monsterType,
  state,
  facingRight = true,
  scale = 1,
  className = "",
  onAnimationComplete
}: {
  monsterType: string;
  state: SpriteState;
  facingRight?: boolean;
  scale?: number;
  className?: string;
  onAnimationComplete?: () => void;
}) {
  return (
    <GrudgeSprite
      spriteType={monsterType}
      state={state}
      facingRight={facingRight}
      scale={scale}
      className={className}
      isMonster={true}
      onAnimationComplete={onAnimationComplete}
    />
  );
}

export { CLASS_SPRITES, MONSTER_SPRITES };

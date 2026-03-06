import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  CharacterAnimation,
  SequenceAnimation,
  ORC_ANIMATIONS,
  VAMPIRE_ANIMATIONS,
  SKELETON_CRUSADER_ANIMATIONS,
  generateFramePath
} from '@shared/definitions/characterAnimations';

export type CharacterCategory = 'orcs' | 'vampires' | 'skeletons';
export type Direction = 'down' | 'left' | 'right' | 'up';

const DIRECTION_ROW: Record<Direction, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3
};

interface CharacterAnimatorProps {
  category: CharacterCategory;
  characterId: string;
  animation: string;
  direction?: Direction;
  scale?: number;
  className?: string;
  onAnimationComplete?: () => void;
  loop?: boolean;
  paused?: boolean;
  flip?: boolean;
}

const imageCache: Record<string, HTMLImageElement> = {};

function preloadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache[src]) {
    return Promise.resolve(imageCache[src]);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache[src] = img;
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

export function CharacterAnimator({
  category,
  characterId,
  animation,
  direction = 'down',
  scale = 1,
  className,
  onAnimationComplete,
  loop,
  paused = false,
  flip = false
}: CharacterAnimatorProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const frameImagesRef = useRef<HTMLImageElement[]>([]);

  const getAnimationConfig = useCallback(() => {
    if (category === 'orcs') {
      const char = ORC_ANIMATIONS[characterId];
      return char?.animations[animation] as CharacterAnimation | undefined;
    } else if (category === 'vampires') {
      const char = VAMPIRE_ANIMATIONS[characterId];
      return char?.animations[animation] as CharacterAnimation | undefined;
    } else if (category === 'skeletons') {
      const char = SKELETON_CRUSADER_ANIMATIONS[characterId];
      return char?.animations[animation] as SequenceAnimation | undefined;
    }
    return undefined;
  }, [category, characterId, animation]);

  const animConfig = getAnimationConfig();
  const shouldLoop = loop ?? animConfig?.loop ?? true;
  const isSequence = category === 'skeletons';

  useEffect(() => {
    setFrameIndex(0);
    setLoaded(false);
    setError(false);

    if (!animConfig) {
      setError(true);
      return;
    }

    if (isSequence) {
      const seqAnim = animConfig as SequenceAnimation;
      const loadPromises: Promise<HTMLImageElement>[] = [];
      for (let i = 0; i < seqAnim.frameCount; i++) {
        const framePath = generateFramePath(seqAnim, i);
        loadPromises.push(preloadImage(framePath));
      }
      Promise.all(loadPromises)
        .then((images) => {
          frameImagesRef.current = images;
          setLoaded(true);
        })
        .catch(() => setError(true));
    } else {
      const sheetAnim = animConfig as CharacterAnimation;
      preloadImage(sheetAnim.basePath)
        .then((img) => {
          imageRef.current = img;
          setLoaded(true);
        })
        .catch(() => setError(true));
    }
  }, [animConfig, isSequence]);

  useEffect(() => {
    if (!loaded || !animConfig || paused) return;

    const interval = setInterval(() => {
      setFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= animConfig.frameCount) {
          if (!shouldLoop) {
            clearInterval(interval);
            onAnimationComplete?.();
            return prev;
          }
          onAnimationComplete?.();
          return 0;
        }
        return next;
      });
    }, 1000 / animConfig.fps);

    return () => clearInterval(interval);
  }, [loaded, animConfig, shouldLoop, paused, onAnimationComplete]);

  useEffect(() => {
    if (!loaded || !animConfig) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isSequence) {
      const frameImg = frameImagesRef.current[frameIndex];
      if (frameImg) {
        const seqAnim = animConfig as SequenceAnimation;
        if (flip) {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(
            frameImg,
            0, 0, seqAnim.frameWidth, seqAnim.frameHeight,
            -seqAnim.frameWidth * scale, 0,
            seqAnim.frameWidth * scale, seqAnim.frameHeight * scale
          );
          ctx.restore();
        } else {
          ctx.drawImage(
            frameImg,
            0, 0, seqAnim.frameWidth, seqAnim.frameHeight,
            0, 0,
            seqAnim.frameWidth * scale, seqAnim.frameHeight * scale
          );
        }
      }
    } else {
      const sheetAnim = animConfig as CharacterAnimation;
      const img = imageRef.current;
      if (img) {
        const srcX = frameIndex * sheetAnim.frameWidth;
        const srcY = DIRECTION_ROW[direction] * sheetAnim.frameHeight;
        if (flip) {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(
            img,
            srcX, srcY, sheetAnim.frameWidth, sheetAnim.frameHeight,
            -sheetAnim.frameWidth * scale, 0,
            sheetAnim.frameWidth * scale, sheetAnim.frameHeight * scale
          );
          ctx.restore();
        } else {
          ctx.drawImage(
            img,
            srcX, srcY, sheetAnim.frameWidth, sheetAnim.frameHeight,
            0, 0,
            sheetAnim.frameWidth * scale, sheetAnim.frameHeight * scale
          );
        }
      }
    }
  }, [loaded, animConfig, frameIndex, direction, scale, flip, isSequence]);

  if (error || !animConfig) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-slate-800/50 text-slate-500 text-xs border border-slate-700',
          className
        )}
        style={{ width: 64 * scale, height: 64 * scale }}
        data-testid="character-animator-error"
      >
        ?
      </div>
    );
  }

  const width = animConfig.frameWidth * scale;
  const height = animConfig.frameHeight * scale;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn('', className)}
      style={{
        imageRendering: 'pixelated',
        width,
        height
      }}
      data-testid={`character-animator-${characterId}-${animation}`}
    />
  );
}

interface CharacterPreviewProps {
  category: CharacterCategory;
  characterId: string;
  scale?: number;
  className?: string;
}

export function CharacterPreview({
  category,
  characterId,
  scale = 1,
  className
}: CharacterPreviewProps) {
  const [currentAnim, setCurrentAnim] = useState('idle');
  const [direction, setDirection] = useState<Direction>('down');

  const animations = category === 'orcs'
    ? Object.keys(ORC_ANIMATIONS[characterId]?.animations || {})
    : category === 'vampires'
      ? Object.keys(VAMPIRE_ANIMATIONS[characterId]?.animations || {})
      : Object.keys(SKELETON_CRUSADER_ANIMATIONS[characterId]?.animations || {});

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <CharacterAnimator
        category={category}
        characterId={characterId}
        animation={currentAnim}
        direction={direction}
        scale={scale}
      />
      <div className="flex gap-1 flex-wrap">
        {animations.map((anim) => (
          <button
            key={anim}
            onClick={() => setCurrentAnim(anim)}
            className={cn(
              'px-2 py-1 text-xs rounded',
              currentAnim === anim
                ? 'bg-amber-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            )}
            data-testid={`btn-anim-${anim}`}
          >
            {anim}
          </button>
        ))}
      </div>
      {category !== 'skeletons' && (
        <div className="flex gap-1">
          {(['down', 'left', 'right', 'up'] as Direction[]).map((dir) => (
            <button
              key={dir}
              onClick={() => setDirection(dir)}
              className={cn(
                'px-2 py-1 text-xs rounded capitalize',
                direction === dir
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              )}
              data-testid={`btn-dir-${dir}`}
            >
              {dir}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CharacterAnimator;

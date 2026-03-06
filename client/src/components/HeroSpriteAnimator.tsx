import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  type HeroRace, 
  type AnimationType, 
  getHeroAnimation, 
  type BoundingBox 
} from '@/lib/heroSprites';

interface HeroSpriteAnimatorProps {
  race: HeroRace;
  animation: AnimationType;
  scale?: number;
  playing?: boolean;
  onAnimationEnd?: () => void;
  className?: string;
}

export function HeroSpriteAnimator({
  race,
  animation,
  scale = 1,
  playing = true,
  onAnimationEnd,
  className = '',
}: HeroSpriteAnimatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const animationData = getHeroAnimation(race, animation);

  useEffect(() => {
    if (!animationData) return;

    const img = new Image();
    img.src = animationData.spriteSheet;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error(`Failed to load sprite: ${animationData.spriteSheet}`);
    };

    return () => {
      imageRef.current = null;
      setImageLoaded(false);
    };
  }, [animationData?.spriteSheet]);

  useEffect(() => {
    setFrameIndex(0);
  }, [animation, race]);

  const drawFrame = useCallback((bbox: BoundingBox) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !animationData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      img,
      bbox.x,
      bbox.y,
      bbox.width,
      bbox.height,
      0,
      0,
      bbox.width * scale,
      bbox.height * scale
    );
  }, [animationData, scale]);

  useEffect(() => {
    if (!imageLoaded || !playing || !animationData) return;

    const { boundingBoxes, fps, loop, frameCount } = animationData;
    const frameDuration = 1000 / fps;

    const animate = (timestamp: number) => {
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = timestamp;
      }

      const elapsed = timestamp - lastFrameTimeRef.current;

      if (elapsed >= frameDuration) {
        lastFrameTimeRef.current = timestamp;

        setFrameIndex(prev => {
          const next = prev + 1;
          if (next >= frameCount) {
            if (loop) {
              return 0;
            } else {
              onAnimationEnd?.();
              return prev;
            }
          }
          return next;
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
  }, [imageLoaded, playing, animationData, onAnimationEnd]);

  useEffect(() => {
    if (!imageLoaded || !animationData) return;

    const bbox = animationData.boundingBoxes[frameIndex];
    if (bbox) {
      drawFrame(bbox);
    }
  }, [frameIndex, imageLoaded, animationData, drawFrame]);

  if (!animationData) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-800 rounded ${className}`}
        style={{ width: 128 * scale, height: 160 * scale }}
      >
        <span className="text-gray-500 text-xs">No animation</span>
      </div>
    );
  }

  const maxWidth = Math.max(...animationData.boundingBoxes.map(b => b.width));
  const maxHeight = Math.max(...animationData.boundingBoxes.map(b => b.height));

  // Undead filter: invert colors and shift hue for dark, ghostly appearance
  const undeadFilter = race === 'undead' 
    ? 'invert(0.85) hue-rotate(180deg) saturate(0.7) brightness(0.9) contrast(1.2)' 
    : undefined;

  return (
    <canvas
      ref={canvasRef}
      width={maxWidth * scale}
      height={maxHeight * scale}
      className={`${className}`}
      style={{ 
        imageRendering: 'pixelated',
        width: maxWidth * scale,
        height: maxHeight * scale,
        filter: undeadFilter,
      }}
      data-testid={`hero-sprite-${race}-${animation}`}
    />
  );
}

interface HeroSpritePreviewProps {
  race: HeroRace;
  size?: 'sm' | 'md' | 'lg';
  showControls?: boolean;
}

export function HeroSpritePreview({ race, size = 'md', showControls = false }: HeroSpritePreviewProps) {
  const [currentAnimation, setCurrentAnimation] = useState<AnimationType>('walk');
  const [isPlaying, setIsPlaying] = useState(true);

  const scaleMap = { sm: 0.5, md: 1, lg: 1.5 };
  const scale = scaleMap[size];

  const animations: AnimationType[] = ['walk', 'attack', 'magic', 'death'];

  return (
    <div className="flex flex-col items-center gap-2">
      <HeroSpriteAnimator
        race={race}
        animation={currentAnimation}
        scale={scale}
        playing={isPlaying}
        onAnimationEnd={() => {
          if (currentAnimation === 'death') {
            setIsPlaying(false);
          }
        }}
      />
      
      {showControls && (
        <div className="flex flex-wrap gap-1 justify-center">
          {animations.map(anim => (
            <button
              key={anim}
              onClick={() => {
                setCurrentAnimation(anim);
                setIsPlaying(true);
              }}
              className={`px-2 py-1 text-xs rounded ${
                currentAnimation === anim
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              data-testid={`btn-animation-${anim}`}
            >
              {anim}
            </button>
          ))}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
            data-testid="btn-toggle-play"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>
      )}
    </div>
  );
}

export function HeroSpriteGallery() {
  const races: HeroRace[] = ['elf', 'orc', 'human', 'barbarian', 'dwarf', 'undead'];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-4">
      {races.map(race => (
        <div 
          key={race} 
          className="flex flex-col items-center gap-2 p-4 bg-gray-800/50 rounded-lg border border-gray-700"
        >
          <h3 className="text-lg font-semibold capitalize text-amber-400">{race}</h3>
          <HeroSpritePreview race={race} size="md" showControls />
        </div>
      ))}
    </div>
  );
}

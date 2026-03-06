import { useState, useEffect } from "react";

export type SlashVariant = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

interface SlashEffectProps {
  variant?: SlashVariant;
  scale?: number;
  rotation?: number;
  fps?: number;
  onComplete?: () => void;
}

const SLASH_FRAME_COUNTS: Record<SlashVariant, number> = {
  1: 10,
  2: 5,
  3: 10,
  4: 8,
  5: 8,
  6: 10,
  7: 10,
  8: 10,
  9: 8,
  10: 8,
};

export function SlashEffect({
  variant = 1,
  scale = 1,
  rotation = 0,
  fps = 16,
  onComplete
}: SlashEffectProps) {
  const [currentFrame, setCurrentFrame] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const frameCount = SLASH_FRAME_COUNTS[variant];

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        if (prev >= frameCount) {
          setIsPlaying(false);
          onComplete?.();
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / fps);
    
    return () => clearInterval(interval);
  }, [fps, frameCount, isPlaying, onComplete]);

  useEffect(() => {
    setCurrentFrame(1);
    setIsPlaying(true);
  }, [variant]);

  if (!isPlaying && currentFrame >= frameCount) return null;

  const size = 128 * scale;
  const framePath = `/sprites/effects/slash/${variant}/${currentFrame}.png`;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        transform: `rotate(${rotation}deg)`,
        pointerEvents: "none",
      }}
    >
      <img
        src={framePath}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          imageRendering: "auto",
        }}
      />
    </div>
  );
}

export default SlashEffect;

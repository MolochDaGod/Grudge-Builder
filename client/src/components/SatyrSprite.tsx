import { assetUrl } from "@/lib/assetConfig";
import { useState, useEffect } from "react";

export type SatyrVariant = "Satyr_1" | "Satyr_2" | "Satyr_3";
export type SatyrAction = "Idle" | "Walk" | "Attack" | "Hurt" | "Dead" | "Charge";

interface SatyrSpriteProps {
  variant?: SatyrVariant;
  action: SatyrAction;
  facingRight?: boolean;
  scale?: number;
  fps?: number;
}

const SATYR_FRAME_DATA: Record<SatyrAction, { frames: number; width: number; height: number }> = {
  Idle: { frames: 6, width: 128, height: 128 },
  Walk: { frames: 8, width: 128, height: 128 },
  Attack: { frames: 6, width: 128, height: 128 },
  Hurt: { frames: 4, width: 128, height: 128 },
  Dead: { frames: 6, width: 128, height: 128 },
  Charge: { frames: 6, width: 128, height: 128 },
};

export function SatyrSprite({
  variant = "Satyr_1",
  action,
  facingRight = true,
  scale = 1,
  fps = 8
}: SatyrSpriteProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const frameData = SATYR_FRAME_DATA[action];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % frameData.frames);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [action, fps, frameData.frames]);

  useEffect(() => {
    setCurrentFrame(0);
  }, [action]);

  const spritePath = assetUrl(`/sprites/rpg/satyr/${variant}/${action}.png`);
  const width = frameData.width * scale;
  const height = frameData.height * scale;

  return (
    <div
      style={{
        width,
        height,
        overflow: "hidden",
        transform: facingRight ? "scaleX(1)" : "scaleX(-1)",
        imageRendering: "pixelated",
      }}
    >
      <div
        style={{
          width: frameData.width * frameData.frames * scale,
          height,
          backgroundImage: `url(${spritePath})`,
          backgroundSize: `${frameData.width * frameData.frames * scale}px ${height}px`,
          backgroundRepeat: "no-repeat",
          transform: `translateX(-${currentFrame * width}px)`,
          transition: "none",
        }}
      />
    </div>
  );
}

export default SatyrSprite;

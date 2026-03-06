import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SheepSpriteProps {
  scale?: number;
  className?: string;
  onClick?: () => void;
}

const FRAME_WIDTH = 128;
const FRAME_HEIGHT = 128;
const FRAME_COUNT = 6;
const FPS = 6;

export default function SheepSprite({
  scale = 0.5,
  className,
  onClick,
}: SheepSpriteProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % FRAME_COUNT);
    }, 1000 / FPS);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const flipInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        setFlip(prev => !prev);
      }
    }, 3000);

    return () => clearInterval(flipInterval);
  }, []);

  const displayWidth = FRAME_WIDTH * scale;
  const displayHeight = FRAME_HEIGHT * scale;

  return (
    <div
      className={cn("cursor-pointer group relative", className)}
      onClick={onClick}
      style={{
        width: displayWidth,
        height: displayHeight,
      }}
    >
      <div
        style={{
          width: displayWidth,
          height: displayHeight,
          overflow: "hidden",
          position: "relative",
          transform: flip ? "scaleX(-1)" : "none",
        }}
        className="transition-transform group-hover:scale-110"
      >
        <img
          src="/sprites/animals/sheep-idle.png"
          alt="Sheep"
          draggable={false}
          style={{
            position: "absolute",
            left: -(frameIndex * displayWidth),
            top: 0,
            width: FRAME_COUNT * displayWidth,
            height: displayHeight,
            imageRendering: "pixelated",
            maxWidth: "none",
          }}
        />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-slate-900/95 text-amber-100 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-amber-600/50 z-20">
        Hunt
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SPELL_METADATA } from "../lib/spriteMetadata";
import { assetUrl } from "@/lib/assetConfig";

export type SpellType = "fire-ball" | "fire-arrow" | "fire-spell" | "water-ball" | "water-arrow" | "water-spell";

interface SpellAnimatorProps {
  spell: SpellType;
  scale?: number;
  rotation?: number;
  onComplete?: () => void;
  loop?: boolean;
}

export function SpellAnimator({ 
  spell, 
  scale = 1, 
  rotation = 0,
  onComplete,
  loop = true 
}: SpellAnimatorProps) {
  const [frame, setFrame] = useState(1);
  const meta = SPELL_METADATA[spell];
  const frameCount = meta?.frameCount || 8;
  const frameDuration = meta?.frameDuration || 80;
  const baseScale = meta?.scale || 1;
  const finalScale = scale * baseScale;
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(prev => {
        const next = prev + 1;
        if (next > frameCount) {
          if (!loop && onComplete) {
            onComplete();
          }
          return loop ? 1 : frameCount;
        }
        return next;
      });
    }, frameDuration);
    
    return () => clearInterval(interval);
  }, [frameCount, frameDuration, loop, onComplete]);
  
  const imagePath = assetUrl(`/sprites/spells/${spell}/frame_${frame}.png`);
  
  const glowColor = spell.startsWith("fire") 
    ? "0 0 15px rgba(255, 100, 0, 0.9), 0 0 30px rgba(255, 50, 0, 0.6), 0 0 45px rgba(255, 30, 0, 0.3)" 
    : "0 0 15px rgba(0, 150, 255, 0.9), 0 0 30px rgba(0, 100, 255, 0.6), 0 0 45px rgba(0, 50, 255, 0.3)";
  
  const displayWidth = (meta?.frameWidth || 100) * finalScale;
  const displayHeight = (meta?.frameHeight || 100) * finalScale;
  
  return (
    <motion.div
      className="pointer-events-none"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        transform: `rotate(${rotation}deg)`,
        filter: `drop-shadow(${glowColor})`,
        transformOrigin: "center center",
        width: displayWidth,
        height: displayHeight,
      }}
    >
      <img 
        src={imagePath} 
        alt={spell}
        style={{
          width: displayWidth,
          height: displayHeight,
          imageRendering: "auto",
        }}
      />
    </motion.div>
  );
}

export function SpellImpact({ 
  spell, 
  x, 
  y, 
  onComplete 
}: { 
  spell: SpellType; 
  x: number; 
  y: number; 
  onComplete: () => void;
}) {
  const impactSpell = spell.includes("arrow") 
    ? spell.replace("arrow", "spell") as SpellType
    : spell.includes("ball")
    ? spell.replace("ball", "spell") as SpellType
    : spell;
  
  const meta = SPELL_METADATA[impactSpell];
  const displayWidth = (meta?.frameWidth || 100) * (meta?.scale || 0.6);
  const displayHeight = (meta?.frameHeight || 100) * (meta?.scale || 0.6);
  
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ 
        left: Math.round(x - displayWidth / 2), 
        top: Math.round(y - displayHeight / 2) 
      }}
      initial={{ scale: 0.5, opacity: 1 }}
      animate={{ scale: 1.5, opacity: 0 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={onComplete}
    >
      <SpellAnimator spell={impactSpell} scale={1} loop={false} />
    </motion.div>
  );
}

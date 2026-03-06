import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HarvestPopupProps {
  x: number;
  y: number;
  resourceName: string;
  icon: string;
  xpGained: number;
  quantity: number;
  rarity: string;
  onComplete: () => void;
}

const RARITY_COLORS = {
  common: { main: '#94a3b8', glow: '#64748b' },
  rare: { main: '#3b82f6', glow: '#2563eb' },
  epic: { main: '#a855f7', glow: '#7c3aed' },
  legendary: { main: '#f59e0b', glow: '#d97706' },
};

export function HarvestPopup({
  x,
  y,
  resourceName,
  icon,
  xpGained,
  quantity,
  rarity,
  onComplete,
}: HarvestPopupProps) {
  const [particles, setParticles] = useState<Array<{ id: number; angle: number; speed: number; size: number }>>([]);
  const colors = RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] || RARITY_COLORS.common;
  
  useEffect(() => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      angle: (i / 8) * Math.PI * 2,
      speed: 30 + Math.random() * 20,
      size: 3 + Math.random() * 4,
    }));
    setParticles(newParticles);
    
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      className="absolute pointer-events-none z-50"
      style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}
    >
      <div className="relative">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ 
              x: 0, 
              y: 0, 
              opacity: 1,
              scale: 1,
            }}
            animate={{ 
              x: Math.cos(p.angle) * p.speed,
              y: Math.sin(p.angle) * p.speed - 20,
              opacity: 0,
              scale: 0.5,
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute"
            style={{
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: colors.main,
              boxShadow: `0 0 ${p.size * 2}px ${colors.glow}`,
              left: '50%',
              top: '50%',
            }}
          />
        ))}
        
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: -40 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.3 }}
            className="text-3xl"
            style={{
              filter: `drop-shadow(0 0 8px ${colors.glow})`,
            }}
          >
            {icon}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-1 px-2 py-1 rounded-lg text-sm font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${colors.main}dd, ${colors.glow}dd)`,
              boxShadow: `0 0 12px ${colors.glow}80`,
            }}
          >
            +{quantity} {resourceName}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xs text-amber-400 font-bold mt-1"
            style={{ textShadow: '0 0 4px rgba(251, 191, 36, 0.5)' }}
          >
            +{xpGained} XP
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

interface SleepingZZZProps {
  x: number;
  y: number;
}

export function SleepingZZZ({ x, y }: SleepingZZZProps) {
  const [zees, setZees] = useState<Array<{ id: number; delay: number; offsetX: number }>>([]);
  
  useEffect(() => {
    const newZees = Array.from({ length: 3 }, (_, i) => ({
      id: i,
      delay: i * 0.8,
      offsetX: (i - 1) * 8,
    }));
    setZees(newZees);
  }, []);
  
  return (
    <div 
      className="absolute pointer-events-none z-40"
      style={{ left: x, top: y }}
    >
      {zees.map((z) => (
        <motion.div
          key={z.id}
          initial={{ opacity: 0, y: 0, x: z.offsetX, scale: 0.5 }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            y: [-10, -30, -50, -70],
            x: [z.offsetX, z.offsetX + 5, z.offsetX + 10, z.offsetX + 15],
            scale: [0.5, 1, 1.2, 0.8],
            rotate: [0, -10, 10, -5],
          }}
          transition={{
            duration: 2.5,
            delay: z.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
          className="absolute text-indigo-400 font-bold text-lg"
          style={{
            textShadow: '0 0 8px rgba(99, 102, 241, 0.8)',
          }}
        >
          Z
        </motion.div>
      ))}
    </div>
  );
}

interface HarvestPopupManagerProps {
  popups: Array<{
    id: string;
    x: number;
    y: number;
    resourceName: string;
    icon: string;
    xpGained: number;
    quantity: number;
    rarity: string;
  }>;
  onRemovePopup: (id: string) => void;
}

export function HarvestPopupManager({ popups, onRemovePopup }: HarvestPopupManagerProps) {
  return (
    <AnimatePresence>
      {popups.map((popup) => (
        <HarvestPopup
          key={popup.id}
          {...popup}
          onComplete={() => onRemovePopup(popup.id)}
        />
      ))}
    </AnimatePresence>
  );
}

export default HarvestPopup;

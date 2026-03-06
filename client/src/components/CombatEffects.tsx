import { motion, AnimatePresence } from "framer-motion";
import { Flame, Snowflake, Zap, Skull, Shield, Swords } from "lucide-react";

export type EffectType = "slash" | "fire" | "ice" | "electric" | "poison" | "defense" | "crit" | "heal" | "stun";

interface CombatEffectProps {
  type: EffectType;
  position: { x: number; y: number };
  onComplete?: () => void;
}

const EFFECT_CONFIG: Record<EffectType, { 
  color: string; 
  icon?: React.ComponentType<any>;
  particles: number;
  duration: number;
}> = {
  slash: { color: "#ff6b6b", particles: 5, duration: 0.5 },
  fire: { color: "#ff9500", icon: Flame, particles: 8, duration: 0.8 },
  ice: { color: "#00d4ff", icon: Snowflake, particles: 6, duration: 0.7 },
  electric: { color: "#ffff00", icon: Zap, particles: 10, duration: 0.4 },
  poison: { color: "#00ff88", icon: Skull, particles: 5, duration: 1.0 },
  defense: { color: "#4488ff", icon: Shield, particles: 4, duration: 0.6 },
  crit: { color: "#ff0000", particles: 12, duration: 0.6 },
  heal: { color: "#00ff00", particles: 6, duration: 0.8 },
  stun: { color: "#ffff88", particles: 3, duration: 0.5 },
};

export function SlashEffect({ onComplete }: { onComplete?: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: "30%",
            top: "20%",
            width: "100px",
            height: "4px",
            background: "linear-gradient(90deg, transparent, #fff, #ff6b6b, transparent)",
            borderRadius: "2px",
            transformOrigin: "left center",
            boxShadow: "0 0 20px #ff6b6b, 0 0 40px #ff4444",
          }}
          initial={{ 
            opacity: 0, 
            rotate: 30 + i * 20,
            scaleX: 0,
            x: -50
          }}
          animate={{ 
            opacity: [0, 1, 1, 0], 
            rotate: 30 + i * 20,
            scaleX: [0, 1.5, 2, 2.5],
            x: [0, 100, 200, 300]
          }}
          transition={{ 
            duration: 0.4, 
            delay: i * 0.08,
            ease: "easeOut"
          }}
        />
      ))}
    </motion.div>
  );
}

export function FireEffect({ onComplete }: { onComplete?: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${40 + (Math.random() - 0.5) * 40}%`,
            top: `${50 + (Math.random() - 0.5) * 30}%`,
          }}
          initial={{ opacity: 0, scale: 0, y: 0 }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1.5, 2, 0],
            y: [-20, -60, -100, -140],
            x: [(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 80]
          }}
          transition={{ 
            duration: 0.8,
            delay: i * 0.05,
            ease: "easeOut"
          }}
        >
          <Flame 
            className="w-8 h-8" 
            style={{ 
              color: i % 2 === 0 ? "#ff9500" : "#ff5500",
              filter: "drop-shadow(0 0 10px #ff5500)"
            }} 
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function IceEffect({ onComplete }: { onComplete?: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${40 + Math.cos(i * 0.8) * 20}%`,
            top: `${45 + Math.sin(i * 0.8) * 15}%`,
          }}
          initial={{ opacity: 0, scale: 0, rotate: 0 }}
          animate={{ 
            opacity: [0, 1, 1, 0.5, 0],
            scale: [0.3, 1.2, 1, 0.8, 0],
            rotate: [0, 180, 360],
          }}
          transition={{ 
            duration: 0.7,
            delay: i * 0.06,
          }}
        >
          <Snowflake 
            className="w-6 h-6" 
            style={{ 
              color: "#00d4ff",
              filter: "drop-shadow(0 0 8px #00d4ff)"
            }} 
          />
        </motion.div>
      ))}
      <motion.div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 60% 50%, rgba(0,212,255,0.3) 0%, transparent 50%)",
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.5, 2] }}
        transition={{ duration: 0.6 }}
      />
    </motion.div>
  );
}

export function ElectricEffect({ onComplete }: { onComplete?: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${30 + i * 8}%`,
            top: "30%",
            width: "3px",
            height: "80px",
            background: "linear-gradient(180deg, #ffff00, #fff, #ffff00)",
            borderRadius: "2px",
            boxShadow: "0 0 15px #ffff00, 0 0 30px #ffaa00",
          }}
          initial={{ opacity: 0, scaleY: 0, rotate: (Math.random() - 0.5) * 30 }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            scaleY: [0, 1, 1.2, 0],
            rotate: [(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 60],
          }}
          transition={{ 
            duration: 0.15,
            delay: i * 0.03,
            repeat: 3,
            repeatType: "reverse"
          }}
        />
      ))}
      <motion.div
        className="absolute"
        style={{ left: "55%", top: "40%" }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 0] }}
        transition={{ duration: 0.4, repeat: 2 }}
      >
        <Zap className="w-16 h-16 text-yellow-400" style={{ filter: "drop-shadow(0 0 20px #ffff00)" }} />
      </motion.div>
    </motion.div>
  );
}

export function CritEffect({ onComplete }: { onComplete?: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      onAnimationComplete={onComplete}
    >
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 2, 2.5, 3] }}
        transition={{ duration: 0.6 }}
      >
        <div 
          className="text-6xl font-black text-red-500"
          style={{ 
            textShadow: "0 0 20px #ff0000, 0 0 40px #ff0000",
            WebkitTextStroke: "2px #fff"
          }}
        >
          CRITICAL!
        </div>
      </motion.div>
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2"
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#ff0000",
            boxShadow: "0 0 10px #ff0000",
          }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ 
            x: Math.cos(i * (Math.PI * 2 / 12)) * 150,
            y: Math.sin(i * (Math.PI * 2 / 12)) * 150,
            opacity: 0,
            scale: [1, 0.5, 0]
          }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
      ))}
    </motion.div>
  );
}

export function DamageNumber({ damage, isCrit, position }: { damage: number; isCrit?: boolean; position: { x: number; y: number } }) {
  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      style={{ left: position.x, top: position.y }}
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        y: [-20, -60, -80, -100],
        scale: isCrit ? [0.5, 1.5, 1.3, 1] : [0.5, 1.2, 1.1, 1]
      }}
      transition={{ duration: 0.8 }}
    >
      <span 
        className={`text-2xl font-black ${isCrit ? "text-red-500" : "text-white"}`}
        style={{ 
          textShadow: isCrit 
            ? "0 0 10px #ff0000, 2px 2px 0 #000" 
            : "2px 2px 0 #000",
        }}
      >
        {isCrit && "★"}{damage}
      </span>
    </motion.div>
  );
}

export function DeathSlowMo({ children, isActive }: { children: React.ReactNode; isActive: boolean }) {
  return (
    <motion.div
      animate={isActive ? {
        filter: ["grayscale(0)", "grayscale(0.5)", "grayscale(0.8)"],
      } : {}}
      transition={{ duration: 2 }}
      style={{ 
        transformOrigin: "center",
      }}
    >
      {isActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0.5, 0.7] }}
          transition={{ duration: 2 }}
          style={{
            background: "radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.8) 100%)",
          }}
        />
      )}
      <motion.div
        animate={isActive ? { scale: [1, 1.05, 1.1] } : {}}
        transition={{ duration: 2 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function VictoryEffect() {
  return (
    <motion.div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${Math.random() * 100}%`,
            top: "100%",
            width: "4px",
            height: "20px",
            background: `linear-gradient(180deg, ${['#ffd700', '#ff9500', '#fff'][i % 3]}, transparent)`,
            borderRadius: "2px",
          }}
          animate={{
            y: [0, -window.innerHeight - 100],
            opacity: [0, 1, 1, 0],
            rotate: [0, (Math.random() - 0.5) * 360],
          }}
          transition={{
            duration: 2 + Math.random(),
            delay: Math.random() * 0.5,
            repeat: Infinity,
            repeatDelay: Math.random() * 2,
          }}
        />
      ))}
    </motion.div>
  );
}

export function PoisonEffect({ onComplete }: { onComplete?: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${40 + (Math.random() - 0.5) * 30}%`,
            top: `${60 + (Math.random() - 0.5) * 20}%`,
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "radial-gradient(circle, #00ff88 0%, #008844 50%, transparent 100%)",
            boxShadow: "0 0 15px #00ff88",
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 0.8, 0.6, 0],
            scale: [0.5, 1.5, 2, 2.5],
            y: [-10, -40, -70, -100],
          }}
          transition={{ 
            duration: 1.2,
            delay: i * 0.08,
          }}
        />
      ))}
      <motion.div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 60% 50%, rgba(0,255,136,0.2) 0%, transparent 40%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 1.0 }}
      />
    </motion.div>
  );
}

export function HolyEffect({ onComplete }: { onComplete?: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      <motion.div
        className="absolute"
        style={{
          left: "50%",
          top: "30%",
          width: "100px",
          height: "200px",
          background: "linear-gradient(180deg, #fff 0%, #ffdd00 30%, transparent 100%)",
          transform: "translateX(-50%)",
          filter: "blur(5px)",
        }}
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: [0, 1, 1, 0], scaleY: [0, 1, 1.2, 0] }}
        transition={{ duration: 0.8 }}
      />
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${50 + Math.cos(i * Math.PI / 4) * 20}%`,
            top: `${40 + Math.sin(i * Math.PI / 4) * 15}%`,
            width: "4px",
            height: "30px",
            background: "linear-gradient(180deg, #fff, #ffdd00)",
            borderRadius: "2px",
            transformOrigin: "center bottom",
            rotate: `${i * 45}deg`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            scale: [0, 1.5, 1.2, 0],
          }}
          transition={{ 
            duration: 0.6,
            delay: i * 0.05,
          }}
        />
      ))}
    </motion.div>
  );
}

export function ShadowEffect({ onComplete }: { onComplete?: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${40 + (Math.random() - 0.5) * 40}%`,
            top: `${50 + (Math.random() - 0.5) * 30}%`,
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "radial-gradient(circle, #6600cc 0%, #220044 50%, transparent 100%)",
            boxShadow: "0 0 20px #6600cc",
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 0.8, 0],
            scale: [0.5, 1.8, 2.5, 3],
          }}
          transition={{ 
            duration: 0.8,
            delay: i * 0.06,
          }}
        />
      ))}
      <motion.div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 55% 45%, rgba(102,0,204,0.4) 0%, transparent 50%)",
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.3, 1.5] }}
        transition={{ duration: 0.7 }}
      />
    </motion.div>
  );
}

export function NatureEffect({ onComplete }: { onComplete?: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl"
          style={{
            left: `${30 + Math.random() * 40}%`,
            top: `${70 + Math.random() * 20}%`,
          }}
          initial={{ opacity: 0, y: 0, rotate: 0 }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            y: [0, -80, -120, -160],
            rotate: [0, (Math.random() - 0.5) * 90],
            x: [(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 60]
          }}
          transition={{ 
            duration: 1.0,
            delay: i * 0.06,
          }}
        >
          🍃
        </motion.div>
      ))}
      <motion.div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 60%, rgba(34,204,34,0.3) 0%, transparent 50%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 0.8 }}
      />
    </motion.div>
  );
}

export function ArcaneEffect({ onComplete }: { onComplete?: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: "50%",
            top: "45%",
            width: "4px",
            height: "40px",
            background: "linear-gradient(180deg, #ff44ff, #aa44ff, transparent)",
            transformOrigin: "center center",
            rotate: `${i * 60}deg`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            scale: [0, 1.5, 2, 2.5],
          }}
          transition={{ 
            duration: 0.5,
            delay: i * 0.05,
          }}
        />
      ))}
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute"
          style={{
            left: "50%",
            top: "45%",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: i % 2 === 0 ? "#aa44ff" : "#ff44ff",
            boxShadow: `0 0 10px ${i % 2 === 0 ? "#aa44ff" : "#ff44ff"}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ 
            x: Math.cos(i * (Math.PI * 2 / 10)) * 100,
            y: Math.sin(i * (Math.PI * 2 / 10)) * 80,
            opacity: [1, 0.8, 0],
            scale: [1, 0.5, 0]
          }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
      ))}
    </motion.div>
  );
}

export function BloodEffect({ onComplete }: { onComplete?: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${45 + (Math.random() - 0.5) * 20}%`,
            top: `${40 + (Math.random() - 0.5) * 20}%`,
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#cc0000",
            boxShadow: "0 0 8px #cc0000",
          }}
          initial={{ opacity: 0, scale: 1 }}
          animate={{ 
            opacity: [0, 1, 0.8, 0],
            scale: [1, 0.8, 0.5, 0],
            y: [0, 40, 80, 120],
            x: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 40]
          }}
          transition={{ 
            duration: 0.8,
            delay: i * 0.04,
          }}
        />
      ))}
      <motion.div
        className="absolute"
        style={{
          left: "55%",
          top: "40%",
          width: "30px",
          height: "3px",
          background: "linear-gradient(90deg, transparent, #cc0000, #880000, transparent)",
          transformOrigin: "left center",
        }}
        initial={{ scaleX: 0, rotate: 30 }}
        animate={{ scaleX: [0, 1.5, 2], opacity: [0, 1, 0], rotate: 30 }}
        transition={{ duration: 0.4 }}
      />
    </motion.div>
  );
}

export function HealEffect({ onComplete }: { onComplete?: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-xl"
          style={{
            left: `${35 + Math.random() * 30}%`,
            top: `${60 + Math.random() * 20}%`,
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            y: [0, -40, -70, -100],
          }}
          transition={{ 
            duration: 0.8,
            delay: i * 0.08,
          }}
        >
          ✨
        </motion.div>
      ))}
      <motion.div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(0,255,0,0.3) 0%, transparent 50%)",
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.5, 2] }}
        transition={{ duration: 0.8 }}
      />
    </motion.div>
  );
}

export function StunEffect({ onComplete }: { onComplete?: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl"
          style={{
            left: `${40 + i * 5}%`,
            top: "30%",
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            y: [-10, -30, -20, -40],
            rotate: [0, 20, -20, 0],
          }}
          transition={{ 
            duration: 0.6,
            delay: i * 0.1,
            repeat: 2,
          }}
        >
          ⭐
        </motion.div>
      ))}
    </motion.div>
  );
}


import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RACE_PORTRAITS } from '@/lib/artAssets';

interface PlayerStatusBarsProps {
  race: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  playerName?: string;
  level?: number;
  avatarUrl?: string | null;
}

export default function PlayerStatusBars({
  race,
  health,
  maxHealth,
  mana,
  maxMana,
  stamina,
  maxStamina,
  playerName = 'Hero',
  level = 1,
  avatarUrl,
}: PlayerStatusBarsProps) {
  const [animatedHealth, setAnimatedHealth] = useState(health);
  const [animatedMana, setAnimatedMana] = useState(mana);
  const [animatedStamina, setAnimatedStamina] = useState(stamina);
  const [isLowHealth, setIsLowHealth] = useState(false);

  const portrait = avatarUrl || RACE_PORTRAITS[race.toLowerCase()] || RACE_PORTRAITS.human;

  useEffect(() => {
    const healthPercent = health / maxHealth;
    setIsLowHealth(healthPercent < 0.25);
    
    const animateValue = (
      current: number,
      target: number,
      setter: (val: number) => void
    ) => {
      const diff = target - current;
      if (Math.abs(diff) < 1) {
        setter(target);
        return;
      }
      const step = diff * 0.1;
      setter(current + step);
    };

    const interval = setInterval(() => {
      animateValue(animatedHealth, health, setAnimatedHealth);
      animateValue(animatedMana, mana, setAnimatedMana);
      animateValue(animatedStamina, stamina, setAnimatedStamina);
    }, 16);

    return () => clearInterval(interval);
  }, [health, mana, stamina, animatedHealth, animatedMana, animatedStamina, maxHealth]);

  const healthPercent = (animatedHealth / maxHealth) * 100;
  const manaPercent = (animatedMana / maxMana) * 100;
  const staminaPercent = (animatedStamina / maxStamina) * 100;

  return (
    <div className="relative flex items-center gap-0" data-testid="player-status-bars">
      <motion.div
        className="relative z-20 shrink-0"
        animate={isLowHealth ? { scale: [1, 1.05, 1] } : {}}
        transition={{ repeat: Infinity, duration: 0.5 }}
      >
        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-amber-900 shadow-lg shadow-black/50 bg-black">
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            }}
          />
          <img 
            src={portrait} 
            alt={race}
            className="w-full h-full object-cover"
            data-testid="portrait-image"
          />
        </div>
        
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-800 to-amber-600 text-white text-xs font-bold px-2 py-0.5 rounded-full border border-amber-500 shadow-md">
          {level}
        </div>
      </motion.div>

      <div className="relative -ml-4 z-10">
        <svg width="0" height="0">
          <defs>
            <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <linearGradient id="manaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="staminaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ca8a04" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>
            <linearGradient id="barBg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1c1917" />
              <stop offset="100%" stopColor="#292524" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        </svg>

        <div className="flex flex-col gap-1 pl-6">
          <div className="relative h-6 w-48 overflow-hidden" style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0 100%)' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-stone-900 to-stone-800 border border-stone-700 rounded-sm" />
            <motion.div 
              className="absolute inset-y-0 left-0 rounded-sm"
              style={{ 
                width: `${healthPercent}%`,
                background: 'linear-gradient(180deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
                boxShadow: isLowHealth ? '0 0 10px #ef4444' : 'none',
              }}
              initial={false}
              animate={{ width: `${healthPercent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {Math.floor(animatedHealth)} / {maxHealth}
              </span>
            </div>
            <div className="absolute top-0 right-2 h-full flex items-center">
              <span className="text-[10px] text-red-300 font-bold">HP</span>
            </div>
          </div>

          <div className="relative h-5 w-44 overflow-hidden" style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0 100%)' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-stone-900 to-stone-800 border border-stone-700 rounded-sm" />
            <motion.div 
              className="absolute inset-y-0 left-0 rounded-sm"
              style={{ 
                width: `${manaPercent}%`,
                background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
              }}
              initial={false}
              animate={{ width: `${manaPercent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {Math.floor(animatedMana)} / {maxMana}
              </span>
            </div>
            <div className="absolute top-0 right-2 h-full flex items-center">
              <span className="text-[10px] text-blue-300 font-bold">MP</span>
            </div>
          </div>

          <div className="relative h-4 w-40 overflow-hidden" style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0 100%)' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-stone-900 to-stone-800 border border-stone-700 rounded-sm" />
            <motion.div 
              className="absolute inset-y-0 left-0 rounded-sm"
              style={{ 
                width: `${staminaPercent}%`,
                background: 'linear-gradient(180deg, #eab308 0%, #ca8a04 50%, #a16207 100%)',
              }}
              initial={false}
              animate={{ width: `${staminaPercent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {Math.floor(animatedStamina)} / {maxStamina}
              </span>
            </div>
            <div className="absolute top-0 right-2 h-full flex items-center">
              <span className="text-[8px] text-yellow-300 font-bold">SP</span>
            </div>
          </div>
        </div>

        <div className="absolute -top-5 left-6 text-sm font-bold text-amber-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {playerName}
        </div>
      </div>
    </div>
  );
}

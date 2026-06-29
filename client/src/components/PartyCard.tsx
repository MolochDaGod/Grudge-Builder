import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Zap, Shield, User } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Character } from '@shared/schema';
import { RACE_PORTRAITS } from '@/lib/artAssets';

interface PartyCardProps {
  character: Character;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina?: number;
  maxStamina?: number;
  isActive?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export default function PartyCard({
  character,
  hp,
  maxHp,
  mana,
  maxMana,
  stamina = 50,
  maxStamina = 100,
  isActive = false,
  onClick,
  compact = false,
}: PartyCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const portrait = character.avatarUrl || RACE_PORTRAITS[character.raceId.toLowerCase()] || RACE_PORTRAITS.human;
  const healthPercent = (hp / maxHp) * 100;
  const manaPercent = (mana / maxMana) * 100;
  const staminaPercent = (stamina / maxStamina) * 100;
  const isLowHealth = healthPercent < 25;

  return (
    <motion.div
      className={cn(
        "relative rounded-lg border bg-gradient-to-b from-slate-800/90 to-slate-900/95 overflow-hidden transition-all cursor-pointer",
        isActive 
          ? "border-amber-500 shadow-lg shadow-amber-500/20" 
          : "border-slate-700 hover:border-slate-600",
        compact ? "w-28" : "w-36"
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      data-testid={`party-card-${character.id}`}
    >
      <div className="relative">
        <div className={cn(
          "w-full bg-gradient-to-b from-slate-700 to-slate-800 flex items-center justify-center overflow-hidden",
          compact ? "h-24" : "h-32"
        )}>
          <img 
            src={portrait} 
            alt={character.name}
            className="w-full h-full object-cover"
            data-testid={`avatar-${character.id}`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              if (target.nextElementSibling) {
                (target.nextElementSibling as HTMLElement).style.display = 'flex';
              }
            }}
          />
          <div className="hidden w-full h-full items-center justify-center absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-800">
            <User className="w-12 h-12 text-slate-600" />
          </div>
        </div>
        
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/80 to-transparent" />
        
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-800 to-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500 shadow-md">
          Lv {character.level}
        </div>
        
        {isLowHealth && (
          <motion.div
            className="absolute inset-0 border-2 border-red-500 rounded-t-lg pointer-events-none"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}
      </div>
      
      <div className="px-2 py-2">
        <div className="text-center mb-2">
          <div className={cn(
            "font-bold text-slate-200 truncate",
            compact ? "text-xs" : "text-sm"
          )}>
            {character.name}
          </div>
          <div className="text-[10px] text-slate-400 capitalize truncate">
            {character.raceId}
          </div>
        </div>
        
        <div className="space-y-1.5">
          <div className="relative">
            <div className="flex justify-between text-[9px] mb-0.5">
              <span className="text-red-400 flex items-center gap-0.5">
                <Heart className="w-2.5 h-2.5" /> HP
              </span>
              <span className="text-slate-400">{Math.floor(hp)}/{maxHp}</span>
            </div>
            <div className="relative h-2.5 bg-slate-800 rounded-sm overflow-hidden border border-slate-700">
              <motion.div 
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{ 
                  background: isLowHealth 
                    ? 'linear-gradient(180deg, #f87171 0%, #dc2626 100%)' 
                    : 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
                  boxShadow: isLowHealth ? '0 0 6px rgba(239,68,68,0.5)' : 'none',
                }}
                initial={false}
                animate={{ width: `${healthPercent}%` }}
                transition={{ duration: 0.3 }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            </div>
          </div>
          
          <div className="relative">
            <div className="flex justify-between text-[9px] mb-0.5">
              <span className="text-blue-400 flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5" /> MP
              </span>
              <span className="text-slate-400">{Math.floor(mana)}/{maxMana}</span>
            </div>
            <div className="relative h-2 bg-slate-800 rounded-sm overflow-hidden border border-slate-700">
              <motion.div 
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{ background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)' }}
                initial={false}
                animate={{ width: `${manaPercent}%` }}
                transition={{ duration: 0.3 }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            </div>
          </div>
          
          <div className="relative">
            <div className="flex justify-between text-[9px] mb-0.5">
              <span className="text-yellow-400 flex items-center gap-0.5">
                <Shield className="w-2.5 h-2.5" /> SP
              </span>
              <span className="text-slate-400">{Math.floor(stamina)}/{maxStamina}</span>
            </div>
            <div className="relative h-1.5 bg-slate-800 rounded-sm overflow-hidden border border-slate-700">
              <motion.div 
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{ background: 'linear-gradient(180deg, #eab308 0%, #a16207 100%)' }}
                initial={false}
                animate={{ width: `${staminaPercent}%` }}
                transition={{ duration: 0.3 }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
      
      {isActive && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      )}
    </motion.div>
  );
}

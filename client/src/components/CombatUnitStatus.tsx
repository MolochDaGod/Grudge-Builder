import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StatusEffectIcons } from '@/components/StatusEffectIcons';
import type { ActiveStatusInstance } from '@shared/definitions/statusEffects';

interface CombatUnitStatusProps {
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  sp?: number;
  maxSp?: number;
  level?: number;
  avatarUrl?: string;
  isActive?: boolean;
  isDead?: boolean;
  compact?: boolean;
  showAvatar?: boolean;
  className?: string;
  /** Active buffs/debuffs — icons render above the unit frame */
  statusEffects?: ActiveStatusInstance[];
}

export function CombatUnitStatus({
  name,
  hp,
  maxHp,
  mp,
  maxMp,
  sp,
  maxSp,
  level,
  avatarUrl,
  isActive = false,
  isDead = false,
  compact = false,
  showAvatar = true,
  className,
  statusEffects = [],
}: CombatUnitStatusProps) {
  const hpPercent = Math.max(0, (hp / maxHp) * 100);
  const mpPercent = Math.max(0, (mp / maxMp) * 100);
  const spPercent = sp && maxSp ? Math.max(0, (sp / maxSp) * 100) : 0;
  const isLowHp = hpPercent < 25;

  if (compact) {
    return (
      <div 
        className={cn(
          "relative bg-gradient-to-b from-slate-900/95 to-black/95 border border-slate-700 rounded-lg p-2",
          isActive && "border-amber-500/50 shadow-lg shadow-amber-500/20",
          isDead && "opacity-50 grayscale",
          className
        )}
        data-testid={`combat-status-${name.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {statusEffects.length > 0 && (
          <div className="absolute -top-3 left-1 right-1 flex justify-center z-10">
            <StatusEffectIcons effects={statusEffects} size="xs" maxVisible={6} />
          </div>
        )}
        <div className="flex items-center gap-2">
          {showAvatar && (
            <div className="relative shrink-0">
              <div className={cn(
                "w-10 h-10 rounded border-2 overflow-hidden bg-black",
                isActive ? "border-amber-500" : "border-slate-600"
              )}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-amber-400 font-bold">
                    {name[0]}
                  </div>
                )}
              </div>
              {level && (
                <div className="absolute -bottom-1 -right-1 bg-slate-800 text-[8px] text-amber-400 font-bold px-1 rounded border border-slate-600">
                  {level}
                </div>
              )}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate mb-1">{name}</div>
            <div className="space-y-0.5">
              <StatusBar value={hp} max={maxHp} color="red" label="HP" isLow={isLowHp} size="sm" />
              <StatusBar value={mp} max={maxMp} color="blue" label="MP" size="xs" />
              {sp !== undefined && maxSp && (
                <StatusBar value={sp} max={maxSp} color="yellow" label="SP" size="xs" />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative bg-gradient-to-b from-slate-900/95 to-black/95 border-2 rounded-lg p-3",
        isActive ? "border-amber-500 shadow-lg shadow-amber-500/30" : "border-slate-700",
        isDead && "opacity-50 grayscale",
        className
      )}
      data-testid={`combat-status-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {statusEffects.length > 0 && (
        <div className="absolute -top-4 left-2 right-2 flex justify-center z-10">
          <StatusEffectIcons effects={statusEffects} size="sm" maxVisible={8} />
        </div>
      )}
      <div className="flex items-start gap-3">
        {showAvatar && (
          <motion.div 
            className="relative shrink-0"
            animate={isLowHp && !isDead ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            <div className={cn(
              "w-14 h-14 rounded-lg border-2 overflow-hidden bg-black shadow-lg",
              isActive ? "border-amber-500" : "border-slate-600"
            )}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-amber-400 font-bold text-xl">
                  {name[0]}
                </div>
              )}
            </div>
            {level && (
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-700 to-amber-600 text-[10px] text-white font-bold px-1.5 py-0.5 rounded-full border border-amber-500">
                {level}
              </div>
            )}
          </motion.div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-amber-400 truncate">{name}</span>
            {isActive && (
              <span className="text-[10px] text-emerald-400 font-bold uppercase animate-pulse">Active</span>
            )}
          </div>
          
          <div className="space-y-1">
            <StatusBar value={hp} max={maxHp} color="red" label="HP" isLow={isLowHp} />
            <StatusBar value={mp} max={maxMp} color="blue" label="MP" />
            {sp !== undefined && maxSp && (
              <StatusBar value={sp} max={maxSp} color="yellow" label="SP" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatusBarProps {
  value: number;
  max: number;
  color: 'red' | 'blue' | 'yellow' | 'green';
  label: string;
  isLow?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

function StatusBar({ value, max, color, label, isLow = false, size = 'md' }: StatusBarProps) {
  const percent = Math.max(0, (value / max) * 100);
  
  const colorStyles = {
    red: {
      bar: 'from-red-600 via-red-500 to-red-700',
      glow: isLow ? 'shadow-red-500/50' : '',
      text: 'text-red-300',
    },
    blue: {
      bar: 'from-blue-600 via-blue-500 to-blue-700',
      glow: '',
      text: 'text-blue-300',
    },
    yellow: {
      bar: 'from-yellow-600 via-yellow-500 to-yellow-700',
      glow: '',
      text: 'text-yellow-300',
    },
    green: {
      bar: 'from-emerald-600 via-emerald-500 to-emerald-700',
      glow: '',
      text: 'text-emerald-300',
    },
  };

  const sizeStyles = {
    xs: { height: 'h-3', text: 'text-[8px]', labelText: 'text-[7px]' },
    sm: { height: 'h-4', text: 'text-[9px]', labelText: 'text-[8px]' },
    md: { height: 'h-5', text: 'text-[10px]', labelText: 'text-[9px]' },
  };

  const style = colorStyles[color];
  const sizeStyle = sizeStyles[size];

  return (
    <div className="relative">
      <div 
        className={cn(
          "relative overflow-hidden rounded-sm bg-slate-800/80 border border-slate-700",
          sizeStyle.height,
          isLow && `shadow-lg ${style.glow}`
        )}
        style={{ clipPath: 'polygon(0 0, 100% 0, 97% 100%, 0 100%)' }}
      >
        <motion.div 
          className={cn("absolute inset-y-0 left-0 bg-gradient-to-r", style.bar)}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20 pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-between px-1.5">
          <span className={cn("font-bold text-white drop-shadow-md", sizeStyle.text)}>
            {Math.floor(value)} / {max}
          </span>
          <span className={cn("font-bold", style.text, sizeStyle.labelText)}>
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

export function FF7CombatFooter({
  heroes,
  activeIndex,
  abilities,
  onAbilitySelect,
  combatLog,
  disabled = false,
}: {
  heroes: Array<{
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    avatarUrl?: string | null;
    level?: number;
  }>;
  activeIndex: number;
  abilities: Array<{
    name: string;
    icon: React.ReactNode;
    damage: number;
    mana: number;
    type: 'attack' | 'skill' | 'cast';
  }>;
  onAbilitySelect: (index: number) => void;
  combatLog: string[];
  disabled?: boolean;
}) {
  const activeHero = heroes[activeIndex];

  return (
    <div className="bg-gradient-to-t from-black via-slate-900/98 to-slate-900/95 border-t-2 border-slate-600" data-testid="ff7-combat-footer">
      <div className="flex">
        <div className="flex-1 flex gap-1 p-2 border-r border-slate-700">
          {heroes.map((hero, idx) => (
            <CombatUnitStatus
              key={hero.id}
              name={hero.name}
              hp={hero.hp}
              maxHp={hero.maxHp}
              mp={hero.mana}
              maxMp={hero.maxMana}
              level={hero.level}
              avatarUrl={hero.avatarUrl || undefined}
              isActive={idx === activeIndex}
              isDead={hero.hp <= 0}
              compact
              className="flex-1 min-w-[140px]"
            />
          ))}
        </div>

        <div className="w-72 p-2 flex flex-col gap-1">
          <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Commands</div>
          <div className="grid grid-cols-1 gap-1">
            {abilities.map((ability, i) => (
              <button
                key={i}
                onClick={() => onAbilitySelect(i)}
                disabled={disabled || (activeHero && activeHero.mana < ability.mana)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded text-left transition-all text-sm font-medium",
                  "border border-slate-600 hover:border-slate-500",
                  disabled ? "opacity-50 cursor-not-allowed bg-slate-800" :
                  ability.type === "attack" ? "bg-gradient-to-r from-amber-900/80 to-amber-800/60 hover:from-amber-800 text-amber-100" :
                  ability.type === "skill" ? "bg-gradient-to-r from-blue-900/80 to-blue-800/60 hover:from-blue-800 text-blue-100" :
                  "bg-gradient-to-r from-purple-900/80 to-purple-800/60 hover:from-purple-800 text-purple-100"
                )}
                data-testid={`cmd-${ability.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {ability.icon}
                <span className="flex-1">{ability.name}</span>
                {ability.mana > 0 && (
                  <span className="text-xs text-blue-300 opacity-70">{ability.mana} MP</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="w-48 p-2 border-l border-slate-700 flex flex-col">
          <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Battle Log</div>
          <div className="flex-1 overflow-y-auto max-h-24 space-y-0.5">
            {combatLog.slice(-5).map((log, i) => (
              <div key={i} className="text-[10px] text-slate-400 leading-tight">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

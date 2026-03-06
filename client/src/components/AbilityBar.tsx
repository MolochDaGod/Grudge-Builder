import { useEffect, useCallback, useRef } from 'react';
import { Sword, Zap, Shield, Flame, Wind, Snowflake, Sparkles, Heart } from 'lucide-react';
import {
  AbilityBarState,
  RuntimeAbility,
  HOTKEY_BINDINGS,
  updateCooldowns,
  activateAbility,
  canUseAbility,
} from '@/lib/abilitySystem';
import { cn } from '@/lib/utils';

interface AbilityBarProps {
  state: AbilityBarState;
  currentMana: number;
  currentStamina: number;
  onAbilityActivated: (ability: RuntimeAbility, slotIndex: number) => void;
  onStateChange: (newState: AbilityBarState) => void;
  disabled?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  sword: Sword,
  fire: Flame,
  arcane: Sparkles,
  nature: Wind,
  frost: Snowflake,
  holy: Heart,
  lightning: Zap,
  defense: Shield,
  sparkles: Sparkles,
};

function getAbilityIcon(iconName: string) {
  return ICON_MAP[iconName.toLowerCase()] || Sword;
}

function getAbilityColor(ability: RuntimeAbility): string {
  switch (ability.type) {
    case 'spell':
      switch (ability.damageType) {
        case 'fire': return 'from-orange-600 to-red-700';
        case 'frost': return 'from-cyan-500 to-blue-600';
        case 'lightning': return 'from-yellow-400 to-amber-600';
        case 'holy': return 'from-yellow-300 to-amber-400';
        case 'nature': return 'from-green-500 to-emerald-600';
        default: return 'from-purple-500 to-violet-600';
      }
    case 'skill':
      return 'from-red-600 to-rose-700';
    default:
      return 'from-gray-500 to-gray-600';
  }
}

export function AbilityBar({
  state,
  currentMana,
  currentStamina,
  onAbilityActivated,
  onStateChange,
  disabled = false,
}: AbilityBarProps) {
  const lastTimeRef = useRef<number>(performance.now());
  const animationRef = useRef<number | null>(null);

  const handleHotkey = useCallback(
    (slotIndex: number) => {
      if (disabled) return;
      
      const slot = state.slots[slotIndex];
      if (!slot?.ability) return;

      const { canUse, reason } = canUseAbility(
        slot.ability,
        currentMana,
        currentStamina,
        slot.isOnCooldown,
        state.isGcdActive
      );

      if (!canUse) {
        console.log(`Cannot use ${slot.ability.name}: ${reason}`);
        return;
      }

      const { newState, ability } = activateAbility(state, slotIndex);
      if (ability) {
        onStateChange(newState);
        onAbilityActivated(ability, slotIndex);
      }
    },
    [state, currentMana, currentStamina, disabled, onAbilityActivated, onStateChange]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const hotkeyIndex = HOTKEY_BINDINGS.indexOf(e.key as typeof HOTKEY_BINDINGS[number]);
      if (hotkeyIndex !== -1) {
        e.preventDefault();
        handleHotkey(hotkeyIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHotkey]);

  useEffect(() => {
    const hasActiveCooldowns = state.isGcdActive || state.slots.some(s => s.isOnCooldown);
    if (!hasActiveCooldowns) return;

    const updateLoop = () => {
      const now = performance.now();
      const deltaTime = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const newState = updateCooldowns(state, deltaTime);
      if (newState) {
        onStateChange(newState);
      } else {
        animationRef.current = requestAnimationFrame(updateLoop);
      }
    };

    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(updateLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state, onStateChange]);

  return (
    <div
      className="flex items-center justify-center gap-2 p-2 bg-gray-900/90 rounded-lg border border-gray-700"
      data-testid="ability-bar"
    >
      {state.slots.map((slot) => {
        const ability = slot.ability;
        const Icon = ability ? getAbilityIcon(ability.icon) : Sword;
        const colorClass = ability ? getAbilityColor(ability) : 'from-gray-600 to-gray-700';
        const { canUse } = ability
          ? canUseAbility(ability, currentMana, currentStamina, slot.isOnCooldown, state.isGcdActive)
          : { canUse: false };

        const cooldownPercent = ability && ability.cooldown > 0
          ? (slot.currentCooldown / ability.cooldown) * 100
          : 0;

        return (
          <button
            key={slot.index}
            onClick={() => handleHotkey(slot.index)}
            disabled={disabled || !ability || !canUse}
            className={cn(
              'relative w-12 h-12 rounded-lg border-2 transition-all',
              'flex items-center justify-center',
              ability
                ? `bg-gradient-to-br ${colorClass} border-white/20 hover:border-white/40`
                : 'bg-gray-800 border-gray-600',
              (!ability || !canUse || disabled) && 'opacity-50 cursor-not-allowed',
              canUse && ability && !disabled && 'hover:scale-105 active:scale-95'
            )}
            data-testid={`ability-slot-${slot.index}`}
          >
            {slot.isOnCooldown && ability && (
              <div
                className="absolute inset-0 bg-black/60 rounded-lg"
                style={{
                  clipPath: `inset(${100 - cooldownPercent}% 0 0 0)`,
                }}
              />
            )}

            <Icon className={cn(
              'w-6 h-6',
              ability ? 'text-white' : 'text-gray-500'
            )} />

            <span
              className="absolute bottom-0.5 right-0.5 text-[10px] font-bold text-white/80 bg-black/40 px-1 rounded"
              data-testid={`ability-hotkey-${slot.index}`}
            >
              {slot.hotkey}
            </span>

            {slot.isOnCooldown && (
              <span
                className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white drop-shadow-lg"
                data-testid={`ability-cooldown-${slot.index}`}
              >
                {Math.ceil(slot.currentCooldown / 1000)}
              </span>
            )}

            {ability && ability.resourceCost > 0 && (
              <span
                className={cn(
                  'absolute -top-1 -right-1 text-[9px] font-bold px-1 rounded',
                  ability.resourceType === 'mana' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                )}
              >
                {ability.resourceCost}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

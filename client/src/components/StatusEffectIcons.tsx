/**
 * Status icon row — placed above unit frames when buffs/debuffs are active.
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  getStatusDef,
  type ActiveStatusInstance,
  statusTooltip,
} from '@shared/definitions/statusEffects';

export interface StatusEffectIconsProps {
  effects: ActiveStatusInstance[];
  /** Max icons before "+N" overflow */
  maxVisible?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  /** Show remaining time under icon */
  showTimers?: boolean;
}

const SIZE = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-xs',
  md: 'w-7 h-7 text-sm',
} as const;

export function StatusEffectIcons({
  effects,
  maxVisible = 8,
  size = 'sm',
  className,
  showTimers = true,
}: StatusEffectIconsProps) {
  if (!effects?.length) return null;

  // Debuffs first (danger), then buffs
  const sorted = [...effects].sort((a, b) => {
    const da = getStatusDef(a.statusId);
    const db = getStatusDef(b.statusId);
    const pa = da?.polarity === 'debuff' ? 0 : 1;
    const pb = db?.polarity === 'debuff' ? 0 : 1;
    return pa - pb;
  });

  const visible = sorted.slice(0, maxVisible);
  const overflow = sorted.length - visible.length;

  return (
    <div
      className={cn('flex flex-wrap items-center justify-center gap-0.5', className)}
      data-testid="status-effect-icons"
      role="list"
      aria-label="Status effects"
    >
      {visible.map((fx) => (
        <StatusIcon key={fx.instanceId} effect={fx} size={size} showTimer={showTimers} />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded bg-slate-800 border border-slate-600 text-slate-300 font-bold',
            SIZE[size],
          )}
          title={`${overflow} more effects`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

function StatusIcon({
  effect,
  size,
  showTimer,
}: {
  effect: ActiveStatusInstance;
  size: 'xs' | 'sm' | 'md';
  showTimer: boolean;
}) {
  const def = getStatusDef(effect.statusId);
  const [imgFailed, setImgFailed] = useState(false);
  const tip = statusTooltip(effect.statusId, effect.stacks);
  const ring =
    def?.polarity === 'debuff'
      ? 'border-red-500/70 shadow-red-900/40'
      : def?.polarity === 'buff'
        ? 'border-emerald-500/70 shadow-emerald-900/40'
        : 'border-slate-500/70';

  const rem =
    Number.isFinite(effect.remainingSec) && effect.remainingSec > 0
      ? Math.ceil(effect.remainingSec)
      : null;

  return (
    <div
      className="relative group"
      role="listitem"
      title={tip}
    >
      <div
        className={cn(
          'relative rounded border-2 overflow-hidden bg-black/80 shadow flex items-center justify-center',
          SIZE[size],
          ring,
        )}
        style={{ boxShadow: def ? `0 0 6px ${def.color}55` : undefined }}
      >
        {!imgFailed && def?.icon ? (
          <img
            src={def.icon}
            alt={def.name}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
            draggable={false}
          />
        ) : (
          <span className="leading-none select-none" aria-hidden>
            {def?.emoji ?? '•'}
          </span>
        )}
        {effect.stacks > 1 && (
          <span className="absolute -bottom-0.5 -right-0.5 min-w-[12px] h-3 px-0.5 rounded bg-black/90 text-[8px] font-bold text-white border border-slate-600 flex items-center justify-center">
            {effect.stacks}
          </span>
        )}
      </div>
      {showTimer && rem != null && rem < 60 && (
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[7px] font-mono text-white drop-shadow-[0_1px_1px_#000] leading-none">
          {rem}
        </span>
      )}
      {/* Hover tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 w-40 rounded bg-slate-950/95 border border-slate-600 px-2 py-1 text-[10px] text-slate-200 shadow-xl">
        <div
          className={cn(
            'font-bold mb-0.5',
            def?.polarity === 'debuff' ? 'text-red-400' : 'text-emerald-400',
          )}
        >
          {def?.name ?? effect.statusId}
          {effect.stacks > 1 ? ` ×${effect.stacks}` : ''}
        </div>
        <div className="text-slate-400 leading-snug">{def?.description}</div>
        {rem != null && <div className="text-slate-500 mt-0.5">{rem}s remaining</div>}
      </div>
    </div>
  );
}

export default StatusEffectIcons;

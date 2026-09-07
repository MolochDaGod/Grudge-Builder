/**
 * Status icon row — placed above unit frames when buffs/debuffs are active.
 * Prefers magic orb GLB thumbnails (status-magic pack) over 2D icon paths.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';
import {
  getStatusDef,
  type ActiveStatusInstance,
  statusTooltip,
} from '@shared/definitions/statusEffects';
import {
  resolveMagicIndicator,
  type MagicIndicatorDef,
} from '@shared/definitions/statusMagicIndicators';
import {
  getMagicThumb,
  preloadMagicIndicatorThumbs,
  subscribeMagicThumbs,
} from '@/lib/magicIndicatorThumbs';

export interface StatusEffectIconsProps {
  effects: ActiveStatusInstance[];
  /** Max icons before "+N" overflow */
  maxVisible?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  /** Show remaining time under icon */
  showTimers?: boolean;
  /**
   * When true (default), use magic GLB orb thumbs as the primary indicator art.
   */
  useMagicIndicators?: boolean;
}

const SIZE = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
} as const;

function useMagicThumbVersion(): number {
  return useSyncExternalStore(
    subscribeMagicThumbs,
    () => {
      // bump when any thumb arrives — count of ready thumbs
      let n = 0;
      // access cache indirectly via getMagicThumb for known ids
      const ids = [
        'arcane',
        'command',
        'magnetic',
        'kinetic',
        'chemical',
        'dark',
        'blood',
        'binding',
        'atomic',
        'primordial',
      ] as const;
      for (const id of ids) if (getMagicThumb(id)) n++;
      return n;
    },
    () => 0,
  );
}

export function StatusEffectIcons({
  effects,
  maxVisible = 8,
  size = 'sm',
  className,
  showTimers = true,
  useMagicIndicators = true,
}: StatusEffectIconsProps) {
  // Kick off GLB → PNG bake on first mount
  useEffect(() => {
    if (useMagicIndicators) void preloadMagicIndicatorThumbs();
  }, [useMagicIndicators]);

  useMagicThumbVersion(); // re-render when thumbs land

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
        <StatusIcon
          key={fx.instanceId}
          effect={fx}
          size={size}
          showTimer={showTimers}
          useMagic={useMagicIndicators}
        />
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
  useMagic,
}: {
  effect: ActiveStatusInstance;
  size: 'xs' | 'sm' | 'md';
  showTimer: boolean;
  useMagic: boolean;
}) {
  const def = getStatusDef(effect.statusId);
  const magic: MagicIndicatorDef | null = useMagic
    ? resolveMagicIndicator(effect.statusId, {
        polarity: def?.polarity,
        category: def?.category,
      })
    : null;
  const magicThumb = magic ? getMagicThumb(magic.id) : null;
  const [imgFailed, setImgFailed] = useState(false);
  const tip = statusTooltip(effect.statusId, effect.stacks);

  const polarity = def?.polarity ?? magic?.polarity ?? 'neutral';
  const ring =
    polarity === 'debuff'
      ? 'border-red-500/80 shadow-red-900/50'
      : polarity === 'buff'
        ? 'border-emerald-400/80 shadow-emerald-900/40'
        : 'border-slate-500/70';

  const glowColor = magic?.color ?? def?.color ?? '#94a3b8';

  const rem =
    Number.isFinite(effect.remainingSec) && effect.remainingSec > 0
      ? Math.ceil(effect.remainingSec)
      : null;

  // Prefer magic thumb → status icon path → emoji
  const imgSrc = !imgFailed ? magicThumb || def?.icon || null : null;
  const emoji = magic?.emoji ?? def?.emoji ?? '•';

  return (
    <div className="relative group" role="listitem" title={tip}>
      <div
        className={cn(
          'relative rounded-full border-2 overflow-hidden bg-black/85 shadow-md flex items-center justify-center',
          SIZE[size],
          ring,
        )}
        style={{
          boxShadow: `0 0 8px ${glowColor}66, 0 0 2px ${glowColor}`,
        }}
        data-magic-indicator={magic?.id}
        data-status-polarity={polarity}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={def?.label ?? magic?.label ?? effect.statusId}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
            draggable={false}
          />
        ) : (
          <span className="leading-none select-none" aria-hidden>
            {emoji}
          </span>
        )}
        {effect.stacks > 1 && (
          <span className="absolute -bottom-0.5 -right-0.5 min-w-[12px] h-3 px-0.5 rounded bg-black/90 text-[8px] font-bold text-white border border-slate-600 flex items-center justify-center">
            {effect.stacks}
          </span>
        )}
        {/* Polarity pip */}
        <span
          className={cn(
            'absolute -top-0.5 -left-0.5 w-1.5 h-1.5 rounded-full border border-black/60',
            polarity === 'debuff' ? 'bg-red-500' : 'bg-emerald-400',
          )}
          aria-hidden
        />
      </div>
      {showTimer && rem != null && rem < 60 && (
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[7px] font-mono text-white drop-shadow-[0_1px_1px_#000] leading-none">
          {rem}
        </span>
      )}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 w-44 rounded bg-slate-950/95 border border-slate-600 px-2 py-1 text-[10px] text-slate-200 shadow-xl">
        <div
          className={cn(
            'font-bold mb-0.5',
            polarity === 'debuff' ? 'text-red-400' : 'text-emerald-400',
          )}
        >
          {def?.label ?? effect.statusId}
          {effect.stacks > 1 ? ` ×${effect.stacks}` : ''}
        </div>
        {magic && (
          <div className="text-[9px] mb-0.5" style={{ color: magic.color }}>
            {magic.label} {polarity === 'debuff' ? 'debuff' : 'buff'} orb
          </div>
        )}
        <div className="text-slate-400 leading-snug">{def?.description}</div>
        {rem != null && <div className="text-slate-500 mt-0.5">{rem}s remaining</div>}
      </div>
    </div>
  );
}

export default StatusEffectIcons;

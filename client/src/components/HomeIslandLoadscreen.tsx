/**
 * HomeIslandLoadscreen — branded generative home-island loading overlay.
 * Stages mirror Island3DEngine.initProcedural progress bands.
 */
import { useMemo } from 'react';

const STAGES: Array<{ min: number; label: string; detail: string }> = [
  { min: 0, label: 'Seeding landmass', detail: 'Foundation shape · bay & spire bias' },
  { min: 12, label: 'Sculpting terrain', detail: '1024 m board · elevation · camp plateau' },
  { min: 28, label: 'Harvest zones', detail: 'Forest · quarry · hemp · gems on dry land' },
  { min: 48, label: 'Shore & fishing', detail: 'Docks on beach · fish only in water' },
  { min: 55, label: 'Battle nature', detail: 'CommonTree pack · 4 canopy layers' },
  { min: 68, label: 'Board grid', detail: 'XY cells · hero spawn snap' },
  { min: 72, label: 'Baking pathfinding', detail: 'three-pathfinding navmesh · dry walk only' },
  { min: 84, label: 'Wildlife & mines', detail: 'Creatures · craftpix mines · mountain' },
  { min: 95, label: 'Almost ready', detail: 'Lighting · character · play shell' },
];

export function stageForProgress(pct: number) {
  let stage = STAGES[0]!;
  for (const s of STAGES) {
    if (pct >= s.min) stage = s;
  }
  return stage;
}

interface Props {
  seed: string;
  progress: number;
  biome?: string;
  foundationLabel?: string;
  className?: string;
}

export function HomeIslandLoadscreen({
  seed,
  progress,
  biome = 'beach',
  foundationLabel = 'Driftwood Bay',
  className = '',
}: Props) {
  const pct = Math.min(100, Math.max(0, progress));
  const stage = useMemo(() => stageForProgress(pct), [pct]);

  return (
    <div
      className={`absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden ${className}`}
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% 40%, #0f3d2e 0%, #061018 45%, #02040a 100%)',
      }}
    >
      {/* Soft horizon glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 90% 40% at 50% 85%, rgba(16,185,129,0.25) 0%, transparent 55%)',
        }}
      />
      {/* Grid floor suggestion */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(52,211,153,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to top, black 0%, transparent 85%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center text-center">
        <p className="text-emerald-400/90 text-[10px] font-bold tracking-[0.35em] uppercase mb-2">
          Warlords Era · Home Island
        </p>
        <h1
          className="text-2xl sm:text-3xl font-bold text-white mb-1"
          style={{ fontFamily: 'Cinzel, Georgia, serif', letterSpacing: '0.04em' }}
        >
          {foundationLabel}
        </h1>
        <p className="text-slate-400 text-sm mb-6 max-w-sm leading-relaxed">
          Full generative pipeline — terrain, dry-land harvest, baked pathfinding,
          battle trees, mines. Preview of your real home island.
        </p>

        {/* Progress ring + bar */}
        <div className="w-full mb-5">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
            <span className="text-emerald-300 font-semibold">{stage.label}</span>
            <span className="font-mono tabular-nums">{Math.round(pct)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-black/50 border border-emerald-900/60 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${pct}%`,
                background:
                  'linear-gradient(90deg, #059669 0%, #34d399 55%, #a7f3d0 100%)',
                boxShadow: '0 0 16px rgba(52,211,153,0.55)',
              }}
            />
          </div>
          <p className="text-slate-500 text-[11px] mt-2">{stage.detail}</p>
        </div>

        {/* Stage checklist */}
        <ul className="w-full text-left space-y-1 mb-6">
          {STAGES.filter((s) => s.min <= 84).map((s) => {
            const done = pct >= s.min + 8 || pct >= 100;
            const active = stage.label === s.label;
            return (
              <li
                key={s.min}
                className={`flex items-center gap-2 text-[11px] transition-colors ${
                  done
                    ? 'text-emerald-400/90'
                    : active
                      ? 'text-white'
                      : 'text-slate-600'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    done ? 'bg-emerald-400' : active ? 'bg-amber-300 animate-pulse' : 'bg-slate-700'
                  }`}
                />
                {s.label}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap justify-center gap-2 text-[10px] font-mono text-slate-500">
          <span className="px-2 py-0.5 rounded bg-black/40 border border-white/5">
            seed={seed.slice(0, 28)}{seed.length > 28 ? '…' : ''}
          </span>
          <span className="px-2 py-0.5 rounded bg-black/40 border border-white/5">
            biome={biome}
          </span>
          <span className="px-2 py-0.5 rounded bg-black/40 border border-white/5">
            1024m · dry nodes · nav bake
          </span>
        </div>
      </div>
    </div>
  );
}

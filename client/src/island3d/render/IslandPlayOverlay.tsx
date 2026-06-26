/**
 * IslandPlayOverlay — Character-Animator-two / RTS-Grudge style combat HUD +
 * session loading meter + sim tick/time controls.
 */
import { CombatUnitStatus } from '@/components/CombatUnitStatus';
import type { IslandSessionContext } from '../session/islandSessionMachine';
import type { Island3DEngine } from '../engine/Island3DEngine';

interface IslandPlayOverlayProps {
  engine: Island3DEngine | null;
  session: IslandSessionContext;
  loadProgress: number;
  loading: boolean;
  characterName?: string;
  movementState?: string;
  onTickRate: (v: number) => void;
  onDayDuration: (v: number) => void;
  onCombatToggle: () => void;
}

export function IslandPlayOverlay({
  engine,
  session,
  loadProgress,
  loading,
  characterName,
  movementState,
  onTickRate,
  onDayDuration,
  onCombatToggle,
}: IslandPlayOverlayProps) {
  const hp = session.character?.hp ?? 100;
  const maxHp = 100;
  const name = session.character?.name ?? characterName ?? 'Captain';
  const level = session.character?.level ?? 1;

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* Loading strip — XState + engine progress */}
      {loading && (
        <div className="absolute top-0 left-0 right-0 bg-black/80 border-b border-amber-800/40 px-4 py-2 pointer-events-auto">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-amber-300 font-medium min-w-[10rem]">{session.loadLabel}</span>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden max-w-md">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-emerald-500 transition-all duration-300"
                style={{ width: `${Math.max(loadProgress, session.loadProgress)}%` }}
              />
            </div>
            <span className="text-slate-400 tabular-nums w-10 text-right">
              {Math.round(Math.max(loadProgress, session.loadProgress))}%
            </span>
          </div>
        </div>
      )}

      {/* Combat HUD — RTS-Grudge CombatUnitStatus pattern */}
      {!loading && (
        <div className="absolute bottom-4 left-4 pointer-events-auto w-56">
          <CombatUnitStatus
            name={name}
            hp={hp}
            maxHp={maxHp}
            mp={80}
            maxMp={100}
            sp={60}
            maxSp={100}
            level={level}
            isActive
            compact={false}
          />
          {movementState && (
            <p className="text-[10px] text-slate-400 mt-1 px-1">{movementState}</p>
          )}
        </div>
      )}

      {/* Tick / time + mode — top right */}
      {!loading && (
        <div className="absolute top-4 right-4 pointer-events-auto bg-black/75 backdrop-blur border border-slate-700/50 rounded-xl p-3 text-xs text-slate-200 space-y-2 w-52">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Sim Time</p>
          <label className="flex justify-between items-center gap-2">
            <span className="text-slate-400">Tick rate</span>
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.25}
              value={session.time.tickRate}
              onChange={(e) => onTickRate(Number(e.target.value))}
              className="w-24 accent-amber-500"
            />
            <span className="tabular-nums w-8 text-right">{session.time.tickRate}x</span>
          </label>
          <label className="flex justify-between items-center gap-2">
            <span className="text-slate-400">Day cycle</span>
            <input
              type="range"
              min={120}
              max={1800}
              step={60}
              value={session.time.dayDurationSeconds}
              onChange={(e) => onDayDuration(Number(e.target.value))}
              className="w-24 accent-cyan-500"
            />
            <span className="tabular-nums w-10 text-right">{Math.round(session.time.dayDurationSeconds / 60)}m</span>
          </label>
          <div className="flex gap-1 pt-1 border-t border-slate-700/50">
            <button
              type="button"
              onClick={onCombatToggle}
              className={`flex-1 py-1 rounded text-[10px] font-semibold border ${
                session.combatMode
                  ? 'bg-red-900/80 border-red-600 text-red-100'
                  : 'bg-slate-800 border-slate-600 text-slate-300'
              }`}
            >
              {session.combatMode ? '⚔ Combat' : '🌿 Harvest'}
            </button>
            <button
              type="button"
              onClick={() => engine?.character?.setControlMode(session.combatMode ? 'combat' : 'harvest')}
              className="flex-1 py-1 rounded text-[10px] bg-slate-800 border border-slate-600 text-slate-300"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
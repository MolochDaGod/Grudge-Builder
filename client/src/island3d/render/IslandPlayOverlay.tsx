/**
 * IslandPlayOverlay — RTS-Grudge style: loading strip + ModePlayHUD (combat / harvest / build).
 * Always exposes Ocean Sail + World Map so players can leave land for open water.
 */
import { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Ship, Waves, Map as MapIcon } from 'lucide-react';
import type { IslandSessionContext } from '../session/islandSessionMachine';
import type { Island3DEngine } from '../engine/Island3DEngine';
import type { ControlMode } from '../player/CharacterController3D';
import { ModePlayHUD } from './ModePlayHUD';
import { ensureStarterShip } from '@/lib/shipDockService';
import { WARLORDS_OCEAN_PATH, THREE_WORLD_MAP_PATH } from '@shared/fleet';

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
  playMode?: ControlMode;
  onModeChange?: (mode: ControlMode) => void;
  resources?: Record<string, number>;
  /** Weapon skills 1–5 from Grudge6 / spellbook */
  weaponHotbar?: Array<{ key: string; label: string; skillId?: string }>;
  /** Class abilities Shift+1–5 */
  classHotbar?: Array<{ key: string; label: string; skillId?: string }>;
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
  playMode: playModeProp,
  onModeChange: onModeChangeProp,
  resources = {},
  weaponHotbar = [],
  classHotbar = [],
}: IslandPlayOverlayProps) {
  const [, setLocation] = useLocation();
  const hp = session.character?.hp ?? 100;
  const maxHp = 100;
  const name = session.character?.name ?? characterName ?? 'Captain';
  const level = session.character?.level ?? 1;

  const goOcean = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const characterId = params.get('characterId');
    const account =
      characterId ||
      localStorage.getItem('grudge_account_id') ||
      localStorage.getItem('grudge_user_id') ||
      'guest';
    ensureStarterShip(account, characterId);
    sessionStorage.setItem('grudge-ocean-account', account);
    setLocation(WARLORDS_OCEAN_PATH);
  }, [setLocation]);

  const goWorldMap = useCallback(() => {
    setLocation(THREE_WORLD_MAP_PATH);
  }, [setLocation]);

  const [localMode, setLocalMode] = useState<ControlMode>(
    session.combatMode ? 'combat' : 'harvest',
  );
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);

  const mode = playModeProp ?? localMode;

  const handleModeChange = useCallback(
    (m: ControlMode) => {
      // ModePlayHUD already runs enterHarvestMode / enterCombatMode / setHarvestRadialTool.
      // Map build-hammer sub-state under harvest shell for local UI state.
      const uiMode: ControlMode = m === 'build' ? 'build' : m;
      setLocalMode(uiMode);
      onModeChangeProp?.(m === 'build' ? 'harvest' : m);
      if (m === 'combat' && !session.combatMode) onCombatToggle();
      if (m !== 'combat' && session.combatMode) onCombatToggle();
      if (m === 'combat' || m === 'harvest') {
        if (m === 'combat') {
          engine?.cancelBuilding();
          setSelectedBuildId(null);
        }
      }
    },
    [engine, onModeChangeProp, onCombatToggle, session.combatMode],
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* Loading strip */}
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

      {/* Sim time (compact, top-right) */}
      {!loading && (
        <div className="absolute top-4 right-4 pointer-events-auto bg-black/75 backdrop-blur border border-slate-700/50 rounded-xl p-2.5 text-[10px] text-slate-200 space-y-1.5 w-44">
          <p className="uppercase tracking-widest text-slate-500">Sim</p>
          <label className="flex justify-between items-center gap-2">
            <span className="text-slate-400">Tick</span>
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.25}
              value={session.time.tickRate}
              onChange={(e) => onTickRate(Number(e.target.value))}
              className="w-20 accent-amber-500"
            />
            <span className="tabular-nums w-7 text-right">{session.time.tickRate}x</span>
          </label>
          <label className="flex justify-between items-center gap-2">
            <span className="text-slate-400">Day</span>
            <input
              type="range"
              min={120}
              max={1800}
              step={60}
              value={session.time.dayDurationSeconds}
              onChange={(e) => onDayDuration(Number(e.target.value))}
              className="w-20 accent-cyan-500"
            />
            <span className="tabular-nums w-8 text-right">
              {Math.round(session.time.dayDurationSeconds / 60)}m
            </span>
          </label>
          {movementState && (
            <p className="text-slate-500 truncate pt-0.5 border-t border-slate-700/40">
              {movementState}
            </p>
          )}
        </div>
      )}

      {/* Always-on sail escape hatch — zone / lobby / home never trap the player on land */}
      {!loading && (
        <div className="absolute bottom-28 right-3 pointer-events-auto z-50 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={goOcean}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/90 border border-cyan-500/50 text-cyan-100 text-xs font-semibold shadow-lg hover:bg-cyan-900/90 hover:border-cyan-400/70 transition-colors"
            data-testid="play-ocean-sail"
            title="Open wind sailing on the tactical ocean"
          >
            <Waves className="w-3.5 h-3.5" />
            Ocean Sail
          </button>
          <button
            type="button"
            onClick={goWorldMap}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/75 border border-amber-700/40 text-amber-100/90 text-[11px] hover:bg-black/90 transition-colors"
            data-testid="play-world-map"
            title="9-sector strategic world map"
          >
            <MapIcon className="w-3 h-3" />
            World Map
          </button>
          <p className="text-[9px] text-slate-500 text-right px-1 flex items-center justify-end gap-1">
            <Ship className="w-2.5 h-2.5" />
            wind · fleet · sectors
          </p>
        </div>
      )}

      {/* Triple mode UI */}
      {!loading && (
        <ModePlayHUD
          engine={engine}
          mode={mode}
          onModeChange={handleModeChange}
          characterName={name}
          hp={hp}
          maxHp={maxHp}
          level={level}
          resources={resources}
          selectedBuildId={selectedBuildId}
          onBuildSelect={(id) => setSelectedBuildId(id)}
          onBuildCancel={() => setSelectedBuildId(null)}
          weaponHotbar={weaponHotbar}
          classHotbar={classHotbar}
        />
      )}
    </div>
  );
}

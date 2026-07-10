/**
 * Island3DRenderer — React component that mounts the 3D island engine.
 *
 * Manages canvas lifecycle, resize handling, click-to-harvest, building
 * ghost preview, character controls, and HUD overlay for all new systems.
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import { Island3DEngine, type Island3DMode } from '../engine/Island3DEngine';
import type { MountainTriadSeed } from '@shared/definitions/homeIslandSeed';
import type { RtsHeightmapPayload } from '@shared/definitions/rtsTerrainBridge';
import type { RtsNatureScatterPayload } from '@shared/definitions/rtsNatureScatter';
import { exportSceneToFile, getSceneStats } from '@/lib/sceneExporter';
import type { MultiplayerConfig } from '../sync/MultiplayerSync';
import type { Model3DField } from '@shared/fleet';
import { LobbyGameHUD } from './LobbyGameHUD';
import { ShipDockPanel } from '@/components/ShipDockPanel';
import { IslandPlayOverlay } from './IslandPlayOverlay';
import { useIslandSession } from '../session/useIslandSession';
import type { QualityPreset } from '../render/PostProcessing';
import type { DayNightConfig } from '../environment/DayNightCycle';
import type { PhysicsCallbacks, MovementState } from '../player/CharacterController3D';
import { EMPTY_COMBAT_HUD, type CombatHudSnapshot } from '../player/combatHudState';
import { DangerRoomHud } from './DangerRoomHud';
import { WarlordsPvpLoadscreen } from '@/components/WarlordsPvpLoadscreen';
import './dangerRoomHud.css';

interface Island3DRendererProps {
  seed: string;
  className?: string;
  /** Pass multiplayer config to enable Socket.IO sync */
  multiplayer?: MultiplayerConfig;
  /** 'procedural' (default), 'lobby', or 'zone' */
  mode?: Island3DMode;
  /** Lobby map ID (e.g. 'pirate-islands'). Only used when mode='lobby'. */
  lobbyMapId?: string;
  /** Sector ID from WORLD_SECTORS. Only used when mode='zone'. */
  sectorId?: string;
  /** World seed shared across zone instances. Only used when mode='zone'. */
  worldSeed?: string;
  /** Post-processing quality (default 'medium') */
  quality?: QualityPreset;
  /** Day/night cycle config (omit to disable) */
  dayNight?: Partial<DayNightConfig>;
  /** Enable the playable character controller (default true for procedural) */
  enableCharacter?: boolean;
  /** Load manifest character after engine init */
  characterId?: string;
  raceId?: string;
  classId?: string;
  characterName?: string;
  model3d?: Partial<Model3DField>;
  /** Open-world island room id (grudge-open-world, etc.) */
  lobbyIslandId?: string;
  /** Expose the engine ref for external control (building, allies, etc.) */
  onEngineReady?: (engine: Island3DEngine) => void;
  /** Fired when a harvestable node is depleted (tree felled, rock mined, etc.) */
  onHarvest?: (event: { nodeId?: string; resourceType: string; position: import('three').Vector3 }) => void;
  /** Persisted mountain triad from Railway home island state */
  mountainTriad?: MountainTriadSeed;
  /** RTS-Grudge heightmap export — shapes center of 1024m terrain */
  rtsHeightmap?: RtsHeightmapPayload;
  /** RTS NatureScatter foliage placements */
  rtsNatureScatter?: RtsNatureScatterPayload;
  /** Island biome — Driftwood Bay vs Ironfang Spire foundation */
  biome?: string;
  /** Fired when player enters a mountain dungeon portal */
  onDungeonEnter?: (dungeonId: string, dungeonName: string) => void;
  /** Camp hub percent coords from Railway home island state */
  campPositionPercent?: { x: number; y: number };
  /** Regrowing forest / quarry / beach anchor regions */
  regrowRegions?: import('@shared/definitions/homeIslandSpec').HomeIslandRegrowRegion[];
}

export function Island3DRenderer({
  seed, className = '', multiplayer, mode = 'procedural', lobbyMapId,
  sectorId, worldSeed,
  quality = 'medium', dayNight, enableCharacter, onEngineReady,
  characterId, raceId, classId, characterName, model3d, lobbyIslandId, onHarvest,
  mountainTriad, rtsHeightmap, rtsNatureScatter, biome, onDungeonEnter, campPositionPercent, regrowRegions,
}: Island3DRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Island3DEngine | null>(null);
  const onHarvestRef = useRef<Island3DRendererProps['onHarvest']>(() => {});
  const [engineReady, setEngineReady] = useState<Island3DEngine | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // HUD state driven by physics callbacks
  const [movementState, setMovementState] = useState<MovementState>('ground');
  const [oxygen, setOxygen] = useState(1); // 0-1 ratio
  const [dayPhase, setDayPhase] = useState('day');
  const [combatHud, setCombatHud] = useState<CombatHudSnapshot>(EMPTY_COMBAT_HUD);
  const [showDockPanel, setShowDockPanel] = useState(false);
  const { context: sessionCtx, send: sessionSend } = useIslandSession(characterId);
  const accountId = characterId ?? 'guest';

  useEffect(() => {
    onHarvestRef.current = onHarvest;
  }, [onHarvest]);

  // Physics callbacks (bridge engine events → React state)
  const physicsCallbacks: PhysicsCallbacks = {
    onMovementStateChange: (_prev, next) => setMovementState(next),
    onOxygenChange: (o2, max) => setOxygen(max > 0 ? o2 / max : 1),
  };

  // Init engine
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const engine = new Island3DEngine({
      seed,
      canvas,
      width,
      height,
      multiplayer,
      mode,
      lobbyMapId,
      sectorId,
      worldSeed,
      quality,
      dayNight,
      enableCharacter,
      physicsCallbacks,
      onLoadProgress: (pct) => {
        setLoadProgress(pct);
        sessionSend({ type: 'PROGRESS', progress: pct });
      },
      onHarvest: (evt) => onHarvestRef.current?.(evt),
      accountId,
      captainId: characterId ?? null,
      mountainTriad,
      rtsHeightmap,
      rtsNatureScatter,
      biome,
      onDungeonEnter,
      campPositionPercent,
      regrowRegions,
    });
    engineRef.current = engine;

    engine.init()
      .then(async () => {
        setLoading(false);
        setError(null);
        sessionSend({ type: 'READY' });
        engine.start();
        // Character load is optional — never fail the whole island for missing hero assets
        if (engine.character && raceId && classId) {
          try {
            const activeChar = await import('@/lib/characterManager').then((m) =>
              m.CharacterManager.getActiveCharacter?.(),
            );
            await engine.character.loadCharacterFromManifest(
              raceId,
              classId,
              characterId,
              undefined,
              model3d ?? activeChar?.model3d,
              activeChar?.equipment,
            );
            if (activeChar?.equipment) {
              engine.character.setEquipment(activeChar.equipment);
            }
          } catch (charErr) {
            console.warn('[Island3D] Character load skipped — capsule fallback:', charErr);
          }
        }
        setEngineReady(engine);
        onEngineReady?.(engine);
      })
      .catch((err) => {
        console.error('Island3D init failed:', err);
        const msg = err instanceof Error ? err.message : 'Failed to initialize 3D island';
        sessionSend({ type: 'FAIL', error: msg });
        // Still try to start a partial scene if the engine constructed
        try {
          engine.start();
          setEngineReady(engine);
          onEngineReady?.(engine);
        } catch {
          /* ignore */
        }
        setError(msg);
        setLoading(false);
      });

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [
    seed, multiplayer, mode, lobbyMapId, sectorId, worldSeed,
    characterId, raceId, classId, model3d,
    mountainTriad, rtsHeightmap, rtsNatureScatter, biome, onDungeonEnter, campPositionPercent, regrowRegions,
  ]);

  // Lobby interact: E capture / board ship
  useEffect(() => {
    if (mode !== 'lobby') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E') {
        const eng = engineRef.current;
        if (!eng) return;
        eng.dockInteractPending = false;
        eng.handleInteractKey();
        if (eng.dockInteractPending) {
          setShowDockPanel(true);
          eng.dockInteractPending = false;
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E') {
        engineRef.current?.stopCapturing();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [mode]);

  // Day phase polling (lightweight — once per second)
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      const phase = engineRef.current?.dayNight?.getPhase();
      if (phase) setDayPhase(phase);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading]);

  // Danger Room HUD — combat crosshair + MM readout
  useEffect(() => {
    if (loading) return;
    let raf = 0;
    const tick = () => {
      const snap = engineRef.current?.character?.getCombatHudSnapshot();
      if (snap) setCombatHud(snap);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loading, engineReady]);

  // Session combat toggle → character mode
  useEffect(() => {
    const eng = engineRef.current?.character;
    if (!eng) return;
    void eng.setControlMode(sessionCtx.combatMode ? 'combat' : 'harvest', classId, true);
  }, [sessionCtx.combatMode, engineReady, classId]);

  // Session tick/time → engine day/night
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.simTickRate = sessionCtx.time.tickRate;
    eng.dayNight?.setDayDuration(sessionCtx.time.dayDurationSeconds);
  }, [sessionCtx.time.tickRate, sessionCtx.time.dayDurationSeconds, engineReady]);

  // Resize handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          engineRef.current?.resize(width, height);
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Click handler (harvesting or building confirm)
  const handleClick = useCallback((e: React.MouseEvent) => {
    engineRef.current?.handleClick(e.clientX, e.clientY);
  }, []);

  // Mouse move handler (building ghost snap preview)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    engineRef.current?.handleMouseMove(e.clientX, e.clientY);
  }, []);

  // Keyboard: Escape cancels building
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') engineRef.current?.cancelBuilding();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Movement state label
  const stateLabel: Record<MovementState, string> = {
    ground: '🚶 Ground',
    falling: '💨 Falling',
    jumping: '⬆️ Jumping',
    swimming_surface: '🏊 Swimming',
    swimming_underwater: '🤿 Underwater',
    climbing: '🧗 Climbing',
  };

  const isSwimming = movementState === 'swimming_surface' || movementState === 'swimming_underwater';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      style={{ minHeight: '400px' }}
    >
      <canvas
        ref={canvasRef}
        className={`w-full h-full block${combatHud.combatMode ? ' dr-combat-cursor' : ''}`}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      />

      {loading && (mode === 'lobby' || multiplayer) ? (
        <WarlordsPvpLoadscreen
          className="z-10"
          videoOpacity={0.65}
          progress={mode === 'lobby' ? loadProgress : undefined}
          label={
            mode === 'lobby'
              ? `Loading lobby · ${lobbyMapId || 'pirate-islands'}`
              : mode === 'zone'
                ? `Loading PvP zone · ${sectorId || 'unknown'}`
                : 'Connecting to world...'
          }
        >
          <p className="text-emerald-300 font-cinzel font-bold text-lg tracking-[4px] uppercase">
            {mode === 'lobby' ? 'PvP Lobby' : 'Entering Battle'}
          </p>
        </WarlordsPvpLoadscreen>
      ) : loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4" />
            <p className="text-emerald-400 font-medium">
              {mode === 'zone' ? 'Loading zone...' : 'Generating island terrain...'}
            </p>
            <p className="text-gray-400 text-sm mt-1">Seed: {seed}</p>
          </div>
        </div>
      ) : null}

      {error && !engineReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 z-10 px-6">
          <div className="max-w-md text-center space-y-3">
            <p className="text-amber-300 font-semibold text-sm">Island load had issues</p>
            <p className="text-slate-400 text-xs break-words">{error}</p>
            <p className="text-slate-500 text-[11px]">
              Reload the generative home island, or open /home-island when signed in.
            </p>
            <a
              href="/island-3d"
              className="inline-block text-emerald-400 text-xs underline"
            >
              Regenerate home island
            </a>
          </div>
        </div>
      )}
      {error && engineReady && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 max-w-sm bg-amber-950/80 border border-amber-700/50 text-amber-100 text-[11px] px-3 py-2 rounded-lg">
          Partial load: {error}
        </div>
      )}

      {/* ── HUD overlay ──────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {/* Top-left info panel */}
          <div className="absolute top-4 right-4 z-10 bg-black/55 text-white text-[11px] px-2.5 py-1.5 rounded-lg space-y-0.5 max-w-[11rem] text-right">
            <p className="font-semibold text-emerald-400/90 truncate">
              {mode === 'zone' ? `Zone · ${sectorId || '?'}` : mode === 'lobby' ? `Lobby · ${lobbyMapId || 'map'}` : (biome ? biome : 'home')}
            </p>
            {(mode === 'procedural' || mode === 'zone') && (
              <>
                <p className="text-gray-400">{stateLabel[movementState] || movementState}</p>
                <p className="text-gray-500 text-[10px]">WASD · Space · Tab · Click harvest</p>
              </>
            )}
            {mode === 'lobby' && (
              <>
                <p className="text-gray-300">{stateLabel[movementState] || movementState}</p>
                <p className="text-gray-400">WASD move · Space jump · Tab combat/harvest</p>
                <p className="text-gray-400">Combat: LMB MM combo · Z +100/−50 · X −50 · RMB tap focus</p>
                <p className="text-gray-400">E hold = capture · E at dock = sail</p>
              </>
            )}
            {multiplayer && (
              <p className="text-sky-400">⚡ Multiplayer connected</p>
            )}
            {dayNight !== undefined && (
              <p className="text-amber-300">☀️ {dayPhase.charAt(0).toUpperCase() + dayPhase.slice(1)}</p>
            )}
            {/* Export */}
            <button
              onClick={async () => {
                const engine = engineRef.current;
                if (!engine) return;
                const scene = (engine as any).scene;
                if (!scene) return;
                const stats = getSceneStats(scene);
                console.log('[Export] Scene stats:', stats);
                await exportSceneToFile(scene, `island-${seed}.glb`, {
                  metadata: { seed },
                });
              }}
              className="mt-1 px-2 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-[10px] text-white w-full"
            >
              📦 Export Scene (.glb)
            </button>
          </div>

          {/* Oxygen bar (only when swimming) */}
          <DangerRoomHud hud={combatHud} />

          {/* Full game systems HUD: harvest / combat / build — home island + zone + lobby */}
          {(mode === 'procedural' || mode === 'zone' || mode === 'lobby') && (
            <IslandPlayOverlay
              engine={engineReady}
              session={sessionCtx}
              loadProgress={loadProgress}
              loading={loading}
              characterName={characterName}
              movementState={stateLabel[movementState]}
              onTickRate={(v) => sessionSend({ type: 'SET_TICK_RATE', tickRate: v })}
              onDayDuration={(v) => sessionSend({ type: 'SET_DAY_DURATION', dayDurationSeconds: v })}
              onCombatToggle={() => sessionSend({ type: 'TOGGLE_COMBAT' })}
            />
          )}

          {mode === 'lobby' && (
            <>
              <LobbyGameHUD
                engine={engineReady}
                characterName={characterName}
                islandId={lobbyIslandId}
                multiplayerConnected={!!multiplayer}
              />
              {showDockPanel && (
                <ShipDockPanel
                  accountId={accountId}
                  captainId={characterId ?? null}
                  captainName={characterName}
                  isBoarded={engineReady?.lobbyShip?.isBoarded}
                  onBoard={() => {
                    const eng = engineRef.current;
                    const pos = eng?.character?.getPosition();
                    if (eng?.lobbyShip && pos && eng.lobbyShip.tryBoard(pos)) {
                      eng.character?.stateMachine?.transition('sailing');
                    }
                  }}
                  onClose={() => setShowDockPanel(false)}
                />
              )}
            </>
          )}

          {isSwimming && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-48">
              <div className="bg-black/60 rounded px-2 py-1">
                <p className="text-[10px] text-cyan-300 text-center mb-1">
                  🤿 Oxygen {Math.round(oxygen * 100)}%
                </p>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${oxygen * 100}%`,
                      backgroundColor: oxygen > 0.3 ? '#22d3ee' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

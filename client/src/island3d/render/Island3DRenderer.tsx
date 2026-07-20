/**
 * Island3DRenderer — React component that mounts the 3D island engine.
 *
 * Manages canvas lifecycle, resize handling, click-to-harvest, building
 * ghost preview, character controls, and HUD overlay for all new systems.
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
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
import { Grudge6PlayShell } from '@/components/Grudge6PlayShell';
import { LobbyProductionHUD } from './LobbyProductionHUD';
import { LobbyMiniMap } from './LobbyMiniMap';
import { ZoneMiniMap } from './ZoneMiniMap';
import { ZoneFlybyHUD } from './ZoneFlybyHUD';
import { ServerChatHUD } from './ServerChatHUD';
import { useProductionHud } from '@/hooks/useProductionHud';
import { useIslandSession } from '../session/useIslandSession';
import { FactionCaptainEndGame, type CaptainInteractState } from '../lobby/FactionCaptainEndGame';
import { EndGameCaptainPanel, EndGameCaptainPrompt } from './EndGameCaptainPanel';
import { endGameCinematicUrl } from '@shared/definitions/endGameMission';
import type { QualityPreset } from '../render/PostProcessing';
import type { DayNightConfig } from '../environment/DayNightCycle';
import type { PhysicsCallbacks, MovementState } from '../player/CharacterController3D';
import { EMPTY_COMBAT_HUD, type CombatHudSnapshot } from '../player/combatHudState';
import { DangerRoomHud } from './DangerRoomHud';
import { GrudgeStudioPlayChrome } from './GrudgeStudioPlayChrome';
import type { SoftLockScreenFrame } from '../player/SoftLockSystem';
import { WarlordsPvpLoadscreen } from '@/components/WarlordsPvpLoadscreen';
import { HomeIslandLoadscreen } from '@/components/HomeIslandLoadscreen';
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
  /** Load Grudge6 / uMMORPG race prefab after engine init */
  characterId?: string;
  raceId?: string;
  classId?: string;
  characterName?: string;
  model3d?: Partial<Model3DField>;
  /** Main-panel equipment slots (MainHand, body, …) */
  equipment?: Record<string, string | null>;
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
  /**
   * Open-world editor mode — start in Build control mode so Units/Siege/Monsters
   * (uMMORPG / 30grudge6 deployables) are one tab away.
   */
  editorMode?: boolean;
}

export function Island3DRenderer({
  seed, className = '', multiplayer, mode = 'procedural', lobbyMapId,
  sectorId, worldSeed,
  quality = 'medium', dayNight, enableCharacter, onEngineReady,
  characterId, raceId, classId, characterName, model3d, equipment, lobbyIslandId, onHarvest,
  mountainTriad, rtsHeightmap, rtsNatureScatter, biome, onDungeonEnter, campPositionPercent, regrowRegions,
  editorMode = false,
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
  const [stamina01, setStamina01] = useState(1); // 0-1 ratio
  const [dayPhase, setDayPhase] = useState('day');
  const [combatHud, setCombatHud] = useState<CombatHudSnapshot>(EMPTY_COMBAT_HUD);
  const [softLockFrame, setSoftLockFrame] = useState<SoftLockScreenFrame | null>(null);
  const [playVitals, setPlayVitals] = useState({
    hp: 100,
    maxHp: 100,
    mana: 50,
    maxMana: 50,
    stamina: 100,
    maxStamina: 100,
  });
  const [showDockPanel, setShowDockPanel] = useState(false);
  const [weaponHotbar, setWeaponHotbar] = useState<Array<{ key: string; label: string; skillId?: string }>>([]);
  const [classHotbar, setClassHotbar] = useState<Array<{ key: string; label: string; skillId?: string }>>([]);
  const [heroResolvedName, setHeroResolvedName] = useState(characterName);
  const { context: sessionCtx, send: sessionSend } = useIslandSession(characterId);
  const accountId = characterId ?? 'guest';
  const { isPanelEnabled, flags: hudFlags } = useProductionHud(engineReady);
  const [endGameCaptain, setEndGameCaptain] = useState<CaptainInteractState | null>(null);
  const [endGamePrompt, setEndGamePrompt] = useState(false);
  const captainSystemRef = useRef<FactionCaptainEndGame | null>(null);
  /** Thornwood Wilds: boss / city door prompt */
  const [hiddenCityPrompt, setHiddenCityPrompt] = useState<string | null>(null);
  const [hiddenCityBossHp, setHiddenCityBossHp] = useState<{ hp: number; maxHp: number } | null>(null);

  useEffect(() => {
    onHarvestRef.current = onHarvest;
  }, [onHarvest]);

  // End Game: level 20+ captain on faction islands (lobby)
  useEffect(() => {
    if (!engineReady || mode !== 'lobby') return;
    // Wait until faction islands exist (async after lobby load)
    let cancelled = false;
    let raf = 0;
    let sys: FactionCaptainEndGame | null = null;

    const attach = () => {
      if (cancelled) return;
      const root = engineReady.factionIslands?.root;
      if (!root) {
        raf = requestAnimationFrame(attach);
        return;
      }
      sys = new FactionCaptainEndGame({
        root,
        getPlayerPosition: () => {
          const p = engineReady.character?.getPosition();
          return p ? p.clone() : new THREE.Vector3(0, 0, 0);
        },
        getPlayerLevel: () => {
          try {
            const raw = sessionStorage.getItem('grudge_active_character_level');
            if (raw) return parseInt(raw, 10) || 1;
          } catch {
            /* ignore */
          }
          return 1;
        },
        getPlayerName: () => heroResolvedName || characterName || 'Hero',
        onOpen: (s) => setEndGameCaptain({ ...s }),
        onClose: () => setEndGameCaptain(null),
      });
      captainSystemRef.current = sys;

      const loop = () => {
        if (cancelled || !sys) return;
        sys.update();
        setEndGamePrompt(sys.isPromptVisible());
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };
    attach();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E') return;
      if (captainSystemRef.current?.getState()?.open) return;
      captainSystemRef.current?.tryInteract();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      captainSystemRef.current = null;
    };
  }, [engineReady, mode, heroResolvedName, characterName]);

  // Physics callbacks (bridge engine events → React state)
  const physicsCallbacks: PhysicsCallbacks = {
    onMovementStateChange: (_prev, next) => setMovementState(next),
    onOxygenChange: (o2, max) => setOxygen(max > 0 ? o2 / max : 1),
    onStaminaChange: (stam, max) => setStamina01(max > 0 ? stam / max : 1),
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
      setEngineReady(null);
    };
  }, [
    // Character identity is applied in a separate effect so race/gear refresh does not tear down the zone
    seed, multiplayer, mode, lobbyMapId, sectorId, worldSeed,
    mountainTriad, rtsHeightmap, rtsNatureScatter, biome, onDungeonEnter, campPositionPercent, regrowRegions,
  ]);

  // Grudge6 race prefab + panel meshes + weapon skills (zone / home / lobby)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine?.character || loading) return;
    let cancelled = false;

    (async () => {
      try {
        const { applyGrudge6PlayerToController, hotbarLabelsForHud } = await import(
          '@/lib/loadGrudge6Player'
        );
        const result = await applyGrudge6PlayerToController(engine.character!, {
          characterId,
          raceId,
          classId,
          model3d,
          equipment,
          forceDefault: true,
        });
        if (cancelled) return;
        const labels = hotbarLabelsForHud(result.hotbar);
        setWeaponHotbar(labels.weaponHotbar);
        setClassHotbar(labels.classHotbar);
        if (result.name) setHeroResolvedName(result.name);
        if (result.raceId) {
          // Align camp ally/enemy with race faction when known
          const { RACE_GRUDGE6 } = await import('@shared/fleet');
          const fac = RACE_GRUDGE6[result.raceId]?.faction;
          if (fac) engine.setPlayerFaction(fac);
        }
        // Production editor mode — Build control for Units/Siege/Monsters deploy
        if (editorMode) {
          await engine.character!.setControlMode('build');
        }
      } catch (charErr) {
        console.warn('[Island3D] Grudge6 character apply failed — capsule fallback:', charErr);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [engineReady, loading, characterId, raceId, classId, model3d, equipment, editorMode]);

  // Interact: E — lobby (dock/capture) + zone (dungeons / hidden mountain city door)
  useEffect(() => {
    if (mode !== 'lobby' && mode !== 'zone' && mode !== 'procedural') return;
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

  // Hidden Mountain City (Thornwood / top-right) — prompt + boss HP bar
  useEffect(() => {
    if (loading || mode !== 'zone') return;
    const interval = setInterval(() => {
      const eng = engineRef.current;
      if (!eng?.hiddenMountainCity) {
        setHiddenCityPrompt(null);
        setHiddenCityBossHp(null);
        return;
      }
      setHiddenCityPrompt(eng.hiddenMountainCityPrompt);
      setHiddenCityBossHp(eng.hiddenMountainCityBossHp);
    }, 200);
    return () => clearInterval(interval);
  }, [loading, mode, engineReady]);

  // Danger Room HUD — combat crosshair + soft-lock frame + vitals
  useEffect(() => {
    if (loading) return;
    let raf = 0;
    const tick = () => {
      const ch = engineRef.current?.character;
      const snap = ch?.getCombatHudSnapshot();
      if (snap) {
        setCombatHud(snap);
        setSoftLockFrame(snap.softLock ?? null);
      }
      if (ch) {
        const sm = ch.stateMachine?.getContext?.();
        setPlayVitals({
          hp: sm?.health ?? 100,
          maxHp: sm?.maxHealth ?? 100,
          mana: 50,
          maxMana: 50,
          stamina: ch.getStamina?.() ?? sm?.stamina ?? 100,
          maxStamina: ch.getMaxStamina?.() ?? sm?.maxStamina ?? 100,
        });
      }
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
    engineRef.current?.handleClick(e.clientX, e.clientY, {
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
    });
  }, []);

  // RMB on mature crop: walk-to-harvest (prevents browser context menu)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const ok = engineRef.current?.tryFarmHarvestRmb(e.clientX, e.clientY);
    if (ok) e.stopPropagation();
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
  const isClimbing = movementState === 'climbing';

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
        onContextMenu={handleContextMenu}
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
      ) : loading && mode === 'procedural' ? (
        <HomeIslandLoadscreen
          seed={seed}
          progress={loadProgress}
          biome={biome}
          foundationLabel={
            biome?.includes('forest') || biome?.includes('winter')
              ? 'Ironfang Spire'
              : 'Driftwood Bay'
          }
        />
      ) : loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4" />
            <p className="text-emerald-400 font-medium">
              {mode === 'zone' ? 'Loading zone...' : 'Generating island terrain...'}
            </p>
            <p className="text-gray-400 text-sm mt-1">Seed: {seed}</p>
            {loadProgress > 0 && (
              <p className="text-slate-500 text-xs mt-2 font-mono">{Math.round(loadProgress)}%</p>
            )}
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
                <p className="text-gray-500 text-[10px]">WASD · Space · Tab soft-lock · Z sheath · I inv</p>
              </>
            )}
            {mode === 'lobby' && (
              <>
                <p className="text-gray-300">{stateLabel[movementState] || movementState}</p>
                <p className="text-gray-400">WASD · Tab soft-lock · Z weapons · I inventory</p>
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

          {/* Production unit frame + yellow soft-lock (ui.grudge-studio chrome) */}
          <GrudgeStudioPlayChrome
            characterName={heroResolvedName || characterName || 'Hero'}
            raceId={raceId || 'human'}
            classId={classId || 'warrior'}
            level={1}
            hp={playVitals.hp}
            maxHp={playVitals.maxHp}
            mana={playVitals.mana}
            maxMana={playVitals.maxMana}
            stamina={playVitals.stamina}
            maxStamina={playVitals.maxStamina}
            softLockFrame={softLockFrame}
          />

          {/* Oxygen bar (only when swimming) */}
          <DangerRoomHud hud={combatHud} />

          {/* Full game systems HUD: harvest / combat / build — home island + zone + lobby */}
          {(mode === 'procedural' || mode === 'zone' || mode === 'lobby') && (
            <IslandPlayOverlay
              engine={engineReady}
              session={sessionCtx}
              loadProgress={loadProgress}
              loading={loading}
              characterName={heroResolvedName || characterName}
              movementState={stateLabel[movementState]}
              weaponHotbar={weaponHotbar}
              classHotbar={classHotbar}
              onTickRate={(v) => sessionSend({ type: 'SET_TICK_RATE', tickRate: v })}
              onDayDuration={(v) => sessionSend({ type: 'SET_DAY_DURATION', dayDurationSeconds: v })}
              onCombatToggle={() => sessionSend({ type: 'TOGGLE_COMBAT' })}
            />
          )}

          {/* Thornwood Wilds — Warden of the Hidden Gate + city door */}
          {mode === 'zone' && (hiddenCityPrompt || hiddenCityBossHp) && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center gap-2 max-w-lg px-4">
              {hiddenCityBossHp && (
                <div className="w-72 bg-black/80 border border-purple-700/60 rounded-lg px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-purple-300 mb-1 text-center">
                    Warden of the Hidden Gate
                  </p>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-700 to-red-500 transition-all duration-150"
                      style={{
                        width: `${Math.max(0, (hiddenCityBossHp.hp / hiddenCityBossHp.maxHp) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 text-center mt-1 tabular-nums">
                    {Math.ceil(hiddenCityBossHp.hp).toLocaleString()} / {hiddenCityBossHp.maxHp.toLocaleString()}
                  </p>
                </div>
              )}
              {hiddenCityPrompt && (
                <div className="bg-black/85 border border-amber-700/50 rounded-xl px-4 py-2 text-center text-sm text-amber-100 shadow-lg">
                  {hiddenCityPrompt}
                </div>
              )}
            </div>
          )}

          {/* Production lobby: edit / test / deploy entry chrome */}
          {mode === 'lobby' && (
            <LobbyProductionHUD
              characterName={heroResolvedName || characterName}
              mapLabel="Pirate Open World · Free Port"
              editorMode={editorMode}
              waterLevel={0}
              oceanFloorLevel={-24}
              onOpenEntry={() => {
                window.location.href = '/open-world';
              }}
              onEdit={() => {
                void engineReady?.character?.setControlMode('build');
              }}
              onTest={() => {
                window.open('/editor', '_blank', 'noopener');
              }}
              onDeploy={() => {
                const q = new URLSearchParams({
                  mode: 'lobby',
                  map: lobbyMapId || 'pirate-islands',
                  island: lobbyIslandId || 'grudge-open-world',
                });
                if (characterId) q.set('characterId', characterId);
                window.location.href = `/play?mode=zone&sector=haven_shore&worldSeed=grudge-world-1&characterId=${characterId || ''}`;
              }}
            />
          )}

          {/* End Game captain (level 20+) on faction islands */}
          {mode === 'lobby' && (
            <>
              <EndGameCaptainPrompt visible={endGamePrompt && !endGameCaptain?.open} />
              {endGameCaptain?.open && (
                <EndGameCaptainPanel
                  state={endGameCaptain}
                  onAdvance={() => {
                    const r = captainSystemRef.current?.advanceDialogue();
                    if (r === 'accept') {
                      /* stay on last line until Accept button */
                    } else if (captainSystemRef.current?.getState()) {
                      setEndGameCaptain({ ...captainSystemRef.current.getState()! });
                    }
                  }}
                  onAccept={() => {
                    captainSystemRef.current?.close();
                    setEndGameCaptain(null);
                    const url = endGameCinematicUrl({
                      characterId: characterId || undefined,
                      characterName: heroResolvedName || characterName,
                    });
                    window.location.href = url;
                  }}
                  onClose={() => {
                    captainSystemRef.current?.close();
                    setEndGameCaptain(null);
                  }}
                />
              )}
            </>
          )}

          {/* Lobby minimap — pirate hub + outer faction ring (TI-style disclosure) */}
          {mode === 'lobby' && engineReady && isPanelEnabled('minimap') && (
            <div className="absolute top-3 right-3 z-40 pointer-events-none">
              <LobbyMiniMap
                engine={engineReady}
                defaultFocusId="shipwreck_cove"
                collapsed={!hudFlags.minimapDefaultOpen}
              />
            </div>
          )}

          {/* Zone minimap — islands · enemy ships · camps (Tactical Infinity pattern) */}
          {mode === 'zone' && engineReady && !loading && (
            <ZoneMiniMap
              engine={engineReady}
              size={200}
              position="top-right"
              onExpand={() => {
                window.open('/maps/warlords-canonical-minimap.png', '_blank', 'noopener');
              }}
            />
          )}

          {/* Cinematic flyby + game trailer — all surfaces: zone, lobby, home */}
          {engineReady &&
            !loading &&
            (mode === 'zone' || mode === 'lobby' || mode === 'procedural') &&
            (new URLSearchParams(window.location.search).has('flyby') ||
              new URLSearchParams(window.location.search).has('proof') ||
              new URLSearchParams(window.location.search).has('trailer')) && (
              <ZoneFlybyHUD
                engine={engineReady}
                sectorId={sectorId}
                mode={mode}
              />
            )}

          {/* Authoritative multiplayer chat (Colyseus) */}
          {mode === 'zone' && engineReady && !loading && (
            <ServerChatHUD enabled />
          )}

          {/* Grudge6 lab: HUD · Main Panel · Spellbook · Character · Inventory (all play modes) */}
          {(mode === 'procedural' || mode === 'zone' || mode === 'lobby') &&
            isPanelEnabled('grudge6_shell') && (
            <Grudge6PlayShell
              characterId={characterId}
              characterName={heroResolvedName || characterName}
              compact
            />
          )}

          {/* Boats / dock / capture — open-world pirate lobby */}
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

          {isClimbing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-52">
              <div className="bg-black/70 rounded px-2 py-1.5 border border-amber-700/40">
                <p className="text-[10px] text-amber-300 text-center mb-1">
                  🧗 Climbing · Stamina {Math.round(stamina01 * 100)}%
                </p>
                <p className="text-[9px] text-gray-400 text-center mb-1">
                  W/S up-down · A/D shimmy · X drop
                </p>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${stamina01 * 100}%`,
                      backgroundColor: stamina01 > 0.25 ? '#f59e0b' : '#ef4444',
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

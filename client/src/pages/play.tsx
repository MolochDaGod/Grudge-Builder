/**
 * PlayPage — the main game world.
 *
 * Flow: Connect to WorldRoom → select/auto-join sector → render 3D world → HUD overlay.
 * Uses Island3DEngine in 'zone' mode with Colyseus state sync.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useColyseus, type PlayerInfo } from '@/hooks/use-colyseus';
import { GameHUD } from '@/components/GameHUD';
import { Island3DEngine, type Island3DEngineConfig } from '@/island3d/engine/Island3DEngine';

// Sector biome names (mirrored from server SectorState.ts for display only)
const SECTOR_BIOME_NAMES: Record<string, string> = {
  NW: 'Arid Wasteland', N: 'Highland Plateau', NE: 'Crown Peaks',
  W: 'Industrial Yard', CENTER: 'The Crucible', E: 'Urban Ruins',
  SW: 'Drowned Quarter', S: 'The Pit', SE: 'Grinding March',
};

// ── Default player for testing (will be replaced by character select) ────

const DEFAULT_PLAYER: PlayerInfo = {
  characterName: 'Warlord',
  heroClass: 'warrior',
  heroRace: 'human',
  faction: 'crusade',
  level: 1,
};

const DEFAULT_SECTOR = 'CENTER'; // Start in The Crucible

// ── Component ────────────────────────────────────────────────────

export default function PlayPage() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Island3DEngine | null>(null);
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  // Player info — use localStorage character or default
  const [playerInfo] = useState<PlayerInfo>(() => {
    try {
      const saved = localStorage.getItem('grudge_active_character');
      if (saved) {
        const c = JSON.parse(saved);
        return {
          characterName: c.name || 'Warlord',
          heroClass: c.classId || 'warrior',
          heroRace: c.raceId || 'human',
          faction: c.faction || 'crusade',
          level: c.level || 1,
          characterId: c.id,
        };
      }
    } catch {}
    return DEFAULT_PLAYER;
  });

  // Colyseus connection
  const colyseus = useColyseus(playerInfo);

  // ── Connect on mount ──────────────────────────────────────────

  useEffect(() => {
    colyseus.connect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-join sector once connected ───────────────────────────

  useEffect(() => {
    if (colyseus.connected && !colyseus.sectorId) {
      colyseus.joinSector(DEFAULT_SECTOR);
    }
  }, [colyseus.connected, colyseus.sectorId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initialize 3D engine ──────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || engineRef.current) return;

    const config: Island3DEngineConfig = {
      seed: `sector-${DEFAULT_SECTOR}`,
      canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      mode: 'zone',
      sectorId: DEFAULT_SECTOR,
      worldSeed: 'aethermoor-v1',
      quality: 'medium',
      enableCharacter: true,
      onLoadProgress: (pct) => setLoadProgress(pct),
      dayNight: { cycleDurationMs: 10 * 60 * 1000 }, // 10 min day/night
    };

    const engine = new Island3DEngine(config);
    engineRef.current = engine;

    engine.init().then(() => {
      setLoaded(true);
      engine.start();
    }).catch((err) => {
      console.error('[Play] Engine init failed:', err);
      // Fallback: start with procedural terrain
      engine.start();
      setLoaded(true);
    });

    // Handle resize
    const handleResize = () => {
      engine.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // ── Send position updates at 15Hz ─────────────────────────────

  useEffect(() => {
    if (!colyseus.sectorRoom || !engineRef.current) return;

    moveIntervalRef.current = setInterval(() => {
      const engine = engineRef.current;
      if (!engine?.character) return;

      const pos = engine.character.getPosition();
      const facing = engine.character.getFacing();
      const state = engine.character.isMoving() ? 'moving' : 'idle';

      colyseus.sendMove(pos.x, pos.y, pos.z, facing, state);
    }, 1000 / 15); // 15 Hz

    return () => {
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    };
  }, [colyseus.sectorRoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Get local player state ────────────────────────────────────

  const localPlayer = colyseus.localSessionId
    ? colyseus.players.get(colyseus.localSessionId)
    : null;

  const sectorBiome = colyseus.sectorId
    ? SECTOR_BIOME_NAMES[colyseus.sectorId] || ''
    : '';

  return (
    <div className="fixed inset-0 bg-black">
      {/* Loading screen */}
      {!loaded && (
        <div className="absolute inset-0 z-[100] bg-[#05060c] flex flex-col items-center justify-center">
          <h1
            className="text-4xl font-cinzel font-black tracking-[6px] mb-4"
            style={{
              background: 'linear-gradient(180deg, #f6c945, #fff3c2 50%, #f6c945)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ENTERING WORLD
          </h1>
          <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${loadProgress}%`,
                background: 'linear-gradient(90deg, #f6c945, #fff3c2)',
              }}
            />
          </div>
          <p className="text-white/40 text-sm mt-3 tracking-wider">
            {colyseus.connecting ? 'Connecting to server...' :
             colyseus.connected ? `Joined world · Loading sector ${DEFAULT_SECTOR}...` :
             'Initializing...'}
          </p>
          {colyseus.error && (
            <p className="text-red-400 text-sm mt-2">{colyseus.error}</p>
          )}
        </div>
      )}

      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: loaded ? 'block' : 'none' }}
      />

      {/* Game HUD overlay */}
      {loaded && (
        <GameHUD
          hp={localPlayer?.hp ?? 200}
          maxHp={localPlayer?.maxHp ?? 200}
          mana={localPlayer?.mana ?? 50}
          maxMana={localPlayer?.maxMana ?? 50}
          characterName={playerInfo.characterName}
          heroClass={playerInfo.heroClass}
          level={playerInfo.level}
          sectorId={colyseus.sectorId}
          sectorBiome={sectorBiome}
          playerCount={colyseus.players.size}
          enemyCount={colyseus.enemies.size}
          connected={colyseus.connected}
          connecting={colyseus.connecting}
          error={colyseus.error}
          onSendChat={colyseus.sendChat}
          onDisconnect={() => setLocation('/home')}
        />
      )}
    </div>
  );
}

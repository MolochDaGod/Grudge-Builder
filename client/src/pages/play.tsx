/**
 * PlayPage — the main game world.
 *
 * Flow: Connect to WorldRoom → select/auto-join sector → render 3D world → HUD overlay.
 * Uses Island3DEngine in 'zone' mode with Colyseus state sync.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useColyseus, type PlayerInfo } from '@/hooks/use-colyseus';
import { GameHUD } from '@/components/GameHUD';
import { Island3DEngine, type Island3DEngineConfig } from '@/island3d/engine/Island3DEngine';
import { RemotePlayerManager, type RemotePlayerData } from '@/island3d/sync/RemotePlayerManager';
import { BuildModePanel } from '@/components/BuildModePanel';
import { characterAPI } from '@/lib/api';
import { CLASS_WEAPON_MAP } from '@/lib/modelManifest';
import type { CreatureLootEvent } from '@/island3d/creatures/CreatureManager';

const SECTOR_BIOME_NAMES: Record<string, string> = {
  NW: 'Arid Wasteland', N: 'Highland Plateau', NE: 'Crown Peaks',
  W: 'Industrial Yard', CENTER: 'The Crucible', E: 'Urban Ruins',
  SW: 'Drowned Quarter', S: 'The Pit', SE: 'Grinding March',
};

const DEFAULT_SECTOR = 'CENTER';

// ── Component ────────────────────────────────────────────────────

export default function PlayPage() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Island3DEngine | null>(null);
  const remotePlayersRef = useRef<RemotePlayerManager | null>(null);
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [lootNotification, setLootNotification] = useState<string | null>(null);
  const [buildPlacing, setBuildPlacing] = useState(false);
  const [buildSelectedAsset, setBuildSelectedAsset] = useState<string | null>(null);

  // Player info — loaded from backend DB (no hardcoded fallback)
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [characterLoaded, setCharacterLoaded] = useState(false);

  // Load the active character — redirect to creation if none exists
  useEffect(() => {
    async function loadCharacter() {
      try {
        const grudgeId = localStorage.getItem('grudge_account_id') || 'guest';
        const activeId = localStorage.getItem(`gruda_active_character_${grudgeId}`) ||
          localStorage.getItem('grudge_active_character') ||
          localStorage.getItem('gruda_active_character_guest');

        if (!activeId) {
          console.warn('[Play] No active character — redirecting to creation');
          setLocation('/create-character');
          return;
        }

        const char = await characterAPI.get(activeId);
        const model3d = (char as any).model3d || {};
        setPlayerInfo({
          characterName: char.name,
          heroClass: char.classId,
          heroRace: char.raceId,
          faction: (char as any).faction || 'crusade',
          level: char.level,
          characterId: char.id,
          accountId: (char as any).accountId,
          baseModelId: model3d.baseModelId || char.raceId || 'human',
          equippedMeshes: model3d.equippedMeshes || {},
          weaponSlots: model3d.weaponSlots || {},
          skinColor: model3d.skinColor || '#ffffff',
          armorColor: model3d.armorColor || '#ffffff',
          equippedWeaponType: CLASS_WEAPON_MAP[char.classId] || 'sword-shield',
        });
        console.log(`[Play] Loaded character: ${char.name} (${char.raceId} ${char.classId})`);
      } catch (err) {
        console.warn('[Play] Could not load character — redirecting:', err);
        setLocation('/create-character');
        return;
      }
      setCharacterLoaded(true);
    }
    loadCharacter();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Colyseus connection
  const colyseus = useColyseus(playerInfo);

  // ── Connect after character is loaded ───────────────────────────────

  useEffect(() => {
    if (characterLoaded && playerInfo) {
      colyseus.connect();
    }
  }, [characterLoaded, playerInfo]); // eslint-disable-line react-hooks/exhaustive-deps

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

      // Wire creature loot notifications
      if (engine.creatures) {
        engine.creatures.onLootDrop = (event: CreatureLootEvent) => {
          const items = event.loot.map(l => `${l.name} ×${l.quantity}`).join(', ');
          setLootNotification(`${event.creatureName}: ${items}`);
          setTimeout(() => setLootNotification(null), 4000);
        };
      }
    }).catch((err) => {
      console.error('[Play] Engine init failed:', err);
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

  // ── Send position updates at 15Hz ─────────────────────────

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

  // ── Sync remote players from Colyseus state ────────────────

  useEffect(() => {
    if (!colyseus.sectorRoom || !engineRef.current || !colyseus.localSessionId) return;

    // Create RemotePlayerManager bound to the engine's scene
    const engine = engineRef.current;
    const rpm = new RemotePlayerManager(
      engine.getScene(),
      colyseus.localSessionId,
    );
    remotePlayersRef.current = rpm;

    // Register RemotePlayerManager in the engine's game loop
    const unregister = engine.onUpdate((dt) => rpm.update(dt));

    // Listen for player add/remove on the SectorRoom state
    const room = colyseus.sectorRoom;

    room.state.players.onAdd((player: any, sessionId: string) => {
      if (sessionId === colyseus.localSessionId) return;
      rpm.addPlayer(sessionId, {
        id: player.id,
        characterName: player.characterName,
        heroClass: player.heroClass,
        heroRace: player.heroRace,
        faction: player.faction,
        level: player.level,
        x: player.x, y: player.y, z: player.z,
        facing: player.facing,
        state: player.state,
        hp: player.hp, maxHp: player.maxHp,
        baseModelId: player.baseModelId,
        equippedMeshJson: player.equippedMeshJson,
        weaponSlotsJson: player.weaponSlotsJson,
        skinColor: player.skinColor,
        armorColor: player.armorColor,
        equippedWeaponType: player.equippedWeaponType,
      });

      // Listen for property changes on this player
      player.onChange(() => {
        rpm.updatePlayer(sessionId, {
          x: player.x, y: player.y, z: player.z,
          facing: player.facing,
          state: player.state,
          hp: player.hp, maxHp: player.maxHp,
        });
      });
    });

    room.state.players.onRemove((_player: any, sessionId: string) => {
      rpm.removePlayer(sessionId);
    });

    // ── Sync remote buildings from room state ─────────────────────
    room.state.buildings?.onAdd?.((building: any, id: string) => {
      // Skip our own placements (already rendered locally)
      if (building.ownerId === colyseus.localSessionId) return;
      // Place a prop in the local engine for this remote building
      if (engine.building) {
        engine.building.startPropPlacement(building.assetId);
        // Force position and confirm
        if (engine.building['propGhost']) {
          engine.building['propGhost'].position.set(building.x, building.y, building.z);
          engine.building['propGhost'].rotation.y = building.rotation;
          engine.building['propRotation'] = building.rotation;
          engine.building['propValid'] = true;
          engine.building.confirmPropPlacement();
        }
      }
    });

    room.state.buildings?.onRemove?.((building: any, id: string) => {
      if (building.ownerId === colyseus.localSessionId) return;
      // Find and remove the matching local prop
      const props = engine.building?.getAllProps() || [];
      const match = props.find(p => p.assetId === building.assetId &&
        Math.abs(p.position.x - building.x) < 0.5 &&
        Math.abs(p.position.z - building.z) < 0.5);
      if (match && engine.building) {
        engine.building.removeProp(match.id);
      }
    });

    return () => {
      unregister();
      rpm.dispose();
      remotePlayersRef.current = null;
    };
  }, [colyseus.sectorRoom, colyseus.localSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        onClick={(e) => {
          const engine = engineRef.current;
          if (!engine) return;
          if (buildPlacing && engine.building) {
            const result = engine.building.confirmPropPlacement();
            if (result) {
              // Send to Colyseus for sync
              const pos = engine.building.getAllProps().find(p => p.id === result.id);
              if (pos && colyseus.sectorRoom) {
                colyseus.sectorRoom.send('place_building', {
                  id: result.id,
                  assetId: result.assetId,
                  x: pos.position.x,
                  y: pos.position.y,
                  z: pos.position.z,
                  rotation: pos.rotation,
                });
              }
              setBuildPlacing(false);
              setBuildSelectedAsset(null);
            }
          } else {
            engine.handleClick(e.clientX, e.clientY);
          }
        }}
        onMouseMove={(e) => {
          const engine = engineRef.current;
          if (!engine) return;
          if (buildPlacing && engine.building) {
            engine.building.updatePropGhostPosition(e.clientX, e.clientY, e.currentTarget);
          } else {
            engine.handleMouseMove(e.clientX, e.clientY);
          }
        }}
      />

      {/* Loot notification */}
      {lootNotification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-black/80 backdrop-blur-sm rounded-xl border border-amber-600/30 px-5 py-2.5 text-amber-300 text-sm font-bold tracking-wider">
            🎯 {lootNotification}
          </div>
        </div>
      )}

      {/* Build Mode Panel */}
      {loaded && (
        <BuildModePanel
          isPlacing={buildPlacing}
          selectedAssetId={buildSelectedAsset}
          onSelectItem={(assetId) => {
            const engine = engineRef.current;
            if (!engine?.building) return;
            engine.building.startPropPlacement(assetId);
            setBuildPlacing(true);
            setBuildSelectedAsset(assetId);
          }}
          onCancel={() => {
            const engine = engineRef.current;
            engine?.building?.cancelPropPlacement();
            setBuildPlacing(false);
            setBuildSelectedAsset(null);
          }}
        />
      )}

      {/* Game HUD overlay */}
      {loaded && playerInfo && (
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

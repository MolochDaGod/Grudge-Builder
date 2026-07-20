/**
 * PlayPage — the main game world.
 *
 * Flow: Connect to WorldRoom → select/auto-join sector → render 3D world → HUD overlay.
 * Uses Island3DEngine in 'zone' mode with Colyseus state sync.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useColyseus, type PlayerInfo } from '@/hooks/use-colyseus';
import { syncHarvestNodeDepleted } from '@/island3d/harvest/ZoneHarvestSpawner';
import { GameHUD } from '@/components/GameHUD';
import { Island3DEngine, type Island3DEngineConfig } from '@/island3d/engine/Island3DEngine';
import { RemotePlayerManager, type RemotePlayerData } from '@/island3d/sync/RemotePlayerManager';
import { ModePlayHUD } from '@/island3d/render/ModePlayHUD';
import { characterToPlayerInfo, resolveActiveCharacterForPlay } from '@/lib/playHub';
import type { CreatureLootEvent } from '@/island3d/creatures/CreatureManager';
import { WarlordsPvpLoadscreen } from '@/components/WarlordsPvpLoadscreen';
import type { Character } from '@/lib/characterManager';
import {
  resolvePlaySectorFromUrl,
  resolvePlayEngineMode,
  resolveWorldSeedFromUrl,
  applyCharacterFactionToEngine,
  getStarterSectorId,
  fetchWarlordsZones,
  verifyMapDeploymentTruth,
  resolveDeployableSectorId,
} from '@/lib/warlordsWorldApi';
import { getSectorById } from '@shared/definitions/worldMapSectors';
import { buildZoneDungeonUrl } from '@/lib/homeIslandDungeon';

const TEST_PLAY_TERRAIN_SEED = 'grudge-test-play-v1';

function getPlaySectorFromUrl(): string {
  return resolvePlaySectorFromUrl();
}

function getWorldSeedFromUrl(): string {
  return resolveWorldSeedFromUrl();
}

/** /play → zone open world; /test-play or mode=procedural → test terrain */
function getPlayEngineMode(): 'procedural' | 'zone' {
  return resolvePlayEngineMode(window.location.pathname, window.location.search);
}

function getTestPlayTerrainSeed(characterId?: string | null): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('seed') || (characterId ? `test-play-${characterId}` : TEST_PLAY_TERRAIN_SEED);
}

// ── Component ────────────────────────────────────────────────────

export default function PlayPage() {
  const [, setLocation] = useLocation();
  const activeSector = getPlaySectorFromUrl();
  const worldSeed = getWorldSeedFromUrl();
  const engineMode = getPlayEngineMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Island3DEngine | null>(null);
  const remotePlayersRef = useRef<RemotePlayerManager | null>(null);
  const sendHarvestRef = useRef<(nodeId: string, professionId: string) => void>(() => {});
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const characterRef = useRef<Character | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [lootNotification, setLootNotification] = useState<string | null>(null);
  const [buildPlacing, setBuildPlacing] = useState(false);
  const [buildSelectedAsset, setBuildSelectedAsset] = useState<string | null>(null);

  // Player info — loaded from backend DB (no hardcoded fallback)
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [characterLoaded, setCharacterLoaded] = useState(false);

  // Load real DB character + warm zone catalog
  useEffect(() => {
    async function loadCharacter() {
      // Warm open-world catalog + assert ObjectStore ↔ WORLD_SECTORS truth
      void verifyMapDeploymentTruth().then((report) => {
        if (!report.aligned) {
          console.warn(
            `[Play] Map truth drift (${report.mismatches.length}) — terrain still uses WORLD_SECTORS`,
            report.mismatches,
          );
        }
      });
      void fetchWarlordsZones().then((doc) => {
        console.log(
          `[Play] Warlords zones ready: ${doc.zones?.length ?? 0} sectors · seed ${doc.worldSeedDefault ?? worldSeed} · sector=${resolveDeployableSectorId(activeSector)}`,
        );
      });

      const params = new URLSearchParams(window.location.search);
      const gcsHandoff = params.get('from') === 'gcs' && params.get('characterId');
      // Trailer / flyby / proof: never dump users into foundry create loop
      const cinematicGuest =
        params.has('trailer') ||
        params.has('flyby') ||
        params.has('proof') ||
        params.get('guest') === '1';

      const handoffId = params.get('characterId');
      let char = await resolveActiveCharacterForPlay(handoffId);
      if (!char && gcsHandoff) {
        await new Promise((r) => setTimeout(r, 800));
        char = await resolveActiveCharacterForPlay(handoffId);
      }
      if (!char && cinematicGuest) {
        console.info('[Play] Cinematic guest (trailer/flyby) — skip create-character');
        char = {
          id: 'guest-trailer',
          name: 'Trailer Guest',
          raceId: 'human',
          classId: 'warrior',
          level: 20,
          accountId: 'guest',
          equipment: {},
          model3d: {
            baseModelId: 'human',
            weaponSlots: {},
            equippedMeshes: {},
          },
        } as Character;
      }
      if (!char) {
        console.warn('[Play] No roster character — redirecting to create flow');
        setLocation('/create-character');
        return;
      }

      characterRef.current = char;
      setPlayerInfo(characterToPlayerInfo(char));
      console.log(
        `[Play] Loaded character: ${char.name} (${char.raceId} ${char.classId}) · mode=${engineMode} sector=${activeSector}`,
      );
      setCharacterLoaded(true);
    }
    loadCharacter();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load 3D model + apply faction camps once world + character are ready
  useEffect(() => {
    if (!loaded || !playerInfo || !engineRef.current) return;
    applyCharacterFactionToEngine(engineRef.current, playerInfo.faction);
    if (!engineRef.current.character) return;
    const char = characterRef.current;
    engineRef.current.character.loadCharacterFromManifest(
      playerInfo.heroRace,
      playerInfo.heroClass,
      playerInfo.characterId,
      undefined,
      {
        equippedMeshes: playerInfo.equippedMeshes,
        weaponSlots: playerInfo.weaponSlots,
        skinColor: playerInfo.skinColor,
        armorColor: playerInfo.armorColor,
        baseModelId: playerInfo.baseModelId,
      },
      char?.equipment,
    ).catch(() => {});
  }, [loaded, playerInfo]);

  // Live mesh refresh when character-builder updates equipment/model3d
  useEffect(() => {
    const onUpdated = (ev: Event) => {
      const char = (ev as CustomEvent).detail?.character as Character | undefined;
      if (!char || !engineRef.current?.character) return;
      characterRef.current = char;
      void engineRef.current.character.refreshAppearance(char.equipment, char.model3d);
    };
    window.addEventListener('grudge:character:updated', onUpdated);
    return () => window.removeEventListener('grudge:character:updated', onUpdated);
  }, []);

  // Colyseus connection
  const colyseus = useColyseus(playerInfo);
  sendHarvestRef.current = colyseus.sendHarvest;

  // ── Connect after character is loaded ───────────────────────────────

  useEffect(() => {
    if (characterLoaded && playerInfo) {
      colyseus.connect();
    }
  }, [characterLoaded, playerInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-join sector once connected ───────────────────────────

  useEffect(() => {
    if (colyseus.connected && !colyseus.sectorId) {
      colyseus.joinSector(activeSector, worldSeed);
    }
  }, [colyseus.connected, colyseus.sectorId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initialize 3D engine ──────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || engineRef.current) return;

    const terrainSeed = getTestPlayTerrainSeed(characterRef.current?.id);
    const sector = engineMode === 'zone' ? resolveDeployableSectorId(activeSector) : undefined;
    // Prefer bundled WORLD_SECTORS (generation SSOT); reject unknown ids early
    if (engineMode === 'zone' && sector && !getSectorById(sector)) {
      console.error(`[Play] Sector not in WORLD_SECTORS: ${sector}`);
    }
    const config: Island3DEngineConfig = {
      seed: engineMode === 'zone' ? `sector-${sector}` : terrainSeed,
      canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      mode: engineMode,
      sectorId: sector,
      worldSeed: engineMode === 'zone' ? worldSeed : undefined,
      quality: 'medium',
      enableCharacter: true,
      accountId: characterRef.current
        ? (characterRef.current as Character & { accountId?: string }).accountId
        : undefined,
      captainId: characterRef.current?.id ?? null,
      onLoadProgress: (pct) => setLoadProgress(pct),
      dayNight: { dayDurationSeconds: 10 * 60 },
      onHarvest: ({ nodeId, resourceType }) => {
        if (!nodeId) return;
        sendHarvestRef.current(nodeId, resourceType);
        setLootNotification(`Harvested ${resourceType}`);
        setTimeout(() => setLootNotification(null), 3000);
      },
      onDungeonEnter: (dungeonId, dungeonName) => {
        const city = new URLSearchParams(window.location.search).get('city');
        setLootNotification(`Entering ${dungeonName}...`);
        setLocation(
          buildZoneDungeonUrl(
            dungeonId,
            dungeonName,
            sector || activeSector,
            worldSeed,
            city,
          ),
        );
      },
    };

    const engine = new Island3DEngine(config);
    engineRef.current = engine;

    engine.init().then(() => {
      // Faction camps: same faction ally, others enemy
      const faction =
        playerInfo?.faction ||
        (characterRef.current as Character & { faction?: string } | null)?.faction ||
        'crusade';
      applyCharacterFactionToEngine(engine, faction);

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

  // ── Sync zone harvest node depleted state from SectorRoom ─────

  useEffect(() => {
    const engine = engineRef.current;
    const room = colyseus.sectorRoom;
    if (!engine || !room) return;

    const applyNode = (node: any, id: string) => {
      syncHarvestNodeDepleted(engine, id, node.depleted);
    };

    room.state.harvestNodes?.onAdd?.((node: any, id: string) => {
      applyNode(node, id);
      node.onChange(() => applyNode(node, id));
    });

    room.state.harvestNodes?.forEach?.((node: any, id: string) => {
      applyNode(node, id);
    });
  }, [colyseus.sectorRoom]);

  // ── Get local player state ────────────────────────────────────

  const localPlayer = colyseus.localSessionId
    ? colyseus.players.get(colyseus.localSessionId)
    : null;

  const sectorDef = getSectorById(activeSector);
  const sectorBiome = sectorDef
    ? `${sectorDef.name} · ${sectorDef.biome}`
    : colyseus.sectorId || getStarterSectorId();

  return (
    <div className="fixed inset-0 bg-black">
      {/* PvP world-entry loadscreen */}
      {!loaded && (
        <WarlordsPvpLoadscreen
          progress={loadProgress}
          label={
            colyseus.connecting ? 'Connecting to server...' :
            colyseus.connected ? `Joined world · Loading sector ${activeSector}...` :
            'Initializing...'
          }
        >
          <h1
            className="text-4xl font-cinzel font-black tracking-[6px]"
            style={{
              background: 'linear-gradient(180deg, #f6c945, #fff3c2 50%, #f6c945)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ENTERING WORLD
          </h1>
          {colyseus.error && (
            <p className="text-red-400 text-sm mt-2">{colyseus.error}</p>
          )}
        </WarlordsPvpLoadscreen>
      )}

      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: loaded ? 'block' : 'none' }}
        onClick={(e) => {
          const engine = engineRef.current;
          if (!engine) return;
          const wasProp = engine.building?.isPropPlacing;
          const propCountBefore = engine.building?.propCount ?? 0;
          engine.handleClick(e.clientX, e.clientY, {
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
          });
          // Sync placed prop to Colyseus if a prop was just placed
          if (wasProp && engine.building) {
            const props = engine.building.getAllProps();
            if (props.length > propCountBefore) {
              const last = props[props.length - 1];
              if (colyseus.sectorRoom) {
                colyseus.sectorRoom.send('place_building', {
                  id: last.id,
                  assetId: last.assetId,
                  x: last.position.x,
                  y: last.position.y,
                  z: last.position.z,
                  rotation: last.rotation,
                });
              }
              setBuildSelectedAsset(last.assetId);
              setBuildPlacing(true); // continuous place keeps ghost
            }
          }
        }}
        onMouseMove={(e) => {
          engineRef.current?.handleMouseMove(e.clientX, e.clientY);
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

      {/* Dual-mode UI: combat / harvest (build via R radial hammer) */}
      {loaded && (
        <ModePlayHUD
          engine={engineRef.current}
          mode={buildPlacing ? 'build' : 'combat'}
          onModeChange={(m) => {
            // ModePlayHUD + engine own equip/sheath/tool; sync build-place flag
            if (m === 'combat' || m === 'harvest') {
              setBuildPlacing(false);
              setBuildSelectedAsset(null);
            } else if (m === 'build') {
              setBuildPlacing(true);
            }
          }}
          characterName={playerInfo?.characterName}
          hp={localPlayer?.hp ?? 200}
          maxHp={localPlayer?.maxHp ?? 200}
          level={playerInfo?.level ?? 1}
          selectedBuildId={buildSelectedAsset}
          isPlacing={buildPlacing}
          onBuildSelect={(id) => {
            setBuildPlacing(true);
            setBuildSelectedAsset(id);
          }}
          onBuildCancel={() => {
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

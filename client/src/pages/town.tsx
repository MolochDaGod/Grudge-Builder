/**
 * TownPage — faction town instance.
 *
 * Loads the medieval town GLB, blends terrain edges, populates NPCs,
 * connects to TownRoom via Colyseus for multiplayer sync.
 *
 * Route: /town?sector=NW (sector determines which faction town)
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import * as THREE from 'three';
import { Island3DEngine, type Island3DEngineConfig } from '@/island3d/engine/Island3DEngine';
import { loadTownScene, type TownSceneResult } from '@/island3d/town/TownSceneLoader';
import { createTownNPCs, type TownNPCManagerResult } from '@/island3d/town/TownNPCManager';
import { TownTerrainBlender } from '@/island3d/town/TownTerrainBlender';
import { TownNPCController } from '@/island3d/ai/TownNPCController';
import { RemotePlayerManager } from '@/island3d/sync/RemotePlayerManager';
import { useTownRoom } from '@/hooks/use-town-room';
import { characterAPI } from '@/lib/api';
import { getTownForSector, type FactionTown } from '@shared/definitions/factionTowns';
import { playNPCFarewell, playNPCGreeting } from '@/lib/dialogueAudioManager';
import type { SectorPosition } from '@shared/definitions/lore';
import { MapPin, LogOut } from 'lucide-react';
import { preloadIslandResources } from '@/island3d/objects/IslandResourceLoader';
import {
  spawnTownHarvestNodes,
  appendHarvestSpawn,
  syncHarvestNodeDepleted,
  TOWN_HARVEST_DEFAULTS,
  type TownHarvestNodeSync,
} from '@/island3d/harvest/ZoneHarvestSpawner';

// ── Component ────────────────────────────────────────────────────

export default function TownPage() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Island3DEngine | null>(null);
  const npcControllerRef = useRef<TownNPCController | null>(null);
  const rpmRef = useRef<RemotePlayerManager | null>(null);
  const blenderRef = useRef<TownTerrainBlender | null>(null);
  const onHarvestRef = useRef<(event: { nodeId?: string; resourceType: string }) => void>(() => {});
  const spawnedHarvestIdsRef = useRef<Set<string>>(new Set());

  const [loaded, setLoaded] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [interactingNpc, setInteractingNpc] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState('Traveler');
  const [faction, setFaction] = useState('crusade');

  // Get sector from URL query
  const params = new URLSearchParams(window.location.search);
  const sectorId = (params.get('sector') || 'NW') as SectorPosition;
  const townDef = getTownForSector(sectorId);

  // Colyseus town room
  const town = useTownRoom(
    townDef ? { sectorId, characterName, faction } : null,
  );

  // ── Load character data ────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const grudgeId = localStorage.getItem('grudge_account_id') || 'guest';
        const activeId = localStorage.getItem(`gruda_active_character_${grudgeId}`) ||
          localStorage.getItem('grudge_active_character');
        if (activeId) {
          const char = await characterAPI.get(activeId);
          setCharacterName(char.name);
          setFaction((char as any).faction || 'crusade');
        }
      } catch {}
    }
    load();
  }, []);

  // ── Initialize 3D engine + town scene ──────────────────────────

  useEffect(() => {
    if (!canvasRef.current || engineRef.current || !townDef) return;

    const config: Island3DEngineConfig = {
      seed: `town-${sectorId}`,
      canvas: canvasRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      mode: 'procedural',
      quality: 'medium',
      enableCharacter: true,
      onHarvest: (evt) => onHarvestRef.current(evt),
    };

    const engine = new Island3DEngine(config);
    engineRef.current = engine;

    engine.init().then(async () => {
      await preloadIslandResources().catch(() => undefined);

      // Load town GLB scene
      const townScene = await loadTownScene(townDef);
      engine.getScene().add(townScene.root);

      // Blend terrain edges
      if (engine.terrain?.terrainMesh) {
        const blender = new TownTerrainBlender(engine.getScene(), engine.terrain.terrainMesh);
        const bounds = townDef.navmesh.bounds;
        const townRadius = Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]) / 2;
        blender.build({
          center: new THREE.Vector3(townDef.modelOffset[0], 0, townDef.modelOffset[2]),
          innerRadius: townRadius,
          outerRadius: townRadius * 1.5,
          townGroundY: 0,
          townColor: getGroundColorForFaction(townDef.factionId),
          terrainColor: 0x5a8050,
        });
        blenderRef.current = blender;
      }

      // Initialize NPC controller with A* pathfinding
      const npcController = new TownNPCController(engine.getScene(), townDef);
      await npcController.init();
      npcControllerRef.current = npcController;

      // Register NPC update in engine loop
      engine.onUpdate((dt) => {
        if (npcControllerRef.current) {
          // Sync NPC positions from server if connected
          if (town.connected && town.npcs.size > 0) {
            npcControllerRef.current.syncFromServer(town.npcs);
          }
          // Update player position for face-toward logic
          if (engine.character) {
            npcControllerRef.current.setPlayerPosition(engine.character.getPosition());
          }
          npcControllerRef.current.update(dt);
        }
      });

      // Load character model
      if (engine.character) {
        const raceId = localStorage.getItem('grudge_hero_race') || 'human';
        const classId = localStorage.getItem('grudge_hero_class') || 'warrior';
        engine.character.loadCharacterFromManifest(raceId, classId).catch(() => {});

        // Position at first player spawn
        const playerSpawn = townDef.spawnPoints.find(sp => sp.category === 'playerSpawn');
        if (playerSpawn) {
          engine.character.model.position.set(...playerSpawn.position);
        }
      }

      setLoaded(true);
      engine.start();
    }).catch((err) => {
      console.error('[Town] Init failed:', err);
      engine.start();
      setLoaded(true);
    });

    const handleResize = () => engine.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      blenderRef.current?.dispose();
      engine.dispose();
      engineRef.current = null;
    };
  }, [townDef?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync remote players ────────────────────────────────────────

  useEffect(() => {
    if (!town.connected || !engineRef.current || !town.localSessionId) return;
    const engine = engineRef.current;

    const rpm = new RemotePlayerManager(engine.getScene(), town.localSessionId);
    rpmRef.current = rpm;
    const unregister = engine.onUpdate((dt) => rpm.update(dt));

    // Add remote players from town room state
    for (const [sid, player] of town.players) {
      if (sid === town.localSessionId) continue;
      rpm.addPlayer(sid, {
        id: player.id,
        characterName: player.characterName,
        heroClass: '', heroRace: '', faction: player.faction,
        level: 1,
        x: player.x, y: player.y, z: player.z,
        facing: player.facing,
        state: player.state,
        hp: 200, maxHp: 200,
        baseModelId: 'human',
        equippedMeshJson: '{}', weaponSlotsJson: '{}',
        skinColor: '#ffffff', armorColor: '#ffffff',
        equippedWeaponType: 'sword-shield',
      });
    }

    return () => {
      unregister();
      rpm.dispose();
      rpmRef.current = null;
    };
  }, [town.connected, town.localSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send position updates ──────────────────────────────────────

  useEffect(() => {
    if (!town.connected || !engineRef.current) return;
    const interval = setInterval(() => {
      const engine = engineRef.current;
      if (!engine?.character) return;
      const pos = engine.character.getPosition();
      const facing = engine.character.getFacing();
      town.sendMove(pos.x, pos.y, pos.z, facing);
    }, 100);
    return () => clearInterval(interval);
  }, [town.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  const showNotification = useCallback((text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // ── Town harvest nodes (meshes + FX) ───────────────────────────

  const spawnTownNodes = useCallback((nodes: Iterable<TownHarvestNodeSync>) => {
    const engine = engineRef.current;
    if (!engine || !townDef) return;

    const pending = [...nodes].filter((n) => !spawnedHarvestIdsRef.current.has(n.id));
    if (pending.length === 0) return;

    const result = spawnTownHarvestNodes(
      engine.getScene(),
      townDef.modelOffset,
      pending,
      engine.terrain?.terrainMesh ?? null,
    );
    appendHarvestSpawn(engine, result);
    for (const n of pending) spawnedHarvestIdsRef.current.add(n.id);
  }, [townDef]);

  useEffect(() => {
    if (!loaded || !townDef) return;

    const nodes = town.harvestNodes.size > 0
      ? town.harvestNodes.values()
      : TOWN_HARVEST_DEFAULTS;
    spawnTownNodes(nodes);
  }, [loaded, townDef, town.harvestNodes, spawnTownNodes]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    for (const node of town.harvestNodes.values()) {
      syncHarvestNodeDepleted(engine, node.id, node.depleted);
    }
  }, [town.harvestNodes]);

  useEffect(() => {
    onHarvestRef.current = ({ nodeId, resourceType }) => {
      if (!nodeId) return;
      town.harvest(nodeId);
      showNotification(`Harvested ${resourceType}`);
    };
  });

  const handleInteract = (npcId: string) => {
    town.interact(npcId);
    setInteractingNpc(npcId);
    const npc = town.npcs.get(npcId);
    if (npc) showNotification(`Speaking with ${npc.name}...`);
    const npcDef = townDef?.npcs.find((n) => n.id === npcId);
    if (npcDef) playNPCGreeting(npcDef);
  };

  const handleEndInteract = () => {
    if (interactingNpc && townDef) {
      const npcDef = townDef.npcs.find((n) => n.id === interactingNpc);
      if (npcDef) playNPCFarewell(npcDef);
    }
    town.endInteract();
    setInteractingNpc(null);
  };

  if (!townDef) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <p>No town found for sector {sectorId}. <button onClick={() => setLocation('/play')} className="text-amber-400 underline">Return to world</button></p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onClick={(e) => engineRef.current?.handleClick(e.clientX, e.clientY)}
      />

      {loaded && (
        <>
          {/* Town header */}
          <div className="absolute top-4 left-4 z-40">
            <div className="bg-black/70 backdrop-blur-sm rounded-xl border border-white/10 p-3 w-64">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span className="text-white text-sm font-bold font-cinzel">{townDef.name}</span>
              </div>
              <p className="text-white/40 text-[10px]">{townDef.subtitle}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                <span>{town.players.size} players</span>
                <span>{townDef.npcs.length} NPCs</span>
                <span className={town.connected ? 'text-green-400' : 'text-red-400'}>
                  {town.connected ? '● Connected' : '● Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
            <div className="flex gap-2 bg-black/60 backdrop-blur-sm rounded-2xl border border-white/10 p-2">
              <button
                onClick={() => setLocation('/play')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 transition-colors text-xs"
              >
                <LogOut className="w-4 h-4" /> LEAVE TOWN
              </button>
            </div>
          </div>

          {/* Notification */}
          {notification && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-black/80 backdrop-blur-sm rounded-xl border border-amber-600/30 px-5 py-2.5 text-amber-300 text-sm font-bold tracking-wider">
                {notification}
              </div>
            </div>
          )}

          {/* NPC interaction panel */}
          {interactingNpc && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 w-96">
              <div className="bg-black/90 backdrop-blur-sm rounded-xl border border-amber-500/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-400 font-cinzel font-bold">
                    {town.npcs.get(interactingNpc)?.name || 'NPC'}
                  </span>
                  <button onClick={handleEndInteract} className="text-white/30 hover:text-white text-xs">
                    Close
                  </button>
                </div>
                <p className="text-white/60 text-sm">
                  {town.npcs.get(interactingNpc)?.role === 'merchant'
                    ? 'Browse my wares, traveler.'
                    : town.npcs.get(interactingNpc)?.role === 'questGiver'
                    ? 'I have a task for you, if you are willing.'
                    : 'Welcome to our town.'}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Loading */}
      {!loaded && (
        <div className="absolute inset-0 z-[100] bg-[#05060c] flex flex-col items-center justify-center">
          <h1 className="text-2xl font-cinzel font-black tracking-[4px] mb-3 text-amber-400">
            {townDef.name.toUpperCase()}
          </h1>
          <p className="text-white/30 text-xs mb-4">{townDef.subtitle}</p>
          <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-amber-500 animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}
    </div>
  );
}

function getGroundColorForFaction(factionId: string): number {
  switch (factionId) {
    case 'crusade': return 0xc4956a;
    case 'legion': return 0x2a1a10;
    case 'fabled': return 0x6b8e6b;
    default: return 0x888888;
  }
}

/**
 * HomeIslandPage — persistent home island with RTS Grudge 3-state gameplay UI.
 *
 * Harvest | Combat | Build modes (TutorialGameplayHUD), Grudge6 character,
 * Colyseus HomeIslandRoom sync, persisted island seed from Railway.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Client, Room } from 'colyseus.js';
import { Island3DEngine, type Island3DEngineConfig } from '@/island3d/engine/Island3DEngine';
import { RemotePlayerManager } from '@/island3d/sync/RemotePlayerManager';
import { TutorialGameplayHUD, type ControlMode } from '@/components/TutorialGameplayHUD';
import { characterAPI } from '@/lib/api';
import { getColyseusEndpoint } from '@/lib/colyseusEndpoint';
import {
  buildGrudge6LoadConfig,
  getWeaponTypeForMode,
  type Grudge6LoadConfig,
} from '@/lib/grudge6Character';
import {
  buildClassHotbar,
  buildWeaponHotbar,
  getActiveGatheringProfessions,
  type HotbarSlot,
} from '@/lib/tutorialSkills';
import {
  addProfessionXp,
  RESOURCE_TO_PROFESSION,
  getGatherXp,
} from '@/lib/professionSystem';
import type { Character } from '@/lib/characterManager';
import { fetchCurrentHomeIsland, type HomeIslandDto } from '@/lib/homeIslandApi';
import { clearTopDownCache } from '@/island3d/render/IslandTopDownCapture';
import { Home } from 'lucide-react';

export default function HomeIslandPage() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Island3DEngine | null>(null);
  const roomRef = useRef<Room | null>(null);
  const rpmRef = useRef<RemotePlayerManager | null>(null);
  const characterRef = useRef<Character | null>(null);
  const loadConfigRef = useRef<Grudge6LoadConfig | null>(null);
  const nodesRef = useRef<Map<string, { id: string; type: string; x: number; z: number; depleted: boolean }>>(new Map());

  const [loaded, setLoaded] = useState(false);
  const [islandDto, setIslandDto] = useState<HomeIslandDto | null>(null);
  const [islandSeed, setIslandSeed] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [hp, setHp] = useState(200);
  const [maxHp] = useState(200);
  const [playMode, setPlayMode] = useState<ControlMode>('harvest');
  const [resources, setResources] = useState<Record<string, number>>({});
  const [professions, setProfessions] = useState(getActiveGatheringProfessions({}));
  const [notification, setNotification] = useState<string | null>(null);
  const [allyMessage, setAllyMessage] = useState<string | null>(null);
  const [hasWeapon, setHasWeapon] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const [buildingCount, setBuildingCount] = useState(0);

  const [characterName, setCharacterName] = useState('Islander');
  const [heroRace, setHeroRace] = useState('human');
  const [heroClass, setHeroClass] = useState('warrior');
  const [level, setLevel] = useState(1);
  const [classHotbar, setClassHotbar] = useState<HotbarSlot[]>([]);
  const [weaponHotbar, setWeaponHotbar] = useState<HotbarSlot[]>([]);

  const showNotification = useCallback((text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // ── Load character + persisted home island ─────────────────────

  useEffect(() => {
    clearTopDownCache();

    async function load() {
      try {
        const grudgeId = localStorage.getItem('grudge_account_id') || 'guest';
        const activeId = localStorage.getItem(`gruda_active_character_${grudgeId}`) ||
          localStorage.getItem('grudge_active_character') ||
          localStorage.getItem('gruda_active_character_guest');

        if (!activeId) {
          setLocation('/create-character');
          return;
        }

        const char = await characterAPI.get(activeId);
        characterRef.current = char;
        const cfg = buildGrudge6LoadConfig(char);
        loadConfigRef.current = cfg;

        setCharacterName(char.name);
        setHeroRace(char.raceId);
        setHeroClass(char.classId);
        setLevel(char.level ?? 1);
        setHasWeapon(cfg.hasWeapon);
        setProfessions(getActiveGatheringProfessions(char.professionLevels ?? {}));
        setClassHotbar(buildClassHotbar(char));
        setWeaponHotbar(buildWeaponHotbar(char, cfg.hasWeapon));

        const island = await fetchCurrentHomeIsland();
        setIslandDto(island);
        setIslandSeed(island.seed || island.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load home island';
        if (msg.includes('404') || msg.includes('Failed to load')) {
          setLocation('/island-reveal');
          return;
        }
        setLoadError(msg);
      }
    }
    load();
  }, [setLocation]);

  // ── Sync play mode → character animations ─────────────────────

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine?.character || !loaded) return;
    engine.character.setControlMode(playMode, heroClass, hasWeapon).catch(() => {});
  }, [playMode, heroClass, hasWeapon, loaded]);

  const persistProfessionXp = useCallback(async (resourceKey: string) => {
    const char = characterRef.current;
    if (!char) return;
    const profession = RESOURCE_TO_PROFESSION[resourceKey] ?? 'Logging';
    const xpGain = getGatherXp(resourceKey, 1);
    const { updatedLevels, result } = addProfessionXp(
      char.professionLevels ?? {},
      profession,
      xpGain,
    );
    char.professionLevels = updatedLevels;
    setProfessions(getActiveGatheringProfessions(updatedLevels));
    try {
      await characterAPI.update(char.id, { professionLevels: updatedLevels });
    } catch { /* offline-tolerant */ }
    if (result.leveledUp) {
      showNotification(`${profession} Level ${result.newLevel}!`);
    }
  }, [showNotification]);

  // ── Colyseus HomeIslandRoom ───────────────────────────────────

  useEffect(() => {
    if (!islandSeed || !loadConfigRef.current) return;

    let client: Client | null = null;
    let room: Room | null = null;
    const cfg = loadConfigRef.current;

    async function connect() {
      try {
        const endpoint = getColyseusEndpoint();
        client = new Client(endpoint);
        const accountId = localStorage.getItem('grudge_account_id') || 'guest';

        room = await client.joinOrCreate('home_island', {
          accountId,
          characterName: cfg.name,
          heroRace: cfg.raceId,
          heroClass: cfg.classId,
          islandUUID: islandDto?.id || accountId,
          islandSeed: islandSeed,
          level: cfg.level,
          baseModelId: cfg.baseModelId,
          equippedWeaponType: getWeaponTypeForMode(playMode, cfg.classId, cfg.hasWeapon),
        });
        roomRef.current = room;

        room.state.players.onAdd(() => setPlayerCount(room!.state.players.size));
        room.state.players.onRemove(() => setPlayerCount(room!.state.players.size));
        setPlayerCount(room.state.players.size);

        room.state.listen('buildingCount', (v: number) => setBuildingCount(v));

        room.onMessage('harvest_complete', async (data: { resource: string; quantity: number }) => {
          const key = data.resource;
          setResources(prev => ({ ...prev, [key]: (prev[key] || 0) + data.quantity }));
          showNotification(`Gathered ${key} ×${data.quantity}`);
          await persistProfessionXp(key);
        });

        room.onMessage('auto_harvest', (data: { resource: string; quantity: number; total: number }) => {
          setResources(prev => ({ ...prev, [data.resource]: data.total }));
          showNotification(`Hero gathered ${data.resource} (total: ${data.total})`);
        });

        room.onMessage('building_placed', (data: { totalBuildings: number }) => {
          setBuildingCount(data.totalBuildings);
          showNotification('Building placed!');
        });

        room.onMessage('building_removed', () => showNotification('Building removed'));

        room.onMessage('island_exit', () => setLocation('/play'));

        room.send('get_resources');
        room.onMessage('resources', (data: Record<string, number>) => setResources(data));

        room.state.harvestNodes?.onAdd?.((node: any, id: string) => {
          nodesRef.current.set(id, {
            id, type: node.resourceType,
            x: node.x, z: node.z, depleted: node.depleted,
          });
          node.onChange?.(() => {
            nodesRef.current.set(id, {
              id, type: node.resourceType,
              x: node.x, z: node.z, depleted: node.depleted,
            });
          });
        });

        room.state.players.onAdd((player: any, sessionId: string) => {
          if (sessionId === room!.sessionId) return;
          showNotification(`${player.characterName} is visiting your island!`);
        });
      } catch (err) {
        console.error('[HomeIsland] Connection failed:', err);
        showNotification('Offline mode — island loaded locally');
      }
    }

    connect();

    return () => {
      room?.leave();
      roomRef.current = null;
    };
  }, [islandSeed, islandDto?.id, showNotification, persistProfessionXp, setLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3D engine ─────────────────────────────────────────────────

  useEffect(() => {
    if (!islandSeed) return;
    const canvas = canvasRef.current;
    if (!canvas || engineRef.current) return;

    const config: Island3DEngineConfig = {
      seed: islandSeed,
      canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      mode: 'procedural',
      quality: 'medium',
      enableCharacter: true,
      dayNight: { cycleDurationMs: 10 * 60 * 1000 },
    };

    const engine = new Island3DEngine(config);
    engineRef.current = engine;

    engine.init().then(async () => {
      setLoaded(true);
      engine.start();
      const cfg = loadConfigRef.current;
      if (engine.character && cfg) {
        await engine.character.loadCharacterFromManifest(
          cfg.raceId, cfg.classId, cfg.characterId, 'unarmed',
        );
        engine.character.mode = 'harvest';
      }
      setAllyMessage('Welcome home. Harvest mode gathers resources — heroes auto-harvest while you\'re away.');
    }).catch(() => {
      engine.start();
      setLoaded(true);
    });

    const handleResize = () => engine.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
      engineRef.current = null;
    };
  }, [islandSeed, heroRace, heroClass]);

  // ── Visitor sync ──────────────────────────────────────────────

  useEffect(() => {
    if (!roomRef.current || !engineRef.current || !loaded) return;
    const engine = engineRef.current;
    const room = roomRef.current;
    const localId = room.sessionId;

    const rpm = new RemotePlayerManager(engine.getScene(), localId);
    rpmRef.current = rpm;
    const unregister = engine.onUpdate((dt) => rpm.update(dt));

    room.state.players.onAdd((player: any, sessionId: string) => {
      if (sessionId === localId) return;
      rpm.addPlayer(sessionId, {
        id: player.id,
        characterName: player.characterName,
        heroClass: player.heroClass,
        heroRace: player.heroRace,
        faction: player.faction || '',
        level: player.level || 1,
        x: player.x, y: player.y, z: player.z,
        facing: player.facing,
        state: player.state || 'idle',
        hp: player.hp || 200, maxHp: player.maxHp || 200,
        baseModelId: player.baseModelId || player.heroRace || 'human',
        equippedMeshJson: player.equippedMeshJson || '{}',
        weaponSlotsJson: player.weaponSlotsJson || '{}',
        skinColor: player.skinColor || '#ffffff',
        armorColor: player.armorColor || '#ffffff',
        equippedWeaponType: player.equippedWeaponType || 'sword-shield',
      });
      player.onChange(() => {
        rpm.updatePlayer(sessionId, {
          x: player.x, y: player.y, z: player.z,
          facing: player.facing, state: player.state,
        });
      });
    });

    room.state.players.onRemove((_p: any, sessionId: string) => rpm.removePlayer(sessionId));

    return () => {
      unregister();
      rpm.dispose();
      rpmRef.current = null;
    };
  }, [loaded]);

  // ── Position sync ─────────────────────────────────────────────

  useEffect(() => {
    if (!roomRef.current || !engineRef.current || !loaded) return;
    const interval = setInterval(() => {
      const engine = engineRef.current;
      if (!engine?.character) return;
      const pos = engine.character.getPosition();
      const facing = engine.character.getFacing();
      const state = engine.character.isMoving() ? 'moving' : 'idle';
      roomRef.current?.send('move', { x: pos.x, y: pos.y, z: pos.z, facing, state });
    }, 100);
    return () => clearInterval(interval);
  }, [loaded]);

  const getPlayerPos = () => {
    const pos = engineRef.current?.character?.getPosition();
    return pos ? { x: pos.x, z: pos.z } : { x: 0, z: 0 };
  };

  const findNearestNode = (radius = 25) => {
    const { x, z } = getPlayerPos();
    let nearest: string | null = null;
    let nearestDist = Infinity;
    nodesRef.current.forEach((node, id) => {
      if (node.depleted) return;
      const dx = node.x - x, dz = node.z - z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < nearestDist && dist < radius) { nearestDist = dist; nearest = id; }
    });
    return nearest;
  };

  const handleHarvest = () => {
    if (playMode !== 'harvest') { setPlayMode('harvest'); return; }
    const nearest = findNearestNode();
    if (nearest) {
      const node = nodesRef.current.get(nearest);
      roomRef.current?.send('harvest', { nodeId: nearest, professionId: node?.type || 'forest' });
    } else {
      showNotification('Click a tree or rock nearby, or walk closer to a node');
    }
  };

  const handleAttack = () => {
    if (playMode !== 'combat') { setPlayMode('combat'); return; }
    showNotification(hasWeapon ? 'Combat mode — attack wildlife with LMB' : 'Equip a weapon from Arsenal first');
  };

  const handleCraft = () => {
    setPlayMode('build');
    setLocation('/crafting');
  };

  const handleBuildRaft = () => {
    if (playMode !== 'build') setPlayMode('build');
    const engine = engineRef.current;
    if (!engine) return;
    engine.startBuilding('foundation');
    showNotification('Build mode — click to place foundation');
  };

  const handleUseSkill = (slot: HotbarSlot) => {
    if (slot.locked) {
      showNotification(slot.lockReason ?? 'Skill locked');
      return;
    }
    if (slot.kind === 'weapon' && playMode !== 'combat') setPlayMode('combat');
    showNotification(`${slot.label}`);
    roomRef.current?.send('use_skill', { skillId: slot.skillId, kind: slot.kind });
  };

  const handleModeChange = (mode: ControlMode) => {
    setPlayMode(mode);
    const hints: Record<ControlMode, string> = {
      harvest: 'Gather wood, ore, and herbs. Heroes auto-harvest while you\'re offline.',
      combat: hasWeapon ? 'Combat mode — defend your island from wildlife.' : 'Visit Arsenal to equip a weapon.',
      build: 'Place buildings and expand your camp.',
    };
    setAllyMessage(hints[mode]);
  };

  const handleLeave = () => {
    roomRef.current?.send('leave_island');
    setLocation('/play');
  };

  const homeSteps = [
    { id: 'explore', title: 'Explore your island', completed: loaded },
    { id: 'harvest', title: 'Gather resources', completed: Object.keys(resources).length > 0 },
    { id: 'build', title: 'Place a building', completed: buildingCount > 0 },
  ];

  if (loadError) {
    return (
      <div className="fixed inset-0 bg-[#05060c] flex flex-col items-center justify-center text-white gap-4">
        <p className="text-red-400">{loadError}</p>
        <button onClick={() => setLocation('/island-reveal')} className="text-amber-400 underline">
          Generate your island
        </button>
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
          <TutorialGameplayHUD
            characterName={characterName}
            heroClass={heroClass}
            level={level}
            hp={hp}
            maxHp={maxHp}
            playMode={playMode}
            onModeChange={handleModeChange}
            steps={homeSteps}
            classHotbar={classHotbar}
            weaponHotbar={weaponHotbar}
            professions={professions}
            resources={resources}
            hasWeapon={hasWeapon}
            allyName="Camp Steward"
            allyMessage={allyMessage}
            notification={notification}
            onHarvest={handleHarvest}
            onAttack={handleAttack}
            onCraft={handleCraft}
            onBuildRaft={handleBuildRaft}
            onUseSkill={handleUseSkill}
          />

          {/* Home island meta + sail */}
          <div className="absolute top-4 right-4 z-50 pointer-events-auto">
            <div className="bg-black/70 backdrop-blur-sm rounded-xl border border-amber-600/30 p-3 text-xs text-slate-300 space-y-1 min-w-[160px]">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Home className="w-4 h-4" />
                {islandDto?.name || 'Home Island'}
              </div>
              <div>Visitors: {playerCount}</div>
              <div>Buildings: {buildingCount}</div>
              <button
                onClick={handleLeave}
                className="mt-2 w-full py-1.5 rounded-lg bg-amber-800/40 border border-amber-700/40 text-amber-300 hover:bg-amber-700/40 transition-colors"
              >
                Sail to World
              </button>
            </div>
          </div>
        </>
      )}

      {!loaded && (
        <div className="absolute inset-0 z-[100] bg-[#05060c] flex flex-col items-center justify-center">
          <Home className="w-12 h-12 text-amber-400 mb-4" />
          <h1 className="text-2xl font-cinzel font-black tracking-[4px] mb-3 text-amber-400">HOME ISLAND</h1>
          <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-amber-500 animate-pulse" style={{ width: '60%' }} />
          </div>
          <p className="text-white/30 text-xs mt-3">Loading your island...</p>
        </div>
      )}
    </div>
  );
}
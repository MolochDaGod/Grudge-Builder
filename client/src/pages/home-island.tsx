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
import { ModePlayHUD } from '@/island3d/render/ModePlayHUD';
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
import { hashIslandSeedForColyseus } from '@shared/definitions/homeIslandSeed';
import {
  addProfessionXp,
  RESOURCE_TO_PROFESSION,
  getGatherXp,
} from '@/lib/professionSystem';
import type { Character } from '@/lib/characterManager';
import { fetchCurrentHomeIsland, type HomeIslandDto } from '@/lib/homeIslandApi';
import type { MountainTriadSeed } from '@shared/definitions/homeIslandSeed';
import { buildHomeDungeonUrl } from '@/lib/homeIslandDungeon';
import { clearTopDownCache } from '@/island3d/render/IslandTopDownCapture';
import type { MountainHintState } from '@/island3d/objects/EvilMountainTriad';
import { Home, Mountain, ArrowLeft, Map as MapIcon } from 'lucide-react';
import { Grudge6PlayShell } from '@/components/Grudge6PlayShell';
import { GrudgeGameUiLayer } from '@/components/uiKit/GrudgeGameUiLayer';
import MainPanelHost from '@/components/MainPanelHost';
import { ensureCraftpixRpgCss } from '@/lib/uiKit/loadGrudgeGameUI';

export default function HomeIslandPage() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Island3DEngine | null>(null);
  const roomRef = useRef<Room | null>(null);
  const rpmRef = useRef<RemotePlayerManager | null>(null);
  const characterRef = useRef<Character | null>(null);
  const loadConfigRef = useRef<Grudge6LoadConfig | null>(null);
  const nodesRef = useRef<Map<string, { id: string; type: string; x: number; z: number; depleted: boolean }>>(new Map());
  const onHarvestRef = useRef<(event: { nodeId?: string; resourceType: string }) => void>(() => {});

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
  const [mountainHint, setMountainHint] = useState<MountainHintState>('none');
  const [mountainDungeonName, setMountainDungeonName] = useState<string | null>(null);
  const [mainPanelOpen, setMainPanelOpen] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

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

  // Production UI kit CSS (frames / slots from ui.grudge-studio.com)
  useEffect(() => {
    ensureCraftpixRpgCss();
    try {
      for (const k of ['grudge_auth_token', 'grudge_session_token', 'grudge.token', 'sso_token']) {
        const v = localStorage.getItem(k);
        if (v) {
          setAuthToken(v);
          break;
        }
      }
    } catch {
      /* private mode */
    }
  }, []);

  // I = open Warlords main panel (equipment / inventory) from ui.grudge-studio.com
  useEffect(() => {
    if (!loaded) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key.toLowerCase() !== 'i' || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      setMainPanelOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loaded]);

  // ── Load character + persisted home island ─────────────────────

  useEffect(() => {
    clearTopDownCache();

    async function load() {
      try {
        const { applyCharacterHandoffFromLocation, persistActiveCharacter } = await import(
          '@/lib/characterHandoff'
        );
        const handoff = applyCharacterHandoffFromLocation();
        // Prefer Foundry/GCS/heroes handoff ?characterId= over stale localStorage
        const activeId = handoff.characterId;

        if (!activeId) {
          // SSOT: create at Foundry, then return here with characterId
          setLocation(
            '/create-character?returnTo=' +
              encodeURIComponent('/home-island?from=gcs'),
          );
          return;
        }

        if (handoff.fromUrl) {
          persistActiveCharacter(activeId, handoff.from);
          try {
            await characterAPI.activate(activeId, 'warlords');
          } catch {
            /* non-fatal */
          }
        }

        const char = await characterAPI.get(activeId);
        characterRef.current = char;
        const cfg = buildGrudge6LoadConfig(char);
        loadConfigRef.current = cfg;

        setCharacterName(char.name);
        setHeroRace(char.raceId);
        setHeroClass(char.classId);
        const charLevel = char.level ?? 1;
        setLevel(charLevel);
        // Happy path 2026-07: home island is immediate after first character.
        // Level-20 / End Game gate removed so Foundry → /airship → /home-island works.
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

  // Live mesh refresh when account character equipment/model3d changes
  useEffect(() => {
    const onUpdated = (ev: Event) => {
      const char = (ev as CustomEvent).detail?.character;
      if (!char?.id || char.id !== characterRef.current?.id) return;
      characterRef.current = char;
      const cfg = buildGrudge6LoadConfig(char);
      loadConfigRef.current = cfg;
      setHasWeapon(cfg.hasWeapon);
      if (engineRef.current?.character) {
        void engineRef.current.character.refreshAppearance(char.equipment, char.model3d);
      }
    };
    window.addEventListener('grudge:character:updated', onUpdated);
    return () => window.removeEventListener('grudge:character:updated', onUpdated);
  }, []);

  // ── Sync play mode → sheath / last harvest tool / combat ───────

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine?.character || !loaded) return;
    if (playMode === 'combat') {
      void engine.enterCombatMode(heroClass, hasWeapon);
    } else if (playMode === 'build') {
      void engine.setHarvestRadialTool('toolkit');
    } else {
      void engine.enterHarvestMode();
    }
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
          islandSeed: hashIslandSeedForColyseus(islandSeed),
          level: cfg.level,
          baseModelId: cfg.baseModelId,
          equippedMeshes: cfg.equippedMeshes,
          weaponSlots: cfg.weaponSlots,
          skinColor: cfg.skinColor,
          armorColor: cfg.armorColor,
          equippedWeaponType: getWeaponTypeForMode(playMode, cfg.classId, cfg.hasWeapon, cfg.equippedWeaponType),
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

    const mountainTriad = islandDto?.state?.mountainTriad as MountainTriadSeed | undefined;
    const rtsHeightmap = islandDto?.state?.rtsHeightmap;
    const rtsNatureScatter = islandDto?.state?.rtsNatureScatter;

    const campPositionPercent = islandDto?.state?.campPosition ?? islandDto?.campPosition;
    const regrowRegions = islandDto?.state?.regrowRegions;

    const islandBiome =
      (islandDto?.state as { biome?: string } | undefined)?.biome
      || (islandDto?.state?.rtsNatureScatter as { biome?: string } | undefined)?.biome
      || 'beach';

    const config: Island3DEngineConfig = {
      seed: islandSeed,
      mountainTriad,
      rtsHeightmap,
      rtsNatureScatter,
      biome: islandBiome,
      regrowRegions,
      campPositionPercent: campPositionPercent
        ? { x: Number(campPositionPercent.x), y: Number(campPositionPercent.y) }
        : undefined,
      canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      mode: 'procedural',
      quality: 'high',
      enableCharacter: true,
      dayNight: { dayDurationSeconds: 10 * 60 },
      onDungeonEnter: (dungeonId, dungeonName) => {
        showNotification(`Entering ${dungeonName}...`);
        setLocation(buildHomeDungeonUrl(dungeonId, dungeonName));
      },
      onHarvest: (evt) => onHarvestRef.current(evt),
    };

    const engine = new Island3DEngine(config);
    engineRef.current = engine;

    engine.init().then(async () => {
      setLoaded(true);
      engine.start();
      const cfg = loadConfigRef.current;
      if (engine.character && cfg) {
        await engine.character.loadCharacterFromManifest(
          cfg.raceId,
          cfg.classId,
          cfg.characterId,
          'unarmed',
          {
            equippedMeshes: cfg.equippedMeshes,
            weaponSlots: cfg.weaponSlots,
            scale: cfg.scale,
            skinColor: cfg.skinColor,
            armorColor: cfg.armorColor,
          },
          characterRef.current?.equipment,
        );
        engine.character.mode = 'harvest';
      }
      setMountainDungeonName(engine.mountainDungeonName);
      setAllyMessage('Welcome home. Head north to the evil mountains — a dungeon hides behind one of three peaks.');
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
  }, [islandSeed, islandDto?.state?.mountainTriad, islandDto?.state?.rtsHeightmap, islandDto?.state?.rtsNatureScatter, heroRace, heroClass, showNotification, setLocation]);

  // ── E key — cave portal behind secret evil peak ───────────────

  useEffect(() => {
    if (!loaded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key.toLowerCase() !== 'e') return;
      const engine = engineRef.current;
      if (!engine?.handleInteractKey()) return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loaded]);

  // ── Mountain triad HUD hints ──────────────────────────────────

  const lastMountainHintRef = useRef<MountainHintState>('none');

  useEffect(() => {
    if (!loaded) return;
    const engine = engineRef.current;
    if (!engine) return;
    const unregister = engine.onUpdate(() => {
      const hint = engine.mountainHintState;
      if (hint === lastMountainHintRef.current) return;
      lastMountainHintRef.current = hint;
      setMountainHint(hint);
      const name = engine.mountainDungeonName;
      if (hint === 'approach') {
        setAllyMessage('Three evil peaks ahead. Circle behind them — one hides a dungeon entrance.');
      } else if (hint === 'discovered' && name) {
        setAllyMessage(`You found ${name}. Walk into the cave mouth.`);
      } else if (hint === 'interact' && name) {
        setAllyMessage(`Press E to enter ${name}.`);
      }
    });
    return unregister;
  }, [loaded]);

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

  useEffect(() => {
    onHarvestRef.current = ({ nodeId, resourceType }) => {
      const key = resourceType;
      setResources(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
      showNotification(`Gathered ${key}`);
      void persistProfessionXp(key);
      const room = roomRef.current;
      if (!room) return;
      const serverNode = findNearestNode(35);
      if (serverNode) {
        room.send('harvest', { nodeId: serverNode, professionId: key });
      } else if (nodeId) {
        room.send('harvest', { nodeId, professionId: key });
      }
    };
  });

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
      harvest: 'Harvest — R tools (hatchet default) · sheath weapons · Q combat.',
      combat: hasWeapon ? 'Combat — Q harvest · Z sheath · Tab soft-lock.' : 'Visit Arsenal to equip a weapon.',
      build: 'Build hammer (R radial) — place structures · R tools · Q combat.',
    };
    setAllyMessage(hints[mode]);
  };

  const handleLeave = () => {
    roomRef.current?.send('leave_island');
    // Open world starter sector (not bare /play procedural)
    setLocation('/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1');
  };

  const homeSteps = [
    { id: 'explore', title: 'Explore your island', completed: loaded },
    { id: 'harvest', title: 'Gather resources', completed: Object.keys(resources).length > 0 },
    { id: 'build', title: 'Place a building', completed: buildingCount > 0 },
  ];

  if (loadError) {
    return (
      <div className="fixed inset-0 bg-[#05060c] flex flex-col items-center justify-center text-white gap-4 px-6 text-center">
        <p className="text-red-400">{loadError}</p>
        <p className="text-white/40 text-sm max-w-md">
          Island data loads from the game server. Sign in on grudgewarlords.com first, or open the Islands hub.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={() => setLocation('/islands')}
            className="px-4 py-2 rounded-lg bg-amber-800/40 border border-amber-600/40 text-amber-300"
          >
            Islands Hub
          </button>
          <button onClick={() => setLocation('/island-reveal')} className="text-amber-400 underline">
            Generate your island
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onClick={(e) => engineRef.current?.handleClick(e.clientX, e.clientY, {
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
        })}
        onMouseMove={(e) => engineRef.current?.handleMouseMove(e.clientX, e.clientY)}
      />

      {loaded && (
        <>
          {/* Pack chrome from ui.grudge-studio.com (water-island) — non-interactive layer */}
          <GrudgeGameUiLayer
            surface="homeIsland"
            packId="water-island"
            state={
              playMode === 'build'
                ? 'build'
                : playMode === 'harvest'
                  ? 'harvest'
                  : 'island'
            }
            bind={{
              pf1: {
                name: characterName,
                level,
                hp,
                hpMax: maxHp,
                mp: 80,
                mpMax: 100,
              },
              obj1: {
                label: 'Home tasks',
                objective:
                  Object.keys(resources).length > 0
                    ? buildingCount > 0
                      ? 'Island active — explore mountains north'
                      : 'Place a building (R → hammer)'
                    : 'Gather resources · harvest mode',
              },
            }}
          />

          {/* RTS triple-mode UI: Combat · Harvest · Build (+ craftpix frames/slots) */}
          <ModePlayHUD
            engine={engineRef.current}
            mode={playMode}
            onModeChange={handleModeChange}
            characterName={characterName}
            hp={hp}
            maxHp={maxHp}
            level={level}
            resources={resources}
            classHotbar={classHotbar.map((s) => ({
              key: String(s.index),
              label: s.label,
            }))}
            weaponHotbar={weaponHotbar.map((s) => ({
              key: String(s.index),
              label: s.label,
            }))}
            onBuildSelect={() => setBuildingCount((c) => c + 0)}
          />
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

          <Grudge6PlayShell
            characterId={characterRef.current?.id}
            characterName={characterName}
            compact
          />

          <MainPanelHost
            open={mainPanelOpen}
            onClose={() => setMainPanelOpen(false)}
            characterId={characterRef.current?.id}
            token={authToken}
            tab="equipment"
            era="warlords"
          />

          {mountainHint !== 'none' && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <div className="bg-black/75 backdrop-blur-sm rounded-xl border border-purple-500/40 px-4 py-2 text-sm text-purple-200 flex items-center gap-2 shadow-lg">
                <Mountain className="w-4 h-4 text-purple-400 shrink-0" />
                {mountainHint === 'approach' && (
                  <span>Evil mountains — search behind the peaks for a hidden cave</span>
                )}
                {mountainHint === 'discovered' && mountainDungeonName && (
                  <span>{mountainDungeonName} revealed — enter the cave mouth</span>
                )}
                {mountainHint === 'interact' && mountainDungeonName && (
                  <span className="text-amber-200 font-semibold">Press E — enter {mountainDungeonName}</span>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => setLocation('/islands')}
            className="absolute top-4 left-4 z-50 pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white/70 hover:text-white text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Islands
          </button>

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
                className="mt-2 w-full py-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 hover:bg-emerald-800/40 transition-colors flex items-center justify-center gap-1"
              >
                <MapIcon className="w-3 h-3" />
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
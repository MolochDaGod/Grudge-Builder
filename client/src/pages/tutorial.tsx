import { useAuth } from '@/contexts/AuthContext';
import { authHeaders } from '@/lib/grudgeBackend';
import { GameRecovery } from '@/components/GameRecovery';
import { createGameClient } from '@/lib/gameClient';
import { getStateCallbacks } from '@colyseus/sdk';
/**
 * TutorialPage — multiplayer Shipwreck Cove tutorial with production 3-state gameplay.
 *
 * Loads canonical Grudge6 race model (unarmed in harvest/build, weapon in combat).
 * Wires class skill tree, weapon skill tree (locked until weapon), gathering
 * professions, and a shared Colyseus tutorial shard on the real pirate-islands map.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Client, Room } from '@colyseus/sdk';
import * as THREE from 'three';
import { Island3DEngine, type Island3DEngineConfig } from '@/island3d/engine/Island3DEngine';
import { RemotePlayerManager } from '@/island3d/sync/RemotePlayerManager';
import { characterAPI } from '@/lib/api';
import { getColyseusEndpoint } from '@/lib/colyseusEndpoint';
import type { ControlMode } from '@/components/TutorialGameplayHUD';
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
import {
  depositHarvestResource,
  flushOfflineHarvestQueue,
} from '@/lib/craftHarvestDeposit';
import type { Character } from '@/lib/characterManager';
import { getAvatarForContext } from '@/lib/aiAvatars';
import { TutorialWakeCinematic } from '@/island3d/tutorial/TutorialWakeCinematic';
import { createShipwreckSceneRuntime, type ShipwreckSceneRuntime } from '@/island3d/tutorial/ShipwreckSceneRuntime';
import { ShipwreckSceneEditorHUD } from '@/island3d/tutorial/ShipwreckSceneEditorHUD';
import { TutorialHarvestController } from '@/island3d/tutorial/TutorialHarvestController';
import {
  DEFAULT_TUTORIAL_SETTINGS,
  type TutorialSettings,
} from '@/island3d/tutorial/TutorialProductionHUD';
import { TutorialShell } from '@/tutorial/TutorialShell';
import { SHIPWRECK_SCENE } from '@shared/definitions/shipwreckScene';
import {
  TUTORIAL_QUICK_CRAFT,
  canCraftQuick,
  type TutorialSegmentPhase,
} from '@shared/definitions/tutorialFirstSegment';
import { SHIPWRECK_WAKE } from '@shared/definitions/tutorialShipwreckScene';
import { TUTORIAL_STEPS } from '@shared/definitions/tutorialFlow';
import {
  MULTIPLAYER_SHIPWRECK,
  multiplayerShipwreckJoinOptions,
} from '@shared/definitions/multiplayerTutorial';
import {
  TUTORIAL_LOCKED_HP,
  INJURED_OPENER_PHASES,
} from '@shared/definitions/injuredAnimPack';
import { loadInjuredAnimsOntoManager } from '@/island3d/tutorial/loadInjuredAnims';
import {
  applyCharacterHandoffFromLocation,
  persistActiveCharacter,
} from '@/lib/characterHandoff';
import { resolveShipwreckCoveWorld } from '@/island3d/tutorial/resolveShipwreckCove';
import {
  markTutorialComplete,
  markRaftCrafted,
  isTutorialComplete,
  getActiveCharacterId,
} from '@/lib/warlordsOnboarding';
import { AFTER_TUTORIAL_PATH } from '@shared/definitions/warlordsProductionFlow';

interface TutorialStep {
  id: string;
  title: string;
  completed: boolean;
}

interface TutorialSnapshot {
  shardId: string;
  roomId: string;
  playerCount: number;
  maxPlayers: number;
  steps: TutorialStep[];
  resources?: Record<string, number>;
  craftedTools?: string[];
  raftDeployed?: boolean;
}

export default function TutorialPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, authLoading, openLogin } = useAuth();
  const [characterReady, setCharacterReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Status is a read-only ownership check; GET /api/island creates an island.
  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    void fetch('/api/island/status', { headers: authHeaders(), signal: controller.signal })
      .then(async response => {
        if (!response.ok) return;
        const status = await response.json();
        if (controller.signal.aborted || !status.homeIsland) return;
        markTutorialComplete();
        setLocation('/home-island' + window.location.search);
      }).catch(() => {});
    return () => controller.abort();
  }, [isAuthenticated, setLocation]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Island3DEngine | null>(null);
  const onHarvestRef = useRef<(event: { nodeId?: string; resourceType: string }) => void>(() => {});
  const roomRef = useRef<Room | null>(null);
  const rpmRef = useRef<RemotePlayerManager | null>(null);
  const characterRef = useRef<Character | null>(null);
  const loadConfigRef = useRef<Grudge6LoadConfig | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [networkReady, setNetworkReady] = useState(false);
  const [playerCount, setPlayerCount] = useState(1);
  const [maxPlayers, setMaxPlayers] = useState<number>(MULTIPLAYER_SHIPWRECK.maxPlayers);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [steps, setSteps] = useState<TutorialStep[]>(() =>
    TUTORIAL_STEPS.map((step) => ({ id: step.id, title: step.title, completed: false })),
  );
  const [hp, setHp] = useState(TUTORIAL_LOCKED_HP);
  const [maxHp] = useState(TUTORIAL_LOCKED_HP);
  const [injuredAnimsReady, setInjuredAnimsReady] = useState(false);
  const [introPlaying, setIntroPlaying] = useState(true);
  const [wakePhase, setWakePhase] = useState<'cinematic' | 'playable' | 'skipped'>('cinematic');
  const [segmentPhase, setSegmentPhase] = useState<TutorialSegmentPhase>('intro_zoom');
  const [completed, setCompleted] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [playMode, setPlayMode] = useState<ControlMode>('harvest');
  const [resources, setResources] = useState<Record<string, number>>({ sticks: 0, stones: 0 });
  const [craftedTools, setCraftedTools] = useState<string[]>([]);
  const [equippedMainHand, setEquippedMainHand] = useState<string | null>(null);
  const [chunkHits, setChunkHits] = useState<{ left: number; max: number } | null>(null);
  const [settings, setSettings] = useState<TutorialSettings>(DEFAULT_TUTORIAL_SETTINGS);
  const [professions, setProfessions] = useState(getActiveGatheringProfessions({}));
  const [allyMessage, setAllyMessage] = useState<string | null>(null);
  const [hasWeapon, setHasWeapon] = useState(false);
  const wakeCinematicRef = useRef<TutorialWakeCinematic | null>(null);
  const harvestCtrlRef = useRef<TutorialHarvestController | null>(null);
  const shipwreckRuntimeRef = useRef<ShipwreckSceneRuntime | null>(null);
  const [shipwreckRuntime, setShipwreckRuntime] = useState<ShipwreckSceneRuntime | null>(null);
  const [sceneEditorMode, setSceneEditorMode] = useState(false);
  const segmentPhaseRef = useRef<TutorialSegmentPhase>('intro_zoom');
  /** Bridge production events → Traveler mission machine */
  const missionEventRef = useRef<((e: {
    type: string;
    itemId?: string;
    panel?: string;
    resource?: string;
  }) => void) | null>(null);

  const [characterName, setCharacterName] = useState('Shipwrecked');
  const [heroRace, setHeroRace] = useState('human');
  const [heroClass, setHeroClass] = useState('warrior');
  const [level, setLevel] = useState(1);
  const [classHotbar, setClassHotbar] = useState<HotbarSlot[]>([]);
  const [weaponHotbar, setWeaponHotbar] = useState<HotbarSlot[]>([]);

  const enemiesRef = useRef<Map<string, { id: string; x: number; z: number; hp: number; state: string }>>(new Map());
  const nodesRef = useRef<Map<string, { id: string; type: string; x: number; z: number; depleted: boolean }>>(new Map());
  const markerMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  const ally = getAvatarForContext('tutorial');

  // ── Load full character from DB ────────────────────────────────
  // Handoff: /tutorial?characterId=<uuid>&from=heroes|gcs|foundry|open

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    async function load() {
      try {
        const { ensurePlayEntrySession } = await import('@/lib/characterHandoff');
        const entry = await ensurePlayEntrySession({ search: window.location.search });
        const handoff = entry.handoff;
        const activeId = handoff.characterId;

        if (!activeId) {
          console.warn('[Tutorial] missing characterId — redirect /create-character');
          setLocation('/create-character?returnTo=' + encodeURIComponent('/leviathan-cinema?from=gcs'));
          return;
        }

        if (handoff.fromUrl) {
          persistActiveCharacter(activeId, handoff.from);
        }

        const char = await characterAPI.get(activeId);
        if (cancelled) return;
        characterRef.current = char;
        const unarmedChar = {
          ...char,
          equipment: {},
          model3d: {
            ...(typeof char.model3d === 'object' && char.model3d ? char.model3d : {}),
            weaponSlots: {},
          },
        } as Character;
        const cfg = buildGrudge6LoadConfig(unarmedChar);
        cfg.hasWeapon = false;
        cfg.weaponSlots = {};
        cfg.equippedWeaponType = 'unarmed';
        loadConfigRef.current = cfg;
        setCharacterReady(true);

        setCharacterName(char.name);
        setHeroRace(char.raceId);
        setHeroClass(char.classId || 'warrior');
        setLevel(char.level ?? 1);
        setHasWeapon(false);
        setPlayMode('harvest');
        setProfessions(getActiveGatheringProfessions(char.professionLevels ?? {}));
        setClassHotbar(buildClassHotbar(char));
        setWeaponHotbar(buildWeaponHotbar(char, false));

        if (handoff.from === 'heroes' || handoff.from === 'gcs' || handoff.from === 'foundry') {
          setAllyMessage(
            handoff.from === 'heroes'
              ? 'Heroes handoff — multiplayer Shipwreck Cove. Survive, craft, sail.'
              : 'Foundry handoff — Leviathan wreck → multiplayer Shipwreck Cove.',
          );
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Character could not be loaded.');
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    void flushOfflineHarvestQueue();
    const onOnline = () => { void flushOfflineHarvestQueue(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
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

  const showNotification = useCallback((text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 3000);
  }, []);

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
      setAllyMessage(`Nice work! Your ${profession} is now level ${result.newLevel}.`);
    }
  }, [showNotification]);

  const addInventoryItem = useCallback(async (itemId: string, qty: number) => {
    const char = characterRef.current;
    if (!char) return;
    const inv = [...(char.inventory ?? [])];
    const existing = inv.find(i => i.itemId === itemId);
    if (existing) existing.quantity += qty;
    else inv.push({ itemId, quantity: qty, tier: 1 });
    char.inventory = inv;
    try {
      await characterAPI.update(char.id, { inventory: inv });
    } catch { /* offline-tolerant */ }
    void depositHarvestResource(itemId, qty, 'tutorial-harvest');
  }, []);

  // ── Shared multiplayer tutorial shard ──────────────────────────
  // Room: "tutorial" · max 24 · pirate-islands / shipwreck_cove
  // World state is shared; tutorial progression/rewards are per character.

  useEffect(() => {
    if (!characterReady || !isAuthenticated) return;
    let cancelled = false;
    let client: Client | null = null;
    let room: Room | null = null;

    async function connect() {
      const cfg = loadConfigRef.current;
      if (!cfg) return;

      const characterId = String(cfg.characterId || '').trim();
      if (!characterId) {
        console.error('[Tutorial] characterId required for multiplayer Shipwreck Cove');
        return;
      }

      try {
        const endpoint = getColyseusEndpoint();
        client = createGameClient(endpoint);
        room = await client.joinOrCreate(MULTIPLAYER_SHIPWRECK.roomName, {
          ...multiplayerShipwreckJoinOptions(),
          characterId,
          characterName: cfg.name,
          heroRace: cfg.raceId,
          heroClass: cfg.classId,
          accountId:
            localStorage.getItem('grudge_account_id') ||
            localStorage.getItem('grudge_user_id') ||
            '',
          level: cfg.level,
          baseModelId: cfg.baseModelId,
          equippedMeshes: cfg.equippedMeshes,
          weaponSlots: cfg.weaponSlots,
          skinColor: cfg.skinColor,
          armorColor: cfg.armorColor,
          equippedWeaponType: getWeaponTypeForMode(
            'harvest',
            cfg.classId,
            cfg.hasWeapon,
            cfg.equippedWeaponType,
          ),
        });
        if (cancelled) { await room.leave(); return; }
        roomRef.current = room;
        const callbacks = getStateCallbacks(room);
        setRoomId(room.roomId);
        setNetworkReady(true);

        room.onMessage('tutorial_snapshot', (data: TutorialSnapshot) => {
          if (Array.isArray(data.steps)) setSteps(data.steps);
          if (data.resources) {
            setResources((prev) => ({
              ...prev,
              sticks: data.resources?.sticks ?? prev.sticks ?? 0,
              stones: data.resources?.stones ?? prev.stones ?? 0,
              fiber: data.resources?.fiber ?? prev.fiber ?? 0,
              rawMeat: data.resources?.rawMeat ?? prev.rawMeat ?? 0,
              cookedMeat: data.resources?.cookedMeat ?? prev.cookedMeat ?? 0,
            }));
          }
          if (Array.isArray(data.craftedTools)) setCraftedTools(data.craftedTools);
          setPlayerCount(data.playerCount || room?.state?.players?.size || 1);
          setMaxPlayers(data.maxPlayers || MULTIPLAYER_SHIPWRECK.maxPlayers);
          setRoomId(data.roomId || room?.roomId || null);
        });

        room.onMessage('population', (data: { players: number; maxPlayers: number; roomId?: string }) => {
          setPlayerCount(data.players || 1);
          setMaxPlayers(data.maxPlayers || MULTIPLAYER_SHIPWRECK.maxPlayers);
          if (data.roomId) setRoomId(data.roomId);
        });

        room.onMessage('player_joined', (data: { characterName?: string }) => {
          if (data.characterName) showNotification(`${data.characterName} washed ashore`);
        });
        room.onMessage('player_left', (data: { characterName?: string }) => {
          if (data.characterName) showNotification(`${data.characterName} left Shipwreck Cove`);
        });

        room.onMessage('step_complete', (data: { stepId: string; title: string }) => {
          setSteps((prev) => prev.map((step) =>
            step.id === data.stepId ? { ...step, completed: true } : step
          ));
          showNotification(`✓ ${data.title}`);
          if (data.stepId === 'fight_boar') {
            setHasWeapon(true);
            const char = characterRef.current;
            if (char) setWeaponHotbar(buildWeaponHotbar(char, true));
            setAllyMessage('Boar down — skin it and cook the meat at your campfire.');
          }
          if (data.stepId === 'craft_campfire') {
            setAllyMessage('Campfire ready. A boar will appear — survivors can assist you.');
          }
          if (data.stepId === 'cook_meat') {
            setAllyMessage('Meat cooked. Next: UI tour, then craft and board a raft (E).');
          }
        });

        room.onMessage('player_damaged', () => {
          setHp(TUTORIAL_LOCKED_HP);
        });
        room.onMessage('enemy_killed', (data: { type: string; xp: number }) => {
          showNotification(`Defeated ${data.type}! +${data.xp} XP`);
          if (data.type === 'boar') {
            setResources(prev => ({ ...prev, rawMeat: (prev.rawMeat || 0) + 1 }));
          }
        });
        room.onMessage('enemy_spawned', (data: { type: string; ownerCharacterId?: string }) => {
          if (data.type === 'boar' && data.ownerCharacterId === characterId) {
            showNotification('Your wild boar appears!');
            setPlayMode('combat');
          }
        });

        room.onMessage('harvest_complete', async (data: { resource: string; quantity: number }) => {
          const key =
            data.resource === 'stick' || data.resource === 'driftwood' ? 'sticks'
            : data.resource === 'stone' ? 'stones'
            : data.resource;
          setResources(prev => {
            const next = { ...prev, [key]: (prev[key] || 0) + data.quantity };
            const sticks = next.sticks || 0;
            const stones = next.stones || 0;
            if (
              segmentPhaseRef.current === 'gather_basics'
              && sticks >= 1
              && stones >= 1
            ) {
              segmentPhaseRef.current = 'prompt_pickaxe';
              setSegmentPhase('prompt_pickaxe');
              setAllyMessage(
                'Open Main Panel (P) → Craft — Flint Pickaxe (1 stick · 1 stone), then equip MainHand.',
              );
              showNotification('Objective: Craft flint pickaxe');
            }
            return next;
          });
          showNotification(`Gathered ${data.resource} ×${data.quantity}`);
          await persistProfessionXp(key === 'sticks' ? 'wood' : key);
          await addInventoryItem(data.resource, data.quantity);
        });

        room.onMessage('craft_complete', async (data: {
          name: string;
          itemId?: string;
          results?: string[];
          summary?: string;
          kind?: string;
        }) => {
          showNotification(`Crafted ${data.name}!`);
          if (data.itemId) {
            setCraftedTools((prev) =>
              prev.includes(data.itemId!) ? prev : [...prev, data.itemId!],
            );
            await addInventoryItem(data.itemId, 1);
          }
          if (data.results?.length) {
            setAllyMessage(`${data.name}: ${data.results[0]}`);
          } else if (data.summary) {
            setAllyMessage(`📖 ${data.summary}`);
          } else if (data.itemId === 'raft') {
            setAllyMessage('Raft ready — deploy in the water, then press E to board.');
          }
        });

        room.onMessage('craft_fail', (data: { reason?: string }) => {
          if (data.reason === 'finish_ui_tour') showNotification('Finish the UI tour before building the raft');
          else if (data.reason === 'materials') showNotification('Not enough tutorial materials');
          else if (data.reason === 'already_owned') showNotification('Already crafted');
        });

        room.onMessage('ally_assist', (data: { message: string }) => {
          setAllyMessage(data.message);
        });

        room.onMessage('profession_xp', (data: { profession: string; xp: number; level: number }) => {
          showNotification(`+${data.xp} ${data.profession} XP`);
        });

        room.onMessage('tutorial_complete', (data: {
          message?: string;
          nextPath?: string;
          raceId?: string;
        }) => {
          setCompleted(true);
          const race = (data?.raceId || heroRace || 'human').toLowerCase();
          showNotification(
            data?.message || 'Raft ready — your faction lobby awaits.',
          );
          setAllyMessage(
            'Traveler: The raft is yours. Sail into the shared pirate/faction lobby and report to your commander.',
          );
          markRaftCrafted();
          markTutorialComplete();
          try {
            localStorage.setItem('warlords_tutorial_race_v1', race);
          } catch {
            /* ignore */
          }
          const id = getActiveCharacterId();
          const dest =
            data?.nextPath ||
            (id
              ? `${AFTER_TUTORIAL_PATH}&characterId=${encodeURIComponent(id)}&race=${encodeURIComponent(race)}`
              : `${AFTER_TUTORIAL_PATH}&race=${encodeURIComponent(race)}`);
          setTimeout(() => setLocation(dest), 2800);
        });

        callbacks(room.state).enemies.onAdd?.((enemy: any, id: string) => {
          enemiesRef.current.set(id, { id, x: enemy.x, z: enemy.z, hp: enemy.hp, state: enemy.state });
          callbacks(enemy).onChange(() => {
            enemiesRef.current.set(id, { id, x: enemy.x, z: enemy.z, hp: enemy.hp, state: enemy.state });
            const marker = markerMeshesRef.current.get(`enemy_${id}`);
            if (marker) {
              marker.position.set(enemy.x, 2, enemy.z);
              marker.visible = enemy.state !== 'dead';
            }
          });
          addEntityMarker(`enemy_${id}`, enemy.x, enemy.z, 'enemy');
        });
        callbacks(room.state).enemies.onRemove?.((_: any, id: string) => {
          enemiesRef.current.delete(id);
          removeEntityMarker(`enemy_${id}`);
        });

        callbacks(room.state).harvestNodes.onAdd?.((node: any, id: string) => {
          nodesRef.current.set(id, { id, type: node.resourceType, x: node.x, z: node.z, depleted: node.depleted });
          callbacks(node).onChange(() => {
            nodesRef.current.set(id, { id, type: node.resourceType, x: node.x, z: node.z, depleted: node.depleted });
          });
        });
      } catch (err) {
        console.error('[Tutorial] Multiplayer connection failed:', err);
        showNotification('Multiplayer server unavailable — retrying on refresh');
      }
    }

    if (loadConfigRef.current) connect();

    return () => {
      cancelled = true;
      setNetworkReady(false);
      void room?.leave().catch(() => {});
      roomRef.current = null;
      markerMeshesRef.current.forEach((mesh) => {
        mesh.geometry?.dispose();
        (mesh.material as THREE.Material)?.dispose();
      });
      markerMeshesRef.current.clear();
    };
  }, [characterReady, isAuthenticated, characterName, showNotification, persistProfessionXp, addInventoryItem, setLocation, ally.name]);

  function addEntityMarker(key: string, x: number, z: number, type: 'enemy' | 'wood' | 'stone') {
    const engine = engineRef.current;
    if (!engine) return;
    const scene = engine.getScene();
    let geom: THREE.BufferGeometry;
    let color: number;
    if (type === 'enemy') { geom = new THREE.SphereGeometry(1.2, 8, 8); color = 0xff3333; }
    else if (type === 'wood') { geom = new THREE.CylinderGeometry(0.4, 0.4, 3, 6); color = 0x44aa44; }
    else { geom = new THREE.BoxGeometry(1.2, 1.2, 1.2); color = 0x999999; }
    const mat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, type === 'wood' ? 1.5 : 1, z);
    scene.add(mesh);
    markerMeshesRef.current.set(key, mesh);
  }

  function removeEntityMarker(key: string) {
    const mesh = markerMeshesRef.current.get(key);
    if (mesh) {
      mesh.parent?.remove(mesh);
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material)?.dispose();
      markerMeshesRef.current.delete(key);
    }
  }

  // ── Initialize 3D engine + Grudge6 model ───────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!characterReady || !isAuthenticated || !canvas || engineRef.current) return;
    let cancelled = false;

    // Production tutorial = real pirate-islands lobby map, Shipwreck Cove pocket.
    const config: Island3DEngineConfig = {
      seed: 'shipwreck-tutorial',
      canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      mode: 'lobby',
      lobbyMapId: MULTIPLAYER_SHIPWRECK.mapId,
      lobbyIslandId: MULTIPLAYER_SHIPWRECK.islandId,
      quality: 'high',
      enableCharacter: true,
      dayNight: { dayDurationSeconds: 20 * 60 },
      onLoadProgress: (pct) => {
        if (pct === 0 || pct === 100 || pct % 25 === 0) {
          console.log(`[Tutorial] pirate-islands load ${pct}%`);
        }
      },
      onHarvest: (evt) => onHarvestRef.current(evt),
    };

    let engine: Island3DEngine;
    try { engine = new Island3DEngine(config); }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'Graphics initialization failed.'); return; }
    engineRef.current = engine;

    engine.init().then(async () => {
      if (cancelled) { engine.dispose(); return; }
      setLoaded(true);
      engine.start();

      const threeScene = engine.getScene();
      const cam = engine.getCamera();
      const wakeOrigin = resolveShipwreckCoveWorld(engine);
      shipwreckRuntimeRef.current?.dispose();
      const runtime = createShipwreckSceneRuntime({
        scene: threeScene,
        camera: cam,
        domElement: canvas,
        def: SHIPWRECK_SCENE,
        editorMode: false,
        worldOrigin: wakeOrigin,
      });
      shipwreckRuntimeRef.current = runtime;
      setShipwreckRuntime(runtime);

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
        );
        engine.character.mode = 'harvest';
        void engine.character.setControlMode('harvest', cfg.classId, false);

        setHp(TUTORIAL_LOCKED_HP);
        engine.character.enableTutorialInjuredMode(TUTORIAL_LOCKED_HP);

        let hasGround = false;
        let hasGetUp = false;
        if (engine.character.animations) {
          const inj = await loadInjuredAnimsOntoManager(engine.character.animations);
          setInjuredAnimsReady(inj.usable);
          hasGround = inj.loaded.includes('injured_ground') || engine.character.animations.hasClip('death');
          hasGetUp = inj.loaded.includes('injured_getup') || engine.character.animations.hasClip('hard_landing');
          if (inj.usable) {
            setAllyMessage(
              'Injured wash-up — HP locked at 5. Other survivors are live in this shared cove.',
            );
          } else {
            setAllyMessage(
              'Injured opener fallback — HP 5, invincible tutorial. Other survivors are live in this cove.',
            );
          }
        }

        harvestCtrlRef.current?.dispose();
        const harvest = new TutorialHarvestController(
          engine.character,
          threeScene,
          {
            onGather: (resource, _qty) => {
              // Server is authoritative for tutorial materials. Local interaction
              // only requests the harvest; harvest_complete mutates economy/UI.
              showNotification(`Harvesting ${resource}...`);
              missionEventRef.current?.({ type: 'harvest', resource });
              roomRef.current?.send('harvest', {
                nodeId: resource === 'stick' ? 'near_stick' : 'near_stone',
              });
            },
            onChunkHit: (left, max) => {
              setChunkHits({ left, max });
            },
            onChunkDestroyed: () => {
              setChunkHits(null);
              engine.character.disableTutorialInjuredMode();
              void engine.character.reloadWeaponAnimations('unarmed');
              segmentPhaseRef.current = 'walk_forward';
              setSegmentPhase('walk_forward');
              setAllyMessage(
                'You steady yourself. Rock shattered — walk inland across Shipwreck Cove toward the pirate islands.',
              );
              showNotification('Walk inland → grove');
            },
            onPhaseHint: (msg) => setAllyMessage(msg),
          },
          wakeOrigin,
        );
        harvest.buildFirstSegmentNodes();
        harvestCtrlRef.current = harvest;

        const spawn = new THREE.Vector3(
          wakeOrigin.x + SHIPWRECK_WAKE.spawn.x,
          wakeOrigin.y + SHIPWRECK_WAKE.spawn.y,
          wakeOrigin.z + SHIPWRECK_WAKE.spawn.z,
        );
        const groundY = engine.sampleLobbyGroundHeight?.(spawn.x, spawn.z);
        if (typeof groundY === 'number' && Number.isFinite(groundY)) {
          spawn.y = groundY + 0.15;
        }
        engine.character.teleportTo(spawn);

        const cinematic = new TutorialWakeCinematic({
          camera: cam,
          character: engine.character,
          skip: false,
          hasInjuredGround: hasGround,
          hasInjuredGetUp: hasGetUp,
          wakeOrigin,
          onCinematicBegin: () => engine.beginCinematicCamera(),
          onCinematicEnd: () => {
            engine.endCinematicCamera();
            engine.setCameraMode('play_tps');
            if (engine.character) {
              engine.character.cameraFollowEnabled = true;
              engine.character.setFacingYaw?.(SHIPWRECK_WAKE.facingYaw);
            }
            const camera = engine.getCamera();
            if (camera && 'fov' in camera) {
              camera.fov = 58;
              camera.updateProjectionMatrix?.();
            }
          },
          onComplete: () => {
            engine.setCameraMode('play_tps');
            if (engine.character) {
              engine.character.cameraFollowEnabled = true;
              engine.character.setFacingYaw?.(SHIPWRECK_WAKE.facingYaw);
            }
            const camera = engine.getCamera();
            if (camera && 'fov' in camera) {
              camera.fov = 58;
              camera.updateProjectionMatrix?.();
            }
            setWakePhase('playable');
            setIntroPlaying(false);
            setPlayMode('harvest');
            setHp(TUTORIAL_LOCKED_HP);
            segmentPhaseRef.current = 'gather_basics';
            setSegmentPhase('gather_basics');
            roomRef.current?.send('intro_complete');
            setAllyMessage(
              'Dock Traveler: You survived the Leviathan. Other survivors share this cove — harvest, craft, fight, then raft to your faction island.',
            );
          },
        });
        wakeCinematicRef.current = cinematic;
        cinematic.start();
      }
    }).catch((err) => {
      if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Game assets could not load.');
    });

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      wakeCinematicRef.current?.update(dt);
      const eng = engineRef.current;
      const pos = eng?.character?.getPosition();
      shipwreckRuntimeRef.current?.update(dt, pos);
      harvestCtrlRef.current?.update(dt, segmentPhaseRef.current);

      if (
        segmentPhaseRef.current === 'walk_forward'
        && pos
        && harvestCtrlRef.current?.isNearGrove(pos)
      ) {
        segmentPhaseRef.current = 'segment_complete';
        setSegmentPhase('segment_complete');
        setAllyMessage(
          'First segment complete. Camp props unlock for refine / over-time harvest.',
        );
        showNotification('Segment complete');
      }
    };
    raf = requestAnimationFrame(tick);

    const onContextLost = (event: Event) => {
      event.preventDefault();
      engine.stop();
      setLoadError('The graphics context was lost. Retry to reopen the game canvas.');
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    const handleResize = () => engine.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', handleResize);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      setPlayMode((prev) => {
        const order: ControlMode[] = ['harvest', 'combat'];
        const cur = prev === 'build' ? 'harvest' : prev;
        const next = order[(order.indexOf(cur) + 1) % order.length];
        if (next === 'harvest') {
          void engineRef.current?.enterHarvestMode();
        } else {
          void engineRef.current?.enterCombatMode(heroClass, hasWeapon);
        }
        return next;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      canvas.removeEventListener('webglcontextlost', onContextLost);
      setLoaded(false);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKey);
      harvestCtrlRef.current?.dispose();
      harvestCtrlRef.current = null;
      shipwreckRuntimeRef.current?.dispose();
      shipwreckRuntimeRef.current = null;
      setShipwreckRuntime(null);
      wakeCinematicRef.current = null;
      engine.dispose();
      engineRef.current = null;
    };
  }, [characterReady, isAuthenticated]);

  // ── Multiplayer remote Grudge6 characters ─────────────────────

  useEffect(() => {
    if (!loaded || !networkReady || !roomRef.current || !engineRef.current) return;
    const engine = engineRef.current;
    const room = roomRef.current;
    const localId = room.sessionId;
    const rpm = new RemotePlayerManager(engine.getScene(), localId);
    rpmRef.current = rpm;
    const unregister = engine.onUpdate((dt) => rpm.update(dt));

    getStateCallbacks(room)(room.state).players.onAdd?.((player: any, sessionId: string) => {
      setPlayerCount(room.state.players.size);
      if (sessionId === localId) return;
      rpm.addPlayer(sessionId, {
        id: player.id,
        characterName: player.characterName,
        heroClass: player.heroClass,
        heroRace: player.heroRace,
        faction: player.faction || '',
        level: player.level || 1,
        x: player.x,
        y: player.y,
        z: player.z,
        facing: player.facing,
        state: player.state || 'idle',
        hp: player.hp || TUTORIAL_LOCKED_HP,
        maxHp: player.maxHp || TUTORIAL_LOCKED_HP,
        baseModelId: player.baseModelId || player.heroRace || 'human',
        equippedMeshJson: player.equippedMeshJson || '{}',
        weaponSlotsJson: player.weaponSlotsJson || '{}',
        skinColor: player.skinColor || '#ffffff',
        armorColor: player.armorColor || '#ffffff',
        equippedWeaponType: player.equippedWeaponType || 'unarmed',
      });
      getStateCallbacks(room)(player).onChange(() => {
        rpm.updatePlayer(sessionId, {
          x: player.x,
          y: player.y,
          z: player.z,
          facing: player.facing,
          state: player.state,
        });
      });
    });

    getStateCallbacks(room)(room.state).players.onRemove?.((_player: any, sessionId: string) => {
      setPlayerCount(room.state.players.size);
      rpm.removePlayer(sessionId);
    });

    return () => {
      unregister();
      rpm.dispose();
      rpmRef.current = null;
    };
  }, [loaded, networkReady]);

  // ── Position sync ──────────────────────────────────────────────

  useEffect(() => {
    if (!roomRef.current || !engineRef.current || !loaded || !networkReady) return;
    const interval = setInterval(() => {
      const engine = engineRef.current;
      if (!engine?.character) return;
      const pos = engine.character.getPosition();
      const facing = engine.character.getFacing();
      const state = engine.character.isMoving() ? 'moving' : 'idle';
      roomRef.current?.send('move', { x: pos.x, y: pos.y, z: pos.z, facing, state });
    }, Math.round(1000 / MULTIPLAYER_SHIPWRECK.movementHz));
    return () => clearInterval(interval);
  }, [loaded, networkReady]);

  const getPlayerPos = (): { x: number; z: number } => {
    const pos = engineRef.current?.character?.getPosition();
    return pos ? { x: pos.x, z: pos.z } : { x: 0, z: 0 };
  };

  const findNearest = (pool: Map<string, { x: number; z: number; state?: string; depleted?: boolean }>, radius = 20) => {
    const { x, z } = getPlayerPos();
    let nearest: string | null = null;
    let nearestDist = Infinity;
    pool.forEach((ent, id) => {
      if (ent.state === 'dead' || ent.depleted) return;
      const dx = ent.x - x, dz = ent.z - z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < nearestDist && dist < radius) { nearestDist = dist; nearest = id; }
    });
    return nearest;
  };

  useEffect(() => {
    onHarvestRef.current = ({ nodeId, resourceType }) => {
      if (nodeId) roomRef.current?.send('harvest', { nodeId });
      else {
        const nearest = findNearest(nodesRef.current);
        if (nearest) roomRef.current?.send('harvest', { nodeId: nearest });
        else {
          const synthetic = resourceType === 'stone' ? 'near_stone' : 'near_stick';
          roomRef.current?.send('harvest', { nodeId: synthetic });
        }
      }
    };
  });

  const handleHarvest = () => {
    if (playMode !== 'harvest') { setPlayMode('harvest'); return; }
    const pos = engineRef.current?.character?.getPosition();
    if (pos && shipwreckRuntimeRef.current) {
      const node = shipwreckRuntimeRef.current.harvestNearest(pos, 4);
      if (node) {
        showNotification(`Harvesting ${node.resource ?? node.kind}...`);
        missionEventRef.current?.({ type: 'harvest', resource: node.resource ?? node.kind });
        roomRef.current?.send('harvest', { nodeId: node.id });
        return;
      }
    }
    const nearest = findNearest(nodesRef.current);
    if (nearest) roomRef.current?.send('harvest', { nodeId: nearest });
    else showNotification('Walk closer to a stick or stone in the wake pocket');
  };

  const handleAttack = () => {
    if (playMode !== 'combat') { setPlayMode('combat'); return; }
    const nearest = findNearest(enemiesRef.current);
    if (nearest) roomRef.current?.send('pve_attack', { enemyId: nearest, damage: 15 });
    else showNotification('No enemy nearby');
  };

  const handleCraft = () => {
    if (playMode !== 'build') setPlayMode('build');
    roomRef.current?.send('craft', { recipeId: 'stone_axe' });
  };

  const handleBuildRaft = () => {
    if (playMode !== 'build') setPlayMode('build');
    roomRef.current?.send('build_raft');
  };

  const handleUseSkill = (slot: HotbarSlot) => {
    if (slot.locked) {
      showNotification(slot.lockReason ?? 'Skill locked');
      return;
    }
    if (slot.kind === 'weapon' && playMode !== 'combat') {
      setPlayMode('combat');
    }
    showNotification(slot.label);
    roomRef.current?.send('use_skill', { skillId: slot.skillId, kind: slot.kind });
  };

  const handleModeChange = (mode: ControlMode) => {
    setPlayMode(mode);
    setHp(TUTORIAL_LOCKED_HP);
    const eng = engineRef.current?.character;
    if (eng) {
      eng.invincible = true;
      eng.tutorialLockedHp = TUTORIAL_LOCKED_HP;
    }
    const injuredOpen = (INJURED_OPENER_PHASES as readonly string[]).includes(segmentPhaseRef.current);
    const hints: Record<ControlMode, string> = {
      harvest: injuredOpen
        ? 'Injured harvest — limp walk, soft-lock gather with E / RMB / 1 / 2. R tools · Q combat.'
        : 'Harvest — sheath weapons, last tool (hatchet default). R tools · Q combat.',
      combat: hasWeapon ? 'Combat ready — LMB attack, keys 1-8. Q harvest · Z sheath.' : 'Unarmed combat — craft tools first (tutorial invincible). Q harvest.',
      build: 'Build hammer (R radial) — place camp props. R tools · Q combat.',
    };
    setAllyMessage(hints[mode]);
  };

  const skipWakeCinematic = () => {
    wakeCinematicRef.current?.skip();
    setWakePhase('skipped');
    setIntroPlaying(false);
    setPlayMode('harvest');
    segmentPhaseRef.current = 'gather_basics';
    setSegmentPhase('gather_basics');
    roomRef.current?.send('intro_complete');
    setAllyMessage(
      'Harvest mode (unarmed). Other survivors are live — gather stick and stone at your feet.',
    );
  };

  const stickCount = resources.sticks ?? resources.stick ?? 0;
  const stoneCount = resources.stones ?? resources.stone ?? 0;

  const handleQuickCraft = (recipeId: string) => {
    const recipe = TUTORIAL_QUICK_CRAFT.find((r) => r.id === recipeId);
    if (!recipe) return;
    if (!canCraftQuick(recipeId, { stick: stickCount, stone: stoneCount })) {
      showNotification('Not enough materials');
      return;
    }
    if (craftedTools.includes(recipeId)) {
      showNotification('Already crafted');
      return;
    }

    // Server validates and owns the material spend. Keep the local objective
    // responsive; craft_complete is the authoritative inventory award.
    roomRef.current?.send('craft', { recipeId });
    missionEventRef.current?.({ type: 'craft', itemId: recipeId });

    if (recipeId === 't0_pickaxe') {
      segmentPhaseRef.current = 'equip_pickaxe';
      setSegmentPhase('equip_pickaxe');
      setAllyMessage(
        'Pickaxe requested. When crafting completes, equip MainHand — then soft-lock the large rock (hold E).',
      );
    }
  };

  const handleEquip = (itemId: string) => {
    setEquippedMainHand(itemId);
    harvestCtrlRef.current?.setEquippedTool(itemId);
    void engineRef.current?.character?.setControlMode('harvest', heroClass, false).then(() => {
      void engineRef.current?.character?.equipHarvestPickaxeTool?.();
    });
    showNotification(`Equipped ${itemId} → MainHand`);
    missionEventRef.current?.({ type: 'equip', itemId });
    if (itemId === 't0_pickaxe' || /pick/i.test(itemId)) {
      segmentPhaseRef.current = 'chunk_harvest_stone';
      setSegmentPhase('chunk_harvest_stone');
      setAllyMessage(
        'Pickaxe in hand. Soft-lock the glowing rock — hold E or 1. It will chip and chunk apart.',
      );
      setChunkHits({ left: 4, max: 4 });
    }
  };

  const handleUnequip = () => {
    setEquippedMainHand(null);
    harvestCtrlRef.current?.setEquippedTool(null);
    showNotification('MainHand cleared');
  };

  if (loadError) return <GameRecovery message={loadError} />;
  if (authLoading) return <main className="min-h-screen bg-slate-950 text-white grid place-items-center">Checking your account…</main>;
  if (!isAuthenticated) return <main className="min-h-screen bg-slate-950 text-white grid place-items-center"><button onClick={() => openLogin('/tutorial' + window.location.search)}>Sign in to enter Shipwreck Cove</button></main>;
  return (
    <div className="fixed inset-0 bg-black">
      <canvas
        ref={canvasRef}
        onContextMenu={event => event.preventDefault()}
        className="w-full h-full"
        onClick={(e) => {
          if (wakeCinematicRef.current?.active) return;
          engineRef.current?.handleClick(e.clientX, e.clientY, {
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
          });
        }}
      />

      {/* Live shard indicator */}
      {loaded && (
        <div className="absolute left-3 top-3 z-40 pointer-events-none rounded-lg border border-cyan-500/30 bg-black/70 px-3 py-2 backdrop-blur-sm">
          <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Shipwreck Cove · Multiplayer</div>
          <div className="text-xs text-white/80 mt-0.5">
            {networkReady ? `${playerCount}/${maxPlayers} survivors` : 'Connecting to Warlords server…'}
          </div>
          {roomId && <div className="text-[9px] text-white/35 font-mono mt-0.5">{roomId}</div>}
        </div>
      )}

      {loaded && (
        <TutorialShell
          characterName={characterName}
          raceId={heroRace}
          classId={heroClass}
          level={level}
          hp={hp}
          maxHp={maxHp}
          playMode={playMode}
          onModeChange={handleModeChange}
          sticks={stickCount}
          stones={stoneCount}
          inventory={craftedTools}
          equippedMainHand={equippedMainHand}
          classHotbar={classHotbar}
          weaponHotbar={weaponHotbar}
          hasWeapon={hasWeapon}
          notification={notification}
          allyMessage={allyMessage}
          introActive={introPlaying && wakePhase === 'cinematic'}
          onSkipIntro={skipWakeCinematic}
          chunkHits={chunkHits}
          onCraft={handleQuickCraft}
          onEquip={handleEquip}
          onUnequip={handleUnequip}
          eventBridgeRef={missionEventRef as any}
          onMissionComplete={(id, title) => {
            showNotification(`✓ ${title}`);
            setAllyMessage(`Traveler: step complete — ${title}`);
            roomRef.current?.send('step_complete', { stepId: id });
          }}
          onAllMissionsComplete={() => {
            setAllyMessage(
              'Traveler line complete — craft/board raft and sail to your faction island on the shared outer ring.',
            );
          }}
        />
      )}

      {/* Editor is development-only; never expose scene-authoring controls in production MMO. */}
      {import.meta.env.DEV && loaded && !introPlaying && (
        <div className="absolute top-3 right-3 z-40">
          <ShipwreckSceneEditorHUD
            runtime={shipwreckRuntime}
            editorMode={sceneEditorMode}
            onEditorModeChange={setSceneEditorMode}
          />
        </div>
      )}

      {completed && (
        <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <h1
              className="text-5xl font-cinzel font-black tracking-[6px] mb-4"
              style={{ background: 'linear-gradient(180deg, #f6c945, #fff3c2 50%, #f6c945)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              TUTORIAL COMPLETE
            </h1>
            <p className="text-white/60 text-lg">Your raft is ready. The multiplayer faction lobby awaits.</p>
          </div>
        </div>
      )}

      {!loaded && (
        <div className="absolute inset-0 z-[100] bg-[#05060c] flex flex-col items-center justify-center">
          <h1 className="text-3xl font-cinzel font-black tracking-[4px] mb-4 text-amber-400">SHIPWRECK COVE</h1>
          <p className="text-white/40 text-xs mt-3">Loading high-quality pirate-islands and your Grudge6 hero…</p>
          <p className="text-cyan-400/50 text-[10px] mt-2">Multiplayer tutorial · up to {MULTIPLAYER_SHIPWRECK.maxPlayers} survivors</p>
        </div>
      )}
    </div>
  );
}

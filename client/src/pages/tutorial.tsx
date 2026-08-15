/**
 * TutorialPage — Shipwreck tutorial with production 3-state gameplay.
 *
 * Loads canonical Grudge6 race model (unarmed in harvest/build, weapon in combat).
 * Wires class skill tree, weapon skill tree (locked until weapon), and gathering
 * professions that persist to the Railway characters DB.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Client, Room } from 'colyseus.js';
import * as THREE from 'three';
import { Island3DEngine, type Island3DEngineConfig } from '@/island3d/engine/Island3DEngine';
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

export default function TutorialPage() {
  const [, setLocation] = useLocation();

  // Skip tutorial forever once home island is claimed (or tutorial already done)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isTutorialComplete()) {
        // Probe home island — if claimed, never force shipwreck again
        try {
          const res = await fetch('/api/island/current', { credentials: 'include' });
          if (res.ok && !cancelled) {
            markTutorialComplete();
            try {
              localStorage.setItem('warlords_home_island_claimed_v1', '1');
            } catch {
              /* ignore */
            }
            const id = getActiveCharacterId();
            setLocation(
              id
                ? `/home-island?characterId=${encodeURIComponent(id)}&from=skip-tutorial`
                : '/home-island?from=skip-tutorial',
            );
            return;
          }
        } catch {
          /* offline — stay on tutorial */
        }
        return;
      }
      // Tutorial flag set but maybe no island yet → home island create
      try {
        const res = await fetch('/api/island/current', { credentials: 'include' });
        if (res.ok && !cancelled) {
          const id = getActiveCharacterId();
          setLocation(
            id
              ? `/home-island?characterId=${encodeURIComponent(id)}&from=skip-tutorial`
              : '/home-island?from=skip-tutorial',
          );
        } else if (!cancelled) {
          setLocation(AFTER_TUTORIAL_PATH);
        }
      } catch {
        if (!cancelled) setLocation(AFTER_TUTORIAL_PATH);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Island3DEngine | null>(null);
  const onHarvestRef = useRef<(event: { nodeId?: string; resourceType: string }) => void>(() => {});
  const roomRef = useRef<Room | null>(null);
  const characterRef = useRef<Character | null>(null);
  const loadConfigRef = useRef<Grudge6LoadConfig | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [steps, setSteps] = useState<TutorialStep[]>([]);
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
    async function load() {
      try {
        // Phase B: session claim + activate before get()
        const { ensurePlayEntrySession } = await import('@/lib/characterHandoff');
        const entry = await ensurePlayEntrySession({ search: window.location.search });
        const handoff = entry.handoff;
        const activeId = handoff.characterId;

        if (!activeId) {
          // SSOT: no hero → Foundry create, then return to tutorial with characterId
          console.warn('[Tutorial] missing characterId — redirect /create-character');
          setLocation('/create-character?returnTo=' + encodeURIComponent('/tutorial?from=gcs'));
          return;
        }

        if (handoff.fromUrl) {
          persistActiveCharacter(activeId, handoff.from);
        }

        const char = await characterAPI.get(activeId);
        characterRef.current = char;
        // Tutorial opening: always unarmed race presentation at start
        const unarmedChar = {
          ...char,
          equipment: {},
          model3d: {
            ...(typeof char.model3d === 'object' && char.model3d ? char.model3d : {}),
            weaponSlots: {},
          },
        } as Character;
        const cfg = buildGrudge6LoadConfig(unarmedChar);
        // Force unarmed for tutorial island open
        cfg.hasWeapon = false;
        cfg.weaponSlots = {};
        cfg.equippedWeaponType = 'unarmed';
        loadConfigRef.current = cfg;

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
              ? 'Heroes handoff — shipwreck tutorial. Survive, craft, sail.'
              : 'Foundry handoff — shipwreck tutorial. Your hero washes ashore.',
          );
        }
      } catch (err) {
        console.error('[Tutorial] character load failed', err);
        const handoff = applyCharacterHandoffFromLocation();
        // Do NOT dump to /heroes? (dead-end layered UI). Re-enter via /home
        // funnel or retry cinema with the same characterId.
        if (handoff.characterId) {
          setLocation(
            `/home?characterId=${encodeURIComponent(handoff.characterId)}&from=tutorial-load-fail`,
          );
        } else {
          setLocation(
            '/create-character?returnTo=' +
              encodeURIComponent('/leviathan-cinema?from=gcs'),
          );
        }
      }
    }
    load();
  }, [setLocation]);

  // Flush offline harvest queue into Railway craft bag
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
      setAllyMessage(`Nice work! Your ${profession} is now level ${result.newLevel}. I'll take a share for the camp.`);
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
    // Also deposit mats into Railway craft bag (grudgewarlords.com/craft/)
    void depositHarvestResource(itemId, qty, 'tutorial-harvest');
  }, []);

  // ── Solo tutorial instance (NOT multiplayer lobby) ─────────────
  // Room: "tutorial" · filterBy characterId · maxClients 1
  // Pirate shipwreck island → raft E → home-island create/cNFT

  useEffect(() => {
    let client: Client | null = null;
    let room: Room | null = null;

    async function connect() {
      const cfg = loadConfigRef.current;
      if (!cfg) return;

      const characterId = String(cfg.characterId || '').trim();
      if (!characterId) {
        console.error('[Tutorial] characterId required for private solo adventure');
        return;
      }

      try {
        const endpoint = getColyseusEndpoint();
        client = new Client(endpoint);
        room = await client.joinOrCreate('tutorial', {
          characterId,
          characterName: cfg.name,
          heroRace: cfg.raceId,
          heroClass: cfg.classId,
          accountId: localStorage.getItem('grudge_account_id') || '',
          level: cfg.level,
          baseModelId: cfg.baseModelId,
          equippedWeaponType: getWeaponTypeForMode('harvest', cfg.classId, cfg.hasWeapon, cfg.equippedWeaponType),
        });
        roomRef.current = room;

        room.state.steps.onAdd((step: any, id: string) => {
          setSteps(prev => {
            if (prev.find(s => s.id === id)) return prev;
            return [...prev, { id, title: step.title, completed: step.completed }];
          });
          step.onChange(() => {
            setSteps(prev => prev.map(s =>
              s.id === id ? { ...s, completed: step.completed } : s
            ));
          });
        });

        room.onMessage('step_complete', (data: { stepId: string; title: string }) => {
          showNotification(`✓ ${data.title}`);
          if (data.stepId === 'fight_boar') {
            setHasWeapon(true);
            const char = characterRef.current;
            if (char) setWeaponHotbar(buildWeaponHotbar(char, true));
            setAllyMessage('Boar down — skin it and cook the meat at your campfire.');
          }
          if (data.stepId === 'craft_campfire') {
            setAllyMessage('Campfire ready. A boar will appear — switch to Combat when ready.');
          }
          if (data.stepId === 'cook_meat') {
            setAllyMessage('Meat cooked. Next: UI tour, then craft and board a raft (E).');
          }
        });

        room.onMessage('player_damaged', () => {
          // Tutorial: invincible, HP locked at 5
          setHp(TUTORIAL_LOCKED_HP);
        });
        room.onMessage('enemy_killed', (data: { type: string; xp: number }) => {
          showNotification(`Defeated ${data.type}! +${data.xp} XP`);
          if (data.type === 'boar') {
            setResources(prev => ({ ...prev, rawMeat: (prev.rawMeat || 0) + 1 }));
          }
        });
        room.onMessage('enemy_spawned', (data: { type: string }) => {
          if (data.type === 'boar') {
            showNotification('A wild boar appears!');
            setPlayMode('combat');
          }
        });

        room.onMessage('harvest_complete', async (data: { resource: string; quantity: number }) => {
          const key =
            data.resource === 'stick' || data.resource === 'driftwood' ? 'sticks'
            : data.resource === 'stone' ? 'stones'
            : data.resource;
          setResources(prev => ({ ...prev, [key]: (prev[key] || 0) + data.quantity }));
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
            data?.message || 'Raft ready — your home island awaits.',
          );
          setAllyMessage(
            'Traveler: The raft is yours. Home island is granted after the shipwreck trial — not at level 20. Sail true.',
          );
          markRaftCrafted();
          markTutorialComplete();
          try {
            localStorage.setItem('warlords_tutorial_race_v1', race);
          } catch {
            /* ignore */
          }
          // Production: tutorial + raft → home-island intro + creation
          const id = getActiveCharacterId();
          const dest =
            data?.nextPath ||
            (id
              ? `${AFTER_TUTORIAL_PATH}&characterId=${encodeURIComponent(id)}&race=${encodeURIComponent(race)}`
              : `${AFTER_TUTORIAL_PATH}&race=${encodeURIComponent(race)}`);
          setTimeout(() => setLocation(dest), 2800);
        });

        room.state.enemies?.onAdd?.((enemy: any, id: string) => {
          enemiesRef.current.set(id, { id, x: enemy.x, z: enemy.z, hp: enemy.hp, state: enemy.state });
          enemy.onChange?.(() => {
            enemiesRef.current.set(id, { id, x: enemy.x, z: enemy.z, hp: enemy.hp, state: enemy.state });
            const marker = markerMeshesRef.current.get(`enemy_${id}`);
            if (marker) {
              marker.position.set(enemy.x, 2, enemy.z);
              marker.visible = enemy.state !== 'dead';
            }
          });
          addEntityMarker(`enemy_${id}`, enemy.x, enemy.z, 'enemy');
        });
        room.state.enemies?.onRemove?.((_: any, id: string) => {
          enemiesRef.current.delete(id);
          removeEntityMarker(`enemy_${id}`);
        });

        room.state.harvestNodes?.onAdd?.((node: any, id: string) => {
          nodesRef.current.set(id, { id, type: node.resourceType, x: node.x, z: node.z, depleted: node.depleted });
          node.onChange?.(() => {
            nodesRef.current.set(id, { id, type: node.resourceType, x: node.x, z: node.z, depleted: node.depleted });
            const marker = markerMeshesRef.current.get(`node_${id}`);
            if (marker) marker.visible = !node.depleted;
          });
          addEntityMarker(`node_${id}`, node.x, node.z, node.resourceType === 'forest' ? 'wood' : 'stone');
        });
      } catch (err) {
        console.error('[Tutorial] Connection failed:', err);
      }
    }

    if (loadConfigRef.current) connect();

    return () => {
      room?.leave();
      roomRef.current = null;
      markerMeshesRef.current.forEach((mesh) => {
        mesh.geometry?.dispose();
        (mesh.material as THREE.Material)?.dispose();
      });
      markerMeshesRef.current.clear();
    };
  }, [characterName, showNotification, persistProfessionXp, addInventoryItem, setLocation, ally.name]);

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
    if (!canvas || engineRef.current) return;

    // Production tutorial = Chicken Gun pirate-islands map (lobby), wash-up at shipwreck_cove.
    // NOT procedural flat seed — same geometry as /island-3d?mode=lobby&map=pirate-islands.
    const config: Island3DEngineConfig = {
      seed: 'shipwreck-tutorial',
      canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      mode: 'lobby',
      lobbyMapId: 'pirate-islands',
      lobbyIslandId: 'grudge-open-world',
      quality: 'medium',
      enableCharacter: true,
      dayNight: { dayDurationSeconds: 20 * 60 },
      onLoadProgress: (pct) => {
        if (pct === 0 || pct === 100 || pct % 25 === 0) {
          console.log(`[Tutorial] pirate-islands load ${pct}%`);
        }
      },
      onHarvest: (evt) => onHarvestRef.current(evt),
    };

    const engine = new Island3DEngine(config);
    engineRef.current = engine;

    engine.init().then(async () => {
      setLoaded(true);
      engine.start();

      // Pirate-islands map is the world; shipwreck SSOT overlays harvest/NPC at cove.
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
        // Anchor tutorial nodes/props on chicken-gun shipwreck cove (not 0,0 procedural)
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

        // Tutorial UX: 5 HP locked + invincible + injured anim pack only for opener
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
              'Injured wash-up — Mixamo injured pack active. HP locked at 5 · invincible (tutorial).',
            );
          } else {
            setAllyMessage(
              'Injured opener (pose fallback) — upload Mixamo Injured Idle/Walk/Run/Ground/Getting Up to /models/animations/injured/. HP 5 · invincible.',
            );
          }
        }

        // First-segment harvest nodes
        harvestCtrlRef.current?.dispose();
        const harvest = new TutorialHarvestController(
          engine.character,
          threeScene,
          {
            onGather: (resource, qty) => {
              const key = resource === 'stick' ? 'sticks' : 'stones';
              setResources((prev) => {
                const next = { ...prev, [key]: (prev[key] || 0) + qty };
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
              showNotification(`+${qty} ${resource}`);
              missionEventRef.current?.({ type: 'harvest', resource });
              void persistProfessionXp(resource === 'stick' ? 'wood' : 'stone');
              void addInventoryItem(resource, qty);
              roomRef.current?.send('harvest', {
                nodeId: resource === 'stick' ? 'near_stick' : 'near_stone',
              });
            },
            onChunkHit: (left, max) => {
              setChunkHits({ left, max });
            },
            onChunkDestroyed: () => {
              setChunkHits(null);
              // Recover from injured opener after first rock break
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

        // Wash-up on shipwreck_cove beach (chicken gun pirate map)
        const spawn = new THREE.Vector3(
          wakeOrigin.x + SHIPWRECK_WAKE.spawn.x,
          wakeOrigin.y + SHIPWRECK_WAKE.spawn.y,
          wakeOrigin.z + SHIPWRECK_WAKE.spawn.z,
        );
        // Snap to lobby ground if available
        const groundY = engine.sampleLobbyGroundHeight?.(spawn.x, spawn.z);
        if (typeof groundY === 'number' && Number.isFinite(groundY)) {
          spawn.y = groundY + 0.15;
        }
        engine.character.teleportTo(spawn);

        // Slow zoom → injured ground → get-up → injured idle harvest
        const cinematic = new TutorialWakeCinematic({
          camera: cam,
          character: engine.character,
          skip: false,
          hasInjuredGround: hasGround,
          hasInjuredGetUp: hasGetUp,
          wakeOrigin,
          onCinematicBegin: () => engine.beginCinematicCamera(),
          onCinematicEnd: () => {
            // Always restore TPC play_tps (never leave OrbitControls writing camera)
            engine.endCinematicCamera();
            engine.setCameraMode('play_tps');
            if (engine.character) {
              engine.character.cameraFollowEnabled = true;
              engine.character.setFacingYaw?.(SHIPWRECK_WAKE.facingYaw);
            }
            const cam = engine.getCamera();
            if (cam && 'fov' in cam) {
              cam.fov = 58;
              cam.updateProjectionMatrix?.();
            }
          },
          onComplete: () => {
            // Double-ensure sole-owner TPC after wake (casting parity FOV 58°)
            engine.setCameraMode('play_tps');
            if (engine.character) {
              engine.character.cameraFollowEnabled = true;
              engine.character.setFacingYaw?.(SHIPWRECK_WAKE.facingYaw);
            }
            const cam = engine.getCamera();
            if (cam && 'fov' in cam) {
              cam.fov = 58;
              cam.updateProjectionMatrix?.();
            }
            setWakePhase('playable');
            setIntroPlaying(false);
            setPlayMode('harvest');
            setHp(TUTORIAL_LOCKED_HP);
            segmentPhaseRef.current = 'gather_basics';
            setSegmentPhase('gather_basics');
            roomRef.current?.send('intro_complete');
            setAllyMessage(
              'Dock Traveler: Easy there, shipwrecked. Harvest sticks & stones · craft tools · claim · fight · then raft to your faction island on the outer lobby ring.',
            );
          },
        });
        wakeCinematicRef.current = cinematic;
        cinematic.start();
      }
    }).catch((err) => {
      console.error('[Tutorial] Engine init failed:', err);
      // Fail closed — do not start gravity without lobby walk layer
    });

    // Drive cinematic + harvest + scene runtime
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

      // Walk-forward completion
      if (
        segmentPhaseRef.current === 'walk_forward'
        && pos
        && harvestCtrlRef.current?.isNearGrove(pos)
      ) {
        segmentPhaseRef.current = 'segment_complete';
        setSegmentPhase('segment_complete');
        setAllyMessage(
          'First segment complete. Camp props (flag, fire, torch, tent, storage, benches) unlock for refine / over-time harvest.',
        );
        showNotification('Segment complete');
      }
    };
    raf = requestAnimationFrame(tick);

    const handleResize = () => engine.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', handleResize);
    // Tab cycles modes
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      setPlayMode((prev) => {
        // Q / HUD owns mode swap; Tab is soft-lock in engine. Dual-mode only.
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
  }, [heroRace, heroClass]);

  // ── Position sync ──────────────────────────────────────────────

  useEffect(() => {
    if (!roomRef.current || !engineRef.current) return;
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
      const key = resourceType === 'driftwood' ? 'wood' : resourceType;
      setResources(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
      showNotification(`Gathered ${resourceType}`);
      void persistProfessionXp(key);
      if (nodeId) roomRef.current?.send('harvest', { nodeId });
      else {
        const nearest = findNearest(nodesRef.current);
        if (nearest) roomRef.current?.send('harvest', { nodeId: nearest });
      }
    };
  });

  const handleHarvest = () => {
    if (playMode !== 'harvest') { setPlayMode('harvest'); return; }
    // Prefer complete scene nodes (wake sticks/stones with visuals)
    const pos = engineRef.current?.character?.getPosition();
    if (pos && shipwreckRuntimeRef.current) {
      const node = shipwreckRuntimeRef.current.harvestNearest(pos, 4);
      if (node) {
        const key = node.resource === 'stone' ? 'stones' : node.resource === 'stick' ? 'sticks' : (node.resource ?? node.kind);
        setResources((prev) => ({ ...prev, [key]: (prev[key] || 0) + (node.quantity ?? 1) }));
        showNotification(`Gathered ${node.resource ?? node.kind}`);
        void persistProfessionXp(key === 'sticks' ? 'wood' : key);
        void addInventoryItem(node.resource ?? node.kind, node.quantity ?? 1);
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
    // Keep HP locked for full tutorial scene
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
      'Harvest mode (unarmed). E · RMB · 1 · 2 to gather stick and stone at your feet.',
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
    setResources((prev) => ({
      ...prev,
      sticks: Math.max(0, (prev.sticks || 0) - recipe.cost.stick),
      stones: Math.max(0, (prev.stones || 0) - recipe.cost.stone),
    }));
    setCraftedTools((prev) => [...prev, recipeId]);
    void addInventoryItem(recipeId, 1);
    roomRef.current?.send('craft', { recipeId });
    showNotification(`Crafted ${recipe.name}!`);
    missionEventRef.current?.({ type: 'craft', itemId: recipeId });

    if (recipeId === 't0_pickaxe') {
      segmentPhaseRef.current = 'equip_pickaxe';
      setSegmentPhase('equip_pickaxe');
      setAllyMessage(
        'Pickaxe crafted! Open Main Panel → Inventory and equip MainHand — then soft-lock the large rock (hold E).',
      );
    }
  };

  const handleEquip = (itemId: string) => {
    setEquippedMainHand(itemId);
    harvestCtrlRef.current?.setEquippedTool(itemId);
    void engineRef.current?.character?.setControlMode('harvest', heroClass, false).then(() => {
      // Ensure pickaxe mesh + harvest locomotion after mode equip
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

  return (
    <div className="fixed inset-0 bg-black">
      <canvas
        ref={canvasRef}
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

      {/* Production shell — character HUD + Main Panel + Dock Traveler missions */}
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
              'Traveler line complete — craft/board raft and sail to your faction island on the outer ring.',
            );
          }}
        />
      )}

      {/* Optional scene editor (gizmo / zones) — after intro */}
      {loaded && !introPlaying && (
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
            <p className="text-white/60 text-lg">Your raft is ready.</p>
          </div>
        </div>
      )}

      {!loaded && (
        <div className="absolute inset-0 z-[100] bg-[#05060c] flex flex-col items-center justify-center">
          <h1 className="text-3xl font-cinzel font-black tracking-[4px] mb-4 text-amber-400">LOADING</h1>
          <p className="text-white/30 text-xs mt-3">Loading Grudge6 hero...</p>
        </div>
      )}
    </div>
  );
}
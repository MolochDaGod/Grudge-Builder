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
import { TutorialGameplayHUD, type ControlMode } from '@/components/TutorialGameplayHUD';
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
import { getAvatarForContext } from '@/lib/aiAvatars';

interface TutorialStep {
  id: string;
  title: string;
  completed: boolean;
}

export default function TutorialPage() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Island3DEngine | null>(null);
  const roomRef = useRef<Room | null>(null);
  const characterRef = useRef<Character | null>(null);
  const loadConfigRef = useRef<Grudge6LoadConfig | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [steps, setSteps] = useState<TutorialStep[]>([]);
  const [hp, setHp] = useState(100);
  const [maxHp] = useState(100);
  const [introPlaying, setIntroPlaying] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [playMode, setPlayMode] = useState<ControlMode>('harvest');
  const [resources, setResources] = useState<Record<string, number>>({});
  const [professions, setProfessions] = useState(getActiveGatheringProfessions({}));
  const [allyMessage, setAllyMessage] = useState<string | null>(null);
  const [hasWeapon, setHasWeapon] = useState(false);

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

  useEffect(() => {
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
      } catch {
        setLocation('/create-character');
      }
    }
    load();
  }, [setLocation]);

  // ── Sync play mode → 3D character animations ───────────────────

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine?.character || !loaded) return;
    engine.character.setControlMode(playMode, heroClass, hasWeapon).catch(() => {});
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
  }, []);

  // ── Connect to ShipwreckRoom ───────────────────────────────────

  useEffect(() => {
    let client: Client | null = null;
    let room: Room | null = null;

    async function connect() {
      const cfg = loadConfigRef.current;
      if (!cfg) return;

      try {
        const endpoint = getColyseusEndpoint();
        client = new Client(endpoint);
        room = await client.joinOrCreate('shipwreck', {
          characterId: cfg.characterId,
          characterName: cfg.name,
          heroRace: cfg.raceId,
          heroClass: cfg.classId,
          accountId: localStorage.getItem('grudge_account_id') || '',
          level: cfg.level,
          baseModelId: cfg.baseModelId,
          equippedWeaponType: getWeaponTypeForMode('harvest', cfg.classId, cfg.hasWeapon),
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
          if (data.stepId === 'craft_axe') {
            setHasWeapon(true);
            const char = characterRef.current;
            if (char) setWeaponHotbar(buildWeaponHotbar(char, true));
            setAllyMessage('Stone axe ready — switch to Combat mode and try your weapon skills (5-8).');
          }
        });

        room.onMessage('player_damaged', (data: { hp: number }) => setHp(data.hp));
        room.onMessage('enemy_killed', (data: { type: string; xp: number }) => {
          showNotification(`Defeated ${data.type}! +${data.xp} XP`);
        });

        room.onMessage('harvest_complete', async (data: { resource: string; quantity: number }) => {
          const key = data.resource === 'driftwood' ? 'wood' : data.resource;
          setResources(prev => ({ ...prev, [key]: (prev[key] || 0) + data.quantity }));
          showNotification(`Gathered ${data.resource} ×${data.quantity}`);
          await persistProfessionXp(key);
          await addInventoryItem(data.resource, data.quantity);
          room?.send('ally_supply', { resource: data.resource, quantity: Math.ceil(data.quantity / 2) });
        });

        room.onMessage('craft_complete', async (data: { name: string; itemId?: string }) => {
          showNotification(`Crafted ${data.name}!`);
          setHasWeapon(true);
          await addInventoryItem(data.itemId ?? 'stone_axe', 1);
          setAllyMessage(`${ally.name} stashes the ${data.name} — you're armed for combat.`);
        });

        room.onMessage('ally_assist', (data: { message: string }) => {
          setAllyMessage(data.message);
        });

        room.onMessage('profession_xp', (data: { profession: string; xp: number; level: number }) => {
          showNotification(`+${data.xp} ${data.profession} XP`);
        });

        room.onMessage('tutorial_complete', () => {
          setCompleted(true);
          showNotification('Tutorial Complete! Setting sail to your island...');
          setTimeout(() => setLocation('/island-reveal'), 3000);
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

    const config: Island3DEngineConfig = {
      seed: 'shipwreck-tutorial',
      canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      mode: 'procedural',
      quality: 'low',
      enableCharacter: true,
      dayNight: { dayDurationSeconds: 20 * 60 },
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
        );
        engine.character.mode = 'harvest';
      }
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

  const handleHarvest = () => {
    if (playMode !== 'harvest') { setPlayMode('harvest'); return; }
    const nearest = findNearest(nodesRef.current);
    if (nearest) roomRef.current?.send('harvest', { nodeId: nearest });
    else showNotification('No resource node nearby — switch to Harvest mode');
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
    showNotification(`${slot.label} — ${slot.description.slice(0, 60)}`);
    roomRef.current?.send('use_skill', { skillId: slot.skillId, kind: slot.kind });
  };

  const handleModeChange = (mode: ControlMode) => {
    setPlayMode(mode);
    const hints: Record<ControlMode, string> = {
      harvest: 'Unarmed gather mode — harvest wood and stone for professions.',
      combat: hasWeapon ? 'Combat ready — LMB attack, keys 1-8 for skills.' : 'Unarmed combat — craft a stone axe in Build mode first.',
      build: 'Build mode — craft tools and construct your escape raft.',
    };
    setAllyMessage(hints[mode]);
  };

  const dismissIntro = () => {
    setIntroPlaying(false);
    roomRef.current?.send('intro_complete');
    setAllyMessage('Start in Harvest mode — gather driftwood and stone. I\'ll share supplies with our camp.');
  };

  return (
    <div className="fixed inset-0 bg-black">
      <canvas ref={canvasRef} className="w-full h-full" />

      {introPlaying && loaded && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center pointer-events-auto">
          <div className="text-center max-w-lg p-8">
            <h1
              className="text-4xl font-cinzel font-black tracking-[4px] mb-4"
              style={{ background: 'linear-gradient(180deg, #f6c945, #fff3c2 50%, #f6c945)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              SHIPWRECKED
            </h1>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              Your Grudge6 hero washes ashore unarmed. Learn three play modes:
              <span className="text-green-400"> Harvest</span>,
              <span className="text-red-400"> Combat</span>, and
              <span className="text-blue-400"> Build</span>.
            </p>
            <p className="text-amber-400/80 text-xs mb-8 font-cinzel tracking-wider">
              Tab cycles modes · WASD move · {ally.name} guides your camp
            </p>
            <button
              onClick={dismissIntro}
              className="font-cinzel font-black text-sm px-10 py-3 rounded-xl border-0 cursor-pointer transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(180deg, #f6c945, #d8a819)', color: '#20180a', boxShadow: '0 10px 30px -10px rgba(246,201,69,.5)', letterSpacing: '2px' }}
            >
              AWAKEN
            </button>
          </div>
        </div>
      )}

      {loaded && !introPlaying && (
        <TutorialGameplayHUD
          characterName={characterName}
          heroClass={heroClass}
          level={level}
          hp={hp}
          maxHp={maxHp}
          playMode={playMode}
          onModeChange={handleModeChange}
          steps={steps}
          classHotbar={classHotbar}
          weaponHotbar={weaponHotbar}
          professions={professions}
          resources={resources}
          hasWeapon={hasWeapon}
          allyName={ally.name}
          allyMessage={allyMessage}
          notification={notification}
          onHarvest={handleHarvest}
          onAttack={handleAttack}
          onCraft={handleCraft}
          onBuildRaft={handleBuildRaft}
          onUseSkill={handleUseSkill}
        />
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
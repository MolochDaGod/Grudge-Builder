/**
 * TutorialPage — Shipwreck tutorial instance.
 *
 * New characters start here. They wash ashore on a small island and learn:
 *   1. Movement (explore the wreck)
 *   2. Combat (fight shore crabs)
 *   3. Harvesting (gather driftwood & stone)
 *   4. Crafting (build a stone axe)
 *   5. Building (construct a raft to leave)
 *
 * Connects to ShipwreckRoom (private 1-player instance) via Colyseus.
 * On completion, transitions to /play (main world).
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Client, Room } from 'colyseus.js';
import { Island3DEngine, type Island3DEngineConfig } from '@/island3d/engine/Island3DEngine';
import { characterAPI } from '@/lib/api';
import { Check, Circle, Sword, Axe, TreePine, Hammer, Ship } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────

interface TutorialStep {
  id: string;
  title: string;
  completed: boolean;
}

// ── Colyseus endpoint ────────────────────────────────────────────

function getColyseusEndpoint(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl.replace(/^http/, 'ws');
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.hostname}:5000`;
}

// ── Step icons ───────────────────────────────────────────────────

const STEP_ICONS: Record<string, React.ReactNode> = {
  explore_wreck: <Ship className="w-4 h-4" />,
  fight_crab: <Sword className="w-4 h-4" />,
  gather_wood: <TreePine className="w-4 h-4" />,
  gather_stone: <Circle className="w-4 h-4" />,
  craft_axe: <Axe className="w-4 h-4" />,
  build_raft: <Hammer className="w-4 h-4" />,
};

// ── Component ────────────────────────────────────────────────────

export default function TutorialPage() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Island3DEngine | null>(null);
  const roomRef = useRef<Room | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [steps, setSteps] = useState<TutorialStep[]>([]);
  const [hp, setHp] = useState(100);
  const [maxHp] = useState(100);
  const [introPlaying, setIntroPlaying] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Load character info
  const [characterName, setCharacterName] = useState('Shipwrecked');
  const [heroRace, setHeroRace] = useState('human');
  const [heroClass, setHeroClass] = useState('warrior');

  // ── Load character data ────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const grudgeId = localStorage.getItem('grudge_account_id') || 'guest';
        const activeId = localStorage.getItem(`gruda_active_character_${grudgeId}`) ||
          localStorage.getItem('grudge_active_character') ||
          localStorage.getItem('gruda_active_character_guest');

        if (activeId) {
          const char = await characterAPI.get(activeId);
          setCharacterName(char.name);
          setHeroRace(char.raceId);
          setHeroClass(char.classId);
        }
      } catch {}
    }
    load();
  }, []);

  // ── Connect to ShipwreckRoom ───────────────────────────────────

  useEffect(() => {
    let client: Client | null = null;
    let room: Room | null = null;

    async function connect() {
      try {
        const endpoint = getColyseusEndpoint();
        client = new Client(endpoint);
        room = await client.joinOrCreate('shipwreck', {
          characterName,
          heroRace,
          heroClass,
          accountId: localStorage.getItem('grudge_account_id') || '',
        });
        roomRef.current = room;

        // Sync tutorial steps
        room.state.steps.onAdd((step: any, id: string) => {
          setSteps(prev => {
            const exists = prev.find(s => s.id === id);
            if (exists) return prev;
            return [...prev, { id, title: step.title, completed: step.completed }];
          });

          step.onChange(() => {
            setSteps(prev => prev.map(s =>
              s.id === id ? { ...s, completed: step.completed } : s
            ));
          });
        });

        // Listen for step completions
        room.onMessage('step_complete', (data: { stepId: string; title: string }) => {
          showNotification(`✓ ${data.title}`);
        });

        // Listen for combat events
        room.onMessage('player_damaged', (data: { hp: number }) => {
          setHp(data.hp);
        });

        room.onMessage('enemy_killed', (data: { type: string; xp: number }) => {
          showNotification(`Defeated ${data.type}! +${data.xp} XP`);
        });

        room.onMessage('harvest_complete', (data: { resource: string; quantity: number }) => {
          showNotification(`Gathered ${data.resource} ×${data.quantity}`);
        });

        room.onMessage('craft_complete', (data: { name: string }) => {
          showNotification(`Crafted ${data.name}!`);
        });

        room.onMessage('tutorial_complete', () => {
          setCompleted(true);
          showNotification('🎉 Tutorial Complete! Setting sail to your island...');
          setTimeout(() => setLocation('/home-island'), 3000);
        });

        console.log('[Tutorial] Connected to ShipwreckRoom');
      } catch (err) {
        console.error('[Tutorial] Connection failed:', err);
      }
    }

    connect();

    return () => {
      room?.leave();
      roomRef.current = null;
    };
  }, [characterName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initialize 3D engine ───────────────────────────────────────

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
      dayNight: { cycleDurationMs: 20 * 60 * 1000 }, // slow day/night
    };

    const engine = new Island3DEngine(config);
    engineRef.current = engine;

    engine.init().then(() => {
      setLoaded(true);
      engine.start();

      // Load character model
      if (engine.character) {
        engine.character.loadCharacterFromManifest(heroRace, heroClass).catch(() => {});
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

  // ── Send position updates at 10Hz ──────────────────────────────

  useEffect(() => {
    if (!roomRef.current || !engineRef.current) return;

    const interval = setInterval(() => {
      const engine = engineRef.current;
      if (!engine?.character) return;

      const pos = engine.character.getPosition();
      const facing = engine.character.getFacing();
      const state = engine.character.isMoving() ? 'moving' : 'idle';

      roomRef.current?.send('move', { x: pos.x, y: pos.y, z: pos.z, facing, state });
    }, 100); // 10 Hz

    return () => clearInterval(interval);
  }, [loaded]);

  // ── Notifications ──────────────────────────────────────────────

  const showNotification = useCallback((text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // ── Dismiss intro ──────────────────────────────────────────────

  const dismissIntro = () => {
    setIntroPlaying(false);
    roomRef.current?.send('intro_complete');
  };

  // ── Action buttons ─────────────────────────────────────────────

  const handleHarvest = () => {
    // Find nearest node via raycasting (simplified: harvest closest)
    roomRef.current?.send('harvest', { nodeId: 'drift_1' });
  };

  const handleCraft = () => {
    roomRef.current?.send('craft', { recipeId: 'stone_axe' });
  };

  const handleBuildRaft = () => {
    roomRef.current?.send('build_raft');
  };

  const handleAttack = () => {
    // Attack nearest enemy
    roomRef.current?.send('pve_attack', { enemyId: 'crab_' + Date.now(), damage: 15 });
  };

  // ── Render ─────────────────────────────────────────────────────

  const completedCount = steps.filter(s => s.completed).length;
  const progressPct = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black">
      {/* 3D Canvas */}
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Intro overlay */}
      {introPlaying && loaded && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="text-center max-w-lg p-8">
            <h1
              className="text-4xl font-cinzel font-black tracking-[4px] mb-4"
              style={{ background: 'linear-gradient(180deg, #f6c945, #fff3c2 50%, #f6c945)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              SHIPWRECKED
            </h1>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              A terrible storm has destroyed your ship. You've washed ashore on an unknown island.
              Search the wreckage, fight off the creatures, gather resources, and build a raft to escape.
            </p>
            <p className="text-amber-400/80 text-xs mb-8 font-cinzel tracking-wider">
              WASD to move · Left click to attack · Tab to toggle combat mode
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

      {/* Tutorial HUD */}
      {loaded && !introPlaying && (
        <>
          {/* HP bar */}
          <div className="absolute top-4 left-4 z-40">
            <div className="bg-black/70 backdrop-blur-sm rounded-xl border border-white/10 p-3 w-56">
              <div className="text-white text-sm font-bold mb-1.5">{characterName}</div>
              <div className="relative h-3.5 bg-red-950/50 rounded-full overflow-hidden border border-red-800/30">
                <div
                  className="absolute inset-0 rounded-full transition-all duration-500"
                  style={{ width: `${(hp / maxHp) * 100}%`, background: 'linear-gradient(90deg, #dc2626, #ef4444)' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white drop-shadow-sm">{hp} / {maxHp}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step checklist */}
          <div className="absolute top-4 right-4 z-40">
            <div className="bg-black/70 backdrop-blur-sm rounded-xl border border-white/10 p-3 w-64">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-400 text-xs font-cinzel tracking-wider">TUTORIAL</span>
                <span className="text-white/40 text-[10px]">{completedCount}/{steps.length}</span>
              </div>

              {/* Progress bar */}
              <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Steps */}
              <div className="space-y-1.5">
                {steps.map(step => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                      step.completed
                        ? 'bg-green-900/20 border border-green-700/30'
                        : 'bg-white/5 border border-white/5'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      step.completed ? 'bg-green-600' : 'bg-white/10'
                    }`}>
                      {step.completed
                        ? <Check className="w-3 h-3 text-white" />
                        : (STEP_ICONS[step.id] || <Circle className="w-3 h-3 text-white/30" />)
                      }
                    </div>
                    <span className={step.completed ? 'text-green-300 line-through' : 'text-white/70'}>
                      {step.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
            <div className="flex gap-2 bg-black/60 backdrop-blur-sm rounded-2xl border border-white/10 p-2">
              <button onClick={handleAttack} className="w-12 h-12 rounded-xl border border-red-800/30 bg-red-950/30 flex items-center justify-center text-red-400 hover:bg-red-900/40 transition-colors" title="Attack (LMB)">
                <Sword className="w-5 h-5" />
              </button>
              <button onClick={handleHarvest} className="w-12 h-12 rounded-xl border border-green-800/30 bg-green-950/30 flex items-center justify-center text-green-400 hover:bg-green-900/40 transition-colors" title="Harvest">
                <TreePine className="w-5 h-5" />
              </button>
              <button onClick={handleCraft} className="w-12 h-12 rounded-xl border border-amber-800/30 bg-amber-950/30 flex items-center justify-center text-amber-400 hover:bg-amber-900/40 transition-colors" title="Craft Axe">
                <Axe className="w-5 h-5" />
              </button>
              <button onClick={handleBuildRaft} className="w-12 h-12 rounded-xl border border-blue-800/30 bg-blue-950/30 flex items-center justify-center text-blue-400 hover:bg-blue-900/40 transition-colors" title="Build Raft">
                <Ship className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notification toast */}
          {notification && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="bg-black/80 backdrop-blur-sm rounded-xl border border-amber-600/30 px-5 py-2.5 text-amber-300 text-sm font-bold tracking-wider">
                {notification}
              </div>
            </div>
          )}

          {/* Completion overlay */}
          {completed && (
            <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center animate-in fade-in">
              <div className="text-center">
                <h1
                  className="text-5xl font-cinzel font-black tracking-[6px] mb-4"
                  style={{ background: 'linear-gradient(180deg, #f6c945, #fff3c2 50%, #f6c945)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                  TUTORIAL COMPLETE
                </h1>
                <p className="text-white/60 text-lg mb-2">Your raft is ready.</p>
                <p className="text-amber-400/60 text-sm font-cinzel tracking-wider animate-pulse">
                  Setting sail to the world...
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Loading screen */}
      {!loaded && (
        <div className="absolute inset-0 z-[100] bg-[#05060c] flex flex-col items-center justify-center">
          <h1 className="text-3xl font-cinzel font-black tracking-[4px] mb-4 text-amber-400">
            LOADING
          </h1>
          <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-amber-500 animate-pulse" style={{ width: '60%' }} />
          </div>
          <p className="text-white/30 text-xs mt-3">Preparing the shipwreck...</p>
        </div>
      )}
    </div>
  );
}

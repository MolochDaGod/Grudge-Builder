/**
 * HomeIslandPage — per-player persistent island instance.
 *
 * Connects to HomeIslandRoom via Colyseus. Features:
 *   - Procedural terrain from player's island seed (same every time)
 *   - Harvest nodes: click to gather, auto-respawn at 2 min
 *   - Auto-harvest notifications (heroes gather while you're away)
 *   - Building system: place/remove structures
 *   - Visitor indicator: shows who else is on your island
 *   - Resource counter HUD
 *   - Leave button → back to world
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Client, Room } from 'colyseus.js';
import { Island3DEngine, type Island3DEngineConfig } from '@/island3d/engine/Island3DEngine';
import { RemotePlayerManager } from '@/island3d/sync/RemotePlayerManager';
import { characterAPI } from '@/lib/api';
import { getColyseusEndpoint } from '@/lib/colyseusEndpoint';
import {
  TreePine, Pickaxe, Fish, Leaf, Users, Package,
  Hammer, LogOut, Home,
} from 'lucide-react';

// ── Resource icons ───────────────────────────────────────────────

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  forest: <TreePine className="w-3.5 h-3.5 text-green-400" />,
  mining: <Pickaxe className="w-3.5 h-3.5 text-amber-400" />,
  fishing: <Fish className="w-3.5 h-3.5 text-blue-400" />,
  herbalism: <Leaf className="w-3.5 h-3.5 text-emerald-400" />,
};

// ── Component ────────────────────────────────────────────────────

export default function HomeIslandPage() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Island3DEngine | null>(null);
  const roomRef = useRef<Room | null>(null);
  const rpmRef = useRef<RemotePlayerManager | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [resources, setResources] = useState<Record<string, number>>({});
  const [buildingCount, setBuildingCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const [islandName, setIslandName] = useState('Home Island');
  const [characterName, setCharacterName] = useState('Islander');
  const [heroRace, setHeroRace] = useState('human');
  const [heroClass, setHeroClass] = useState('warrior');
  const [islandSeed, setIslandSeed] = useState('home-island');

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
          setIslandSeed(`island-${grudgeId}`);
        }
      } catch {}
    }
    load();
  }, []);

  // ── Connect to HomeIslandRoom ──────────────────────────────────

  useEffect(() => {
    let client: Client | null = null;
    let room: Room | null = null;

    async function connect() {
      try {
        const endpoint = getColyseusEndpoint();
        client = new Client(endpoint);
        const accountId = localStorage.getItem('grudge_account_id') || 'guest';

        room = await client.joinOrCreate('home_island', {
          accountId,
          characterName,
          heroRace,
          heroClass,
          islandUUID: accountId,
        });
        roomRef.current = room;

        // Track player count
        room.state.players.onAdd(() => {
          setPlayerCount(room!.state.players.size);
        });
        room.state.players.onRemove(() => {
          setPlayerCount(room!.state.players.size);
        });

        // Sync building count
        room.state.listen('buildingCount', (value: number) => {
          setBuildingCount(value);
        });

        // Listen for harvest events
        room.onMessage('harvest_complete', (data: { resource: string; quantity: number }) => {
          setResources(prev => ({
            ...prev,
            [data.resource]: (prev[data.resource] || 0) + data.quantity,
          }));
          showNotification(`Gathered ${data.resource} ×${data.quantity}`);
        });

        // Auto-harvest notifications
        room.onMessage('auto_harvest', (data: { resource: string; quantity: number; total: number }) => {
          setResources(prev => ({ ...prev, [data.resource]: data.total }));
          showNotification(`🤖 Hero gathered ${data.resource} (total: ${data.total})`);
        });

        // Building events
        room.onMessage('building_placed', (data: { buildingId: string; totalBuildings: number }) => {
          setBuildingCount(data.totalBuildings);
          showNotification(`🏗️ Building placed!`);
        });

        room.onMessage('building_removed', () => {
          showNotification(`🗑️ Building removed`);
        });

        // Island exit
        room.onMessage('island_exit', () => {
          setLocation('/play');
        });

        // Request current resources
        room.send('get_resources');
        room.onMessage('resources', (data: Record<string, number>) => {
          setResources(data);
        });

        console.log('[HomeIsland] Connected to HomeIslandRoom');
      } catch (err) {
        console.error('[HomeIsland] Connection failed:', err);
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

    engine.init().then(() => {
      setLoaded(true);
      engine.start();

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
  }, [islandSeed, heroRace, heroClass]);

  // ── Sync visitors via RemotePlayerManager ──────────────────────

  useEffect(() => {
    if (!roomRef.current || !engineRef.current) return;
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
          facing: player.facing,
          state: player.state,
        });
      });

      showNotification(`${player.characterName} is visiting your island!`);
    });

    room.state.players.onRemove((player: any, sessionId: string) => {
      rpm.removePlayer(sessionId);
    });

    return () => {
      unregister();
      rpm.dispose();
      rpmRef.current = null;
    };
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

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
    }, 100);

    return () => clearInterval(interval);
  }, [loaded]);

  // ── Notifications ──────────────────────────────────────────────

  const showNotification = useCallback((text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // ── Actions ────────────────────────────────────────────────────

  const handleLeave = () => {
    roomRef.current?.send('leave_island');
    setLocation('/play');
  };

  const handleBuild = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.startBuilding('foundation');
    showNotification('Building mode: click to place');
  };

  // ── Render ─────────────────────────────────────────────────────

  const totalResources = Object.values(resources).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 bg-black">
      <canvas ref={canvasRef} className="w-full h-full" />

      {loaded && (
        <>
          {/* Top-left: Island info */}
          <div className="absolute top-4 left-4 z-40">
            <div className="bg-black/70 backdrop-blur-sm rounded-xl border border-white/10 p-3 w-64">
              <div className="flex items-center gap-2 mb-2">
                <Home className="w-4 h-4 text-amber-400" />
                <span className="text-white text-sm font-bold">{islandName}</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-white/50">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {playerCount}
                </span>
                <span className="flex items-center gap-1">
                  <Hammer className="w-3 h-3" /> {buildingCount} buildings
                </span>
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" /> {totalResources} items
                </span>
              </div>
            </div>
          </div>

          {/* Top-right: Resources */}
          <div className="absolute top-4 right-4 z-40">
            <div className="bg-black/70 backdrop-blur-sm rounded-xl border border-white/10 p-3 w-52">
              <div className="text-amber-400 text-xs font-cinzel tracking-wider mb-2">RESOURCES</div>
              <div className="space-y-1.5">
                {Object.entries(resources).length === 0 ? (
                  <div className="text-white/30 text-xs">No resources yet</div>
                ) : (
                  Object.entries(resources).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {RESOURCE_ICONS[type] || <Package className="w-3.5 h-3.5 text-white/30" />}
                        <span className="text-white/70 capitalize">{type}</span>
                      </div>
                      <span className="text-white font-bold">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bottom: Action bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
            <div className="flex gap-2 bg-black/60 backdrop-blur-sm rounded-2xl border border-white/10 p-2">
              <button
                onClick={handleBuild}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-800/30 bg-amber-950/30 text-amber-400 hover:bg-amber-900/40 transition-colors text-xs font-bold"
              >
                <Hammer className="w-4 h-4" /> BUILD
              </button>
              <button
                onClick={handleLeave}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 transition-colors text-xs"
              >
                <LogOut className="w-4 h-4" /> SAIL TO WORLD
              </button>
            </div>
          </div>

          {/* Notification toast */}
          {notification && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-black/80 backdrop-blur-sm rounded-xl border border-amber-600/30 px-5 py-2.5 text-amber-300 text-sm font-bold tracking-wider">
                {notification}
              </div>
            </div>
          )}
        </>
      )}

      {/* Loading */}
      {!loaded && (
        <div className="absolute inset-0 z-[100] bg-[#05060c] flex flex-col items-center justify-center">
          <Home className="w-12 h-12 text-amber-400 mb-4" />
          <h1 className="text-2xl font-cinzel font-black tracking-[4px] mb-3 text-amber-400">HOME ISLAND</h1>
          <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-amber-500 animate-pulse" style={{ width: '50%' }} />
          </div>
          <p className="text-white/30 text-xs mt-3">Generating your island...</p>
        </div>
      )}
    </div>
  );
}

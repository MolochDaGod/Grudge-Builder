/**
 * Island 3D Page — defaults to the Studio Map Editor (HDR terrain, creatures, play mode).
 * Legacy Island3DEngine remains available via ?engine=legacy, ?mode=zone, or ?mode=lobby.
 */
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Island3DRenderer } from '@/island3d/render/Island3DRenderer';
import type { Island3DMode, Island3DEngine } from '@/island3d/engine/Island3DEngine';
import { LOBBY_MAPS } from '@/island3d/engine/LobbyIslandLoader';
import { authHeaders } from '@/lib/grudgeBackend';
import { normalizeHomeIslandResponse } from '@/lib/homeIslandApi';
import { characterAPI } from '@/lib/api';
import { WORLD_SECTORS, getSectorById } from '@shared/definitions/worldMapSectors';
import { Loader2, Users, ExternalLink } from 'lucide-react';
import { clearTopDownCache } from '@/island3d/render/IslandTopDownCapture';
import { useZoneColyseus } from '@/hooks/use-zone-colyseus';
import type { PlayerInfo } from '@/hooks/use-colyseus';
import { CLASS_WEAPON_MAP } from '@/lib/modelManifest';
import { parseModel3d, type Model3DField } from '@/lib/grudge6Character';
import type { MultiplayerConfig } from '@/island3d/sync/MultiplayerSync';
import {
  ensureAuthForStudio,
  buildStudioEditorExploreUrl,
  buildStudioEditorHomeIslandUrl,
} from '@/lib/studioEditorBridge';
import { STUDIO_EDITOR_URL } from '@/lib/grudgeConfig';

function useLegacyEngine(): boolean {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('engine') === 'legacy'
    || params.get('mode') === 'zone'
    || params.get('mode') === 'lobby'
  );
}

/** Fullscreen Studio Editor embed — stays on client.grudge-studio.com/island-3d */
function Island3DStudioEmbed() {
  const [editorUrl, setEditorUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const returnPath = `${window.location.pathname}${window.location.search}`;
      const authed = await ensureAuthForStudio(returnPath);
      if (!authed || cancelled) return;

      const grudgeId = localStorage.getItem('grudge_account_id') || 'guest';
      const characterId = params.get('characterId')
        || localStorage.getItem(`gruda_active_character_${grudgeId}`)
        || localStorage.getItem('grudge_active_character')
        || localStorage.getItem('gruda_active_character_guest')
        || '';

      const seed = params.get('seed') || `island-${Date.now().toString(36)}`;
      const play = params.get('play') !== '0';
      const isHomeIsland = params.get('mode') === 'home-island';
      const islandId = params.get('islandId') || '';

      try {
        const url = isHomeIsland && characterId
          ? buildStudioEditorHomeIslandUrl({
              characterId,
              islandId: islandId || `home-${characterId}`,
              seed,
            })
          : buildStudioEditorExploreUrl({
              seed,
              characterId: characterId || undefined,
              play,
            });
        if (!cancelled) setEditorUrl(url);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to open Studio Editor');
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center flex-col gap-4 text-slate-400 px-6 text-center">
        <p className="text-red-400 text-sm">{error}</p>
        <a
          href={STUDIO_EDITOR_URL}
          className="text-emerald-400 text-sm underline inline-flex items-center gap-1"
        >
          Open Studio Editor directly <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          type="button"
          onClick={() => navigate('/island-3d?engine=legacy')}
          className="text-slate-500 text-xs underline"
        >
          Use legacy 3D engine instead
        </button>
      </div>
    );
  }

  if (!editorUrl) {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center flex-col gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-sm">Loading Studio Island Editor…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-900 border-b border-gray-800 text-xs shrink-0">
        <button
          type="button"
          onClick={() => navigate('/island')}
          className="text-gray-400 hover:text-white"
        >
          ← 2D Island
        </button>
        <span className="text-emerald-400 font-semibold">Studio Island Editor</span>
        <a
          href={editorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-gray-500 hover:text-emerald-400 inline-flex items-center gap-1"
        >
          Open in tab <ExternalLink className="w-3 h-3" />
        </a>
        <button
          type="button"
          onClick={() => navigate('/island-3d?engine=legacy')}
          className="text-gray-500 hover:text-gray-300"
        >
          Legacy engine
        </button>
      </div>
      <iframe
        title="Grudge Studio Island Editor"
        src={editorUrl}
        className="flex-1 w-full border-0"
        allow="fullscreen"
      />
    </div>
  );
}

export default function Island3DPage() {
  if (!useLegacyEngine()) {
    return <Island3DStudioEmbed />;
  }

  return <Island3DLegacyPage />;
}

function Island3DLegacyPage() {
  const params = new URLSearchParams(window.location.search);
  const isHomeIslandMode = params.get('mode') === 'home-island';
  const islandIdParam = params.get('islandId') || '';
  const characterIdParam = params.get('characterId') || '';

  const [seed, setSeed] = useState(() => {
    return params.get('seed') || 'grudge-island-' + Date.now().toString(36);
  });
  const [inputSeed, setInputSeed] = useState(seed);
  const [mode, setMode] = useState<Island3DMode>(
    isHomeIslandMode ? 'procedural' : (params.get('mode') as Island3DMode) || 'procedural',
  );
  const [lobbyMapId, setLobbyMapId] = useState(
    params.get('map') || 'pirate-islands',
  );
  const [sectorId, setSectorId] = useState(
    params.get('sector') || 'ethereal_falls',
  );
  const [worldSeed, setWorldSeed] = useState(
    params.get('worldSeed') || 'grudge-world-1',
  );
  const zoneMultiplayer = params.get('solo') !== '1';
  const [_, navigate] = useLocation();
  const engineRef = useRef<Island3DEngine | null>(null);
  const [engine, setEngine] = useState<Island3DEngine | null>(null);

  // Home-island state
  const [homeIsland, setHomeIsland] = useState<any>(null);
  const [homeIslandLoading, setHomeIslandLoading] = useState(isHomeIslandMode);

  // Character for 3D manifest loading
  const [heroRace, setHeroRace] = useState('human');
  const [heroClass, setHeroClass] = useState('warrior');
  const [heroCharacterId, setHeroCharacterId] = useState(characterIdParam);
  const [heroName, setHeroName] = useState('Captain');
  const [heroModel3d, setHeroModel3d] = useState<Partial<Model3DField> | undefined>();
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const lobbyIslandId = params.get('island') || 'grudge-open-world';
  const pvpServerUrl = params.get('pvp') || undefined;

  const zoneColyseus = useZoneColyseus({
    engine,
    sectorId: mode === 'zone' ? sectorId : '',
    worldSeed,
    playerInfo,
    enabled: mode === 'zone' && zoneMultiplayer,
  });

  // Purge stale island top-down previews (old double-water renders)
  useEffect(() => {
    clearTopDownCache();
  }, []);

  useEffect(() => {
    if (!isHomeIslandMode) return;
    const load = async () => {
      setHomeIslandLoading(true);
      try {
        const url = islandIdParam
          ? `/api/islands/${islandIdParam}`
          : '/api/island';
        const res = await fetch(url, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          const normalized = normalizeHomeIslandResponse(data);
          setHomeIsland(normalized);
          // Use island seed as the procedural seed so terrain matches
          setSeed(normalized.seed || data.seed || 'home-' + (islandIdParam || Date.now().toString(36)));
        }
      } catch (e) {
        console.error('[Island3D] Failed to load home island:', e);
      } finally {
        setHomeIslandLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function loadCharacter() {
      const grudgeId = localStorage.getItem('grudge_account_id') || 'guest';
      const activeId = characterIdParam ||
        localStorage.getItem(`gruda_active_character_${grudgeId}`) ||
        localStorage.getItem('grudge_active_character') ||
        localStorage.getItem('gruda_active_character_guest');

      if (!activeId) return;

      try {
        const char = await characterAPI.get(activeId);
        const resolvedModel3d = parseModel3d(char as any);
        setHeroRace(char.raceId || 'human');
        setHeroClass(char.classId || 'warrior');
        setHeroCharacterId(char.id);
        setHeroName(char.name || 'Captain');
        setHeroModel3d(resolvedModel3d);
        setPlayerInfo({
          characterName: char.name,
          heroClass: char.classId,
          heroRace: char.raceId,
          faction: (char as any).faction || 'crusade',
          level: char.level,
          characterId: char.id,
          accountId: (char as any).accountId || grudgeId,
          baseModelId: resolvedModel3d.baseModelId || char.raceId || 'human',
          equippedMeshes: resolvedModel3d.equippedMeshes || {},
          weaponSlots: resolvedModel3d.weaponSlots || {},
          skinColor: resolvedModel3d.skinColor || '#ffffff',
          armorColor: resolvedModel3d.armorColor || '#ffffff',
          equippedWeaponType: CLASS_WEAPON_MAP[char.classId] || 'sword-shield',
        });
      } catch {
        setHeroCharacterId(activeId);
        setPlayerInfo({
          characterName: 'Adventurer',
          heroClass: 'warrior',
          heroRace: 'human',
          faction: 'crusade',
          level: 1,
          characterId: activeId,
          accountId: grudgeId,
        });
      }
    }
    loadCharacter();
  }, [characterIdParam]);

  const handleNewSeed = () => {
    if (inputSeed.trim()) {
      setSeed(inputSeed.trim());
      setMode('procedural');
    }
  };

  const handleRandomSeed = () => {
    const newSeed = 'island-' + Math.random().toString(36).slice(2, 10);
    setInputSeed(newSeed);
    setSeed(newSeed);
    setMode('procedural');
  };

  const handleLobbyMap = (mapId: string) => {
    setLobbyMapId(mapId);
    setMode('lobby');
    setSeed(`lobby-${mapId}-${Date.now()}`);
  };

  const handleZoneMode = (id: string) => {
    setSectorId(id);
    setMode('zone' as Island3DMode);
    setSeed(`zone-${id}-${worldSeed}`);
    const next = new URLSearchParams(window.location.search);
    next.set('mode', 'zone');
    next.set('sector', id);
    next.set('worldSeed', worldSeed);
    window.history.replaceState(null, '', `?${next.toString()}`);
  };

  const activeSector = mode === 'zone' ? getSectorById(sectorId) : null;

  const lobbyMultiplayer: MultiplayerConfig | undefined =
    mode === 'lobby' && pvpServerUrl && heroCharacterId
      ? {
          serverUrl: pvpServerUrl,
          islandId: lobbyIslandId,
          playerName: heroName,
          heroClass,
          heroRace,
          heroId: heroCharacterId,
          accountId: localStorage.getItem('grudge_account_id') || undefined,
        }
      : undefined;

  if (isHomeIslandMode && homeIslandLoading) {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center flex-col gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-sm">Loading your home island...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-800">
        <button
          onClick={() => navigate(isHomeIslandMode ? '/home' : '/island')}
          className="text-gray-400 hover:text-white text-sm"
        >
          {isHomeIslandMode ? '← Hub' : '← 2D Island'}
        </button>
        <span className="text-gray-600">|</span>
        <h1 className="text-emerald-400 font-bold text-sm">
          {isHomeIslandMode
            ? `🏝 Home Island${homeIsland?.name ? ': ' + homeIsland.name : ''}`
            : '3D Island Explorer (Legacy)'}
        </h1>
        <a
          href="/island-3d"
          className="text-xs text-emerald-500/80 hover:text-emerald-400 underline"
          title="Switch to Studio Editor"
        >
          Studio Editor
        </a>
        {mode === 'zone' && zoneMultiplayer && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="w-3.5 h-3.5" />
            {zoneColyseus.connecting ? 'Connecting…' :
             zoneColyseus.connected ? `${zoneColyseus.players.size} online` :
             'Offline'}
          </div>
        )}
        <div className="flex-1" />

        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-gray-800 rounded p-0.5">
          <button
            onClick={() => { setMode('procedural'); setSeed(inputSeed); }}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              mode === 'procedural'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Procedural
          </button>
          <button
            onClick={() => handleLobbyMap(lobbyMapId)}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              mode === 'lobby'
                ? 'bg-amber-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Lobby Map
          </button>
          <button
            onClick={() => handleZoneMode(sectorId)}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              mode === 'zone'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Zone
          </button>
        </div>

        {mode === 'procedural' ? (
          <>
            <input
              type="text"
              value={inputSeed}
              onChange={(e) => setInputSeed(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNewSeed()}
              placeholder="Island seed..."
              className="bg-gray-800 border border-gray-700 text-white text-xs px-3 py-1.5 rounded w-48 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleNewSeed}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded"
            >
              Generate
            </button>
            <button
              onClick={handleRandomSeed}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded"
            >
              Random
            </button>
          </>
        ) : mode === 'zone' ? (
          <select
            value={sectorId}
            onChange={(e) => handleZoneMode(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-xs px-3 py-1.5 rounded focus:outline-none focus:border-purple-500"
          >
            {WORLD_SECTORS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (Lv{s.difficultyMin}-{s.difficultyMax})
              </option>
            ))}
          </select>
        ) : (
          <select
            value={lobbyMapId}
            onChange={(e) => handleLobbyMap(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-xs px-3 py-1.5 rounded focus:outline-none focus:border-amber-500"
          >
            {LOBBY_MAPS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <Island3DRenderer
          seed={seed}
          mode={mode}
          lobbyMapId={lobbyMapId}
          lobbyIslandId={mode === 'lobby' ? lobbyIslandId : undefined}
          sectorId={mode === 'zone' ? sectorId : undefined}
          worldSeed={worldSeed}
          quality="medium"
          dayNight={{ dayDurationSeconds: 600, startTime: 0.35 }}
          enableCharacter={mode === 'procedural' || mode === 'zone' || isHomeIslandMode || mode === 'lobby'}
          multiplayer={lobbyMultiplayer}
          characterId={heroCharacterId}
          characterName={heroName}
          raceId={heroRace}
          classId={heroClass}
          model3d={heroModel3d}
          onEngineReady={(eng) => { engineRef.current = eng; setEngine(eng); }}
        />
        {mode === 'zone' && activeSector && (
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur border border-purple-800/50 rounded-xl px-4 py-3 text-xs text-slate-300 space-y-1 pointer-events-none max-w-xs">
            <div className="text-purple-300 font-bold uppercase tracking-widest">{activeSector.name}</div>
            <div className="text-slate-400">{activeSector.description}</div>
            <div>Lv {activeSector.difficultyMin}–{activeSector.difficultyMax} · {activeSector.biome}</div>
            {zoneColyseus.error && (
              <div className="text-red-400 mt-1">{zoneColyseus.error}</div>
            )}
          </div>
        )}
        {/* Home-island stats overlay */}
        {isHomeIslandMode && homeIsland && (
          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur border border-emerald-800/50 rounded-xl px-4 py-3 text-xs text-slate-300 space-y-1 pointer-events-none">
            <div className="text-emerald-400 font-bold uppercase tracking-widest mb-1">Home Island</div>
            <div>🗺 {homeIsland.name || 'Unnamed Island'}</div>
            <div>⛏ {(homeIsland.state?.nodes || []).length} resource nodes</div>
            <div>🐾 {(homeIsland.state?.animals || []).length} animals</div>
            <div>🏕 Camp @ ({(homeIsland.state?.campPosition?.x ?? 0).toFixed(0)}, {(homeIsland.state?.campPosition?.y ?? 0).toFixed(0)})</div>
          </div>
        )}
      </div>
    </div>
  );
}

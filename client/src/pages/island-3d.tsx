/**
 * Island 3D Page — Warlords Era home-island showcase (public demo).
 *
 * Default: Driftwood Bay 1024 m home island, beach biome, organized CDN nature
 * (palms + deciduous + rocks), 2 m character scale. No low-poly megakit.
 *
 * Modes:
 *   (default) procedural showcase — Driftwood Bay / optional Ironfang
 *   ?mode=zone — Warlords open-world sector
 *   ?mode=lobby — pirate lobby map
 *   ?engine=studio — Studio Map Editor embed
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Island3DRenderer } from '@/island3d/render/Island3DRenderer';
import type { Island3DMode, Island3DEngine } from '@/island3d/engine/Island3DEngine';
import { LOBBY_MAPS } from '@/island3d/engine/LobbyIslandLoader';
import { authHeaders } from '@/lib/grudgeBackend';
import { normalizeHomeIslandResponse } from '@/lib/homeIslandApi';
import { characterAPI } from '@/lib/api';
import { WORLD_SECTORS, getSectorById } from '@shared/definitions/worldMapSectors';
import { Loader2, Users, ExternalLink, Ship, Anchor, Home, Mountain } from 'lucide-react';
import { clearTopDownCache } from '@/island3d/render/IslandTopDownCapture';
import { useZoneColyseus } from '@/hooks/use-zone-colyseus';
import type { PlayerInfo } from '@/hooks/use-colyseus';
import { parseModel3d, type Model3DField } from '@/lib/grudge6Character';
import { weaponTypeFromModel3d } from '@shared/fleet';
import type { MultiplayerConfig } from '@/island3d/sync/MultiplayerSync';
import {
  ensureAuthForStudio,
  buildStudioEditorExploreUrl,
  buildStudioEditorHomeIslandUrl,
} from '@/lib/studioEditorBridge';
import { STUDIO_EDITOR_URL } from '@/lib/grudgeConfig';
import type { MountainTriadSeed } from '@shared/definitions/homeIslandSeed';
import type { RtsHeightmapPayload } from '@shared/definitions/rtsTerrainBridge';
import type { RtsNatureScatterPayload } from '@shared/definitions/rtsNatureScatter';
import {
  resolveHomeIslandShowcase,
  SHOWCASE_DRIFTWOOD_BAY,
  SHOWCASE_IRONFANG,
  type HomeIslandShowcasePreset,
} from '@shared/definitions/homeIslandShowcase';
import { natureScatterNeedsRegenerate } from '@shared/definitions/natureAssetCatalog';

/** Studio embed only when explicitly requested (design surface, not play default). */
function useStudioEmbed(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('engine') === 'studio' || params.get('editor') === '1';
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

      const seed = params.get('seed') || SHOWCASE_DRIFTWOOD_BAY.seed;
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
          onClick={() => navigate('/island-3d')}
          className="text-slate-500 text-xs underline"
        >
          Open Driftwood Bay showcase
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
          onClick={() => navigate('/island-3d')}
          className="text-gray-400 hover:text-white"
        >
          ← Showcase
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
  if (useStudioEmbed()) {
    return <Island3DStudioEmbed />;
  }

  return <Island3DPlayPage />;
}

function Island3DPlayPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const showcase = useMemo(() => resolveHomeIslandShowcase(params), [params]);

  const isHomeIslandMode = params.get('mode') === 'home-island' || params.get('home') === '1';
  const islandIdParam = params.get('islandId') || '';
  const characterIdParam = params.get('characterId') || '';
  const useAccountIsland = isHomeIslandMode || params.get('account') === '1';

  const [seed, setSeed] = useState(() => {
    // Stable showcase seed by default — never random Date.now()
    return params.get('seed') || showcase.seed;
  });
  const [inputSeed, setInputSeed] = useState(seed);
  const [biome, setBiome] = useState(() => params.get('biome') || showcase.biome);
  const [preset, setPreset] = useState<HomeIslandShowcasePreset>(() => showcase);

  const [mode, setMode] = useState<Island3DMode>(() => {
    const m = params.get('mode');
    if (m === 'zone' || m === 'lobby') return m;
    return 'procedural';
  });
  const [lobbyMapId, setLobbyMapId] = useState(params.get('map') || 'pirate-islands');
  const [sectorId, setSectorId] = useState(params.get('sector') || 'haven_shore');
  const [worldSeed, setWorldSeed] = useState(params.get('worldSeed') || 'grudge-world-1');
  const zoneMultiplayer = params.get('solo') !== '1';
  const fromOcean = params.get('from') === 'ocean';
  const [, navigate] = useLocation();
  const engineRef = useRef<Island3DEngine | null>(null);
  const [engine, setEngine] = useState<Island3DEngine | null>(null);

  const [homeIsland, setHomeIsland] = useState<any>(null);
  const [homeIslandLoading, setHomeIslandLoading] = useState(useAccountIsland);

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

  const handleZoneHarvest = useCallback((evt: { nodeId?: string; resourceType: string }) => {
    if (!evt.nodeId) return;
    zoneColyseus.sendHarvest(evt.nodeId, evt.resourceType);
  }, [zoneColyseus]);

  useEffect(() => {
    clearTopDownCache();
  }, []);

  // Optional: load player's committed island when ?home=1 or ?mode=home-island
  useEffect(() => {
    if (!useAccountIsland) {
      setHomeIslandLoading(false);
      return;
    }
    const load = async () => {
      setHomeIslandLoading(true);
      try {
        const url = islandIdParam ? `/api/islands/${islandIdParam}` : '/api/island';
        const res = await fetch(url, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          const normalized = normalizeHomeIslandResponse(data);
          setHomeIsland(normalized);
          const nextSeed =
            normalized.seed || data.seed || params.get('seed') || showcase.seed;
          setSeed(nextSeed);
          setInputSeed(nextSeed);
          const stateBiome =
            (normalized.state as { biome?: string } | undefined)?.biome
            || (normalized.state?.rtsNatureScatter as { biome?: string } | undefined)?.biome;
          if (stateBiome) setBiome(stateBiome);
        }
      } catch (e) {
        console.warn('[Island3D] Account island unavailable — using showcase:', e);
      } finally {
        setHomeIslandLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useAccountIsland, islandIdParam]);

  useEffect(() => {
    async function loadCharacter() {
      const grudgeId = localStorage.getItem('grudge_account_id') || 'guest';
      const activeId = characterIdParam
        || localStorage.getItem(`gruda_active_character_${grudgeId}`)
        || localStorage.getItem('grudge_active_character')
        || localStorage.getItem('gruda_active_character_guest');

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
          equippedWeaponType: weaponTypeFromModel3d(resolvedModel3d) || 'sword',
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

  const applyPreset = (next: HomeIslandShowcasePreset) => {
    setPreset(next);
    setSeed(next.seed);
    setInputSeed(next.seed);
    setBiome(next.biome);
    setMode('procedural');
    const q = new URLSearchParams();
    q.set('seed', next.seed);
    q.set('biome', next.biome);
    q.set('foundation', next.foundationId);
    window.history.replaceState(null, '', `?${q.toString()}`);
  };

  const handleNewSeed = () => {
    if (inputSeed.trim()) {
      setSeed(inputSeed.trim());
      setMode('procedural');
    }
  };

  const handleLobbyMap = (mapId: string) => {
    setLobbyMapId(mapId);
    setMode('lobby');
    setSeed(`lobby-${mapId}`);
  };

  const handleZoneMode = (id: string) => {
    setSectorId(id);
    setMode('zone');
    setSeed(`zone-${id}-${worldSeed}`);
    const next = new URLSearchParams(window.location.search);
    next.set('mode', 'zone');
    next.set('sector', id);
    next.set('worldSeed', worldSeed);
    window.history.replaceState(null, '', `?${next.toString()}`);
  };

  const activeSector = mode === 'zone' ? getSectorById(sectorId) : null;

  // Never feed banned megakit scatter from saved state into the showcase
  const safeNatureScatter = useMemo((): RtsNatureScatterPayload | undefined => {
    if (!useAccountIsland || !homeIsland?.state?.rtsNatureScatter) return undefined;
    const stored = homeIsland.state.rtsNatureScatter as RtsNatureScatterPayload;
    if (natureScatterNeedsRegenerate(stored.instances || [])) return undefined;
    return stored;
  }, [useAccountIsland, homeIsland]);

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

  if (useAccountIsland && homeIslandLoading) {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center flex-col gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-sm">Loading your home island…</span>
      </div>
    );
  }

  const titleLabel =
    mode === 'zone'
      ? `Zone — ${activeSector?.name || sectorId}`
      : mode === 'lobby'
        ? `Lobby — ${lobbyMapId}`
        : useAccountIsland && homeIsland?.name
          ? `Home Island: ${homeIsland.name}`
          : `${preset.label} · Warlords Home`;

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 flex-wrap">
        <button
          onClick={() => navigate(useAccountIsland ? '/home' : '/play')}
          className="text-gray-400 hover:text-white text-sm shrink-0"
        >
          ← Back
        </button>
        <span className="text-gray-600 hidden sm:inline">|</span>
        <h1 className="text-emerald-400 font-bold text-sm truncate max-w-[14rem] sm:max-w-none">
          {titleLabel}
        </h1>
        {mode === 'procedural' && (
          <span className="text-[10px] text-slate-500 hidden md:inline">
            1024 m · 2 m character · organized nature
          </span>
        )}

        <div className="flex-1" />

        {/* Foundation presets — best Warlords examples */}
        {mode === 'procedural' && (
          <div className="flex items-center gap-1 bg-gray-800 rounded p-0.5">
            <button
              type="button"
              onClick={() => applyPreset(SHOWCASE_DRIFTWOOD_BAY)}
              className={`text-[11px] px-2 py-1 rounded inline-flex items-center gap-1 transition-colors ${
                preset.foundationId === 'driftwood_bay' && seed === SHOWCASE_DRIFTWOOD_BAY.seed
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title={SHOWCASE_DRIFTWOOD_BAY.summary}
            >
              <Home className="w-3 h-3" />
              Driftwood Bay
            </button>
            <button
              type="button"
              onClick={() => applyPreset(SHOWCASE_IRONFANG)}
              className={`text-[11px] px-2 py-1 rounded inline-flex items-center gap-1 transition-colors ${
                preset.foundationId === 'ironfang_spire' && seed === SHOWCASE_IRONFANG.seed
                  ? 'bg-sky-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title={SHOWCASE_IRONFANG.summary}
            >
              <Mountain className="w-3 h-3" />
              Ironfang
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 bg-gray-800 rounded p-0.5">
          <button
            type="button"
            onClick={() => {
              applyPreset(SHOWCASE_DRIFTWOOD_BAY);
            }}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              mode === 'procedural' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => handleZoneMode(sectorId)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              mode === 'zone' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Zone
          </button>
          <button
            type="button"
            onClick={() => handleLobbyMap(lobbyMapId)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              mode === 'lobby' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Lobby
          </button>
        </div>

        {mode === 'procedural' && (
          <>
            <input
              type="text"
              value={inputSeed}
              onChange={(e) => setInputSeed(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNewSeed()}
              placeholder="Seed…"
              className="bg-gray-800 border border-gray-700 text-white text-xs px-2 py-1 rounded w-36 sm:w-44 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleNewSeed}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1 rounded"
            >
              Generate
            </button>
          </>
        )}

        {mode === 'zone' && (
          <select
            value={sectorId}
            onChange={(e) => handleZoneMode(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-purple-500"
          >
            {WORLD_SECTORS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        {mode === 'lobby' && (
          <select
            value={lobbyMapId}
            onChange={(e) => handleLobbyMap(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-amber-500"
          >
            {LOBBY_MAPS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}

        {mode === 'zone' && (
          <a
            href={`/ocean?worldSeed=${encodeURIComponent(worldSeed)}`}
            className="text-xs text-amber-500/80 hover:text-amber-400 underline inline-flex items-center gap-1"
          >
            <Ship className="w-3 h-3" />
            Sea
          </a>
        )}
        {mode === 'zone' && zoneMultiplayer && (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Users className="w-3.5 h-3.5" />
            {zoneColyseus.connecting
              ? '…'
              : zoneColyseus.connected
                ? `${zoneColyseus.players.size}`
                : 'off'}
          </div>
        )}

        <a
          href="/home-island"
          className="text-xs text-slate-500 hover:text-emerald-400 underline hidden sm:inline"
          title="Your signed-in home island"
        >
          My island
        </a>
        <a
          href="/island-3d?engine=studio"
          className="text-xs text-slate-600 hover:text-slate-400 underline hidden lg:inline"
        >
          Studio
        </a>
      </div>

      <div className="flex-1 relative">
        <Island3DRenderer
          seed={seed}
          mode={mode}
          lobbyMapId={lobbyMapId}
          lobbyIslandId={mode === 'lobby' ? lobbyIslandId : undefined}
          sectorId={mode === 'zone' ? sectorId : undefined}
          worldSeed={worldSeed}
          quality={mode === 'procedural' ? 'high' : 'medium'}
          dayNight={{ dayDurationSeconds: 600, startTime: 0.35 }}
          enableCharacter={mode === 'procedural' || mode === 'zone' || mode === 'lobby'}
          multiplayer={lobbyMultiplayer}
          characterId={heroCharacterId || undefined}
          characterName={heroName}
          raceId={heroRace}
          classId={heroClass}
          model3d={heroModel3d}
          mountainTriad={
            useAccountIsland
              ? (homeIsland?.state?.mountainTriad as MountainTriadSeed | undefined)
              : undefined
          }
          rtsHeightmap={
            useAccountIsland
              ? (homeIsland?.state?.rtsHeightmap as RtsHeightmapPayload | undefined)
              : undefined
          }
          rtsNatureScatter={safeNatureScatter}
          biome={
            mode === 'procedural'
              ? biome
              : undefined
          }
          campPositionPercent={
            useAccountIsland && homeIsland?.state?.campPosition
              ? homeIsland.state.campPosition
              : mode === 'procedural'
                ? preset.campPositionPercent
                : undefined
          }
          regrowRegions={
            useAccountIsland ? homeIsland?.state?.regrowRegions : undefined
          }
          onEngineReady={(eng) => {
            engineRef.current = eng;
            setEngine(eng);
          }}
          onHarvest={mode === 'zone' && zoneMultiplayer ? handleZoneHarvest : undefined}
        />

        {mode === 'procedural' && (
          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur border border-emerald-800/40 rounded-xl px-4 py-3 text-xs text-slate-300 space-y-1 pointer-events-none max-w-xs">
            <div className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">
              Warlords Home Island
            </div>
            <div className="font-semibold text-white">{preset.label}</div>
            <div className="text-slate-400">{preset.summary}</div>
            <div className="text-slate-500 pt-1">
              Seed <span className="text-slate-300 font-mono">{seed}</span>
              {' · '}
              {biome}
              {' · '}
              {preset.worldSizeM} m
            </div>
            <div className="text-slate-500">WASD move · Space jump · Tab combat · Click harvest</div>
          </div>
        )}

        {mode === 'zone' && activeSector && (
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur border border-purple-800/50 rounded-xl px-4 py-3 text-xs text-slate-300 space-y-1 max-w-xs">
            <div className="text-purple-300 font-bold uppercase tracking-widest">{activeSector.name}</div>
            <div className="text-slate-400">{activeSector.description}</div>
            <div>
              Lv {activeSector.difficultyMin}–{activeSector.difficultyMax} · {activeSector.biome}
            </div>
            {fromOcean && (
              <a
                href={`/ocean?worldSeed=${encodeURIComponent(worldSeed)}`}
                className="inline-flex items-center gap-1.5 mt-2 text-amber-400 hover:text-amber-300 pointer-events-auto"
              >
                <Anchor className="w-3.5 h-3.5" />
                Return to ocean
              </a>
            )}
            {zoneColyseus.error && (
              <div className="text-red-400 mt-1">{zoneColyseus.error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

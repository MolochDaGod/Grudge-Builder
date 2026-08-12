/**
 * Island 3D Page — PRODUCTION client start (client.grudge-studio.com/island-3d).
 *
 * Production open:
 *   Native LeviathanOceanCinema (startingfalls · stage UUIDs · spine IK · 4 mages)
 *   via StormShipIntroGate — NO TI iframe / Stonewisp / intro.mp4 / old preview HTML.
 *   Overboard float is NOT used here — that is home-island only (/island-reveal).
 *
 * Modes:
 *   (default) generative home island showcase
 *   ?mode=zone — Warlords open-world sector
 *   ?mode=lobby — pirate lobby map (production hub)
 *   ?engine=studio — Studio Map Editor embed
 *   ?home=1 — load account Railway island when signed in
 *   ?skipIntro=1 — skip cinema gate
 *   ?intro=1 | ?intro=shipwreck — force leviathan cinema
 *   ?ui=1&options=1 — keep production chrome visible
 *
 * Dedicated cinema surface: /leviathan-cinema (canonical first-voyage opener)
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Island3DRenderer } from '@/island3d/render/Island3DRenderer';
import type { Island3DMode, Island3DEngine } from '@/island3d/engine/Island3DEngine';
import { LOBBY_MAPS } from '@/island3d/engine/LobbyIslandLoader';
import { authHeaders } from '@/lib/grudgeBackend';
import { normalizeHomeIslandResponse } from '@/lib/homeIslandApi';
import { characterAPI } from '@/lib/api';
import { getSectorById } from '@shared/definitions/worldMapSectors';
import {
  resolveIsland3DPlayMode,
  getPlayableSectorList,
  OPEN_WORLD_LOBBY_MAP_ID,
  isOpenWorldLobbySector,
} from '@/island3d/engine/openWorldLobby';
import { Loader2, Users, ExternalLink, Ship, Anchor, Home, Mountain } from 'lucide-react';
import { clearTopDownCache } from '@/island3d/render/IslandTopDownCapture';
import { useZoneNetwork } from '@/hooks/use-zone-network';
import type { NetworkPlayerJoin } from '@/lib/network/NetworkManager';
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
import { StormShipIntroGate } from '@/island3d/intro/StormShipIntroGate';
import {
  INTRO_SESSION_KEY,
  DEFAULT_INTRO_OPTIONS,
  INTRO_OPTIONS_KEY,
  type AfterIntroDestination,
  type Island3dIntroOptions,
} from '@shared/definitions/productionIntro';
import { buildZoneDungeonUrl, buildHomeDungeonUrl } from '@/lib/homeIslandDungeon';

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

  // Production URL: ?mode=zone&sector=lobby → pirate open-world (full systems)
  const resolvedPlay = useMemo(() => resolveIsland3DPlayMode(params), [params]);

  const [mode, setMode] = useState<Island3DMode>(() => resolvedPlay.mode);
  const [lobbyMapId, setLobbyMapId] = useState(resolvedPlay.lobbyMapId || OPEN_WORLD_LOBBY_MAP_ID);
  const [sectorId, setSectorId] = useState(
    resolvedPlay.isOpenWorldLobby ? 'lobby' : (params.get('sector') || 'haven_shore'),
  );
  const [worldSeed, setWorldSeed] = useState(params.get('worldSeed') || 'grudge-world-1');
  const zoneMultiplayer = params.get('solo') !== '1';
  const fromOcean = params.get('from') === 'ocean';
  /** From /open-world entry: start in Build for Units/Siege/Monsters deploy */
  const editorMode = params.get('edit') === '1' || params.get('editor') === '1';
  const [, navigate] = useLocation();
  const engineRef = useRef<Island3DEngine | null>(null);
  const [engine, setEngine] = useState<Island3DEngine | null>(null);
  const playableSectors = useMemo(() => getPlayableSectorList(), []);

  // Production: native leviathan cinema gate + options/UI
  const forceIntro =
    params.get('intro') === '1' ||
    params.get('intro') === 'storm' ||
    params.get('intro') === 'shipwreck' ||
    params.get('intro') === 'leviathan';
  const skipIntroParam =
    params.get('skipIntro') === '1' ||
    params.get('from') === 'storm-intro' ||
    params.get('from') === 'shipwreck-intro';
  const [introOptions, setIntroOptions] = useState<Island3dIntroOptions>(() => {
    try {
      const raw = localStorage.getItem(INTRO_OPTIONS_KEY);
      if (raw) return { ...DEFAULT_INTRO_OPTIONS, ...JSON.parse(raw) };
    } catch { /* */ }
    return { ...DEFAULT_INTRO_OPTIONS };
  });
  const [showStormIntro, setShowStormIntro] = useState(() => {
    if (skipIntroParam) return false;
    if (forceIntro) return true;
    if (params.get('engine') === 'studio') return false;
    if (isHomeIslandMode) return false; // home uses overboard elsewhere
    try {
      if (sessionStorage.getItem(INTRO_SESSION_KEY) === '1') return false;
    } catch { /* */ }
    return introOptions.playStormIntro;
  });
  const showOptionsChrome = params.get('options') !== '0' && (params.get('options') === '1' || introOptions.showOptions);
  const showUiChrome = params.get('ui') !== '0' && (params.get('ui') === '1' || introOptions.showUi);

  const handleStormIntroEnter = useCallback((dest: AfterIntroDestination, opts: Island3dIntroOptions) => {
    setIntroOptions(opts);
    setShowStormIntro(false);
    try {
      sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    } catch { /* */ }

    if (dest === 'tutorial') {
      // Chicken-gun pirate-islands · shipwreck_cove wash-up (not lobby spawn 0,0)
      const q = new URLSearchParams({
        from: 'shipwreck-intro',
        map: 'pirate-islands',
        island: 'grudge-open-world',
        wake: '1',
      });
      if (characterIdParam) q.set('characterId', characterIdParam);
      navigate(`/tutorial?${q.toString()}`);
      return;
    }
    if (dest === 'home_overboard') {
      // Overboard float is home-island path only
      navigate(`/island-reveal?from=overboard-intro${characterIdParam ? `&characterId=${characterIdParam}` : ''}`);
      return;
    }
    if (dest === 'zone') {
      setMode('zone');
      setSectorId('haven_shore');
      const next = new URLSearchParams(window.location.search);
      next.set('mode', 'zone');
      next.set('sector', 'haven_shore');
      next.set('worldSeed', 'grudge-world-1');
      next.set('from', 'storm-intro');
      next.set('ui', opts.showUi ? '1' : '0');
      next.set('options', opts.showOptions ? '1' : '0');
      next.delete('intro');
      window.history.replaceState(null, '', `?${next.toString()}`);
      return;
    }
    // Default: pirate open-world lobby on island-3d
    setMode('lobby');
    setLobbyMapId(OPEN_WORLD_LOBBY_MAP_ID);
    setSectorId('lobby');
    const next = new URLSearchParams(window.location.search);
    next.set('mode', 'lobby');
    next.set('map', OPEN_WORLD_LOBBY_MAP_ID);
    next.set('sector', 'lobby');
    next.set('island', 'grudge-open-world');
    next.set('from', 'storm-intro');
    next.set('ui', opts.showUi ? '1' : '0');
    next.set('options', opts.showOptions ? '1' : '0');
    next.delete('intro');
    next.delete('skipIntro');
    if (characterIdParam) next.set('characterId', characterIdParam);
    window.history.replaceState(null, '', `?${next.toString()}`);
  }, [navigate, characterIdParam]);

  const [homeIsland, setHomeIsland] = useState<any>(null);
  const [homeIslandLoading, setHomeIslandLoading] = useState(useAccountIsland);

  const [heroRace, setHeroRace] = useState('human');
  const [heroClass, setHeroClass] = useState('warrior');
  const [heroCharacterId, setHeroCharacterId] = useState(characterIdParam);
  const [heroName, setHeroName] = useState('Captain');
  const [heroModel3d, setHeroModel3d] = useState<Partial<Model3DField> | undefined>();
  /** Main-panel equipment → Grudge6 mesh catalog on race prefab */
  const [heroEquipment, setHeroEquipment] = useState<Record<string, string | null> | undefined>();
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const lobbyIslandId = params.get('island') || 'grudge-open-world';
  const pvpServerUrl = params.get('pvp') || undefined;

  const networkPlayer: NetworkPlayerJoin | null = playerInfo
    ? {
        characterName: playerInfo.characterName,
        heroClass: playerInfo.heroClass,
        heroRace: playerInfo.heroRace,
        faction: playerInfo.faction,
        level: playerInfo.level,
        accountId: playerInfo.accountId,
        characterId: playerInfo.characterId,
        baseModelId: playerInfo.baseModelId,
        equippedMeshes: playerInfo.equippedMeshes,
        weaponSlots: playerInfo.weaponSlots,
        skinColor: playerInfo.skinColor,
        armorColor: playerInfo.armorColor,
        equippedWeaponType: playerInfo.equippedWeaponType,
      }
    : null;

  /** REST + Colyseus NetworkManager: remotes, buildings, chat, VFX, asset queue */
  const zoneNetwork = useZoneNetwork({
    engine,
    sectorId: mode === 'zone' ? sectorId : '',
    worldSeed,
    player: networkPlayer,
    enabled: mode === 'zone' && zoneMultiplayer,
  });

  const handleZoneHarvest = useCallback((evt: { nodeId?: string; resourceType: string }) => {
    if (!evt.nodeId) return;
    zoneNetwork.sendHarvest(evt.nodeId, evt.resourceType);
  }, [zoneNetwork]);

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
        || localStorage.getItem('gruda_active_character_guest')
        || localStorage.getItem(`gruda_active_character_guest`);

      // Prefer full roster resolve (Warlords era) so zone always gets race prefab data
      try {
        const { resolveActiveWarlordsCharacter } = await import('@/lib/loadGrudge6Player');
        const char = await resolveActiveWarlordsCharacter(activeId);
        if (char) {
          const resolvedModel3d = parseModel3d(char as any);
          setHeroRace(char.raceId || 'human');
          setHeroClass(char.classId || 'warrior');
          setHeroCharacterId(char.id);
          setHeroName(char.name || 'Captain');
          setHeroModel3d(resolvedModel3d);
          setHeroEquipment((char.equipment as Record<string, string | null>) || {});
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
          return;
        }
      } catch (e) {
        console.warn('[Island3D] Warlords character resolve failed', e);
      }

      if (!activeId) return;

      try {
        const char = await characterAPI.get(activeId);
        try {
          sessionStorage.setItem(
            'grudge_active_character_level',
            String(char.level ?? 1),
          );
        } catch {
          /* ignore */
        }
        const resolvedModel3d = parseModel3d(char as any);
        setHeroRace(char.raceId || 'human');
        setHeroClass(char.classId || 'warrior');
        setHeroCharacterId(char.id);
        setHeroName(char.name || 'Captain');
        setHeroModel3d(resolvedModel3d);
        setHeroEquipment((char as any).equipment || {});
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
    setLobbyMapId(mapId || OPEN_WORLD_LOBBY_MAP_ID);
    setMode('lobby');
    setSectorId('lobby');
    setSeed(`lobby-${mapId || OPEN_WORLD_LOBBY_MAP_ID}`);
    const next = new URLSearchParams(window.location.search);
    next.set('mode', 'zone');
    next.set('sector', 'lobby');
    next.set('map', mapId || OPEN_WORLD_LOBBY_MAP_ID);
    next.set('island', lobbyIslandId);
    next.delete('engine');
    window.history.replaceState(null, '', `?${next.toString()}`);
  };

  const handleZoneMode = (id: string) => {
    // sector=lobby is the production open-world pirate hub (not a 10km zone mesh)
    if (isOpenWorldLobbySector(id)) {
      handleLobbyMap(OPEN_WORLD_LOBBY_MAP_ID);
      return;
    }
    setSectorId(id);
    setMode('zone');
    setSeed(`zone-${id}-${worldSeed}`);
    const next = new URLSearchParams(window.location.search);
    next.set('mode', 'zone');
    next.set('sector', id);
    next.set('worldSeed', worldSeed);
    next.delete('map');
    window.history.replaceState(null, '', `?${next.toString()}`);
  };

  const activeSector = mode === 'zone' ? getSectorById(sectorId) : null;
  const isOpenWorldLobby = mode === 'lobby' || isOpenWorldLobbySector(sectorId);

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
    isOpenWorldLobby
      ? 'Pirate Open World · Boats · Build · Harvest · Combat · Grudge6'
      : mode === 'zone'
        ? `Zone — ${activeSector?.name || sectorId}${heroName ? ` · ${heroName}` : ''}`
        : mode === 'lobby'
          ? `Lobby — ${lobbyMapId}`
          : useAccountIsland && homeIsland?.name
            ? `Home Island: ${homeIsland.name}`
            : `Home Island · Generative · ${preset.label}`;

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Production: native leviathan / startingfalls cinema (not TI / not video) */}
      {showStormIntro && (
        <StormShipIntroGate
          characterId={heroCharacterId || characterIdParam}
          characterName={heroName}
          force={forceIntro}
          onEnter={handleStormIntroEnter}
          onSkipToGame={() => {
            try {
              sessionStorage.setItem(INTRO_SESSION_KEY, '1');
            } catch { /* */ }
            setShowStormIntro(false);
          }}
        />
      )}

      {/* Top chrome — options/UI on for production */}
      {(showUiChrome || showOptionsChrome) && (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 flex-wrap z-30">
        <button
          onClick={() => navigate(useAccountIsland ? '/home' : '/open-world')}
          className="text-gray-400 hover:text-white text-sm shrink-0"
        >
          ← Entry
        </button>
        <span className="text-gray-600 hidden sm:inline">|</span>
        <h1 className="text-emerald-400 font-bold text-sm truncate max-w-[14rem] sm:max-w-none">
          {titleLabel}
        </h1>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300/90 border border-cyan-800/40 hidden sm:inline">
          PRODUCTION
        </span>
        {mode === 'procedural' && (
          <span className="text-[10px] text-slate-500 hidden md:inline">
            1024 m · dry harvest · baked nav · battle trees · mines
          </span>
        )}

        <div className="flex-1" />

        {/* Foundation shapes the generator (not a single static map) */}
        {mode === 'procedural' && (
          <div className="flex items-center gap-1 bg-gray-800 rounded p-0.5">
            <button
              type="button"
              onClick={() => applyPreset(SHOWCASE_DRIFTWOOD_BAY)}
              className={`text-[11px] px-2 py-1 rounded inline-flex items-center gap-1 transition-colors ${
                biome.includes('beach') || biome.includes('tropic') || preset.foundationId === 'driftwood_bay'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Coastal foundation: bay indent, palms, moderate elevation"
            >
              <Home className="w-3 h-3" />
              Coastal
            </button>
            <button
              type="button"
              onClick={() => applyPreset(SHOWCASE_IRONFANG)}
              className={`text-[11px] px-2 py-1 rounded inline-flex items-center gap-1 transition-colors ${
                biome.includes('forest') || biome.includes('winter') || preset.foundationId === 'ironfang_spire'
                  ? 'bg-sky-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Highland foundation: spire bias, pines, denser rock"
            >
              <Mountain className="w-3 h-3" />
              Highland
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
            onClick={() => handleZoneMode(isOpenWorldLobby ? 'haven_shore' : sectorId)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              mode === 'zone' && !isOpenWorldLobby ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
            title="Warlords 9-sector tactical open world"
          >
            Zones
          </button>
          <button
            type="button"
            onClick={() => handleLobbyMap(lobbyMapId || OPEN_WORLD_LOBBY_MAP_ID)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              isOpenWorldLobby ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
            title="Production pirate open world (sector=lobby)"
          >
            Open World
          </button>
        </div>

        {mode === 'procedural' && (
          <>
            <input
              type="text"
              value={inputSeed}
              onChange={(e) => setInputSeed(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNewSeed()}
              placeholder="Island seed…"
              className="bg-gray-800 border border-gray-700 text-white text-xs px-2 py-1 rounded w-36 sm:w-48 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button
              type="button"
              onClick={handleNewSeed}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1 rounded font-semibold"
            >
              Generate
            </button>
            <button
              type="button"
              onClick={() => {
                const s = `island-${Math.random().toString(36).slice(2, 10)}`;
                setInputSeed(s);
                setSeed(s);
                setMode('procedural');
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded"
            >
              Random
            </button>
          </>
        )}

        {/* Full tactical map picker: lobby hub + all 9 Warlords sectors */}
        {(mode === 'zone' || isOpenWorldLobby) && (
          <select
            value={isOpenWorldLobby ? 'lobby' : sectorId}
            onChange={(e) => handleZoneMode(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-purple-500 max-w-[14rem]"
            title="Pirate open world + all tactical zones"
          >
            {playableSectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.isLobby ? `★ ${s.name}` : s.name}
              </option>
            ))}
          </select>
        )}

        {mode === 'lobby' && !isOpenWorldLobby && (
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

        {(mode === 'zone' || isOpenWorldLobby) && (
          <a
            href={`/ocean?worldSeed=${encodeURIComponent(worldSeed)}`}
            className="text-xs text-amber-500/80 hover:text-amber-400 underline inline-flex items-center gap-1"
          >
            <Ship className="w-3 h-3" />
            Sea Map
          </a>
        )}
        {mode === 'zone' && !isOpenWorldLobby && zoneMultiplayer && (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Users className="w-3.5 h-3.5" />
            {zoneNetwork.connected
              ? 'MP on'
              : zoneNetwork.error
                ? 'MP err'
                : '…'}
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
        {showOptionsChrome && (
          <>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem(INTRO_SESSION_KEY);
                } catch { /* */ }
                setShowStormIntro(true);
              }}
              className="text-[10px] px-2 py-1 rounded-lg bg-cyan-950/80 text-cyan-200 border border-cyan-700/40 hover:bg-cyan-900"
              title="Replay TI storm ship attack intro"
            >
              Storm Intro
            </button>
            <a
              href="/tutorial?from=storm-intro"
              className="text-[10px] px-2 py-1 rounded-lg bg-amber-950/60 text-amber-200 border border-amber-800/40 hover:bg-amber-900/50"
            >
              Shipwreck Tutorial
            </a>
            <a
              href="/island-reveal?from=overboard-intro"
              className="text-[10px] px-2 py-1 rounded-lg bg-rose-950/50 text-rose-200/90 border border-rose-900/40 hover:bg-rose-900/40 hidden md:inline"
              title="Overboard float — home island only"
            >
              Home Overboard
            </a>
          </>
        )}
      </div>
      )}

      <div className={`flex-1 relative ${!showUiChrome && !showOptionsChrome ? 'h-screen' : ''}`}>
        {/*
          Defer Island3D WebGL until cinema gate ends — dual WebGL contexts
          (cinema + Island3D) caused context-lost and null precision crashes.
        */}
        {showStormIntro ? (
          <div className="absolute inset-0 bg-[#04080f] flex items-center justify-center text-slate-600 text-xs tracking-widest uppercase">
            Cinema gate · island engine waits
          </div>
        ) : (
        <Island3DRenderer
          seed={seed}
          mode={mode}
          lobbyMapId={lobbyMapId || OPEN_WORLD_LOBBY_MAP_ID}
          lobbyIslandId={mode === 'lobby' ? lobbyIslandId : undefined}
          sectorId={mode === 'zone' && !isOpenWorldLobby ? sectorId : undefined}
          worldSeed={worldSeed}
          quality={mode === 'procedural' || isOpenWorldLobby ? 'high' : 'medium'}
          dayNight={{
            // Production: 6 real hours = 1 game day; wall-clock sync for sky/tides
            dayDurationSeconds: 6 * 60 * 60,
            useWallClock: true,
            startTime: 0.35,
          }}
          enableCharacter
          editorMode={editorMode}
          multiplayer={lobbyMultiplayer}
          characterId={heroCharacterId || undefined}
          characterName={heroName}
          raceId={heroRace}
          classId={heroClass}
          model3d={heroModel3d}
          equipment={heroEquipment}
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
          onDungeonEnter={(dungeonId, dungeonName) => {
            // Hidden Mountain City door, triad portals, zone dungeon entrances
            if (mode === 'zone' && !isOpenWorldLobby) {
              navigate(
                buildZoneDungeonUrl(dungeonId, dungeonName, sectorId, worldSeed),
              );
            } else {
              navigate(buildHomeDungeonUrl(dungeonId, dungeonName));
            }
          }}
        />
        )}

        {mode === 'procedural' && (
          <div className="absolute bottom-4 left-4 z-20 bg-black/75 backdrop-blur-md border border-emerald-700/40 rounded-2xl px-4 py-3.5 text-xs text-slate-300 space-y-1.5 pointer-events-none max-w-sm shadow-2xl shadow-emerald-950/40">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                Generative Home Island
              </span>
              <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300/90 border border-emerald-800/50">
                LIVE PREVIEW
              </span>
            </div>
            <div className="font-semibold text-white text-sm">{preset.label}</div>
            <div className="text-slate-400 leading-relaxed">
              What your Warlords home will feel like: dry-land harvest nodes, fishing only
              in water, battle NatureDecor trees, baked three.js pathfinding, craftpix mines,
              mountain dungeon, camp build.
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-500 pt-1">
              <span>Terrain 1024 m board</span>
              <span>Nodes on land only</span>
              <span>Navmesh pathfinding</span>
              <span>4 tree canopy layers</span>
              <span>Mines 4s harvest bag</span>
              <span>Character 2 m scale</span>
            </div>
            <div className="text-slate-500 pt-0.5 font-mono text-[10px] truncate">
              seed={seed} · {biome}
            </div>
            <div className="text-emerald-600/90 text-[10px]">
              WASD move · Space jump · Click harvest · Build HUD · P panel
            </div>
          </div>
        )}

        {isOpenWorldLobby && (
          <div className="absolute top-4 left-4 bg-black/75 backdrop-blur border border-amber-700/50 rounded-xl px-4 py-3 text-xs text-slate-300 space-y-1.5 max-w-sm pointer-events-none z-20">
            <div className="text-amber-400 font-bold uppercase tracking-widest text-[10px]">
              Production Open World
            </div>
            <div className="text-white font-semibold">Pirate Islands Hub</div>
            <div className="text-slate-400 leading-relaxed">
              Boats (E at dock) · Build (ModePlayHUD) · Harvest · PvE camps · Open combat
              · Grudge6 Main Panel (P) · Spellbook (B) · Inventory (I)
            </div>
            <div className="text-slate-500 pt-0.5">
              Map picker → all 9 Warlords zones · Sea Map for tactical sailing
            </div>
            <div className="text-amber-600/90 font-mono text-[10px]">
              ?mode=zone&amp;sector=lobby · grudge6 equipment meshes
            </div>
          </div>
        )}

        {mode === 'zone' && !isOpenWorldLobby && activeSector && (
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
            {zoneNetwork.error && (
              <div className="text-red-400 mt-1">{zoneNetwork.error}</div>
            )}
            {zoneNetwork.connected && (
              <div className="text-emerald-400/80 mt-1 text-[10px]">
                Multiplayer connected · chat bottom-left
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

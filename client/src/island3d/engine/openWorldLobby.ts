/**
 * Open-world lobby hub — production pirate islands map used as the Warlords
 * open-world entry (boats, build, harvest, PvE, combat, Grudge6 main panel).
 *
 * Canonical URLs (all resolve to the same experience):
 *   /island-3d?mode=zone&sector=lobby
 *   /island-3d?mode=zone&sector=pirate-islands
 *   /island-3d?mode=lobby&map=pirate-islands
 *   /island-3d?mode=lobby
 */
import { WORLD_SECTORS, type WorldSector } from '@shared/definitions/worldMapSectors';
import { DEFAULT_PUBLIC_LOBBY_MAP_ID } from './lobbyMapRuntime';

/** URL / sector aliases that mean "load pirate open-world lobby" */
export const OPEN_WORLD_LOBBY_ALIASES = new Set([
  'lobby',
  'pirate',
  'pirate-islands',
  'pirate_islands',
  'open-world',
  'open_world',
  'grudge-open-world',
]);

export const OPEN_WORLD_LOBBY_MAP_ID = DEFAULT_PUBLIC_LOBBY_MAP_ID; // pirate-islands

export function isOpenWorldLobbySector(sectorOrMapId: string | null | undefined): boolean {
  if (!sectorOrMapId) return false;
  return OPEN_WORLD_LOBBY_ALIASES.has(sectorOrMapId.toLowerCase().trim());
}

/**
 * Resolve play mode from URL params.
 * zone+sector=lobby → lobby engine with full open-world systems.
 */
export function resolveIsland3DPlayMode(params: URLSearchParams): {
  mode: 'procedural' | 'lobby' | 'zone';
  lobbyMapId: string;
  sectorId: string;
  isOpenWorldLobby: boolean;
} {
  const rawMode = (params.get('mode') || '').toLowerCase();
  const sector = (params.get('sector') || '').toLowerCase();
  const map = params.get('map') || OPEN_WORLD_LOBBY_MAP_ID;

  // Explicit lobby mode
  if (rawMode === 'lobby' || isOpenWorldLobbySector(map)) {
    return {
      mode: 'lobby',
      lobbyMapId: isOpenWorldLobbySector(map) ? OPEN_WORLD_LOBBY_MAP_ID : map,
      sectorId: 'lobby',
      isOpenWorldLobby: true,
    };
  }

  // zone + sector=lobby (user's production URL)
  if (rawMode === 'zone' && isOpenWorldLobbySector(sector)) {
    return {
      mode: 'lobby',
      lobbyMapId: OPEN_WORLD_LOBBY_MAP_ID,
      sectorId: 'lobby',
      isOpenWorldLobby: true,
    };
  }

  // sector=lobby without mode
  if (!rawMode && isOpenWorldLobbySector(sector)) {
    return {
      mode: 'lobby',
      lobbyMapId: OPEN_WORLD_LOBBY_MAP_ID,
      sectorId: 'lobby',
      isOpenWorldLobby: true,
    };
  }

  if (rawMode === 'zone') {
    return {
      mode: 'zone',
      lobbyMapId: OPEN_WORLD_LOBBY_MAP_ID,
      sectorId: params.get('sector') || 'haven_shore',
      isOpenWorldLobby: false,
    };
  }

  return {
    mode: 'procedural',
    lobbyMapId: OPEN_WORLD_LOBBY_MAP_ID,
    sectorId: params.get('sector') || 'haven_shore',
    isOpenWorldLobby: false,
  };
}

/**
 * Virtual sector card for the zone picker — not a 10km procedural zone;
 * switches into pirate open-world lobby with full game systems.
 */
export const OPEN_WORLD_LOBBY_SECTOR_META = {
  id: 'lobby',
  name: 'Pirate Open World (Lobby)',
  description:
    'Production open-world hub: pirate islands, boats, build, harvest, PvE, combat, Grudge6 main panel.',
  biome: 'tropical',
} as const;

/** All zone sectors + lobby hub for map picker UI */
export function getPlayableSectorList(): Array<{ id: string; name: string; biome: string; isLobby?: boolean }> {
  return [
    {
      id: OPEN_WORLD_LOBBY_SECTOR_META.id,
      name: OPEN_WORLD_LOBBY_SECTOR_META.name,
      biome: OPEN_WORLD_LOBBY_SECTOR_META.biome,
      isLobby: true,
    },
    ...WORLD_SECTORS.map((s: WorldSector) => ({
      id: s.id,
      name: s.name,
      biome: s.biome,
      isLobby: false,
    })),
  ];
}

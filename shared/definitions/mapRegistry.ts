/**
 * Map Registry — ONE TRUTH for every playable space.
 *
 * CRITICAL: There are TWO different "nine sector" systems. Never mix their IDs.
 *
 *   1) WARLORDS_ERA_OPEN_WORLD — 9 macro-regions (haven_shore, …) for MMO open world
 *   2) PLAYER_HOME_BLOCK       — each account owns a personal 3×3 (9 zones) on the 100×100 grid
 *
 * Everything else (tactical sail view, chicken-gun pirate lobby, arenas, genesis PvP)
 * is a separate map family with its own entry URL and must not reuse warlords zone IDs
 * as if they were home-block cells (or vice versa).
 */

// ── Map family IDs ───────────────────────────────────────────────────────────

export type MapFamilyId =
  | 'warlords_era_open_world'
  | 'player_home_block'
  | 'tactical_ocean_view'
  | 'chicken_gun_pirate_lobby'
  | 'home_island'
  | 'event_island'
  | 'battle_arena'
  | 'pvp_battleground_genesis';

export interface MapFamilyDef {
  id: MapFamilyId;
  name: string;
  /** Short label for UI */
  shortName: string;
  description: string;
  /** How many discrete sectors/zones this family owns */
  sectorModel: string;
  /** Authoritative source file(s) */
  sources: string[];
  /** Entry URLs (client-relative or absolute) */
  entry: {
    primary: string;
    alternates?: string[];
  };
  /** What NOT to confuse this with */
  doNotConfuseWith: MapFamilyId[];
  /** Runtime engines */
  engines: string[];
  /** Seed / multiplayer notes */
  notes: string[];
}

// ── The two 9-sector maps ────────────────────────────────────────────────────

/** Macro open-world: 9 named biomes dividing the 100×100 Warlords grid. */
export const WARLORDS_ERA_SECTOR_IDS = [
  'ethereal_falls',
  'frostbite_expanse',
  'thornwood_wilds',
  'stormbreak_reef',
  'convergence_nexus',
  'ashen_wastes',
  'abyssal_trench',
  'haven_shore',
  'ember_depths',
] as const;

export type WarlordsEraSectorId = (typeof WARLORDS_ERA_SECTOR_IDS)[number];

/** Legacy Colyseus grid keys for the SAME Warlords era map only. */
export const WARLORDS_LEGACY_GRID_IDS = [
  'NW', 'N', 'NE', 'W', 'CENTER', 'E', 'SW', 'S', 'SE',
] as const;

/**
 * Player home block layout (row-major 3×3).
 * Index 4 (MC) is always the permanent home island cell.
 * The other 8 rotate: wild / fort / boss / event / empty.
 * These are NOT warlords era sector ids.
 */
export const PLAYER_HOME_BLOCK_SLOTS = [
  'TL', 'TC', 'TR',
  'ML', 'MC_HOME', 'MR',
  'BL', 'BC', 'BR',
] as const;

export type PlayerHomeBlockSlot = (typeof PLAYER_HOME_BLOCK_SLOTS)[number];

// ── Registry ─────────────────────────────────────────────────────────────────

export const MAP_FAMILIES: Record<MapFamilyId, MapFamilyDef> = {
  warlords_era_open_world: {
    id: 'warlords_era_open_world',
    name: 'Grudge Warlords Era — Open World (9 Macro Sectors)',
    shortName: 'Warlords 9 Sectors',
    description:
      'The shared MMO ocean world: 9 named macro-regions (Haven Shore, Ethereal Falls, …). ' +
      'Terrain is generated from WORLD_SECTORS; entry catalog is ObjectStore warlords-zones.json.',
    sectorModel: '9 fixed macro sectors (snake_case ids) + legacy NW…SE bridge',
    sources: [
      'shared/definitions/worldMapSectors.ts',
      'shared/definitions/sectorBridge.ts',
      'ObjectStore api/v1/warlords-zones.json',
    ],
    entry: {
      primary:
        '/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1',
      alternates: [
        '/play',
        '/ocean?worldSeed=grudge-world-1',
        '/world-map',
      ],
    },
    doNotConfuseWith: ['player_home_block', 'chicken_gun_pirate_lobby', 'pvp_battleground_genesis'],
    engines: ['Island3DEngine mode=zone', 'Colyseus sector rooms', 'ZoneTerrainGenerator'],
    notes: [
      'worldSeed default: grudge-world-1',
      'Starter sector: haven_shore (legacy S) — PVE trade village foundation (Fruzer GLB)',
      'Haven foundation SSOT: shared/definitions/havenShoreFoundation.ts',
      'Haven water: zone ocean only — strip Fruzer Water cubes (no duplicate water)',
      'Freeform ARPG: class is flavor; gear drives combat',
    ],
  },

  player_home_block: {
    id: 'player_home_block',
    name: 'Player Home Block — Personal 3×3 (9 Zones)',
    shortName: 'Home Block 3×3',
    description:
      'Each account owns a non-overlapping 3×3 block on the 100×100 world grid. ' +
      'Center cell is permanent home island; surrounding 8 rotate wild/fort/boss/event.',
    sectorModel: '9 personal zones per player (TL…BR), NOT warlords macro ids',
    sources: [
      'shared/definitions/worldMap.ts',
      'WORLD_CONFIG.blockSize = 3',
    ],
    entry: {
      primary: '/home-island',
      alternates: ['/world-map (player block view)', '/island-reveal'],
    },
    doNotConfuseWith: ['warlords_era_open_world', 'tactical_ocean_view'],
    engines: ['home island Colyseus room', 'procedural island seed', 'zone rotation tick'],
    notes: [
      'Home zones are cNFT-backed / permanent',
      'Surrounding zones expire on server rotation (default 24h)',
      'Do not pass haven_shore into home-block APIs',
    ],
  },

  tactical_ocean_view: {
    id: 'tactical_ocean_view',
    name: 'Tactical Ocean / World Map Sail View',
    shortName: 'Tactical Ocean',
    description:
      'Sailing camera over the Warlords era ocean (10 km). Anchors map to the SAME 9 macro sectors. ' +
      'Also bridges to Tactical Infinity (water.grudge-studio.com) for captain/raft production client.',
    sectorModel: 'View layer over warlords_era_open_world (not a second sector set)',
    sources: [
      'client/src/tactical-ocean/*',
      'client/src/lib/oceanNavigation.ts',
      'client/src/pages/ocean.tsx',
      'client/src/pages/world-map.tsx',
      'Tactical Infinity → water.grudge-studio.com',
    ],
    entry: {
      primary: '/ocean?worldSeed=grudge-world-1',
      alternates: [
        '/world-map',
        'https://water.grudge-studio.com',
      ],
    },
    doNotConfuseWith: ['player_home_block', 'chicken_gun_pirate_lobby'],
    engines: ['ThreeWorldMapManager', 'TacticalOceanScene', 'buildOceanDeployUrl → zone play'],
    notes: [
      'OCEAN_SECTOR_POSITIONS use legacy NW…SE keys → LEGACY_TO_ZONE_ID',
      'Landing deploys into warlords era zone mode, not home-block cells',
    ],
  },

  chicken_gun_pirate_lobby: {
    id: 'chicken_gun_pirate_lobby',
    name: 'Chicken Gun / PolygonPirates Lobby Map',
    shortName: 'Pirate Lobby',
    description:
      'Pre-built GLTF lobby (Chicken Gun PolygonPirates asset). Used for RTS/open-world lobby instances, ' +
      'NOT the Warlords 9-sector ocean and NOT a home island.',
    sectorModel: 'Single authored GLTF scene (pirate-islands)',
    sources: [
      'client/src/island3d/engine/LobbyIslandLoader.ts',
      'public/models/lobby/pirate-islands/ (R2 CDN)',
      'Island3DEngine mode=lobby',
      'shared/definitions/lobbyIslands.ts',
      'shared/definitions/factionLobbyIslands.ts',
      'shared/definitions/productionMapPackage.ts',
      'public/maps/grudge-open-world/grudge-open-world.gmap.json',
      'client/src/island3d/lobby/FactionIslandGenerator.ts',
    ],
    entry: {
      // Production open-world hub (boats, build, harvest, PvE, combat, Grudge6 main panel)
      primary: '/island-3d?mode=zone&sector=lobby',
      alternates: [
        '/island-3d?mode=lobby&map=pirate-islands&island=grudge-open-world',
        '/rts-grudge (lobby host)',
      ],
    },
    doNotConfuseWith: ['warlords_era_open_world', 'home_island', 'player_home_block'],
    engines: [
      'LobbyIslandLoader',
      'LobbyGameplay',
      'LobbyPlayZone',
      'FactionIslandGenerator',
      'BuildingSystem',
      'Grudge6PlayShell',
    ],
    notes: [
      'Asset: scene.gltf + scene.bin + textures/ (not a single glb)',
      'DEFAULT_PUBLIC_LOBBY_MAP_ID = pirate-islands',
      'URL aliases: sector=lobby | sector=pirate-islands | mode=lobby → same open-world hub',
      'Full systems: ModePlayHUD (combat/harvest/build), boats E-dock, Grudge6 panel/spellbook/inv',
      '6 faction islands on border ring (SSOT factionLobbyIslands): 4 docks, 5 buildings, 4 tents, 2 campfires, water hole, 8 unarmed + 8 heroes, captain on race mount, traveler network, blacksmith, profession benches, siege, Unity-style dock boat + respawn',
      'Production package (.gmap): public/maps/grudge-open-world/ — geometry pirate-islands GLTF/GLB + layers + AI + network + missions; Forge import .studio.json; rebuild npm run map:build-gmap',
    ],
  },

  home_island: {
    id: 'home_island',
    name: 'Home Island (Personal Seed World)',
    shortName: 'Home Island',
    description:
      'Player-owned procedural island (~1024m contract). Harvest, build, mountain dungeon. ' +
      'Distinct from open-world sectors and from the 3×3 block metadata.',
    sectorModel: '1 island per character/account seed',
    sources: [
      'client/src/pages/home-island.tsx',
      'ObjectStore api/v1/home-island-contract.json',
      'Railway /api/island/*',
    ],
    entry: {
      primary: '/home-island',
      alternates: ['/tutorial', '/island-reveal'],
    },
    doNotConfuseWith: ['warlords_era_open_world', 'chicken_gun_pirate_lobby', 'event_island'],
    engines: ['Island3DEngine mode=procedural (home)', 'Colyseus home_island room'],
    notes: ['Scale contract: 1024m', 'Raft can deploy toward tactical ocean'],
  },

  event_island: {
    id: 'event_island',
    name: 'Event / Rotating Islands',
    shortName: 'Event Islands',
    description:
      'Timed content on player home-block surround cells (type=event) and seasonal fleet events. ' +
      'Rotate on server tick; not permanent warlords macro sectors.',
    sectorModel: 'Dynamic; sourced from player_home_block zoneType=event (+ fleet events)',
    sources: [
      'shared/definitions/worldMap.ts (ZoneType event)',
      'WORLD_CONFIG.zoneRotationIntervalMs',
    ],
    entry: {
      primary: '/home-island (enter adjacent event cell)',
      alternates: ['/mission-board'],
    },
    doNotConfuseWith: ['warlords_era_open_world', 'battle_arena'],
    engines: ['home-block rotation', 'mission system'],
    notes: ['Default weight 10% of surround cells', 'expiresAt drives rotation'],
  },

  battle_arena: {
    id: 'battle_arena',
    name: 'Battle Arenas (RPG / Tiered)',
    shortName: 'Arenas',
    description:
      'Instanced combat spaces (ruined fortress, volcanic arena, tier 1–5 settlement arenas). ' +
      'Also external Grudge Arena PvP shell.',
    sectorModel: 'Named arena ids (not 9-sector grid)',
    sources: [
      'shared/definitions/battleArenas.ts',
      'client/src/pages/rpg-battle.tsx',
      'https://arena.grudge-studio.com (grudge-arena)',
    ],
    entry: {
      primary: '/rpg-battle',
      alternates: [
        '/combat',
        'https://arena.grudge-studio.com',
        'https://grudge-arena.vercel.app',
      ],
    },
    doNotConfuseWith: ['warlords_era_open_world', 'pvp_battleground_genesis'],
    engines: ['RPG battle UI', 'grudge-arena Socket.IO'],
    notes: ['Tier names: Acolytes → Primordial Conflicts'],
  },

  pvp_battleground_genesis: {
    id: 'pvp_battleground_genesis',
    name: 'PvP Battlegrounds — Warlord Genesis Mode',
    shortName: 'Genesis PvP',
    description:
      'Dedicated PvP battleground game mode (Warlord Genesis). Launched from in-game PvP UI ' +
      '(RTS lobby quick-match / faction war / siege paths and genesis host). Not open-world sectors.',
    sectorModel: 'Match instances / mode maps (quick-match, faction-war, siege)',
    sources: [
      'https://warlord-genesis.vercel.app',
      'client/src/pages/rts-grudge.tsx GAME_MODES',
      'shared/fleet/authConnect.ts (genesis auth callback)',
      'carrier.grudge-studio.com / pvp.grudge-studio.com',
    ],
    entry: {
      primary: 'https://warlord-genesis.vercel.app',
      alternates: [
        '/rts-grudge (mode=quick-match|faction-war|siege)',
        'https://carrier.grudge-studio.com',
      ],
    },
    doNotConfuseWith: ['warlords_era_open_world', 'home_island', 'chicken_gun_pirate_lobby'],
    engines: ['warlord-genesis', 'RTS lobby modes', 'Carrier / PvP servers'],
    notes: [
      'Auth callback: warlord-genesis.vercel.app/auth/callback',
      'PvP loadscreen video is fleet media — not a map',
      'Do not load haven_shore as a genesis battleground id',
    ],
  },
};

/** All families as a stable ordered list for UI / ObjectStore export */
export const MAP_FAMILY_LIST: MapFamilyDef[] = [
  MAP_FAMILIES.warlords_era_open_world,
  MAP_FAMILIES.player_home_block,
  MAP_FAMILIES.tactical_ocean_view,
  MAP_FAMILIES.chicken_gun_pirate_lobby,
  MAP_FAMILIES.home_island,
  MAP_FAMILIES.event_island,
  MAP_FAMILIES.battle_arena,
  MAP_FAMILIES.pvp_battleground_genesis,
];

// ── Guards ───────────────────────────────────────────────────────────────────

export function isWarlordsEraSectorId(id: string): boolean {
  return (WARLORDS_ERA_SECTOR_IDS as readonly string[]).includes(id);
}

export function isPlayerHomeBlockSlot(id: string): boolean {
  return (PLAYER_HOME_BLOCK_SLOTS as readonly string[]).includes(id);
}

/**
 * Reject cross-map id misuse early.
 * - Warlords play must not receive home-block slot names
 * - Home-block APIs must not receive haven_shore-style macro ids as cell slots
 */
export function assertMapIdForFamily(
  family: MapFamilyId,
  id: string,
): { ok: true } | { ok: false; reason: string } {
  if (family === 'warlords_era_open_world' || family === 'tactical_ocean_view') {
    if (isPlayerHomeBlockSlot(id)) {
      return {
        ok: false,
        reason: `"${id}" is a player home-block slot, not a Warlords era sector`,
      };
    }
  }
  if (family === 'player_home_block') {
    if (isWarlordsEraSectorId(id)) {
      return {
        ok: false,
        reason: `"${id}" is a Warlords era macro sector, not a home-block cell`,
      };
    }
  }
  if (family === 'pvp_battleground_genesis') {
    if (isWarlordsEraSectorId(id) || isPlayerHomeBlockSlot(id)) {
      return {
        ok: false,
        reason: `Genesis PvP uses match mode ids, not open-world/home-block sector ids ("${id}")`,
      };
    }
  }
  return { ok: true };
}

/** JSON-safe export for ObjectStore / info hub */
export function exportMapRegistryDoc() {
  return {
    version: '1.0.0',
    updated: new Date().toISOString().slice(0, 10),
    warning:
      'TWO different 9-cell systems exist: warlords_era_open_world (shared MMO) and player_home_block (personal 3×3). Never mix IDs.',
    twoNineSectorMaps: {
      warlords_era_open_world: {
        count: 9,
        ids: [...WARLORDS_ERA_SECTOR_IDS],
        legacyGrid: [...WARLORDS_LEGACY_GRID_IDS],
      },
      player_home_block: {
        count: 9,
        slots: [...PLAYER_HOME_BLOCK_SLOTS],
        homeSlot: 'MC_HOME',
      },
    },
    families: MAP_FAMILY_LIST,
  };
}

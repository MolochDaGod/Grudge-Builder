/**
 * Sector Production Content — meticulous SSOT for all 9 Warlords zones.
 *
 * Each sector is individually assigned:
 *   • biome ecosystem + PBR ground textures
 *   • heightmap modifier + deterministic terrain / population seeds
 *   • harvest trees / rocks / crystals + regen
 *   • wildlife (5 land animals) + fish pool
 *   • monsters (level-band) + elite / boss ids
 *   • NPC camp factions + camp seed
 *   • island / world event seeds + landmark GLBs
 *   • special systems (foundations, gated doors, event packs)
 *
 * Client (Island3DEngine) and production server both consume this package.
 * Authoring assets under MouseWithoutBorders are copied to client/public.
 *
 * Grid (top-left → bottom-right):
 *   ethereal_falls | frostbite_expanse | thornwood_wilds
 *   stormbreak_reef | convergence_nexus | ashen_wastes
 *   abyssal_trench | haven_shore | ember_depths
 */

import { WORLD_SECTORS, type WorldSector } from './worldMapSectors';
import {
  BIOME_ECOSYSTEMS,
  ECOSYSTEM_STORAGE,
  FISH_NODE_SPECIES,
  type EcosystemBiome,
  type BiomeEcosystem,
} from './biomeEcosystemCatalog';
import { HIDDEN_MOUNTAIN_CITY } from './hiddenMountainCity';
import type { CampFaction } from './npcCamps';

export const SECTOR_PRODUCTION_CONTENT_VERSION = '1.1.0';
export const DEFAULT_WORLD_SEED = 'grudge-world-1';

// ── Landmark / event mesh refs ───────────────────────────────────────────────

export interface SectorLandmarkAsset {
  id: string;
  name: string;
  /** Local public path (dev) */
  localPath: string;
  /** R2 / CDN path after upload */
  cdnKey: string;
  cdnUrl: string;
  /** Authoring source on disk (not shipped) */
  authoringPath?: string;
  targetHeightM: number;
  /** Fraction of zone size for placement */
  zoneAnchorFrac: { ox: number; oz: number };
  kind: 'event' | 'foundation' | 'dungeon_gate' | 'biome_kit' | 'capital_prop';
  notes?: string;
}

export interface SectorHarvestSpec {
  treeVariants: string[];
  rockVariants: string[];
  treeCdn: string[];
  groundPbr: string;
  groundTextureDir: string;
  canopyTint: number;
  snowCanopy: boolean;
  resources: string[];
  harvestRegenMs: number;
  professions: Array<'mining' | 'herbalism' | 'woodcutting' | 'fishing'>;
}

export interface SectorWildlifeSpec {
  animals: [string, string, string, string, string];
  fishSpecies: readonly string[];
  landSpawnCount: number;
  fishSpawnCount: number;
  /** PRNG namespace under worldSeed:sectorId */
  animalSeedKey: string;
}

export interface SectorMonsterSpec {
  /** Regular combat encounters (definition ids from monsters.ts) */
  common: string[];
  elites: string[];
  bosses: string[];
  recommendedLevel: [min: number, max: number];
  monsterSeedKey: string;
}

export interface SectorNpcSpec {
  factions: CampFaction[];
  campsPerIsland: number;
  npcSeedKey: string;
  capitalCityId: string | null;
  vendors: boolean;
  missions: boolean;
}

export interface SectorEventSpec {
  eventSeedKey: string;
  /** Scheduled / island event type ids for Colyseus + client */
  eventTypes: string[];
  landmarks: SectorLandmarkAsset[];
  ambientFx: string[];
  hazards: string[];
}

export interface SectorTerrainSpec {
  heightmapModifier: string;
  terrainSeedKey: string;
  populationSeedKey: string;
  sizeMeters: number;
  segments: number;
  minHeight: number;
  maxHeight: number;
  waterLevel: number;
  noiseOctaves: number;
  noisePersistence: number;
  noiseBaseFreq: number;
  skyColor: number;
  fog: { color: number; density: number };
  ambientIntensity: number;
  sunIntensity: number;
  sunDirection: [number, number, number];
  spawnPoints: [number, number, number][];
}

export interface SectorProductionContent {
  sectorId: string;
  legacyId: string;
  name: string;
  mapCorner: string;
  biome: WorldSector['biome'];
  ecosystemId: EcosystemBiome;
  difficulty: [min: number, max: number];
  isSafeZone: boolean;
  isContested: boolean;
  lore: string;
  terrain: SectorTerrainSpec;
  harvest: SectorHarvestSpec;
  wildlife: SectorWildlifeSpec;
  monsters: SectorMonsterSpec;
  npcs: SectorNpcSpec;
  events: SectorEventSpec;
  systems: {
    terrain3d: boolean;
    zonePopulation: boolean;
    harvestNodes: boolean;
    wildlife: boolean;
    fish: boolean;
    npcCamps: boolean;
    docks: boolean;
    colyseusSector: boolean;
    islandEvents: boolean;
    bosses: boolean;
    special?: string[];
  };
  playUrl: (worldSeed?: string) => string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CDN = ECOSYSTEM_STORAGE.cdnBase.replace(/\/$/, '');

function landmark(
  partial: Omit<SectorLandmarkAsset, 'cdnUrl'> & { cdnUrl?: string },
): SectorLandmarkAsset {
  return {
    ...partial,
    cdnUrl: partial.cdnUrl ?? `${CDN}/${partial.cdnKey.replace(/^\//, '')}`,
  };
}

function ecoOf(id: EcosystemBiome): BiomeEcosystem {
  return BIOME_ECOSYSTEMS[id];
}

function terrainFromSector(s: WorldSector, seedSuffix: string): SectorTerrainSpec {
  const t = s.terrain3d;
  return {
    heightmapModifier: t.heightmapModifier,
    terrainSeedKey: `terrain:${seedSuffix}`,
    populationSeedKey: `pop:${seedSuffix}`,
    sizeMeters: t.sizeMeters,
    segments: t.segments,
    minHeight: t.minHeight,
    maxHeight: t.maxHeight,
    waterLevel: t.waterLevel,
    noiseOctaves: t.noiseOctaves,
    noisePersistence: t.noisePersistence,
    noiseBaseFreq: t.noiseBaseFreq,
    skyColor: t.skyColor,
    fog: { ...t.fog },
    ambientIntensity: t.ambientIntensity,
    sunIntensity: t.sunIntensity,
    sunDirection: [...t.sunDirection] as [number, number, number],
    spawnPoints: t.spawnPoints.map((p) => [...p] as [number, number, number]),
  };
}

function harvestFromEco(
  eco: BiomeEcosystem,
  resources: string[],
  extras?: Partial<SectorHarvestSpec>,
): SectorHarvestSpec {
  return {
    treeVariants: [...eco.treeVariants],
    rockVariants: [...eco.rockVariants],
    treeCdn: [...eco.treeCdn],
    groundPbr: eco.groundPbr,
    groundTextureDir: eco.textures.ground,
    canopyTint: eco.canopyTint,
    snowCanopy: eco.snowCanopy,
    resources: [...resources],
    harvestRegenMs: eco.harvestRegenMs,
    professions: ['mining', 'herbalism', 'woodcutting', 'fishing'],
    ...extras,
  };
}

// ── Landmark catalog (shared assets) ─────────────────────────────────────────

export const EVENT_FALLS_LANDMARK = landmark({
  id: 'event_falls',
  name: 'Event Falls (Ethereal Cascade)',
  localPath: '/models/biomes/ethereal/event-falls.glb',
  cdnKey: 'models/biomes/ethereal/event-falls.glb',
  authoringPath: 'C:/Users/david/OneDrive/Desktop/MouseWithoutBorders/eventfalls.glb',
  targetHeightM: 160,
  zoneAnchorFrac: { ox: -0.22, oz: -0.28 },
  kind: 'event',
  notes: 'Primary NW ethereal cascade event mesh — sector improvement for ethereal_falls.',
});

export const STARTING_FALLS_LANDMARK = landmark({
  id: 'starting_falls',
  name: 'Starting Falls Companion',
  localPath: '/models/biomes/ethereal/starting-falls.glb',
  cdnKey: 'models/biomes/ethereal/starting-falls.glb',
  authoringPath: 'C:/Users/david/OneDrive/Desktop/MouseWithoutBorders/startingfalls.glb',
  targetHeightM: 120,
  zoneAnchorFrac: { ox: 0.18, oz: 0.2 },
  kind: 'event',
  notes: 'Secondary falls prop for ethereal_falls entry approach.',
});

export const HIDDEN_MOUNTAIN_LANDMARK = landmark({
  id: HIDDEN_MOUNTAIN_CITY.id,
  name: HIDDEN_MOUNTAIN_CITY.name,
  localPath: HIDDEN_MOUNTAIN_CITY.model.localPath,
  cdnKey: HIDDEN_MOUNTAIN_CITY.model.cdnKey,
  authoringPath: HIDDEN_MOUNTAIN_CITY.model.authoringPath,
  targetHeightM: HIDDEN_MOUNTAIN_CITY.model.targetHeightM,
  zoneAnchorFrac: HIDDEN_MOUNTAIN_CITY.zoneAnchorFrac,
  kind: 'dungeon_gate',
  notes: 'Boss-gated city under the mountain (Thornwood).',
});

export const ICE_BIOME_KIT = landmark({
  id: 'ice_biome_kit',
  name: 'Ice Biome Multipack',
  localPath: '/models/biomes/ice/ice_biome_kit.glb',
  cdnKey: 'models/biomes/ice/ice_biome_kit.glb',
  targetHeightM: 40,
  zoneAnchorFrac: { ox: 0.12, oz: -0.15 },
  kind: 'biome_kit',
  notes: 'Additive cold props; snow_pine canopy remains primary.',
});

export const FABLED_ZONE_CORE = landmark({
  id: 'fabledzone_core',
  name: 'Fabled Zone Core',
  localPath: '/models/warlords/fabled/fabledzone.glb',
  cdnKey: 'models/warlords/fabled/fabledzone.glb',
  targetHeightM: 80,
  zoneAnchorFrac: { ox: 0, oz: 0 },
  kind: 'foundation',
  notes: 'Frostbite / Fabled dwarf core — cave portals into interiors.',
});

// ── Monster bands (ids from shared/definitions/monsters.ts) ──────────────────

const BAND_STARTER = {
  common: ['monster_goblin', 'monster_skeleton', 'monster_zombie'],
  elites: ['monster_goblin_shaman'],
  bosses: [] as string[],
};

const BAND_MID = {
  common: ['monster_orc_warrior', 'monster_imp', 'monster_giant_spider', 'monster_skeleton_archer'],
  elites: ['monster_shadow_stalker', 'monster_goblin_shaman', 'monster_frost_elemental'],
  bosses: ['monster_boss_lich'] as string[],
};

const BAND_HIGH = {
  common: ['monster_shadow_stalker', 'monster_orc_warrior', 'monster_imp', 'monster_vampire_girl'],
  elites: ['monster_shadow_stalker', 'monster_converted_vampire'],
  bosses: ['monster_boss_demon_lord', 'monster_boss_dragon'] as string[],
};

// Fallback if some boss ids missing in catalog — still valid common pools
function monsterBand(
  min: number,
  max: number,
  prefer: 'starter' | 'mid' | 'high',
  bosses: string[] = [],
): SectorMonsterSpec {
  const base =
    prefer === 'starter' ? BAND_STARTER : prefer === 'high' ? BAND_HIGH : BAND_MID;
  return {
    common: [...base.common],
    elites: [...base.elites],
    bosses: bosses.length ? bosses : [...base.bosses],
    recommendedLevel: [min, max],
    monsterSeedKey: 'monsters',
  };
}

// ── Per-sector packages ──────────────────────────────────────────────────────

function buildSector(
  sectorId: string,
  legacyId: string,
  mapCorner: string,
  ecosystemId: EcosystemBiome,
  opts: {
    capitalCityId: string | null;
    isSafeZone?: boolean;
    isContested?: boolean;
    npcFactions: CampFaction[];
    campsPerIsland?: number;
    vendors?: boolean;
    missions?: boolean;
    monsterPrefer: 'starter' | 'mid' | 'high';
    bosses?: string[];
    landmarks: SectorLandmarkAsset[];
    eventTypes: string[];
    landSpawn?: number;
    fishSpawn?: number;
    specialSystems?: string[];
    bossesEnabled?: boolean;
  },
): SectorProductionContent {
  const sector = WORLD_SECTORS.find((s) => s.id === sectorId);
  if (!sector) {
    throw new Error(`[sectorProductionContent] Unknown sector ${sectorId}`);
  }
  const eco = ecoOf(ecosystemId);
  const diff: [number, number] = [sector.difficultyMin, sector.difficultyMax];

  return {
    sectorId,
    legacyId,
    name: sector.name,
    mapCorner,
    biome: sector.biome,
    ecosystemId,
    difficulty: diff,
    isSafeZone: opts.isSafeZone ?? !!sector.isSafeZone,
    isContested: opts.isContested ?? !!sector.isContested,
    lore: sector.lore,
    terrain: terrainFromSector(sector, sectorId),
    harvest: harvestFromEco(eco, sector.resources),
    wildlife: {
      animals: eco.animals,
      fishSpecies: FISH_NODE_SPECIES,
      landSpawnCount: opts.landSpawn ?? (opts.isSafeZone ? 16 : 28),
      fishSpawnCount: opts.fishSpawn ?? 18,
      animalSeedKey: 'animals',
    },
    monsters: monsterBand(diff[0], diff[1], opts.monsterPrefer, opts.bosses),
    npcs: {
      factions: opts.npcFactions,
      campsPerIsland: opts.campsPerIsland ?? (opts.isSafeZone ? 1 : 1),
      npcSeedKey: 'npc_camps',
      capitalCityId: opts.capitalCityId,
      vendors: opts.vendors ?? false,
      missions: opts.missions ?? false,
    },
    events: {
      eventSeedKey: 'events',
      eventTypes: opts.eventTypes,
      landmarks: opts.landmarks,
      ambientFx: [...sector.ambientFx],
      hazards: [...sector.hazards],
    },
    systems: {
      terrain3d: true,
      zonePopulation: true,
      harvestNodes: true,
      wildlife: true,
      fish: true,
      npcCamps: true,
      docks: true,
      colyseusSector: true,
      islandEvents: true,
      bosses: opts.bossesEnabled ?? opts.monsterPrefer !== 'starter',
      special: opts.specialSystems,
    },
    playUrl: (worldSeed = DEFAULT_WORLD_SEED) =>
      `https://client.grudge-studio.com/island-3d?mode=zone&sector=${sectorId}&worldSeed=${encodeURIComponent(worldSeed)}`,
  };
}

/**
 * Full 9-sector production table — individually tuned.
 * Do not collapse biomes; each row is deliberate.
 */
export const SECTOR_PRODUCTION_CONTENT: Record<string, SectorProductionContent> = {
  // ── NW — Ethereal Falls ──────────────────────────────────────────────────
  ethereal_falls: buildSector('ethereal_falls', 'NW', 'top_left', 'ethereal', {
    capitalCityId: null,
    npcFactions: ['fabled', 'neutral', 'pirate'],
    monsterPrefer: 'mid',
    bosses: ['monster_boss_lich'],
    landmarks: [EVENT_FALLS_LANDMARK, STARTING_FALLS_LANDMARK],
    eventTypes: ['ethereal_cascade_surge', 'phantom_wisp_hunt', 'crystal_overload_event'],
    landSpawn: 24,
    fishSpawn: 20,
    specialSystems: ['event_falls_landmark', 'fabled_satellite', 'gravity_fx'],
    bossesEnabled: true,
  }),

  // ── N — Frostbite Expanse ────────────────────────────────────────────────
  frostbite_expanse: buildSector('frostbite_expanse', 'N', 'top_center', 'frozen', {
    capitalCityId: 'runeforge_hold',
    npcFactions: ['fabled', 'crusade', 'neutral'],
    monsterPrefer: 'mid',
    bosses: ['monster_frost_elemental', 'monster_boss_lich'],
    landmarks: [FABLED_ZONE_CORE, ICE_BIOME_KIT],
    eventTypes: ['blizzard_front', 'ice_cave_breach', 'fabled_forge_pulse'],
    landSpawn: 22,
    fishSpawn: 14,
    specialSystems: ['fabledzone_core', 'ice_biome_kit', 'cave_portals', 'dwarf_castle'],
    bossesEnabled: true,
  }),

  // ── NE — Thornwood Wilds ─────────────────────────────────────────────────
  thornwood_wilds: buildSector('thornwood_wilds', 'NE', 'top_right', 'forest', {
    capitalCityId: 'starweave_canopy',
    npcFactions: ['worge', 'fabled', 'pirate'],
    monsterPrefer: 'mid',
    bosses: ['monster_giant_spider'],
    landmarks: [HIDDEN_MOUNTAIN_LANDMARK],
    eventTypes: ['beast_ambush', 'living_vines_surge', 'hidden_mountain_warden'],
    landSpawn: 30,
    fishSpawn: 18,
    specialSystems: ['hidden_mountain_city', 'worge_territory'],
    bossesEnabled: true,
  }),

  // ── W — Stormbreak Reef ──────────────────────────────────────────────────
  stormbreak_reef: buildSector('stormbreak_reef', 'W', 'mid_left', 'storm', {
    capitalCityId: null,
    npcFactions: ['pirate', 'crusade', 'neutral'],
    monsterPrefer: 'mid',
    landmarks: [],
    eventTypes: ['lightning_storm', 'reef_shipwreck', 'coral_bloom'],
    landSpawn: 20,
    fishSpawn: 28,
    specialSystems: ['storm_fx', 'heavy_sailing'],
    bossesEnabled: true,
  }),

  // ── CENTER — Convergence Nexus ───────────────────────────────────────────
  convergence_nexus: buildSector('convergence_nexus', 'CENTER', 'center', 'nexus', {
    capitalCityId: null,
    isContested: true,
    npcFactions: ['crusade', 'legion', 'fabled', 'worge', 'pirate'],
    campsPerIsland: 2,
    monsterPrefer: 'high',
    bosses: ['monster_boss_demon_lord'],
    landmarks: [],
    eventTypes: ['faction_clash', 'world_boss_pulse', 'embassy_summons'],
    landSpawn: 28,
    fishSpawn: 16,
    specialSystems: ['embassies', 'contested_pvp', 'world_events'],
    bossesEnabled: true,
  }),

  // ── E — Ashen Wastes ─────────────────────────────────────────────────────
  ashen_wastes: buildSector('ashen_wastes', 'E', 'mid_right', 'desert', {
    capitalCityId: 'ashen_throne',
    npcFactions: ['legion', 'pirate', 'neutral'],
    monsterPrefer: 'high',
    bosses: ['monster_boss_demon_lord'],
    landmarks: [],
    eventTypes: ['sandstorm', 'glass_dune_collapse', 'bone_field_rise'],
    landSpawn: 22,
    fishSpawn: 10,
    specialSystems: ['demon_capital', 'heat_haze'],
    bossesEnabled: true,
  }),

  // ── SW — Abyssal Trench ──────────────────────────────────────────────────
  abyssal_trench: buildSector('abyssal_trench', 'SW', 'bottom_left', 'abyssal', {
    capitalCityId: 'drowned_sepulcher',
    npcFactions: ['pirate', 'legion', 'monster'],
    monsterPrefer: 'high',
    bosses: ['monster_shadow_stalker'],
    landmarks: [],
    eventTypes: ['leviathan_sighting', 'pressure_surge', 'siren_song'],
    landSpawn: 18,
    fishSpawn: 32,
    specialSystems: ['deep_ocean', 'undead_capital', 'crushing_pressure'],
    bossesEnabled: true,
  }),

  // ── S — Haven Shore (starter) ────────────────────────────────────────────
  haven_shore: buildSector('haven_shore', 'S', 'bottom_center', 'tropical', {
    capitalCityId: 'haven_port',
    isSafeZone: true,
    npcFactions: ['crusade', 'neutral', 'fabled'],
    campsPerIsland: 1,
    vendors: true,
    missions: true,
    monsterPrefer: 'starter',
    landmarks: [],
    eventTypes: ['tutorial_escort', 'fish_run', 'merchant_caravan'],
    landSpawn: 18,
    fishSpawn: 22,
    specialSystems: ['fruzer_foundation', 'haven_port_vendors', 'starter_safe'],
    bossesEnabled: false,
  }),

  // ── SE — Ember Depths ────────────────────────────────────────────────────
  ember_depths: buildSector('ember_depths', 'SE', 'bottom_right', 'volcanic', {
    capitalCityId: null,
    npcFactions: ['legion', 'monster', 'pirate'],
    monsterPrefer: 'high',
    bosses: ['monster_boss_dragon', 'monster_boss_demon_lord'],
    landmarks: [],
    eventTypes: ['eruption', 'lava_flow', 'legion_forge_call'],
    landSpawn: 26,
    fishSpawn: 10,
    specialSystems: ['volcanic_hazards', 'legion_origin'],
    bossesEnabled: true,
  }),
};

// ── Deterministic seeds ──────────────────────────────────────────────────────

/** FNV-1a style hash for seed strings → uint32 */
export function hashSeedString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Resolve namespaced seeds for a sector under a world seed.
 * Server and client must call with the same worldSeed for identical layouts.
 */
export function resolveSectorSeeds(
  sectorId: string,
  worldSeed: string = DEFAULT_WORLD_SEED,
): {
  terrain: number;
  population: number;
  animals: number;
  monsters: number;
  npcCamps: number;
  events: number;
  keys: Record<string, string>;
} {
  const content = SECTOR_PRODUCTION_CONTENT[sectorId];
  if (!content) {
    const fallback = hashSeedString(`${worldSeed}:${sectorId}`);
    return {
      terrain: fallback,
      population: fallback ^ 0x9e3779b9,
      animals: fallback ^ 0x85ebca6b,
      monsters: fallback ^ 0xc2b2ae35,
      npcCamps: fallback ^ 0x27d4eb2d,
      events: fallback ^ 0x165667b1,
      keys: {},
    };
  }
  const base = `${worldSeed}:${sectorId}`;
  const keys = {
    terrain: `${base}:${content.terrain.terrainSeedKey}`,
    population: `${base}:${content.terrain.populationSeedKey}`,
    animals: `${base}:${content.wildlife.animalSeedKey}`,
    monsters: `${base}:${content.monsters.monsterSeedKey}`,
    npcCamps: `${base}:${content.npcs.npcSeedKey}`,
    events: `${base}:${content.events.eventSeedKey}`,
  };
  return {
    terrain: hashSeedString(keys.terrain),
    population: hashSeedString(keys.population),
    animals: hashSeedString(keys.animals),
    monsters: hashSeedString(keys.monsters),
    npcCamps: hashSeedString(keys.npcCamps),
    events: hashSeedString(keys.events),
    keys,
  };
}

export function getSectorProductionContent(
  sectorId: string | undefined | null,
): SectorProductionContent | null {
  if (!sectorId) return null;
  return SECTOR_PRODUCTION_CONTENT[sectorId] ?? null;
}

export function listSectorProductionContent(): SectorProductionContent[] {
  return Object.values(SECTOR_PRODUCTION_CONTENT);
}

/** JSON-serializable production payload for API + static publish */
export function buildSectorProductionManifest(worldSeed = DEFAULT_WORLD_SEED) {
  const sectors = listSectorProductionContent().map((c) => {
    const seeds = resolveSectorSeeds(c.sectorId, worldSeed);
    return {
      sectorId: c.sectorId,
      legacyId: c.legacyId,
      name: c.name,
      mapCorner: c.mapCorner,
      biome: c.biome,
      ecosystemId: c.ecosystemId,
      difficulty: c.difficulty,
      isSafeZone: c.isSafeZone,
      isContested: c.isContested,
      lore: c.lore,
      terrain: c.terrain,
      harvest: c.harvest,
      wildlife: c.wildlife,
      monsters: c.monsters,
      npcs: {
        factions: c.npcs.factions,
        campsPerIsland: c.npcs.campsPerIsland,
        npcSeedKey: c.npcs.npcSeedKey,
        capitalCityId: c.npcs.capitalCityId,
        vendors: c.npcs.vendors,
        missions: c.npcs.missions,
      },
      events: {
        eventSeedKey: c.events.eventSeedKey,
        eventTypes: c.events.eventTypes,
        landmarks: c.events.landmarks,
        ambientFx: c.events.ambientFx,
        hazards: c.events.hazards,
      },
      systems: c.systems,
      seeds,
      playUrl: c.playUrl(worldSeed),
      island3dUrl: `/island-3d?mode=zone&sector=${c.sectorId}&worldSeed=${encodeURIComponent(worldSeed)}`,
    };
  });

  return {
    version: SECTOR_PRODUCTION_CONTENT_VERSION,
    updated: new Date().toISOString().slice(0, 10),
    worldSeedDefault: worldSeed,
    grid: {
      layout: '3x3',
      rows: [
        ['ethereal_falls', 'frostbite_expanse', 'thornwood_wilds'],
        ['stormbreak_reef', 'convergence_nexus', 'ashen_wastes'],
        ['abyssal_trench', 'haven_shore', 'ember_depths'],
      ],
    },
    bestPractices: [
      'One SSOT: sectorProductionContent.ts — client and server share seeds via resolveSectorSeeds()',
      'Never mix megakit low-poly trees (CommonTree/Pine_*) — use ecosystem treeCdn paths',
      'Animals: exactly 5 types per biome; spawn counts from wildlife.landSpawnCount',
      'Fish only in water nodes; land wildlife never below waterLevel+1.25m',
      'Heightmap modifier + terrain seed must stay paired for Colyseus / client parity',
      'Landmark GLBs: local public first, then CDN; procedural fallback if both fail',
      'Event falls (eventfalls.glb) is ethereal_falls only; mountain city is thornwood only',
      'Safe zone haven_shore: starter monsters, vendors, Fruzer foundation — no world bosses',
    ],
    sectorCount: sectors.length,
    sectors,
    landmarksIndex: {
      event_falls: EVENT_FALLS_LANDMARK,
      starting_falls: STARTING_FALLS_LANDMARK,
      hidden_mountain_city: HIDDEN_MOUNTAIN_LANDMARK,
      ice_biome_kit: ICE_BIOME_KIT,
      fabledzone_core: FABLED_ZONE_CORE,
    },
    urls: {
      clientManifest: '/production/sectors-content.json',
      apiAll: '/api/production/sectors',
      apiOne: '/api/production/sectors/:sectorId',
      playBase: 'https://client.grudge-studio.com/island-3d',
      cdn: CDN,
    },
  };
}

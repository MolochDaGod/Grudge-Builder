/**
 * Modular Asset Library — ONE TRUTH for rebuild of:
 *   9 Warlords sectors · Chicken Gun lobby · home islands · event islands
 *
 * Layers (do not replace; compose):
 *  1. Terrain PBR / PolyHaven snow+ground textures  → materials only
 *  2. Biome ecosystem (trees/rocks/animals)          → natureAssetCatalog + biomeEcosystemCatalog
 *  3. Multipack placeables (fantasy village, ice)   → node extract via PackModelLoader
 *  4. Survival kit modular walls/camp/benches        → free_survival_asset_kit
 *  5. Spawnables + DB                                 → Railway placements / unlocked_recipes
 *
 * Cold rule: KEEP existing snow_pine + frozen ground PBR + frost textures.
 *            Ice biome kit ADDS props/stations/chests/harvest nodes for snow events —
 *            it does NOT replace snow_pine harvest trees.
 */

import { BUILD_PACK_PATHS } from './buildSystem';
import {
  BIOME_ECOSYSTEMS,
  ECOSYSTEM_STORAGE,
  HARVEST_REGEN_MS,
  TREE_STORAGE,
  type EcosystemBiome,
} from './biomeEcosystemCatalog';
import { WORLD_SECTORS } from './worldMapSectors';

export const MODULAR_LIBRARY_VERSION = '1.0.0';

/** Mirrors client lobbyMapRuntime — keep shared free of client imports */
export const DEFAULT_PUBLIC_LOBBY_MAP_ID = 'pirate-islands';

// ── Map family IDs (never mix) ───────────────────────────────────────────────

export type MapFamily =
  | 'warlords_sector' // 9 ocean sectors
  | 'chicken_gun_lobby' // pirate-islands open hub
  | 'home_island' // personal 1024m
  | 'event_island' // rotating snow/deserted
  | 'tutorial_shipwreck'; // solo procedural

export type AssetLayer =
  | 'terrain_pbr' // snow/rock/dirt materials
  | 'terrain_mesh' // mountains, icebergs (scatter)
  | 'nature_tree' // snow_pine / palm / stylized (ecosystem)
  | 'nature_rock' // harvest rocks
  | 'harvest_node' // interactive wood/stone/fiber
  | 'modular_structure' // walls, foundations, gates, towers
  | 'faction_building' // full houses, taverns, windmills
  | 'camp_station' // fire, benches, extractors
  | 'storage_prop' // chests, barrels, bags
  | 'transport' // boat, sled, cart
  | 'decor' // lore props
  | 'npc_prop'; // sleeper markers etc.

/** Multipack registry — add packs here, never hardcode paths in spawner code */
export const MULTIPACK_LIBRARY = {
  survivalKit: {
    id: 'survival_kit',
    path: BUILD_PACK_PATHS.survivalKit,
    role: 'modular_structure' as const,
    mapFamilies: ['home_island', 'warlords_sector', 'chicken_gun_lobby'] as MapFamily[],
    notes: 'Camp stages, T1 wood modular, profession benches',
  },
  fantasyVillage: {
    id: 'fantasy_village_kit',
    path: BUILD_PACK_PATHS.fantasyVillageKit,
    role: 'modular_structure' as const,
    mapFamilies: ['warlords_sector', 'chicken_gun_lobby', 'home_island'] as MapFamily[],
    notes: 'Walls/towers/gates/houses/storage/carts — NO trees',
    catalog: '/models/buildings/fantasy/fantasy_village_kit.catalog.json',
  },
  iceBiome: {
    id: 'ice_biome_kit',
    path: BUILD_PACK_PATHS.iceBiomeKit,
    role: 'camp_station' as const,
    mapFamilies: ['warlords_sector', 'event_island', 'home_island'] as MapFamily[],
    biomes: ['frozen', 'winter'] as EcosystemBiome[],
    notes:
      'Snow event props, chests, stations, path rocks. ADDS to cold biome — does not replace snow_pine ecosystem trees or ground_7 PBR.',
    catalog: '/models/biomes/ice/ice_biome_kit.catalog.json',
  },
  medievalTowers: {
    id: 'medieval_towers',
    path: BUILD_PACK_PATHS.medievalTowers,
    role: 'modular_structure' as const,
    mapFamilies: ['warlords_sector', 'home_island'] as MapFamily[],
    notes: 'Defense towers multipack',
  },
  islandBuildings: {
    id: 'island_buildings_si4',
    path: BUILD_PACK_PATHS.islandBuildings,
    role: 'faction_building' as const,
    mapFamilies: ['home_island', 'warlords_sector', 'chicken_gun_lobby'] as MapFamily[],
    catalog: '/api/objectstore/v1/island-building-prefabs.json',
    notes:
      'Cantina/tavern/inn/house/blacksmith/market baked to 4 m. Standalone GLBs (nodeName root). Cantina CDN key is cantina-4m.glb; identity-check still rejects size drift.',
  },
} as const;

// ── Cold biome sources (KEEP) ────────────────────────────────────────────────

/**
 * Existing cold pipeline — still authoritative for frozen/winter harvest trees + ground.
 */
export const COLD_BIOME_EXISTING = {
  ecosystems: {
    frozen: BIOME_ECOSYSTEMS.frozen,
    winter: BIOME_ECOSYSTEMS.winter,
  },
  /** High-quality snow pines — preferred harvest trees */
  snowPinePaths: TREE_STORAGE.snow_pine,
  /** Sector ground PBR key on frostbite (do not swap for ice kit atlas) */
  frostbiteGroundPbr: 'ground_7',
  heightmap: 'frozen_glacier',
  ambientFx: ['snowfall', 'fog_dense', 'ice_sparkle'] as const,
  /** PolyHaven / R2 snow-capable ground — extend when snow PBR uploaded */
  textureLayers: {
    /** Existing lobby rock/building can tint cold; dedicated snow PBR goes under textures/pbr/ground/snow_* */
    preferredSnowPbrPrefix: `${ECOSYSTEM_STORAGE.texturesPbr}/snow`,
    fallbackRock: 'coast_sand_rocks_02',
    fallbackPath: 'dirt_floor',
  },
  /** Ice multipack only for props/stations — not tree replacement */
  iceKitUsage: 'props_stations_chests_path_rocks_terrain_scatter',
} as const;

// ── Sector → library binding (all 9) ─────────────────────────────────────────

export interface SectorLibraryBinding {
  sectorId: string;
  biome: EcosystemBiome;
  mapFamily: 'warlords_sector';
  /** Ecosystem SSOT for trees/rocks/animals */
  ecosystemId: EcosystemBiome;
  /** Multipacks allowed to spawn placeables here */
  multipacks: (keyof typeof MULTIPACK_LIBRARY)[];
  /** Prefer existing nature paths for harvest trees */
  harvestTreesFrom: 'ecosystem' | 'ice_kit' | 'both';
  groundPbr: string;
  capitalSpawn: boolean;
  notes: string;
}

function sectorBiome(sectorId: string): EcosystemBiome {
  const s = WORLD_SECTORS.find((x) => x.id === sectorId);
  const b = (s?.biome ?? 'plains') as EcosystemBiome;
  return b in BIOME_ECOSYSTEMS ? b : 'plains';
}

/**
 * Best-practice binding per sector.
 * Cold sectors: ecosystem snow_pine FIRST; ice kit for camps/chests/event props.
 */
export const SECTOR_LIBRARY_BINDINGS: SectorLibraryBinding[] = WORLD_SECTORS.map((s) => {
  const biome = sectorBiome(s.id);
  const isCold = biome === 'frozen' || biome === 'winter';
  return {
    sectorId: s.id,
    biome,
    mapFamily: 'warlords_sector' as const,
    ecosystemId: biome,
    multipacks: isCold
      ? (['survivalKit', 'fantasyVillage', 'iceBiome', 'medievalTowers'] as const)
      : (['survivalKit', 'fantasyVillage', 'medievalTowers'] as const),
    harvestTreesFrom: isCold ? 'ecosystem' : 'ecosystem',
    groundPbr: s.groundPBR,
    capitalSpawn: true,
    notes: isCold
      ? 'Cold: keep ground_7 / snow_pine ecosystem; ice_biome_kit for event props + E-learn recipes'
      : 'Use fantasy modular + survival kit; biome ecosystem for nature',
  };
}) as SectorLibraryBinding[];

// ── Lobby + home island bindings ─────────────────────────────────────────────

export const LOBBY_LIBRARY_BINDING = {
  mapFamily: 'chicken_gun_lobby' as MapFamily,
  mapId: DEFAULT_PUBLIC_LOBBY_MAP_ID, // pirate-islands
  multipacks: ['survivalKit', 'fantasyVillage', 'medievalTowers'] as const,
  /** Lobby terrain = PolyHaven coastal set (not ice kit) */
  terrainTextures: 'polyhaven_lobby',
  harvestTreesFrom: 'ecosystem' as const,
  notes: 'Chicken Gun GLTF base mesh; modular props from fantasy/survival; no ice kit on pirate lobby',
};

export const HOME_ISLAND_LIBRARY_BINDING = {
  mapFamily: 'home_island' as MapFamily,
  multipacks: ['survivalKit', 'fantasyVillage', 'iceBiome', 'medievalTowers'] as const,
  harvestTreesFrom: 'ecosystem' as const,
  /** Ice kit allowed when home island seed rolls winter/frozen foundation */
  iceKitWhenBiome: ['frozen', 'winter'] as EcosystemBiome[],
  notes: 'Personal 1024m; camp modular from survival; race homes; ice props if cold seed',
};

export const EVENT_SNOW_LIBRARY_BINDING = {
  mapFamily: 'event_island' as MapFamily,
  multipacks: ['iceBiome', 'survivalKit', 'fantasyVillage'] as const,
  harvestTreesFrom: 'both' as const,
  /** Event may use ice kit pines as scatter PLUS ecosystem snow_pine */
  notes: 'Deserted/event snow: ice kit chests+stations for E-learn; ecosystem snow_pine primary wood',
};

// ── Spawnable definition (DB + runtime) ──────────────────────────────────────

export type SpawnableKind =
  | 'harvest_tree'
  | 'harvest_rock'
  | 'harvest_fiber'
  | 'build_prop'
  | 'chest'
  | 'station'
  | 'npc_marker'
  | 'transport'
  | 'terrain_scatter';

export interface SpawnableDef {
  /** Stable id for DB rows */
  spawnId: string;
  kind: SpawnableKind;
  /** Build asset id or nature variant id */
  assetId: string;
  /** Multipack node when applicable */
  nodeName?: string;
  packId?: string;
  /** Biomes this may spawn in */
  biomes: string[];
  mapFamilies: MapFamily[];
  /** Interact */
  harvestResource?: string;
  learnRecipeId?: string;
  learnOnce?: boolean;
  /** Density hints for seed generators */
  density?: 'sparse' | 'normal' | 'dense';
}

/**
 * Best-practice spawn rules (seed / server).
 */
export const SPAWN_BEST_PRACTICES = {
  harvestRegenMs: HARVEST_REGEN_MS,
  characterHeightM: 2.0,
  mountainPeakHeightM: 20,
  /** Never spawn ice kit Tree_* as replacement for snow_pine on frostbite default palette */
  preferEcosystemTrees: true,
  /** Modular walls only via BuildingSystem structural snaps */
  modularSnapOnly: true,
  /** E-learn: one unlock per character per recipeId */
  recipeLearnOnce: true,
  /** Persist player builds */
  placementsTable: 'world_placements',
  recipesTable: 'unlocked_recipes',
  /** JSON catalogs on ObjectStore / info hub when published */
  publishCatalogs: [
    'fantasy_village_kit.catalog.json',
    'ice_biome_kit.catalog.json',
    'biome-ecosystems.json',
  ],
} as const;

// ── Database contracts ───────────────────────────────────────────────────────

/**
 * Recommended Railway tables for modular rebuild (align with scheme.ts).
 *
 * world_placements:
 *   id, map_family, map_key (sectorId | homeIslandId | lobby),
 *   asset_id, node_name, pack_id, owner_character_id,
 *   x, y, z, rot_y, scale, metadata jsonb, created_at
 *
 * unlocked_recipes: (exists)
 *   character_id, recipe_id, unlocked_at
 *
 * world_harvest_nodes:
 *   id, map_family, map_key, asset_id, resource, x, z,
 *   state (mature|depleted), regen_at, seed
 *
 * sector_instances:
 *   sector_id, world_seed, room_id, player_count
 */
export const DB_LIBRARY_CONTRACT = {
  world_placements: {
    purpose: 'Player + authored modular builds',
    keys: ['map_family', 'map_key', 'asset_id', 'owner_character_id'],
  },
  unlocked_recipes: {
    purpose: 'E-once recipe learn',
    keys: ['character_id', 'recipe_id'],
  },
  world_harvest_nodes: {
    purpose: 'Trees/rocks/fiber regen 4h',
    keys: ['map_key', 'asset_id', 'regen_at'],
  },
  sector_instances: {
    purpose: 'Colyseus sector room shards',
    keys: ['sector_id', 'world_seed'],
  },
} as const;

// ── Modular build best practices ─────────────────────────────────────────────

export const MODULAR_BUILD_BEST_PRACTICES = {
  layers: {
    quick: 'Inventory craft, no world mesh',
    camp: 'Tent/fire/bedroll progression',
    bench: 'Profession stations (E craft)',
    modular: 'Snap walls/foundations/gates (Conan sockets)',
    rts: 'Full faction buildings (house, tavern, windmill)',
    dock: 'Waterfront + boats',
    race_home: 'Per-race starter housing',
  },
  naming: {
    id: 'stable snake id: fv_wooden_wall_1 | ice_chest',
    name: 'Player label',
    nodeName: 'Exact multipack parent — never material leaf *_0',
    modelPath: 'Pack path only; PackModelLoader clones node',
  },
  ui: {
    open: 'B key BuildModePanel',
    place: 'Ghost + R rotate + click',
    learn: 'E once when nearestLearnAssetId set',
    tabs: 'Structure first (Conan-style), then Defense, Storage, Crafting, Nature',
  },
  coldBiome: {
    keep: ['snow_pine ecosystem trees', 'ground_7 / frozen_glacier PBR', 'snowfall FX'],
    add: ['ice_biome_kit props', 'chests/stations E-learn', 'path rocks fiber'],
    never: ['replace snow_pine with ice kit Tree_* as default frostbite canopy'],
  },
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

export function multipacksForSector(sectorId: string): (keyof typeof MULTIPACK_LIBRARY)[] {
  const b = SECTOR_LIBRARY_BINDINGS.find((x) => x.sectorId === sectorId);
  return b ? [...b.multipacks] : ['survivalKit', 'fantasyVillage'];
}

export function isColdBiome(biome: string | undefined | null): boolean {
  return biome === 'frozen' || biome === 'winter';
}

export function resolveSectorLibrary(sectorId: string): SectorLibraryBinding {
  return (
    SECTOR_LIBRARY_BINDINGS.find((x) => x.sectorId === sectorId) ?? {
      sectorId,
      biome: 'plains',
      mapFamily: 'warlords_sector',
      ecosystemId: 'plains',
      multipacks: ['survivalKit', 'fantasyVillage'],
      harvestTreesFrom: 'ecosystem',
      groundPbr: 'ground_1',
      capitalSpawn: true,
      notes: 'fallback',
    }
  );
}

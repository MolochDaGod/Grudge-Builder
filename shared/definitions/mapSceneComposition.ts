/**
 * Map Scene Composition — SSOT for maps as **our creation**.
 *
 * Every placeable is a **chunkable asset** with:
 *   kind · layer · mesh/source · size · heights · interact · living role
 *
 * Maps are NOT black-box monomes. Even when a GLTF base loads first, each mesh
 * is classified into a chunk and tagged (userData.grudgeChunk). New maps should
 * be authored as ordered chunk lists (this file) + multipack node refs.
 *
 * Families:
 *   chicken_gun_lobby | warlords_sector | home_island | tutorial_shipwreck | event_island
 */

import { FLEET_URLS } from '../fleet/manifest';
import { BATTLE_NATURE_PACK } from './natureAssetCatalog';
import { RACE_GRUDGE6 } from '../fleet/character';
import { DOCK_GLB } from './shipCatalog';
import { listSiegeDeployables, listMountDeployables } from '../fleet/vehicles';
import { allUmmorpgDeployables } from './ummorpgDeployables';
import { BUILD_PACK_PATHS, SURVIVAL_KIT_NODES } from './buildSystem';

export const MAP_SCENE_COMPOSITION_VERSION = '1.0.0';

// ── Layers (draw / stream order) ─────────────────────────────────────────────

/**
 * Chunk layers — lowest drawn/streamed first.
 * Island meshes are composed of structural + nature + living layers.
 */
export type MapChunkLayer =
  | 'ocean_floor'   // seafloor / submerged terrain
  | 'ocean'         // water surface plane
  | 'island_base'   // land mass / heightfield
  | 'beach'         // shore band
  | 'structure'     // walls, roofs, houses, docks
  | 'prop'          // chests, furniture, barrels
  | 'nature'        // trees, rocks, plants, flowers
  | 'camp'          // tents, campfires
  | 'living'        // NPCs, vendors, captains, enemies, animals
  | 'vehicle'       // boats, mounts, siege
  | 'vfx'           // weather, particles
  | 'nav';           // colliders, spawn volumes (invisible)

/** Atomic asset kinds the user listed (and related) */
export type MapChunkKind =
  // Island / terrain
  | 'island'
  | 'island_chunk'
  | 'ocean'
  | 'ocean_floor'
  | 'water_height'
  | 'ocean_floor_height'
  | 'beach'
  | 'path'
  // Structure
  | 'house'
  | 'wall'
  | 'door'
  | 'roof'
  | 'window'
  | 'floor'
  | 'foundation'
  | 'dock'
  | 'fence'
  | 'tower'
  // Props
  | 'chest'
  | 'barrel'
  | 'crate'
  | 'tent'
  | 'campfire'
  | 'sign'
  | 'lantern'
  // Nature
  | 'tree'
  | 'rock'
  | 'rock_formation'
  | 'boulder'
  | 'pebble'
  | 'plant'
  | 'flower'
  | 'bush'
  | 'grass'
  | 'mushroom'
  // Living
  | 'npc'
  | 'vendor'
  | 'captain'
  | 'traveler'
  | 'bandit'
  | 'enemy'
  | 'guard'
  | 'animal'
  | 'ocean_animal'
  | 'monster'
  // Vehicles
  | 'boat'
  | 'ship'
  | 'mount'
  | 'siege'
  // Environment
  | 'weather'
  | 'cloud'
  | 'fog'
  | 'spawn_point'
  | 'poi'
  | 'unknown';

export type MapFamilyId =
  | 'chicken_gun_lobby'
  | 'warlords_sector'
  | 'home_island'
  | 'tutorial_shipwreck'
  | 'event_island';

export type ChunkSourceType =
  | 'gltf_mesh'      // named mesh inside a GLTF scene
  | 'multipack_node' // node from survival / fantasy kit
  | 'cdn_glb'        // standalone GLB on R2
  | 'procedural'     // generated mesh (ocean plane, heightfield)
  | 'agent'          // runtime NPC / creature system
  | 'height_param';  // numeric height SSOT only

export interface MapChunkAsset {
  /** Stable chunk id (map-local unique) */
  chunkId: string;
  kind: MapChunkKind;
  layer: MapChunkLayer;
  /** Human label */
  name: string;
  source: {
    type: ChunkSourceType;
    /** CDN path or multipack path */
    path?: string;
    /** Multipack / GLTF node name */
    nodeName?: string;
    /** Regex to match mesh names when classifying an authored GLTF */
    meshNamePattern?: string;
  };
  /** World transform (meters) when placed from composition */
  transform?: {
    position: [number, number, number];
    rotationY?: number;
    scale?: number | [number, number, number];
  };
  /** Bounding size hint for streaming / culling */
  sizeM?: [number, number, number];
  /** Chunk is streamable / unloadable independently */
  chunkable: boolean;
  /** Interact / gameplay */
  interact?: {
    harvest?: string;
    vendor?: string;
    boardable?: boolean;
    combat?: 'ally' | 'enemy' | 'neutral';
    openable?: boolean;
  };
  tags?: string[];
}

export interface MapWaterConfig {
  /** Ocean surface world Y */
  waterLevel: number;
  /** Seafloor / ocean floor world Y (typical max depth under waterLevel) */
  oceanFloorLevel: number;
  shallowColor?: number;
  deepColor?: number;
  strength?: number;
}

export interface MapWeatherConfig {
  id: string;
  preset: 'clear' | 'clouds' | 'rain' | 'storm' | 'fog' | 'snow';
  fogDensity?: number;
  cloudCover?: number; // 0-1
  windStrength?: number;
  skyColor?: number;
}

export interface MapSceneComposition {
  /** Map id (e.g. grudge-open-world, pirate-islands, haven_shore) */
  mapId: string;
  mapFamily: MapFamilyId;
  version: string;
  displayName: string;
  /** Optional base GLTF — every mesh still classified into chunks */
  baseGltf?: string;
  water: MapWaterConfig;
  weather: MapWeatherConfig;
  /** Default player spawn */
  playerSpawn: [number, number, number];
  /** All discrete chunks that define the map */
  chunks: MapChunkAsset[];
  notes?: string;
}

// ── Mesh name → kind classifier (shared client/server) ───────────────────────

const KIND_PATTERNS: Array<{ kind: MapChunkKind; layer: MapChunkLayer; re: RegExp }> = [
  { kind: 'ocean', layer: 'ocean', re: /water|ocean|sea|foam|wave/i },
  { kind: 'ocean_floor', layer: 'ocean_floor', re: /seafloor|seabed|underwater|submerged|coral_ground/i },
  { kind: 'beach', layer: 'beach', re: /sand|beach|shore|coast|dune/i },
  { kind: 'dock', layer: 'structure', re: /dock|pier|jetty|wharf|harbor/i },
  { kind: 'house', layer: 'structure', re: /house|building|tavern|inn|cabin|hut|shop/i },
  { kind: 'wall', layer: 'structure', re: /wall|palisade|fort/i },
  { kind: 'roof', layer: 'structure', re: /roof|thatch|shingle/i },
  { kind: 'door', layer: 'structure', re: /door|gate|portal/i },
  { kind: 'window', layer: 'structure', re: /window/i },
  { kind: 'floor', layer: 'structure', re: /floor|plank|deck/i },
  { kind: 'foundation', layer: 'structure', re: /foundation|base_platform/i },
  { kind: 'tower', layer: 'structure', re: /tower|watchtower|bastion/i },
  { kind: 'fence', layer: 'structure', re: /fence|railing/i },
  { kind: 'tent', layer: 'camp', re: /tent|lean.?to|canopy/i },
  { kind: 'campfire', layer: 'camp', re: /campfire|firepit|bonfire/i },
  { kind: 'chest', layer: 'prop', re: /chest|loot|crate_treasure/i },
  { kind: 'barrel', layer: 'prop', re: /barrel|keg/i },
  { kind: 'crate', layer: 'prop', re: /crate|box/i },
  { kind: 'boat', layer: 'vehicle', re: /boat|rowboat|dinghy|skiff|raft/i },
  { kind: 'ship', layer: 'vehicle', re: /ship|sloop|galleon|brig|frigate|schooner/i },
  { kind: 'tree', layer: 'nature', re: /tree|palm|pine|oak|trunk|canopy/i },
  { kind: 'rock_formation', layer: 'nature', re: /cliff|formation|outcrop|mesa|spire_rock/i },
  { kind: 'rock', layer: 'nature', re: /rock|stone|boulder|pebble|granite/i },
  { kind: 'plant', layer: 'nature', re: /plant|fern|leaf|vegetation|vine/i },
  { kind: 'flower', layer: 'nature', re: /flower|bloom|petal/i },
  { kind: 'bush', layer: 'nature', re: /bush|shrub/i },
  { kind: 'grass', layer: 'nature', re: /grass|clover|meadow/i },
  { kind: 'mushroom', layer: 'nature', re: /mushroom|fungus/i },
  { kind: 'island', layer: 'island_base', re: /island|landmass|terrain/i },
  { kind: 'cloud', layer: 'vfx', re: /cloud|sky_dome/i },
  { kind: 'npc', layer: 'living', re: /npc|civilian|villager/i },
  { kind: 'vendor', layer: 'living', re: /vendor|merchant|trader/i },
  { kind: 'captain', layer: 'living', re: /captain|harbor.?master/i },
  { kind: 'enemy', layer: 'living', re: /enemy|bandit|pirate_hostile|raider/i },
  { kind: 'animal', layer: 'living', re: /wolf|boar|deer|bear|animal|bird/i },
  { kind: 'ocean_animal', layer: 'living', re: /fish|shark|whale|dolphin|sea_creature/i },
];

export function classifyMeshName(meshName: string): { kind: MapChunkKind; layer: MapChunkLayer } {
  const n = meshName || '';
  for (const p of KIND_PATTERNS) {
    if (p.re.test(n)) return { kind: p.kind, layer: p.layer };
  }
  return { kind: 'unknown', layer: 'prop' };
}

// ── Asset library refs (chunk templates — not placed yet) ────────────────────

const CDN = FLEET_URLS.assets;

function glb(path: string): string {
  if (path.startsWith('http')) return path;
  return `${CDN}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Nature library — each file is one chunkable asset */
export function natureChunkLibrary(): MapChunkAsset[] {
  const chunks: MapChunkAsset[] = [];
  let i = 0;
  const add = (kind: MapChunkKind, paths: readonly string[], tag: string) => {
    for (const p of paths) {
      chunks.push({
        chunkId: `lib_nature_${tag}_${i++}`,
        kind,
        layer: 'nature',
        name: p.split('/').pop() || tag,
        source: { type: 'cdn_glb', path: glb(p) },
        chunkable: true,
        tags: ['nature', tag],
      });
    }
  };
  add('tree', BATTLE_NATURE_PACK.trees, 'tree');
  add('tree', BATTLE_NATURE_PACK.pines, 'pine');
  add('tree', BATTLE_NATURE_PACK.deadTrees, 'dead_tree');
  add('rock', BATTLE_NATURE_PACK.rocks, 'rock');
  add('bush', BATTLE_NATURE_PACK.bushes, 'bush');
  add('flower', BATTLE_NATURE_PACK.flowers, 'flower');
  add('grass', BATTLE_NATURE_PACK.grasses, 'grass');
  add('mushroom', BATTLE_NATURE_PACK.mushrooms, 'mushroom');
  if (BATTLE_NATURE_PACK.plants) add('plant', BATTLE_NATURE_PACK.plants, 'plant');
  return chunks;
}

/** Structural multipack chunks (wall/door/roof/house) */
export function structureChunkLibrary(): MapChunkAsset[] {
  return [
    {
      chunkId: 'lib_struct_survival_kit',
      kind: 'house',
      layer: 'structure',
      name: 'Survival Kit Multipack',
      source: { type: 'multipack_node', path: BUILD_PACK_PATHS.survivalKit },
      chunkable: true,
      tags: ['structure', 'modular', 'tent', 'wall', 'floor'],
    },
    {
      chunkId: 'lib_struct_fantasy_village',
      kind: 'house',
      layer: 'structure',
      name: 'Fantasy Village Multipack',
      source: { type: 'multipack_node', path: BUILD_PACK_PATHS.fantasyVillageKit },
      chunkable: true,
      tags: ['structure', 'house', 'wall', 'roof', 'door', 'rock'],
    },
    {
      chunkId: 'lib_struct_medieval_towers',
      kind: 'tower',
      layer: 'structure',
      name: 'Medieval Towers Multipack',
      source: { type: 'multipack_node', path: BUILD_PACK_PATHS.medievalTowers },
      chunkable: true,
      tags: ['structure', 'tower', 'defense'],
    },
    {
      chunkId: 'lib_dock_village',
      kind: 'dock',
      layer: 'structure',
      name: 'Village Dock',
      source: { type: 'cdn_glb', path: glb(DOCK_GLB) },
      chunkable: true,
      sizeM: [8, 2, 12],
      interact: { boardable: true },
      tags: ['dock', 'transport'],
    },
  ];
}

/** Living agents as chunk templates */
export function livingChunkLibrary(): MapChunkAsset[] {
  const chunks: MapChunkAsset[] = [];
  for (const [raceId, cfg] of Object.entries(RACE_GRUDGE6)) {
    chunks.push({
      chunkId: `lib_captain_${raceId}`,
      kind: 'captain',
      layer: 'living',
      name: `${cfg.label} Captain`,
      source: { type: 'cdn_glb', path: glb(cfg.cdnPath) },
      chunkable: true,
      sizeM: [1.2, 2, 1.2],
      interact: { combat: 'ally' },
      tags: ['captain', 'npc', raceId],
    });
  }
  for (const d of allUmmorpgDeployables()) {
    const kind: MapChunkKind =
      d.kind === 'captain' ? 'captain'
        : d.kind === 'traveler' ? 'traveler'
          : d.kind === 'bandit' ? 'bandit'
            : d.kind === 'monster' ? 'monster'
              : d.kind === 'siege' ? 'siege'
                : d.kind === 'mount' ? 'mount'
                  : 'npc';
    chunks.push({
      chunkId: `lib_${d.id}`,
      kind,
      layer: d.kind === 'siege' || d.kind === 'mount' ? 'vehicle' : 'living',
      name: d.name,
      source: { type: 'cdn_glb', path: d.modelPath },
      chunkable: true,
      sizeM: d.size,
      interact: {
        combat: d.kind === 'bandit' || d.kind === 'monster' ? 'enemy' : 'neutral',
      },
      tags: [d.kind, d.buildCategory],
    });
  }
  return chunks;
}

/** Full library index (not a placed map) */
export function fullChunkAssetLibrary(): MapChunkAsset[] {
  return [
    ...structureChunkLibrary(),
    ...natureChunkLibrary(),
    ...livingChunkLibrary(),
    ...listSiegeDeployables().map((s) => ({
      chunkId: `lib_${s.id}`,
      kind: 'siege' as MapChunkKind,
      layer: 'vehicle' as MapChunkLayer,
      name: s.name,
      source: { type: 'cdn_glb' as const, path: s.modelPath },
      chunkable: true,
      tags: ['siege', s.kind],
    })),
    ...listMountDeployables().map((m) => ({
      chunkId: `lib_${m.id}`,
      kind: 'mount' as MapChunkKind,
      layer: 'vehicle' as MapChunkLayer,
      name: m.name,
      source: { type: 'cdn_glb' as const, path: m.modelPath },
      chunkable: true,
      tags: ['mount', 'cavalry'],
    })),
  ];
}

// ── Grudge Open World / Pirate Hub composition (our creation blueprint) ─────

/**
 * Production pirate hub — composition blueprint.
 * Base GLTF provides island mass; modular chunks + living agents define gameplay.
 * waterLevel / oceanFloorLevel are authoritative heights.
 */
export const GRUDGE_OPEN_WORLD_COMPOSITION: MapSceneComposition = {
  mapId: 'grudge-open-world',
  mapFamily: 'chicken_gun_lobby',
  version: MAP_SCENE_COMPOSITION_VERSION,
  displayName: "Racalvin's Free Port — Pirate Hub",
  baseGltf: `${CDN}/models/lobby/pirate-islands/scene.gltf`,
  water: {
    waterLevel: 0,
    oceanFloorLevel: -24,
    shallowColor: 0x1ec8d4,
    deepColor: 0x0a355f,
    strength: 1.3,
  },
  weather: {
    id: 'tropical_clear',
    preset: 'clouds',
    fogDensity: 0.0008,
    cloudCover: 0.35,
    windStrength: 0.4,
    skyColor: 0x87ceeb,
  },
  playerSpawn: [0, 4, 12],
  notes:
    'Classify base GLTF meshes into chunks; overlay modular docks/tents/chests/nature; living layer from deployables.',
  chunks: [
    // Heights
    {
      chunkId: 'ow_water_height',
      kind: 'water_height',
      layer: 'ocean',
      name: 'Ocean Surface Y=0',
      source: { type: 'height_param' },
      transform: { position: [0, 0, 0] },
      chunkable: false,
      tags: ['height', 'ocean'],
    },
    {
      chunkId: 'ow_ocean_floor_height',
      kind: 'ocean_floor_height',
      layer: 'ocean_floor',
      name: 'Ocean Floor Y=-24',
      source: { type: 'height_param' },
      transform: { position: [0, -24, 0] },
      chunkable: false,
      tags: ['height', 'seafloor'],
    },
    // Ocean mesh (procedural plane)
    {
      chunkId: 'ow_ocean_plane',
      kind: 'ocean',
      layer: 'ocean',
      name: 'Ocean Surface',
      source: { type: 'procedural', path: 'createOceanMesh' },
      chunkable: false,
      tags: ['ocean', 'water'],
    },
    // Island base (from GLTF — each mesh classified)
    {
      chunkId: 'ow_island_base',
      kind: 'island',
      layer: 'island_base',
      name: 'Pirate Islands Landmass',
      source: {
        type: 'gltf_mesh',
        path: `${CDN}/models/lobby/pirate-islands/scene.gltf`,
        meshNamePattern: 'island|terrain|land',
      },
      chunkable: true,
      tags: ['island', 'base'],
    },
    // Dock
    {
      chunkId: 'ow_dock_south',
      kind: 'dock',
      layer: 'structure',
      name: 'South Dock',
      source: { type: 'cdn_glb', path: glb(DOCK_GLB) },
      transform: { position: [0, 0.2, 40], rotationY: 0, scale: 1 },
      sizeM: [10, 2, 14],
      chunkable: true,
      interact: { boardable: true },
      tags: ['dock', 'south'],
    },
    // Tents / camp
    {
      chunkId: 'ow_tent_market',
      kind: 'tent',
      layer: 'camp',
      name: 'Market Tent',
      source: {
        type: 'multipack_node',
        path: BUILD_PACK_PATHS.survivalKit,
        nodeName: SURVIVAL_KIT_NODES.tent,
      },
      transform: { position: [-8, 0.5, 8] },
      chunkable: true,
      tags: ['tent', 'vendor'],
    },
    {
      chunkId: 'ow_campfire',
      kind: 'campfire',
      layer: 'camp',
      name: 'Harbor Campfire',
      source: {
        type: 'multipack_node',
        path: BUILD_PACK_PATHS.survivalKit,
        nodeName: SURVIVAL_KIT_NODES.campfire,
      },
      transform: { position: [-6, 0.5, 10] },
      chunkable: true,
      tags: ['campfire', 'crafting'],
    },
    // Chests
    {
      chunkId: 'ow_chest_harbor',
      kind: 'chest',
      layer: 'prop',
      name: 'Harbor Chest',
      source: {
        type: 'multipack_node',
        path: BUILD_PACK_PATHS.survivalKit,
        nodeName: SURVIVAL_KIT_NODES.chest,
      },
      transform: { position: [6, 0.5, 6] },
      chunkable: true,
      interact: { openable: true },
      tags: ['chest', 'loot'],
    },
    // Nature samples (streamable instances)
    ...BATTLE_NATURE_PACK.trees.slice(0, 3).map((p, i) => ({
      chunkId: `ow_tree_${i}`,
      kind: 'tree' as MapChunkKind,
      layer: 'nature' as MapChunkLayer,
      name: `Harbor Tree ${i + 1}`,
      source: { type: 'cdn_glb' as const, path: glb(p) },
      transform: {
        position: [12 + i * 4, 0.5, -8 - i * 2] as [number, number, number],
        scale: 1,
      },
      chunkable: true,
      interact: { harvest: 'wood' },
      tags: ['tree', 'nature'],
    })),
    ...BATTLE_NATURE_PACK.rocks.slice(0, 4).map((p, i) => ({
      chunkId: `ow_rock_${i}`,
      kind: 'rock' as MapChunkKind,
      layer: 'nature' as MapChunkLayer,
      name: `Rock Formation ${i + 1}`,
      source: { type: 'cdn_glb' as const, path: glb(p) },
      transform: {
        position: [-14 + i * 3, 0.4, -12 + (i % 2) * 5] as [number, number, number],
      },
      chunkable: true,
      interact: { harvest: 'stone' },
      tags: ['rock', 'rock_formation', 'nature'],
    })),
    ...BATTLE_NATURE_PACK.flowers.slice(0, 2).map((p, i) => ({
      chunkId: `ow_flower_${i}`,
      kind: 'flower' as MapChunkKind,
      layer: 'nature' as MapChunkLayer,
      name: `Flower Patch ${i + 1}`,
      source: { type: 'cdn_glb' as const, path: glb(p) },
      transform: { position: [4 + i * 2, 0.5, 14] as [number, number, number] },
      chunkable: true,
      tags: ['flower', 'plant'],
    })),
    // Living
    {
      chunkId: 'ow_vendor_supplies',
      kind: 'vendor',
      layer: 'living',
      name: 'Supplies Vendor',
      source: { type: 'agent', path: 'TownNPCController' },
      transform: { position: [-10, 1, 0] },
      chunkable: true,
      interact: { vendor: 'supplies' },
      tags: ['vendor', 'npc'],
    },
    {
      chunkId: 'ow_vendor_weapons',
      kind: 'vendor',
      layer: 'living',
      name: 'Weapons Vendor',
      source: { type: 'agent', path: 'TownNPCController' },
      transform: { position: [10, 1, 0] },
      chunkable: true,
      interact: { vendor: 'weapons' },
      tags: ['vendor', 'npc'],
    },
    {
      chunkId: 'ow_captain_human',
      kind: 'captain',
      layer: 'living',
      name: 'Harbor Captain',
      source: {
        type: 'cdn_glb',
        path: glb(RACE_GRUDGE6.human.cdnPath),
      },
      transform: { position: [0, 1, 18], rotationY: Math.PI },
      chunkable: true,
      interact: { combat: 'ally' },
      tags: ['captain', 'npc'],
    },
    {
      chunkId: 'ow_bandit_patrol',
      kind: 'bandit',
      layer: 'living',
      name: 'Shore Bandit',
      source: {
        type: 'cdn_glb',
        path: glb(RACE_GRUDGE6.orc.cdnPath),
      },
      transform: { position: [25, 1, -20] },
      chunkable: true,
      interact: { combat: 'enemy' },
      tags: ['bandit', 'enemy'],
    },
    // Animals
    {
      chunkId: 'ow_animal_boar',
      kind: 'animal',
      layer: 'living',
      name: 'Wild Boar',
      source: { type: 'cdn_glb', path: glb('/models/creatures/land/boar.glb') },
      transform: { position: [-22, 1, -15] },
      chunkable: true,
      interact: { combat: 'neutral', harvest: 'meat' },
      tags: ['animal'],
    },
    {
      chunkId: 'ow_ocean_fish_school',
      kind: 'ocean_animal',
      layer: 'living',
      name: 'Fish School',
      source: { type: 'agent', path: 'CreatureManager.spawnFish' },
      transform: { position: [0, -2, 50] },
      chunkable: true,
      tags: ['ocean_animal', 'fish'],
    },
    // Boat
    {
      chunkId: 'ow_boat_starter',
      kind: 'boat',
      layer: 'vehicle',
      name: 'Harbor Rowboat',
      source: { type: 'cdn_glb', path: glb('/models/ships/ship-small.glb') },
      transform: { position: [8, 0.3, 45] },
      chunkable: true,
      interact: { boardable: true },
      tags: ['boat', 'transport'],
    },
    // Weather
    {
      chunkId: 'ow_weather',
      kind: 'weather',
      layer: 'vfx',
      name: 'Tropical Clouds Weather',
      source: { type: 'procedural', path: 'weather:clouds' },
      chunkable: false,
      tags: ['weather', 'clouds'],
    },
    {
      chunkId: 'ow_spawn',
      kind: 'spawn_point',
      layer: 'nav',
      name: 'Player Spawn',
      source: { type: 'procedural' },
      transform: { position: [0, 4, 12] },
      chunkable: false,
      tags: ['spawn'],
    },
  ],
};

/** Sector maps use water/floor from terrain3d; chunks from zone population + multipacks */
export function compositionForSector(
  sectorId: string,
  opts: { waterLevel: number; minHeight: number; maxHeight: number; skyColor?: number },
): MapSceneComposition {
  return {
    mapId: sectorId,
    mapFamily: 'warlords_sector',
    version: MAP_SCENE_COMPOSITION_VERSION,
    displayName: `Sector ${sectorId}`,
    water: {
      waterLevel: opts.waterLevel,
      oceanFloorLevel: opts.minHeight,
      strength: 1.0,
    },
    weather: {
      id: `${sectorId}_weather`,
      preset: 'clear',
      skyColor: opts.skyColor ?? 0x87ceeb,
      fogDensity: 0.0005,
    },
    playerSpawn: [0, Math.max(opts.waterLevel + 2, 4), 0],
    chunks: [
      {
        chunkId: `${sectorId}_ocean`,
        kind: 'ocean',
        layer: 'ocean',
        name: 'Sector Ocean',
        source: { type: 'procedural', path: 'createOceanMesh' },
        chunkable: false,
        tags: ['ocean'],
      },
      {
        chunkId: `${sectorId}_islands`,
        kind: 'island',
        layer: 'island_base',
        name: 'Procedural Islands',
        source: { type: 'procedural', path: 'ZoneTerrainGenerator' },
        chunkable: true,
        tags: ['island'],
      },
    ],
    notes: 'Islands + harvest + camps come from zoneServerNodes population layer.',
  };
}

export function getComposition(mapId: string): MapSceneComposition | null {
  if (mapId === 'grudge-open-world' || mapId === 'pirate-islands' || mapId === 'lobby') {
    return GRUDGE_OPEN_WORLD_COMPOSITION;
  }
  return null;
}

export function chunksByLayer(comp: MapSceneComposition): Record<MapChunkLayer, MapChunkAsset[]> {
  const out = {} as Record<MapChunkLayer, MapChunkAsset[]>;
  for (const c of comp.chunks) {
    if (!out[c.layer]) out[c.layer] = [];
    out[c.layer].push(c);
  }
  return out;
}

export function chunksByKind(comp: MapSceneComposition, kind: MapChunkKind): MapChunkAsset[] {
  return comp.chunks.filter((c) => c.kind === kind);
}

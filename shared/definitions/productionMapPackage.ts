/**
 * Production Map Package (.gmap) — forge-editable, agent-accessible, runtime-loadable.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHERE IS THE GEOMETRY ASSET?
 *   CDN (live):  https://assets.grudge-studio.com/models/lobby/pirate-islands/scene.gltf
 *                (+ scene.bin ~127MB + textures/)
 *   Local:       public/models/lobby/pirate-islands/scene.bin (+ textures/)
 *   Preferred single-file for Forge mesh tools:
 *                models/lobby/pirate-islands/scene.glb  (build via scripts/convert-pirate-islands-glb.mjs)
 *
 * BEST FILE TYPE FOR forge.grudge-studio.com
 *   • Geometry only     → .glb  (one file; materials/textures embedded or external)
 *   • Full production map → .gmap.json (THIS package) — layers, NPCs, AI, network,
 *     missions, weapons, items, physics bake refs, character/equipment hooks
 *   • Forge UI project  → .studio.json (MapProject schema; importable from .gmap)
 *
 * WHY NOT ONE GIANT GLB FOR EVERYTHING?
 *   GLB cannot hold scripts, network config, AI brains, mission graphs, or inventory
 *   SSOT. Those stay JSON layers. Geometry GLB is referenced by path from the package.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { FLEET_URLS } from '../fleet/manifest';
import { RACE_GRUDGE6 } from '../fleet/character';
import { RACE_VEHICLES } from '../fleet/vehicles';
import { SHIP_CATALOG, DOCK_GLB } from './shipCatalog';
import { BUILD_PACK_PATHS, SURVIVAL_KIT_NODES } from './buildSystem';
import { FACTION_LOBBY_ISLANDS, FACTION_ISLAND_TEMPLATE } from './factionLobbyIslands';
import { LOBBY_ISLANDS, LOBBY_MAP_ID, LOBBY_ISLAND_ID } from './lobbyIslands';
import {
  GRUDGE_OPEN_WORLD_COMPOSITION,
  MAP_SCENE_COMPOSITION_VERSION,
  type MapChunkLayer,
} from './mapSceneComposition';
import { GAME_CLOCK, TIDE_CONFIG } from './gameClock';

const CDN = FLEET_URLS.assets.replace(/\/$/, '');

export const PRODUCTION_MAP_PACKAGE_VERSION = '1.0.0';
export const PRODUCTION_MAP_ID = 'grudge-open-world' as const;
export const PRODUCTION_MAP_SCHEMA = 2 as const;

// ── Geometry (what you open in mesh tools / forge model viewer) ──────────────

export interface ProductionGeometryRef {
  id: string;
  /** Best for forge single-file edit when present */
  glbPath: string;
  /** Current live pirate lobby (gltf + bin + textures) */
  gltfPath: string;
  binPath?: string;
  texturesDir?: string;
  cdnBase: string;
  /** Approx size notes for agents */
  notes: string;
  /** Physics bake companion (optional convex / trimesh colliders) */
  colliderGlbPath?: string;
  navmeshPath?: string;
}

export const PIRATE_ISLANDS_GEOMETRY: ProductionGeometryRef = {
  id: 'pirate-islands-base',
  glbPath: `${CDN}/models/lobby/pirate-islands/scene.glb`,
  gltfPath: `${CDN}/models/lobby/pirate-islands/scene.gltf`,
  binPath: `${CDN}/models/lobby/pirate-islands/scene.bin`,
  texturesDir: `${CDN}/models/lobby/pirate-islands/textures/`,
  cdnBase: `${CDN}/models/lobby/pirate-islands/`,
  colliderGlbPath: `${CDN}/models/lobby/pirate-islands/colliders.glb`,
  navmeshPath: `${CDN}/models/lobby/pirate-islands/navmesh.json`,
  notes:
    'Chicken Gun / PolygonPirates lobby. Live: scene.gltf+bin (~127MB). ' +
    'Build scene.glb for Forge single-file mesh edit. Colliders/navmesh optional bake outputs.',
};

// ── Layers (editor + streaming order) ────────────────────────────────────────

export type ProductionMapLayerId =
  | MapChunkLayer
  | 'systems'
  | 'ai'
  | 'network'
  | 'missions'
  | 'items'
  | 'characters'
  | 'rts'
  | 'physics';

export interface ProductionMapLayer {
  id: ProductionMapLayerId;
  name: string;
  editable: boolean;
  agentAccessible: boolean;
  description: string;
}

export const PRODUCTION_MAP_LAYERS: ProductionMapLayer[] = [
  { id: 'ocean_floor', name: 'Ocean Floor', editable: true, agentAccessible: true, description: 'Seafloor height / mesh' },
  { id: 'ocean', name: 'Ocean Surface', editable: true, agentAccessible: true, description: 'Water plane, depth bands, foam' },
  { id: 'island_base', name: 'Island Base', editable: true, agentAccessible: true, description: 'Base GLTF/GLB landmass' },
  { id: 'beach', name: 'Beach / Sand', editable: true, agentAccessible: true, description: 'Sculptable shore' },
  { id: 'structure', name: 'Structures', editable: true, agentAccessible: true, description: 'Docks, buildings, towers' },
  { id: 'prop', name: 'Props', editable: true, agentAccessible: true, description: 'Chests, barrels, benches' },
  { id: 'nature', name: 'Nature', editable: true, agentAccessible: true, description: 'Trees, rocks, flowers, grass' },
  { id: 'camp', name: 'Camp', editable: true, agentAccessible: true, description: 'Tents, campfires' },
  { id: 'living', name: 'Living', editable: true, agentAccessible: true, description: 'NPCs, heroes, vendors, enemies' },
  { id: 'vehicle', name: 'Vehicles', editable: true, agentAccessible: true, description: 'Boats, mounts, siege' },
  { id: 'nav', name: 'Navigation', editable: true, agentAccessible: true, description: 'Waypoints, navmesh, spawns' },
  { id: 'physics', name: 'Physics Bake', editable: true, agentAccessible: true, description: 'Colliders, water volume, ground probes' },
  { id: 'rts', name: 'RTS Capture', editable: true, agentAccessible: true, description: 'Claim flags, control rings' },
  { id: 'ai', name: 'AI Brains', editable: true, agentAccessible: true, description: 'Sailing, combat, harvest, ship AI' },
  { id: 'network', name: 'Network', editable: true, agentAccessible: true, description: 'Colyseus/room, interest, sync' },
  { id: 'missions', name: 'Missions', editable: true, agentAccessible: true, description: 'Quest graphs, traveler contracts' },
  { id: 'items', name: 'Items / Weapons', editable: true, agentAccessible: true, description: 'Scriptable item & weapon refs' },
  { id: 'characters', name: 'Characters / Equipment', editable: true, agentAccessible: true, description: 'Account loadouts, race prefabs' },
  { id: 'systems', name: 'Systems Root', editable: true, agentAccessible: true, description: 'Package-level system enable flags' },
  { id: 'vfx', name: 'VFX / Weather', editable: true, agentAccessible: true, description: 'Weather, day/night, particles' },
];

// ── Scriptable entity (NPC, prop, system hook) ───────────────────────────────

export type ScriptableKind =
  | 'npc'
  | 'prefab'
  | 'boat'
  | 'mount'
  | 'siege'
  | 'capture_flag'
  | 'harvest_node'
  | 'spawn'
  | 'mission_giver'
  | 'bench'
  | 'waypoint'
  | 'ai_brain'
  | 'network_service'
  | 'weapon_ref'
  | 'item_ref';

export interface ScriptableEntity {
  id: string;
  kind: ScriptableKind;
  name: string;
  layer: ProductionMapLayerId;
  /** Asset path (CDN GLB / multipack) */
  asset?: string;
  /** Multipack node */
  nodeName?: string;
  /** World or local transform */
  transform?: {
    position: [number, number, number];
    rotationY?: number;
    scale?: number;
    /** If set, position is fraction of lobby size from center (capture style) */
    offsetFrac?: { ox: number; oz: number };
  };
  /** Free-form scriptable data — AI + forge + runtime */
  data: Record<string, unknown>;
  tags?: string[];
}

// ── Systems blocks ───────────────────────────────────────────────────────────

export interface AiBrainDef {
  id: string;
  name: string;
  domain: 'sailing' | 'combat' | 'ship' | 'harvest' | 'rts' | 'civilian' | 'captain';
  /** Behavior tree / state machine id */
  controller: string;
  params: Record<string, unknown>;
  agentTools?: string[];
}

export interface NetworkManagerInfo {
  mapRoom: string;
  interestRadiusM: number;
  tickHz: number;
  harvestAuthoritative: boolean;
  captureAuthoritative: boolean;
  characterSync: boolean;
  equipmentSync: boolean;
  boatSync: boolean;
  endpoints: {
    worldHttp: string;
    multiplayerWs?: string;
  };
}

export interface MissionDef {
  id: string;
  title: string;
  giverEntityId?: string;
  steps: Array<{ id: string; kind: string; detail: string }>;
  rewards?: Array<{ itemId: string; qty: number }>;
}

export interface CharacterPrefabRef {
  raceId: string;
  modelPath: string;
  scale: number;
  mountPath?: string;
  equipmentSlots: string[];
}

export interface ProductionMapPackage {
  schema: typeof PRODUCTION_MAP_SCHEMA;
  version: string;
  id: string;
  name: string;
  mapFamily: 'chicken_gun_pirate_lobby';
  lobbyMapId: typeof LOBBY_MAP_ID;
  islandId: typeof LOBBY_ISLAND_ID;
  forge: {
    /** Open in forge.grudge-studio.com */
    editorUrl: string;
    /** Prefer GLB for mesh palette; package JSON for full edit */
    preferredGeometry: 'glb' | 'gltf';
    studioProjectName: string;
    agentEditable: boolean;
  };
  geometry: ProductionGeometryRef;
  water: { waterLevel: number; oceanFloorLevel: number };
  /** Production game clock + tide (real wall time → sky/weather/tides) */
  gameClock?: {
    realMsPerGameDay: number;
    gameDaysPerWeek: number;
    tidesPerGameDay: number;
    tideBaseHeight: number;
    tideAmplitude: number;
  };
  layers: ProductionMapLayer[];
  compositionVersion: string;
  compositionMapId: string;
  /** Discrete islands on this map (minimap + faction) */
  islands: Array<{
    id: string;
    name: string;
    offset: { ox: number; oz: number };
    tags: string[];
    color?: string;
  }>;
  entities: ScriptableEntity[];
  aiBrains: AiBrainDef[];
  network: NetworkManagerInfo;
  missions: MissionDef[];
  characterPrefabs: CharacterPrefabRef[];
  itemsCatalogRefs: string[];
  weaponsCatalogRefs: string[];
  /** Production client UI / HUD layout (Forge + Island3D) */
  hud: ProductionHudSchema;
  systems: {
    rtsCaptureFlags: boolean;
    aiSailing: boolean;
    aiCombat: boolean;
    aiShips: boolean;
    autoHarvestUnits: boolean;
    characterAccountEquipment: boolean;
    factionIslands: boolean;
    boatsPhysics: boolean;
    dayNight: boolean;
  };
  runtime: {
    engine: string;
    entryUrls: string[];
    generatorModules: string[];
  };
  notes: string[];
}

/** HUD / UX panels toggled per map (gmap-driven) */
export interface ProductionHudPanel {
  id: string;
  label: string;
  /** React surface id */
  surface:
    | 'minimap'
    | 'mode_play'
    | 'grudge6_shell'
    | 'inventory'
    | 'spellbook'
    | 'capture'
    | 'ship_dock'
    | 'day_night'
    | 'quest'
    | 'chat'
    | 'build'
    | 'camp_command';
  enabled: boolean;
  /** Anchor for layout engines */
  anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'hidden';
  hotkey?: string;
  zIndex?: number;
}

export interface ProductionHudSchema {
  version: string;
  /** Master chrome — false = cinematic / photo mode */
  showChrome: boolean;
  defaultMode: 'social' | 'combat' | 'harvest' | 'build' | 'sail';
  panels: ProductionHudPanel[];
  /** Feature flags for UX experiments */
  flags: {
    minimapDefaultOpen: boolean;
    capturePrompt: boolean;
    dockBoardPrompt: boolean;
    factionIslandLabels: boolean;
    tideClockWidget: boolean;
    loadoutPreview: boolean;
  };
}

export function defaultProductionHud(): ProductionHudSchema {
  return {
    version: '1.0.0',
    showChrome: true,
    defaultMode: 'social',
    flags: {
      minimapDefaultOpen: true,
      capturePrompt: true,
      dockBoardPrompt: true,
      factionIslandLabels: true,
      tideClockWidget: true,
      loadoutPreview: true,
    },
    panels: [
      { id: 'hud_minimap', label: 'Mini Map', surface: 'minimap', enabled: true, anchor: 'top-right', hotkey: 'M', zIndex: 40 },
      { id: 'hud_mode_play', label: 'Mode Play', surface: 'mode_play', enabled: true, anchor: 'bottom-left', hotkey: 'Tab', zIndex: 35 },
      { id: 'hud_grudge6', label: 'Character Panel', surface: 'grudge6_shell', enabled: true, anchor: 'bottom-right', hotkey: 'C', zIndex: 36 },
      { id: 'hud_inventory', label: 'Inventory', surface: 'inventory', enabled: true, anchor: 'center', hotkey: 'I', zIndex: 50 },
      { id: 'hud_spellbook', label: 'Spellbook', surface: 'spellbook', enabled: true, anchor: 'center', hotkey: 'P', zIndex: 50 },
      { id: 'hud_capture', label: 'Capture Prompt', surface: 'capture', enabled: true, anchor: 'center', zIndex: 30 },
      { id: 'hud_ship', label: 'Ship Dock', surface: 'ship_dock', enabled: true, anchor: 'bottom-left', hotkey: 'E', zIndex: 30 },
      { id: 'hud_clock', label: 'Day / Tide', surface: 'day_night', enabled: true, anchor: 'top-left', zIndex: 25 },
      { id: 'hud_quest', label: 'Quest Tracker', surface: 'quest', enabled: true, anchor: 'top-left', zIndex: 28 },
      { id: 'hud_build', label: 'Build', surface: 'build', enabled: true, anchor: 'bottom-left', hotkey: 'B', zIndex: 34 },
      { id: 'hud_camp', label: 'Camp Command', surface: 'camp_command', enabled: true, anchor: 'bottom-right', zIndex: 33 },
      { id: 'hud_chat', label: 'Chat', surface: 'chat', enabled: false, anchor: 'bottom-left', hotkey: 'Enter', zIndex: 20 },
    ],
  };
}

// ── Build production package from live SSOTs ─────────────────────────────────

function captureFlagEntities(): ScriptableEntity[] {
  return [
    { id: 'cap_north-harbor', kind: 'capture_flag', name: 'North Harbor', layer: 'rts', transform: { position: [0, 0, 0], offsetFrac: { ox: 0, oz: -0.35 } }, data: { captureId: 'north-harbor', radiusM: 6, captureRate: 0.22 }, tags: ['rts', 'capture'] },
    { id: 'cap_south-dock', kind: 'capture_flag', name: 'South Dock', layer: 'rts', transform: { position: [0, 0, 0], offsetFrac: { ox: 0, oz: 0.35 } }, data: { captureId: 'south-dock', radiusM: 6, captureRate: 0.22 }, tags: ['rts', 'capture'] },
    { id: 'cap_east-battery', kind: 'capture_flag', name: 'East Battery', layer: 'rts', transform: { position: [0, 0, 0], offsetFrac: { ox: 0.35, oz: 0 } }, data: { captureId: 'east-battery', radiusM: 6, captureRate: 0.22 }, tags: ['rts', 'capture'] },
    { id: 'cap_west-camp', kind: 'capture_flag', name: 'West Camp', layer: 'rts', transform: { position: [0, 0, 0], offsetFrac: { ox: -0.35, oz: 0 } }, data: { captureId: 'west-camp', radiusM: 6, captureRate: 0.22 }, tags: ['rts', 'capture'] },
  ];
}

function factionIslandEntities(): ScriptableEntity[] {
  const out: ScriptableEntity[] = [];
  for (const isl of FACTION_LOBBY_ISLANDS) {
    out.push({
      id: isl.id,
      kind: 'prefab',
      name: isl.name,
      layer: 'island_base',
      transform: {
        position: [0, 0, 0],
        offsetFrac: { ox: isl.borderOffset.ox, oz: isl.borderOffset.oz },
      },
      data: {
        raceId: isl.raceId,
        template: FACTION_ISLAND_TEMPLATE,
        bannerColor: isl.bannerColor,
        starterDockIndex: isl.starterDockIndex,
        boatShipSize: isl.boatShipSize,
        propCount: isl.props.length,
        npcCount: isl.npcs.length,
        generator: 'FactionIslandGenerator',
      },
      tags: ['faction', isl.raceId, 'border'],
    });
    // Flatten key NPCs as scriptable for forge outliner
    for (const npc of isl.npcs) {
      if (
        npc.role === 'captain_mounted' ||
        npc.role === 'traveler' ||
        npc.role === 'blacksmith' ||
        npc.role === 'quest_traveler'
      ) {
        out.push({
          id: npc.id,
          kind: 'npc',
          name: npc.name,
          layer: 'living',
          asset: npc.modelPath,
          transform: {
            position: npc.transform.position,
            rotationY: npc.transform.rotationY,
            scale: npc.transform.scale,
            offsetFrac: { ox: isl.borderOffset.ox, oz: isl.borderOffset.oz },
          },
          data: {
            role: npc.role,
            raceId: npc.raceId,
            mountPath: npc.mountPath,
            unarmed: npc.unarmed,
            dialogueSetId: npc.dialogueSetId,
            networkServices: npc.networkServices,
            parentIsland: isl.id,
          },
          tags: [npc.role, npc.raceId, 'faction_npc'],
        });
      }
    }
    // Starter boat per faction island
    const boat = isl.props.find((p) => p.kind === 'boat');
    if (boat) {
      out.push({
        id: boat.id,
        kind: 'boat',
        name: boat.name,
        layer: 'vehicle',
        asset: boat.modelPath,
        transform: {
          position: boat.transform.position,
          rotationY: boat.transform.rotationY,
          offsetFrac: { ox: isl.borderOffset.ox, oz: isl.borderOffset.oz },
        },
        data: {
          interact: boat.interact,
          shipSize: isl.boatShipSize,
          respawnLinked: true,
          parentIsland: isl.id,
          physics: { hull: 'ship', boardable: true },
        },
        tags: ['boat', 'faction', isl.raceId],
      });
    }
  }
  return out;
}

function shipCatalogEntities(): ScriptableEntity[] {
  return SHIP_CATALOG.map((s) => ({
    id: `ship_catalog_${s.size}`,
    kind: 'boat' as const,
    name: s.label,
    layer: 'vehicle' as const,
    asset: s.glbModel.startsWith('http') ? s.glbModel : `${CDN}${s.glbModel}`,
    data: {
      size: s.size,
      shipClass: s.shipClass,
      prefabKey: s.prefabKey,
      physics: { boardable: true, helm: true },
    },
    tags: ['ship_catalog', s.size],
  }));
}

function characterPrefabs(): CharacterPrefabRef[] {
  return Object.entries(RACE_GRUDGE6).map(([raceId, cfg]) => ({
    raceId,
    modelPath: cfg.cdnPath.startsWith('http') ? cfg.cdnPath : `${CDN}${cfg.cdnPath}`,
    scale: cfg.scale,
    mountPath: RACE_VEHICLES[raceId as keyof typeof RACE_VEHICLES]?.mount?.cdnUrl,
    equipmentSlots: [
      'head',
      'chest',
      'legs',
      'feet',
      'mainhand',
      'offhand',
      'back',
      'ring1',
      'ring2',
      'amulet',
    ],
  }));
}

function aiBrains(): AiBrainDef[] {
  return [
    {
      id: 'brain_ai_sailing',
      name: 'AI Sailing',
      domain: 'sailing',
      controller: 'LobbyShipHelmAI',
      params: { windInfluence: 0.3, dockApproachM: 12, avoidRadiusM: 8 },
      agentTools: ['set_course', 'dock', 'board', 'disembark'],
    },
    {
      id: 'brain_ai_ships',
      name: 'AI Ships',
      domain: 'ship',
      controller: 'FactionPatrolShipAI',
      params: { patrolRadiusM: 80, engageRangeM: 40 },
      agentTools: ['spawn_ship', 'set_faction', 'patrol_route'],
    },
    {
      id: 'brain_ai_combat',
      name: 'AI Combat',
      domain: 'combat',
      controller: 'NpcCampCombatAI',
      params: { aggroRadiusM: 18, leashM: 35 },
      agentTools: ['set_target', 'retreat', 'call_reinforcements'],
    },
    {
      id: 'brain_auto_harvest',
      name: 'Units Auto Harvest',
      domain: 'harvest',
      controller: 'CampUnitHarvestAI',
      params: { searchRadiusM: 40, depositAt: 'camp_storage' },
      agentTools: ['assign_node', 'set_resource', 'return_to_camp'],
    },
    {
      id: 'brain_rts_capture',
      name: 'RTS Claim Flags',
      domain: 'rts',
      controller: 'LobbyCaptureAI',
      params: { reclaimRate: 0.08, holdRadiusM: 6 },
      agentTools: ['claim_flag', 'set_owner', 'spawn_contest'],
    },
    {
      id: 'brain_captain_mounted',
      name: 'Faction Captain',
      domain: 'captain',
      controller: 'MountedCaptainAI',
      params: { greetRadiusM: 10 },
      agentTools: ['dialogue', 'assign_quest', 'open_faction_shop'],
    },
    {
      id: 'brain_civilian',
      name: 'Unarmed Civilian Ambient',
      domain: 'civilian',
      controller: 'AmbientWanderAI',
      params: { wanderRadiusM: 8 },
      agentTools: ['wander', 'idle', 'flee'],
    },
  ];
}

function missions(): MissionDef[] {
  return [
    {
      id: 'mission_dock_starter',
      title: 'Welcome Aboard',
      giverEntityId: 'quest_traveler_boat',
      steps: [
        { id: 'talk', kind: 'dialogue', detail: 'Speak with Dock Quest Traveler' },
        { id: 'board', kind: 'board', detail: 'Board the starter boat' },
        { id: 'sail', kind: 'sail', detail: 'Sail toward Free Port hub' },
      ],
      rewards: [{ itemId: 'item_copper_coin', qty: 25 }],
    },
    {
      id: 'mission_claim_south',
      title: 'Claim South Dock',
      steps: [
        { id: 'reach', kind: 'goto', detail: 'Reach South Dock capture ring' },
        { id: 'hold', kind: 'capture', detail: 'Hold E to claim the flag' },
      ],
    },
    {
      id: 'mission_faction_blacksmith',
      title: 'Forge of Your Race',
      steps: [
        { id: 'visit', kind: 'goto', detail: 'Visit your race faction island blacksmith' },
        { id: 'craft', kind: 'craft', detail: 'Use a profession bench' },
      ],
    },
  ];
}

/**
 * Build the canonical production package for grudge-open-world.
 * Call from scripts or import as FACTION-ready constant.
 */
export function buildGrudgeOpenWorldPackage(): ProductionMapPackage {
  const entities: ScriptableEntity[] = [
    {
      id: 'geometry_base',
      kind: 'prefab',
      name: 'Pirate Islands Base GLTF',
      layer: 'island_base',
      asset: PIRATE_ISLANDS_GEOMETRY.gltfPath,
      data: {
        glbPreferred: PIRATE_ISLANDS_GEOMETRY.glbPath,
        collider: PIRATE_ISLANDS_GEOMETRY.colliderGlbPath,
        classifyMeshes: true,
      },
      tags: ['geometry', 'base'],
    },
    {
      id: 'dock_glb',
      kind: 'prefab',
      name: 'Village Dock Prefab',
      layer: 'structure',
      asset: `${CDN}${DOCK_GLB}`,
      data: { boardable: true },
      tags: ['dock'],
    },
    {
      id: 'survival_kit',
      kind: 'prefab',
      name: 'Survival Kit Multipack',
      layer: 'prop',
      asset: BUILD_PACK_PATHS.survivalKit,
      data: { nodes: SURVIVAL_KIT_NODES },
      tags: ['multipack', 'camp', 'bench'],
    },
    ...captureFlagEntities(),
    ...factionIslandEntities(),
    ...shipCatalogEntities(),
    {
      id: 'net_traveler_services',
      kind: 'network_service',
      name: 'Network Traveler Services',
      layer: 'network',
      data: {
        services: ['auction', 'leaderboards', 'teleport', 'vendor'],
        presentOn: FACTION_LOBBY_ISLANDS.map((i) => i.id),
      },
      tags: ['network', 'traveler'],
    },
    {
      id: 'phys_water_volume',
      kind: 'prefab',
      name: 'Water Volume Physics',
      layer: 'physics',
      data: {
        waterLevel: 0,
        oceanFloor: -24,
        swim: true,
        boatBuoyancy: true,
      },
      tags: ['physics', 'water'],
    },
  ];

  // AI brain entities for outliner
  for (const b of aiBrains()) {
    entities.push({
      id: b.id,
      kind: 'ai_brain',
      name: b.name,
      layer: 'ai',
      data: { ...b },
      tags: ['ai', b.domain],
    });
  }

  return {
    schema: PRODUCTION_MAP_SCHEMA,
    version: PRODUCTION_MAP_PACKAGE_VERSION,
    id: PRODUCTION_MAP_ID,
    name: "Racalvin's Free Port — Grudge Open World (Production)",
    mapFamily: 'chicken_gun_pirate_lobby',
    lobbyMapId: LOBBY_MAP_ID,
    islandId: LOBBY_ISLAND_ID,
    forge: {
      editorUrl: 'https://forge.grudge-studio.com/',
      preferredGeometry: 'glb',
      studioProjectName: 'Grudge_Open_World_Production',
      agentEditable: true,
    },
    geometry: PIRATE_ISLANDS_GEOMETRY,
    water: {
      // Tide mean from gameClock (gentle amp); composition floor stays -24
      waterLevel: TIDE_CONFIG.baseHeight,
      oceanFloorLevel: GRUDGE_OPEN_WORLD_COMPOSITION.water.oceanFloorLevel,
    },
    gameClock: {
      realMsPerGameDay: GAME_CLOCK.realMsPerGameDay,
      gameDaysPerWeek: GAME_CLOCK.gameDaysPerWeek,
      tidesPerGameDay: TIDE_CONFIG.cyclesPerGameDay,
      tideBaseHeight: TIDE_CONFIG.baseHeight,
      tideAmplitude: TIDE_CONFIG.amplitude,
    },
    layers: PRODUCTION_MAP_LAYERS,
    compositionVersion: MAP_SCENE_COMPOSITION_VERSION,
    compositionMapId: GRUDGE_OPEN_WORLD_COMPOSITION.mapId,
    islands: LOBBY_ISLANDS.map((i) => ({
      id: i.id,
      name: i.name,
      offset: i.offset,
      tags: i.tags,
      color: i.color,
    })),
    entities,
    aiBrains: aiBrains(),
    network: {
      mapRoom: 'lobby_pirate_open_world',
      interestRadiusM: 120,
      tickHz: 10,
      harvestAuthoritative: true,
      captureAuthoritative: true,
      characterSync: true,
      equipmentSync: true,
      boatSync: true,
      endpoints: {
        worldHttp: 'https://world.grudge-studio.com',
        multiplayerWs: typeof FLEET_URLS.world === 'string' ? FLEET_URLS.world : FLEET_URLS.colyseus,
      },
    },
    missions: missions(),
    characterPrefabs: characterPrefabs(),
    itemsCatalogRefs: [
      `${CDN}/api/v1/items.json`,
      'shared/definitions/items.ts',
      'shared/definitions/tier0Items.ts',
    ],
    weaponsCatalogRefs: [
      `${CDN}/api/v1/weapons.json`,
      'shared/definitions/weaponArsenal.ts',
    ],
    hud: defaultProductionHud(),
    systems: {
      rtsCaptureFlags: true,
      aiSailing: true,
      aiCombat: true,
      aiShips: true,
      autoHarvestUnits: true,
      characterAccountEquipment: true,
      factionIslands: true,
      boatsPhysics: true,
      dayNight: true,
    },
    runtime: {
      engine: 'Island3DEngine mode=lobby',
      entryUrls: [
        '/island-3d?mode=lobby&map=pirate-islands&island=grudge-open-world',
        '/island-3d?mode=zone&sector=lobby',
        'https://forge.grudge-studio.com/',
      ],
      generatorModules: [
        'LobbyIslandLoader',
        'FactionIslandGenerator',
        'LobbyGameplay',
        'LobbyPlayZone',
        'MapCompositionLoader',
        'BuildingSystem',
        'NpcCampSystem',
        'CampUnitSystem',
        'MultiplayerSync',
      ],
    },
    notes: [
      'Geometry: pirate-islands scene.gltf is LIVE on assets CDN; build scene.glb for single-file Forge mesh edit.',
      'Full production map for Forge/AI is THIS .gmap package — not a monome GLB.',
      'Faction islands, capture flags, travelers, boats, AI brains are scriptable entities.',
      'Character account + equipment live in API/DB; prefabs listed for race models + mount paths.',
      'Import to Forge via .studio.json bridge (exportStudioProjectFromGmap).',
    ],
  };
}

/** Cached singleton */
export const GRUDGE_OPEN_WORLD_GMAP: ProductionMapPackage = buildGrudgeOpenWorldPackage();

/**
 * Convert production package → Forge MapProject-compatible JSON (schema 2+ extras).
 * Forge current schema is 1; extra fields preserved on load.
 */
export function exportStudioProjectFromGmap(pkg: ProductionMapPackage = GRUDGE_OPEN_WORLD_GMAP): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    schema: 1,
    id: pkg.id,
    name: pkg.forge.studioProjectName,
    createdAt: now,
    updatedAt: now,
    seed: 20260624,
    // Forge terrain placeholder — real land is base GLB overlay
    terrain: {
      resolution: 64,
      size: 512,
      heights: new Array(64 * 64).fill(0),
      biome: new Array(64 * 64).fill(0),
    },
    entities: pkg.entities.map((e) => ({
      id: e.id,
      kind: mapKindToStudio(e.kind),
      name: e.name,
      asset: e.asset,
      position: e.transform?.position ?? [0, 0, 0],
      rotation: [0, e.transform?.rotationY ?? 0, 0],
      scale: [e.transform?.scale ?? 1, e.transform?.scale ?? 1, e.transform?.scale ?? 1],
      data: {
        ...e.data,
        layer: e.layer,
        scriptableKind: e.kind,
        offsetFrac: e.transform?.offsetFrac,
        nodeName: e.nodeName,
        tags: e.tags,
        gmapId: pkg.id,
      },
    })),
    rules: {
      startingFunds: 10000,
      fogOfWar: true,
      waveCount: 8,
      victoryCondition: 'capture',
    },
    // Production extensions (forge preserves unknown fields)
    grudgeProduction: {
      packageVersion: pkg.version,
      packageSchema: pkg.schema,
      geometry: pkg.geometry,
      layers: pkg.layers,
      aiBrains: pkg.aiBrains,
      network: pkg.network,
      missions: pkg.missions,
      characterPrefabs: pkg.characterPrefabs,
      systems: pkg.systems,
      islands: pkg.islands,
      water: pkg.water,
      gameClock: pkg.gameClock,
      hud: pkg.hud,
      itemsCatalogRefs: pkg.itemsCatalogRefs,
      weaponsCatalogRefs: pkg.weaponsCatalogRefs,
      runtime: pkg.runtime,
    },
  };
}

function mapKindToStudio(k: ScriptableKind): string {
  switch (k) {
    case 'boat':
      return 'dock'; // closest forge kind; data.scriptableKind keeps truth
    case 'npc':
    case 'mission_giver':
      return 'unit';
    case 'mount':
    case 'siege':
      return 'unit';
    case 'capture_flag':
      return 'spell_marker';
    case 'harvest_node':
      return 'resource_node';
    case 'spawn':
    case 'waypoint':
      return 'spawn_point';
    case 'bench':
    case 'prefab':
      return 'building';
    default:
      return 'prop';
  }
}

/** Agent skill summary — where is the asset + how to edit */
export function productionMapAgentBrief(): string {
  const g = PIRATE_ISLANDS_GEOMETRY;
  return [
    `# Grudge Open World — Production Map Asset`,
    ``,
    `## Geometry (mesh)`,
    `- LIVE GLTF: ${g.gltfPath}`,
    `- Preferred GLB (build if missing): ${g.glbPath}`,
    `- Local: public/models/lobby/pirate-islands/`,
    ``,
    `## Full production package (Forge + AI)`,
    `- SSOT: shared/definitions/productionMapPackage.ts`,
    `- Built JSON: public/maps/grudge-open-world/grudge-open-world.gmap.json`,
    `- Forge import: grudge-open-world.studio.json (via exportStudioProjectFromGmap)`,
    `- Editor: ${GRUDGE_OPEN_WORLD_GMAP.forge.editorUrl}`,
    ``,
    `## Systems baked into package`,
    Object.entries(GRUDGE_OPEN_WORLD_GMAP.systems)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n'),
    ``,
    `## Layers: ${PRODUCTION_MAP_LAYERS.map((l) => l.id).join(', ')}`,
  ].join('\n');
}

/**
 * Haven Shore Foundation — Fruzer (Chicken Gun islands) as the PVE trade village
 * for Warlords era sector `haven_shore`.
 *
 * SSOT map family: warlords_era_open_world (NOT home-block 3×3, NOT pirate lobby).
 * Entry: /play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port
 *
 * Rules:
 *  - Water comes ONLY from zone ocean (WaterMaterial / createOceanMesh).
 *  - Fruzer embedded Water / Cube water volumes are stripped at load.
 *  - Island props that look harvestable are replaced/tagged by DB harvest UUIDs.
 *  - Village hosts 4 vendors + friendly mission givers + ambient NPCs/animals.
 *  - B_O_A_T_S pirate vessels are enemy / raid threats off the safe harbor.
 */

import { HARVEST_REGEN_MS } from './biomeEcosystemCatalog';
import type { HarvestProfession } from './zoneServerNodes';

// ── Identity ─────────────────────────────────────────────────────────────────

export const HAVEN_SHORE_SECTOR_ID = 'haven_shore' as const;
export const HAVEN_PORT_CITY_ID = 'haven_port' as const;
export const HAVEN_SHORE_FOUNDATION_VERSION = '1.0.0';

/** Local public path (also upload to R2 under same key). */
export const HAVEN_SHORE_FRUZER_GLB =
  '/models/warlords/haven_shore/fruzer_islands.glb';

/** CDN mirror key (assets.grudge-studio.com). */
export const HAVEN_SHORE_FRUZER_CDN_KEY =
  'models/warlords/haven_shore/fruzer_islands.glb';

// ── GLB node policy ──────────────────────────────────────────────────────────

/** Root groups under Map that we keep (visual foundation). */
export const FRUZER_KEEP_GROUPS = [
  'I_S_L_A_N_D_S',
  'B_U_I_L_D_I_N_G_S',
  'P_R_O_P_S',
  'B_O_A_T_S',
  'N_A_T_U_R_E',
] as const;

/**
 * Groups / name patterns to strip so zone ocean is the only water surface.
 * Water embeds in this pack are cube volumes — never use them as gameplay ocean.
 */
export const FRUZER_STRIP_NAME_PATTERNS: RegExp[] = [
  /^Water$/i,
  /^Cube$/i,
  /^Cube_1$/i,
  /Water/i,
  /Collider/i,
  /Trigger/i,
  /Fill_Light/i,
  /Tralalero/i, // meme props — not lore-accurate Haven Port
  /shark_mem/i,
  /Paskhalka/i,
];

/** Nature subtrees that should become DB harvestables (not static decor only). */
export const FRUZER_HARVESTABLE_NATURE_PATTERNS: RegExp[] = [
  /^palm/i,
  /^tree_/i,
  /^tree/i,
  /^rock/i,
  /^stone/i,
  /^shrub_flowers/i,
  /^grass/i,
  /^GRASS$/i,
];

// ── Island texture upgrades ──────────────────────────────────────────────────

/**
 * Better tropical island materials — map Fruzer color-suffix meshes
 * onto Warlords ground / beach PBR palette (ecosystem beach / tropical).
 */
export const HAVEN_ISLAND_TEXTURE_MAP = {
  /** Sand / light brown island tops */
  sand: {
    match: /BROWN_LIGHT|BROWN_LIGHTEST|14_BROWN/i,
    color: 0xe8d4a8,
    roughness: 0.92,
    metalness: 0.02,
    groundPbr: 'ground_1',
  },
  /** Mid dirt / rock base */
  dirt: {
    match: /BROWN_MEDIUM|BROWN_DARK|12_BROWN|11_BROWN|10_BROWN/i,
    color: 0x8b6914,
    roughness: 0.88,
    metalness: 0.04,
    groundPbr: 'ground_1',
  },
  /** Grass / canopy greens */
  grass: {
    match: /GREEN|36_GREEN|37_GREEN|38_GREEN/i,
    color: 0x2e8b57,
    roughness: 0.85,
    metalness: 0.0,
    groundPbr: 'ground_1',
  },
  /** Grey rock / cliffs */
  rock: {
    match: /GREY|18_GREY|19_GREY|20_GREY|17_GREY/i,
    color: 0x8a8680,
    roughness: 0.9,
    metalness: 0.08,
    groundPbr: 'ground_4',
  },
  /** Black / darkest (wrecks, accents) */
  dark: {
    match: /BLACK|DARKEST|57_BLACK/i,
    color: 0x2a2420,
    roughness: 0.75,
    metalness: 0.15,
    groundPbr: 'ground_4',
  },
} as const;

// ── Placement types ──────────────────────────────────────────────────────────

export type HavenHarvestKind =
  | 'woodcutting'
  | 'mining'
  | 'herbalism'
  | 'fishing'
  | 'skinning';

export interface HavenHarvestPlacement {
  /** Stable DB / ObjectStore harvest node UUID (deterministic, not random). */
  uuid: string;
  /** Display name */
  name: string;
  profession: HavenHarvestKind;
  /** Master resource item id (ObjectStore / items DB) */
  resourceId: string;
  tier: number;
  /** Local offset from village origin [x, y, z] meters (zone space after foundation place) */
  position: [number, number, number];
  /** Yaw radians */
  rotation: number;
  yield: [number, number];
  harvestTimeSec: number;
  /** Respawn cooldown seconds (defaults from HARVEST_REGEN_MS) */
  respawnSec: number;
  /** Parent logical island key */
  islandKey: 'village' | 'outer_east' | 'outer_west' | 'sandbar' | 'cave' | 'ocean';
  /** Optional Fruzer node name hint for visual binding */
  fruzerNodeHint?: string;
}

export type HavenNpcRole =
  | 'vendor_general'
  | 'vendor_weapons'
  | 'vendor_provisions'
  | 'vendor_shipwright'
  | 'mission_giver'
  | 'guard'
  | 'civilian'
  | 'dockmaster';

export interface HavenNpcPlacement {
  uuid: string;
  name: string;
  role: HavenNpcRole;
  /** Character model id from modelManifest */
  modelId: string;
  position: [number, number, number];
  facing: number;
  /** Shop inventory key or mission board id */
  serviceId?: string;
  dialogueSetId?: string;
  /** Friendly only — Haven Port is isSafeZone */
  hostile: false;
  wanderRadius?: number;
}

export interface HavenAnimalPlacement {
  uuid: string;
  /** Biome ecosystem animal id */
  species: 'deer' | 'rabbit' | 'crab' | 'boar' | 'buffalo';
  position: [number, number, number];
  wanderRadius: number;
  /** Huntable outside town plaza (safe zone = no auto-aggro in plaza) */
  attackable: boolean;
  respawnSec: number;
}

export type HavenVesselRole = 'enemy_raid' | 'wreck' | 'friendly_dock' | 'colonial_patrol';

export interface HavenVesselPlacement {
  uuid: string;
  name: string;
  role: HavenVesselRole;
  /** Fruzer B_O_A_T_S child root name */
  fruzerNode: string;
  position: [number, number, number];
  rotation: number;
  /** Hostile if enemy_raid */
  hostile: boolean;
  level: number;
  aggroRadius: number;
}

export interface HavenIslandSlot {
  key: HavenHarvestPlacement['islandKey'];
  /** Fruzer island root name under I_S_L_A_N_D_S */
  fruzerNode: string;
  size: 'atoll' | 'small' | 'medium' | 'large';
  /** Offset from foundation origin */
  position: [number, number, number];
  hasDock: boolean;
  hasVillage: boolean;
  label: string;
}

// ── Stable UUID helpers (deterministic database keys) ────────────────────────

/** Fixed foundation batch — never regenerate random counters for these. */
const UUID_BATCH = 'haven-shore-v1';

function stableUuid(kind: string, slug: string, index: number): string {
  const n = String(index).padStart(3, '0');
  // Format compatible with game DB row keys + ObjectStore ids
  return `uuid:${UUID_BATCH}:${kind}:${slug}:${n}`;
}

const RESPAWN_DEFAULT = Math.floor(HARVEST_REGEN_MS / 1000); // 4h → seconds
const RESPAWN_FAST = 15 * 60; // herbs / fish near town
const RESPAWN_MED = 45 * 60;
const RESPAWN_ANIMAL = 20 * 60;

// ── Island layout (authored foundation anchors) ──────────────────────────────

export const HAVEN_ISLAND_SLOTS: HavenIslandSlot[] = [
  {
    key: 'village',
    fruzerNode: 'island_base',
    size: 'large',
    position: [0, 0, 0],
    hasDock: true,
    hasVillage: true,
    label: 'Haven Port (main)',
  },
  {
    key: 'outer_east',
    fruzerNode: 'island_small',
    size: 'medium',
    position: [180, 0, 40],
    hasDock: true,
    hasVillage: false,
    label: 'East Palm Isle',
  },
  {
    key: 'outer_west',
    fruzerNode: 'island_round_tiny',
    size: 'small',
    position: [-160, 0, 60],
    hasDock: false,
    hasVillage: false,
    label: 'West Lookout',
  },
  {
    key: 'sandbar',
    fruzerNode: 'island_sand_tiny',
    size: 'atoll',
    position: [40, 0, -140],
    hasDock: false,
    hasVillage: false,
    label: 'Southern Sandbar',
  },
  {
    key: 'cave',
    fruzerNode: 'island_cave_large__1_',
    size: 'medium',
    position: [-90, 0, -170],
    hasDock: false,
    hasVillage: false,
    label: "Pirate's Crypt Approach",
  },
];

// ── Harvestables (DB UUIDs + location + respawn) ─────────────────────────────

export const HAVEN_HARVEST_PLACEMENTS: HavenHarvestPlacement[] = [
  // Village green — palms / wood
  {
    uuid: stableUuid('harvest', 'palm_wood', 1),
    name: 'Harbor Palm',
    profession: 'woodcutting',
    resourceId: 'hardwood',
    tier: 1,
    position: [22, 0, 18],
    rotation: 0.4,
    yield: [1, 3],
    harvestTimeSec: 4,
    respawnSec: RESPAWN_MED,
    islandKey: 'village',
    fruzerNodeHint: 'palm_big',
  },
  {
    uuid: stableUuid('harvest', 'palm_wood', 2),
    name: 'Dockside Palm',
    profession: 'woodcutting',
    resourceId: 'palm_frond',
    tier: 1,
    position: [-18, 0, 24],
    rotation: 1.2,
    yield: [1, 2],
    harvestTimeSec: 3,
    respawnSec: RESPAWN_MED,
    islandKey: 'village',
    fruzerNodeHint: 'palm_high',
  },
  {
    uuid: stableUuid('harvest', 'palm_wood', 3),
    name: 'Market Palm',
    profession: 'woodcutting',
    resourceId: 'hardwood',
    tier: 1,
    position: [8, 0, -28],
    rotation: 2.1,
    yield: [1, 3],
    harvestTimeSec: 4,
    respawnSec: RESPAWN_MED,
    islandKey: 'village',
    fruzerNodeHint: 'palm',
  },
  // Herbs near town
  {
    uuid: stableUuid('harvest', 'herb', 1),
    name: 'Shore Herbs',
    profession: 'herbalism',
    resourceId: 'herbs',
    tier: 1,
    position: [30, 0, -12],
    rotation: 0,
    yield: [1, 4],
    harvestTimeSec: 2,
    respawnSec: RESPAWN_FAST,
    islandKey: 'village',
    fruzerNodeHint: 'shrub_flowers__1_',
  },
  {
    uuid: stableUuid('harvest', 'herb', 2),
    name: 'Path Flowers',
    profession: 'herbalism',
    resourceId: 'herbs',
    tier: 1,
    position: [-26, 0, -8],
    rotation: 0.5,
    yield: [1, 3],
    harvestTimeSec: 2,
    respawnSec: RESPAWN_FAST,
    islandKey: 'village',
    fruzerNodeHint: 'shrub_flowers__2_',
  },
  // Rocks / mining on edges
  {
    uuid: stableUuid('harvest', 'stone', 1),
    name: 'Harbor Stone',
    profession: 'mining',
    resourceId: 'shells',
    tier: 1,
    position: [48, 0, 6],
    rotation: 0.2,
    yield: [1, 2],
    harvestTimeSec: 5,
    respawnSec: RESPAWN_DEFAULT,
    islandKey: 'village',
    fruzerNodeHint: 'rock03__1_',
  },
  {
    uuid: stableUuid('harvest', 'stone', 2),
    name: 'Cliff Rock',
    profession: 'mining',
    resourceId: 'shells',
    tier: 1,
    position: [-42, 0, 14],
    rotation: 1.0,
    yield: [1, 3],
    harvestTimeSec: 5,
    respawnSec: RESPAWN_DEFAULT,
    islandKey: 'village',
    fruzerNodeHint: 'rock_pillar',
  },
  // Outer east palms
  {
    uuid: stableUuid('harvest', 'palm_wood', 4),
    name: 'East Palm Grove A',
    profession: 'woodcutting',
    resourceId: 'hardwood',
    tier: 1,
    position: [170, 0, 30],
    rotation: 0.3,
    yield: [2, 4],
    harvestTimeSec: 4,
    respawnSec: RESPAWN_MED,
    islandKey: 'outer_east',
    fruzerNodeHint: 'palm_round',
  },
  {
    uuid: stableUuid('harvest', 'palm_wood', 5),
    name: 'East Palm Grove B',
    profession: 'woodcutting',
    resourceId: 'coconut',
    tier: 1,
    position: [195, 0, 55],
    rotation: 1.8,
    yield: [1, 3],
    harvestTimeSec: 3,
    respawnSec: RESPAWN_MED,
    islandKey: 'outer_east',
    fruzerNodeHint: 'palm_small',
  },
  {
    uuid: stableUuid('harvest', 'herb', 3),
    name: 'East Shore Herbs',
    profession: 'herbalism',
    resourceId: 'herbs',
    tier: 1,
    position: [175, 0, 70],
    rotation: 0,
    yield: [1, 4],
    harvestTimeSec: 2,
    respawnSec: RESPAWN_FAST,
    islandKey: 'outer_east',
  },
  // Fishing rings (ocean — parent island null at runtime)
  {
    uuid: stableUuid('harvest', 'fish', 1),
    name: 'Harbor Fishing Spot',
    profession: 'fishing',
    resourceId: 'fish',
    tier: 1,
    position: [0, 0, 70],
    rotation: 0,
    yield: [1, 3],
    harvestTimeSec: 5,
    respawnSec: RESPAWN_FAST,
    islandKey: 'ocean',
  },
  {
    uuid: stableUuid('harvest', 'fish', 2),
    name: 'East Channel Fish',
    profession: 'fishing',
    resourceId: 'fish',
    tier: 1,
    position: [120, 0, 20],
    rotation: 0,
    yield: [1, 4],
    harvestTimeSec: 5,
    respawnSec: RESPAWN_FAST,
    islandKey: 'ocean',
  },
  {
    uuid: stableUuid('harvest', 'fish', 3),
    name: 'West Shoal Fish',
    profession: 'fishing',
    resourceId: 'fish',
    tier: 1,
    position: [-100, 0, 30],
    rotation: 0,
    yield: [1, 3],
    harvestTimeSec: 5,
    respawnSec: RESPAWN_FAST,
    islandKey: 'ocean',
  },
  // Cave approach — higher tier scrap/skin flavor
  {
    uuid: stableUuid('harvest', 'skin', 1),
    name: 'Beach Crab Beds',
    profession: 'skinning',
    resourceId: 'shells',
    tier: 1,
    position: [50, 0, -130],
    rotation: 0,
    yield: [1, 2],
    harvestTimeSec: 4,
    respawnSec: RESPAWN_ANIMAL,
    islandKey: 'sandbar',
  },
  {
    uuid: stableUuid('harvest', 'stone', 3),
    name: 'Crypt Mouth Stone',
    profession: 'mining',
    resourceId: 'shells',
    tier: 2,
    position: [-85, 0, -160],
    rotation: 0.7,
    yield: [1, 3],
    harvestTimeSec: 6,
    respawnSec: RESPAWN_DEFAULT,
    islandKey: 'cave',
    fruzerNodeHint: 'rock_sharp',
  },
];

// ── Four vendors + mission givers + town NPCs ────────────────────────────────

export const HAVEN_VENDORS: HavenNpcPlacement[] = [
  {
    uuid: stableUuid('npc', 'vendor_general', 1),
    name: 'Mira Saltworth',
    role: 'vendor_general',
    modelId: 'human-civilian-f',
    position: [6, 0, 4],
    facing: Math.PI,
    serviceId: 'shop_haven_general',
    dialogueSetId: 'haven_vendor_general',
    hostile: false,
  },
  {
    uuid: stableUuid('npc', 'vendor_weapons', 1),
    name: 'Brann Ironhook',
    role: 'vendor_weapons',
    modelId: 'human-blacksmith',
    position: [-10, 0, 6],
    facing: Math.PI * 0.5,
    serviceId: 'shop_haven_weapons',
    dialogueSetId: 'haven_vendor_weapons',
    hostile: false,
  },
  {
    uuid: stableUuid('npc', 'vendor_provisions', 1),
    name: 'Tessa Greenbarrel',
    role: 'vendor_provisions',
    modelId: 'human-civilian-f',
    position: [12, 0, -6],
    facing: -0.4,
    serviceId: 'shop_haven_provisions',
    dialogueSetId: 'haven_vendor_provisions',
    hostile: false,
  },
  {
    uuid: stableUuid('npc', 'vendor_shipwright', 1),
    name: 'Captain Orin Keel',
    role: 'vendor_shipwright',
    modelId: 'human-dockmaster',
    position: [4, 0, 32],
    facing: Math.PI,
    serviceId: 'shop_haven_shipwright',
    dialogueSetId: 'haven_vendor_shipwright',
    hostile: false,
  },
];

export const HAVEN_MISSION_GIVERS: HavenNpcPlacement[] = [
  {
    uuid: stableUuid('npc', 'mission', 1),
    name: 'Harbor Master Elira',
    role: 'mission_giver',
    modelId: 'human-quest',
    position: [0, 0, 16],
    facing: Math.PI,
    serviceId: 'missions_haven_starter',
    dialogueSetId: 'haven_mission_harbor',
    hostile: false,
  },
  {
    uuid: stableUuid('npc', 'mission', 2),
    name: 'Scout Rowan',
    role: 'mission_giver',
    modelId: 'human-scout',
    position: [-20, 0, -4],
    facing: 0.8,
    serviceId: 'missions_haven_patrol',
    dialogueSetId: 'haven_mission_scout',
    hostile: false,
  },
  {
    uuid: stableUuid('npc', 'mission', 3),
    name: 'Sister Vale',
    role: 'mission_giver',
    modelId: 'human-priest',
    position: [18, 0, 10],
    facing: -1.2,
    serviceId: 'missions_haven_side',
    dialogueSetId: 'haven_mission_sister',
    hostile: false,
  },
];

export const HAVEN_TOWN_NPCS: HavenNpcPlacement[] = [
  {
    uuid: stableUuid('npc', 'dockmaster', 1),
    name: 'Dockhand Pike',
    role: 'dockmaster',
    modelId: 'human-civilian-m',
    position: [10, 0, 36],
    facing: Math.PI,
    hostile: false,
    wanderRadius: 6,
  },
  {
    uuid: stableUuid('npc', 'guard', 1),
    name: 'Guard Sera',
    role: 'guard',
    modelId: 'human-guard',
    position: [-14, 0, 20],
    facing: 0,
    hostile: false,
    wanderRadius: 10,
  },
  {
    uuid: stableUuid('npc', 'guard', 2),
    name: 'Guard Tomas',
    role: 'guard',
    modelId: 'human-guard',
    position: [20, 0, 18],
    facing: Math.PI * 0.25,
    hostile: false,
    wanderRadius: 10,
  },
  {
    uuid: stableUuid('npc', 'civilian', 1),
    name: 'Fisher Nan',
    role: 'civilian',
    modelId: 'human-civilian-f',
    position: [-6, 0, 28],
    facing: 0.3,
    hostile: false,
    wanderRadius: 12,
  },
  {
    uuid: stableUuid('npc', 'civilian', 2),
    name: 'Cart Boy Juno',
    role: 'civilian',
    modelId: 'human-civilian-m',
    position: [14, 0, 2],
    facing: -0.6,
    hostile: false,
    wanderRadius: 14,
  },
  {
    uuid: stableUuid('npc', 'civilian', 3),
    name: 'Miller Ade',
    role: 'civilian',
    modelId: 'human-civilian-m',
    position: [-8, 0, -16],
    facing: 1.1,
    hostile: false,
    wanderRadius: 10,
  },
];

// ── Animals through / around town ────────────────────────────────────────────

export const HAVEN_ANIMALS: HavenAnimalPlacement[] = [
  {
    uuid: stableUuid('animal', 'rabbit', 1),
    species: 'rabbit',
    position: [28, 0, -20],
    wanderRadius: 12,
    attackable: true,
    respawnSec: RESPAWN_ANIMAL,
  },
  {
    uuid: stableUuid('animal', 'rabbit', 2),
    species: 'rabbit',
    position: [-30, 0, -18],
    wanderRadius: 10,
    attackable: true,
    respawnSec: RESPAWN_ANIMAL,
  },
  {
    uuid: stableUuid('animal', 'crab', 1),
    species: 'crab',
    position: [36, 0, 40],
    wanderRadius: 8,
    attackable: true,
    respawnSec: RESPAWN_ANIMAL,
  },
  {
    uuid: stableUuid('animal', 'crab', 2),
    species: 'crab',
    position: [-24, 0, 44],
    wanderRadius: 8,
    attackable: true,
    respawnSec: RESPAWN_ANIMAL,
  },
  {
    uuid: stableUuid('animal', 'deer', 1),
    species: 'deer',
    position: [160, 0, 50],
    wanderRadius: 25,
    attackable: true,
    respawnSec: RESPAWN_ANIMAL,
  },
  {
    uuid: stableUuid('animal', 'boar', 1),
    species: 'boar',
    position: [-140, 0, 50],
    wanderRadius: 20,
    attackable: true,
    respawnSec: RESPAWN_ANIMAL,
  },
  {
    uuid: stableUuid('animal', 'buffalo', 1),
    species: 'buffalo',
    position: [-80, 0, -150],
    wanderRadius: 18,
    attackable: true,
    respawnSec: RESPAWN_ANIMAL,
  },
];

// ── Enemy vessels (B_O_A_T_S) + friendly dock boat ───────────────────────────

export const HAVEN_VESSELS: HavenVesselPlacement[] = [
  {
    uuid: stableUuid('vessel', 'pirate', 1),
    name: 'Blackwake Raider',
    role: 'enemy_raid',
    fruzerNode: 'ship_pirate',
    position: [220, 0, 80],
    rotation: -0.6,
    hostile: true,
    level: 3,
    aggroRadius: 80,
  },
  {
    uuid: stableUuid('vessel', 'pirate_flags', 1),
    name: 'Corsair Flagship',
    role: 'enemy_raid',
    fruzerNode: 'ship_pirate_flags',
    position: [260, 0, -40],
    rotation: 0.4,
    hostile: true,
    level: 4,
    aggroRadius: 100,
  },
  {
    uuid: stableUuid('vessel', 'wreck_back', 1),
    name: 'Broken Stern',
    role: 'wreck',
    fruzerNode: 'ship_pirate_vreck_back',
    position: [-200, 0, -60],
    rotation: 1.2,
    hostile: false,
    level: 1,
    aggroRadius: 0,
  },
  {
    uuid: stableUuid('vessel', 'wreck_front', 1),
    name: 'Broken Bow',
    role: 'wreck',
    fruzerNode: 'ship_pirate_vreck_front',
    position: [-230, 0, -20],
    rotation: 0.9,
    hostile: false,
    level: 1,
    aggroRadius: 0,
  },
  {
    uuid: stableUuid('vessel', 'colonial', 1),
    name: 'Pact Patrol Sloop',
    role: 'colonial_patrol',
    fruzerNode: 'ship_colonial_small',
    position: [80, 0, 100],
    rotation: Math.PI,
    hostile: false,
    level: 2,
    aggroRadius: 0,
  },
  {
    uuid: stableUuid('vessel', 'dock_boat', 1),
    name: 'Harbor Skiff',
    role: 'friendly_dock',
    fruzerNode: 'boat',
    position: [18, 0, 48],
    rotation: 0.2,
    hostile: false,
    level: 0,
    aggroRadius: 0,
  },
];

// ── Starter friendly missions ────────────────────────────────────────────────

export interface HavenMissionDef {
  id: string;
  title: string;
  description: string;
  giverUuid: string;
  category: 'main' | 'side' | 'tutorial';
  recommendedLevel: number;
  objectives: Array<{
    id: string;
    description: string;
    type: 'collect' | 'kill' | 'reach_location' | 'interact';
    requiredCount: number;
    targetItemIds?: string[];
    targetTemplateIds?: string[];
    targetPosition?: [number, number, number];
    targetRadius?: number;
    targetNodeId?: string;
  }>;
  rewards: { gold: number; xp: number; items?: [string, number][] };
}

export const HAVEN_MISSIONS: HavenMissionDef[] = [
  {
    id: 'MISSION_HAVEN_FIRST_HARVEST',
    title: 'Harbor Provisions',
    description: 'Gather palm wood and herbs for the market stalls.',
    giverUuid: stableUuid('npc', 'mission', 1),
    category: 'tutorial',
    recommendedLevel: 1,
    objectives: [
      {
        id: 'obj_wood',
        description: 'Harvest hardwood or palm fronds (3)',
        type: 'collect',
        requiredCount: 3,
        targetItemIds: ['hardwood', 'palm_frond'],
      },
      {
        id: 'obj_herbs',
        description: 'Gather shore herbs (2)',
        type: 'collect',
        requiredCount: 2,
        targetItemIds: ['herbs'],
      },
    ],
    rewards: { gold: 25, xp: 80, items: [['fish', 2]] },
  },
  {
    id: 'MISSION_HAVEN_FISH_RUN',
    title: 'Net the Harbor',
    description: 'Fish the calm waters — no rival water mesh, just the map ocean.',
    giverUuid: stableUuid('npc', 'mission', 1),
    category: 'side',
    recommendedLevel: 1,
    objectives: [
      {
        id: 'obj_fish',
        description: 'Catch fish (5)',
        type: 'collect',
        requiredCount: 5,
        targetItemIds: ['fish'],
      },
    ],
    rewards: { gold: 20, xp: 60 },
  },
  {
    id: 'MISSION_HAVEN_SCOUT_EAST',
    title: 'Scout the East Isle',
    description: 'Reach East Palm Isle and report back to Scout Rowan.',
    giverUuid: stableUuid('npc', 'mission', 2),
    category: 'side',
    recommendedLevel: 2,
    objectives: [
      {
        id: 'obj_reach_east',
        description: 'Travel to East Palm Isle',
        type: 'reach_location',
        requiredCount: 1,
        targetPosition: [180, 0, 40],
        targetRadius: 35,
      },
    ],
    rewards: { gold: 35, xp: 100 },
  },
  {
    id: 'MISSION_HAVEN_PIRATE_THREAT',
    title: 'Blackwake Warning',
    description: 'Mark the pirate raiders offshore — do not engage the flagship alone.',
    giverUuid: stableUuid('npc', 'mission', 2),
    category: 'main',
    recommendedLevel: 3,
    objectives: [
      {
        id: 'obj_spot_raider',
        description: 'Approach the Blackwake Raider (spot within range)',
        type: 'reach_location',
        requiredCount: 1,
        targetPosition: [220, 0, 80],
        targetRadius: 50,
      },
      {
        id: 'obj_report',
        description: 'Report to Harbor Master Elira',
        type: 'interact',
        requiredCount: 1,
        targetNodeId: stableUuid('npc', 'mission', 1),
      },
    ],
    rewards: { gold: 50, xp: 150, items: [['shells', 5]] },
  },
  {
    id: 'MISSION_HAVEN_CRYPT_PATH',
    title: "Path to Pirate's Crypt",
    description: 'Sister Vale asks you to find the cave approach for the starter dungeon.',
    giverUuid: stableUuid('npc', 'mission', 3),
    category: 'main',
    recommendedLevel: 2,
    objectives: [
      {
        id: 'obj_cave',
        description: "Reach Pirate's Crypt approach",
        type: 'reach_location',
        requiredCount: 1,
        targetPosition: [-90, 0, -170],
        targetRadius: 30,
      },
    ],
    rewards: { gold: 40, xp: 120 },
  },
];

// ── Foundation placement config ──────────────────────────────────────────────

export interface HavenShoreFoundationConfig {
  sectorId: typeof HAVEN_SHORE_SECTOR_ID;
  cityId: typeof HAVEN_PORT_CITY_ID;
  version: typeof HAVEN_SHORE_FOUNDATION_VERSION;
  glbPath: string;
  cdnKey: string;
  /** World origin of foundation inside zone (meters) */
  origin: [number, number, number];
  /** Uniform scale for Fruzer scene into zone meters */
  scale: number;
  /** Yaw of entire foundation */
  rotationY: number;
  /** Single waterline — must match sector.terrain3d.waterLevel */
  waterLevel: number;
  /** Strip all embedded water / meme / light nodes */
  stripWater: true;
  /** Do not spawn second ocean — zone builder owns water */
  useMapOceanOnly: true;
  isSafeZone: true;
  isPveTradeHub: true;
  islands: HavenIslandSlot[];
  harvest: HavenHarvestPlacement[];
  vendors: HavenNpcPlacement[];
  missionGivers: HavenNpcPlacement[];
  townNpcs: HavenNpcPlacement[];
  animals: HavenAnimalPlacement[];
  vessels: HavenVesselPlacement[];
  missions: HavenMissionDef[];
  keepGroups: readonly string[];
  textureMap: typeof HAVEN_ISLAND_TEXTURE_MAP;
}

export const HAVEN_SHORE_FOUNDATION: HavenShoreFoundationConfig = {
  sectorId: HAVEN_SHORE_SECTOR_ID,
  cityId: HAVEN_PORT_CITY_ID,
  version: HAVEN_SHORE_FOUNDATION_VERSION,
  glbPath: HAVEN_SHORE_FRUZER_GLB,
  cdnKey: HAVEN_SHORE_FRUZER_CDN_KEY,
  // Place on first settlement island; engine may re-anchor to capital island
  origin: [0, 0, 0],
  scale: 2.4,
  rotationY: 0,
  waterLevel: 0,
  stripWater: true,
  useMapOceanOnly: true,
  isSafeZone: true,
  isPveTradeHub: true,
  islands: HAVEN_ISLAND_SLOTS,
  harvest: HAVEN_HARVEST_PLACEMENTS,
  vendors: HAVEN_VENDORS,
  missionGivers: HAVEN_MISSION_GIVERS,
  townNpcs: HAVEN_TOWN_NPCS,
  animals: HAVEN_ANIMALS,
  vessels: HAVEN_VESSELS,
  missions: HAVEN_MISSIONS,
  keepGroups: FRUZER_KEEP_GROUPS,
  textureMap: HAVEN_ISLAND_TEXTURE_MAP,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function isHavenShoreSector(sectorId: string): boolean {
  return sectorId === HAVEN_SHORE_SECTOR_ID || sectorId === 'S';
}

export function allHavenNpcs(): HavenNpcPlacement[] {
  return [...HAVEN_VENDORS, ...HAVEN_MISSION_GIVERS, ...HAVEN_TOWN_NPCS];
}

export function havenHarvestAsProfession(p: HavenHarvestKind): HarvestProfession {
  return p;
}

/** Map foundation harvest rows into zone node-compatible payload (server/client). */
export function havenHarvestToZoneNodes(
  foundationOrigin: [number, number, number] = HAVEN_SHORE_FOUNDATION.origin,
): Array<{
  id: string;
  category: 'harvest';
  position: [number, number, number];
  state: 'active';
  respawnSec: number;
  difficulty: number;
  profession: HarvestProfession;
  resourceId: string;
  resourceName: string;
  tier: number;
  yield: [number, number];
  harvestTimeSec: number;
  parentIslandId: string | null;
}> {
  const [ox, oy, oz] = foundationOrigin;
  return HAVEN_HARVEST_PLACEMENTS.map((h) => ({
    id: h.uuid,
    category: 'harvest' as const,
    position: [ox + h.position[0], oy + h.position[1], oz + h.position[2]] as [
      number,
      number,
      number,
    ],
    state: 'active' as const,
    respawnSec: h.respawnSec,
    difficulty: h.tier,
    profession: havenHarvestAsProfession(h.profession),
    resourceId: h.resourceId,
    resourceName: h.name,
    tier: h.tier,
    yield: h.yield,
    harvestTimeSec: h.harvestTimeSec,
    parentIslandId: h.islandKey === 'ocean' ? null : `haven_shore:island:${h.islandKey}`,
  }));
}

/**
 * factionTowns.ts
 * ─────────────────────────────────────────────────────────────
 * Canonical town definitions for each faction's home sector.
 *
 * Town locations match SECTOR_LORE controlling factions:
 *   Crusade → NW "Dried Basin"       → "Dried Basin Garrison"
 *   Legion  → S  "The Pit"           → "The Pit Foundry"
 *   Fabled  → N  "Cathedral Highlands" → "Cathedral Sanctum"
 *
 * God temples (Hall of Odin, Maw of Madra, Sanctum of Omni)
 * are endgame locations — towns have Wayshrines instead.
 *
 * CENTER "Racalvin's Domain" has faction embassies (faction_hqs),
 * which are NOT main towns — they are small outposts.
 * ─────────────────────────────────────────────────────────────
 */

import type { FactionId, SectorPosition, HeroDefinition } from './lore';
import type { DialogueVoiceId } from './dialogueVoices';
import { FACTIONS, HERO_ROSTER, SECTOR_LORE } from './lore';

// ── Types ────────────────────────────────────────────────────────────────────

export type TownSpawnCategory =
  | 'playerSpawn'
  | 'guard'
  | 'merchant'
  | 'questGiver'
  | 'factionVendor'
  | 'shrine'
  | 'npc';

export interface TownSpawnPoint {
  id: string;
  category: TownSpawnCategory;
  position: [number, number, number];
  /** Facing direction in radians (Y-axis rotation) */
  facing: number;
  /** Optional label for quest/merchant UI */
  label?: string;
}

export type TownNPCRole =
  | 'hero'
  | 'guard'
  | 'merchant'
  | 'questGiver'
  | 'factionVendor'
  | 'civilian'
  | 'shrineKeeper';

export interface TownNPC {
  id: string;
  /** Character model ID from modelManifest.ts */
  modelId: string;
  role: TownNPCRole;
  name: string;
  /** Spawn point ID this NPC occupies */
  spawnPointId: string;
  /** Patrol waypoints for guards (world-space positions) */
  patrolPath?: [number, number, number][];
  /** Hero definition ID if this NPC is a canonical hero */
  heroId?: string;
  /** Dialogue set ID for quest/merchant interactions */
  dialogueSetId?: string;
  /** Super Dialogue Pack voice actor override */
  voiceProfile?: DialogueVoiceId;
}

export interface TownAmbience {
  /** Fog color (hex number) */
  fogColor: number;
  /** Fog density */
  fogDensity: number;
  /** Accent light color (hex number) */
  accentLightColor: number;
  /** Accent light intensity (0-1) */
  accentLightIntensity: number;
  /** Sky color override */
  skyColor: number;
  /** Particle system keys to attach at the shrine */
  shrineParticles: string[];
  /** Ambient sound ID */
  ambientSound?: string;
}

export interface TownNavMeshConfig {
  /** Town walkable area bounds [minX, minZ, maxX, maxZ] */
  bounds: [number, number, number, number];
  /** Obstacle exclusion boxes: [centerX, centerZ, halfWidth, halfDepth][] */
  obstacles: [number, number, number, number][];
  /** Grid cell size for A* pathfinding */
  cellSize: number;
}

export interface TownInterior {
  id: string;
  /** Label shown at the door trigger */
  label: string;
  /** GLB model path for the interior scene */
  modelPath: string;
  /** Scale factor from calibration manifest */
  modelScale: number;
  /** Center offset from calibration */
  modelOffset: [number, number, number];
  /** Door trigger position in the exterior (world-space) */
  doorPosition: [number, number, number];
  /** Door trigger radius */
  doorRadius: number;
  /** Player spawn position inside the interior */
  interiorSpawn: [number, number, number];
}

export interface TownComposition {
  /** Primary exterior model */
  exteriorPath: string;
  exteriorScale: number;
  exteriorOffset: [number, number, number];
  /** Additional models composited into the exterior (e.g. orc buildings) */
  overlays: {
    modelPath: string;
    scale: number;
    offset: [number, number, number];
    /** Individual piece placements within the overlay set */
    placements?: { position: [number, number, number]; rotation: number; pieceFilter?: string }[];
  }[];
  /** Shrine model (separate from exterior) */
  shrinePath?: string;
  shrineScale?: number;
  shrineOffset?: [number, number, number];
}

export interface FactionTown {
  id: string;
  factionId: FactionId;
  name: string;
  subtitle: string;
  /** Sector this town lives in */
  sectorId: SectorPosition;
  /** GLB model path (CDN URL or local path) — primary exterior */
  modelPath: string;
  /** Model scale (from calibration: targetSize / maxDimension) */
  modelScale: number;
  /** World-space offset for placing the town model in the sector */
  modelOffset: [number, number, number];
  /** Multi-model composition config */
  composition: TownComposition;
  /** Building interiors (loaded as instanced scenes on door trigger) */
  interiors: TownInterior[];
  /** All spawn points in this town */
  spawnPoints: TownSpawnPoint[];
  /** NPC population */
  npcs: TownNPC[];
  /** Visual ambience */
  ambience: TownAmbience;
  /** Pathfinding config */
  navmesh: TownNavMeshConfig;
  /** From SECTOR_LORE.specialFeatures */
  specialFeatures: string[];
  /** Description text shown on town entry */
  description: string;
}

// ── Helper: heroes for a sector ──────────────────────────────────────────────

function heroesInSector(sector: SectorPosition): HeroDefinition[] {
  return HERO_ROSTER.filter(h => h.sectorSpawn === sector);
}

// ── Crusade: Dried Basin Garrison ────────────────────────────────────────────

const CRUSADE_SPAWN_POINTS: TownSpawnPoint[] = [
  // Player spawns
  { id: 'cru_spawn_1', category: 'playerSpawn', position: [0, 0, 40], facing: 0 },
  { id: 'cru_spawn_2', category: 'playerSpawn', position: [10, 0, 40], facing: 0 },
  { id: 'cru_spawn_3', category: 'playerSpawn', position: [-10, 0, 40], facing: 0 },
  // Guards at gate
  { id: 'cru_guard_1', category: 'guard', position: [-8, 0, 35], facing: Math.PI },
  { id: 'cru_guard_2', category: 'guard', position: [8, 0, 35], facing: Math.PI },
  // Patrol guards
  { id: 'cru_guard_3', category: 'guard', position: [25, 0, 0], facing: Math.PI / 2 },
  { id: 'cru_guard_4', category: 'guard', position: [-25, 0, 0], facing: -Math.PI / 2 },
  // Market square merchants
  { id: 'cru_merchant_1', category: 'merchant', position: [-12, 0, 5], facing: Math.PI / 4, label: 'Weapons & Armor' },
  { id: 'cru_merchant_2', category: 'merchant', position: [12, 0, 5], facing: -Math.PI / 4, label: 'Potions & Supplies' },
  { id: 'cru_merchant_3', category: 'merchant', position: [0, 0, -5], facing: 0, label: 'Salt Prospector' },
  // Faction vendor
  { id: 'cru_vendor_1', category: 'factionVendor', position: [0, 0, -20], facing: 0, label: 'Crusade Quartermaster' },
  // Quest givers (hero positions)
  { id: 'cru_quest_aurion', category: 'questGiver', position: [-15, 0, -15], facing: Math.PI / 6, label: 'Aurion the Radiant' },
  { id: 'cru_quest_theron', category: 'questGiver', position: [15, 0, -15], facing: -Math.PI / 6, label: 'Theron Wildkin' },
  // Odin's Wayshrine
  { id: 'cru_shrine', category: 'shrine', position: [0, 0, -30], facing: 0, label: "Odin's Wayshrine" },
  // Civilians
  { id: 'cru_npc_1', category: 'npc', position: [-5, 0, 10], facing: 0 },
  { id: 'cru_npc_2', category: 'npc', position: [5, 0, 15], facing: Math.PI },
  { id: 'cru_npc_3', category: 'npc', position: [-18, 0, 10], facing: Math.PI / 3 },
];

const CRUSADE_NPCS: TownNPC[] = [
  // Gate guards
  { id: 'cru_g1', modelId: 'human', role: 'guard', name: 'Garrison Guard', spawnPointId: 'cru_guard_1' },
  { id: 'cru_g2', modelId: 'human', role: 'guard', name: 'Garrison Guard', spawnPointId: 'cru_guard_2' },
  // Patrol guards
  {
    id: 'cru_g3', modelId: 'human', role: 'guard', name: 'Patrol Sentinel', spawnPointId: 'cru_guard_3',
    patrolPath: [[25, 0, 0], [25, 0, -20], [15, 0, -30], [25, 0, -20]],
  },
  {
    id: 'cru_g4', modelId: 'human', role: 'guard', name: 'Patrol Sentinel', spawnPointId: 'cru_guard_4',
    patrolPath: [[-25, 0, 0], [-25, 0, -20], [-15, 0, -30], [-25, 0, -20]],
  },
  // Merchants
  { id: 'cru_m1', modelId: 'human', role: 'merchant', name: 'Roderick the Smith', spawnPointId: 'cru_merchant_1', dialogueSetId: 'merchant_weapons' },
  { id: 'cru_m2', modelId: 'human', role: 'merchant', name: 'Elara the Apothecary', spawnPointId: 'cru_merchant_2', dialogueSetId: 'merchant_potions' },
  { id: 'cru_m3', modelId: 'dwarf', role: 'merchant', name: 'Bram Saltpick', spawnPointId: 'cru_merchant_3', dialogueSetId: 'merchant_salt' },
  // Faction vendor
  { id: 'cru_fv', modelId: 'human', role: 'factionVendor', name: 'Quartermaster Hale', spawnPointId: 'cru_vendor_1', dialogueSetId: 'crusade_vendor' },
  // Heroes as quest givers
  { id: 'cru_aurion', modelId: 'human', role: 'hero', name: 'Aurion the Radiant', spawnPointId: 'cru_quest_aurion', heroId: 'aurion', dialogueSetId: 'hero_aurion' },
  { id: 'cru_theron', modelId: 'human', role: 'hero', name: 'Theron Wildkin', spawnPointId: 'cru_quest_theron', heroId: 'theron', dialogueSetId: 'hero_theron' },
  // Shrine keeper
  { id: 'cru_sk', modelId: 'human', role: 'shrineKeeper', name: "Odin's Acolyte", spawnPointId: 'cru_shrine', dialogueSetId: 'shrine_odin' },
  // Civilians
  { id: 'cru_c1', modelId: 'human', role: 'civilian', name: 'Townsman', spawnPointId: 'cru_npc_1' },
  { id: 'cru_c2', modelId: 'human', role: 'civilian', name: 'Townswoman', spawnPointId: 'cru_npc_2' },
  { id: 'cru_c3', modelId: 'dwarf', role: 'civilian', name: 'Dwarf Miner', spawnPointId: 'cru_npc_3' },
];

// ── Legion: The Pit Foundry ──────────────────────────────────────────────────

const LEGION_SPAWN_POINTS: TownSpawnPoint[] = [
  { id: 'leg_spawn_1', category: 'playerSpawn', position: [0, 0, 45], facing: 0 },
  { id: 'leg_spawn_2', category: 'playerSpawn', position: [12, 0, 45], facing: 0 },
  { id: 'leg_spawn_3', category: 'playerSpawn', position: [-12, 0, 45], facing: 0 },
  { id: 'leg_guard_1', category: 'guard', position: [-10, 0, 38], facing: Math.PI },
  { id: 'leg_guard_2', category: 'guard', position: [10, 0, 38], facing: Math.PI },
  { id: 'leg_guard_3', category: 'guard', position: [30, 0, 0], facing: Math.PI / 2 },
  { id: 'leg_guard_4', category: 'guard', position: [-30, 0, 0], facing: -Math.PI / 2 },
  { id: 'leg_merchant_1', category: 'merchant', position: [-15, 0, 10], facing: Math.PI / 4, label: 'War Forges' },
  { id: 'leg_merchant_2', category: 'merchant', position: [15, 0, 10], facing: -Math.PI / 4, label: 'Dark Reagents' },
  { id: 'leg_vendor_1', category: 'factionVendor', position: [0, 0, -15], facing: 0, label: 'Legion Warchief' },
  { id: 'leg_quest_gruk', category: 'questGiver', position: [-20, 0, -10], facing: Math.PI / 6, label: 'Gruk Skullcrusher' },
  { id: 'leg_quest_morgash', category: 'questGiver', position: [20, 0, -10], facing: -Math.PI / 6, label: 'Morgash the Flamecaller' },
  { id: 'leg_shrine', category: 'shrine', position: [0, 0, -35], facing: 0, label: "Madra's Shrine" },
  { id: 'leg_npc_1', category: 'npc', position: [-8, 0, 20], facing: 0 },
  { id: 'leg_npc_2', category: 'npc', position: [8, 0, 25], facing: Math.PI },
];

const LEGION_NPCS: TownNPC[] = [
  { id: 'leg_g1', modelId: 'orc', role: 'guard', name: 'Pit Guard', spawnPointId: 'leg_guard_1' },
  { id: 'leg_g2', modelId: 'orc', role: 'guard', name: 'Pit Guard', spawnPointId: 'leg_guard_2' },
  {
    id: 'leg_g3', modelId: 'orc', role: 'guard', name: 'Ash Patrol', spawnPointId: 'leg_guard_3',
    patrolPath: [[30, 0, 0], [30, 0, -25], [20, 0, -35], [30, 0, -25]],
  },
  {
    id: 'leg_g4', modelId: 'undead', role: 'guard', name: 'Undead Sentry', spawnPointId: 'leg_guard_4',
    patrolPath: [[-30, 0, 0], [-30, 0, -25], [-20, 0, -35], [-30, 0, -25]],
  },
  { id: 'leg_m1', modelId: 'orc', role: 'merchant', name: 'Gorath the Forgehand', spawnPointId: 'leg_merchant_1', dialogueSetId: 'merchant_weapons' },
  { id: 'leg_m2', modelId: 'undead', role: 'merchant', name: 'Whisperbone', spawnPointId: 'leg_merchant_2', dialogueSetId: 'merchant_reagents' },
  { id: 'leg_fv', modelId: 'orc', role: 'factionVendor', name: 'Warchief Gorrash', spawnPointId: 'leg_vendor_1', dialogueSetId: 'legion_vendor' },
  { id: 'leg_gruk', modelId: 'orc', role: 'hero', name: 'Gruk Skullcrusher', spawnPointId: 'leg_quest_gruk', heroId: 'gruk', dialogueSetId: 'hero_gruk' },
  { id: 'leg_morgash', modelId: 'orc', role: 'hero', name: 'Morgash the Flamecaller', spawnPointId: 'leg_quest_morgash', heroId: 'morgash', dialogueSetId: 'hero_morgash' },
  { id: 'leg_sk', modelId: 'undead', role: 'shrineKeeper', name: "Madra's Acolyte", spawnPointId: 'leg_shrine', dialogueSetId: 'shrine_madra' },
  { id: 'leg_c1', modelId: 'orc', role: 'civilian', name: 'Orc Grunt', spawnPointId: 'leg_npc_1' },
  { id: 'leg_c2', modelId: 'undead', role: 'civilian', name: 'Risen Worker', spawnPointId: 'leg_npc_2' },
];

// ── Fabled: Cathedral Sanctum ────────────────────────────────────────────────

const FABLED_SPAWN_POINTS: TownSpawnPoint[] = [
  { id: 'fab_spawn_1', category: 'playerSpawn', position: [0, 0, 40], facing: 0 },
  { id: 'fab_spawn_2', category: 'playerSpawn', position: [10, 0, 42], facing: 0 },
  { id: 'fab_spawn_3', category: 'playerSpawn', position: [-10, 0, 42], facing: 0 },
  { id: 'fab_guard_1', category: 'guard', position: [-6, 0, 32], facing: Math.PI },
  { id: 'fab_guard_2', category: 'guard', position: [6, 0, 32], facing: Math.PI },
  { id: 'fab_guard_3', category: 'guard', position: [22, 0, 0], facing: Math.PI / 2 },
  { id: 'fab_guard_4', category: 'guard', position: [-22, 0, 0], facing: -Math.PI / 2 },
  { id: 'fab_merchant_1', category: 'merchant', position: [-10, 0, 8], facing: Math.PI / 4, label: 'Enchanted Arms' },
  { id: 'fab_merchant_2', category: 'merchant', position: [10, 0, 8], facing: -Math.PI / 4, label: 'Arcane Tomes' },
  { id: 'fab_merchant_3', category: 'merchant', position: [0, 0, -3], facing: 0, label: 'Forge & Rune' },
  { id: 'fab_vendor_1', category: 'factionVendor', position: [0, 0, -18], facing: 0, label: 'Fabled Lorekeeper' },
  { id: 'fab_quest_aelindor', category: 'questGiver', position: [-18, 0, -12], facing: Math.PI / 6, label: 'Aelindor the Swift' },
  { id: 'fab_quest_thordak', category: 'questGiver', position: [18, 0, -12], facing: -Math.PI / 6, label: 'Thordak Runekeeper' },
  { id: 'fab_shrine', category: 'shrine', position: [0, 0, -28], facing: 0, label: "Omni's Wayshrine" },
  { id: 'fab_npc_1', category: 'npc', position: [-6, 0, 15], facing: 0 },
  { id: 'fab_npc_2', category: 'npc', position: [6, 0, 18], facing: Math.PI },
  { id: 'fab_npc_3', category: 'npc', position: [-16, 0, 8], facing: Math.PI / 3 },
];

const FABLED_NPCS: TownNPC[] = [
  { id: 'fab_g1', modelId: 'elf', role: 'guard', name: 'Highland Warden', spawnPointId: 'fab_guard_1' },
  { id: 'fab_g2', modelId: 'elf', role: 'guard', name: 'Highland Warden', spawnPointId: 'fab_guard_2' },
  {
    id: 'fab_g3', modelId: 'dwarf', role: 'guard', name: 'Stone Sentinel', spawnPointId: 'fab_guard_3',
    patrolPath: [[22, 0, 0], [22, 0, -18], [14, 0, -28], [22, 0, -18]],
  },
  {
    id: 'fab_g4', modelId: 'elf', role: 'guard', name: 'Wind Walker', spawnPointId: 'fab_guard_4',
    patrolPath: [[-22, 0, 0], [-22, 0, -18], [-14, 0, -28], [-22, 0, -18]],
  },
  { id: 'fab_m1', modelId: 'elf', role: 'merchant', name: 'Ilyana Starweave', spawnPointId: 'fab_merchant_1', dialogueSetId: 'merchant_enchanted' },
  { id: 'fab_m2', modelId: 'elf', role: 'merchant', name: 'Thandril the Sage', spawnPointId: 'fab_merchant_2', dialogueSetId: 'merchant_tomes' },
  { id: 'fab_m3', modelId: 'dwarf', role: 'merchant', name: 'Brenna Ironheart', spawnPointId: 'fab_merchant_3', dialogueSetId: 'merchant_forge' },
  { id: 'fab_fv', modelId: 'elf', role: 'factionVendor', name: 'Lorekeeper Faelion', spawnPointId: 'fab_vendor_1', dialogueSetId: 'fabled_vendor' },
  { id: 'fab_aelindor', modelId: 'elf', role: 'hero', name: 'Aelindor the Swift', spawnPointId: 'fab_quest_aelindor', heroId: 'aelindor', dialogueSetId: 'hero_aelindor' },
  { id: 'fab_thordak', modelId: 'dwarf', role: 'hero', name: 'Thordak Runekeeper', spawnPointId: 'fab_quest_thordak', heroId: 'thordak', dialogueSetId: 'hero_thordak' },
  { id: 'fab_sk', modelId: 'elf', role: 'shrineKeeper', name: "Omni's Voice", spawnPointId: 'fab_shrine', dialogueSetId: 'shrine_omni' },
  { id: 'fab_c1', modelId: 'elf', role: 'civilian', name: 'Elf Scholar', spawnPointId: 'fab_npc_1' },
  { id: 'fab_c2', modelId: 'dwarf', role: 'civilian', name: 'Dwarf Artisan', spawnPointId: 'fab_npc_2' },
  { id: 'fab_c3', modelId: 'elf', role: 'civilian', name: 'Wind Listener', spawnPointId: 'fab_npc_3' },
];

// ── Town Definitions ─────────────────────────────────────────────────────────

export const FACTION_TOWNS: Record<FactionId, FactionTown> = {
  crusade: {
    id: 'dried_basin_garrison',
    factionId: 'crusade',
    name: 'Dried Basin Garrison',
    subtitle: 'Bastion of the Faithful',
    sectorId: 'NW',
    modelPath: '/models/towns/crusade/exterior.glb',
    modelScale: 1.9927,
    modelOffset: [0.31, -38.97, 4.81],
    composition: {
      exteriorPath: '/models/towns/crusade/exterior.glb',
      exteriorScale: 1.9927,
      exteriorOffset: [0.31, -38.97, 4.81],
      overlays: [],
    },
    interiors: [
      {
        id: 'cru_tavern', label: 'The Oasis Tavern',
        modelPath: '/models/towns/crusade/tavern.glb', modelScale: 0.0829, modelOffset: [3.64, 0.76, -11.01],
        doorPosition: [-12, 0, 5], doorRadius: 3,
        interiorSpawn: [0, 0, 5],
      },
      {
        id: 'cru_cottage', label: 'Salt Cottage',
        modelPath: '/models/towns/crusade/cottage.glb', modelScale: 0.0006, modelOffset: [-0.79, -0.26, -2.38],
        doorPosition: [18, 0, 10], doorRadius: 2.5,
        interiorSpawn: [0, 0, 3],
      },
      {
        id: 'cru_cathedral', label: 'Cathedral of Odin',
        modelPath: '/models/towns/crusade/cathedral.glb', modelScale: 0.0081, modelOffset: [0.49, -5.25, 0.31],
        doorPosition: [0, 0, -20], doorRadius: 4,
        interiorSpawn: [0, 0, 8],
      },
    ],
    spawnPoints: CRUSADE_SPAWN_POINTS,
    npcs: CRUSADE_NPCS,
    ambience: {
      fogColor: 0xd4a574,
      fogDensity: 0.0003,
      accentLightColor: 0x3b82f6,
      accentLightIntensity: 0.4,
      skyColor: 0xc4a06a,
      shrineParticles: ['golden_lightning', 'odin_ravens'],
      ambientSound: 'town_arid',
    },
    navmesh: {
      bounds: [-35, -40, 35, 50],
      obstacles: [
        // Buildings — approximate bounding boxes
        [-20, -25, 6, 8],  // barracks
        [20, -25, 6, 8],   // armory
        [0, -30, 4, 4],    // shrine platform
        [-12, 5, 3, 3],    // market stall left
        [12, 5, 3, 3],     // market stall right
      ],
      cellSize: 1.0,
    },
    specialFeatures: ['salt_mines', 'oasis_camps', 'mirage_events'],
    description: 'Sun-bleached stone walls rise from the cracked salt flats. The Crusade garrison stands watch over precious mineral veins, its blue banners snapping in the hot wind.',
  },

  legion: {
    id: 'the_pit_foundry',
    factionId: 'legion',
    name: 'The Pit Foundry',
    subtitle: 'Heart of the Caldera',
    sectorId: 'S',
    modelPath: '/models/towns/legion/dark_town.glb',
    modelScale: 0.5027,
    modelOffset: [8.16, -11.96, 7.54],
    composition: {
      exteriorPath: '/models/towns/legion/dark_town.glb',
      exteriorScale: 0.5027,
      exteriorOffset: [8.16, -11.96, 7.54],
      overlays: [
        {
          modelPath: '/models/towns/legion/orc_buildings.glb',
          scale: 0.3394,
          offset: [-3.12, -2.23, 11.82],
          placements: [
            // Orc buildings scaled 3-4x and placed around graveyard center
            { position: [-20, 0, -10], rotation: 0, pieceFilter: 'orc_altar' },
            { position: [20, 0, -10], rotation: Math.PI, pieceFilter: 'orc_anvil_big' },
            { position: [-15, 0, 15], rotation: Math.PI / 4, pieceFilter: 'orc_barrel' },
            { position: [15, 0, 15], rotation: -Math.PI / 4, pieceFilter: 'orc_beam' },
            { position: [0, 0, 20], rotation: 0, pieceFilter: 'orc_anvil' },
          ],
        },
      ],
      shrinePath: '/models/towns/legion/madra_shrine.glb',
      shrineScale: 0.0147,
      shrineOffset: [-0.05, 3.55, -1.73],
    },
    interiors: [
      {
        id: 'leg_cave_forge', label: 'The Ember Forge',
        modelPath: '/models/towns/legion/cave_forge.glb', modelScale: 0.0001, modelOffset: [1, 3.02, -1.25],
        doorPosition: [-15, 0, 10], doorRadius: 3,
        interiorSpawn: [0, 0, 5],
      },
    ],
    spawnPoints: LEGION_SPAWN_POINTS,
    npcs: LEGION_NPCS,
    ambience: {
      fogColor: 0x2a0a00,
      fogDensity: 0.0005,
      accentLightColor: 0xef4444,
      accentLightIntensity: 0.6,
      skyColor: 0x1a0500,
      shrineParticles: ['void_entropy', 'ember_swirl', 'madra_eyes'],
      ambientSound: 'town_volcanic',
    },
    navmesh: {
      bounds: [-40, -45, 40, 50],
      obstacles: [
        [-20, -20, 8, 8],  // main forge
        [20, -20, 8, 8],   // ritual altar
        [0, -35, 5, 5],    // shrine platform
        [-15, 10, 4, 4],   // forge stall
        [15, 10, 4, 4],    // reagent stall
      ],
      cellSize: 1.0,
    },
    specialFeatures: ['volcanic_forges', 'madra_temples', 'lava_born_enemies', 'ember_sanctuaries', 'ash_sorcerers'],
    description: 'Obsidian spires claw upward from rivers of molten rock. The Legion forges weapons of war in the caldera\'s heat, Madra\'s dark energy pulsing through every stone.',
  },

  fabled: {
    id: 'cathedral_sanctum',
    factionId: 'fabled',
    name: 'Runeforge Hold',
    subtitle: 'Fabled Core · Dwarf Main City beyond the caves',
    sectorId: 'N',
    // Open-world core is fabledzone.glb (Island3D FabledZoneFoundationLoader).
    // Town composer fallback / editor uses dwarf city + gate overlays.
    modelPath: '/models/warlords/fabled/fabledzone.glb',
    modelScale: 1.15,
    modelOffset: [0, 0, 0],
    composition: {
      exteriorPath: '/models/warlords/fabled/fabledzone.glb',
      exteriorScale: 1.15,
      exteriorOffset: [0, 0, 0],
      overlays: [
        {
          // Approach gate — ummorpg-style dwarf gate pillars
          modelPath: '/models/towns/fabled/dwarf_gate.glb',
          scale: 0.0006,
          offset: [0, 0, 40],
          placements: [
            { position: [0, 0, 0], rotation: 0 },
          ],
        },
        {
          // Dwarf main city / castle (entered via cave portals in zone mode)
          modelPath: '/models/warlords/fabled/dwarf_main_city.glb',
          scale: 1.0,
          offset: [0, 0, -80],
          placements: [
            { position: [0, 0, 0], rotation: 0 },
          ],
        },
      ],
    },
    interiors: [
      {
        id: 'fab_main_city', label: 'Dwarf Main City · Castle',
        modelPath: '/models/warlords/fabled/dwarf_main_city.glb', modelScale: 1.0, modelOffset: [0, 0, 0],
        doorPosition: [0, 0, 35], doorRadius: 5,
        interiorSpawn: [0, 2, 8],
      },
      {
        id: 'fab_cottage', label: 'Dwarf Hearth',
        modelPath: '/models/towns/fabled/cottage.glb', modelScale: 0.7011, modelOffset: [-0.79, -2.38, 0.26],
        doorPosition: [10, 0, 8], doorRadius: 2.5,
        interiorSpawn: [0, 0, 3],
      },
      {
        id: 'fab_library', label: 'The Great Library',
        modelPath: '/models/towns/fabled/library.glb', modelScale: 0.0081, modelOffset: [0.49, -5.25, 0.31],
        doorPosition: [-10, 0, 8], doorRadius: 3.5,
        interiorSpawn: [0, 0, 8],
      },
      {
        id: 'fab_forest_lodge', label: 'Wind Lodge',
        modelPath: '/models/towns/fabled/forest_lodge.glb', modelScale: 0.0029, modelOffset: [1.92, -1.15, -1.77],
        doorPosition: [-16, 0, 8], doorRadius: 2.5,
        interiorSpawn: [0, 0, 4],
      },
    ],
    spawnPoints: FABLED_SPAWN_POINTS,
    npcs: FABLED_NPCS,
    ambience: {
      fogColor: 0xb0c4de,
      fogDensity: 0.0003,
      accentLightColor: 0x22c55e,
      accentLightIntensity: 0.4,
      skyColor: 0xa8c4e0,
      shrineParticles: ['balance_light', 'nature_motes', 'omni_glow'],
      ambientSound: 'town_highland',
    },
    navmesh: {
      bounds: [-30, -35, 30, 45],
      obstacles: [
        [-16, -20, 6, 6],  // library tower
        [16, -20, 6, 6],   // crystal tower
        [0, -28, 4, 4],    // shrine platform
        [-10, 8, 3, 3],    // market stall
        [10, 8, 3, 3],     // market stall
        [0, -3, 3, 3],     // forge stall
      ],
      cellSize: 1.0,
    },
    specialFeatures: ['omni_shrines', 'wind_bridges', 'highland_beasts'],
    description: 'Ancient wind has carved these stone spires into cathedral-like formations. Crystalline towers shimmer beside dwarven forges, united under The Omni\'s balanced light.',
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Get the town for a faction */
export function getTown(factionId: FactionId): FactionTown {
  return FACTION_TOWNS[factionId];
}

/** Get the town for a given sector, if one exists */
export function getTownForSector(sectorId: SectorPosition): FactionTown | null {
  for (const town of Object.values(FACTION_TOWNS)) {
    if (town.sectorId === sectorId) return town;
  }
  return null;
}

/** Get all spawn points of a specific category in a town */
export function getSpawnsByCategory(town: FactionTown, category: TownSpawnCategory): TownSpawnPoint[] {
  return town.spawnPoints.filter(sp => sp.category === category);
}

/** Get the hero NPCs in a town */
export function getTownHeroes(town: FactionTown): TownNPC[] {
  return town.npcs.filter(npc => npc.role === 'hero');
}

/** Check if a sector has a faction town */
export function sectorHasTown(sectorId: SectorPosition): boolean {
  return getTownForSector(sectorId) !== null;
}

/** All town sector IDs */
export const TOWN_SECTORS: SectorPosition[] = Object.values(FACTION_TOWNS).map(t => t.sectorId);

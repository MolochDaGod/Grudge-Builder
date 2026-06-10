/**
 * SectorState.ts
 * ─────────────────────────────────────────────────────────────
 * Colyseus schema for a single sector in the 3×3 world grid.
 * Synced to all clients in the SectorRoom via Colyseus delta encoding.
 *
 * Matches:
 *   - island-server.ts player/enemy/node types
 *   - GrudgesTerrainSystem.js SECTOR_MAP keys & biome names
 *   - worldMap.ts ZoneType definitions
 * ─────────────────────────────────────────────────────────────
 */

import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

// ── Sector IDs (mirror GrudgesTerrainSystem.js SECTOR_MAP) ──────

export type SectorId =
  | "NW" | "N" | "NE"
  | "W"  | "CENTER" | "E"
  | "SW" | "S" | "SE";

export const SECTOR_IDS: SectorId[] = [
  "NW", "N", "NE",
  "W", "CENTER", "E",
  "SW", "S", "SE",
];

/** Grid col/row for each sector */
export const SECTOR_GRID: Record<SectorId, { col: number; row: number }> = {
  NW: { col: 0, row: 0 }, N:      { col: 1, row: 0 }, NE: { col: 2, row: 0 },
  W:  { col: 0, row: 1 }, CENTER: { col: 1, row: 1 }, E:  { col: 2, row: 1 },
  SW: { col: 0, row: 2 }, S:      { col: 1, row: 2 }, SE: { col: 2, row: 2 },
};

/** Biome key per sector (matches BiomeMaterialFactory.BIOME_COLORS) */
export const SECTOR_BIOMES: Record<SectorId, string> = {
  NW: "arid",         // Dried Basin
  N:  "highland",     // Cathedral Highlands
  NE: "mountain",     // Crown Peaks
  W:  "industrial",   // Switchyard
  CENTER: "pirate",   // Chicken Gun Pirate Map — open water hub
  E:  "urban_ruin",   // Junkyards
  SW: "flooded",      // Drowned Quarter
  S:  "crater",       // The Pit
  SE: "contested",    // Grinding March
};

// ── Ocean / Tide Constants ──────────────────────────────────────

export const OCEAN_CONFIG = {
  /** Base ocean height (Y) — all 9 sectors share one ocean plane */
  baseHeight: 0,
  /** Tide amplitude: ocean oscillates baseHeight ± amplitude */
  tideAmplitude: 2.0,
  /** Full tide cycle in ms (10 minutes) */
  tideCycleMs: 10 * 60 * 1000,
} as const;

/** Calculate current tide height from server time */
export function getTideHeight(serverTime: number): number {
  const phase = (serverTime % OCEAN_CONFIG.tideCycleMs) / OCEAN_CONFIG.tideCycleMs;
  return OCEAN_CONFIG.baseHeight + Math.sin(phase * Math.PI * 2) * OCEAN_CONFIG.tideAmplitude;
}

// ── Instanced Room Types ────────────────────────────────────────

export type InstancedRoomType = "shipwreck" | "home_island" | "dungeon";

// ── Entity Schemas ──────────────────────────────────────────────

export class SectorPlayer extends Schema {
  @type("string")  id: string = "";
  @type("string")  accountId: string = "";
  @type("string")  characterId: string = "";
  @type("string")  characterName: string = "";
  @type("string")  heroClass: string = "";
  @type("string")  heroRace: string = "";
  @type("string")  faction: string = "";
  @type("number")  level: number = 1;

  // 3D position (matches island-server.ts IslandPlayer)
  @type("number")  x: number = 0;
  @type("number")  y: number = 0;
  @type("number")  z: number = 0;
  @type("number")  facing: number = 0;
  @type("string")  state: string = "idle"; // idle | moving | attacking | harvesting | dead

  // Combat
  @type("number")  hp: number = 200;
  @type("number")  maxHp: number = 200;
  @type("number")  mana: number = 50;
  @type("number")  maxMana: number = 50;

  /** Source game the player entered from */
  @type("string")  sourceGame: string = "warlords"; // warlords | rts | tactical

  // 3D model data — synced so other clients can load the correct mesh
  @type("string")  baseModelId: string = "human";    // race model key from MODEL_MANIFEST
  @type("string")  equippedMeshJson: string = "{}";   // JSON: slot -> variant (body, arms, head)
  @type("string")  weaponSlotsJson: string = "{}";    // JSON: weapon slot -> variant
  @type("string")  skinColor: string = "#ffffff";
  @type("string")  armorColor: string = "#ffffff";
  @type("string")  equippedWeaponType: string = "sword-shield"; // weapon type for animation set
}

export class SectorEnemy extends Schema {
  @type("string")  id: string = "";
  @type("string")  enemyType: string = "";
  @type("number")  x: number = 0;
  @type("number")  y: number = 0;
  @type("number")  z: number = 0;
  @type("number")  hp: number = 50;
  @type("number")  maxHp: number = 50;
  @type("number")  level: number = 1;
  @type("string")  state: string = "idle"; // idle | patrol | chase | attacking | dead
  @type("string")  targetId: string = "";  // player being chased
}

export class HarvestNode extends Schema {
  @type("string")  id: string = "";
  @type("string")  resourceType: string = ""; // mining | forest | fishing
  @type("boolean") depleted: boolean = false;
  @type("number")  respawnAt: number = 0;
  @type("number")  x: number = 0;
  @type("number")  z: number = 0;
}

// ── Placed Building (synced across all clients in room) ───────

export class PlacedBuilding extends Schema {
  @type("string")  id: string = "";
  @type("string")  assetId: string = "";    // key from BuildAssetManifest
  @type("string")  ownerId: string = "";    // sessionId of player who placed it
  @type("string")  ownerName: string = "";
  @type("number")  x: number = 0;
  @type("number")  y: number = 0;
  @type("number")  z: number = 0;
  @type("number")  rotation: number = 0;    // Y rotation in radians
}

// ── Chat Message (not synced via state — sent as broadcast) ─────

export interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

// ── Sector State ────────────────────────────────────────────────

export class SectorState extends Schema {
  // Zone identity
  @type("string")  sectorId: string = "CENTER";
  @type("string")  biome: string = "neutral";
  @type("string")  zoneType: string = "home"; // home | wild | fort | boss | event | empty
  @type("number")  difficulty: number = 1;

  // Simulation
  @type("number")  tick: number = 0;
  @type("number")  serverTime: number = 0;

  // Entities
  @type({ map: SectorPlayer })  players = new MapSchema<SectorPlayer>();
  @type({ map: SectorEnemy })   enemies = new MapSchema<SectorEnemy>();
  @type({ map: HarvestNode })   harvestNodes = new MapSchema<HarvestNode>();
  @type({ map: PlacedBuilding }) buildings = new MapSchema<PlacedBuilding>();

  // Sector population caps
  @type("number")  maxPlayers: number = 50;
  @type("number")  maxEnemies: number = 8;
}

// ── World Overview State (for WorldRoom) ────────────────────────

export class SectorSummary extends Schema {
  @type("string")  sectorId: string = "";
  @type("string")  biome: string = "";
  @type("string")  zoneType: string = "";
  @type("number")  difficulty: number = 1;
  @type("number")  playerCount: number = 0;
  @type("number")  enemyCount: number = 0;
  @type("boolean") active: boolean = false;
}

export class WorldState extends Schema {
  @type({ map: SectorSummary }) sectors = new MapSchema<SectorSummary>();
  @type("number") tick: number = 0;
  @type("number") totalPlayers: number = 0;
  @type("string") ownerId: string = "";       // account that owns this 3×3 block
  @type("number") homeIslandSeed: number = 0;
  /** Synced tide height — all clients render ocean at this Y */
  @type("number") tideHeight: number = 0;
}

// ── Tutorial (Shipwreck) State ──────────────────────────────────

export class TutorialStep extends Schema {
  @type("string")  id: string = "";        // e.g. "fight_crab", "craft_axe", "build_raft"
  @type("string")  title: string = "";
  @type("boolean") completed: boolean = false;
}

export class ShipwreckState extends Schema {
  @type("string")  accountId: string = "";
  @type("string")  characterName: string = "";
  @type("number")  tick: number = 0;
  @type({ map: SectorPlayer }) players = new MapSchema<SectorPlayer>();
  @type({ map: SectorEnemy })  enemies = new MapSchema<SectorEnemy>();
  @type({ map: TutorialStep }) steps = new MapSchema<TutorialStep>();
  @type("boolean") introPlayed: boolean = false;
  @type("boolean") raftBuilt: boolean = false;
  @type("boolean") completed: boolean = false;
}

// ── Home Island State ───────────────────────────────────────────

export class HomeIslandState extends Schema {
  @type("string")  accountId: string = "";     // owner
  @type("string")  islandUUID: string = "";    // unique terrain seed from Grudge ID
  @type("number")  islandSeed: number = 0;     // numeric seed for procedural gen
  @type("number")  tick: number = 0;
  @type({ map: SectorPlayer }) players = new MapSchema<SectorPlayer>();
  @type({ map: HarvestNode })  harvestNodes = new MapSchema<HarvestNode>();
  @type({ map: PlacedBuilding }) buildings = new MapSchema<PlacedBuilding>();
  @type("boolean") dockBuilt: boolean = true;  // starts with dock
  @type("number")  buildingCount: number = 0;
  @type("number")  tideHeight: number = 0;
}

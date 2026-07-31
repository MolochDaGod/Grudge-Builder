/**
 * Ember Spire — volcanic infinite climb (random-boxes platform jumper).
 *
 * SSOT for climb tower config, layout, loot, and sector ownership.
 * Do not duplicate paths/layout in runtime systems — import from here.
 * (No import from floatingIslandBossAssets — avoids circular re-export.)
 *
 * Reference: https://threejs-games.github.io/examples/80-scenes/random-boxes/
 *
 * Ownership matrix (avoid double-duty / visual conflicts):
 * | System                         | Host sectors              | Role                          |
 * |--------------------------------|---------------------------|-------------------------------|
 * | VolcanicClimbIslandSystem      | ember_depths (primary),   | Infinite climb tower + chests |
 * |                                | ashen_wastes (offset)     |                               |
 * | EtherealFloatingIslandSystem   | ethereal_falls only       | Lyoko orbit décor             |
 * | EventIslandSystem (spiral)     | thornwood, haven, ashen   | Sink/raise event plate        |
 * | spiral GLB as climb summit     | climb only (tinted)       | Mesh reuse, not EventIsland   |
 *
 * On ashen_wastes, climb uses originOffset so it does not sit on spiral event islands.
 */

// ── Assets (CDN first, then same-origin) — paths match floatingIslandBossAssets ─

const LYOKO_PUBLIC = '/models/biomes/ethereal/lyoko_mountain_sector.glb';
const SPIRAL_PUBLIC = '/models/biomes/event/spiral_mountain_reimagined.glb';
const LYOKO_CDN =
  'https://assets.grudge-studio.com/models/biomes/ethereal/lyoko_mountain_sector.glb';
const SPIRAL_CDN =
  'https://assets.grudge-studio.com/models/biomes/event/spiral_mountain_reimagined.glb';

export const VOLCANIC_CLIMB_ASSET_PATHS = {
  volcanicNature: '/models/nature/stylized/biome/volcanicnature.glb',
  volcanicRocks: '/models/nature/stylized/rocks/volcanic_rocks.glb',
  lyoko: LYOKO_PUBLIC,
  spiralMountain: SPIRAL_PUBLIC,
} as const;

export const VOLCANIC_CLIMB_CDN_PATHS = {
  volcanicNature:
    'https://assets.grudge-studio.com/models/nature/stylized/biome/volcanicnature.glb',
  volcanicRocks:
    'https://assets.grudge-studio.com/models/nature/stylized/rocks/volcanic_rocks.glb',
  lyoko: LYOKO_CDN,
  spiralMountain: SPIRAL_CDN,
} as const;

export const VOLCANIC_CLIMB_LOAD_ORDER = {
  volcanicNature: [
    VOLCANIC_CLIMB_CDN_PATHS.volcanicNature,
    VOLCANIC_CLIMB_ASSET_PATHS.volcanicNature,
  ],
  volcanicRocks: [
    VOLCANIC_CLIMB_CDN_PATHS.volcanicRocks,
    VOLCANIC_CLIMB_ASSET_PATHS.volcanicRocks,
  ],
  lyoko: [LYOKO_CDN, LYOKO_PUBLIC],
  spiralMountain: [SPIRAL_CDN, SPIRAL_PUBLIC],
} as const;

// ── Config ───────────────────────────────────────────────────────────────────

export type VolcanicClimbPlatformKind =
  | 'rock_shelf'
  | 'island_shelf'
  | 'large_rock'
  | 'summit_plate'
  | 'event_pad';

export interface VolcanicClimbConfig {
  id: string;
  name: string;
  /** Sectors that host the infinite climb tower */
  sectors: string[];
  /** Primary host (play URL / launcher default) */
  primarySector: string;
  /** World XZ offset of tower origin (m) — avoids EventIsland clash on ashen */
  originOffsetBySector: Record<string, { x: number; z: number }>;
  floorStepM: number;
  /** Base height above water for floor 0 (m) */
  baseHeightAboveWaterM: number;
  spiralRadiusM: number;
  platformExtentM: number;
  largeRockExtentM: number;
  liveWindowFloors: number;
  summitEveryFloors: number;
  eventEveryFloors: number;
  seedSalt: string;
  maxWorldY: number;
  bobAmp: number;
  bobHz: number;
  /** Raycast max Y for platform ground samples */
  groundSampleMaxY: number;
}

export const VOLCANIC_CLIMB: VolcanicClimbConfig = {
  id: 'volcanic_infinite_climb',
  name: 'Ember Spire Climb',
  primarySector: 'ember_depths',
  sectors: ['ember_depths', 'ashen_wastes'],
  originOffsetBySector: {
    // Caldera center — climb is the feature piece
    ember_depths: { x: 0, z: 0 },
    // Ash plains: push tower NE so spiral EventIsland keeps SE/W space
    ashen_wastes: { x: 95, z: -70 },
  },
  floorStepM: 7.5,
  baseHeightAboveWaterM: 6,
  spiralRadiusM: 18,
  platformExtentM: 9,
  largeRockExtentM: 14,
  liveWindowFloors: 28,
  summitEveryFloors: 12,
  eventEveryFloors: 6,
  seedSalt: 'ember-spire-v1',
  maxWorldY: 2200,
  bobAmp: 0.35,
  bobHz: 0.12,
  groundSampleMaxY: 2800,
};

export function isVolcanicClimbSector(sectorId: string): boolean {
  return VOLCANIC_CLIMB.sectors.includes(sectorId);
}

export function volcanicClimbOrigin(
  sectorId: string,
  cfg: VolcanicClimbConfig = VOLCANIC_CLIMB,
): { x: number; z: number } {
  return cfg.originOffsetBySector[sectorId] ?? { x: 0, z: 0 };
}

/** Absolute platform base Y (no bob). */
export function volcanicClimbFloorBaseY(
  floor: number,
  waterLevel: number,
  cfg: VolcanicClimbConfig = VOLCANIC_CLIMB,
): number {
  return waterLevel + cfg.baseHeightAboveWaterM + floor * cfg.floorStepM;
}

/** Player spawn feet Y on floor 0 (+ walk disk half). */
export function volcanicClimbSpawnY(
  waterLevel: number,
  cfg: VolcanicClimbConfig = VOLCANIC_CLIMB,
): number {
  return volcanicClimbFloorBaseY(0, waterLevel, cfg) + 0.25;
}

// ── Layout (deterministic) ───────────────────────────────────────────────────

export function volcanicClimbRng(floor: number, salt = VOLCANIC_CLIMB.seedSalt): () => number {
  let h = 2166136261 >>> 0;
  const s = `${salt}:${floor}`;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface VolcanicClimbFloorLayout {
  x: number;
  z: number;
  kind: VolcanicClimbPlatformKind;
  scale: number;
  yaw: number;
  isSummit: boolean;
  isEvent: boolean;
}

/**
 * Layout one climb floor relative to tower origin.
 * Apply volcanicClimbOrigin(sector) when placing in world.
 */
export function layoutVolcanicClimbFloor(
  floor: number,
  cfg: VolcanicClimbConfig = VOLCANIC_CLIMB,
): VolcanicClimbFloorLayout {
  const rng = volcanicClimbRng(floor, cfg.seedSalt);
  const ang = floor * 0.85 + rng() * 0.4;
  const radius =
    cfg.spiralRadiusM * (0.55 + (floor % 5) * 0.08) + (rng() - 0.5) * 6;
  const x = Math.cos(ang) * radius + (rng() - 0.5) * 3;
  const z = Math.sin(ang) * radius + (rng() - 0.5) * 3;
  const isSummit = floor > 0 && floor % cfg.summitEveryFloors === 0;
  const isEvent = floor > 0 && floor % cfg.eventEveryFloors === 0 && !isSummit;

  let kind: VolcanicClimbPlatformKind = 'rock_shelf';
  if (isSummit) kind = 'summit_plate';
  else if (isEvent) kind = 'event_pad';
  else if (floor % 4 === 0) kind = 'large_rock';
  else if (floor % 3 === 0) kind = 'island_shelf';
  else kind = 'rock_shelf';

  const scale =
    kind === 'large_rock' || kind === 'summit_plate'
      ? 1.15 + rng() * 0.25
      : 0.75 + rng() * 0.45;

  return {
    x,
    z,
    kind,
    scale,
    yaw: ang + rng() * 0.8,
    isSummit,
    isEvent,
  };
}

// ── Summit chest loot ────────────────────────────────────────────────────────

export interface ClimbLootEntry {
  itemId: string;
  name: string;
  qtyMin: number;
  qtyMax: number;
  /** 0–1 chance this entry rolls */
  chance: number;
}

export interface ClimbLootGrant {
  itemId: string;
  name: string;
  qty: number;
}

/** Tier by summit index (floor / summitEvery). */
export const VOLCANIC_CLIMB_LOOT_TIERS: Record<number, ClimbLootEntry[]> = {
  // First summit (~floor 12)
  1: [
    { itemId: 'ember_shard', name: 'Ember Shard', qtyMin: 2, qtyMax: 5, chance: 1 },
    { itemId: 'volcanic_ash', name: 'Volcanic Ash', qtyMin: 3, qtyMax: 8, chance: 0.85 },
    { itemId: 'copper_ore', name: 'Copper Ore', qtyMin: 1, qtyMax: 4, chance: 0.7 },
  ],
  // Mid
  2: [
    { itemId: 'ember_shard', name: 'Ember Shard', qtyMin: 4, qtyMax: 9, chance: 1 },
    { itemId: 'obsidian_flake', name: 'Obsidian Flake', qtyMin: 1, qtyMax: 3, chance: 0.75 },
    { itemId: 'iron_ore', name: 'Iron Ore', qtyMin: 2, qtyMax: 5, chance: 0.8 },
    { itemId: 'gold_coin', name: 'Gold Coin', qtyMin: 5, qtyMax: 20, chance: 0.9 },
  ],
  // High
  3: [
    { itemId: 'molten_core', name: 'Molten Core', qtyMin: 1, qtyMax: 2, chance: 1 },
    { itemId: 'obsidian_flake', name: 'Obsidian Flake', qtyMin: 2, qtyMax: 6, chance: 0.9 },
    { itemId: 'gold_coin', name: 'Gold Coin', qtyMin: 15, qtyMax: 40, chance: 1 },
    { itemId: 'ember_relic_fragment', name: 'Ember Relic Fragment', qtyMin: 1, qtyMax: 1, chance: 0.35 },
  ],
};

const LOOT_FALLBACK: ClimbLootEntry[] = [
  { itemId: 'molten_core', name: 'Molten Core', qtyMin: 1, qtyMax: 3, chance: 1 },
  { itemId: 'ember_relic_fragment', name: 'Ember Relic Fragment', qtyMin: 1, qtyMax: 2, chance: 0.55 },
  { itemId: 'gold_coin', name: 'Gold Coin', qtyMin: 25, qtyMax: 60, chance: 1 },
];

export function summitTierFromFloor(
  floor: number,
  cfg: VolcanicClimbConfig = VOLCANIC_CLIMB,
): number {
  if (floor <= 0) return 0;
  return Math.max(1, Math.floor(floor / cfg.summitEveryFloors));
}

/** Deterministic loot roll for a summit floor (same floor → same grants). */
export function rollSummitChestLoot(
  floor: number,
  cfg: VolcanicClimbConfig = VOLCANIC_CLIMB,
): ClimbLootGrant[] {
  const tier = summitTierFromFloor(floor, cfg);
  const table =
    VOLCANIC_CLIMB_LOOT_TIERS[Math.min(tier, 3)] ??
    (tier > 3 ? LOOT_FALLBACK : VOLCANIC_CLIMB_LOOT_TIERS[1]!);
  const rng = volcanicClimbRng(floor, `${cfg.seedSalt}:loot`);
  const grants: ClimbLootGrant[] = [];
  for (const e of table) {
    if (rng() > e.chance) continue;
    const span = Math.max(0, e.qtyMax - e.qtyMin);
    const qty = e.qtyMin + Math.floor(rng() * (span + 1));
    if (qty > 0) grants.push({ itemId: e.itemId, name: e.name, qty });
  }
  if (!grants.length) {
    grants.push({ itemId: 'ember_shard', name: 'Ember Shard', qty: 1 });
  }
  return grants;
}

/** Play path for launcher / deploy map (uses /play zone mode). */
export function volcanicClimbPlayPath(sectorId?: string): string {
  const sector = sectorId && isVolcanicClimbSector(sectorId)
    ? sectorId
    : VOLCANIC_CLIMB.primarySector;
  return `/play?sector=${sector}&mode=zone&worldSeed=grudge-world-1&feature=ember_spire`;
}

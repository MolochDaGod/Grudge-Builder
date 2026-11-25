/**
 * Floating islands, event islands, and boss-room instance assets.
 *
 * Lyoko mountain sector → Ethereal Falls stacked floating islands (2 variants each)
 * Spiral mountain reimagined → event island sink/raise + boss instances (strip skybox)
 * Hoth boss room → frozen biome / event portal / random dungeon instance
 * Deep woods → thornwood / forest dungeon instance
 * Desert boss island → ashen wastes desert boss instance
 * Lava arena → ember volcanic boss instance
 * Iceland scene → frozen + near-frozen zones
 *
 * Sources (author machine):
 *   D:\Games\Models\lyoko_mountain_sector (1).glb
 *   D:\Games\Models\spiral_mountain_reimagined.glb
 *   D:\Games\Models\hoth_boss_room_low_poly.glb
 *   D:\Games\Models\iceland_scene_for_canimatic.glb
 *   D:\Games\Models\scary_forest.glb
 *   D:\Games\Models\bossinstanceisland.glb
 *   D:\Games\Models\low_poly_lava_fighting_arenastage.glb
 *   D:\Games\Models\scene (5).glb — lava Caesar arena (Outer lava + rock platforms)
 *   D:\Games\Models\dark_slayer_caesar_arena_of_valor.glb (lava Caesar, fire recolor)
 */

/** Same-origin public paths (dev / Vercel when committed). */
export const FLOATING_ISLAND_ASSET_PATHS = {
  lyoko: '/models/biomes/ethereal/lyoko_mountain_sector.glb',
  spiralMountain: '/models/biomes/event/spiral_mountain_reimagined.glb',
  hothBossRoom: '/models/biomes/frozen/hoth_boss_room_low_poly.glb',
  iceland: '/models/biomes/cold/iceland_scene_for_canimatic.glb',
  deepWoods: '/models/biomes/forest/scary_forest.glb',
  desertBossIsland: '/models/biomes/desert/bossinstanceisland.glb',
  volcanicBossArena: '/models/biomes/volcanic/lava_caesar_arena.glb',
} as const;

/** R2 CDN (assets.grudge-studio.com) — production SSOT for large GLBs. */
export const FLOATING_ISLAND_CDN_PATHS = {
  lyoko:
    'https://assets.grudge-studio.com/models/biomes/ethereal/lyoko_mountain_sector.glb',
  spiralMountain:
    'https://assets.grudge-studio.com/models/biomes/event/spiral_mountain_reimagined.glb',
  hothBossRoom:
    'https://assets.grudge-studio.com/models/biomes/frozen/hoth_boss_room_low_poly.glb',
  iceland:
    'https://assets.grudge-studio.com/models/biomes/cold/iceland_scene_for_canimatic.glb',
  deepWoods:
    'https://assets.grudge-studio.com/models/biomes/forest/scary_forest.glb',
  desertBossIsland:
    'https://assets.grudge-studio.com/models/biomes/desert/bossinstanceisland.glb',
  volcanicBossArena:
    'https://assets.grudge-studio.com/models/biomes/volcanic/lava_caesar_arena.glb',
} as const;

/** Load order: CDN first for large packs, then same-origin. */
export const FLOATING_ISLAND_LOAD_ORDER = {
  lyoko: [FLOATING_ISLAND_CDN_PATHS.lyoko, FLOATING_ISLAND_ASSET_PATHS.lyoko],
  spiralMountain: [
    FLOATING_ISLAND_CDN_PATHS.spiralMountain,
    FLOATING_ISLAND_ASSET_PATHS.spiralMountain,
  ],
  hothBossRoom: [
    FLOATING_ISLAND_CDN_PATHS.hothBossRoom,
    FLOATING_ISLAND_ASSET_PATHS.hothBossRoom,
  ],
  iceland: [FLOATING_ISLAND_CDN_PATHS.iceland, FLOATING_ISLAND_ASSET_PATHS.iceland],
  deepWoods: [FLOATING_ISLAND_CDN_PATHS.deepWoods, FLOATING_ISLAND_ASSET_PATHS.deepWoods],
  desertBossIsland: [
    FLOATING_ISLAND_CDN_PATHS.desertBossIsland,
    FLOATING_ISLAND_ASSET_PATHS.desertBossIsland,
  ],
  volcanicBossArena: [
    FLOATING_ISLAND_CDN_PATHS.volcanicBossArena,
    FLOATING_ISLAND_ASSET_PATHS.volcanicBossArena,
  ],
} as const;

export const FLOATING_ISLAND_SOURCE_PATHS = {
  lyoko: 'D:\\Games\\Models\\lyoko_mountain_sector (1).glb',
  spiralMountain: 'D:\\Games\\Models\\spiral_mountain_reimagined.glb',
  hothBossRoom: 'D:\\Games\\Models\\hoth_boss_room_low_poly.glb',
  iceland: 'D:\\Games\\Models\\iceland_scene_for_canimatic.glb',
  deepWoods: 'D:\\Games\\Models\\scary_forest.glb',
  desertBossIsland: 'D:\\Games\\Models\\bossinstanceisland.glb',
  volcanicBossArena: 'D:\\Games\\Models\\scene (5).glb',
} as const;

// ── Lyoko ethereal floating islands ──────────────────────────────────────────

/** Two visual uses of each floating island mesh (scale + tint + material treatment). */
export interface FloatingIslandVariant {
  id: string;
  label: string;
  scale: number;
  /** Multiply mesh materials (emissive-friendly ethereal tints) */
  color: number;
  emissive: number;
  emissiveIntensity: number;
  metalness: number;
  roughness: number;
  /** Vertical stack offset (m) relative to base float Y */
  stackOffsetY: number;
  /** Orbit / bob phase offset (radians) */
  phase: number;
}

/**
 * Best practice: each Lyoko island mesh is instanced twice —
 * A = large cool cyan shelf, B = small magenta crystal shelf.
 */
export const LYOKO_ISLAND_VARIANTS: FloatingIslandVariant[] = [
  {
    id: 'lyoko_a_cyan_shelf',
    label: 'Cyan shelf (large)',
    scale: 1.0,
    color: 0xa8e6ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.35,
    metalness: 0.25,
    roughness: 0.55,
    stackOffsetY: 0,
    phase: 0,
  },
  {
    id: 'lyoko_b_violet_shard',
    label: 'Violet shard (small)',
    scale: 0.55,
    color: 0xd8b4fe,
    emissive: 0xbf40ff,
    emissiveIntensity: 0.55,
    metalness: 0.4,
    roughness: 0.35,
    stackOffsetY: 18,
    phase: Math.PI * 0.65,
  },
];

export interface EtherealFloatSteerConfig {
  /** Horizontal orbit radius (m) */
  orbitRadius: number;
  /** Orbit angular speed (rad/s) — colorful “upstream” steer feel */
  orbitSpeed: number;
  /** Vertical bob amplitude (m) */
  bobAmp: number;
  /** Bob frequency (Hz) */
  bobHz: number;
  /** Lateral weave amplitude (m) — flying-mount style bank */
  weaveAmp: number;
  /** Drift toward Cosmic Waterfall tip when in destruction half */
  tipDrift: number;
  /** Max stack layers using Lyoko variants (A/B pairs) */
  stackPairs: number;
}

export const ETHEREAL_FLOAT_STEER: EtherealFloatSteerConfig = {
  orbitRadius: 42,
  orbitSpeed: 0.12,
  bobAmp: 3.5,
  bobHz: 0.18,
  weaveAmp: 8,
  tipDrift: 0.35,
  stackPairs: 4,
};

// ── Spiral mountain event islands ────────────────────────────────────────────

export type EventIslandBiome = 'mountain' | 'plains' | 'ethereal' | 'forest';

export interface EventIslandNpcConfig {
  id: string;
  name: string;
  glbPath: string;
  /** Strip sky/background spheres from GLB on load */
  stripSkybox: boolean;
  biomes: EventIslandBiome[];
  sectors: string[];
  /** Target height of mountain mesh (m) */
  targetHeightM: number;
  sinkDepthM: number;
  raiseHeightM: number;
  cycleSeconds: number;
  bossIds: string[];
  npcRoles: string[];
}

/**
 * Spiral mountain — **mountain + plains biomes only** (not frozen / ethereal / storm).
 *
 * | Sector            | Why |
 * |-------------------|-----|
 * | thornwood_wilds   | Mountain forest / highland (mountain) |
 * | haven_shore       | Coastal plains / starter flats (plains) |
 * | ashen_wastes      | Open desert plains (plains) |
 *
 * Frozen → Iceland plate. Ethereal → Lyoko floats. Do not mix.
 */
export const SPIRAL_MOUNTAIN_EVENT: EventIslandNpcConfig = {
  id: 'spiral_mountain_event',
  name: 'Spiral Mountain Event Island',
  glbPath: FLOATING_ISLAND_ASSET_PATHS.spiralMountain,
  stripSkybox: true,
  biomes: ['mountain', 'plains'],
  sectors: [
    'thornwood_wilds', // mountain / canopy highlands
    'haven_shore', // plains / trade coast flats
    'ashen_wastes', // desert plains
  ],
  targetHeightM: 120,
  sinkDepthM: 45,
  raiseHeightM: 28,
  cycleSeconds: 180,
  bossIds: [
    'spiral_warden',
    'spiral_sky_reaper',
    'plains_colossus',
  ],
  npcRoles: [
    'event_scout',
    'refuge_villager',
    'mountain_guide',
    'plains_ranger',
  ],
};

// ── Hoth boss room (frozen instance) ─────────────────────────────────────────

export type BossRoomEntrySource =
  | 'event_island_portal'
  | 'mountain_biome_portal'
  | 'frozen_biome_portal'
  | 'random_dungeon_portal';

export type BossRoomLoadKey = keyof typeof FLOATING_ISLAND_LOAD_ORDER;

export interface BossRoomInstanceDef {
  id: string;
  name: string;
  glbPath: string;
  loadKey: BossRoomLoadKey;
  /** Biomes that may open this room via portal */
  biomes: string[];
  sectors: string[];
  entrySources: BossRoomEntrySource[];
  minLevel: number;
  bossIds: string[];
  stripSkybox: boolean;
  targetExtentM: number;
}

export const HOTH_BOSS_ROOM: BossRoomInstanceDef = {
  id: 'hoth_boss_room',
  name: 'Hoth Ice Boss Chamber',
  glbPath: FLOATING_ISLAND_ASSET_PATHS.hothBossRoom,
  loadKey: 'hothBossRoom',
  biomes: ['frozen', 'storm', 'ethereal'],
  sectors: [
    'frostbite_expanse',
    'stormbreak_reef',
    'ethereal_falls',
    'abyssal_trench',
  ],
  entrySources: [
    'event_island_portal',
    'mountain_biome_portal',
    'frozen_biome_portal',
    'random_dungeon_portal',
  ],
  minLevel: 12,
  bossIds: ['hoth_ice_wraith', 'hoth_frost_titan', 'hoth_pack_leader'],
  stripSkybox: true,
  targetExtentM: 48,
};

/** Deep woods dungeon instance — thornwood / forest portals. */
export const DEEP_WOODS_BOSS_ROOM: BossRoomInstanceDef = {
  id: 'deep_woods_instance',
  name: 'Deep Woods Instance',
  glbPath: FLOATING_ISLAND_ASSET_PATHS.deepWoods,
  loadKey: 'deepWoods',
  biomes: ['forest'],
  sectors: ['thornwood_wilds'],
  entrySources: ['event_island_portal', 'random_dungeon_portal'],
  minLevel: 8,
  bossIds: ['thorn_beast', 'monsters_x', 'free_reptile'],
  stripSkybox: true,
  targetExtentM: 56,
};

/** Desert boss island — ashen wastes dungeon / desert bosses. */
export const DESERT_BOSS_ISLAND: BossRoomInstanceDef = {
  id: 'desert_boss_island',
  name: 'Desert Boss Island',
  glbPath: FLOATING_ISLAND_ASSET_PATHS.desertBossIsland,
  loadKey: 'desertBossIsland',
  biomes: ['desert'],
  sectors: ['ashen_wastes'],
  entrySources: ['event_island_portal', 'random_dungeon_portal'],
  minLevel: 10,
  bossIds: ['drake', 'horned_lizard', 'fire_beetle'],
  stripSkybox: true,
  targetExtentM: 72,
};

/** Lava fighting arena — ember volcanic bosses. */
export const VOLCANIC_BOSS_ARENA: BossRoomInstanceDef = {
  id: 'volcanic_boss_arena',
  name: 'Volcanic Boss Arena',
  glbPath: FLOATING_ISLAND_ASSET_PATHS.volcanicBossArena,
  loadKey: 'volcanicBossArena',
  biomes: ['volcanic'],
  sectors: ['ember_depths'],
  entrySources: ['event_island_portal', 'random_dungeon_portal', 'mountain_biome_portal'],
  minLevel: 14,
  bossIds: ['lava_caesar_slayer', 'lava_golem', 'ifrit', 'drake'],
  stripSkybox: true,
  targetExtentM: 52,
};

export const BOSS_ROOM_INSTANCES: BossRoomInstanceDef[] = [
  HOTH_BOSS_ROOM,
  DEEP_WOODS_BOSS_ROOM,
  DESERT_BOSS_ISLAND,
  VOLCANIC_BOSS_ARENA,
];

export function getBossRoomInstance(id: string): BossRoomInstanceDef | null {
  return BOSS_ROOM_INSTANCES.find((r) => r.id === id) ?? null;
}

/**
 * Pick a Hoth-style instance map for a sector / dungeon name.
 * Name tokens win (ice / woods / desert / lava), then sector ownership.
 */
export function pickBossRoomInstance(opts: {
  sectorId?: string;
  dungeonId?: string;
  dungeonName?: string;
}): BossRoomInstanceDef | null {
  const blob = `${opts.dungeonId || ''} ${opts.dungeonName || ''}`.toLowerCase();
  if (/ice|frost|hoth|frozen|cold|snow/.test(blob)) return HOTH_BOSS_ROOM;
  if (/lava|volcan|ember|magma|fire.?boss|ash.?spire/.test(blob)) return VOLCANIC_BOSS_ARENA;
  if (/desert|dune|sand|ashen|waste/.test(blob)) return DESERT_BOSS_ISLAND;
  if (/wood|forest|thorn|grove|jungle|deep.?wood/.test(blob)) return DEEP_WOODS_BOSS_ROOM;
  const sector = opts.sectorId || '';
  if (!sector) return null;
  return BOSS_ROOM_INSTANCES.find((r) => r.sectors.includes(sector)) ?? null;
}

export function isBossInstanceSector(sectorId: string): boolean {
  return BOSS_ROOM_INSTANCES.some((r) => r.sectors.includes(sectorId));
}

// ── Iceland scene — frozen biome SSOT (+ cold-adjacent only) ─────────────────

/**
 * Iceland cinematic plate — **frozen biome home**, plus western cold shelf.
 *
 * | Sector              | Role |
 * |---------------------|------|
 * | frostbite_expanse   | Primary frozen (full plate) |
 * | stormbreak_reef     | Near-frozen cold-storm shelf (W of north ice) |
 *
 * Not ethereal (Lyoko), not abyssal deep, not spiral mountain plains.
 */
export const ICELAND_SCENE_PLACEMENT = {
  id: 'iceland_cinematic_scene',
  glbPath: FLOATING_ISLAND_ASSET_PATHS.iceland,
  /** Full freeze sectors (biome: frozen) */
  frozenSectors: ['frostbite_expanse'] as const,
  /** Adjacent cold-storm shelf only (not ethereal / abyssal) */
  nearFrozenSectors: ['stormbreak_reef'] as const,
  targetExtentM: 90,
  stripSkybox: false,
};

export function isHothEligibleSector(sectorId: string): boolean {
  return HOTH_BOSS_ROOM.sectors.includes(sectorId);
}

export function isSpiralEventSector(sectorId: string): boolean {
  return SPIRAL_MOUNTAIN_EVENT.sectors.includes(sectorId);
}

export function isIcelandSector(sectorId: string): boolean {
  return (
    (ICELAND_SCENE_PLACEMENT.frozenSectors as readonly string[]).includes(sectorId) ||
    (ICELAND_SCENE_PLACEMENT.nearFrozenSectors as readonly string[]).includes(sectorId)
  );
}

/**
 * Volcanic climb SSOT lives in `./volcanicClimb` (layout, loot, sector offsets).
 * Re-export here so older `floatingIslandBossAssets` imports keep working.
 */
export {
  VOLCANIC_CLIMB,
  VOLCANIC_CLIMB_ASSET_PATHS,
  VOLCANIC_CLIMB_CDN_PATHS,
  VOLCANIC_CLIMB_LOAD_ORDER,
  VOLCANIC_CLIMB_LOOT_TIERS,
  isVolcanicClimbSector,
  volcanicClimbRng,
  layoutVolcanicClimbFloor,
  volcanicClimbOrigin,
  volcanicClimbFloorBaseY,
  volcanicClimbSpawnY,
  rollSummitChestLoot,
  summitTierFromFloor,
  volcanicClimbPlayPath,
} from './volcanicClimb';
export type {
  VolcanicClimbConfig,
  VolcanicClimbPlatformKind,
  VolcanicClimbFloorLayout,
  ClimbLootEntry,
  ClimbLootGrant,
} from './volcanicClimb';

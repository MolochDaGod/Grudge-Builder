/**
 * Floating islands, event islands, and boss-room instance assets.
 *
 * Lyoko mountain sector → Ethereal Falls stacked floating islands (2 variants each)
 * Spiral mountain reimagined → event island sink/raise + boss instances (strip skybox)
 * Hoth boss room → frozen biome / event portal / random dungeon instance
 * Iceland scene → frozen + near-frozen zones
 *
 * Sources (author machine):
 *   D:\Games\Models\lyoko_mountain_sector (1).glb
 *   D:\Games\Models\spiral_mountain_reimagined.glb
 *   D:\Games\Models\hoth_boss_room_low_poly.glb
 *   D:\Games\Models\iceland_scene_for_canimatic.glb
 */

export const FLOATING_ISLAND_ASSET_PATHS = {
  lyoko: '/models/biomes/ethereal/lyoko_mountain_sector.glb',
  spiralMountain: '/models/biomes/event/spiral_mountain_reimagined.glb',
  hothBossRoom: '/models/biomes/frozen/hoth_boss_room_low_poly.glb',
  iceland: '/models/biomes/cold/iceland_scene_for_canimatic.glb',
} as const;

export const FLOATING_ISLAND_SOURCE_PATHS = {
  lyoko: 'D:\\Games\\Models\\lyoko_mountain_sector (1).glb',
  spiralMountain: 'D:\\Games\\Models\\spiral_mountain_reimagined.glb',
  hothBossRoom: 'D:\\Games\\Models\\hoth_boss_room_low_poly.glb',
  iceland: 'D:\\Games\\Models\\iceland_scene_for_canimatic.glb',
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

export const SPIRAL_MOUNTAIN_EVENT: EventIslandNpcConfig = {
  id: 'spiral_mountain_event',
  name: 'Spiral Mountain Event Island',
  glbPath: FLOATING_ISLAND_ASSET_PATHS.spiralMountain,
  stripSkybox: true,
  biomes: ['mountain', 'plains'],
  sectors: [
    'thornwood_wilds',
    'frostbite_expanse',
    'haven_shore',
    'stormbreak_reef',
    'ethereal_falls',
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

export interface BossRoomInstanceDef {
  id: string;
  name: string;
  glbPath: string;
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

// ── Iceland scene (frozen + near-frozen) ─────────────────────────────────────

export const ICELAND_SCENE_PLACEMENT = {
  id: 'iceland_cinematic_scene',
  glbPath: FLOATING_ISLAND_ASSET_PATHS.iceland,
  /** Full freeze sectors */
  frozenSectors: ['frostbite_expanse'] as const,
  /** Near-frozen western cold band */
  nearFrozenSectors: [
    'stormbreak_reef',
    'ethereal_falls',
    'abyssal_trench',
  ] as const,
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

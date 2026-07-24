/**
 * World Map Sectors — 9 named macro-regions dividing the 100×100 world grid.
 *
 * Layout (3×3) — geographic logic:
 *   ┌─────────────┬─────────────┬─────────────┐
 *   │ Ethereal    │ Frostbite   │ Thornwood   │
 *   │ Falls       │ Expanse     │ Wilds       │
 *   ├─────────────┼─────────────┼─────────────┤
 *   │ Stormbreak  │ Convergence │ Ashen       │
 *   │ Reef        │ Nexus       │ Wastes      │
 *   ├─────────────┼─────────────┼─────────────┤
 *   │ Abyssal     │ Haven       │ Ember       │
 *   │ Trench      │ Shore       │ Depths      │
 *   └─────────────┴─────────────┴─────────────┘
 *
 * Top-left:     Ethereal Falls — remote magical corner, the First God's tears
 * Top-center:   Frostbite Expanse — frozen northern shelf
 * Top-right:    Thornwood Wilds — ancient forest, Worge territory
 * Mid-left:     Stormbreak Reef — perpetual storms between magic and the deep
 * Center:       Convergence Nexus — where all factions clash
 * Mid-right:    Ashen Wastes — scorched desert of glass and bone
 * Bottom-left:  Abyssal Trench — the deepest waters, leviathans
 * Bottom-center: Haven Shore — safe starting zone, calm tropical waters
 * Bottom-right: Ember Depths — volcanic, where the Legion was born
 */

import { ZONE_DEFAULT_SIZE_METERS } from './zoneLayout';

export { ZONE_DEFAULT_SIZE_METERS };

// ── Sector Type ──────────────────────────────────────────────────────────────

// ── 3D Terrain Configuration ─────────────────────────────────────────────────

export interface ZoneTerrain3DConfig {
  /** World-space size in meters (each axis). Default 10000 = 10 km × 10 km */
  sizeMeters: number;
  /** Heightmap grid resolution per axis (vertices = segments + 1) */
  segments: number;
  /** Minimum terrain height (m). Negative = underwater canyons. */
  minHeight: number;
  /** Maximum terrain height (m). Peaks, cliffs, floating islands. */
  maxHeight: number;
  /** Sea/water level in meters (y-axis). 0 = default shore. */
  waterLevel: number;
  /** Number of octaves for heightmap noise (more = more detail, slower) */
  noiseOctaves: number;
  /** Frequency multiplier per octave (lacunarity) */
  noiseLacunarity: number;
  /** Amplitude multiplier per octave (persistence) — lower = smoother */
  noisePersistence: number;
  /** Base noise frequency — lower = broader terrain features */
  noiseBaseFreq: number;
  /** Biome-specific heightmap modifier key (drives per-biome generation) */
  heightmapModifier: string;
  /** Sky color (hex) for the zone skybox */
  skyColor: number;
  /** Fog color + density */
  fog: { color: number; density: number };
  /** Ambient light intensity (0-1) */
  ambientIntensity: number;
  /** Sun (directional) light intensity */
  sunIntensity: number;
  /** Sun direction [x, y, z] normalized */
  sunDirection: [number, number, number];
  /** Maximum concurrent players per zone instance */
  maxPlayers: number;
  /** Spawn point(s) — world-space [x, y, z] */
  spawnPoints: [number, number, number][];
}

// ── Sector Imagery ───────────────────────────────────────────────────────────

export interface SectorImagery {
  /** Background image URL rendered behind tiles when the sector is discovered */
  backgroundUrl: string;
  /** Thumbnail used in sector list panels and minimap tooltips */
  thumbnailUrl: string;
  /** Optional looping video background (overrides backgroundUrl when playing) */
  videoUrl?: string;
  /** Canvas overlay FX key — drives animated particle/mist effects */
  overlayFx?: SectorOverlayFx[];
}

export interface SectorOverlayFx {
  type: 'waterfall_streams' | 'spectral_mist' | 'floating_islands' | 'phantom_wisps'
      | 'snowfall' | 'rain_heavy' | 'ember_rain' | 'lightning_flashes'
      | 'energy_vortex' | 'bioluminescence' | 'dust_swirl' | 'gentle_waves'
      | 'fireflies' | 'aurora';
  /** Intensity 0-1 */
  intensity: number;
  /** Primary FX color (hex) */
  color: string;
  /** Secondary FX color (hex, optional) */
  color2?: string;
}

export interface WorldSector {
  id: string;
  name: string;
  /** Brief in-game description shown to player */
  description: string;
  /** Lore flavor text */
  lore: string;
  /** Biome tag for procedural generation */
  biome: 'frozen' | 'storm' | 'forest' | 'desert' | 'ethereal' | 'volcanic' | 'abyssal' | 'nexus' | 'tropical';
  /** PBR ground material id (Ground_1–10 set) — see island3d/terrain/GroundPBRTextures.ts */
  groundPBR?: string;
  /** PvE difficulty floor (1-10) */
  difficultyMin: number;
  /** PvE difficulty ceiling */
  difficultyMax: number;
  /** Grid bounds (inclusive) in the 100×100 world */
  bounds: { x0: number; y0: number; x1: number; y1: number };
  /** Primary color palette [deep, mid, accent] */
  colors: { deep: string; mid: string; accent: string; glow?: string };
  /** Environmental hazards */
  hazards: string[];
  /** Ambient visual effects rendered over the sector */
  ambientFx: string[];
  /** Resource themes available */
  resources: string[];
  /** Whether this sector is the safe starting zone */
  isSafeZone?: boolean;
  /** Whether this is the contested endgame center */
  isContested?: boolean;
  /** Full 3D zone terrain + multiplayer configuration */
  terrain3d: ZoneTerrain3DConfig;
  /** Sector visual imagery — backgrounds, videos, overlay FX */
  imagery: SectorImagery;
}

// ── Sector Grid Layout ───────────────────────────────────────────────────────

const SECTOR_SIZE = 34; // ~33 tiles per sector, last sector absorbs remainder
const ZONE_SIZE = ZONE_DEFAULT_SIZE_METERS;
const ZONE_SEGMENTS = 255; // 256×256 vertex grid (good LOD balance)
const ZONE_MAX_PLAYERS = 64; // default concurrent players

/** Build a default terrain3d config, overridden per-biome below */
function defaultTerrain3d(overrides: Partial<ZoneTerrain3DConfig> = {}): ZoneTerrain3DConfig {
  return {
    sizeMeters: ZONE_SIZE,
    segments: ZONE_SEGMENTS,
    minHeight: -40,
    maxHeight: 120,
    waterLevel: 0,
    noiseOctaves: 5,
    noiseLacunarity: 2.0,
    noisePersistence: 0.45,
    noiseBaseFreq: 0.0008,
    heightmapModifier: 'default',
    skyColor: 0x87ceeb,
    fog: { color: 0x87ceeb, density: 0.00025 },
    ambientIntensity: 0.6,
    sunIntensity: 1.2,
    sunDirection: [0.4, 0.8, 0.3],
    maxPlayers: ZONE_MAX_PLAYERS,
    spawnPoints: [[0, 10, 0]],
    ...overrides,
  };
}

function sectorBounds(col: number, row: number) {
  const x0 = col * SECTOR_SIZE;
  const y0 = row * SECTOR_SIZE;
  return {
    x0,
    y0,
    x1: Math.min(x0 + SECTOR_SIZE - 1, 99),
    y1: Math.min(y0 + SECTOR_SIZE - 1, 99),
  };
}

// ── The 9 Sectors ────────────────────────────────────────────────────────────

export const WORLD_SECTORS: WorldSector[] = [
  // ── Row 0 (top) ──
  {
    id: 'frostbite_expanse',
    name: 'Frostbite Expanse',
    description: 'A frozen wasteland of endless ice sheets and howling blizzards.',
    lore: 'When the Sundering cracked the northern shelf, the sea froze in an instant, trapping ancient ships and their crews in eternal ice. Frost spirits patrol the glaciers, and the wind itself carries memories of the dead.',
    biome: 'frozen',
    groundPBR: 'ground_7',
    difficultyMin: 4,
    difficultyMax: 7,
    bounds: sectorBounds(1, 0),  // top-center
    colors: { deep: '#0a1628', mid: '#1a3a5c', accent: '#7dd3fc' },
    hazards: ['blizzard_damage', 'ice_patches', 'frostbite_dot', 'avalanche_zones'],
    ambientFx: ['snowfall', 'fog_dense', 'ice_sparkle'],
    resources: ['frost_herbs', 'ice', 'crystals', 'whale_bone', 'arctic_fish'],
    terrain3d: defaultTerrain3d({
      minHeight: -20,
      maxHeight: 180,
      waterLevel: -5,
      noisePersistence: 0.38,
      noiseBaseFreq: 0.0006,
      heightmapModifier: 'frozen_glacier',
      skyColor: 0x8899bb,
      fog: { color: 0xb0c4de, density: 0.0004 },
      ambientIntensity: 0.7,
      sunIntensity: 0.8,
      sunDirection: [0.2, 0.4, 0.5],
      spawnPoints: [[400, 20, 400], [-300, 15, 600], [800, 25, -200]],
    }),
    imagery: {
      backgroundUrl: '/backgrounds/dark-fantasy-4.png',
      thumbnailUrl: '/backgrounds/dark-fantasy-4.png',
      overlayFx: [
        { type: 'snowfall', intensity: 0.8, color: '#dbeafe' },
        { type: 'aurora', intensity: 0.3, color: '#7dd3fc', color2: '#a78bfa' },
      ],
    },
  },
  {
    id: 'stormbreak_reef',
    name: 'Stormbreak Reef',
    description:
      'Frozen mid-left shelf — sleet-storm seas and ice-rimmed reefs where Crusade cold patrols meet the Falls.',
    lore:
      'Lightning still cracks the sky, but the western mid-band freezes hard. Ice shelves and arctic scatter mark Crusade cold approaches toward Ethereal Falls. Ships ice over between thunderheads; only cold-hardened crews sail the Stormbreak ice shelf.',
    biome: 'storm',
    groundPBR: 'ground_7',
    difficultyMin: 3,
    difficultyMax: 6,
    bounds: sectorBounds(0, 1), // mid-left — western cold band
    colors: { deep: '#0a1628', mid: '#1e3a5f', accent: '#7dd3fc', glow: '#fbbf24' },
    hazards: [
      'lightning_strikes',
      'whirlpools',
      'reef_damage',
      'rogue_waves',
      'blizzard_damage',
      'ice_patches',
    ],
    ambientFx: ['rain_heavy', 'lightning_flashes', 'wave_spray', 'snowfall', 'ice_sparkle'],
    resources: ['shells', 'coral', 'rare_ore', 'storm_crystals', 'ice', 'frost_herbs'],
    terrain3d: defaultTerrain3d({
      minHeight: -80,
      maxHeight: 90,
      waterLevel: 2,
      noiseOctaves: 6,
      noisePersistence: 0.48,
      noiseBaseFreq: 0.00095,
      heightmapModifier: 'storm_reef',
      skyColor: 0x3d4f66,
      fog: { color: 0x8fa8c0, density: 0.00055 },
      ambientIntensity: 0.5,
      sunIntensity: 0.65,
      sunDirection: [0.15, 0.35, 0.55],
      spawnPoints: [[0, 10, 0], [600, 8, -400], [-400, 12, 200]],
    }),
    imagery: {
      backgroundUrl: '/backgrounds/dark-fantasy-3.png',
      thumbnailUrl: '/backgrounds/dark-fantasy-3.png',
      overlayFx: [
        { type: 'rain_heavy', intensity: 0.7, color: '#94a3b8' },
        { type: 'snowfall', intensity: 0.55, color: '#dbeafe' },
        { type: 'lightning_flashes', intensity: 0.55, color: '#fbbf24' },
      ],
    },
  },
  {
    id: 'thornwood_wilds',
    name: 'Thornwood Wilds',
    description: 'An ancient forest so dense that sunlight never reaches the floor.',
    lore: 'The Thornwood predates the factions. Its roots drink from the Worldboard itself, and its canopy hides creatures that have never seen sky. Worge clans claim dominion here, but the forest answers to no one.',
    biome: 'forest',
    groundPBR: 'ground_6',
    difficultyMin: 3,
    difficultyMax: 7,
    bounds: sectorBounds(2, 0),
    colors: { deep: '#052e16', mid: '#166534', accent: '#4ade80' },
    hazards: ['poison_thorns', 'beast_ambush', 'quicksand', 'living_vines'],
    ambientFx: ['fireflies', 'leaf_fall', 'fog_light', 'pollen_drift'],
    resources: ['hardwood', 'herbs', 'berries', 'rare_mushrooms', 'beast_hides'],
    terrain3d: defaultTerrain3d({
      minHeight: -10,
      maxHeight: 200,
      waterLevel: -2,
      noiseOctaves: 6,
      noisePersistence: 0.52,
      noiseBaseFreq: 0.0009,
      heightmapModifier: 'dense_forest',
      skyColor: 0x4a6741,
      fog: { color: 0x2d4a22, density: 0.0005 },
      ambientIntensity: 0.35,
      sunIntensity: 0.7,
      sunDirection: [0.3, 0.5, 0.2],
      spawnPoints: [[200, 15, 200], [-500, 20, 300], [700, 10, -600]],
    }),
    imagery: {
      backgroundUrl: '/images/professions/ancient_mystical_forest_with_glowing_particles.png',
      thumbnailUrl: '/images/professions/ancient_mystical_forest_with_glowing_particles.png',
      overlayFx: [
        { type: 'fireflies', intensity: 0.7, color: '#4ade80' },
      ],
    },
  },

  // ── Row 1 (middle) ──
  {
    id: 'ashen_wastes',
    name: 'Ashen Wastes',
    description: 'A scorched desert of glass and bone, ruled by ancient ruins.',
    lore: 'Before the Sundering, this was the seat of a great civilization. Now their towers rise from dunes of ash like broken teeth. Sandworms patrol the wastes, and cursed relics whisper from beneath the glass.',
    biome: 'desert',
    groundPBR: 'ground_3',
    difficultyMin: 5,
    difficultyMax: 8,
    bounds: sectorBounds(2, 1),  // mid-right
    colors: { deep: '#451a03', mid: '#92400e', accent: '#fbbf24' },
    hazards: ['heat_exhaustion', 'sandstorm', 'glass_shard_terrain', 'cursed_relics'],
    ambientFx: ['dust_swirl', 'heat_shimmer', 'sand_particles'],
    resources: ['gold_ore', 'ancient_relics', 'scorpion_venom', 'glass_shards', 'cactus'],
    terrain3d: defaultTerrain3d({
      sizeMeters: 14_000,
      minHeight: -15,
      maxHeight: 100,
      waterLevel: -10,
      noisePersistence: 0.35,
      noiseBaseFreq: 0.0005,
      heightmapModifier: 'desert_dunes',
      skyColor: 0xd4a574,
      fog: { color: 0xc4956a, density: 0.00022 },
      ambientIntensity: 0.8,
      sunIntensity: 1.6,
      sunDirection: [0.5, 0.9, 0.2],
      spawnPoints: [
        [0, 5, 0],
        [-2200, 8, -1800],
        [2400, 12, 1200],
        [-900, 6, 3200],
        [1800, 10, -2800],
      ],
    }),
    imagery: {
      backgroundUrl: '/backgrounds/dark-fantasy-5.png',
      thumbnailUrl: '/backgrounds/dark-fantasy-5.png',
      overlayFx: [
        { type: 'dust_swirl', intensity: 0.6, color: '#d4a574' },
      ],
    },
  },
  {
    id: 'convergence_nexus',
    name: 'Convergence Nexus',
    description: 'The exact center of the world — where all factions converge.',
    lore: 'Every ley line, every current, every wind pattern spirals toward this point. The Gould Flame itself pulses beneath these waters. Control the Nexus, and you control the world.',
    biome: 'nexus',
    groundPBR: 'ground_10',
    difficultyMin: 7,
    difficultyMax: 10,
    bounds: sectorBounds(1, 1),
    colors: { deep: '#1e1b4b', mid: '#4338ca', accent: '#fbbf24', glow: '#c084fc' },
    hazards: ['faction_pvp', 'ley_line_surges', 'reality_tears', 'boss_spawns'],
    ambientFx: ['energy_vortex', 'aurora', 'floating_debris', 'ley_line_glow'],
    resources: ['rare_ore', 'fire_crystals', 'void_essence', 'gould_shards'],
    isContested: true,
    terrain3d: defaultTerrain3d({
      minHeight: -60,
      maxHeight: 250,
      waterLevel: 0,
      noiseOctaves: 7,
      noisePersistence: 0.48,
      noiseBaseFreq: 0.0007,
      heightmapModifier: 'nexus_leylines',
      skyColor: 0x1a0a30,
      fog: { color: 0x1e1b4b, density: 0.0002 },
      ambientIntensity: 0.5,
      sunIntensity: 0.9,
      sunDirection: [0.0, 1.0, 0.0],
      maxPlayers: 128,
      spawnPoints: [
        [500, 20, 500], [-500, 20, 500], [500, 20, -500], [-500, 20, -500],
        [0, 30, 800], [0, 30, -800], [800, 30, 0], [-800, 30, 0],
      ],
    }),
    imagery: {
      backgroundUrl: '/images/professions/cosmic_arcane_void_magic_background.png',
      thumbnailUrl: '/images/professions/cosmic_arcane_void_magic_background.png',
      overlayFx: [
        { type: 'energy_vortex', intensity: 0.8, color: '#c084fc', color2: '#fbbf24' },
        { type: 'aurora', intensity: 0.5, color: '#4338ca', color2: '#c084fc' },
      ],
    },
  },
  {
    id: 'ethereal_falls',
    name: 'Ethereal Falls',
    description:
      'Map top-left. SE shelf is playable ethereal cold; NW half is diagonally cut — water lifts, islands drift to the Cosmic Waterfall tip. Ships do not return. Crusade cold front line.',
    lore:
      'When the First God wept, tears became upward light-rivers. A diagonal fracture split the zone: the SE half still holds floating crystal shelves for the living; the NW half is Madra’s Cosmic Waterfall — surface physics break, islands and water float toward the top-left tip of destruction. Ships that cross the cut never sail home. Characters who die in the field leave no drops; ally NPCs die permanent death. Only flight (mounts, airborne creatures, flying players) remains sane. Crusade holds the cold approaches and the SE sanctums.',
    biome: 'ethereal',
    groundPBR: 'ground_8',
    difficultyMin: 6,
    difficultyMax: 9,
    bounds: sectorBounds(0, 0), // top-left — NW world corner
    colors: {
      deep: '#0c0a1a', // void-dark purple-black
      mid: '#2d1b69', // deep spectral purple
      accent: '#00e5ff', // ethereal cyan glow
      glow: '#bf40ff', // phantom purple luminescence
    },
    hazards: [
      'spectral_mist_drain',
      'gravity_inversion',
      'phantom_grasp',
      'crystal_overload',
      'luminous_whirlpool',
      'reality_thin_zones',
      'destruction_half', // NW diagonal field
      'ship_no_return',
      'void_death_drops',
      'ally_perma_death',
      'broken_surface_physics',
    ],
    ambientFx: [
      'waterfall_glow_purple',
      'floating_islands',
      'spectral_mist_rising',
      'crystal_sparkle',
      'phantom_wisps',
      'gravity_particles',
      'aurora_vertical',
      'bioluminescent_water',
      'destruction_tip_void',
      'diagonal_fracture_glow',
    ],
    resources: [
      'ethereal_crystals',       // Primary rare resource — glows, used in T7-T8 crafting
      'spectral_essence',        // Harvested from phantom creatures
      'luminous_pearl',          // Found in glowing whirlpools
      'voidtouched_coral',       // Grows on floating islands
      'gravity_stone',           // Stones that float — building material
      'phantom_silk',            // Woven from spectral mist
      'tear_of_the_first_god',   // Ultra-rare drop, quest item
    ],
    terrain3d: defaultTerrain3d({
      minHeight: -120,
      maxHeight: 300,
      waterLevel: 10,
      noiseOctaves: 7,
      noisePersistence: 0.55,
      noiseBaseFreq: 0.0012,
      heightmapModifier: 'ethereal_falls',
      skyColor: 0x0c0a1a,
      fog: { color: 0x1a0e30, density: 0.00015 },
      ambientIntensity: 0.3,
      sunIntensity: 0.5,
      sunDirection: [0.1, 0.6, 0.3],
      maxPlayers: 80,
      spawnPoints: [
        [300, 50, 300], [-400, 60, 200], [600, 40, -500],
        [-200, 80, -700], [800, 55, 100],
      ],
    }),
    imagery: {
      backgroundUrl: '/images/professions/cosmic_arcane_void_magic_background.png',
      thumbnailUrl: '/images/professions/cosmic_arcane_void_magic_background.png',
      videoUrl: '/videos/ethereal-falls-ambient.mp4',
      overlayFx: [
        { type: 'waterfall_streams', intensity: 1.0, color: '#00e5ff', color2: '#bf40ff' },
        { type: 'spectral_mist', intensity: 0.8, color: '#2d1b69', color2: '#0c0a1a' },
        { type: 'floating_islands', intensity: 0.6, color: '#bf40ff' },
        { type: 'phantom_wisps', intensity: 0.7, color: '#bf40ff', color2: '#00e5ff' },
      ],
    },
  },

  // ── Row 2 (bottom) ──
  {
    id: 'abyssal_trench',
    name: 'Abyssal Trench',
    description:
      'Bottom-left deep — leviathan trench with a frozen northern ice-rim toward the western cold band.',
    lore:
      'The trench plunges so deep that light becomes a memory. Along its northern shelf, cold from Stormbreak and the Falls locks ice rims over black water — western cold band meets the abyss. Bioluminescent horrors patrol the deep; ice-crusted wrecks line the rim.',
    biome: 'abyssal',
    groundPBR: 'ground_9',
    difficultyMin: 7,
    difficultyMax: 10,
    bounds: sectorBounds(0, 2), // bottom-left — western cold rim
    colors: { deep: '#020617', mid: '#0f172a', accent: '#06b6d4', glow: '#7dd3fc' },
    hazards: [
      'crushing_pressure',
      'leviathan_attacks',
      'darkness_debuff',
      'siren_lure',
      'ice_patches',
      'frostbite_dot',
    ],
    ambientFx: [
      'bioluminescence',
      'bubble_columns',
      'deep_fog',
      'creature_shadows',
      'ice_sparkle',
    ],
    resources: [
      'abyssal_ore',
      'leviathan_scale',
      'deep_coral',
      'void_fish',
      'ocean_heart',
      'ice',
    ],
    terrain3d: defaultTerrain3d({
      minHeight: -200,
      maxHeight: 40,
      waterLevel: 15,
      noiseOctaves: 6,
      noisePersistence: 0.42,
      noiseBaseFreq: 0.0007,
      heightmapModifier: 'abyssal_trench',
      skyColor: 0x020617,
      fog: { color: 0x040810, density: 0.0008 },
      ambientIntensity: 0.15,
      sunIntensity: 0.3,
      sunDirection: [0.0, 0.2, 0.4],
      spawnPoints: [[0, 20, 0], [500, 18, -300]],
    }),
    imagery: {
      backgroundUrl: '/backgrounds/dark-fantasy-1.png',
      thumbnailUrl: '/backgrounds/dark-fantasy-1.png',
      overlayFx: [
        { type: 'bioluminescence', intensity: 0.7, color: '#22d3ee', color2: '#06b6d4' },
      ],
    },
  },
  {
    id: 'ember_depths',
    name: 'Ember Depths',
    description: 'Volcanic islands erupting with molten fury and Gould Flame energy.',
    lore: 'The Sundering ripped open the seabed here, exposing rivers of magma that flow into the ocean. The resulting islands are young, brutal, and rich with Gould Flame shards. The Legion was born in places like this.',
    biome: 'volcanic',
    groundPBR: 'ground_5',
    difficultyMin: 5,
    difficultyMax: 9,
    bounds: sectorBounds(2, 2),  // bottom-right — where the Legion was born
    colors: { deep: '#1c0a00', mid: '#7c2d12', accent: '#f97316', glow: '#ef4444' },
    hazards: ['lava_flows', 'eruption_events', 'toxic_gas', 'fire_elementals'],
    ambientFx: ['ember_rain', 'lava_glow', 'smoke_plumes', 'heat_distortion'],
    resources: ['obsidian', 'sulfur', 'fire_crystals', 'rare_ore', 'gems'],
    terrain3d: defaultTerrain3d({
      minHeight: -30,
      maxHeight: 220,
      waterLevel: -5,
      noiseOctaves: 5,
      noisePersistence: 0.48,
      noiseBaseFreq: 0.0008,
      heightmapModifier: 'volcanic_caldera',
      skyColor: 0x1a0500,
      fog: { color: 0x2a0a00, density: 0.0004 },
      ambientIntensity: 0.4,
      sunIntensity: 1.0,
      sunDirection: [0.3, 0.6, 0.1],
      spawnPoints: [[0, 15, 0], [-600, 20, 400], [700, 25, -300]],
    }),
    imagery: {
      backgroundUrl: '/backgrounds/dark-fantasy-5.png',
      thumbnailUrl: '/backgrounds/dark-fantasy-5.png',
      overlayFx: [
        { type: 'ember_rain', intensity: 0.8, color: '#f97316', color2: '#ef4444' },
      ],
    },
  },
  {
    id: 'haven_shore',
    name: 'Haven Shore',
    description: 'Calm tropical waters and gentle islands — the safest region in the world.',
    lore: 'Haven Shore is where every pirate begins their journey. Protected by the Grudge Pact, violence is forbidden in these waters. Palm-fringed islands offer shelter, training, and the first taste of adventure.',
    biome: 'tropical',
    groundPBR: 'ground_1',
    difficultyMin: 1,
    difficultyMax: 3,
    bounds: sectorBounds(1, 2),  // bottom-center — safe starting zone, accessible
    // Stronger tropical sea palette (drives ocean shader shallow/deep)
    colors: { deep: '#0c4a6e', mid: '#06b6d4', accent: '#fbbf24' },
    hazards: [],
    ambientFx: ['gentle_waves', 'seagulls', 'palm_sway', 'sunset_glow'],
    resources: ['coconut', 'palm_frond', 'fish', 'shells', 'hardwood', 'herbs'],
    isSafeZone: true,
    terrain3d: defaultTerrain3d({
      // Single waterline at Y=0 — islands flatten below this to seafloor
      minHeight: -24,
      maxHeight: 72,
      waterLevel: 0,
      noisePersistence: 0.38,
      noiseBaseFreq: 0.00065,
      heightmapModifier: 'tropical_island',
      skyColor: 0x87ceeb,
      fog: { color: 0x7ec8e3, density: 0.00012 },
      ambientIntensity: 0.75,
      sunIntensity: 1.45,
      sunDirection: [0.4, 0.85, 0.28],
      // Spawns sit above the single water plane
      spawnPoints: [[0, 6, 0], [300, 8, -200], [-400, 7, 500]],
    }),
    imagery: {
      backgroundUrl: '/backgrounds/general.png',
      thumbnailUrl: '/backgrounds/general.png',
      overlayFx: [
        { type: 'gentle_waves', intensity: 0.55, color: '#0891b2' },
      ],
    },
  },
];

// ── Lookup Helpers ───────────────────────────────────────────────────────────

/** Get the sector that contains a given world grid coordinate */
export function getSectorAt(x: number, y: number): WorldSector | null {
  for (const sector of WORLD_SECTORS) {
    const { x0, y0, x1, y1 } = sector.bounds;
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return sector;
  }
  return null;
}

/** Get sector by id */
export function getSectorById(id: string): WorldSector | null {
  return WORLD_SECTORS.find(s => s.id === id) ?? null;
}

/** Get all sector ids */
export function getAllSectorIds(): string[] {
  return WORLD_SECTORS.map(s => s.id);
}

// ── Ethereal Falls Tile Color Generator ──────────────────────────────────────

/**
 * Generate a tile color for the Ethereal Falls sector.
 * Uses the tile's elevation and position to create the luminous purple/cyan
 * waterfall aesthetic with spectral mist effects.
 */
export function getEtherealFallsTileColor(
  elevation: number,
  tileX: number,
  tileY: number,
  discovered: boolean,
): string {
  if (!discovered) return '#0a0a12';

  // Normalize position within sector for gradient effects
  const sector = getSectorById('ethereal_falls')!;
  const nx = (tileX - sector.bounds.x0) / (sector.bounds.x1 - sector.bounds.x0);
  const ny = (tileY - sector.bounds.y0) / (sector.bounds.y1 - sector.bounds.y0);

  // Waterfall columns — vertical streaks of bright cyan
  const waterfallStrength = Math.sin(nx * Math.PI * 6) * 0.5 + 0.5;
  const isWaterfallColumn = waterfallStrength > 0.7;

  // Floating island check — higher elevation clusters
  if (elevation > 0.7) {
    // Floating island surface — crystalline purple with cyan edges
    const crystalPulse = Math.sin((tileX + tileY) * 0.3) * 0.15 + 0.85;
    const r = Math.floor(80 * crystalPulse);
    const g = Math.floor(40 + elevation * 60);
    const b = Math.floor(140 + elevation * 80);
    return `rgb(${r}, ${g}, ${b})`;
  }

  if (elevation > 0.55) {
    // Shallow luminous water — cyan/purple shimmer
    const shimmer = Math.sin((tileX * 0.5 + tileY * 0.3) * 2) * 0.2 + 0.8;
    if (isWaterfallColumn) {
      // Bright waterfall stream
      const r = Math.floor(20 * shimmer);
      const g = Math.floor(200 * shimmer + 40);
      const b = Math.floor(255 * shimmer);
      return `rgb(${r}, ${g}, ${b})`;
    }
    const r = Math.floor(60 + elevation * 40);
    const g = Math.floor(30 + elevation * 80);
    const b = Math.floor(180 + elevation * 60);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Deep spectral abyss — dark purple with phantom glow spots
  const phantomGlow = Math.sin(tileX * 0.7) * Math.cos(tileY * 0.5) * 0.5 + 0.5;
  const isPhantomSpot = phantomGlow > 0.8;

  if (isPhantomSpot) {
    // Phantom wisps — purple-pink glow
    return `rgb(${Math.floor(100 + phantomGlow * 80)}, ${Math.floor(20 + phantomGlow * 30)}, ${Math.floor(160 + phantomGlow * 60)})`;
  }

  if (isWaterfallColumn && elevation > 0.3) {
    // Waterfall plunging into deep water — bright cyan streak
    return `rgb(10, ${Math.floor(140 + elevation * 80)}, ${Math.floor(200 + elevation * 55)})`;
  }

  // Default deep water — void purple-black with subtle color
  const r = Math.floor(12 + elevation * 25);
  const g = Math.floor(10 + elevation * 15);
  const b = Math.floor(26 + elevation * 50);
  return `rgb(${r}, ${g}, ${b})`;
}

// ── Sector-Aware Tile Color ──────────────────────────────────────────────────

/**
 * Get tile color influenced by its sector.
 * Falls back to default colors for non-special sectors.
 */
export function getSectorTileColor(
  tileType: string,
  elevation: number,
  tileX: number,
  tileY: number,
  discovered: boolean,
): string | null {
  const sector = getSectorAt(tileX, tileY);
  if (!sector) return null;

  // Ethereal Falls gets full custom rendering
  if (sector.id === 'ethereal_falls') {
    return getEtherealFallsTileColor(elevation, tileX, tileY, discovered);
  }

  if (!discovered) return null; // Use default fog color

  // Tint tiles based on sector biome
  const { deep, mid, accent } = sector.colors;

  switch (sector.biome) {
    case 'frozen': {
      if (tileType === 'island') return `rgb(${180 + Math.floor(elevation * 60)}, ${200 + Math.floor(elevation * 40)}, ${220 + Math.floor(elevation * 35)})`;
      if (tileType === 'shallow_water') return mid;
      return deep;
    }
    case 'volcanic': {
      if (tileType === 'island') return `rgb(${80 + Math.floor(elevation * 100)}, ${30 + Math.floor(elevation * 40)}, ${10 + Math.floor(elevation * 20)})`;
      if (tileType === 'shallow_water') return `rgb(${60 + Math.floor(elevation * 40)}, ${20 + Math.floor(elevation * 20)}, ${10})`;
      return deep;
    }
    case 'abyssal': {
      // Everything is darker and deeper
      if (tileType === 'island') return `rgb(${20 + Math.floor(elevation * 30)}, ${40 + Math.floor(elevation * 50)}, ${60 + Math.floor(elevation * 40)})`;
      return `rgb(${2 + Math.floor(elevation * 10)}, ${6 + Math.floor(elevation * 15)}, ${23 + Math.floor(elevation * 20)})`;
    }
    case 'nexus': {
      // Shifting energy colors
      const pulse = Math.sin((tileX + tileY) * 0.15) * 0.5 + 0.5;
      if (tileType === 'island') return `rgb(${60 + Math.floor(pulse * 80)}, ${40 + Math.floor(elevation * 60)}, ${120 + Math.floor(pulse * 100)})`;
      return `rgb(${30 + Math.floor(pulse * 20)}, ${27 + Math.floor(pulse * 15)}, ${75 + Math.floor(elevation * 40)})`;
    }
    default:
      return null; // Use default tile color
  }
}

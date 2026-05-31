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

// ── Sector Type ──────────────────────────────────────────────────────────────

// ── 3D Terrain Configuration ─────────────────────────────────────────────────

export interface ZoneTerrain3DConfig {
  /** World-space size in meters (each axis). Default 4000 = 4km × 4km */
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
const ZONE_SIZE = 4000; // 4km × 4km per zone in world-space meters
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
      backgroundUrl: '/assets/backgrounds/dark-fantasy-4.png',
      thumbnailUrl: '/assets/backgrounds/dark-fantasy-4.png',
      overlayFx: [
        { type: 'snowfall', intensity: 0.8, color: '#dbeafe' },
        { type: 'aurora', intensity: 0.3, color: '#7dd3fc', color2: '#a78bfa' },
      ],
    },
  },
  {
    id: 'stormbreak_reef',
    name: 'Stormbreak Reef',
    description: 'Perpetual thunderstorms rage above a maze of razor-sharp coral reefs.',
    lore: 'The gods clashed above these waters during the First Grudge, and the storm never stopped. Ships that wander in are torn apart by lightning-charged waves. Only the desperate sail here — and the brave.',
    biome: 'storm',
    difficultyMin: 3,
    difficultyMax: 6,
    bounds: sectorBounds(0, 1),  // mid-left
    colors: { deep: '#0f172a', mid: '#334155', accent: '#fbbf24' },
    hazards: ['lightning_strikes', 'whirlpools', 'reef_damage', 'rogue_waves'],
    ambientFx: ['rain_heavy', 'lightning_flashes', 'wave_spray'],
    resources: ['shells', 'coral', 'rare_ore', 'storm_crystals'],
    terrain3d: defaultTerrain3d({
      minHeight: -80,
      maxHeight: 60,
      waterLevel: 5,
      noiseOctaves: 6,
      noisePersistence: 0.5,
      noiseBaseFreq: 0.001,
      heightmapModifier: 'storm_reef',
      skyColor: 0x2c3e50,
      fog: { color: 0x34495e, density: 0.0006 },
      ambientIntensity: 0.4,
      sunIntensity: 0.6,
      sunDirection: [0.1, 0.3, 0.6],
      spawnPoints: [[0, 10, 0], [600, 8, -400]],
    }),
    imagery: {
      backgroundUrl: '/assets/backgrounds/dark-fantasy-3.png',
      thumbnailUrl: '/assets/backgrounds/dark-fantasy-3.png',
      overlayFx: [
        { type: 'rain_heavy', intensity: 0.9, color: '#94a3b8' },
        { type: 'lightning_flashes', intensity: 0.6, color: '#fbbf24' },
      ],
    },
  },
  {
    id: 'thornwood_wilds',
    name: 'Thornwood Wilds',
    description: 'An ancient forest so dense that sunlight never reaches the floor.',
    lore: 'The Thornwood predates the factions. Its roots drink from the Worldboard itself, and its canopy hides creatures that have never seen sky. Worge clans claim dominion here, but the forest answers to no one.',
    biome: 'forest',
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
      backgroundUrl: '/assets/professions/ancient_mystical_forest_with_glowing_particles.png',
      thumbnailUrl: '/assets/professions/ancient_mystical_forest_with_glowing_particles.png',
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
    difficultyMin: 5,
    difficultyMax: 8,
    bounds: sectorBounds(2, 1),  // mid-right
    colors: { deep: '#451a03', mid: '#92400e', accent: '#fbbf24' },
    hazards: ['heat_exhaustion', 'sandstorm', 'glass_shard_terrain', 'cursed_relics'],
    ambientFx: ['dust_swirl', 'heat_shimmer', 'sand_particles'],
    resources: ['gold_ore', 'ancient_relics', 'scorpion_venom', 'glass_shards', 'cactus'],
    terrain3d: defaultTerrain3d({
      minHeight: -15,
      maxHeight: 100,
      waterLevel: -10,
      noisePersistence: 0.35,
      noiseBaseFreq: 0.0005,
      heightmapModifier: 'desert_dunes',
      skyColor: 0xd4a574,
      fog: { color: 0xc4956a, density: 0.0003 },
      ambientIntensity: 0.8,
      sunIntensity: 1.6,
      sunDirection: [0.5, 0.9, 0.2],
      spawnPoints: [[0, 5, 0], [-800, 8, -800], [900, 12, 500]],
    }),
    imagery: {
      backgroundUrl: '/assets/backgrounds/dark-fantasy-5.png',
      thumbnailUrl: '/assets/backgrounds/dark-fantasy-5.png',
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
      backgroundUrl: '/assets/professions/cosmic_arcane_void_magic_background.png',
      thumbnailUrl: '/assets/professions/cosmic_arcane_void_magic_background.png',
      overlayFx: [
        { type: 'energy_vortex', intensity: 0.8, color: '#c084fc', color2: '#fbbf24' },
        { type: 'aurora', intensity: 0.5, color: '#4338ca', color2: '#c084fc' },
      ],
    },
  },
  {
    id: 'ethereal_falls',
    name: 'Ethereal Falls',
    description: 'A zone of impossible beauty and lethal danger — luminescent waterfalls cascade from floating islands into a churning abyss of spectral mist.',
    lore: 'When the First God wept during the Sundering, their tears became rivers of liquid light that flow upward, defying gravity. The falls shimmer between purple and cyan, illuminating islands of crystallized magic suspended in mid-air. The mist below is alive — phantoms of drowned sailors reach up from the luminous depths, and the water itself dissolves mortal flesh. Only the worthy may harvest the Ethereal Crystals that grow where light meets shadow.',
    biome: 'ethereal',
    difficultyMin: 6,
    difficultyMax: 9,
    bounds: sectorBounds(0, 0),  // top-left — remote magical corner
    colors: {
      deep: '#0c0a1a',      // void-dark purple-black
      mid: '#2d1b69',       // deep spectral purple
      accent: '#00e5ff',    // ethereal cyan glow
      glow: '#bf40ff',      // phantom purple luminescence
    },
    hazards: [
      'spectral_mist_drain',   // Standing in mist drains HP
      'gravity_inversion',     // Zones where gravity flips
      'phantom_grasp',         // Ghostly hands pull you into the abyss
      'crystal_overload',      // Ethereal crystals explode if mined wrong
      'luminous_whirlpool',    // Glowing water vortexes that suck ships down
      'reality_thin_zones',    // Areas where the veil is thin — random teleports
    ],
    ambientFx: [
      'waterfall_glow_purple',   // Glowing purple-cyan waterfalls
      'floating_islands',        // Rock formations suspended in air
      'spectral_mist_rising',    // Luminous mist rising from below
      'crystal_sparkle',         // Ethereal crystals pulsing with light
      'phantom_wisps',           // Ghost lights drifting through the air
      'gravity_particles',       // Particles that fall upward
      'aurora_vertical',         // Vertical aurora columns around falls
      'bioluminescent_water',    // Water surface glows cyan/purple
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
      backgroundUrl: '/assets/professions/cosmic_arcane_void_magic_background.png',
      thumbnailUrl: '/assets/professions/cosmic_arcane_void_magic_background.png',
      videoUrl: '/assets/videos/ethereal-falls-ambient.mp4',
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
    description: 'The deepest waters in the world — home to leviathans and sunken empires.',
    lore: 'The trench plunges so deep that light becomes a memory. Bioluminescent horrors patrol its depths, and the pressure alone can crush a hull. Ancient ruins of a drowned civilization line the trench walls.',
    biome: 'abyssal',
    difficultyMin: 7,
    difficultyMax: 10,
    bounds: sectorBounds(0, 2),
    colors: { deep: '#020617', mid: '#0f172a', accent: '#06b6d4', glow: '#22d3ee' },
    hazards: ['crushing_pressure', 'leviathan_attacks', 'darkness_debuff', 'siren_lure'],
    ambientFx: ['bioluminescence', 'bubble_columns', 'deep_fog', 'creature_shadows'],
    resources: ['abyssal_ore', 'leviathan_scale', 'deep_coral', 'void_fish', 'ocean_heart'],
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
      backgroundUrl: '/assets/backgrounds/dark-fantasy-1.png',
      thumbnailUrl: '/assets/backgrounds/dark-fantasy-1.png',
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
      backgroundUrl: '/assets/backgrounds/dark-fantasy-5.png',
      thumbnailUrl: '/assets/backgrounds/dark-fantasy-5.png',
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
    difficultyMin: 1,
    difficultyMax: 3,
    bounds: sectorBounds(1, 2),  // bottom-center — safe starting zone, accessible
    colors: { deep: '#164e63', mid: '#0891b2', accent: '#fbbf24' },
    hazards: [],
    ambientFx: ['gentle_waves', 'seagulls', 'palm_sway', 'sunset_glow'],
    resources: ['coconut', 'palm_frond', 'fish', 'shells', 'hardwood', 'herbs'],
    isSafeZone: true,
    terrain3d: defaultTerrain3d({
      minHeight: -20,
      maxHeight: 80,
      waterLevel: 0,
      noisePersistence: 0.4,
      noiseBaseFreq: 0.0007,
      heightmapModifier: 'tropical_island',
      skyColor: 0x87ceeb,
      fog: { color: 0x87ceeb, density: 0.00015 },
      ambientIntensity: 0.7,
      sunIntensity: 1.4,
      sunDirection: [0.4, 0.8, 0.3],
      spawnPoints: [[0, 5, 0], [300, 8, -200], [-400, 6, 500]],
    }),
    imagery: {
      backgroundUrl: '/assets/backgrounds/general.png',
      thumbnailUrl: '/assets/backgrounds/general.png',
      overlayFx: [
        { type: 'gentle_waves', intensity: 0.4, color: '#0891b2' },
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

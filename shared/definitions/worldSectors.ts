/**
 * worldSectors — Canonical definitions for the 9 biome world sectors.
 *
 * Single source of truth shared between:
 *   - server  (zone routing, sector REST API, ZoneManager)
 *   - client  (world map UI, biome-aware scene loading, AI context)
 *
 * 3×3 grid layout (row 0 = top/north, screen coordinates):
 *
 *   +----------+----------+----------+
 *   | (0,0)    | (1,0)    | (2,0)    |
 *   | Ethereal | Storm    | Frozen   |  ← row 0 (north/top)
 *   +----------+----------+----------+
 *   | (0,1)    | (1,1)    | (2,1)    |
 *   | Desert   | Nexus    | Tropical |  ← row 1 (middle)
 *   +----------+----------+----------+
 *   | (0,2)    | (1,2)    | (2,2)    |
 *   | Forest   | Abyssal  | Volcanic |  ← row 2 (south/bottom)
 *   +----------+----------+----------+
 *     col 0      col 1      col 2
 *
 * LORE: The volcanic caldera (2,2 — bottom-right/SE) births new islands
 * from magma and tectonic fury. They drift diagonally across Aethermoor
 * toward the Ethereal Falls (0,0 — top-left/NW), where reality thins
 * and the Cosmic Waterfall slowly consumes them into oblivion. The
 * closer an island is to the Falls, the stronger the ambient magic —
 * but the shorter its remaining lifespan.
 *
 * Scale: Each sector = 10,000 × 10,000 units (1 unit ≈ 1 meter).
 * Full world = 30,000 × 30,000m. Character reference height = 2m (barbarian).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type SectorBiome =
  | "tropical"
  | "forest"
  | "frozen"
  | "volcanic"
  | "desert"
  | "storm"
  | "ethereal"
  | "abyssal"
  | "nexus";

export interface SectorGridPos {
  col: 0 | 1 | 2;
  row: 0 | 1 | 2;
}

export interface WorldSector {
  id: SectorBiome;
  name: string;
  subtitle: string;
  grid: SectorGridPos;

  // ── Visual ─────────────────────────────────────────────────────────
  /** UI accent colour for map labels, legend swatches, etc. */
  color: string;
  /** Hex for Three.js AmbientLight. */
  ambientColor: string;
  /** Hex for Three.js Fog. */
  fogColor: string;
  fogDensity: number;
  /** Renderer clear / sky colour. */
  skyColor: string;
  /** Primary terrain/ground tint. */
  groundColor: string;

  // ── Gameplay ────────────────────────────────────────────────────────
  minPlayerLevel: number;
  maxPlayerLevel: number;
  description: string;
  hazards: string[];
  resources: string[];
  enemies: string[];
  bosses: string[];

  // ── Scene ───────────────────────────────────────────────────────────
  /** Path relative to /public for a pre-built scene GLB, or null. */
  primaryAssetPath: string | null;
  fallbackMode: "scene" | "modular" | "placeholder";
  /** Whether islands here can permanently sink (boss zone mechanic). */
  supportsSinking: boolean;
}

// ── Sector data ───────────────────────────────────────────────────────────────

export const WORLD_SECTORS: Record<SectorBiome, WorldSector> = {

  // ── Row 0 (top / north) ───────────────────────────────────────────

  ethereal: {
    id: "ethereal",
    name: "Wraithlight Shoals",
    subtitle: "The Consuming Edge — Northwest",
    grid: { col: 0, row: 0 },
    color: "#cc88ff",
    ambientColor: "#9966cc",
    fogColor: "#6644aa",
    fogDensity: 0.05,
    skyColor: "#3a1a5a",
    groundColor: "#5a3a8a",
    minPlayerLevel: 30,
    maxPlayerLevel: 50,
    description:
      "The boundary where Aethermoor meets the Cosmic Waterfall. Reality fractures " +
      "at the edges as islands crumble into luminous mist. Ancient souls drift through " +
      "these shimmering shoals — the last whispers of worlds already consumed.",
    hazards: ["reality_fractures", "soul_displacement", "phantom_traps", "time_dilation"],
    resources: ["spirit_essence", "phantom_silk", "ether_crystals", "memory_shards"],
    enemies: ["phantom_knight", "spirit_wisp", "banshee", "ethereal_drake"],
    bosses: ["spirit_colossus", "the_forgotten_king"],
    primaryAssetPath: null,
    fallbackMode: "placeholder",
    supportsSinking: true,
  },

  storm: {
    id: "storm",
    name: "Howling Straits",
    subtitle: "The Thunder Corridor — North Central",
    grid: { col: 1, row: 0 },
    color: "#5566cc",
    ambientColor: "#8899dd",
    fogColor: "#445588",
    fogDensity: 0.035,
    skyColor: "#2a3a5a",
    groundColor: "#3a4a6a",
    minPlayerLevel: 20,
    maxPlayerLevel: 35,
    description:
      "Perpetual lightning storms crackle above floating reef platforms where the " +
      "warm currents from the south collide with the frozen air descending from the " +
      "northeast. Storm giants and thunder drakes patrol cloud citadels far above " +
      "the wave-torn sea.",
    hazards: ["lightning_strikes", "hurricane_winds", "flash_floods"],
    resources: ["storm_crystals", "thunder_essence", "cloud_silk", "sea_glass"],
    enemies: ["storm_elemental", "thunder_drake", "sea_giant", "tempest_harpy"],
    bosses: ["storm_titan", "kraken"],
    primaryAssetPath: null,
    fallbackMode: "placeholder",
    supportsSinking: false,
  },

  frozen: {
    id: "frozen",
    name: "Glassfall Tundra",
    subtitle: "The Silent White — Northeast",
    grid: { col: 2, row: 0 },
    color: "#88ccff",
    ambientColor: "#cce6ff",
    fogColor: "#aaccdd",
    fogDensity: 0.03,
    skyColor: "#b0d8f8",
    groundColor: "#c8e8f0",
    minPlayerLevel: 15,
    maxPlayerLevel: 30,
    description:
      "Perpetual blizzards scour these glacial islands. The oldest landmasses in " +
      "Aethermoor have drifted here over millennia, their surfaces encased in " +
      "centuries of ice. Yetis and frost golems defend ruins that predate all " +
      "living memory.",
    hazards: ["blizzards", "black_ice", "avalanche", "frostbite"],
    resources: ["ice_ore", "frost_gems", "glacier_water", "yeti_fur", "ancient_relics"],
    enemies: ["yeti", "ice_golem", "frost_wraith", "glacier_wyrm"],
    bosses: ["frost_giant", "ice_dragon"],
    primaryAssetPath: null,
    fallbackMode: "placeholder",
    supportsSinking: false,
  },

  // ── Row 1 (middle) ─────────────────────────────────────────────────

  desert: {
    id: "desert",
    name: "Cinderwind Flats",
    subtitle: "Sea of Burning Sand — West",
    grid: { col: 0, row: 1 },
    color: "#d4a22a",
    ambientColor: "#f5c84a",
    fogColor: "#c8a060",
    fogDensity: 0.01,
    skyColor: "#f0c060",
    groundColor: "#c8a050",
    minPlayerLevel: 10,
    maxPlayerLevel: 25,
    description:
      "Scorched sandstone mesas and sun-bleached ruins mark islands that cooled " +
      "ages ago on their slow drift from the volcanic east. Scorpion clans and " +
      "mummified tomb guardians defend the pharaoh's buried hoards beneath the " +
      "cinder-laden winds.",
    hazards: ["extreme_heat", "sandstorms", "scorpion_swarms", "mirages"],
    resources: ["gold_ore", "sand_crystals", "cactus_fruit", "ancient_coins", "oil"],
    enemies: ["sand_scorpion", "tomb_guardian", "desert_bandit", "sand_elemental"],
    bosses: ["scorpion_queen", "sand_pharaoh"],
    primaryAssetPath: null,
    fallbackMode: "modular",
    supportsSinking: false,
  },

  nexus: {
    id: "nexus",
    name: "The Crucible",
    subtitle: "Crossroads of All Grudges — Center",
    grid: { col: 1, row: 1 },
    color: "#c9a25a",
    ambientColor: "#fff8ee",
    fogColor: "#c4b090",
    fogDensity: 0.008,
    skyColor: "#ffe8b8",
    groundColor: "#b09060",
    minPlayerLevel: 0,
    maxPlayerLevel: 99,
    description:
      "The great central island where all factions first made landfall. Equidistant " +
      "from the volcanic forges and the ethereal edge, The Crucible is the most " +
      "stable ground in Aethermoor — and the most contested. Alliances are forged " +
      "here, and shattered.",
    hazards: ["faction_pvp", "rift_storms"],
    resources: ["rift_shards", "nexus_crystals", "faction_tokens", "all_basic_resources"],
    enemies: ["rival_faction_npc", "corrupted_guardian", "rift_spawn"],
    bosses: ["nexus_colossus"],
    primaryAssetPath: null,
    fallbackMode: "placeholder",
    supportsSinking: false,
  },

  tropical: {
    id: "tropical",
    name: "Serpent's Wake",
    subtitle: "Warm Waters, Sharp Teeth — East",
    grid: { col: 2, row: 1 },
    color: "#4db878",
    ambientColor: "#ffddaa",
    fogColor: "#c4a882",
    fogDensity: 0.012,
    skyColor: "#87ceeb",
    groundColor: "#3a8a50",
    minPlayerLevel: 1,
    maxPlayerLevel: 15,
    description:
      "Young islands still warm from the volcanic south cool into lush jungle " +
      "paradises. Turquoise waters, palm trees, and pirate strongholds line the " +
      "coast. Fresh recruits prove themselves here in cannon fire and cutlass duels.",
    hazards: ["sea_storms", "reef_hazards", "pirate_raids"],
    resources: ["tropical_fruit", "hardwood", "pearls", "sea_salt", "rum"],
    enemies: ["pirate", "sea_serpent", "jungle_panther", "reef_crab"],
    bosses: ["pirate_admiral", "leviathan_crab"],
    primaryAssetPath: "/models/pirate_islands/scene.gltf",
    fallbackMode: "scene",
    supportsSinking: false,
  },

  // ── Row 2 (bottom / south) ─────────────────────────────────────────

  forest: {
    id: "forest",
    name: "Briarwood Hollow",
    subtitle: "The Living Canopy — Southwest",
    grid: { col: 0, row: 2 },
    color: "#3a7a44",
    ambientColor: "#7bc47e",
    fogColor: "#4a8c5a",
    fogDensity: 0.018,
    skyColor: "#b8e8b8",
    groundColor: "#4a7a30",
    minPlayerLevel: 5,
    maxPlayerLevel: 20,
    description:
      "Mature islands that drifted west from the volcanic caldera long ago, now " +
      "blanketed in towering ancient forest. Druid councils and hidden elven outposts " +
      "shelter beneath the canopy. Wolves, corrupted treants, and forest wyrms stalk " +
      "the shadowed undergrowth.",
    hazards: ["poisonous_spores", "quicksand", "wild_magic"],
    resources: ["lumber", "herbs", "rare_mushrooms", "honey", "beast_pelts"],
    enemies: ["wolf", "treant", "forest_troll", "poison_sprite"],
    bosses: ["elder_treant", "forest_wyrm"],
    primaryAssetPath: null,
    fallbackMode: "modular",
    supportsSinking: false,
  },

  abyssal: {
    id: "abyssal",
    name: "The Maw Below",
    subtitle: "Where Islands Die — South Central",
    grid: { col: 1, row: 2 },
    color: "#9966cc",
    ambientColor: "#441144",
    fogColor: "#331133",
    fogDensity: 0.04,
    skyColor: "#1a0a2a",
    groundColor: "#2a1535",
    minPlayerLevel: 35,
    maxPlayerLevel: 55,
    description:
      "The deep waters between the volcanic birth-fires and the old western forests. " +
      "Ancient islands that broke apart mid-drift sink into the void sea here. Demonic " +
      "gates pulse with dark energy. Each island may vanish beneath the waves — permanently.",
    hazards: ["void_corruption", "island_sinking", "demon_portals", "soul_drain"],
    resources: ["void_essence", "abyssal_ore", "dark_crystals", "demon_cores"],
    enemies: ["void_demon", "abyssal_knight", "soul_devourer", "rift_horror"],
    bosses: ["abyssal_overlord", "void_kraken"],
    primaryAssetPath: "/models/dungeons/low poly dungeon sample.glb",
    fallbackMode: "scene",
    supportsSinking: true,
  },

  volcanic: {
    id: "volcanic",
    name: "Scoria Caldera",
    subtitle: "Born in Fire — Southeast",
    grid: { col: 2, row: 2 },
    color: "#ff6633",
    ambientColor: "#ff8844",
    fogColor: "#aa4422",
    fogDensity: 0.025,
    skyColor: "#cc4400",
    groundColor: "#8b2200",
    minPlayerLevel: 25,
    maxPlayerLevel: 45,
    description:
      "The origin of all land in Aethermoor. Molten rivers carve through black " +
      "obsidian as new islands are forged from tectonic fury and launched on their " +
      "long diagonal drift toward the Wraithlight Shoals. Fire demons and lava golems " +
      "guard the smoldering depths where the world is still being made.",
    hazards: ["lava_flows", "eruptions", "toxic_ash", "superheated_air"],
    resources: ["obsidian", "lava_ore", "sulfur", "fire_gems", "infernal_coal"],
    enemies: ["lava_golem", "fire_demon", "ash_wraith", "magma_drake"],
    bosses: ["volcano_titan", "infernal_dragon"],
    primaryAssetPath: "/models/environment/lava/lava_surface.glb",
    fallbackMode: "scene",
    supportsSinking: false,
  },
};

// ── Grid & label helpers ──────────────────────────────────────────────────────

/** 3×3 grid, row-major. [row][col] → SectorBiome. */
export const SECTOR_GRID: SectorBiome[][] = [
  ["ethereal", "storm",   "frozen"  ],
  ["desert",   "nexus",   "tropical"],
  ["forest",   "abyssal", "volcanic"],
];

export const BIOME_LABELS: Record<SectorBiome, string> = {
  ethereal: "Ethereal",
  storm:    "Storm",
  frozen:   "Frozen",
  desert:   "Desert",
  nexus:    "Nexus",
  tropical: "Tropical",
  forest:   "Forest",
  abyssal:  "Abyssal",
  volcanic: "Volcanic",
};

// ── Lookup helpers ────────────────────────────────────────────────────────────

export function getSectorById(id: string): WorldSector | undefined {
  return WORLD_SECTORS[id as SectorBiome];
}

export function getAllSectors(): WorldSector[] {
  return Object.values(WORLD_SECTORS);
}

export function getSectorAtGrid(col: 0 | 1 | 2, row: 0 | 1 | 2): WorldSector {
  return WORLD_SECTORS[SECTOR_GRID[row][col]];
}

/** Returns all sectors sorted ascending by minPlayerLevel. */
export function getSectorsByLevel(): WorldSector[] {
  return getAllSectors().sort((a, b) => a.minPlayerLevel - b.minPlayerLevel);
}

// ── World Constants ──────────────────────────────────────────────────────────

/** Canonical sector size in world units. 1 unit ≈ 1 meter. */
export const SECTOR_SIZE = 10_000;
/** Full world extent per axis (3 sectors). */
export const WORLD_SIZE = SECTOR_SIZE * 3; // 30,000
/** Reference character height (barbarian). Doors/caves scale to this. */
export const CHARACTER_REF_HEIGHT = 2;
/** Y range: ocean floor to sky ceiling. */
export const WORLD_Y_MIN = -500;
export const WORLD_Y_MAX = 500;

// ── Coordinate Conversion ────────────────────────────────────────────────────

/**
 * Convert sector grid + local position to absolute world coordinates.
 *   worldX = sectorGridCol * SECTOR_SIZE + localX
 *   worldZ = sectorGridRow * SECTOR_SIZE + localZ
 */
export function localToWorld(
  gridCol: number, gridRow: number,
  localX: number, localZ: number,
): { worldX: number; worldZ: number } {
  return {
    worldX: gridCol * SECTOR_SIZE + localX,
    worldZ: gridRow * SECTOR_SIZE + localZ,
  };
}

/** Inverse: world position → sector grid + local offset. */
export function worldToLocal(
  worldX: number, worldZ: number,
): { col: 0|1|2; row: 0|1|2; localX: number; localZ: number } {
  const col = Math.max(0, Math.min(2, Math.floor(worldX / SECTOR_SIZE))) as 0|1|2;
  const row = Math.max(0, Math.min(2, Math.floor(worldZ / SECTOR_SIZE))) as 0|1|2;
  return {
    col, row,
    localX: worldX - col * SECTOR_SIZE,
    localZ: worldZ - row * SECTOR_SIZE,
  };
}

/** Returns the sector whose grid cell contains the given world-space point. */
export function getSectorAtWorldPos(worldX: number, worldZ: number): WorldSector {
  const { col, row } = worldToLocal(worldX, worldZ);
  return getSectorAtGrid(col, row);
}

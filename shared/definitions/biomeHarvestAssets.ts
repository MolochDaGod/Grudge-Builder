/**
 * Biome harvest + wildlife asset palette for 9 sectors, home island, pirate lobby.
 * Maps terrain biomes → preferred tree/rock/flower tints, wildlife pools, counts.
 */

export type WorldBiome =
  | 'frozen'
  | 'storm'
  | 'forest'
  | 'desert'
  | 'ethereal'
  | 'volcanic'
  | 'abyssal'
  | 'nexus'
  | 'tropical'
  | 'beach'
  | 'plains'
  | 'winter';

export interface BiomeHarvestPalette {
  id: WorldBiome;
  label: string;
  /** Leaf/bark HSL-ish color hints for procedural trees */
  treeBark: number;
  treeCanopy: number;
  treeCanopyAlt: number;
  rockColor: number;
  crystalColors: number[];
  flowerColors: number[];
  scrapTint: number;
  groundHint: string;
  /** Prefer these IslandResourceLoader tree variant names when available */
  treeVariants: string[];
  rockVariants: string[];
  /** Wildlife creature ids (CreatureManifest keys) preferred in this biome */
  wildlife: string[];
  /** Target land animal count per island / home / zone chunk */
  wildlifeCount: [min: number, max: number];
  fishCount: [min: number, max: number];
}

const BASE: Omit<BiomeHarvestPalette, 'id' | 'label'> = {
  treeBark: 0x5c4033,
  treeCanopy: 0x2d7a2d,
  treeCanopyAlt: 0x3a8c3a,
  rockColor: 0x6b6b6b,
  crystalColors: [0x88ddff, 0xaa66ff, 0x66ffaa],
  flowerColors: [0xff6688, 0xffcc44, 0x88ffaa],
  scrapTint: 0x7a7a82,
  groundHint: 'grass',
  treeVariants: ['pine2_14', 'birch2_4', 'pine9_15'],
  rockVariants: ['rock_1', 'rock_2', 'rock_3'],
  wildlife: ['deer', 'rabbit', 'boar'],
  wildlifeCount: [4, 10],
  fishCount: [3, 8],
};

export const BIOME_HARVEST_PALETTES: Record<string, BiomeHarvestPalette> = {
  // ── Best beach pack ────────────────────────────────────────────────────
  beach: {
    ...BASE,
    id: 'beach',
    label: 'Beach / Tropical Shore',
    treeBark: 0x8b6914,
    treeCanopy: 0x2e8b57,
    treeCanopyAlt: 0x3cb371,
    rockColor: 0xc2b280,
    crystalColors: [0x40e0d0, 0x7fffd4, 0x00ced1],
    flowerColors: [0xff69b4, 0xffd700, 0xff6347],
    scrapTint: 0x8b7355,
    groundHint: 'sand',
    treeVariants: ['palm2_13', 'garden_tree_pink_11', 'birch6_5'],
    rockVariants: ['rock_5', 'rock_6', 'rock_1'],
    wildlife: ['deer', 'rabbit', 'seagull', 'boar'],
    wildlifeCount: [3, 7],
    fishCount: [6, 14],
  },
  tropical: {
    ...BASE,
    id: 'tropical',
    label: 'Tropical',
    treeBark: 0x6b4423,
    treeCanopy: 0x228b22,
    treeCanopyAlt: 0x32cd32,
    rockColor: 0xa09070,
    crystalColors: [0x00fa9a, 0x40e0d0, 0xffd700],
    flowerColors: [0xff1493, 0xff4500, 0x7cfc00],
    groundHint: 'sand',
    treeVariants: ['palm2_13', 'garden_tree_pink_11', 'ancient_tree_2_0'],
    wildlife: ['deer', 'boar', 'rabbit', 'parrot'],
    wildlifeCount: [5, 12],
    fishCount: [5, 12],
  },

  // ── Best winter pack ───────────────────────────────────────────────────
  winter: {
    ...BASE,
    id: 'winter',
    label: 'Winter / Snow',
    treeBark: 0x3d2b1f,
    treeCanopy: 0xddeeff,
    treeCanopyAlt: 0xb0c4de,
    rockColor: 0x9aa8b5,
    crystalColors: [0xaaddff, 0xe0ffff, 0xb0e0e6],
    flowerColors: [0xe6e6fa, 0xf0f8ff, 0xd8bfd8],
    scrapTint: 0x708090,
    groundHint: 'snow',
    treeVariants: ['pine2_14', 'pine9_15', 'creepy_tree1_10'],
    rockVariants: ['rock_7', 'rock_8', 'rock_4'],
    wildlife: ['wolf', 'deer', 'rabbit', 'bear'],
    wildlifeCount: [3, 8],
    fishCount: [2, 6],
  },
  frozen: {
    ...BASE,
    id: 'frozen',
    label: 'Frostbite Expanse',
    treeBark: 0x2f2419,
    treeCanopy: 0xe8f4ff,
    treeCanopyAlt: 0xc5d8e8,
    rockColor: 0x8fa0b0,
    crystalColors: [0x7dd3fc, 0xa5f3fc, 0xe0f2fe],
    flowerColors: [0xc4b5fd, 0xe0e7ff, 0xfafafa],
    groundHint: 'snow',
    treeVariants: ['pine2_14', 'pine9_15', 'creepy_tree1_10'],
    wildlife: ['wolf', 'bear', 'deer', 'rabbit'],
    wildlifeCount: [4, 9],
    fishCount: [2, 5],
  },

  // ── Best plains pack ───────────────────────────────────────────────────
  plains: {
    ...BASE,
    id: 'plains',
    label: 'Plains / Meadow',
    treeBark: 0x6b5344,
    treeCanopy: 0x6b8e23,
    treeCanopyAlt: 0x9acd32,
    rockColor: 0x8b8680,
    crystalColors: [0xa3e635, 0xfde047, 0x86efac],
    flowerColors: [0xf472b6, 0xfbbf24, 0xa78bfa, 0x34d399],
    groundHint: 'grass',
    treeVariants: ['birch2_4', 'birch6_5', 'pine2_14'],
    rockVariants: ['rock_1', 'rock_3', 'rock_5'],
    wildlife: ['buffalo', 'deer', 'rabbit', 'boar'],
    wildlifeCount: [6, 14],
    fishCount: [2, 5],
  },
  forest: {
    ...BASE,
    id: 'forest',
    label: 'Deep Forest',
    treeBark: 0x4a3520,
    treeCanopy: 0x1e6b1e,
    treeCanopyAlt: 0x2d7a2d,
    rockColor: 0x5a5a52,
    crystalColors: [0x66ffaa, 0x88ddff, 0xa3e635],
    flowerColors: [0xef4444, 0xf59e0b, 0x22c55e],
    groundHint: 'grass',
    treeVariants: ['pine2_14', 'pine9_15', 'ancient_tree_2_0', 'birch2_4'],
    wildlife: ['deer', 'boar', 'wolf', 'bear', 'rabbit'],
    wildlifeCount: [5, 12],
    fishCount: [2, 6],
  },
  nexus: {
    ...BASE,
    id: 'nexus',
    label: 'Convergence Nexus',
    treeCanopy: 0x4ade80,
    treeCanopyAlt: 0x22d3ee,
    crystalColors: [0xa78bfa, 0x22d3ee, 0xf472b6],
    wildlife: ['deer', 'boar', 'wolf', 'buffalo'],
    wildlifeCount: [6, 12],
    fishCount: [4, 8],
  },

  // ── Best volcanic pack ─────────────────────────────────────────────────
  volcanic: {
    ...BASE,
    id: 'volcanic',
    label: 'Volcanic / Ember',
    treeBark: 0x2a1810,
    treeCanopy: 0x3d2914,
    treeCanopyAlt: 0x5c3317,
    rockColor: 0x3f3f46,
    crystalColors: [0xff4400, 0xffaa00, 0xdc2626],
    flowerColors: [0xf97316, 0xef4444, 0xfbbf24],
    scrapTint: 0x57534e,
    groundHint: 'ash',
    treeVariants: ['creepy_tree1_10', 'ancient_tree_2_0', 'pine9_15'],
    rockVariants: ['rock_4', 'rock_7', 'rock_8'],
    wildlife: ['boar', 'wolf', 'bear'],
    wildlifeCount: [3, 8],
    fishCount: [1, 4],
  },
  desert: {
    ...BASE,
    id: 'desert',
    label: 'Ashen / Desert',
    treeBark: 0x8b6914,
    treeCanopy: 0x9a7b4f,
    treeCanopyAlt: 0xc4a574,
    rockColor: 0xd4a574,
    crystalColors: [0xfbbf24, 0xf59e0b, 0xeab308],
    flowerColors: [0xf97316, 0xfbbf24, 0xdc2626],
    groundHint: 'sand',
    treeVariants: ['creepy_tree1_10', 'palm2_13'],
    rockVariants: ['rock_2', 'rock_5', 'rock_6'],
    wildlife: ['rabbit', 'boar', 'buffalo'],
    wildlifeCount: [2, 6],
    fishCount: [1, 3],
  },

  storm: {
    ...BASE,
    id: 'storm',
    label: 'Stormbreak Reef',
    treeBark: 0x3d3d3d,
    treeCanopy: 0x4a5568,
    treeCanopyAlt: 0x2d3748,
    rockColor: 0x4a5568,
    crystalColors: [0xfbbf24, 0x94a3b8, 0x38bdf8],
    wildlife: ['boar', 'wolf', 'deer'],
    wildlifeCount: [3, 7],
    fishCount: [8, 16],
  },
  ethereal: {
    ...BASE,
    id: 'ethereal',
    label: 'Ethereal Falls',
    treeBark: 0x5b4b8a,
    treeCanopy: 0xa78bfa,
    treeCanopyAlt: 0xc4b5fd,
    rockColor: 0x7c6aae,
    crystalColors: [0xc4b5fd, 0xa5f3fc, 0xf0abfc],
    flowerColors: [0xe879f9, 0xa78bfa, 0x67e8f9],
    groundHint: 'crystal',
    treeVariants: ['garden_tree_pink_11', 'ancient_tree_2_0', 'birch6_5'],
    wildlife: ['deer', 'rabbit', 'wolf'],
    wildlifeCount: [4, 9],
    fishCount: [4, 10],
  },
  abyssal: {
    ...BASE,
    id: 'abyssal',
    label: 'Abyssal Trench',
    treeBark: 0x1a1a2e,
    treeCanopy: 0x16213e,
    treeCanopyAlt: 0x0f3460,
    rockColor: 0x1e293b,
    crystalColors: [0x22d3ee, 0x6366f1, 0x0ea5e9],
    wildlife: ['wolf', 'bear'],
    wildlifeCount: [2, 5],
    fishCount: [10, 20],
  },
};

/** Normalize sector biome tags + casual aliases (beach/winter/plains). */
export function resolveBiomePalette(biome: string | undefined | null): BiomeHarvestPalette {
  const key = (biome ?? 'forest').toLowerCase();
  if (BIOME_HARVEST_PALETTES[key]) return BIOME_HARVEST_PALETTES[key];
  // aliases
  if (key.includes('snow') || key.includes('ice') || key.includes('arctic')) {
    return BIOME_HARVEST_PALETTES.winter;
  }
  if (key.includes('sand') || key.includes('coast') || key.includes('shore')) {
    return BIOME_HARVEST_PALETTES.beach;
  }
  if (key.includes('meadow') || key.includes('grass') || key.includes('plain')) {
    return BIOME_HARVEST_PALETTES.plains;
  }
  if (key.includes('lava') || key.includes('ember') || key.includes('volcano')) {
    return BIOME_HARVEST_PALETTES.volcanic;
  }
  return BIOME_HARVEST_PALETTES.forest;
}

export function wildlifeCountForBiome(biome: string, rand: () => number = Math.random): number {
  const p = resolveBiomePalette(biome);
  const [min, max] = p.wildlifeCount;
  return Math.floor(min + rand() * (max - min + 1));
}

export function fishCountForBiome(biome: string, rand: () => number = Math.random): number {
  const p = resolveBiomePalette(biome);
  const [min, max] = p.fishCount;
  return Math.floor(min + rand() * (max - min + 1));
}

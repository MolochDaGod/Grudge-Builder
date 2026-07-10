/**
 * Nature asset catalog — stylized multi-mesh packs (user SSOT).
 *
 * BANNED: Quaternius megakit, square-leaf island_tree extracts, procedural
 * billboard forests, low-poly CommonTree / Rock_Medium.
 *
 * KEPT: palm trees + highest stylized packs from D:\Games\Models:
 *   snow → snowbiomes.glb
 *   volcanic → volcanicnature.glb
 *   beach/tropical → tropical_plants.glb (palms, banana, fern, monstera)
 *   mountain/plains → realistic_trees.glb + nature_vegetation.glb
 *   rocks/cliffs all biomes → stylised_rocks + cliff_face + vegetation stones
 *   flowers/plants harvest → flowers_pack + foliage_pack
 *   crystals/gems → minerals_pack
 *
 * R2: assets.grudge-studio.com/models/nature/stylized/*
 */

export const NATURE_ASSET_CATALOG_VERSION = '2.0.0';

export type NatureQuality = 'stylized' | 'interim_pack' | 'banned_lowpoly';

export type NatureCategory =
  | 'tree_pine'
  | 'tree_deciduous'
  | 'tree_palm'
  | 'tree_snow'
  | 'tree_volcanic'
  | 'rock'
  | 'cliff'
  | 'ore'
  | 'crystal'
  | 'bush'
  | 'grass'
  | 'mushroom'
  | 'flower'
  | 'fern'
  | 'plant'
  | 'harvest_stump'
  | 'harvest_log'
  | 'harvest_debris';

export interface NatureAssetEntry {
  id: string;
  category: NatureCategory;
  /** CDN path relative to assets.grudge-studio.com */
  path: string;
  quality: NatureQuality;
  runtimeReady: boolean;
  heightM: [number, number];
  /** Mesh parent names inside multi-mesh packs */
  variants?: string[];
  /** Biomes this asset is preferred for */
  biomes?: string[];
  notes?: string;
}

// ── R2 layout ───────────────────────────────────────────────────────────────

export const NATURE_STORAGE = {
  cdnBase: 'https://assets.grudge-studio.com',
  stylizedRoot: '/models/nature/stylized',
  biome: '/models/nature/stylized/biome',
  rocks: '/models/nature/stylized/rocks',
  cliffs: '/models/nature/stylized/cliffs',
  harvest: '/models/nature/stylized/harvest',
  /** Legacy — do not use for new scatter */
  realisticRoot: '/models/nature/realistic',
  environmentPacks: '/models/environment',
  bannedMegakit: '/models/nature',
} as const;

// ── Canonical multi-mesh pack paths ─────────────────────────────────────────

export const STYLIZED_PACK_PATHS = {
  snow: '/models/nature/stylized/biome/snowbiomes.glb',
  volcanic: '/models/nature/stylized/biome/volcanicnature.glb',
  tropical: '/models/nature/stylized/biome/tropical_plants.glb',
  plainsTrees: '/models/nature/stylized/biome/realistic_trees.glb',
  vegetation: '/models/nature/stylized/biome/nature_vegetation.glb',
  rocks: '/models/nature/stylized/rocks/stylised_rocks.glb',
  cliff: '/models/nature/stylized/cliffs/stylized_cliff_face.glb',
  flowers: '/models/nature/stylized/harvest/flowers_pack.glb',
  foliage: '/models/nature/stylized/harvest/foliage_pack.glb',
  minerals: '/models/nature/stylized/harvest/minerals_pack.glb',
} as const;

/** Named variants to clone (never place whole multi-mesh scene). */
export const STYLIZED_VARIANTS = {
  snowTrees: ['Pine_1', 'Pine_2', 'Pine_3', 'Pine_4', 'Pine_5'],
  snowRocks: [
    'Path_rock_1', 'Path_rock_2', 'Path_rock_6', 'Path_rock_7',
    'Path_rock_8', 'Path_rock_9', 'Mountain_1', 'Mountain_2',
  ],
  tropicalPalms: [
    'SM_MZRa_Palm_B081', 'SM_MZRa_Palm_B082', 'SM_MZRa_Palm_B083',
  ],
  tropicalPlants: [
    'SM_MZRa_Banana_B091', 'SM_MZRa_Banana_B092',
    'SM_MZRa_Fern_B051', 'SM_MZRa_Fern_B052', 'SM_MZRa_Fern_B053',
    'tree.007SM_MZRa_Monstera_B072', 'tree.006SM_MZRa_Monstera_B071',
  ],
  plainsTrees: ['Tree_Bark_0', 'Tree_Bark.001_1'],
  vegetationTrees: [
    'Tree_Big_a_LOD0_17', 'Tree_Big_b_LOD0_13', 'Tree_Big_c_LOD0_16',
    'Tree_Small_a_LOD0_12', 'Tree_Small_b_LOD0_15', 'Tree_Small_c_LOD0_5',
    'Tree_Small_d_LOD0_4', 'Pine_Big_LOD0_7', 'Pine_Medium_LOD0_6',
    'Pine_Small_LOD0_9', 'Conifer_LOD0_8',
  ],
  vegetationRocks: [
    'Stone_Small_b_LOD0_22', 'Bush_a_20', 'Bush_b_10', 'Bush_c_11',
  ],
  stylizedRocks: [
    'Plain_Rock1', 'Plain_Rock2', 'Plain_Rock3', 'Plain_Rock4', 'Plain_Rock5',
    'Plain_Rock6', 'Plain_Rock7', 'Plain_Rock8', 'Plain_Rock9', 'Plain_Rock10',
    'Plain_Rock11', 'Plain_Rock12', 'Plain_Rock13', 'Plain_Rock14', 'Plain_Rock15',
  ],
  flowers: [
    'flower15', 'flower15.001', 'flower15.002',
    'Plane.001', 'Plane.012', 'Plane.013', 'Plane.019', 'Plane.021',
    'Plane.022', 'Plane.030', 'Plane.031', 'Plane.036',
    'Cylinder.001', 'Cylinder.003', 'Cylinder.004', 'Cylinder.005',
  ],
  foliage: [
    'TexturesCom_NaturePlants0032_1_masked_S',
    'TexturesCom_NaturePlants0072_1_masked_S',
    'TexturesCom_NaturePlants0033_9_M',
    'TexturesCom_NaturePlants0049_1_masked_S.001',
    'NicePng_grass-png-transparent_8738791.001',
    'TexturesCom_NaturePlants0026_1_masked_S.003',
  ],
  minerals: [
    'crystal_basalt_green.007', 'crystal_basalt_green.008',
    'crystal_basalt_green.010', 'crystal_basalt_green.011',
    'crystal_basalt_green.013', 'crystal_basalt_green.014',
    'crystal_basalt_green.017', 'crystal_basalt_green.018',
    'crystal_basalt_green.019', 'crystal_basalt_green.020',
  ],
  /** Volcanic pack uses Object_N — pick a range of mesh indices as variant names */
  volcanic: [
    'Object_2', 'Object_3', 'Object_4', 'Object_5', 'Object_6',
    'Object_7', 'Object_8', 'Object_9', 'Object_10', 'Object_11',
    'Object_12', 'Object_13', 'Object_14', 'Object_15',
  ],
  cliff: ['mountains'],
} as const;

// ── Hard ban: square-leaf / megakit / procedural poly ───────────────────────

/**
 * Path fragments never used for home-island nature (except stylized allowlist root).
 */
export const BANNED_NATURE_PATH_FRAGMENTS = [
  'CommonTree',
  'TwistedTree',
  'DeadTree',
  'Rock_Medium',
  'RockPath_',
  'Pebble_Round',
  'Bush_Common',
  'Grass_Common',
  'Grass_Wispy',
  'Flower_3_Group',
  'Flower_4_Group',
  'Mushroom_Common',
  'Mushroom_Laetiporus',
  'Fern_1',
  'Plant_1',
  'Plant_7',
  'Clover_',
  'nature-megakit',
  '/models/lowpoly/',
  // Square-leaf interim extracts from island_tree megakit-style pack
  'island_tree',
  '/models/nature/organized/',
  '/models/nature/realistic/trees/deciduous/',
  '/models/nature/realistic/trees/pine/',
  '/models/nature/realistic/trees/snow/',
  'pine2_14',
  'pine9_15',
  'birch2_4',
  'birch6_5',
  'garden_tree_pink',
  'creepy_tree1',
  'ancient_tree_2_0',
  // Procedural billboard forests
  'InstancedProceduralForest',
  'procedural-instanced-forest',
] as const;

export const BANNED_MEGAKIT_PINE = [
  '/models/nature/Pine_1.glb',
  '/models/nature/Pine_2.glb',
  '/models/nature/Pine_3.glb',
  '/models/nature/Pine_4.glb',
  '/models/nature/Pine_5.glb',
] as const;

/** Stylized root is always approved even if filename contains "low_poly". */
export function isStylizedNaturePath(path: string): boolean {
  return !!path && path.replace(/\\/g, '/').includes('/models/nature/stylized/');
}

export function isBannedNaturePath(path: string): boolean {
  if (!path) return true;
  const p = path.replace(/\\/g, '/');
  // Allowlisted stylized packs win
  if (isStylizedNaturePath(p)) return false;
  if (BANNED_MEGAKIT_PINE.some((x) => p.endsWith(x) || p.includes(x))) return true;
  // Ban legacy palm extract only if NOT stylized tropical pack
  if (p.includes('palm2_13') && !p.includes('tropical')) return true;
  return BANNED_NATURE_PATH_FRAGMENTS.some((frag) =>
    p.toLowerCase().includes(frag.toLowerCase()),
  );
}

export function filterApprovedNaturePaths(paths: readonly string[]): string[] {
  return paths.filter((p) => !isBannedNaturePath(p));
}

// ── Pack path helpers ───────────────────────────────────────────────────────

export const ENVIRONMENT_PACK_PATHS = {
  /** @deprecated square-leaf — banned */
  tree: '/models/environment/island_tree.glb',
  rock: STYLIZED_PACK_PATHS.rocks,
  ore: STYLIZED_PACK_PATHS.minerals,
  gem: STYLIZED_PACK_PATHS.minerals,
  tropical: STYLIZED_PACK_PATHS.tropical,
  vegetation: STYLIZED_PACK_PATHS.vegetation,
  plainsTrees: STYLIZED_PACK_PATHS.plainsTrees,
  snow: STYLIZED_PACK_PATHS.snow,
  volcanic: STYLIZED_PACK_PATHS.volcanic,
  flowers: STYLIZED_PACK_PATHS.flowers,
  foliage: STYLIZED_PACK_PATHS.foliage,
  cliff: STYLIZED_PACK_PATHS.cliff,
} as const;

export function isEnvironmentPackPath(path: string): boolean {
  if (!path) return false;
  const p = path.replace(/\\/g, '/');
  if (isBannedNaturePath(p) && !isStylizedNaturePath(p)) return false;
  return (
    Object.values(STYLIZED_PACK_PATHS).some((pack) => p === pack || p.endsWith(pack)) ||
    p.includes('/models/nature/stylized/')
  );
}

/**
 * Map scatter path → multi-mesh pack role for variant cloning.
 * Returns null for single-mesh files.
 */
export function packResourceTypeForPath(
  path: string,
): 'tree' | 'rock' | 'goldRock' | 'gem' | 'palm' | 'flower' | 'plant' | null {
  if (!path || isBannedNaturePath(path)) return null;
  const p = path.replace(/\\/g, '/');
  if (p.includes('tropical_plants') || p.includes('tropical')) return 'palm';
  if (p.includes('snowbiomes') || p.includes('realistic_trees') || p.includes('nature_vegetation') || p.includes('volcanicnature')) {
    return 'tree';
  }
  if (p.includes('stylised_rocks') || p.includes('cliff_face')) return 'rock';
  if (p.includes('minerals_pack') || p.includes('gem_cluster') || p.includes('harvest_gold')) return 'gem';
  if (p.includes('flowers_pack')) return 'flower';
  if (p.includes('foliage_pack')) return 'plant';
  // Banned legacy
  if (p.includes('island_tree')) return null;
  if (p.includes('island_rock')) return 'rock';
  return null;
}

export function natureScatterNeedsRegenerate(
  instances: ReadonlyArray<{ modelPath?: string }>,
): boolean {
  if (!instances.length) return true;
  let banned = 0;
  for (const inst of instances) {
    if (!inst.modelPath || isBannedNaturePath(inst.modelPath)) banned++;
  }
  return banned > 0 && banned >= Math.ceil(instances.length * 0.5);
}

export function filterNatureScatterInstances<T extends { modelPath: string }>(
  instances: readonly T[],
): T[] {
  return instances.filter((i) => i.modelPath && !isBannedNaturePath(i.modelPath));
}

// ── Catalog entries ─────────────────────────────────────────────────────────

export const STYLIZED_NATURE_ASSETS: NatureAssetEntry[] = [
  {
    id: 'pack_tropical_palms',
    category: 'tree_palm',
    path: STYLIZED_PACK_PATHS.tropical,
    quality: 'stylized',
    runtimeReady: true,
    heightM: [6, 12],
    variants: [...STYLIZED_VARIANTS.tropicalPalms],
    biomes: ['beach', 'tropical', 'shore', 'haven', 'storm'],
    notes: 'Highest stylized palms — primary beach trees',
  },
  {
    id: 'pack_tropical_plants',
    category: 'plant',
    path: STYLIZED_PACK_PATHS.tropical,
    quality: 'stylized',
    runtimeReady: true,
    heightM: [1.2, 4],
    variants: [...STYLIZED_VARIANTS.tropicalPlants],
    biomes: ['beach', 'tropical'],
  },
  {
    id: 'pack_plains_trees',
    category: 'tree_deciduous',
    path: STYLIZED_PACK_PATHS.plainsTrees,
    quality: 'stylized',
    runtimeReady: true,
    heightM: [7, 14],
    variants: [...STYLIZED_VARIANTS.plainsTrees],
    biomes: ['plains', 'grass', 'field', 'mountain', 'forest'],
    notes: 'realistic_trees_pack_of_2_free — HQ bark+leaves',
  },
  {
    id: 'pack_vegetation_trees',
    category: 'tree_deciduous',
    path: STYLIZED_PACK_PATHS.vegetation,
    quality: 'stylized',
    runtimeReady: true,
    heightM: [5, 12],
    variants: [...STYLIZED_VARIANTS.vegetationTrees],
    biomes: ['forest', 'plains', 'mountain', 'grass'],
  },
  {
    id: 'pack_snow_pines',
    category: 'tree_snow',
    path: STYLIZED_PACK_PATHS.snow,
    quality: 'stylized',
    runtimeReady: true,
    heightM: [5, 11],
    variants: [...STYLIZED_VARIANTS.snowTrees],
    biomes: ['snow', 'winter', 'frost', 'frozen'],
  },
  {
    id: 'pack_volcanic',
    category: 'tree_volcanic',
    path: STYLIZED_PACK_PATHS.volcanic,
    quality: 'stylized',
    runtimeReady: true,
    heightM: [3, 9],
    variants: [...STYLIZED_VARIANTS.volcanic],
    biomes: ['volcanic', 'ember', 'ashen'],
  },
  {
    id: 'pack_stylized_rocks',
    category: 'rock',
    path: STYLIZED_PACK_PATHS.rocks,
    quality: 'stylized',
    runtimeReady: true,
    heightM: [1.4, 4.5],
    variants: [...STYLIZED_VARIANTS.stylizedRocks],
    biomes: ['*'],
  },
  {
    id: 'pack_snow_rocks',
    category: 'rock',
    path: STYLIZED_PACK_PATHS.snow,
    quality: 'stylized',
    runtimeReady: true,
    heightM: [1.2, 5],
    variants: [...STYLIZED_VARIANTS.snowRocks],
    biomes: ['snow', 'winter', 'frost'],
  },
  {
    id: 'pack_cliff',
    category: 'cliff',
    path: STYLIZED_PACK_PATHS.cliff,
    quality: 'stylized',
    runtimeReady: true,
    heightM: [8, 24],
    variants: [...STYLIZED_VARIANTS.cliff],
    biomes: ['mountain', 'rock', 'volcanic'],
  },
  {
    id: 'pack_flowers',
    category: 'flower',
    path: STYLIZED_PACK_PATHS.flowers,
    quality: 'stylized',
    runtimeReady: true,
    heightM: [0.4, 1.2],
    variants: [...STYLIZED_VARIANTS.flowers],
    biomes: ['*'],
  },
  {
    id: 'pack_foliage_harvest',
    category: 'plant',
    path: STYLIZED_PACK_PATHS.foliage,
    quality: 'stylized',
    runtimeReady: true,
    heightM: [0.3, 1.5],
    variants: [...STYLIZED_VARIANTS.foliage],
    biomes: ['*'],
  },
  {
    id: 'pack_minerals',
    category: 'crystal',
    path: STYLIZED_PACK_PATHS.minerals,
    quality: 'stylized',
    runtimeReady: true,
    heightM: [0.8, 2.4],
    variants: [...STYLIZED_VARIANTS.minerals],
    biomes: ['*'],
    notes: 'free_lowpoly_minerals — crystals/gems harvest',
  },
];

/** @deprecated empty — use STYLIZED_NATURE_ASSETS */
export const REALISTIC_NATURE_ASSETS: NatureAssetEntry[] = [];

/** Legacy interim — only rocks stump/logs if stylized missing; trees BANNED */
export const INTERIM_PACK_ASSETS: NatureAssetEntry[] = [
  {
    id: 'pack_stump',
    category: 'harvest_stump',
    path: '/models/environment/harvest_stump.glb',
    quality: 'interim_pack',
    runtimeReady: true,
    heightM: [0.6, 1.0],
  },
  {
    id: 'pack_log',
    category: 'harvest_log',
    path: '/models/environment/harvest_logs.glb',
    quality: 'interim_pack',
    runtimeReady: true,
    heightM: [0.5, 1.0],
  },
];

export const APPROVED_NATURE_ASSETS: NatureAssetEntry[] = [
  ...STYLIZED_NATURE_ASSETS,
  ...INTERIM_PACK_ASSETS,
];

export function assetsForCategory(
  category: NatureCategory,
  opts?: { allowInterim?: boolean; realisticOnly?: boolean; runtimeOnly?: boolean },
): NatureAssetEntry[] {
  const allowInterim = opts?.allowInterim !== false;
  const runtimeOnly = opts?.runtimeOnly !== false;
  return APPROVED_NATURE_ASSETS.filter((a) => {
    if (a.category !== category) return false;
    if (isBannedNaturePath(a.path)) return false;
    if (runtimeOnly && !a.runtimeReady) return false;
    if (!allowInterim && a.quality === 'interim_pack') return false;
    return true;
  });
}

export function pathsForCategory(
  category: NatureCategory,
  opts?: { allowInterim?: boolean; realisticOnly?: boolean; runtimeOnly?: boolean },
): string[] {
  return assetsForCategory(category, opts).map((a) => a.path);
}

export function treePathsForClass(
  treeClass: 'pine' | 'stylized' | 'palm' | 'snow_pine' | 'volcanic',
  opts?: { allowInterim?: boolean; runtimeOnly?: boolean },
): string[] {
  const map: Record<string, NatureCategory[]> = {
    pine: ['tree_pine', 'tree_deciduous'],
    stylized: ['tree_deciduous'],
    palm: ['tree_palm'],
    snow_pine: ['tree_snow'],
    volcanic: ['tree_volcanic'],
  };
  const cats = map[treeClass] ?? ['tree_deciduous'];
  return [...new Set(cats.flatMap((c) => pathsForCategory(c, opts)))].filter(
    (p) => !isBannedNaturePath(p),
  );
}

export function rockPaths(opts?: { allowInterim?: boolean; runtimeOnly?: boolean }): string[] {
  return pathsForCategory('rock', opts);
}

/** Harvest tree pack — stylized vegetation / plains, never island_tree. */
export function harvestTreePack(): {
  path: string;
  variants: string[];
  heightM: [number, number];
} {
  return {
    path: STYLIZED_PACK_PATHS.vegetation,
    variants: [...STYLIZED_VARIANTS.vegetationTrees],
    heightM: [5.5, 11],
  };
}

export function harvestRockPack(): {
  path: string;
  variants: string[];
  heightM: [number, number];
} {
  return {
    path: STYLIZED_PACK_PATHS.rocks,
    variants: [...STYLIZED_VARIANTS.stylizedRocks],
    heightM: [1.6, 3.8],
  };
}

export function harvestPalmPack(): {
  path: string;
  variants: string[];
  heightM: [number, number];
} {
  return {
    path: STYLIZED_PACK_PATHS.tropical,
    variants: [...STYLIZED_VARIANTS.tropicalPalms],
    heightM: [6, 12],
  };
}

export function harvestCrystalPack(): {
  path: string;
  variants: string[];
  heightM: [number, number];
} {
  return {
    path: STYLIZED_PACK_PATHS.minerals,
    variants: [...STYLIZED_VARIANTS.minerals],
    heightM: [0.8, 2.4],
  };
}

/**
 * Biome → scatter model paths (stylized only).
 */
export function scatterPathsForBiome(biome: string): Record<string, string[]> {
  const b = (biome ?? '').toLowerCase();
  const rocks = [STYLIZED_PACK_PATHS.rocks];
  const flowers = [STYLIZED_PACK_PATHS.flowers];
  const plants = [STYLIZED_PACK_PATHS.foliage];

  if (b.includes('snow') || b.includes('winter') || b.includes('frost') || b.includes('frozen')) {
    return {
      tree: [STYLIZED_PACK_PATHS.snow],
      pine: [STYLIZED_PACK_PATHS.snow],
      palm: [],
      rock: [STYLIZED_PACK_PATHS.snow, STYLIZED_PACK_PATHS.rocks],
      flower: flowers,
      plant: plants,
    };
  }
  if (b.includes('volcan') || b.includes('ember') || b.includes('ashen')) {
    return {
      tree: [STYLIZED_PACK_PATHS.volcanic],
      pine: [STYLIZED_PACK_PATHS.volcanic],
      palm: [],
      rock: [STYLIZED_PACK_PATHS.rocks, STYLIZED_PACK_PATHS.cliff],
      flower: flowers,
      plant: plants,
    };
  }
  if (
    b.includes('beach') ||
    b.includes('tropic') ||
    b.includes('shore') ||
    b.includes('haven') ||
    b.includes('storm')
  ) {
    return {
      tree: [STYLIZED_PACK_PATHS.tropical],
      pine: [],
      palm: [STYLIZED_PACK_PATHS.tropical],
      rock: rocks,
      flower: flowers,
      plant: [STYLIZED_PACK_PATHS.tropical, STYLIZED_PACK_PATHS.foliage],
    };
  }
  // mountain / plains / forest / default
  return {
    tree: [STYLIZED_PACK_PATHS.plainsTrees, STYLIZED_PACK_PATHS.vegetation],
    pine: [STYLIZED_PACK_PATHS.vegetation],
    palm: [],
    rock: [STYLIZED_PACK_PATHS.rocks, STYLIZED_PACK_PATHS.cliff],
    flower: flowers,
    plant: plants,
  };
}

function uniqPaths(paths: string[]): string[] {
  return [...new Set(filterApprovedNaturePaths(paths))];
}

/** Scatter table for generators — stylized only, no square-leaf trees. */
export const ORGANIZED_NATURE_SCATTER_PATHS: Record<string, string[]> = {
  tree: uniqPaths([
    STYLIZED_PACK_PATHS.plainsTrees,
    STYLIZED_PACK_PATHS.vegetation,
  ]),
  pine: uniqPaths([STYLIZED_PACK_PATHS.vegetation, STYLIZED_PACK_PATHS.snow]),
  palm: uniqPaths([STYLIZED_PACK_PATHS.tropical]),
  snow: uniqPaths([STYLIZED_PACK_PATHS.snow]),
  rock: uniqPaths([STYLIZED_PACK_PATHS.rocks]),
  bush: uniqPaths([STYLIZED_PACK_PATHS.foliage]),
  grass: [],
  mushroom: [],
  flower: uniqPaths([STYLIZED_PACK_PATHS.flowers]),
  fern: uniqPaths([STYLIZED_PACK_PATHS.tropical]),
  plant: uniqPaths([STYLIZED_PACK_PATHS.foliage, STYLIZED_PACK_PATHS.tropical]),
};

export function exportNatureAssetCatalogDoc() {
  return {
    version: NATURE_ASSET_CATALOG_VERSION,
    policy:
      'Stylized multi-mesh packs only. No square-leaf island_tree / megakit / procedural billboard forests. ' +
      'Palms from tropical_plants; plains from realistic_trees; snow from snowbiomes; volcanic from volcanicnature.',
    packs: STYLIZED_PACK_PATHS,
    variants: STYLIZED_VARIANTS,
    bannedFragments: [...BANNED_NATURE_PATH_FRAGMENTS],
    stylized: STYLIZED_NATURE_ASSETS,
    scatterPaths: ORGANIZED_NATURE_SCATTER_PATHS,
  };
}

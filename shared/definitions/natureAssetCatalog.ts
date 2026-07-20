/**
 * Nature asset catalog — home island + harvest SSOT.
 *
 * PRIMARY (battle-proven): Kenney / tactics pack used on
 *   https://game.grudge-studio.com/game/battle  → NatureDecor.tsx
 *   assets.grudge-studio.com/models/nature/CommonTree_*.gltf (+ rocks, bushes)
 *
 * SECONDARY: stylized multi-mesh packs under /models/nature/stylized/*
 *
 * BANNED: square-leaf island_tree extracts, InstancedProceduralForest billboards,
 *   megakit organized/realistic folder dumps.
 *
 * R2: assets.grudge-studio.com/models/nature/*
 */

export const NATURE_ASSET_CATALOG_VERSION = '3.0.0-battle';

// ── Battle nature pack (game.grudge-studio.com/game/battle NatureDecor) ─────

/**
 * Same files as Grudge-Studio-Game NatureDecor — on R2 as both .glb and .gltf.
 * Prefer .glb (single-file, local public/ + CDN); .gltf still allowlisted.
 */
export const BATTLE_NATURE_PACK = {
  trees: [
    '/models/nature/CommonTree_1.glb',
    '/models/nature/CommonTree_2.glb',
    '/models/nature/CommonTree_3.glb',
    '/models/nature/CommonTree_4.glb',
    '/models/nature/CommonTree_5.glb',
  ],
  deadTrees: [
    '/models/nature/DeadTree_1.glb',
    '/models/nature/DeadTree_2.glb',
    '/models/nature/DeadTree_3.glb',
    '/models/nature/DeadTree_4.glb',
    '/models/nature/DeadTree_5.glb',
  ],
  pines: [
    '/models/nature/Pine_1.glb',
    '/models/nature/Pine_2.glb',
    '/models/nature/Pine_3.glb',
    '/models/nature/Pine_4.glb',
    '/models/nature/Pine_5.glb',
  ],
  rocks: [
    '/models/nature/Pebble_Round_1.glb',
    '/models/nature/Pebble_Round_2.glb',
    '/models/nature/Pebble_Round_3.glb',
    '/models/nature/Pebble_Round_4.glb',
    '/models/nature/Pebble_Round_5.glb',
    '/models/nature/Rock_Medium_1.glb',
    '/models/nature/Rock_Medium_2.glb',
    '/models/nature/Rock_Medium_3.glb',
  ],
  bushes: [
    '/models/nature/Bush_Common.glb',
    '/models/nature/Bush_Common_Flowers.glb',
  ],
  mushrooms: [
    '/models/nature/Mushroom_Common.glb',
    '/models/nature/Mushroom_Laetiporus.glb',
  ],
  flowers: [
    '/models/nature/Flower_3_Group.glb',
    '/models/nature/Flower_3_Single.glb',
    '/models/nature/Flower_4_Group.glb',
    '/models/nature/Flower_4_Single.glb',
  ],
  /** Dry land ground cover — meadows, forest floor, island interiors */
  grasses: [
    '/models/nature/Grass_Common_Short.glb',
    '/models/nature/Grass_Common_Tall.glb',
    '/models/nature/Grass_Wispy_Short.glb',
    '/models/nature/Grass_Wispy_Tall.glb',
    '/models/nature/Clover_1.glb',
    '/models/nature/Clover_2.glb',
    '/models/nature/Fern_1.glb',
  ],
  plants: [
    '/models/nature/Plant_1.glb',
    '/models/nature/Plant_1_Big.glb',
    '/models/nature/Plant_7.glb',
    '/models/nature/Plant_7_Big.glb',
  ],
} as const;

export function pickBattleNaturePath(
  kind: keyof typeof BATTLE_NATURE_PACK,
  rng: () => number = Math.random,
): string {
  const list = BATTLE_NATURE_PACK[kind];
  return list[Math.floor(rng() * list.length)]!;
}

/** True for battle NatureDecor assets (allowlisted even if name looks “low poly”). */
export function isBattleNaturePath(path: string): boolean {
  if (!path) return false;
  const p = path.replace(/\\/g, '/');
  if (!p.includes('/models/nature/')) return false;
  return (
    /CommonTree_|DeadTree_|TwistedTree_|Pine_[0-9]|Pebble_Round_|Pebble_Square_|Bush_Common|Mushroom_Common|Mushroom_Laetiporus|Rock_Medium_|Flower_[34]_|Grass_|Clover_|Fern_|Plant_[17]/i.test(
      p,
    ) && !p.includes('/stylized/') && !p.includes('/organized/') && !p.includes('/realistic/')
  );
}

/** Prefer .glb; fall back to .gltf for battle pack loaders. */
export function battleNaturePathCandidates(path: string): string[] {
  const p = path.replace(/\\/g, '/');
  if (p.endsWith('.glb')) return [p, p.replace(/\.glb$/i, '.gltf')];
  if (p.endsWith('.gltf')) return [p, p.replace(/\.gltf$/i, '.glb')];
  return [p];
}

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
  /** Good home-island concept — HQ trees/cliffs/haven (exampleisland.glb) */
  exampleIsland: '/models/nature/stylized/concept/example_home_island.glb',
  rocks: '/models/nature/stylized/rocks/stylised_rocks.glb',
  volcanicRocks: '/models/nature/stylized/rocks/volcanic_rocks.glb',
  cliff: '/models/nature/stylized/cliffs/stylized_cliff_face.glb',
  flowers: '/models/nature/stylized/harvest/flowers_pack.glb',
  foliage: '/models/nature/stylized/harvest/foliage_pack.glb',
  minerals: '/models/nature/stylized/harvest/minerals_pack.glb',
  oreNodes: '/models/nature/stylized/harvest/ore_nodes.glb',
  pond: '/models/nature/stylized/harvest/pond_pack.glb',
  /** Low-poly crop growth stages F1–F3 + soil tiles (carrot/potato/tomato/wheat) */
  crops: '/models/nature/stylized/harvest/crops_low_poly.glb',
  templeRuins: '/models/nature/stylized/ruins/temple_ruins.glb',
  ancientRuins: '/models/nature/stylized/ruins/ancient_ruins.glb',
} as const;

/**
 * Warlords surface layers — land / coast / water / mountain.
 * Every path is expected on assets.grudge-studio.com (R2 grudge-assets).
 * Audit: `node scripts/audit-biome-assets.mjs`
 */
export const WARLORDS_SURFACE_ASSETS = {
  /** Battle Kenney pack — default home-island + open land scatter */
  landScatter: BATTLE_NATURE_PACK,
  /** Biome multipacks (clone named nodes — never place whole scene) */
  biomePacks: STYLIZED_PACK_PATHS,
  /** Coast / shore */
  coast: {
    tropicalPack: STYLIZED_PACK_PATHS.tropical,
    palms: [
      '/models/nature/realistic/trees/palm/palm_a.glb',
      '/models/nature/realistic/trees/palm/palm_b.glb',
    ],
    sandGround: 'ground_1' as const,
  },
  /** Water / pond / waterfall props + fish */
  water: {
    pondPack: STYLIZED_PACK_PATHS.pond,
    fish: [
      '/models/creatures/fish/anglerfish.glb',
      '/models/creatures/fish/lionfish.glb',
      '/models/creatures/fish/goldfish.glb',
      '/models/creatures/fish/blobfish.glb',
      '/models/creatures/fish/catfish.glb',
      '/models/creatures/fish/butterflyfish.glb',
      '/models/creatures/fish/flatfish.glb',
      '/models/creatures/fish/shark.glb',
    ],
    predator: ['/models/creatures/predator/shark.glb'],
  },
  /** Mountains / event peaks */
  mountains: [
    '/models/evil_rock_mountain_peak_0.glb',
    '/models/evil_rock_mountain_peak_1.glb',
    '/models/evil_rock_mountain_peak_2.glb',
    '/models/evil_rock_mountains_triad.glb',
  ],
  /** Harvest nodes */
  harvest: {
    stump: '/models/environment/harvest_stump.glb',
    logs: '/models/environment/harvest_logs.glb',
    debris: '/models/environment/harvest_rock_debris.glb',
    goldRocks: '/models/environment/harvest_gold_rocks.glb',
    gem: '/models/environment/gem_cluster.glb',
    mineralsPack: STYLIZED_PACK_PATHS.minerals,
    oreNodes: STYLIZED_PACK_PATHS.oreNodes,
  },
  /** All 12 biome review boards */
  biomeReview: [
    'abyssal', 'beach', 'desert', 'ethereal', 'forest', 'frozen',
    'nexus', 'plains', 'storm', 'tropical', 'volcanic', 'winter',
  ].map((id) => `/models/biomes/review/${id}.glb`),
  /** Ground PBR ids → Ground_N_BaseColor.png on CDN */
  groundPbrIds: [
    'ground_1', 'ground_2', 'ground_3', 'ground_4', 'ground_5',
    'ground_6', 'ground_7', 'ground_8', 'ground_9', 'ground_10',
  ] as const,
} as const;

/** Flatten all Warlords surface asset paths for CDN audits. */
export function collectWarlordsSurfacePaths(): string[] {
  const out = new Set<string>();
  const add = (p: string | undefined | null) => {
    if (p && typeof p === 'string' && p.startsWith('/')) out.add(p);
  };
  for (const list of Object.values(BATTLE_NATURE_PACK)) {
    for (const p of list) add(p);
  }
  for (const p of Object.values(STYLIZED_PACK_PATHS)) add(p);
  for (const p of WARLORDS_SURFACE_ASSETS.coast.palms) add(p);
  add(WARLORDS_SURFACE_ASSETS.coast.tropicalPack);
  add(WARLORDS_SURFACE_ASSETS.water.pondPack);
  for (const p of WARLORDS_SURFACE_ASSETS.water.fish) add(p);
  for (const p of WARLORDS_SURFACE_ASSETS.water.predator) add(p);
  for (const p of WARLORDS_SURFACE_ASSETS.mountains) add(p);
  for (const p of Object.values(WARLORDS_SURFACE_ASSETS.harvest)) add(p);
  for (const p of WARLORDS_SURFACE_ASSETS.biomeReview) add(p);
  for (const id of WARLORDS_SURFACE_ASSETS.groundPbrIds) {
    const n = id.replace('ground_', '');
    add(`/textures/pbr/ground/Ground_${n}_BaseColor.png`);
    add(`/textures/pbr/ground/Ground_${n}_Normal.png`);
    add(`/textures/pbr/ground/Ground_${n}_Roughness.png`);
    add(`/textures/pbr/ground/Ground_${n}_AmbientOcclusion.png`);
  }
  return [...out].sort();
}

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
  /** Volcanic nature pack uses Object_N */
  volcanic: [
    'Object_2', 'Object_3', 'Object_4', 'Object_5', 'Object_6',
    'Object_7', 'Object_8', 'Object_9', 'Object_10', 'Object_11',
    'Object_12', 'Object_13', 'Object_14', 'Object_15',
  ],
  volcanicRocks: [
    'Cliff_01', 'Cliff_02', 'Cliff_03', 'Cliff_04', 'Cliff_05',
    'Cliff_Rock_01', 'Cliff_Rock_02', 'Cliff_Rock_03', 'Cliff_Rock_04',
    'Cliff_Rock_05', 'Rock_01', 'Rock_02', 'Rock_03', 'Rock_04',
  ],
  cliff: ['mountains'],
  /** Ore / crystal harvest nodes (minerals pack 2) */
  oreNodes: [
    'Tin_Node', 'Slatinum_Node', 'Prytonite_Node', 'Iron_Node',
    'Gatnumite_Node', 'Copper_Node', 'Coal_Node',
    'Ore_Tin', 'Ore_Iron', 'Ore_Copper', 'Ore_Coal',
  ],
  /** Temple ruins modular pieces — all biomes */
  templeRuins: [
    'Stone_Pillar', 'Stone_Pillar_Tall', 'Stone_Pillar_Broken',
    'Tall_Stone_Wall_Plain', 'Small_Stone_Wall_Plain', 'Stone_Stairs',
    'Stone_Archway', 'Stone_Statue', 'Stone_Pedestal', 'Tall_RockA',
    'Stone_DebrisA', 'Stone_DebrisB', 'Stone_Brick',
  ],
  /** Ancient ruins plants + stone */
  ancientRuins: [
    'AncientRuins_Plants1', 'AncientRuins_Plants2', 'AncientRuins_Plants3',
    'AncientRuins_Plants4', 'AncientRuins_Plants5', 'AncientRuins_Plants6',
    'AncientRuins_Plants7', 'AncientRuins_Plants8', 'AncientRuins_Plants9',
    'AncientRuins_Plants10', 'AncientRuins_Plants11', 'AncientRuins_Plants12',
  ],
  /** Concept home island — best stylized tree/cliff reference */
  exampleTrees: ['Tree1_171', 'Tree2_173', 'Trunk_174'],
  exampleRocks: ['Rock_9', 'Cliffs_2'],
  exampleHaven: ['Haven_3'],
  pond: [
    'Waterfall_Foam_Icosphere.001', 'Waterfall_Foam_Icosphere.002',
    'Waterfall_Foam_Icosphere.003', 'Waterfall_Foam_Icosphere.004',
  ],
} as const;

// ── Hard ban: square-leaf / megakit / procedural poly ───────────────────────

/**
 * Path fragments never used for home-island nature.
 * Battle pack (CommonTree etc.) is allowlisted via isBattleNaturePath — not banned.
 */
export const BANNED_NATURE_PATH_FRAGMENTS = [
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
  // Battle pack (tactics NatureDecor) — preferred home-island trees/rocks
  if (isBattleNaturePath(p)) return false;
  // Allowlisted stylized packs
  if (isStylizedNaturePath(p)) return false;
  // Battle pack pines (.glb/.gltf at nature root) are allowlisted via isBattleNaturePath
  if (isBattleNaturePath(p)) return false;
  // Only ban non-battle pine megakit dumps
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

/** Harvest tree pack — example island + HQ vegetation, never island_tree. */
/** Harvest trees = battle CommonTree pack (same as game.grudge-studio.com/game/battle) */
export function harvestTreePack(): {
  path: string;
  variants: string[];
  heightM: [number, number];
  /** When true, path is one of many single-mesh GLTFs (pick random) */
  battlePack: true;
  paths: readonly string[];
} {
  return {
    path: BATTLE_NATURE_PACK.trees[0],
    paths: BATTLE_NATURE_PACK.trees,
    battlePack: true,
    variants: [],
    heightM: [4.5, 11],
  };
}

export function harvestRockPack(): {
  path: string;
  variants: string[];
  heightM: [number, number];
  battlePack: true;
  paths: readonly string[];
} {
  return {
    path: BATTLE_NATURE_PACK.rocks[0],
    paths: BATTLE_NATURE_PACK.rocks,
    battlePack: true,
    variants: [],
    heightM: [0.6, 2.2],
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
    path: STYLIZED_PACK_PATHS.oreNodes,
    variants: [...STYLIZED_VARIANTS.oreNodes],
    heightM: [0.8, 2.4],
  };
}

export function harvestOrePack(): {
  path: string;
  variants: string[];
  heightM: [number, number];
} {
  return harvestCrystalPack();
}

export function templeRuinsPack(): {
  path: string;
  variants: string[];
  heightM: [number, number];
} {
  return {
    path: STYLIZED_PACK_PATHS.templeRuins,
    variants: [...STYLIZED_VARIANTS.templeRuins],
    heightM: [2, 8],
  };
}

/** Concept reference for quality bar (exampleisland.glb). */
export function exampleHomeIslandPack(): {
  path: string;
  trees: string[];
  rocks: string[];
  heightM: [number, number];
} {
  return {
    path: STYLIZED_PACK_PATHS.exampleIsland,
    trees: [...STYLIZED_VARIANTS.exampleTrees],
    rocks: [...STYLIZED_VARIANTS.exampleRocks],
    heightM: [6, 14],
  };
}

/**
 * Biome → scatter model paths (stylized only).
 */
export function scatterPathsForBiome(biome: string): Record<string, string[]> {
  const b = (biome ?? '').toLowerCase();
  const rocks = [STYLIZED_PACK_PATHS.rocks, STYLIZED_PACK_PATHS.templeRuins];
  const flowers = [STYLIZED_PACK_PATHS.flowers];
  const plants = [STYLIZED_PACK_PATHS.foliage, STYLIZED_PACK_PATHS.ancientRuins];
  /** Shared ruins + concept rocks for every biome */
  const sharedRocks = [
    STYLIZED_PACK_PATHS.rocks,
    STYLIZED_PACK_PATHS.templeRuins,
    STYLIZED_PACK_PATHS.cliff,
  ];

  if (b.includes('snow') || b.includes('winter') || b.includes('frost') || b.includes('frozen')) {
    return {
      tree: [STYLIZED_PACK_PATHS.snow],
      pine: [STYLIZED_PACK_PATHS.snow],
      palm: [],
      rock: [STYLIZED_PACK_PATHS.snow, ...sharedRocks],
      flower: flowers,
      plant: plants,
    };
  }
  if (b.includes('volcan') || b.includes('ember') || b.includes('ashen')) {
    return {
      tree: [STYLIZED_PACK_PATHS.volcanic],
      pine: [STYLIZED_PACK_PATHS.volcanic],
      palm: [],
      rock: [
        STYLIZED_PACK_PATHS.volcanicRocks,
        STYLIZED_PACK_PATHS.volcanic,
        STYLIZED_PACK_PATHS.cliff,
        STYLIZED_PACK_PATHS.rocks,
      ],
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
      tree: [STYLIZED_PACK_PATHS.tropical, STYLIZED_PACK_PATHS.exampleIsland],
      pine: [],
      palm: [STYLIZED_PACK_PATHS.tropical],
      rock: sharedRocks,
      flower: flowers,
      plant: [STYLIZED_PACK_PATHS.tropical, STYLIZED_PACK_PATHS.foliage, STYLIZED_PACK_PATHS.ancientRuins],
    };
  }
  // mountain / plains / forest — HQ realistic trees + example island concept trees
  return {
    tree: [
      STYLIZED_PACK_PATHS.exampleIsland,
      STYLIZED_PACK_PATHS.plainsTrees,
      STYLIZED_PACK_PATHS.vegetation,
    ],
    pine: [STYLIZED_PACK_PATHS.vegetation, STYLIZED_PACK_PATHS.exampleIsland],
    palm: [],
    rock: [...sharedRocks, STYLIZED_PACK_PATHS.exampleIsland],
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
    STYLIZED_PACK_PATHS.exampleIsland,
    STYLIZED_PACK_PATHS.plainsTrees,
    STYLIZED_PACK_PATHS.vegetation,
  ]),
  pine: uniqPaths([
    STYLIZED_PACK_PATHS.vegetation,
    STYLIZED_PACK_PATHS.snow,
    STYLIZED_PACK_PATHS.exampleIsland,
  ]),
  palm: uniqPaths([STYLIZED_PACK_PATHS.tropical]),
  snow: uniqPaths([STYLIZED_PACK_PATHS.snow]),
  rock: uniqPaths([
    STYLIZED_PACK_PATHS.rocks,
    STYLIZED_PACK_PATHS.templeRuins,
    STYLIZED_PACK_PATHS.cliff,
  ]),
  bush: uniqPaths([STYLIZED_PACK_PATHS.foliage, STYLIZED_PACK_PATHS.ancientRuins]),
  grass: [],
  mushroom: [],
  flower: uniqPaths([STYLIZED_PACK_PATHS.flowers]),
  fern: uniqPaths([STYLIZED_PACK_PATHS.tropical]),
  plant: uniqPaths([
    STYLIZED_PACK_PATHS.foliage,
    STYLIZED_PACK_PATHS.tropical,
    STYLIZED_PACK_PATHS.ancientRuins,
  ]),
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

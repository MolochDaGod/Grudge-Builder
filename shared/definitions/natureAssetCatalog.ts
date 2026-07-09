/**
 * Organized nature assets — realistic / PBR only.
 *
 * Low-poly megakit (Quaternius CommonTree, TwistedTree, DeadTree, Rock_Medium,
 * cartoon Pine scatter, etc.) is BANNED from home-island scatter, harvest
 * catalogs, and buildable nature props.
 *
 * R2 layout (assets.grudge-studio.com):
 *   /models/nature/realistic/trees/{pine,deciduous,palm,snow}/
 *   /models/nature/realistic/rocks/
 *   /models/nature/realistic/groundcover/
 *   /models/nature/realistic/harvest/
 *
 * Until realistic GLBs are uploaded, harvest uses the multi-mesh environment
 * packs (island_tree / island_rock) as interim — NOT the nature-megakit.
 * Scatter skips any path on the ban list or missing from the approved set.
 */

export const NATURE_ASSET_CATALOG_VERSION = '1.0.0';

export type NatureQuality = 'realistic' | 'interim_pack' | 'banned_lowpoly';

export type NatureCategory =
  | 'tree_pine'
  | 'tree_deciduous'
  | 'tree_palm'
  | 'tree_snow'
  | 'rock'
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
  /**
   * When false, path is catalog-only (upload pending) — never spawn/load at runtime.
   * Realistic slots start false until GLBs land on R2.
   */
  runtimeReady: boolean;
  /** Target world height range (m) at character ref 2.0 m */
  heightM: [number, number];
  /** Mesh names inside multi-mesh packs (optional) */
  variants?: string[];
  notes?: string;
}

// ── R2 organization (canonical prefixes) ────────────────────────────────────

export const NATURE_STORAGE = {
  cdnBase: 'https://assets.grudge-studio.com',
  /** Preferred HQ tree/rock root */
  realisticRoot: '/models/nature/realistic',
  trees: {
    pine: '/models/nature/realistic/trees/pine',
    deciduous: '/models/nature/realistic/trees/deciduous',
    palm: '/models/nature/realistic/trees/palm',
    snow: '/models/nature/realistic/trees/snow',
  },
  rocks: '/models/nature/realistic/rocks',
  groundcover: '/models/nature/realistic/groundcover',
  harvest: '/models/nature/realistic/harvest',
  /** Interim multi-mesh packs (not megakit) */
  environmentPacks: '/models/environment',
  /** Explicit ban root — never load for home islands */
  bannedMegakit: '/models/nature',
} as const;

// ── Hard ban: low-poly / polygon megakit ────────────────────────────────────

/**
 * Path fragments that must never be used for home-island nature.
 * Matches Quaternius Nature Megakit and similar low-poly kits.
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
  'low poly',
  'LowPoly',
  'low_poly',
] as const;

/** Pine_* megakit files are also low-poly — ban them from scatter/catalogs. */
export const BANNED_MEGAKIT_PINE = [
  '/models/nature/Pine_1.glb',
  '/models/nature/Pine_2.glb',
  '/models/nature/Pine_3.glb',
  '/models/nature/Pine_4.glb',
  '/models/nature/Pine_5.glb',
] as const;

export function isBannedNaturePath(path: string): boolean {
  if (!path) return true;
  const p = path.replace(/\\/g, '/');
  if (BANNED_MEGAKIT_PINE.some((x) => p.endsWith(x) || p.includes(x))) return true;
  return BANNED_NATURE_PATH_FRAGMENTS.some((frag) =>
    p.toLowerCase().includes(frag.toLowerCase()),
  );
}

export function filterApprovedNaturePaths(paths: readonly string[]): string[] {
  return paths.filter((p) => !isBannedNaturePath(p));
}

/** Multi-mesh environment packs — must clone named variants, never place whole scene. */
export const ENVIRONMENT_PACK_PATHS = {
  tree: '/models/environment/island_tree.glb',
  rock: '/models/environment/island_rock.glb',
  ore: '/models/environment/harvest_gold_rocks.glb',
  gem: '/models/environment/gem_cluster.glb',
} as const;

export function isEnvironmentPackPath(path: string): boolean {
  if (!path) return false;
  const p = path.replace(/\\/g, '/');
  return Object.values(ENVIRONMENT_PACK_PATHS).some(
    (pack) => p === pack || p.endsWith(pack),
  );
}

/**
 * Map a scatter path to IslandResourceLoader type (multi-mesh pack only).
 * Individual organized/realistic GLBs return null so loaders use the standalone file.
 */
export function packResourceTypeForPath(
  path: string,
): 'tree' | 'rock' | 'goldRock' | 'gem' | null {
  if (!path || isBannedNaturePath(path)) return null;
  const p = path.replace(/\\/g, '/');
  // Never treat split organized/realistic singles as multi-mesh packs
  if (p.includes('/nature/organized/') || p.includes('/nature/realistic/')) return null;
  if (p.endsWith('/island_tree.glb') || p.includes('/environment/island_tree')) return 'tree';
  if (p.includes('harvest_gold') || p.endsWith('harvest_gold_rocks.glb')) return 'goldRock';
  if (p.endsWith('gem_cluster.glb') || p.includes('/environment/gem_cluster')) return 'gem';
  if (p.endsWith('/island_rock.glb') || p.includes('/environment/island_rock')) return 'rock';
  if (isEnvironmentPackPath(p)) {
    if (p.includes('tree')) return 'tree';
    if (p.includes('rock')) return 'rock';
  }
  return null;
}

/**
 * True when a stored scatter payload is unsafe (banned megakit paths dominate).
 * Callers should regenerate rather than load and get empty foliage → procedural poly fallback.
 */
export function natureScatterNeedsRegenerate(
  instances: ReadonlyArray<{ modelPath?: string }>,
): boolean {
  if (!instances.length) return true;
  let banned = 0;
  for (const inst of instances) {
    if (!inst.modelPath || isBannedNaturePath(inst.modelPath)) banned++;
  }
  // Regenerate if majority banned or every path is unusable
  return banned > 0 && banned >= Math.ceil(instances.length * 0.5);
}

export function filterNatureScatterInstances<T extends { modelPath: string }>(
  instances: readonly T[],
): T[] {
  return instances.filter((i) => i.modelPath && !isBannedNaturePath(i.modelPath));
}

// ── Approved catalog (realistic first, interim packs second) ────────────────

/**
 * Realistic slots — upload GLBs here. Empty until R2 is populated.
 * Generators skip empty categories rather than falling back to low-poly.
 */
/**
 * Organized individual meshes extracted from environment packs
 * (export-organized-nature.mjs → R2). runtimeReady after pipeline upload.
 * NOT Quaternius megakit. Quality is pack-sourced interim until true HQ lands.
 */
export const REALISTIC_NATURE_ASSETS: NatureAssetEntry[] = [
  {
    id: 'pine_a',
    category: 'tree_pine',
    path: '/models/nature/realistic/trees/pine/pine_a.glb',
    quality: 'realistic',
    runtimeReady: true,
    heightM: [5.5, 9.5],
    notes: 'From island_tree pine2_14 via export-organized-nature',
  },
  {
    id: 'pine_b',
    category: 'tree_pine',
    path: '/models/nature/realistic/trees/pine/pine_b.glb',
    quality: 'realistic',
    runtimeReady: true,
    heightM: [4.5, 8.0],
  },
  {
    id: 'deciduous_a',
    category: 'tree_deciduous',
    path: '/models/nature/realistic/trees/deciduous/oak_a.glb',
    quality: 'realistic',
    runtimeReady: true,
    heightM: [6.0, 10.0],
  },
  {
    id: 'deciduous_b',
    category: 'tree_deciduous',
    path: '/models/nature/realistic/trees/deciduous/birch_a.glb',
    quality: 'realistic',
    runtimeReady: true,
    heightM: [5.0, 9.0],
  },
  {
    id: 'palm_a',
    category: 'tree_palm',
    path: '/models/nature/realistic/trees/palm/palm_a.glb',
    quality: 'realistic',
    runtimeReady: true,
    heightM: [6.0, 11.0],
  },
  {
    id: 'snow_pine_a',
    category: 'tree_snow',
    path: '/models/nature/realistic/trees/snow/snow_pine_a.glb',
    quality: 'realistic',
    runtimeReady: true,
    heightM: [5.0, 9.0],
  },
  {
    id: 'rock_boulder_a',
    category: 'rock',
    path: '/models/nature/realistic/rocks/boulder_a.glb',
    quality: 'realistic',
    runtimeReady: true,
    heightM: [1.6, 3.8],
  },
  {
    id: 'rock_boulder_b',
    category: 'rock',
    path: '/models/nature/realistic/rocks/boulder_b.glb',
    quality: 'realistic',
    runtimeReady: true,
    heightM: [1.4, 3.2],
  },
  {
    id: 'rock_cliff_a',
    category: 'rock',
    path: '/models/nature/realistic/rocks/cliff_chunk_a.glb',
    quality: 'realistic',
    runtimeReady: true,
    heightM: [2.0, 4.5],
  },
];

/**
 * Interim environment multi-mesh packs — allowed ONLY until realistic
 * trees/rocks land on R2. These are NOT Quaternius megakit scatter props.
 */
export const INTERIM_PACK_ASSETS: NatureAssetEntry[] = [
  {
    id: 'pack_island_tree',
    category: 'tree_deciduous',
    path: '/models/environment/island_tree.glb',
    quality: 'interim_pack',
    runtimeReady: true,
    heightM: [5.5, 9.5],
    variants: [
      'pine2_14',
      'pine9_15',
      'birch2_4',
      'birch6_5',
      'ancient_tree_2_0',
      'garden_tree_pink_11',
      'creepy_tree1_10',
      'palm2_13',
    ],
    notes: 'Multi-mesh pack interim; replace with realistic/trees/*',
  },
  {
    id: 'pack_island_rock',
    category: 'rock',
    path: '/models/environment/island_rock.glb',
    quality: 'interim_pack',
    runtimeReady: true,
    heightM: [1.8, 3.8],
    variants: ['rock_1', 'rock_2', 'rock_3', 'rock_4', 'rock_5', 'rock_6', 'rock_7', 'rock_8'],
    notes: 'Multi-mesh pack interim; replace with realistic/rocks/*',
  },
  {
    id: 'pack_gold_ore',
    category: 'ore',
    path: '/models/environment/harvest_gold_rocks.glb',
    quality: 'interim_pack',
    runtimeReady: true,
    heightM: [2.0, 4.2],
    variants: ['Rock', 'rock', 'Gold', 'Cube', 'Mesh'],
  },
  {
    id: 'pack_gem',
    category: 'crystal',
    path: '/models/environment/gem_cluster.glb',
    quality: 'interim_pack',
    runtimeReady: true,
    heightM: [1.6, 2.8],
    variants: ['Sphere', 'Sphere.001', 'Sphere.002'],
  },
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
  {
    id: 'pack_debris',
    category: 'harvest_debris',
    path: '/models/environment/harvest_rock_debris.glb',
    quality: 'interim_pack',
    runtimeReady: true,
    heightM: [0.25, 0.55],
  },
];

/** All non-banned entries (realistic + interim). */
export const APPROVED_NATURE_ASSETS: NatureAssetEntry[] = [
  ...REALISTIC_NATURE_ASSETS,
  ...INTERIM_PACK_ASSETS,
];

export function assetsForCategory(
  category: NatureCategory,
  opts?: { allowInterim?: boolean; realisticOnly?: boolean; runtimeOnly?: boolean },
): NatureAssetEntry[] {
  const allowInterim = opts?.allowInterim !== false;
  const realisticOnly = opts?.realisticOnly === true;
  const runtimeOnly = opts?.runtimeOnly !== false; // default: only loadable assets
  return APPROVED_NATURE_ASSETS.filter((a) => {
    if (a.category !== category) return false;
    if (isBannedNaturePath(a.path)) return false;
    if (runtimeOnly && !a.runtimeReady) return false;
    if (realisticOnly && a.quality !== 'realistic') return false;
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

/** Tree paths for biome class — never returns banned megakit. */
export function treePathsForClass(
  treeClass: 'pine' | 'stylized' | 'palm' | 'snow_pine',
  opts?: { allowInterim?: boolean; runtimeOnly?: boolean },
): string[] {
  const allowInterim = opts?.allowInterim !== false;
  const runtimeOnly = opts?.runtimeOnly !== false;
  const map: Record<string, NatureCategory[]> = {
    pine: ['tree_pine'],
    stylized: ['tree_deciduous'],
    palm: ['tree_palm'],
    snow_pine: ['tree_snow', 'tree_pine'],
  };
  const cats = map[treeClass] ?? ['tree_deciduous'];
  let paths = cats.flatMap((c) => pathsForCategory(c, { allowInterim: false, runtimeOnly }));
  // Fall back to interim multi-mesh pack only if no individual meshes ready
  if (paths.length === 0 && allowInterim) {
    paths = cats.flatMap((c) =>
      pathsForCategory(c, { allowInterim: true, runtimeOnly }),
    );
    if (paths.length === 0) {
      paths = pathsForCategory('tree_deciduous', { allowInterim: true, runtimeOnly });
    }
  }
  const unique = [...new Set(paths)].filter((p) => !isBannedNaturePath(p));
  return unique;
}

export function rockPaths(opts?: { allowInterim?: boolean; runtimeOnly?: boolean }): string[] {
  const allowInterim = opts?.allowInterim !== false;
  const runtimeOnly = opts?.runtimeOnly !== false;
  // Prefer individual realistic/organized rocks; interim pack only if none ready
  const realistic = pathsForCategory('rock', { allowInterim: false, runtimeOnly });
  if (realistic.length > 0) return realistic;
  if (allowInterim) return pathsForCategory('rock', { allowInterim: true, runtimeOnly });
  return [];
}

/** Harvest tree pack path + variants (interim island_tree until HQ). */
export function harvestTreePack(): {
  path: string;
  variants: string[];
  heightM: [number, number];
} {
  const interim = INTERIM_PACK_ASSETS.find((a) => a.id === 'pack_island_tree')!;
  return {
    path: interim.path,
    variants: interim.variants ?? [],
    heightM: interim.heightM,
  };
}

export function harvestRockPack(): {
  path: string;
  variants: string[];
  heightM: [number, number];
} {
  const interim = INTERIM_PACK_ASSETS.find((a) => a.id === 'pack_island_rock')!;
  return {
    path: interim.path,
    variants: interim.variants ?? [],
    heightM: interim.heightM,
  };
}

/**
 * Nature scatter model table — only approved categories.
 * Low-poly megakit categories (tree/pine/twisted/deadTree/Rock_Medium) removed.
 * Uses interim packs for tree/rock until realistic GLBs upload.
 */
function uniqPaths(paths: string[]): string[] {
  return [...new Set(filterApprovedNaturePaths(paths))];
}

export const ORGANIZED_NATURE_SCATTER_PATHS: Record<string, string[]> = {
  tree: uniqPaths([
    ...treePathsForClass('stylized', { allowInterim: true }),
    ...treePathsForClass('pine', { allowInterim: true }),
  ]),
  pine: uniqPaths(treePathsForClass('pine', { allowInterim: true })),
  palm: uniqPaths(treePathsForClass('palm', { allowInterim: true })),
  snow: uniqPaths(treePathsForClass('snow_pine', { allowInterim: true })),
  // deadTree / twisted intentionally omitted (banned low-poly look)
  rock: uniqPaths(rockPaths({ allowInterim: true })),
  // Groundcover: no approved realistic yet — empty (do not use megakit bush/grass)
  bush: [],
  grass: [],
  mushroom: [],
  flower: [],
  fern: [],
  plant: [],
};

export function exportNatureAssetCatalogDoc() {
  return {
    version: NATURE_ASSET_CATALOG_VERSION,
    policy:
      'No low-poly / polygon megakit nature on home islands. ' +
      'Organized R2 under /models/nature/realistic/*; interim environment packs only until HQ lands.',
    bannedFragments: [...BANNED_NATURE_PATH_FRAGMENTS],
    bannedMegakitPines: [...BANNED_MEGAKIT_PINE],
    storage: NATURE_STORAGE,
    realistic: REALISTIC_NATURE_ASSETS,
    interimPacks: INTERIM_PACK_ASSETS,
    scatterPaths: ORGANIZED_NATURE_SCATTER_PATHS,
  };
}

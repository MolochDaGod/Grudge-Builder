/**
 * Biome Ecosystem Catalog — ONE TRUTH for what each biome offers and where assets live.
 *
 * Rules (product):
 *  - Mountains: 20 m tall, ONE of the three evil-mountain peaks (seed picks 0|1|2)
 *  - Animals: exactly 5 land types per biome
 *  - Fish: 10 species available from water harvest nodes
 *  - Trees: snow pines (snow), palms/beach (beach/tropical), pines + deciduous otherwise
 *  - NO low-poly megakit (CommonTree/Twisted/Rock_Medium/Pine_* banned)
 *  - Size foundations: Driftwood Bay (coast) + Ironfang Spire (highland)
 *  - Harvest regen: 4 hours (generative seed deployment)
 *  - Character reference: 2.0 m
 */
import { CHARACTER_REFERENCE_HEIGHT_M } from './homeIslandSpec';
import {
  MOUNTAIN_TRIAD_PEAK_MODEL_PATHS,
  SKETCHFAB_EVIL_MOUNTAIN_TRIAD,
} from './homeIslandSeed';
import {
  harvestRockPack,
  harvestTreePack,
  NATURE_STORAGE,
  treePathsForClass,
  rockPaths,
} from './natureAssetCatalog';
import {
  DRIFTWOOD_BAY,
  IRONFANG_SPIRE,
  resolveHomeIslandFoundation,
} from './homeIslandFoundations';

export const ECOSYSTEM_CATALOG_VERSION = '1.1.0';

/** Full harvest cycle until mature again (seed designs). */
export const HARVEST_REGEN_MS = 4 * 60 * 60 * 1000; // 4 hours

/** Single mountain peak height in world meters. */
export const MOUNTAIN_PEAK_HEIGHT_M = 20;

export type EcosystemBiome =
  | 'tropical'
  | 'beach'
  | 'forest'
  | 'plains'
  | 'winter'
  | 'frozen'
  | 'desert'
  | 'volcanic'
  | 'storm'
  | 'ethereal'
  | 'abyssal'
  | 'nexus';

export type TreeClass = 'pine' | 'stylized' | 'palm' | 'snow_pine';

export interface EcosystemStorage {
  /** R2 CDN base (assets.grudge-studio.com) */
  cdnBase: string;
  /** Public path prefix for nature GLBs */
  nature: string;
  environment: string;
  mountains: string;
  texturesPbr: string;
  /** Railway SSOT for island seeds */
  seedDatabase: string;
  /** ObjectStore catalogs */
  contract: string;
  biomesCatalog: string;
}

export const ECOSYSTEM_STORAGE: EcosystemStorage = {
  cdnBase: 'https://assets.grudge-studio.com',
  nature: '/models/nature',
  environment: NATURE_STORAGE.environmentPacks,
  mountains: '/models',
  texturesPbr: '/textures/pbr/ground',
  seedDatabase: 'Railway Postgres home_islands.state',
  contract: 'https://info.grudge-studio.com/api/v1/home-island-contract.json',
  biomesCatalog: 'https://info.grudge-studio.com/api/v1/biome-ecosystems.json',
};

/**
 * CDN GLB paths for tree classes.
 * Low-poly megakit (CommonTree / Twisted / Pine_*) removed.
 * Paths come from natureAssetCatalog (realistic first, interim pack fallback).
 */
export const TREE_STORAGE: Record<TreeClass, string[]> = {
  pine: treePathsForClass('pine', { allowInterim: true }),
  stylized: treePathsForClass('stylized', { allowInterim: true }),
  palm: treePathsForClass('palm', { allowInterim: true }),
  snow_pine: treePathsForClass('snow_pine', { allowInterim: true }),
};

/** Island_tree mesh variant names for IslandResourceLoader (interim pack) */
export const TREE_VARIANTS_BY_CLASS: Record<TreeClass, string[]> = {
  pine: ['pine2_14', 'pine9_15'],
  stylized: ['birch2_4', 'birch6_5', 'ancient_tree_2_0', 'garden_tree_pink_11', 'creepy_tree1_10'],
  palm: ['palm2_13', 'garden_tree_pink_11'],
  snow_pine: ['pine2_14', 'pine9_15'],
};

const _rockPack = harvestRockPack();
const _treePack = harvestTreePack();

export const ROCK_STORAGE = {
  pack: _rockPack.path,
  variants: [..._rockPack.variants],
  /** Megakit Rock_Medium_* banned — use pack or realistic/rocks only */
  natureMedium: rockPaths({ allowInterim: true }),
  ore: '/models/environment/harvest_gold_rocks.glb',
  crystal: '/models/environment/gem_cluster.glb',
  realisticRoot: NATURE_STORAGE.rocks,
} as const;

/** 10 fish species available from water nodes (seed generative pool). */
export const FISH_POOL_10 = [
  'anglerfish',
  'lionfish',
  'goldfish',
  'blobfish',
  'catfish',
  'butterflyfish',
  'flatfish',
  'shark',
  'crab', // shore water edge
  'goldfish', // school filler — same mesh, different node weight
] as const;

/** Unique fish ids for water node spawning (10 slots; crab + 7 fish + shark + goldfish). */
export const FISH_NODE_SPECIES = [
  'anglerfish',
  'lionfish',
  'goldfish',
  'blobfish',
  'catfish',
  'butterflyfish',
  'flatfish',
  'shark',
  'crab',
  'minnow', // maps to goldfish mesh if no dedicated GLB
] as const;

export interface BiomeEcosystem {
  id: EcosystemBiome;
  label: string;
  /** Warlords sector ids that use this ecosystem */
  sectors: string[];
  treeClass: TreeClass[];
  treeVariants: string[];
  treeCdn: string[];
  rockVariants: string[];
  /** Exactly 5 land animal types */
  animals: [string, string, string, string, string];
  /** Fish from water nodes (subset of FISH_NODE_SPECIES, always 10 available globally) */
  fishPool: readonly string[];
  groundPbr: string;
  groundHint: string;
  canopyTint: number;
  snowCanopy: boolean;
  mountainPeakHeightM: number;
  harvestRegenMs: number;
  textures: {
    ground: string;
    bark: number;
    canopy: number;
    rock: number;
    crystal: number[];
  };
  reviewGlb: string;
}

function eco(
  partial: Omit<BiomeEcosystem, 'mountainPeakHeightM' | 'harvestRegenMs' | 'fishPool' | 'reviewGlb'> & {
    fishPool?: readonly string[];
  },
): BiomeEcosystem {
  const treeCdn = partial.treeClass.flatMap((c) => TREE_STORAGE[c]);
  return {
    ...partial,
    treeCdn: [...new Set(treeCdn)],
    fishPool: partial.fishPool ?? FISH_NODE_SPECIES,
    mountainPeakHeightM: MOUNTAIN_PEAK_HEIGHT_M,
    harvestRegenMs: HARVEST_REGEN_MS,
    reviewGlb: `/models/biomes/review/${partial.id}.glb`,
  };
}

export const BIOME_ECOSYSTEMS: Record<EcosystemBiome, BiomeEcosystem> = {
  beach: eco({
    id: 'beach',
    label: 'Beach / Shore',
    sectors: ['haven_shore'],
    treeClass: ['palm', 'stylized'],
    treeVariants: [...TREE_VARIANTS_BY_CLASS.palm],
    rockVariants: ['rock_5', 'rock_6', 'rock_1'],
    animals: ['deer', 'rabbit', 'crab', 'boar', 'buffalo'],
    groundPbr: 'ground_1',
    groundHint: 'sand',
    canopyTint: 0x2e8b57,
    snowCanopy: false,
    textures: {
      ground: `${ECOSYSTEM_STORAGE.texturesPbr}/ground_1`,
      bark: 0x8b6914,
      canopy: 0x2e8b57,
      rock: 0xc2b280,
      crystal: [0x40e0d0, 0x7fffd4, 0x00ced1],
    },
  }),
  tropical: eco({
    id: 'tropical',
    label: 'Tropical',
    sectors: ['haven_shore'],
    treeClass: ['palm', 'stylized'],
    treeVariants: ['palm2_13', 'garden_tree_pink_11', 'ancient_tree_2_0'],
    rockVariants: ['rock_5', 'rock_1', 'rock_3'],
    animals: ['deer', 'boar', 'rabbit', 'buffalo', 'crab'],
    groundPbr: 'ground_1',
    groundHint: 'sand',
    canopyTint: 0x228b22,
    snowCanopy: false,
    textures: {
      ground: `${ECOSYSTEM_STORAGE.texturesPbr}/ground_1`,
      bark: 0x6b4423,
      canopy: 0x228b22,
      rock: 0xa09070,
      crystal: [0x00fa9a, 0x40e0d0, 0xffd700],
    },
  }),
  forest: eco({
    id: 'forest',
    label: 'Deep Forest',
    sectors: ['thornwood_wilds'],
    treeClass: ['pine', 'stylized'],
    treeVariants: ['pine2_14', 'pine9_15', 'ancient_tree_2_0', 'birch2_4'],
    rockVariants: ['rock_1', 'rock_2', 'rock_3'],
    animals: ['deer', 'boar', 'wolf', 'bear', 'rabbit'],
    groundPbr: 'ground_6',
    groundHint: 'grass',
    canopyTint: 0x1e6b1e,
    snowCanopy: false,
    textures: {
      ground: `${ECOSYSTEM_STORAGE.texturesPbr}/ground_6`,
      bark: 0x4a3520,
      canopy: 0x1e6b1e,
      rock: 0x5a5a52,
      crystal: [0x66ffaa, 0x88ddff, 0xa3e635],
    },
  }),
  plains: eco({
    id: 'plains',
    label: 'Plains / Meadow',
    sectors: [],
    treeClass: ['pine', 'stylized'],
    treeVariants: ['birch2_4', 'birch6_5', 'pine2_14'],
    rockVariants: ['rock_1', 'rock_3', 'rock_5'],
    animals: ['buffalo', 'deer', 'rabbit', 'boar', 'wolf'],
    groundPbr: 'ground_2',
    groundHint: 'grass',
    canopyTint: 0x6b8e23,
    snowCanopy: false,
    textures: {
      ground: `${ECOSYSTEM_STORAGE.texturesPbr}/ground_2`,
      bark: 0x6b5344,
      canopy: 0x6b8e23,
      rock: 0x8b8680,
      crystal: [0xa3e635, 0xfde047, 0x86efac],
    },
  }),
  winter: eco({
    id: 'winter',
    label: 'Winter / Snow',
    sectors: [],
    treeClass: ['snow_pine'],
    treeVariants: [...TREE_VARIANTS_BY_CLASS.snow_pine],
    rockVariants: ['rock_7', 'rock_8', 'rock_4'],
    animals: ['wolf', 'deer', 'rabbit', 'bear', 'buffalo'],
    groundPbr: 'ground_7',
    groundHint: 'snow',
    canopyTint: 0xddeeff,
    snowCanopy: true,
    textures: {
      ground: `${ECOSYSTEM_STORAGE.texturesPbr}/ground_7`,
      bark: 0x3d2b1f,
      canopy: 0xddeeff,
      rock: 0x9aa8b5,
      crystal: [0xaaddff, 0xe0ffff, 0xb0e0e6],
    },
  }),
  frozen: eco({
    id: 'frozen',
    label: 'Frostbite Expanse',
    sectors: ['frostbite_expanse'],
    treeClass: ['snow_pine'],
    treeVariants: [...TREE_VARIANTS_BY_CLASS.snow_pine],
    rockVariants: ['rock_7', 'rock_8', 'rock_4'],
    animals: ['wolf', 'bear', 'deer', 'rabbit', 'buffalo'],
    groundPbr: 'ground_7',
    groundHint: 'snow',
    canopyTint: 0xe8f4ff,
    snowCanopy: true,
    textures: {
      ground: `${ECOSYSTEM_STORAGE.texturesPbr}/ground_7`,
      bark: 0x2f2419,
      canopy: 0xe8f4ff,
      rock: 0x8fa0b0,
      crystal: [0x7dd3fc, 0xa5f3fc, 0xe0f2fe],
    },
  }),
  desert: eco({
    id: 'desert',
    label: 'Ashen / Desert',
    sectors: ['ashen_wastes'],
    treeClass: ['stylized', 'palm'],
    treeVariants: ['creepy_tree1_10', 'palm2_13'],
    rockVariants: ['rock_2', 'rock_5', 'rock_6'],
    animals: ['rabbit', 'boar', 'buffalo', 'wolf', 'deer'],
    groundPbr: 'ground_3',
    groundHint: 'sand',
    canopyTint: 0x9a7b4f,
    snowCanopy: false,
    textures: {
      ground: `${ECOSYSTEM_STORAGE.texturesPbr}/ground_3`,
      bark: 0x8b6914,
      canopy: 0x9a7b4f,
      rock: 0xd4a574,
      crystal: [0xfbbf24, 0xf59e0b, 0xeab308],
    },
  }),
  volcanic: eco({
    id: 'volcanic',
    label: 'Ember Depths',
    sectors: ['ember_depths'],
    treeClass: ['stylized', 'pine'],
    treeVariants: ['creepy_tree1_10', 'ancient_tree_2_0', 'pine9_15'],
    rockVariants: ['rock_4', 'rock_7', 'rock_8'],
    animals: ['boar', 'wolf', 'bear', 'buffalo', 'deer'],
    groundPbr: 'ground_5',
    groundHint: 'ash',
    canopyTint: 0x3d2914,
    snowCanopy: false,
    textures: {
      ground: `${ECOSYSTEM_STORAGE.texturesPbr}/ground_5`,
      bark: 0x2a1810,
      canopy: 0x3d2914,
      rock: 0x3f3f46,
      crystal: [0xff4400, 0xffaa00, 0xdc2626],
    },
  }),
  storm: eco({
    id: 'storm',
    label: 'Stormbreak Reef',
    sectors: ['stormbreak_reef'],
    treeClass: ['pine', 'stylized'],
    treeVariants: ['pine2_14', 'pine9_15', 'creepy_tree1_10'],
    rockVariants: ['rock_4', 'rock_6', 'rock_8'],
    animals: ['boar', 'wolf', 'deer', 'crab', 'rabbit'],
    groundPbr: 'ground_4',
    groundHint: 'gravel',
    canopyTint: 0x4a5568,
    snowCanopy: false,
    textures: {
      ground: `${ECOSYSTEM_STORAGE.texturesPbr}/ground_4`,
      bark: 0x3d3d3d,
      canopy: 0x4a5568,
      rock: 0x4a5568,
      crystal: [0xfbbf24, 0x94a3b8, 0x38bdf8],
    },
  }),
  ethereal: eco({
    id: 'ethereal',
    label: 'Ethereal Falls',
    sectors: ['ethereal_falls'],
    treeClass: ['stylized', 'pine'],
    treeVariants: ['garden_tree_pink_11', 'ancient_tree_2_0', 'birch6_5'],
    rockVariants: ['rock_3', 'rock_5', 'rock_7'],
    animals: ['deer', 'rabbit', 'wolf', 'buffalo', 'boar'],
    groundPbr: 'ground_8',
    groundHint: 'crystal',
    canopyTint: 0xa78bfa,
    snowCanopy: false,
    textures: {
      ground: `${ECOSYSTEM_STORAGE.texturesPbr}/ground_8`,
      bark: 0x5b4b8a,
      canopy: 0xa78bfa,
      rock: 0x7c6aae,
      crystal: [0xc4b5fd, 0xa5f3fc, 0xf0abfc],
    },
  }),
  abyssal: eco({
    id: 'abyssal',
    label: 'Abyssal Trench',
    sectors: ['abyssal_trench'],
    treeClass: ['stylized', 'pine'],
    treeVariants: ['creepy_tree1_10', 'ancient_tree_2_0', 'pine9_15'],
    rockVariants: ['rock_4', 'rock_7', 'rock_8'],
    animals: ['wolf', 'bear', 'boar', 'crab', 'deer'],
    groundPbr: 'ground_9',
    groundHint: 'silt',
    canopyTint: 0x16213e,
    snowCanopy: false,
    textures: {
      ground: `${ECOSYSTEM_STORAGE.texturesPbr}/ground_9`,
      bark: 0x1a1a2e,
      canopy: 0x16213e,
      rock: 0x1e293b,
      crystal: [0x22d3ee, 0x6366f1, 0x0ea5e9],
    },
  }),
  nexus: eco({
    id: 'nexus',
    label: 'Convergence Nexus',
    sectors: ['convergence_nexus'],
    treeClass: ['pine', 'stylized'],
    treeVariants: ['pine2_14', 'ancient_tree_2_0', 'birch2_4'],
    rockVariants: ['rock_1', 'rock_4', 'rock_6'],
    animals: ['deer', 'boar', 'wolf', 'buffalo', 'bear'],
    groundPbr: 'ground_10',
    groundHint: 'fracture',
    canopyTint: 0x4ade80,
    snowCanopy: false,
    textures: {
      ground: `${ECOSYSTEM_STORAGE.texturesPbr}/ground_10`,
      bark: 0x5c4033,
      canopy: 0x4ade80,
      rock: 0x6b6b6b,
      crystal: [0xa78bfa, 0x22d3ee, 0xf472b6],
    },
  }),
};


/**
 * Map each ecosystem → surface asset roles for home-islands + open land/water.
 * Paths resolve on assets.grudge-studio.com (audit: scripts/audit-biome-assets.mjs).
 */
export const BIOME_SURFACE_LAYERS: Record<
  EcosystemBiome,
  {
    groundPbr: string;
    treePacks: string[];
    rockPacks: string[];
    coastPack?: string;
    waterPack: string;
    mountain: boolean;
  }
> = {
  beach: { groundPbr: 'ground_1', treePacks: ['/models/nature/stylized/biome/tropical_plants.glb'], rockPacks: ['/models/nature/stylized/rocks/stylised_rocks.glb'], coastPack: '/models/nature/stylized/biome/tropical_plants.glb', waterPack: '/models/nature/stylized/harvest/pond_pack.glb', mountain: true },
  tropical: { groundPbr: 'ground_1', treePacks: ['/models/nature/stylized/biome/tropical_plants.glb'], rockPacks: ['/models/nature/stylized/rocks/stylised_rocks.glb'], coastPack: '/models/nature/stylized/biome/tropical_plants.glb', waterPack: '/models/nature/stylized/harvest/pond_pack.glb', mountain: true },
  forest: { groundPbr: 'ground_6', treePacks: ['/models/nature/stylized/biome/nature_vegetation.glb', '/models/nature/stylized/biome/realistic_trees.glb'], rockPacks: ['/models/nature/stylized/rocks/stylised_rocks.glb'], waterPack: '/models/nature/stylized/harvest/pond_pack.glb', mountain: true },
  plains: { groundPbr: 'ground_2', treePacks: ['/models/nature/stylized/biome/realistic_trees.glb'], rockPacks: ['/models/nature/stylized/rocks/stylised_rocks.glb'], waterPack: '/models/nature/stylized/harvest/pond_pack.glb', mountain: true },
  winter: { groundPbr: 'ground_7', treePacks: ['/models/nature/stylized/biome/snowbiomes.glb'], rockPacks: ['/models/nature/stylized/biome/snowbiomes.glb'], waterPack: '/models/nature/stylized/harvest/pond_pack.glb', mountain: true },
  frozen: { groundPbr: 'ground_7', treePacks: ['/models/nature/stylized/biome/snowbiomes.glb'], rockPacks: ['/models/nature/stylized/biome/snowbiomes.glb'], waterPack: '/models/nature/stylized/harvest/pond_pack.glb', mountain: true },
  desert: { groundPbr: 'ground_3', treePacks: ['/models/nature/stylized/biome/tropical_plants.glb'], rockPacks: ['/models/nature/stylized/rocks/stylised_rocks.glb'], waterPack: '/models/nature/stylized/harvest/pond_pack.glb', mountain: true },
  volcanic: { groundPbr: 'ground_5', treePacks: ['/models/nature/stylized/biome/volcanicnature.glb'], rockPacks: ['/models/nature/stylized/rocks/volcanic_rocks.glb'], waterPack: '/models/nature/stylized/harvest/pond_pack.glb', mountain: true },
  storm: { groundPbr: 'ground_4', treePacks: ['/models/nature/stylized/biome/nature_vegetation.glb'], rockPacks: ['/models/nature/stylized/rocks/stylised_rocks.glb'], coastPack: '/models/nature/stylized/biome/tropical_plants.glb', waterPack: '/models/nature/stylized/harvest/pond_pack.glb', mountain: true },
  ethereal: { groundPbr: 'ground_8', treePacks: ['/models/nature/stylized/biome/realistic_trees.glb'], rockPacks: ['/models/nature/stylized/rocks/stylised_rocks.glb'], waterPack: '/models/nature/stylized/harvest/pond_pack.glb', mountain: true },
  abyssal: { groundPbr: 'ground_9', treePacks: ['/models/nature/stylized/biome/volcanicnature.glb'], rockPacks: ['/models/nature/stylized/rocks/volcanic_rocks.glb'], waterPack: '/models/nature/stylized/harvest/pond_pack.glb', mountain: true },
  nexus: { groundPbr: 'ground_10', treePacks: ['/models/nature/stylized/biome/nature_vegetation.glb', '/models/nature/stylized/biome/realistic_trees.glb'], rockPacks: ['/models/nature/stylized/rocks/stylised_rocks.glb'], waterPack: '/models/nature/stylized/harvest/pond_pack.glb', mountain: true },
};

export function surfaceLayersForBiome(biome: string | undefined | null) {
  const eco = resolveEcosystem(biome);
  return BIOME_SURFACE_LAYERS[eco.id];
}

export function resolveEcosystem(biome: string | undefined | null): BiomeEcosystem {
  const key = (biome ?? 'forest').toLowerCase();
  if (key in BIOME_ECOSYSTEMS) return BIOME_ECOSYSTEMS[key as EcosystemBiome];
  if (key.includes('snow') || key.includes('ice') || key.includes('arctic')) return BIOME_ECOSYSTEMS.winter;
  if (key.includes('sand') || key.includes('coast') || key.includes('shore')) return BIOME_ECOSYSTEMS.beach;
  if (key.includes('meadow') || key.includes('grass') || key.includes('plain')) return BIOME_ECOSYSTEMS.plains;
  if (key.includes('lava') || key.includes('ember') || key.includes('volcano')) return BIOME_ECOSYSTEMS.volcanic;
  if (key.includes('tropic') || key.includes('haven')) return BIOME_ECOSYSTEMS.tropical;
  return BIOME_ECOSYSTEMS.forest;
}

/** Seed picks ONE of three evil mountain peaks, scaled to MOUNTAIN_PEAK_HEIGHT_M. */
export function mountainPeakForSeed(seed: string): {
  peakIndex: 0 | 1 | 2;
  modelPath: string;
  heightM: number;
  combinedPath: string;
} {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  const peakIndex = (h % 3) as 0 | 1 | 2;
  return {
    peakIndex,
    modelPath: MOUNTAIN_TRIAD_PEAK_MODEL_PATHS[peakIndex],
    heightM: MOUNTAIN_PEAK_HEIGHT_M,
    combinedPath: SKETCHFAB_EVIL_MOUNTAIN_TRIAD.modelPath,
  };
}

/** JSON export for ObjectStore / info hub. */
export function exportBiomeEcosystemDoc() {
  return {
    version: ECOSYSTEM_CATALOG_VERSION,
    updated: new Date().toISOString().slice(0, 10),
    characterReferenceHeightM: CHARACTER_REFERENCE_HEIGHT_M,
    mountainPeakHeightM: MOUNTAIN_PEAK_HEIGHT_M,
    harvestRegenMs: HARVEST_REGEN_MS,
    harvestRegenHours: 4,
    animalsPerBiome: 5,
    fishPoolSize: FISH_NODE_SPECIES.length,
    fishNodeSpecies: [...FISH_NODE_SPECIES],
    treePolicy:
      'No low-poly megakit. snow_pine on snow; palm+deciduous on beach/tropical; ' +
      'pine+deciduous elsewhere. Organized under /models/nature/realistic/*.',
    sizeFoundations: {
      driftwood_bay: {
        id: DRIFTWOOD_BAY.id,
        label: DRIFTWOOD_BAY.label,
        worldSizeM: DRIFTWOOD_BAY.worldSizeM,
        preferredBiomes: DRIFTWOOD_BAY.preferredBiomes,
      },
      ironfang_spire: {
        id: IRONFANG_SPIRE.id,
        label: IRONFANG_SPIRE.label,
        worldSizeM: IRONFANG_SPIRE.worldSizeM,
        preferredBiomes: IRONFANG_SPIRE.preferredBiomes,
      },
      resolve: 'Coastal biomes → Driftwood Bay; highland/cold/dark → Ironfang Spire',
    },
    storage: ECOSYSTEM_STORAGE,
    rocks: ROCK_STORAGE,
    trees: TREE_STORAGE,
    harvestTreePack: _treePack,
    mountains: {
      heightM: MOUNTAIN_PEAK_HEIGHT_M,
      peaks: [...MOUNTAIN_TRIAD_PEAK_MODEL_PATHS],
      rule: 'Seed selects exactly one peak of three; scale to 20m height',
    },
    biomes: Object.values(BIOME_ECOSYSTEMS).map((b) => ({
      ...b,
      foundationId: resolveHomeIslandFoundation(b.id, b.id).id,
    })),
  };
}

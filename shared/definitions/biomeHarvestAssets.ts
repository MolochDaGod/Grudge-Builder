/**
 * Biome harvest palettes — thin adapter over biomeEcosystemCatalog (SSOT).
 * 5 animals / biome, 10 fish pool, pines/stylized/palm/snow trees, 4h regen.
 */
import {
  BIOME_ECOSYSTEMS,
  FISH_NODE_SPECIES,
  resolveEcosystem,
  type EcosystemBiome,
} from './biomeEcosystemCatalog';

export type WorldBiome = EcosystemBiome;

export interface BiomeHarvestPalette {
  id: WorldBiome;
  label: string;
  treeBark: number;
  treeCanopy: number;
  treeCanopyAlt: number;
  rockColor: number;
  crystalColors: number[];
  flowerColors: number[];
  scrapTint: number;
  groundHint: string;
  treeVariants: string[];
  rockVariants: string[];
  /** Exactly 5 land animals */
  wildlife: string[];
  wildlifeCount: [min: number, max: number];
  fishCount: [min: number, max: number];
  /** 10 fish species available from water nodes */
  fishSpecies: readonly string[];
  snowCanopy: boolean;
}

function fromEco(id: EcosystemBiome): BiomeHarvestPalette {
  const e = BIOME_ECOSYSTEMS[id];
  return {
    id: e.id,
    label: e.label,
    treeBark: e.textures.bark,
    treeCanopy: e.textures.canopy,
    treeCanopyAlt: e.canopyTint,
    rockColor: e.textures.rock,
    crystalColors: e.textures.crystal,
    flowerColors: e.textures.crystal,
    scrapTint: 0x7a7a82,
    groundHint: e.groundHint,
    treeVariants: e.treeVariants,
    rockVariants: e.rockVariants,
    wildlife: [...e.animals],
    wildlifeCount: [5, 5], // always 5 types present in seed
    fishCount: [10, 10], // 10 water-node fish available
    fishSpecies: FISH_NODE_SPECIES,
    snowCanopy: e.snowCanopy,
  };
}

export const BIOME_HARVEST_PALETTES: Record<string, BiomeHarvestPalette> = {
  beach: fromEco('beach'),
  tropical: fromEco('tropical'),
  winter: fromEco('winter'),
  frozen: fromEco('frozen'),
  plains: fromEco('plains'),
  forest: fromEco('forest'),
  nexus: fromEco('nexus'),
  volcanic: fromEco('volcanic'),
  desert: fromEco('desert'),
  storm: fromEco('storm'),
  ethereal: fromEco('ethereal'),
  abyssal: fromEco('abyssal'),
};

export function resolveBiomePalette(biome: string | undefined | null): BiomeHarvestPalette {
  const eco = resolveEcosystem(biome);
  return BIOME_HARVEST_PALETTES[eco.id] ?? fromEco(eco.id);
}

/** Always spawn 5 land animal types (seed generative). */
export function wildlifeCountForBiome(_biome: string, _rand: () => number = Math.random): number {
  return 5;
}

/** Always offer 10 fish node species in water. */
export function fishCountForBiome(_biome: string, _rand: () => number = Math.random): number {
  return 10;
}

export function fishSpeciesForBiome(biome: string): readonly string[] {
  return resolveBiomePalette(biome).fishSpecies;
}

export function animalsForBiome(biome: string): string[] {
  return [...resolveBiomePalette(biome).wildlife];
}

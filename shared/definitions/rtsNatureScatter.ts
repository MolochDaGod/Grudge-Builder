/**
 * RTS NatureScatter ↔ Warlords 3D foliage bridge.
 * Deterministic scatter from RTS island seed + heightmap.
 *
 * Low-poly megakit (CommonTree, TwistedTree, DeadTree, Rock_Medium, Pine_*,
 * Bush_Common, etc.) is BANNED. Paths come from natureAssetCatalog only.
 */

import {
  decodeRtsHeightmap,
  type RtsHeightmapPayload,
} from "./rtsTerrainBridge";
import { HOME_ISLAND_RTS_SIZE_M } from "./homeIslandSeed";
import {
  ORGANIZED_NATURE_SCATTER_PATHS,
  isBannedNaturePath,
  filterApprovedNaturePaths,
  natureScatterNeedsRegenerate,
  filterNatureScatterInstances,
} from "./natureAssetCatalog";
import {
  resolveHomeIslandFoundation,
  type HomeIslandFoundation,
} from "./homeIslandFoundations";

export const RTS_NATURE_SCATTER_VERSION = "2.0.0";

/** Hash island seed string → deterministic numeric seed for scatter RNG */
export function islandSeedToNumber(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h) || 1;
}

export type RtsScatterCategory =
  | "tree"
  | "pine"
  | "palm"
  | "rock"
  | "bush"
  | "grass"
  | "mushroom"
  | "flower"
  | "fern"
  | "plant";

export interface RtsScatterInstance {
  category: RtsScatterCategory;
  modelPath: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number;
}

export interface RtsNatureScatterPayload {
  version: typeof RTS_NATURE_SCATTER_VERSION;
  worldSizeM: number;
  biome: string;
  seed: number;
  foundationId?: string;
  generatedAt: number;
  instances: RtsScatterInstance[];
  policy: "no_lowpoly_megakit";
}

/**
 * CDN-relative paths — organized realistic/interim only.
 * deadTree / twisted categories removed (banned low-poly look).
 */
export const NATURE_MODEL_PATHS: Record<RtsScatterCategory, string[]> = {
  tree: filterApprovedNaturePaths(ORGANIZED_NATURE_SCATTER_PATHS.tree ?? []),
  pine: filterApprovedNaturePaths(ORGANIZED_NATURE_SCATTER_PATHS.pine ?? []),
  palm: filterApprovedNaturePaths(ORGANIZED_NATURE_SCATTER_PATHS.palm ?? []),
  rock: filterApprovedNaturePaths(ORGANIZED_NATURE_SCATTER_PATHS.rock ?? []),
  bush: filterApprovedNaturePaths(ORGANIZED_NATURE_SCATTER_PATHS.bush ?? []),
  grass: filterApprovedNaturePaths(ORGANIZED_NATURE_SCATTER_PATHS.grass ?? []),
  mushroom: filterApprovedNaturePaths(ORGANIZED_NATURE_SCATTER_PATHS.mushroom ?? []),
  flower: filterApprovedNaturePaths(ORGANIZED_NATURE_SCATTER_PATHS.flower ?? []),
  fern: filterApprovedNaturePaths(ORGANIZED_NATURE_SCATTER_PATHS.fern ?? []),
  plant: filterApprovedNaturePaths(ORGANIZED_NATURE_SCATTER_PATHS.plant ?? []),
};

/** No megakit extras (Clover/Pebble/RockPath were low-poly). */
export const NATURE_MEGAKIT_EXTRA_PATHS: readonly string[] = [];

const BASE_SCATTER_RULES: Array<{
  category: RtsScatterCategory;
  count: number;
  seedOffset: number;
  minRadius: number;
  maxRadius: number;
  minScale: number;
  maxScale: number;
  avoidCenter?: number;
}> = [
  { category: "tree", count: 20, seedOffset: 100, minRadius: 20, maxRadius: 95, minScale: 1.4, maxScale: 2.8 },
  { category: "pine", count: 14, seedOffset: 200, minRadius: 25, maxRadius: 95, minScale: 1.2, maxScale: 2.5 },
  { category: "palm", count: 0, seedOffset: 300, minRadius: 18, maxRadius: 88, minScale: 1.3, maxScale: 2.6 },
  { category: "rock", count: 14, seedOffset: 400, minRadius: 15, maxRadius: 90, minScale: 0.8, maxScale: 2.0 },
  // Groundcover counts stay 0 until realistic GLBs exist (empty paths also skip)
  { category: "bush", count: 0, seedOffset: 500, minRadius: 12, maxRadius: 80, minScale: 0.8, maxScale: 1.5 },
  { category: "grass", count: 0, seedOffset: 600, minRadius: 8, maxRadius: 70, minScale: 0.6, maxScale: 1.2, avoidCenter: 8 },
  { category: "mushroom", count: 0, seedOffset: 700, minRadius: 15, maxRadius: 60, minScale: 0.5, maxScale: 1.0 },
  { category: "flower", count: 0, seedOffset: 800, minRadius: 10, maxRadius: 70, minScale: 0.6, maxScale: 1.0, avoidCenter: 8 },
  { category: "fern", count: 0, seedOffset: 900, minRadius: 12, maxRadius: 65, minScale: 0.7, maxScale: 1.3 },
  { category: "plant", count: 0, seedOffset: 1000, minRadius: 10, maxRadius: 75, minScale: 0.5, maxScale: 1.2 },
];

/** Coastal Driftwood Bay — palms + deciduous, fewer pines. */
const COASTAL_BIOME_HINTS = ['beach', 'tropic', 'shore', 'haven', 'storm', 'plain'];
/** Highland Ironfang — pines dominate. */
const HIGHLAND_BIOME_HINTS = ['forest', 'winter', 'frost', 'snow', 'volcan', 'ember', 'abyss', 'nexus', 'mountain'];

function isCoastalBiome(biome: string): boolean {
  const b = biome.toLowerCase();
  return COASTAL_BIOME_HINTS.some((h) => b.includes(h));
}

function isHighlandBiome(biome: string): boolean {
  const b = biome.toLowerCase();
  return HIGHLAND_BIOME_HINTS.some((h) => b.includes(h));
}

function rulesForFoundation(foundation: HomeIslandFoundation, biome: string) {
  const coastal = isCoastalBiome(biome) || foundation.id === 'driftwood_bay';
  const highland = isHighlandBiome(biome) || foundation.id === 'ironfang_spire';

  return BASE_SCATTER_RULES.map((rule) => {
    let mult = 1;
    if (rule.category === 'tree' || rule.category === 'pine' || rule.category === 'palm') {
      mult = foundation.natureDensity.trees;
    } else if (rule.category === 'rock') {
      mult = foundation.natureDensity.rocks;
    } else {
      mult = foundation.natureDensity.groundcover;
    }

    let count = Math.round(rule.count * mult);

    // Biome palette: coastal prefers palms; highland prefers pines
    if (coastal && !highland) {
      if (rule.category === 'palm') count = Math.max(count, Math.round(18 * mult));
      if (rule.category === 'pine') count = Math.round(count * 0.35);
      if (rule.category === 'tree') count = Math.round(count * 1.1);
      if (rule.category === 'rock') count = Math.round(count * 0.85);
    } else if (highland) {
      if (rule.category === 'palm') count = 0;
      if (rule.category === 'pine') count = Math.round(count * 1.25);
      if (rule.category === 'rock') count = Math.round(count * 1.15);
    }

    return { ...rule, count };
  });
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function sampleHeightBilinear(
  heights: Float32Array,
  resolution: number,
  worldSizeM: number,
  wx: number,
  wz: number,
): number {
  const u = (wx + worldSizeM / 2) / worldSizeM;
  const v = (wz + worldSizeM / 2) / worldSizeM;
  const res = resolution;
  const x = Math.max(0, Math.min(res, u * res));
  const z = Math.max(0, Math.min(res, v * res));
  const x0 = Math.floor(x);
  const x1 = Math.min(x0 + 1, res);
  const z0 = Math.floor(z);
  const z1 = Math.min(z0 + 1, res);
  const tx = x - x0;
  const tz = z - z0;
  const stride = res + 1;
  const h00 = heights[z0 * stride + x0] ?? 0;
  const h10 = heights[z0 * stride + x1] ?? 0;
  const h01 = heights[z1 * stride + x0] ?? 0;
  const h11 = heights[z1 * stride + x1] ?? 0;
  return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
}

function generateCategoryInstances(
  rule: (typeof BASE_SCATTER_RULES)[number],
  islandSeed: number,
  sampleHeight: (wx: number, wz: number) => number,
  radiusScale = 1,
): RtsScatterInstance[] {
  const paths = NATURE_MODEL_PATHS[rule.category].filter((p) => !isBannedNaturePath(p));
  if (paths.length === 0 || rule.count <= 0) return [];

  const rng = seededRandom(islandSeed + rule.seedOffset);
  const avoid = (rule.avoidCenter ?? 15) * radiusScale;
  const out: RtsScatterInstance[] = [];
  let attempts = 0;

  while (out.length < rule.count && attempts < rule.count * 4) {
    attempts++;
    const angle = rng() * Math.PI * 2;
    const radius = (rule.minRadius + rng() * (rule.maxRadius - rule.minRadius)) * radiusScale;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < avoid && Math.abs(z) < avoid) continue;

    const y = sampleHeight(x, z);
    if (y < -1 || y > 10) continue;

    const scale = rule.minScale + rng() * (rule.maxScale - rule.minScale);
    const rotation = rng() * Math.PI * 2;
    const modelPath = paths[out.length % paths.length];
    if (isBannedNaturePath(modelPath)) continue;

    out.push({ category: rule.category, modelPath, x, y, z, rotation, scale });
  }

  return out;
}

/**
 * Build compact foliage payload for Railway + Warlords 3D.
 * Requires RTS heightmap for Y placement; falls back to flat y=0 filter.
 * Never emits low-poly megakit paths.
 */
export function generateRtsNatureScatter(
  islandSeed: number,
  biome: string,
  heightmap?: RtsHeightmapPayload,
  targetWorldSizeM?: number,
  seedString?: string,
): RtsNatureScatterPayload {
  const worldSizeM = targetWorldSizeM ?? heightmap?.worldSizeM ?? HOME_ISLAND_RTS_SIZE_M;
  const heights = heightmap ? decodeRtsHeightmap(heightmap) : null;
  const radiusScale = worldSizeM / HOME_ISLAND_RTS_SIZE_M;
  const resolvedBiome = normalizeScatterBiome(biome);
  const foundation = resolveHomeIslandFoundation(
    seedString ?? String(islandSeed),
    resolvedBiome,
  );
  const rules = rulesForFoundation(foundation, resolvedBiome);

  const sampleHeight = (wx: number, wz: number): number => {
    if (!heights || !heightmap) return 2;
    return sampleHeightBilinear(
      heights,
      heightmap.resolution,
      heightmap.worldSizeM ?? HOME_ISLAND_RTS_SIZE_M,
      wx,
      wz,
    );
  };

  const instances: RtsScatterInstance[] = [];
  for (const rule of rules) {
    instances.push(...generateCategoryInstances(rule, islandSeed, sampleHeight, radiusScale));
  }

  return {
    version: RTS_NATURE_SCATTER_VERSION,
    worldSizeM,
    biome: resolvedBiome,
    seed: islandSeed,
    foundationId: foundation.id,
    generatedAt: Date.now(),
    instances,
    policy: "no_lowpoly_megakit",
  };
}

/** Map loose biome labels (incl. legacy "temperate") to foundation-aware keys. */
export function normalizeScatterBiome(biome: string | undefined | null): string {
  const b = (biome ?? "").toLowerCase().trim();
  // Default coastal Warlords home (Driftwood Bay) — never force highland forest
  if (!b || b === "temperate" || b === "default" || b === "none") return "beach";
  return b;
}

/**
 * Prefer stored scatter only when free of banned megakit paths.
 * Otherwise regenerate so Island3D never drops into poly procedural forest.
 */
export function resolveNatureScatterPayload(opts: {
  stored?: RtsNatureScatterPayload | null;
  islandSeed: number;
  biome?: string | null;
  heightmap?: RtsHeightmapPayload;
  worldSizeM?: number;
  seedString?: string;
}): RtsNatureScatterPayload {
  const biome = normalizeScatterBiome(opts.biome);
  const stored = opts.stored;
  if (stored?.instances?.length) {
    if (!natureScatterNeedsRegenerate(stored.instances)) {
      const clean = filterNatureScatterInstances(stored.instances);
      if (clean.length > 0) {
        return {
          ...stored,
          version: RTS_NATURE_SCATTER_VERSION,
          instances: clean,
          policy: "no_lowpoly_megakit",
          biome: stored.biome || biome,
        };
      }
    }
  }
  return generateRtsNatureScatter(
    opts.islandSeed,
    biome,
    opts.heightmap,
    opts.worldSizeM,
    opts.seedString,
  );
}

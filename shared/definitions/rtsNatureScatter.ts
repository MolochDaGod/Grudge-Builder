/**
 * RTS NatureScatter ↔ Warlords 3D foliage bridge.
 * Deterministic scatter from RTS island seed + heightmap (200m world).
 * Mirrors RTS-Grudge NatureScatter.tsx placement rules.
 */

import {
  decodeRtsHeightmap,
  type RtsHeightmapPayload,
} from "./rtsTerrainBridge";
import { HOME_ISLAND_RTS_SIZE_M } from "./homeIslandSeed";

export const RTS_NATURE_SCATTER_VERSION = "1.0.0";

export type RtsScatterCategory =
  | "tree"
  | "pine"
  | "deadTree"
  | "twisted"
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
  generatedAt: number;
  instances: RtsScatterInstance[];
}

/** CDN-relative paths — same set as RTS-Grudge NatureScatter NATURE_ASSETS */
export const NATURE_MODEL_PATHS: Record<RtsScatterCategory, string[]> = {
  tree: [
    "/models/nature/CommonTree_1.glb",
    "/models/nature/CommonTree_2.glb",
    "/models/nature/CommonTree_3.glb",
    "/models/nature/CommonTree_4.glb",
    "/models/nature/CommonTree_5.glb",
  ],
  pine: [
    "/models/nature/Pine_1.glb",
    "/models/nature/Pine_2.glb",
    "/models/nature/Pine_3.glb",
    "/models/nature/Pine_4.glb",
    "/models/nature/Pine_5.glb",
  ],
  deadTree: [
    "/models/nature/DeadTree_1.glb",
    "/models/nature/DeadTree_2.glb",
    "/models/nature/DeadTree_3.glb",
  ],
  twisted: [
    "/models/nature/TwistedTree_1.glb",
    "/models/nature/TwistedTree_2.glb",
    "/models/nature/TwistedTree_3.glb",
  ],
  rock: [
    "/models/nature/Rock_Medium_1.glb",
    "/models/nature/Rock_Medium_2.glb",
    "/models/nature/Rock_Medium_3.glb",
  ],
  bush: [
    "/models/nature/Bush_Common.glb",
    "/models/nature/Bush_Common_Flowers.glb",
  ],
  grass: [
    "/models/nature/Grass_Common_Short.glb",
    "/models/nature/Grass_Common_Tall.glb",
    "/models/nature/Grass_Wispy_Short.glb",
    "/models/nature/Grass_Wispy_Tall.glb",
  ],
  mushroom: [
    "/models/nature/Mushroom_Common.glb",
    "/models/nature/Mushroom_Laetiporus.glb",
  ],
  flower: [
    "/models/nature/Flower_3_Group.glb",
    "/models/nature/Flower_4_Group.glb",
  ],
  fern: ["/models/nature/Fern_1.glb"],
  plant: [
    "/models/nature/Plant_1.glb",
    "/models/nature/Plant_7.glb",
  ],
};

const SCATTER_RULES: Array<{
  category: RtsScatterCategory;
  count: number;
  seedOffset: number;
  minRadius: number;
  maxRadius: number;
  minScale: number;
  maxScale: number;
  avoidCenter?: number;
}> = [
  { category: "tree", count: 12, seedOffset: 100, minRadius: 20, maxRadius: 90, minScale: 1.5, maxScale: 3.0 },
  { category: "pine", count: 16, seedOffset: 200, minRadius: 25, maxRadius: 90, minScale: 1.2, maxScale: 2.5 },
  { category: "deadTree", count: 8, seedOffset: 300, minRadius: 30, maxRadius: 85, minScale: 1.0, maxScale: 2.0 },
  { category: "twisted", count: 7, seedOffset: 350, minRadius: 35, maxRadius: 80, minScale: 1.5, maxScale: 2.5 },
  { category: "rock", count: 8, seedOffset: 400, minRadius: 15, maxRadius: 85, minScale: 0.8, maxScale: 2.0 },
  { category: "bush", count: 10, seedOffset: 500, minRadius: 12, maxRadius: 80, minScale: 0.8, maxScale: 1.5 },
  { category: "grass", count: 12, seedOffset: 600, minRadius: 8, maxRadius: 70, minScale: 0.6, maxScale: 1.2, avoidCenter: 8 },
  { category: "mushroom", count: 8, seedOffset: 700, minRadius: 15, maxRadius: 60, minScale: 0.5, maxScale: 1.0 },
  { category: "flower", count: 10, seedOffset: 800, minRadius: 10, maxRadius: 70, minScale: 0.6, maxScale: 1.0, avoidCenter: 8 },
  { category: "fern", count: 8, seedOffset: 900, minRadius: 12, maxRadius: 65, minScale: 0.7, maxScale: 1.3 },
  { category: "plant", count: 8, seedOffset: 1000, minRadius: 10, maxRadius: 75, minScale: 0.5, maxScale: 1.2 },
];

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
  rule: (typeof SCATTER_RULES)[number],
  islandSeed: number,
  sampleHeight: (wx: number, wz: number) => number,
): RtsScatterInstance[] {
  const rng = seededRandom(islandSeed + rule.seedOffset);
  const paths = NATURE_MODEL_PATHS[rule.category];
  const avoid = rule.avoidCenter ?? 15;
  const out: RtsScatterInstance[] = [];
  let attempts = 0;

  while (out.length < rule.count && attempts < rule.count * 4) {
    attempts++;
    const angle = rng() * Math.PI * 2;
    const radius = rule.minRadius + rng() * (rule.maxRadius - rule.minRadius);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < avoid && Math.abs(z) < avoid) continue;

    const y = sampleHeight(x, z);
    if (y < -1 || y > 10) continue;

    const scale = rule.minScale + rng() * (rule.maxScale - rule.minScale);
    const rotation = rng() * Math.PI * 2;
    const modelPath = paths[out.length % paths.length];

    out.push({ category: rule.category, modelPath, x, y, z, rotation, scale });
  }

  return out;
}

/**
 * Build compact foliage payload for Railway + Warlords 3D.
 * Requires RTS heightmap for Y placement; falls back to flat y=0 filter.
 */
export function generateRtsNatureScatter(
  islandSeed: number,
  biome: string,
  heightmap?: RtsHeightmapPayload,
): RtsNatureScatterPayload {
  const worldSizeM = heightmap?.worldSizeM ?? HOME_ISLAND_RTS_SIZE_M;
  const heights = heightmap ? decodeRtsHeightmap(heightmap) : null;

  const sampleHeight = (wx: number, wz: number): number => {
    if (!heights || !heightmap) return 2;
    return sampleHeightBilinear(heights, heightmap.resolution, worldSizeM, wx, wz);
  };

  const instances: RtsScatterInstance[] = [];
  for (const rule of SCATTER_RULES) {
    instances.push(...generateCategoryInstances(rule, islandSeed, sampleHeight));
  }

  return {
    version: RTS_NATURE_SCATTER_VERSION,
    worldSizeM,
    biome,
    seed: islandSeed,
    generatedAt: Date.now(),
    instances,
  };
}
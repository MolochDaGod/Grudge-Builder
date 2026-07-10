/**
 * Example Island concept map — clone zones, height ideas, and pathing
 * from exampleisland.glb (semantic nodes) into generative islands.
 *
 * Example GLB structure (authoring labels):
 *   Terrain_1 / TerrainBase_6  → heightfield + underplate
 *   Cliffs_2                   → cliff / rock rim (elevated)
 *   Haven_3                    → safe camp (flat, clear, spawn)
 *   Roads_5                    → path network between zones
 *   Plane_7                    → multi-layer ground / meadow
 *   Rock_9                     → rock / quarry area
 *   Tree1_171 / Tree2_173 / Trunk_174 → wood palette
 *
 * We do NOT place the whole GLB as the world. We clone its *layout language*
 * with seeded generative scatter + stylized packs.
 */

export type IslandZoneId =
  | 'haven'
  | 'woods'
  | 'rocks'
  | 'pve'
  | 'flowers'
  | 'cliffs'
  | 'roads'
  | 'shore';

export interface IslandZoneDef {
  id: IslandZoneId;
  label: string;
  /** Example GLB node this clones */
  exampleNode: string;
  /** Height bias vs sea (m) for generative heightfield */
  heightBias: number;
  /** Flatten radius for camp / road pads (m fraction of island) */
  flatRadiusFrac: number;
  /** Preferred harvest resources */
  resources: Array<'wood' | 'stone' | 'crystal' | 'ore' | 'flower' | 'herb'>;
  /** Wildlife roles in this zone */
  wildlife: Array<'passive' | 'neutral' | 'aggressive' | 'none'>;
  /** Path graph: zones this connects to via roads */
  links: IslandZoneId[];
  /** Clear vegetation (like forestoutline center) */
  clearVegetation: boolean;
  /** Scriptable harvest zone density multiplier */
  harvestDensity: number;
}

/**
 * Canonical zone ring (percent of island radius from center).
 * Haven at center → roads → flowers → woods → rocks/pve → cliffs/shore.
 */
export const EXAMPLE_ZONE_LAYOUT: IslandZoneDef[] = [
  {
    id: 'haven',
    label: 'Haven / Camp',
    exampleNode: 'Haven_3',
    heightBias: 2.5,
    flatRadiusFrac: 0.12,
    resources: [],
    wildlife: ['none'],
    links: ['roads', 'flowers'],
    clearVegetation: true,
    harvestDensity: 0,
  },
  {
    id: 'roads',
    label: 'Roads / Pathing',
    exampleNode: 'Roads_5',
    heightBias: 2.2,
    flatRadiusFrac: 0.04,
    resources: [],
    wildlife: ['passive'],
    links: ['haven', 'woods', 'rocks', 'flowers', 'pve'],
    clearVegetation: true,
    harvestDensity: 0,
  },
  {
    id: 'flowers',
    label: 'Flower Meadow',
    exampleNode: 'Plane_7',
    heightBias: 2.0,
    flatRadiusFrac: 0.08,
    resources: ['flower', 'herb'],
    wildlife: ['passive'],
    links: ['haven', 'roads', 'woods'],
    clearVegetation: false,
    harvestDensity: 1.2,
  },
  {
    id: 'woods',
    label: 'Generative Woods',
    exampleNode: 'Tree1_171',
    heightBias: 2.8,
    flatRadiusFrac: 0.02,
    resources: ['wood'],
    wildlife: ['passive', 'neutral'],
    links: ['roads', 'flowers', 'rocks', 'pve'],
    clearVegetation: false,
    harvestDensity: 1.5,
  },
  {
    id: 'rocks',
    label: 'Rock / Quarry',
    exampleNode: 'Rock_9',
    heightBias: 3.5,
    flatRadiusFrac: 0.03,
    resources: ['stone', 'ore'],
    wildlife: ['neutral'],
    links: ['roads', 'woods', 'cliffs', 'pve'],
    clearVegetation: false,
    harvestDensity: 1.1,
  },
  {
    id: 'pve',
    label: 'PvE / Danger',
    exampleNode: 'Cliffs_2',
    heightBias: 4.0,
    flatRadiusFrac: 0.05,
    resources: ['crystal', 'ore', 'stone'],
    wildlife: ['aggressive', 'neutral'],
    links: ['roads', 'rocks', 'cliffs', 'woods'],
    clearVegetation: false,
    harvestDensity: 0.9,
  },
  {
    id: 'cliffs',
    label: 'Cliff Rim',
    exampleNode: 'Cliffs_2',
    heightBias: 5.5,
    flatRadiusFrac: 0.02,
    resources: ['stone'],
    wildlife: ['aggressive'],
    links: ['rocks', 'pve', 'shore'],
    clearVegetation: true,
    harvestDensity: 0.4,
  },
  {
    id: 'shore',
    label: 'Shore / Beach',
    exampleNode: 'TerrainBase_6',
    heightBias: 0.4,
    flatRadiusFrac: 0.06,
    resources: ['wood', 'stone'],
    wildlife: ['passive'],
    links: ['cliffs', 'roads'],
    clearVegetation: false,
    harvestDensity: 0.7,
  },
];

/** Polar layout: angle + radiusFrac for each zone center (seed rotates whole map). */
export const ZONE_POLAR: Record<IslandZoneId, { angle: number; radiusFrac: number }> = {
  haven: { angle: 0, radiusFrac: 0.05 },
  roads: { angle: 0.4, radiusFrac: 0.18 },
  flowers: { angle: 1.2, radiusFrac: 0.28 },
  woods: { angle: 2.4, radiusFrac: 0.42 },
  rocks: { angle: 3.8, radiusFrac: 0.48 },
  pve: { angle: 5.0, radiusFrac: 0.52 },
  cliffs: { angle: 5.5, radiusFrac: 0.62 },
  shore: { angle: 0.8, radiusFrac: 0.72 },
};

export interface ResolvedZoneCenter {
  zone: IslandZoneDef;
  x: number;
  z: number;
  radius: number;
}

/** Place zone centers on island disk; seed rotates layout. */
export function resolveZoneCenters(
  islandRadiusM: number,
  seedAngle: number,
): ResolvedZoneCenter[] {
  return EXAMPLE_ZONE_LAYOUT.map((zone) => {
    const polar = ZONE_POLAR[zone.id];
    const a = polar.angle + seedAngle;
    const r = polar.radiusFrac * islandRadiusM;
    return {
      zone,
      x: Math.cos(a) * r,
      z: Math.sin(a) * r,
      radius: Math.max(8, zone.flatRadiusFrac * islandRadiusM * 2.2),
    };
  });
}

/**
 * Path graph edges for nav / road placement (haven hub + ring).
 * Roads_5 concept: connect haven to each major zone, and ring woods↔rocks↔pve.
 */
export const PATH_EDGES: Array<[IslandZoneId, IslandZoneId]> = [
  ['haven', 'flowers'],
  ['haven', 'woods'],
  ['haven', 'rocks'],
  ['haven', 'pve'],
  ['flowers', 'woods'],
  ['woods', 'rocks'],
  ['rocks', 'pve'],
  ['pve', 'cliffs'],
  ['cliffs', 'shore'],
  ['woods', 'shore'],
];

/** Sample points along a path for road flattening / markers. */
export function samplePathPoints(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  spacingM: number,
): Array<{ x: number; z: number }> {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz) || 1;
  const n = Math.max(2, Math.ceil(len / spacingM));
  const out: Array<{ x: number; z: number }> = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push({ x: ax + dx * t, z: az + dz * t });
  }
  return out;
}

/** Resolve all road samples from PATH_EDGES between placed zone centers. */
export function resolvePathNetwork(
  centers: ResolvedZoneCenter[],
  spacingM = 4,
): Array<{ x: number; z: number; from: IslandZoneId; to: IslandZoneId }> {
  const byId = new Map(centers.map((c) => [c.zone.id, c] as const));
  const out: Array<{ x: number; z: number; from: IslandZoneId; to: IslandZoneId }> = [];
  for (const [a, b] of PATH_EDGES) {
    const ca = byId.get(a);
    const cb = byId.get(b);
    if (!ca || !cb) continue;
    for (const p of samplePathPoints(ca.x, ca.z, cb.x, cb.z, spacingM)) {
      out.push({ ...p, from: a, to: b });
    }
  }
  return out;
}

/**
 * Flatten / bias heightfield pads for example layout:
 * - Haven: flat camp pad
 * - Path samples: road corridor strip
 * - Cliffs / PvE: raised rim
 * - Flowers / woods: mild raise for readability
 *
 * Mutates terrain heights in place. `TerrainLike` matches editor TerrainData.
 */
export interface TerrainLike {
  size: number;
  resolution: number;
  heights: Float32Array | number[];
  biome?: Uint8Array | number[];
}

function smoothstepLocal(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function applyExampleZoneHeights(
  terrain: TerrainLike,
  centers: ResolvedZoneCenter[],
  pathSamples: Array<{ x: number; z: number }>,
  opts: { roadHalfWidth?: number; maxTerrain?: number } = {},
): void {
  const roadHalf = opts.roadHalfWidth ?? 2.2;
  const maxH = opts.maxTerrain ?? 8;
  const half = terrain.size / 2;
  const cell = terrain.size / (terrain.resolution - 1);
  const R = terrain.resolution;

  // Precompute pad targets
  const pads = centers.map((c) => ({
    x: c.x,
    z: c.z,
    r: c.radius,
    h: Math.min(maxH * 0.95, Math.max(0.35, c.zone.heightBias)),
    clear: c.zone.clearVegetation,
    id: c.zone.id,
  }));

  for (let zi = 0; zi < R; zi++) {
    for (let xi = 0; xi < R; xi++) {
      const wx = -half + xi * cell;
      const wz = -half + zi * cell;
      const i = zi * R + xi;
      let h = terrain.heights[i]!;
      if (h <= 0.05) continue; // leave ocean

      // Zone pads
      for (const pad of pads) {
        const d = Math.hypot(wx - pad.x, wz - pad.z);
        if (d >= pad.r) continue;
        const blend = 1 - smoothstepLocal(pad.r * 0.55, pad.r, d);
        // Haven / roads flatten hard; cliffs boost; others soft bias
        if (pad.id === 'haven' || pad.id === 'roads') {
          h = h * (1 - blend) + pad.h * blend;
        } else if (pad.id === 'cliffs' || pad.id === 'pve') {
          h = h + (pad.h - h) * blend * 0.45;
        } else {
          h = h + (pad.h - h) * blend * 0.25;
        }
      }

      // Road corridors
      for (const p of pathSamples) {
        const d = Math.hypot(wx - p.x, wz - p.z);
        if (d >= roadHalf) continue;
        const blend = 1 - smoothstepLocal(roadHalf * 0.4, roadHalf, d);
        const roadH = Math.max(0.4, Math.min(maxH * 0.4, h));
        h = h * (1 - blend * 0.85) + roadH * (blend * 0.85);
      }

      terrain.heights[i] = Math.max(0.05, Math.min(maxH, h));
    }
  }
}

/** True if world point is inside a clear-vegetation zone or road corridor. */
export function isClearedFootprint(
  x: number,
  z: number,
  centers: ResolvedZoneCenter[],
  pathSamples: Array<{ x: number; z: number }>,
  roadHalfWidth = 2.8,
): boolean {
  for (const c of centers) {
    if (!c.zone.clearVegetation) continue;
    if (Math.hypot(x - c.x, z - c.z) < c.radius * 0.92) return true;
  }
  for (const p of pathSamples) {
    if (Math.hypot(x - p.x, z - p.z) < roadHalfWidth) return true;
  }
  return false;
}

/** Scatter N points inside a zone disk on land. */
export function scatterInZone(
  terrain: TerrainLike,
  center: ResolvedZoneCenter,
  count: number,
  rng: () => number,
  opts: { hMin?: number; hMax?: number; ringMinFrac?: number } = {},
): Array<{ x: number; y: number; z: number }> {
  const hMin = opts.hMin ?? 0.2;
  const hMax = opts.hMax ?? 99;
  const ringMin = opts.ringMinFrac ?? 0.15;
  const half = terrain.size / 2;
  const cell = terrain.size / (terrain.resolution - 1);
  const out: Array<{ x: number; y: number; z: number }> = [];
  let tries = 0;
  while (out.length < count && tries < count * 24) {
    tries++;
    const ang = rng() * Math.PI * 2;
    const dist = center.radius * (ringMin + rng() * (1 - ringMin));
    const x = center.x + Math.cos(ang) * dist;
    const z = center.z + Math.sin(ang) * dist;
    const xi = Math.round((x + half) / cell);
    const zi = Math.round((z + half) / cell);
    if (xi < 0 || zi < 0 || xi >= terrain.resolution || zi >= terrain.resolution) continue;
    const i = zi * terrain.resolution + xi;
    const h = terrain.heights[i]!;
    if (h < hMin || h > hMax) continue;
    out.push({ x, y: h, z });
  }
  return out;
}

export function zoneById(
  centers: ResolvedZoneCenter[],
  id: IslandZoneId,
): ResolvedZoneCenter | undefined {
  return centers.find((c) => c.zone.id === id);
}

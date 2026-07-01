/**
 * IslandTerrainGenerator — seeded procedural 3D island terrain.
 *
 * Uses the same PRNG + octave noise as the 2D island-generator so both views
 * share identical topology from the same seed string.
 *
 * When `rtsHeightmap` is present (RTS-Grudge 200m export), the center of the
 * 1024m world is shaped from the exported height samples; outer ring blends to
 * procedural ocean shoreline.
 */
import * as THREE from 'three';
// @ts-ignore — local .mjs module, no typings
import Terrain from '@/lib/three-terrain/ThreeTerrain.mjs';
import {
  decodeRtsHeightmap,
  type RtsHeightmapPayload,
} from '@shared/definitions/rtsTerrainBridge';
import { HOME_ISLAND_WORLD_SIZE_M } from '@shared/definitions/homeIslandSeed';

// ── Seeded PRNG (same Mulberry32 / FNV hash as 2D generator) ──────────
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

function makePrng(seed: string): () => number {
  let s = hashStr(seed) >>> 0;
  return (): number => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Value noise (same octave approach as 2D) ──────────────────────────
function makeGrid(rng: () => number, n: number): number[][] {
  return Array.from({ length: n }, () => Array.from({ length: n }, rng));
}

function biSample(g: number[][], u: number, v: number): number {
  const n = g.length;
  const x0 = Math.floor(u) % n, x1 = (x0 + 1) % n;
  const y0 = Math.floor(v) % n, y1 = (y0 + 1) % n;
  const tx = u - Math.floor(u), ty = v - Math.floor(v);
  return (g[y0][x0] * (1 - tx) + g[y0][x1] * tx) * (1 - ty)
       + (g[y1][x0] * (1 - tx) + g[y1][x1] * tx) * ty;
}

function octaveNoise(
  rng: () => number, W: number, H: number, octs: number,
): Float32Array {
  const grids = Array.from({ length: octs }, (_, o) => makeGrid(rng, 4 * (1 << o)));
  const result = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let val = 0, amp = 1, norm = 0, freq = 1;
      for (let o = 0; o < octs; o++) {
        const n = grids[o].length;
        val += biSample(grids[o], (x / W) * n * freq, (y / H) * n * freq) * amp;
        norm += amp; amp *= 0.5; freq *= 2;
      }
      result[y * W + x] = val / norm;
    }
  }
  return result;
}

// ── Biome classification (mirrors 2D) ─────────────────────────────────
export type BiomeType = 'water' | 'beach' | 'grass' | 'forest' | 'rock';

function classifyBiome(elev: number, moist: number): BiomeType {
  if (elev < 0.28) return 'water';
  if (elev < 0.36) return 'beach';
  if (elev > 0.72) return 'rock';
  if (moist > 0.58 && elev < 0.70) return 'forest';
  return 'grass';
}

// ── Config ─────────────────────────────────────────────────────────────
export interface IslandTerrainConfig {
  seed: string;
  xSegments?: number;
  ySegments?: number;
  xSize?: number;
  ySize?: number;
  minHeight?: number;
  maxHeight?: number;
  /** RTS-Grudge export — upsampled into center of 1024m terrain */
  rtsHeightmap?: RtsHeightmapPayload;
}

function sampleRtsHeightBilinear(
  heights: Float32Array,
  resolution: number,
  u: number,
  v: number,
): number {
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

export interface IslandTerrainResult {
  terrainScene: THREE.Object3D;
  terrainMesh: THREE.Mesh;
  biomeMap: BiomeType[][];
  elevationMap: Float32Array;
  moistureMap: Float32Array;
  gridW: number;
  gridH: number;
}

function buildTerrainFromHeightFn(
  config: IslandTerrainConfig,
  heightAt: (xl: number, yl: number, i: number, j: number, elev: number, moist: number) => number,
  elevationMap: Float32Array,
  moistureMap: Float32Array,
  gridW: number,
  gridH: number,
  biomeMap: BiomeType[][],
): IslandTerrainResult {
  const {
    xSegments = 63,
    ySegments = 63,
    xSize = 1024,
    ySize = 1024,
    minHeight = -30,
    maxHeight = 80,
  } = config;

  const seededHeightmap = (g: Float32Array, options: { xSegments: number; ySegments: number; minHeight: number; maxHeight: number }) => {
    const xl = options.xSegments + 1;
    const yl = options.ySegments + 1;
    for (let j = 0; j < yl; j++) {
      for (let i = 0; i < xl; i++) {
        const idx = j * xl + i;
        const elev = elevationMap[idx] || 0;
        const moist = moistureMap[idx] || 0;
        g[idx] = heightAt(xl, yl, i, j, elev, moist);
      }
    }
  };

  const terrain = new Terrain({
    heightmap: seededHeightmap,
    easing: Terrain.Linear,
    maxHeight,
    minHeight,
    xSegments,
    ySegments,
    xSize,
    ySize,
    steps: 0,
    stretch: false,
    after: (g: Float32Array, options: { xSegments: number; ySegments: number }) => {
      Terrain.Smooth(g, options, 1);
      Terrain.Smooth(g, options, 0.5);
    },
  });

  const terrainScene = terrain.getScene();
  const terrainMesh = terrainScene.children[0] as THREE.Mesh;
  terrainMesh.castShadow = true;
  terrainMesh.receiveShadow = true;

  return {
    terrainScene,
    terrainMesh,
    biomeMap,
    elevationMap,
    moistureMap,
    gridW,
    gridH,
  };
}

function buildBiomeMap(
  elevationMap: Float32Array,
  moistureMap: Float32Array,
  gridW: number,
  gridH: number,
): BiomeType[][] {
  const cx = gridW / 2;
  const cy = gridH / 2;
  const maxR = Math.min(gridW, gridH) * 0.48;
  const biomeMap: BiomeType[][] = [];
  for (let y = 0; y < gridH; y++) {
    biomeMap[y] = [];
    for (let x = 0; x < gridW; x++) {
      const dist = Math.hypot(x - cx, y - cy) / maxR;
      const adjElev = elevationMap[y * gridW + x] - dist * 0.8;
      biomeMap[y][x] = classifyBiome(adjElev, moistureMap[y * gridW + x]);
    }
  }
  return biomeMap;
}

/**
 * Shape 1024m terrain from an RTS-Grudge heightmap export (200m, 128²).
 * RTS island is centered; outer ring uses seeded procedural shoreline.
 */
export function generateIslandTerrainFromRts(config: IslandTerrainConfig): IslandTerrainResult {
  const payload = config.rtsHeightmap!;
  const {
    seed,
    xSegments = 63,
    ySegments = 63,
    xSize = HOME_ISLAND_WORLD_SIZE_M,
    ySize = HOME_ISLAND_WORLD_SIZE_M,
    minHeight = -30,
    maxHeight = 80,
  } = config;

  const gridW = xSegments + 1;
  const gridH = ySegments + 1;
  const rng = makePrng(seed);
  const rng2 = makePrng(seed + '_m');
  const proceduralElev = octaveNoise(rng, gridW, gridH, 3);
  const moistureMap = octaveNoise(rng2, gridW, gridH, 2);

  const rtsHeights = decodeRtsHeightmap(payload);
  const rtsHalfM = payload.worldSizeM / 2;
  const worldHalfM = xSize / 2;
  const elevationMap = new Float32Array(gridW * gridH);

  for (let j = 0; j < gridH; j++) {
    for (let i = 0; i < gridW; i++) {
      const idx = j * gridW + i;
      const worldX = (i / xSegments - 0.5) * xSize;
      const worldZ = (j / ySegments - 0.5) * ySize;
      const inRts = Math.abs(worldX) <= rtsHalfM && Math.abs(worldZ) <= rtsHalfM;

      if (inRts) {
        const ru = (worldX + rtsHalfM) / payload.worldSizeM;
        const rv = (worldZ + rtsHalfM) / payload.worldSizeM;
        const rtsM = sampleRtsHeightBilinear(rtsHeights, payload.resolution, ru, rv);
        const norm = rtsM / Math.max(payload.maxHeightM, 0.001);
        elevationMap[idx] = Math.min(1, norm * 0.95 + 0.05);
      } else {
        elevationMap[idx] = proceduralElev[idx];
      }
    }
  }

  const biomeMap = buildBiomeMap(elevationMap, moistureMap, gridW, gridH);
  const centerX = gridW / 2;
  const centerY = gridH / 2;
  const islandRadius = Math.min(gridW, gridH) * 0.48;
  const heightSpan = maxHeight - minHeight;

  return buildTerrainFromHeightFn(
    config,
    (_xl, _yl, i, j, elev, _moist) => {
      const worldX = (i / xSegments - 0.5) * xSize;
      const worldZ = (j / ySegments - 0.5) * ySize;
      const dist = Math.hypot(i - centerX, j - centerY);
      const falloff = Math.max(0, 1 - (dist / islandRadius));
      const edgeBlend = Math.min(1, Math.max(0, (Math.hypot(worldX, worldZ) - rtsHalfM * 0.85) / (worldHalfM - rtsHalfM * 0.85)));

      let height: number;
      if (Math.abs(worldX) <= rtsHalfM && Math.abs(worldZ) <= rtsHalfM) {
        const ru = (worldX + rtsHalfM) / payload.worldSizeM;
        const rv = (worldZ + rtsHalfM) / payload.worldSizeM;
        const rtsM = sampleRtsHeightBilinear(rtsHeights, payload.resolution, ru, rv);
        const amp = heightSpan * 0.72;
        height = minHeight + (rtsM / Math.max(payload.maxHeightM, 0.001)) * amp;
      } else {
        height = (elev * falloff * falloff) * heightSpan + minHeight;
      }

      if (edgeBlend > 0 && edgeBlend < 1) {
        const procedural = (elev * falloff * falloff) * heightSpan + minHeight;
        height = height * (1 - edgeBlend) + procedural * edgeBlend;
      }

      return height;
    },
    elevationMap,
    moistureMap,
    gridW,
    gridH,
    biomeMap,
  );
}

// ── Main generator ────────────────────────────────────────────────────
export function generateIslandTerrain(config: IslandTerrainConfig): IslandTerrainResult {
  const {
    seed,
    xSegments = 63,
    ySegments = 63,
    xSize = 1024,
    ySize = 1024,
    minHeight = -30,
    maxHeight = 80,
  } = config;

  const gridW = xSegments + 1;
  const gridH = ySegments + 1;

  // Generate noise maps with the SAME seeded PRNG as 2D
  const rng = makePrng(seed);
  const rng2 = makePrng(seed + '_m');
  const elevationMap = octaveNoise(rng, gridW, gridH, 3);
  const moistureMap = octaveNoise(rng2, gridW, gridH, 2);

  const biomeMap = buildBiomeMap(elevationMap, moistureMap, gridW, gridH);
  const centerX = gridW / 2;
  const centerY = gridH / 2;
  const islandRadius = Math.min(gridW, gridH) * 0.48;
  const heightSpan = maxHeight - minHeight;

  return buildTerrainFromHeightFn(
    config,
    (_xl, _yl, i, j, elev) => {
      const dist = Math.hypot(i - centerX, j - centerY);
      const falloff = Math.max(0, 1 - (dist / islandRadius));
      return (elev * falloff * falloff) * heightSpan + minHeight;
    },
    elevationMap,
    moistureMap,
    gridW,
    gridH,
    biomeMap,
  );
}

/** Pick procedural or RTS-shaped terrain from config. */
export function generateIslandTerrainWithBridge(config: IslandTerrainConfig): IslandTerrainResult {
  if (config.rtsHeightmap?.heightsBase64 && config.rtsHeightmap.resolution > 0) {
    return generateIslandTerrainFromRts(config);
  }
  return generateIslandTerrain(config);
}

/**
 * Get the world-space height at a given (x, z) position on the terrain
 * using raycasting from above.
 */
const _heightRay = new THREE.Raycaster();
const _heightOrigin = new THREE.Vector3();
const _heightDir = new THREE.Vector3(0, -1, 0);

export function getTerrainHeightAt(
  terrainMesh: THREE.Mesh,
  x: number,
  z: number,
): number | null {
  _heightOrigin.set(x, 200, z);
  _heightRay.set(_heightOrigin, _heightDir);
  const hits = _heightRay.intersectObject(terrainMesh, true);
  return hits.length > 0 ? hits[0].point.y : null;
}

/** Raycast height against any Object3D subtree (lobby GLTF maps, zone islands). */
export function getSceneHeightAt(
  root: THREE.Object3D,
  x: number,
  z: number,
  maxY = 400,
): number | null {
  _heightOrigin.set(x, maxY, z);
  _heightRay.set(_heightOrigin, _heightDir);
  const hits = _heightRay.intersectObject(root, true);
  return hits.length > 0 ? hits[0].point.y : null;
}

/**
 * Get terrain normal at a given (x, z) position.
 */
export function getTerrainNormalAt(
  terrainMesh: THREE.Mesh,
  x: number,
  z: number,
): THREE.Vector3 | null {
  _heightOrigin.set(x, 200, z);
  _heightRay.set(_heightOrigin, _heightDir);
  const hits = _heightRay.intersectObject(terrainMesh, true);
  return hits.length > 0 ? hits[0].face?.normal?.clone() || null : null;
}

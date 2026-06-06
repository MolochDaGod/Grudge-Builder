/**
 * IslandTerrainGenerator — seeded procedural 3D island terrain.
 *
 * Uses the same PRNG + octave noise as the 2D island-generator so both views
 * share identical topology from the same seed string.
 */
import * as THREE from 'three';
// @ts-ignore — local .mjs module, no typings
import Terrain from '@/lib/three-terrain/ThreeTerrain.mjs';

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

  // Build biome map
  const cx = gridW / 2, cy = gridH / 2;
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

  // Custom heightmap function that injects our seeded noise into THREE.Terrain
  const seededHeightmap = (g: Float32Array, options: any) => {
    const xl = options.xSegments + 1;
    const yl = options.ySegments + 1;
    const centerX = xl / 2;
    const centerY = yl / 2;
    const radius = Math.min(xl, yl) * 0.48;

    for (let j = 0; j < yl; j++) {
      for (let i = 0; i < xl; i++) {
        const idx = j * xl + i;
        const elev = elevationMap[idx] || 0;
        const dist = Math.hypot(i - centerX, j - centerY);
        const falloff = Math.max(0, 1 - (dist / radius));
        // Island shape: elevation * circular falloff, pushed below water at edges
        const height = (elev * falloff * falloff) * (options.maxHeight - options.minHeight) + options.minHeight;
        g[idx] = height;
      }
    }
  };

  // Create terrain using THREE.Terrain
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
    after: (g: Float32Array, options: any) => {
      // Smooth the terrain for nicer surfaces
      Terrain.Smooth(g, options, 1);
      Terrain.Smooth(g, options, 0.5);
    },
  });

  const terrainScene = terrain.getScene();
  const terrainMesh = terrainScene.children[0] as THREE.Mesh;

  // Enable shadows
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

/**
 * Get the world-space height at a given (x, z) position on the terrain
 * using raycasting from above.
 */
export function getTerrainHeightAt(
  terrainMesh: THREE.Mesh,
  x: number,
  z: number,
): number | null {
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(x, 200, z),
    new THREE.Vector3(0, -1, 0),
  );
  const hits = raycaster.intersectObject(terrainMesh);
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
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(x, 200, z),
    new THREE.Vector3(0, -1, 0),
  );
  const hits = raycaster.intersectObject(terrainMesh);
  return hits.length > 0 ? hits[0].face?.normal?.clone() || null : null;
}

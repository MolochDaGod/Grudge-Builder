/**
 * ZoneTerrainGenerator — 4km × 4km zone heightmap generation.
 *
 * Inspired by Dune: Awakening terrain pipeline:
 *   - Multi-octave FBM with domain warping (wind-eroded shapes)
 *   - Ridge noise for dramatic cliff faces and canyon walls
 *   - Simplified thermal erosion (talus slopes)
 *   - Biome-specific heightmap modifiers per sector
 *   - LOD-friendly: generates a Float32Array heightmap the server can
 *     validate against and the client renders with THREE.Terrain.
 *
 * Each zone is seeded deterministically from sector.id + a world seed,
 * so server and client always produce identical terrain.
 */
import * as THREE from 'three';
// @ts-ignore — local .mjs module
import Terrain from '@/lib/three-terrain/ThreeTerrain.mjs';
import type { WorldSector, ZoneTerrain3DConfig } from '@shared/definitions/worldMapSectors';
import { createSectorTerrainMaterial } from './TerrainMaterial';

// ── Seeded PRNG (Mulberry32 via FNV-1a) ──────────────────────────────────────

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Noise Primitives ─────────────────────────────────────────────────────────

/** 2D value noise grid with bilinear interpolation */
function makeNoiseGrid(rng: () => number, n: number): Float32Array {
  const grid = new Float32Array(n * n);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();
  return grid;
}

function sampleGrid(grid: Float32Array, n: number, u: number, v: number): number {
  const x0 = Math.floor(u) % n, x1 = (x0 + 1) % n;
  const y0 = Math.floor(v) % n, y1 = (y0 + 1) % n;
  const tx = u - Math.floor(u), ty = v - Math.floor(v);
  // Smoothstep for less grid-aligned artifacts
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = grid[y0 * n + x0] * (1 - sx) + grid[y0 * n + x1] * sx;
  const b = grid[y1 * n + x0] * (1 - sx) + grid[y1 * n + x1] * sx;
  return a * (1 - sy) + b * sy;
}

/**
 * Fractal Brownian Motion (FBM) — standard multi-octave noise.
 * This is the base of Dune-style terrain before modifiers.
 */
function fbm(
  grids: Float32Array[],
  gridSizes: number[],
  x: number, y: number,
  octaves: number,
  lacunarity: number,
  persistence: number,
  baseFreq: number,
): number {
  let val = 0, amp = 1, freq = baseFreq, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const n = gridSizes[Math.min(o, gridSizes.length - 1)];
    val += sampleGrid(grids[Math.min(o, grids.length - 1)], n, x * freq * n, y * freq * n) * amp;
    norm += amp;
    amp *= persistence;
    freq *= lacunarity;
  }
  return val / norm;
}

/**
 * Ridge noise — abs(noise) inverted to create sharp ridgelines.
 * Dune uses this for rocky cliff faces and canyon walls.
 */
function ridgeNoise(
  grids: Float32Array[],
  gridSizes: number[],
  x: number, y: number,
  octaves: number,
  lacunarity: number,
  persistence: number,
  baseFreq: number,
): number {
  let val = 0, amp = 1, freq = baseFreq, norm = 0, prev = 1;
  for (let o = 0; o < octaves; o++) {
    const n = gridSizes[Math.min(o, gridSizes.length - 1)];
    let noise = sampleGrid(grids[Math.min(o, grids.length - 1)], n, x * freq * n, y * freq * n);
    noise = 1 - Math.abs(noise * 2 - 1); // ridge transform
    noise *= noise; // sharpen ridges
    noise *= prev; // weight by previous octave (Dune canyon trick)
    prev = noise;
    val += noise * amp;
    norm += amp;
    amp *= persistence;
    freq *= lacunarity;
  }
  return val / norm;
}

/**
 * Domain warping — distort sample coordinates by another noise field.
 * This creates the organic, wind-eroded look of Dune terrain.
 */
function domainWarp(
  grids: Float32Array[],
  gridSizes: number[],
  x: number, y: number,
  warpStrength: number,
  baseFreq: number,
): [number, number] {
  const n = gridSizes[0];
  const wx = sampleGrid(grids[0], n, (x + 5.2) * baseFreq * n, (y + 1.3) * baseFreq * n) * 2 - 1;
  const wy = sampleGrid(grids[0], n, (x + 1.7) * baseFreq * n, (y + 9.2) * baseFreq * n) * 2 - 1;
  return [x + wx * warpStrength, y + wy * warpStrength];
}

// ── Simplified Thermal Erosion ───────────────────────────────────────────────

/**
 * Single pass of thermal erosion — material slides from steep slopes to lower neighbors.
 * Dune uses this to create natural talus slopes at cliff bases.
 */
function thermalErosion(
  heightmap: Float32Array,
  w: number, h: number,
  talusAngle: number,
  iterations: number,
): void {
  const maxDelta = talusAngle; // max height diff before material slides
  for (let iter = 0; iter < iterations; iter++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const center = heightmap[idx];
        let maxDiff = 0;
        let lowestIdx = -1;

        // Check 4-connected neighbors
        const neighbors = [idx - 1, idx + 1, idx - w, idx + w];
        for (const ni of neighbors) {
          const diff = center - heightmap[ni];
          if (diff > maxDiff) {
            maxDiff = diff;
            lowestIdx = ni;
          }
        }

        if (maxDiff > maxDelta && lowestIdx >= 0) {
          const move = (maxDiff - maxDelta) * 0.5;
          heightmap[idx] -= move;
          heightmap[lowestIdx] += move;
        }
      }
    }
  }
}

// ── Biome-Specific Heightmap Modifiers ───────────────────────────────────────

type HeightmapModifier = (
  heightmap: Float32Array, w: number, h: number,
  rng: () => number, config: ZoneTerrain3DConfig,
) => void;

const HEIGHTMAP_MODIFIERS: Record<string, HeightmapModifier> = {
  /** Default — gentle rolling terrain with occasional hills */
  default: (hm, w, h) => {
    thermalErosion(hm, w, h, 0.04, 2);
  },

  /** Frozen glacier — flat ice sheets with deep crevasses and pressure ridges */
  frozen_glacier: (hm, w, h, rng) => {
    const crevGrid = makeNoiseGrid(rng, 32);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const nx = x / w, ny = y / h;
        // Flatten most of the terrain (glacier plateau)
        hm[idx] = hm[idx] * 0.3 + 0.4;
        // Add crevasses — narrow deep cuts
        const crev = sampleGrid(crevGrid, 32, nx * 64, ny * 64);
        if (crev < 0.15) hm[idx] -= 0.3 * (0.15 - crev) / 0.15;
        // Pressure ridges — sharp bumps
        const ridge = Math.abs(Math.sin(nx * 40 + ny * 20)) * 0.08;
        hm[idx] += ridge;
      }
    }
    thermalErosion(hm, w, h, 0.02, 3);
  },

  /** Storm reef — mostly ocean with jagged coral peaks barely above water */
  storm_reef: (hm, w, h, rng) => {
    const reefGrid = makeNoiseGrid(rng, 64);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const nx = x / w, ny = y / h;
        // Push everything underwater first
        hm[idx] = hm[idx] * 0.4 - 0.2;
        // Reef spikes — sharp peaks from the seafloor
        const reef = sampleGrid(reefGrid, 64, nx * 80, ny * 80);
        if (reef > 0.7) hm[idx] += (reef - 0.7) * 3.0;
        // Whirlpool depressions
        const dist = Math.hypot(nx - 0.5, ny - 0.5);
        if (dist < 0.15) hm[idx] -= (0.15 - dist) * 2.0;
      }
    }
  },

  /** Dense forest — rolling hills with steep valley sides */
  dense_forest: (hm, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        // Amplify mid-range heights for rolling hills, clamp valleys
        hm[idx] = Math.max(0.15, hm[idx] * 1.2 - 0.1);
      }
    }
    thermalErosion(hm, w, h, 0.03, 4);
  },

  /** Desert dunes — Dune: Awakening style with domain-warped dune fields */
  desert_dunes: (hm, w, h, rng, config) => {
    const duneGrid = makeNoiseGrid(rng, 48);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const nx = x / w, ny = y / h;
        // Base terrain — very flat
        let base = hm[idx] * 0.2 + 0.1;
        // Dune waves — sinusoidal ridges with noise offset (wind-blown)
        const duneOff = sampleGrid(duneGrid, 48, nx * 30, ny * 30) * 0.3;
        const dune = Math.sin((nx * 25 + duneOff) * Math.PI) * 0.15;
        base += Math.max(0, dune);
        // Occasional rocky outcrops (Dune-style mesa)
        const mesa = sampleGrid(duneGrid, 48, nx * 12 + 10, ny * 12 + 10);
        if (mesa > 0.82) base += (mesa - 0.82) * 5.0;
        hm[idx] = base;
      }
    }
    thermalErosion(hm, w, h, 0.05, 2);
  },

  /** Nexus leylines — fractured terrain with glowing rift valleys */
  nexus_leylines: (hm, w, h, rng) => {
    const leyGrid = makeNoiseGrid(rng, 24);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const nx = x / w, ny = y / h;
        // Fractured plates — sharp edges
        const plate = sampleGrid(leyGrid, 24, nx * 20, ny * 20);
        const plateFrac = Math.floor(plate * 6) / 6; // quantize to plates
        hm[idx] = hm[idx] * 0.5 + plateFrac * 0.5;
        // Rift valleys between plates
        const riftDist = Math.abs(plate - plateFrac) * 6;
        if (riftDist < 0.3) hm[idx] -= (0.3 - riftDist) * 0.8;
        // Central energy spire
        const dist = Math.hypot(nx - 0.5, ny - 0.5);
        if (dist < 0.1) hm[idx] += (0.1 - dist) * 8.0;
      }
    }
  },

  /**
   * Ethereal Falls — the signature zone.
   * Floating island archipelago over a luminous abyss.
   * Massive waterfalls cascade between island layers.
   */
  ethereal_falls: (hm, w, h, rng) => {
    const islandGrid = makeNoiseGrid(rng, 32);
    const crystalGrid = makeNoiseGrid(rng, 64);
    const waterfallGrid = makeNoiseGrid(rng, 16);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const nx = x / w, ny = y / h;

        // === Layer 1: Deep abyss floor (base) ===
        let base = -0.4 + hm[idx] * 0.15;

        // === Layer 2: Floating island platforms ===
        // Multiple island clusters at different heights
        const islandNoise = sampleGrid(islandGrid, 32, nx * 18, ny * 18);
        const crystalNoise = sampleGrid(crystalGrid, 64, nx * 40, ny * 40);

        // Island formation — threshold creates discrete platforms
        if (islandNoise > 0.55) {
          const islandHeight = (islandNoise - 0.55) / 0.45; // 0-1
          // Three tiers of floating islands
          const tier = Math.floor(islandHeight * 3);
          const tierHeight = [0.3, 0.55, 0.8][tier] ?? 0.3;
          // Flat-topped islands with steep cliff edges (mesa style)
          const edgeDist = (islandNoise - 0.55) * 5; // distance from island edge
          const cliffProfile = Math.min(1, edgeDist * 3); // steep cliff then flat top
          base = tierHeight + cliffProfile * 0.08;

          // Crystal formations on island surfaces
          if (crystalNoise > 0.7) {
            base += (crystalNoise - 0.7) * 0.4; // crystal spires
          }
        }

        // === Layer 3: Waterfall channels ===
        // Vertical channels between islands where water cascades
        const wfNoise = sampleGrid(waterfallGrid, 16, nx * 8, ny * 8);
        const isWaterfall = wfNoise > 0.75 && islandNoise < 0.55;
        if (isWaterfall) {
          // Carved waterfall channel — deeper than surrounding abyss
          base = Math.min(base, -0.3 - (wfNoise - 0.75) * 2.0);
        }

        // === Layer 4: Spectral mist shelves ===
        // Thin ledges where mist collects at specific heights
        const mistShelf = Math.sin(base * 12) * 0.01;
        base += mistShelf;

        // === Layer 5: Central vortex ===
        // Massive whirlpool/abyss at zone center
        const centerDist = Math.hypot(nx - 0.5, ny - 0.5);
        if (centerDist < 0.12) {
          const vortexDepth = (0.12 - centerDist) / 0.12;
          base -= vortexDepth * vortexDepth * 0.6; // deep funnel
        }

        // === Edge falloff — ocean surrounds the zone ===
        const edgeDist = Math.max(
          Math.max(nx, 1 - nx),
          Math.max(ny, 1 - ny),
        );
        if (edgeDist > 0.85) {
          const edgeFade = (edgeDist - 0.85) / 0.15;
          base = base * (1 - edgeFade) + (-0.5) * edgeFade;
        }

        hm[idx] = base;
      }
    }
    // Light erosion — don't destroy the floating island shapes
    thermalErosion(hm, w, h, 0.015, 1);
  },

  /** Abyssal trench — deep underwater canyon with bioluminescent ridges */
  abyssal_trench: (hm, w, h, rng) => {
    const ridgeGrid = makeNoiseGrid(rng, 32);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const nx = x / w, ny = y / h;
        // Everything very deep
        let base = -0.6 + hm[idx] * 0.2;
        // Central trench — deep V-shaped canyon
        const trenchDist = Math.abs(nx - 0.5);
        if (trenchDist < 0.15) {
          base -= (0.15 - trenchDist) * 3.0; // deepest at center
        }
        // Ridge walls on either side
        const ridge = sampleGrid(ridgeGrid, 32, nx * 24, ny * 24);
        if (trenchDist > 0.15 && trenchDist < 0.3 && ridge > 0.5) {
          base += (ridge - 0.5) * 0.8; // wall formations
        }
        hm[idx] = base;
      }
    }
  },

  /** Volcanic caldera — ring of peaks around a lava-filled central basin */
  volcanic_caldera: (hm, w, h, rng) => {
    const lavaGrid = makeNoiseGrid(rng, 48);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const nx = x / w, ny = y / h;
        const centerDist = Math.hypot(nx - 0.5, ny - 0.5);
        let base = hm[idx];
        // Caldera rim — ring of peaks
        const rimDist = Math.abs(centerDist - 0.3);
        if (rimDist < 0.08) {
          base += (0.08 - rimDist) * 8.0; // sharp rim
        }
        // Inner basin — lava floor
        if (centerDist < 0.22) {
          const lava = sampleGrid(lavaGrid, 48, nx * 20, ny * 20);
          base = -0.1 + lava * 0.05; // mostly flat lava lake
        }
        // Outer slopes
        if (centerDist > 0.38) {
          base *= 0.6; // gentler outer terrain
        }
        // Lava channels radiating outward
        const angle = Math.atan2(ny - 0.5, nx - 0.5);
        const channelPhase = Math.sin(angle * 5) * 0.5 + 0.5;
        if (channelPhase > 0.8 && centerDist > 0.22 && centerDist < 0.38) {
          base -= 0.15; // lava channel cut
        }
        hm[idx] = base;
      }
    }
    thermalErosion(hm, w, h, 0.04, 3);
  },

  /** Tropical island — classic island shape with beaches, hills, central peak */
  tropical_island: (hm, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const nx = x / w, ny = y / h;
        const centerDist = Math.hypot(nx - 0.5, ny - 0.5) / 0.45;
        // Circular island falloff
        const falloff = Math.max(0, 1 - centerDist * centerDist);
        hm[idx] = hm[idx] * falloff * 0.8;
        // Push edges underwater
        if (centerDist > 0.9) hm[idx] = -0.1;
      }
    }
    thermalErosion(hm, w, h, 0.03, 3);
  },
};

// ── Result Types ─────────────────────────────────────────────────────────────

export interface ZoneTerrainResult {
  /** The THREE.js scene containing the terrain mesh */
  terrainScene: THREE.Object3D;
  /** The terrain mesh (child[0] of terrainScene) */
  terrainMesh: THREE.Mesh;
  /** Raw heightmap Float32Array — (segments+1)² values, 0-1 normalized */
  heightmap: Float32Array;
  /** Grid width (segments + 1) */
  gridW: number;
  /** Grid height (segments + 1) */
  gridH: number;
  /** The sector this terrain was generated for */
  sector: WorldSector;
  /** World-space size in meters */
  sizeMeters: number;
}

// ── Main Generator ───────────────────────────────────────────────────────────

/**
 * Generate a full 4km × 4km zone terrain from a sector definition.
 *
 * @param sector  — the WorldSector (contains terrain3d config)
 * @param worldSeed — global world seed (combined with sector.id for determinism)
 */
export function generateZoneTerrain(
  sector: WorldSector,
  worldSeed: string = 'grudge-world-1',
): ZoneTerrainResult {
  const cfg = sector.terrain3d;
  const gridW = cfg.segments + 1;
  const gridH = cfg.segments + 1;
  const seed = hashStr(`${worldSeed}:${sector.id}`);
  const rng = mulberry32(seed);

  // Build noise grids (increasing resolution per octave)
  const octaves = cfg.noiseOctaves;
  const grids: Float32Array[] = [];
  const gridSizes: number[] = [];
  for (let o = 0; o < octaves; o++) {
    const n = 8 * (1 << o); // 8, 16, 32, 64, 128, 256, 512
    grids.push(makeNoiseGrid(rng, n));
    gridSizes.push(n);
  }

  // Domain warp grid
  const warpGrids = [makeNoiseGrid(rng, 32)];
  const warpSizes = [32];

  // Generate base heightmap using FBM + domain warping + ridge noise blend
  const heightmap = new Float32Array(gridW * gridH);

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const nx = x / gridW;
      const ny = y / gridH;

      // Domain warp for organic erosion look (Dune-style wind shaping)
      const [wx, wy] = domainWarp(warpGrids, warpSizes, nx, ny, 0.15, cfg.noiseBaseFreq * 2);

      // Blend FBM (smooth) + Ridge noise (sharp cliffs) — 70/30 default
      const smooth = fbm(grids, gridSizes, wx, wy, octaves, cfg.noiseLacunarity, cfg.noisePersistence, cfg.noiseBaseFreq);
      const sharp = ridgeNoise(grids, gridSizes, wx, wy, Math.min(octaves, 4), cfg.noiseLacunarity, cfg.noisePersistence * 0.8, cfg.noiseBaseFreq * 1.5);

      heightmap[y * gridW + x] = smooth * 0.7 + sharp * 0.3;
    }
  }

  // Apply biome-specific modifier
  const modifier = HEIGHTMAP_MODIFIERS[cfg.heightmapModifier] ?? HEIGHTMAP_MODIFIERS.default;
  modifier(heightmap, gridW, gridH, rng, cfg);

  // Build THREE.Terrain mesh
  const seededHeightmapFn = (g: Float32Array, options: any) => {
    const xl = options.xSegments + 1;
    const yl = options.ySegments + 1;
    for (let j = 0; j < yl; j++) {
      for (let i = 0; i < xl; i++) {
        const idx = j * xl + i;
        const h = heightmap[idx] ?? 0;
        g[idx] = h * (options.maxHeight - options.minHeight) + options.minHeight;
      }
    }
  };

  const terrain = new Terrain({
    heightmap: seededHeightmapFn,
    easing: Terrain.Linear,
    maxHeight: cfg.maxHeight,
    minHeight: cfg.minHeight,
    xSegments: cfg.segments,
    ySegments: cfg.segments,
    xSize: cfg.sizeMeters,
    ySize: cfg.sizeMeters,
    steps: 0,
    stretch: false,
    after: (g: Float32Array, options: any) => {
      Terrain.Smooth(g, options, 1);
    },
  });

  const terrainScene = terrain.getScene();
  const terrainMesh = terrainScene.children[0] as THREE.Mesh;
  terrainMesh.castShadow = true;
  terrainMesh.receiveShadow = true;
  terrainMesh.material = createSectorTerrainMaterial(sector);

  return {
    terrainScene,
    terrainMesh,
    heightmap,
    gridW,
    gridH,
    sector,
    sizeMeters: cfg.sizeMeters,
  };
}

/**
 * Sample the heightmap at a normalized (0-1) position.
 * Returns the raw 0-1 height value (multiply by maxHeight-minHeight + minHeight for world space).
 */
export function sampleHeightmap(
  heightmap: Float32Array, gridW: number, gridH: number,
  nx: number, ny: number,
): number {
  const x = Math.max(0, Math.min(gridW - 1, nx * (gridW - 1)));
  const y = Math.max(0, Math.min(gridH - 1, ny * (gridH - 1)));
  const x0 = Math.floor(x), x1 = Math.min(x0 + 1, gridW - 1);
  const y0 = Math.floor(y), y1 = Math.min(y0 + 1, gridH - 1);
  const tx = x - x0, ty = y - y0;
  const a = heightmap[y0 * gridW + x0] * (1 - tx) + heightmap[y0 * gridW + x1] * tx;
  const b = heightmap[y1 * gridW + x0] * (1 - tx) + heightmap[y1 * gridW + x1] * tx;
  return a * (1 - ty) + b * ty;
}

/**
 * Convert world-space XZ to the heightmap Y value.
 */
export function getZoneHeightAt(
  result: ZoneTerrainResult,
  worldX: number, worldZ: number,
): number {
  const half = result.sizeMeters / 2;
  const nx = (worldX + half) / result.sizeMeters;
  const nz = (worldZ + half) / result.sizeMeters;
  const cfg = result.sector.terrain3d;
  const rawH = sampleHeightmap(result.heightmap, result.gridW, result.gridH, nx, nz);
  return rawH * (cfg.maxHeight - cfg.minHeight) + cfg.minHeight;
}

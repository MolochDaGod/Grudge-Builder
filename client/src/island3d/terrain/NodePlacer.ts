/**
 * NodePlacer — places resource nodes on 3D terrain.
 *
 * Reuses the Poisson-disc biome-aware placement logic from the 2D generator,
 * then projects each position onto the 3D terrain surface via raycast.
 */
import * as THREE from 'three';
import { getTerrainHeightAt, type BiomeType } from './IslandTerrainGenerator';

export type NodePlacementType = 'tree' | 'rock' | 'bush' | 'herb' | 'fish' | 'crystal' | 'hemp' | 'flower' | 'scrap' | 'dock';

export interface PlacedNode3D {
  id: string;
  type: NodePlacementType;
  biome: BiomeType;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  scale: number;
}

// ── Seeded PRNG (same as terrain generator) ───────────────────────────
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

// ── Poisson-disc spacing check ────────────────────────────────────────
function tooClose(nodes: PlacedNode3D[], x: number, z: number, minDist: number): boolean {
  return nodes.some(n => {
    const dx = n.position.x - x;
    const dz = n.position.z - z;
    return Math.sqrt(dx * dx + dz * dz) < minDist;
  });
}

// ── Biome → node type mapping ─────────────────────────────────────────
interface NodeRule {
  type: NodePlacementType;
  biomes: BiomeType[];
  count: number;
  minSpacing: number;
  scaleMin: number;
  scaleMax: number;
}

const NODE_RULES: NodeRule[] = [
  { type: 'tree',    biomes: ['forest', 'grass'], count: 38, minSpacing: 18, scaleMin: 0.8, scaleMax: 1.5 },
  { type: 'rock',    biomes: ['rock', 'grass'],   count: 18, minSpacing: 22, scaleMin: 0.6, scaleMax: 1.2 },
  { type: 'crystal', biomes: ['rock'],            count: 8,  minSpacing: 30, scaleMin: 0.5, scaleMax: 1.0 },
  { type: 'bush',    biomes: ['grass', 'forest'],  count: 22, minSpacing: 14, scaleMin: 0.5, scaleMax: 0.9 },
  { type: 'hemp',    biomes: ['grass'],            count: 14, minSpacing: 20, scaleMin: 0.6, scaleMax: 1.0 },
  { type: 'flower',  biomes: ['grass', 'forest'],  count: 16, minSpacing: 16, scaleMin: 0.4, scaleMax: 0.7 },
  { type: 'herb',    biomes: ['forest'],           count: 12, minSpacing: 16, scaleMin: 0.4, scaleMax: 0.7 },
  { type: 'fish',    biomes: ['beach'],            count: 8,  minSpacing: 28, scaleMin: 1.0, scaleMax: 1.0 },
  { type: 'dock',    biomes: ['beach'],            count: 2,  minSpacing: 80, scaleMin: 1.0, scaleMax: 1.0 },
];

/**
 * Place resource nodes on the 3D terrain.
 */
export function placeResourceNodes(
  biomeMap: BiomeType[][],
  terrainMesh: THREE.Mesh,
  gridW: number,
  gridH: number,
  xSize: number,
  ySize: number,
  seed: string,
  excludeTypes: NodePlacementType[] = [],
): PlacedNode3D[] {
  const rng = makePrng(seed + '_nodes');
  const nodes: PlacedNode3D[] = [];
  let uid = 0;

  // Collect candidate positions by biome
  const candidates: Map<BiomeType, Array<[number, number]>> = new Map();
  for (const biome of ['water', 'beach', 'grass', 'forest', 'rock'] as BiomeType[]) {
    candidates.set(biome, []);
  }

  // Sample at lower resolution for performance (every 4th cell)
  for (let gy = 4; gy < gridH - 4; gy += 4) {
    for (let gx = 4; gx < gridW - 4; gx += 4) {
      const biome = biomeMap[gy]?.[gx];
      if (biome) {
        candidates.get(biome)?.push([gx, gy]);
      }
    }
  }

  // Place nodes per rule
  for (const rule of NODE_RULES) {
    if (excludeTypes.includes(rule.type)) continue;
    let placed = 0;
    // Combine candidate pools from all valid biomes
    const pool: Array<[number, number]> = [];
    for (const biome of rule.biomes) {
      pool.push(...(candidates.get(biome) || []));
    }

    // Shuffle pool with seeded rng
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    for (const [gx, gy] of pool) {
      if (placed >= rule.count) break;

      // Convert grid coords to world coords
      const worldX = (gx / (gridW - 1) - 0.5) * xSize;
      const worldZ = (gy / (gridH - 1) - 0.5) * ySize;

      if (tooClose(nodes, worldX, worldZ, rule.minSpacing)) continue;

      // Raycast to find terrain height
      const height = getTerrainHeightAt(terrainMesh, worldX, worldZ);
      if (height === null || height < -5) continue; // skip underwater

      const scale = rule.scaleMin + rng() * (rule.scaleMax - rule.scaleMin);
      const biome = biomeMap[gy]?.[gx] || 'grass';

      nodes.push({
        id: `${rule.type}_${uid++}`,
        type: rule.type,
        biome,
        position: new THREE.Vector3(worldX, height, worldZ),
        normal: new THREE.Vector3(0, 1, 0),
        scale,
      });
      placed++;
    }
  }

  return nodes;
}

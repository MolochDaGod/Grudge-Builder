/**
 * NodePlacer — places resource nodes on 3D terrain.
 *
 * Ruleset SSOT: shared/definitions/homeIslandNodeRules.ts
 *   - Land nodes on dry terrain only
 *   - Fish only in water / shallow shore
 *   - Dock on beach shore band
 */
import * as THREE from 'three';
import { getTerrainHeightAt, type BiomeType } from './IslandTerrainGenerator';
import {
  isValidNodePlacement,
  type HomeIslandNodeType,
} from '@shared/definitions/homeIslandNodeRules';

export type NodePlacementType =
  | 'tree'
  | 'rock'
  | 'bush'
  | 'herb'
  | 'fish'
  | 'crystal'
  | 'hemp'
  | 'flower'
  | 'scrap'
  | 'dock';

export interface PlacedNode3D {
  id: string;
  type: NodePlacementType;
  biome: BiomeType;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  scale: number;
}

export interface PlaceResourceNodesOptions {
  /** Water surface Y (default -2) — land nodes must clear this */
  waterLevel?: number;
  excludeTypes?: NodePlacementType[];
}

// ── Seeded PRNG ───────────────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

function makePrng(seed: string): () => number {
  let s = hashStr(seed) >>> 0;
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tooClose(nodes: PlacedNode3D[], x: number, z: number, minDist: number): boolean {
  return nodes.some((n) => {
    const dx = n.position.x - x;
    const dz = n.position.z - z;
    return Math.sqrt(dx * dx + dz * dz) < minDist;
  });
}

interface NodeRule {
  type: NodePlacementType;
  biomes: BiomeType[];
  count: number;
  minSpacing: number;
  scaleMin: number;
  scaleMax: number;
}

/**
 * Placement counts by biome pool.
 * Fish only from water/beach; land types never pool water.
 */
const NODE_RULES: NodeRule[] = [
  { type: 'tree', biomes: ['forest', 'grass'], count: 38, minSpacing: 18, scaleMin: 0.8, scaleMax: 1.5 },
  { type: 'rock', biomes: ['rock', 'grass'], count: 18, minSpacing: 22, scaleMin: 0.6, scaleMax: 1.2 },
  { type: 'crystal', biomes: ['rock'], count: 8, minSpacing: 30, scaleMin: 0.5, scaleMax: 1.0 },
  { type: 'bush', biomes: ['grass', 'forest'], count: 22, minSpacing: 14, scaleMin: 0.5, scaleMax: 0.9 },
  { type: 'hemp', biomes: ['grass'], count: 14, minSpacing: 20, scaleMin: 0.6, scaleMax: 1.0 },
  { type: 'flower', biomes: ['grass', 'forest'], count: 16, minSpacing: 16, scaleMin: 0.4, scaleMax: 0.7 },
  { type: 'herb', biomes: ['forest'], count: 12, minSpacing: 16, scaleMin: 0.4, scaleMax: 0.7 },
  { type: 'scrap', biomes: ['grass', 'beach'], count: 6, minSpacing: 24, scaleMin: 0.7, scaleMax: 1.1 },
  // Fishing only — water + shallow beach edge
  { type: 'fish', biomes: ['water', 'beach'], count: 8, minSpacing: 28, scaleMin: 1.0, scaleMax: 1.0 },
  // Dock on shore
  { type: 'dock', biomes: ['beach'], count: 2, minSpacing: 80, scaleMin: 1.0, scaleMax: 1.0 },
];

/**
 * Place resource nodes on the 3D terrain (ruleset-enforced).
 */
export function placeResourceNodes(
  biomeMap: BiomeType[][],
  terrainMesh: THREE.Mesh,
  gridW: number,
  gridH: number,
  xSize: number,
  ySize: number,
  seed: string,
  excludeTypesOrOpts: NodePlacementType[] | PlaceResourceNodesOptions = [],
): PlacedNode3D[] {
  const opts: PlaceResourceNodesOptions = Array.isArray(excludeTypesOrOpts)
    ? { excludeTypes: excludeTypesOrOpts }
    : excludeTypesOrOpts;
  const excludeTypes = opts.excludeTypes ?? [];
  const waterLevel = opts.waterLevel ?? -2;

  const rng = makePrng(seed + '_nodes');
  const nodes: PlacedNode3D[] = [];
  let uid = 0;

  const candidates: Map<BiomeType, Array<[number, number]>> = new Map();
  for (const biome of ['water', 'beach', 'grass', 'forest', 'rock'] as BiomeType[]) {
    candidates.set(biome, []);
  }

  for (let gy = 4; gy < gridH - 4; gy += 4) {
    for (let gx = 4; gx < gridW - 4; gx += 4) {
      const biome = biomeMap[gy]?.[gx];
      if (biome) candidates.get(biome)?.push([gx, gy]);
    }
  }

  for (const rule of NODE_RULES) {
    if (excludeTypes.includes(rule.type)) continue;
    let placed = 0;
    const pool: Array<[number, number]> = [];
    for (const biome of rule.biomes) {
      pool.push(...(candidates.get(biome) || []));
    }

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    for (const [gx, gy] of pool) {
      if (placed >= rule.count) break;

      const worldX = (gx / (gridW - 1) - 0.5) * xSize;
      const worldZ = (gy / (gridH - 1) - 0.5) * ySize;

      if (tooClose(nodes, worldX, worldZ, rule.minSpacing)) continue;

      const height = getTerrainHeightAt(terrainMesh, worldX, worldZ);
      if (height === null) continue;

      const biome = biomeMap[gy]?.[gx] || 'grass';
      if (
        !isValidNodePlacement({
          type: rule.type as HomeIslandNodeType,
          worldY: height,
          waterLevel,
          biome,
        })
      ) {
        continue;
      }

      const scale = rule.scaleMin + rng() * (rule.scaleMax - rule.scaleMin);

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

    if (placed < rule.count && rule.type !== 'fish' && rule.type !== 'dock') {
      // soft log — partial fill is OK on small islands
    }
  }

  return nodes;
}

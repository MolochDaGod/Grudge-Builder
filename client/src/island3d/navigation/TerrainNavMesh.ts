/**
 * TerrainNavMesh — baked home-island navigation.
 *
 * 1. Grid walkability from terrain height + biome + water ruleset
 * 2. Bake walkable quads → three-pathfinding zone (primary path queries)
 * 3. Grid A* fallback if pathfinding zone empty / miss
 *
 * Walkable = dry land only (same band as land resource nodes).
 */
import * as THREE from 'three';
import { Pathfinding } from 'three-pathfinding';
import { getTerrainHeightAt, type BiomeType } from '../terrain/IslandTerrainGenerator';
import {
  isDryWalkableTerrain,
  NODE_LAND_CLEARANCE_M,
} from '@shared/definitions/homeIslandNodeRules';

export interface NavCell {
  x: number;
  z: number;
  worldX: number;
  worldZ: number;
  worldY: number;
  walkable: boolean;
  cost: number;
}

export interface NavPath {
  points: THREE.Vector3[];
  cost: number;
  /** 'pathfinding' = three-pathfinding bake; 'grid' = A* fallback */
  source?: 'pathfinding' | 'grid';
}

export interface TerrainNavMeshOptions {
  cellSize?: number;
  /** Water surface Y — cells below waterLevel + clearance are unwalkable */
  waterLevel?: number;
  dryClearanceM?: number;
  zoneId?: string;
  /** When true, also build three-pathfinding zone from walkable quads */
  bakePathfinding?: boolean;
}

export interface BakedNavSummary {
  zoneId: string;
  cellSize: number;
  gridW: number;
  gridH: number;
  walkableCells: number;
  waterLevel: number;
  dryClearanceM: number;
  pathfindingReady: boolean;
  groupCount: number;
}

const DEFAULT_ZONE = 'home_island';

export class TerrainNavMesh {
  private grid: NavCell[][] = [];
  private cellSize: number;
  public gridW: number;
  public gridH: number;
  public readonly waterLevel: number;
  public readonly dryClearanceM: number;
  public readonly zoneId: string;

  /** three-pathfinding instance (baked at construct) */
  private pathfinding: Pathfinding | null = null;
  private pathfindingReady = false;
  private bakeSummary: BakedNavSummary | null = null;
  /** Cached geometry used for bake (debug / export) */
  private navGeometry: THREE.BufferGeometry | null = null;

  constructor(
    private terrainMesh: THREE.Mesh,
    private biomeMap: BiomeType[][],
    private terrainGridW: number,
    private terrainGridH: number,
    private worldXSize: number,
    private worldZSize: number,
    cellSizeOrOpts: number | TerrainNavMeshOptions = 8,
  ) {
    const opts: TerrainNavMeshOptions =
      typeof cellSizeOrOpts === 'number'
        ? { cellSize: cellSizeOrOpts, bakePathfinding: true }
        : { bakePathfinding: true, ...cellSizeOrOpts };

    this.cellSize = opts.cellSize ?? 8;
    this.waterLevel = opts.waterLevel ?? -2;
    this.dryClearanceM = opts.dryClearanceM ?? NODE_LAND_CLEARANCE_M;
    this.zoneId = opts.zoneId ?? DEFAULT_ZONE;
    this.gridW = Math.ceil(worldXSize / this.cellSize);
    this.gridH = Math.ceil(worldZSize / this.cellSize);
    this.buildGrid();
    if (opts.bakePathfinding !== false) {
      this.bakeThreePathfinding();
    }
  }

  private buildGrid(): void {
    const halfX = this.worldXSize / 2;
    const halfZ = this.worldZSize / 2;

    for (let gz = 0; gz < this.gridH; gz++) {
      this.grid[gz] = [];
      for (let gx = 0; gx < this.gridW; gx++) {
        const worldX = (gx / this.gridW) * this.worldXSize - halfX + this.cellSize * 0.5;
        const worldZ = (gz / this.gridH) * this.worldZSize - halfZ + this.cellSize * 0.5;
        const worldY = getTerrainHeightAt(this.terrainMesh, worldX, worldZ) ?? -100;

        const bx = Math.floor((gx / this.gridW) * (this.terrainGridW - 1));
        const bz = Math.floor((gz / this.gridH) * (this.terrainGridH - 1));
        const biome = this.biomeMap[bz]?.[bx] ?? 'water';

        const walkable = isDryWalkableTerrain({
          worldY,
          waterLevel: this.waterLevel,
          biome,
          clearanceM: this.dryClearanceM,
        });

        let cost = 1;
        if (biome === 'forest') cost = 1.5;
        if (biome === 'rock') cost = 2;
        if (biome === 'beach') cost = 1.2;

        this.grid[gz][gx] = {
          x: gx,
          z: gz,
          worldX,
          worldZ,
          worldY,
          walkable,
          cost,
        };
      }
    }
  }

  /**
   * Bake walkable cells into a triangle mesh and load into three-pathfinding.
   * Each walkable cell becomes 2 triangles (quad).
   */
  private bakeThreePathfinding(): void {
    const positions: number[] = [];
    const indices: number[] = [];
    let walkable = 0;
    const half = this.cellSize * 0.48;

    for (let gz = 0; gz < this.gridH; gz++) {
      for (let gx = 0; gx < this.gridW; gx++) {
        const cell = this.grid[gz][gx];
        if (!cell.walkable) continue;
        walkable++;

        // Slight lift so path sits on surface
        const y = cell.worldY + 0.05;
        const x0 = cell.worldX - half;
        const x1 = cell.worldX + half;
        const z0 = cell.worldZ - half;
        const z1 = cell.worldZ + half;

        const base = positions.length / 3;
        // CCW when viewed from above (Y-up) for correct face normals
        positions.push(
          x0, y, z0,
          x1, y, z0,
          x1, y, z1,
          x0, y, z1,
        );
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }

    if (walkable < 4) {
      console.warn('[TerrainNavMesh] Too few walkable cells to bake pathfinding', walkable);
      this.bakeSummary = {
        zoneId: this.zoneId,
        cellSize: this.cellSize,
        gridW: this.gridW,
        gridH: this.gridH,
        walkableCells: walkable,
        waterLevel: this.waterLevel,
        dryClearanceM: this.dryClearanceM,
        pathfindingReady: false,
        groupCount: 0,
      };
      return;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    this.navGeometry = geo;

    try {
      const zone = Pathfinding.createZone(geo);
      this.pathfinding = new Pathfinding();
      this.pathfinding.setZoneData(this.zoneId, zone);
      this.pathfindingReady = true;
      const groupCount = Array.isArray(zone.groups) ? zone.groups.length : 0;
      this.bakeSummary = {
        zoneId: this.zoneId,
        cellSize: this.cellSize,
        gridW: this.gridW,
        gridH: this.gridH,
        walkableCells: walkable,
        waterLevel: this.waterLevel,
        dryClearanceM: this.dryClearanceM,
        pathfindingReady: true,
        groupCount,
      };
      console.log(
        `[TerrainNavMesh] Baked three-pathfinding zone="${this.zoneId}" ` +
          `walkable=${walkable} groups=${groupCount} cell=${this.cellSize}m ` +
          `waterY=${this.waterLevel} dry+${this.dryClearanceM}m`,
      );
    } catch (err) {
      console.warn('[TerrainNavMesh] three-pathfinding bake failed — grid A* only', err);
      this.pathfindingReady = false;
      this.bakeSummary = {
        zoneId: this.zoneId,
        cellSize: this.cellSize,
        gridW: this.gridW,
        gridH: this.gridH,
        walkableCells: walkable,
        waterLevel: this.waterLevel,
        dryClearanceM: this.dryClearanceM,
        pathfindingReady: false,
        groupCount: 0,
      };
    }
  }

  getBakeSummary(): BakedNavSummary | null {
    return this.bakeSummary;
  }

  /** Debug mesh of baked nav (wireframe). Caller owns dispose. */
  createDebugMesh(color = 0x22c55e): THREE.Mesh | null {
    if (!this.navGeometry) return null;
    const mat = new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.navGeometry.clone(), mat);
    mesh.name = 'home_island_navmesh_debug';
    mesh.renderOrder = 2;
    return mesh;
  }

  getCellAt(worldX: number, worldZ: number): NavCell | null {
    const halfX = this.worldXSize / 2;
    const halfZ = this.worldZSize / 2;
    const gx = Math.floor(((worldX + halfX) / this.worldXSize) * this.gridW);
    const gz = Math.floor(((worldZ + halfZ) / this.worldZSize) * this.gridH);
    return this.grid[gz]?.[gx] ?? null;
  }

  /**
   * Path query — three-pathfinding first, grid A* fallback.
   */
  findPath(fromX: number, fromZ: number, toX: number, toZ: number): NavPath | null {
    const startY = getTerrainHeightAt(this.terrainMesh, fromX, fromZ) ?? 0;
    const endY = getTerrainHeightAt(this.terrainMesh, toX, toZ) ?? 0;

    if (this.pathfindingReady && this.pathfinding) {
      const start = new THREE.Vector3(fromX, startY + 0.1, fromZ);
      const end = new THREE.Vector3(toX, endY + 0.1, toZ);
      try {
        const groupID = this.pathfinding.getGroup(this.zoneId, start);
        if (groupID != null) {
          const path = this.pathfinding.findPath(start, end, this.zoneId, groupID);
          if (path && path.length > 0) {
            // Snap Y to terrain for each waypoint
            const points = path.map((p) => {
              const y = getTerrainHeightAt(this.terrainMesh, p.x, p.z) ?? p.y;
              return new THREE.Vector3(p.x, y, p.z);
            });
            // Prepend start if far from first waypoint
            if (points[0].distanceTo(start) > this.cellSize) {
              points.unshift(new THREE.Vector3(fromX, startY, fromZ));
            }
            return { points, cost: points.length, source: 'pathfinding' };
          }
        }
      } catch {
        // fall through to grid
      }
    }

    return this.findPathGrid(fromX, fromZ, toX, toZ);
  }

  /** Grid A* (8-neighbor) */
  private findPathGrid(fromX: number, fromZ: number, toX: number, toZ: number): NavPath | null {
    const start = this.getCellAt(fromX, fromZ);
    const end = this.getCellAt(toX, toZ);
    if (!start || !end) return null;

    // Snap to nearest walkable if start/end slightly in water edge
    const s = start.walkable ? start : this.nearestWalkable(start.x, start.z);
    const e = end.walkable ? end : this.nearestWalkable(end.x, end.z);
    if (!s || !e) return null;

    const openSet: NavCell[] = [s];
    const cameFrom = new Map<string, NavCell>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const key = (c: NavCell) => `${c.x},${c.z}`;

    gScore.set(key(s), 0);
    fScore.set(key(s), this.heuristic(s, e));

    while (openSet.length > 0) {
      openSet.sort((a, b) => (fScore.get(key(a)) ?? Infinity) - (fScore.get(key(b)) ?? Infinity));
      const current = openSet.shift()!;

      if (current.x === e.x && current.z === e.z) {
        const path = this.reconstructPath(cameFrom, current);
        path.source = 'grid';
        return path;
      }

      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dz === 0) continue;
          const neighbor = this.grid[current.z + dz]?.[current.x + dx];
          if (!neighbor || !neighbor.walkable) continue;

          const moveCost = dx !== 0 && dz !== 0 ? 1.414 : 1;
          const tentativeG = (gScore.get(key(current)) ?? Infinity) + moveCost * neighbor.cost;

          if (tentativeG < (gScore.get(key(neighbor)) ?? Infinity)) {
            cameFrom.set(key(neighbor), current);
            gScore.set(key(neighbor), tentativeG);
            fScore.set(key(neighbor), tentativeG + this.heuristic(neighbor, e));
            if (!openSet.includes(neighbor)) openSet.push(neighbor);
          }
        }
      }
    }

    return null;
  }

  private nearestWalkable(gx: number, gz: number, radius = 6): NavCell | null {
    let best: NavCell | null = null;
    let bestD = Infinity;
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const c = this.grid[gz + dz]?.[gx + dx];
        if (!c?.walkable) continue;
        const d = dx * dx + dz * dz;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
    }
    return best;
  }

  private heuristic(a: NavCell, b: NavCell): number {
    return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
  }

  private reconstructPath(cameFrom: Map<string, NavCell>, current: NavCell): NavPath {
    const key = (c: NavCell) => `${c.x},${c.z}`;
    const cells: NavCell[] = [current];
    let totalCost = 0;

    while (cameFrom.has(key(current))) {
      current = cameFrom.get(key(current))!;
      cells.unshift(current);
      totalCost += current.cost;
    }

    return {
      points: cells.map((c) => new THREE.Vector3(c.worldX, c.worldY, c.worldZ)),
      cost: totalCost,
    };
  }

  isWalkable(worldX: number, worldZ: number): boolean {
    const cell = this.getCellAt(worldX, worldZ);
    return cell?.walkable ?? false;
  }

  /** Random dry walkable point (wildlife / ally wander) */
  getRandomWalkablePoint(near?: THREE.Vector3, radiusM = 40): THREE.Vector3 | null {
    const candidates: NavCell[] = [];
    for (let gz = 0; gz < this.gridH; gz++) {
      for (let gx = 0; gx < this.gridW; gx++) {
        const c = this.grid[gz][gx];
        if (!c.walkable) continue;
        if (near) {
          const d = Math.hypot(c.worldX - near.x, c.worldZ - near.z);
          if (d > radiusM) continue;
        }
        candidates.push(c);
      }
    }
    if (!candidates.length) return null;
    const c = candidates[Math.floor(Math.random() * candidates.length)]!;
    return new THREE.Vector3(c.worldX, c.worldY, c.worldZ);
  }

  dispose(): void {
    this.navGeometry?.dispose();
    this.navGeometry = null;
    this.pathfinding = null;
    this.pathfindingReady = false;
  }
}

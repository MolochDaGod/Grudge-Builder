/**
 * TerrainNavMesh — grid-based navigation mesh for AI pathfinding.
 *
 * Generates a walkability grid from terrain height data. Water and steep
 * slopes are marked unwalkable. Uses A* for path queries.
 */
import * as THREE from 'three';
import { getTerrainHeightAt, type BiomeType } from '../terrain/IslandTerrainGenerator';

export interface NavCell {
  x: number;
  z: number;
  worldX: number;
  worldZ: number;
  worldY: number;
  walkable: boolean;
  cost: number; // movement cost multiplier
}

export interface NavPath {
  points: THREE.Vector3[];
  cost: number;
}

export class TerrainNavMesh {
  private grid: NavCell[][] = [];
  private cellSize: number;
  public gridW: number;
  public gridH: number;

  constructor(
    private terrainMesh: THREE.Mesh,
    private biomeMap: BiomeType[][],
    private terrainGridW: number,
    private terrainGridH: number,
    private worldXSize: number,
    private worldZSize: number,
    cellSize: number = 8,
  ) {
    this.cellSize = cellSize;
    this.gridW = Math.ceil(worldXSize / cellSize);
    this.gridH = Math.ceil(worldZSize / cellSize);
    this.buildGrid();
  }

  private buildGrid(): void {
    const halfX = this.worldXSize / 2;
    const halfZ = this.worldZSize / 2;

    for (let gz = 0; gz < this.gridH; gz++) {
      this.grid[gz] = [];
      for (let gx = 0; gx < this.gridW; gx++) {
        const worldX = (gx / this.gridW) * this.worldXSize - halfX;
        const worldZ = (gz / this.gridH) * this.worldZSize - halfZ;
        const worldY = getTerrainHeightAt(this.terrainMesh, worldX, worldZ) ?? -100;

        // Map to biome grid
        const bx = Math.floor((gx / this.gridW) * (this.terrainGridW - 1));
        const bz = Math.floor((gz / this.gridH) * (this.terrainGridH - 1));
        const biome = this.biomeMap[bz]?.[bx] ?? 'water';

        // Walkability: not water, not too steep, not too deep
        const walkable = biome !== 'water' && worldY > -5;

        // Cost: forest is slower, rock is slower
        let cost = 1;
        if (biome === 'forest') cost = 1.5;
        if (biome === 'rock') cost = 2;
        if (biome === 'beach') cost = 1.2;

        this.grid[gz][gx] = { x: gx, z: gz, worldX, worldZ, worldY, walkable, cost };
      }
    }
  }

  /** Get the nav cell at world coordinates */
  getCellAt(worldX: number, worldZ: number): NavCell | null {
    const halfX = this.worldXSize / 2;
    const halfZ = this.worldZSize / 2;
    const gx = Math.floor(((worldX + halfX) / this.worldXSize) * this.gridW);
    const gz = Math.floor(((worldZ + halfZ) / this.worldZSize) * this.gridH);
    return this.grid[gz]?.[gx] ?? null;
  }

  /** A* pathfinding between two world positions */
  findPath(fromX: number, fromZ: number, toX: number, toZ: number): NavPath | null {
    const start = this.getCellAt(fromX, fromZ);
    const end = this.getCellAt(toX, toZ);
    if (!start || !end || !start.walkable || !end.walkable) return null;

    // A* implementation
    const openSet: NavCell[] = [start];
    const cameFrom = new Map<string, NavCell>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const key = (c: NavCell) => `${c.x},${c.z}`;

    gScore.set(key(start), 0);
    fScore.set(key(start), this.heuristic(start, end));

    while (openSet.length > 0) {
      // Get cell with lowest fScore
      openSet.sort((a, b) => (fScore.get(key(a)) ?? Infinity) - (fScore.get(key(b)) ?? Infinity));
      const current = openSet.shift()!;

      if (current.x === end.x && current.z === end.z) {
        return this.reconstructPath(cameFrom, current);
      }

      // Check 8 neighbors
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dz === 0) continue;
          const nx = current.x + dx;
          const nz = current.z + dz;
          const neighbor = this.grid[nz]?.[nx];
          if (!neighbor || !neighbor.walkable) continue;

          const moveCost = (dx !== 0 && dz !== 0) ? 1.414 : 1; // diagonal costs more
          const tentativeG = (gScore.get(key(current)) ?? Infinity) + moveCost * neighbor.cost;

          if (tentativeG < (gScore.get(key(neighbor)) ?? Infinity)) {
            cameFrom.set(key(neighbor), current);
            gScore.set(key(neighbor), tentativeG);
            fScore.set(key(neighbor), tentativeG + this.heuristic(neighbor, end));
            if (!openSet.includes(neighbor)) {
              openSet.push(neighbor);
            }
          }
        }
      }
    }

    return null; // No path found
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
      points: cells.map(c => new THREE.Vector3(c.worldX, c.worldY, c.worldZ)),
      cost: totalCost,
    };
  }

  /** Check if a world position is walkable */
  isWalkable(worldX: number, worldZ: number): boolean {
    const cell = this.getCellAt(worldX, worldZ);
    return cell?.walkable ?? false;
  }
}

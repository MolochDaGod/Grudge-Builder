/**
 * MeshSceneNavMesh — bake three-pathfinding + height sample grid from an authored GLB scene.
 * Used by Assassination Grounds and other single-mesh map packs.
 */
import * as THREE from 'three';
import { Pathfinding } from 'three-pathfinding';

export interface MeshNavPath {
  points: THREE.Vector3[];
  source: 'pathfinding' | 'grid';
}

export interface MeshSceneNavMeshOptions {
  zoneId?: string;
  cellSizeM?: number;
  /** Minimum upward normal.y for a triangle to count as walkable floor */
  floorNormalYMin?: number;
  maxSampleHeight?: number;
  /** Keep only hits in this world-Y band (multi-deck hulls like Object_163_1). */
  yMin?: number;
  yMax?: number;
}

export interface MeshNavBakeSummary {
  zoneId: string;
  cellSize: number;
  gridW: number;
  gridH: number;
  walkableCells: number;
  pathfindingReady: boolean;
  bounds: { min: THREE.Vector3; max: THREE.Vector3 };
}

export class MeshSceneNavMesh {
  readonly zoneId: string;
  readonly cellSize: number;
  private pathfinding: Pathfinding | null = null;
  private pathfindingReady = false;
  private grid: Array<Array<{ walkable: boolean; y: number; x: number; z: number } | null>> = [];
  private gridW = 0;
  private gridH = 0;
  private originX = 0;
  private originZ = 0;
  private bounds = new THREE.Box3();
  private bakeSummary: MeshNavBakeSummary | null = null;
  private raycaster = new THREE.Raycaster();
  private down = new THREE.Vector3(0, -1, 0);
  private floorMeshes: THREE.Mesh[] = [];
  private yMin: number | null = null;
  private yMax: number | null = null;

  constructor(
    sceneRoot: THREE.Object3D,
    opts: MeshSceneNavMeshOptions = {},
  ) {
    this.zoneId = opts.zoneId ?? 'mesh_scene';
    this.cellSize = opts.cellSizeM ?? 1.25;
    this.yMin = opts.yMin ?? null;
    this.yMax = opts.yMax ?? null;
    const floorNormalYMin = opts.floorNormalYMin ?? 0.55;
    const maxSampleHeight = opts.maxSampleHeight ?? 80;

    this.collectFloorMeshes(sceneRoot, floorNormalYMin);
    sceneRoot.updateMatrixWorld(true);
    this.bounds.setFromObject(sceneRoot);
    if (this.bounds.isEmpty()) {
      this.bounds.set(new THREE.Vector3(-20, 0, -20), new THREE.Vector3(20, 4, 20));
    }

    const min = this.bounds.min;
    const max = this.bounds.max;
    this.originX = min.x;
    this.originZ = min.z;
    const sizeX = Math.max(4, max.x - min.x);
    const sizeZ = Math.max(4, max.z - min.z);
    this.gridW = Math.ceil(sizeX / this.cellSize);
    this.gridH = Math.ceil(sizeZ / this.cellSize);

    this.buildHeightGrid(maxSampleHeight);
    this.bakeThreePathfinding();
  }

  private collectFloorMeshes(root: THREE.Object3D, floorNormalYMin: number): void {
    const tmpN = new THREE.Vector3();
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const name = (mesh.name || mesh.parent?.name || '').toLowerCase();
      // Skip known non-floor props
      if (/head|torso|arm|katana|plant|wedge|helper/i.test(name)) return;

      const geo = mesh.geometry;
      if (!geo.attributes.position) return;
      if (!geo.attributes.normal) geo.computeVertexNormals();
      const normals = geo.attributes.normal;
      if (!normals) return;

      let upVotes = 0;
      let samples = 0;
      for (let i = 0; i < normals.count; i += Math.max(1, Math.floor(normals.count / 64))) {
        tmpN.fromBufferAttribute(normals, i);
        // local normal is enough for mostly Y-up authored scenes
        if (tmpN.y >= floorNormalYMin) upVotes++;
        samples++;
      }
      if (samples > 0 && upVotes / samples >= 0.2) {
        this.floorMeshes.push(mesh);
      }
    });

    // Fallback: all meshes if classification failed
    if (this.floorMeshes.length === 0) {
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && mesh.geometry) this.floorMeshes.push(mesh);
      });
    }
  }

  private sampleHeight(x: number, z: number, maxSampleHeight: number): number | null {
    const top = this.bounds.max.y + 4;
    this.raycaster.set(new THREE.Vector3(x, top, z), this.down);
    this.raycaster.far = maxSampleHeight + (this.bounds.max.y - this.bounds.min.y) + 20;
    const hits = this.raycaster.intersectObjects(this.floorMeshes, false);
    if (!hits.length) return null;
    if (this.yMin != null || this.yMax != null) {
      const lo = this.yMin ?? -Infinity;
      const hi = this.yMax ?? Infinity;
      const inBand = hits.find((h) => h.point.y >= lo && h.point.y <= hi);
      if (inBand) return inBand.point.y;
      return null;
    }
    return hits[0].point.y;
  }

  private buildHeightGrid(maxSampleHeight: number): void {
    let walkable = 0;
    for (let gz = 0; gz < this.gridH; gz++) {
      this.grid[gz] = [];
      for (let gx = 0; gx < this.gridW; gx++) {
        const x = this.originX + (gx + 0.5) * this.cellSize;
        const z = this.originZ + (gz + 0.5) * this.cellSize;
        const y = this.sampleHeight(x, z, maxSampleHeight);
        if (y == null) {
          this.grid[gz][gx] = null;
          continue;
        }
        this.grid[gz][gx] = { walkable: true, y, x, z };
        walkable++;
      }
    }
    console.info(
      `[MeshSceneNavMesh] height grid ${this.gridW}×${this.gridH} walkable=${walkable} floors=${this.floorMeshes.length}`,
    );
  }

  private bakeThreePathfinding(): void {
    const positions: number[] = [];
    const indices: number[] = [];
    let walkable = 0;
    const half = this.cellSize * 0.48;

    for (let gz = 0; gz < this.gridH; gz++) {
      for (let gx = 0; gx < this.gridW; gx++) {
        const cell = this.grid[gz][gx];
        if (!cell?.walkable) continue;
        walkable++;
        const y = cell.y + 0.04;
        const x0 = cell.x - half;
        const x1 = cell.x + half;
        const z0 = cell.z - half;
        const z1 = cell.z + half;
        const base = positions.length / 3;
        positions.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }

    const min = this.bounds.min.clone();
    const max = this.bounds.max.clone();

    if (walkable < 4) {
      this.bakeSummary = {
        zoneId: this.zoneId,
        cellSize: this.cellSize,
        gridW: this.gridW,
        gridH: this.gridH,
        walkableCells: walkable,
        pathfindingReady: false,
        bounds: { min, max },
      };
      return;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    try {
      const zone = Pathfinding.createZone(geo);
      this.pathfinding = new Pathfinding();
      this.pathfinding.setZoneData(this.zoneId, zone);
      this.pathfindingReady = true;
      this.bakeSummary = {
        zoneId: this.zoneId,
        cellSize: this.cellSize,
        gridW: this.gridW,
        gridH: this.gridH,
        walkableCells: walkable,
        pathfindingReady: true,
        bounds: { min, max },
      };
      console.info(
        `[MeshSceneNavMesh] three-pathfinding ready zone=${this.zoneId} walkable=${walkable}`,
      );
    } catch (err) {
      console.warn('[MeshSceneNavMesh] pathfinding bake failed — grid only', err);
      this.pathfindingReady = false;
      this.bakeSummary = {
        zoneId: this.zoneId,
        cellSize: this.cellSize,
        gridW: this.gridW,
        gridH: this.gridH,
        walkableCells: walkable,
        pathfindingReady: false,
        bounds: { min, max },
      };
    }
  }

  getBakeSummary(): MeshNavBakeSummary | null {
    return this.bakeSummary;
  }

  getBounds(): THREE.Box3 {
    return this.bounds.clone();
  }

  /** Sample floor Y at XZ (null if off mesh). */
  getHeightAt(x: number, z: number): number | null {
    const gx = Math.floor((x - this.originX) / this.cellSize);
    const gz = Math.floor((z - this.originZ) / this.cellSize);
    if (gx < 0 || gz < 0 || gx >= this.gridW || gz >= this.gridH) return null;
    const cell = this.grid[gz][gx];
    return cell?.walkable ? cell.y : null;
  }

  /** Nearest walkable spawn near preferred world position. */
  findSpawnNear(preferred: THREE.Vector3): THREE.Vector3 {
    let best: THREE.Vector3 | null = null;
    let bestD = Infinity;
    for (let gz = 0; gz < this.gridH; gz++) {
      for (let gx = 0; gx < this.gridW; gx++) {
        const cell = this.grid[gz][gx];
        if (!cell?.walkable) continue;
        const d =
          (cell.x - preferred.x) * (cell.x - preferred.x) +
          (cell.z - preferred.z) * (cell.z - preferred.z);
        if (d < bestD) {
          bestD = d;
          best = new THREE.Vector3(cell.x, cell.y, cell.z);
        }
      }
    }
    return best ?? preferred.clone();
  }

  findPath(from: THREE.Vector3, to: THREE.Vector3): MeshNavPath | null {
    if (this.pathfindingReady && this.pathfinding) {
      try {
        const groupId = this.pathfinding.getGroup(this.zoneId, from);
        const path = this.pathfinding.findPath(from, to, this.zoneId, groupId);
        if (path?.length) {
          return { points: path.map((p) => new THREE.Vector3(p.x, p.y, p.z)), source: 'pathfinding' };
        }
      } catch {
        /* fall through to grid */
      }
    }
    return this.gridAStar(from, to);
  }

  private gridAStar(from: THREE.Vector3, to: THREE.Vector3): MeshNavPath | null {
    const startG = [
      Math.floor((from.x - this.originX) / this.cellSize),
      Math.floor((from.z - this.originZ) / this.cellSize),
    ] as const;
    const endG = [
      Math.floor((to.x - this.originX) / this.cellSize),
      Math.floor((to.z - this.originZ) / this.cellSize),
    ] as const;

    // Early return if start or goal are off-grid
    if (
      startG[0] < 0 || startG[0] >= this.gridW ||
      startG[1] < 0 || startG[1] >= this.gridH ||
      endG[0] < 0 || endG[0] >= this.gridW ||
      endG[1] < 0 || endG[1] >= this.gridH
    ) {
      return null;
    }

    const key = (gx: number, gz: number) => `${gx},${gz}`;
    const open: Array<{ gx: number; gz: number; g: number; f: number; parent: string | null }> = [];
    const came = new Map<string, string | null>();
    const gScore = new Map<string, number>();

    const sk = key(startG[0], startG[1]);
    open.push({ gx: startG[0], gz: startG[1], g: 0, f: 0, parent: null });
    gScore.set(sk, 0);
    came.set(sk, null);

    const neigh: [number, number][] = [
      [0, 1], [0, -1], [1, 0], [-1, 0],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ];

    let found: string | null = null;
    let iters = 0;
    while (open.length && iters++ < 8000) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift()!;
      const ck = key(cur.gx, cur.gz);
      if (cur.gx === endG[0] && cur.gz === endG[1]) {
        found = ck;
        break;
      }
      for (const [dx, dz] of neigh) {
        const nx = cur.gx + dx;
        const nz = cur.gz + dz;
        if (nx < 0 || nz < 0 || nx >= this.gridW || nz >= this.gridH) continue;
        const cell = this.grid[nz]?.[nx];
        if (!cell?.walkable) continue;
        const nk = key(nx, nz);
        const step = dx !== 0 && dz !== 0 ? Math.SQRT2 : 1;
        const tent = cur.g + step;
        if (tent >= (gScore.get(nk) ?? Infinity)) continue;
        gScore.set(nk, tent);
        came.set(nk, ck);
        const h = Math.hypot(nx - endG[0], nz - endG[1]);
        open.push({ gx: nx, gz: nz, g: tent, f: tent + h, parent: ck });
      }
    }

    if (!found) return null;
    const rev: THREE.Vector3[] = [];
    let c: string | null = found;
    while (c) {
      const [gx, gz] = c.split(',').map(Number);
      const cell = this.grid[gz]?.[gx];
      if (cell) rev.push(new THREE.Vector3(cell.x, cell.y, cell.z));
      c = came.get(c) ?? null;
    }
    rev.reverse();
    return { points: rev, source: 'grid' };
  }

  dispose(): void {
    this.pathfinding = null;
    this.floorMeshes = [];
    this.grid = [];
  }
}

/**
 * FarmPlotSystem — square garden beds with 4×4 plant slots.
 *
 * Hoe tills a square plot (soil tiles from crops_low_poly.glb).
 * Seeds plant into empty cells. Water starts growth.
 * Plants advance F1 → F2 → F3 pack meshes. Ready (F3) plants harvest via
 * RMB → player approaches → mesh removed → inventory grant.
 */
import * as THREE from 'three';
import {
  FARM_CELL_SIZE_M,
  FARM_PLOT_CELLS,
  FARM_PLOT_HALF_M,
  FARM_PLOT_SIZE_M,
  growProgressToStage,
  getSeedById,
  type CropStage,
  type FarmPlotState,
  type SeedDef,
} from '@shared/definitions/farming';
import { getTerrainHeightAt } from '../terrain/IslandTerrainGenerator';
import {
  cloneCropStage,
  cloneSoilTile,
  isCropPackReady,
  preloadCropPack,
} from './CropPackLoader';

export interface FarmPlantCell {
  /** Local index 0..15 (row-major: row * 4 + col) */
  index: number;
  col: number;
  row: number;
  /** Local XZ offset from plot center */
  localX: number;
  localZ: number;
  seedId: string | null;
  state: 'empty' | 'planted' | 'watered' | 'ready' | 'wilted';
  plantedAt: number;
  wateredAt: number;
  growProgress: number;
  stage: CropStage;
  mesh: THREE.Object3D | null;
}

export interface FarmPlot {
  id: string;
  position: THREE.Vector3;
  /** Aggregate state for UI / wilt checks */
  state: FarmPlotState;
  cells: FarmPlantCell[];
  group: THREE.Group;
  soilRoot: THREE.Group;
  /** Legacy single-seed field (first non-empty cell) */
  seedId: string | null;
  plantedAt: number;
  wateredAt: number;
  growProgress: number;
  /** @deprecated use cells[i].mesh */
  plantMesh: THREE.Mesh | null;
  soilMesh: THREE.Mesh;
}

export interface FarmHarvestEvent {
  plotId: string;
  cellIndex: number;
  itemId: string;
  qty: number;
  position: THREE.Vector3;
  seedId: string;
}

export class FarmPlotSystem {
  readonly group = new THREE.Group();
  private plots = new Map<string, FarmPlot>();
  private nextId = 1;
  private terrainMesh: THREE.Mesh | null = null;
  private onHarvest: ((ev: FarmHarvestEvent) => void) | null = null;
  private packReady = false;
  private wiltMs = 120_000;

  constructor() {
    this.group.name = 'FarmPlotSystem';
    void preloadCropPack().then((ok) => {
      this.packReady = ok;
      // Rebuild any plant meshes that used placeholders
      for (const plot of this.plots.values()) {
        for (const cell of plot.cells) {
          if (cell.seedId && cell.mesh) this.rebuildCellMesh(plot, cell);
        }
        this.rebuildSoilIfNeeded(plot);
      }
    });
  }

  setTerrain(mesh: THREE.Mesh | null): void {
    this.terrainMesh = mesh;
  }

  setHarvestHandler(fn: (ev: FarmHarvestEvent) => void): void {
    this.onHarvest = fn;
  }

  getPlots(): FarmPlot[] {
    return [...this.plots.values()];
  }

  /** Axis-aligned square hit on plot center (half extent). */
  findPlotAt(worldX: number, worldZ: number, half = FARM_PLOT_HALF_M): FarmPlot | null {
    let best: FarmPlot | null = null;
    let bestD = Infinity;
    for (const p of this.plots.values()) {
      const dx = Math.abs(p.position.x - worldX);
      const dz = Math.abs(p.position.z - worldZ);
      if (dx <= half && dz <= half) {
        const d = dx * dx + dz * dz;
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
    }
    return best;
  }

  /**
   * Find ready plant under world point (ray hit). Returns plot + cell.
   */
  findReadyPlantAt(
    worldX: number,
    worldZ: number,
    radius = FARM_CELL_SIZE_M * 0.55,
  ): { plot: FarmPlot; cell: FarmPlantCell; worldPos: THREE.Vector3 } | null {
    let best: { plot: FarmPlot; cell: FarmPlantCell; worldPos: THREE.Vector3; d: number } | null =
      null;
    const r2 = radius * radius;
    for (const plot of this.plots.values()) {
      for (const cell of plot.cells) {
        if (cell.state !== 'ready' || !cell.seedId) continue;
        const wx = plot.position.x + cell.localX;
        const wz = plot.position.z + cell.localZ;
        const dx = wx - worldX;
        const dz = wz - worldZ;
        const d = dx * dx + dz * dz;
        if (d <= r2 && (!best || d < best.d)) {
          best = {
            plot,
            cell,
            worldPos: new THREE.Vector3(wx, plot.position.y, wz),
            d,
          };
        }
      }
    }
    return best
      ? { plot: best.plot, cell: best.cell, worldPos: best.worldPos }
      : null;
  }

  /**
   * Raycast plant meshes for RMB (more precise than ground hit).
   */
  raycastReadyPlant(
    raycaster: THREE.Raycaster,
  ): { plot: FarmPlot; cell: FarmPlantCell; worldPos: THREE.Vector3 } | null {
    const meshes: THREE.Object3D[] = [];
    const meta = new Map<THREE.Object3D, { plot: FarmPlot; cell: FarmPlantCell }>();
    for (const plot of this.plots.values()) {
      for (const cell of plot.cells) {
        if (cell.state !== 'ready' || !cell.mesh) continue;
        cell.mesh.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            meshes.push(o);
            meta.set(o, { plot, cell });
          }
        });
        meta.set(cell.mesh, { plot, cell });
      }
    }
    if (meshes.length === 0) return null;
    const hits = raycaster.intersectObjects(meshes, true);
    if (hits.length === 0) return null;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj) {
      const m = meta.get(obj);
      if (m) {
        const wx = m.plot.position.x + m.cell.localX;
        const wz = m.plot.position.z + m.cell.localZ;
        return {
          plot: m.plot,
          cell: m.cell,
          worldPos: new THREE.Vector3(wx, m.plot.position.y, wz),
        };
      }
      obj = obj.parent;
    }
    return null;
  }

  /**
   * Hoe: place a square 4×4 garden bed (or re-till empty/wilted).
   */
  cultivateAt(worldHit: THREE.Vector3): FarmPlot | null {
    const existing = this.findPlotAt(worldHit.x, worldHit.z, FARM_PLOT_HALF_M * 0.95);
    if (existing) {
      // Don't wipe ready crops
      if (existing.cells.some((c) => c.state === 'ready')) return existing;
      // Re-till wilted / empty cells only — keep growing plants
      for (const cell of existing.cells) {
        if (cell.state === 'wilted' || cell.state === 'empty') {
          this.clearCell(existing, cell);
        }
      }
      this.syncPlotState(existing);
      return existing;
    }

    const y = this.sampleY(worldHit.x, worldHit.z, worldHit.y);
    // Snap center to grid so adjacent beds align
    const sx = Math.round(worldHit.x / FARM_CELL_SIZE_M) * FARM_CELL_SIZE_M;
    const sz = Math.round(worldHit.z / FARM_CELL_SIZE_M) * FARM_CELL_SIZE_M;
    const plot = this.createPlot(sx, y, sz);
    this.plots.set(plot.id, plot);
    this.group.add(plot.group);
    return plot;
  }

  /**
   * Plant one seed into the nearest empty cell of a tilled/planted plot.
   */
  plantSeedAt(worldHit: THREE.Vector3, seedId: string): boolean {
    const seed = getSeedById(seedId);
    if (!seed) return false;

    const plot = this.findPlotAt(worldHit.x, worldHit.z, FARM_PLOT_HALF_M);
    if (!plot) return false;

    const cell = this.nearestEmptyCell(plot, worldHit.x, worldHit.z);
    if (!cell) return false;

    cell.seedId = seed.id;
    cell.state = 'planted';
    cell.plantedAt = performance.now();
    cell.wateredAt = 0;
    cell.growProgress = 0;
    cell.stage = 0;
    this.rebuildCellMesh(plot, cell);
    this.syncPlotState(plot);
    this.tintSoil(plot, 0x5d4037);
    return true;
  }

  /**
   * Water all planted/wilted cells in the plot under cursor.
   */
  waterAt(worldHit: THREE.Vector3): boolean {
    const plot = this.findPlotAt(worldHit.x, worldHit.z, FARM_PLOT_HALF_M);
    if (!plot) return false;

    const now = performance.now();
    let any = false;
    for (const cell of plot.cells) {
      if (!cell.seedId) continue;
      if (cell.state === 'ready') continue;
      if (cell.state === 'planted' || cell.state === 'watered' || cell.state === 'wilted') {
        if (cell.state === 'wilted') {
          cell.growProgress = Math.max(0, cell.growProgress * 0.5);
        }
        cell.state = 'watered';
        cell.wateredAt = now;
        this.rebuildCellMesh(plot, cell);
        any = true;
      }
    }
    if (any || plot.state === 'tilled') {
      this.tintSoil(plot, 0x3e2723);
      any = true;
    }
    this.syncPlotState(plot);
    return any;
  }

  /**
   * Instant harvest at ground point (LMB / legacy). Harvests one ready cell.
   */
  harvestAt(worldHit: THREE.Vector3): FarmHarvestEvent | null {
    const hit = this.findReadyPlantAt(worldHit.x, worldHit.z);
    if (!hit) return null;
    return this.harvestCell(hit.plot, hit.cell);
  }

  /**
   * Harvest a specific ready cell (after player arrives from RMB approach).
   */
  harvestCell(plot: FarmPlot, cell: FarmPlantCell): FarmHarvestEvent | null {
    if (cell.state !== 'ready' || !cell.seedId) return null;
    const seed = getSeedById(cell.seedId);
    if (!seed) return null;

    const qty =
      seed.harvestQtyMin +
      Math.floor(Math.random() * (seed.harvestQtyMax - seed.harvestQtyMin + 1));
    const worldPos = new THREE.Vector3(
      plot.position.x + cell.localX,
      plot.position.y,
      plot.position.z + cell.localZ,
    );
    const ev: FarmHarvestEvent = {
      plotId: plot.id,
      cellIndex: cell.index,
      itemId: seed.harvestItemId,
      qty,
      position: worldPos,
      seedId: cell.seedId,
    };

    this.clearCell(plot, cell);
    // Leave tilled dirt ready for re-seed
    this.syncPlotState(plot);
    this.tintSoil(plot, 0x6d4c41);
    this.onHarvest?.(ev);
    return ev;
  }

  update(_dt: number): void {
    const now = performance.now();
    for (const plot of this.plots.values()) {
      for (const cell of plot.cells) {
        if (!cell.seedId) continue;
        const seed = getSeedById(cell.seedId);
        if (!seed) continue;

        if (cell.state === 'planted') {
          if (now - cell.plantedAt > this.wiltMs) {
            cell.state = 'wilted';
            this.rebuildCellMesh(plot, cell);
          }
          continue;
        }

        if (cell.state === 'watered') {
          const elapsed = now - cell.wateredAt;
          const target = Math.min(1, elapsed / seed.growMs);
          if (target > cell.growProgress) {
            const prevStage = cell.stage;
            cell.growProgress = target;
            cell.stage = growProgressToStage(cell.growProgress);
            if (cell.stage !== prevStage || !cell.mesh) {
              this.rebuildCellMesh(plot, cell);
            } else {
              // subtle scale pulse while growing same stage
              const h = this.stageHeight(seed, cell.stage, cell.growProgress);
              if (cell.mesh) {
                const s = 0.95 + cell.growProgress * 0.08;
                cell.mesh.scale.setScalar(s);
              }
              void h;
            }
          }
          if (cell.growProgress >= 1) {
            cell.state = 'ready';
            cell.stage = 2;
            this.rebuildCellMesh(plot, cell);
          }
        }
      }
      this.syncPlotState(plot);

      // Idle sway on living plants
      const t = now * 0.001;
      for (const cell of plot.cells) {
        if (cell.mesh && (cell.state === 'watered' || cell.state === 'ready')) {
          cell.mesh.rotation.z = Math.sin(t + cell.localX + plot.position.x) * 0.04;
        }
      }
    }
  }

  dispose(): void {
    for (const p of this.plots.values()) {
      this.disposePlotMeshes(p);
    }
    this.plots.clear();
    this.group.clear();
  }

  // ── internals ────────────────────────────────────────────────────────────

  private sampleY(x: number, z: number, fallback: number): number {
    if (!this.terrainMesh) return fallback;
    return getTerrainHeightAt(this.terrainMesh, x, z) ?? fallback;
  }

  private cellLocalOffset(col: number, row: number): { x: number; z: number } {
    // Center of each cell in a 4×4 grid centered on origin
    const origin = -FARM_PLOT_HALF_M + FARM_CELL_SIZE_M * 0.5;
    return {
      x: origin + col * FARM_CELL_SIZE_M,
      z: origin + row * FARM_CELL_SIZE_M,
    };
  }

  private createPlot(x: number, y: number, z: number): FarmPlot {
    const id = `farm_${this.nextId++}`;
    const g = new THREE.Group();
    g.name = id;
    g.position.set(x, y, z);

    const soilRoot = new THREE.Group();
    soilRoot.name = 'soil';
    g.add(soilRoot);

    // Fallback dirt plane under pack tiles
    const soilGeo = new THREE.PlaneGeometry(FARM_PLOT_SIZE_M * 0.98, FARM_PLOT_SIZE_M * 0.98);
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x6d4c41,
      roughness: 0.95,
      metalness: 0,
    });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.rotation.x = -Math.PI / 2;
    soil.position.y = 0.03;
    soil.receiveShadow = true;
    soilRoot.add(soil);

    // Furrow grid lines
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0x4e342e,
      roughness: 1,
      metalness: 0,
    });
    for (let i = 1; i < FARM_PLOT_CELLS; i++) {
      const t = -FARM_PLOT_HALF_M + i * FARM_CELL_SIZE_M;
      const h = new THREE.Mesh(new THREE.BoxGeometry(FARM_PLOT_SIZE_M * 0.96, 0.02, 0.04), lineMat);
      h.position.set(0, 0.04, t);
      soilRoot.add(h);
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, FARM_PLOT_SIZE_M * 0.96), lineMat);
      v.position.set(t, 0.04, 0);
      soilRoot.add(v);
    }

    // Pack soil tiles per cell when ready
    if (this.packReady || isCropPackReady()) {
      this.mountSoilTiles(soilRoot);
    }

    const cells: FarmPlantCell[] = [];
    for (let row = 0; row < FARM_PLOT_CELLS; row++) {
      for (let col = 0; col < FARM_PLOT_CELLS; col++) {
        const { x: lx, z: lz } = this.cellLocalOffset(col, row);
        cells.push({
          index: row * FARM_PLOT_CELLS + col,
          col,
          row,
          localX: lx,
          localZ: lz,
          seedId: null,
          state: 'empty',
          plantedAt: 0,
          wateredAt: 0,
          growProgress: 0,
          stage: 0,
          mesh: null,
        });
      }
    }

    return {
      id,
      position: new THREE.Vector3(x, y, z),
      state: 'tilled',
      cells,
      group: g,
      soilRoot,
      seedId: null,
      plantedAt: 0,
      wateredAt: 0,
      growProgress: 0,
      plantMesh: null,
      soilMesh: soil,
    };
  }

  private mountSoilTiles(soilRoot: THREE.Group): void {
    for (let row = 0; row < FARM_PLOT_CELLS; row++) {
      for (let col = 0; col < FARM_PLOT_CELLS; col++) {
        const { x: lx, z: lz } = this.cellLocalOffset(col, row);
        const tile = cloneSoilTile((row + col) % 4, FARM_CELL_SIZE_M * 0.92);
        if (!tile) continue;
        tile.position.set(lx, 0.035, lz);
        soilRoot.add(tile);
      }
    }
  }

  private rebuildSoilIfNeeded(plot: FarmPlot): void {
    // If only fallback plane, try pack tiles
    if (plot.soilRoot.children.length <= 1 + (FARM_PLOT_CELLS - 1) * 2) {
      this.mountSoilTiles(plot.soilRoot);
    }
  }

  private nearestEmptyCell(plot: FarmPlot, worldX: number, worldZ: number): FarmPlantCell | null {
    let best: FarmPlantCell | null = null;
    let bestD = Infinity;
    for (const cell of plot.cells) {
      if (cell.state !== 'empty') continue;
      const wx = plot.position.x + cell.localX;
      const wz = plot.position.z + cell.localZ;
      const d = (wx - worldX) ** 2 + (wz - worldZ) ** 2;
      if (d < bestD) {
        bestD = d;
        best = cell;
      }
    }
    return best;
  }

  private clearCell(plot: FarmPlot, cell: FarmPlantCell): void {
    if (cell.mesh) {
      plot.group.remove(cell.mesh);
      this.disposeObject(cell.mesh);
      cell.mesh = null;
    }
    cell.seedId = null;
    cell.state = 'empty';
    cell.plantedAt = 0;
    cell.wateredAt = 0;
    cell.growProgress = 0;
    cell.stage = 0;
  }

  private stageHeight(seed: SeedDef, stage: CropStage, progress: number): number {
    const base = seed.matureHeight;
    if (stage === 0) return Math.max(0.12, base * 0.28);
    if (stage === 1) return Math.max(0.2, base * (0.45 + progress * 0.2));
    return base;
  }

  private rebuildCellMesh(plot: FarmPlot, cell: FarmPlantCell): void {
    if (cell.mesh) {
      plot.group.remove(cell.mesh);
      this.disposeObject(cell.mesh);
      cell.mesh = null;
    }
    if (!cell.seedId) return;
    const seed = getSeedById(cell.seedId);
    if (!seed) return;

    const stage = cell.state === 'ready' ? 2 : growProgressToStage(cell.growProgress);
    cell.stage = stage;
    const height = this.stageHeight(seed, stage, cell.growProgress);

    let mesh: THREE.Object3D | null = null;
    if (this.packReady || isCropPackReady()) {
      mesh = cloneCropStage(seed.cropKind, stage, height);
    }
    if (!mesh) {
      // Placeholder cone until pack loads
      const geo = new THREE.ConeGeometry(0.14 + height * 0.1, height, 6);
      const color =
        cell.state === 'wilted'
          ? 0x795548
          : cell.state === 'ready'
            ? seed.cropColor
            : seed.cropColor;
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.85,
        metalness: 0,
        emissive: cell.state === 'ready' ? 0x224400 : 0x000000,
        emissiveIntensity: cell.state === 'ready' ? 0.22 : 0,
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.y = height * 0.5 + 0.05;
      m.castShadow = true;
      mesh = m;
    } else {
      mesh.position.y = 0.05;
      if (cell.state === 'ready') {
        mesh.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            const sm = mat as THREE.MeshStandardMaterial;
            if (sm.emissive) {
              sm.emissive.setHex(0x1a3a00);
              sm.emissiveIntensity = 0.2;
            }
          }
        });
      }
      if (cell.state === 'wilted') {
        mesh.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            const sm = mat as THREE.MeshStandardMaterial;
            if (sm.color) sm.color.multiplyScalar(0.55);
          }
        });
      }
    }

    mesh.position.x = cell.localX;
    mesh.position.z = cell.localZ;
    mesh.userData.farmCell = cell.index;
    mesh.userData.farmPlot = plot.id;
    mesh.userData.harvestable = cell.state === 'ready';
    plot.group.add(mesh);
    cell.mesh = mesh;
  }

  private syncPlotState(plot: FarmPlot): void {
    const cells = plot.cells;
    const anyReady = cells.some((c) => c.state === 'ready');
    const anyWatered = cells.some((c) => c.state === 'watered');
    const anyPlanted = cells.some((c) => c.state === 'planted');
    const anyWilted = cells.some((c) => c.state === 'wilted');
    const anyCrop = cells.some((c) => c.seedId);

    if (anyReady) plot.state = 'ready';
    else if (anyWatered) plot.state = 'watered';
    else if (anyWilted && !anyPlanted) plot.state = 'wilted';
    else if (anyPlanted) plot.state = 'planted';
    else plot.state = 'tilled';

    const first = cells.find((c) => c.seedId);
    plot.seedId = first?.seedId ?? null;
    plot.plantedAt = first?.plantedAt ?? 0;
    plot.wateredAt = first?.wateredAt ?? 0;
    plot.growProgress = first?.growProgress ?? 0;
    void anyCrop;
  }

  private tintSoil(plot: FarmPlot, hex: number): void {
    (plot.soilMesh.material as THREE.MeshStandardMaterial).color.setHex(hex);
  }

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else (mat as THREE.Material)?.dispose();
      }
    });
  }

  private disposePlotMeshes(plot: FarmPlot): void {
    this.disposeObject(plot.group);
  }
}

/**
 * FarmPlotSystem — Valheim-like hoe till → seed → water → grow → harvest.
 *
 * Each plot is a 2 m wide circle of turned earth. Seeds only plant on tilled
 * (or empty ready-after-harvest) dirt. Water bucket hydrates planted crops.
 */
import * as THREE from 'three';
import {
  GROUND_TOOL_RADIUS_M,
  getSeedById,
  type FarmPlotState,
  type SeedDef,
} from '@shared/definitions/farming';
import { getTerrainHeightAt } from '../terrain/IslandTerrainGenerator';

export interface FarmPlot {
  id: string;
  position: THREE.Vector3;
  state: FarmPlotState;
  seedId: string | null;
  plantedAt: number;
  wateredAt: number;
  growProgress: number; // 0–1 after watering
  group: THREE.Group;
  soilMesh: THREE.Mesh;
  plantMesh: THREE.Mesh | null;
}

export interface FarmHarvestEvent {
  plotId: string;
  itemId: string;
  qty: number;
  position: THREE.Vector3;
}

export class FarmPlotSystem {
  readonly group = new THREE.Group();
  private plots = new Map<string, FarmPlot>();
  private nextId = 1;
  private terrainMesh: THREE.Mesh | null = null;
  private onHarvest: ((ev: FarmHarvestEvent) => void) | null = null;

  /** Time without water after plant before wilt (ms) */
  private wiltMs = 120_000;

  constructor() {
    this.group.name = 'FarmPlotSystem';
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

  findPlotAt(worldX: number, worldZ: number, radius = GROUND_TOOL_RADIUS_M): FarmPlot | null {
    let best: FarmPlot | null = null;
    let bestD = radius * radius;
    for (const p of this.plots.values()) {
      const dx = p.position.x - worldX;
      const dz = p.position.z - worldZ;
      const d = dx * dx + dz * dz;
      if (d <= bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  /**
   * Hoe: turn earth into a growing area (2 m circle).
   * If overlapping an existing plot, re-till (clear wilted / empty).
   */
  cultivateAt(worldHit: THREE.Vector3): FarmPlot | null {
    const existing = this.findPlotAt(worldHit.x, worldHit.z, GROUND_TOOL_RADIUS_M * 0.85);
    if (existing) {
      if (existing.state === 'ready') {
        // Don't overwrite ready crop — harvest first
        return existing;
      }
      this.resetToTilled(existing);
      return existing;
    }

    const y = this.sampleY(worldHit.x, worldHit.z, worldHit.y);
    const plot = this.createPlot(worldHit.x, y, worldHit.z);
    this.plots.set(plot.id, plot);
    this.group.add(plot.group);
    return plot;
  }

  /**
   * Plant seed on tilled dirt under the 2 m circle. Returns false if no tilled plot.
   */
  plantSeedAt(worldHit: THREE.Vector3, seedId: string): boolean {
    const seed = getSeedById(seedId);
    if (!seed) return false;

    const plot = this.findPlotAt(worldHit.x, worldHit.z, GROUND_TOOL_RADIUS_M);
    if (!plot || plot.state !== 'tilled') return false;

    plot.seedId = seed.id;
    plot.state = 'planted';
    plot.plantedAt = performance.now();
    plot.wateredAt = 0;
    plot.growProgress = 0;
    this.rebuildPlantMesh(plot, seed, 0.12);
    this.tintSoil(plot, 0x5d4037);
    return true;
  }

  /**
   * Water planted / dry crops. Returns true if water was applied.
   */
  waterAt(worldHit: THREE.Vector3): boolean {
    const plot = this.findPlotAt(worldHit.x, worldHit.z, GROUND_TOOL_RADIUS_M);
    if (!plot) return false;
    if (plot.state !== 'planted' && plot.state !== 'watered' && plot.state !== 'wilted') {
      // Can re-wet tilled dirt (visual only)
      if (plot.state === 'tilled') {
        this.tintSoil(plot, 0x3e2723);
        return true;
      }
      return false;
    }
    if (!plot.seedId) return false;

    const seed = getSeedById(plot.seedId);
    if (!seed) return false;

    const now = performance.now();
    if (plot.state === 'wilted') {
      // Revive wilted → planted then water
      plot.state = 'planted';
      plot.growProgress = Math.max(0, plot.growProgress * 0.5);
    }
    plot.state = 'watered';
    plot.wateredAt = now;
    this.tintSoil(plot, 0x3e2723);
    this.rebuildPlantMesh(plot, seed, 0.15 + plot.growProgress * seed.matureHeight);
    return true;
  }

  /**
   * Harvest ready crop under cursor. Returns harvest event or null.
   */
  harvestAt(worldHit: THREE.Vector3): FarmHarvestEvent | null {
    const plot = this.findPlotAt(worldHit.x, worldHit.z, GROUND_TOOL_RADIUS_M);
    if (!plot || plot.state !== 'ready' || !plot.seedId) return null;

    const seed = getSeedById(plot.seedId);
    if (!seed) return null;

    const qty =
      seed.harvestQtyMin +
      Math.floor(Math.random() * (seed.harvestQtyMax - seed.harvestQtyMin + 1));
    const ev: FarmHarvestEvent = {
      plotId: plot.id,
      itemId: seed.harvestItemId,
      qty,
      position: plot.position.clone(),
    };

    this.resetToTilled(plot);
    this.onHarvest?.(ev);
    return ev;
  }

  update(dt: number): void {
    const now = performance.now();
    for (const plot of this.plots.values()) {
      if (!plot.seedId) continue;
      const seed = getSeedById(plot.seedId);
      if (!seed) continue;

      if (plot.state === 'planted') {
        // Wilt if never watered long enough
        if (now - plot.plantedAt > this.wiltMs) {
          plot.state = 'wilted';
          this.tintSoil(plot, 0x6d4c41);
          if (plot.plantMesh) {
            (plot.plantMesh.material as THREE.MeshStandardMaterial).color.setHex(0x795548);
          }
        }
        continue;
      }

      if (plot.state === 'watered') {
        const elapsed = now - plot.wateredAt;
        // Progress only while watered; growMs is total after first water
        const target = Math.min(1, elapsed / seed.growMs);
        if (target > plot.growProgress) {
          plot.growProgress = target;
          this.rebuildPlantMesh(
            plot,
            seed,
            0.15 + plot.growProgress * seed.matureHeight,
          );
        }
        if (plot.growProgress >= 1) {
          plot.state = 'ready';
          this.tintSoil(plot, 0x4e342e);
          this.rebuildPlantMesh(plot, seed, seed.matureHeight);
          if (plot.plantMesh) {
            (plot.plantMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x224400);
            (plot.plantMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.25;
          }
        }
      }
    }

    // subtle idle sway
    const t = now * 0.001;
    for (const plot of this.plots.values()) {
      if (plot.plantMesh && (plot.state === 'watered' || plot.state === 'ready')) {
        plot.plantMesh.rotation.z = Math.sin(t + plot.position.x) * 0.04;
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

  private createPlot(x: number, y: number, z: number): FarmPlot {
    const id = `farm_${this.nextId++}`;
    const g = new THREE.Group();
    g.name = id;
    g.position.set(x, y, z);

    const soilGeo = new THREE.CircleGeometry(GROUND_TOOL_RADIUS_M, 32);
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x6d4c41,
      roughness: 0.95,
      metalness: 0,
    });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.rotation.x = -Math.PI / 2;
    soil.position.y = 0.04;
    soil.receiveShadow = true;
    g.add(soil);

    // Furrow rings for "turned earth" look
    const furrow = new THREE.Mesh(
      new THREE.RingGeometry(GROUND_TOOL_RADIUS_M * 0.35, GROUND_TOOL_RADIUS_M * 0.55, 24),
      new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 1, metalness: 0 }),
    );
    furrow.rotation.x = -Math.PI / 2;
    furrow.position.y = 0.05;
    g.add(furrow);

    return {
      id,
      position: new THREE.Vector3(x, y, z),
      state: 'tilled',
      seedId: null,
      plantedAt: 0,
      wateredAt: 0,
      growProgress: 0,
      group: g,
      soilMesh: soil,
      plantMesh: null,
    };
  }

  private resetToTilled(plot: FarmPlot): void {
    if (plot.plantMesh) {
      plot.group.remove(plot.plantMesh);
      plot.plantMesh.geometry.dispose();
      (plot.plantMesh.material as THREE.Material).dispose();
      plot.plantMesh = null;
    }
    plot.seedId = null;
    plot.state = 'tilled';
    plot.plantedAt = 0;
    plot.wateredAt = 0;
    plot.growProgress = 0;
    this.tintSoil(plot, 0x6d4c41);
  }

  private rebuildPlantMesh(plot: FarmPlot, seed: SeedDef, height: number): void {
    if (plot.plantMesh) {
      plot.group.remove(plot.plantMesh);
      plot.plantMesh.geometry.dispose();
      (plot.plantMesh.material as THREE.Material).dispose();
      plot.plantMesh = null;
    }
    const h = Math.max(0.08, height);
    const geo = new THREE.ConeGeometry(0.18 + h * 0.12, h, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: seed.cropColor,
      roughness: 0.85,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = h * 0.5 + 0.06;
    mesh.castShadow = true;
    plot.group.add(mesh);
    plot.plantMesh = mesh;
  }

  private tintSoil(plot: FarmPlot, hex: number): void {
    (plot.soilMesh.material as THREE.MeshStandardMaterial).color.setHex(hex);
  }

  private disposePlotMeshes(plot: FarmPlot): void {
    plot.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else (mat as THREE.Material)?.dispose();
      }
    });
  }
}

/**
 * GroundToolBrush — square garden / ground-tool preview.
 * Hoe / seed / water use the 4×4 plot footprint; shovel keeps a soft circle.
 */
import * as THREE from 'three';
import {
  FARM_CELL_SIZE_M,
  FARM_PLOT_CELLS,
  FARM_PLOT_HALF_M,
  FARM_PLOT_SIZE_M,
  GROUND_TOOL_DIAMETER_M,
  GROUND_TOOL_RADIUS_M,
} from '@shared/definitions/farming';

export type GroundToolBrushKind = 'shovel' | 'hoe' | 'seed' | 'water' | 'neutral';

const BRUSH_COLORS: Record<GroundToolBrushKind, number> = {
  shovel: 0xc4a35a,
  hoe: 0x8b5a2b,
  seed: 0x6bcb77,
  water: 0x4fc3f7,
  neutral: 0xe0d8c8,
};

export class GroundToolBrush {
  readonly group = new THREE.Group();
  readonly diameterM = GROUND_TOOL_DIAMETER_M;
  readonly radiusM = GROUND_TOOL_RADIUS_M;
  readonly plotSizeM = FARM_PLOT_SIZE_M;

  private squareRing: THREE.LineSegments;
  private squareFill: THREE.Mesh;
  private circleRing: THREE.Mesh;
  private circleFill: THREE.Mesh;
  private cellGrid: THREE.LineSegments;
  private arrow: THREE.Group;
  private kind: GroundToolBrushKind = 'neutral';
  private visible = false;

  constructor() {
    this.group.name = 'GroundToolBrush';
    this.group.visible = false;

    // ── Square plot outline (hoe / seed / water) ───────────────────────────
    const half = FARM_PLOT_HALF_M;
    const sq = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-half, 0, -half),
      new THREE.Vector3(half, 0, -half),
      new THREE.Vector3(half, 0, half),
      new THREE.Vector3(-half, 0, half),
      new THREE.Vector3(-half, 0, -half),
    ]);
    this.squareRing = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(FARM_PLOT_SIZE_M, FARM_PLOT_SIZE_M)),
      new THREE.LineBasicMaterial({ color: BRUSH_COLORS.neutral, transparent: true, opacity: 0.95 }),
    );
    this.squareRing.rotation.x = -Math.PI / 2;
    this.squareRing.renderOrder = 10;
    void sq;

    const fillGeo = new THREE.PlaneGeometry(FARM_PLOT_SIZE_M * 0.98, FARM_PLOT_SIZE_M * 0.98);
    this.squareFill = new THREE.Mesh(
      fillGeo,
      new THREE.MeshBasicMaterial({
        color: BRUSH_COLORS.neutral,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.squareFill.rotation.x = -Math.PI / 2;
    this.squareFill.position.y = 0.02;
    this.squareFill.renderOrder = 9;

    // 4×4 cell grid
    const gridPts: THREE.Vector3[] = [];
    for (let i = 1; i < FARM_PLOT_CELLS; i++) {
      const t = -half + i * FARM_CELL_SIZE_M;
      gridPts.push(new THREE.Vector3(-half, 0.03, t), new THREE.Vector3(half, 0.03, t));
      gridPts.push(new THREE.Vector3(t, 0.03, -half), new THREE.Vector3(t, 0.03, half));
    }
    this.cellGrid = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(gridPts),
      new THREE.LineBasicMaterial({ color: 0xa08060, transparent: true, opacity: 0.55 }),
    );
    this.cellGrid.renderOrder = 11;

    // ── Circle (shovel only) ───────────────────────────────────────────────
    const r = GROUND_TOOL_RADIUS_M;
    this.circleRing = new THREE.Mesh(
      new THREE.RingGeometry(r * 0.92, r, 48),
      new THREE.MeshBasicMaterial({
        color: BRUSH_COLORS.shovel,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.circleRing.rotation.x = -Math.PI / 2;
    this.circleRing.renderOrder = 10;

    this.circleFill = new THREE.Mesh(
      new THREE.CircleGeometry(r * 0.9, 48),
      new THREE.MeshBasicMaterial({
        color: BRUSH_COLORS.shovel,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.circleFill.rotation.x = -Math.PI / 2;
    this.circleFill.position.y = 0.02;
    this.circleFill.renderOrder = 9;

    // Placement arrow for seeds
    this.arrow = new THREE.Group();
    this.arrow.name = 'seedPlacementArrow';
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6),
      new THREE.MeshBasicMaterial({ color: 0x6bcb77, transparent: true, opacity: 0.95 }),
    );
    shaft.position.y = 0.85;
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.22, 8),
      new THREE.MeshBasicMaterial({ color: 0xa8e6b0, transparent: true, opacity: 0.95 }),
    );
    head.position.y = 0.48;
    head.rotation.x = Math.PI;
    this.arrow.add(shaft);
    this.arrow.add(head);
    this.arrow.visible = false;

    this.group.add(this.squareFill);
    this.group.add(this.squareRing);
    this.group.add(this.cellGrid);
    this.group.add(this.circleFill);
    this.group.add(this.circleRing);
    this.group.add(this.arrow);
    this.setShape('square');
  }

  private setShape(shape: 'square' | 'circle'): void {
    const sq = shape === 'square';
    this.squareFill.visible = sq;
    this.squareRing.visible = sq;
    this.cellGrid.visible = sq;
    this.circleFill.visible = !sq;
    this.circleRing.visible = !sq;
  }

  setKind(kind: GroundToolBrushKind): void {
    this.kind = kind;
    const color = BRUSH_COLORS[kind];
    (this.squareRing.material as THREE.LineBasicMaterial).color.setHex(color);
    (this.squareFill.material as THREE.MeshBasicMaterial).color.setHex(color);
    (this.circleRing.material as THREE.MeshBasicMaterial).color.setHex(color);
    (this.circleFill.material as THREE.MeshBasicMaterial).color.setHex(color);
    (this.cellGrid.material as THREE.LineBasicMaterial).color.setHex(
      kind === 'seed' ? 0x8fd99a : 0xa08060,
    );

    this.setShape(kind === 'shovel' ? 'circle' : 'square');
    this.arrow.visible = kind === 'seed';
    if (kind === 'seed') {
      this.arrow.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(0x6bcb77);
        }
      });
    }
  }

  showAt(worldX: number, worldY: number, worldZ: number, kind?: GroundToolBrushKind): void {
    if (kind) this.setKind(kind);
    // Snap hoe/seed/water to cell grid so bed placement is predictable
    let x = worldX;
    let z = worldZ;
    if (this.kind !== 'shovel') {
      x = Math.round(worldX / FARM_CELL_SIZE_M) * FARM_CELL_SIZE_M;
      z = Math.round(worldZ / FARM_CELL_SIZE_M) * FARM_CELL_SIZE_M;
    }
    this.group.position.set(x, worldY + 0.05, z);
    this.group.visible = true;
    this.visible = true;
  }

  hide(): void {
    this.group.visible = false;
    this.visible = false;
  }

  get isVisible(): boolean {
    return this.visible;
  }

  dispose(): void {
    for (const o of [
      this.squareRing,
      this.squareFill,
      this.circleRing,
      this.circleFill,
      this.cellGrid,
    ]) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
    this.arrow.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material)?.dispose();
      }
    });
  }
}

export {
  GROUND_TOOL_DIAMETER_M,
  GROUND_TOOL_RADIUS_M,
  FARM_PLOT_SIZE_M,
  FARM_PLOT_CELLS,
};

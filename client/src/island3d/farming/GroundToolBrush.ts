/**
 * GroundToolBrush — 2 m wide ground-tool circle (Valheim-style).
 * Shared visual for shovel, hoe, seed, and water bucket.
 */
import * as THREE from 'three';
import {
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

  private ring: THREE.Mesh;
  private fill: THREE.Mesh;
  /** Seed placement arrow — points at tilled dirt center */
  private arrow: THREE.Group;
  private kind: GroundToolBrushKind = 'neutral';
  private visible = false;

  constructor() {
    this.group.name = 'GroundToolBrush';
    this.group.visible = false;

    const ringGeo = new THREE.RingGeometry(
      this.radiusM * 0.92,
      this.radiusM,
      48,
    );
    const ringMat = new THREE.MeshBasicMaterial({
      color: BRUSH_COLORS.neutral,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 10;

    const fillGeo = new THREE.CircleGeometry(this.radiusM * 0.9, 48);
    const fillMat = new THREE.MeshBasicMaterial({
      color: BRUSH_COLORS.neutral,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.fill = new THREE.Mesh(fillGeo, fillMat);
    this.fill.rotation.x = -Math.PI / 2;
    this.fill.position.y = 0.02;
    this.fill.renderOrder = 9;

    // Placement arrow for seeds (and subtle for other tools)
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
    head.rotation.x = Math.PI; // point down
    this.arrow.add(shaft);
    this.arrow.add(head);
    this.arrow.visible = false;

    this.group.add(this.fill);
    this.group.add(this.ring);
    this.group.add(this.arrow);
  }

  setKind(kind: GroundToolBrushKind): void {
    this.kind = kind;
    const color = BRUSH_COLORS[kind];
    (this.ring.material as THREE.MeshBasicMaterial).color.setHex(color);
    (this.fill.material as THREE.MeshBasicMaterial).color.setHex(color);
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
    this.group.position.set(worldX, worldY + 0.05, worldZ);
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
    this.ring.geometry.dispose();
    this.fill.geometry.dispose();
    (this.ring.material as THREE.Material).dispose();
    (this.fill.material as THREE.Material).dispose();
    this.arrow.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material)?.dispose();
      }
    });
  }
}

export { GROUND_TOOL_DIAMETER_M, GROUND_TOOL_RADIUS_M };

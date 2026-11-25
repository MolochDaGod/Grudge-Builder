/**
 * CinemaBoxSystems — THREE.Box3 as SSOT for SI measurement, framing, and helpers.
 *
 * Film / production cinema best practices:
 *  - Measure every actor with Box3 (height / LOA / deck) after load
 *  - Never trust authoring units without decade + residual fit
 *  - Optional Box3Helper / AxesHelper for QA (debug flag only)
 *  - Shadow camera orthographic bounds from scene union Box3
 *  - Safe framing: pad subject box for camera look-at center
 *
 * See grudge-world-scale + threejs-helpers-physics-terrain.
 */
import * as THREE from 'three';
import { CIN_HUMAN_M, CIN_SHIP_LOA_M, CIN_LEVIATHAN_LOA_M } from '@shared/definitions/leviathanCinemaStage';

export type BoxSiReport = {
  name: string;
  size: THREE.Vector3;
  center: THREE.Vector3;
  min: THREE.Vector3;
  max: THREE.Vector3;
  /** Max axis span (m) */
  span: number;
  /** Height Y (m) */
  height: number;
  /** × human (1.8 m) for span */
  xHuman: number;
  ok: boolean;
  note: string;
};

const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

/** World-axis-aligned bounds for any root. */
export function measureBox3(root: THREE.Object3D): {
  box: THREE.Box3;
  size: THREE.Vector3;
  center: THREE.Vector3;
} {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(_size.clone());
  const center = box.getCenter(_center.clone());
  return { box, size, center };
}

/** Skinned-body-only box when possible (ignore loose VFX children). */
export function measureSkinnedBox3(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  let any = false;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!(m instanceof THREE.SkinnedMesh) || !m.visible) return;
    if (!any) {
      box.setFromObject(m, true);
      any = true;
    } else {
      box.expandByObject(m);
    }
  });
  if (!any) box.setFromObject(root, true);
  return box;
}

export function reportSi(
  name: string,
  root: THREE.Object3D,
  expect: { height?: number; span?: number; tol?: number },
): BoxSiReport {
  const { box, size, center } = measureBox3(root);
  const span = Math.max(size.x, size.y, size.z);
  const height = size.y;
  const target = expect.height ?? expect.span ?? 1;
  const measured = expect.height != null ? height : span;
  const tol = expect.tol ?? 0.35;
  const ratio = measured / Math.max(target, 1e-6);
  const ok = ratio > 1 - tol && ratio < 1 + tol;
  const note = ok
    ? `SI ok ${measured.toFixed(2)}m ≈ ${target}m`
    : `SI WARN ${measured.toFixed(2)}m vs target ${target}m (×${ratio.toFixed(2)})`;
  const rep: BoxSiReport = {
    name,
    size: size.clone(),
    center: center.clone(),
    min: box.min.clone(),
    max: box.max.clone(),
    span,
    height,
    xHuman: span / CIN_HUMAN_M,
    ok,
    note,
  };
  if (ok) console.info(`[cinemaBox] ${name}: ${note}`);
  else console.warn(`[cinemaBox] ${name}: ${note}`, rep);
  return rep;
}

/**
 * Cinema Box3 roster: SI audit + optional helpers + shadow fit.
 */
export class CinemaBoxSystems {
  readonly helperGroup = new THREE.Group();
  private reports = new Map<string, BoxSiReport>();
  private debug: boolean;

  constructor(scene: THREE.Scene, debug = false) {
    this.debug = debug;
    this.helperGroup.name = 'cinema_box3_helpers';
    this.helperGroup.visible = debug;
    scene.add(this.helperGroup);
  }

  setDebug(on: boolean): void {
    this.debug = on;
    this.helperGroup.visible = on;
  }

  /** Register actor, measure SI, optional Box3Helper. */
  register(
    name: string,
    root: THREE.Object3D,
    expect: { height?: number; span?: number; tol?: number },
    color = 0x00ff88,
  ): BoxSiReport {
    const rep = reportSi(name, root, expect);
    this.reports.set(name, rep);
    if (this.debug) {
      // Remove prior helper for name
      const old = this.helperGroup.getObjectByName(`box3_${name}`);
      if (old) {
        this.helperGroup.remove(old);
        (old as THREE.Box3Helper).geometry?.dispose?.();
      }
      const { box } = measureBox3(root);
      const helper = new THREE.Box3Helper(box, color);
      helper.name = `box3_${name}`;
      this.helperGroup.add(helper);
      const axes = new THREE.AxesHelper(Math.max(0.5, rep.span * 0.08));
      axes.name = `axes_${name}`;
      axes.position.copy(rep.center);
      this.helperGroup.add(axes);
    }
    return rep;
  }

  /** Refresh helper boxes to live bounds (call sparingly). */
  refreshHelpers(actors: Record<string, THREE.Object3D | null | undefined>): void {
    if (!this.debug) return;
    for (const [name, root] of Object.entries(actors)) {
      if (!root) continue;
      const helper = this.helperGroup.getObjectByName(`box3_${name}`) as THREE.Box3Helper | undefined;
      if (helper) {
        const { box } = measureBox3(root);
        helper.box.copy(box);
      }
    }
  }

  getReport(name: string): BoxSiReport | undefined {
    return this.reports.get(name);
  }

  allReports(): BoxSiReport[] {
    return [...this.reports.values()];
  }

  /** Union Box3 of listed roots (shadow / fog domain). */
  unionBox(roots: THREE.Object3D[]): THREE.Box3 {
    const u = new THREE.Box3();
    let any = false;
    for (const r of roots) {
      if (!r || !r.visible) continue;
      r.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(r);
      if (!any) {
        u.copy(b);
        any = true;
      } else u.union(b);
    }
    if (!any) u.set(new THREE.Vector3(-20, -5, -20), new THREE.Vector3(20, 20, 20));
    return u;
  }

  /**
   * Fit directional light shadow camera to scene Box3 (cinema readability).
   */
  fitShadowCamera(light: THREE.DirectionalLight, roots: THREE.Object3D[], pad = 8): void {
    const box = this.unionBox(roots);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSpan = Math.max(size.x, size.y, size.z, 10) + pad;

    light.target.position.copy(center);
    light.target.updateMatrixWorld();
    // Keep light offset relative to center
    const dir = light.position.clone().sub(center).normalize();
    if (dir.lengthSq() < 1e-6) dir.set(0.4, 1, 0.3).normalize();
    light.position.copy(center).addScaledVector(dir, maxSpan * 1.2);

    const cam = light.shadow.camera as THREE.OrthographicCamera;
    const half = maxSpan * 0.55;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.near = 0.5;
    cam.far = maxSpan * 3;
    cam.updateProjectionMatrix();
    light.shadow.bias = -0.0002;
    light.shadow.normalBias = 0.02;
  }

  /**
   * Look-at point slightly above subject feet/center for film framing.
   */
  subjectLookPoint(root: THREE.Object3D, heightFrac = 0.55): THREE.Vector3 {
    const { box, center } = measureBox3(root);
    const h = box.max.y - box.min.y;
    return new THREE.Vector3(center.x, box.min.y + h * heightFrac, center.z);
  }

  /** Default cast expectations (SI). */
  static expectHuman() {
    return { height: CIN_HUMAN_M, tol: 0.25 };
  }
  static expectShip() {
    return { span: CIN_SHIP_LOA_M, tol: 0.4 };
  }
  static expectLevi() {
    return { span: CIN_LEVIATHAN_LOA_M, tol: 0.45 };
  }

  dispose(): void {
    this.helperGroup.traverse((o) => {
      const h = o as THREE.Box3Helper;
      if (h instanceof THREE.Box3Helper) {
        h.geometry?.dispose?.();
        (h.material as THREE.Material)?.dispose?.();
      }
      const ax = o as THREE.AxesHelper;
      if ((ax as THREE.LineSegments).isLineSegments && ax.geometry) {
        ax.geometry.dispose();
        (ax.material as THREE.Material)?.dispose?.();
      }
    });
    this.helperGroup.parent?.remove(this.helperGroup);
    this.reports.clear();
  }
}

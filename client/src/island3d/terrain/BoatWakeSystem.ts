/**
 * BoatWakeSystem — simple ribbon wake behind a sailing root.
 *
 * Lightweight (no particles): translucent triangle strip trailing hull,
 * fades with age, scales with speed. Attach to lobbyShip / open-water boats.
 */
import * as THREE from 'three';

export interface BoatWakeOptions {
  /** Max trail points */
  maxPoints?: number;
  /** Min speed (m/s) to emit */
  minSpeed?: number;
  /** Point spacing (m) */
  minDist?: number;
  /** Wake half-width at stern (m) */
  width?: number;
  /** Lifetime seconds */
  lifetime?: number;
  color?: number;
  opacity?: number;
}

interface WakePt {
  x: number;
  y: number;
  z: number;
  yaw: number;
  t: number;
}

export class BoatWakeSystem {
  readonly mesh: THREE.Mesh;
  private pts: WakePt[] = [];
  private maxPoints: number;
  private minSpeed: number;
  private minDist: number;
  private width: number;
  private lifetime: number;
  private lastPos = new THREE.Vector3();
  private hasLast = false;
  private tmp = new THREE.Vector3();
  private mat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene, opts: BoatWakeOptions = {}) {
    this.maxPoints = opts.maxPoints ?? 48;
    this.minSpeed = opts.minSpeed ?? 2.5;
    this.minDist = opts.minDist ?? 1.2;
    this.width = opts.width ?? 2.2;
    this.lifetime = opts.lifetime ?? 4.5;

    const geo = new THREE.BufferGeometry();
    const maxV = this.maxPoints * 2;
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxV * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(maxV * 2), 2));
    geo.setIndex(new THREE.BufferAttribute(new Uint16Array(Math.max(0, (this.maxPoints - 1) * 6)), 1));

    this.mat = new THREE.MeshBasicMaterial({
      color: opts.color ?? 0xd8f0ff,
      transparent: true,
      opacity: opts.opacity ?? 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.name = 'boat-wake';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }

  /**
   * @param root World position of hull (stern-ish)
   * @param yaw Y rotation of ship
   * @param waterY Surface height
   * @param speedMps Horizontal speed estimate
   */
  update(
    dt: number,
    root: THREE.Object3D,
    yaw: number,
    waterY: number,
    speedMps: number,
  ): void {
    const now = performance.now() * 0.001;
    root.getWorldPosition(this.tmp);
    const x = this.tmp.x;
    const z = this.tmp.z;
    const y = waterY + 0.05;

    // Age out
    this.pts = this.pts.filter((p) => now - p.t < this.lifetime);

    if (speedMps >= this.minSpeed) {
      if (!this.hasLast) {
        this.lastPos.set(x, y, z);
        this.hasLast = true;
      }
      const dist = this.lastPos.distanceTo(this.tmp.set(x, y, z));
      if (dist >= this.minDist || this.pts.length === 0) {
        this.pts.push({ x, y, z, yaw, t: now });
        if (this.pts.length > this.maxPoints) this.pts.shift();
        this.lastPos.set(x, y, z);
      }
    } else if (speedMps < 0.5) {
      this.hasLast = false;
    }

    this.rebuild(now);
  }

  private rebuild(now: number): void {
    const geo = this.mesh.geometry as THREE.BufferGeometry;
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    const idx = geo.getIndex()!;
    const n = this.pts.length;

    if (n < 2) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;

    let vi = 0;
    for (let i = 0; i < n; i++) {
      const p = this.pts[i]!;
      const age = (now - p.t) / this.lifetime;
      const w = this.width * (1 - age * 0.55) * (0.4 + 0.6 * (i / (n - 1)));
      const sideX = Math.cos(p.yaw) * w;
      const sideZ = -Math.sin(p.yaw) * w;
      // perpendicular to forward (sin/cos of yaw): right vector
      const rx = Math.cos(p.yaw);
      const rz = -Math.sin(p.yaw);
      // Actually yaw is heading; right = (cos(yaw), -sin) for Y-up... 
      // forward = (sin(yaw), cos(yaw)) if yaw from +Z... use atan2 style from LobbyShip
      // Lobby uses rotation.y = atan2(vx, vz) so forward is (sin(y), cos(y))
      const fx = Math.sin(p.yaw);
      const fz = Math.cos(p.yaw);
      const rightX = fz;
      const rightZ = -fx;

      pos.setXYZ(vi, p.x - rightX * w, p.y, p.z - rightZ * w);
      uv.setXY(vi, 0, age);
      vi++;
      pos.setXYZ(vi, p.x + rightX * w, p.y, p.z + rightZ * w);
      uv.setXY(vi, 1, age);
      vi++;
    }
    // zero rest
    for (let i = vi; i < pos.count; i++) pos.setXYZ(i, 0, -999, 0);

    let ii = 0;
    const indexArr = idx.array as Uint16Array;
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indexArr[ii++] = a;
      indexArr[ii++] = b;
      indexArr[ii++] = c;
      indexArr[ii++] = b;
      indexArr[ii++] = d;
      indexArr[ii++] = c;
    }
    for (; ii < indexArr.length; ii++) indexArr[ii] = 0;

    pos.needsUpdate = true;
    uv.needsUpdate = true;
    idx.needsUpdate = true;
    geo.computeBoundingSphere();

    // Fade material with average age
    const avgAge =
      this.pts.reduce((s, p) => s + (now - p.t) / this.lifetime, 0) / n;
    this.mat.opacity = 0.5 * (1 - avgAge * 0.7);
  }

  clear(): void {
    this.pts = [];
    this.hasLast = false;
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}

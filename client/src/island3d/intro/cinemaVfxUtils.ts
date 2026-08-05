/**
 * Shared helpers for Leviathan ocean cinema VFX materials + SI fit.
 * Also: storm rain points + lightning bolt flashes (lightweight, instanced-friendly).
 */
import * as THREE from 'three';

/** Procedural storm rain (Points) — quality-scaled count. */
export function createCinemaRain(count: number): THREE.Points {
  const n = Math.max(80, Math.min(count, 4000));
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 90;
    pos[i * 3 + 1] = Math.random() * 42;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 90;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xb8d4ff,
    size: 0.09,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = 'cinema_storm_rain';
  pts.frustumCulled = false;
  pts.renderOrder = 2;
  return pts;
}

/** Advance rain streaks; follows ship XZ origin. */
export function tickCinemaRain(
  rain: THREE.Points | null,
  dt: number,
  storm: number,
  origin: THREE.Vector3,
): void {
  if (!rain?.visible) return;
  const attr = rain.geometry.getAttribute('position') as THREE.BufferAttribute;
  if (!attr) return;
  const arr = attr.array as Float32Array;
  const speed = 16 + storm * 32;
  const half = 42;
  for (let i = 0; i < arr.length; i += 3) {
    arr[i + 1] -= speed * dt * (0.65 + ((i / 3) % 5) * 0.08);
    // Wind lean
    arr[i] += dt * (2.5 + storm * 4);
    if (arr[i + 1] < -1) {
      arr[i] = origin.x + (Math.random() - 0.5) * half * 2;
      arr[i + 1] = 12 + Math.random() * 28;
      arr[i + 2] = origin.z + (Math.random() - 0.5) * half * 2;
    }
  }
  attr.needsUpdate = true;
  const mat = rain.material as THREE.PointsMaterial;
  mat.opacity = THREE.MathUtils.clamp(0.18 + storm * 0.62, 0.12, 0.85);
  mat.size = 0.06 + storm * 0.06;
}

/** Short-lived lightning bolt (line) for skyLightning beats. */
export function spawnCinemaLightningBolt(
  scene: THREE.Scene,
  from: THREE.Vector3,
  to: THREE.Vector3,
): { root: THREE.Line; life: number } {
  const pts: THREE.Vector3[] = [from.clone()];
  const segs = 6;
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const p = from.clone().lerp(to, t);
    p.x += (Math.random() - 0.5) * 3.5;
    p.z += (Math.random() - 0.5) * 3.5;
    p.y += (Math.random() - 0.5) * 1.2;
    pts.push(p);
  }
  pts.push(to.clone());
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color: 0xddeeff,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const line = new THREE.Line(geo, mat);
  line.name = 'cinema_lightning_bolt';
  line.frustumCulled = false;
  scene.add(line);
  return { root: line, life: 0.12 + Math.random() * 0.1 };
}

export function tickCinemaLightningBolts(
  bolts: Array<{ root: THREE.Line; life: number }>,
  dt: number,
): void {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.life -= dt;
    const mat = b.root.material as THREE.LineBasicMaterial;
    mat.opacity = Math.max(0, b.life * 6);
    if (b.life <= 0) {
      b.root.parent?.remove(b.root);
      b.root.geometry.dispose();
      mat.dispose();
      bolts.splice(i, 1);
    }
  }
}

/** Ocean-tint materials (deep/shallow) for whirlpools / translucent water FX */
export function applyOceanTintMaterials(
  root: THREE.Object3D,
  opts: { opacity?: number; emissive?: number; deep?: number; shallow?: number } = {},
): void {
  const opacity = opts.opacity ?? 0.55;
  const deep = new THREE.Color(opts.deep ?? 0x041018);
  const shallow = new THREE.Color(opts.shallow ?? 0x1a4d62);
  const emissive = new THREE.Color(opts.emissive ?? 0x0a3048);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.material) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const next: THREE.Material[] = [];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std && 'color' in std) {
        const c = std.clone();
        c.color.copy(shallow).lerp(deep, 0.45);
        c.emissive = emissive;
        c.emissiveIntensity = 0.35;
        c.transparent = true;
        c.opacity = opacity;
        c.depthWrite = false;
        c.side = THREE.DoubleSide;
        c.roughness = 0.35;
        c.metalness = 0.05;
        c.needsUpdate = true;
        next.push(c);
      } else if ((mat as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
        const b = (mat as THREE.MeshBasicMaterial).clone();
        b.color.copy(shallow);
        b.transparent = true;
        b.opacity = opacity;
        b.depthWrite = false;
        b.side = THREE.DoubleSide;
        next.push(b);
      } else {
        next.push(mat);
      }
    }
    m.material = next.length === 1 ? next[0] : next;
  });
}

/** Recolor smoke rings for shield-defeat (hot magenta → cyan collapse) */
export function applyShieldDefeatSmokeMaterials(root: THREE.Object3D, phase = 0): void {
  const hot = new THREE.Color().setHSL(0.92 - phase * 0.15, 0.95, 0.55);
  const cool = new THREE.Color().setHSL(0.55, 0.9, 0.45);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.material) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std && 'color' in std) {
        std.color.copy(hot).lerp(cool, phase);
        std.emissive = std.color.clone().multiplyScalar(0.6);
        std.emissiveIntensity = 1.4;
        std.transparent = true;
        std.opacity = 0.75 - phase * 0.35;
        std.depthWrite = false;
        std.blending = THREE.AdditiveBlending;
        std.needsUpdate = true;
      }
    }
  });
}

/** Fire / ethereal boost for beam enhancers (diodes) */
export function applyEtherealFireMaterials(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.material) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std && 'emissive' in std) {
        std.color = new THREE.Color(0xffaa66);
        std.emissive = new THREE.Color(0xff4400);
        std.emissiveIntensity = 2.2;
        std.transparent = true;
        std.opacity = 0.9;
        std.depthWrite = false;
        std.blending = THREE.AdditiveBlending;
        std.needsUpdate = true;
      } else if ((mat as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
        const b = mat as THREE.MeshBasicMaterial;
        b.color = new THREE.Color(0xff6622);
        b.transparent = true;
        b.opacity = 0.85;
        b.blending = THREE.AdditiveBlending;
        b.depthWrite = false;
      }
    }
  });
}

/** Water-particle attractor tint (foam / spray) */
export function applyWaterParticleMaterials(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.material) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std && 'color' in std) {
        std.color = new THREE.Color(0xa8d4e8);
        std.emissive = new THREE.Color(0x3a6a88);
        std.emissiveIntensity = 0.45;
        std.transparent = true;
        std.opacity = 0.55;
        std.depthWrite = false;
        std.roughness = 0.25;
        std.needsUpdate = true;
      }
    }
  });
}

export function fitObjectSpan(obj: THREE.Object3D, targetSpanM: number): void {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z, 0.001);
  obj.scale.multiplyScalar(targetSpanM / span);
}

/** Cinema ship impulse body (simplified rigid body, not Rapier — gate canvas only) */
export class ShipImpulseBody {
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  ang = new THREE.Euler();
  angVel = new THREE.Vector3();
  /** mass proxy */
  invMass = 1 / 18000; // ~18 t ship proxy
  invInertia = 1 / 40000;

  applyImpulse(worldForce: THREE.Vector3, atLocal: THREE.Vector3, dt = 1 / 60): void {
    this.vel.addScaledVector(worldForce, this.invMass);
    // torque ≈ r × F
    const torque = new THREE.Vector3().crossVectors(atLocal, worldForce);
    this.angVel.addScaledVector(torque, this.invInertia);
    void dt;
  }

  /** Soft spring back to calm sea rest */
  update(dt: number, waveBob: number, baseRoll: number, basePitch: number): void {
    // damping
    this.vel.multiplyScalar(Math.exp(-dt * 1.8));
    this.angVel.multiplyScalar(Math.exp(-dt * 2.4));
    // integrate
    this.pos.addScaledVector(this.vel, dt);
    this.ang.x += this.angVel.x * dt;
    this.ang.y += this.angVel.y * dt;
    this.ang.z += this.angVel.z * dt;
    // spring to rest (y floats with wave)
    this.pos.x *= Math.exp(-dt * 0.6);
    this.pos.z *= Math.exp(-dt * 0.6);
    this.pos.y = THREE.MathUtils.lerp(this.pos.y, waveBob, 1 - Math.exp(-dt * 3));
    // clamp extreme list
    this.ang.x = THREE.MathUtils.clamp(this.ang.x, -0.9, 0.9);
    this.ang.z = THREE.MathUtils.clamp(this.ang.z, -1.1, 1.1);
    // return toward wave-driven base
    this.ang.x = THREE.MathUtils.lerp(this.ang.x, basePitch, 1 - Math.exp(-dt * 1.2));
    this.ang.z = THREE.MathUtils.lerp(this.ang.z, baseRoll, 1 - Math.exp(-dt * 1.2));
  }

  applyTo(group: THREE.Object3D): void {
    group.position.x = this.pos.x;
    group.position.y = this.pos.y;
    group.position.z = this.pos.z;
    group.rotation.x = this.ang.x;
    group.rotation.y = this.ang.y;
    group.rotation.z = this.ang.z;
  }
}

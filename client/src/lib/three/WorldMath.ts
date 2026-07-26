/**
 * WorldMath — zero-allocation 3D helpers for game loops.
 * Prefer these over Vector3.clone() / new Vector3() inside update().
 */
import * as THREE from 'three';

// ── Scratch pools (single-threaded main thread) ────────────────────────────

const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q0 = new THREE.Quaternion();
const _e0 = new THREE.Euler();
const _m0 = new THREE.Matrix4();
const _box = new THREE.Box3();
const _sphere = new THREE.Sphere();

export function scratchVec(i: 0 | 1 | 2 = 0): THREE.Vector3 {
  return i === 0 ? _v0 : i === 1 ? _v1 : _v2;
}

export function scratchQuat(): THREE.Quaternion {
  return _q0;
}

export function scratchEuler(): THREE.Euler {
  return _e0;
}

export function scratchMatrix(): THREE.Matrix4 {
  return _m0;
}

// ── Scalars ────────────────────────────────────────────────────────────────

export function clamp(a: number, min: number, max: number): number {
  return a < min ? min : a > max ? max : a;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  // Frame-rate independent exponential approach
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function wrapAngle(a: number): number {
  const TAU = Math.PI * 2;
  a = ((a % TAU) + TAU) % TAU;
  if (a > Math.PI) a -= TAU;
  return a;
}

export function lerpAngle(a: number, b: number, t: number): number {
  return a + wrapAngle(b - a) * t;
}

export function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  return lerpAngle(current, target, 1 - Math.exp(-lambda * dt));
}

// ── XZ plane (islands / ships) ─────────────────────────────────────────────

export function distanceXZ(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function distanceXZSq(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

/** Yaw (Y-up) from direction on XZ. */
export function yawFromDir(dx: number, dz: number): number {
  return Math.atan2(dx, dz);
}

/** Write forward unit vector from yaw into out. */
export function forwardFromYaw(yaw: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(Math.sin(yaw), 0, Math.cos(yaw));
}

/** Move pos along yaw by speed*dt (XZ only). Mutates pos. */
export function moveOnXZ(
  pos: THREE.Vector3,
  yaw: number,
  speed: number,
  dt: number,
  out?: THREE.Vector3,
): THREE.Vector3 {
  const target = out ?? pos;
  const dist = speed * dt;
  target.x = pos.x + Math.sin(yaw) * dist;
  target.z = pos.z + Math.cos(yaw) * dist;
  if (target !== pos) target.y = pos.y;
  return target;
}

// ── Vector helpers (mutate out) ────────────────────────────────────────────

export function setXZ(v: THREE.Vector3, x: number, z: number): THREE.Vector3 {
  v.x = x;
  v.z = z;
  return v;
}

export function copyXZ(out: THREE.Vector3, from: THREE.Vector3): THREE.Vector3 {
  out.x = from.x;
  out.z = from.z;
  return out;
}

/**
 * Smooth-damp a Vector3 into out (critically-damped style).
 * velocity is mutated. Does not allocate.
 */
export function smoothDampVec3(
  current: THREE.Vector3,
  target: THREE.Vector3,
  velocity: THREE.Vector3,
  smoothTime: number,
  dt: number,
  out: THREE.Vector3,
  maxSpeed = Infinity,
): THREE.Vector3 {
  const st = Math.max(0.0001, smoothTime);
  const omega = 2 / st;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  _v0.copy(current).sub(target);
  const maxChange = maxSpeed * st;
  _v0.clampLength(0, maxChange);

  const tempX = (velocity.x + omega * _v0.x) * dt;
  const tempY = (velocity.y + omega * _v0.y) * dt;
  const tempZ = (velocity.z + omega * _v0.z) * dt;
  velocity.x = (velocity.x - omega * tempX) * exp;
  velocity.y = (velocity.y - omega * tempY) * exp;
  velocity.z = (velocity.z - omega * tempZ) * exp;

  out.x = target.x + (_v0.x + tempX) * exp;
  out.y = target.y + (_v0.y + tempY) * exp;
  out.z = target.z + (_v0.z + tempZ) * exp;
  return out;
}

// ── Bounds for skinned / equip meshes ──────────────────────────────────────

/**
 * Recompute bounding sphere/box for SkinnedMesh so frustum culling works
 * after equipment visibility changes (otherwise heroes pop when camera turns).
 */
export function refreshSkinnedBounds(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const sm = obj as THREE.SkinnedMesh;
    if (!sm.isSkinnedMesh || !sm.geometry) return;
    sm.geometry.computeBoundingSphere();
    sm.geometry.computeBoundingBox();
    // Expand sphere slightly for cloth / weapons sticking out
    if (sm.geometry.boundingSphere) {
      sm.geometry.boundingSphere.radius *= 1.15;
    }
    sm.frustumCulled = true;
  });
}

/**
 * World-space AABB of visible meshes only (skip hidden equip pieces).
 */
export function computeVisibleBounds(root: THREE.Object3D, out = _box): THREE.Box3 {
  out.makeEmpty();
  root.updateWorldMatrix(true, true);
  root.traverse((obj) => {
    if (!obj.visible) return;
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox) return;
    _sphere.copy(mesh.geometry.boundingSphere ?? new THREE.Sphere());
    // Use world matrix
    _m0.copy(mesh.matrixWorld);
    const bb = mesh.geometry.boundingBox;
    _v0.set(bb.min.x, bb.min.y, bb.min.z).applyMatrix4(_m0);
    _v1.set(bb.max.x, bb.max.y, bb.max.z).applyMatrix4(_m0);
    out.expandByPoint(_v0);
    out.expandByPoint(_v1);
  });
  return out;
}

// ── Animation clip hygiene ─────────────────────────────────────────────────

/**
 * Optimize clip keyframes + strip Mixamo-style empty tracks.
 * Mutates and returns the clip.
 */
export function optimizeAnimationClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  try {
    clip.optimize();
  } catch {
    /* older three versions */
  }
  // Drop zero-length tracks
  clip.tracks = clip.tracks.filter((t) => t.times.length > 0);
  return clip;
}

/** Cap clip sample rate for distant LODs (every Nth key). */
export function thinAnimationClip(clip: THREE.AnimationClip, keepEvery = 2): THREE.AnimationClip {
  if (keepEvery <= 1) return clip;
  const thinned = clip.clone();
  for (const track of thinned.tracks) {
    const n = track.times.length;
    if (n < 4) continue;
    const stride = track.getValueSize();
    const times: number[] = [];
    const values: number[] = [];
    for (let i = 0; i < n; i += keepEvery) {
      times.push(track.times[i]);
      const base = i * stride;
      for (let s = 0; s < stride; s++) values.push(track.values[base + s]);
    }
    // Always keep last key
    if ((n - 1) % keepEvery !== 0) {
      times.push(track.times[n - 1]);
      const base = (n - 1) * stride;
      for (let s = 0; s < stride; s++) values.push(track.values[base + s]);
    }
    track.times = new Float32Array(times) as unknown as typeof track.times;
    track.values = new Float32Array(values) as unknown as typeof track.values;
  }
  return thinned;
}

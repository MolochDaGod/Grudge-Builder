/**
 * CinemaShipDestroy — higher-quality boat break + water float + limp ragdoll.
 *
 * Goals (leviathan pinata ending):
 *  - Detached hull meshes fly with ballistic + buoyancy + water drag (not pure spin)
 *  - Debris materials = charred wet timber (not neon red)
 *  - Fire on float wreck = gold/amber soft embers (softAdditive), not red shells
 *  - Character throw ends in face-up limp float on Gerstner sample — no animated bone spins
 *
 * Lightweight cinema sim (no second Rapier world required for intro gate).
 * Water height from sampleCinemaWaterY (same as levi/ocean).
 */
import * as THREE from 'three';
import { applyCinemaBlend, CINEMA_RENDER_ORDER } from './CinemaMaterialBlend';

export type DebrisKind = 'ship' | 'shield' | 'float_debris';
export type DebrisPhase = 'blast' | 'sink' | 'float';

export type CinemaDebrisPiece = {
  mesh: THREE.Object3D;
  vel: THREE.Vector3;
  ang: THREE.Vector3;
  life: number;
  kind: DebrisKind;
  phase: DebrisPhase;
  bob: number;
  rWorld: number;
  /** Soft ember Points (not red sphere) */
  embers?: THREE.Points;
  /** Approximate half-height for buoyancy */
  halfH: number;
  mass: number;
};

export type CinemaRagdollState = {
  root: THREE.Object3D;
  vel: THREE.Vector3;
  angVel: THREE.Vector3;
  bones: THREE.Object3D[];
  /** Rest limp local euler per bone (captured at start) */
  limp: Array<{ bone: THREE.Object3D; x: number; y: number; z: number }>;
  t: number;
  faceUp: boolean;
};

// ── Materials ──────────────────────────────────────────────────────────

/** Charred wet timber — brown/black, not red emissive wash. */
export function applyCharredDebrisMaterial(mat: THREE.Material): THREE.Material {
  const std = mat as THREE.MeshStandardMaterial;
  if (std.isMeshStandardMaterial || (std as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) {
    const c = std.clone();
    // Desaturate wood → charcoal
    if (c.color) {
      c.color.offsetHSL(0, -0.35, -0.22);
      c.color.lerp(new THREE.Color(0x2a2018), 0.45);
    }
    if (!c.emissive) c.emissive = new THREE.Color(0x000000);
    // Subtle warm coal, not fire-red
    c.emissive.setHex(0x1a1008);
    c.emissiveIntensity = 0.12 + Math.random() * 0.18;
    c.roughness = Math.min(0.95, (c.roughness ?? 0.8) + 0.1);
    c.metalness = Math.min(0.15, c.metalness ?? 0);
    c.needsUpdate = true;
    return c;
  }
  if ((mat as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
    const b = (mat as THREE.MeshBasicMaterial).clone();
    b.color = new THREE.Color(0x3a2a1c);
    return b;
  }
  return mat;
}

function softEmberTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,245,210,1)');
  g.addColorStop(0.35, 'rgba(255,180,90,0.7)');
  g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let _emberTex: THREE.CanvasTexture | null = null;

/** Gold/amber soft embers parented to debris — replaces red sphere “fire aura”. */
export function createDebrisEmbers(radius = 0.4, count = 18): THREE.Points {
  if (!_emberTex) _emberTex = softEmberTex();
  const n = Math.max(8, Math.min(count, 40));
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.random() * radius * 0.8;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffd090,
    size: 0.18 + radius * 0.08,
    map: _emberTex,
    transparent: true,
    opacity: 0.75,
    sizeAttenuation: true,
    fog: false,
    toneMapped: false,
  });
  applyCinemaBlend(mat, {
    recipe: 'softAdditive',
    opacity: 0.75,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = 'cinema_debris_embers';
  pts.frustumCulled = false;
  pts.renderOrder = CINEMA_RENDER_ORDER.sparks;
  return pts;
}

export function tickDebrisEmbers(pts: THREE.Points | undefined, dt: number, t: number, alive = 1): void {
  if (!pts?.visible) return;
  const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
  if (!attr) return;
  const arr = attr.array as Float32Array;
  for (let i = 0; i < arr.length; i += 3) {
    arr[i + 1] += dt * (0.4 + (i % 5) * 0.05);
    if (arr[i + 1] > 1.2) {
      arr[i] = (Math.random() - 0.5) * 0.8;
      arr[i + 1] = 0;
      arr[i + 2] = (Math.random() - 0.5) * 0.8;
    }
  }
  attr.needsUpdate = true;
  const mat = pts.material as THREE.PointsMaterial;
  mat.opacity = 0.35 + 0.4 * alive * (0.75 + 0.25 * Math.sin(t * 11));
  mat.size = 0.14 + 0.08 * Math.sin(t * 9);
}

// ── Debris physics ─────────────────────────────────────────────────────

/**
 * Integrate one debris piece with gravity, air drag, water hit, buoyancy, sink.
 * `waterYAt` = sampleCinemaWaterY(x,z,t,storm).
 */
export function integrateDebrisPiece(
  p: CinemaDebrisPiece,
  dt: number,
  waterYAt: (x: number, z: number) => number,
  heroPos: THREE.Vector3 | null,
  elapsed: number,
  i: number,
): void {
  if (p.kind !== 'float_debris') p.life -= dt;

  const wy = waterYAt(p.mesh.position.x, p.mesh.position.z);

  // ── FLOAT: buoyancy + ring around hero ──
  if (p.phase === 'float' || (p.kind === 'float_debris' && p.phase !== 'blast')) {
    p.phase = 'float';
    p.bob += dt * (1.0 + (i % 5) * 0.07);
    if (heroPos) {
      const ang = p.bob * 0.28 + i * 0.31;
      const ringR = 3.2 + (i % 7) * 0.9 + Math.sin(p.bob * 0.45) * 0.35;
      const tx = heroPos.x + Math.cos(ang) * ringR;
      const tz = heroPos.z + Math.sin(ang) * ringR;
      p.mesh.position.x = THREE.MathUtils.lerp(p.mesh.position.x, tx, 1 - Math.exp(-dt * 0.48));
      p.mesh.position.z = THREE.MathUtils.lerp(p.mesh.position.z, tz, 1 - Math.exp(-dt * 0.48));
    }
    // Wave-following buoyancy (not hard lock to y=0.08)
    const targetY = wy + p.halfH * 0.35 + Math.sin(p.bob) * 0.14 + Math.sin(p.bob * 1.6 + i) * 0.05;
    p.mesh.position.y = THREE.MathUtils.lerp(p.mesh.position.y, targetY, 1 - Math.exp(-dt * 3.5));
    // Rock with swell — damped angular velocity, not constant spin
    p.ang.multiplyScalar(Math.exp(-dt * 1.8));
    p.mesh.rotation.x = THREE.MathUtils.lerp(p.mesh.rotation.x, Math.sin(p.bob * 0.85) * 0.22, dt * 2);
    p.mesh.rotation.z = THREE.MathUtils.lerp(p.mesh.rotation.z, Math.cos(p.bob * 0.65) * 0.18, dt * 2);
    p.mesh.rotation.y += p.ang.y * dt * 0.15;
    p.vel.set(0, 0, 0);
    p.mesh.visible = true;
    tickDebrisEmbers(p.embers, dt, elapsed, 1);
    return;
  }

  // ── BLAST / SINK ──
  const g = p.kind === 'shield' ? 7 : p.phase === 'sink' ? 5.5 : 11.5;
  p.vel.y -= g * dt;

  // Air drag
  const drag = p.phase === 'sink' ? 0.96 : p.kind === 'shield' ? 0.982 : 0.991;
  p.vel.multiplyScalar(drag);
  p.ang.multiplyScalar(Math.exp(-dt * (p.phase === 'sink' ? 2.2 : 0.9)));

  p.mesh.position.addScaledVector(p.vel, dt);
  p.mesh.rotation.x += p.ang.x * dt;
  p.mesh.rotation.y += p.ang.y * dt;
  p.mesh.rotation.z += p.ang.z * dt;

  const surface = wy + 0.12;
  // Water contact
  if (p.phase === 'blast' && p.mesh.position.y <= surface + p.halfH && p.vel.y < 0) {
    if (p.kind === 'float_debris') {
      p.phase = 'float';
      p.vel.multiplyScalar(0.2);
      p.vel.y = 0;
      p.ang.multiplyScalar(0.12);
      p.mesh.position.y = surface + p.halfH * 0.3;
      if (!p.embers) {
        p.embers = createDebrisEmbers(0.25 + Math.min(0.9, p.rWorld * 0.08), 14);
        p.mesh.add(p.embers);
      }
    } else if (p.kind === 'ship') {
      p.phase = 'sink';
      // Splash: kill most vertical, keep some outward
      p.vel.x *= 0.4;
      p.vel.z *= 0.4;
      p.vel.y = Math.min(p.vel.y * 0.25, -0.6);
      p.ang.multiplyScalar(0.35);
    } else {
      p.vel.y *= -0.2;
      p.mesh.position.y = surface + 0.08;
      p.ang.multiplyScalar(0.5);
    }
  }

  // Submerged buoyancy / extra drag for sinking timber
  if (p.phase === 'sink' || (p.phase === 'blast' && p.mesh.position.y < surface)) {
    const sub = Math.max(0, surface - p.mesh.position.y);
    // Buoyancy opposes gravity for float-capable pieces only
    if (p.kind === 'float_debris') {
      p.vel.y += sub * 18 * dt;
    } else {
      // Sinkers: slight resistance then go under
      p.vel.y -= 2.5 * dt;
      p.vel.x *= Math.exp(-dt * 1.5);
      p.vel.z *= Math.exp(-dt * 1.5);
    }
  }

  tickDebrisEmbers(p.embers, dt, elapsed, p.phase === 'sink' ? 0.35 : 0.7);

  if (p.phase === 'sink' && p.mesh.position.y < wy - 8) {
    p.life = Math.min(p.life, 0.01);
  }
}

// ── Ragdoll (limp float, not spin) ─────────────────────────────────────

/**
 * Capture bone rest limp offsets and stop animated spin.
 * Face-up on water with damped limb settle toward limp pose.
 */
export function beginLimpRagdoll(root: THREE.Object3D): CinemaRagdollState {
  const bones: THREE.Object3D[] = [];
  const limp: CinemaRagdollState['limp'] = [];
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone || /bip001|spine|arm|leg|hand|foot|head|forearm|calf|thigh/i.test(o.name)) {
      bones.push(o);
      // Limp: slight droop, not spinning
      const isArm = /arm|hand|fore/i.test(o.name);
      const isLeg = /leg|foot|calf|thigh/i.test(o.name);
      limp.push({
        bone: o,
        x: isArm ? 0.35 : isLeg ? 0.15 : 0.05,
        y: 0,
        z: isArm ? (Math.random() > 0.5 ? 0.25 : -0.25) : 0.05,
      });
    }
  });
  // Face-up: back in water
  root.rotation.set(-Math.PI / 2, root.rotation.y, 0);
  return {
    root,
    vel: new THREE.Vector3((Math.random() - 0.5) * 0.35, 0, (Math.random() - 0.5) * 0.3),
    angVel: new THREE.Vector3(0, (Math.random() - 0.5) * 0.15, 0),
    bones,
    limp,
    t: 0,
    faceUp: true,
  };
}

export function integrateLimpRagdoll(
  r: CinemaRagdollState,
  dt: number,
  waterYAt: (x: number, z: number) => number,
  elapsed: number,
): void {
  r.t += dt;
  const p = r.root.position;
  const wy = waterYAt(p.x, p.z);
  const wave =
    Math.sin(elapsed * 1.6 + p.x * 0.18) * 0.1 + Math.sin(elapsed * 1.05 + p.z * 0.14) * 0.07;

  // Float body on surface
  p.y = THREE.MathUtils.lerp(p.y, wy + 0.14 + wave, 1 - Math.exp(-dt * 4));
  p.x += r.vel.x * dt + Math.sin(elapsed * 0.85) * dt * 0.12;
  p.z += r.vel.z * dt + Math.cos(elapsed * 0.65) * dt * 0.1;
  r.vel.multiplyScalar(0.992);

  // Face-up stable — swell tilt only (no tumble spin)
  r.root.rotation.x = THREE.MathUtils.lerp(r.root.rotation.x, -Math.PI / 2 + wave * 0.35, dt * 2.2);
  r.root.rotation.z = THREE.MathUtils.lerp(r.root.rotation.z, wave * 0.5, dt * 1.8);
  r.root.rotation.y += r.angVel.y * dt;
  r.angVel.y *= Math.exp(-dt * 0.8);

  // Limbs ease toward limp rest — NOT sin-spin animation
  for (const L of r.limp) {
    if (/root|hips|bip001$/i.test(L.bone.name)) continue;
    L.bone.rotation.x = THREE.MathUtils.lerp(L.bone.rotation.x, L.x, 1 - Math.exp(-dt * 1.6));
    L.bone.rotation.y = THREE.MathUtils.lerp(L.bone.rotation.y, L.y, 1 - Math.exp(-dt * 1.4));
    L.bone.rotation.z = THREE.MathUtils.lerp(L.bone.rotation.z, L.z, 1 - Math.exp(-dt * 1.5));
  }
  r.root.visible = true;
}

// ── Explosion burst (gold/white, not pure red) ─────────────────────────

export function createShatterBurst(at: THREE.Vector3, n = 220): THREE.Points {
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = at.x;
    pos[i * 3 + 1] = at.y;
    pos[i * 3 + 2] = at.z;
    const d = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() * 0.95 + 0.2,
      Math.random() - 0.5,
    )
      .normalize()
      .multiplyScalar(9 + Math.random() * 20);
    vel[i * 3] = d.x;
    vel[i * 3 + 1] = d.y;
    vel[i * 3 + 2] = d.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('velocity', new THREE.BufferAttribute(vel, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffe8b0,
    size: 0.38,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    fog: false,
    toneMapped: false,
  });
  applyCinemaBlend(mat, {
    recipe: 'softAdditive',
    opacity: 0.9,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = 'cinema_shatter_burst';
  pts.frustumCulled = false;
  pts.renderOrder = CINEMA_RENDER_ORDER.sparks;
  return pts;
}

export function tickShatterBurst(pts: THREE.Points | null, dt: number): boolean {
  if (!pts) return false;
  const pos = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
  const vel = pts.geometry.getAttribute('velocity') as THREE.BufferAttribute;
  if (!pos || !vel) return false;
  const pa = pos.array as Float32Array;
  const va = vel.array as Float32Array;
  let alive = 0;
  for (let i = 0; i < pa.length; i += 3) {
    va[i + 1] -= 14 * dt;
    pa[i] += va[i] * dt;
    pa[i + 1] += va[i + 1] * dt;
    pa[i + 2] += va[i + 2] * dt;
    if (pa[i + 1] > -2) alive++;
  }
  pos.needsUpdate = true;
  const mat = pts.material as THREE.PointsMaterial;
  mat.opacity *= Math.exp(-dt * 1.8);
  mat.size *= Math.exp(-dt * 0.6);
  return mat.opacity > 0.04 && alive > 8;
}

/**
 * CinemaSandboxFireAura — SSOT fire_aura from vfxgrudge / Open Vfx.ts
 * (effectId `fire_aura`: dual ground rings + rising flame particles + cast puff).
 *
 * NOT the soft sphere shells previously used in LeviathanDragonBeamVfx.
 * Catalog: vfxEffectCatalog fire_aura · deploy: Vfx.fireAura / auraRing / flame
 * Hotkey G/Q on https://vfxgrudge.puter.site/
 */
import * as THREE from 'three';
import { applyCinemaBlend, CINEMA_RENDER_ORDER } from './CinemaMaterialBlend';

// ── Shared textures (module-cached, never dispose) ─────────────────────

const texCache = new Map<string, THREE.CanvasTexture>();

function makeTex(
  key: string,
  size: number,
  draw: (ctx: CanvasRenderingContext2D, s: number) => void,
): THREE.CanvasTexture {
  const hit = texCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  texCache.set(key, tex);
  return tex;
}

/** Soft annulus for ground aura rings (Open fxTextures.ringTexture). */
export function cinemaRingTexture(): THREE.CanvasTexture {
  return makeTex('cin_ring', 256, (ctx, s) => {
    const cx = s / 2;
    const peak = s * 0.4;
    const width = s * 0.085;
    const img = ctx.createImageData(s, s);
    const data = img.data;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cx;
        const r = Math.sqrt(dx * dx + dy * dy);
        const d = (r - peak) / width;
        const a = Math.exp(-d * d) * 255;
        const i = (y * s + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 255;
        data[i + 3] = a;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

/** Soft radial spark for flame points. */
export function cinemaSparkTexture(): THREE.CanvasTexture {
  return makeTex('cin_spark', 64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.65)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

function unitGroundPlane(): THREE.BufferGeometry {
  // 1×1 plane facing up — scale.xy sets ring diameter
  const g = new THREE.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  return g;
}

// ── Transient effects ──────────────────────────────────────────────────

type Transient = {
  root: THREE.Object3D;
  age: number;
  life: number;
  update: (dt: number, t: number) => void;
  dispose: () => void;
};

/** Dual concentric ground rings — Vfx.auraRing */
export function spawnAuraRing(
  parent: THREE.Object3D,
  pos: THREE.Vector3,
  color = 0xff5510,
  radius = 2.4,
  life = 0.85,
): Transient {
  const group = new THREE.Group();
  group.position.copy(pos);
  group.position.y = Math.max(0.04, pos.y);
  parent.add(group);
  const rings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; inner: boolean }[] = [];
  const map = cinemaRingTexture();
  for (const inner of [false, true]) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      map,
      transparent: true,
      side: THREE.DoubleSide,
      opacity: 0,
      fog: false,
      toneMapped: false,
    });
    applyCinemaBlend(mat, {
      recipe: 'softAdditive',
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      fog: false,
    });
    const mesh = new THREE.Mesh(unitGroundPlane(), mat);
    mesh.renderOrder = CINEMA_RENDER_ORDER.fireAura;
    group.add(mesh);
    rings.push({ mesh, mat, inner });
  }
  return {
    root: group,
    age: 0,
    life,
    update(_dt, tNorm) {
      for (const r of rings) {
        const grow = Math.min(1, tNorm / 0.34);
        const rad = radius * (r.inner ? 0.62 : 1);
        const pulse = 1 + Math.sin(tNorm * life * 16 + (r.inner ? Math.PI : 0)) * 0.06;
        const s = rad * 2.5 * grow * pulse;
        r.mesh.scale.set(s, 1, s);
        const fadeIn = Math.min(1, tNorm / 0.2);
        const fadeOut = tNorm > 0.66 ? 1 - (tNorm - 0.66) / 0.34 : 1;
        r.mat.opacity = fadeIn * fadeOut * (r.inner ? 0.5 : 0.85);
      }
    },
    dispose() {
      parent.remove(group);
      for (const r of rings) {
        r.mesh.geometry.dispose();
        r.mat.dispose();
      }
    },
  };
}

/** Rising flame points — Vfx.flame */
export function spawnFlameBurst(
  parent: THREE.Object3D,
  pos: THREE.Vector3,
  color = 0xff6a1e,
  count = 18,
  power = 2.2,
  life = 0.6,
): Transient {
  const positions = new Float32Array(count * 3);
  const vel: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;
    vel.push(
      new THREE.Vector3(
        (Math.random() * 2 - 1) * 0.7,
        0.6 + Math.random() * 1.2,
        (Math.random() * 2 - 1) * 0.7,
      ).multiplyScalar(power * (0.4 + Math.random())),
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size: 0.32,
    map: cinemaSparkTexture(),
    transparent: true,
    opacity: 1,
    sizeAttenuation: true,
    fog: false,
    toneMapped: false,
  });
  applyCinemaBlend(mat, {
    recipe: 'softAdditive',
    opacity: 1,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = CINEMA_RENDER_ORDER.sparks;
  parent.add(points);
  return {
    root: points,
    age: 0,
    life,
    update(dt, tNorm) {
      const arr = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        vel[i].y -= 2 * dt;
        vel[i].x *= 0.96;
        vel[i].z *= 0.96;
        arr[i * 3] += vel[i].x * dt;
        arr[i * 3 + 1] += vel[i].y * dt;
        arr[i * 3 + 2] += vel[i].z * dt;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = 1 - tNorm;
      mat.size = 0.32 * (1 - tNorm * 0.4);
    },
    dispose() {
      parent.remove(points);
      geo.dispose();
      mat.dispose();
    },
  };
}

/**
 * One-shot fire_aura (sandbox G/Q): rings + dual flame columns.
 * Scale ~1.0 standard, ~1.4 heavy levi charge.
 */
export function spawnFireAuraBurst(
  parent: THREE.Object3D,
  pos: THREE.Vector3,
  scale = 1,
): Transient[] {
  const s = Math.max(0.35, scale);
  const fireCol = 0xff6a1e;
  const mid = 0xff6a1e;
  const ground = new THREE.Vector3(pos.x, 0.05, pos.z);
  const chest = pos.clone();
  if (chest.y < 0.4) chest.y = 0.95;
  const out: Transient[] = [];
  out.push(spawnAuraRing(parent, ground, fireCol, 1.35 * s, 0.55));
  out.push(spawnAuraRing(parent, ground, mid, 2.4 * s * 0.55, 0.7));
  out.push(
    spawnFlameBurst(parent, chest.clone().setY(chest.y * 0.45), mid, Math.round(18 * s), 2.2 * s),
  );
  out.push(spawnFlameBurst(parent, chest, 0xffd27a, Math.round(10 * s), 1.6 * s, 0.55));
  return out;
}

/**
 * Sustained fire aura for levi charge/blast — re-fires sandbox fire_aura language
 * every pulse while active (rings + rising flame), attached near maw/body.
 */
export class CinemaSandboxFireAura {
  readonly root = new THREE.Group();
  private active = false;
  private intensity = 0;
  private pulseCd = 0;
  private transients: Transient[] = [];
  private continuousFlame: THREE.Points | null = null;
  private contVel: Float32Array | null = null;
  private contLife: Float32Array | null = null;
  private contN = 0;
  private ringA: THREE.Mesh | null = null;
  private ringB: THREE.Mesh | null = null;
  private ringMatA: THREE.MeshBasicMaterial | null = null;
  private ringMatB: THREE.MeshBasicMaterial | null = null;
  private age = 0;
  private scale = 1;

  constructor(parent: THREE.Object3D) {
    this.root.name = 'cinema_sandbox_fire_aura';
    parent.add(this.root);
    this.buildContinuous();
  }

  private buildContinuous(): void {
    // Persistent dual rings (sandbox auraRing look, looping)
    const map = cinemaRingTexture();
    // Gold/amber rings — not pure red (matches mouth fire charge palette)
    this.ringMatA = new THREE.MeshBasicMaterial({
      color: 0xffb050,
      map,
      transparent: true,
      side: THREE.DoubleSide,
      opacity: 0,
      fog: false,
      toneMapped: false,
    });
    applyCinemaBlend(this.ringMatA, {
      recipe: 'softAdditive',
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      fog: false,
    });
    this.ringMatB = this.ringMatA.clone();
    this.ringMatB.color.setHex(0xffd080);
    this.ringA = new THREE.Mesh(unitGroundPlane(), this.ringMatA);
    this.ringB = new THREE.Mesh(unitGroundPlane(), this.ringMatB);
    this.ringA.position.y = 0.06;
    this.ringB.position.y = 0.08;
    this.ringA.renderOrder = CINEMA_RENDER_ORDER.fireAura;
    this.ringB.renderOrder = CINEMA_RENDER_ORDER.fireAura;
    this.root.renderOrder = CINEMA_RENDER_ORDER.fireAura;
    this.root.add(this.ringA, this.ringB);

    // Continuous rising flame column
    const n = 36;
    this.contN = n;
    const pos = new Float32Array(n * 3);
    this.contVel = new Float32Array(n * 3);
    this.contLife = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffc070,
      size: 0.32,
      map: cinemaSparkTexture(),
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
    this.continuousFlame = new THREE.Points(geo, mat);
    this.continuousFlame.frustumCulled = false;
    this.continuousFlame.renderOrder = CINEMA_RENDER_ORDER.sparks;
    this.continuousFlame.visible = false;
    this.root.add(this.continuousFlame);
    for (let i = 0; i < n; i++) this.respawnParticle(i, true);
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  private respawnParticle(i: number, randomLife: boolean): void {
    if (!this.contVel || !this.contLife || !this.continuousFlame) return;
    const arr = this.continuousFlame.geometry.getAttribute('position').array as Float32Array;
    const a = Math.random() * Math.PI * 2;
    const r = 0.35 + Math.random() * 1.1 * this.scale;
    arr[i * 3] = Math.cos(a) * r;
    arr[i * 3 + 1] = Math.random() * 0.4;
    arr[i * 3 + 2] = Math.sin(a) * r;
    this.contVel[i * 3] = (Math.random() - 0.5) * 0.8;
    this.contVel[i * 3 + 1] = 1.4 + Math.random() * 2.4;
    this.contVel[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    this.contLife[i] = randomLife ? Math.random() * 0.7 : 0.45 + Math.random() * 0.45;
  }

  /**
   * @param on  show sustained aura
   * @param intensity 0..1 charge
   * @param worldPos  anchor (maw / upper body)
   * @param scale SI size for levi (default ~3–5 m radius feel)
   */
  setActive(on: boolean, intensity = 0, worldPos?: THREE.Vector3, scale = 3.2): void {
    this.active = on;
    this.intensity = THREE.MathUtils.clamp(intensity, 0, 1);
    this.scale = scale;
    if (worldPos) this.root.position.copy(worldPos);
    if (this.continuousFlame) this.continuousFlame.visible = on && this.intensity > 0.02;
    if (!on) {
      if (this.ringMatA) this.ringMatA.opacity = 0;
      if (this.ringMatB) this.ringMatB.opacity = 0;
    }
  }

  /** Pulse a full fire_aura burst (shield hit / snap). */
  burst(at: THREE.Vector3, scale = 1.1): void {
    for (const t of spawnFireAuraBurst(this.root.parent ?? this.root, at, scale)) {
      this.transients.push(t);
    }
  }

  update(dt: number, worldPos?: THREE.Vector3): void {
    this.age += dt;
    if (worldPos) this.root.position.copy(worldPos);

    // Transient effects
    for (let i = this.transients.length - 1; i >= 0; i--) {
      const t = this.transients[i];
      t.age += dt;
      const u = t.age / t.life;
      if (u >= 1) {
        t.dispose();
        this.transients.splice(i, 1);
        continue;
      }
      t.update(dt, u);
    }

    if (!this.active) return;

    const I = this.intensity;
    // Looping ground rings (fire_aura auraRing language)
    if (this.ringA && this.ringB && this.ringMatA && this.ringMatB) {
      const baseR = this.scale * (0.9 + I * 0.45);
      const pulse = 1 + Math.sin(this.age * 14) * 0.07;
      const sA = baseR * 2.5 * pulse;
      const sB = baseR * 0.62 * 2.5 * (1 + Math.sin(this.age * 14 + Math.PI) * 0.07);
      this.ringA.scale.set(sA, 1, sA);
      this.ringB.scale.set(sB, 1, sB);
      this.ringMatA.opacity = 0.35 + I * 0.5;
      this.ringMatB.opacity = 0.22 + I * 0.35;
      this.ringA.rotation.y += dt * 0.8;
      this.ringB.rotation.y -= dt * 1.1;
    }

    // Continuous rising flame
    if (this.continuousFlame && this.contVel && this.contLife) {
      const arr = this.continuousFlame.geometry.getAttribute('position').array as Float32Array;
      const mat = this.continuousFlame.material as THREE.PointsMaterial;
      mat.opacity = 0.35 + I * 0.4;
      mat.size = 0.22 + I * 0.16;
      mat.color.setHex(I > 0.7 ? 0xffe8a0 : 0xffc070);
      for (let i = 0; i < this.contN; i++) {
        this.contLife[i] -= dt;
        if (this.contLife[i] <= 0) {
          this.respawnParticle(i, false);
          continue;
        }
        this.contVel[i * 3 + 1] -= 1.2 * dt;
        arr[i * 3] += this.contVel[i * 3] * dt;
        arr[i * 3 + 1] += this.contVel[i * 3 + 1] * dt * (0.8 + I * 0.5);
        arr[i * 3 + 2] += this.contVel[i * 3 + 2] * dt;
        // Keep column local to aura root (positions already local)
      }
      (this.continuousFlame.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate =
        true;
    }

    // Occasional full fire_aura re-pulse (sandbox G cadence) — not every frame
    this.pulseCd -= dt;
    if (this.pulseCd <= 0 && I > 0.45) {
      this.pulseCd = 0.95 - I * 0.25;
      const chest = this.root.position.clone();
      chest.y += 0.6 * this.scale * 0.15;
      for (const t of spawnFireAuraBurst(this.root.parent ?? this.root, chest, 0.5 + I * 0.45)) {
        this.transients.push(t);
      }
    }
  }

  dispose(): void {
    for (const t of this.transients) t.dispose();
    this.transients = [];
    if (this.continuousFlame) {
      this.continuousFlame.geometry.dispose();
      (this.continuousFlame.material as THREE.Material).dispose();
    }
    this.ringA?.geometry.dispose();
    this.ringB?.geometry.dispose();
    this.ringMatA?.dispose();
    this.ringMatB?.dispose();
    this.root.parent?.remove(this.root);
  }
}

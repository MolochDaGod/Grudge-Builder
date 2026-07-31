/**
 * LeviathanLookAndWater — cinema look pass + water interaction FX.
 *
 * 1) LEATHERY BODY
 *    - Regrade albedo toward wet sea-serpent leather (deep olive/umber)
 *    - Procedural leather normal if missing (tileable canvas normal)
 *    - Roughness / metalness / sheen for wet hide (not plastic toy)
 *
 * 2) WATER ON BODY
 *    - Rise breach: large waterline splash when surfacing
 *    - Continuous cascade / wash-off while partially above water
 *    - Ocean chop particles kicked off the flanks
 *
 * 3) WATER CYCLONES
 *    - Retexture tornado meshes: ocean blues, foam rims, wet alpha
 *    - Spin + vertical foam streaks
 *
 * SI metres. Soft sprites only (no external deps). Hide/remove when done.
 */
import * as THREE from 'three';

// ── Procedural leather normal (tileable) ────────────────────────────────

let _leatherNormal: THREE.CanvasTexture | null = null;
let _waterFoamTex: THREE.CanvasTexture | null = null;
let _softWaterTex: THREE.CanvasTexture | null = null;

function leatherNormalMap(): THREE.CanvasTexture {
  if (_leatherNormal) return _leatherNormal;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  // Base flat normal (128,128,255)
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, size, size);
  // Grain / scale pits as slight normal offsets
  for (let i = 0; i < 2800; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 3.5;
    const nx = 128 + (Math.random() - 0.5) * 40;
    const ny = 128 + (Math.random() - 0.5) * 40;
    ctx.fillStyle = `rgb(${nx | 0},${ny | 0},255)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Longer leather wrinkles
  for (let i = 0; i < 80; i++) {
    const x0 = Math.random() * size;
    const y0 = Math.random() * size;
    const x1 = x0 + (Math.random() - 0.5) * 40;
    const y1 = y0 + (Math.random() - 0.5) * 40;
    ctx.strokeStyle = `rgb(${110 + Math.random() * 30 | 0},${120 + Math.random() * 30 | 0},255)`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  _leatherNormal = new THREE.CanvasTexture(c);
  _leatherNormal.wrapS = _leatherNormal.wrapT = THREE.RepeatWrapping;
  _leatherNormal.repeat.set(6, 6);
  _leatherNormal.colorSpace = THREE.NoColorSpace;
  _leatherNormal.needsUpdate = true;
  return _leatherNormal;
}

function softWaterSprite(): THREE.CanvasTexture {
  if (_softWaterTex) return _softWaterTex;
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(230,245,255,1)');
  g.addColorStop(0.35, 'rgba(160,210,235,0.7)');
  g.addColorStop(0.7, 'rgba(80,150,190,0.25)');
  g.addColorStop(1, 'rgba(40,90,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _softWaterTex = new THREE.CanvasTexture(c);
  _softWaterTex.needsUpdate = true;
  return _softWaterTex;
}

function waterFoamMap(): THREE.CanvasTexture {
  if (_waterFoamTex) return _waterFoamTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0a3a55';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const a = 0.15 + Math.random() * 0.55;
    ctx.fillStyle = `rgba(220,240,255,${a})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 2 + Math.random() * 8, 1 + Math.random() * 3, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  _waterFoamTex = new THREE.CanvasTexture(c);
  _waterFoamTex.wrapS = _waterFoamTex.wrapT = THREE.RepeatWrapping;
  _waterFoamTex.repeat.set(3, 2);
  _waterFoamTex.colorSpace = THREE.SRGBColorSpace;
  _waterFoamTex.needsUpdate = true;
  return _waterFoamTex;
}

// ── Leather look pass ──────────────────────────────────────────────────

/** Target leather palette (multiply + lerp onto existing maps). */
const LEATHER_TINT = new THREE.Color(0x2a3824); // deep wet olive-hide
const LEATHER_SHADOW = new THREE.Color(0x121810);
const LEATHER_BELLY = new THREE.Color(0x4a4030); // warmer underside hint

/**
 * Convert leviathan GLB materials into wet leathery sea-serpent hide.
 * Safe to call once after load; preserves existing maps when present.
 */
export function applyLeatheryLeviathanLook(root: THREE.Object3D): void {
  const nmap = leatherNormalMap();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const out: THREE.Material[] = [];
    for (const mat of mats) {
      // Prefer MeshStandard / Physical for PBR leather
      let std: THREE.MeshStandardMaterial;
      if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        std = mat as THREE.MeshStandardMaterial;
      } else if ((mat as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
        const basic = mat as THREE.MeshBasicMaterial;
        std = new THREE.MeshStandardMaterial({
          map: basic.map,
          color: basic.color?.clone?.() ?? new THREE.Color(0x445544),
          transparent: basic.transparent,
          opacity: basic.opacity,
          side: basic.side,
        });
        basic.dispose();
      } else {
        std = new THREE.MeshStandardMaterial({
          color: 0x2c3528,
          roughness: 0.82,
          metalness: 0.04,
        });
      }

      // Color grade: pull toward wet leather, darken plastic brights
      if (std.color) {
        std.color.lerp(LEATHER_TINT, 0.45);
        std.color.multiplyScalar(0.78);
      } else {
        std.color = LEATHER_TINT.clone();
      }

      if (std.map) {
        std.map.colorSpace = THREE.SRGBColorSpace;
        std.map.anisotropy = 8;
        // Slight desat / green-brown via material color already multiplies map
      }

      // Leather microdetail
      if (!std.normalMap) {
        std.normalMap = nmap;
        std.normalScale = new THREE.Vector2(0.85, 0.85);
      } else {
        std.normalMap.anisotropy = 8;
        std.normalScale = std.normalScale ?? new THREE.Vector2(1, 1);
        std.normalScale.multiplyScalar(1.15);
      }

      // Wet hide: mostly rough with damp sheen patches (low metal)
      std.roughness = 0.78;
      std.metalness = 0.03;
      std.envMapIntensity = 0.55;

      // Emissive reserved for fire charge phases (baseline near black)
      if (!std.emissive) std.emissive = new THREE.Color(0x000000);
      std.emissiveIntensity = Math.min(std.emissiveIntensity ?? 0, 0.05);

      // Name-based belly / fin warmth
      const n = (mesh.name || '').toLowerCase();
      if (/belly|under|fin|wing|gill/i.test(n)) {
        std.color.lerp(LEATHER_BELLY, 0.35);
        std.roughness = 0.72;
      }
      if (/spine|ridge|horn|plate|scale/i.test(n)) {
        std.color.lerp(LEATHER_SHADOW, 0.25);
        std.roughness = 0.88;
        if (std.normalScale) std.normalScale.set(1.2, 1.2);
      }

      std.userData.__leatherApplied = true;
      std.needsUpdate = true;
      out.push(std);
    }
    mesh.material = out.length === 1 ? out[0] : out;
  });
}

/**
 * Wetness amount 0..1 from how much of the body is near/under waterline.
 * Used to boost sheen / darken when emerging.
 */
export function applyLeviathanWetness(root: THREE.Object3D | null, wetness: number): void {
  if (!root) return;
  const w = THREE.MathUtils.clamp(wetness, 0, 1);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (!std.isMeshStandardMaterial) continue;
      if (std.userData.__baseRoughness == null) {
        std.userData.__baseRoughness = std.roughness ?? 0.8;
      }
      // Wet → slightly smoother + darker
      const baseR = std.userData.__baseRoughness as number;
      std.roughness = THREE.MathUtils.lerp(baseR, 0.42, w * 0.65);
      if (std.color && !std.userData.__wetColorBase) {
        std.userData.__wetColorBase = std.color.clone();
      }
      if (std.userData.__wetColorBase) {
        std.color.copy(std.userData.__wetColorBase as THREE.Color);
        std.color.multiplyScalar(1 - w * 0.18);
      }
    }
  });
}

// ── Water splash particles ─────────────────────────────────────────────

type SplashP = {
  alive: boolean;
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
};

export class LeviathanWaterSplash {
  readonly root: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private size: Float32Array;
  private parts: SplashP[];
  private count: number;
  private mat: THREE.PointsMaterial;
  private emitAcc = 0;
  private lastSurfaceBias = -99;
  private riseBurstCd = 0;

  constructor(scene: THREE.Scene, count = 420) {
    this.count = count;
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.size = new Float32Array(count);
    this.parts = [];
    for (let i = 0; i < count; i++) {
      this.parts.push({
        alive: false,
        life: 0,
        maxLife: 1,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        size: 0.3,
      });
      this.pos[i * 3 + 1] = -999;
      this.size[i] = 0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));

    this.mat = new THREE.PointsMaterial({
      map: softWaterSprite(),
      size: 1.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      color: 0xaadfff,
    });
    this.root = new THREE.Points(geo, this.mat);
    this.root.name = 'leviathan_water_splash';
    this.root.frustumCulled = false;
    scene.add(this.root);
  }

  /** One-shot breach / rise plume at waterline under leviathan. */
  burstRise(at: THREE.Vector3, intensity = 1): void {
    const n = Math.floor(48 * intensity);
    for (let i = 0; i < n; i++) this.spawn(at, 'rise');
  }

  /** Continuous body wash / ocean chop off flanks. */
  private spawn(at: THREE.Vector3, mode: 'rise' | 'cascade' | 'ocean'): void {
    let p: SplashP | null = null;
    for (const q of this.parts) {
      if (!q.alive) {
        p = q;
        break;
      }
    }
    if (!p) return;
    p.alive = true;
    const spread =
      mode === 'rise' ? 3.5 : mode === 'cascade' ? 2.2 : 4.0;
    p.x = at.x + (Math.random() - 0.5) * spread;
    p.y = at.y + (mode === 'rise' ? Math.random() * 0.4 : Math.random() * 1.2);
    p.z = at.z + (Math.random() - 0.5) * spread;
    const ang = Math.random() * Math.PI * 2;
    const speed =
      mode === 'rise'
        ? 4 + Math.random() * 10
        : mode === 'cascade'
          ? 1.2 + Math.random() * 3.5
          : 2 + Math.random() * 5;
    p.vx = Math.cos(ang) * speed * (mode === 'ocean' ? 1.1 : 0.7);
    p.vy =
      mode === 'rise'
        ? 6 + Math.random() * 12
        : mode === 'cascade'
          ? 0.5 + Math.random() * 2.5
          : 2 + Math.random() * 5;
    p.vz = Math.sin(ang) * speed * (mode === 'ocean' ? 1.1 : 0.7);
    p.maxLife = mode === 'rise' ? 0.7 + Math.random() * 0.7 : 0.4 + Math.random() * 0.55;
    p.life = p.maxLife;
    p.size =
      mode === 'rise' ? 0.6 + Math.random() * 1.4 : 0.25 + Math.random() * 0.7;
  }

  /**
   * @param leviPos leviathan root world pos
   * @param surfaceBias >0 above water, <0 submerged (same as cinema water coupling)
   * @param storm 0..1
   * @param active true when levi visible
   */
  update(
    dt: number,
    leviPos: THREE.Vector3,
    surfaceBias: number,
    storm: number,
    active: boolean,
  ): void {
    this.riseBurstCd = Math.max(0, this.riseBurstCd - dt);

    if (active) {
      // Detect rise / breach: surfaceBias crosses toward positive
      if (
        this.lastSurfaceBias < 1.5 &&
        surfaceBias >= 2.5 &&
        this.riseBurstCd <= 0
      ) {
        const at = leviPos.clone();
        at.y = Math.max(0.1, leviPos.y * 0.15);
        this.burstRise(at, 1.2 + storm * 0.6);
        this.riseBurstCd = 1.8;
      }
      // Continuous cascade while body crosses waterline
      if (surfaceBias > -1 && surfaceBias < 6) {
        this.emitAcc += dt * (18 + storm * 22 + Math.max(0, surfaceBias) * 8);
        while (this.emitAcc >= 1) {
          this.emitAcc -= 1;
          const at = leviPos.clone();
          at.y = Math.max(0.05, Math.min(leviPos.y * 0.4, 2.5));
          at.x += (Math.random() - 0.5) * 6;
          at.z += (Math.random() - 0.5) * 6;
          this.spawn(at, surfaceBias > 1.5 ? 'cascade' : 'ocean');
        }
      }
      // Extra ocean wash when high storm + surfaced
      if (surfaceBias > 1 && storm > 0.45) {
        this.emitAcc += dt * storm * 12;
      }
    }
    this.lastSurfaceBias = surfaceBias;

    const g = 14;
    const pos = this.pos;
    const col = this.col;
    const sizes = this.size;
    for (let i = 0; i < this.count; i++) {
      const p = this.parts[i];
      if (!p.alive) {
        pos[i * 3 + 1] = -999;
        sizes[i] = 0;
        continue;
      }
      p.life -= dt;
      p.vy -= g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      // Die under water or expired
      if (p.life <= 0 || p.y < -1.5) {
        p.alive = false;
        pos[i * 3 + 1] = -999;
        sizes[i] = 0;
        continue;
      }
      const u = p.life / p.maxLife;
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      sizes[i] = p.size * (0.5 + u);
      // Foam white → deep blue as fades
      col[i * 3] = 0.55 + u * 0.4;
      col[i * 3 + 1] = 0.72 + u * 0.25;
      col[i * 3 + 2] = 0.9;
    }
    (this.root.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.root.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    (this.root.geometry.getAttribute('size') as THREE.BufferAttribute).needsUpdate = true;
    // PointsMaterial size is global — scale with storm for readability
    this.mat.size = 0.9 + storm * 0.5;
    this.mat.opacity = 0.55 + storm * 0.25;
  }

  dispose(): void {
    this.root.parent?.remove(this.root);
    this.root.geometry.dispose();
    this.mat.dispose();
  }
}

// ── Water cyclone / tornado retexture ──────────────────────────────────

/**
 * Retexture tornado/cyclone meshes as spinning water columns
 * (ocean blues + foam, not dust/fire).
 */
/** @param opacityBase ~0.5 for 50% opaque water columns */
export function applyWaterCycloneLook(root: THREE.Object3D, opacityBase = 0.5): void {
  const foam = waterFoamMap();
  const op = THREE.MathUtils.clamp(opacityBase, 0.15, 0.9);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    if (mesh.name === 'cyclone_foam_ring') return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const out: THREE.Material[] = [];
    for (const mat of mats) {
      const prev = mat as THREE.MeshStandardMaterial;
      const water = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x1a7a9a),
        map: foam,
        transparent: true,
        opacity: op,
        roughness: 0.28,
        metalness: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
        emissive: new THREE.Color(0x0c3a52),
        emissiveIntensity: 0.18,
        blending: THREE.NormalBlending,
      });
      water.userData.__waterCyclone = true;
      water.userData.__opacityBase = op;
      water.userData.__foamMap = foam;
      try {
        prev.dispose?.();
      } catch {
        /* */
      }
      out.push(water);
    }
    mesh.material = out.length === 1 ? out[0] : out;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 2;
  });

  if (!root.getObjectByName('cyclone_foam_ring')) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.4, 0.22, 8, 28),
      new THREE.MeshBasicMaterial({
        color: 0xd8f0ff,
        transparent: true,
        opacity: op * 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    ring.name = 'cyclone_foam_ring';
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12;
    root.add(ring);
  }
}

/** Animate water cyclone materials + spin foam (call each frame when visible). */
export function tickWaterCyclone(root: THREE.Object3D | null, dt: number, t: number): void {
  if (!root?.visible) return;
  root.rotation.y += dt * 2.4;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.name === 'cyclone_foam_ring') {
      mesh.rotation.z += dt * 3.2;
      mesh.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
      return;
    }
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const mat of mats) {
      const m = mat as THREE.MeshStandardMaterial;
      if (!m.userData?.__waterCyclone) continue;
      if (m.map) {
        m.map.offset.x = (t * 0.15) % 1;
        m.map.offset.y = (t * 0.35) % 1;
      }
      const base = (m.userData.__opacityBase as number) ?? 0.5;
      m.opacity = base * (0.88 + Math.sin(t * 3 + mesh.id) * 0.12);
      m.emissiveIntensity = 0.12 + Math.sin(t * 5) * 0.05;
    }
  });
}

/**
 * Estimate surfaceBias from beat location tags / key (shared with cinema).
 */
export function surfaceBiasFromLeviAt(leviAt: string): number {
  if (leviAt.includes('hidden') || leviAt.includes('gone')) return -12;
  if (leviAt.includes('swim') || leviAt.includes('dive')) return -4;
  if (leviAt.includes('surface') || leviAt.includes('cast') || leviAt.includes('beam')) return 3;
  if (leviAt.includes('rise') || leviAt.includes('breach')) return 5.5;
  if (leviAt.includes('watch') || leviAt.includes('finisher')) return 2.5;
  return 2;
}

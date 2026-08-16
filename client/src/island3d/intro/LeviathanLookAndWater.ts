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

/** Minimum body-height fraction that must stay under the waterline at all times. */
export const LEVI_MIN_SUBMERGE_FRAC = 0.2;

/**
 * How deep the body sits by beat phase — always ≥ LEVI_MIN_SUBMERGE_FRAC when visible.
 * surfaceBias: negative = deeper swim, positive = surface/breach.
 */
export function targetLeviSubmergeFrac(surfaceBias: number): number {
  if (surfaceBias < -8) return 1.0; // fully submerged / hidden path
  if (surfaceBias < -3) return 0.72; // swim / dive
  if (surfaceBias < 0) return 0.48;
  if (surfaceBias < 2) return 0.32; // surface transition
  if (surfaceBias < 4) return 0.24; // cast / beam
  // breach / rise — still keep belly wet (min 20%)
  return LEVI_MIN_SUBMERGE_FRAC;
}

/**
 * Snap leviathan root Y so the bottom `frac` of its world AABB is under waterY.
 * Call AFTER scripted path / bob so it is the final constraint every frame.
 */
export function enforceLeviathanSubmerge(
  root: THREE.Object3D,
  body: THREE.Object3D | null,
  waterY: number,
  surfaceBias: number,
): { height: number; frac: number; waterY: number; dy: number } {
  const target = body ?? root;
  root.updateMatrixWorld(true);
  target.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(target);
  const h = box.max.y - box.min.y;
  if (!(h > 0.05) || !Number.isFinite(h)) {
    return { height: 0, frac: 0, waterY, dy: 0 };
  }
  const frac = targetLeviSubmergeFrac(surfaceBias);
  // waterline should sit at min.y + frac*h  →  min.y = waterY - frac*h
  const targetMinY = waterY - frac * h;
  const dy = targetMinY - box.min.y;
  root.position.y += dy;
  return { height: h, frac, waterY, dy };
}

type WaterlineUniforms = {
  uWaterY: { value: number };
  uUnderTint: { value: THREE.Color };
  uUnderDark: { value: number };
  uBandBoost: { value: number };
};

/**
 * Split rendering: above-water dry leather vs underwater blue-green absorption.
 * Uses onBeforeCompile world-Y test against live waterline (updated each frame).
 */
export function applyLeviathanWaterlineSplit(root: THREE.Object3D): void {
  const list: WaterlineUniforms[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (!std.isMeshStandardMaterial && !(std as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) {
        continue;
      }
      if (std.userData.__waterlineShader) continue;

      const uniforms: WaterlineUniforms = {
        uWaterY: { value: 0 },
        uUnderTint: { value: new THREE.Color(0x0c4a62) },
        uUnderDark: { value: 0.48 },
        uBandBoost: { value: 0.42 },
      };
      list.push(uniforms);
      std.userData.__waterlineShader = true;
      std.userData.__waterlineUniforms = uniforms;

      const prev = std.onBeforeCompile;
      std.onBeforeCompile = (shader, renderer) => {
        prev?.(shader, renderer);
        shader.uniforms.uWaterY = uniforms.uWaterY;
        shader.uniforms.uUnderTint = uniforms.uUnderTint;
        shader.uniforms.uUnderDark = uniforms.uUnderDark;
        shader.uniforms.uBandBoost = uniforms.uBandBoost;

        shader.vertexShader =
          'varying float vCinemaWorldY;\n' +
          shader.vertexShader.replace(
            '#include <project_vertex>',
            `
            vec4 cinemaWorldPos = modelMatrix * vec4( transformed, 1.0 );
            vCinemaWorldY = cinemaWorldPos.y;
            #include <project_vertex>
            `,
          );

        shader.fragmentShader =
          `
          varying float vCinemaWorldY;
          uniform float uWaterY;
          uniform vec3 uUnderTint;
          uniform float uUnderDark;
          uniform float uBandBoost;
          ` +
          shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `
            // under = 1 fully below waterline, 0 fully above
            float under = smoothstep(uWaterY + 0.22, uWaterY - 0.55, vCinemaWorldY);
            // underwater: cool absorption + darker (Beer-ish)
            vec3 dry = gl_FragColor.rgb;
            vec3 wet = dry * uUnderTint * uUnderDark;
            // deeper = darker
            float depth = clamp((uWaterY - vCinemaWorldY) * 0.12, 0.0, 1.0);
            wet *= (1.0 - depth * 0.45);
            gl_FragColor.rgb = mix(dry, wet, under);
            // bright waterline foam / sheen band
            float band = exp(-abs(vCinemaWorldY - uWaterY) * 3.5);
            gl_FragColor.rgb += vec3(0.18, 0.32, 0.38) * band * uBandBoost * (0.55 + 0.45 * (1.0 - under));
            // slight caustic flicker underwater
            float caust = sin(vCinemaWorldY * 2.4 + uWaterY * 3.0) * 0.5 + 0.5;
            gl_FragColor.rgb += vec3(0.02, 0.06, 0.08) * caust * under * 0.35;
            #include <dithering_fragment>
            `,
          );
      };
      std.needsUpdate = true;
      // Force recompile
      std.customProgramCacheKey = () => 'cinema_levi_waterline_v1';
    }
  });
  root.userData.__waterlineUniformList = list;
}

/** Push live ocean surface Y into leviathan waterline shader uniforms. */
export function updateLeviathanWaterlineUniforms(
  root: THREE.Object3D | null,
  waterY: number,
  storm = 0.5,
): void {
  if (!root) return;
  const list = root.userData.__waterlineUniformList as WaterlineUniforms[] | undefined;
  if (!list?.length) return;
  for (const u of list) {
    u.uWaterY.value = waterY;
    u.uUnderDark.value = 0.42 + storm * 0.12;
    u.uBandBoost.value = 0.35 + storm * 0.25;
  }
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
    const n = Math.floor(56 * intensity);
    for (let i = 0; i < n; i++) this.spawn(at, 'rise');
  }

  /**
   * Wave crash — wide low fan of foam when body slaps / shoulders through the surface.
   * Call on surface / breach / dive crossings.
   */
  burstWaveCrash(at: THREE.Vector3, intensity = 1, forward?: THREE.Vector3): void {
    const n = Math.floor(72 * intensity);
    for (let i = 0; i < n; i++) this.spawn(at, 'crash', forward);
  }

  /** Fine mist spray along flanks / ship bow (ongoing chop). */
  burstSpray(at: THREE.Vector3, intensity = 1): void {
    const n = Math.floor(28 * intensity);
    for (let i = 0; i < n; i++) this.spawn(at, 'spray');
  }

  /** Continuous body wash / ocean chop / crash / spray. */
  private spawn(
    at: THREE.Vector3,
    mode: 'rise' | 'cascade' | 'ocean' | 'crash' | 'spray',
    forward?: THREE.Vector3,
  ): void {
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
      mode === 'rise'
        ? 3.5
        : mode === 'cascade'
          ? 2.2
          : mode === 'crash'
            ? 7.5
            : mode === 'spray'
              ? 2.8
              : 4.0;
    p.x = at.x + (Math.random() - 0.5) * spread;
    p.y =
      at.y +
      (mode === 'rise'
        ? Math.random() * 0.4
        : mode === 'crash'
          ? Math.random() * 0.25
          : mode === 'spray'
            ? Math.random() * 0.6
            : Math.random() * 1.2);
    p.z = at.z + (Math.random() - 0.5) * spread;
    const ang = Math.random() * Math.PI * 2;
    let speed =
      mode === 'rise'
        ? 4 + Math.random() * 10
        : mode === 'cascade'
          ? 1.2 + Math.random() * 3.5
          : mode === 'crash'
            ? 5 + Math.random() * 12
            : mode === 'spray'
              ? 3 + Math.random() * 7
              : 2 + Math.random() * 5;
    p.vx = Math.cos(ang) * speed * (mode === 'ocean' || mode === 'crash' ? 1.15 : 0.7);
    p.vy =
      mode === 'rise'
        ? 6 + Math.random() * 12
        : mode === 'cascade'
          ? 0.5 + Math.random() * 2.5
          : mode === 'crash'
            ? 3 + Math.random() * 9
            : mode === 'spray'
              ? 4 + Math.random() * 8
              : 2 + Math.random() * 5;
    p.vz = Math.sin(ang) * speed * (mode === 'ocean' || mode === 'crash' ? 1.15 : 0.7);
    // Bias crash/spray along body forward for “bow wave” read
    if (forward && (mode === 'crash' || mode === 'spray')) {
      const fl = Math.hypot(forward.x, forward.z) || 1;
      const fx = forward.x / fl;
      const fz = forward.z / fl;
      p.vx += fx * speed * 0.55;
      p.vz += fz * speed * 0.55;
    }
    p.maxLife =
      mode === 'rise'
        ? 0.75 + Math.random() * 0.7
        : mode === 'crash'
          ? 0.85 + Math.random() * 0.65
          : mode === 'spray'
            ? 0.35 + Math.random() * 0.4
            : 0.4 + Math.random() * 0.55;
    p.life = p.maxLife;
    p.size =
      mode === 'rise'
        ? 0.7 + Math.random() * 1.5
        : mode === 'crash'
          ? 0.9 + Math.random() * 1.8
          : mode === 'spray'
            ? 0.18 + Math.random() * 0.45
            : 0.25 + Math.random() * 0.7;
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
    /** Optional body forward (world XZ) for bow-wave bias */
    forward?: THREE.Vector3,
    /** Horizontal speed proxy for spray volume */
    speedMps = 0,
  ): void {
    this.riseBurstCd = Math.max(0, this.riseBurstCd - dt);

    if (active) {
      const waterline = leviPos.clone();
      waterline.y = Math.max(0.05, Math.min(leviPos.y * 0.12, 1.2));

      // Rise / breach: big plume + wave crash fan
      if (
        this.lastSurfaceBias < 1.5 &&
        surfaceBias >= 2.5 &&
        this.riseBurstCd <= 0
      ) {
        this.burstRise(waterline, 1.4 + storm * 0.7);
        this.burstWaveCrash(waterline, 1.3 + storm * 0.5, forward);
        this.riseBurstCd = 1.5;
      }
      // Dive: reverse crash (body slamming water)
      if (
        this.lastSurfaceBias > 2 &&
        surfaceBias < 0 &&
        this.riseBurstCd <= 0
      ) {
        this.burstWaveCrash(waterline, 1.1 + storm * 0.4, forward);
        this.burstSpray(waterline, 1.2);
        this.riseBurstCd = 1.2;
      }
      // Continuous cascade + spray while body crosses waterline
      if (surfaceBias > -2 && surfaceBias < 7) {
        this.emitAcc +=
          dt *
          (22 +
            storm * 28 +
            Math.max(0, surfaceBias) * 10 +
            Math.min(18, speedMps * 2.5));
        while (this.emitAcc >= 1) {
          this.emitAcc -= 1;
          const at = leviPos.clone();
          at.y = Math.max(0.05, Math.min(leviPos.y * 0.4, 2.5));
          at.x += (Math.random() - 0.5) * 7;
          at.z += (Math.random() - 0.5) * 7;
          if (surfaceBias > 1.2 && Math.random() < 0.35) {
            this.spawn(at, 'spray', forward);
          } else if (surfaceBias > 1.5) {
            this.spawn(at, 'cascade', forward);
          } else {
            this.spawn(at, 'ocean', forward);
          }
        }
      }
      // Extra ocean wash when high storm + surfaced
      if (surfaceBias > 1 && storm > 0.45) {
        this.emitAcc += dt * storm * 16;
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
 * Positive = more of the body above water — enforceLeviathanSubmerge still keeps ≥20% under.
 */
export function surfaceBiasFromLeviAt(leviAt: string): number {
  if (leviAt.includes('hidden') || leviAt.includes('gone')) return -12;
  if (leviAt.includes('swim') || leviAt.includes('dive')) return -4;
  // Surface / fight — less “fly out” so belly stays wet before shader + enforce
  if (leviAt.includes('surface') || leviAt.includes('cast') || leviAt.includes('beam')) return 2.2;
  if (leviAt.includes('rise') || leviAt.includes('breach')) return 3.8;
  if (leviAt.includes('watch') || leviAt.includes('finisher')) return 2.0;
  return 1.5;
}

/**
 * Animated rogue-wave wall — approaches the brig, curls, crashes.
 * SI metres. One mesh + foam strip. Cinema sole owner of ocean crash read.
 */
export class CinemaRogueWave {
  readonly root = new THREE.Group();
  readonly crest = new THREE.Vector3();
  readonly dir = new THREE.Vector3(1, 0, 0);
  intensity = 0;
  crashed = false;
  private mesh: THREE.Mesh;
  private foam: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private foamMat: THREE.MeshBasicMaterial;
  private uTime = { value: 0 };
  private uHeight = { value: 0 };
  private uCurl = { value: 0 };
  private approach = 0;
  private height = 0;
  private target: THREE.Vector3 = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.root.name = 'cinema_rogue_wave';
    const geo = new THREE.PlaneGeometry(88, 28, 72, 24);
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: this.uTime,
        uHeight: this.uHeight,
        uCurl: this.uCurl,
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uHeight;
        uniform float uCurl;
        varying float vCrest;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          float across = uv.x;
          float up = uv.y;
          float wall = smoothstep(0.08, 0.55, up) * (1.0 - smoothstep(0.72, 1.0, up));
          float ridge = exp(-pow((up - 0.62) * 5.2, 2.0));
          float chop = sin(across * 18.0 + uTime * 3.4) * 0.35
            + sin(across * 9.0 - uTime * 2.1) * 0.55;
          p.z += wall * uHeight + ridge * uHeight * 0.55 + chop;
          p.y += ridge * uHeight * 0.22 * uCurl;
          p.x += sin(up * 6.0 + uTime) * uCurl * 0.8;
          vCrest = ridge * uHeight;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uHeight;
        varying float vCrest;
        varying vec2 vUv;
        void main() {
          float foam = smoothstep(0.35, 1.4, vCrest) * smoothstep(0.45, 0.78, vUv.y);
          vec3 deep = vec3(0.04, 0.12, 0.18);
          vec3 mid = vec3(0.08, 0.28, 0.36);
          vec3 white = vec3(0.86, 0.93, 0.98);
          vec3 col = mix(deep, mid, vUv.y);
          col = mix(col, white, foam);
          float alpha = 0.28 + foam * 0.55 + clamp(uHeight / 16.0, 0.0, 0.25);
          alpha *= smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y));
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.foamMat = new THREE.MeshBasicMaterial({
      color: 0xd8eef8,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.foam = new THREE.Mesh(new THREE.PlaneGeometry(90, 6, 24, 2), this.foamMat);
    this.foam.rotation.x = -Math.PI * 0.42;
    this.foam.position.y = 8;
    this.foam.frustumCulled = false;
    this.root.add(this.mesh, this.foam);
    this.root.visible = false;
    scene.add(this.root);
  }

  setTarget(ship: THREE.Vector3, from: THREE.Vector3): void {
    this.target.copy(ship);
    this.dir.copy(ship).sub(from);
    this.dir.y = 0;
    if (this.dir.lengthSq() < 1e-4) this.dir.set(1, 0, 0);
    else this.dir.normalize();
  }

  setIntensity(n: number): void {
    this.intensity = THREE.MathUtils.clamp(n, 0, 1);
    if (this.intensity > 0.08) this.root.visible = true;
  }

  /** World point on the breaking face — hero rides this. */
  sampleCrest(out = this.crest): THREE.Vector3 {
    return out.copy(this.crest);
  }

  /** Impulse applied to hull chunks + bodies at crash. */
  impulse(): THREE.Vector3 {
    const h = Math.max(this.height, 4);
    return this.dir.clone().multiplyScalar(8 + h * 0.55).setY(4.5 + h * 0.18);
  }

  tick(dt: number, ship: THREE.Vector3, waterY: number): void {
    const want = this.intensity;
    this.approach = THREE.MathUtils.damp(this.approach, want, want > 0.5 ? 2.4 : 1.4, dt);
    this.height = THREE.MathUtils.damp(this.height, want * 16.5, 2.0, dt);
    this.uTime.value += dt;
    this.uHeight.value = this.height;
    this.uCurl.value = THREE.MathUtils.smoothstep(this.approach, 0.35, 1) * this.approach;

    if (want > 0.45 && !this.crashed && this.approach > 0.72) this.crashed = true;

    const standoff = THREE.MathUtils.lerp(42, 6, this.approach);
    const px = ship.x - this.dir.x * standoff;
    const pz = ship.z - this.dir.z * standoff;
    const py = waterY + this.height * 0.42;
    this.root.position.set(px, py, pz);
    this.root.rotation.set(0, Math.atan2(this.dir.x, this.dir.z), 0);
    this.foam.position.y = 6 + this.height * 0.28;
    this.foamMat.opacity = 0.2 + this.approach * 0.55;
    this.root.visible = this.approach > 0.04 || this.height > 0.4;

    this.crest.set(
      ship.x - this.dir.x * Math.max(2, standoff - 4),
      waterY + Math.max(1.2, this.height * 0.55),
      ship.z - this.dir.z * Math.max(2, standoff - 4),
    );
  }

  dispose(): void {
    this.root.parent?.remove(this.root);
    this.mesh.geometry.dispose();
    this.foam.geometry.dispose();
    this.mat.dispose();
    this.foamMat.dispose();
  }
}

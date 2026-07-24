/**
 * CodepenParticleFx — production port of MolochDaGod CodePen KwaNNap
 * ("Three.js smoke, fire, trace, steam")
 *
 * Source: https://codepen.io/MolochDaGod/pen/KwaNNap
 *
 * Brings consistent:
 *   • volumetric smoke plumes (cone emitters, wind, color lerp, scale growth)
 *   • fire/ember emitters (additive blend path)
 *   • steam (pale low-opacity smoke)
 *   • trail / beam "trace" sprites (oriented quads along velocity / axis)
 *   • barrel / muzzle puffs (tight radius, short life, bright→dark)
 *
 * Uses procedural soft sprites (no external CDN) so Warlords / Foundry /
 * island3d all share one look without asset deps.
 */
import * as THREE from 'three';

// ── Textures (procedural stand-ins for pen's smoke/fire/spark PNGs) ─────────

function makeSoftTexture(
  size: number,
  stops: Array<{ t: number; c: string }>,
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const s of stops) g.addColorStop(s.t, s.c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let _texSmoke: THREE.Texture | null = null;
let _texFire: THREE.Texture | null = null;
let _texSpark: THREE.Texture | null = null;

function texSmoke(): THREE.Texture {
  if (!_texSmoke) {
    _texSmoke = makeSoftTexture(64, [
      { t: 0, c: 'rgba(255,255,255,0.95)' },
      { t: 0.25, c: 'rgba(220,220,220,0.55)' },
      { t: 0.55, c: 'rgba(160,160,160,0.18)' },
      { t: 1, c: 'rgba(0,0,0,0)' },
    ]);
  }
  return _texSmoke;
}
function texFire(): THREE.Texture {
  if (!_texFire) {
    _texFire = makeSoftTexture(64, [
      { t: 0, c: 'rgba(255,255,240,1)' },
      { t: 0.2, c: 'rgba(255,200,40,0.9)' },
      { t: 0.5, c: 'rgba(255,80,0,0.45)' },
      { t: 0.85, c: 'rgba(80,0,0,0.08)' },
      { t: 1, c: 'rgba(0,0,0,0)' },
    ]);
  }
  return _texFire;
}
function texSpark(): THREE.Texture {
  if (!_texSpark) {
    _texSpark = makeSoftTexture(32, [
      { t: 0, c: 'rgba(255,255,255,1)' },
      { t: 0.3, c: 'rgba(255,255,255,0.7)' },
      { t: 0.7, c: 'rgba(200,220,255,0.15)' },
      { t: 1, c: 'rgba(0,0,0,0)' },
    ]);
  }
  return _texSpark;
}

// ── Emitter config (mirrors pen particles_emmiter fields) ─────────────────

export type CodepenTextureId = 'smoke' | 'fire' | 'spark';

export interface CodepenEmitterConfig {
  /** Spawn origin (world or local if attachTo) */
  position: THREE.Vector3;
  /** Inner spawn disc radius */
  radius1: number;
  /** Outer cone radius at height */
  radius2: number;
  /** Cone height used for direction */
  radiusHeight: number;
  /** Seconds between spawn ticks */
  addTime: number;
  liveTimeFrom: number;
  liveTimeTo: number;
  opacityDecrease: number;
  rotationFrom: number;
  rotationTo: number;
  speedFrom: number;
  speedTo: number;
  scaleFrom: number;
  scaleIncrease: number;
  colorFrom: [number, number, number];
  colorTo: [number, number, number];
  colorSpeedFrom: number;
  colorSpeedTo: number;
  brightnessFrom: number;
  brightnessTo: number;
  opacity: number;
  blend: number;
  texture: CodepenTextureId;
  /** Optional wind bias (pen wind_x/y/z) */
  wind?: THREE.Vector3;
  maxParticles?: number;
}

/** Presets matching the five emitters in the CodePen demo + barrel/steam/trail helpers. */
export const CODEPEN_FX_PRESETS = {
  /** Pen emitter[0] — bright fire plume */
  fire_plume: {
    radius1: 0.02,
    radius2: 1,
    radiusHeight: 5,
    addTime: 0.1,
    liveTimeFrom: 7,
    liveTimeTo: 7.5,
    opacityDecrease: 0.008,
    rotationFrom: 0.5,
    rotationTo: 1,
    speedFrom: 0.005,
    speedTo: 0.01,
    scaleFrom: 0.2,
    scaleIncrease: 0.004,
    colorFrom: [2, 2, 2] as [number, number, number],
    colorTo: [0, 0, 0] as [number, number, number],
    colorSpeedFrom: 0.4,
    colorSpeedTo: 0.4,
    brightnessFrom: 1,
    brightnessTo: 1,
    opacity: 1,
    blend: 0.8,
    texture: 'fire' as CodepenTextureId,
  },
  /** Pen emitter[1] — dark smoke column */
  smoke_column: {
    radius1: 0.02,
    radius2: 1,
    radiusHeight: 5,
    addTime: 0.1,
    liveTimeFrom: 10,
    liveTimeTo: 10.5,
    opacityDecrease: 0.008,
    rotationFrom: 0.5,
    rotationTo: 1,
    speedFrom: 0.005,
    speedTo: 0.01,
    scaleFrom: 0.2,
    scaleIncrease: 0.004,
    colorFrom: [0.1, 0.1, 0.1] as [number, number, number],
    colorTo: [0.1, 0.1, 0.1] as [number, number, number],
    colorSpeedFrom: 1,
    colorSpeedTo: 1,
    brightnessFrom: 1,
    brightnessTo: 1,
    opacity: 1,
    blend: 1,
    texture: 'smoke' as CodepenTextureId,
  },
  /** Pen emitter[2] — thin steam */
  steam: {
    radius1: 0.02,
    radius2: 0.4,
    radiusHeight: 5,
    addTime: 0.1,
    liveTimeFrom: 4,
    liveTimeTo: 4.5,
    opacityDecrease: 0.004,
    rotationFrom: 2,
    rotationTo: 3,
    speedFrom: 0.005,
    speedTo: 0.01,
    scaleFrom: 0.1,
    scaleIncrease: 0.003,
    colorFrom: [1, 1, 1] as [number, number, number],
    colorTo: [1, 1, 1] as [number, number, number],
    colorSpeedFrom: 1,
    colorSpeedTo: 1,
    brightnessFrom: 1,
    brightnessTo: 1,
    opacity: 0.4,
    blend: 0.5,
    texture: 'smoke' as CodepenTextureId,
  },
  /** Pen emitter[3] — wide ambient haze */
  ambient_haze: {
    radius1: 2,
    radius2: 2,
    radiusHeight: 5,
    addTime: 0.1,
    liveTimeFrom: 1,
    liveTimeTo: 1.5,
    opacityDecrease: 0.004,
    rotationFrom: 2,
    rotationTo: 3,
    speedFrom: 0.005,
    speedTo: 0.01,
    scaleFrom: 0,
    scaleIncrease: 0.003,
    colorFrom: [1, 2, 1] as [number, number, number],
    colorTo: [1, 1, 2] as [number, number, number],
    colorSpeedFrom: 1,
    colorSpeedTo: 1,
    brightnessFrom: 1,
    brightnessTo: 1,
    opacity: 0.4,
    blend: 0.7,
    texture: 'smoke' as CodepenTextureId,
  },
  /**
   * Cannon / gun barrel muzzle — tight throat, short bright→dark puffs.
   * Use at cannon muzzle or gun barrel tip.
   */
  barrel_muzzle: {
    radius1: 0.01,
    radius2: 0.35,
    radiusHeight: 2.2,
    addTime: 0.02,
    liveTimeFrom: 0.35,
    liveTimeTo: 0.7,
    opacityDecrease: 0.04,
    rotationFrom: 1,
    rotationTo: 3,
    speedFrom: 0.02,
    speedTo: 0.05,
    scaleFrom: 0.08,
    scaleIncrease: 0.012,
    colorFrom: [2.2, 1.8, 0.9] as [number, number, number],
    colorTo: [0.15, 0.12, 0.1] as [number, number, number],
    colorSpeedFrom: 2.5,
    colorSpeedTo: 3.5,
    brightnessFrom: 1.2,
    brightnessTo: 1.6,
    opacity: 1,
    blend: 0.85,
    texture: 'fire' as CodepenTextureId,
  },
  /** Gun smoke hang after shot */
  barrel_smoke: {
    radius1: 0.02,
    radius2: 0.5,
    radiusHeight: 1.5,
    addTime: 0.04,
    liveTimeFrom: 1.2,
    liveTimeTo: 2.0,
    opacityDecrease: 0.01,
    rotationFrom: 0.3,
    rotationTo: 1,
    speedFrom: 0.004,
    speedTo: 0.012,
    scaleFrom: 0.15,
    scaleIncrease: 0.006,
    colorFrom: [0.35, 0.35, 0.35] as [number, number, number],
    colorTo: [0.08, 0.08, 0.08] as [number, number, number],
    colorSpeedFrom: 0.8,
    colorSpeedTo: 1.2,
    brightnessFrom: 1,
    brightnessTo: 1,
    opacity: 0.85,
    blend: 0.9,
    texture: 'smoke' as CodepenTextureId,
  },
  /** Fast dash / slash trail sparklets */
  trail_sparks: {
    radius1: 0.0,
    radius2: 0.15,
    radiusHeight: 0.4,
    addTime: 0.02,
    liveTimeFrom: 0.2,
    liveTimeTo: 0.45,
    opacityDecrease: 0.06,
    rotationFrom: 2,
    rotationTo: 5,
    speedFrom: 0.01,
    speedTo: 0.03,
    scaleFrom: 0.06,
    scaleIncrease: 0.004,
    colorFrom: [1.5, 1.8, 2.2] as [number, number, number],
    colorTo: [0.2, 0.3, 0.6] as [number, number, number],
    colorSpeedFrom: 3,
    colorSpeedTo: 4,
    brightnessFrom: 1,
    brightnessTo: 1.4,
    opacity: 1,
    blend: 0.7,
    texture: 'spark' as CodepenTextureId,
  },
} as const;

export type CodepenPresetId = keyof typeof CODEPEN_FX_PRESETS;

// ── Particle + emitter runtime ────────────────────────────────────────────

interface SmokeParticle {
  offset: [number, number, number];
  scale: [number, number];
  /** velocity xyz; w unused (pen used quaternion.w==3 for billboard mode) */
  vel: [number, number, number];
  rotation: number;
  color: [number, number, number, number];
  blend: number;
  texture: CodepenTextureId;
  live: number;
  scaleIncrease: number;
  opacityDecrease: number;
  colorFrom: [number, number, number];
  colorTo: [number, number, number];
  colorSpeed: number;
  colorPr: number;
}

interface TrailSprite {
  offset: THREE.Vector3;
  /** Axis / direction for trail orientation */
  axis: THREE.Vector3;
  scale: [number, number];
  color: [number, number, number, number];
  life: number;
  maxLife: number;
  mesh: THREE.Mesh;
}

export interface CodepenEmitterHandle {
  root: THREE.Group;
  config: CodepenEmitterConfig;
  active: boolean;
  setPosition: (p: THREE.Vector3) => void;
  setDirection: (dir: THREE.Vector3) => void;
  start: () => void;
  stop: () => void;
  /** One-shot: emit N particles immediately (muzzle flash) */
  burst: (count?: number) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

const TEX_INDEX: Record<CodepenTextureId, number> = {
  smoke: 0,
  fire: 1,
  spark: 2,
};

/**
 * Create a CodePen-style smoke/fire/steam emitter.
 * Particles are Points with soft sprites; trails use separate oriented planes.
 */
export function createCodepenEmitter(
  scene: THREE.Object3D,
  partial: Partial<CodepenEmitterConfig> & { position: THREE.Vector3 },
  opts?: {
    attachTo?: THREE.Object3D;
    localOffset?: THREE.Vector3;
    /** World-space emit direction (barrel forward). Defaults to +Y cone. */
    direction?: THREE.Vector3;
  },
): CodepenEmitterHandle {
  const presetBase = CODEPEN_FX_PRESETS.smoke_column;
  const config: CodepenEmitterConfig = {
    position: partial.position.clone(),
    radius1: partial.radius1 ?? presetBase.radius1,
    radius2: partial.radius2 ?? presetBase.radius2,
    radiusHeight: partial.radiusHeight ?? presetBase.radiusHeight,
    addTime: partial.addTime ?? presetBase.addTime,
    liveTimeFrom: partial.liveTimeFrom ?? presetBase.liveTimeFrom,
    liveTimeTo: partial.liveTimeTo ?? presetBase.liveTimeTo,
    opacityDecrease: partial.opacityDecrease ?? presetBase.opacityDecrease,
    rotationFrom: partial.rotationFrom ?? presetBase.rotationFrom,
    rotationTo: partial.rotationTo ?? presetBase.rotationTo,
    speedFrom: partial.speedFrom ?? presetBase.speedFrom,
    speedTo: partial.speedTo ?? presetBase.speedTo,
    scaleFrom: partial.scaleFrom ?? presetBase.scaleFrom,
    scaleIncrease: partial.scaleIncrease ?? presetBase.scaleIncrease,
    colorFrom: partial.colorFrom ?? [...presetBase.colorFrom],
    colorTo: partial.colorTo ?? [...presetBase.colorTo],
    colorSpeedFrom: partial.colorSpeedFrom ?? presetBase.colorSpeedFrom,
    colorSpeedTo: partial.colorSpeedTo ?? presetBase.colorSpeedTo,
    brightnessFrom: partial.brightnessFrom ?? presetBase.brightnessFrom,
    brightnessTo: partial.brightnessTo ?? presetBase.brightnessTo,
    opacity: partial.opacity ?? presetBase.opacity,
    blend: partial.blend ?? presetBase.blend,
    texture: partial.texture ?? presetBase.texture,
    wind: partial.wind?.clone() ?? new THREE.Vector3(0.002, 0, 0),
    maxParticles: partial.maxParticles ?? 180,
  };

  const root = new THREE.Group();
  root.name = `codepen_fx_${config.texture}`;
  scene.add(root);

  const maxP = config.maxParticles!;
  const positions = new Float32Array(maxP * 3);
  const colors = new Float32Array(maxP * 3);
  const sizes = new Float32Array(maxP);
  const alphas = new Float32Array(maxP);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

  const map =
    config.texture === 'fire' ? texFire() : config.texture === 'spark' ? texSpark() : texSmoke();

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uScale: { value: 320 },
    },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute float alpha;
      attribute vec3 color;
      varying float vAlpha;
      varying vec3 vColor;
      uniform float uScale;
      void main() {
        vAlpha = alpha;
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (uScale / max(0.1, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        float a = tex.a * vAlpha;
        if (a < 0.02) discard;
        // Premultiply like pen fragment (rgb *= a)
        vec3 rgb = vColor * tex.rgb * a;
        gl_FragColor = vec4(rgb, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending:
      config.texture === 'fire' || config.texture === 'spark'
        ? THREE.AdditiveBlending
        : THREE.NormalBlending,
    toneMapped: false,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 12;
  root.add(points);

  const particles: SmokeParticle[] = [];
  let elapsed = 0;
  let active = true;
  const origin = config.position.clone();
  const localOffset = opts?.localOffset?.clone() ?? new THREE.Vector3();
  const emitDir = (opts?.direction?.clone() ?? new THREE.Vector3(0, 1, 0)).normalize();
  const wind = config.wind!.clone();
  // Scale pen's tiny speed units (~0.005) into SI m/s for game world
  const SPEED_SCALE = 40;

  function emitOne(): void {
    if (particles.length >= maxP) {
      // drop oldest
      particles.shift();
    }
    const r1 = config.radius1 * Math.sqrt(Math.random());
    const th1 = 2 * Math.PI * Math.random();
    const x1 = origin.x + localOffset.x + r1 * Math.cos(th1);
    const z1 = origin.z + localOffset.z + r1 * Math.sin(th1);
    const y1 = origin.y + localOffset.y;

    const r2 = config.radius2 * Math.sqrt(Math.random());
    const th2 = 2 * Math.PI * Math.random();
    // Cone toward emitDir (pen default +Y height)
    const up = emitDir;
    const tmp = Math.abs(up.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(up, tmp).normalize();
    const forward = new THREE.Vector3().crossVectors(right, up).normalize();
    const tip = new THREE.Vector3(
      x1 + right.x * r2 * Math.cos(th2) + forward.x * r2 * Math.sin(th2),
      y1 + up.y * config.radiusHeight,
      z1 + right.z * r2 * Math.cos(th2) + forward.z * r2 * Math.sin(th2),
    );
    // Also offset tip laterally
    tip.x += right.x * r2 * Math.cos(th2) * 0.15;
    tip.z += forward.z * r2 * Math.sin(th2) * 0.15;

    let dx = tip.x - x1;
    let dy = tip.y - y1;
    let dz = tip.z - z1;
    const speed =
      (Math.random() * (config.speedTo - config.speedFrom) + config.speedFrom) * SPEED_SCALE;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const inv = (1 / len) * speed;
    dx *= inv;
    dy *= inv;
    dz *= inv;

    const brightness =
      Math.random() * (config.brightnessTo - config.brightnessFrom) + config.brightnessFrom;

    particles.push({
      offset: [x1, y1, z1],
      scale: [config.scaleFrom, config.scaleFrom],
      vel: [dx, dy, dz],
      rotation: Math.random() * (config.rotationTo - config.rotationFrom) + config.rotationFrom,
      color: [1, 1, 1, config.opacity],
      blend: config.blend,
      texture: config.texture,
      live: Math.random() * (config.liveTimeTo - config.liveTimeFrom) + config.liveTimeFrom,
      scaleIncrease: config.scaleIncrease * SPEED_SCALE * 0.25,
      opacityDecrease: config.opacityDecrease * 60, // pen used per-frame-ish values
      colorFrom: [
        config.colorFrom[0] * brightness,
        config.colorFrom[1] * brightness,
        config.colorFrom[2] * brightness,
      ],
      colorTo: [
        config.colorTo[0] * brightness,
        config.colorTo[1] * brightness,
        config.colorTo[2] * brightness,
      ],
      colorSpeed: Math.random() * (config.colorSpeedTo - config.colorSpeedFrom) + config.colorSpeedFrom,
      colorPr: 0,
    });
  }

  const handle: CodepenEmitterHandle = {
    root,
    config,
    get active() {
      return active;
    },
    setPosition(p) {
      origin.copy(p);
      config.position.copy(p);
    },
    setDirection(dir) {
      emitDir.copy(dir).normalize();
    },
    start() {
      active = true;
    },
    stop() {
      active = false;
    },
    burst(count = 12) {
      for (let i = 0; i < count; i++) emitOne();
    },
    update(dt) {
      if (opts?.attachTo) {
        opts.attachTo.getWorldPosition(origin);
        origin.add(localOffset);
      }

      if (active && config.addTime > 0) {
        elapsed += dt;
        let add = Math.floor(elapsed / config.addTime);
        elapsed -= add * config.addTime;
        // Cap spawn storm on long frames (same idea as pen)
        if (add > 8) add = 8;
        while (add--) emitOne();
      }

      const alive: SmokeParticle[] = [];
      for (const item of particles) {
        // Color lerp (pen path)
        if (item.colorPr < 1) {
          const t = item.colorPr;
          item.color[0] = item.colorFrom[0] + (item.colorTo[0] - item.colorFrom[0]) * t;
          item.color[1] = item.colorFrom[1] + (item.colorTo[1] - item.colorFrom[1]) * t;
          item.color[2] = item.colorFrom[2] + (item.colorTo[2] - item.colorFrom[2]) * t;
          item.colorPr += dt * item.colorSpeed;
        } else {
          item.color[0] = item.colorTo[0];
          item.color[1] = item.colorTo[1];
          item.color[2] = item.colorTo[2];
        }

        item.offset[0] += item.vel[0] * dt + wind.x * 60 * dt;
        item.offset[1] += item.vel[1] * dt + wind.y * 60 * dt;
        item.offset[2] += item.vel[2] * dt + wind.z * 60 * dt;
        item.scale[0] += item.scaleIncrease * dt;
        item.scale[1] += item.scaleIncrease * dt;

        if (item.live > 0) {
          item.live -= dt;
        } else {
          item.color[3] -= item.opacityDecrease * dt;
        }
        if (item.color[3] > 0.02) alive.push(item);
      }
      particles.length = 0;
      particles.push(...alive);

      // Upload to GPU
      for (let i = 0; i < maxP; i++) {
        const p = particles[i];
        if (!p) {
          positions[i * 3 + 1] = -9999;
          sizes[i] = 0;
          alphas[i] = 0;
          continue;
        }
        positions[i * 3] = p.offset[0];
        positions[i * 3 + 1] = p.offset[1];
        positions[i * 3 + 2] = p.offset[2];
        // Pen uses HDR-ish color values > 1 for glow; clamp soft for LDR
        colors[i * 3] = Math.min(p.color[0], 3) / 2;
        colors[i * 3 + 1] = Math.min(p.color[1], 3) / 2;
        colors[i * 3 + 2] = Math.min(p.color[2], 3) / 2;
        sizes[i] = Math.max(0.05, p.scale[0] * 2.5);
        alphas[i] = Math.min(1, p.color[3] * p.blend);
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      geometry.attributes.size.needsUpdate = true;
      geometry.attributes.alpha.needsUpdate = true;
      geometry.setDrawRange(0, Math.min(particles.length, maxP));
    },
    dispose() {
      root.parent?.remove(root);
      geometry.dispose();
      material.dispose();
      particles.length = 0;
    },
  };

  void TEX_INDEX; // reserved if we multi-atlas later
  return handle;
}

/** Factory from named preset (CodePen + barrel/trail). */
export function createCodepenPresetEmitter(
  scene: THREE.Object3D,
  presetId: CodepenPresetId,
  position: THREE.Vector3,
  opts?: {
    attachTo?: THREE.Object3D;
    localOffset?: THREE.Vector3;
    direction?: THREE.Vector3;
  },
): CodepenEmitterHandle {
  const p = CODEPEN_FX_PRESETS[presetId];
  return createCodepenEmitter(
    scene,
    {
      position,
      ...p,
    },
    opts,
  );
}

/**
 * Oriented trail ribbon (pen TRACE / quaternion.w==6 style).
 * Spawns a short-lived stretched sprite along `direction`.
 */
export function spawnTrailRibbon(
  scene: THREE.Object3D,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  opts?: {
    length?: number;
    width?: number;
    color?: THREE.ColorRepresentation;
    life?: number;
    texture?: CodepenTextureId;
  },
): { update: (dt: number) => boolean; dispose: () => void } {
  const length = opts?.length ?? 1.2;
  const width = opts?.width ?? 0.12;
  const life = opts?.life ?? 0.35;
  const color = new THREE.Color(opts?.color ?? 0xaaccff);
  const map =
    opts?.texture === 'fire' ? texFire() : opts?.texture === 'smoke' ? texSmoke() : texSpark();

  const geo = new THREE.PlaneGeometry(width, length);
  const mat = new THREE.MeshBasicMaterial({
    map,
    color,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 14;

  const dir = direction.clone().normalize();
  const mid = origin.clone().addScaledVector(dir, length * 0.5);
  mesh.position.copy(mid);
  // Align plane Y to direction
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  mesh.quaternion.copy(quat);
  scene.add(mesh);

  let t = life;
  return {
    update(dt) {
      t -= dt;
      const k = Math.max(0, t / life);
      mat.opacity = 0.85 * k;
      mesh.scale.y = 0.6 + 0.4 * k;
      if (t <= 0) {
        this.dispose();
        return false;
      }
      return true;
    },
    dispose() {
      scene.remove(mesh);
      geo.dispose();
      mat.dispose();
    },
  };
}

export const CODEPEN_SOURCE = {
  pen: 'https://codepen.io/MolochDaGod/pen/KwaNNap',
  title: 'Three.js smoke, fire, trace, steam',
} as const;

/**
 * FireSmokeParticles — soft billboard fire / smoke (threejs-games particles style).
 *
 * Use cases:
 *   • Damaged / sinking boats — continuous fire + smoke
 *   • Fireplaces / campfires — warm fire + light smoke
 *   • Attack impacts — short fire burst
 *   • Teleports — smoke puff
 *   • Dash foot IK landing — dust/smoke at feet
 *
 * Soft circular sprites (canvas-generated), additive fire + alpha smoke,
 * rising velocity + fade + size growth. No external textures required.
 *
 * For CodePen-quality cone plumes, barrel muzzle, trails, and steam
 * (https://codepen.io/MolochDaGod/pen/KwaNNap), use CodepenParticleFx via
 * WorldFxBus.smokePlume / barrelMuzzle / spawnTrail / steamVent.
 */
import * as THREE from 'three';

export type FxPresetId =
  | 'fire'
  | 'smoke'
  | 'campfire'
  | 'boat_fire'
  | 'boat_smoke'
  | 'attack_burst'
  | 'teleport_smoke'
  | 'dash_foot';

export interface FxPreset {
  id: FxPresetId;
  mode: 'fire' | 'smoke';
  count: number;
  /** particles spawned per second when continuous */
  rate: number;
  life: [min: number, max: number];
  size: [min: number, max: number];
  speed: [min: number, max: number];
  spread: number;
  gravity: number;
  colorA: THREE.Color;
  colorB: THREE.Color;
  opacity: number;
  continuous: boolean;
}

export const FX_PRESETS: Record<FxPresetId, FxPreset> = {
  fire: {
    id: 'fire',
    mode: 'fire',
    count: 48,
    rate: 40,
    life: [0.35, 0.9],
    size: [0.25, 0.7],
    speed: [0.8, 2.2],
    spread: 0.35,
    gravity: 0.4,
    colorA: new THREE.Color(0xffaa22),
    colorB: new THREE.Color(0xff3300),
    opacity: 0.95,
    continuous: true,
  },
  smoke: {
    id: 'smoke',
    mode: 'smoke',
    count: 40,
    rate: 18,
    life: [1.2, 2.8],
    size: [0.4, 1.4],
    speed: [0.3, 1.0],
    spread: 0.45,
    gravity: 0.15,
    colorA: new THREE.Color(0x555555),
    colorB: new THREE.Color(0x222222),
    opacity: 0.45,
    continuous: true,
  },
  campfire: {
    id: 'campfire',
    mode: 'fire',
    count: 36,
    rate: 28,
    life: [0.4, 1.0],
    size: [0.2, 0.55],
    speed: [0.6, 1.6],
    spread: 0.22,
    gravity: 0.35,
    colorA: new THREE.Color(0xffcc44),
    colorB: new THREE.Color(0xff4400),
    opacity: 0.9,
    continuous: true,
  },
  boat_fire: {
    id: 'boat_fire',
    mode: 'fire',
    count: 64,
    rate: 50,
    life: [0.5, 1.2],
    size: [0.35, 1.0],
    speed: [0.9, 2.4],
    spread: 0.55,
    gravity: 0.5,
    colorA: new THREE.Color(0xffbb33),
    colorB: new THREE.Color(0xdd2200),
    opacity: 0.92,
    continuous: true,
  },
  boat_smoke: {
    id: 'boat_smoke',
    mode: 'smoke',
    count: 56,
    rate: 22,
    life: [1.5, 3.5],
    size: [0.6, 2.0],
    speed: [0.4, 1.2],
    spread: 0.7,
    gravity: 0.12,
    colorA: new THREE.Color(0x666666),
    colorB: new THREE.Color(0x1a1a1a),
    opacity: 0.4,
    continuous: true,
  },
  attack_burst: {
    id: 'attack_burst',
    mode: 'fire',
    count: 28,
    rate: 0,
    life: [0.2, 0.55],
    size: [0.15, 0.45],
    speed: [1.5, 4.0],
    spread: 0.8,
    gravity: 1.2,
    colorA: new THREE.Color(0xffee88),
    colorB: new THREE.Color(0xff5500),
    opacity: 1,
    continuous: false,
  },
  teleport_smoke: {
    id: 'teleport_smoke',
    mode: 'smoke',
    count: 40,
    rate: 0,
    life: [0.5, 1.4],
    size: [0.35, 1.2],
    speed: [0.8, 2.5],
    spread: 0.9,
    gravity: -0.2,
    colorA: new THREE.Color(0x88aacc),
    colorB: new THREE.Color(0x334466),
    opacity: 0.55,
    continuous: false,
  },
  dash_foot: {
    id: 'dash_foot',
    mode: 'smoke',
    count: 18,
    rate: 0,
    life: [0.25, 0.7],
    size: [0.15, 0.5],
    speed: [0.4, 1.4],
    spread: 0.5,
    gravity: 0.8,
    colorA: new THREE.Color(0xc4b59a),
    colorB: new THREE.Color(0x6b5b45),
    opacity: 0.5,
    continuous: false,
  },
};

// Soft radial sprite (shared)
let _softTex: THREE.Texture | null = null;
function softParticleTexture(): THREE.Texture {
  if (_softTex) return _softTex;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _softTex = new THREE.CanvasTexture(canvas);
  _softTex.needsUpdate = true;
  return _softTex;
}

interface Particle {
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
  sizeEnd: number;
}

export interface ParticleEmitterOpts {
  scene: THREE.Scene | THREE.Object3D;
  preset: FxPresetId | FxPreset;
  position?: THREE.Vector3;
  /** Attach to an object (updates world position each frame) */
  attachTo?: THREE.Object3D;
  localOffset?: THREE.Vector3;
  /** Auto dispose after lifetime (bursts) or when continuous stopped */
  autoRemove?: boolean;
}

export interface ParticleEmitter {
  root: THREE.Points;
  preset: FxPreset;
  active: boolean;
  setPosition: (p: THREE.Vector3) => void;
  burst: (count?: number) => void;
  start: () => void;
  stop: () => void;
  update: (dt: number) => void;
  dispose: () => void;
}

export function createParticleEmitter(opts: ParticleEmitterOpts): ParticleEmitter {
  const preset =
    typeof opts.preset === 'string'
      ? FX_PRESETS[opts.preset] ?? FX_PRESETS.attack_burst
      : opts.preset;
  if (!preset || typeof preset.count !== 'number') {
    throw new Error(`[FX] unknown preset: ${String(opts.preset)}`);
  }
  const count = preset.count;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

  // Soft billboard points (threejs-games style) — per-particle size + alpha
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: softParticleTexture() },
      uScale: { value: 280 },
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
        gl_FragColor = vec4(vColor * tex.rgb, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: preset.mode === 'fire' ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.name = `fx_${preset.id}`;
  points.renderOrder = 10;
  opts.scene.add(points);

  const particles: Particle[] = Array.from({ length: count }, () => ({
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
    sizeEnd: 0.6,
  }));

  const origin = opts.position?.clone() ?? new THREE.Vector3();
  const localOffset = opts.localOffset?.clone() ?? new THREE.Vector3();
  let active = preset.continuous;
  let spawnAcc = 0;
  let finished = false;

  function spawnOne(p: Particle): void {
    p.alive = true;
    p.maxLife = THREE.MathUtils.lerp(preset.life[0], preset.life[1], Math.random());
    p.life = p.maxLife;
    p.x = origin.x + localOffset.x + (Math.random() - 0.5) * preset.spread;
    p.y = origin.y + localOffset.y;
    p.z = origin.z + localOffset.z + (Math.random() - 0.5) * preset.spread;
    const spd = THREE.MathUtils.lerp(preset.speed[0], preset.speed[1], Math.random());
    p.vx = (Math.random() - 0.5) * preset.spread * 2;
    p.vy = spd;
    p.vz = (Math.random() - 0.5) * preset.spread * 2;
    p.size = THREE.MathUtils.lerp(preset.size[0], preset.size[1], Math.random());
    p.sizeEnd = p.size * (preset.mode === 'smoke' ? 2.4 : 1.4);
  }

  function burst(n = count): void {
    let spawned = 0;
    for (const p of particles) {
      if (spawned >= n) break;
      if (!p.alive) {
        spawnOne(p);
        spawned++;
      }
    }
    // force-overwrite if needed
    if (spawned < n) {
      for (let i = 0; i < n - spawned && i < particles.length; i++) {
        spawnOne(particles[i]);
      }
    }
    active = true;
    finished = false;
  }

  // Continuous: pre-seed some particles
  if (preset.continuous) {
    for (let i = 0; i < Math.min(8, count); i++) spawnOne(particles[i]);
  }

  const emitter: ParticleEmitter = {
    root: points,
    preset,
    get active() {
      return active;
    },
    setPosition(p) {
      origin.copy(p);
    },
    burst,
    start() {
      active = true;
      finished = false;
    },
    stop() {
      active = false;
    },
    update(dt) {
      if (finished) return;

      if (opts.attachTo) {
        opts.attachTo.getWorldPosition(origin);
        origin.add(localOffset);
      }

      if (active && preset.continuous && preset.rate > 0) {
        spawnAcc += dt * preset.rate;
        while (spawnAcc >= 1) {
          spawnAcc -= 1;
          const slot = particles.find((p) => !p.alive);
          if (slot) spawnOne(slot);
        }
      }

      let anyAlive = false;
      for (let i = 0; i < count; i++) {
        const p = particles[i];
        if (!p.alive) {
          positions[i * 3] = 0;
          positions[i * 3 + 1] = -9999;
          positions[i * 3 + 2] = 0;
          sizes[i] = 0;
          alphas[i] = 0;
          continue;
        }
        anyAlive = true;
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          continue;
        }
        p.vy += preset.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;

        const t = 1 - p.life / p.maxLife;
        const fade = t < 0.15 ? t / 0.15 : t > 0.7 ? (1 - t) / 0.3 : 1;
        const col = preset.colorA.clone().lerp(preset.colorB, t);
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
        sizes[i] = THREE.MathUtils.lerp(p.size, p.sizeEnd, t);
        alphas[i] = fade * preset.opacity;
      }

      (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.alpha as THREE.BufferAttribute).needsUpdate = true;

      if (!active && !anyAlive && !preset.continuous) {
        finished = true;
        if (opts.autoRemove !== false) emitter.dispose();
      }
    },
    dispose() {
      active = false;
      finished = true;
      opts.scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };

  return emitter;
}

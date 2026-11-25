/**
 * Arena lava surface — three.js webgl_shader_lava recipe (VoxLava / threejs-games).
 * Applied to the volcanic Outer ring (parent of surrounding lava).
 * Liquid vertex lift + splash bursts for damage from below.
 */
import * as THREE from 'three';

const LAVA_VERT = /* glsl */ `
uniform float time;
uniform vec2 uvScale;
varying vec2 vUv;
void main() {
  vUv = uvScale * uv;
  vec3 p = position;
  float w = sin(p.x * 1.7 + time * 1.4) * cos(p.z * 1.3 - time * 1.1);
  p += normal * w * 0.12;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const LAVA_FRAG = /* glsl */ `
uniform float time;
uniform float heat;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 uv1 = vUv + vec2(time * 0.07, time * -0.05);
  vec2 uv2 = vUv * 1.7 + vec2(time * -0.04, time * 0.09);
  float n = noise(uv1 * 4.0) * 0.65 + noise(uv2 * 7.0) * 0.35;
  vec3 cool = vec3(0.12, 0.02, 0.01);
  vec3 mid = vec3(0.85, 0.18, 0.02);
  vec3 hot = vec3(1.0, 0.72, 0.18);
  vec3 col = mix(cool, mid, smoothstep(0.25, 0.62, n));
  col = mix(col, hot, smoothstep(0.72, 0.95, n) * heat);
  float glow = pow(max(0.0, n - 0.45), 1.4) * heat;
  gl_FragColor = vec4(col + vec3(glow * 0.55, glow * 0.18, 0.0), 1.0);
}
`;

export function createLavaShaderMaterial(opts?: { uvScale?: number; heat?: number }): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      uvScale: { value: new THREE.Vector2(opts?.uvScale ?? 2.4, opts?.uvScale ?? 2.4) },
      heat: { value: opts?.heat ?? 1.15 },
    },
    vertexShader: LAVA_VERT,
    fragmentShader: LAVA_FRAG,
    lights: false,
  });
}

export function createStonePlatformMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x5b5348,
    roughness: 0.88,
    metalness: 0.08,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });
}

export function createVolcanicPlatformMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x3f1f12,
    roughness: 0.55,
    metalness: 0.22,
    emissive: 0xc2410c,
    emissiveIntensity: 0.85,
  });
}

export class ArenaLavaSurface {
  private mats: THREE.ShaderMaterial[] = [];
  private splash: THREE.Points | null = null;
  private splashAge = 0;
  private t = 0;
  private bound = false;

  /** Bind lava shader to Outer (and named lava children) in the arena visual. */
  bind(root: THREE.Object3D): number {
    let n = 0;
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || !o.geometry) return;
      const label = `${o.name} ${o.parent?.name ?? ''}`.toLowerCase();
      if (!/outer|lava|magma|molten/.test(label)) return;
      if (/sky/.test(label)) return;
      const mat = createLavaShaderMaterial({
        uvScale: /outer/.test(label) ? 3.2 : 2.2,
        heat: 1.2,
      });
      o.material = mat;
      o.userData.bossArenaLayer = 'lava';
      o.userData.surface = 'damage';
      this.mats.push(mat);
      n += 1;
    });
    this.bound = n > 0;
    return n;
  }

  /** Hide author compose extras (embedded Caesar + stylized tornado preview). */
  stripComposeExtras(root: THREE.Object3D): string[] {
    const removed: string[] = [];
    const doomed: THREE.Object3D[] = [];
    root.traverse((o) => {
      const n = o.name || '';
      if (
        /dark_slayer|caesar|mst_90|armature|stylized_fire_tornado|tornado0/i.test(n) &&
        !/outer|base|stage|rock_platform/i.test(n)
      ) {
        doomed.push(o);
      }
    });
    for (const o of doomed) {
      removed.push(o.name || o.uuid);
      o.visible = false;
    }
    return removed;
  }

  burstSplash(scene: THREE.Scene, at: THREE.Vector3, lavaY: number): void {
    this.clearSplash(scene);
    const count = 48;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.2 + Math.random() * 1.6;
      pos[i * 3] = at.x + Math.cos(a) * r;
      pos[i * 3 + 1] = lavaY + 0.05;
      pos[i * 3 + 2] = at.z + Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xff6a00,
      size: 0.22,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.splash = new THREE.Points(geo, mat);
    this.splash.name = 'LavaSplash';
    scene.add(this.splash);
    this.splashAge = 0.7;
  }

  update(dt: number, scene: THREE.Scene): void {
    this.t += dt;
    for (const m of this.mats) m.uniforms.time.value = this.t;
    if (this.splash && this.splashAge > 0) {
      this.splashAge -= dt;
      const pos = this.splash.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, pos.getY(i) + dt * (2.8 + (i % 5) * 0.4));
      }
      pos.needsUpdate = true;
      (this.splash.material as THREE.PointsMaterial).opacity = Math.max(0, this.splashAge / 0.7);
      if (this.splashAge <= 0) this.clearSplash(scene);
    }
  }

  get isBound(): boolean {
    return this.bound;
  }

  private clearSplash(scene: THREE.Scene): void {
    if (!this.splash) return;
    scene.remove(this.splash);
    this.splash.geometry.dispose();
    (this.splash.material as THREE.Material).dispose();
    this.splash = null;
  }

  dispose(scene: THREE.Scene): void {
    this.clearSplash(scene);
    for (const m of this.mats) m.dispose();
    this.mats.length = 0;
  }
}

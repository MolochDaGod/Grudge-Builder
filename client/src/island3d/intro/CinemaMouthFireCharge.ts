/**
 * CinemaMouthFireCharge — GLSL fire volume at the OPEN maw (not throat, not mesh tint).
 *
 * Better look than red mesh emissive + flat ground rings:
 *  - Soft fire shader shell at jaw opening (gold core → amber → soft fringe)
 *  - Rising embers from the maw
 *  - Point light warm gold (not pure red)
 *
 * Never recolors the leviathan body materials — VFX only.
 * Blend: softAdditive (CinemaMaterialBlend).
 */
import * as THREE from 'three';
import { applyCinemaBlend, CINEMA_RENDER_ORDER } from './CinemaMaterialBlend';

const FIRE_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vWorldPos;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FIRE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform vec3 uColorCore;
uniform vec3 uColorMid;
uniform vec3 uColorEdge;
varying vec3 vNormalW;
varying vec3 vWorldPos;
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
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  // Rising heat tongues (UV.y up the shell)
  float t = uTime;
  float rise = fbm(vec2(vUv.x * 4.5, vUv.y * 3.2 - t * 1.8));
  float tongues = smoothstep(0.28, 0.92, rise + (1.0 - vUv.y) * 0.4);
  float detail = fbm(vec2(vUv.x * 9.0 + t * 0.4, vUv.y * 7.0 - t * 2.4));
  float fire = tongues * (0.55 + 0.45 * detail);

  // Fresnel rim — bright edge, hollow-ish core (maw glow, not solid red ball)
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - max(0.0, dot(viewDir, normalize(vNormalW))), 2.4);

  // Gold core → amber mid → soft peach edge (NOT pure red)
  vec3 col = mix(uColorEdge, uColorMid, fire);
  col = mix(col, uColorCore, fire * fire * 0.85 + fres * 0.25);
  col += uColorCore * fres * 0.55;

  float alpha = (fire * 0.55 + fres * 0.45) * uIntensity;
  // Soft vertical falloff so top of shell fades (flame tongue shape)
  alpha *= smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.05, 0.55, vUv.y);
  // Soft limb
  alpha *= 0.55 + 0.45 * fres;
  if (alpha < 0.02) discard;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.92));
}
`;

function softSparkTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,240,200,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class CinemaMouthFireCharge {
  readonly root = new THREE.Group();
  private shell: THREE.Mesh;
  private shellMat: THREE.ShaderMaterial;
  private embers: THREE.Points;
  private emberVel: Float32Array;
  private emberLife: Float32Array;
  private n = 48;
  private light: THREE.PointLight;
  private intensity = 0;
  private targetI = 0;
  private time = 0;
  private sparkMap: THREE.Texture;

  constructor(parent: THREE.Object3D) {
    this.root.name = 'cinema_mouth_fire_charge';
    parent.add(this.root);

    // Warm gold palette — not pure red
    this.shellMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uColorCore: { value: new THREE.Color(0xfff0a8) },
        uColorMid: { value: new THREE.Color(0xffb04a) },
        uColorEdge: { value: new THREE.Color(0xff8a50) },
      },
      vertexShader: FIRE_VERT,
      fragmentShader: FIRE_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    applyCinemaBlend(this.shellMat, {
      recipe: 'softAdditive',
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });

    // Ellipsoid shell = open maw fire volume (wider than tall)
    this.shell = new THREE.Mesh(
      new THREE.SphereGeometry(1, 28, 20),
      this.shellMat,
    );
    this.shell.scale.set(1.15, 0.85, 1.35);
    this.shell.frustumCulled = false;
    this.shell.renderOrder = CINEMA_RENDER_ORDER.fireAura;
    this.root.add(this.shell);

    this.sparkMap = softSparkTex();
    const pos = new Float32Array(this.n * 3);
    this.emberVel = new Float32Array(this.n * 3);
    this.emberLife = new Float32Array(this.n);
    for (let i = 0; i < this.n; i++) this.respawn(i, true);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pmat = new THREE.PointsMaterial({
      color: 0xffe08a,
      size: 0.22,
      map: this.sparkMap,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      fog: false,
      toneMapped: false,
    });
    applyCinemaBlend(pmat, {
      recipe: 'softAdditive',
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });
    this.embers = new THREE.Points(geo, pmat);
    this.embers.frustumCulled = false;
    this.embers.renderOrder = CINEMA_RENDER_ORDER.sparks;
    this.root.add(this.embers);

    // Soft warm key — gold, low intensity so mesh does not wash red
    this.light = new THREE.PointLight(0xffcc88, 0, 18, 2);
    this.root.add(this.light);
    this.root.visible = false;
  }

  private respawn(i: number, random: boolean): void {
    const arr = this.embers.geometry.getAttribute('position').array as Float32Array;
    const a = Math.random() * Math.PI * 2;
    const r = 0.15 + Math.random() * 0.55;
    arr[i * 3] = Math.cos(a) * r;
    arr[i * 3 + 1] = Math.random() * 0.25;
    arr[i * 3 + 2] = Math.sin(a) * r * 0.6;
    this.emberVel[i * 3] = (Math.random() - 0.5) * 0.6;
    this.emberVel[i * 3 + 1] = 1.2 + Math.random() * 2.2;
    this.emberVel[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
    this.emberLife[i] = random ? Math.random() * 0.6 : 0.35 + Math.random() * 0.5;
  }

  /**
   * Place at OPEN mouth in world space, aimed along jaw → target.
   * `forwardM` pushes charge OUT of throat into the open cavity / just beyond teeth.
   */
  setWorld(
    mouthWorld: THREE.Vector3,
    aimDir: THREE.Vector3,
    intensity: number,
    forwardM = 1.6,
    spanM = 2.4,
  ): void {
    this.targetI = THREE.MathUtils.clamp(intensity, 0, 1);
    const dir = aimDir.lengthSq() > 1e-6 ? aimDir.clone().normalize() : new THREE.Vector3(0, 0, 1);
    // Open-mouth: forward from kuchi along aim (NOT back into throat)
    this.root.position.copy(mouthWorld).addScaledVector(dir, forwardM);
    // Orient shell so "forward" is aim (local +Z)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    this.root.quaternion.copy(q);
    const s = spanM * (0.55 + this.targetI * 0.65);
    this.shell.scale.set(s * 1.1, s * 0.8, s * 1.25);
    this.root.visible = this.targetI > 0.02 || this.intensity > 0.02;
  }

  update(dt: number): void {
    this.time += dt;
    // Smooth intensity — no hard red pop
    this.intensity += (this.targetI - this.intensity) * Math.min(1, dt * 5);
    this.shellMat.uniforms.uTime.value = this.time;
    this.shellMat.uniforms.uIntensity.value = this.intensity;
    this.light.intensity = this.intensity * 4.5;
    this.light.distance = 12 + this.intensity * 14;

    const mat = this.embers.material as THREE.PointsMaterial;
    mat.opacity = this.intensity * 0.85;
    mat.size = 0.14 + this.intensity * 0.18;
    const arr = this.embers.geometry.getAttribute('position').array as Float32Array;
    for (let i = 0; i < this.n; i++) {
      this.emberLife[i] -= dt;
      if (this.emberLife[i] <= 0 || !this.root.visible) {
        this.respawn(i, false);
        continue;
      }
      this.emberVel[i * 3 + 1] -= 0.8 * dt;
      arr[i * 3] += this.emberVel[i * 3] * dt;
      arr[i * 3 + 1] += this.emberVel[i * 3 + 1] * dt * (0.9 + this.intensity * 0.4);
      arr[i * 3 + 2] += this.emberVel[i * 3 + 2] * dt;
    }
    (this.embers.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;

    if (this.intensity < 0.02 && this.targetI < 0.02) {
      this.root.visible = false;
    }
  }

  dispose(): void {
    this.shell.geometry.dispose();
    this.shellMat.dispose();
    this.embers.geometry.dispose();
    (this.embers.material as THREE.Material).dispose();
    this.sparkMap.dispose();
    this.root.parent?.remove(this.root);
  }
}

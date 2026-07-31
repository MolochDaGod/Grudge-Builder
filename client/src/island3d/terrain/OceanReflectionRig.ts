/**
 * OceanReflectionRig — dual FBO reflect/refract for the single Gerstner ocean.
 *
 * Pattern from three.js Reflector + Captain-of-the-Seas style water:
 *   - Reflection: mirror camera below water plane, clip, render → RT
 *   - Refraction: scene from real camera with ocean hidden → RT
 *
 * Does NOT replace WaterMaterial Gerstner SSOT — only feeds sample maps.
 * One ocean mesh rule still holds.
 */
import * as THREE from 'three';

export interface OceanReflectionRigOptions {
  /** Water surface world Y (updated with tide). */
  waterLevel?: number;
  /** Reflection RT size (power of two preferred). */
  reflectionSize?: number;
  /** Refraction RT size. */
  refractionSize?: number;
  /** Skip reflection every N frames when camera far (perf). */
  farSkipFrames?: number;
  farDistance?: number;
}

export class OceanReflectionRig {
  readonly reflectionTarget: THREE.WebGLRenderTarget;
  readonly refractionTarget: THREE.WebGLRenderTarget;

  private waterLevel: number;
  private mirrorCamera = new THREE.PerspectiveCamera();
  private clipBias = 0.02;
  private reflectorPlane = new THREE.Plane();
  private normal = new THREE.Vector3(0, 1, 0);
  private mirrorWorldPos = new THREE.Vector3();
  private cameraWorldPos = new THREE.Vector3();
  private rotationMatrix = new THREE.Matrix4();
  private lookAtPos = new THREE.Vector3();
  private clipPlane = new THREE.Vector4();
  private view = new THREE.Vector3();
  private target = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private frame = 0;
  private farSkipFrames: number;
  private farDistance: number;
  private enabled = true;

  constructor(opts: OceanReflectionRigOptions = {}) {
    this.waterLevel = opts.waterLevel ?? 0;
    this.farSkipFrames = opts.farSkipFrames ?? 2;
    this.farDistance = opts.farDistance ?? 180;

    const rSize = opts.reflectionSize ?? 512;
    const fSize = opts.refractionSize ?? 512;
    const params: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      depthBuffer: true,
    };
    this.reflectionTarget = new THREE.WebGLRenderTarget(rSize, rSize, params);
    this.refractionTarget = new THREE.WebGLRenderTarget(fSize, fSize, params);
    this.reflectionTarget.texture.generateMipmaps = false;
    this.refractionTarget.texture.generateMipmaps = false;
  }

  setWaterLevel(y: number): void {
    this.waterLevel = y;
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
  }

  get reflectionMap(): THREE.Texture {
    return this.reflectionTarget.texture;
  }

  get refractionMap(): THREE.Texture {
    return this.refractionTarget.texture;
  }

  /**
   * Render reflection + refraction into RTs. Call once per frame before main render.
   * Hides `oceanMesh` during both passes.
   */
  update(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    oceanMesh: THREE.Object3D | null,
  ): void {
    if (!this.enabled || !oceanMesh) return;

    this.frame += 1;
    const prevVisible = oceanMesh.visible;
    oceanMesh.visible = false;

    // ── Refraction (scene under camera, no ocean) ─────────────────────────
    const prevTarget = renderer.getRenderTarget();
    const prevXr = renderer.xr.enabled;
    renderer.xr.enabled = false;

    renderer.setRenderTarget(this.refractionTarget);
    renderer.state.buffers.depth.setMask(true);
    renderer.clear();
    renderer.render(scene, camera);

    // ── Reflection (mirror camera) — maybe skip when far ──────────────────
    camera.getWorldPosition(this.cameraWorldPos);
    const dist = Math.abs(this.cameraWorldPos.y - this.waterLevel);
    const far = dist > this.farDistance || this.cameraWorldPos.y < this.waterLevel - 2;
    if (!far || this.frame % this.farSkipFrames === 0) {
      this.renderReflection(renderer, scene, camera);
    }

    renderer.setRenderTarget(prevTarget);
    renderer.xr.enabled = prevXr;
    oceanMesh.visible = prevVisible;
  }

  private renderReflection(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ): void {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    // Mirror camera across horizontal water plane (y = waterLevel)
    camera.getWorldPosition(this.cameraWorldPos);
    this.view.copy(this.cameraWorldPos);
    this.view.y = this.waterLevel * 2 - this.view.y;

    this.mirrorCamera.position.copy(this.view);
    this.mirrorCamera.fov = camera.fov;
    this.mirrorCamera.aspect = camera.aspect;
    this.mirrorCamera.near = camera.near;
    this.mirrorCamera.far = camera.far;
    this.mirrorCamera.up.set(0, 1, 0);

    // Reflect look-at point
    this.target.set(0, 0, -1).applyQuaternion(camera.quaternion).add(this.cameraWorldPos);
    this.target.y = this.waterLevel * 2 - this.target.y;
    this.mirrorCamera.lookAt(this.target);
    this.mirrorCamera.updateProjectionMatrix();
    this.mirrorCamera.updateMatrixWorld(true);

    // Oblique near-plane clip (three.js Reflector pattern)
    this.mirrorWorldPos.set(
      this.mirrorCamera.position.x,
      this.waterLevel,
      this.mirrorCamera.position.z,
    );
    this.normal.set(0, 1, 0);
    this.reflectorPlane.setFromNormalAndCoplanarPoint(this.normal, this.mirrorWorldPos);
    this.reflectorPlane.applyMatrix4(this.mirrorCamera.matrixWorldInverse);

    const clipPlane = new THREE.Vector4(
      this.reflectorPlane.normal.x,
      this.reflectorPlane.normal.y,
      this.reflectorPlane.normal.z,
      this.reflectorPlane.constant,
    );
    const projectionMatrix = this.mirrorCamera.projectionMatrix;
    const q = new THREE.Vector4();
    q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
    q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
    q.z = -1.0;
    q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];
    clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));
    projectionMatrix.elements[2] = clipPlane.x;
    projectionMatrix.elements[6] = clipPlane.y;
    projectionMatrix.elements[10] = clipPlane.z + 1.0 - this.clipBias;
    projectionMatrix.elements[14] = clipPlane.w;

    renderer.setRenderTarget(this.reflectionTarget);
    renderer.state.buffers.depth.setMask(true);
    renderer.clear();
    const gl = renderer.getContext();
    gl.cullFace(gl.FRONT);
    renderer.render(scene, this.mirrorCamera);
    gl.cullFace(gl.BACK);
  }

  dispose(): void {
    this.reflectionTarget.dispose();
    this.refractionTarget.dispose();
  }
}

/** Procedural foam + caustic maps (no CDN required). SSR-safe no-op off DOM. */
export function createProceduralOceanTextures(): {
  foam: THREE.Texture;
  caustics: THREE.Texture;
  normal: THREE.Texture;
} | null {
  if (typeof document === 'undefined') return null;
  const foam = noiseCanvas(256, (x, y, n) => {
    const v = Math.pow(n, 1.4);
    const c = Math.floor(v * 255);
    return [c, c, c, Math.floor(v * 220)];
  });
  const caustics = noiseCanvas(256, (x, y, n) => {
    const v = Math.pow(Math.max(0, n * 1.2 - 0.25), 2.2);
    const c = Math.floor(v * 255);
    return [c, Math.floor(c * 0.95), Math.floor(c * 0.85), 255];
  });
  const normal = noiseCanvas(256, (x, y, n, n2) => {
    const nx = (n - 0.5) * 2;
    const ny = (n2 - 0.5) * 2;
    const nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));
    return [
      Math.floor((nx * 0.5 + 0.5) * 255),
      Math.floor((nz * 0.5 + 0.5) * 255),
      Math.floor((ny * 0.5 + 0.5) * 255),
      255,
    ];
  });
  for (const t of [foam, caustics, normal]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;
  }
  return { foam, caustics, normal };
}

function noiseCanvas(
  size: number,
  paint: (x: number, y: number, n: number, n2: number) => [number, number, number, number],
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x * 0.04, y * 0.04);
      const n2 = fbm(x * 0.04 + 17.3, y * 0.04 - 9.1);
      const [r, g, b, a] = paint(x, y, n, n2);
      const i = (y * size + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function vnoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm(x: number, y: number): number {
  return vnoise(x, y) * 0.5 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.2, y * 4.2) * 0.2;
}

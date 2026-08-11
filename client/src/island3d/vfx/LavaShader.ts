/**
 * LavaShader — port of threejs-games lava demo
 * https://threejs-games.github.io/examples/25-shaders/lava/
 * (originally threejs.org webgl_shader_lava)
 *
 * Procedural cloud + lava-tile textures so no external assets are required.
 * Optional CDN override via setLavaTextureUrls().
 */
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  uniform vec2 uvScale;
  varying vec2 vUv;
  void main() {
    vUv = uvScale * uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float time;
  uniform float fogDensity;
  uniform vec3 fogColor;
  uniform sampler2D texture1;
  uniform sampler2D texture2;
  varying vec2 vUv;

  void main(void) {
    vec4 noise = texture2D(texture1, vUv);
    vec2 T1 = vUv + vec2(1.5, -1.5) * time * 0.02;
    vec2 T2 = vUv + vec2(-0.5, 2.0) * time * 0.01;

    T1.x += noise.x * 2.0;
    T1.y += noise.y * 2.0;
    T2.x -= noise.y * 0.2;
    T2.y += noise.z * 0.2;

    float p = texture2D(texture1, T1 * 2.0).a;
    vec4 color = texture2D(texture2, T2 * 2.0);
    vec4 temp = color * (vec4(p, p, p, p) * 2.0) + (color * color - 0.1);

    if (temp.r > 1.0) { temp.bg += clamp(temp.r - 2.0, 0.0, 100.0); }
    if (temp.g > 1.0) { temp.rb += temp.g - 1.0; }
    if (temp.b > 1.0) { temp.rg += temp.b - 1.0; }

    gl_FragColor = temp;
    float depth = gl_FragCoord.z / gl_FragCoord.w;
    const float LOG2 = 1.442695;
    float fogFactor = exp2(-fogDensity * fogDensity * depth * depth * LOG2);
    fogFactor = 1.0 - clamp(fogFactor, 0.0, 1.0);
    gl_FragColor = mix(gl_FragColor, vec4(fogColor, gl_FragColor.w), fogFactor);
  }
`;

/** Soft noise cloud (stands in for lavacloud.png) */
function makeCloudTexture(size = 256): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // layered value noise
      const n =
        Math.sin(x * 0.07 + y * 0.05) * 0.25 +
        Math.sin(x * 0.13 - y * 0.11) * 0.2 +
        Math.sin((x + y) * 0.04) * 0.15 +
        Math.random() * 0.35 +
        0.35;
      const v = Math.max(0, Math.min(255, n * 255));
      img.data[i] = v;
      img.data[i + 1] = v * 0.9;
      img.data[i + 2] = v * 0.85;
      img.data[i + 3] = Math.min(255, v + 40);
    }
  }
  ctx.putImageData(img, 0, 0);
  // blur-ish soft pass
  ctx.globalAlpha = 0.35;
  ctx.filter = 'blur(2px)';
  ctx.drawImage(c, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Hot lava tile (stands in for lavatile.jpg) */
function makeLavaTileTexture(size = 256): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, '#1a0500');
  g.addColorStop(0.25, '#8b1a00');
  g.addColorStop(0.5, '#ff4400');
  g.addColorStop(0.75, '#ffaa22');
  g.addColorStop(1, '#fff0a0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // cracks / bright veins
  for (let i = 0; i < 80; i++) {
    ctx.strokeStyle = `rgba(255,${180 + Math.random() * 75 | 0},40,${0.3 + Math.random() * 0.5})`;
    ctx.lineWidth = 1 + Math.random() * 3;
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (Math.random() - 0.5) * 40;
      y += (Math.random() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export interface LavaMaterialOpts {
  uvScale?: THREE.Vector2;
  fogDensity?: number;
  fogColor?: THREE.ColorRepresentation;
  emissiveBoost?: number;
}

export interface LavaMaterialHandle {
  material: THREE.ShaderMaterial;
  uniforms: {
    time: { value: number };
    uvScale: { value: THREE.Vector2 };
    fogDensity: { value: number };
    fogColor: { value: THREE.Color };
    texture1: { value: THREE.Texture };
    texture2: { value: THREE.Texture };
  };
  update: (elapsedSec: number) => void;
  dispose: () => void;
}

let sharedCloud: THREE.Texture | null = null;
let sharedTile: THREE.Texture | null = null;

function getCloud(): THREE.Texture {
  if (!sharedCloud) sharedCloud = makeCloudTexture();
  return sharedCloud;
}
function getTile(): THREE.Texture {
  if (!sharedTile) sharedTile = makeLavaTileTexture();
  return sharedTile;
}

/**
 * Create an independent lava ShaderMaterial (clone of threejs-game lava).
 * Call update(elapsed) each frame with clock time.
 */
export function createLavaMaterial(opts: LavaMaterialOpts = {}): LavaMaterialHandle {
  const uniforms = {
    time: { value: 0 },
    uvScale: { value: opts.uvScale?.clone() ?? new THREE.Vector2(3.0, 1.0) },
    fogDensity: { value: opts.fogDensity ?? 0.02 },
    fogColor: { value: new THREE.Color(opts.fogColor ?? 0x000000) },
    texture1: { value: getCloud() },
    texture2: { value: getTile() },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: true,
    toneMapped: false,
  });

  return {
    material,
    uniforms,
    update(elapsedSec: number) {
      uniforms.time.value = elapsedSec;
    },
    dispose() {
      material.dispose();
    },
  };
}

/** Thin lava tube / ribbon mesh along a path of points */
export function createLavaRibbon(
  points: THREE.Vector3[],
  opts?: { radius?: number; radialSegs?: number; tubularSegs?: number },
): { mesh: THREE.Mesh; lava: LavaMaterialHandle } {
  const lava = createLavaMaterial({
    uvScale: new THREE.Vector2(6, 1),
    fogDensity: 0.01,
  });
  if (points.length < 2) {
    points = [new THREE.Vector3(), new THREE.Vector3(0, 0, -1)];
  }
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.35);
  const geo = new THREE.TubeGeometry(
    curve,
    opts?.tubularSegs ?? 48,
    opts?.radius ?? 0.08,
    opts?.radialSegs ?? 6,
    false,
  );
  const mesh = new THREE.Mesh(geo, lava.material);
  mesh.name = 'lava_ribbon';
  mesh.renderOrder = 8;
  return { mesh, lava };
}

/** Flame wall ring (cylinder open top) with lava shader */
export function createLavaFlameWall(
  radius: number,
  height: number,
): { mesh: THREE.Mesh; lava: LavaMaterialHandle } {
  const lava = createLavaMaterial({
    uvScale: new THREE.Vector2(8, 2),
    fogDensity: 0.015,
  });
  const geo = new THREE.CylinderGeometry(radius, radius * 1.05, height, 48, 1, true);
  const mesh = new THREE.Mesh(geo, lava.material);
  mesh.name = 'lava_flame_wall';
  mesh.renderOrder = 7;
  return { mesh, lava };
}

/**
 * WaterMaterial — single Gerstner-style **ocean** shader (islands / zones / lobby).
 *
 * Naming (see @shared/definitions/namingSsot):
 *   ocean ≡ open water ≡ sea — one free surface. Property `waterLevel` = free-surface Y.
 *   Mesh name: 'ocean'. Not farm-bucket "water" or placement-domain "water".
 *
 * Design rules:
 *  - Exactly ONE ocean mesh per scene (no R3F Water, no GLTF water layers).
 *  - Opaque depth-written surface so terrain seafloor never shows as a 2nd ocean.
 *  - Stronger color contrast + animated waves + shore foam + fresnel.
 *  - getWaveHeightAt() for buoyancy / swim sync.
 */
import * as THREE from 'three';

// ─── Wave parameters ──────────────────────────────────────────────────────────

export interface WaveSet {
  direction: THREE.Vector2;
  steepness: number;
  wavelength: number;
}

export interface OceanConfig {
  /** World-space size of the water plane */
  size: number;
  /** Segments per side (higher = smoother waves, more GPU) */
  segments: number;
  /**
   * Free-surface world Y (ocean ≡ open water ≡ sea).
   * Legacy name waterLevel — same as oceanSurfaceY.
   */
  waterLevel: number;
  /** Shallow water color */
  shallowColor: THREE.Color;
  /** Deep water color */
  deepColor: THREE.Color;
  /** Foam color */
  foamColor: THREE.Color;
  /** Wave definitions (default: 3 overlapping sets) */
  waves: WaveSet[];
  /**
   * How "strong" the visual ocean reads (0.5–1.5).
   * Affects color contrast, wave amplitude in fragment, specular.
   */
  strength?: number;
}

const DEFAULT_OCEAN: OceanConfig = {
  size: 1200,
  segments: 64,
  waterLevel: 0,
  shallowColor: new THREE.Color(0x1abbc4),
  deepColor: new THREE.Color(0x0a2e5c),
  foamColor: new THREE.Color(0xe8f4ff),
  strength: 1.15,
  waves: [
    { direction: new THREE.Vector2(1, 0.3), steepness: 0.28, wavelength: 60 },
    { direction: new THREE.Vector2(0.3, 1), steepness: 0.18, wavelength: 35 },
    { direction: new THREE.Vector2(-0.7, 0.5), steepness: 0.12, wavelength: 20 },
  ],
};

// ─── Shader ───────────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uStrength;
  uniform vec4 uWave0; // dir.xy, steepness, wavelength
  uniform vec4 uWave1;
  uniform vec4 uWave2;

  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying float vWaveH;
  varying vec3 vNormalW;

  vec3 gerstner(vec4 w, vec3 p, float t, inout vec3 tangent, inout vec3 binormal) {
    float steep = w.z * uStrength;
    float wl = max(w.w, 1.0);
    float k = 6.28318530718 / wl;
    float c = sqrt(9.8 / k);
    vec2 d = normalize(w.xy);
    float f = k * (dot(d, p.xz) - c * t);
    float a = steep / k;

    // Partial derivatives for normal
    tangent += vec3(
      -d.x * d.x * steep * sin(f),
      d.x * steep * cos(f),
      -d.x * d.y * steep * sin(f)
    );
    binormal += vec3(
      -d.x * d.y * steep * sin(f),
      d.y * steep * cos(f),
      -d.y * d.y * steep * sin(f)
    );

    return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
  }

  void main() {
    vUv = uv;
    vec3 p = position;
    vec3 tangent = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);
    vec3 disp = vec3(0.0);
    disp += gerstner(uWave0, p, uTime, tangent, binormal);
    disp += gerstner(uWave1, p, uTime, tangent, binormal);
    disp += gerstner(uWave2, p, uTime, tangent, binormal);
    p += disp;
    vWaveH = disp.y;
    vNormalW = normalize(cross(binormal, tangent));
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uStrength;
  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform vec3 uFoamColor;
  uniform vec3 uSunDirection;
  // Captain-style dual-pass maps (optional — flags disable when unset)
  uniform sampler2D uReflectionMap;
  uniform sampler2D uRefractionMap;
  uniform sampler2D uNormalMap;
  uniform sampler2D uFoamMap;
  uniform sampler2D uCausticsMap;
  uniform float uHasReflection;
  uniform float uHasRefraction;
  uniform float uHasNormalMap;
  uniform float uHasFoamMap;
  uniform float uHasCaustics;
  uniform float uReflectivity;
  uniform float uDistort;
  uniform vec2 uResolution;

  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying float vWaveH;
  varying vec3 vNormalW;

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    // Optional scrolling normal map (Captain-of-the-Seas style)
    if (uHasNormalMap > 0.5) {
      vec2 nUv1 = vWorldPos.xz * 0.02 + vec2(uTime * 0.02, uTime * 0.015);
      vec2 nUv2 = vWorldPos.xz * 0.035 - vec2(uTime * 0.018, uTime * 0.012);
      vec3 n1 = texture2D(uNormalMap, nUv1).xyz * 2.0 - 1.0;
      vec3 n2 = texture2D(uNormalMap, nUv2).xyz * 2.0 - 1.0;
      vec3 nTex = normalize(n1 + n2);
      // Tangent-ish blend into world up-dominant ocean normal
      N = normalize(mix(N, normalize(vec3(nTex.x, N.y + nTex.y * 0.5, nTex.z)), 0.45));
    }

    // Deep ↔ shallow by wave height + UV scroll
    float depthMix = clamp(0.35 + vWaveH * 2.2 * uStrength + 0.15 * sin(vUv.x * 40.0 + uTime), 0.0, 1.0);
    vec3 waterColor = mix(uDeepColor, uShallowColor, depthMix);

    // Screen-space sample coords with normal distortion
    vec2 res = max(uResolution, vec2(1.0));
    vec2 screenUv = gl_FragCoord.xy / res;
    vec2 distort = N.xz * uDistort * 0.04;

    // Reflection (mirrored FBO)
    if (uHasReflection > 0.5) {
      vec2 rUv = clamp(screenUv + distort, 0.001, 0.999);
      // Reflection was rendered mirrored in Y for plane — flip V
      rUv.y = 1.0 - rUv.y;
      vec3 refl = texture2D(uReflectionMap, rUv).rgb;
      float fresnelR = pow(1.0 - max(0.0, dot(viewDir, N)), 2.6);
      fresnelR = clamp(fresnelR * uReflectivity, 0.05, 0.92);
      waterColor = mix(waterColor, refl, fresnelR * 0.72);
    } else {
      float fresnel = pow(1.0 - max(0.0, dot(viewDir, N)), 2.4);
      fresnel = clamp(fresnel * uStrength, 0.08, 0.85);
      waterColor = mix(waterColor, vec3(0.55, 0.75, 0.95), fresnel * 0.45);
    }

    // Refraction (scene under water surface)
    if (uHasRefraction > 0.5) {
      vec2 fUv = clamp(screenUv + distort * 1.4, 0.001, 0.999);
      vec3 refr = texture2D(uRefractionMap, fUv).rgb;
      float under = 1.0 - pow(1.0 - max(0.0, dot(viewDir, N)), 1.8);
      waterColor = mix(waterColor, mix(refr, waterColor, 0.35), under * 0.4);
    }

    // Specular sun glint
    vec3 H = normalize(uSunDirection + viewDir);
    float spec = pow(max(0.0, dot(N, H)), 96.0) * 0.55 * uStrength;
    waterColor += vec3(spec);

    // Crest + texture foam
    float foam = smoothstep(0.12, 0.35, vWaveH * uStrength);
    foam *= 0.55 + 0.45 * sin(vUv.x * 80.0 + uTime * 2.0) * sin(vUv.y * 60.0 - uTime * 1.5);
    if (uHasFoamMap > 0.5) {
      float fm = texture2D(uFoamMap, vWorldPos.xz * 0.08 + vec2(uTime * 0.03, 0.0)).r;
      foam = max(foam, fm * smoothstep(0.08, 0.28, vWaveH * uStrength) * 0.75);
    }
    waterColor = mix(waterColor, uFoamColor, clamp(foam * 0.55, 0.0, 0.55));

    // Shallow caustics
    if (uHasCaustics > 0.5) {
      float c = texture2D(uCausticsMap, vWorldPos.xz * 0.12 + uTime * 0.04).r
              * texture2D(uCausticsMap, vWorldPos.xz * 0.09 - uTime * 0.03).r;
      float cMask = (1.0 - depthMix) * 0.55;
      waterColor += vec3(0.1, 0.28, 0.24) * c * cMask * uStrength;
    }

    // Opaque — never stack with terrain "water" layers
    gl_FragColor = vec4(waterColor, 1.0);
  }
`;

// ─── Material + Mesh ──────────────────────────────────────────────────────────

function waveUniform(w: WaveSet): THREE.Vector4 {
  return new THREE.Vector4(w.direction.x, w.direction.y, w.steepness, w.wavelength);
}

/** Dummy 1×1 textures so samplers are always bound. */
function dummyTex(color = 0x8080ff): THREE.DataTexture {
  const data = new Uint8Array([
    (color >> 16) & 255,
    (color >> 8) & 255,
    color & 255,
    255,
  ]);
  const t = new THREE.DataTexture(data, 1, 1);
  t.needsUpdate = true;
  return t;
}

const _dummyReflect = dummyTex(0x6a90b8);
const _dummyRefract = dummyTex(0x1a5070);
const _dummyNormal = dummyTex(0x8080ff);
const _dummyFoam = dummyTex(0xffffff);
const _dummyCaustic = dummyTex(0x204040);

export function createOceanMaterial(config: Partial<OceanConfig> = {}): THREE.ShaderMaterial {
  const c = { ...DEFAULT_OCEAN, ...config, waves: config.waves ?? DEFAULT_OCEAN.waves };
  const strength = c.strength ?? 1.15;
  const waves = c.waves!;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uStrength: { value: strength },
      uShallowColor: { value: c.shallowColor.clone() },
      uDeepColor: { value: c.deepColor.clone() },
      uFoamColor: { value: c.foamColor.clone() },
      uSunDirection: { value: new THREE.Vector3(0.5, 0.85, 0.3).normalize() },
      uWave0: { value: waveUniform(waves[0] ?? DEFAULT_OCEAN.waves[0]) },
      uWave1: { value: waveUniform(waves[1] ?? DEFAULT_OCEAN.waves[1]) },
      uWave2: { value: waveUniform(waves[2] ?? DEFAULT_OCEAN.waves[2]) },
      uReflectionMap: { value: _dummyReflect },
      uRefractionMap: { value: _dummyRefract },
      uNormalMap: { value: _dummyNormal },
      uFoamMap: { value: _dummyFoam },
      uCausticsMap: { value: _dummyCaustic },
      uHasReflection: { value: 0 },
      uHasRefraction: { value: 0 },
      uHasNormalMap: { value: 0 },
      uHasFoamMap: { value: 0 },
      uHasCaustics: { value: 0 },
      uReflectivity: { value: 0.85 },
      uDistort: { value: 1.0 },
      uResolution: { value: new THREE.Vector2(1920, 1080) },
    },
    vertexShader,
    fragmentShader,
    // Opaque + depth write = single solid water plane (no double-water look)
    transparent: false,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
  });
}

/** Bind dual-pass + procedural maps onto an ocean material. */
export function bindOceanMaps(
  mat: THREE.ShaderMaterial,
  maps: {
    reflection?: THREE.Texture | null;
    refraction?: THREE.Texture | null;
    normal?: THREE.Texture | null;
    foam?: THREE.Texture | null;
    caustics?: THREE.Texture | null;
  },
): void {
  const u = mat.uniforms;
  if (!u) return;
  if (maps.reflection) {
    u.uReflectionMap.value = maps.reflection;
    u.uHasReflection.value = 1;
  }
  if (maps.refraction) {
    u.uRefractionMap.value = maps.refraction;
    u.uHasRefraction.value = 1;
  }
  if (maps.normal) {
    u.uNormalMap.value = maps.normal;
    u.uHasNormalMap.value = 1;
  }
  if (maps.foam) {
    u.uFoamMap.value = maps.foam;
    u.uHasFoamMap.value = 1;
  }
  if (maps.caustics) {
    u.uCausticsMap.value = maps.caustics;
    u.uHasCaustics.value = 1;
  }
}

export function createOceanMesh(config: Partial<OceanConfig> = {}): THREE.Mesh {
  const c = { ...DEFAULT_OCEAN, ...config };
  const segments = Math.max(16, Math.min(c.segments, 128));
  const geo = new THREE.PlaneGeometry(c.size, c.size, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const mat = createOceanMaterial(config);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = c.waterLevel;
  mesh.receiveShadow = true;
  mesh.name = 'ocean'; // canonical — not "sea" / "open-water" / "waterplane"
  mesh.userData.grudgeKeepOcean = true;
  mesh.userData.waterLevel = c.waterLevel;
  mesh.userData.oceanSurfaceY = c.waterLevel; // alias of waterLevel
  mesh.renderOrder = 0;
  mesh.frustumCulled = true;
  return mesh;
}

/** Alias: open water / sea mesh — same as createOceanMesh */
export const createOpenWaterMesh = createOceanMesh;
export const createSeaMesh = createOceanMesh;

/**
 * Sample Gerstner wave height at (x, z). Matches GPU vertex displacement.
 */
export function getWaveHeightAt(
  x: number,
  z: number,
  time: number,
  waterLevel: number = DEFAULT_OCEAN.waterLevel,
  waves: WaveSet[] = DEFAULT_OCEAN.waves,
  strength = 1.15,
): number {
  let height = waterLevel;
  for (const wave of waves) {
    const k = (2 * Math.PI) / wave.wavelength;
    const c = Math.sqrt(9.8 / k);
    const d = wave.direction.clone().normalize();
    const f = k * (d.x * x + d.y * z - c * time);
    const a = (wave.steepness * strength) / k;
    height += a * Math.sin(f);
  }
  return height;
}

/** Update the ocean material each frame */
export function updateOceanMaterial(
  mat: THREE.ShaderMaterial,
  time: number,
  sunDir?: THREE.Vector3,
  resolution?: THREE.Vector2,
): void {
  if (mat.uniforms.uTime) mat.uniforms.uTime.value = time;
  if (sunDir && mat.uniforms.uSunDirection) {
    mat.uniforms.uSunDirection.value.copy(sunDir).normalize();
  }
  if (resolution && mat.uniforms.uResolution) {
    mat.uniforms.uResolution.value.copy(resolution);
  }
}

/**
 * Collapse terrain vertices below water so only the ocean shader is visible
 * as water (prevents "two water levels": ocean plane + seafloor/beach mesh).
 *
 * ThreeTerrain keeps elevation on the geometry **Z** attribute (mesh is then
 * rotated so Z → world Y). We match Island3DEngine's flatten which uses getZ.
 */
export function flattenTerrainBelowWater(
  mesh: THREE.Mesh,
  waterLevel: number,
  seafloorDepth = waterLevel - 18,
): void {
  const pos = mesh.geometry.attributes.position as THREE.BufferAttribute | undefined;
  if (!pos) return;

  // Sample a few verts to detect height axis (Z = ThreeTerrain, Y = rotated plane)
  let zSpread = 0;
  let ySpread = 0;
  const n = Math.min(pos.count, 64);
  let zMin = Infinity, zMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
    zMin = Math.min(zMin, z); zMax = Math.max(zMax, z);
  }
  zSpread = zMax - zMin;
  ySpread = yMax - yMin;
  const heightOnZ = zSpread >= ySpread;

  for (let i = 0; i < pos.count; i++) {
    if (heightOnZ) {
      if (pos.getZ(i) < waterLevel + 0.05) pos.setZ(i, seafloorDepth);
    } else if (pos.getY(i) < waterLevel + 0.05) {
      pos.setY(i, seafloorDepth);
    }
  }
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeBoundingSphere();
}

/**
 * Remove leftover ocean/sea/open-water meshes so only one free surface remains.
 * Uses namingSsot.isOceanMesh rules (ocean ≡ sea ≡ open water).
 */
export function removeDuplicateWaterMeshes(root: THREE.Object3D, keep?: THREE.Object3D): void {
  const stale: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o === keep) return;
    if (o.userData?.grudgeKeepOcean) return;
    const n = (o.name || '').toLowerCase();
    const layer = String(o.userData?.grudgeLayer || '').toLowerCase();
    const kind = String((o.userData?.grudgeChunk as { kind?: string } | undefined)?.kind || '').toLowerCase();
    if (
      n === 'ocean' ||
      n === 'pirate-lobby-ocean' ||
      n === 'water' ||
      n === 'open-water' ||
      n === 'openwater' ||
      n === 'sea' ||
      n === 'seawater' ||
      n === 'r3f-water' ||
      n.includes('waterplane') ||
      n.includes('ocean') ||
      layer === 'water' ||
      layer === 'ocean' ||
      kind === 'ocean'
    ) {
      stale.push(o);
    }
  });
  for (const o of stale) {
    o.parent?.remove(o);
    if (o instanceof THREE.Mesh) {
      o.geometry?.dispose();
      const m = o.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
    }
  }
}

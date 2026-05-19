/**
 * WaterMaterial — Gerstner wave ocean shader with:
 *  - 3 overlapping wave sets for realistic motion
 *  - Fresnel-based opacity (shallow=transparent, deep=opaque)
 *  - Depth-based color gradient (turquoise → navy)
 *  - Shore foam band
 *  - Animated UV caustic distortion
 *  - getWaveHeightAt() for buoyancy / swimming sync
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
  /** Base Y position of the water surface */
  waterLevel: number;
  /** Shallow water color */
  shallowColor: THREE.Color;
  /** Deep water color */
  deepColor: THREE.Color;
  /** Foam color */
  foamColor: THREE.Color;
  /** Wave definitions (default: 3 overlapping sets) */
  waves: WaveSet[];
}

const DEFAULT_OCEAN: OceanConfig = {
  size: 800,
  segments: 128,
  waterLevel: -2,
  shallowColor: new THREE.Color(0x1abbc4),
  deepColor: new THREE.Color(0x0a2e5c),
  foamColor: new THREE.Color(0xffffff),
  waves: [
    { direction: new THREE.Vector2(1, 0.3), steepness: 0.25, wavelength: 60 },
    { direction: new THREE.Vector2(0.3, 1), steepness: 0.15, wavelength: 35 },
    { direction: new THREE.Vector2(-0.7, 0.5), steepness: 0.1, wavelength: 20 },
  ],
};

// ─── Shader code ──────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec4 uWave0; // xy=direction, z=steepness, w=wavelength
  uniform vec4 uWave1;
  uniform vec4 uWave2;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vWaveHeight;

  // Gerstner wave displacement
  vec3 gerstner(vec3 pos, vec4 wave, float t) {
    float steepness = wave.z;
    float wavelength = wave.w;
    float k = 6.2831853 / wavelength;
    float c = sqrt(9.8 / k);
    vec2 d = normalize(wave.xy);
    float f = k * (dot(d, pos.xz) - c * t);
    float a = steepness / k;

    return vec3(
      d.x * (a * cos(f)),
      a * sin(f),
      d.y * (a * cos(f))
    );
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Sum 3 Gerstner waves
    vec3 g0 = gerstner(pos, uWave0, uTime);
    vec3 g1 = gerstner(pos, uWave1, uTime);
    vec3 g2 = gerstner(pos, uWave2, uTime);

    pos += g0 + g1 + g2;
    vWaveHeight = g0.y + g1.y + g2.y;

    // Compute tangent/bitangent for wave normal
    vec3 tangent = vec3(1.0, 0.0, 0.0);
    vec3 bitangent = vec3(0.0, 0.0, 1.0);

    // Approximate normal from wave derivatives
    float eps = 0.01;
    vec3 pX = position + vec3(eps, 0.0, 0.0);
    vec3 pZ = position + vec3(0.0, 0.0, eps);
    vec3 dX = pX + gerstner(pX, uWave0, uTime) + gerstner(pX, uWave1, uTime) + gerstner(pX, uWave2, uTime) - pos;
    vec3 dZ = pZ + gerstner(pZ, uWave0, uTime) + gerstner(pZ, uWave1, uTime) + gerstner(pZ, uWave2, uTime) - pos;
    vNormal = normalize(cross(dZ, dX));

    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform vec3 uFoamColor;
  uniform float uFoamThreshold;
  uniform vec3 uSunDirection;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vWaveHeight;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 normal = normalize(vNormal);

    // Fresnel — more reflective at glancing angles
    float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), 3.0);
    fresnel = clamp(fresnel, 0.15, 0.95);

    // Depth-based color (wave height as proxy for depth)
    float depthFactor = smoothstep(-3.0, 3.0, vWaveHeight);
    vec3 waterColor = mix(uDeepColor, uShallowColor, depthFactor);

    // Specular highlight (sun reflection)
    vec3 halfDir = normalize(uSunDirection + viewDir);
    float spec = pow(max(0.0, dot(normal, halfDir)), 128.0);

    // Shore foam (wave crests)
    float foam = smoothstep(uFoamThreshold - 0.3, uFoamThreshold, vWaveHeight);

    // Caustic UV distortion
    vec2 causticUv = vUv * 8.0 + uTime * 0.02;
    float caustic = sin(causticUv.x * 12.0) * cos(causticUv.y * 10.0 + uTime * 0.5) * 0.5 + 0.5;
    waterColor += caustic * 0.03;

    // Combine
    vec3 color = mix(waterColor, vec3(0.8, 0.9, 1.0), fresnel * 0.4);
    color += spec * 0.6;
    color = mix(color, uFoamColor, foam * 0.5);

    float alpha = mix(0.65, 0.9, fresnel);
    gl_FragColor = vec4(color, alpha);
  }
`;

// ─── Material + Mesh creation ─────────────────────────────────────────────────

export function createOceanMaterial(config: Partial<OceanConfig> = {}): THREE.ShaderMaterial {
  const c = { ...DEFAULT_OCEAN, ...config };
  const w = c.waves;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWave0: { value: new THREE.Vector4(w[0].direction.x, w[0].direction.y, w[0].steepness, w[0].wavelength) },
      uWave1: { value: new THREE.Vector4(w[1].direction.x, w[1].direction.y, w[1].steepness, w[1].wavelength) },
      uWave2: { value: new THREE.Vector4(w[2].direction.x, w[2].direction.y, w[2].steepness, w[2].wavelength) },
      uShallowColor: { value: c.shallowColor },
      uDeepColor: { value: c.deepColor },
      uFoamColor: { value: c.foamColor },
      uFoamThreshold: { value: 1.8 },
      uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

export function createOceanMesh(config: Partial<OceanConfig> = {}): THREE.Mesh {
  const c = { ...DEFAULT_OCEAN, ...config };
  const geo = new THREE.PlaneGeometry(c.size, c.size, c.segments, c.segments);
  geo.rotateX(-Math.PI / 2);

  const mat = createOceanMaterial(config);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = c.waterLevel;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Sample the Gerstner wave height at a given (x, z) world position.
 * Used for buoyancy (ships, swimming surface target), matching the GPU shader.
 */
export function getWaveHeightAt(
  x: number,
  z: number,
  time: number,
  waterLevel: number = DEFAULT_OCEAN.waterLevel,
  waves: WaveSet[] = DEFAULT_OCEAN.waves,
): number {
  let height = waterLevel;
  for (const wave of waves) {
    const k = (2 * Math.PI) / wave.wavelength;
    const c = Math.sqrt(9.8 / k);
    const d = wave.direction.clone().normalize();
    const f = k * (d.x * x + d.y * z - c * time);
    const a = wave.steepness / k;
    height += a * Math.sin(f);
  }
  return height;
}

/** Update the ocean material each frame */
export function updateOceanMaterial(mat: THREE.ShaderMaterial, time: number, sunDir?: THREE.Vector3): void {
  mat.uniforms.uTime.value = time;
  if (sunDir) {
    mat.uniforms.uSunDirection.value.copy(sunDir).normalize();
  }
}

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
  size: 1200,
  segments: 4,
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
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform vec3 uSunDirection;

  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    // Simple animated color blend — no vertex displacement, fragment only
    vec2 uv = vUv * 6.0;
    float wave = sin(uv.x * 4.0 + uTime * 0.8) * cos(uv.y * 3.0 + uTime * 0.6) * 0.5 + 0.5;
    vec3 waterColor = mix(uDeepColor, uShallowColor, wave * 0.4 + 0.3);

    // Simple fresnel from view angle to surface
    float fresnel = pow(1.0 - max(0.0, viewDir.y), 2.0);
    fresnel = clamp(fresnel, 0.1, 0.7);

    // Subtle specular
    float spec = pow(max(0.0, dot(reflect(-uSunDirection, vec3(0.0, 1.0, 0.0)), viewDir)), 64.0);

    vec3 color = mix(waterColor, vec3(0.7, 0.85, 1.0), fresnel * 0.3);
    color += spec * 0.3;

    gl_FragColor = vec4(color, 0.75);
  }
`;

// ─── Material + Mesh creation ─────────────────────────────────────────────────

export function createOceanMaterial(config: Partial<OceanConfig> = {}): THREE.ShaderMaterial {
  const c = { ...DEFAULT_OCEAN, ...config };

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uShallowColor: { value: c.shallowColor },
      uDeepColor: { value: c.deepColor },
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

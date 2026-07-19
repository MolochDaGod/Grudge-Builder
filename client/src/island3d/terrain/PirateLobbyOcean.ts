/**
 * PirateLobbyOcean — TI / Tethical-quality water for the pirate open-world lobby.
 *
 * Lessons from Tactical Infinity islands-and-terrain + toonWaterShader:
 *   - Depth bands: shore (calm under piers/decks) → shallow → mid → deep → falloff
 *   - Wave amplitude scales to zero near land so beach/deck angles stay clean
 *   - Shore foam ring + crest foam only in open water
 *   - Beer-style color extinction shallow→deep without flattening normals
 *
 * Uses Gerstner geometry (same family as sailing DynamicOcean) with island-aware
 * fragment shading. Single ocean mesh per scene.
 */
import * as THREE from 'three';

export interface PirateOceanConfig {
  size?: number;
  segments?: number;
  waterLevel?: number;
  /** Deep ocean floor Y — for fish + depth color (does not move the plane) */
  oceanFloorLevel?: number;
  /** Island/land disks: calm water inside radius, foam at edge */
  islands?: Array<{ x: number; z: number; radius: number }>;
  /** Dock/pier positions: extra calm under decks */
  piers?: Array<{ x: number; z: number; radius: number }>;
  /** Wave amplitude (metres) — keep modest so tides read clearly */
  waveAmp?: number;
  /** Wave time scale (lower = calmer swell) */
  waveSpeed?: number;
}

const MAX_ISLANDS = 8;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uWaveAmp;
  uniform float uWaveSpeed;
  uniform vec4 uIslands[8]; // xy = xz center, z = radius, w = 1 if active
  uniform int uIslandCount;

  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying float vWaveH;
  varying float vShoreDist; // 0 = on land, 1 = deep open water
  varying vec2 vUv;

  vec3 gerstner(vec2 pos, float amp, float freq, float speed, vec2 dir, float steep, float t) {
    float phase = dot(dir, pos) * freq + t * speed;
    float s = sin(phase);
    float c = cos(phase);
    float q = steep / (freq * amp * 6.0 + 0.001);
    return vec3(q * amp * dir.x * c, amp * s, q * amp * dir.y * c);
  }

  // 0 at land center → 1 far from all islands/piers (preserves deck angle near shore)
  float shoreFactor(vec2 xz) {
    float best = 1.0;
    for (int i = 0; i < 8; i++) {
      if (i >= uIslandCount) break;
      vec4 isl = uIslands[i];
      if (isl.w < 0.5) continue;
      float d = length(xz - isl.xy);
      float r = max(isl.z, 1.0);
      // Calm inside island + soft ramp 0→1 over ~r*0.35 beyond beach
      float f = smoothstep(r * 0.92, r * 1.35, d);
      best = min(best, f);
    }
    return best;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    vec2 xz = pos.xz;

    float shore = shoreFactor(xz);
    vShoreDist = shore;

    // Wave amp collapses near beach/piers — deck stays flat relative to water
    float ampScale = mix(0.02, 1.0, shore * shore);
    float amp = uWaveAmp * ampScale;
    float spd = uWaveSpeed;
    float t = uTime;

    vec3 d = vec3(0.0);
    d += gerstner(xz, amp * 1.0,  0.035, spd * 0.65, normalize(vec2(1.0, 0.25)), 0.55, t);
    d += gerstner(xz, amp * 0.55, 0.065, spd * 1.05, normalize(vec2(-0.45, 1.0)), 0.48, t);
    d += gerstner(xz, amp * 0.28, 0.11,  spd * 1.4,  normalize(vec2(0.75, -0.55)), 0.4, t);
    d += gerstner(xz, amp * 0.14, 0.2,   spd * 1.9,  normalize(vec2(-0.85, -0.25)), 0.32, t);
    d += gerstner(xz, amp * 0.07, 0.32,  spd * 2.6,  normalize(vec2(0.35, 0.9)), 0.22, t);

    pos += d;
    vWaveH = d.y;

    // Analytic-ish normal from finite differences (only open water — shore keeps up)
    float eps = 0.45;
    float sX = shoreFactor(xz + vec2(eps, 0.0));
    float sZ = shoreFactor(xz + vec2(0.0, eps));
    float aX = uWaveAmp * mix(0.02, 1.0, sX * sX);
    float aZ = uWaveAmp * mix(0.02, 1.0, sZ * sZ);
    vec3 dX = gerstner(xz + vec2(eps,0.0), aX, 0.035, spd*0.65, normalize(vec2(1.0,0.25)), 0.55, t)
            + gerstner(xz + vec2(eps,0.0), aX*0.55, 0.065, spd*1.05, normalize(vec2(-0.45,1.0)), 0.48, t);
    vec3 dZ = gerstner(xz + vec2(0.0,eps), aZ, 0.035, spd*0.65, normalize(vec2(1.0,0.25)), 0.55, t)
            + gerstner(xz + vec2(0.0,eps), aZ*0.55, 0.065, spd*1.05, normalize(vec2(-0.45,1.0)), 0.48, t);
    vec3 tang = normalize(vec3(eps, dX.y - d.y, 0.0));
    vec3 binorm = normalize(vec3(0.0, dZ.y - d.y, eps));
    // Blend toward flat up near shore so pier angles stay honest
    vec3 nGerst = normalize(cross(binorm, tang));
    vNormalW = normalize(mix(vec3(0.0, 1.0, 0.0), nGerst, shore));

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorShallow;
  uniform vec3 uColorMid;
  uniform vec3 uColorDeep;
  uniform vec3 uColorAbyss;
  uniform vec3 uColorFoam;
  uniform vec3 uColorCrest;
  uniform vec3 uSunDirection;
  uniform float uOceanFloorLevel;
  uniform float uWaterLevel;

  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying float vWaveH;
  varying float vShoreDist;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    return vnoise(p)*0.5 + vnoise(p*2.1+5.3)*0.3 + vnoise(p*4.3+9.7)*0.2;
  }

  void main() {
    // Depth band from shore factor (not raw Y — preserves pier/deck relationship)
    // vShoreDist: 0 beach/pier calm · 1 open deep
    float t = clamp(vShoreDist, 0.0, 1.0);

    // TI-style banded water: shallow → mid → deep → abyss falloff
    vec3 col;
    if (t < 0.22) {
      col = mix(uColorShallow, uColorMid, t / 0.22);
    } else if (t < 0.55) {
      col = mix(uColorMid, uColorDeep, (t - 0.22) / 0.33);
    } else {
      // Deep → abyss falloff (darker open sea without hard clip)
      float deepT = (t - 0.55) / 0.45;
      col = mix(uColorDeep, uColorAbyss, smoothstep(0.0, 1.0, deepT));
    }

    // Beer-Lambert-ish depth tint using floor distance
    float waterDepth = max(uWaterLevel - uOceanFloorLevel, 4.0);
    float depthFactor = clamp(t * (waterDepth / 40.0), 0.0, 1.0);
    col = mix(col, uColorAbyss, depthFactor * 0.25);

    vec3 N = normalize(vNormalW);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 sun = normalize(uSunDirection);

    // Micro-normal only in open water (don't break beach angle)
    vec2 fw = vWorldPos.xz * 0.04 + vec2(uTime * 0.03, uTime * 0.02);
    float n = fbm(fw);
    vec3 microN = normalize(vec3(
      (fbm(fw + 0.03) - fbm(fw - 0.03)) * 1.2,
      1.0,
      (fbm(fw.yx + 0.03) - fbm(fw.yx - 0.03)) * 1.2
    ));
    N = normalize(mix(N, microN, 0.28 * t));

    // Shore foam ring (TI-style) — only at beach edge, not under decks (t~0)
    float shoreBand = smoothstep(0.05, 0.18, t) * (1.0 - smoothstep(0.28, 0.5, t));
    float foamNoise = fbm(vWorldPos.xz * 0.1 + vec2(uTime * 0.05, 0.0));
    float shoreFoam = shoreBand * mix(0.35, 1.0, smoothstep(0.3, 0.7, foamNoise));

    // Crest foam open water only
    float crest = smoothstep(0.08, 0.22, vWaveH) * smoothstep(0.35, 0.75, t) * 0.35;
    float totalFoam = clamp(shoreFoam + crest, 0.0, 1.0);
    col = mix(col, uColorFoam, totalFoam * 0.85);

    // Specular + fresnel
    vec3 H = normalize(sun + viewDir);
    float NdH = max(dot(N, H), 0.0);
    float spec = pow(NdH, 80.0) * 0.55 * t;
    col += uColorCrest * spec;

    float fresnel = pow(1.0 - max(dot(N, viewDir), 0.0), 3.5) * 0.32;
    vec3 skyCol = vec3(0.48, 0.66, 0.85);
    col = mix(col, skyCol, fresnel * mix(0.4, 1.0, t));

    // Caustics in shallow (under pier/beach reading)
    float caustic = pow(max(fbm(vWorldPos.xz * 0.18 + uTime * 0.05) *
                            fbm(vWorldPos.xz * 0.22 - uTime * 0.04), 0.0), 0.55) * 0.12;
    float causticMask = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.35, 0.55, t));
    col += vec3(0.12, 0.32, 0.28) * caustic * causticMask;

    // Transparency: clearer shallow (see floor / caustics), denser open sea
    // Shore ~0.72 so underwater sand reads; deep ~0.94 for horizon solidity
    float alpha = mix(0.72, 0.94, smoothstep(0.0, 0.85, t));
    alpha = mix(alpha, 0.97, totalFoam * 0.6);

    // Soft subsurface glow (shallow only) — life/phytoplankton read
    float sss = pow(max(dot(N, sun), 0.0), 1.5) * (1.0 - t) * 0.08;
    col += vec3(0.05, 0.18, 0.14) * sss;

    gl_FragColor = vec4(col, alpha);
  }
`;

function packIslands(
  islands: Array<{ x: number; z: number; radius: number }>,
  piers: Array<{ x: number; z: number; radius: number }>,
): { arr: THREE.Vector4[]; count: number } {
  const arr: THREE.Vector4[] = [];
  const merged = [
    ...islands.map((i) => ({ ...i })),
    ...piers.map((p) => ({ ...p })),
  ].slice(0, MAX_ISLANDS);

  for (let i = 0; i < MAX_ISLANDS; i++) {
    if (i < merged.length) {
      const m = merged[i];
      arr.push(new THREE.Vector4(m.x, m.z, m.radius, 1));
    } else {
      arr.push(new THREE.Vector4(0, 0, 1, 0));
    }
  }
  return { arr, count: merged.length };
}

/**
 * Create TI-quality pirate lobby ocean with beach→pier calm→deep falloff.
 */
export function createPirateLobbyOcean(config: PirateOceanConfig = {}): THREE.Mesh {
  const size = config.size ?? 2800;
  const segments = Math.min(192, Math.max(48, config.segments ?? 128));
  const waterLevel = config.waterLevel ?? 0;
  const oceanFloorLevel = config.oceanFloorLevel ?? -24;
  const islands = config.islands ?? [{ x: 0, z: 0, radius: 80 }];
  const piers = config.piers ?? [];

  const { arr, count } = packIslands(islands, piers);

  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);

  // Calm production waves — height travel is tide, not Gerstner extremes
  const waveAmp = config.waveAmp ?? 0.28;
  const waveSpeed = config.waveSpeed ?? 0.72;

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWaveAmp: { value: waveAmp },
      uWaveSpeed: { value: waveSpeed },
      uIslands: { value: arr },
      uIslandCount: { value: count },
      // Slightly greener shallow for floor visibility / life
      uColorShallow: { value: new THREE.Color(0x3ad0c8) },
      uColorMid: { value: new THREE.Color(0x1280a8) },
      uColorDeep: { value: new THREE.Color(0x0a4a72) },
      uColorAbyss: { value: new THREE.Color(0x021a2e) },
      uColorFoam: { value: new THREE.Color(0xe8f6ff) },
      uColorCrest: { value: new THREE.Color(0xf6fcff) },
      uSunDirection: { value: new THREE.Vector3(0.5, 0.9, 0.3).normalize() },
      uOceanFloorLevel: { value: oceanFloorLevel },
      uWaterLevel: { value: waterLevel },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = waterLevel;
  mesh.receiveShadow = true;
  mesh.name = 'pirate-lobby-ocean';
  mesh.frustumCulled = false;
  mesh.renderOrder = 0;
  mesh.userData.grudgeKeepOcean = true;
  mesh.userData.grudgeChunk = {
    chunkId: 'ocean_surface',
    kind: 'ocean',
    layer: 'ocean',
    chunkable: false,
    prefab: true,
  };
  mesh.userData.waterLevel = waterLevel;
  mesh.userData.baseWaterLevel = waterLevel;
  mesh.userData.oceanFloorLevel = oceanFloorLevel;
  mesh.userData.isPirateLobbyOcean = true;
  return mesh;
}

/** Infer island disks + pier calm zones from lobby bounds and dock meshes */
export function inferLobbyShoreDisks(
  lobbyRoot: THREE.Object3D,
  center: THREE.Vector3,
  size: THREE.Vector3,
): { islands: Array<{ x: number; z: number; radius: number }>; piers: Array<{ x: number; z: number; radius: number }> } {
  const islands: Array<{ x: number; z: number; radius: number }> = [
    {
      x: center.x,
      z: center.z,
      radius: Math.max(40, Math.min(size.x, size.z) * 0.28),
    },
  ];
  // Secondary land blobs if map is large (archipelago feel)
  const half = Math.min(size.x, size.z) * 0.22;
  if (half > 50) {
    islands.push(
      { x: center.x + half * 0.9, z: center.z - half * 0.4, radius: half * 0.55 },
      { x: center.x - half * 0.85, z: center.z + half * 0.35, radius: half * 0.5 },
    );
  }

  const piers: Array<{ x: number; z: number; radius: number }> = [];
  lobbyRoot.traverse((obj) => {
    const n = `${obj.name} ${obj.userData?.grudgeChunk?.kind ?? ''}`.toLowerCase();
    if (!/dock|pier|jetty|wharf|deck|harbor|harbour/.test(n) && obj.userData?.grudgeChunk?.kind !== 'dock') {
      return;
    }
    const p = new THREE.Vector3();
    obj.getWorldPosition(p);
    piers.push({ x: p.x, z: p.z, radius: 14 });
  });
  // Always calm south dock band (lobby ship system)
  piers.push({ x: center.x, z: center.z + size.z * 0.32, radius: 18 });

  return { islands, piers };
}

/**
 * Advance waves + optional tide height (world Y).
 * Tide is production SSOT (getTideHeight) — gentle ±22cm, 2× per game day.
 */
export function updatePirateLobbyOcean(
  mesh: THREE.Mesh,
  time: number,
  sunDir?: THREE.Vector3,
  opts?: { tideHeight?: number },
): void {
  const mat = mesh.material as THREE.ShaderMaterial;
  if (!mat?.uniforms?.uTime) return;
  mat.uniforms.uTime.value = time;
  if (sunDir && mat.uniforms.uSunDirection) {
    mat.uniforms.uSunDirection.value.copy(sunDir).normalize();
  }
  if (opts?.tideHeight !== undefined && Number.isFinite(opts.tideHeight)) {
    mesh.position.y = opts.tideHeight;
    mesh.userData.waterLevel = opts.tideHeight;
    if (mat.uniforms.uWaterLevel) {
      mat.uniforms.uWaterLevel.value = opts.tideHeight;
    }
  }
}

export function isPirateLobbyOcean(mesh: THREE.Mesh | null | undefined): boolean {
  return !!mesh?.userData?.isPirateLobbyOcean;
}

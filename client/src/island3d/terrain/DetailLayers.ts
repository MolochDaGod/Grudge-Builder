/**
 * DetailLayers — animated grass blades + sand shore detail overlay.
 *
 * Inspired by pixyjs shader_grass LOD patch approach:
 *   4 LOD rings around the camera, each patch 50×50 grid,
 *   exponentially scaled (1³, 2³, 3³, 4³) with inner cutoffs.
 *   Noise-based vertex displacement creates gentle wave motion.
 *
 * Integrates with the existing IslandTerrainGenerator biome map to only
 * render grass on grass/forest biomes and sand on beach biomes.
 */
import * as THREE from 'three';
import type { BiomeType } from './IslandTerrainGenerator';

// ── Noise function (same style as pixyjs sample) ─────────────────────────────

const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

function grassNoise(x: number, y: number, time: number, out: THREE.Vector3): THREE.Vector3 {
  const z = Math.sin(x * 0.1 + time) * Math.cos(y * 0.13 + time);
  const z1 = Math.sin(y * 0.15 + time) * Math.cos(x * 0.2 + time);
  return out.set(x, (z - z1) * 3, y);
}

function sandNoise(x: number, y: number, time: number, out: THREE.Vector3): THREE.Vector3 {
  // Sand is much more subtle — gentle ripples
  const z = Math.sin(x * 0.05 + time * 0.3) * Math.cos(y * 0.07 + time * 0.2) * 0.3;
  return out.set(x, z, y);
}

// ── LOD Patch ────────────────────────────────────────────────────────────────

const PATCH_SIZE = 50;
const PATCH_SEGMENTS = 99;

interface LODPatch {
  mesh: THREE.Mesh;
  lod: number;
  scale: number;
}

function createPatchGeometry(): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(PATCH_SIZE, PATCH_SIZE, PATCH_SEGMENTS, PATCH_SEGMENTS);
  geo.rotateX(-Math.PI * 0.5);
  return geo;
}

function generatePatch(
  mesh: THREE.Mesh,
  time: number,
  lod: number,
  noiseFn: (x: number, y: number, t: number, out: THREE.Vector3) => THREE.Vector3,
): void {
  const geo = mesh.geometry as THREE.BufferGeometry;
  const posArr = geo.attributes.position.array as Float32Array;
  const normArr = geo.attributes.normal.array as Float32Array;
  const sz = PATCH_SEGMENTS + 1; // 100
  const sz2 = sz / 2;
  const cutoff = 6 * lod; // Inner hole grows with LOD level

  for (let i = 0, ai = 0; i < sz * sz; i++, ai += 3) {
    const ix = i % sz;
    const iy = (i / sz) | 0;
    const x = ix - sz2;
    const y = iy - sz2;
    const ax = Math.abs(x);
    const ay = Math.abs(y);

    // Inner cutoff — flat zero area that the next-lower LOD fills
    if (ax < cutoff && ay < cutoff) {
      posArr[ai] = x;
      posArr[ai + 1] = 0;
      posArr[ai + 2] = y;
      normArr[ai] = 0;
      normArr[ai + 1] = 1;
      normArr[ai + 2] = 0;
      continue;
    }

    // World-space coords (accounting for mesh scale and position)
    const nx = x * mesh.scale.x + mesh.position.x;
    const ny = y * mesh.scale.z + mesh.position.z;

    // Sample noise
    const pp = noiseFn(nx, ny, time, _v0);

    // Compute normal via finite differences
    const dx = noiseFn(nx + 0.001 * mesh.scale.x, ny, time, _v1).sub(pp);
    const dy = noiseFn(nx, ny + 0.001 * mesh.scale.z, time, _v2).sub(pp);
    const vn = dy.cross(dx);
    vn.y /= 1 + lod; // Flatten normals at distance
    vn.normalize();

    posArr[ai] = x;
    posArr[ai + 1] = pp.y;
    posArr[ai + 2] = y;
    normArr[ai] = vn.x;
    normArr[ai + 1] = vn.y;
    normArr[ai + 2] = vn.z;
  }

  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
  geo.computeBoundingSphere();
}

// ── Detail Layer class ───────────────────────────────────────────────────────

export interface DetailLayerConfig {
  /** 'grass' or 'sand' */
  type: 'grass' | 'sand';
  /** Terrain biome map for masking */
  biomeMap: BiomeType[][];
  /** Terrain mesh for height sampling */
  terrainMesh: THREE.Mesh;
  gridW: number;
  gridH: number;
  terrainSize: number;
}

export class DetailLayer {
  readonly group = new THREE.Group();
  private patches: LODPatch[] = [];
  private config: DetailLayerConfig;
  private noiseFn: typeof grassNoise;

  constructor(config: DetailLayerConfig) {
    this.config = config;
    this.noiseFn = config.type === 'grass' ? grassNoise : sandNoise;

    const color = config.type === 'grass' ? 0x3a8c28 : 0xd4a84b;
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: config.type === 'grass' ? 0.85 : 0.95,
      metalness: 0,
      transparent: true,
      opacity: config.type === 'grass' ? 0.6 : 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
      dithering: true,
    });

    const baseGeo = createPatchGeometry();

    // Create 4 LOD rings
    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(baseGeo.clone(), material);
      const scale = (i + 1) ** 3; // 1, 8, 27, 64
      mesh.scale.set(scale, i + 1, scale);
      mesh.receiveShadow = true;
      mesh.frustumCulled = false; // patches move with camera
      this.group.add(mesh);
      this.patches.push({ mesh, lod: i, scale });
    }

    // Position slightly above terrain
    this.group.position.y = config.type === 'grass' ? 0.3 : 0.1;
  }

  /**
   * Update all patches — call every frame.
   * Patches follow the camera XZ position so grass/sand is always around the player.
   */
  update(time: number, cameraPos: THREE.Vector3): void {
    // Snap to terrain grid to avoid swimming
    const snapX = Math.round(cameraPos.x / 2) * 2;
    const snapZ = Math.round(cameraPos.z / 2) * 2;

    for (const patch of this.patches) {
      patch.mesh.position.x = snapX;
      patch.mesh.position.z = snapZ;
      generatePatch(patch.mesh, time, patch.lod, this.noiseFn);
    }
  }

  /**
   * Check if detail layer should be visible at a given world position
   * based on the biome map.
   */
  shouldRenderAt(worldX: number, worldZ: number): boolean {
    const { biomeMap, gridW, gridH, terrainSize } = this.config;
    const halfSize = terrainSize / 2;

    // Convert world coords to grid coords
    const gx = Math.floor(((worldX + halfSize) / terrainSize) * gridW);
    const gz = Math.floor(((worldZ + halfSize) / terrainSize) * gridH);

    if (gx < 0 || gx >= gridW || gz < 0 || gz >= gridH) return false;

    const biome = biomeMap[gz]?.[gx];
    if (this.config.type === 'grass') {
      return biome === 'grass' || biome === 'forest';
    }
    return biome === 'beach';
  }

  dispose(): void {
    for (const patch of this.patches) {
      patch.mesh.geometry.dispose();
      (patch.mesh.material as THREE.Material).dispose();
    }
  }
}

// ── Instanced grass blades (close-range detail for LOD 0) ────────────────────

export interface GrassBladeConfig {
  terrainMesh: THREE.Mesh;
  biomeMap: BiomeType[][];
  gridW: number;
  gridH: number;
  terrainSize: number;
  bladeCount?: number;
  spread?: number;
}

/**
 * Create instanced grass blade meshes around a center point.
 * These are thin triangular blades that sway with wind noise.
 * Only placed on grass/forest biomes.
 */
export function createGrassBlades(config: GrassBladeConfig): {
  mesh: THREE.InstancedMesh;
  update: (time: number, cameraPos: THREE.Vector3) => void;
} {
  const {
    terrainMesh,
    biomeMap,
    gridW,
    gridH,
    terrainSize,
    bladeCount = 2000,
    spread = 30,
  } = config;

  // Thin triangular blade geometry
  const bladeGeo = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    -0.05, 0,   0,   // base left
     0.05, 0,   0,   // base right
     0,    0.6, 0,   // tip
  ]);
  bladeGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  bladeGeo.computeVertexNormals();

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x4a9e2f,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    alphaTest: 0.1,
  });

  const instancedMesh = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeCount);
  instancedMesh.castShadow = false;
  instancedMesh.receiveShadow = true;
  instancedMesh.frustumCulled = false;

  const dummy = new THREE.Object3D();
  const raycaster = new THREE.Raycaster();
  const downDir = new THREE.Vector3(0, -1, 0);

  // Place blades initially
  function placeBlades(centerX: number, centerZ: number) {
    let placed = 0;
    const halfTerrain = terrainSize / 2;

    for (let i = 0; i < bladeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * spread;
      const wx = centerX + Math.cos(angle) * dist;
      const wz = centerZ + Math.sin(angle) * dist;

      // Check biome
      const gx = Math.floor(((wx + halfTerrain) / terrainSize) * gridW);
      const gz = Math.floor(((wz + halfTerrain) / terrainSize) * gridH);
      if (gx < 0 || gx >= gridW || gz < 0 || gz >= gridH) continue;
      const biome = biomeMap[gz]?.[gx];
      if (biome !== 'grass' && biome !== 'forest') continue;

      // Raycast to get terrain height
      raycaster.set(new THREE.Vector3(wx, 200, wz), downDir);
      const hits = raycaster.intersectObject(terrainMesh);
      const y = hits.length > 0 ? hits[0].point.y : 0;

      // Skip underwater
      if (y < -1) continue;

      dummy.position.set(wx, y, wz);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      const scale = 0.5 + Math.random() * 1.0;
      dummy.scale.set(scale, scale + Math.random() * 0.5, scale);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(placed, dummy.matrix);

      // Color variation
      const colorVariation = 0.8 + Math.random() * 0.4;
      instancedMesh.setColorAt(placed, new THREE.Color(
        0.29 * colorVariation,
        0.62 * colorVariation,
        0.18 * colorVariation,
      ));

      placed++;
    }

    instancedMesh.count = placed;
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
  }

  let lastSnapX = Infinity;
  let lastSnapZ = Infinity;

  function update(time: number, cameraPos: THREE.Vector3) {
    // Re-place blades when camera moves far enough
    const snapX = Math.round(cameraPos.x / 10) * 10;
    const snapZ = Math.round(cameraPos.z / 10) * 10;

    if (snapX !== lastSnapX || snapZ !== lastSnapZ) {
      lastSnapX = snapX;
      lastSnapZ = snapZ;
      placeBlades(snapX, snapZ);
    }

    // Wind sway via shader (applied per-instance in the vertex shader)
    // For now, gentle rotation of the whole mesh as a simple approximation
    instancedMesh.rotation.z = Math.sin(time * 2) * 0.03;
    instancedMesh.rotation.x = Math.cos(time * 1.5) * 0.02;
  }

  // Initial placement at origin
  placeBlades(0, 0);

  return { mesh: instancedMesh, update };
}

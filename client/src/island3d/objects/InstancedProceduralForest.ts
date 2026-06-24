/**
 * InstancedProceduralForest — high-performance procedural trees for forest biomes.
 *
 * Adapted from the Three.js discourse instanced-forest pattern:
 * instanced branch cylinders + instanced leaf billboards, seeded placement,
 * per-tree bounds for optional frustum culling.
 *
 * @see https://discourse.threejs.org/t/procedural-instanced-forest-high-performance-real-trees/88610
 */
import * as THREE from 'three';
import { getTerrainHeightAt, type BiomeType } from '../terrain/IslandTerrainGenerator';

export interface ForestConfig {
  treeCount?: number;
  forestRadius?: number;
  clearRadius?: number;
  trunkLengthMin?: number;
  trunkLengthMax?: number;
  branchLevels?: number;
  leafSize?: number;
  leafDensity?: number;
}

const DEFAULT_FOREST: Required<ForestConfig> = {
  treeCount: 220,
  forestRadius: 340,
  clearRadius: 40,
  trunkLengthMin: 4,
  trunkLengthMax: 7,
  branchLevels: 3,
  leafSize: 0.7,
  leafDensity: 3,
};

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createLeafTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#5aa052');
  grad.addColorStop(1, '#3d8038');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.05);
  ctx.bezierCurveTo(size * 0.8, size * 0.2, size * 0.82, size * 0.7, size * 0.5, size * 0.95);
  ctx.bezierCurveTo(size * 0.18, size * 0.7, size * 0.2, size * 0.2, size * 0.5, size * 0.05);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  return tex;
}

interface TreeMatrices {
  branchMatrices: THREE.Matrix4[];
  leafMatrices: THREE.Matrix4[];
  leafColors: THREE.Color[];
  center: THREE.Vector3;
  radius: number;
}

function generateTreeMatrices(
  rng: () => number,
  cfg: Required<ForestConfig>,
  baseX: number,
  baseZ: number,
  baseY: number,
): TreeMatrices {
  const branchMatrices: THREE.Matrix4[] = [];
  const leafMatrices: THREE.Matrix4[] = [];
  const leafColors: THREE.Color[] = [];

  const trunkLen = cfg.trunkLengthMin + rng() * (cfg.trunkLengthMax - cfg.trunkLengthMin);
  const trunkR = 0.2 + rng() * 0.15;
  const mat = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3(baseX, baseY, baseZ);

  // Trunk
  quat.setFromEuler(new THREE.Euler(0, rng() * Math.PI * 2, 0));
  scale.set(trunkR, trunkLen, trunkR);
  mat.compose(pos.clone().add(new THREE.Vector3(0, trunkLen * 0.5, 0)), quat, scale);
  branchMatrices.push(mat.clone());

  type BranchState = { pos: THREE.Vector3; dir: THREE.Vector3; len: number; rad: number };
  const queue: BranchState[] = [{
    pos: pos.clone().add(new THREE.Vector3(0, trunkLen, 0)),
    dir: new THREE.Vector3(0, 1, 0),
    len: trunkLen * 0.55,
    rad: trunkR * 0.7,
  }];

  const hue = 0.28 + rng() * 0.08;
  const leafColor = new THREE.Color().setHSL(hue, 0.5, 0.38 + rng() * 0.12);

  for (let level = 0; level < cfg.branchLevels && queue.length; level++) {
    const next: BranchState[] = [];
    const batch = queue.splice(0, queue.length);

    for (const b of batch) {
      const branches = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < branches; i++) {
        const angle = (i / branches) * Math.PI * 2 + rng() * 0.5;
        const tilt = 0.4 + rng() * 0.35;
        const dir = new THREE.Vector3(
          Math.sin(angle) * Math.sin(tilt),
          Math.cos(tilt),
          Math.cos(angle) * Math.sin(tilt),
        ).normalize();

        const len = b.len * (0.55 + rng() * 0.15);
        const rad = b.rad * 0.65;
        const end = b.pos.clone().add(dir.clone().multiplyScalar(len * 0.5));

        quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        scale.set(rad, len, rad);
        mat.compose(end, quat, scale);
        branchMatrices.push(mat.clone());

        if (level >= cfg.branchLevels - 1) {
          for (let l = 0; l < cfg.leafDensity; l++) {
            const spread = cfg.leafSize * (0.5 + rng());
            const lp = end.clone().add(new THREE.Vector3(
              (rng() - 0.5) * spread * 2,
              (rng() - 0.3) * spread,
              (rng() - 0.5) * spread * 2,
            ));
            quat.setFromEuler(new THREE.Euler(rng() * 0.3, rng() * Math.PI * 2, rng() * 0.3));
            scale.set(spread, spread, 1);
            mat.compose(lp, quat, scale);
            leafMatrices.push(mat.clone());
            leafColors.push(leafColor.clone());
          }
        } else {
          next.push({
            pos: end.clone().add(dir.clone().multiplyScalar(len * 0.5)),
            dir,
            len,
            rad,
          });
        }
      }
    }
    queue.push(...next);
  }

  return {
    branchMatrices,
    leafMatrices,
    leafColors,
    center: new THREE.Vector3(baseX, baseY + trunkLen, baseZ),
    radius: trunkLen * 1.8,
  };
}

export class InstancedProceduralForest {
  readonly group = new THREE.Group();
  private branchMesh: THREE.InstancedMesh | null = null;
  private leafMesh: THREE.InstancedMesh | null = null;
  private leafTexture: THREE.CanvasTexture;
  private treeCount = 0;

  constructor() {
    this.leafTexture = createLeafTexture();
    this.group.name = 'instanced_procedural_forest';
  }

  /**
   * Scatter trees on forest/grass biomes around terrain (skips rock/water).
   */
  generate(
    seed: string,
    terrainMesh: THREE.Mesh,
    biomeMap: BiomeType[][],
    gridW: number,
    gridH: number,
    terrainSize = 1024,
    options: ForestConfig = {},
  ): { trees: number; branches: number; leaves: number } {
    this.disposeMeshes();

    const cfg = { ...DEFAULT_FOREST, ...options };
    const rng = mulberry32(hashStr(seed + '_forest'));

    const allBranches: THREE.Matrix4[] = [];
    const allLeaves: THREE.Matrix4[] = [];
    const allLeafColors: THREE.Color[] = [];

    let placed = 0;
    let attempts = 0;
    const maxAttempts = cfg.treeCount * 12;

    while (placed < cfg.treeCount && attempts < maxAttempts) {
      attempts++;
      const r = cfg.clearRadius + Math.sqrt(rng()) * cfg.forestRadius;
      const theta = rng() * Math.PI * 2;
      const wx = Math.cos(theta) * r;
      const wz = Math.sin(theta) * r;

      const gx = Math.round(((wx / terrainSize) + 0.5) * (gridW - 1));
      const gz = Math.round(((wz / terrainSize) + 0.5) * (gridH - 1));
      const biome = biomeMap[gz]?.[gx];
      if (biome !== 'forest' && biome !== 'grass') continue;
      if (biome === 'grass' && rng() > 0.35) continue;

      const wy = getTerrainHeightAt(terrainMesh, wx, wz);
      if (wy === null || wy < -1) continue;

      const treeRng = mulberry32(hashStr(`${seed}_t${placed}`));
      const tree = generateTreeMatrices(treeRng, cfg, wx, wz, wy);
      allBranches.push(...tree.branchMatrices);
      allLeaves.push(...tree.leafMatrices);
      allLeafColors.push(...tree.leafColors);
      placed++;
    }

    if (allBranches.length === 0) {
      return { trees: 0, branches: 0, leaves: 0 };
    }

    const barkGeo = new THREE.CylinderGeometry(1, 1.2, 1, 6);
    const barkMat = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.9,
      flatShading: true,
    });
    this.branchMesh = new THREE.InstancedMesh(barkGeo, barkMat, allBranches.length);
    this.branchMesh.castShadow = true;
    this.branchMesh.receiveShadow = true;
    allBranches.forEach((m, i) => this.branchMesh!.setMatrixAt(i, m));
    this.branchMesh.instanceMatrix.needsUpdate = true;

    const leafGeo = new THREE.PlaneGeometry(1, 1);
    const leafMat = new THREE.MeshStandardMaterial({
      map: this.leafTexture,
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.8,
    });
    this.leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, allLeaves.length);
    allLeaves.forEach((m, i) => this.leafMesh!.setMatrixAt(i, m));
    this.leafMesh.instanceMatrix.needsUpdate = true;

    const colorArray = new Float32Array(allLeafColors.length * 3);
    allLeafColors.forEach((c, i) => {
      colorArray[i * 3] = c.r;
      colorArray[i * 3 + 1] = c.g;
      colorArray[i * 3 + 2] = c.b;
    });
    this.leafMesh.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3);
    this.leafMesh.instanceColor.needsUpdate = true;

    this.group.add(this.branchMesh);
    this.group.add(this.leafMesh);
    this.treeCount = placed;

    return {
      trees: placed,
      branches: allBranches.length,
      leaves: allLeaves.length,
    };
  }

  update(_dt: number, _cameraPos: THREE.Vector3): void {
    // Leaf sway could be added via custom shader uniforms (future)
  }

  private disposeMeshes(): void {
    if (this.branchMesh) {
      this.group.remove(this.branchMesh);
      this.branchMesh.geometry.dispose();
      (this.branchMesh.material as THREE.Material).dispose();
      this.branchMesh = null;
    }
    if (this.leafMesh) {
      this.group.remove(this.leafMesh);
      this.leafMesh.geometry.dispose();
      (this.leafMesh.material as THREE.Material).dispose();
      this.leafMesh = null;
    }
  }

  dispose(): void {
    this.disposeMeshes();
    this.leafTexture.dispose();
    this.group.parent?.remove(this.group);
  }
}
/**
 * BattleNatureScatter — legacy export name for the production home-island
 * ecosystem scatter.
 *
 * Warlords production rule:
 * - only approved, real GLB multi-mesh packs from natureAssetCatalog
 * - never procedural billboards, square-leaf island_tree, or megakit dumps
 * - clone exact catalogued named variants; never fall back to an arbitrary pack mesh
 * - fit every prop in meters and reject implausible slopes
 *
 * The function name is preserved because Island3DEngine already imports it.
 */
import * as THREE from 'three';
import {
  getTerrainHeightAt,
  getTerrainNormalAt,
} from '../terrain/IslandTerrainGenerator';
import {
  STYLIZED_PACK_PATHS,
  STYLIZED_VARIANTS,
  isBannedNaturePath,
} from '@shared/definitions/natureAssetCatalog';
import {
  fitModelToHeight,
  loadIslandResourceTemplate,
} from './IslandResourceLoader';
import {
  HOME_ISLAND_NATURE_INSTANCE_BUDGET,
  HOME_ISLAND_TREE_CANOPY_LAYERS,
} from '@shared/definitions/homeIslandQuality';

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface BattleNatureScatterOpts {
  worldSizeM: number;
  seed: string;
  /** Clear radius around camp (no trees) */
  campClearRadiusM?: number;
  campX?: number;
  campZ?: number;
  treeCount?: number;
  rockCount?: number;
  bushCount?: number;
  /** Meadow / forest floor cover */
  grassCount?: number;
  /** Extra density passes */
  layers?: number;
}

type ScatterKind = 'tree' | 'pine' | 'rock' | 'bush' | 'plant' | 'flower';

interface ScatterSource {
  path: string;
  variants: readonly string[];
  targetHeight: [number, number];
  maxSlopeRad: number;
}

function sourceFor(kind: ScatterKind, rng: () => number): ScatterSource {
  switch (kind) {
    case 'tree':
      return rng() < 0.7
        ? {
            path: STYLIZED_PACK_PATHS.vegetation,
            variants: STYLIZED_VARIANTS.vegetationTrees,
            targetHeight: [7.5, 13.5],
            maxSlopeRad: 0.5,
          }
        : {
            path: STYLIZED_PACK_PATHS.plainsTrees,
            variants: STYLIZED_VARIANTS.plainsTrees,
            targetHeight: [8.5, 14.5],
            maxSlopeRad: 0.48,
          };
    case 'pine':
      return {
        path: STYLIZED_PACK_PATHS.vegetation,
        variants: STYLIZED_VARIANTS.vegetationTrees.filter((n) => /pine|conifer/i.test(n)),
        targetHeight: [9, 15.5],
        maxSlopeRad: 0.55,
      };
    case 'rock':
      return {
        path: STYLIZED_PACK_PATHS.rocks,
        variants: STYLIZED_VARIANTS.stylizedRocks,
        targetHeight: [1.1, 3.8],
        maxSlopeRad: 0.78,
      };
    case 'bush':
      return {
        path: STYLIZED_PACK_PATHS.vegetation,
        variants: STYLIZED_VARIANTS.vegetationRocks.filter((n) => /bush/i.test(n)),
        targetHeight: [0.8, 1.8],
        maxSlopeRad: 0.48,
      };
    case 'flower':
      return {
        path: STYLIZED_PACK_PATHS.flowers,
        variants: STYLIZED_VARIANTS.flowers,
        targetHeight: [0.35, 0.8],
        maxSlopeRad: 0.42,
      };
    case 'plant':
    default:
      return {
        path: STYLIZED_PACK_PATHS.foliage,
        variants: STYLIZED_VARIANTS.foliage,
        targetHeight: [0.45, 1.25],
        maxSlopeRad: 0.42,
      };
  }
}

function targetHeight(src: ScatterSource, rng: () => number): number {
  return src.targetHeight[0] + (src.targetHeight[1] - src.targetHeight[0]) * rng();
}

function exactVariantName(src: ScatterSource, rng: () => number): string | null {
  if (!src.variants.length) return null;
  return src.variants[Math.min(src.variants.length - 1, Math.floor(rng() * src.variants.length))] ?? null;
}

function enablePbrShadows(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std?.map) std.map.colorSpace = THREE.SRGBColorSpace;
      if (std?.normalMap) std.normalMap.colorSpace = THREE.NoColorSpace;
      if (std) std.needsUpdate = true;
    }
  });
}

/**
 * Scatter approved premium nature across the home island. Requested counts are
 * scaled toward HOME_ISLAND_NATURE_INSTANCE_BUDGET so the quality bar remains a
 * single shared constant rather than a second hard-coded density list.
 */
export async function scatterBattleNatureOnTerrain(
  scene: THREE.Scene,
  terrainMesh: THREE.Mesh,
  opts: BattleNatureScatterOpts,
): Promise<THREE.Group> {
  const root = new THREE.Group();
  root.name = 'warlords_premium_nature_scatter';

  const world = opts.worldSizeM;
  const rng = makeRng(hashSeed(`${opts.seed}:warlords-premium-nature-v2`));
  const campR = opts.campClearRadiusM ?? 80;
  const cx = opts.campX ?? 0;
  const cz = opts.campZ ?? 0;
  const layers = Math.max(1, HOME_ISLAND_TREE_CANOPY_LAYERS, opts.layers ?? 0);

  const requested = {
    trees: opts.treeCount ?? 220,
    rocks: opts.rockCount ?? 110,
    bushes: opts.bushCount ?? 90,
    ground: opts.grassCount ?? 240,
  };
  const requestedTotal = requested.trees + requested.rocks + requested.bushes + requested.ground;
  const densityScale = Math.max(1, Math.min(1.75, HOME_ISLAND_NATURE_INSTANCE_BUDGET / Math.max(1, requestedTotal)));
  const treeTarget = Math.round(requested.trees * densityScale);
  const rockTarget = Math.round(requested.rocks * densityScale);
  const bushTarget = Math.round(requested.bushes * densityScale);
  const groundTarget = Math.round(requested.ground * densityScale);

  // Warm only the approved production packs; IslandResourceLoader caches templates.
  await Promise.all([
    STYLIZED_PACK_PATHS.vegetation,
    STYLIZED_PACK_PATHS.plainsTrees,
    STYLIZED_PACK_PATHS.rocks,
    STYLIZED_PACK_PATHS.foliage,
    STYLIZED_PACK_PATHS.flowers,
  ].map((path) => loadIslandResourceTemplate(path).catch(() => null)));

  const tryPlace = async (kind: ScatterKind): Promise<boolean> => {
    const x = (rng() - 0.5) * world * 0.92;
    const z = (rng() - 0.5) * world * 0.92;
    if (Math.hypot(x - cx, z - cz) < campR) return false;

    const y = getTerrainHeightAt(terrainMesh, x, z);
    if (y == null || y < 0.4) return false;

    const src = sourceFor(kind, rng);
    if (isBannedNaturePath(src.path) || src.variants.length === 0) return false;

    const normal = getTerrainNormalAt(terrainMesh, x, z);
    const slope = normal
      ? Math.acos(THREE.MathUtils.clamp(normal.y, -1, 1))
      : 0;
    if (slope > src.maxSlopeRad) return false;

    const variantName = exactVariantName(src, rng);
    if (!variantName) return false;

    try {
      const template = await loadIslandResourceTemplate(src.path);
      const source = template.getObjectByName(variantName);
      if (!source) return false;

      const obj = source.clone(true);
      fitModelToHeight(obj, targetHeight(src, rng));
      enablePbrShadows(obj);
      obj.rotation.y = rng() * Math.PI * 2;
      obj.position.set(x, y, z);
      obj.userData.warlordsNature = kind;
      obj.userData.sourcePath = src.path;
      obj.userData.sourceVariant = variantName;
      root.add(obj);
      return true;
    } catch {
      return false;
    }
  };

  let trees = 0;
  let rocks = 0;
  let bushes = 0;
  let ground = 0;
  const totalTarget = treeTarget + rockTarget + bushTarget + groundTarget;
  const attemptsPerLayer = Math.ceil(totalTarget / layers) * 5;

  for (let layer = 0; layer < layers; layer++) {
    for (let i = 0; i < attemptsPerLayer; i++) {
      if (trees >= treeTarget && rocks >= rockTarget && bushes >= bushTarget && ground >= groundTarget) break;
      const roll = rng();
      if (roll < 0.43 && trees < treeTarget) {
        if (await tryPlace(rng() > 0.78 ? 'pine' : 'tree')) trees++;
      } else if (roll < 0.6 && rocks < rockTarget) {
        if (await tryPlace('rock')) rocks++;
      } else if (roll < 0.75 && bushes < bushTarget) {
        if (await tryPlace('bush')) bushes++;
      } else if (ground < groundTarget) {
        if (await tryPlace(rng() > 0.78 ? 'flower' : 'plant')) ground++;
      }
    }
  }

  scene.add(root);
  console.log(
    `[WarlordsNature] premium home island: ${trees} trees, ${rocks} rocks, ` +
      `${bushes} bushes, ${ground} ground-cover · ${layers} passes · exact approved GLB variants only`,
  );
  return root;
}

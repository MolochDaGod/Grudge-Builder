/**
 * BattleNatureScatter — same trees/rocks/bushes as
 * https://game.grudge-studio.com/game/battle (NatureDecor.tsx).
 *
 * SSOT paths: assets.grudge-studio.com/models/nature/CommonTree_*.gltf etc.
 * Used on home island instead of stylized multi-pack / realistic_trees.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';
import { getTerrainHeightAt } from '../terrain/IslandTerrainGenerator';
import {
  BATTLE_NATURE_PACK,
  pickBattleNaturePath,
} from '@shared/definitions/natureAssetCatalog';
import { fitModelToHeight } from './IslandResourceLoader';

const loader = new GLTFLoader();
const templateCache = new Map<string, THREE.Group>();

async function loadTemplate(path: string): Promise<THREE.Group> {
  const cached = templateCache.get(path);
  if (cached) return cached;
  const gltf = await loader.loadAsync(assetUrl(path));
  const g = gltf.scene as THREE.Group;
  g.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
      const m = (c as THREE.Mesh).material;
      if (m && !Array.isArray(m)) {
        const sm = m as THREE.MeshStandardMaterial;
        if (sm.map) sm.map.colorSpace = THREE.SRGBColorSpace;
        if (sm.normalMap) sm.normalMap.colorSpace = THREE.NoColorSpace;
        sm.needsUpdate = true;
      }
    }
  });
  templateCache.set(path, g);
  return g;
}

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
  /** Tree count target (CommonTree + DeadTree + Pine) */
  treeCount?: number;
  rockCount?: number;
  bushCount?: number;
  /** Extra density ring layers (battle-style border + inland) */
  layers?: number;
}

/**
 * Scatter battle nature pack across the home-island board.
 * Pattern mirrors NatureDecor border density + inland clusters.
 */
export async function scatterBattleNatureOnTerrain(
  scene: THREE.Scene,
  terrainMesh: THREE.Mesh,
  opts: BattleNatureScatterOpts,
): Promise<THREE.Group> {
  const root = new THREE.Group();
  root.name = 'battle_nature_scatter';

  const world = opts.worldSizeM;
  const half = world / 2;
  const rng = makeRng(hashSeed(opts.seed + ':battle-nature'));
  const campR = opts.campClearRadiusM ?? 80;
  const cx = opts.campX ?? 0;
  const cz = opts.campZ ?? 0;
  const layers = Math.max(1, opts.layers ?? 4);
  const treeTarget = opts.treeCount ?? 180;
  const rockTarget = opts.rockCount ?? 90;
  const bushTarget = opts.bushCount ?? 70;

  // Preload common templates
  await Promise.all(
    [
      ...BATTLE_NATURE_PACK.trees,
      ...BATTLE_NATURE_PACK.deadTrees.slice(0, 2),
      ...BATTLE_NATURE_PACK.rocks.slice(0, 4),
      ...BATTLE_NATURE_PACK.bushes,
    ].map((p) => loadTemplate(p).catch(() => null)),
  );

  const tryPlace = async (
    kind: 'tree' | 'deadTrees' | 'pines' | 'rocks' | 'bushes' | 'mushrooms',
    heightM: number,
    scaleJitter: number,
  ): Promise<boolean> => {
    const x = (rng() - 0.5) * world * 0.92;
    const z = (rng() - 0.5) * world * 0.92;
    if (Math.hypot(x - cx, z - cz) < campR) return false;
    const y = getTerrainHeightAt(terrainMesh, x, z);
    if (y == null || y < 0.5) return false;
    // Prefer mid/high land for trees
    if ((kind === 'tree' || kind === 'pines' || kind === 'deadTrees') && y < 2.5) return false;

    const path = pickBattleNaturePath(kind, rng);
    try {
      const tpl = await loadTemplate(path);
      const obj = tpl.clone(true);
      fitModelToHeight(obj, heightM * (0.85 + rng() * scaleJitter));
      obj.rotation.y = rng() * Math.PI * 2;
      obj.position.set(x, y, z);
      obj.userData.battleNature = kind;
      root.add(obj);
      return true;
    } catch {
      return false;
    }
  };

  // Layered placement (4+ rings of density like battle border + inland)
  let trees = 0;
  let rocks = 0;
  let bushes = 0;
  const attemptsPerLayer = Math.ceil((treeTarget + rockTarget + bushTarget) / layers) * 4;

  for (let layer = 0; layer < layers; layer++) {
    for (let i = 0; i < attemptsPerLayer; i++) {
      const roll = rng();
      if (roll < 0.55 && trees < treeTarget) {
        const usePine = rng() > 0.75;
        const useDead = !usePine && rng() > 0.88;
        const ok = await tryPlace(
          useDead ? 'deadTrees' : usePine ? 'pines' : 'tree',
          usePine ? 9 + rng() * 4 : 6 + rng() * 5,
          0.4,
        );
        if (ok) trees++;
      } else if (roll < 0.78 && rocks < rockTarget) {
        if (await tryPlace('rocks', 0.8 + rng() * 1.4, 0.5)) rocks++;
      } else if (bushes < bushTarget) {
        if (await tryPlace('bushes', 0.7 + rng() * 0.6, 0.35)) bushes++;
        else if (rng() > 0.7 && (await tryPlace('mushrooms', 0.25 + rng() * 0.2, 0.3))) {
          bushes++;
        }
      }
    }
  }

  scene.add(root);
  console.log(
    `[BattleNature] home island: ${trees} trees (CommonTree/Pine/Dead), ${rocks} rocks, ${bushes} bushes/mushrooms · ${layers} layers · SSOT=game/battle NatureDecor`,
  );
  return root;
}

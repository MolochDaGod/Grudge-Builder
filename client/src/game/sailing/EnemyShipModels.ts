/**
 * Enemy ship damage-state models (dangerroom ship states).
 *
 *   state_0 / healthy → intact hull
 *   state_1 / damaged → mid damage
 *   state_2 / sunk    → wreck / sunk
 *
 * Assets: assets.grudge-studio.com/models/ships/enemy/{healthy,damaged,sunk}.glb
 * Source: Island-Crusade dangerroom dist/public/ship/state_{0,1,2}.glb
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { resolveGameAssetPath } from '@/lib/gameAssetPath';

export type EnemyShipDamageState = 'healthy' | 'damaged' | 'sunk';

/** Numeric state matching dangerroom files (0 healthy, 1 damaged, 2 sunk). */
export type EnemyShipStateIndex = 0 | 1 | 2;

export const ENEMY_SHIP_DAMAGE_STATES: readonly EnemyShipDamageState[] = [
  'healthy',
  'damaged',
  'sunk',
] as const;

/** CDN / public paths for enemy ship damage meshes. */
export const ENEMY_SHIP_MODEL_PATHS: Record<EnemyShipDamageState, string> = {
  healthy: '/models/ships/enemy/healthy.glb',
  damaged: '/models/ships/enemy/damaged.glb',
  sunk: '/models/ships/enemy/sunk.glb',
};

/** Aliases matching source filenames state_0 / state_1 / state_2. */
export const ENEMY_SHIP_STATE_INDEX_PATHS: Record<EnemyShipStateIndex, string> = {
  0: '/models/ships/enemy/state_0.glb',
  1: '/models/ships/enemy/state_1.glb',
  2: '/models/ships/enemy/state_2.glb',
};

const STATE_BY_INDEX: EnemyShipDamageState[] = ['healthy', 'damaged', 'sunk'];

/** Map 0–1 health ratio → damage state. */
export function enemyShipStateFromHealthRatio(ratio: number): EnemyShipDamageState {
  if (ratio <= 0) return 'sunk';
  if (ratio <= 0.45) return 'damaged';
  return 'healthy';
}

export function enemyShipStateFromHealth(health: number, maxHealth: number): EnemyShipDamageState {
  if (maxHealth <= 0) return 'sunk';
  return enemyShipStateFromHealthRatio(health / maxHealth);
}

export function enemyShipStateToIndex(state: EnemyShipDamageState): EnemyShipStateIndex {
  const i = STATE_BY_INDEX.indexOf(state);
  return (i >= 0 ? i : 0) as EnemyShipStateIndex;
}

export function enemyShipIndexToState(index: number): EnemyShipDamageState {
  if (index <= 0) return 'healthy';
  if (index === 1) return 'damaged';
  return 'sunk';
}

// ── Loader cache ─────────────────────────────────────────────────────────────

const gltfCache = new Map<string, Promise<GLTF>>();
const loader = new GLTFLoader();

function loadEnemyShipGltf(path: string): Promise<GLTF> {
  const url = resolveGameAssetPath(path);
  let pending = gltfCache.get(url);
  if (!pending) {
    pending = new Promise<GLTF>((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });
    gltfCache.set(url, pending);
  }
  return pending;
}

export interface EnemyShipVisual {
  root: THREE.Group;
  currentState: EnemyShipDamageState;
  /** Scale applied after fit-to-targetLength */
  scale: number;
}

/**
 * Load a single damage-state mesh as a Group ready for the ocean scene.
 */
export async function loadEnemyShipMesh(
  state: EnemyShipDamageState = 'healthy',
  targetLength = 12,
): Promise<THREE.Group> {
  const path = ENEMY_SHIP_MODEL_PATHS[state];
  const gltf = await loadEnemyShipGltf(path);
  const model = gltf.scene.clone(true);

  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => m.clone());
        } else {
          mesh.material = mesh.material.clone();
        }
      }
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scaleFactor = targetLength / Math.max(size.z, size.x, 0.1);
  model.scale.setScalar(scaleFactor);

  box.setFromObject(model);
  const center = new THREE.Vector3();
  box.getCenter(center);
  model.position.sub(center);
  model.position.y = 0;

  const root = new THREE.Group();
  root.name = `enemy_ship_${state}`;
  root.userData.enemyShipState = state;
  root.userData.enemyShipScale = scaleFactor;
  root.add(model);
  return root;
}

/**
 * Create an enemy ship visual that can swap healthy → damaged → sunk.
 */
export async function createEnemyShipVisual(
  targetLength = 12,
  initial: EnemyShipDamageState = 'healthy',
): Promise<EnemyShipVisual> {
  const root = await loadEnemyShipMesh(initial, targetLength);
  return {
    root,
    currentState: initial,
    scale: (root.userData.enemyShipScale as number) || 1,
  };
}

/**
 * Swap the damage mesh on an existing enemy ship root.
 * Preserves world position/rotation of `root`.
 */
export async function setEnemyShipDamageState(
  root: THREE.Group,
  next: EnemyShipDamageState,
  targetLength = 12,
): Promise<EnemyShipDamageState> {
  const prev = root.userData.enemyShipState as EnemyShipDamageState | undefined;
  if (prev === next) return next;

  const mesh = await loadEnemyShipMesh(next, targetLength);
  // Replace children only (keep root transform)
  while (root.children.length) {
    const c = root.children[0];
    root.remove(c);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose?.();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => mat?.dispose?.());
      }
    });
  }
  // loadEnemyShipMesh returns a Group with the model as child — graft inner model
  for (const child of [...mesh.children]) {
    root.add(child);
  }
  root.name = `enemy_ship_${next}`;
  root.userData.enemyShipState = next;
  root.userData.enemyShipScale = mesh.userData.enemyShipScale;

  // Fire + smoke on damaged / sunk hulls (threejs-games particles style)
  try {
    const { getWorldFxBus } = await import('@/island3d/vfx/WorldFxBus');
    const bus = getWorldFxBus();
    if (bus) {
      if (next === 'healthy') bus.detachFrom(root);
      else bus.attachBoatDamage(root, next === 'sunk' ? 'sunk' : 'damaged');
    }
  } catch {
    /* fx bus optional */
  }

  return next;
}

/**
 * Apply damage state from live HP. Returns true if the mesh was swapped.
 */
export async function syncEnemyShipVisualToHealth(
  root: THREE.Group,
  health: number,
  maxHealth: number,
  targetLength = 12,
): Promise<{ state: EnemyShipDamageState; changed: boolean }> {
  const next = enemyShipStateFromHealth(health, maxHealth);
  const prev = (root.userData.enemyShipState as EnemyShipDamageState) || 'healthy';
  if (prev === next) return { state: next, changed: false };
  await setEnemyShipDamageState(root, next, targetLength);
  return { state: next, changed: true };
}

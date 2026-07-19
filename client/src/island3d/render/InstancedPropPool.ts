/**
 * InstancedPropPool — one InstancedMesh per geometry+material key.
 * Use for trees/rocks/buildings that share a mesh template (static world props).
 *
 * Characters/weapons with skeletons stay as individual Object3D clones.
 */
import * as THREE from 'three';

export interface PropInstanceHandle {
  poolKey: string;
  index: number;
}

interface Pool {
  mesh: THREE.InstancedMesh;
  capacity: number;
  count: number;
  /** free indices for reuse */
  free: number[];
}

const _dummy = new THREE.Object3D();

export class InstancedPropPool {
  private pools = new Map<string, Pool>();
  private root: THREE.Group;

  constructor(parent: THREE.Object3D) {
    this.root = new THREE.Group();
    this.root.name = 'InstancedPropPool';
    parent.add(this.root);
  }

  /**
   * Ensure a pool exists for a shared geometry + material.
   * Geometry/material should be the shared template (not per-instance clones).
   */
  ensurePool(
    key: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material | THREE.Material[],
    capacity = 256,
  ): Pool {
    let pool = this.pools.get(key);
    if (pool) return pool;

    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.name = `instanced_${key}`;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Hide unused slots at origin with zero scale
    _dummy.position.set(0, -9999, 0);
    _dummy.scale.set(0, 0, 0);
    _dummy.updateMatrix();
    for (let i = 0; i < capacity; i++) {
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = 0;
    this.root.add(mesh);

    pool = { mesh, capacity, count: 0, free: [] };
    this.pools.set(key, pool);
    return pool;
  }

  /**
   * Place an instance. Returns handle or null if pool full.
   */
  add(
    key: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material | THREE.Material[],
    position: THREE.Vector3,
    rotationY = 0,
    scale = 1,
  ): PropInstanceHandle | null {
    const pool = this.ensurePool(key, geometry, material);
    let index: number;
    if (pool.free.length > 0) {
      index = pool.free.pop()!;
    } else if (pool.count < pool.capacity) {
      index = pool.count++;
      pool.mesh.count = pool.count;
    } else {
      console.warn(`[InstancedPropPool] full: ${key} (${pool.capacity})`);
      return null;
    }

    _dummy.position.copy(position);
    _dummy.rotation.set(0, rotationY, 0);
    _dummy.scale.setScalar(scale);
    _dummy.updateMatrix();
    pool.mesh.setMatrixAt(index, _dummy.matrix);
    pool.mesh.instanceMatrix.needsUpdate = true;
    return { poolKey: key, index };
  }

  setTransform(
    handle: PropInstanceHandle,
    position: THREE.Vector3,
    rotationY = 0,
    scale = 1,
  ): void {
    const pool = this.pools.get(handle.poolKey);
    if (!pool) return;
    _dummy.position.copy(position);
    _dummy.rotation.set(0, rotationY, 0);
    _dummy.scale.setScalar(scale);
    _dummy.updateMatrix();
    pool.mesh.setMatrixAt(handle.index, _dummy.matrix);
    pool.mesh.instanceMatrix.needsUpdate = true;
  }

  remove(handle: PropInstanceHandle): void {
    const pool = this.pools.get(handle.poolKey);
    if (!pool) return;
    _dummy.position.set(0, -9999, 0);
    _dummy.scale.set(0, 0, 0);
    _dummy.updateMatrix();
    pool.mesh.setMatrixAt(handle.index, _dummy.matrix);
    pool.mesh.instanceMatrix.needsUpdate = true;
    pool.free.push(handle.index);
  }

  /** Toggle castShadow on a whole pool (near camera only — call from budget). */
  setPoolCastShadow(key: string, enabled: boolean): void {
    const pool = this.pools.get(key);
    if (pool) pool.mesh.castShadow = enabled;
  }

  dispose(): void {
    for (const pool of this.pools.values()) {
      pool.mesh.geometry.dispose();
      const mats = Array.isArray(pool.mesh.material)
        ? pool.mesh.material
        : [pool.mesh.material];
      for (const m of mats) m.dispose();
      this.root.remove(pool.mesh);
    }
    this.pools.clear();
    this.root.parent?.remove(this.root);
  }

  get stats(): Record<string, { count: number; capacity: number }> {
    const out: Record<string, { count: number; capacity: number }> = {};
    for (const [k, p] of this.pools) {
      out[k] = { count: p.count - p.free.length, capacity: p.capacity };
    }
    return out;
  }
}

/**
 * PinataHarvestBreak — three-pinata Voronoi fracture for home-island harvestables.
 *
 * Uses @dgreenheck/three-pinata DestructibleMesh for ore / rock / trees.
 * GLB nature props are often non-manifold, so we fracture a watertight proxy
 * sized to the node AABB (icosphere rock/ore, cylinder trunk, octahedron crystal)
 * with dual materials (outer + inner fracture face).
 *
 * Physics:
 *   - Prefer Rapier via optional PhysicsWorld (dynamic convex hulls + impulse)
 *   - Fallback: lightweight gravity + bounce sim (same feel as HarvestDrop)
 *
 * Fragment count stays in the 8–28 band for frame budget (pinata docs: 10–50).
 */
import * as THREE from 'three';
import {
  DestructibleMesh,
  FractureOptions,
} from '@dgreenheck/three-pinata';
import type { PhysicsWorld, PhysicsBody } from '../physics/PhysicsWorld';
import type { HarvestNodeClass } from './HarvestNodeRecognition';

// ── Materials (shared — never alloc per hit) ─────────────────────────────────

const OUTER_MATS: Record<'tree' | 'rock' | 'ore' | 'crystal', THREE.MeshStandardMaterial> = {
  tree: new THREE.MeshStandardMaterial({
    color: 0x5c3d1e,
    roughness: 0.92,
    metalness: 0.02,
  }),
  rock: new THREE.MeshStandardMaterial({
    color: 0x6e6e68,
    roughness: 0.95,
    metalness: 0.05,
  }),
  ore: new THREE.MeshStandardMaterial({
    color: 0x8a7340,
    roughness: 0.7,
    metalness: 0.45,
    emissive: 0x3a2808,
    emissiveIntensity: 0.15,
  }),
  crystal: new THREE.MeshStandardMaterial({
    color: 0x66ccee,
    roughness: 0.25,
    metalness: 0.35,
    emissive: 0x114466,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.92,
  }),
};

const INNER_MATS: Record<'tree' | 'rock' | 'ore' | 'crystal', THREE.MeshStandardMaterial> = {
  tree: new THREE.MeshStandardMaterial({
    color: 0xc4a574,
    roughness: 0.85,
    metalness: 0.0,
  }),
  rock: new THREE.MeshStandardMaterial({
    color: 0x9a9590,
    roughness: 0.9,
    metalness: 0.02,
  }),
  ore: new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.45,
    metalness: 0.65,
    emissive: 0x664400,
    emissiveIntensity: 0.25,
  }),
  crystal: new THREE.MeshStandardMaterial({
    color: 0xb0f0ff,
    roughness: 0.2,
    metalness: 0.2,
    emissive: 0x2288aa,
    emissiveIntensity: 0.4,
  }),
};

// ── Fragment runtime ─────────────────────────────────────────────────────────

export interface PinataFragment {
  mesh: THREE.Object3D;
  /** Kinematic velocity when not using Rapier */
  velocity: THREE.Vector3;
  angular: THREE.Vector3;
  life: number;
  maxLife: number;
  bodyId: string | null;
  grounded: boolean;
}

export interface BreakOptions {
  /** World-space impact point (ray hit). Defaults to node center. */
  impactPoint?: THREE.Vector3;
  /** World-space strike direction (player → node). */
  impactDir?: THREE.Vector3;
  /** 'chip' = partial hit debris; 'shatter' = full break */
  mode: 'chip' | 'shatter';
  /** Node root group — hidden/cleared on full shatter after fragments spawn */
  nodeGroup?: THREE.Group;
  /** Scale hint from harvestable baseScale */
  scale?: number;
}

type BreakKind = 'tree' | 'rock' | 'ore' | 'crystal';

function toBreakKind(nodeClass: HarvestNodeClass): BreakKind | null {
  if (nodeClass === 'tree' || nodeClass === 'rock' || nodeClass === 'ore' || nodeClass === 'crystal') {
    return nodeClass;
  }
  return null;
}

function fragmentCount(kind: BreakKind, mode: 'chip' | 'shatter'): number {
  if (mode === 'chip') {
    return kind === 'tree' ? 6 : kind === 'ore' ? 8 : 5;
  }
  // Full break — keep under 30 for mobile/low-end
  switch (kind) {
    case 'tree':
      return 12;
    case 'ore':
      return 22;
    case 'crystal':
      return 16;
    case 'rock':
    default:
      return 18;
  }
}

function proxyGeometry(kind: BreakKind, size: THREE.Vector3): THREE.BufferGeometry {
  const sx = Math.max(0.25, size.x);
  const sy = Math.max(0.25, size.y);
  const sz = Math.max(0.25, size.z);
  const r = Math.max(sx, sy, sz) * 0.5;

  if (kind === 'tree') {
    // Trunk proxy — tall cylinder (manifold)
    const radius = Math.max(0.2, Math.min(sx, sz) * 0.35);
    const height = Math.max(1.2, sy * 0.85);
    const geo = new THREE.CylinderGeometry(radius * 0.85, radius, height, 10, 1);
    geo.translate(0, height * 0.5, 0);
    return geo;
  }
  if (kind === 'crystal') {
    const geo = new THREE.OctahedronGeometry(r * 0.9, 0);
    geo.scale(1, Math.max(1.2, sy / Math.max(0.01, r)), 1);
    geo.translate(0, sy * 0.45, 0);
    return geo;
  }
  // rock / ore — slightly flattened icosphere
  const geo = new THREE.IcosahedronGeometry(r * 0.95, 1);
  geo.scale(1, Math.min(1, sy / Math.max(0.01, r * 1.6)), 1);
  geo.translate(0, sy * 0.35, 0);
  return geo;
}

function nodeWorldBounds(group: THREE.Object3D): {
  center: THREE.Vector3;
  size: THREE.Vector3;
} {
  const box = new THREE.Box3().setFromObject(group);
  if (box.isEmpty()) {
    const p = new THREE.Vector3();
    group.getWorldPosition(p);
    return { center: p, size: new THREE.Vector3(1.2, 1.2, 1.2) };
  }
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  // Clamp absurd GLB bounds
  size.x = THREE.MathUtils.clamp(size.x, 0.4, 8);
  size.y = THREE.MathUtils.clamp(size.y, 0.4, 12);
  size.z = THREE.MathUtils.clamp(size.z, 0.4, 8);
  return { center, size };
}

export class PinataHarvestBreakSystem {
  private scene: THREE.Scene;
  private physics: PhysicsWorld | null;
  private fragments: PinataFragment[] = [];
  private maxLiveFragments = 120;
  private groundY = 0;

  constructor(scene: THREE.Scene, physics: PhysicsWorld | null = null) {
    this.scene = scene;
    this.physics = physics;
  }

  setPhysics(physics: PhysicsWorld | null): void {
    this.physics = physics;
  }

  setGroundY(y: number): void {
    this.groundY = y;
  }

  /**
   * Fracture a harvestable. Safe to call every hit — chips always,
   * full shatter on final HP. Returns fragment count spawned.
   */
  breakNode(
    nodeClass: HarvestNodeClass,
    target: THREE.Object3D,
    opts: BreakOptions,
  ): number {
    const kind = toBreakKind(nodeClass);
    if (!kind) return 0;

    // Cap concurrent debris
    this.pruneOldest(Math.max(0, this.fragments.length - this.maxLiveFragments + 24));

    const { center, size } = nodeWorldBounds(target);
    const scale = opts.scale ?? 1;
    const count = fragmentCount(kind, opts.mode);

    // Local impact for pinata (proxy is authored in local space at origin)
    const impactWorld = opts.impactPoint?.clone() ?? center.clone();
    const impactLocal = impactWorld.clone().sub(center);
    // Bias impact into volume
    impactLocal.y = THREE.MathUtils.clamp(impactLocal.y, size.y * 0.15, size.y * 0.85);

    const geo = proxyGeometry(kind, size.clone().multiplyScalar(Math.max(0.6, Math.min(1.4, scale))));
    const outer = OUTER_MATS[kind];
    const inner = INNER_MATS[kind];

    let mesh: DestructibleMesh;
    try {
      mesh = new DestructibleMesh(geo, outer, inner);
    } catch (err) {
      console.warn('[PinataHarvest] DestructibleMesh create failed', err);
      geo.dispose();
      return 0;
    }

    // Parent transform — pinata copies matrixWorld onto each fragment position
    mesh.position.copy(center);
    mesh.updateMatrixWorld(true);

    const fractureOpts = new FractureOptions({
      fractureMethod: 'voronoi',
      fragmentCount: count,
      seed: Math.floor(Math.random() * 1e9),
      voronoiOptions: {
        mode: kind === 'tree' ? '2.5D' : '3D',
        impactPoint: impactLocal,
        impactRadius: opts.mode === 'chip' ? size.length() * 0.18 : size.length() * 0.45,
        useApproximation: count > 20,
        approximationNeighborCount: 10,
      },
    });

    const strikeDir = (opts.impactDir ?? new THREE.Vector3(0, 0.2, 1)).clone().normalize();
    let spawned = 0;

    const registerFragment = (fragment: THREE.Object3D, force?: THREE.Vector3) => {
      // Fragment.position is already world-space (DestructibleMesh.applyMatrix4)
      fragment.castShadow = true;
      fragment.receiveShadow = true;
      fragment.userData.pinataFragment = true;
      fragment.userData.harvestKind = kind;
      this.scene.add(fragment);

      const outward = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 0.6 + 0.2,
        (Math.random() - 0.5) * 2,
      )
        .normalize()
        .add(strikeDir.clone().multiplyScalar(0.55))
        .normalize();

      const speed =
        opts.mode === 'chip'
          ? 1.5 + Math.random() * 2.2
          : 2.5 + Math.random() * 3.5;
      const velocity = force?.clone() ?? outward.multiplyScalar(speed);
      if (!force) {
        velocity.y += opts.mode === 'shatter' ? 2.2 + Math.random() * 1.8 : 1.2 + Math.random();
      }

      const bodyId = this.physics ? this.attachRapierFragment(fragment, velocity) : null;

      this.fragments.push({
        mesh: fragment,
        velocity,
        angular: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
        ),
        life: 0,
        maxLife: opts.mode === 'chip' ? 2.8 + Math.random() * 1.2 : 4.5 + Math.random() * 2,
        bodyId,
        grounded: false,
      });
      spawned++;
    };

    try {
      mesh.fracture(fractureOpts, (fragment) => {
        registerFragment(fragment);
      });
    } catch (err) {
      console.warn('[PinataHarvest] fracture failed — node still harvests loot', err);
    }

    // Dispose proxy shell (fragments own their geometry)
    try {
      mesh.visible = false;
      // Do not dispose fragment geos; only drop unused proxy if fracture failed
      if (spawned === 0) {
        mesh.geometry?.dispose();
      }
    } catch {
      /* ignore */
    }

    return spawned;
  }

  private attachRapierFragment(
    fragment: THREE.Object3D,
    velocity: THREE.Vector3,
  ): string | null {
    if (!this.physics) return null;
    try {
      const body = this.physics.addDynamicFragment(fragment, {
        linearVelocity: velocity,
        restitution: 0.25,
        friction: 0.55,
        linearDamping: 0.35,
        angularDamping: 0.4,
      });
      return body?.id ?? null;
    } catch (err) {
      console.warn('[PinataHarvest] Rapier fragment failed, kinematic fallback', err);
      return null;
    }
  }

  /** Per-frame: kinematic integrate + fade + despawn. Rapier bodies sync via PhysicsWorld.update. */
  update(dt: number): void {
    const alive: PinataFragment[] = [];
    const g = 9.8;

    for (const f of this.fragments) {
      f.life += dt;

      if (!f.bodyId) {
        // Kinematic sim
        if (!f.grounded) {
          f.velocity.y -= g * dt;
          f.mesh.position.addScaledVector(f.velocity, dt);
          f.mesh.rotation.x += f.angular.x * dt;
          f.mesh.rotation.y += f.angular.y * dt;
          f.mesh.rotation.z += f.angular.z * dt;

          const floor = this.groundY + 0.05;
          if (f.mesh.position.y < floor) {
            f.mesh.position.y = floor;
            f.velocity.y *= -0.28;
            f.velocity.x *= 0.72;
            f.velocity.z *= 0.72;
            f.angular.multiplyScalar(0.65);
            if (Math.abs(f.velocity.y) < 0.35) {
              f.velocity.set(0, 0, 0);
              f.angular.set(0, 0, 0);
              f.grounded = true;
            }
          }
        }
      }

      // Fade last 30% of life
      const fadeStart = f.maxLife * 0.7;
      if (f.life > fadeStart) {
        const fade = 1 - (f.life - fadeStart) / (f.maxLife - fadeStart);
        f.mesh.traverse((c) => {
          const m = c as THREE.Mesh;
          if (!m.isMesh) return;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            if (mat && 'opacity' in mat) {
              const sm = mat as THREE.Material & { opacity: number; transparent: boolean };
              sm.transparent = true;
              sm.opacity = Math.max(0, fade);
            }
          }
        });
      }

      if (f.life >= f.maxLife) {
        this.disposeFragment(f);
      } else {
        alive.push(f);
      }
    }

    this.fragments = alive;
  }

  private pruneOldest(count: number): void {
    if (count <= 0) return;
    const doomed = this.fragments.splice(0, count);
    for (const f of doomed) this.disposeFragment(f);
  }

  private disposeFragment(f: PinataFragment): void {
    if (f.bodyId && this.physics) {
      try {
        this.physics.removeBody(f.bodyId);
      } catch {
        /* already gone */
      }
    }
    this.scene.remove(f.mesh);
    f.mesh.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
      }
    });
  }

  dispose(): void {
    for (const f of this.fragments) this.disposeFragment(f);
    this.fragments = [];
  }

  get liveCount(): number {
    return this.fragments.length;
  }
}

/**
 * PhysicsWorld — Rapier3D physics integration for Island3DEngine.
 *
 * Official API: https://rapier.rs/docs/api/javascript/JavaScript3D
 * Fleet SSOT:   ./fleet/* + docs/RAPIER_FLEET.md + skill grudge-rapier
 *
 * Provides:
 *   - Rapier world with configurable gravity (SI, fixed 1/60)
 *   - Terrain trimesh collider from terrain mesh geometry
 *   - Character capsule controller (kinematic position-based CCT)
 *   - GLB collider extraction: named "Collider" mesh or auto convex hull
 *   - Static / dynamic / kinematic prop colliders
 *   - Dynamic pinata fragments (harvest break)
 *   - Scene queries (ray + normal), EventQueue, takeSnapshot/restore
 *
 * Architecture:
 *   The PhysicsWorld owns the Rapier world and all rigid bodies.
 *   Fixed-timestep step each frame via update(dt).
 *   Three.js meshes synced FROM physics for dynamic bodies.
 *   Kinematic bodies (player, NPCs) driven render → physics.
 *
 * Usage:
 *   const physics = await PhysicsWorld.create({ gravity: -30 });
 *   physics.addTerrainCollider(terrainMesh);
 *   const charBody = physics.addCharacterCapsule(0.32, 0.55, startPos);
 *   physics.addGLBCollider(glbScene, 'static');
 *   engine.onUpdate(dt => physics.update(dt));
 */
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  PHYSICS_FIXED_DT,
  PHYSICS_GRAVITY_Y,
  RIGID_BODY_PRESETS,
  applyColliderMaterial,
  type FleetColliderRole,
} from './fleet';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PhysicsWorldConfig {
  /** Y gravity m/s² (default PHYSICS_GRAVITY_Y ≈ -30) */
  gravity?: number;
  /** Create EventQueue(true) for collision / contact-force events */
  enableEventQueue?: boolean;
}

export type ColliderType = 'static' | 'dynamic' | 'kinematic';

export interface PhysicsBody {
  id: string;
  rigidBody: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  mesh: THREE.Object3D | null; // sync target (null for invisible colliders)
  type: ColliderType;
}

export interface CharacterController {
  body: PhysicsBody;
  controller: RAPIER.KinematicCharacterController;
  capsuleHalfHeight: number;
  capsuleRadius: number;
}

export interface RaycastHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  bodyId: string | null;
}

// ── PhysicsWorld ─────────────────────────────────────────────────────────────

export class PhysicsWorld {
  public world: RAPIER.World;
  private bodies = new Map<string, PhysicsBody>();
  private nextId = 0;
  private accumulatedTime = 0;
  /** Fixed 1/60 — Rapier determinism + CCT stability (never use frame dt alone). */
  private readonly fixedStep = PHYSICS_FIXED_DT;
  /** EventQueue(autoDrain=true) — advanced_collision_detection_js */
  private eventQueue: RAPIER.EventQueue | null = null;
  private collisionListeners: Array<
    (e: { handle1: number; handle2: number; started: boolean }) => void
  > = [];

  private constructor(world: RAPIER.World) {
    this.world = world;
  }

  /** Async factory — must await Rapier WASM init */
  static async create(config: PhysicsWorldConfig = {}): Promise<PhysicsWorld> {
    await RAPIER.init();
    // SI gravity m/s² — non-zero so dynamic bodies fall (common_mistakes)
    const gravity = new RAPIER.Vector3(0, config.gravity ?? PHYSICS_GRAVITY_Y, 0);
    const world = new RAPIER.World(gravity);
    const phys = new PhysicsWorld(world);
    if (config.enableEventQueue) phys.ensureEventQueue();
    return phys;
  }

  ensureEventQueue(): RAPIER.EventQueue {
    if (!this.eventQueue) this.eventQueue = new RAPIER.EventQueue(true);
    return this.eventQueue;
  }

  /** Collision enter/exit — colliders need ActiveEvents.COLLISION_EVENTS */
  onCollision(
    listener: (e: { handle1: number; handle2: number; started: boolean }) => void,
  ): () => void {
    this.ensureEventQueue();
    this.collisionListeners.push(listener);
    return () => {
      this.collisionListeners = this.collisionListeners.filter((l) => l !== listener);
    };
  }

  enableCollisionEvents(collider: RAPIER.Collider): void {
    const cur = collider.activeEvents?.() ?? 0;
    collider.setActiveEvents(
      (cur | RAPIER.ActiveEvents.COLLISION_EVENTS) as RAPIER.ActiveEvents,
    );
  }

  // ── Fixed-step physics update ──────────────────────────────────────────

  update(dt: number): void {
    this.accumulatedTime += dt;
    // Cap catch-up steps (background tab spiral)
    let guard = 0;
    while (this.accumulatedTime >= this.fixedStep && guard++ < 8) {
      if (this.eventQueue) {
        this.world.step(this.eventQueue);
        if (this.collisionListeners.length) {
          this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            const e = { handle1, handle2, started };
            for (const l of this.collisionListeners) l(e);
          });
        } else {
          this.eventQueue.drainCollisionEvents(() => {});
          this.eventQueue.drainContactForceEvents(() => {});
        }
      } else {
        this.world.step();
      }
      this.accumulatedTime -= this.fixedStep;
    }
    if (this.accumulatedTime > this.fixedStep * 2) this.accumulatedTime = 0;

    // Sync dynamic body positions → Three.js meshes
    for (const [, body] of this.bodies) {
      if (body.type !== 'dynamic' || !body.mesh) continue;
      const pos = body.rigidBody.translation();
      const rot = body.rigidBody.rotation();
      body.mesh.position.set(pos.x, pos.y, pos.z);
      body.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    }
  }

  // ── Serialization (rapier.rs serialization guide) ────────────────────

  /** Complete physics world → Uint8Array. Same Rapier version on restore. */
  takeSnapshot(): Uint8Array {
    return this.world.takeSnapshot();
  }

  /**
   * Replace world with World.restoreSnapshot.
   * Clears body maps (handles invalid). Re-add terrain/CCT after restore.
   */
  restoreSnapshot(data: Uint8Array): void {
    const restored = RAPIER.World.restoreSnapshot(data);
    const old = this.world;
    this.bodies.clear();
    this.world = restored;
    try {
      old.free();
    } catch {
      /* wasm */
    }
  }

  // ── Terrain collider (trimesh — static, perfect accuracy) ──────────────

  addTerrainCollider(
    terrainMesh: THREE.Mesh,
    opts?: { role?: FleetColliderRole },
  ): PhysicsBody {
    const geo = terrainMesh.geometry as THREE.BufferGeometry;
    const posAttr = geo.getAttribute('position');
    const indexAttr = geo.getIndex();

    // Extract vertices (apply world matrix)
    const vertices = new Float32Array(posAttr.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      v.applyMatrix4(terrainMesh.matrixWorld);
      vertices[i * 3] = v.x;
      vertices[i * 3 + 1] = v.y;
      vertices[i * 3 + 2] = v.z;
    }

    // Extract indices
    let indices: Uint32Array;
    if (indexAttr) {
      indices = new Uint32Array(indexAttr.count);
      for (let i = 0; i < indexAttr.count; i++) {
        indices[i] = indexAttr.getX(i);
      }
    } else {
      indices = new Uint32Array(posAttr.count);
      for (let i = 0; i < posAttr.count; i++) indices[i] = i;
    }

    const bodyDesc = RAPIER.RigidBodyDesc.fixed();
    const rigidBody = this.world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
      .setFriction(0.8)
      .setRestitution(0.1);
    if (opts?.role) {
      applyColliderMaterial(colliderDesc, opts.role, {
        collisionEvents: RAPIER.ActiveEvents.COLLISION_EVENTS,
        kinematicFixed:
          RAPIER.ActiveCollisionTypes.DEFAULT | RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED,
      });
    }
    const collider = this.world.createCollider(colliderDesc, rigidBody);

    const id = `terrain_${this.nextId++}`;
    const body: PhysicsBody = { id, rigidBody, collider, mesh: null, type: 'static' };
    this.bodies.set(id, body);
    return body;
  }

  // ── Character capsule (kinematic position-based) ───────────────────────

  /**
   * Kinematic capsule + Rapier Character Controller (CCT).
   *
   * Best practices (rapier.rs character_controller + common_mistakes):
   * - Kinematic position-based (NOT dynamic) — gravity applied by caller
   * - SI meters: human ~radius 0.32, halfHeight 0.55
   * - offset 0.01 m; slopes 45°/30°; autostep; snap-to-ground
   * - Friction 0 on capsule — CCT owns sliding
   * - Density set (harmless on kinematic; required if ever switched to dynamic)
   */
  addCharacterCapsule(
    radius: number,
    halfHeight: number,
    position: THREE.Vector3,
  ): CharacterController {
    // position = feet; center = feet + radius + halfHeight
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(position.x, position.y + halfHeight + radius, position.z);
    const rigidBody = this.world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, radius)
      .setFriction(0.0)
      .setRestitution(0.0)
      .setDensity(1.0);
    const collider = this.world.createCollider(colliderDesc, rigidBody);

    // CCT offset ≈ 1cm (do not change after create if avoidable)
    const controller = this.world.createCharacterController(0.01);
    controller.setUp({ x: 0, y: 1, z: 0 });
    // Don't climb slopes steeper than 45°; slide on slopes steeper than 30°
    controller.setMaxSlopeClimbAngle((45 * Math.PI) / 180);
    controller.setMinSlopeSlideAngle((30 * Math.PI) / 180);
    // Autostep: max height 0.5 m, min width 0.2 m, include dynamic bodies
    controller.enableAutostep(0.5, 0.2, true);
    controller.enableSnapToGround(0.5);
    controller.setApplyImpulsesToDynamicBodies(true);

    const id = `character_${this.nextId++}`;
    const body: PhysicsBody = { id, rigidBody, collider, mesh: null, type: 'kinematic' };
    this.bodies.set(id, body);

    return { body, controller, capsuleHalfHeight: halfHeight, capsuleRadius: radius };
  }

  /**
   * Move CCT — desiredMovement is already a translation for this step
   * (include gravity in Y yourself; CCT does not apply gravity).
   * Uses setNextKinematicTranslation (position-based kinematic rule).
   */
  moveCharacter(
    ctrl: CharacterController,
    desiredMovement: THREE.Vector3,
    _dt: number,
  ): THREE.Vector3 {
    ctrl.controller.computeColliderMovement(
      ctrl.body.collider,
      new RAPIER.Vector3(desiredMovement.x, desiredMovement.y, desiredMovement.z),
    );
    const corrected = ctrl.controller.computedMovement();
    const pos = ctrl.body.rigidBody.translation();
    const newPos = new THREE.Vector3(
      pos.x + corrected.x,
      pos.y + corrected.y,
      pos.z + corrected.z,
    );
    ctrl.body.rigidBody.setNextKinematicTranslation(
      new RAPIER.Vector3(newPos.x, newPos.y, newPos.z),
    );
    return newPos;
  }

  /** Check if character is grounded (valid after computeColliderMovement). */
  isCharacterGrounded(ctrl: CharacterController): boolean {
    return ctrl.controller.computedGrounded();
  }

  get fixedDt(): number {
    return this.fixedStep;
  }

  // ── GLB collider (auto-detect named mesh or convex hull) ───────────────

  /**
   * Add physics collider for a loaded GLB scene.
   *
   * Collider detection priority:
   *   1. Named mesh "Collider" or "Physics" → trimesh (most accurate)
   *   2. Named meshes "Collider_*" → compound of convex hulls
   *   3. Fallback → single convex hull of entire scene
   */
  addGLBCollider(
    scene: THREE.Object3D,
    type: ColliderType = 'static',
    position?: THREE.Vector3,
    scale?: number,
  ): PhysicsBody {
    // Try to find named collider mesh
    const colliderMeshes: THREE.Mesh[] = [];
    const compoundMeshes: THREE.Mesh[] = [];

    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const name = child.name.toLowerCase();
      if (name === 'collider' || name === 'physics') {
        colliderMeshes.push(child as THREE.Mesh);
      } else if (name.startsWith('collider_')) {
        compoundMeshes.push(child as THREE.Mesh);
      }
    });

    // Build body description
    const bodyDesc = type === 'static' ? RAPIER.RigidBodyDesc.fixed()
      : type === 'kinematic' ? RAPIER.RigidBodyDesc.kinematicPositionBased()
      : RAPIER.RigidBodyDesc.dynamic().setLinearDamping(0.5).setAngularDamping(0.5);

    if (position) {
      bodyDesc.setTranslation(position.x, position.y, position.z);
    }

    const rigidBody = this.world.createRigidBody(bodyDesc);
    let collider: RAPIER.Collider;

    const colliderMesh = colliderMeshes.at(-1);
    if (colliderMesh) {
      // Option A: exact trimesh from named collider mesh
      const { vertices, indices } = this.extractMeshGeometry(colliderMesh, scale);
      const desc = RAPIER.ColliderDesc.trimesh(vertices, indices)
        .setFriction(0.7).setRestitution(0.1);
      collider = this.world.createCollider(desc, rigidBody);
      colliderMesh.visible = false; // hide the collider visualization
    } else if (compoundMeshes.length > 0) {
      // Option B: compound convex hulls from Collider_* meshes
      collider = this.world.createCollider(
        this.buildCompoundCollider(compoundMeshes, scale),
        rigidBody,
      );
      compoundMeshes.forEach(m => (m.visible = false));
    } else {
      // Option C: single convex hull of entire scene
      const points = this.extractAllVertices(scene, scale);
      const desc = RAPIER.ColliderDesc.convexHull(points)
        ?? RAPIER.ColliderDesc.ball(1); // fallback if hull fails
      desc.setFriction(0.7).setRestitution(0.2);
      collider = this.world.createCollider(desc, rigidBody);
    }

    const id = `glb_${this.nextId++}`;
    const body: PhysicsBody = { id, rigidBody, collider, mesh: type === 'dynamic' ? scene : null, type };
    this.bodies.set(id, body);
    return body;
  }

  // ── Simple shape helpers ───────────────────────────────────────────────

  addBoxCollider(
    halfExtents: THREE.Vector3,
    position: THREE.Vector3,
    type: ColliderType = 'static',
  ): PhysicsBody {
    const bodyDesc = type === 'static' ? RAPIER.RigidBodyDesc.fixed()
      : type === 'dynamic' ? RAPIER.RigidBodyDesc.dynamic()
      : RAPIER.RigidBodyDesc.kinematicPositionBased();
    bodyDesc.setTranslation(position.x, position.y, position.z);
    const rigidBody = this.world.createRigidBody(bodyDesc);
    const desc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
      .setFriction(0.6).setRestitution(0.1);
    const collider = this.world.createCollider(desc, rigidBody);
    const id = `box_${this.nextId++}`;
    const body: PhysicsBody = { id, rigidBody, collider, mesh: null, type };
    this.bodies.set(id, body);
    return body;
  }

  addSphereCollider(
    radius: number,
    position: THREE.Vector3,
    type: ColliderType = 'dynamic',
    opts: { ccd?: boolean; density?: number } = {},
  ): PhysicsBody {
    // Dynamic requires non-zero mass (setDensity) — common_mistakes
    const prop = RIGID_BODY_PRESETS.dynamic_prop;
    const proj = RIGID_BODY_PRESETS.dynamic_projectile;
    const useCcd = opts.ccd ?? false;
    const preset = useCcd ? proj : prop;
    let bodyDesc =
      type === 'static'
        ? RAPIER.RigidBodyDesc.fixed()
        : RAPIER.RigidBodyDesc.dynamic()
            .setLinearDamping(preset.linearDamping)
            .setAngularDamping(preset.angularDamping)
            .setCcdEnabled(useCcd)
            .setCanSleep(preset.canSleep);
    bodyDesc.setTranslation(position.x, position.y, position.z);
    const rigidBody = this.world.createRigidBody(bodyDesc);
    let desc = RAPIER.ColliderDesc.ball(radius)
      .setFriction(preset.friction)
      .setRestitution(preset.restitution);
    // Dynamic RBs need non-zero mass (common_mistakes) — density on collider
    if (type === 'dynamic') {
      desc = desc.setDensity(opts.density ?? preset.density);
    }
    const collider = this.world.createCollider(desc, rigidBody);
    const id = `sphere_${this.nextId++}`;
    const body: PhysicsBody = { id, rigidBody, collider, mesh: null, type };
    this.bodies.set(id, body);
    return body;
  }

  /**
   * Dynamic fragment for three-pinata harvest breaks (ore / rock / trees).
   * Convex hull from mesh positions + optional linear velocity impulse.
   * Mesh is synced each physics step (body.type = dynamic).
   */
  addDynamicFragment(
    mesh: THREE.Object3D,
    opts: {
      linearVelocity?: THREE.Vector3;
      angularVelocity?: THREE.Vector3;
      restitution?: number;
      friction?: number;
      linearDamping?: number;
      angularDamping?: number;
      massScale?: number;
    } = {},
  ): PhysicsBody {
    mesh.updateMatrixWorld(true);
    const pos = new THREE.Vector3();
    mesh.getWorldPosition(pos);

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(pos.x, pos.y, pos.z)
      .setLinearDamping(opts.linearDamping ?? 0.35)
      .setAngularDamping(opts.angularDamping ?? 0.4)
      .setCanSleep(true);

    const rigidBody = this.world.createRigidBody(bodyDesc);

    // Prefer convex hull of fragment geometry; ball fallback from AABB
    const points = this.extractAllVertices(mesh);
    let colliderDesc: RAPIER.ColliderDesc | null = null;
    if (points.length >= 9) {
      colliderDesc = RAPIER.ColliderDesc.convexHull(points);
    }
    if (!colliderDesc) {
      const box = new THREE.Box3().setFromObject(mesh);
      const size = box.getSize(new THREE.Vector3());
      const r = Math.max(0.05, size.length() * 0.28);
      colliderDesc = RAPIER.ColliderDesc.ball(r);
    }
    colliderDesc
      .setFriction(opts.friction ?? 0.55)
      .setRestitution(opts.restitution ?? 0.25)
      .setDensity(opts.massScale ?? 1.2);

    const collider = this.world.createCollider(colliderDesc, rigidBody);

    if (opts.linearVelocity) {
      rigidBody.setLinvel(
        {
          x: opts.linearVelocity.x,
          y: opts.linearVelocity.y,
          z: opts.linearVelocity.z,
        },
        true,
      );
    }
    if (opts.angularVelocity) {
      rigidBody.setAngvel(
        {
          x: opts.angularVelocity.x,
          y: opts.angularVelocity.y,
          z: opts.angularVelocity.z,
        },
        true,
      );
    }

    const id = `frag_${this.nextId++}`;
    const body: PhysicsBody = {
      id,
      rigidBody,
      collider,
      mesh,
      type: 'dynamic',
    };
    this.bodies.set(id, body);
    return body;
  }

  // ── Raycasting ─────────────────────────────────────────────────────────

  raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number = 100): RaycastHit | null {
    const ray = new RAPIER.Ray(
      new RAPIER.Vector3(origin.x, origin.y, origin.z),
      new RAPIER.Vector3(direction.x, direction.y, direction.z),
    );
    // Prefer castRayAndGetNormal when available (scene_queries guide)
    const hitWithN = this.world.castRayAndGetNormal(ray, maxDistance, true);
    if (hitWithN) {
      const point = ray.pointAt(hitWithN.timeOfImpact);
      let bodyId: string | null = null;
      const hitCollider = hitWithN.collider;
      for (const [id, body] of this.bodies) {
        if (body.collider === hitCollider) {
          bodyId = id;
          break;
        }
      }
      const n = hitWithN.normal;
      return {
        point: new THREE.Vector3(point.x, point.y, point.z),
        normal: n
          ? new THREE.Vector3(n.x, n.y, n.z)
          : new THREE.Vector3(0, 1, 0),
        distance: hitWithN.timeOfImpact,
        bodyId,
      };
    }

    const hit = this.world.castRay(ray, maxDistance, true);
    if (!hit) return null;

    const point = ray.pointAt(hit.timeOfImpact);
    const hitPoint = new THREE.Vector3(point.x, point.y, point.z);

    let bodyId: string | null = null;
    const hitCollider = hit.collider;
    for (const [id, body] of this.bodies) {
      if (body.collider === hitCollider) {
        bodyId = id;
        break;
      }
    }

    return {
      point: hitPoint,
      normal: new THREE.Vector3(0, 1, 0),
      distance: hit.timeOfImpact,
      bodyId,
    };
  }

  /** Raycast down from a position to find ground height */
  groundCheck(x: number, z: number, fromY: number = 500): number | null {
    const hit = this.raycast(
      new THREE.Vector3(x, fromY, z),
      new THREE.Vector3(0, -1, 0),
      fromY + 100,
    );
    return hit ? hit.point.y : null;
  }

  // ── Body management ────────────────────────────────────────────────────

  removeBody(id: string): void {
    const body = this.bodies.get(id);
    if (!body) return;
    this.world.removeCollider(body.collider, true);
    this.world.removeRigidBody(body.rigidBody);
    this.bodies.delete(id);
  }

  getBody(id: string): PhysicsBody | undefined {
    return this.bodies.get(id);
  }

  get bodyCount(): number {
    return this.bodies.size;
  }

  /** True after at least one static terrain / pad collider exists. */
  get hasTerrainLayer(): boolean {
    for (const body of this.bodies.values()) {
      if (body.type === 'static') return true;
    }
    return false;
  }

  /**
   * Thin fixed box under spawn — last-resort floor so gravity cannot
   * drop the captain through a missing trimesh on first frame.
   */
  addSpawnPad(center: THREE.Vector3, half = { x: 48, y: 0.4, z: 48 }): PhysicsBody {
    return this.addBoxCollider(
      new THREE.Vector3(half.x, half.y, half.z),
      new THREE.Vector3(center.x, center.y - half.y, center.z),
      'static',
    );
  }

  // ── Geometry extraction helpers ────────────────────────────────────────

  private extractMeshGeometry(mesh: THREE.Mesh, scale?: number): { vertices: Float32Array; indices: Uint32Array } {
    const geo = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geo.getAttribute('position');
    const indexAttr = geo.getIndex();
    const s = scale ?? 1;

    const vertices = new Float32Array(posAttr.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      v.applyMatrix4(mesh.matrixWorld);
      vertices[i * 3] = v.x * s;
      vertices[i * 3 + 1] = v.y * s;
      vertices[i * 3 + 2] = v.z * s;
    }

    let indices: Uint32Array;
    if (indexAttr) {
      indices = new Uint32Array(indexAttr.count);
      for (let i = 0; i < indexAttr.count; i++) indices[i] = indexAttr.getX(i);
    } else {
      indices = new Uint32Array(posAttr.count);
      for (let i = 0; i < posAttr.count; i++) indices[i] = i;
    }

    return { vertices, indices };
  }

  private extractAllVertices(scene: THREE.Object3D, scale?: number): Float32Array {
    const allPoints: number[] = [];
    const s = scale ?? 1;
    const v = new THREE.Vector3();

    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const geo = mesh.geometry as THREE.BufferGeometry;
      const posAttr = geo.getAttribute('position');
      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i);
        v.applyMatrix4(mesh.matrixWorld);
        allPoints.push(v.x * s, v.y * s, v.z * s);
      }
    });

    return new Float32Array(allPoints);
  }

  private buildCompoundCollider(meshes: THREE.Mesh[], scale?: number): RAPIER.ColliderDesc {
    // For compound, use the first mesh as convex hull (Rapier doesn't have native compound)
    // In practice, use the largest mesh
    const largest = meshes.reduce((a, b) => {
      const aSize = new THREE.Box3().setFromObject(a).getSize(new THREE.Vector3()).length();
      const bSize = new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3()).length();
      return aSize > bSize ? a : b;
    });
    const points = this.extractAllVertices(largest, scale);
    return RAPIER.ColliderDesc.convexHull(points)
      ?? RAPIER.ColliderDesc.ball(1);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────

  dispose(): void {
    for (const [id] of this.bodies) {
      this.removeBody(id);
    }
    this.collisionListeners = [];
    if (this.eventQueue) {
      try {
        this.eventQueue.free();
      } catch {
        /* */
      }
      this.eventQueue = null;
    }
    this.world.free();
  }
}

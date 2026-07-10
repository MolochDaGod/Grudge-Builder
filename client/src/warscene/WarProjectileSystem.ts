/**
 * WarProjectileSystem — flaming arrows from map assets as live archer fire.
 *
 * Best practices:
 *  - Harvest Fire_* meshes from the fortress GLB (stuck “arrows in the air”)
 *  - Hide all static instances so the map is clean
 *  - Object-pool clones for zero per-shot alloc in steady state
 *  - Ballistic arc + lookAt orientation (three.js)
 *  - Additive flame trail / emissive tip for VFX
 *  - Damage applied on impact (not at bow release)
 *
 * Rapier is available fleet-wide (@dimforge/rapier3d-compat) for character
 * colliders; arrows use kinematic flight + distance hit for performance at
 * 50+ concurrent volleys (same pattern as CB-style client projectiles).
 */
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface ProjectileFireOpts {
  from: THREE.Vector3;
  to: THREE.Vector3;
  damage: number;
  skill: string;
  attackerId: string;
  targetId: string;
  /** Seconds of flight (auto from distance if omitted) */
  duration?: number;
  flaming?: boolean;
}

export interface ProjectileImpact {
  targetId: string;
  attackerId: string;
  damage: number;
  skill: string;
  point: THREE.Vector3;
}

type PoolEntry = {
  root: THREE.Object3D;
  active: boolean;
  t: number;
  duration: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  midY: number;
  damage: number;
  skill: string;
  attackerId: string;
  targetId: string;
  trail: THREE.Points | null;
};

const MAX_POOL = 48;
const _tmp = new THREE.Vector3();
const _dir = new THREE.Vector3();

export class WarProjectileSystem {
  private root = new THREE.Group();
  private template: THREE.Object3D | null = null;
  private pool: PoolEntry[] = [];
  private harvested = 0;
  private onImpact: ((hit: ProjectileImpact) => void) | null = null;
  private fallbackGeo: THREE.BufferGeometry | null = null;

  constructor(parent: THREE.Object3D) {
    this.root.name = 'war_projectiles';
    parent.add(this.root);
  }

  setImpactHandler(fn: (hit: ProjectileImpact) => void): void {
    this.onImpact = fn;
  }

  get harvestedCount(): number {
    return this.harvested;
  }

  /**
   * Walk env, hide Fire_* (stuck flaming arrows) + optional smoke planes
   * used as baked VFX, clone best Fire mesh as projectile template.
   */
  harvestFromScene(envRoot: THREE.Object3D): number {
    const fireMeshes: THREE.Object3D[] = [];
    envRoot.traverse((obj) => {
      const n = obj.name || '';
      if (/Fire_0/i.test(n) || /Fire_01|Fire_02/i.test(n)) {
        fireMeshes.push(obj);
      }
      // Stuck aerial smoke billboards often ride with fire VFX — hide too
      if (/Smoke0/i.test(n)) {
        obj.visible = false;
        obj.userData.warHarvestedVfx = true;
      }
    });

    this.harvested = fireMeshes.length;
    if (!fireMeshes.length) {
      this.template = this.makeFallbackArrow();
      this.seedPool(12);
      return 0;
    }

    // Prefer Fire_01 family as arrow-like; clone first mesh in world isolation
    const source = fireMeshes[0]!;
    source.updateWorldMatrix(true, true);
    const clone = source.clone(true);
    // Bake world scale into local, then reset parent transform
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);
    // Normalize size for projectile (~1.2m long visual)
    const box = new THREE.Box3().setFromObject(source);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.01);
    const targetLen = 1.15;
    const s = targetLen / maxDim;
    clone.scale.setScalar(s);

    // Emissive flame materials
    clone.traverse((c) => {
      if (!(c as THREE.Mesh).isMesh) return;
      const mesh = c as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const next = mats.map((m) => {
        if (!m) return m;
        const std = (m as THREE.MeshStandardMaterial).clone();
        if (std.map) {
          std.map.colorSpace = THREE.SRGBColorSpace;
          std.map.needsUpdate = true;
        }
        std.emissive = new THREE.Color(0xff4400);
        std.emissiveIntensity = 1.6;
        std.transparent = true;
        std.depthWrite = false;
        std.roughness = 0.6;
        std.metalness = 0.1;
        std.needsUpdate = true;
        return std;
      });
      mesh.material = next.length === 1 ? next[0]! : next;
      mesh.castShadow = false;
      mesh.frustumCulled = true;
    });

    this.template = clone;

    // Hide all static fire instances on the map
    for (const f of fireMeshes) {
      f.visible = false;
      f.userData.warHarvestedVfx = true;
      f.userData.warProjectileSource = true;
    }

    this.seedPool(Math.min(MAX_POOL, Math.max(16, fireMeshes.length * 2)));
    return this.harvested;
  }

  private makeFallbackArrow(): THREE.Object3D {
    const g = new THREE.Group();
    g.name = 'fallback_arrow';
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6),
      new THREE.MeshStandardMaterial({ color: 0x5c4030, roughness: 0.9 }),
    );
    shaft.rotation.x = Math.PI / 2;
    g.add(shaft);
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.2, 6),
      new THREE.MeshStandardMaterial({
        color: 0x888888,
        emissive: 0xff3300,
        emissiveIntensity: 1.2,
        metalness: 0.4,
        roughness: 0.4,
      }),
    );
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.55;
    g.add(tip);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    flame.position.z = -0.4;
    g.add(flame);
    this.fallbackGeo = shaft.geometry;
    return g;
  }

  private seedPool(n: number): void {
    for (let i = 0; i < n; i++) this.pool.push(this.makeEntry());
  }

  private makeEntry(): PoolEntry {
    if (!this.template) this.template = this.makeFallbackArrow();
    // SkeletonUtils handles skinned; for static Fire meshes plain clone is fine
    let root: THREE.Object3D;
    try {
      root = (SkeletonUtils as { clone: (o: THREE.Object3D) => THREE.Object3D }).clone(
        this.template,
      );
    } catch {
      root = this.template.clone(true);
    }
    root.visible = false;
    root.name = 'arrow_proj';
    this.root.add(root);

    // Lightweight trail
    const trail = this.makeTrail();
    root.add(trail);

    return {
      root,
      active: false,
      t: 0,
      duration: 0.6,
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      midY: 4,
      damage: 0,
      skill: 'aimed_shot',
      attackerId: '',
      targetId: '',
      trail,
    };
  }

  private makeTrail(): THREE.Points {
    const count = 12;
    const positions = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xff6622,
      size: 0.18,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.name = 'flame_trail';
    pts.frustumCulled = false;
    return pts;
  }

  private acquire(): PoolEntry {
    let e = this.pool.find((p) => !p.active);
    if (!e) {
      if (this.pool.length < MAX_POOL) {
        e = this.makeEntry();
        this.pool.push(e);
      } else {
        // Steal oldest
        e = this.pool[0]!;
        e.active = false;
      }
    }
    return e;
  }

  /** Fire one flaming arrow; damage on impact via handler */
  fire(opts: ProjectileFireOpts): void {
    const e = this.acquire();
    e.active = true;
    e.t = 0;
    e.from.copy(opts.from);
    e.to.copy(opts.to);
    const dist = e.from.distanceTo(e.to);
    e.duration = opts.duration ?? THREE.MathUtils.clamp(dist / 28, 0.35, 1.1);
    e.midY = 2.5 + dist * 0.12;
    e.damage = opts.damage;
    e.skill = opts.skill;
    e.attackerId = opts.attackerId;
    e.targetId = opts.targetId;
    e.root.visible = true;
    e.root.position.copy(e.from);
  }

  update(dt: number): void {
    for (const e of this.pool) {
      if (!e.active) continue;
      e.t += dt;
      const u = Math.min(1, e.t / e.duration);
      // Quadratic bezier arc
      const inv = 1 - u;
      _tmp.set(
        inv * inv * e.from.x + 2 * inv * u * ((e.from.x + e.to.x) * 0.5) + u * u * e.to.x,
        inv * inv * e.from.y +
          2 * inv * u * (Math.max(e.from.y, e.to.y) + e.midY) +
          u * u * e.to.y,
        inv * inv * e.from.z + 2 * inv * u * ((e.from.z + e.to.z) * 0.5) + u * u * e.to.z,
      );
      // Look along velocity
      const u2 = Math.min(1, u + 0.02);
      const inv2 = 1 - u2;
      _dir.set(
        inv2 * inv2 * e.from.x + 2 * inv2 * u2 * ((e.from.x + e.to.x) * 0.5) + u2 * u2 * e.to.x,
        inv2 * inv2 * e.from.y +
          2 * inv2 * u2 * (Math.max(e.from.y, e.to.y) + e.midY) +
          u2 * u2 * e.to.y,
        inv2 * inv2 * e.from.z + 2 * inv2 * u2 * ((e.from.z + e.to.z) * 0.5) + u2 * u2 * e.to.z,
      );
      _dir.sub(_tmp).normalize();
      e.root.position.copy(_tmp);
      if (_dir.lengthSq() > 1e-6) {
        e.root.lookAt(_tmp.x + _dir.x, _tmp.y + _dir.y, _tmp.z + _dir.z);
      }

      // Trail particles behind shaft
      if (e.trail) {
        const pos = e.trail.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const back = (i + 1) * 0.08;
          pos.setXYZ(i, -_dir.x * back, -_dir.y * back, -_dir.z * back);
        }
        pos.needsUpdate = true;
        const mat = e.trail.material as THREE.PointsMaterial;
        mat.opacity = 0.4 + Math.sin(performance.now() * 0.02 + u * 10) * 0.2;
      }

      if (u >= 1) {
        e.active = false;
        e.root.visible = false;
        this.onImpact?.({
          targetId: e.targetId,
          attackerId: e.attackerId,
          damage: e.damage,
          skill: e.skill,
          point: e.to.clone(),
        });
      }
    }
  }

  dispose(): void {
    for (const e of this.pool) {
      e.root.parent?.remove(e.root);
      e.root.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.geometry && m.geometry !== this.fallbackGeo) {
          // shared template geos — only dispose pool-unique trails
        }
        if (c === e.trail) {
          e.trail.geometry.dispose();
          (e.trail.material as THREE.Material).dispose();
        }
      });
    }
    this.pool = [];
    this.root.parent?.remove(this.root);
  }
}

/** True if skill/role should use projectile flight */
export function isRangedWarSkill(role: string, skill: string): boolean {
  if (role === 'archer') return true;
  return /shot|volley|bolt|arrow|firebolt|aimed/i.test(skill);
}

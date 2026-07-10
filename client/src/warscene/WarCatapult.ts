/**
 * WarCatapult — siege engine that damages walls from round start (CB style).
 * Procedural mesh (no extra asset). Targets nearest intact wall and lobbs.
 */
import * as THREE from 'three';
import type { WarWallSegment } from './WarWallSegment';

export interface CatapultOpts {
  id: string;
  faction: 'crimson' | 'azure' | 'gold';
  position: THREE.Vector3;
  damage?: number;
  fireInterval?: number;
  range?: number;
}

export class WarCatapult {
  readonly id: string;
  readonly faction: 'crimson' | 'azure' | 'gold';
  readonly root = new THREE.Group();
  damage: number;
  fireInterval: number;
  range: number;
  private cd = 0;
  private arm: THREE.Object3D;
  private projectile: THREE.Mesh | null = null;
  private projT = 0;
  private projFrom = new THREE.Vector3();
  private projTo = new THREE.Vector3();
  private onHit: ((wallId: string, dmg: number) => void) | null = null;
  private pendingWallId: string | null = null;

  constructor(opts: CatapultOpts) {
    this.id = opts.id;
    this.faction = opts.faction;
    this.damage = opts.damage ?? 28;
    this.fireInterval = opts.fireInterval ?? 4.2;
    this.range = opts.range ?? 55;
    this.root.name = `catapult_${opts.id}`;
    this.root.position.copy(opts.position);

    const wood = new THREE.MeshStandardMaterial({
      color: 0x6b4423,
      roughness: 0.9,
      metalness: 0.05,
    });
    const iron = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.5,
      metalness: 0.6,
    });

    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 3.2), wood);
    base.position.y = 0.35;
    base.castShadow = true;
    this.root.add(base);

    // Wheels
    for (const [x, z] of [
      [-1.1, 1.1],
      [1.1, 1.1],
      [-1.1, -1.1],
      [1.1, -1.1],
    ] as const) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 12), wood);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.45, z);
      w.castShadow = true;
      this.root.add(w);
    }

    // Arm pivot
    const pivot = new THREE.Group();
    pivot.position.set(0, 1.1, -0.4);
    this.root.add(pivot);
    const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 2.8), wood);
    armMesh.position.z = 1.2;
    pivot.add(armMesh);
    const basket = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), iron);
    basket.position.z = 2.5;
    pivot.add(basket);
    this.arm = pivot;
    this.arm.rotation.x = -0.4;

    // Faction flag
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.5),
      new THREE.MeshBasicMaterial({
        color: opts.faction === 'crimson' ? 0xb91c1c : 0x0284c7,
        side: THREE.DoubleSide,
      }),
    );
    flag.position.set(0, 2.2, -1.2);
    this.root.add(flag);
  }

  setHitHandler(fn: (wallId: string, dmg: number) => void): void {
    this.onHit = fn;
  }

  update(dt: number, walls: WarWallSegment[]): void {
    this.cd = Math.max(0, this.cd - dt);

    // Animate projectile
    if (this.projectile) {
      this.projT += dt / 0.85;
      const t = Math.min(1, this.projT);
      const mid = this.projFrom.clone().lerp(this.projTo, t);
      mid.y += Math.sin(t * Math.PI) * 12;
      this.projectile.position.copy(mid);
      if (t >= 1) {
        if (this.pendingWallId) this.onHit?.(this.pendingWallId, this.damage);
        this.projectile.parent?.remove(this.projectile);
        this.projectile.geometry.dispose();
        (this.projectile.material as THREE.Material).dispose();
        this.projectile = null;
        this.pendingWallId = null;
        this.arm.rotation.x = -0.4;
      }
      return;
    }

    if (this.cd > 0) return;
    const target = this.pickWall(walls);
    if (!target) return;

    this.cd = this.fireInterval;
    this.pendingWallId = target.id;
    this.projFrom.copy(this.root.position).add(new THREE.Vector3(0, 2.2, 1.5));
    this.projTo.copy(target.position).add(new THREE.Vector3(0, 2, 0));
    this.projT = 0;

    // Face target
    const dx = this.projTo.x - this.root.position.x;
    const dz = this.projTo.z - this.root.position.z;
    this.root.rotation.y = Math.atan2(dx, dz);
    this.arm.rotation.x = -1.1;

    const rock = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.95 }),
    );
    rock.position.copy(this.projFrom);
    rock.castShadow = true;
    this.root.parent?.add(rock);
    this.projectile = rock;
  }

  private pickWall(walls: WarWallSegment[]): WarWallSegment | null {
    let best: WarWallSegment | null = null;
    let bestD = this.range * this.range;
    for (const w of walls) {
      if (w.dead || w.state !== 'intact') continue;
      const d = this.root.position.distanceToSquared(w.position);
      if (d < bestD) {
        bestD = d;
        best = w;
      }
    }
    return best;
  }

  dispose(): void {
    if (this.projectile) {
      this.projectile.parent?.remove(this.projectile);
      this.projectile = null;
    }
    this.root.parent?.remove(this.root);
  }
}

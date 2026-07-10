/**
 * WarWallSegment — fortification with repaired/broken mesh states.
 *
 * Scene has no explicit "broken" names, so we pair wall meshes:
 *   intact  = larger Mura / RocciaMura piece (combat target, collider, HP)
 *   broken  = nearest smaller rubble sibling (hidden until destroyed)
 *
 * Start: show intact, hide broken.
 * HP → 0: shake + fade intact → reveal broken, drop collider.
 */
import * as THREE from 'three';
import type { WarSenseTarget } from './WarAIBrain';

export type WallState = 'intact' | 'destroying' | 'destroyed';

export interface WarWallSegmentOpts {
  id: string;
  label: string;
  intact: THREE.Object3D;
  broken: THREE.Object3D | null;
  maxHp?: number;
  /** Defending faction — AI of other factions will siege */
  ownerFaction?: 'crimson' | 'azure' | 'gold' | 'neutral';
}

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

export function meshWorldVolume(obj: THREE.Object3D): number {
  _box.setFromObject(obj);
  _box.getSize(_size);
  return Math.max(0.01, _size.x * _size.y * _size.z);
}

export function meshWorldCenter(obj: THREE.Object3D): THREE.Vector3 {
  _box.setFromObject(obj);
  return _box.getCenter(_center).clone();
}

export function meshWorldAabb(obj: THREE.Object3D): THREE.Box3 {
  return new THREE.Box3().setFromObject(obj);
}

export class WarWallSegment {
  readonly id: string;
  readonly label: string;
  readonly intact: THREE.Object3D;
  readonly broken: THREE.Object3D | null;
  readonly ownerFaction: 'crimson' | 'azure' | 'gold' | 'neutral';

  maxHp: number;
  hp: number;
  state: WallState = 'intact';
  /** World-space AABB used as simple collider while intact */
  collider: THREE.Box3;
  readonly position = new THREE.Vector3();

  private destroyT = 0;
  private readonly destroyDuration = 0.85;
  private intactBaseMats: THREE.Material[] = [];
  private hitFlash = 0;
  private readonly intactStartPos = new THREE.Vector3();

  constructor(opts: WarWallSegmentOpts) {
    this.id = opts.id;
    this.label = opts.label;
    this.intact = opts.intact;
    this.broken = opts.broken;
    this.ownerFaction = opts.ownerFaction ?? 'neutral';
    this.maxHp = opts.maxHp ?? 220;
    this.hp = this.maxHp;

    this.position.copy(meshWorldCenter(this.intact));
    this.collider = meshWorldAabb(this.intact);
    this.intactStartPos.copy(this.intact.position);

    // Snapshot materials for hit flash / fade
    this.intact.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const mesh = c as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (m) this.intactBaseMats.push(m);
        }
      }
    });

    // Combat start: repaired wall visible, rubble hidden
    this.intact.visible = true;
    if (this.broken) this.broken.visible = false;

    this.intact.userData.warWallId = this.id;
    this.intact.userData.warWallCollider = true;
  }

  get dead(): boolean {
    return this.state === 'destroyed';
  }

  /** Sense target so AI can path/attack walls like units */
  toSense(): WarSenseTarget {
    return {
      id: this.id,
      faction: this.ownerFaction === 'neutral' ? 'structure' as any : this.ownerFaction,
      position: this.position.clone(),
      hp: this.hp,
      dead: this.dead,
      kind: 'wall',
    };
  }

  /** Point-in-collider test (XZ extruded with Y pad) for melee reach */
  containsPoint(p: THREE.Vector3, pad = 0.6): boolean {
    if (this.dead || this.state === 'destroying') return false;
    return (
      p.x >= this.collider.min.x - pad &&
      p.x <= this.collider.max.x + pad &&
      p.z >= this.collider.min.z - pad &&
      p.z <= this.collider.max.z + pad &&
      p.y >= this.collider.min.y - 1 &&
      p.y <= this.collider.max.y + 2
    );
  }

  /** Closest point on collider surface (for AI range checks) */
  closestPoint(p: THREE.Vector3, out = new THREE.Vector3()): THREE.Vector3 {
    out.copy(p);
    out.x = THREE.MathUtils.clamp(p.x, this.collider.min.x, this.collider.max.x);
    out.y = THREE.MathUtils.clamp(p.y, this.collider.min.y, this.collider.max.y);
    out.z = THREE.MathUtils.clamp(p.z, this.collider.min.z, this.collider.max.z);
    return out;
  }

  takeDamage(amount: number): boolean {
    if (this.state !== 'intact') return false;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.12;
    if (this.hp <= 0) {
      this.beginDestroy();
      return true;
    }
    return false;
  }

  private beginDestroy(): void {
    this.state = 'destroying';
    this.destroyT = 0;
    // Enable transparency for fade
    for (const m of this.intactBaseMats) {
      m.transparent = true;
      m.depthWrite = true;
      m.needsUpdate = true;
    }
  }

  update(dt: number): void {
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    if (this.state === 'intact' && this.hitFlash > 0) {
      const pulse = 0.3 + this.hitFlash * 4;
      for (const m of this.intactBaseMats) {
        const std = m as THREE.MeshStandardMaterial;
        if (std.emissive) {
          std.emissive.setRGB(pulse * 0.4, pulse * 0.1, 0);
        }
      }
    } else if (this.state === 'intact') {
      for (const m of this.intactBaseMats) {
        const std = m as THREE.MeshStandardMaterial;
        if (std.emissive) std.emissive.setRGB(0, 0, 0);
      }
    }

    if (this.state === 'destroying') {
      this.destroyT += dt;
      const t = Math.min(1, this.destroyT / this.destroyDuration);
      // Shake + settle
      const shake = (1 - t) * 0.25;
      this.intact.position.x =
        this.intactStartPos.x + (Math.random() - 0.5) * shake;
      this.intact.position.z =
        this.intactStartPos.z + (Math.random() - 0.5) * shake;
      this.intact.position.y = this.intactStartPos.y - t * 0.35;
      // Fade intact
      for (const m of this.intactBaseMats) {
        if ('opacity' in m) {
          (m as THREE.MeshStandardMaterial).opacity = 1 - t;
        }
      }
      // Reveal broken early in transition
      if (this.broken && t > 0.35) {
        this.broken.visible = true;
        // Optional: pop broken slightly
        this.broken.scale.setScalar(0.92 + t * 0.08);
      }
      if (t >= 1) {
        this.finishDestroy();
      }
    }
  }

  private finishDestroy(): void {
    this.state = 'destroyed';
    this.intact.visible = false;
    this.intact.position.copy(this.intactStartPos);
    if (this.broken) {
      this.broken.visible = true;
      this.broken.scale.setScalar(1);
    }
    // Collider gone — units walk through rubble
    this.collider.makeEmpty();
    this.intact.userData.warWallCollider = false;
  }
}

// ── Pairing helpers ─────────────────────────────────────────────────────────

export interface WallMeshCandidate {
  object: THREE.Object3D;
  name: string;
  center: THREE.Vector3;
  volume: number;
  family: string;
}

/** Extract family key: Mura_01, RocciaMura_05, Passerella_TopMura, … */
export function wallFamilyKey(name: string): string {
  const m =
    name.match(/(RocciaMura_\d+)/i) ||
    name.match(/(Mura_\d+)/i) ||
    name.match(/(Passerella_[A-Za-z0-9_]+Mura)/i) ||
    name.match(/(Bordo_Zolla_\d+)/i);
  if (m) return m[1];
  return name.replace(/_\d+$/, '').slice(0, 40);
}

/**
 * Build combat wall segments from scene wall meshes.
 * Pair largest mesh in a proximity cluster as intact, nearest smaller as broken.
 */
export function buildWallSegmentsFromMeshes(
  meshes: THREE.Object3D[],
  opts?: { clusterRadius?: number; maxHp?: number },
): WarWallSegment[] {
  const clusterR = opts?.clusterRadius ?? 14;
  const candidates: WallMeshCandidate[] = meshes
    .filter((o) => o.name && /Mura|Passerella.*Mura|RocciaMura/i.test(o.name))
    .map((object) => ({
      object,
      name: object.name,
      center: meshWorldCenter(object),
      volume: meshWorldVolume(object),
      family: wallFamilyKey(object.name),
    }))
    .filter((c) => c.volume > 0.5); // skip dust

  if (!candidates.length) return [];

  // Cluster by proximity
  const used = new Set<number>();
  const segments: WarWallSegment[] = [];
  let segIdx = 0;

  const sorted = [...candidates].sort((a, b) => b.volume - a.volume);

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    const primary = sorted[i]!;
    used.add(i);

    // Find nearby smaller piece as broken rubble
    let broken: WallMeshCandidate | null = null;
    let bestD = clusterR * clusterR;
    for (let j = 0; j < sorted.length; j++) {
      if (used.has(j) || j === i) continue;
      const other = sorted[j]!;
      // Prefer same family or nearby smaller volume
      const d2 = primary.center.distanceToSquared(other.center);
      if (d2 > bestD) continue;
      if (other.volume >= primary.volume * 0.95) continue; // need smaller rubble
      const sameFamily = other.family === primary.family;
      if (sameFamily || d2 < (clusterR * 0.55) ** 2) {
        bestD = d2;
        broken = other;
      }
    }

    if (broken) {
      const bi = sorted.indexOf(broken);
      if (bi >= 0) used.add(bi);
    }

    // Skip pure walkways as siege targets unless no other walls
    const isWalkway = /Passerella/i.test(primary.name);
    if (isWalkway && segments.length > 0) continue;

    segments.push(
      new WarWallSegment({
        id: `wall_${segIdx++}`,
        label: primary.family || primary.name,
        intact: primary.object,
        broken: broken?.object ?? null,
        maxHp: opts?.maxHp ?? Math.round(180 + Math.sqrt(primary.volume) * 8),
        ownerFaction: 'neutral',
      }),
    );
  }

  return segments;
}

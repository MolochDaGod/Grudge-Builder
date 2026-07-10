/**
 * WarCaptureZone — Conqueror's Blade–style capture points on the island floor.
 *
 * Important: the fortress GLB is centered on its full AABB, so ground sits at
 * negative Y. Zones must raycast onto terrain (not walls) and keep that Y.
 */
import * as THREE from 'three';
import type { WarFactionId } from '@shared/definitions/medievalBattleScene';

export type CaptureOwner = WarFactionId | 'contested' | 'neutral';

export interface CaptureZoneDef {
  id: string;
  label: string;
  /** World-space center ON the ground */
  center: THREE.Vector3;
  radius: number;
  owner: CaptureOwner;
  color: number;
}

export interface CaptureZoneState {
  id: string;
  label: string;
  owner: CaptureOwner;
  progress: number;
  capturer: CaptureOwner | null;
  crimsonIn: number;
  azureIn: number;
  goldIn: number;
}

const CAPTURE_RATE = 0.12;
const DECAY_RATE = 0.06;

export class WarCaptureZone {
  readonly id: string;
  readonly label: string;
  readonly center: THREE.Vector3;
  readonly radius: number;
  owner: CaptureOwner;
  progress = 0;
  capturer: CaptureOwner | null = null;
  private mesh: THREE.Group;
  private ring: THREE.Mesh;
  private fill: THREE.Mesh;
  private baseColor: number;

  constructor(def: CaptureZoneDef, parent: THREE.Object3D) {
    this.id = def.id;
    this.label = def.label;
    this.center = def.center.clone();
    this.radius = def.radius;
    this.owner = def.owner;
    this.baseColor = def.color;

    this.mesh = new THREE.Group();
    this.mesh.name = `capture_${def.id}`;
    // Sit slightly above sampled ground — never force Y=0
    this.mesh.position.set(this.center.x, this.center.y + 0.08, this.center.z);

    const ringGeo = new THREE.RingGeometry(
      Math.max(2, this.radius * 0.88),
      this.radius,
      48,
    );
    this.ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: true,
      }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 2;
    this.mesh.add(this.ring);

    const fillGeo = new THREE.CircleGeometry(this.radius * 0.86, 40);
    this.fill = new THREE.Mesh(
      fillGeo,
      new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.fill.rotation.x = -Math.PI / 2;
    this.fill.position.y = 0.02;
    this.fill.renderOrder = 1;
    this.mesh.add(this.fill);

    // Short pole so it doesn't look like a sky flag
    const poleH = Math.min(3.2, Math.max(2.2, this.radius * 0.28));
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.11, poleH, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.85 }),
    );
    pole.position.y = poleH * 0.5;
    pole.castShadow = true;
    this.mesh.add(pole);

    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.75),
      new THREE.MeshBasicMaterial({
        color: def.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      }),
    );
    flag.position.set(0.7, poleH * 0.85, 0);
    this.mesh.add(flag);

    parent.add(this.mesh);
    this.applyOwnerColor();
  }

  /** Re-snap mesh if ground sample improves after load */
  setGroundY(y: number): void {
    if (!Number.isFinite(y)) return;
    this.center.y = y;
    this.mesh.position.y = y + 0.08;
  }

  contains(p: THREE.Vector3): boolean {
    const dx = p.x - this.center.x;
    const dz = p.z - this.center.z;
    return dx * dx + dz * dz <= this.radius * this.radius;
  }

  update(
    dt: number,
    units: Array<{ faction: WarFactionId; position: THREE.Vector3; dead: boolean }>,
  ): void {
    let crimson = 0;
    let azure = 0;
    let gold = 0;
    for (const u of units) {
      if (u.dead) continue;
      if (!this.contains(u.position)) continue;
      if (u.faction === 'crimson') crimson++;
      else if (u.faction === 'azure') azure++;
      else if (u.faction === 'gold') gold++;
    }

    const scores: Array<[WarFactionId, number]> = [
      ['crimson', crimson],
      ['azure', azure],
      ['gold', gold],
    ];
    scores.sort((a, b) => b[1] - a[1]);
    const [leadFac, leadN] = scores[0]!;
    const secondN = scores[1]![1];
    const majority = leadN > 0 && leadN > secondN;

    if (!majority) {
      this.progress = Math.max(0, this.progress - DECAY_RATE * dt);
      if (this.progress <= 0) this.capturer = null;
    } else if (leadFac === this.owner) {
      this.progress = Math.max(0, this.progress - DECAY_RATE * 1.5 * dt);
      this.capturer = null;
    } else {
      this.capturer = leadFac;
      this.progress = Math.min(1, this.progress + CAPTURE_RATE * dt * (1 + leadN * 0.08));
      if (this.progress >= 1) {
        this.owner = leadFac;
        this.progress = 0;
        this.capturer = null;
        this.applyOwnerColor();
      }
    }

    const mat = this.ring.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.5 + (this.capturer ? Math.sin(performance.now() * 0.008) * 0.2 : 0.12);
  }

  private applyOwnerColor(): void {
    const c =
      this.owner === 'crimson'
        ? 0xb91c1c
        : this.owner === 'azure'
          ? 0x0284c7
          : this.owner === 'gold'
            ? 0xd97706
            : this.baseColor;
    (this.ring.material as THREE.MeshBasicMaterial).color.setHex(c);
    (this.fill.material as THREE.MeshBasicMaterial).color.setHex(c);
  }

  toState(): CaptureZoneState {
    return {
      id: this.id,
      label: this.label,
      owner: this.owner,
      progress: this.progress,
      capturer: this.capturer,
      crimsonIn: 0,
      azureIn: 0,
      goldIn: 0,
    };
  }

  dispose(): void {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
      else m.material?.dispose?.();
    });
  }
}

/**
 * Place 3 zones from real battlefield geometry after centering:
 *  - Keep: near wall cluster centroid (defenders)
 *  - Gate: on the approach side of walls toward attackers
 *  - Beach: further out on attacker approach axis
 */
export function buildCaptureZonesFromBattlefield(opts: {
  wallBoxes: THREE.Box3[];
  terrainBoxes: THREE.Box3[];
  sampleGround: (x: number, z: number) => number | null;
}): CaptureZoneDef[] {
  const wallUnion = new THREE.Box3();
  for (const b of opts.wallBoxes) {
    if (!b.isEmpty()) wallUnion.union(b);
  }
  const terrainUnion = new THREE.Box3();
  for (const b of opts.terrainBoxes) {
    if (!b.isEmpty()) terrainUnion.union(b);
  }

  // Prefer wall footprint; fall back to terrain; last resort unit square
  const foot = !wallUnion.isEmpty()
    ? wallUnion
    : !terrainUnion.isEmpty()
      ? terrainUnion
      : new THREE.Box3(
          new THREE.Vector3(-30, -2, -30),
          new THREE.Vector3(30, 8, 30),
        );

  const size = foot.getSize(new THREE.Vector3());
  const mid = foot.getCenter(new THREE.Vector3());
  // Horizontal extent for spacing
  const span = Math.max(size.x, size.z, 40);
  const rKeep = Math.max(8, Math.min(16, span * 0.12));
  const rGate = Math.max(9, Math.min(18, span * 0.14));
  const rBeach = Math.max(10, Math.min(20, span * 0.16));

  // Approach axis: from origin toward wall center, push beach outward
  let axis = new THREE.Vector3(mid.x, 0, mid.z);
  if (axis.lengthSq() < 1) axis.set(0, 0, 1);
  axis.normalize();

  // Keep near fort interior (wall center)
  const keepXZ = new THREE.Vector3(mid.x, 0, mid.z).addScaledVector(axis, -span * 0.05);
  // Gate on outer wall face toward open field
  const gateXZ = new THREE.Vector3(mid.x, 0, mid.z).addScaledVector(axis, span * 0.28);
  // Beach further out (landing)
  const beachXZ = new THREE.Vector3(mid.x, 0, mid.z).addScaledVector(axis, span * 0.55);

  const snap = (x: number, z: number, fallbackY: number): THREE.Vector3 => {
    // Prefer lowest solid hit among several samples (true ground, not walkway)
    let y = opts.sampleGround(x, z);
    if (y == null || !Number.isFinite(y)) y = fallbackY;
    // Also try slight offsets and pick lowest (avoid elevated walkways)
    for (const [dx, dz] of [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ] as const) {
      const yy = opts.sampleGround(x + dx, z + dz);
      if (yy != null && Number.isFinite(yy)) y = Math.min(y, yy);
    }
    return new THREE.Vector3(x, y, z);
  };

  const groundY = !Number.isFinite(mid.y) ? 0 : mid.y - size.y * 0.45;

  return [
    {
      id: 'zone_beach',
      label: 'Landing Beach',
      center: snap(beachXZ.x, beachXZ.z, groundY),
      radius: rBeach,
      owner: 'neutral',
      color: 0x94a3b8,
    },
    {
      id: 'zone_gate',
      label: 'Outer Gate',
      center: snap(gateXZ.x, gateXZ.z, groundY),
      radius: rGate,
      owner: 'azure',
      color: 0x0284c7,
    },
    {
      id: 'zone_keep',
      label: 'Inner Keep',
      center: snap(keepXZ.x, keepXZ.z, groundY),
      radius: rKeep,
      owner: 'azure',
      color: 0x0369a1,
    },
  ];
}

/** @deprecated use buildCaptureZonesFromBattlefield */
export function defaultCaptureZones(sceneRadius = 40): CaptureZoneDef[] {
  return buildCaptureZonesFromBattlefield({
    wallBoxes: [],
    terrainBoxes: [
      new THREE.Box3(
        new THREE.Vector3(-sceneRadius, -2, -sceneRadius),
        new THREE.Vector3(sceneRadius, 8, sceneRadius),
      ),
    ],
    sampleGround: () => 0,
  });
}

export function countZoneOwners(zones: WarCaptureZone[]): Record<string, number> {
  const out: Record<string, number> = { crimson: 0, azure: 0, gold: 0, neutral: 0 };
  for (const z of zones) {
    const k = z.owner === 'contested' ? 'neutral' : z.owner;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/**
 * WarCaptureZone — Conqueror's Blade–style capture points.
 *
 * 3 zones on the island. A side captures when it has more living units
 * inside the radius for long enough. Match ends when one side holds all
 * three, or the round timer expires (highest zone count / tie-break HP).
 */
import * as THREE from 'three';
import type { WarFactionId } from '@shared/definitions/medievalBattleScene';

export type CaptureOwner = WarFactionId | 'contested' | 'neutral';

export interface CaptureZoneDef {
  id: string;
  label: string;
  /** World center after env centering */
  center: THREE.Vector3;
  radius: number;
  /** Starting owner (Azure holds gate/keep typically) */
  owner: CaptureOwner;
  color: number;
}

export interface CaptureZoneState {
  id: string;
  label: string;
  owner: CaptureOwner;
  /** 0–1 progress toward new owner */
  progress: number;
  capturer: CaptureOwner | null;
  crimsonIn: number;
  azureIn: number;
  goldIn: number;
}

const CAPTURE_RATE = 0.12; // ~8s to flip with clear majority
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
    this.mesh.position.copy(this.center);
    this.mesh.position.y = 0.15;

    const ringGeo = new THREE.RingGeometry(this.radius * 0.92, this.radius, 64);
    this.ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.mesh.add(this.ring);

    const fillGeo = new THREE.CircleGeometry(this.radius * 0.9, 48);
    this.fill = new THREE.Mesh(
      fillGeo,
      new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.fill.rotation.x = -Math.PI / 2;
    this.fill.position.y = 0.02;
    this.mesh.add(this.fill);

    // Banner pole marker
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 4.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.85 }),
    );
    pole.position.y = 2.25;
    pole.castShadow = true;
    this.mesh.add(pole);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.0),
      new THREE.MeshBasicMaterial({
        color: def.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      }),
    );
    flag.position.set(0.9, 3.8, 0);
    this.mesh.add(flag);

    parent.add(this.mesh);
    this.applyOwnerColor();
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

    // Leading faction inside ring
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
      // Contested or empty — decay progress
      this.progress = Math.max(0, this.progress - DECAY_RATE * dt);
      if (this.progress <= 0) this.capturer = null;
    } else if (leadFac === this.owner) {
      // Reinforce — decay any flip progress
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

    // Pulse ring when capturing
    const mat = this.ring.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.45 + (this.capturer ? Math.sin(performance.now() * 0.008) * 0.2 : 0.1);
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

  toState(counts?: { crimson: number; azure: number; gold: number }): CaptureZoneState {
    return {
      id: this.id,
      label: this.label,
      owner: this.owner,
      progress: this.progress,
      capturer: this.capturer,
      crimsonIn: counts?.crimson ?? 0,
      azureIn: counts?.azure ?? 0,
      goldIn: counts?.gold ?? 0,
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

/** Default 3 CB-style points relative to centered fortress */
export function defaultCaptureZones(sceneRadius = 40): CaptureZoneDef[] {
  return [
    {
      id: 'zone_beach',
      label: 'Landing Beach',
      center: new THREE.Vector3(-sceneRadius * 0.55, 0, sceneRadius * 0.35),
      radius: 14,
      owner: 'neutral',
      color: 0x94a3b8,
    },
    {
      id: 'zone_gate',
      label: 'Outer Gate',
      center: new THREE.Vector3(0, 0, sceneRadius * 0.15),
      radius: 12,
      owner: 'azure',
      color: 0x0284c7,
    },
    {
      id: 'zone_keep',
      label: 'Inner Keep',
      center: new THREE.Vector3(sceneRadius * 0.12, 0, -sceneRadius * 0.2),
      radius: 11,
      owner: 'azure',
      color: 0x0369a1,
    },
  ];
}

export function countZoneOwners(zones: WarCaptureZone[]): Record<string, number> {
  const out: Record<string, number> = { crimson: 0, azure: 0, gold: 0, neutral: 0 };
  for (const z of zones) {
    const k = z.owner === 'contested' ? 'neutral' : z.owner;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

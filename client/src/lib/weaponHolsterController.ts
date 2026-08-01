/**
 * WeaponHolsterController — reparent equipped weapon meshes between hand and
 * hanging sockets (hip / back / quiver) with transitional timing.
 *
 * Works with Grudge6 mesh-toggle packs: visible weapon meshes are moved under
 * socket bones. If a socket bone is missing, a synthetic Object3D is created
 * under the best parent (Hips / Spine2).
 */
import * as THREE from 'three';
import type { Grudge6EquipmentManager } from '@/lib/grudge6Equipment';
import {
  HOLSTER_PROFILES,
  SOCKET_BONE_CANDIDATES,
  holsterClassForMeshSlot,
  holsterClassForWeaponType,
  type HolsterClass,
  type HolsterProfile,
  type SheathSocketId,
  type SocketPose,
} from '@shared/definitions/weaponAttachSystem';

const WEAPON_MESH_SLOTS = ['sword', 'axe', 'hammer', 'pick', 'spear', 'bow', 'staff', 'shield', 'dagger'] as const;

export type HolsterVisualState = 'drawn' | 'holstered' | 'transitioning';

export interface HolsterControllerOptions {
  root: THREE.Object3D;
  equipment?: Grudge6EquipmentManager | null;
  weaponType?: string;
}

interface TrackedWeapon {
  mesh: THREE.Object3D;
  slot: string;
  profile: HolsterProfile;
  homeParent: THREE.Object3D | null;
  homePos: THREE.Vector3;
  homeQuat: THREE.Quaternion;
  homeScale: THREE.Vector3;
}

export class WeaponHolsterController {
  private root: THREE.Object3D;
  private equipment: Grudge6EquipmentManager | null;
  private weaponType: string;
  private sockets = new Map<SheathSocketId, THREE.Object3D>();
  private tracked: TrackedWeapon[] = [];
  private state: HolsterVisualState = 'holstered';
  private transitionT = 0;
  private transitionDur = 0;
  private pendingTarget: 'drawn' | 'holstered' | null = null;
  private synthetic: THREE.Object3D[] = [];

  constructor(opts: HolsterControllerOptions) {
    this.root = opts.root;
    this.equipment = opts.equipment ?? null;
    this.weaponType = opts.weaponType ?? 'unarmed';
    this.ensureSockets();
    this.rescanWeapons();
  }

  get visualState(): HolsterVisualState {
    return this.state;
  }

  get isDrawn(): boolean {
    return this.state === 'drawn';
  }

  get isHolstered(): boolean {
    return this.state === 'holstered';
  }

  get isBusy(): boolean {
    return this.state === 'transitioning';
  }

  setWeaponType(wt: string): void {
    this.weaponType = wt;
  }

  setEquipment(em: Grudge6EquipmentManager | null): void {
    this.equipment = em;
    this.rescanWeapons();
  }

  /** Re-catalog visible weapon meshes after equip refresh */
  rescanWeapons(): void {
    // Restore any previous home so we don't lose hierarchy
    for (const t of this.tracked) {
      if (t.homeParent && t.mesh.parent !== t.homeParent) {
        t.homeParent.attach(t.mesh);
        t.mesh.position.copy(t.homePos);
        t.mesh.quaternion.copy(t.homeQuat);
        t.mesh.scale.copy(t.homeScale);
      }
    }
    this.tracked = [];
    if (!this.equipment) return;

    const wtClass = holsterClassForWeaponType(this.weaponType);
    for (const slot of WEAPON_MESH_SLOTS) {
      const variants = this.equipment.slots[slot];
      if (!variants) continue;
      for (const mesh of Object.values(variants)) {
        if (!mesh.visible) continue;
        const profile =
          HOLSTER_PROFILES[holsterClassForMeshSlot(slot)] ??
          HOLSTER_PROFILES[wtClass] ??
          HOLSTER_PROFILES.none;
        if (profile.class === 'none') continue;
        this.tracked.push({
          mesh,
          slot,
          profile,
          homeParent: mesh.parent,
          homePos: mesh.position.clone(),
          homeQuat: mesh.quaternion.clone(),
          homeScale: mesh.scale.clone(),
        });
      }
    }
  }

  /**
   * Begin draw or holster transition. `instant` snaps without blend timer.
   * Returns transition duration seconds (0 if already there / instant).
   */
  requestState(
    target: 'drawn' | 'holstered',
    opts?: { instant?: boolean; durationSec?: number },
  ): number {
    if (this.state === target && !this.pendingTarget) return 0;
    if (this.state === 'transitioning' && this.pendingTarget === target) {
      return Math.max(0, this.transitionDur - this.transitionT);
    }

    const profile = this.primaryProfile();
    const dur =
      opts?.instant
        ? 0
        : (opts?.durationSec ?? profile.transitionSec);

    if (dur <= 0) {
      this.applyPose(target);
      this.state = target;
      this.pendingTarget = null;
      this.transitionT = 0;
      this.transitionDur = 0;
      return 0;
    }

    this.state = 'transitioning';
    this.pendingTarget = target;
    this.transitionT = 0;
    this.transitionDur = dur;
    // Mid-transition: start moving toward target pose immediately
    this.applyPose(target);
    return dur;
  }

  /** Tick transition timer; call each frame */
  update(dt: number): void {
    if (this.state !== 'transitioning' || !this.pendingTarget) return;
    this.transitionT += dt;
    if (this.transitionT >= this.transitionDur) {
      this.applyPose(this.pendingTarget);
      this.state = this.pendingTarget;
      this.pendingTarget = null;
      this.transitionT = 0;
      this.transitionDur = 0;
    }
  }

  /** Snap holstered (climb / edge / mode exit) */
  forceHolster(instant = true): number {
    return this.requestState('holstered', {
      instant,
      durationSec: instant ? 0 : 0.22,
    });
  }

  forceDraw(instant = false): number {
    return this.requestState('drawn', {
      instant,
      durationSec: instant ? 0 : this.primaryProfile().transitionSec,
    });
  }

  dispose(): void {
    // Restore home parents
    for (const t of this.tracked) {
      if (t.homeParent) {
        try {
          t.homeParent.attach(t.mesh);
          t.mesh.position.copy(t.homePos);
          t.mesh.quaternion.copy(t.homeQuat);
          t.mesh.scale.copy(t.homeScale);
        } catch {
          /* scene may be tearing down */
        }
      }
    }
    this.tracked = [];
    for (const s of this.synthetic) {
      s.parent?.remove(s);
    }
    this.synthetic = [];
    this.sockets.clear();
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private primaryProfile(): HolsterProfile {
    if (this.tracked[0]) return this.tracked[0].profile;
    return HOLSTER_PROFILES[holsterClassForWeaponType(this.weaponType)] ?? HOLSTER_PROFILES.none;
  }

  private ensureSockets(): void {
    for (const id of Object.keys(SOCKET_BONE_CANDIDATES) as SheathSocketId[]) {
      const found = this.findBone(SOCKET_BONE_CANDIDATES[id]);
      if (found) {
        this.sockets.set(id, found);
        continue;
      }
      // Synthetic socket under hips / spine / root
      const parent =
        this.findBone(['mixamorig:Hips', 'Hips', 'pelvis', 'Spine', 'mixamorig:Spine', 'mixamorig:Spine2', 'Spine2']) ??
        this.root;
      const sock = new THREE.Object3D();
      sock.name = `synth_socket_${id}`;
      // Default local placements when bone missing
      const defaults: Record<SheathSocketId, [number, number, number]> = {
        hand_r: [0.25, 1.0, 0.1],
        hand_l: [-0.25, 1.0, 0.1],
        hip_r: [0.18, 0.9, 0.05],
        hip_l: [-0.18, 0.9, 0.05],
        hip_r_belt: [0.16, 0.95, 0.08],
        quiver_back: [0.05, 1.25, -0.15],
        back_bag: [0, 1.15, -0.18],
        cast_float: [0.2, 1.2, 0.15],
      };
      sock.position.set(...defaults[id]);
      parent.add(sock);
      this.synthetic.push(sock);
      this.sockets.set(id, sock);
    }
  }

  private findBone(names: string[]): THREE.Object3D | null {
    for (const n of names) {
      const o = this.root.getObjectByName(n);
      if (o) return o;
    }
    // Case-insensitive deep scan
    const lower = names.map((n) => n.toLowerCase());
    let found: THREE.Object3D | null = null;
    this.root.traverse((o) => {
      if (found) return;
      if (lower.includes((o.name || '').toLowerCase())) found = o;
    });
    return found;
  }

  private applyPose(target: 'drawn' | 'holstered'): void {
    for (const t of this.tracked) {
      const pose: SocketPose = target === 'drawn' ? t.profile.drawn : t.profile.holstered;
      const socket = this.sockets.get(pose.socket);
      if (!socket) continue;
      // World-preserving attach then set local pose
      socket.attach(t.mesh);
      t.mesh.position.set(...pose.offset);
      t.mesh.rotation.set(...pose.rotation);
      if (pose.scale != null) t.mesh.scale.setScalar(pose.scale);
      t.mesh.visible = true;
    }
    // Utility quiver visible when bow holstered
    if (this.equipment) {
      const hasBow = this.tracked.some((t) => t.slot === 'bow');
      if (hasBow && target === 'holstered') {
        try {
          this.equipment.equip('quiver', '_default');
        } catch {
          /* optional */
        }
      }
    }
  }
}

/** Map HolsterClass → preferred anim slot name for draw/sheath */
export function holsterAnimForProfile(profile: HolsterProfile, kind: 'draw' | 'holster'): string {
  return kind === 'draw' ? profile.drawAnim : profile.holsterAnim;
}

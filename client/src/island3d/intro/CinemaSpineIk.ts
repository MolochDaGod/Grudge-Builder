/**
 * CinemaSpineIk — production spine / neck / head soft look-at for cinemas.
 *
 * Best practices:
 *  - Apply AFTER AnimationMixer.update so clips don't fight IK
 *  - Clamp yaw/pitch so torsos don't snap 180°
 *  - Distribute lean across Spine → Spine1 → Spine2 → Neck → Head
 *  - Weight fades with distance / beat intent
 *  - Works with Bip001 / mixamorig / generic name fragments
 *
 * Not full two-bone limb IK — torso aim only (cinema grade).
 */
import * as THREE from 'three';

const SPINE_HINTS = [
  'bip001 spine',
  'bip001_spine',
  'spine',
  'spine1',
  'spine2',
  'spine3',
  'chest',
  'neck',
  'head',
];

export type SpineIkBoneSet = {
  spine: THREE.Bone | null;
  spine1: THREE.Bone | null;
  spine2: THREE.Bone | null;
  neck: THREE.Bone | null;
  head: THREE.Bone | null;
};

export type SpineIkOpts = {
  /** Max yaw deg from rest forward (default 55) */
  maxYawDeg?: number;
  /** Max pitch deg (default 35) */
  maxPitchDeg?: number;
  /** 0..1 overall weight */
  weight?: number;
  /** Smoothing 0..1 per frame (higher = snappier) */
  smooth?: number;
};

function boneName(b: THREE.Bone): string {
  return (b.name || '').toLowerCase().replace(/[:\s.]+/g, '');
}

function pickBone(bones: THREE.Bone[], ...needles: string[]): THREE.Bone | null {
  for (const n of needles) {
    const key = n.toLowerCase().replace(/[:\s.]+/g, '');
    for (const b of bones) {
      const bn = boneName(b);
      if (bn === key || bn.endsWith(key) || bn.includes(key)) return b;
    }
  }
  return null;
}

/** Collect all bones under a skinned mesh tree. */
export function collectBones(root: THREE.Object3D): THREE.Bone[] {
  const out: THREE.Bone[] = [];
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) out.push(o as THREE.Bone);
  });
  return out;
}

/** Resolve Bip001-style spine chain from a character root. */
export function resolveSpineChain(root: THREE.Object3D): SpineIkBoneSet {
  const bones = collectBones(root);
  return {
    spine: pickBone(bones, 'bip001spine', 'spine', 'mixamorigspine'),
    spine1: pickBone(bones, 'bip001spine1', 'spine1', 'mixamorigspine1'),
    spine2: pickBone(bones, 'bip001spine2', 'spine2', 'mixamorigspine2', 'chest'),
    neck: pickBone(bones, 'bip001neck', 'neck', 'mixamorigneck'),
    head: pickBone(bones, 'bip001head', 'head', 'mixamorighead'),
  };
}

/**
 * Soft torso look-at. Mutates bone rotations in local space with clamps.
 * Call once per frame after mixer.update(dt).
 */
export class CinemaSpineIk {
  readonly root: THREE.Object3D;
  readonly chain: SpineIkBoneSet;
  private target = new THREE.Vector3();
  private hasTarget = false;
  private weight = 0;
  private curYaw = 0;
  private curPitch = 0;
  private enabled = true;

  /** World-forward for character at bind (default +Z) */
  forwardAxis = new THREE.Vector3(0, 0, 1);

  constructor(root: THREE.Object3D) {
    this.root = root;
    this.chain = resolveSpineChain(root);
  }

  get hasSpine(): boolean {
    return !!(this.chain.spine || this.chain.spine1 || this.chain.neck || this.chain.head);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  /** World-space look target (metres). */
  setTarget(world: THREE.Vector3 | null, weight = 1): void {
    if (!world) {
      this.hasTarget = false;
      this.weight = 0;
      return;
    }
    this.target.copy(world);
    this.hasTarget = true;
    this.weight = THREE.MathUtils.clamp(weight, 0, 1);
  }

  /** Convenience: aim at another Object3D world position. */
  setTargetObject(obj: THREE.Object3D | null, weight = 1, offsetY = 0): void {
    if (!obj) {
      this.setTarget(null, 0);
      return;
    }
    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);
    wp.y += offsetY;
    this.setTarget(wp, weight);
  }

  update(opts: SpineIkOpts = {}): void {
    if (!this.enabled || !this.hasTarget || this.weight <= 0.001) return;

    const maxYaw = THREE.MathUtils.degToRad(opts.maxYawDeg ?? 55);
    const maxPitch = THREE.MathUtils.degToRad(opts.maxPitchDeg ?? 35);
    const w = (opts.weight ?? 1) * this.weight;
    const smooth = opts.smooth ?? 0.18;

    // Character root world frame
    this.root.updateWorldMatrix(true, false);
    const rootWorld = new THREE.Vector3();
    this.root.getWorldPosition(rootWorld);

    // Prefer chest height as aim origin
    const origin = rootWorld.clone();
    origin.y += 1.35;

    const to = this.target.clone().sub(origin);
    if (to.lengthSq() < 1e-6) return;

    // Project into root local space
    const inv = new THREE.Matrix4().copy(this.root.matrixWorld).invert();
    const localDir = to.clone().transformDirection(inv).normalize();

    // yaw around Y, pitch around X (look toward localDir)
    const yaw = Math.atan2(localDir.x, localDir.z);
    const pitch = Math.atan2(localDir.y, Math.hypot(localDir.x, localDir.z));

    const ty = THREE.MathUtils.clamp(yaw, -maxYaw, maxYaw) * w;
    const tp = THREE.MathUtils.clamp(pitch, -maxPitch, maxPitch) * w;

    this.curYaw += (ty - this.curYaw) * smooth;
    this.curPitch += (tp - this.curPitch) * smooth;

    // Distribute: spine base carries yaw, upper spine pitch, neck/head refine
    const y0 = this.curYaw * 0.35;
    const y1 = this.curYaw * 0.3;
    const y2 = this.curYaw * 0.2;
    const yn = this.curYaw * 0.1;
    const yh = this.curYaw * 0.05;

    const p0 = this.curPitch * 0.15;
    const p1 = this.curPitch * 0.25;
    const p2 = this.curPitch * 0.25;
    const pn = this.curPitch * 0.2;
    const ph = this.curPitch * 0.15;

    this.applyBone(this.chain.spine, y0, p0);
    this.applyBone(this.chain.spine1, y1, p1);
    this.applyBone(this.chain.spine2, y2, p2);
    this.applyBone(this.chain.neck, yn, pn);
    this.applyBone(this.chain.head, yh, ph);
  }

  private applyBone(bone: THREE.Bone | null, yaw: number, pitch: number): void {
    if (!bone) return;
    // Additive euler on local rotation (preserve clip base by composing)
    bone.rotation.order = 'YXZ';
    bone.rotation.y += yaw;
    bone.rotation.x += pitch;
  }

  /** Debug: list resolved bone names */
  debugNames(): Record<string, string | null> {
    const n = (b: THREE.Bone | null) => (b ? b.name : null);
    return {
      spine: n(this.chain.spine),
      spine1: n(this.chain.spine1),
      spine2: n(this.chain.spine2),
      neck: n(this.chain.neck),
      head: n(this.chain.head),
    };
  }
}

/** Batch helper for multiple cinema actors. */
export class CinemaSpineIkRoster {
  private map = new Map<string, CinemaSpineIk>();

  bind(actorId: string, root: THREE.Object3D): CinemaSpineIk {
    const ik = new CinemaSpineIk(root);
    this.map.set(actorId, ik);
    return ik;
  }

  get(actorId: string): CinemaSpineIk | undefined {
    return this.map.get(actorId);
  }

  /** Aim actor spine at a world position (or clear). */
  aim(actorId: string, world: THREE.Vector3 | null, weight = 1): void {
    this.map.get(actorId)?.setTarget(world, weight);
  }

  aimAtObject(actorId: string, obj: THREE.Object3D | null, weight = 1, offsetY = 0): void {
    this.map.get(actorId)?.setTargetObject(obj, weight, offsetY);
  }

  /** Call after all mixers updated. */
  updateAll(opts?: SpineIkOpts): void {
    for (const ik of this.map.values()) ik.update(opts);
  }

  dispose(): void {
    this.map.clear();
  }
}

void SPINE_HINTS;

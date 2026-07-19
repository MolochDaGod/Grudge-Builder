/**
 * CharacterIK.ts
 * ─────────────────────────────────────────────────────────────
 * IK (Inverse Kinematics) post-process layer for Three.js characters.
 *
 * Runs AFTER FK animations play each frame. Adjusts specific bones
 * to match the world:
 *
 *   - Foot IK: plants feet on uneven terrain (slopes, stairs, rocks)
 *   - Head IK: rotates head/neck to look at a target (enemy, NPC, point)
 *   - Hand IK: attaches hands to weapons, objects, ladders
 *
 * Uses two-bone IK (the standard for humanoid limbs — 3 joints, 2 bones).
 *
 * Usage:
 *   const ik = new CharacterIK(skinnedMesh);
 *   // In game loop:
 *   animationManager.update(dt);  // FK first
 *   ik.updateFootIK(terrain);     // IK adjusts on top
 *   ik.updateHeadIK(targetPos);
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from "three";

// ── Two-Bone IK Solver ──────────────────────────────────────
//
// Solves the classic arm/leg problem:
//   Joint A (shoulder/hip) → Joint B (elbow/knee) → Joint C (wrist/ankle)
//   Given a target position for C, compute rotations for A and B.
//
// Uses the geometric (cosine rule) approach — fast and exact for 2 bones.

export function solveTwoBoneIK(
  boneA: THREE.Bone,       // root (hip / shoulder)
  boneB: THREE.Bone,       // mid  (knee / elbow)
  boneC: THREE.Bone,       // end  (ankle / wrist)
  target: THREE.Vector3,   // world-space target position
  poleTarget: THREE.Vector3, // world-space pole direction (knee/elbow aim)
  options: {
    /** Max iterations for constraint enforcement */
    iterations?: number;
    /** Weight 0-1 for blending with FK pose */
    weight?: number;
  } = {},
): void {
  const weight = options.weight ?? 1;
  if (weight <= 0) return;

  // Get world positions of all three joints
  const posA = new THREE.Vector3();
  const posB = new THREE.Vector3();
  const posC = new THREE.Vector3();
  boneA.getWorldPosition(posA);
  boneB.getWorldPosition(posB);
  boneC.getWorldPosition(posC);

  // Bone lengths
  const lenAB = posA.distanceTo(posB);
  const lenBC = posB.distanceTo(posC);
  const lenAT = posA.distanceTo(target);

  // Clamp target distance to bone reach
  const maxReach = lenAB + lenBC - 0.001;
  const minReach = Math.abs(lenAB - lenBC) + 0.001;
  const clampedLen = THREE.MathUtils.clamp(lenAT, minReach, maxReach);

  // ── Solve angles using cosine rule ────────────────────────

  // Angle at A (hip/shoulder) — between bone AB and line to target
  const cosAngleA = (lenAB * lenAB + clampedLen * clampedLen - lenBC * lenBC)
    / (2 * lenAB * clampedLen);
  const angleA = Math.acos(THREE.MathUtils.clamp(cosAngleA, -1, 1));

  // Angle at B (knee/elbow) — between bone AB and bone BC
  const cosAngleB = (lenAB * lenAB + lenBC * lenBC - clampedLen * clampedLen)
    / (2 * lenAB * lenBC);
  const angleB = Math.acos(THREE.MathUtils.clamp(cosAngleB, -1, 1));

  // ── Apply rotations ───────────────────────────────────────

  // Direction from A to target
  const dirAT = new THREE.Vector3().subVectors(target, posA).normalize();

  // Pole plane — defines which way the knee/elbow bends
  const dirAP = new THREE.Vector3().subVectors(poleTarget, posA).normalize();
  const poleNormal = new THREE.Vector3().crossVectors(dirAT, dirAP).normalize();
  const bendDir = new THREE.Vector3().crossVectors(poleNormal, dirAT).normalize();

  // Position B should be at
  const targetB = new THREE.Vector3()
    .copy(posA)
    .addScaledVector(dirAT, Math.cos(angleA) * lenAB)
    .addScaledVector(bendDir, Math.sin(angleA) * lenAB);

  // Convert to local space and apply rotations
  // Bone A: point toward targetB
  const parentInverse = new THREE.Matrix4();
  if (boneA.parent) {
    parentInverse.copy(boneA.parent.matrixWorld).invert();
  }

  const localTargetB = targetB.clone().applyMatrix4(parentInverse);
  const localPosA = posA.clone().applyMatrix4(parentInverse);
  const localDirAB = new THREE.Vector3().subVectors(localTargetB, localPosA).normalize();

  // Save FK rotation for blending
  const fkQuatA = boneA.quaternion.clone();
  const fkQuatB = boneB.quaternion.clone();

  // Apply IK rotation to bone A
  const ikQuatA = new THREE.Quaternion();
  const currentDirAB = new THREE.Vector3(0, 1, 0); // default bone direction (up)
  ikQuatA.setFromUnitVectors(currentDirAB, localDirAB);
  boneA.quaternion.copy(ikQuatA);
  boneA.updateMatrixWorld(true);

  // Apply IK rotation to bone B (bend by angleB)
  const ikQuatB = new THREE.Quaternion();
  ikQuatB.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI - angleB);
  boneB.quaternion.copy(ikQuatB);
  boneB.updateMatrixWorld(true);

  // Blend with FK if weight < 1
  if (weight < 1) {
    boneA.quaternion.slerp(fkQuatA, 1 - weight);
    boneB.quaternion.slerp(fkQuatB, 1 - weight);
  }
}

// ── CharacterIK ─────────────────────────────────────────────

export interface FootIKConfig {
  /** How far below the character to raycast for ground */
  raycastDistance: number;
  /** Maximum hip offset adjustment (prevents extreme poses) */
  maxHipOffset: number;
  /** IK blend weight (0 = pure FK, 1 = full IK) */
  weight: number;
  /** Smoothing factor for hip offset changes (lerp speed) */
  smoothing: number;
  /** Layer mask for terrain raycasts */
  terrainLayers: THREE.Object3D[];
  /**
   * three-player-controller LegIK best practice:
   * while moving, only LIFT feet that would penetrate ground — never pull
   * feet down (avoids sticky feet / sliding).
   */
  moveLiftOnly: boolean;
  /** Threshold (m) before lift kicks in while moving */
  moveLiftThreshold: number;
  /** Enable full plant IK when idle/standing */
  plantWhenIdle: boolean;
  /** Max knee bend (rad) soft clamp via weight scale */
  maxKneeInfluence: number;
}

export interface HandIKConfig {
  weight: number;
  /** Elbow pole bias strength */
  poleOut: number;
  poleDown: number;
}

export interface LookAtIKConfig {
  /** Max rotation angle in radians */
  maxAngle: number;
  /** Smoothing for head rotation */
  smoothing: number;
  /** Weight blend */
  weight: number;
}

const DEFAULT_FOOT_CONFIG: FootIKConfig = {
  raycastDistance: 5,
  maxHipOffset: 0.45,
  weight: 1.0,
  smoothing: 10,
  terrainLayers: [],
  moveLiftOnly: true,
  moveLiftThreshold: 0.008,
  plantWhenIdle: true,
  maxKneeInfluence: 1,
};

const DEFAULT_HAND_CONFIG: HandIKConfig = {
  weight: 1,
  poleOut: 0.85,
  poleDown: 0.55,
};

/** Boost foot IK briefly on dash impact (plants feet after lunge). */
const DASH_FOOT_IK_BOOST = 1.15;
const DASH_FOOT_IK_DURATION = 0.28;

const DEFAULT_LOOKAT_CONFIG: LookAtIKConfig = {
  maxAngle: Math.PI * 0.4, // ~72 degrees
  smoothing: 5,
  weight: 1.0,
};

export class CharacterIK {
  private skeleton: THREE.Skeleton | null = null;
  private bones: Map<string, THREE.Bone> = new Map();
  private rootModel: THREE.Object3D;

  // Foot IK state
  private hipOffset: number = 0;
  private leftFootTarget: THREE.Vector3 = new THREE.Vector3();
  private rightFootTarget: THREE.Vector3 = new THREE.Vector3();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  // Look-at state
  private currentLookTarget: THREE.Vector3 = new THREE.Vector3();
  private headRestQuat: THREE.Quaternion = new THREE.Quaternion();

  // Config (public for lil-gui editability)
  footConfig: FootIKConfig;
  lookAtConfig: LookAtIKConfig;
  handConfig: HandIKConfig;
  /** Remaining seconds of dash-landing foot IK boost */
  private dashFootIkTimer = 0;
  private baseFootWeight = 1;
  /** Foot phase labels for debug panel (stance / plant / swing) */
  private leftFootPhase = 'stance';
  private rightFootPhase = 'stance';
  private leftPhaseTimer = 0;
  private rightPhaseTimer = 0;
  /** Locomotion flag — set each frame by controller before updateFootIK */
  isMoving = false;
  isGrounded = true;
  /** Pose restore map (LegIK restore pattern) */
  private adjusted = new Map<THREE.Bone, { position: THREE.Vector3; quaternion: THREE.Quaternion }>();
  private _tmpV = new THREE.Vector3();
  private _tmpPole = new THREE.Vector3();

  constructor(
    model: THREE.Object3D,
    footConfig?: Partial<FootIKConfig>,
    lookAtConfig?: Partial<LookAtIKConfig>,
    handConfig?: Partial<HandIKConfig>,
  ) {
    this.rootModel = model;
    this.footConfig = { ...DEFAULT_FOOT_CONFIG, ...footConfig };
    this.lookAtConfig = { ...DEFAULT_LOOKAT_CONFIG, ...lookAtConfig };
    this.handConfig = { ...DEFAULT_HAND_CONFIG, ...handConfig };
    this.baseFootWeight = this.footConfig.weight;

    // Find skeleton and index all bones by name
    model.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        this.skeleton = (child as THREE.SkinnedMesh).skeleton;
      }
      if ((child as THREE.Bone).isBone) {
        const bone = child as THREE.Bone;
        this.bones.set(bone.name, bone);
        // Also index without Mixamo prefix (mixamorig:)
        const cleanName = bone.name.replace(/^mixamorig[:\.]?/, "");
        if (cleanName !== bone.name) this.bones.set(cleanName, bone);
      }
    });

    // Store rest pose for head
    const headBone = this.findBone("Head");
    if (headBone) this.headRestQuat.copy(headBone.quaternion);
  }

  // ── Bone finding (handles Mixamo naming) ──────────────────

  findBone(name: string): THREE.Bone | null {
    if (this.bones.has(name)) return this.bones.get(name)!;
    if (this.bones.has(`mixamorig:${name}`)) return this.bones.get(`mixamorig:${name}`)!;
    if (this.bones.has(`mixamorig.${name}`)) return this.bones.get(`mixamorig.${name}`)!;
    if (this.bones.has(`Bip001_${name}`)) return this.bones.get(`Bip001_${name}`)!;
    // Toon RTS / grudge6 Bip001 limbs
    const bipMap: Record<string, string[]> = {
      LeftUpLeg: ['Bip001_L_Thigh', 'Bip001 L Thigh', 'mixamorig:LeftUpLeg'],
      LeftLeg: ['Bip001_L_Calf', 'Bip001 L Calf', 'mixamorig:LeftLeg'],
      LeftFoot: ['Bip001_L_Foot', 'Bip001 L Foot', 'mixamorig:LeftFoot'],
      RightUpLeg: ['Bip001_R_Thigh', 'Bip001 R Thigh', 'mixamorig:RightUpLeg'],
      RightLeg: ['Bip001_R_Calf', 'Bip001 R Calf', 'mixamorig:RightLeg'],
      RightFoot: ['Bip001_R_Foot', 'Bip001 R Foot', 'mixamorig:RightFoot'],
      Hips: ['Bip001_Pelvis', 'Bip001 Pelvis', 'mixamorig:Hips'],
      LeftArm: ['Bip001_L_UpperArm', 'Bip001 L UpperArm', 'mixamorig:LeftArm'],
      LeftForeArm: ['Bip001_L_Forearm', 'Bip001_L_ForeArm', 'Bip001 L Forearm', 'mixamorig:LeftForeArm'],
      LeftHand: ['Bip001_L_Hand', 'Bip001 L Hand', 'mixamorig:LeftHand'],
      RightArm: ['Bip001_R_UpperArm', 'Bip001 R UpperArm', 'mixamorig:RightArm'],
      RightForeArm: ['Bip001_R_Forearm', 'Bip001_R_ForeArm', 'Bip001 R Forearm', 'mixamorig:RightForeArm'],
      RightHand: ['Bip001_R_Hand', 'Bip001 R Hand', 'mixamorig:RightHand'],
      Head: ['Bip001_Head', 'Bip001 Head', 'mixamorig:Head'],
      Neck: ['Bip001_Neck', 'Bip001 Neck', 'mixamorig:Neck'],
    };
    for (const alt of bipMap[name] ?? []) {
      if (this.bones.has(alt)) return this.bones.get(alt)!;
    }
    // Fuzzy: any bone containing name
    const lower = name.toLowerCase();
    for (const [k, bone] of this.bones) {
      if (k.toLowerCase().includes(lower)) return bone;
    }
    return null;
  }

  /** Export knobs for editor / lil-gui */
  getEditableParams(): Record<string, number | boolean> {
    return {
      footWeight: this.footConfig.weight,
      footSmoothing: this.footConfig.smoothing,
      maxHipOffset: this.footConfig.maxHipOffset,
      moveLiftOnly: this.footConfig.moveLiftOnly,
      moveLiftThreshold: this.footConfig.moveLiftThreshold,
      plantWhenIdle: this.footConfig.plantWhenIdle,
      handWeight: this.handConfig.weight,
      handPoleOut: this.handConfig.poleOut,
      handPoleDown: this.handConfig.poleDown,
      lookWeight: this.lookAtConfig.weight,
      lookSmoothing: this.lookAtConfig.smoothing,
    };
  }

  applyEditableParams(p: Partial<Record<string, number | boolean>>): void {
    if (p.footWeight != null) {
      this.footConfig.weight = Number(p.footWeight);
      this.baseFootWeight = this.footConfig.weight;
    }
    if (p.footSmoothing != null) this.footConfig.smoothing = Number(p.footSmoothing);
    if (p.maxHipOffset != null) this.footConfig.maxHipOffset = Number(p.maxHipOffset);
    if (p.moveLiftOnly != null) this.footConfig.moveLiftOnly = Boolean(p.moveLiftOnly);
    if (p.moveLiftThreshold != null) this.footConfig.moveLiftThreshold = Number(p.moveLiftThreshold);
    if (p.plantWhenIdle != null) this.footConfig.plantWhenIdle = Boolean(p.plantWhenIdle);
    if (p.handWeight != null) this.handConfig.weight = Number(p.handWeight);
    if (p.handPoleOut != null) this.handConfig.poleOut = Number(p.handPoleOut);
    if (p.handPoleDown != null) this.handConfig.poleDown = Number(p.handPoleDown);
    if (p.lookWeight != null) this.lookAtConfig.weight = Number(p.lookWeight);
    if (p.lookSmoothing != null) this.lookAtConfig.smoothing = Number(p.lookSmoothing);
  }

  /**
   * Restore bones adjusted last frame BEFORE mixer advances (LegIK restore order).
   * Call: ik.restore() → animations.update(dt) → ik.updateFootIK()
   */
  restore(): void {
    for (const [bone, pose] of this.adjusted) {
      bone.position.copy(pose.position);
      bone.quaternion.copy(pose.quaternion);
    }
    this.adjusted.clear();
  }

  private capture(bone: THREE.Bone): void {
    if (this.adjusted.has(bone)) return;
    this.adjusted.set(bone, {
      position: bone.position.clone(),
      quaternion: bone.quaternion.clone(),
    });
  }

  // ═══════════════════════════════════════════════════════════
  // FOOT IK — plants feet on uneven terrain
  // ═══════════════════════════════════════════════════════════

  /**
   * Call on dash / attack lunge impact — snaps foot IK harder for a short window
   * (pairs with dash_foot smoke VFX at the feet).
   */
  pulseDashFootIK(duration = DASH_FOOT_IK_DURATION): void {
    this.dashFootIkTimer = Math.max(this.dashFootIkTimer, duration);
    this.footConfig.weight = Math.min(1, this.baseFootWeight * DASH_FOOT_IK_BOOST);
    this.footConfig.smoothing = 14;
    this.leftFootPhase = 'plant';
    this.rightFootPhase = 'plant';
    this.leftPhaseTimer = duration;
    this.rightPhaseTimer = duration;
  }

  /** Debug text for lil-gui style foot phase panel. */
  getFootPhaseDebugText(side: 'left' | 'right'): string {
    return side === 'left' ? this.leftFootPhase : this.rightFootPhase;
  }

  /** Tick phase labels without full IK (freeze debug). */
  tickFootPhase(dt: number, leftMoving: boolean, rightMoving: boolean): void {
    this.leftPhaseTimer = Math.max(0, this.leftPhaseTimer - dt);
    this.rightPhaseTimer = Math.max(0, this.rightPhaseTimer - dt);
    if (this.leftPhaseTimer <= 0) {
      this.leftFootPhase = leftMoving ? 'swing' : 'stance';
    }
    if (this.rightPhaseTimer <= 0) {
      this.rightFootPhase = rightMoving ? 'swing' : 'stance';
    }
  }

  /**
   * Call this AFTER FK animation update, BEFORE render.
   * Raycasts down from each foot bone to find the ground,
   * adjusts hip height + ankle rotation so feet plant correctly.
   */
  updateFootIK(terrainObjects: THREE.Object3D[], delta: number): void {
    if (this.dashFootIkTimer > 0) {
      this.dashFootIkTimer = Math.max(0, this.dashFootIkTimer - delta);
      if (this.dashFootIkTimer <= 0) {
        this.footConfig.weight = this.baseFootWeight;
        this.footConfig.smoothing = DEFAULT_FOOT_CONFIG.smoothing;
      }
    }
    this.tickFootPhase(delta, this.isMoving, this.isMoving);
    if (this.footConfig.weight <= 0 || !this.isGrounded) return;

    const leftFoot = this.findBone("LeftFoot") || this.findBone("LeftToeBase");
    const rightFoot = this.findBone("RightFoot") || this.findBone("RightToeBase");
    const leftLeg = this.findBone("LeftUpLeg");
    const leftKnee = this.findBone("LeftLeg");
    const rightLeg = this.findBone("RightUpLeg");
    const rightKnee = this.findBone("RightLeg");
    const hips = this.findBone("Hips");

    if (!leftFoot || !rightFoot || !hips) return;

    const leftGroundY = this.raycastGround(leftFoot, terrainObjects);
    const rightGroundY = this.raycastGround(rightFoot, terrainObjects);
    if (leftGroundY === null && rightGroundY === null) return;

    // Moving: only anti-penetration lift (LegIK moveLiftOnly) — keep locomotion lively
    const moving = this.isMoving && this.footConfig.moveLiftOnly;
    const thr = this.footConfig.moveLiftThreshold;

    const leftFootY = this.getFootWorldY(leftFoot);
    const rightFootY = this.getFootWorldY(rightFoot);
    let leftDiff = leftGroundY !== null ? leftGroundY - leftFootY : 0;
    let rightDiff = rightGroundY !== null ? rightGroundY - rightFootY : 0;

    if (moving) {
      // Only lift if foot is below ground (penetration). Ignore "pull down".
      leftDiff = leftDiff > thr ? leftDiff : 0;
      rightDiff = rightDiff > thr ? rightDiff : 0;
      if (leftDiff === 0 && rightDiff === 0) {
        // Ease hip back
        this.hipOffset = THREE.MathUtils.lerp(this.hipOffset, 0, Math.min(1, delta * this.footConfig.smoothing));
        if (Math.abs(this.hipOffset) > 1e-4) {
          this.capture(hips);
          hips.position.y += this.hipOffset;
        }
        return;
      }
    } else if (!this.footConfig.plantWhenIdle) {
      return;
    }

    // Hip: drop with the lower foot (most negative after sign flip for lift-only positive)
    const hipNeed = moving
      ? Math.max(leftDiff, rightDiff) // lift pelvis if either foot needs up
      : Math.min(leftDiff, rightDiff); // plant: lower hip to shorter leg
    const targetHipOffset = THREE.MathUtils.clamp(
      hipNeed * (moving ? 0.35 : 1),
      -this.footConfig.maxHipOffset,
      this.footConfig.maxHipOffset,
    );

    this.hipOffset = THREE.MathUtils.lerp(
      this.hipOffset,
      targetHipOffset,
      Math.min(1, delta * this.footConfig.smoothing),
    );

    this.capture(hips);
    hips.position.y += this.hipOffset;
    hips.updateMatrixWorld(true);

    const w = this.footConfig.weight * this.footConfig.maxKneeInfluence;
    this.applyLegPlant(leftLeg, leftKnee, leftFoot, leftGroundY, leftDiff, w, true, moving);
    this.applyLegPlant(rightLeg, rightKnee, rightFoot, rightGroundY, rightDiff, w, false, moving);
  }

  private applyLegPlant(
    thigh: THREE.Bone | null,
    knee: THREE.Bone | null,
    foot: THREE.Bone | null,
    groundY: number | null,
    footDiff: number,
    weight: number,
    isLeft: boolean,
    moving: boolean,
  ): void {
    if (!thigh || !knee || !foot || groundY === null) return;
    if (moving && footDiff <= this.footConfig.moveLiftThreshold) return;

    this.capture(thigh);
    this.capture(knee);
    this.capture(foot);

    const target = this._tmpV;
    foot.getWorldPosition(target);
    target.y = groundY + 0.01;

    // Pole: rest knee direction projected forward of character
    const pole = this._tmpPole;
    knee.getWorldPosition(pole);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.rootModel.getWorldQuaternion(new THREE.Quaternion()));
    pole.addScaledVector(fwd, isLeft ? 1.2 : 1.2);
    pole.y -= 0.2;

    solveTwoBoneIK(thigh, knee, foot, target, pole, { weight });
  }

  private raycastGround(footBone: THREE.Bone, terrainObjects: THREE.Object3D[]): number | null {
    const footPos = new THREE.Vector3();
    footBone.getWorldPosition(footPos);

    // Cast from above the foot downward
    this.raycaster.set(
      new THREE.Vector3(footPos.x, footPos.y + 2, footPos.z),
      new THREE.Vector3(0, -1, 0)
    );
    this.raycaster.far = this.footConfig.raycastDistance + 2;

    const hits = this.raycaster.intersectObjects(terrainObjects, true);
    if (hits.length > 0) {
      return hits[0].point.y;
    }
    return null;
  }

  private getFootWorldY(bone: THREE.Bone): number {
    const pos = new THREE.Vector3();
    bone.getWorldPosition(pos);
    return pos.y;
  }

  // ═══════════════════════════════════════════════════════════
  // HEAD LOOK-AT IK — rotates head toward a target
  // ═══════════════════════════════════════════════════════════

  /**
   * Call AFTER FK animation. Rotates head (and optionally neck)
   * to look toward a world-space target point.
   *
   * @param target World-space position to look at (enemy, NPC, cursor)
   * @param delta Frame delta for smoothing
   */
  updateHeadIK(target: THREE.Vector3 | null, delta: number): void {
    const headBone = this.findBone("Head");
    const neckBone = this.findBone("Neck");
    if (!headBone) return;

    if (!target) {
      // No target — blend back to FK pose
      headBone.quaternion.slerp(this.headRestQuat, Math.min(1, delta * this.lookAtConfig.smoothing));
      return;
    }

    // Smooth target tracking
    this.currentLookTarget.lerp(target, Math.min(1, delta * this.lookAtConfig.smoothing));

    // Get head world position
    const headPos = new THREE.Vector3();
    headBone.getWorldPosition(headPos);

    // Direction to target in world space
    const dirToTarget = new THREE.Vector3().subVectors(this.currentLookTarget, headPos).normalize();

    // Get current head forward direction
    const headForward = new THREE.Vector3(0, 0, 1);
    headForward.applyQuaternion(headBone.getWorldQuaternion(new THREE.Quaternion()));

    // Angle between current and target direction
    const angle = headForward.angleTo(dirToTarget);

    // Clamp to max rotation
    if (angle > this.lookAtConfig.maxAngle) return;

    // Calculate look-at quaternion in head's local space
    const parentWorldQuat = new THREE.Quaternion();
    if (headBone.parent) headBone.parent.getWorldQuaternion(parentWorldQuat);
    const parentInverseQuat = parentWorldQuat.clone().invert();

    const localDir = dirToTarget.clone().applyQuaternion(parentInverseQuat);
    const lookQuat = new THREE.Quaternion();
    lookQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), localDir);

    // Blend with FK
    const blended = headBone.quaternion.clone().slerp(lookQuat, this.lookAtConfig.weight);
    headBone.quaternion.slerp(blended, Math.min(1, delta * this.lookAtConfig.smoothing));

    // Split rotation 60/40 between neck and head for natural look
    if (neckBone && this.lookAtConfig.weight > 0.3) {
      const neckWeight = this.lookAtConfig.weight * 0.4;
      const neckQuat = neckBone.quaternion.clone();
      neckBone.quaternion.slerp(lookQuat, neckWeight * 0.3);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // HAND IK — attach hand to weapon/object/grip point
  // ═══════════════════════════════════════════════════════════

  /**
   * Solves arm IK to place a hand at a world-space target.
   * Used for: weapon grips, ladder rungs, door handles, crafting stations.
   *
   * @param hand "left" | "right"
   * @param target World-space position for the hand
   * @param weight Blend weight (0 = FK only, 1 = full IK)
   */
  /**
   * Arm IK — place hand at world target (weapon grip, ladder, cannon wheel).
   * Pole uses rest elbow direction projected onto chain plane (preserves anim bend).
   */
  updateHandIK(
    hand: "left" | "right",
    target: THREE.Vector3,
    weight: number = this.handConfig.weight,
    opts?: { pole?: THREE.Vector3 },
  ): void {
    const prefix = hand === "left" ? "Left" : "Right";
    const shoulder =
      this.findBone(`${prefix}Arm`) ||
      this.findBone(`${prefix}Shoulder`) ||
      this.findBone(`${prefix}UpperArm`);
    const elbow = this.findBone(`${prefix}ForeArm`) || this.findBone(`${prefix}Forearm`);
    const wrist = this.findBone(`${prefix}Hand`);

    if (!shoulder || !elbow || !wrist || weight <= 0.001) return;

    this.capture(shoulder);
    this.capture(elbow);
    this.capture(wrist);

    // Rest pole from current FK elbow, then bias out/down (editable)
    const polePos = opts?.pole?.clone() ?? new THREE.Vector3();
    if (!opts?.pole) {
      elbow.getWorldPosition(polePos);
      const side = hand === "left" ? -1 : 1;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
        this.rootModel.getWorldQuaternion(new THREE.Quaternion()),
      );
      polePos.addScaledVector(right, side * this.handConfig.poleOut);
      polePos.y -= this.handConfig.poleDown;
    }

    solveTwoBoneIK(shoulder, elbow, wrist, target, polePos, { weight });
  }

  /** Both hands to grip points (two-handed weapons / ship's wheel). */
  updateTwoHandIK(
    leftTarget: THREE.Vector3 | null,
    rightTarget: THREE.Vector3 | null,
    weight?: number,
  ): void {
    const w = weight ?? this.handConfig.weight;
    if (leftTarget) this.updateHandIK("left", leftTarget, w);
    if (rightTarget) this.updateHandIK("right", rightTarget, w);
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════════════════════

  /** Get world position of any named bone */
  getBoneWorldPosition(boneName: string): THREE.Vector3 | null {
    const bone = this.findBone(boneName);
    if (!bone) return null;
    const pos = new THREE.Vector3();
    bone.getWorldPosition(pos);
    return pos;
  }

  /** List all bone names (for debugging) */
  listBones(): string[] {
    return Array.from(this.bones.keys());
  }

  /** Check if a skeleton was found */
  get hasSkeleton(): boolean {
    return this.skeleton !== null;
  }
}

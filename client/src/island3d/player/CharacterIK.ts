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
  maxHipOffset: 1.5,
  weight: 1.0,
  smoothing: 8,
  terrainLayers: [],
};

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

  // Config
  footConfig: FootIKConfig;
  lookAtConfig: LookAtIKConfig;

  constructor(model: THREE.Object3D, footConfig?: Partial<FootIKConfig>, lookAtConfig?: Partial<LookAtIKConfig>) {
    this.rootModel = model;
    this.footConfig = { ...DEFAULT_FOOT_CONFIG, ...footConfig };
    this.lookAtConfig = { ...DEFAULT_LOOKAT_CONFIG, ...lookAtConfig };

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
    // Try exact name
    if (this.bones.has(name)) return this.bones.get(name)!;
    // Try Mixamo prefixed
    if (this.bones.has(`mixamorig:${name}`)) return this.bones.get(`mixamorig:${name}`)!;
    if (this.bones.has(`mixamorig.${name}`)) return this.bones.get(`mixamorig.${name}`)!;
    // Try Bip001 format
    if (this.bones.has(`Bip001_${name}`)) return this.bones.get(`Bip001_${name}`)!;
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  // FOOT IK — plants feet on uneven terrain
  // ═══════════════════════════════════════════════════════════

  /**
   * Call this AFTER FK animation update, BEFORE render.
   * Raycasts down from each foot bone to find the ground,
   * adjusts hip height + ankle rotation so feet plant correctly.
   */
  updateFootIK(terrainObjects: THREE.Object3D[], delta: number): void {
    if (this.footConfig.weight <= 0) return;

    const leftFoot = this.findBone("LeftFoot") || this.findBone("LeftToeBase");
    const rightFoot = this.findBone("RightFoot") || this.findBone("RightToeBase");
    const leftLeg = this.findBone("LeftUpLeg");
    const leftKnee = this.findBone("LeftLeg");
    const rightLeg = this.findBone("RightUpLeg");
    const rightKnee = this.findBone("RightLeg");
    const hips = this.findBone("Hips");

    if (!leftFoot || !rightFoot || !hips) return;

    // Raycast from each foot downward
    const leftGroundY = this.raycastGround(leftFoot, terrainObjects);
    const rightGroundY = this.raycastGround(rightFoot, terrainObjects);

    if (leftGroundY === null && rightGroundY === null) return;

    // Calculate required hip offset
    // The lower foot determines how much the hip needs to drop
    const modelY = this.rootModel.position.y;
    const leftDiff = leftGroundY !== null ? leftGroundY - this.getFootWorldY(leftFoot) : 0;
    const rightDiff = rightGroundY !== null ? rightGroundY - this.getFootWorldY(rightFoot) : 0;

    // Hip drops by the minimum (most negative) foot difference
    const targetHipOffset = Math.max(-this.footConfig.maxHipOffset,
      Math.min(leftDiff, rightDiff));

    // Smooth the hip adjustment
    this.hipOffset = THREE.MathUtils.lerp(
      this.hipOffset,
      targetHipOffset,
      Math.min(1, delta * this.footConfig.smoothing)
    );

    // Apply hip offset
    hips.position.y += this.hipOffset;

    // Apply IK to each leg if we have the full chain
    if (leftLeg && leftKnee && leftFoot && leftGroundY !== null) {
      const target = new THREE.Vector3();
      leftFoot.getWorldPosition(target);
      target.y = leftGroundY;

      // Pole target: knee points forward
      const pole = new THREE.Vector3();
      leftKnee.getWorldPosition(pole);
      pole.z -= 2; // bias knee forward

      solveTwoBoneIK(leftLeg, leftKnee, leftFoot, target, pole, {
        weight: this.footConfig.weight,
      });
    }

    if (rightLeg && rightKnee && rightFoot && rightGroundY !== null) {
      const target = new THREE.Vector3();
      rightFoot.getWorldPosition(target);
      target.y = rightGroundY;

      const pole = new THREE.Vector3();
      rightKnee.getWorldPosition(pole);
      pole.z -= 2;

      solveTwoBoneIK(rightLeg, rightKnee, rightFoot, target, pole, {
        weight: this.footConfig.weight,
      });
    }
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
  updateHandIK(hand: "left" | "right", target: THREE.Vector3, weight: number = 1): void {
    const prefix = hand === "left" ? "Left" : "Right";
    const shoulder = this.findBone(`${prefix}Arm`) || this.findBone(`${prefix}Shoulder`);
    const elbow = this.findBone(`${prefix}ForeArm`);
    const wrist = this.findBone(`${prefix}Hand`);

    if (!shoulder || !elbow || !wrist) return;

    // Pole target: elbow points down-backward
    const polePos = new THREE.Vector3();
    elbow.getWorldPosition(polePos);
    polePos.y -= 1;
    polePos.z += (hand === "left" ? -1 : 1); // elbow out to the side

    solveTwoBoneIK(shoulder, elbow, wrist, target, polePos, { weight });
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

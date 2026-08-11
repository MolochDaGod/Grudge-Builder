/**
 * Canonical bone lists + maps for mocap reconstruct / retarget.
 */

import type { SkeletonFamily } from "./types";

/** Mixamo 20-bone core used by Grudox Animator + anim-ai-worker */
export const MIXAMORIG_BONES = [
  "mixamorigHips",
  "mixamorigSpine",
  "mixamorigSpine1",
  "mixamorigSpine2",
  "mixamorigNeck",
  "mixamorigHead",
  "mixamorigLeftShoulder",
  "mixamorigLeftArm",
  "mixamorigLeftForeArm",
  "mixamorigLeftHand",
  "mixamorigRightShoulder",
  "mixamorigRightArm",
  "mixamorigRightForeArm",
  "mixamorigRightHand",
  "mixamorigLeftUpLeg",
  "mixamorigLeftLeg",
  "mixamorigLeftFoot",
  "mixamorigRightUpLeg",
  "mixamorigRightLeg",
  "mixamorigRightFoot",
] as const;

/** Bip001 fleet bake names (underscore style) */
export const BIP001_BONES = [
  "Bip001_Pelvis",
  "Bip001_Spine",
  "Bip001_Spine1",
  "Bip001_Spine2",
  "Bip001_Neck",
  "Bip001_Head",
  "Bip001_L_Clavicle",
  "Bip001_L_UpperArm",
  "Bip001_L_Forearm",
  "Bip001_L_Hand",
  "Bip001_R_Clavicle",
  "Bip001_R_UpperArm",
  "Bip001_R_Forearm",
  "Bip001_R_Hand",
  "Bip001_L_Thigh",
  "Bip001_L_Calf",
  "Bip001_L_Foot",
  "Bip001_R_Thigh",
  "Bip001_R_Calf",
  "Bip001_R_Foot",
] as const;

/** Semantic roles for retarget between families */
export type BoneRole =
  | "hips"
  | "spine"
  | "spine1"
  | "spine2"
  | "neck"
  | "head"
  | "l_shoulder"
  | "l_arm"
  | "l_forearm"
  | "l_hand"
  | "r_shoulder"
  | "r_arm"
  | "r_forearm"
  | "r_hand"
  | "l_upleg"
  | "l_leg"
  | "l_foot"
  | "r_upleg"
  | "r_leg"
  | "r_foot";

export const ROLE_TO_MIXAMO: Record<BoneRole, string> = {
  hips: "mixamorigHips",
  spine: "mixamorigSpine",
  spine1: "mixamorigSpine1",
  spine2: "mixamorigSpine2",
  neck: "mixamorigNeck",
  head: "mixamorigHead",
  l_shoulder: "mixamorigLeftShoulder",
  l_arm: "mixamorigLeftArm",
  l_forearm: "mixamorigLeftForeArm",
  l_hand: "mixamorigLeftHand",
  r_shoulder: "mixamorigRightShoulder",
  r_arm: "mixamorigRightArm",
  r_forearm: "mixamorigRightForeArm",
  r_hand: "mixamorigRightHand",
  l_upleg: "mixamorigLeftUpLeg",
  l_leg: "mixamorigLeftLeg",
  l_foot: "mixamorigLeftFoot",
  r_upleg: "mixamorigRightUpLeg",
  r_leg: "mixamorigRightLeg",
  r_foot: "mixamorigRightFoot",
};

export const ROLE_TO_BIP001: Record<BoneRole, string> = {
  hips: "Bip001_Pelvis",
  spine: "Bip001_Spine",
  spine1: "Bip001_Spine1",
  spine2: "Bip001_Spine2",
  neck: "Bip001_Neck",
  head: "Bip001_Head",
  l_shoulder: "Bip001_L_Clavicle",
  l_arm: "Bip001_L_UpperArm",
  l_forearm: "Bip001_L_Forearm",
  l_hand: "Bip001_L_Hand",
  r_shoulder: "Bip001_R_Clavicle",
  r_arm: "Bip001_R_UpperArm",
  r_forearm: "Bip001_R_Forearm",
  r_hand: "Bip001_R_Hand",
  l_upleg: "Bip001_L_Thigh",
  l_leg: "Bip001_L_Calf",
  l_foot: "Bip001_L_Foot",
  r_upleg: "Bip001_R_Thigh",
  r_leg: "Bip001_R_Calf",
  r_foot: "Bip001_R_Foot",
};

export function bonesForSkeleton(family: SkeletonFamily): readonly string[] {
  if (family === "bip001") return BIP001_BONES;
  return MIXAMORIG_BONES;
}

export function mapPoseToSkeleton(
  pose: Record<string, number[]>,
  from: SkeletonFamily,
  to: SkeletonFamily,
): Record<string, [number, number, number, number]> {
  if (from === to) {
    const out: Record<string, [number, number, number, number]> = {};
    for (const [k, v] of Object.entries(pose)) {
      if (Array.isArray(v) && v.length >= 4) {
        out[k] = [v[0], v[1], v[2], v[3]];
      }
    }
    return out;
  }
  const fromMap = from === "bip001" ? ROLE_TO_BIP001 : ROLE_TO_MIXAMO;
  const toMap = to === "bip001" ? ROLE_TO_BIP001 : ROLE_TO_MIXAMO;
  const inv: Record<string, BoneRole> = {};
  for (const [role, name] of Object.entries(fromMap) as [BoneRole, string][]) {
    inv[name] = role;
    inv[name.replace(/_/g, "")] = role;
  }
  const out: Record<string, [number, number, number, number]> = {};
  for (const [k, v] of Object.entries(pose)) {
    if (!Array.isArray(v) || v.length < 4) continue;
    const role = inv[k] || inv[k.replace(/\./g, "_")];
    if (!role) continue;
    const dest = toMap[role];
    out[dest] = [v[0], v[1], v[2], v[3]];
  }
  return out;
}

export const IDENTITY_QUAT: [number, number, number, number] = [0, 0, 0, 1];

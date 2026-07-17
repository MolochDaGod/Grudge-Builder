/**
 * Mixamo / Bip001 → Toon Soldier (chicken_gun) bone retarget map.
 *
 * Toon packs use a simplified `Bone` / `Bone.00N` hierarchy (not Mixamo or Bip001).
 * We discover roles from the loaded skeleton bind pose, then remap rotation tracks.
 */

import * as THREE from "three";

/** Semantic bone roles used for retargeting. */
export type BoneRole =
  | "hips"
  | "spine"
  | "neck"
  | "head"
  | "lClavicle"
  | "lUpperArm"
  | "lForearm"
  | "lHand"
  | "rClavicle"
  | "rUpperArm"
  | "rForearm"
  | "rHand"
  | "lThigh"
  | "lCalf"
  | "lFoot"
  | "rThigh"
  | "rCalf"
  | "rFoot";

/** Bip001 (baked) + Mixamo bare names → role */
export const SOURCE_BONE_TO_ROLE: Record<string, BoneRole> = {
  // Bip001 spaced
  "Bip001 Pelvis": "hips",
  "Bip001 Spine": "spine",
  "Bip001 Spine1": "spine",
  "Bip001 Neck": "neck",
  "Bip001 Head": "head",
  "Bip001 L Clavicle": "lClavicle",
  "Bip001 L UpperArm": "lUpperArm",
  "Bip001 L Forearm": "lForearm",
  "Bip001 L Hand": "lHand",
  "Bip001 R Clavicle": "rClavicle",
  "Bip001 R UpperArm": "rUpperArm",
  "Bip001 R Forearm": "rForearm",
  "Bip001 R Hand": "rHand",
  "Bip001 L Thigh": "lThigh",
  "Bip001 L Calf": "lCalf",
  "Bip001 L Foot": "lFoot",
  "Bip001 L Toe0": "lFoot",
  "Bip001 R Thigh": "rThigh",
  "Bip001 R Calf": "rCalf",
  "Bip001 R Foot": "rFoot",
  "Bip001 R Toe0": "rFoot",
  // Bip001 underscore
  Bip001_Pelvis: "hips",
  Bip001_Spine: "spine",
  Bip001_Spine1: "spine",
  Bip001_Neck: "neck",
  Bip001_Head: "head",
  Bip001_L_Clavicle: "lClavicle",
  Bip001_L_UpperArm: "lUpperArm",
  Bip001_L_Forearm: "lForearm",
  Bip001_L_Hand: "lHand",
  Bip001_R_Clavicle: "rClavicle",
  Bip001_R_UpperArm: "rUpperArm",
  Bip001_R_Forearm: "rForearm",
  Bip001_R_Hand: "rHand",
  Bip001_L_Thigh: "lThigh",
  Bip001_L_Calf: "lCalf",
  Bip001_L_Foot: "lFoot",
  Bip001_R_Thigh: "rThigh",
  Bip001_R_Calf: "rCalf",
  Bip001_R_Foot: "rFoot",
  // Mixamo bare
  Hips: "hips",
  Spine: "spine",
  Spine1: "spine",
  Spine2: "spine",
  Neck: "neck",
  Head: "head",
  LeftShoulder: "lClavicle",
  LeftArm: "lUpperArm",
  LeftForeArm: "lForearm",
  LeftHand: "lHand",
  RightShoulder: "rClavicle",
  RightArm: "rUpperArm",
  RightForeArm: "rForearm",
  RightHand: "rHand",
  LeftUpLeg: "lThigh",
  LeftLeg: "lCalf",
  LeftFoot: "lFoot",
  LeftToeBase: "lFoot",
  RightUpLeg: "rThigh",
  RightLeg: "rCalf",
  RightFoot: "rFoot",
  RightToeBase: "rFoot",
};

const MIXAMO_PREFIXES = [
  "mixamorig10:",
  "mixamorig9:",
  "mixamorig8:",
  "mixamorig7:",
  "mixamorig6:",
  "mixamorig5:",
  "mixamorig4:",
  "mixamorig3:",
  "mixamorig2:",
  "mixamorig1:",
  "mixamorig:",
];

export function stripMixamoPrefix(name: string): string {
  for (const p of MIXAMO_PREFIXES) {
    if (name.startsWith(p)) return name.slice(p.length);
  }
  if (name.startsWith("mixamorig")) return name.slice("mixamorig".length);
  return name;
}

export type RoleMap = Partial<Record<BoneRole, string>>;

function chainDepth(bone: THREE.Bone, max = 8): number {
  let d = 0;
  let b: THREE.Bone | undefined = bone;
  while (b && d < max) {
    const kids = b.children.filter((c) => (c as THREE.Bone).isBone) as THREE.Bone[];
    if (!kids.length) break;
    b = kids[0];
    d++;
  }
  return d;
}

function worldX(bone: THREE.Bone): number {
  const v = new THREE.Vector3();
  bone.getWorldPosition(v);
  return v.x;
}

/**
 * Discover Bone roles on a loaded toon soldier (body armature preferred).
 * Hierarchy pattern (Sketchfab toon):
 *   hips → spine (most children), L leg chain, R leg chain, extras
 *   spine → L arm chain, R arm chain, optional neck/head leaves
 */
export function discoverToonBoneRoles(root: THREE.Object3D): RoleMap {
  let best: THREE.Skeleton | null = null;
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh && m.skeleton?.bones?.length) {
      if (!best || m.skeleton.bones.length > best.bones.length) best = m.skeleton;
    }
  });
  if (!best) return {};

  const bones = best.bones as THREE.Bone[];
  // Prefer a bone named Bone* with ≥3 bone children as hips
  let hips: THREE.Bone | null = null;
  for (const b of bones) {
    const kids = b.children.filter((c) => (c as THREE.Bone).isBone) as THREE.Bone[];
    if (kids.length >= 3 && /^Bone/i.test(b.name)) {
      hips = b;
      break;
    }
  }
  if (!hips) {
    // Fallback: deepest non-leaf among bones with most kids
    hips = bones
      .filter((b) => b.children.some((c) => (c as THREE.Bone).isBone))
      .sort(
        (a, b) =>
          b.children.filter((c) => (c as THREE.Bone).isBone).length -
          a.children.filter((c) => (c as THREE.Bone).isBone).length,
      )[0] ?? null;
  }
  if (!hips) return {};

  const roles: RoleMap = { hips: hips.name };
  const hipKids = hips.children.filter((c) => (c as THREE.Bone).isBone) as THREE.Bone[];

  // Rank children: spine = most descendants / branchiest; legs = linear chains
  const ranked = hipKids
    .map((b) => ({
      b,
      kids: b.children.filter((c) => (c as THREE.Bone).isBone).length,
      depth: chainDepth(b),
      x: worldX(b),
    }))
    .sort((a, b) => b.kids - a.kids || b.depth - a.depth);

  const spineEntry = ranked[0];
  if (spineEntry) {
    roles.spine = spineEntry.b.name;
    // Arms from spine children
    const spineKids = spineEntry.b.children.filter((c) =>
      (c as THREE.Bone).isBone,
    ) as THREE.Bone[];
    const armCandidates = spineKids
      .map((b) => ({ b, depth: chainDepth(b), x: worldX(b) }))
      .filter((e) => e.depth >= 1)
      .sort((a, b) => a.x - b.x);

    if (armCandidates.length >= 2) {
      // left = lower X in typical Y-up exports (may flip — swap if bind looks wrong)
      const left = armCandidates[0];
      const right = armCandidates[armCandidates.length - 1];
      assignArmChain(roles, "l", left.b);
      assignArmChain(roles, "r", right.b);
    } else if (armCandidates.length === 1) {
      assignArmChain(roles, "r", armCandidates[0].b);
    }

    // Neck/head: shallow leaves under spine not used as arms
    const used = new Set([roles.lClavicle, roles.rClavicle, roles.lUpperArm, roles.rUpperArm]);
    for (const k of spineKids) {
      if (used.has(k.name)) continue;
      if (!roles.neck && chainDepth(k) <= 1) {
        roles.neck = k.name;
        const nk = k.children.filter((c) => (c as THREE.Bone).isBone) as THREE.Bone[];
        if (nk[0]) roles.head = nk[0].name;
        else roles.head = k.name;
      }
    }
  }

  // Legs: remaining hip kids with depth >= 1, ordered by X
  const legCandidates = ranked
    .slice(1)
    .filter((e) => e.depth >= 1)
    .sort((a, b) => a.x - b.x);
  if (legCandidates.length >= 2) {
    assignLegChain(roles, "l", legCandidates[0].b);
    assignLegChain(roles, "r", legCandidates[legCandidates.length - 1].b);
  } else if (legCandidates.length === 1) {
    assignLegChain(roles, "l", legCandidates[0].b);
  }

  // Head armature (second smaller skin) — optional override
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh || !m.skeleton || m.skeleton === best) return;
    if (m.skeleton.bones.length > 8) return;
    const hb = m.skeleton.bones as THREE.Bone[];
    const rootB = hb.find((b) => /^Bone(?!\.)/i.test(b.name) || b.parent === m.skeleton.bones[0]);
    const headRoot = hb.find((b) => b.children.some((c) => (c as THREE.Bone).isBone)) ?? hb[1];
    if (headRoot && !roles.head) {
      roles.neck = headRoot.name;
      const kids = headRoot.children.filter((c) => (c as THREE.Bone).isBone) as THREE.Bone[];
      if (kids[0]) roles.head = kids[0].name;
    }
    void rootB;
  });

  return roles;
}

function assignArmChain(roles: RoleMap, side: "l" | "r", start: THREE.Bone) {
  const chain: THREE.Bone[] = [start];
  let cur = start;
  while (chain.length < 4) {
    const kids = cur.children.filter((c) => (c as THREE.Bone).isBone) as THREE.Bone[];
    if (!kids.length) break;
    cur = kids[0];
    chain.push(cur);
  }
  const pref = side === "l" ? "l" : "r";
  if (chain[0]) roles[`${pref}Clavicle` as BoneRole] = chain[0].name;
  if (chain[1]) roles[`${pref}UpperArm` as BoneRole] = chain[1].name;
  else if (chain[0]) roles[`${pref}UpperArm` as BoneRole] = chain[0].name;
  if (chain[2]) roles[`${pref}Forearm` as BoneRole] = chain[2].name;
  if (chain[3]) roles[`${pref}Hand` as BoneRole] = chain[3].name;
  else if (chain[2]) roles[`${pref}Hand` as BoneRole] = chain[2].name;
}

function assignLegChain(roles: RoleMap, side: "l" | "r", start: THREE.Bone) {
  const chain: THREE.Bone[] = [start];
  let cur = start;
  while (chain.length < 3) {
    const kids = cur.children.filter((c) => (c as THREE.Bone).isBone) as THREE.Bone[];
    if (!kids.length) break;
    cur = kids[0];
    chain.push(cur);
  }
  const pref = side === "l" ? "l" : "r";
  if (chain[0]) roles[`${pref}Thigh` as BoneRole] = chain[0].name;
  if (chain[1]) roles[`${pref}Calf` as BoneRole] = chain[1].name;
  if (chain[2]) roles[`${pref}Foot` as BoneRole] = chain[2].name;
}

export function roleForSourceBone(boneName: string): BoneRole | null {
  const bare = stripMixamoPrefix(boneName);
  if (bare in SOURCE_BONE_TO_ROLE) return SOURCE_BONE_TO_ROLE[bare];
  // spaced/underscore normalize
  const spaced = bare.replace(/_/g, " ");
  if (spaced in SOURCE_BONE_TO_ROLE) return SOURCE_BONE_TO_ROLE[spaced];
  const us = bare.replace(/ /g, "_");
  if (us in SOURCE_BONE_TO_ROLE) return SOURCE_BONE_TO_ROLE[us];
  return null;
}

/** Keep rotation tracks only (safe across scale/bind differences). */
export function toRotationOnlyClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  clip.tracks = clip.tracks.filter((t) => {
    const dot = t.name.indexOf(".");
    if (dot < 0) return true;
    const prop = t.name.slice(dot + 1);
    return prop === "quaternion" || prop === "rotation";
  });
  return clip;
}

/**
 * Retarget a Mixamo/Bip001 clip onto a toon rig using a role map.
 * Drops tracks with no role or no target bone.
 */
export function retargetClipToToon(
  clip: THREE.AnimationClip,
  roleMap: RoleMap,
  opts?: { name?: string },
): THREE.AnimationClip {
  const out = clip.clone();
  if (opts?.name) out.name = opts.name;
  toRotationOnlyClip(out);

  const kept: THREE.KeyframeTrack[] = [];
  for (const track of out.tracks) {
    const dot = track.name.indexOf(".");
    if (dot < 0) continue;
    const bone = track.name.slice(0, dot);
    const prop = track.name.slice(dot);
    const role = roleForSourceBone(bone);
    if (!role) continue;
    const target = roleMap[role];
    if (!target) continue;
    track.name = target + prop;
    kept.push(track);
  }
  out.tracks = kept;
  return out;
}

/** Parse baked AnimationClip JSON (arena format). */
export function parseBakedClipJson(data: unknown, name?: string): THREE.AnimationClip {
  const clip = THREE.AnimationClip.parse(data as object);
  if (name) clip.name = name;
  return clip;
}

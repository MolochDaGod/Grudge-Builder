/**
 * SkeletonEquip — bone attachment + wardrobe mesh rules for skinned characters.
 *
 * Rules:
 *  - Never plain-clone SkinnedMesh for instances (use SkeletonUtils via SharedGltfPipeline)
 *  - Equip by visibility on wardrobe GLBs, not by re-parenting skinned armor
 *  - External weapons may attach to grip bones with local offsets
 *  - After visibility changes, refresh skinned bounds for frustum culling
 */
import * as THREE from 'three';
import { refreshSkinnedBounds } from './WorldMath';

/** Common grip / attach bone aliases across Mixamo + Grudge6 packs */
export const BONE_ALIASES: Record<string, string[]> = {
  rightHand: [
    'R_hand_container',
    'RightHand',
    'mixamorig:RightHand',
    'mixamorigRightHand',
    'Hand_R',
    'hand_r',
    'Bip001 R Hand',
  ],
  leftHand: [
    'L_hand_container',
    'LeftHand',
    'mixamorig:LeftHand',
    'mixamorigLeftHand',
    'Hand_L',
    'hand_l',
    'Bip001 L Hand',
  ],
  leftShield: [
    'L_shield_container',
    'LeftForeArm',
    'mixamorig:LeftForeArm',
  ],
  head: ['Head', 'mixamorig:Head', 'head', 'Bip001 Head'],
  hips: ['Hips', 'mixamorig:Hips', 'pelvis', 'Bip001 Pelvis', 'Root'],
  spine: ['Spine', 'Spine1', 'mixamorig:Spine', 'mixamorig:Spine1'],
};

export function findBone(root: THREE.Object3D, names: string[]): THREE.Object3D | null {
  for (const n of names) {
    const o = root.getObjectByName(n);
    if (o) return o;
  }
  // Case-insensitive fallback
  const lower = names.map((n) => n.toLowerCase());
  let found: THREE.Object3D | null = null;
  root.traverse((obj) => {
    if (found || !obj.name) return;
    if (lower.includes(obj.name.toLowerCase())) found = obj;
  });
  return found;
}

export function findGripBone(
  root: THREE.Object3D,
  grip: keyof typeof BONE_ALIASES = 'rightHand',
): THREE.Object3D | null {
  return findBone(root, BONE_ALIASES[grip] ?? BONE_ALIASES.rightHand);
}

export interface AttachOpts {
  offset?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: number | THREE.Vector3;
  /** If true, detach previous children named userData.equipAttachment */
  clearPrevious?: boolean;
}

/**
 * Attach a non-skinned prop (weapon mesh) to a bone.
 * Do NOT use for Units_* wardrobe pieces that are already SkinnedMesh on the rig.
 */
export function attachToBone(
  root: THREE.Object3D,
  object: THREE.Object3D,
  grip: keyof typeof BONE_ALIASES = 'rightHand',
  opts: AttachOpts = {},
): boolean {
  const bone = findGripBone(root, grip);
  if (!bone) {
    console.warn(`[SkeletonEquip] Grip bone not found for ${grip}`);
    return false;
  }

  if (opts.clearPrevious) {
    const toRemove: THREE.Object3D[] = [];
    bone.traverse((c) => {
      if (c !== bone && c.userData?.equipAttachment) toRemove.push(c);
    });
    // Only direct children marked as attachments
    for (const c of [...bone.children]) {
      if (c.userData?.equipAttachment) {
        bone.remove(c);
      }
    }
  }

  object.userData.equipAttachment = true;
  object.position.copy(opts.offset ?? new THREE.Vector3(0, 0, 0));
  if (opts.rotation) object.rotation.copy(opts.rotation);
  if (opts.scale != null) {
    if (typeof opts.scale === 'number') object.scale.setScalar(opts.scale);
    else object.scale.copy(opts.scale);
  }

  bone.add(object);
  return true;
}

export function detachAttachments(root: THREE.Object3D): void {
  const kill: THREE.Object3D[] = [];
  root.traverse((c) => {
    if (c.userData?.equipAttachment) kill.push(c);
  });
  for (const c of kill) {
    c.parent?.remove(c);
  }
}

/**
 * Hide all wardrobe meshes then show only names in `visibleNames`.
 * Prefer Grudge6EquipmentManager for Units_* packs; this is for simple GLBs.
 */
export function setVisibleMeshSet(root: THREE.Object3D, visibleNames: Set<string> | string[]): void {
  const set = visibleNames instanceof Set ? visibleNames : new Set(visibleNames);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh && !(mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    if (!mesh.name) return;
    // Always keep non-equip body containers if empty set policy — here explicit set wins
    mesh.visible = set.size === 0 ? mesh.visible : set.has(mesh.name);
  });
  refreshSkinnedBounds(root);
}

/**
 * Collect skeleton bone names for animation retarget diagnostics.
 */
export function collectSkeletonBoneNames(root: THREE.Object3D): string[] {
  const names: string[] = [];
  root.traverse((obj) => {
    const sm = obj as THREE.SkinnedMesh;
    if (sm.isSkinnedMesh && sm.skeleton) {
      for (const b of sm.skeleton.bones) {
        if (b.name) names.push(b.name);
      }
    }
  });
  return [...new Set(names)];
}

/**
 * After equip/unequip: disable raycast on hidden meshes + refresh bounds.
 * Cuts pick cost and stabilizes frustum culling.
 */
export function finalizeEquipmentVisibility(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (!mesh.visible) {
      mesh.raycast = () => {};
    } else if (mesh.userData._savedRaycast) {
      mesh.raycast = mesh.userData._savedRaycast;
    } else {
      mesh.userData._savedRaycast = mesh.raycast;
    }
  });
  refreshSkinnedBounds(root);
}

/** Estimate GPU weight: visible triangles (approx index count / 3). */
export function estimateVisibleTris(root: THREE.Object3D): number {
  let tris = 0;
  root.traverse((obj) => {
    if (!obj.visible) return;
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const g = mesh.geometry;
    const idx = g.index;
    if (idx) tris += idx.count / 3;
    else {
      const pos = g.getAttribute('position');
      if (pos) tris += pos.count / 3;
    }
  });
  return Math.floor(tris);
}

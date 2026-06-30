/**
 * Hides the body-mesh face region when a helmet/head slot is equipped.
 */
import * as THREE from "three";

const ORIGINAL_PLANES_KEY = "_helmetFaceClipOriginal";
const CLIP_PLANE_KEY = "_helmetFaceClipPlane";
const FACE_HEIGHT_RATIO = 0.72;

function meshMaterials(mesh: THREE.Mesh): THREE.Material[] {
  if (!mesh.material) return [];
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function computeFaceClipY(mesh: THREE.Mesh): number {
  const geo = mesh.geometry;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const box = geo.boundingBox;
  if (!box) return 0.55;

  const height = box.max.y - box.min.y;
  return box.min.y + height * FACE_HEIGHT_RATIO;
}

function applyClipToMaterial(mat: THREE.Material, enabled: boolean, clipY: number): void {
  if (!(mat as THREE.MeshStandardMaterial).isMaterial) return;

  if (enabled) {
    if (mat.userData[ORIGINAL_PLANES_KEY] === undefined) {
      mat.userData[ORIGINAL_PLANES_KEY] = mat.clippingPlanes
        ? [...mat.clippingPlanes]
        : null;
    }

    let plane = mat.userData[CLIP_PLANE_KEY] as THREE.Plane | undefined;
    if (!plane) {
      plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), clipY);
      mat.userData[CLIP_PLANE_KEY] = plane;
    } else {
      plane.constant = clipY;
    }

    mat.clippingPlanes = [plane];
    mat.clipShadows = true;
    mat.needsUpdate = true;
    return;
  }

  const original = mat.userData[ORIGINAL_PLANES_KEY];
  if (original === undefined) return;
  mat.clippingPlanes = original ? [...original] : [];
  mat.needsUpdate = true;
}

export function setHelmetFaceClip(mesh: THREE.Mesh, enabled: boolean): void {
  const clipY = enabled ? computeFaceClipY(mesh) : 0;
  for (const mat of meshMaterials(mesh)) {
    applyClipToMaterial(mat, enabled, clipY);
  }
}

export function syncHelmetFaceClip(
  bodyMeshes: Iterable<THREE.Object3D>,
  headEquipped: boolean,
): void {
  for (const obj of bodyMeshes) {
    if (!(obj as THREE.Mesh).isMesh) continue;
    setHelmetFaceClip(obj as THREE.Mesh, headEquipped);
  }
}

export function clearHelmetFaceClip(mesh: THREE.Mesh): void {
  for (const mat of meshMaterials(mesh)) {
    const original = mat.userData[ORIGINAL_PLANES_KEY];
    if (original === undefined) continue;
    mat.clippingPlanes = original ? [...original] : [];
    delete mat.userData[ORIGINAL_PLANES_KEY];
    delete mat.userData[CLIP_PLANE_KEY];
    mat.needsUpdate = true;
  }
}
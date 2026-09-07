/** Crop and soil meshes from the canonical R2 multipack. */
import * as THREE from 'three';
import {
  CROPS_PACK_PATH, CROP_PACK_MESHES, CROP_SOIL_NODES,
  type CropStage, type CropKind,
} from '@shared/definitions/farming';
import { loadAssetGltf } from '@/lib/three/SharedGltfPipeline';

let ready = false;
let pending: Promise<boolean> | null = null;
const soilTemplates: THREE.Object3D[] = [];
const stageTemplates = new Map<string, THREE.Object3D>();

export function isCropPackReady(): boolean { return ready; }
export function preloadCropPack(): Promise<boolean> { return loadCropPack(); }

export function loadCropPack(): Promise<boolean> {
  if (ready) return Promise.resolve(true);
  if (pending) return pending;
  pending = (async () => {
    const gltf = await loadAssetGltf(CROPS_PACK_PATH);
    if (!gltf) return false;
    gltf.scene.updateMatrixWorld(true);
    const stages = new Map<string, THREE.Object3D>();
    for (const def of Object.values(CROP_PACK_MESHES)) {
      for (const stage of [0, 1, 2] as const) {
        const node = gltf.scene.getObjectByName(def.stages[stage]) ||
          (def.meshStages ? gltf.scene.getObjectByName(def.meshStages[stage]) : undefined);
        if (!node) return false;
        stages.set(`${def.kind}:${stage}`, node);
      }
    }
    const soils = CROP_SOIL_NODES.map(name => gltf.scene.getObjectByName(name))
      .filter((node): node is THREE.Object3D => !!node);
    if (!soils.length) return false;
    stageTemplates.clear();
    for (const [key, node] of stages) stageTemplates.set(key, node);
    soilTemplates.splice(0, soilTemplates.length, ...soils);
    ready = true;
    return true;
  })().catch(() => false).finally(() => { pending = null; });
  return pending;
}

/** Each plot owns its disposable mesh resources; cached pack resources stay intact. */
function cloneFitted(template: THREE.Object3D, size: number, axis: 'height' | 'width'): THREE.Group {
  const root = new THREE.Group();
  const copy = template.clone(true);
  template.matrixWorld.decompose(copy.position, copy.quaternion, copy.scale);
  copy.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry = object.geometry.clone();
    object.material = Array.isArray(object.material)
      ? object.material.map(material => material.clone()) : object.material.clone();
    object.castShadow = true;
    object.receiveShadow = true;
  });
  root.add(copy);
  const box = new THREE.Box3().setFromObject(root);
  const dimensions = box.getSize(new THREE.Vector3());
  const divisor = axis === 'height' ? dimensions.y : Math.max(dimensions.x, dimensions.z);
  if (divisor > 0 && size > 0) root.scale.setScalar(size / divisor);
  const fitted = new THREE.Box3().setFromObject(root);
  const center = fitted.getCenter(new THREE.Vector3());
  root.position.set(-center.x, -fitted.min.y, -center.z);
  // Keep caller placement independent of the pack's authored origin.
  const placed = new THREE.Group();
  placed.add(root);
  return placed;
}

export function cloneSoilTile(variant = 0, width = 0.92): THREE.Object3D | null {
  if (!soilTemplates.length) return null;
  const template = soilTemplates[Math.abs(Math.trunc(variant)) % soilTemplates.length];
  return template ? cloneFitted(template, width, 'width') : null;
}

export function cloneCropStage(kind: CropKind, stage: CropStage, height: number): THREE.Object3D | null {
  const template = stageTemplates.get(`${kind}:${stage}`);
  return template ? cloneFitted(template, height, 'height') : null;
}

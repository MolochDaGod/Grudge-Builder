/**
 * BuildHammerAttachment — put the survival-kit hammer mesh in the character's hand
 * at 0.8 scale, named "Build Hammer". Used only in build control mode.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  BUILD_HAMMER,
  BUILD_HAMMER_BONE_CANDIDATES,
  type BuildHammerDef,
} from '@shared/definitions/buildHammer';
import { assetUrl } from '@/lib/assetConfig';
import type { Grudge6EquipmentManager } from '@/lib/grudge6Equipment';

const loader = new GLTFLoader();
const packCache = new Map<string, THREE.Group>();

export interface BuildHammerHandle {
  root: THREE.Group;
  def: BuildHammerDef;
  attached: boolean;
  dispose: () => void;
}

async function loadPack(path: string): Promise<THREE.Group> {
  const url = assetUrl(path);
  const hit = packCache.get(url);
  if (hit) return hit;
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene as THREE.Group;
  packCache.set(url, root);
  return root;
}

function findHandBone(characterRoot: THREE.Object3D): THREE.Object3D | null {
  for (const name of BUILD_HAMMER_BONE_CANDIDATES) {
    const bone = characterRoot.getObjectByName(name);
    if (bone) return bone;
  }
  // Deep scan for anything hand-like on the right side
  let found: THREE.Object3D | null = null;
  characterRoot.traverse((o) => {
    if (found) return;
    const n = (o.name || '').toLowerCase();
    if (
      (n.includes('righthand') || n.includes('hand_r') || n.includes('hand.r') || n.includes('r_hand')) &&
      !n.includes('left')
    ) {
      found = o;
    }
  });
  return found;
}

function makeProceduralHammer(def: BuildHammerDef): THREE.Group {
  const g = new THREE.Group();
  g.name = def.id;
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 0.55, 8),
    new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85, metalness: 0.05 }),
  );
  handle.position.y = 0.2;
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.12, 0.12),
    new THREE.MeshStandardMaterial({
      color: def.toolTint,
      roughness: 0.45,
      metalness: 0.55,
      emissive: def.emissive,
      emissiveIntensity: def.emissiveIntensity,
    }),
  );
  head.position.y = 0.48;
  g.add(handle, head);
  return g;
}

function cloneHammerNode(pack: THREE.Group, nodeName: string): THREE.Object3D | null {
  const node = pack.getObjectByName(nodeName);
  if (!node) {
    // Fallback: any child with "hammer" in the name
    let alt: THREE.Object3D | null = null;
    pack.traverse((o) => {
      if (alt) return;
      if (/hammer/i.test(o.name || '') && o !== pack) alt = o;
    });
    if (!alt) return null;
    const c = alt.clone(true);
    c.name = nodeName;
    return c;
  }
  const cloned = node.clone(true);
  cloned.name = nodeName;
  // Recenter around grip (bottom of bounds → origin)
  const box = new THREE.Box3().setFromObject(cloned);
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3());
    cloned.position.sub(center);
    const box2 = new THREE.Box3().setFromObject(cloned);
    if (!box2.isEmpty()) {
      // Pivot near handle base
      cloned.position.y -= box2.min.y;
    }
  }
  return cloned;
}

function applyToolLook(obj: THREE.Object3D, def: BuildHammerDef): void {
  obj.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        mat.emissive = new THREE.Color(def.emissive);
        mat.emissiveIntensity = def.emissiveIntensity;
        mat.needsUpdate = true;
      }
    }
    mesh.castShadow = true;
  });
}

/**
 * Load build hammer mesh (0.8 × survival kit hammer) ready to attach.
 */
export async function createBuildHammerMesh(
  def: BuildHammerDef = BUILD_HAMMER,
): Promise<THREE.Group> {
  const wrapper = new THREE.Group();
  wrapper.name = def.id;
  wrapper.userData.buildHammer = true;
  wrapper.userData.displayName = def.name;

  try {
    const pack = await loadPack(def.sourceGlb);
    const mesh = cloneHammerNode(pack, def.nodeName);
    if (mesh) {
      mesh.scale.setScalar(def.scale);
      applyToolLook(mesh, def);
      wrapper.add(mesh);
    } else {
      const procedural = makeProceduralHammer(def);
      procedural.scale.setScalar(def.scale);
      wrapper.add(procedural);
      console.warn('[BuildHammer] hammer node missing in pack — using procedural tool');
    }
  } catch (err) {
    console.warn('[BuildHammer] pack load failed — procedural hammer:', err);
    const procedural = makeProceduralHammer(def);
    procedural.scale.setScalar(def.scale);
    wrapper.add(procedural);
  }

  // Grip pose
  wrapper.position.set(...def.attachOffset);
  wrapper.rotation.set(...def.attachRotation);
  return wrapper;
}

/**
 * Attach build hammer to character hand. Also shows race mesh hammer slot if available.
 */
export async function equipBuildHammer(
  characterRoot: THREE.Object3D,
  equipmentManager?: Grudge6EquipmentManager | null,
  def: BuildHammerDef = BUILD_HAMMER,
): Promise<BuildHammerHandle> {
  // Clear race combat weapons on right hand so only Build Hammer shows
  if (equipmentManager) {
    try {
      for (const slot of ['sword', 'axe', 'hammer', 'pick', 'spear', 'staff'] as const) {
        equipmentManager.unequip(slot);
      }
      if (def.equipRaceHammerSlot) {
        equipmentManager.equipWeapon('hammer', def.raceHammerVariant);
      }
    } catch {
      /* race pack may lack slots */
    }
  }

  const mesh = await createBuildHammerMesh(def);
  const hand = findHandBone(characterRoot);

  let attached = false;
  if (hand) {
    hand.add(mesh);
    attached = true;
  } else {
    // Fallback: float in front of torso
    mesh.position.set(0.35, 1.1, 0.25);
    characterRoot.add(mesh);
    console.warn('[BuildHammer] No hand bone — attached to character root');
  }

  console.log(
    `[BuildHammer] Equipped "${def.name}" scale=${def.scale} attached=${attached} bone=${hand?.name ?? 'root'}`,
  );

  return {
    root: mesh,
    def,
    attached,
    dispose: () => {
      mesh.parent?.remove(mesh);
      mesh.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          m.geometry?.dispose();
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else (mat as THREE.Material | undefined)?.dispose?.();
        }
      });
    },
  };
}

export function unequipBuildHammer(
  handle: BuildHammerHandle | null | undefined,
  equipmentManager?: Grudge6EquipmentManager | null,
): void {
  handle?.dispose();
  if (equipmentManager) {
    try {
      equipmentManager.unequip('hammer');
    } catch {
      /* ignore */
    }
  }
}

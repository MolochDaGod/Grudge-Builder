/**
 * HarvestPickaxeAttachment — put pickaxe mesh in the character's hand for harvest mode.
 * Mirrors BuildHammerAttachment patterns (survival kit multipack + bone attach).
 */
import * as THREE from 'three';
import {
  HARVEST_PICKAXE,
  HARVEST_PICKAXE_BONE_CANDIDATES,
  type HarvestPickaxeDef,
} from '@shared/definitions/harvestPickaxe';
import { assetUrl } from '@/lib/assetConfig';
import type { Grudge6EquipmentManager } from '@/lib/grudge6Equipment';
import {
  loadGltfCached,
  cloneGltfScene,
  prepareMeshPerformance,
} from '@/lib/three/SharedGltfPipeline';

const packCache = new Map<string, THREE.Group>();

export interface HarvestPickaxeHandle {
  root: THREE.Group;
  def: HarvestPickaxeDef;
  attached: boolean;
  dispose: () => void;
}

async function loadPack(path: string): Promise<THREE.Group> {
  const url = assetUrl(path);
  const hit = packCache.get(url);
  if (hit) return hit;
  const gltf = await loadGltfCached(url, 'high');
  const root = cloneGltfScene(gltf);
  packCache.set(url, root);
  return root;
}

function findHandBone(characterRoot: THREE.Object3D): THREE.Object3D | null {
  for (const name of HARVEST_PICKAXE_BONE_CANDIDATES) {
    const bone = characterRoot.getObjectByName(name);
    if (bone) return bone;
  }
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

function makeProceduralPick(def: HarvestPickaxeDef): THREE.Group {
  const g = new THREE.Group();
  g.name = def.id;
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.028, 0.62, 8),
    new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.88, metalness: 0.05 }),
  );
  handle.position.y = 0.22;
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.1, 0.1),
    new THREE.MeshStandardMaterial({
      color: def.toolTint,
      roughness: 0.5,
      metalness: 0.45,
      emissive: def.emissive,
      emissiveIntensity: def.emissiveIntensity,
    }),
  );
  head.position.y = 0.52;
  // Pick tip
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.04, 0.18, 6),
    new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.35 }),
  );
  tip.rotation.z = Math.PI / 2;
  tip.position.set(0.18, 0.52, 0);
  g.add(handle, head, tip);
  return g;
}

function cloneToolNode(pack: THREE.Group, nodeName: string): THREE.Object3D | null {
  const node = pack.getObjectByName(nodeName);
  let source: THREE.Object3D | null = node ?? null;
  if (!source) {
    pack.traverse((o) => {
      if (source) return;
      if (/pick/i.test(o.name || '') && o !== pack) source = o;
    });
  }
  if (!source) return null;
  const cloned = source.clone(true);
  cloned.name = nodeName;
  const box = new THREE.Box3().setFromObject(cloned);
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3());
    cloned.position.sub(center);
    const box2 = new THREE.Box3().setFromObject(cloned);
    if (!box2.isEmpty()) cloned.position.y -= box2.min.y;
  }
  return cloned;
}

function applyToolLook(obj: THREE.Object3D, def: HarvestPickaxeDef): void {
  obj.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        mat.emissive = new THREE.Color(def.emissive);
        mat.emissiveIntensity = def.emissiveIntensity;
        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.map.needsUpdate = true;
        }
        mat.needsUpdate = true;
      }
    }
    mesh.castShadow = true;
  });
}

export async function createHarvestPickaxeMesh(
  def: HarvestPickaxeDef = HARVEST_PICKAXE,
): Promise<THREE.Group> {
  const wrapper = new THREE.Group();
  wrapper.name = def.id;
  wrapper.userData.harvestPickaxe = true;
  wrapper.userData.displayName = def.name;

  try {
    const pack = await loadPack(def.sourceGlb);
    const mesh = cloneToolNode(pack, def.nodeName);
    if (mesh) {
      mesh.scale.setScalar(def.scale);
      applyToolLook(mesh, def);
      prepareMeshPerformance(mesh, { castShadow: true, frustumCulled: true });
      wrapper.add(mesh);
    } else {
      const procedural = makeProceduralPick(def);
      procedural.scale.setScalar(def.scale);
      wrapper.add(procedural);
      console.warn('[HarvestPickaxe] pick node missing — procedural tool');
    }
  } catch (err) {
    console.warn('[HarvestPickaxe] pack load failed — procedural:', err);
    const procedural = makeProceduralPick(def);
    procedural.scale.setScalar(def.scale);
    wrapper.add(procedural);
  }

  wrapper.position.set(...def.attachOffset);
  wrapper.rotation.set(...def.attachRotation);
  return wrapper;
}

export async function equipHarvestPickaxe(
  characterRoot: THREE.Object3D,
  equipmentManager?: Grudge6EquipmentManager | null,
  def: HarvestPickaxeDef = HARVEST_PICKAXE,
): Promise<HarvestPickaxeHandle> {
  if (equipmentManager) {
    try {
      for (const slot of ['sword', 'axe', 'hammer', 'spear', 'staff', 'bow'] as const) {
        equipmentManager.unequip(slot);
      }
      if (def.equipRacePickSlot) {
        equipmentManager.equipWeapon('pick', def.racePickVariant);
      }
    } catch {
      /* race pack may lack pick slot */
    }
  }

  const mesh = await createHarvestPickaxeMesh(def);
  const hand = findHandBone(characterRoot);

  let attached = false;
  if (hand) {
    hand.add(mesh);
    attached = true;
  } else {
    mesh.position.set(0.35, 1.1, 0.25);
    characterRoot.add(mesh);
    console.warn('[HarvestPickaxe] No hand bone — attached to root');
  }

  console.log(
    `[HarvestPickaxe] Equipped "${def.name}" attached=${attached} bone=${hand?.name ?? 'root'}`,
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

export function unequipHarvestPickaxe(
  handle: HarvestPickaxeHandle | null | undefined,
  equipmentManager?: Grudge6EquipmentManager | null,
): void {
  handle?.dispose();
  if (equipmentManager) {
    try {
      equipmentManager.unequip('pick');
    } catch {
      /* ignore */
    }
  }
}

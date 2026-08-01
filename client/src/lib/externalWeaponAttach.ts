/**
 * External weapon attach — second half of grudge6 equip pipeline.
 *
 * Race kits toggle Units_* wardrobe meshes. When kit mesh is missing
 * (common: dagger) or visualKind is external_glb, load a production GLB
 * and attach to R/L_hand_container with grip pose.
 */
import * as THREE from "three";
import {
  getT0WeaponVisual,
  resolveT0WeaponMeshUrl,
  type T0WeaponVisual,
} from "@shared/definitions/t0WeaponVisuals";
import { applyWeaponGripPose } from "@/lib/weaponGripRuntime";
import { attachToBone, detachAttachments } from "@/lib/three/SkeletonEquip";
import { assetUrl } from "@/lib/assetConfig";
import {
  loadGltfCached,
  cloneGltfScene,
  prepareMeshPerformance,
} from "@/lib/three/SharedGltfPipeline";
import type { Grudge6EquipmentManager } from "@/lib/grudge6Equipment";

const meshCache = new Map<string, THREE.Group>();

const SLOT_TO_WEAPON_TYPE: Record<string, string> = {
  sword: "SWORD",
  axe: "AXE",
  hammer: "HAMMER",
  pick: "HAMMER",
  spear: "SPEAR",
  bow: "BOW",
  staff: "STAFF",
  shield: "SHIELD",
  dagger: "DAGGER",
};

function gripKey(bone: T0WeaponVisual["attachBone"]): "rightHand" | "leftHand" | "leftShield" {
  if (bone === "L_hand_container") return "leftHand";
  if (bone === "L_shield_container") return "leftShield";
  return "rightHand";
}

function needsExternal(
  em: Grudge6EquipmentManager | null,
  visual: T0WeaponVisual | null,
  mainHandId: string | null | undefined,
): boolean {
  if (!mainHandId) return false;
  if (visual?.visualKind === "external_glb") return true;
  if (!em || !visual) return false;
  // Kit equip failed / no dagger mesh on this race
  const slot = visual.meshSlot;
  const equipped = em.equipped[slot];
  if (!equipped) return true;
  const mesh = em.slots[slot]?.[equipped];
  if (!mesh || !mesh.visible) return true;
  return false;
}

async function loadWeaponScene(url: string): Promise<THREE.Group | null> {
  try {
    const hit = meshCache.get(url);
    if (hit) return hit.clone(true) as THREE.Group;
    const gltf = await loadGltfCached(url, "high");
    const root = cloneGltfScene(gltf);
    prepareMeshPerformance(root);
    meshCache.set(url, root);
    return root.clone(true) as THREE.Group;
  } catch (err) {
    console.warn("[externalWeaponAttach] load failed", url, err);
    return null;
  }
}

/** Prefer CDN for production; fall back to same-origin assetUrl(local). */
function resolveUrls(itemId: string, visual: T0WeaponVisual | null): string[] {
  const out: string[] = [];
  if (visual?.cdnUrl) out.push(visual.cdnUrl);
  if (visual?.localPath) out.push(assetUrl(visual.localPath));
  const legacy = resolveT0WeaponMeshUrl(itemId);
  if (legacy) {
    const u = legacy.startsWith("http") ? legacy : assetUrl(legacy);
    if (!out.includes(u)) out.push(u);
  }
  return out;
}

function fitLength(root: THREE.Object3D, lengthM: number): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z, 1e-4);
  if (lengthM > 0 && longest > 1e-3) {
    root.scale.multiplyScalar(lengthM / longest);
  }
}

/**
 * Clear prior external attachments and attach MainHand / OffHand externals when needed.
 * Safe no-op when kit wardrobe already shows the weapon.
 */
export async function applyExternalWeaponsForEquipment(
  characterRoot: THREE.Object3D,
  equipment: Record<string, string | null | undefined>,
  em: Grudge6EquipmentManager | null,
): Promise<THREE.Object3D | null> {
  detachAttachments(characterRoot);

  const mainId = equipment.MainHand ?? equipment.mainHand ?? null;
  const offId = equipment.OffHand ?? equipment.offHand ?? null;

  let attached: THREE.Object3D | null = null;

  for (const itemId of [mainId, offId]) {
    if (!itemId) continue;
    const visual = getT0WeaponVisual(itemId);
    if (!needsExternal(em, visual, itemId) && visual?.visualKind !== "external_glb") {
      continue;
    }
    // Always force external for external_glb kind
    if (!needsExternal(em, visual, itemId) && visual?.visualKind === "external_glb") {
      // hide kit dagger if present so we don't double-render
      if (em && visual.meshSlot === "dagger") {
        em.unequip("dagger");
      }
    } else if (!needsExternal(em, visual, itemId)) {
      continue;
    }

    const urls = resolveUrls(itemId, visual);
    let scene: THREE.Group | null = null;
    for (const url of urls) {
      scene = await loadWeaponScene(url);
      if (scene) break;
    }
    if (!scene) continue;

    scene.name = `external_weapon_${itemId}`;
    scene.userData.equipAttachment = true;
    scene.userData.externalWeaponId = itemId;

    if (visual?.lengthM) fitLength(scene, visual.lengthM);

    const bone = visual?.attachBone ?? "R_hand_container";
    const grip = gripKey(bone);
    const ok = attachToBone(characterRoot, scene, grip, {
      clearPrevious: false,
      offset: new THREE.Vector3(0, 0, 0),
    });
    if (!ok) {
      // Fallback: add under root
      characterRoot.add(scene);
    }

    const weaponType =
      SLOT_TO_WEAPON_TYPE[visual?.meshSlot ?? "sword"] ?? "SWORD";
    try {
      applyWeaponGripPose(characterRoot, scene, weaponType);
    } catch {
      /* grip optional */
    }

    if (itemId === mainId) attached = scene;
  }

  return attached;
}

/** Sync helper for holster rescan after external attach. */
export function listExternalWeaponMeshes(root: THREE.Object3D): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.userData?.equipAttachment && o.userData?.externalWeaponId) out.push(o);
  });
  return out;
}

/**
 * Grudge6 EquipmentManager — child-mesh toggle system for race GLBs.
 * Ported from grudgeracecharacters/playground EquipmentManager.js
 */
import * as THREE from "three";
import type { Model3DField } from "@shared/fleet";

interface SlotDef {
  slot: string;
  re: RegExp;
  group: string;
  noVariant?: boolean;
}

const SLOT_DEFS: SlotDef[] = [
  { slot: "body", re: /^Units_Body_([A-Z])$/i, group: "armor" },
  { slot: "arms", re: /^Units_Arms_([A-Z])$/i, group: "armor" },
  { slot: "legs", re: /^Units_Legs_([A-Z])$/i, group: "armor" },
  { slot: "head", re: /^Units_head_([A-Z])$/i, group: "armor" },
  { slot: "shoulders", re: /^Units_shoulderpads_([A-Z])$/i, group: "armor" },
  { slot: "axe", re: /(?:Units_|weapon_)axe_([A-Z])$/i, group: "weapon_r" },
  { slot: "hammer", re: /(?:Units_|weapon_)hammer_([A-Z])$/i, group: "weapon_r" },
  { slot: "sword", re: /(?:Units_|weapon_)[Ss]word_([A-Z])$/i, group: "weapon_r" },
  { slot: "pick", re: /(?:Units_|weapon_)pick$/i, group: "weapon_r", noVariant: true },
  { slot: "spear", re: /(?:Units_|weapon_)[Ss]pear$/i, group: "weapon_r", noVariant: true },
  { slot: "bow", re: /(?:Units_|weapon_)[Bb]ow$/i, group: "weapon_l", noVariant: true },
  { slot: "staff", re: /(?:Units_|weapon_)staff_([A-Z])$/i, group: "weapon_l" },
  { slot: "shield", re: /(?:Units_|)[Ss]hield_([A-Z])$/i, group: "shield" },
  { slot: "bag", re: /(?:Xtra_|Units_)bag$/i, group: "utility", noVariant: true },
  { slot: "wood", re: /(?:Xtra_|Units_)wood$/i, group: "utility", noVariant: true },
  { slot: "quiver", re: /(?:Xtra_|Units_)quiver$/i, group: "utility", noVariant: true },
];

const WEAPON_SLOTS = new Set(["axe", "hammer", "sword", "pick", "spear", "bow", "staff", "shield"]);

export class Grudge6EquipmentManager {
  readonly prefix: string;
  slots: Record<string, Record<string, THREE.Object3D>> = {};
  equipped: Record<string, string> = {};
  bones: Record<string, THREE.Object3D | null> = {};
  private _allMeshes: THREE.Object3D[] = [];
  root: THREE.Object3D | null = null;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  catalog(root: THREE.Object3D): Record<string, string[]> {
    this.root = root;
    this.slots = {};
    this._allMeshes = [];

    this.bones.rightHand = root.getObjectByName("R_hand_container") ?? null;
    this.bones.leftHand = root.getObjectByName("L_hand_container") ?? null;
    this.bones.leftShield = root.getObjectByName("L_shield_container") ?? null;
    this.bones.bag = root.getObjectByName("Bone_bag") ?? null;
    this.bones.wood = root.getObjectByName("Bone_wood") ?? null;
    this.bones.quiver = root.getObjectByName("Quiver_container") ?? null;

    root.traverse((child) => {
      const mesh = child as THREE.Mesh & { isSkinnedMesh?: boolean };
      if (!mesh.isMesh && !mesh.isSkinnedMesh) return;

      const stripped = mesh.name.startsWith(this.prefix)
        ? mesh.name.slice(this.prefix.length)
        : mesh.name;

      for (const def of SLOT_DEFS) {
        const match = stripped.match(def.re);
        if (!match) continue;

        const variant = def.noVariant
          ? "_default"
          : (match[1] || "_default").toUpperCase();

        if (!this.slots[def.slot]) this.slots[def.slot] = {};
        this.slots[def.slot][variant] = mesh;
        mesh.userData.equipSlot = def.slot;
        mesh.userData.equipVariant = variant;
        mesh.userData.equipGroup = def.group;
        this._allMeshes.push(mesh);
        mesh.visible = false;
        break;
      }
    });

    return this.getSlotSummary();
  }

  equip(slot: string, variant: string, armorColor?: string): boolean {
    const variants = this.slots[slot];
    if (!variants) return false;

    for (const [v, mesh] of Object.entries(variants)) {
      const m = mesh as THREE.Mesh;
      if (v === variant) {
        m.visible = true;
        if (armorColor && m.material) this.tintMesh(m, armorColor);
      } else {
        m.visible = false;
      }
    }
    this.equipped[slot] = variant;
    return true;
  }

  equipWeapon(slot: string, variant = "_default"): boolean {
    const def = SLOT_DEFS.find((d) => d.slot === slot);
    if (!def) return false;

    for (const mesh of this._allMeshes) {
      if (mesh.userData.equipGroup === def.group) {
        mesh.visible = false;
        delete this.equipped[mesh.userData.equipSlot as string];
      }
    }
    return this.equip(slot, variant);
  }

  unequip(slot: string): void {
    const variants = this.slots[slot];
    if (!variants) return;
    for (const mesh of Object.values(variants)) mesh.visible = false;
    delete this.equipped[slot];
  }

  getSlotSummary(): Record<string, string[]> {
    const summary: Record<string, string[]> = {};
    for (const [slot, variants] of Object.entries(this.slots)) {
      summary[slot] = Object.keys(variants).sort();
    }
    return summary;
  }

  private tintMesh(mesh: THREE.Mesh, color: string): void {
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (mat && (mat as THREE.MeshStandardMaterial).color) {
      (mat as THREE.MeshStandardMaterial).color.set(color);
      (mat as THREE.MeshStandardMaterial).needsUpdate = true;
    }
  }

  get meshCount(): number {
    return this._allMeshes.length;
  }
}

/** Apply a Model3DField to a cataloged equipment manager */
export function applyModel3dToEquipment(
  em: Grudge6EquipmentManager,
  model3d: Model3DField,
): void {
  for (const [slot, variant] of Object.entries(model3d.equippedMeshes ?? {})) {
    em.equip(slot, variant, model3d.armorColor);
  }
  for (const [slot, variant] of Object.entries(model3d.weaponSlots ?? {})) {
    if (WEAPON_SLOTS.has(slot)) {
      em.equipWeapon(slot, variant);
    }
  }
}

/** Create manager for race, catalog scene, apply model3d — one-shot helper */
export function setupGrudge6Equipment(
  racePrefix: string,
  scene: THREE.Object3D,
  model3d: Model3DField,
): Grudge6EquipmentManager {
  const em = new Grudge6EquipmentManager(racePrefix);
  em.catalog(scene);

  // Ensure base armor visible when model3d is sparse
  const merged: Model3DField = {
    ...model3d,
    equippedMeshes: {
      body: "A",
      arms: "A",
      legs: "A",
      head: "A",
      ...model3d.equippedMeshes,
    },
  };

  applyModel3dToEquipment(em, merged);
  return em;
}
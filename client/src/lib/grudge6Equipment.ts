/**
 * Grudge6 EquipmentManager — child-mesh toggle for RTS toon race GLBs.
 * Ported from grudgeracecharacters/playground EquipmentManager.js
 *
 * Race packs (WK_/BRB_/ELF_/DWF_/ORC_/UD_) share the same Units_* mesh slots.
 * Catalog once per load; equip() swaps visible armor/weapon variants.
 */
import * as THREE from "three";
import type { Model3DField } from "@shared/fleet";
import { ensureCharacterTextureColorSpace } from "@/lib/characterAppearance";
import { applyWeaponGripPose, updateWristLock } from "@/lib/weaponGripRuntime";
import { finalizeEquipmentVisibility } from "@/lib/three/SkeletonEquip";
import { estimateVisibleTris } from "@/lib/three/SkeletonEquip";

interface SlotDef {
  slot: string;
  re: RegExp;
  group: string;
  noVariant?: boolean;
}

/**
 * Match stripped names (prefix already removed) AND raw names that still
 * contain Units_ / weapon_ / Xtra_ tokens (when race prefix is missing).
 */
const SLOT_DEFS: SlotDef[] = [
  { slot: "body", re: /Units_Body_([A-Z])$/i, group: "armor" },
  { slot: "arms", re: /Units_Arms_([A-Z])$/i, group: "armor" },
  { slot: "legs", re: /Units_Legs_([A-Z])$/i, group: "armor" },
  { slot: "head", re: /Units_head_([A-Z])$/i, group: "armor" },
  // hats / tricorns sometimes use separate mesh names
  { slot: "hat", re: /(?:Units_)?(?:hat|tricorn|pirate_hat|headwear)_([A-Z])$/i, group: "armor" },
  { slot: "shoulders", re: /Units_shoulderpads_([A-Z])$/i, group: "armor" },
  { slot: "axe", re: /(?:Units_|weapon_)axe_([A-Z])$/i, group: "weapon_r" },
  { slot: "hammer", re: /(?:Units_|weapon_)hammer_([A-Z])$/i, group: "weapon_r" },
  { slot: "sword", re: /(?:Units_|weapon_)[Ss]word_([A-Z])$/i, group: "weapon_r" },
  // BRB_weapon_Dagger — optional letter; empty → A. External bone_dagger.glb when race kit has no dagger
  { slot: "dagger", re: /(?:Units_|weapon_)[Dd]agger(?:_([A-Z]))?$/i, group: "weapon_r" },
  { slot: "pick", re: /(?:Units_|weapon_)pick$/i, group: "weapon_r", noVariant: true },
  { slot: "spear", re: /(?:Units_|weapon_)[Ss]pear$/i, group: "weapon_r", noVariant: true },
  { slot: "bow", re: /(?:Units_|weapon_)[Bb]ow$/i, group: "weapon_l", noVariant: true },
  { slot: "staff", re: /(?:Units_|weapon_)staff_([A-Z])$/i, group: "weapon_l" },
  { slot: "shield", re: /(?:Units_|)[Ss]hield_([A-Z])$/i, group: "shield" },
  { slot: "bag", re: /(?:Xtra_|Units_)bag$/i, group: "utility", noVariant: true },
  { slot: "wood", re: /(?:Xtra_|Units_)wood$/i, group: "utility", noVariant: true },
  { slot: "quiver", re: /(?:Xtra_|Units_)quiver$/i, group: "utility", noVariant: true },
];

const WEAPON_SLOTS = new Set([
  "axe",
  "hammer",
  "sword",
  "dagger",
  "pick",
  "spear",
  "bow",
  "staff",
  "shield",
]);
const ARMOR_DEFAULTS: Record<string, string> = {
  body: "A",
  arms: "A",
  legs: "A",
  head: "A",
};

/** Known race prefixes — strip any so catalog works even if wrong prefix was passed */
const RACE_PREFIXES = ["WK_", "BRB_", "ELF_", "DWF_", "ORC_", "UD_"];

function stripRacePrefix(name: string, preferred: string): string {
  if (!name) return name;
  // Prefer declared race prefix first
  if (preferred && name.startsWith(preferred)) {
    return name.slice(preferred.length);
  }
  const upper = name;
  for (const p of RACE_PREFIXES) {
    if (upper.startsWith(p)) return upper.slice(p.length);
  }
  // Case-insensitive
  const lower = name.toLowerCase();
  for (const p of RACE_PREFIXES) {
    if (lower.startsWith(p.toLowerCase())) return name.slice(p.length);
  }
  return name;
}

function normalizeVariant(raw: string | undefined, noVariant: boolean): string {
  if (noVariant) return "_default";
  if (!raw) return "A";
  const v = String(raw).trim().toUpperCase();
  if (v === "_DEFAULT" || v === "DEFAULT" || v === "") return noVariant ? "_default" : "A";
  // "body_c" / "C" / "c" → "C"
  const letter = v.replace(/^.*_/, "").replace(/[^A-Z]/g, "");
  return letter || "A";
}

export class Grudge6EquipmentManager {
  readonly prefix: string;
  slots: Record<string, Record<string, THREE.Object3D>> = {};
  equipped: Record<string, string> = {};
  bones: Record<string, THREE.Object3D | null> = {};
  private _allMeshes: THREE.Object3D[] = [];
  root: THREE.Object3D | null = null;

  constructor(prefix: string) {
    this.prefix = prefix || "WK_";
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
      if (!mesh.name) return;

      const stripped = stripRacePrefix(mesh.name, this.prefix);

      for (const def of SLOT_DEFS) {
        // Try stripped name first, then full name (some exports drop race prefix)
        let match = stripped.match(def.re);
        if (!match) match = mesh.name.match(def.re);
        if (!match) continue;

        const variant = def.noVariant
          ? "_default"
          : normalizeVariant(match[1], false);

        if (!this.slots[def.slot]) this.slots[def.slot] = {};
        // Prefer first mesh for a variant (avoid overwriting with LODs)
        if (!this.slots[def.slot][variant]) {
          this.slots[def.slot][variant] = mesh;
        }
        mesh.userData.equipSlot = def.slot;
        mesh.userData.equipVariant = variant;
        mesh.userData.equipGroup = def.group;
        this._allMeshes.push(mesh);
        mesh.visible = false;
        break;
      }
    });

    if (this._allMeshes.length === 0) {
      console.warn(
        `[Grudge6Equip] No equip meshes matched for prefix=${this.prefix}. ` +
          `Is this a grudge6 race GLB with Units_* children?`,
      );
    }

    return this.getSlotSummary();
  }

  equip(slot: string, variant: string, armorColor?: string): boolean {
    const variants = this.slots[slot];
    if (!variants) return false;

    const want = normalizeVariant(variant, false);
    // Fall back to first available if requested letter missing (mesh swap safe)
    const keys = Object.keys(variants);
    const resolved = variants[want] ? want : keys.includes("A") ? "A" : keys[0];
    if (!resolved) return false;

    for (const [v, mesh] of Object.entries(variants)) {
      const m = mesh as THREE.Mesh;
      if (v === resolved) {
        m.visible = true;
        if (armorColor && armorColor !== "#ffffff" && armorColor !== "#fff") {
          this.tintMesh(m, armorColor);
        }
      } else {
        m.visible = false;
      }
    }
    this.equipped[slot] = resolved;
    if (this.root) finalizeEquipmentVisibility(this.root);
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
    const v = def.noVariant ? "_default" : normalizeVariant(variant, false);
    const ok = this.equip(slot, v);
    if (ok) this.applyCombatGripForSlot(slot);
    return ok;
  }

  /**
   * Apply canonical grip / wrist lock from weaponCombatGeometry to the visible
   * weapon mesh so blades stay in palm and do not clip the torso on run/attack.
   */
  applyCombatGripForSlot(slot: string): void {
    if (!this.root) return;
    const variants = this.slots[slot];
    if (!variants) return;
    const equippedVar = this.equipped[slot];
    const mesh = equippedVar ? variants[equippedVar] : Object.values(variants)[0];
    if (!mesh || !mesh.visible) return;
    const typeMap: Record<string, string> = {
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
    const weaponTypeId = typeMap[slot.toLowerCase()] || "SWORD";
    applyWeaponGripPose(this.root, mesh, weaponTypeId);
  }

  /** Per-frame wrist clamp for all currently equipped weapon meshes */
  updateWeaponWristLocks(dt: number): void {
    if (!this.root) return;
    for (const slot of WEAPON_SLOTS) {
      const v = this.equipped[slot];
      if (!v || !this.slots[slot]?.[v]) continue;
      updateWristLock(this.slots[slot][v], undefined, dt);
    }
  }

  unequip(slot: string): void {
    const variants = this.slots[slot];
    if (!variants) return;
    for (const mesh of Object.values(variants)) mesh.visible = false;
    delete this.equipped[slot];
    if (this.root) finalizeEquipmentVisibility(this.root);
  }

  /** Visible triangle estimate after wardrobe filter (debug / LOD). */
  estimateDrawCost(): number {
    return this.root ? estimateVisibleTris(this.root) : 0;
  }

  /** Show a safe base armor set (body/arms/legs) so character is never invisible */
  ensureBaseArmorVisible(): void {
    for (const [slot, defVariant] of Object.entries(ARMOR_DEFAULTS)) {
      if (!this.slots[slot]) continue;
      if (this.equipped[slot]) continue;
      this.equip(slot, defVariant);
    }
  }

  getSlotSummary(): Record<string, string[]> {
    const summary: Record<string, string[]> = {};
    for (const [slot, variants] of Object.entries(this.slots)) {
      summary[slot] = Object.keys(variants).sort();
    }
    return summary;
  }

  private tintMesh(mesh: THREE.Mesh, color: string): void {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const tint = new THREE.Color(color);
    for (const mat of mats) {
      if (!mat || !(mat as THREE.MeshStandardMaterial).color) continue;
      const std = mat as THREE.MeshStandardMaterial;
      if (!std.userData._grudgeBaseColor) {
        std.userData._grudgeBaseColor = std.color.clone();
      }
      std.color.copy(std.userData._grudgeBaseColor as THREE.Color).multiply(tint);
      std.needsUpdate = true;
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
  em.ensureBaseArmorVisible();
}

/** Create manager for race, catalog scene, apply model3d — one-shot helper */
export function setupGrudge6Equipment(
  racePrefix: string,
  scene: THREE.Object3D,
  model3d: Model3DField,
): Grudge6EquipmentManager {
  const em = new Grudge6EquipmentManager(racePrefix);
  em.catalog(scene);

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
  ensureCharacterTextureColorSpace(scene);
  // Slightly larger headwear by default so hats clear environment beams (boat deck, etc.)
  // Full +20% applied again when boarding (ShipInteractable.scaleCharacterHeadwear).
  scaleHeadMeshes(scene, 1.08);
  return em;
}

/** Scale head / hat / helm meshes (Calvin tricorn, Units_head_*, etc.). */
export function scaleHeadMeshes(root: THREE.Object3D, factor = 1.2): void {
  root.traverse((o) => {
    const n = o.name || '';
    if (!/Units_head|hat|tricorn|helm_|helmet|headwear|pirate.?hat/i.test(n)) return;
    if (o.userData.__headBaseScale == null) {
      o.userData.__headBaseScale = o.scale.clone();
    }
    const base = o.userData.__headBaseScale as THREE.Vector3;
    o.scale.set(base.x * factor, base.y * factor, base.z * factor);
  });
}

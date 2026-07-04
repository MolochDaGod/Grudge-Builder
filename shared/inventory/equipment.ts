import {
  ALL_EQUIPMENT,
  calculateStatsAtTier,
  type EquipmentItem,
} from "@shared/definitions/equipmentData";
import {
  type PanelEquipmentSlot,
  grudaItemToMesh,
  tierToVariant,
} from "@shared/fleet/character";
import type { SecondaryStatId } from "@shared/attributeSystem";
import {
  type ItemInstance,
  type ItemSlot,
  PANEL_EQUIPMENT_SLOTS,
  catalogIdFromSlot,
  isSlotEmpty,
  panelFromEquipment,
  type EquipmentPanel,
} from "./types";
import { addItem, canAdd, removeItem, swapSlots } from "./container";

const EQUIP_BY_ID = new Map(ALL_EQUIPMENT.map((e) => [e.id, e]));

const PANEL_TO_EQUIP_TYPE: Partial<Record<PanelEquipmentSlot, EquipmentItem["type"]>> = {
  Head: "Helm",
  Shoulder: "Shoulder",
  Chest: "Chest",
  Hands: "Hands",
  Feet: "Feet",
  Accessory1: "Ring",
  Accessory2: "Necklace",
  OffHand: "Offhand",
};

const GRUDA_PANEL_SLOT: Partial<Record<string, PanelEquipmentSlot>> = {
  HEAD: "Head",
  CHEST: "Chest",
  HANDS: "Hands",
  LEGS: "Legs",
  FEET: "Feet",
  SHOULDER: "Shoulder",
  BACK: "Back",
  SWORD: "MainHand",
  AXE: "MainHand",
  MACE: "MainHand",
  DAGGER: "MainHand",
  STAFF: "MainHand",
  BOW: "MainHand",
  HAMMER: "MainHand",
  SPEAR: "MainHand",
  XBOW: "MainHand",
  GUN: "MainHand",
  SHIELD: "OffHand",
  PICK: "MainHand",
};

export interface EquipSwapResult {
  equipment: Record<string, string | null>;
  inventory: { itemId: string; quantity: number; tier?: number }[];
  previousItemId: string | null;
  equippedItemId: string | null;
}

function parseGrudaPanelSlot(itemId: string): PanelEquipmentSlot | null {
  if (itemId.startsWith("GRUDA_ARM_")) {
    const sub = itemId.replace("GRUDA_ARM_", "").split("_")[0].toUpperCase();
    return GRUDA_PANEL_SLOT[sub] ?? null;
  }
  if (itemId.startsWith("GRUDA_WPN_")) {
    const sub = itemId.replace("GRUDA_WPN_", "").split("_")[0].toUpperCase();
    return GRUDA_PANEL_SLOT[sub] ?? "MainHand";
  }
  if (itemId.startsWith("GRUDA_ACC_")) {
    const sub = itemId.replace("GRUDA_ACC_", "").split("_")[0].toUpperCase();
    if (sub === "BAG" || sub === "BACK") return "Back";
    if (sub === "QUIVER") return "Back";
  }
  return null;
}

function panelSlotForItem(itemId: string): PanelEquipmentSlot | null {
  const gruda = parseGrudaPanelSlot(itemId);
  if (gruda) return gruda;

  const lower = itemId.toLowerCase();
  if (lower.includes("shield")) return "OffHand";
  if (lower.includes("helm") || lower.includes("head") || lower.includes("hood")) return "Head";
  if (lower.includes("chest") || lower.includes("vest") || lower.includes("robe")) return "Chest";
  if (lower.includes("hand") || lower.includes("glove")) return "Hands";
  if (lower.includes("leg") || lower.includes("pant")) return "Legs";
  if (lower.includes("boot") || lower.includes("feet")) return "Feet";
  if (lower.includes("shoulder") || lower.includes("pauldron")) return "Shoulder";
  if (lower.includes("bag") || lower.includes("backpack") || lower.includes("back")) return "Back";
  if (
    lower.includes("sword") ||
    lower.includes("bow") ||
    lower.includes("staff") ||
    lower.includes("axe") ||
    lower.includes("gun") ||
    lower.includes("dagger") ||
    lower.includes("hammer") ||
    lower.includes("spear")
  ) {
    return "MainHand";
  }

  const equip = EQUIP_BY_ID.get(itemId);
  if (!equip) return null;
  for (const [slot, type] of Object.entries(PANEL_TO_EQUIP_TYPE)) {
    if (type === equip.type) return slot as PanelEquipmentSlot;
  }
  return null;
}

function isTwoHanded(itemId: string): boolean {
  const upper = itemId.toUpperCase();
  return (
    upper.includes("GREATSWORD") ||
    upper.includes("GREATAXE") ||
    upper.includes("2H") ||
    upper.includes("_STAFF_") ||
    upper.includes("_BOW_") ||
    upper.includes("_SPEAR_") ||
    upper.includes("_HAMMER_") && !upper.includes("HAND")
  );
}

function isShield(itemId: string): boolean {
  return itemId.toUpperCase().includes("SHIELD") || grudaItemToMesh(itemId)?.meshSlot === "shield";
}

function canEquipToSlot(itemId: string, slot: PanelEquipmentSlot): boolean {
  const target = panelSlotForItem(itemId);
  if (!target) return false;
  if (target === slot) return true;
  if (slot === "MainHand" && target === "MainHand") return true;
  if (slot === "OffHand" && (target === "OffHand" || isShield(itemId))) return true;
  return false;
}

function clearHandConflicts(
  panel: EquipmentPanel,
  itemId: string,
  slot: PanelEquipmentSlot,
): EquipmentPanel {
  const next = { ...panel };
  if (slot === "MainHand" && isTwoHanded(itemId)) {
    delete next.OffHand;
    delete next.MainHand;
  } else if (slot === "MainHand" && isTwoHanded(next.MainHand ?? "")) {
    delete next.MainHand;
    delete next.OffHand;
  } else if (slot === "OffHand" && isTwoHanded(next.MainHand ?? "")) {
    delete next.MainHand;
  } else if (slot === "MainHand" && isShield(next.OffHand ?? "") && isTwoHanded(itemId)) {
    delete next.OffHand;
  }
  return next;
}

/** Direct panel equip/unequip — production path for character.equipment jsonb. */
export function equipToPanelSlot(
  equipment: Record<string, string | null>,
  inventory: { itemId: string; quantity: number; tier?: number }[],
  slot: PanelEquipmentSlot,
  itemId: string | null,
): EquipSwapResult {
  const panel = panelFromEquipment(equipment);
  const previousItemId = panel[slot] ?? null;

  if (itemId && !canEquipToSlot(itemId, slot)) {
    throw new Error(`Item ${itemId} cannot be equipped to slot ${slot}`);
  }

  const nextPanel = clearHandConflicts(panel, itemId ?? "", slot);
  if (itemId) nextPanel[slot] = itemId;
  else delete nextPanel[slot];

  const nextInventory = [...inventory];

  if (previousItemId) {
    const row = nextInventory.find((r) => r.itemId === previousItemId);
    if (row) row.quantity += 1;
    else nextInventory.push({ itemId: previousItemId, quantity: 1, tier: tierFromItemId(previousItemId) });
  }

  if (itemId) {
    const row = nextInventory.find((r) => r.itemId === itemId);
    if (!row || row.quantity <= 0) {
      throw new Error(`Item ${itemId} not in inventory`);
    }
    row.quantity -= 1;
    if (row.quantity <= 0) {
      const idx = nextInventory.indexOf(row);
      if (idx >= 0) nextInventory.splice(idx, 1);
    }
  }

  const equipmentOut: Record<string, string | null> = {};
  for (const s of PANEL_EQUIPMENT_SLOTS) {
    equipmentOut[s] = nextPanel[s] ?? null;
  }

  return {
    equipment: equipmentOut,
    inventory: nextInventory,
    previousItemId,
    equippedItemId: itemId,
  };
}

function tierFromItemId(itemId: string): number {
  const m = itemId.match(/_T(\d)$/i);
  return m ? parseInt(m[1], 10) : 1;
}

function tierFromInstance(inst: ItemInstance | null): number {
  if (!inst) return 1;
  return inst.tier ?? tierFromItemId(inst.catalogId);
}

function statsFromCatalogItem(itemId: string, tier: number): Partial<Record<SecondaryStatId, number>> {
  const equip = EQUIP_BY_ID.get(itemId);
  if (equip) {
    const s = calculateStatsAtTier(equip, tier);
    return {
      health: s.hp,
      mana: s.mana,
      defense: s.defense,
      criticalChance: s.crit,
      blockChance: s.block,
    };
  }

  const grudaTier = tierFromItemId(itemId) || tier;
  const mesh = grudaItemToMesh(itemId);
  if (!mesh) return {};

  const t = grudaTier;
  if (mesh.isWeapon) {
    return { damage: 4 + t * 3, criticalChance: 0.5 + t * 0.3 };
  }
  return {
    health: 8 + t * 6,
    defense: 3 + t * 2,
    blockChance: mesh.meshSlot === "shield" ? 2 + t : 0,
  };
}

export function equipmentStatBonuses(
  equipment: Record<string, string | null | undefined>,
): Partial<Record<SecondaryStatId, number>> {
  const totals: Partial<Record<SecondaryStatId, number>> = {};
  for (const slot of PANEL_EQUIPMENT_SLOTS) {
    const itemId = equipment[slot];
    if (!itemId) continue;
    const part = statsFromCatalogItem(itemId, tierFromItemId(itemId));
    for (const [stat, val] of Object.entries(part)) {
      const k = stat as SecondaryStatId;
      totals[k] = (totals[k] ?? 0) + (val ?? 0);
    }
  }
  return totals;
}

/** Count equipped pieces sharing a set name prefix (Bloodfeud, Wraithfang, …). */
export function countEquipmentSetPieces(
  equipment: Record<string, string | null | undefined>,
  setName: string,
): number {
  const needle = setName.toLowerCase();
  let count = 0;
  for (const slot of PANEL_EQUIPMENT_SLOTS) {
    const itemId = equipment[slot];
    if (!itemId) continue;
    const equip = EQUIP_BY_ID.get(itemId);
    if (equip?.name.toLowerCase().includes(needle)) count++;
    else if (itemId.toLowerCase().includes(needle)) count++;
  }
  return count;
}

export function swapInventoryEquip(
  inventorySlots: ItemSlot[],
  equipmentPanel: EquipmentPanel,
  inventoryIndex: number,
  equipSlot: PanelEquipmentSlot,
): { inventory: ItemSlot[]; equipment: EquipmentPanel } {
  if (inventoryIndex < 0 || inventoryIndex >= inventorySlots.length) {
    throw new Error("Invalid inventory index");
  }

  const invSlot = inventorySlots[inventoryIndex];
  const itemId = catalogIdFromSlot(invSlot);
  if (itemId && !canEquipToSlot(itemId, equipSlot)) {
    throw new Error(`Cannot equip ${itemId} to ${equipSlot}`);
  }

  const nextPanel = { ...equipmentPanel };
  const previous = nextPanel[equipSlot] ?? null;

  if (itemId) {
    const cleared = clearHandConflicts(nextPanel, itemId, equipSlot);
    Object.assign(nextPanel, cleared);
    nextPanel[equipSlot] = itemId;
  } else {
    delete nextPanel[equipSlot];
  }

  if (previous) {
    const prevInst: ItemInstance = { catalogId: previous, tier: tierFromItemId(previous) };
    if (!canAdd(inventorySlots, prevInst, 1)) {
      throw new Error("Inventory full — cannot unequip");
    }
    addItem(inventorySlots, prevInst, 1);
  }

  if (itemId) {
    removeItem(inventorySlots, invSlot.instance!, 1);
  } else if (previous) {
    // unequip only — move equipped item to the clicked inventory slot
    swapSlots(invSlot, { instance: { catalogId: previous, tier: tierFromItemId(previous) }, amount: 1 });
  }

  return { inventory: inventorySlots, equipment: nextPanel };
}
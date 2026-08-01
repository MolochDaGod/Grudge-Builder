import type { PanelEquipment, PanelEquipmentSlot } from "@shared/fleet/character";

/** Dynamic item instance — catalog id + per-stack/per-item state. */
export interface ItemInstance {
  catalogId: string;
  durability?: number;
  maxDurability?: number;
  equipmentLevel?: number;
  tier?: number;
  quality?: string;
  metadata?: Record<string, unknown>;
}

/** Slot container cell — amount lives on the slot, not the instance. */
export interface ItemSlot {
  instance: ItemInstance | null;
  amount: number;
}

/** Legacy character bag row (Postgres jsonb). */
export interface LegacyInventoryRow {
  itemId: string;
  quantity: number;
  tier?: number;
}

export const DEFAULT_INVENTORY_SIZE = 30;

/** Paperdoll + bag equip targets (includes non-drop SecondaryWeapon reserve). */
export const PANEL_EQUIPMENT_SLOTS: PanelEquipmentSlot[] = [
  "Head",
  "Back",
  "Shoulder",
  "Chest",
  "Hands",
  "Accessory1",
  "MainHand",
  "OffHand",
  "SecondaryWeapon",
  "Legs",
  "Feet",
  "Accessory2",
];

/** Slots that show on the tactical paperdoll body (SecondaryWeapon is reserve strip). */
export const PAPERDOLL_VISIBLE_SLOTS: PanelEquipmentSlot[] = [
  "Head",
  "Back",
  "Shoulder",
  "Chest",
  "Hands",
  "Accessory1",
  "MainHand",
  "OffHand",
  "Legs",
  "Feet",
  "Accessory2",
];

/** Non-drop: cannot be looted off corpse / not a world drop target. */
export const NON_DROP_EQUIP_SLOTS: PanelEquipmentSlot[] = ["SecondaryWeapon"];

export type EquipmentPanel = PanelEquipment;

export function emptySlot(): ItemSlot {
  return { instance: null, amount: 0 };
}

export function createSlots(size: number): ItemSlot[] {
  return Array.from({ length: size }, () => emptySlot());
}

export function instanceKey(inst: ItemInstance): string {
  return [
    inst.catalogId,
    inst.tier ?? 1,
    inst.equipmentLevel ?? 0,
    inst.durability ?? "",
    inst.quality ?? "",
  ].join("|");
}

export function instancesEqual(a: ItemInstance, b: ItemInstance): boolean {
  return instanceKey(a) === instanceKey(b);
}

export function isSlotEmpty(slot: ItemSlot): boolean {
  return slot.amount <= 0 || slot.instance === null;
}

export function catalogIdFromSlot(slot: ItemSlot): string | null {
  if (isSlotEmpty(slot) || !slot.instance) return null;
  return slot.instance.catalogId;
}

/** Normalize legacy flat inventory array → fixed slot bag. */
export function legacyInventoryToSlots(
  rows: LegacyInventoryRow[],
  size = DEFAULT_INVENTORY_SIZE,
): ItemSlot[] {
  const slots = createSlots(size);
  let idx = 0;
  for (const row of rows) {
    if (!row?.itemId || row.quantity <= 0) continue;
    while (idx < slots.length && !isSlotEmpty(slots[idx])) idx++;
    if (idx >= slots.length) break;
    slots[idx] = {
      instance: {
        catalogId: row.itemId,
        tier: row.tier ?? 1,
      },
      amount: row.quantity,
    };
    idx++;
  }
  return slots;
}

/** Serialize non-empty slots back to legacy jsonb rows. */
export function slotsToLegacyInventory(slots: ItemSlot[]): LegacyInventoryRow[] {
  const rows: LegacyInventoryRow[] = [];
  for (const slot of slots) {
    if (isSlotEmpty(slot) || !slot.instance) continue;
    rows.push({
      itemId: slot.instance.catalogId,
      quantity: slot.amount,
      tier: slot.instance.tier,
    });
  }
  return rows;
}

/** Panel equipment map with null holes removed. */
export function panelFromEquipment(
  equipment: Record<string, string | null | undefined>,
): EquipmentPanel {
  const panel: EquipmentPanel = {};
  for (const slot of PANEL_EQUIPMENT_SLOTS) {
    const raw = equipment[slot];
    if (raw) panel[slot] = raw;
  }
  return panel;
}
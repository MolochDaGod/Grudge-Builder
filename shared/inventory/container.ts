import {
  type ItemInstance,
  type ItemSlot,
  createSlots,
  instancesEqual,
  isSlotEmpty,
} from "./types";

export function maxStackFor(inst: ItemInstance): number {
  if (inst.durability !== undefined && inst.maxDurability !== undefined) return 1;
  if (inst.catalogId.startsWith("GRUDA_WPN_")) return 1;
  if (inst.catalogId.startsWith("GRUDA_ARM_")) return 1;
  return 99;
}

export function decreaseAmount(slot: ItemSlot, reduceBy: number): number {
  const limit = Math.max(0, Math.min(reduceBy, slot.amount));
  slot.amount -= limit;
  if (slot.amount <= 0) {
    slot.amount = 0;
    slot.instance = null;
  }
  return limit;
}

export function increaseAmount(slot: ItemSlot, increaseBy: number, maxStack: number): number {
  const limit = Math.max(0, Math.min(increaseBy, maxStack - slot.amount));
  slot.amount += limit;
  return limit;
}

export function countItem(slots: ItemSlot[], inst: ItemInstance): number {
  let total = 0;
  for (const slot of slots) {
    if (!isSlotEmpty(slot) && slot.instance && instancesEqual(slot.instance, inst)) {
      total += slot.amount;
    }
  }
  return total;
}

export function canAdd(slots: ItemSlot[], inst: ItemInstance, amount: number): boolean {
  let remaining = amount;
  const maxStack = maxStackFor(inst);

  for (const slot of slots) {
    if (isSlotEmpty(slot)) {
      remaining -= maxStack;
    } else if (slot.instance && instancesEqual(slot.instance, inst)) {
      remaining -= maxStack - slot.amount;
    }
    if (remaining <= 0) return true;
  }
  return false;
}

export function addItem(slots: ItemSlot[], inst: ItemInstance, amount: number): boolean {
  if (!canAdd(slots, inst, amount)) return false;
  const maxStack = maxStackFor(inst);
  let remaining = amount;

  for (let i = 0; i < slots.length && remaining > 0; i++) {
    const slot = slots[i];
    if (!isSlotEmpty(slot) && slot.instance && instancesEqual(slot.instance, inst)) {
      remaining -= increaseAmount(slot, remaining, maxStack);
    }
  }

  for (let i = 0; i < slots.length && remaining > 0; i++) {
    if (isSlotEmpty(slots[i])) {
      const put = Math.min(remaining, maxStack);
      slots[i] = { instance: { ...inst }, amount: put };
      remaining -= put;
    }
  }

  return remaining === 0;
}

export function removeItem(slots: ItemSlot[], inst: ItemInstance, amount: number): boolean {
  let remaining = amount;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (!isSlotEmpty(slot) && slot.instance && instancesEqual(slot.instance, inst)) {
      remaining -= decreaseAmount(slot, remaining);
      if (remaining === 0) return true;
    }
  }
  return false;
}

export function mergeSlots(from: ItemSlot, to: ItemSlot): boolean {
  if (isSlotEmpty(from) || isSlotEmpty(to) || !from.instance || !to.instance) return false;
  if (!instancesEqual(from.instance, to.instance)) return false;
  const maxStack = maxStackFor(to.instance);
  const put = increaseAmount(to, from.amount, maxStack);
  decreaseAmount(from, put);
  return true;
}

export function splitSlot(from: ItemSlot, to: ItemSlot): boolean {
  if (from.amount < 2 || !isSlotEmpty(to) || !from.instance) return false;
  const half = Math.floor(from.amount / 2);
  to.instance = { ...from.instance };
  to.amount = half;
  from.amount -= half;
  return true;
}

export function swapSlots(a: ItemSlot, b: ItemSlot): void {
  const tmp = { instance: a.instance, amount: a.amount };
  a.instance = b.instance;
  a.amount = b.amount;
  b.instance = tmp.instance;
  b.amount = tmp.amount;
}

export function slotsFree(slots: ItemSlot[]): number {
  return slots.filter(isSlotEmpty).length;
}

export { legacyInventoryToSlots, slotsToLegacyInventory } from "./types";
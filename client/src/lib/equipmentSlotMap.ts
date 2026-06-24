import { grudaItemToMesh, type PanelEquipmentSlot } from '@shared/fleet';

const SLOT_FIELD_MAP: Record<string, PanelEquipmentSlot> = {
  head: 'Head',
  helm: 'Head',
  chest: 'Chest',
  body: 'Chest',
  hands: 'Hands',
  gloves: 'Hands',
  legs: 'Legs',
  feet: 'Feet',
  boots: 'Feet',
  shoulder: 'Shoulder',
  shoulders: 'Shoulder',
  back: 'Back',
  mainhand: 'MainHand',
  offhand: 'OffHand',
  ring: 'Accessory1',
  necklace: 'Accessory2',
  relic: 'Accessory2',
  weapon: 'MainHand',
  shield: 'OffHand',
};

const MESH_TO_PANEL: Record<string, PanelEquipmentSlot> = {
  head: 'Head',
  body: 'Chest',
  arms: 'Hands',
  legs: 'Legs',
  shoulders: 'Shoulder',
  bag: 'Back',
  sword: 'MainHand',
  axe: 'MainHand',
  hammer: 'MainHand',
  staff: 'MainHand',
  bow: 'MainHand',
  spear: 'MainHand',
  pick: 'MainHand',
  shield: 'OffHand',
};

export function itemToEquipSlot(
  itemId: string,
  item?: { type?: string; slot?: string },
): PanelEquipmentSlot | null {
  if (item?.slot) {
    const mapped = SLOT_FIELD_MAP[item.slot.toLowerCase()];
    if (mapped) return mapped;
  }

  if (item?.type) {
    const type = item.type.toLowerCase();
    if (type === 'weapon') return 'MainHand';
    if (type === 'shield') return 'OffHand';
    if (type === 'armor' || type === 'accessory') {
      const mapped = item.slot ? SLOT_FIELD_MAP[item.slot.toLowerCase()] : null;
      if (mapped) return mapped;
    }
  }

  const mesh = grudaItemToMesh(itemId);
  if (!mesh) return null;
  if (mesh.isWeapon) {
    return mesh.meshSlot === 'shield' ? 'OffHand' : 'MainHand';
  }
  return MESH_TO_PANEL[mesh.meshSlot] ?? null;
}
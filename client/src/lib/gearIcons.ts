export type WeaponType = 'sword' | 'axe' | 'staff' | 'bow';
export type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Variation = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface GearIcon {
  id: string;
  type: WeaponType;
  tier: Tier;
  variation: Variation;
  path: string;
  name: string;
}

const TIER_NAMES: Record<Tier, string> = {
  1: "Rustic",
  2: "Iron",
  3: "Steel",
  4: "Refined",
  5: "Enchanted",
  6: "Mystic",
  7: "Legendary",
  8: "Divine"
};

const VARIATION_NAMES: Record<Variation, string> = {
  1: "Standard",
  2: "Ornate",
  3: "Battle",
  4: "Royal",
  5: "Arcane",
  6: "Shadow",
  7: "Flame"
};

export function getGearIconPath(type: WeaponType, tier: Tier, variation: Variation): string {
  let folder: string;
  if (type === 'staff') folder = 'staves';
  else if (type === 'bow') folder = 'bows';
  else folder = `${type}s`;
  return `/sprites/gear/${folder}/${type}_t${tier}_v${variation}.png`;
}

export function getGearIconName(type: WeaponType, tier: Tier, variation: Variation): string {
  const typeName = type.charAt(0).toUpperCase() + type.slice(1);
  return `${TIER_NAMES[tier]} ${VARIATION_NAMES[variation]} ${typeName}`;
}

export function getAllGearIcons(): GearIcon[] {
  const icons: GearIcon[] = [];
  const types: WeaponType[] = ['sword', 'axe', 'staff', 'bow'];
  
  for (const type of types) {
    const maxVariations = type === 'bow' ? 4 : 7;
    for (let t = 1; t <= 8; t++) {
      const tier = t as Tier;
      for (let v = 1; v <= maxVariations; v++) {
        const variation = v as Variation;
        icons.push({
          id: `${type}_t${tier}_v${variation}`,
          type,
          tier,
          variation,
          path: getGearIconPath(type, tier, variation),
          name: getGearIconName(type, tier, variation)
        });
      }
    }
  }
  
  return icons;
}

export function getGearIconsByType(type: WeaponType): GearIcon[] {
  return getAllGearIcons().filter(icon => icon.type === type);
}

export function getGearIconsByTier(tier: Tier): GearIcon[] {
  return getAllGearIcons().filter(icon => icon.tier === tier);
}

export const GEAR_ICONS = getAllGearIcons();
export const SWORD_ICONS = getGearIconsByType('sword');
export const AXE_ICONS = getGearIconsByType('axe');
export const STAFF_ICONS = getGearIconsByType('staff');
export const BOW_ICONS = getGearIconsByType('bow');

export const TOTAL_GEAR_ICONS = GEAR_ICONS.length;

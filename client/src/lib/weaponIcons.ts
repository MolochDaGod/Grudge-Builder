import { assetUrl } from "@/lib/assetConfig";
export interface WeaponIcon {
  id: string;
  name: string;
  path: string;
  category: string;
}

const WEAPON_CATEGORIES = [
  { start: 0, end: 23, category: "sword", prefix: "Sword" },
  { start: 24, end: 47, category: "dagger", prefix: "Dagger" },
  { start: 48, end: 71, category: "axe", prefix: "Axe" },
  { start: 72, end: 95, category: "mace", prefix: "Mace" },
  { start: 96, end: 119, category: "spear", prefix: "Spear" },
  { start: 120, end: 143, category: "bow", prefix: "Bow" },
  { start: 144, end: 167, category: "staff", prefix: "Staff" },
  { start: 168, end: 191, category: "wand", prefix: "Wand" },
  { start: 192, end: 215, category: "shield", prefix: "Shield" },
  { start: 216, end: 239, category: "hammer", prefix: "Hammer" },
  { start: 240, end: 263, category: "crossbow", prefix: "Crossbow" },
  { start: 264, end: 287, category: "throwing", prefix: "Throwing" },
  { start: 288, end: 311, category: "polearm", prefix: "Polearm" },
  { start: 312, end: 335, category: "claw", prefix: "Claw" },
  { start: 336, end: 359, category: "fist", prefix: "Fist" },
  { start: 360, end: 383, category: "scythe", prefix: "Scythe" },
  { start: 384, end: 407, category: "flail", prefix: "Flail" },
  { start: 408, end: 431, category: "whip", prefix: "Whip" },
  { start: 432, end: 455, category: "boomerang", prefix: "Boomerang" },
  { start: 456, end: 479, category: "misc", prefix: "Misc Weapon" },
];

function getWeaponCategory(index: number): { category: string; prefix: string } {
  for (const cat of WEAPON_CATEGORIES) {
    if (index >= cat.start && index <= cat.end) {
      return { category: cat.category, prefix: cat.prefix };
    }
  }
  return { category: "misc", prefix: "Weapon" };
}

export function generateWeaponIcons(): WeaponIcon[] {
  const icons: WeaponIcon[] = [];
  for (let i = 0; i < 480; i++) {
    const { category, prefix } = getWeaponCategory(i);
    const indexInCategory = i % 24;
    icons.push({
      id: `weapon_${i.toString().padStart(3, '0')}`,
      name: `${prefix} ${indexInCategory + 1}`,
      path: assetUrl(`/sprites/weapons/icons/weapon_${i.toString().padStart(3, '0')}.png`),
      category,
    });
  }
  return icons;
}

export const WEAPON_ICONS = generateWeaponIcons();

export function getWeaponIconsByCategory(category: string): WeaponIcon[] {
  if (category === "all") return WEAPON_ICONS;
  return WEAPON_ICONS.filter(w => w.category === category);
}

export function getWeaponIcon(id: string): WeaponIcon | undefined {
  return WEAPON_ICONS.find(w => w.id === id);
}

export const WEAPON_CATEGORY_LIST = [
  "all", "sword", "dagger", "axe", "mace", "spear", "bow", "staff", "wand",
  "shield", "hammer", "crossbow", "throwing", "polearm", "claw", "fist",
  "scythe", "flail", "whip", "boomerang", "misc"
];

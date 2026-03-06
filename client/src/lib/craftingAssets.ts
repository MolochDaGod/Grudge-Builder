export const ASSET_BASE_PATH = "/2dassets";

export const ASSET_CATEGORIES = {
  weapons: {
    melee: `${ASSET_BASE_PATH}/weapons/melee`,
    ranged: `${ASSET_BASE_PATH}/weapons/ranged`,
    magic: `${ASSET_BASE_PATH}/weapons/magic`,
  },
  armor: {
    cloth: `${ASSET_BASE_PATH}/armor/cloth`,
    leather: `${ASSET_BASE_PATH}/armor/leather`,
    metal: `${ASSET_BASE_PATH}/armor/metal`,
    gem: `${ASSET_BASE_PATH}/armor/gem`,
  },
  professions: `${ASSET_BASE_PATH}/professions`,
  materials: `${ASSET_BASE_PATH}/materials`,
  ui: `${ASSET_BASE_PATH}/ui`,
} as const;

export function getWeaponAssetPath(weaponId: string, category: "melee" | "ranged" | "magic"): string {
  return `${ASSET_CATEGORIES.weapons[category]}/${weaponId}.png`;
}

export function getArmorAssetPath(armorId: string, material: "cloth" | "leather" | "metal" | "gem"): string {
  return `${ASSET_CATEGORIES.armor[material]}/${armorId}.png`;
}

export function getProfessionAssetPath(profession: string): string {
  return `${ASSET_CATEGORIES.professions}/${profession.toLowerCase()}.png`;
}

export function getMaterialAssetPath(materialId: string): string {
  return `${ASSET_CATEGORIES.materials}/${materialId}.png`;
}

export function getUIAssetPath(assetName: string): string {
  return `${ASSET_CATEGORIES.ui}/${assetName}.png`;
}

export function generateAssetSlug(category: string, subtype: string | null, itemId: string): string {
  if (subtype) {
    return `${category}-${subtype}-${itemId}`.toLowerCase().replace(/\s+/g, "-");
  }
  return `${category}-${itemId}`.toLowerCase().replace(/\s+/g, "-");
}

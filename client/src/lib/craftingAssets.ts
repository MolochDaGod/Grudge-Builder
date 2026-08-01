/**
 * Crafting icon paths — production layout on R2 via assetUrl().
 * Legacy /2dassets/* is not on the CDN and 404s in play.
 */
import { assetUrl } from './assetConfig';

export const ASSET_BASE_PATH = "/icons";

export const ASSET_CATEGORIES = {
  weapons: {
    melee: `${ASSET_BASE_PATH}/weapons`,
    ranged: `${ASSET_BASE_PATH}/weapons`,
    magic: `${ASSET_BASE_PATH}/weapons`,
  },
  armor: {
    cloth: `${ASSET_BASE_PATH}/armor`,
    leather: `${ASSET_BASE_PATH}/armor`,
    metal: `${ASSET_BASE_PATH}/armor`,
    gem: `${ASSET_BASE_PATH}/armor`,
  },
  professions: `${ASSET_BASE_PATH}/professions`,
  materials: `${ASSET_BASE_PATH}/materials`,
  ui: `${ASSET_BASE_PATH}/ui`,
} as const;

export function getWeaponAssetPath(weaponId: string, category: "melee" | "ranged" | "magic"): string {
  return assetUrl(`${ASSET_CATEGORIES.weapons[category]}/${weaponId}.png`);
}

export function getArmorAssetPath(armorId: string, material: "cloth" | "leather" | "metal" | "gem"): string {
  return assetUrl(`${ASSET_CATEGORIES.armor[material]}/${armorId}.png`);
}

export function getProfessionAssetPath(profession: string): string {
  return assetUrl(`${ASSET_CATEGORIES.professions}/${profession.toLowerCase()}.png`);
}

export function getMaterialAssetPath(materialId: string): string {
  return assetUrl(`${ASSET_CATEGORIES.materials}/${materialId}.png`);
}

export function getUIAssetPath(assetName: string): string {
  return assetUrl(`${ASSET_CATEGORIES.ui}/${assetName}.png`);
}

export function generateAssetSlug(category: string, subtype: string | null, itemId: string): string {
  if (subtype) {
    return `${category}-${subtype}-${itemId}`.toLowerCase().replace(/\s+/g, "-");
  }
  return `${category}-${itemId}`.toLowerCase().replace(/\s+/g, "-");
}

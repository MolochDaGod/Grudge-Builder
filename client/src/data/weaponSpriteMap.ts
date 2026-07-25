import { assetUrl, resolveIconUrl, getPackIconForCategory } from "@/lib/assetConfig";
import { tomeIconCdnUrl } from "@shared/fleet/uiIcons";

export const WEAPON_SPRITE_MAP: Record<string, string> = {
  "sword-bloodfeud": "bloodfeud_blade",
  "sword-wraithfang": "wraithfang",
  "sword-oathbreaker": "oathbreaker",
  "sword-kinrend": "kinrend",
  "sword-dusksinger": "dusksinger",
  "sword-emberclad": "emberclad",
  
  "axe-gorehowl": "gorehowl",
  "axe-skullsplitter": "skullsplitter",
  "axe-veinreaver": "veinreaver",
  "axe-ironmaw": "ironmaw",
  "axe-dreadcleaver": "dreadcleaver",
  "axe-bonehew": "bonehew",
  
  "dagger-nightfang": "nightfang",
  "dagger-bloodshiv": "bloodshiv",
  "dagger-wraithclaw": "wraithclaw",
  "dagger-emberfang": "emberfang",
  "dagger-ironspike": "ironspike",
  "dagger-duskblade": "duskblade",
  
  "hammer1h-ironfist": "ironfist",
  "hammer1h-bloodmaul": "bloodmaul",
  "hammer1h-wraithknocker": "wraithknocker",
  "hammer1h-embermallet": "embermallet",
  "hammer1h-ironshard": "ironshard_hammer",
  "hammer1h-duskhammer": "duskhammer",
  
  "hammer2h-titanmaul": "titanmaul",
  "hammer2h-bloodcrusher": "bloodcrusher",
  "hammer2h-wraithmaul": "wraithmaul",
  "hammer2h-emberforge": "emberforge",
  "hammer2h-ironbreaker": "ironbreaker",
  "hammer2h-duskmallet": "duskmallet",
  
  "greatsword-doomspire": "doomspire",
  "greatsword-bloodspire": "bloodspire",
  "greatsword-wraithblade": "wraithblade",
  "greatsword-emberbrand": "emberbrand",
  "greatsword-ironwrath": "ironwrath",
  "greatsword-duskreaver": "duskreaver_greatsword",
  
  "greataxe-skullsunder": "skullsunder",
  "greataxe-bloodreaver": "bloodreaver_greataxe",
  "greataxe-wraithhew": "wraithhew",
  "greataxe-embermaul": "embermaul",
  "greataxe-ironrend": "ironrend",
  "greataxe-dusksplitter": "dusksplitter",
  
  "bow-wraithbone": "wraithbone_bow",
  "bow-bloodstring": "bloodstring_bow",
  "bow-shadowflight": "shadowflight_bow",
  "bow-emberthorn": "emberthorn_bow",
  "bow-ironvine": "ironvine_bow",
  "bow-duskreaver": "duskreaver_bow",
  
  "crossbow-ironveil": "ironveil_repeater",
  "crossbow-skullpiercer": "skullpiercer",
  "crossbow-bloodreaver": "bloodreaver_crossbow",
  "crossbow-wraithspike": "wraithspike",
  "crossbow-emberbolt": "emberbolt",
  "crossbow-ironshard": "ironshard_crossbow",
  
  // 6 gun styles — sprite ids align with STYLE_ICON_MATCH + prefab mesh
  "gun-blackpowder": "blackpowder_blaster", // copper / style 1
  "gun-ironstorm": "ironstorm_gun", // silver / style 2
  "gun-emberrifle": "emberrifle", // gold / style 3
  "gun-wraithbarrel": "wraithbarrel", // diamond / style 4
  "gun-duskblaster": "duskblaster", // voxel / style 5
  "gun-bloodcannon": "bloodcannon", // cold_viking / style 6 (mesh TBD)
  "gun_style_copper": "blackpowder_blaster",
  "gun_style_silver": "ironstorm_gun",
  "gun_style_gold": "emberrifle",
  "gun_style_diamond": "wraithbarrel",
  "gun_style_voxel": "duskblaster",
  "gun_style_cold_viking": "bloodcannon",
  
  "staff-fire-emberwrath": "emberwrath_staff",
  "staff-fire-infernal": "infernal_grudge_staff",
  "staff-fire-flameblood": "flameblood_spire",
  "staff-fire-hellfire": "hellfire_oathbreaker",
  "staff-frost-glacial": "glacial_spire_staff",
  "staff-frost-grudge": "frostgrudge_staff",
  "staff-frost-iceblood": "iceblood_spire",
  "staff-frost-frigid": "frigid_oathbreaker",
  "staff-nature-verdant": "verdant_wrath_staff",
  "staff-nature-thorn": "thorngrudge_staff",
  "staff-nature-bloodvine": "bloodvine_spire",
  "staff-nature-wild": "wild_oathbreaker",
  "staff-holy-dawnspire": "dawnspire_staff",
  "staff-holy-lightgrudge": "lightgrudge_staff",
  "staff-holy-bloodlight": "bloodlight_spire",
  "staff-holy-sacred": "sacred_oathbreaker",
  "staff-arcane-voidspire": "voidspire_staff",
  "staff-arcane-voidgrudge": "voidgrudge_staff",
  "staff-arcane-voidblood": "voidblood_spire",
  "staff-arcane-void": "void_oathbreaker",
  "staff-lightning-stormspire": "stormspire_staff",
  "staff-lightning-thundergrudge": "thundergrudge_staff",
  "staff-lightning-stormblood": "stormblood_spire",
  "staff-lightning-storm": "storm_oathbreaker",
};

export const ARMOR_SPRITE_MAP: Record<string, string> = {
  "cloth-bloodfeud-helm": "bloodfeud_helm_cloth",
  "cloth-wraithfang-helm": "wraithfang_helm_cloth",
  "cloth-oathbreaker-helm": "oathbreaker_helm_cloth",
  "cloth-kinrend-helm": "kinrend_helm_cloth",
  "cloth-dusksinger-helm": "dusksinger_helm_cloth",
  "cloth-emberclad-helm": "emberclad_helm_cloth",
  "cloth-bloodfeud-shoulder": "bloodfeud_shoulder_cloth",
  "cloth-wraithfang-shoulder": "wraithfang_shoulder_cloth",
  "cloth-oathbreaker-shoulder": "oathbreaker_shoulder_cloth",
  "cloth-kinrend-shoulder": "kinrend_shoulder_cloth",
  "cloth-dusksinger-shoulder": "dusksinger_shoulder_cloth",
  "cloth-emberclad-shoulder": "emberclad_shoulder_cloth",
  "cloth-bloodfeud-chest": "bloodfeud_chest_cloth",
  "cloth-wraithfang-chest": "wraithfang_chest_cloth",
  "cloth-oathbreaker-chest": "oathbreaker_chest_cloth",
  "cloth-kinrend-chest": "kinrend_chest_cloth",
  "cloth-dusksinger-chest": "dusksinger_chest_cloth",
  "cloth-emberclad-chest": "emberclad_chest_cloth",
  "cloth-bloodfeud-hands": "bloodfeud_hands_cloth",
  "cloth-wraithfang-hands": "wraithfang_hands_cloth",
  "cloth-oathbreaker-hands": "oathbreaker_hands_cloth",
  "cloth-kinrend-hands": "kinrend_hands_cloth",
  "cloth-dusksinger-hands": "dusksinger_hands_cloth",
  "cloth-emberclad-hands": "emberclad_hands_cloth",
  "cloth-bloodfeud-feet": "bloodfeud_feet_cloth",
  "cloth-wraithfang-feet": "wraithfang_feet_cloth",
  "cloth-oathbreaker-feet": "oathbreaker_feet_cloth",
  "cloth-kinrend-feet": "kinrend_feet_cloth",
  "cloth-dusksinger-feet": "dusksinger_feet_cloth",
  "cloth-emberclad-feet": "emberclad_feet_cloth",
  "cloth-bloodfeud-ring": "bloodfeud_ring_cloth",
  "cloth-wraithfang-ring": "wraithfang_ring_cloth",
  "cloth-oathbreaker-ring": "oathbreaker_ring_cloth",
  "cloth-kinrend-ring": "kinrend_ring_cloth",
  "cloth-dusksinger-ring": "dusksinger_ring_cloth",
  "cloth-emberclad-ring": "emberclad_ring_cloth",
  "cloth-bloodfeud-necklace": "bloodfeud_necklace_cloth",
  "cloth-wraithfang-necklace": "wraithfang_necklace_cloth",
  "cloth-oathbreaker-necklace": "oathbreaker_necklace_cloth",
  "cloth-kinrend-necklace": "kinrend_necklace_cloth",
  "cloth-dusksinger-necklace": "dusksinger_necklace_cloth",
  "cloth-emberclad-necklace": "emberclad_necklace_cloth",
  "cloth-bloodfeud-relic": "bloodfeud_relic_cloth",
  "cloth-wraithfang-relic": "wraithfang_relic_cloth",
  "cloth-oathbreaker-relic": "oathbreaker_relic_cloth",
  "cloth-kinrend-relic": "kinrend_relic_cloth",
  "cloth-dusksinger-relic": "dusksinger_relic_cloth",
  "cloth-emberclad-relic": "emberclad_relic_cloth",
  
  "leather-bloodfeud-helm": "bloodfeud_helm_leather",
  "leather-wraithfang-helm": "wraithfang_helm_leather",
  "leather-oathbreaker-helm": "oathbreaker_helm_leather",
  "leather-kinrend-helm": "kinrend_helm_leather",
  "leather-dusksinger-helm": "dusksinger_helm_leather",
  "leather-emberclad-helm": "emberclad_helm_leather",
  "leather-bloodfeud-shoulder": "bloodfeud_shoulder_leather",
  "leather-wraithfang-shoulder": "wraithfang_shoulder_leather",
  "leather-oathbreaker-shoulder": "oathbreaker_shoulder_leather",
  "leather-kinrend-shoulder": "kinrend_shoulder_leather",
  "leather-dusksinger-shoulder": "dusksinger_shoulder_leather",
  "leather-emberclad-shoulder": "emberclad_shoulder_leather",
  "leather-bloodfeud-chest": "bloodfeud_chest_leather",
  "leather-wraithfang-chest": "wraithfang_chest_leather",
  "leather-oathbreaker-chest": "oathbreaker_chest_leather",
  "leather-kinrend-chest": "kinrend_chest_leather",
  "leather-dusksinger-chest": "dusksinger_chest_leather",
  "leather-emberclad-chest": "emberclad_chest_leather",
  "leather-bloodfeud-hands": "bloodfeud_hands_leather",
  "leather-wraithfang-hands": "wraithfang_hands_leather",
  "leather-oathbreaker-hands": "oathbreaker_hands_leather",
  "leather-kinrend-hands": "kinrend_hands_leather",
  "leather-dusksinger-hands": "dusksinger_hands_leather",
  "leather-emberclad-hands": "emberclad_hands_leather",
  "leather-bloodfeud-feet": "bloodfeud_feet_leather",
  "leather-wraithfang-feet": "wraithfang_feet_leather",
  "leather-oathbreaker-feet": "oathbreaker_feet_leather",
  "leather-kinrend-feet": "kinrend_feet_leather",
  "leather-dusksinger-feet": "dusksinger_feet_leather",
  "leather-emberclad-feet": "emberclad_feet_leather",
  "leather-bloodfeud-ring": "bloodfeud_ring_leather",
  "leather-wraithfang-ring": "wraithfang_ring_leather",
  "leather-oathbreaker-ring": "oathbreaker_ring_leather",
  "leather-kinrend-ring": "kinrend_ring_leather",
  "leather-dusksinger-ring": "dusksinger_ring_leather",
  "leather-emberclad-ring": "emberclad_ring_leather",
  "leather-bloodfeud-necklace": "bloodfeud_necklace_leather",
  "leather-wraithfang-necklace": "wraithfang_necklace_leather",
  "leather-oathbreaker-necklace": "oathbreaker_necklace_leather",
  "leather-kinrend-necklace": "kinrend_necklace_leather",
  "leather-dusksinger-necklace": "dusksinger_necklace_leather",
  "leather-emberclad-necklace": "emberclad_necklace_leather",
  "leather-bloodfeud-relic": "bloodfeud_relic_leather",
  "leather-wraithfang-relic": "wraithfang_relic_leather",
  "leather-oathbreaker-relic": "oathbreaker_relic_leather",
  "leather-kinrend-relic": "kinrend_relic_leather",
  "leather-dusksinger-relic": "dusksinger_relic_leather",
  "leather-emberclad-relic": "emberclad_relic_leather",
  
  "metal-bloodfeud-helm": "bloodfeud_helm_metal",
  "metal-wraithfang-helm": "wraithfang_helm_metal",
  "metal-oathbreaker-helm": "oathbreaker_helm_metal",
  "metal-kinrend-helm": "kinrend_helm_metal",
  "metal-dusksinger-helm": "dusksinger_helm_metal",
  "metal-emberclad-helm": "emberclad_helm_metal",
  "metal-bloodfeud-shoulder": "bloodfeud_shoulder_metal",
  "metal-wraithfang-shoulder": "wraithfang_shoulder_metal",
  "metal-oathbreaker-shoulder": "oathbreaker_shoulder_metal",
  "metal-kinrend-shoulder": "kinrend_shoulder_metal",
  "metal-dusksinger-shoulder": "dusksinger_shoulder_metal",
  "metal-emberclad-shoulder": "emberclad_shoulder_metal",
  "metal-bloodfeud-chest": "bloodfeud_chest_metal",
  "metal-wraithfang-chest": "wraithfang_chest_metal",
  "metal-oathbreaker-chest": "oathbreaker_chest_metal",
  "metal-kinrend-chest": "kinrend_chest_metal",
  "metal-dusksinger-chest": "dusksinger_chest_metal",
  "metal-emberclad-chest": "emberclad_chest_metal",
  "metal-bloodfeud-hands": "bloodfeud_hands_metal",
  "metal-wraithfang-hands": "wraithfang_hands_metal",
  "metal-oathbreaker-hands": "oathbreaker_hands_metal",
  "metal-kinrend-hands": "kinrend_hands_metal",
  "metal-dusksinger-hands": "dusksinger_hands_metal",
  "metal-emberclad-hands": "emberclad_hands_metal",
  "metal-bloodfeud-feet": "bloodfeud_feet_metal",
  "metal-wraithfang-feet": "wraithfang_feet_metal",
  "metal-oathbreaker-feet": "oathbreaker_feet_metal",
  "metal-kinrend-feet": "kinrend_feet_metal",
  "metal-dusksinger-feet": "dusksinger_feet_metal",
  "metal-emberclad-feet": "emberclad_feet_metal",
  "metal-bloodfeud-ring": "bloodfeud_ring_metal",
  "metal-wraithfang-ring": "wraithfang_ring_metal",
  "metal-oathbreaker-ring": "oathbreaker_ring_metal",
  "metal-kinrend-ring": "kinrend_ring_metal",
  "metal-dusksinger-ring": "dusksinger_ring_metal",
  "metal-emberclad-ring": "emberclad_ring_metal",
  "metal-bloodfeud-necklace": "bloodfeud_necklace_metal",
  "metal-wraithfang-necklace": "wraithfang_necklace_metal",
  "metal-oathbreaker-necklace": "oathbreaker_necklace_metal",
  "metal-kinrend-necklace": "kinrend_necklace_metal",
  "metal-dusksinger-necklace": "dusksinger_necklace_metal",
  "metal-emberclad-necklace": "emberclad_necklace_metal",
  "metal-bloodfeud-relic": "bloodfeud_relic_metal",
  "metal-wraithfang-relic": "wraithfang_relic_metal",
  "metal-oathbreaker-relic": "oathbreaker_relic_metal",
  "metal-kinrend-relic": "kinrend_relic_metal",
  "metal-dusksinger-relic": "dusksinger_relic_metal",
  "metal-emberclad-relic": "emberclad_relic_metal",
  
  "gem-bloodfeud-ring": "bloodfeud_ring_gem",
  "gem-wraithfang-ring": "wraithfang_ring_gem",
  "gem-oathbreaker-ring": "oathbreaker_ring_gem",
  "gem-kinrend-ring": "kinrend_ring_gem",
  "gem-dusksinger-ring": "dusksinger_ring_gem",
  "gem-emberclad-ring": "emberclad_ring_gem",
  "gem-bloodfeud-necklace": "bloodfeud_necklace_gem",
  "gem-wraithfang-necklace": "wraithfang_necklace_gem",
  "gem-oathbreaker-necklace": "oathbreaker_necklace_gem",
  "gem-kinrend-necklace": "kinrend_necklace_gem",
  "gem-dusksinger-necklace": "dusksinger_necklace_gem",
  "gem-emberclad-necklace": "emberclad_necklace_gem",
  "gem-bloodfeud-relic": "bloodfeud_relic_gem",
  "gem-wraithfang-relic": "wraithfang_relic_gem",
  "gem-oathbreaker-relic": "oathbreaker_relic_gem",
  "gem-kinrend-relic": "kinrend_relic_gem",
  "gem-dusksinger-relic": "dusksinger_relic_gem",
  "gem-emberclad-relic": "emberclad_relic_gem",
};

export function getWeaponSpritePath(weaponId: string, weaponType: string): string {
  const spriteName = WEAPON_SPRITE_MAP[weaponId];
  if (spriteName) {
    return resolveIconUrl(`/icons/weapons/${spriteName}.png`, { weaponType, category: weaponType });
  }
  return getPackIconForCategory({ weaponType, category: weaponType });
}

/**
 * Resolve icon for a production weapon style so UI matches 3D mesh palette.
 * Prefer named sprite; fall back to pack icon path from STYLE_ICON_MATCH.
 */
export function getGunStyleIconPath(styleId: string): string {
  const key = `gun_style_${styleId}`;
  const sprite = WEAPON_SPRITE_MAP[key];
  if (sprite) {
    return resolveIconUrl(`/icons/weapons/${sprite}.png`, {
      weaponType: 'Gun',
      category: 'guns',
    });
  }
  const packKey = `gun_${styleId}`;
  return getPackIconForCategory({ weaponType: 'Gun', category: packKey });
}

export function getArmorSpritePath(armorId: string, slot: string, material: string): string {
  const spriteName = ARMOR_SPRITE_MAP[armorId];
  if (spriteName) {
    return assetUrl(`/icons/armor/${slot.toLowerCase()}/${spriteName}.png`);
  }
  return getDefaultArmorSprite(slot, material);
}

function getWeaponTypeFolder(weaponType: string): string {
  const folderMap: Record<string, string> = {
    "Sword": "swords",
    "Axe": "axes",
    "Dagger": "daggers",
    "Hammer1h": "hammers",
    "Hammer2h": "hammers",
    "Greatsword": "greatswords",
    "Greataxe": "greataxes",
    "Bow": "bows",
    "Crossbow": "crossbows",
    "Gun": "guns",
    "Fire Staff": "staves/fire",
    "Frost Staff": "staves/frost",
    "Nature Staff": "staves/nature",
    "Holy Staff": "staves/holy",
    "Arcane Staff": "staves/arcane",
    "Lightning Staff": "staves/lightning",
    "Fire Tome": "tomes/fire",
    "Frost Tome": "tomes/frost",
    "Nature Tome": "tomes/nature",
    "Holy Tome": "tomes/holy",
    "Arcane Tome": "tomes/arcane",
    "Lightning Tome": "tomes/lightning",
  };
  return folderMap[weaponType] || "misc";
}

function getDefaultWeaponSprite(weaponType: string): string {
  return getPackIconForCategory({ weaponType, category: weaponType });
}

function getDefaultArmorSprite(slot: string, material: string): string {
  return assetUrl(`/icons/armor/${slot.toLowerCase()}/${material.toLowerCase()}/default.png`);
}

/** Element tome icons — R2 CDN (icons/tomes/*). Upload via scripts/upload-ui-icons-to-r2.mjs */
export const TOME_ICON_BY_ELEMENT: Record<string, string> = {
  fire: tomeIconCdnUrl("fire"),
  frost: tomeIconCdnUrl("frost"),
  nature: tomeIconCdnUrl("nature"),
  holy: tomeIconCdnUrl("holy"),
  arcane: tomeIconCdnUrl("arcane"),
  lightning: tomeIconCdnUrl("lightning"),
};

/** Resolve a tome's element from a weapon type ("Fire Tome") or item name ("Blazewrath Grimoire"). */
export function getTomeElement(weaponTypeOrName: string): string | null {
  const s = (weaponTypeOrName || "").toLowerCase();
  if (s.includes("fire") || s.includes("inferno") || s.includes("blaze") || s.includes("ember") || s.includes("flame")) return "fire";
  if (s.includes("frost") || s.includes("ice") || s.includes("glacier") || s.includes("frigid")) return "frost";
  if (s.includes("nature") || s.includes("verdant") || s.includes("growth") || s.includes("thorn") || s.includes("bloom")) return "nature";
  if (s.includes("lightning") || s.includes("storm") || s.includes("thunder") || s.includes("bolt") || s.includes("shock")) return "lightning";
  if (s.includes("arcane") || s.includes("void") || s.includes("ether") || s.includes("aether")) return "arcane";
  if (s.includes("holy") || s.includes("dawn") || s.includes("grace") || s.includes("sacred") || s.includes("divine") || s.includes("light")) return "holy";
  return null;
}

/** Local PNG icon for a tome by weapon type or item name. Returns null when the item is not a tome. */
export function getTomeIconPath(weaponTypeOrName: string): string | null {
  const s = (weaponTypeOrName || "").toLowerCase();
  if (!s.includes("tome") && !s.includes("grimoire")) return null;
  const el = getTomeElement(s);
  return el ? TOME_ICON_BY_ELEMENT[el] : null;
}

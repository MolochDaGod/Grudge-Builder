/**
 * Grudge Item Database
 *
 * ObjectStore is the single source of truth for items, recipes, and professions.
 * The procedural generation below is FALLBACK ONLY — used when ObjectStore is unreachable.
 * syncItemsFromObjectStore() replaces ITEMS/RECIPES with canonical data on app init.
 */

import { WEAPON_SPRITE_MAP, ARMOR_SPRITE_MAP, getWeaponSpritePath, getArmorSpritePath } from '@/data/weaponSpriteMap';
import { assetUrl } from "@/lib/assetConfig";
import { fetchItemsDatabase, fetchProfessions, fetchWeapons, fetchArmor } from "@/lib/objectStoreApi";

export interface GrudaItem {
  id: string;
  name: string;
  type: string; // Weapon, Armor, Accessory, Resource
  slot?: string;
  rarity: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
  tier: number;
  stats: Record<string, number>;
  effects?: string[];
  skills?: string[]; // New: Weapon skills
  image?: string; // New: Item icon path
  description?: string;
  buyPrice?: number;
  sellPrice?: number;
  craftingProfession?: string;
  craftingLevel?: number;
  resources?: Record<string, number>; // For crafting
  weaponId?: string; // Links to weapon data for sprite mapping
  armorId?: string; // Links to armor data for sprite mapping
  weaponType?: string; // Weapon type for sprite folder selection
  material?: string; // Armor material for sprite selection
}

// Helper to resolve icon path using parsed gear sprites
export const resolveItemImage = (item: Partial<GrudaItem>): string => {
  const tier = Math.min(Math.max(item.tier || 1, 1), 8) as 1|2|3|4|5|6|7|8;

  // Check for weapon ID mapping first (priority over name-based)
  if (item.weaponId && WEAPON_SPRITE_MAP[item.weaponId]) {
    return getWeaponSpritePath(item.weaponId, item.weaponType || '');
  }
  
  // Check for armor ID mapping
  if (item.armorId && ARMOR_SPRITE_MAP[item.armorId]) {
    return getArmorSpritePath(item.armorId, item.slot || '', item.material || '');
  }

  // Fallback to name-based weapon matching using specific weapon names
  const weaponName = item.name?.toLowerCase() || "";
  
  // Swords - specific names
  if (weaponName.includes("bloodfeud blade")) return assetUrl(`/icons/weapons/swords/bloodfeud_blade.png`);
  if (weaponName.includes("wraithfang") && !weaponName.includes("helm") && !weaponName.includes("chest")) return assetUrl(`/icons/weapons/swords/wraithfang.png`);
  if (weaponName.includes("oathbreaker") && !weaponName.includes("helm") && !weaponName.includes("staff")) return assetUrl(`/icons/weapons/swords/oathbreaker.png`);
  if (weaponName.includes("kinrend") && !weaponName.includes("helm")) return assetUrl(`/icons/weapons/swords/kinrend.png`);
  if (weaponName.includes("dusksinger") && !weaponName.includes("helm")) return assetUrl(`/icons/weapons/swords/dusksinger.png`);
  if (weaponName.includes("emberclad") && !weaponName.includes("helm") && !weaponName.includes("chest")) return assetUrl(`/icons/weapons/swords/emberclad.png`);
  
  // Axes - specific names
  if (weaponName.includes("gorehowl")) return assetUrl(`/icons/weapons/axes/gorehowl.png`);
  if (weaponName.includes("skullsplitter")) return assetUrl(`/icons/weapons/axes/skullsplitter.png`);
  if (weaponName.includes("veinreaver")) return assetUrl(`/icons/weapons/axes/veinreaver.png`);
  if (weaponName.includes("ironmaw")) return assetUrl(`/icons/weapons/axes/ironmaw.png`);
  if (weaponName.includes("dreadcleaver")) return assetUrl(`/icons/weapons/axes/dreadcleaver.png`);
  if (weaponName.includes("bonehew")) return assetUrl(`/icons/weapons/axes/bonehew.png`);
  
  // Daggers - specific names
  if (weaponName.includes("nightfang")) return assetUrl(`/icons/weapons/daggers/nightfang.png`);
  if (weaponName.includes("bloodshiv")) return assetUrl(`/icons/weapons/daggers/bloodshiv.png`);
  if (weaponName.includes("wraithclaw")) return assetUrl(`/icons/weapons/daggers/wraithclaw.png`);
  if (weaponName.includes("emberfang")) return assetUrl(`/icons/weapons/daggers/emberfang.png`);
  if (weaponName.includes("ironspike")) return assetUrl(`/icons/weapons/daggers/ironspike.png`);
  if (weaponName.includes("duskblade")) return assetUrl(`/icons/weapons/daggers/duskblade.png`);
  
  // Hammers 1H - specific names
  if (weaponName.includes("ironfist")) return assetUrl(`/icons/weapons/hammers/ironfist.png`);
  if (weaponName.includes("bloodmaul") && !weaponName.includes("2h")) return assetUrl(`/icons/weapons/hammers/bloodmaul.png`);
  if (weaponName.includes("wraithknocker")) return assetUrl(`/icons/weapons/hammers/wraithknocker.png`);
  if (weaponName.includes("embermallet")) return assetUrl(`/icons/weapons/hammers/embermallet.png`);
  if (weaponName.includes("ironshard") && weaponName.includes("hammer")) return assetUrl(`/icons/weapons/hammers/ironshard.png`);
  if (weaponName.includes("duskhammer")) return assetUrl(`/icons/weapons/hammers/duskhammer.png`);
  
  // Hammers 2H - specific names
  if (weaponName.includes("titanmaul")) return assetUrl(`/icons/weapons/hammers/titanmaul.png`);
  if (weaponName.includes("bloodcrusher")) return assetUrl(`/icons/weapons/hammers/bloodcrusher.png`);
  if (weaponName.includes("wraithmaul")) return assetUrl(`/icons/weapons/hammers/wraithmaul.png`);
  if (weaponName.includes("emberforge")) return assetUrl(`/icons/weapons/hammers/emberforge.png`);
  if (weaponName.includes("ironbreaker")) return assetUrl(`/icons/weapons/hammers/ironbreaker.png`);
  if (weaponName.includes("duskmallet")) return assetUrl(`/icons/weapons/hammers/duskmallet.png`);
  
  // Greatswords - specific names
  if (weaponName.includes("doomspire") && !weaponName.includes("staff")) return assetUrl(`/icons/weapons/greatswords/doomspire.png`);
  if (weaponName.includes("bloodspire") && !weaponName.includes("staff")) return assetUrl(`/icons/weapons/greatswords/bloodspire.png`);
  if (weaponName.includes("wraithblade")) return assetUrl(`/icons/weapons/greatswords/wraithblade.png`);
  if (weaponName.includes("emberbrand")) return assetUrl(`/icons/weapons/greatswords/emberbrand.png`);
  if (weaponName.includes("ironwrath")) return assetUrl(`/icons/weapons/greatswords/ironwrath.png`);
  if (weaponName.includes("duskreaver") && !weaponName.includes("bow")) return assetUrl(`/icons/weapons/greatswords/duskreaver.png`);
  
  // Greataxes - specific names
  if (weaponName.includes("skullsunder")) return assetUrl(`/icons/weapons/greataxes/skullsunder.png`);
  if (weaponName.includes("bloodreaver") && !weaponName.includes("crossbow")) return assetUrl(`/icons/weapons/greataxes/bloodreaver.png`);
  if (weaponName.includes("wraithhew")) return assetUrl(`/icons/weapons/greataxes/wraithhew.png`);
  if (weaponName.includes("embermaul")) return assetUrl(`/icons/weapons/greataxes/embermaul.png`);
  if (weaponName.includes("ironrend")) return assetUrl(`/icons/weapons/greataxes/ironrend.png`);
  if (weaponName.includes("dusksplitter")) return assetUrl(`/icons/weapons/greataxes/dusksplitter.png`);
  
  // Bows - specific names
  if (weaponName.includes("wraithbone bow")) return assetUrl(`/icons/weapons/bows/wraithbone_bow.png`);
  if (weaponName.includes("bloodstring bow")) return assetUrl(`/icons/weapons/bows/bloodstring_bow.png`);
  if (weaponName.includes("shadowflight bow")) return assetUrl(`/icons/weapons/bows/shadowflight_bow.png`);
  if (weaponName.includes("emberthorn bow")) return assetUrl(`/icons/weapons/bows/emberthorn_bow.png`);
  if (weaponName.includes("ironvine bow")) return assetUrl(`/icons/weapons/bows/ironvine_bow.png`);
  if (weaponName.includes("duskreaver bow")) return assetUrl(`/icons/weapons/bows/duskreaver_bow.png`);
  
  // Crossbows - specific names
  if (weaponName.includes("ironveil repeater")) return assetUrl(`/icons/weapons/crossbows/ironveil_repeater.png`);
  if (weaponName.includes("skullpiercer")) return assetUrl(`/icons/weapons/crossbows/skullpiercer.png`);
  if (weaponName.includes("bloodreaver") && weaponName.includes("crossbow")) return assetUrl(`/icons/weapons/crossbows/bloodreaver.png`);
  if (weaponName.includes("wraithspike")) return assetUrl(`/icons/weapons/crossbows/wraithspike.png`);
  if (weaponName.includes("emberbolt")) return assetUrl(`/icons/weapons/crossbows/emberbolt.png`);
  if (weaponName.includes("ironshard") && !weaponName.includes("hammer")) return assetUrl(`/icons/weapons/crossbows/ironshard.png`);
  
  // Guns - specific names
  if (weaponName.includes("blackpowder blaster")) return assetUrl(`/icons/weapons/guns/blackpowder_blaster.png`);
  if (weaponName.includes("ironstorm gun")) return assetUrl(`/icons/weapons/guns/ironstorm_gun.png`);
  if (weaponName.includes("bloodcannon")) return assetUrl(`/icons/weapons/guns/bloodcannon.png`);
  if (weaponName.includes("wraithbarrel")) return assetUrl(`/icons/weapons/guns/wraithbarrel.png`);
  if (weaponName.includes("emberrifle")) return assetUrl(`/icons/weapons/guns/emberrifle.png`);
  if (weaponName.includes("duskblaster")) return assetUrl(`/icons/weapons/guns/duskblaster.png`);
  
  // Staves - Fire
  if (weaponName.includes("emberwrath staff")) return assetUrl(`/icons/weapons/staves/emberwrath_staff.png`);
  if (weaponName.includes("infernal grudge staff")) return assetUrl(`/icons/weapons/staves/infernal_grudge_staff.png`);
  if (weaponName.includes("flameblood spire")) return assetUrl(`/icons/weapons/staves/flameblood_spire.png`);
  if (weaponName.includes("hellfire oathbreaker")) return assetUrl(`/icons/weapons/staves/hellfire_oathbreaker.png`);
  
  // Staves - Frost
  if (weaponName.includes("glacial spire staff")) return assetUrl(`/icons/weapons/staves/glacial_spire_staff.png`);
  if (weaponName.includes("frostgrudge staff")) return assetUrl(`/icons/weapons/staves/frostgrudge_staff.png`);
  if (weaponName.includes("iceblood spire")) return assetUrl(`/icons/weapons/staves/iceblood_spire.png`);
  if (weaponName.includes("frigid oathbreaker")) return assetUrl(`/icons/weapons/staves/frigid_oathbreaker.png`);
  
  // Staves - Nature
  if (weaponName.includes("verdant wrath staff")) return assetUrl(`/icons/weapons/staves/verdant_wrath_staff.png`);
  if (weaponName.includes("thorngrudge staff")) return assetUrl(`/icons/weapons/staves/thorngrudge_staff.png`);
  if (weaponName.includes("bloodvine spire")) return assetUrl(`/icons/weapons/staves/bloodvine_spire.png`);
  if (weaponName.includes("wild oathbreaker")) return assetUrl(`/icons/weapons/staves/wild_oathbreaker.png`);
  
  // Staves - Holy
  if (weaponName.includes("dawnspire staff")) return assetUrl(`/icons/weapons/staves/dawnspire_staff.png`);
  if (weaponName.includes("lightgrudge staff")) return assetUrl(`/icons/weapons/staves/lightgrudge_staff.png`);
  if (weaponName.includes("bloodlight spire")) return assetUrl(`/icons/weapons/staves/bloodlight_spire.png`);
  if (weaponName.includes("sacred oathbreaker")) return assetUrl(`/icons/weapons/staves/sacred_oathbreaker.png`);
  
  // Staves - Arcane
  if (weaponName.includes("voidspire staff")) return assetUrl(`/icons/weapons/staves/voidspire_staff.png`);
  if (weaponName.includes("voidgrudge staff")) return assetUrl(`/icons/weapons/staves/voidgrudge_staff.png`);
  if (weaponName.includes("voidblood spire")) return assetUrl(`/icons/weapons/staves/voidblood_spire.png`);
  if (weaponName.includes("void oathbreaker")) return assetUrl(`/icons/weapons/staves/void_oathbreaker.png`);
  
  // Staves - Lightning
  if (weaponName.includes("stormspire staff")) return assetUrl(`/icons/weapons/staves/stormspire_staff.png`);
  if (weaponName.includes("thundergrudge staff")) return assetUrl(`/icons/weapons/staves/thundergrudge_staff.png`);
  if (weaponName.includes("stormblood spire")) return assetUrl(`/icons/weapons/staves/stormblood_spire.png`);
  if (weaponName.includes("storm oathbreaker")) return assetUrl(`/icons/weapons/staves/storm_oathbreaker.png`);

  // Generic fallbacks based on weapon type
  if (item.name?.includes("Sword")) return assetUrl(`/icons/weapons/swords/sword_t${tier}.png`);
  if (item.name?.includes("Axe") && item.type === "Weapon") {
    const n = item.name?.toLowerCase() || "";
    const is1h = n.includes("1h") || n.includes("one-hand") || n.includes("hatchet") || n.includes("throwing");
    return assetUrl(`/icons/weapons/axes/axe${is1h ? "1h" : "2h"}_t${tier}.png`);
  }
  if (item.name?.includes("Crossbow")) return assetUrl(`/icons/weapons/crossbows/crossbow_t${tier}.png`);
  if (item.name?.includes("Tome") || item.name?.includes("Book") || item.name?.includes("Grimoire")) return assetUrl(`/icons/weapons/tomes/tome_t${tier}.png`);
  if (item.name?.includes("Hammer") || item.name?.includes("Mallet")) {
    const n = item.name?.toLowerCase() || "";
    const is1h = n.includes("1h") || n.includes("one-hand") || n.includes("mallet") || !n.includes("2h");
    return assetUrl(`/icons/weapons/hammers/hammer${is1h ? "1h" : "2h"}_t${tier}.png`);
  }
  if (item.name?.includes("Shield") || item.name?.includes("Buckler")) return assetUrl(`/icons/weapons/shields/shield_t${tier}.png`);
  if (item.name?.includes("Ring") || item.name?.includes("Band") || item.name?.includes("Signet")) return assetUrl(`/icons/armor/rings/ring_t${tier}.png`);
  if (item.name?.includes("Necklace") || item.name?.includes("Amulet") || item.name?.includes("Pendant") || item.name?.includes("Chain")) return assetUrl(`/icons/armor/necklaces/necklace_t${tier}.png`);
  if (item.name?.includes("Ore") || item.name?.includes("Stone") || item.name?.includes("Rock")) return assetUrl(`/icons/resources/mining/ore_t${Math.min(tier, 6)}.png`);
  if (item.name?.includes("Bar") || item.name?.includes("Ingot")) return assetUrl(`/icons/resources/metals/bar_t${Math.min(tier, 6)}.png`);
  if (item.name?.includes("Gem") || item.name?.includes("Crystal") || item.name?.includes("Jewel")) {
    const n = item.name?.toLowerCase() || "";
    if (n.includes("ruby") || n.includes("red") || n.includes("fire")) return assetUrl(`/icons/resources/gems/gem_red.png`);
    if (n.includes("sapphire") || n.includes("blue") || n.includes("water")) return assetUrl(`/icons/resources/gems/gem_blue.png`);
    if (n.includes("emerald") || n.includes("green") || n.includes("earth")) return assetUrl(`/icons/resources/gems/gem_green.png`);
    if (n.includes("amethyst") || n.includes("purple") || n.includes("shadow")) return assetUrl(`/icons/resources/gems/gem_purple.png`);
    if (n.includes("topaz") || n.includes("orange") || n.includes("amber")) return assetUrl(`/icons/resources/gems/gem_orange.png`);
    return assetUrl(`/icons/resources/gems/gem_blue.png`);
  }
  if (item.name?.includes("Log") && !item.name?.includes("Logs")) return assetUrl(`/icons/resources/logging/log.png`);
  if (item.name?.includes("Logs") || item.name?.includes("Lumber")) return assetUrl(`/icons/resources/logging/logs.png`);
  if (item.name?.includes("Plank") || item.name?.includes("Board")) return assetUrl(`/icons/resources/logging/plank.png`);
  if (item.name?.includes("Branch")) return assetUrl(`/icons/resources/logging/branch.png`);
  if (item.name?.includes("Twig") || item.name?.includes("Sprout")) return assetUrl(`/icons/resources/logging/twig.png`);
  if (item.name?.includes("Root")) return assetUrl(`/icons/resources/logging/root.png`);
  if (item.name?.includes("Nut") || item.name?.includes("Acorn")) return assetUrl(`/icons/resources/logging/nut.png`);
  if (item.name?.includes("Hemp") || item.name?.includes("Fiber")) return assetUrl(`/icons/resources/logging/hemp.png`);
  // Food items
  if (item.name?.includes("Apple")) return assetUrl(`/icons/resources/food/apple.png`);
  if (item.name?.includes("Mango")) return assetUrl(`/icons/resources/food/mango.png`);
  if (item.name?.includes("Banana")) return assetUrl(`/icons/resources/food/banana.png`);
  if (item.name?.includes("Grapes") || item.name?.includes("Grape")) return assetUrl(`/icons/resources/food/grapes.png`);
  if (item.name?.includes("Carrot")) return assetUrl(`/icons/resources/food/carrot.png`);
  if (item.name?.includes("Mushroom")) return assetUrl(`/icons/resources/food/mushroom.png`);
  if (item.name?.includes("Wheat") || item.name?.includes("Grain")) return assetUrl(`/icons/resources/food/wheat.png`);
  if (item.name?.includes("Bread") || item.name?.includes("Loaf")) return assetUrl(`/icons/resources/food/bread.png`);
  if (item.name?.includes("Croissant") || item.name?.includes("Pastry")) return assetUrl(`/icons/resources/food/croissant.png`);
  if (item.name?.includes("Cheese")) return assetUrl(`/icons/resources/food/cheese.png`);
  if (item.name?.includes("Ham") || item.name?.includes("Pork")) return assetUrl(`/icons/resources/food/ham.png`);
  if (item.name?.includes("Steak") && item.name?.includes("Cooked")) return assetUrl(`/icons/resources/food/steak_cooked.png`);
  if (item.name?.includes("Steak") && item.name?.includes("Rare")) return assetUrl(`/icons/resources/food/steak_rare.png`);
  if (item.name?.includes("Steak") || item.name?.includes("Beef")) return assetUrl(`/icons/resources/food/steak_raw.png`);
  if (item.name?.includes("Meat") || item.name?.includes("Raw Meat")) return assetUrl(`/icons/resources/food/meat_raw.png`);
  if (item.name?.includes("Crab")) return assetUrl(`/icons/resources/food/crab.png`);
  if (item.name?.includes("Squid") || item.name?.includes("Octopus")) return assetUrl(`/icons/resources/food/squid.png`);
  if (item.name?.includes("Salmon") || item.name?.includes("Red Fish")) return assetUrl(`/icons/resources/food/fish_red.png`);
  if (item.name?.includes("Fish")) return assetUrl(`/icons/resources/food/fish_silver.png`);
  if (item.name?.includes("Beer") || item.name?.includes("Ale") || item.name?.includes("Mead")) return assetUrl(`/icons/resources/food/beer.png`);
  // Metal Shoulders
  if ((item.name?.includes("Shoulder") || item.name?.includes("Pauldron")) && (item.name?.includes("Metal") || item.name?.includes("Plate") || item.name?.includes("Iron") || item.name?.includes("Steel"))) {
    return assetUrl(`/icons/armor/shoulders/metal/shoulder_t${Math.min(tier, 8)}.png`);
  }
  // Leather Shoulders
  if ((item.name?.includes("Shoulder") || item.name?.includes("Pauldron")) && (item.name?.includes("Leather") || item.name?.includes("Hide") || item.name?.includes("Scout") || item.name?.includes("Ranger"))) {
    return assetUrl(`/icons/armor/shoulders/leather/shoulder_t${Math.min(tier, 8)}.png`);
  }
  // Cloth Legs
  if ((item.name?.includes("Pants") || item.name?.includes("Leggings") || item.name?.includes("Robes") || item.name?.includes("Breeches")) && (item.name?.includes("Cloth") || item.name?.includes("Mage") || item.name?.includes("Mystic") || item.name?.includes("Acolyte"))) {
    return assetUrl(`/icons/armor/legs/cloth/pants_t${Math.min(tier, 8)}.png`);
  }
  // Leather Legs
  if ((item.name?.includes("Pants") || item.name?.includes("Leggings") || item.name?.includes("Breeches")) && (item.name?.includes("Leather") || item.name?.includes("Hide") || item.name?.includes("Scout") || item.name?.includes("Ranger") || item.name?.includes("Hunter"))) {
    return assetUrl(`/icons/armor/legs/leather/pants_t${Math.min(tier, 8)}.png`);
  }
  // Metal Legs
  if ((item.name?.includes("Pants") || item.name?.includes("Leggings") || item.name?.includes("Legplates") || item.name?.includes("Greaves") || item.name?.includes("Legguards")) && (item.name?.includes("Metal") || item.name?.includes("Plate") || item.name?.includes("Iron") || item.name?.includes("Steel") || item.name?.includes("Knight") || item.name?.includes("Crusader"))) {
    return assetUrl(`/icons/armor/legs/metal/pants_t${Math.min(tier, 8)}.png`);
  }
  // Leather Helms
  if ((item.name?.includes("Helm") || item.name?.includes("Hat") || item.name?.includes("Hood") || item.name?.includes("Cap")) && (item.name?.includes("Leather") || item.name?.includes("Hide") || item.name?.includes("Scout") || item.name?.includes("Ranger") || item.name?.includes("Hunter"))) {
    return assetUrl(`/icons/armor/helms/leather/helm_t${Math.min(tier, 8)}.png`);
  }
  // Metal Helms
  if ((item.name?.includes("Helm") || item.name?.includes("Helmet") || item.name?.includes("Greathelm") || item.name?.includes("Visor")) && (item.name?.includes("Metal") || item.name?.includes("Plate") || item.name?.includes("Iron") || item.name?.includes("Steel") || item.name?.includes("Knight") || item.name?.includes("Crusader"))) {
    return assetUrl(`/icons/armor/helms/metal/helm_t${Math.min(tier, 8)}.png`);
  }
  // Cloth Helms
  if ((item.name?.includes("Hood") || item.name?.includes("Cowl") || item.name?.includes("Bandana") || item.name?.includes("Cap")) && (item.name?.includes("Cloth") || item.name?.includes("Mage") || item.name?.includes("Mystic") || item.name?.includes("Acolyte") || item.name?.includes("Wizard"))) {
    return assetUrl(`/icons/armor/helms/cloth/helm_t${Math.min(tier, 8)}.png`);
  }
  // Cloth Hands
  if ((item.name?.includes("Gloves") || item.name?.includes("Wraps") || item.name?.includes("Mitts")) && (item.name?.includes("Cloth") || item.name?.includes("Mage") || item.name?.includes("Mystic") || item.name?.includes("Acolyte") || item.name?.includes("Wizard"))) {
    return assetUrl(`/icons/armor/hands/cloth/gloves_t${Math.min(tier, 8)}.png`);
  }
  // Leather Hands
  if ((item.name?.includes("Gloves") || item.name?.includes("Wraps") || item.name?.includes("Mitts")) && (item.name?.includes("Leather") || item.name?.includes("Hide") || item.name?.includes("Scout") || item.name?.includes("Ranger") || item.name?.includes("Hunter"))) {
    return assetUrl(`/icons/armor/hands/leather/gloves_t${Math.min(tier, 8)}.png`);
  }
  // Metal Hands
  if ((item.name?.includes("Gauntlets") || item.name?.includes("Gloves") || item.name?.includes("Vambraces")) && (item.name?.includes("Metal") || item.name?.includes("Plate") || item.name?.includes("Iron") || item.name?.includes("Steel") || item.name?.includes("Knight") || item.name?.includes("Crusader"))) {
    return assetUrl(`/icons/armor/hands/metal/gloves_t${Math.min(tier, 8)}.png`);
  }
  // Cloth Chest
  if ((item.name?.includes("Robe") || item.name?.includes("Tunic") || item.name?.includes("Vest") || item.name?.includes("Chest")) && (item.name?.includes("Cloth") || item.name?.includes("Mage") || item.name?.includes("Mystic") || item.name?.includes("Acolyte") || item.name?.includes("Wizard"))) {
    return assetUrl(`/icons/armor/chest/cloth/chest_t${Math.min(tier, 8)}.png`);
  }
  // Leather Chest
  if ((item.name?.includes("Vest") || item.name?.includes("Tunic") || item.name?.includes("Jerkin") || item.name?.includes("Chest")) && (item.name?.includes("Leather") || item.name?.includes("Hide") || item.name?.includes("Scout") || item.name?.includes("Ranger") || item.name?.includes("Hunter"))) {
    return assetUrl(`/icons/armor/chest/leather/chest_t${Math.min(tier, 8)}.png`);
  }
  // Metal Chest
  if ((item.name?.includes("Chestplate") || item.name?.includes("Breastplate") || item.name?.includes("Cuirass") || item.name?.includes("Chest")) && (item.name?.includes("Metal") || item.name?.includes("Plate") || item.name?.includes("Iron") || item.name?.includes("Steel") || item.name?.includes("Knight") || item.name?.includes("Crusader"))) {
    return assetUrl(`/icons/armor/chest/metal/chest_t${Math.min(tier, 8)}.png`);
  }
  // Leather Boots
  if ((item.name?.includes("Boots") || item.name?.includes("Shoes") || item.name?.includes("Treads")) && (item.name?.includes("Leather") || item.name?.includes("Hide") || item.name?.includes("Scout") || item.name?.includes("Ranger") || item.name?.includes("Hunter"))) {
    return assetUrl(`/icons/armor/boots/leather/boots_t${Math.min(tier, 8)}.png`);
  }
  // Cloth Boots
  if ((item.name?.includes("Boots") || item.name?.includes("Shoes") || item.name?.includes("Slippers") || item.name?.includes("Sandals")) && (item.name?.includes("Cloth") || item.name?.includes("Mage") || item.name?.includes("Mystic") || item.name?.includes("Acolyte") || item.name?.includes("Wizard"))) {
    return assetUrl(`/icons/armor/boots/cloth/boots_t${Math.min(tier, 8)}.png`);
  }
  // Metal Boots
  if ((item.name?.includes("Boots") || item.name?.includes("Sabatons") || item.name?.includes("Greaves")) && (item.name?.includes("Metal") || item.name?.includes("Plate") || item.name?.includes("Iron") || item.name?.includes("Steel") || item.name?.includes("Knight") || item.name?.includes("Crusader"))) {
    return assetUrl(`/icons/armor/boots/metal/boots_t${Math.min(tier, 8)}.png`);
  }
  // Back Slot - Capes
  if (item.name?.includes("Cape")) {
    return assetUrl(`/icons/armor/back/cape_t${Math.min(tier, 5)}.png`);
  }
  // Back Slot - Cloaks
  if (item.name?.includes("Cloak")) {
    return assetUrl(`/icons/armor/back/cloak_t${Math.min(tier, 6)}.png`);
  }
  // Back Slot - Mantles
  if (item.name?.includes("Mantle")) {
    return assetUrl(`/icons/armor/back/mantle_t${Math.min(tier, 2)}.png`);
  }
  // Back Slot - Fur Cloaks
  if (item.name?.includes("Fur") && (item.name?.includes("Cloak") || item.name?.includes("Cape") || item.name?.includes("Back"))) {
    return assetUrl(`/icons/armor/back/fur_t${Math.min(tier, 3)}.png`);
  }
  // Coins
  if (item.name?.includes("Coin") || item.name?.includes("Currency")) {
    const n = item.name?.toLowerCase() || "";
    if (n.includes("gold")) return assetUrl(`/icons/items/coins/gold_coin.png`);
    if (n.includes("silver")) return assetUrl(`/icons/items/coins/silver_coin.png`);
    if (n.includes("bronze") || n.includes("copper")) return assetUrl(`/icons/items/coins/bronze_coin.png`);
    if (n.includes("crown")) return assetUrl(`/icons/items/coins/crown_coin.png`);
    return assetUrl(`/icons/items/coins/gold_coin.png`);
  }
  // Totems
  if (item.name?.includes("Totem")) {
    return assetUrl(`/icons/items/totems/totem_${Math.min(tier, 4)}.png`);
  }
  // Runic Tablets
  if (item.name?.includes("Tablet") || item.name?.includes("Runic") || item.name?.includes("Rune Stone")) {
    return assetUrl(`/icons/items/tablets/tablet_t${Math.min(tier, 12)}.png`);
  }
  // Relics
  if (item.name?.includes("Relic") || item.name?.includes("Artifact")) {
    const n = item.name?.toLowerCase() || "";
    if (n.includes("ancient")) return assetUrl(`/icons/items/relics/ancient_relic.png`);
    if (n.includes("artifact")) return assetUrl(`/icons/items/relics/artifact.png`);
    return assetUrl(`/icons/items/relics/relic_${Math.min(tier, 8)}.png`);
  }
  // Quest Items
  if (item.name?.includes("Quest") || item.type === "quest") {
    return assetUrl(`/icons/items/quest/quest_${Math.min(tier, 10)}.png`);
  }
  // Spell Orbs
  if (item.name?.includes("Orb")) {
    const n = item.name?.toLowerCase() || "";
    if (n.includes("fire")) return assetUrl(`/icons/items/spells/fire_orb.png`);
    if (n.includes("ice") || n.includes("frost")) return assetUrl(`/icons/items/spells/ice_orb.png`);
    if (n.includes("holy") || n.includes("divine")) return assetUrl(`/icons/items/spells/holy_orb.png`);
    if (n.includes("light")) return assetUrl(`/icons/items/spells/light_orb_1.png`);
    return assetUrl(`/icons/items/spells/fire_orb.png`);
  }
  // Crystals
  if (item.name?.includes("Crystal") || item.name?.includes("Jade")) {
    const n = item.name?.toLowerCase() || "";
    if (n.includes("jade")) return assetUrl(`/icons/items/crystals/jade.png`);
    return assetUrl(`/icons/items/crystals/crystal_purple.png`);
  }
  // Bones
  if (item.name?.includes("Bone") || item.name?.includes("Skull")) {
    return assetUrl(`/icons/items/relics/bones.png`);
  }
  // Coal
  if (item.name?.includes("Coal") || item.name?.includes("Charcoal")) {
    return assetUrl(`/icons/resources/materials/coal.png`);
  }
  // Mana Shard
  if (item.name?.includes("Mana Shard") || item.name?.includes("Mana Crystal") || item.name?.includes("Arcane Shard")) {
    return assetUrl(`/icons/resources/materials/mana_shard.png`);
  }
  // Essence
  if (item.name?.includes("Essence")) {
    return assetUrl(`/icons/resources/materials/common_essence.png`);
  }
  // Blade (crafting material)
  if (item.name?.includes("Blade") && !item.name?.includes("Sword")) {
    return assetUrl(`/icons/resources/materials/blade.png`);
  }
  // Animal Fat
  if (item.name?.includes("Fat") || item.name?.includes("Tallow") || item.name?.includes("Lard")) {
    return assetUrl(`/icons/resources/materials/animal_fat.png`);
  }
  // Fuze / Detonator
  if (item.name?.includes("Fuze") || item.name?.includes("Fuse") || item.name?.includes("Detonator") || item.name?.includes("TNT")) {
    return assetUrl(`/icons/resources/materials/fuze.png`);
  }
  // Metal Crank / Gear
  if (item.name?.includes("Crank") || item.name?.includes("Gear") || item.name?.includes("Cog")) {
    return assetUrl(`/icons/resources/materials/metal_crank.png`);
  }
  // Needle
  if (item.name?.includes("Needle") || item.name?.includes("Pin") || item.name?.includes("Awl")) {
    return assetUrl(`/icons/resources/materials/needle.png`);
  }
  // Metal Fragments / Ball Bearings
  if (item.name?.includes("Fragment") || item.name?.includes("Ball Bearing") || item.name?.includes("Pellet") || item.name?.includes("Shot")) {
    return assetUrl(`/icons/resources/materials/metal_fragments.png`);
  }
  // Daggers
  if (item.name?.includes("Dagger") || item.name?.includes("Knife") || item.name?.includes("Stiletto") || item.name?.includes("Shiv")) {
    return assetUrl(`/icons/weapons/daggers/dagger_t${Math.min(tier, 8)}.png`);
  }
  // Guns
  if (item.name?.includes("Gun") || item.name?.includes("Pistol") || item.name?.includes("Rifle") || item.name?.includes("Musket") || item.name?.includes("Blunderbuss") || item.name?.includes("Flintlock")) {
    return assetUrl(`/icons/weapons/guns/gun_t${Math.min(tier, 8)}.png`);
  }
  // Whisps
  if (item.name?.includes("Whisp") || item.name?.includes("Wisp")) {
    const n = item.name?.toLowerCase() || "";
    if (n.includes("green") || n.includes("nature") || n.includes("wind")) return assetUrl(`/icons/items/whisps/whisp_green.png`);
    if (n.includes("purple") || n.includes("arcane") || n.includes("void")) return assetUrl(`/icons/items/whisps/whisp_purple.png`);
    if (n.includes("blue") || n.includes("water") || n.includes("frost")) return assetUrl(`/icons/items/whisps/whisp_blue.png`);
    if (n.includes("red") || n.includes("fire") || n.includes("blood")) return assetUrl(`/icons/items/whisps/whisp_red.png`);
    return assetUrl(`/icons/items/whisps/whisp_purple.png`);
  }
  // Flowers
  if (item.name?.includes("Flower") || item.name?.includes("Blossom") || item.name?.includes("Petal")) {
    const n = item.name?.toLowerCase() || "";
    if (n.includes("white") || n.includes("jasmine") || n.includes("lily")) return assetUrl(`/icons/resources/flowers/flower_white.png`);
    if (n.includes("orange") || n.includes("sunflower") || n.includes("marigold")) return assetUrl(`/icons/resources/flowers/flower_orange.png`);
    if (n.includes("red") || n.includes("rose") || n.includes("poppy")) return assetUrl(`/icons/resources/flowers/flower_red.png`);
    if (n.includes("purple") || n.includes("violet") || n.includes("orchid")) return assetUrl(`/icons/resources/flowers/flower_purple.png`);
    if (n.includes("blue") || n.includes("frost") || n.includes("forget")) return assetUrl(`/icons/resources/flowers/flower_blue.png`);
    return assetUrl(`/icons/resources/flowers/flower_white.png`);
  }
  // Wooden Wheel
  if (item.name?.includes("Wheel") || item.name?.includes("Cart") || item.name?.includes("Wagon")) {
    return assetUrl(`/icons/items/quest/wooden_wheel.png`);
  }
  // Stopwatch / Timer
  if (item.name?.includes("Stopwatch") || item.name?.includes("Timer") || item.name?.includes("Pocket Watch") || item.name?.includes("Clock")) {
    return assetUrl(`/icons/items/quest/stopwatch.png`);
  }
  // Dragon Eggs
  if (item.name?.includes("Egg") || item.name?.includes("Clutch")) {
    const n = item.name?.toLowerCase() || "";
    if (n.includes("green") || n.includes("nature") || n.includes("forest") || n.includes("poison")) return assetUrl(`/icons/items/eggs/egg_green.png`);
    if (n.includes("purple") || n.includes("arcane") || n.includes("void") || n.includes("shadow")) return assetUrl(`/icons/items/eggs/egg_purple.png`);
    if (n.includes("brown") || n.includes("earth") || n.includes("stone") || n.includes("fire")) return assetUrl(`/icons/items/eggs/egg_brown.png`);
    return assetUrl(`/icons/items/eggs/egg_purple.png`);
  }
  // Wings (back slot)
  if (item.name?.includes("Wing") || item.name?.includes("Pinion")) {
    const n = item.name?.toLowerCase() || "";
    if (n.includes("demon") || n.includes("dark") || n.includes("bat")) return assetUrl(`/icons/armor/wings/wing_4.png`);
    if (n.includes("angel") || n.includes("holy") || n.includes("divine")) return assetUrl(`/icons/armor/wings/wing_5.png`);
    if (n.includes("fairy") || n.includes("butterfly") || n.includes("fae")) return assetUrl(`/icons/armor/wings/wing_8.png`);
    if (n.includes("bone") || n.includes("skeletal") || n.includes("undead")) return assetUrl(`/icons/armor/wings/wing_3.png`);
    if (n.includes("drake") || n.includes("dragon") || n.includes("wyvern")) return assetUrl(`/icons/armor/wings/wing_9.png`);
    if (n.includes("feather") || n.includes("hawk") || n.includes("eagle")) return assetUrl(`/icons/armor/wings/wing_2.png`);
    const wingTier = Math.min(tier, 8);
    const wingMap: Record<number, string> = { 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "8", 8: "9" };
    return assetUrl(`/icons/armor/wings/wing_${wingMap[wingTier] || "1"}.png`);
  }
  // Herbs
  if (item.name?.includes("Herb") || item.name?.includes("Leaf") || item.name?.includes("Root") || item.name?.includes("Moss") || item.name?.includes("Plant")) {
    const n = item.name?.toLowerCase() || "";
    if (n.includes("bundle") && n.includes("berr")) return assetUrl(`/icons/resources/herbs/herb_bundle_berries.png`);
    if (n.includes("bundle") || n.includes("bunch")) return assetUrl(`/icons/resources/herbs/herb_bundle.png`);
    if (n.includes("branch") || n.includes("twig")) return assetUrl(`/icons/resources/herbs/herb_branch.png`);
    if (n.includes("leaves") || n.includes("foliage")) return assetUrl(`/icons/resources/herbs/herb_leaves.png`);
    if (n.includes("leaf") || n.includes("mint")) return assetUrl(`/icons/resources/herbs/herb_leaf.png`);
    if (n.includes("bouquet") || n.includes("daisy") || n.includes("chamomile")) return assetUrl(`/icons/resources/herbs/herb_bouquet.png`);
    if (n.includes("grass") || n.includes("blade")) return assetUrl(`/icons/resources/herbs/herb_grass.png`);
    if (n.includes("lavender") || n.includes("berry")) return assetUrl(`/icons/resources/herbs/herb_lavender.png`);
    if (n.includes("seaweed") || n.includes("kelp") || n.includes("algae")) return assetUrl(`/icons/resources/herbs/herb_seaweed.png`);
    if (n.includes("crystal") || n.includes("arcane") || n.includes("magic")) return assetUrl(`/icons/resources/herbs/herb_crystalplant.png`);
    return assetUrl(`/icons/resources/herbs/herb_leaf.png`);
  }
  // Backpacks
  if (item.name?.includes("Backpack") || item.name?.includes("Bag") || item.name?.includes("Satchel")) {
    const n = item.name?.toLowerCase() || "";
    if (n.includes("green") || n.includes("ranger") || n.includes("forest")) return assetUrl(`/icons/items/backpacks/backpack_green.png`);
    if (n.includes("blue") || n.includes("mage") || n.includes("mystic")) return assetUrl(`/icons/items/backpacks/backpack_blue.png`);
    return assetUrl(`/icons/items/backpacks/backpack_brown.png`);
  }
  if (item.name?.includes("Bow")) return assetUrl(`/icons/weapons/bows/bow_t${tier}.png`);
  if (item.name?.includes("Staff") || item.name?.includes("Wand")) {
    const n = item.name?.toLowerCase() || "";
    const staffTier = Math.min(tier, 6); // 6 staff designs available
    let color = "blue"; // default
    if (n.includes("fire") || n.includes("flame") || n.includes("inferno")) color = "red";
    else if (n.includes("holy") || n.includes("light") || n.includes("divine")) color = "yellow";
    else if (n.includes("arcane") || n.includes("void") || n.includes("shadow")) color = "purple";
    else if (n.includes("nature") || n.includes("life") || n.includes("earth")) color = "green";
    else if (n.includes("frost") || n.includes("ice") || n.includes("water")) color = "blue";
    return assetUrl(`/icons/weapons/staves/staff_t${staffTier}_${color}.png`);
  }
  if (item.name?.includes("Mace")) return assetUrl(`/icons/weapons/hammers/hammer1h_t${tier}.png`);
  if (item.name?.includes("Spear")) return assetUrl(`/icons/weapons/staves/staff_t${Math.min(tier, 6)}_blue.png`);
  if (item.name?.includes("Scythe")) return assetUrl(`/icons/weapons/greataxes/greataxe_t${tier}.png`);
  
  // Armor - use resource icons or specific armor icons
  if (item.type === "Armor" || item.type === "armor") {
    const slot = item.slot?.toLowerCase() || "";
    const n = item.name?.toLowerCase() || "";
    
    // Pants/Legs - use specific pants icons from armor folder
    if (slot === "legs" || n.includes("pants") || n.includes("legging") || n.includes("breeches") || n.includes("greave")) {
      // Map tier to pants icon (1-8 tier maps to 1-40+ icons available)
      const pantsVariant = ((tier - 1) * 5 + 1);
      const pantsIndex = Math.min(Math.max(pantsVariant, 1), 41);
      return assetUrl(`/icons/armor/Pants_${String(pantsIndex).padStart(2, '0')}.png`);
    }
    
    return assetUrl(`/icons/armor/${slot}/default_t${tier}.png`);
  }

  // Resources - use specific resource icons
  if (item.type === "Resource") {
    const n = item.name?.toLowerCase() || "";
    
    // Skinning resources - use dedicated skinning icons
    if (n.includes("rough hide") || n.includes("thick hide")) return assetUrl(`/icons/resources/skinning/rough_hide.png`);
    if (n.includes("dragon scale")) return assetUrl(`/icons/resources/skinning/dragon_scales.png`);
    if (n.includes("serpent scale") || n.includes("snake scale")) return assetUrl(`/icons/resources/skinning/serpent_scales.png`);
    if (n.includes("leather roll") || n.includes("cured leather")) return assetUrl(`/icons/resources/skinning/leather_roll.png`);
    if (n.includes("toad skin") || n.includes("frog skin")) return assetUrl(`/icons/resources/skinning/toad_skin.png`);
    if (n.includes("beast claw") || n.includes("claw")) return assetUrl(`/icons/resources/skinning/beast_claw.png`);
    if (n.includes("mane") && !n.includes("lion")) return assetUrl(`/icons/resources/skinning/mane.png`);
    if (n.includes("lion mane")) return assetUrl(`/icons/resources/skinning/lion_mane.png`);
    if (n.includes("fin")) return assetUrl(`/icons/resources/skinning/fin.png`);
    if (n.includes("wool") || n.includes("fleece")) return assetUrl(`/icons/resources/skinning/wool.png`);
    if (n.includes("feather")) return assetUrl(`/icons/resources/skinning/feathers.png`);
    if (n.includes("spotted fur") || n.includes("spotted pelt")) return assetUrl(`/icons/resources/skinning/spotted_fur.png`);
    if (n.includes("tiger") || n.includes("striped")) return assetUrl(`/icons/resources/skinning/tiger_fur.png`);
    if (n.includes("white fur") || n.includes("arctic") || n.includes("polar")) return assetUrl(`/icons/resources/skinning/white_fur.png`);
    if (n.includes("gray tail") || n.includes("wolf tail")) return assetUrl(`/icons/resources/skinning/gray_tail.png`);
    if (n.includes("fine leather") || n.includes("quality leather")) return assetUrl(`/icons/resources/skinning/fine_leather.png`);
    if (n.includes("snow leopard") || n.includes("leopard fur")) return assetUrl(`/icons/resources/skinning/snow_leopard_fur.png`);
    if (n.includes("fur") || n.includes("pelt")) return assetUrl(`/icons/resources/skinning/spotted_fur.png`);
    if (n.includes("hide") || n.includes("leather")) return assetUrl(`/icons/resources/skinning/rough_hide.png`);
    if (n.includes("scale")) return assetUrl(`/icons/resources/skinning/serpent_scales.png`);
    
    // Other resources
    if (n.includes("ore") || n.includes("metal")) return assetUrl(`/sprites/resources/ore_t${tier}.png`);
    if (n.includes("wood") || n.includes("log")) return assetUrl(`/sprites/resources/wood_t${tier}.png`);
    if (n.includes("herb")) return assetUrl(`/sprites/resources/herb_t${tier}.png`);
    if (n.includes("gem")) return assetUrl(`/sprites/resources/gem_${n.includes("red") ? "red" : n.includes("green") ? "green" : "blue"}.png`);
    if (n.includes("flower")) return assetUrl(`/sprites/resources/flower_${n.includes("red") ? "red" : n.includes("blue") ? "blue" : n.includes("white") ? "white" : "yellow"}.png`);
    if (n.includes("mushroom")) return assetUrl(`/sprites/resources/mushroom.png`);
    if (n.includes("whisp")) return assetUrl(`/sprites/resources/whisp_${n.includes("red") ? "red" : n.includes("green") ? "green" : n.includes("purple") ? "purple" : "blue"}.png`);
    if (n.includes("fish")) return assetUrl(`/sprites/resources/fish.png`);
    if (n.includes("meat")) return assetUrl(`/sprites/resources/meat.png`);
    if (n.includes("crab")) return assetUrl(`/sprites/resources/crab.png`);
    if (n.includes("squid")) return assetUrl(`/sprites/resources/squid.png`);
    if (n.includes("egg")) return assetUrl(`/sprites/resources/drake_egg.png`);
    if (n.includes("ingot")) return assetUrl(`/sprites/resources/ingot_t${tier}.png`);
    if (n.includes("potion")) return assetUrl(`/sprites/resources/potion.png`);
    if (n.includes("flask")) return assetUrl(`/sprites/resources/flask.png`);
    if (n.includes("rope")) return assetUrl(`/sprites/resources/rope.png`);
    if (n.includes("fat")) return assetUrl(`/sprites/resources/fat.png`);
    if (n.includes("silk") || n.includes("hemp") || n.includes("linen")) return assetUrl(`/sprites/resources/cloth.png`);
    if (n.includes("gear") || n.includes("cog") || n.includes("wheel")) return assetUrl(`/sprites/resources/gear_part.png`);
    if (n.includes("blade") || n.includes("handle")) return assetUrl(`/sprites/resources/weapon_part.png`);
    return assetUrl(`/sprites/resources/misc.png`);
  }

  if (item.type === "Accessory") {
    const n = item.name?.toLowerCase() || "";
    if (n.includes("ring")) return assetUrl(`/sprites/resources/ring.png`);
    if (n.includes("amulet") || n.includes("necklace")) return assetUrl(`/sprites/resources/amulet.png`);
    return assetUrl(`/sprites/resources/accessory.png`);
  }

  return assetUrl("/sprites/resources/misc.png");
};

export interface GrudaRecipe {
  id: string;
  outputItemId: string;
  profession: string;
  levelRequired: number;
  ingredients: { itemId: string; quantity: number }[];
  durationSeconds: number;
}

export interface GrudaProfession {
  id: string;
  name: string;
  description: string;
  trainers: string[];
  category: "gathering" | "crafting";
  icon: string;
  feedsInto?: string[];
  resourceTypes?: string[];
}

export interface GrudaResourceNode {
  id: string;
  name: string;
  type: string;
  tier: number;
  rarity: string;
  tool: string;
  profession: string;
  minLevel: number;
  location: string;
  drops: string[];
}

// ==========================================
// ARTISAN GUILD PROFESSIONS
// ==========================================

// TAB 1: GATHERING PROFESSIONS
export const GATHERING_PROFESSIONS: GrudaProfession[] = [
  { 
    id: "GATHER_MINING", 
    name: "Mining", 
    category: "gathering",
    icon: "⛏️",
    description: "Extract ore, gems, and precious minerals from the earth. Higher tiers unlock mythril, gold, and buried treasure nodes.",
    trainers: ["Master Stoneheart", "Miner Grimjaw"],
    feedsInto: ["Miner", "Engineer", "Mystic"],
    resourceTypes: ["Stone", "Ore", "Gems", "Crystals", "Mythril", "Gold", "Buried Treasure"]
  },
  { 
    id: "GATHER_LOGGING", 
    name: "Logging", 
    category: "gathering",
    icon: "🌲",
    description: "Harvest wood, planks, and forest resources. Also yields hemp, berries, sap, and magical goo from ancient trees.",
    trainers: ["Forester Oakarm", "Logger Thornback"],
    feedsInto: ["Forester", "Engineer"],
    resourceTypes: ["Wood", "Planks", "Boat Wood", "Sticks", "Hemp", "Berries", "Sap", "Health Goo", "Mana Goo"]
  },
  { 
    id: "GATHER_SKINNING", 
    name: "Skinning", 
    category: "gathering",
    icon: "🦴",
    description: "Extract hides, leather, and bones from slain beasts. Rare drops include elder moss, magical goo, and gems.",
    trainers: ["Hunter Bloodclaw", "Skinner Ironhide"],
    feedsInto: ["Forester", "Chef", "Mystic"],
    resourceTypes: ["Hide", "Leather", "Bones", "Fishing Lures", "Elder Moss", "Sap", "Fuel", "Gems", "Health Goo", "Mana Goo"]
  },
  { 
    id: "GATHER_FISHING", 
    name: "Fishing", 
    category: "gathering",
    icon: "🎣",
    description: "Cast your line for fish and ocean treasures. Fishing is a wildcard profession - rare catches can yield ANY crafting material!",
    trainers: ["Captain Saltbeard", "Fisher Wavecrest"],
    feedsInto: ["Chef", "Mystic"],
    resourceTypes: ["Fish", "Bones", "Random Crafting Materials"]
  },
  { 
    id: "GATHER_HERBALISM", 
    name: "Herbalism", 
    category: "gathering",
    icon: "🌿",
    description: "Gather herbs, hemp, berries and plant fibers. Essential for potions, cloth crafting, and rope-making.",
    trainers: ["Druid Mosswhisper", "Herbalist Greenleaf"],
    feedsInto: ["Chef", "Mystic", "Forester"],
    resourceTypes: ["Hemp", "Berries", "Rope", "Cloth", "Herbs"]
  },
  { 
    id: "GATHER_SCAVENGING", 
    name: "Scavenging", 
    category: "gathering",
    icon: "🧲",
    description: "Salvage mechanical parts, cogs, and rare metals from ruins and battlefields. Fills gaps in the crafting economy.",
    trainers: ["Tinker Gearspoke", "Scrapper Rustfang"],
    feedsInto: ["Engineer", "Miner"],
    resourceTypes: ["Cogs", "Metals", "Mechanical Parts", "Rare Components"]
  }
];

// TAB 2: CRAFTING PROFESSIONS  
export const CRAFTING_PROFESSIONS: GrudaProfession[] = [
  { 
    id: "CRAFT_MINER", 
    name: "Miner", 
    category: "crafting",
    icon: "⚒️",
    description: "Master of metalwork. Craft all metal weapons (swords, axes, daggers, hammers) and metal armor. Higher tiers unlock alloys and mythic forging.",
    trainers: ["Forge Master Ironheim", "Weaponsmith Steelborn"],
    feedsInto: [],
    resourceTypes: ["Metal Weapons", "Metal Armor", "Alloys", "Tools"]
  },
  { 
    id: "CRAFT_FORESTER", 
    name: "Forester", 
    category: "crafting",
    icon: "🌲",
    description: "Craft leather armor, bows, boats, walls, and defensive structures. Gains bonuses from logging, skinning, and berry gathering.",
    trainers: ["Ranger Thornwood", "Shipwright Oakhull"],
    feedsInto: [],
    resourceTypes: ["Leather Armor", "Bows", "Boats", "Walls", "Defenses"]
  },
  { 
    id: "CRAFT_MYSTIC", 
    name: "Mystic", 
    category: "crafting",
    icon: "🔮",
    description: "The magic backbone of crafting. Create staves, cloth armor, enchantments, off-hand tomes, and all potions. Combines enchanting and alchemy.",
    trainers: ["Archmage Starweave", "Alchemist Moonbrew"],
    feedsInto: [],
    resourceTypes: ["Staves", "Cloth Armor", "Enchantments", "Tomes", "Potions"]
  },
  { 
    id: "CRAFT_ENGINEER", 
    name: "Engineer", 
    category: "crafting",
    icon: "🔧",
    description: "Technology and war machines. Build advanced tools, guns, gadgets, war machines, towers, armor enhancements, and mounts including flying mounts.",
    trainers: ["Master Gearwright", "Inventor Sparkweld"],
    feedsInto: [],
    resourceTypes: ["Tools", "Guns", "Gadgets", "War Machines", "Towers", "Mounts"]
  },
  { 
    id: "CRAFT_CHEF", 
    name: "Chef", 
    category: "crafting",
    icon: "👨‍🍳",
    description: "Master of consumables. Create food in three categories: Red (land meat for health/attack), Blue (ocean/soup for mana/spells), Green (plants for stamina/speed).",
    trainers: ["Master Chef Flamebite", "Sous Chef Spicewood"],
    feedsInto: [],
    resourceTypes: ["Red Food", "Blue Food", "Green Food", "Poisons", "Potions"]
  }
];

// Combined for backward compatibility
export const PROFESSIONS: GrudaProfession[] = [...GATHERING_PROFESSIONS, ...CRAFTING_PROFESSIONS];

// ==========================================
// SKILL DEFINITIONS (Based on Guide)
// ==========================================

const WEAPON_SKILLS = {
  SWORD: {
    T1_3: ["Slash (Auto)", "Power Strike", "Defensive Stance"],
    T4_6: ["Enhanced Slash", "Crushing Blow", "Shield Wall", "Whirlwind"],
    T7_8: ["Master Slash", "Devastating Strike", "Fortress", "Blade Storm", "Execute"]
  },
  BOW: {
    T1_3: ["Quick Shot (Auto)", "Aimed Shot", "Evasive Roll"],
    T4_6: ["Rapid Shot", "Piercing Arrow", "Explosive Arrow", "Camouflage"],
    T7_8: ["Master Shot", "Sniper Shot", "Rain of Arrows", "Multishot", "Deadly Precision"]
  },
  STAFF: { // Fire Staff template from guide
    T1_3: ["Fireball (Auto)", "Flame Burst", "Fire Shield"],
    T4_6: ["Greater Fireball", "Inferno", "Flame Wall", "Combustion"],
    T7_8: ["Master Fireball", "Meteor Strike", "Ring of Fire", "Pyroblast", "Phoenix Form"]
  },
  // Generic fallbacks for others
  GENERIC_MELEE: {
    T1_3: ["Basic Attack", "Hard Hit", "Block"],
    T4_6: ["Strong Attack", "Double Strike", "Parry", "Cleave"],
    T7_8: ["Master Attack", "Lethal Strike", "Invulnerability", "Earthquake", "Finisher"]
  },
  GENERIC_RANGED: {
    T1_3: ["Shoot", "Power Shot", "Dash"],
    T4_6: ["Double Shot", "Pierce", "Bomb", "Stealth"],
    T7_8: ["Master Shot", "Sniper", "Barrage", "Volley", "Headshot"]
  },
  GENERIC_MAGIC: {
    T1_3: ["Bolt", "Blast", "Shield"],
    T4_6: ["Greater Bolt", "Nova", "Wall", "DoT"],
    T7_8: ["Master Bolt", "Meteor", "Ring", "Channel", "Form"]
  }
};

const getSkillsForWeapon = (typeId: string, tier: number): string[] => {
  let skillSet: any;
  
  if (typeId === "SWORD") skillSet = WEAPON_SKILLS.SWORD;
  else if (typeId === "BOW" || typeId === "CROSSBOW") skillSet = WEAPON_SKILLS.BOW;
  else if (typeId === "GUN") skillSet = WEAPON_SKILLS.GENERIC_RANGED;
  else if (typeId === "STAFF") skillSet = WEAPON_SKILLS.STAFF;
  else if (["AXE", "MACE", "DAGGER", "HAMMER", "SCYTHE", "SPEAR"].includes(typeId)) skillSet = WEAPON_SKILLS.GENERIC_MELEE;
  else if (["WAND"].includes(typeId)) skillSet = WEAPON_SKILLS.GENERIC_MAGIC;
  else skillSet = WEAPON_SKILLS.GENERIC_MELEE;

  if (tier <= 3) return skillSet.T1_3;
  if (tier <= 6) return skillSet.T4_6;
  return skillSet.T7_8;
};

// ==========================================
// DATA GENERATION CONSTANTS - GRUDGE WARLORDS THEMED
// ==========================================

const MATERIAL_TIERS = [
  { tier: 1, metal: "Copper", wood: "Pine", leather: "Rawhide", herb: "Minor", level: 1, tierLabel: "T1" },
  { tier: 2, metal: "Iron", wood: "Oak", leather: "Thick Hide", herb: "Lesser", level: 10, tierLabel: "T2" },
  { tier: 3, metal: "Steel", wood: "Maple", leather: "Rugged Leather", herb: "Greater", level: 20, tierLabel: "T3" },
  { tier: 4, metal: "Mithril", wood: "Ash", leather: "Hardened Leather", herb: "Superior", level: 30, tierLabel: "T4" },
  { tier: 5, metal: "Adamantine", wood: "Ironwood", leather: "Wyrm Leather", herb: "Refined", level: 40, tierLabel: "T5" },
  { tier: 6, metal: "Orichalcum", wood: "Ebony", leather: "Infernal Leather", herb: "Perfect", level: 50, tierLabel: "T6" },
  { tier: 7, metal: "Starmetal", wood: "Wyrmwood", leather: "Titan Leather", herb: "Ancient", level: 60, tierLabel: "T7" },
  { tier: 8, metal: "Divine", wood: "Worldtree", leather: "Divine Leather", herb: "Divine", level: 70, tierLabel: "T8" },
];

const WEAPON_CONFIGS: Array<{
  setKey: keyof typeof GRUDGE_WEAPON_SETS;
  profession: string;
  subtype: string;
  resourceType: 'metal' | 'wood';
  baseDamage: number;
  skillType: 'SWORD' | 'BOW' | 'STAFF' | 'AXE' | 'DAGGER' | 'HAMMER' | 'MACE' | 'SPEAR' | 'GUN' | 'CROSSBOW';
}> = [
  { setKey: 'swords', profession: 'Miner', subtype: 'Sword', resourceType: 'metal', baseDamage: 12, skillType: 'SWORD' },
  { setKey: 'axes1h', profession: 'Forester', subtype: 'Axe (1H)', resourceType: 'metal', baseDamage: 15, skillType: 'AXE' },
  { setKey: 'daggers', profession: 'Miner', subtype: 'Dagger', resourceType: 'metal', baseDamage: 7, skillType: 'DAGGER' },
  { setKey: 'greatswords', profession: 'Miner', subtype: 'Greatsword', resourceType: 'metal', baseDamage: 18, skillType: 'SWORD' },
  { setKey: 'greataxes', profession: 'Forester', subtype: 'Axe (2H)', resourceType: 'metal', baseDamage: 20, skillType: 'AXE' },
  { setKey: 'hammers1h', profession: 'Engineer', subtype: 'Hammer (1H)', resourceType: 'metal', baseDamage: 16, skillType: 'HAMMER' },
  { setKey: 'hammers2h', profession: 'Miner', subtype: 'Hammer (2H)', resourceType: 'metal', baseDamage: 22, skillType: 'HAMMER' },
  { setKey: 'bows', profession: 'Forester', subtype: 'Bow', resourceType: 'wood', baseDamage: 10, skillType: 'BOW' },
  { setKey: 'crossbows', profession: 'Engineer', subtype: 'Crossbow', resourceType: 'metal', baseDamage: 14, skillType: 'CROSSBOW' },
  { setKey: 'guns', profession: 'Engineer', subtype: 'Gun', resourceType: 'metal', baseDamage: 16, skillType: 'GUN' },
  { setKey: 'fireStaves', profession: 'Mystic', subtype: 'Fire Staff', resourceType: 'wood', baseDamage: 14, skillType: 'STAFF' },
  { setKey: 'frostStaves', profession: 'Mystic', subtype: 'Frost Staff', resourceType: 'wood', baseDamage: 14, skillType: 'STAFF' },
  { setKey: 'holyStaves', profession: 'Mystic', subtype: 'Holy Staff', resourceType: 'wood', baseDamage: 12, skillType: 'STAFF' },
  { setKey: 'arcaneStaves', profession: 'Mystic', subtype: 'Arcane Staff', resourceType: 'wood', baseDamage: 14, skillType: 'STAFF' },
  { setKey: 'lightningStaves', profession: 'Mystic', subtype: 'Lightning Staff', resourceType: 'wood', baseDamage: 15, skillType: 'STAFF' },
  { setKey: 'natureStaves', profession: 'Forester', subtype: 'Nature Staff', resourceType: 'wood', baseDamage: 11, skillType: 'STAFF' },
  { setKey: 'spears', profession: 'Miner', subtype: 'Spear', resourceType: 'metal', baseDamage: 11, skillType: 'SPEAR' },
  { setKey: 'maces', profession: 'Miner', subtype: 'Mace', resourceType: 'metal', baseDamage: 13, skillType: 'MACE' },
];

const GRUDGE_WEAPON_SETS = {
  swords: [
    { id: 'bloodfeud-blade', name: 'Bloodfeud Blade', lore: 'Forged in endless clan blood feuds', primaryStat: 'damage', secondaryStat: 'lifesteal' },
    { id: 'wraithfang', name: 'Wraithfang', lore: 'Whispers forgotten grudges in the dark', primaryStat: 'crit', secondaryStat: 'mana' },
    { id: 'oathbreaker', name: 'Oathbreaker', lore: 'Breaks ancient oaths of peace', primaryStat: 'defense', secondaryStat: 'block' },
    { id: 'kinrend', name: 'Kinrend', lore: 'Rends bonds of blood and kinship', primaryStat: 'hp', secondaryStat: 'lifesteal' },
    { id: 'dusksinger', name: 'Dusksinger', lore: 'Sings of twilight and ending grudges', primaryStat: 'speed', secondaryStat: 'crit' },
    { id: 'emberclad', name: 'Emberclad', lore: 'Clad in flames of burning hatred', primaryStat: 'damage', secondaryStat: 'burn' },
  ],
  axes1h: [
    { id: 'gorehowl', name: 'Gorehowl', lore: 'Howls with the gore of fallen foes', primaryStat: 'damage', secondaryStat: 'bleed' },
    { id: 'skullsplitter', name: 'Skullsplitter', lore: 'Splits skulls of grudge bearers', primaryStat: 'crit', secondaryStat: 'armorPen' },
    { id: 'veinreaver', name: 'Veinreaver', lore: 'Reaves veins for blood tribute', primaryStat: 'lifesteal', secondaryStat: 'hp' },
    { id: 'ironmaw', name: 'Ironmaw', lore: 'Maw of iron that crushes oaths', primaryStat: 'defense', secondaryStat: 'block' },
    { id: 'dreadcleaver', name: 'Dreadcleaver', lore: 'Cleaves dread into enemies', primaryStat: 'damage', secondaryStat: 'fear' },
    { id: 'bonehew', name: 'Bonehew', lore: 'Hews bone from grudge skeletons', primaryStat: 'armorPen', secondaryStat: 'crit' },
  ],
  daggers: [
    { id: 'bloodshiv', name: 'Bloodshiv', lore: 'Shiv dripping enemy blood', primaryStat: 'bleed', secondaryStat: 'speed' },
    { id: 'wraithclaw', name: 'Wraithclaw', lore: 'Claw of wraith vengeance', primaryStat: 'mana', secondaryStat: 'crit' },
    { id: 'emberfang', name: 'Emberfang', lore: 'Fang burning with ember hate', primaryStat: 'burn', secondaryStat: 'damage' },
    { id: 'ironspike', name: 'Ironspike', lore: 'Spike of unyielding iron', primaryStat: 'armorPen', secondaryStat: 'defense' },
    { id: 'nightfang', name: 'Nightfang', lore: 'Fang of endless night grudges', primaryStat: 'crit', secondaryStat: 'poison' },
    { id: 'duskblade', name: 'Duskblade', lore: 'Blade of falling dusk', primaryStat: 'speed', secondaryStat: 'crit' },
  ],
  greatswords: [
    { id: 'doomspire', name: 'Doomspire', lore: 'Spire of impending doom', primaryStat: 'damage', secondaryStat: 'fear' },
    { id: 'bloodspire', name: 'Bloodspire', lore: 'Spire dripping blood', primaryStat: 'lifesteal', secondaryStat: 'bleed' },
    { id: 'wraithblade', name: 'Wraithblade', lore: 'Blade of wraith essence', primaryStat: 'mana', secondaryStat: 'crit' },
    { id: 'emberbrand', name: 'Emberbrand', lore: 'Brand of burning embers', primaryStat: 'burn', secondaryStat: 'damage' },
    { id: 'ironedge', name: 'Ironedge', lore: 'Edge of unbreakable iron', primaryStat: 'defense', secondaryStat: 'block' },
    { id: 'duskbringer', name: 'Duskbringer', lore: 'Brings dusk to enemies', primaryStat: 'speed', secondaryStat: 'crit' },
  ],
  greataxes: [
    { id: 'skullsunder', name: 'Skullsunder', lore: 'Sunders skulls in massive swings', primaryStat: 'damage', secondaryStat: 'stun' },
    { id: 'bloodreaver', name: 'Bloodreaver', lore: 'Reaves blood in wide arcs', primaryStat: 'lifesteal', secondaryStat: 'bleed' },
    { id: 'wraithhew', name: 'Wraithhew', lore: 'Hews wraiths from shadows', primaryStat: 'mana', secondaryStat: 'fear' },
    { id: 'embermaul', name: 'Embermaul', lore: 'Maul of burning embers', primaryStat: 'burn', secondaryStat: 'damage' },
    { id: 'ironrend', name: 'Ironrend', lore: 'Rends iron armor', primaryStat: 'armorPen', secondaryStat: 'damage' },
    { id: 'dusksplitter', name: 'Dusksplitter', lore: 'Splits at dusk with shadow', primaryStat: 'speed', secondaryStat: 'crit' },
  ],
  hammers1h: [
    { id: 'grudgehammer', name: 'Grudgehammer', lore: 'Pounds grudges into enemies', primaryStat: 'stun', secondaryStat: 'damage' },
    { id: 'oathcrusher', name: 'Oathcrusher', lore: 'Crushes oaths of the sworn', primaryStat: 'armorPen', secondaryStat: 'stun' },
    { id: 'bloodmaul', name: 'Bloodmaul', lore: 'Mauls blood from veins', primaryStat: 'lifesteal', secondaryStat: 'damage' },
    { id: 'ironbreak', name: 'Ironbreak', lore: 'Breaks iron and bone alike', primaryStat: 'damage', secondaryStat: 'armorPen' },
    { id: 'wrathpound', name: 'Wrathpound', lore: 'Pounds with ancient wrath', primaryStat: 'stun', secondaryStat: 'hp' },
    { id: 'emberpound', name: 'Emberpound', lore: 'Burns with each strike', primaryStat: 'burn', secondaryStat: 'stun' },
  ],
  hammers2h: [
    { id: 'titanmaul', name: 'Titanmaul', lore: 'Maul of titanic grudges', primaryStat: 'stun', secondaryStat: 'damage' },
    { id: 'doomhammer', name: 'Doomhammer', lore: 'Hammer of impending doom', primaryStat: 'damage', secondaryStat: 'fear' },
    { id: 'wrathquake', name: 'Wrathquake', lore: 'Quakes with ancient wrath', primaryStat: 'stun', secondaryStat: 'armorPen' },
    { id: 'bloodpound', name: 'Bloodpound', lore: 'Pounds blood from enemies', primaryStat: 'lifesteal', secondaryStat: 'stun' },
    { id: 'ironcrush', name: 'Ironcrush', lore: 'Crushes with iron weight', primaryStat: 'armorPen', secondaryStat: 'damage' },
    { id: 'embershatter', name: 'Embershatter', lore: 'Shatters with burning force', primaryStat: 'burn', secondaryStat: 'stun' },
  ],
  bows: [
    { id: 'wraithbone', name: 'Wraithbone Bow', lore: 'Carved from bones of wraiths', primaryStat: 'mana', secondaryStat: 'crit' },
    { id: 'bloodstring', name: 'Bloodstring Bow', lore: 'Strung with strings of blood', primaryStat: 'bleed', secondaryStat: 'damage' },
    { id: 'shadowflight', name: 'Shadowflight Bow', lore: 'Flies shadows as arrows', primaryStat: 'crit', secondaryStat: 'speed' },
    { id: 'emberthorn', name: 'Emberthorn Bow', lore: 'Thorns of ember fire', primaryStat: 'burn', secondaryStat: 'damage' },
    { id: 'ironvine', name: 'Ironvine Bow', lore: 'Vines of iron entangle', primaryStat: 'root', secondaryStat: 'defense' },
    { id: 'duskreaver', name: 'Duskreaver Bow', lore: 'Reaves at dusk fall', primaryStat: 'speed', secondaryStat: 'crit' },
  ],
  crossbows: [
    { id: 'ironveil', name: 'Ironveil Repeater', lore: 'Rapid fire from iron veils', primaryStat: 'speed', secondaryStat: 'armorPen' },
    { id: 'skullpiercer', name: 'Skullpiercer', lore: 'Pierces skulls with precision', primaryStat: 'crit', secondaryStat: 'damage' },
    { id: 'bloodreaver-xbow', name: 'Bloodreaver Crossbow', lore: 'Reaves blood with bolts', primaryStat: 'bleed', secondaryStat: 'lifesteal' },
    { id: 'wraithspike', name: 'Wraithspike', lore: 'Spikes from wraith essence', primaryStat: 'mana', secondaryStat: 'silence' },
    { id: 'emberbolt', name: 'Emberbolt', lore: 'Bolts of burning ember', primaryStat: 'burn', secondaryStat: 'damage' },
    { id: 'ironshard', name: 'Ironshard Crossbow', lore: 'Shards of unbreakable iron', primaryStat: 'armorPen', secondaryStat: 'defense' },
  ],
  guns: [
    { id: 'blackpowder', name: 'Blackpowder Blaster', lore: 'Blasts with ancient blackpowder grudges', primaryStat: 'damage', secondaryStat: 'knockback' },
    { id: 'ironstorm', name: 'Ironstorm Gun', lore: 'Storms of iron bullets', primaryStat: 'speed', secondaryStat: 'armorPen' },
    { id: 'bloodcannon', name: 'Bloodcannon', lore: 'Cannon of blood tribute', primaryStat: 'lifesteal', secondaryStat: 'damage' },
    { id: 'wraithbarrel', name: 'Wraithbarrel', lore: 'Barrel whispers wraith grudges', primaryStat: 'mana', secondaryStat: 'silence' },
    { id: 'emberrifle', name: 'Emberrifle', lore: 'Rifle of ember flames', primaryStat: 'burn', secondaryStat: 'damage' },
    { id: 'duskblaster', name: 'Duskblaster', lore: 'Blasts at dusk with shadow', primaryStat: 'crit', secondaryStat: 'speed' },
  ],
  fireStaves: [
    { id: 'emberwrath', name: 'Emberwrath Staff', lore: 'Wrath of burning embers', primaryStat: 'burn', secondaryStat: 'mana' },
    { id: 'sunfire', name: 'Sunfire Staff', lore: 'Staff of solar flames', primaryStat: 'burn', secondaryStat: 'damage' },
    { id: 'inferno-spire', name: 'Inferno Spire', lore: 'Spire of raging inferno', primaryStat: 'damage', secondaryStat: 'burn' },
    { id: 'ash-grudge', name: 'Ash Grudge Staff', lore: 'Burns grudges to ash', primaryStat: 'burn', secondaryStat: 'armorPen' },
    { id: 'ember-heart', name: 'Ember Heart', lore: 'Heart of burning embers', primaryStat: 'burn', secondaryStat: 'hp' },
    { id: 'blazing-wrath', name: 'Blazing Wrath', lore: 'Wrath of blazing flames', primaryStat: 'damage', secondaryStat: 'burn' },
  ],
  frostStaves: [
    { id: 'glacialspire', name: 'Glacial Spire', lore: 'Spire of glacial cold', primaryStat: 'slow', secondaryStat: 'mana' },
    { id: 'frostbite', name: 'Frostbite Staff', lore: 'Staff of frostbite vengeance', primaryStat: 'slow', secondaryStat: 'damage' },
    { id: 'winter-grudge', name: 'Winter Grudge', lore: 'Grudges frozen in winter', primaryStat: 'freeze', secondaryStat: 'slow' },
    { id: 'ice-warden', name: 'Ice Warden', lore: 'Warden of frozen lands', primaryStat: 'slow', secondaryStat: 'defense' },
    { id: 'blizzard-heart', name: 'Blizzard Heart', lore: 'Heart of endless blizzard', primaryStat: 'damage', secondaryStat: 'slow' },
    { id: 'frozen-spite', name: 'Frozen Spite', lore: 'Spite frozen in ice', primaryStat: 'freeze', secondaryStat: 'damage' },
  ],
  holyStaves: [
    { id: 'dawnspire', name: 'Dawnspire', lore: 'Spire of dawning light', primaryStat: 'heal', secondaryStat: 'mana' },
    { id: 'redemption', name: 'Redemption Staff', lore: 'Staff of holy redemption', primaryStat: 'heal', secondaryStat: 'cleanse' },
    { id: 'sacred-light', name: 'Sacred Light', lore: 'Light of the sacred', primaryStat: 'heal', secondaryStat: 'shield' },
    { id: 'holy-wrath', name: 'Holy Wrath', lore: 'Wrath of the divine', primaryStat: 'damage', secondaryStat: 'heal' },
    { id: 'celestial-grace', name: 'Celestial Grace', lore: 'Grace of celestial beings', primaryStat: 'heal', secondaryStat: 'hp' },
    { id: 'divine-judgment', name: 'Divine Judgment', lore: 'Judgment of the divine', primaryStat: 'damage', secondaryStat: 'silence' },
  ],
  arcaneStaves: [
    { id: 'voidspire', name: 'Voidspire', lore: 'Spire into the void', primaryStat: 'mana', secondaryStat: 'silence' },
    { id: 'arcane-fury', name: 'Arcane Fury', lore: 'Fury of arcane power', primaryStat: 'damage', secondaryStat: 'mana' },
    { id: 'mystic-grudge', name: 'Mystic Grudge', lore: 'Grudges of the mystic', primaryStat: 'mana', secondaryStat: 'damage' },
    { id: 'ether-heart', name: 'Ether Heart', lore: 'Heart of pure ether', primaryStat: 'mana', secondaryStat: 'hp' },
    { id: 'void-warden', name: 'Void Warden', lore: 'Warden of the void', primaryStat: 'silence', secondaryStat: 'mana' },
    { id: 'chaos-spire', name: 'Chaos Spire', lore: 'Spire of pure chaos', primaryStat: 'damage', secondaryStat: 'armorPen' },
  ],
  lightningStaves: [
    { id: 'stormwrath', name: 'Stormwrath', lore: 'Wrath of storms', primaryStat: 'damage', secondaryStat: 'stun' },
    { id: 'tempest-spire', name: 'Tempest Spire', lore: 'Spire of tempest fury', primaryStat: 'damage', secondaryStat: 'chain' },
    { id: 'shock-grudge', name: 'Shock Grudge', lore: 'Grudges struck by lightning', primaryStat: 'stun', secondaryStat: 'damage' },
    { id: 'voltaic-heart', name: 'Voltaic Heart', lore: 'Heart of voltaic power', primaryStat: 'damage', secondaryStat: 'speed' },
    { id: 'thunder-spire', name: 'Thunder Spire', lore: 'Spire of rolling thunder', primaryStat: 'damage', secondaryStat: 'stun' },
    { id: 'thunder-grudge', name: 'ThunderGrudge Staff', lore: 'Grudges powered by thunder', primaryStat: 'damage', secondaryStat: 'stun' },
  ],
  natureStaves: [
    { id: 'verdant-wrath', name: 'Verdant Wrath', lore: 'Wrath of verdant growth', primaryStat: 'heal', secondaryStat: 'root' },
    { id: 'thorn-grudge', name: 'Thorn Grudge Staff', lore: 'Thorns of ancient grudges', primaryStat: 'damage', secondaryStat: 'poison' },
    { id: 'wild-oathbreaker', name: 'Wild Oathbreaker', lore: 'Breaks oaths of the wild', primaryStat: 'root', secondaryStat: 'heal' },
    { id: 'grove-guardian', name: 'Grove Guardian', lore: 'Guardian of sacred groves', primaryStat: 'heal', secondaryStat: 'defense' },
    { id: 'blossom-fury', name: 'Blossom Fury', lore: 'Fury of wild blossoms', primaryStat: 'damage', secondaryStat: 'heal' },
    { id: 'root-warden', name: 'Root Warden', lore: 'Warden of deep roots', primaryStat: 'root', secondaryStat: 'defense' },
  ],
  spears: [
    { id: 'bloodspear', name: 'Bloodspear', lore: 'Thirsting spear that drinks blood', primaryStat: 'lifesteal', secondaryStat: 'bleed' },
    { id: 'voidpiercer', name: 'Voidpiercer', lore: 'Pierces through dimensions', primaryStat: 'armorPen', secondaryStat: 'mana' },
    { id: 'divine-trident', name: 'Divine Trident', lore: 'Holy trident of divine wrath', primaryStat: 'damage', secondaryStat: 'heal' },
    { id: 'grudge-lance', name: 'Grudge Lance', lore: 'Lance forged from ancient grudges', primaryStat: 'damage', secondaryStat: 'charge' },
    { id: 'wraith-pike', name: 'Wraith Pike', lore: 'Pike infused with wraith essence', primaryStat: 'mana', secondaryStat: 'fear' },
    { id: 'ember-javelin', name: 'Ember Javelin', lore: 'Javelin of burning embers', primaryStat: 'burn', secondaryStat: 'range' },
  ],
  maces: [
    { id: 'iron-cudgel', name: 'Iron Cudgel', lore: 'Simple iron bludgeon', primaryStat: 'stun', secondaryStat: 'damage' },
    { id: 'bloodbludgeon', name: 'Bloodbludgeon', lore: 'Blood-soaked mace of carnage', primaryStat: 'lifesteal', secondaryStat: 'stun' },
    { id: 'obsidian-crusher', name: 'Obsidian Crusher', lore: 'Volcanic mace that shatters shields', primaryStat: 'armorPen', secondaryStat: 'burn' },
    { id: 'divine-scepter', name: 'Divine Scepter', lore: 'Holy scepter of divine judgment', primaryStat: 'damage', secondaryStat: 'heal' },
    { id: 'grudge-flail', name: 'Grudge Flail', lore: 'Chained flail of vengeance', primaryStat: 'damage', secondaryStat: 'stun' },
    { id: 'wrath-morningstar', name: 'Wrath Morningstar', lore: 'Morning star of ancient wrath', primaryStat: 'armorPen', secondaryStat: 'bleed' },
  ],
};

const GRUDGE_ARMOR_SETS = {
  bloodfeud: { name: 'Bloodfeud', lore: 'Blood of clan feuds', setBonus: 'Arcane Ward: +20% magic resist' },
  wraithfang: { name: 'Wraithfang', lore: 'Wraith echo in shadows', setBonus: 'Wraith Echo: 10% dodge chance' },
  oathbreaker: { name: 'Oathbreaker', lore: 'Broken oaths empower', setBonus: 'Broken Oath: Purge 1 buff on hit' },
  kinrend: { name: 'Kinrend', lore: 'Kinship bonds protect', setBonus: 'Family Guard: +15% heal received' },
  dusksinger: { name: 'Dusksinger', lore: 'Twilight speed grants', setBonus: 'Evening Veil: +10% move speed' },
  emberclad: { name: 'Emberclad', lore: 'Flames protect the bearer', setBonus: 'Flame Cloak: Burn attackers' },
};

const ARMOR_SLOTS = ['Helm', 'Shoulder', 'Chest', 'Hands', 'Feet', 'Ring', 'Necklace', 'Relic'] as const;
const ARMOR_MATERIALS = ['cloth', 'leather', 'metal'] as const;

const ARMOR_SLOT_STATS: Record<string, { armor: number; slot: string }> = {
  'Helm': { armor: 4, slot: 'Head' },
  'Shoulder': { armor: 3, slot: 'Shoulder' },
  'Chest': { armor: 8, slot: 'Chest' },
  'Hands': { armor: 2, slot: 'Hands' },
  'Feet': { armor: 3, slot: 'Feet' },
  'Ring': { armor: 0, slot: 'Ring' },
  'Necklace': { armor: 0, slot: 'Necklace' },
  'Relic': { armor: 0, slot: 'Relic' },
};

const LEGENDARY_TEMPLATES: { name: string; type: string; slot: string; tier: number; stats: Record<string, number>; effects: string[]; lore: string }[] = [
  { name: "Odin's Fury", type: "Weapon", slot: "MainHand", tier: 5, stats: { Damage: 150 }, effects: ["Divine Strike", "+20 STR"], lore: "Blessed by Odin himself" },
  { name: "Madra's Embrace", type: "Weapon", slot: "MainHand", tier: 6, stats: { Damage: 200 }, effects: ["Dark Blessing", "+30 INT"], lore: "The goddess of death empowers this blade" },
  { name: "The Omni's Judgement", type: "Weapon", slot: "MainHand", tier: 7, stats: { Damage: 180 }, effects: ["Divine Balance", "+50 WIS"], lore: "Ultimate balance of all things" },
  { name: "Crusade Banner", type: "Weapon", slot: "MainHand", tier: 6, stats: { Damage: 190 }, effects: ["Holy Light", "+25 VIT"], lore: "Standard of the Crusade faction" },
  { name: "Legion's Bane", type: "Weapon", slot: "MainHand", tier: 8, stats: { Damage: 300 }, effects: ["Soul Harvest", "+100 STR"], lore: "Doom of the Legion faction" },
  { name: "Fabled Relic", type: "Weapon", slot: "MainHand", tier: 7, stats: { Damage: 170, Healing: 50 }, effects: ["Ancient Power", "+40 INT"], lore: "Lost relic of the Fabled faction" },
  { name: "Grudgekeeper", type: "Weapon", slot: "MainHand", tier: 8, stats: { Damage: 280 }, effects: ["Eternal Grudge", "+80 TAC"], lore: "Keeper of all grudges in the realm" },
];

// ==========================================
// IMPORTED WORKSTATION DATA
// ==========================================
// Manually mapped from imported JSON data for enhanced crafting system

const WORKSTATION_ITEMS: GrudaItem[] = [
  // Workbench Ingredients
  { id: "WS_ANIMAL_FAT", name: "Animal Fat", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting.", buyPrice: 5 },
  { id: "WS_BARREL_MOTOR", name: "Barrel Motor", type: "Resource", rarity: "Common", tier: 2, stats: {}, description: "Used in crafting.", buyPrice: 15 },
  { id: "WS_BLADE", name: "Blade", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting weapons.", buyPrice: 8 },
  { id: "WS_FACET", name: "Facet", type: "Resource", rarity: "Common", tier: 3, stats: {}, description: "Used in crafting advanced weapons.", buyPrice: 25 },
  { id: "WS_FUZE", name: "Fuze", type: "Resource", rarity: "Common", tier: 2, stats: {}, description: "Used in crafting explosives.", buyPrice: 10 },
  { id: "WS_METAL_CRANK", name: "Metal Crank", type: "Resource", rarity: "Common", tier: 2, stats: {}, description: "Used in crafting Siege Weapons.", buyPrice: 20 },
  { id: "WS_METAL_GEAR", name: "Metal Gear", type: "Resource", rarity: "Common", tier: 2, stats: {}, description: "Used in crafting Siege Weapons.", buyPrice: 20 },
  { id: "WS_PROPELLER", name: "Propeller", type: "Resource", rarity: "Common", tier: 3, stats: {}, description: "Used in crafting.", buyPrice: 30 },
  { id: "WS_ROPE", name: "Rope", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting.", buyPrice: 3 },
  { id: "WS_STOP_WATCH", name: "Stop Watch", type: "Resource", rarity: "Common", tier: 2, stats: {}, description: "Used in crafting explosives.", buyPrice: 25 },
  { id: "WS_WEAPON_HANDLE", name: "Weapon Handle", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting weapons.", buyPrice: 5 },
  { id: "WS_WOODEN_COG", name: "Wooden Cog", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting Siege Weapons.", buyPrice: 8 },
  { id: "WS_WOODEN_WHEEL", name: "Wooden Wheel", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting.", buyPrice: 10 },
  
  // Refined Materials (Workbench Results)
  { id: "MAT_FINE_LEATHER", name: "Fine Leather", type: "Resource", rarity: "Uncommon", tier: 2, stats: {}, description: "Used in crafting.", buyPrice: 20 },
  { id: "MAT_LEATHER_STRAPS", name: "Leather Straps", type: "Resource", rarity: "Uncommon", tier: 2, stats: {}, description: "Used in crafting weapons.", buyPrice: 15 },
  { id: "MAT_METAL_FRAGMENTS", name: "Metal Fragments", type: "Resource", rarity: "Uncommon", tier: 1, stats: {}, description: "Used in crafting.", buyPrice: 10 },
  { id: "MAT_PERFECT_INGOT", name: "Perfect Ingot", type: "Resource", rarity: "Uncommon", tier: 3, stats: {}, description: "Used in crafting Armor.", buyPrice: 50 },
  { id: "MAT_PERFECT_LEATHER", name: "Perfect Leather", type: "Resource", rarity: "Uncommon", tier: 3, stats: {}, description: "Used in crafting.", buyPrice: 50 },
  { id: "MAT_QUALITY_INGOT", name: "Quality Ingot", type: "Resource", rarity: "Uncommon", tier: 2, stats: {}, description: "Used in crafting Armor.", buyPrice: 30 },
  { id: "MAT_ROUGH_INGOT", name: "Rough Ingot", type: "Resource", rarity: "Uncommon", tier: 1, stats: {}, description: "Used in crafting Armor.", buyPrice: 15 },
  { id: "MAT_ROUGH_LEATHER", name: "Rough Leather", type: "Resource", rarity: "Uncommon", tier: 1, stats: {}, description: "Used in crafting Armor.", buyPrice: 15 },
  { id: "MAT_SPOOL_HEMP", name: "Spool Of Hemp Thread", type: "Resource", rarity: "Uncommon", tier: 1, stats: {}, description: "Used in crafting.", buyPrice: 5 },
  { id: "MAT_SPOOL_LINEN", name: "Spool Of Linen", type: "Resource", rarity: "Uncommon", tier: 1, stats: {}, description: "Used in crafting.", buyPrice: 8 },
  { id: "MAT_SPOOL_SILK", name: "Spool of Silk", type: "Resource", rarity: "Uncommon", tier: 2, stats: {}, description: "Used in crafting.", buyPrice: 15 },
  { id: "MAT_SULFER", name: "Sulfer", type: "Resource", rarity: "Uncommon", tier: 1, stats: {}, description: "Used in crafting Explosives.", buyPrice: 12 },

  // Gems (Workbench)
  { id: "GEM_BLUE", name: "Blue Gemstone", type: "Resource", rarity: "Uncommon", tier: 2, stats: {}, description: "Used in crafting.", buyPrice: 40 },
  { id: "GEM_GREATER_BLUE", name: "Greater Blue Gemstone", type: "Resource", rarity: "Rare", tier: 3, stats: {}, description: "Used in crafting.", buyPrice: 100 },
  { id: "GEM_GREATER_GREEN", name: "Greater Green Gemstone", type: "Resource", rarity: "Rare", tier: 3, stats: {}, description: "Used in crafting.", buyPrice: 100 },
  { id: "GEM_GREATER_RED", name: "Greater Red Gemstone", type: "Resource", rarity: "Rare", tier: 3, stats: {}, description: "Used in crafting.", buyPrice: 100 },
  { id: "GEM_GREEN", name: "Green Gemstone", type: "Resource", rarity: "Uncommon", tier: 2, stats: {}, description: "Used in crafting.", buyPrice: 40 },
  { id: "GEM_LESSER_BLUE", name: "Lesser Blue Gemstone", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting.", buyPrice: 15 },
  { id: "GEM_LESSER_GREEN", name: "Lesser Green Gemstone", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting.", buyPrice: 15 },
  { id: "GEM_LESSER_RED", name: "Lesser Red Gemstone", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting.", buyPrice: 15 },
  { id: "GEM_RED", name: "Red Gemstone", type: "Resource", rarity: "Uncommon", tier: 2, stats: {}, description: "Used in crafting.", buyPrice: 40 },

  // Potion Ingredients (Workbench)
  { id: "POT_BLUE_FLOWER", name: "Blue Flower", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting Potions.", buyPrice: 4 },
  { id: "POT_BLUE_WHISP", name: "Blue Whisp", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting Potions.", buyPrice: 10 },
  { id: "POT_FLASK", name: "Flask", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting Potions.", buyPrice: 5 },
  { id: "POT_GREEN_WHISP", name: "Green Whisp", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting Potions.", buyPrice: 10 },
  { id: "POT_MUSHROOM_L", name: "Large Mushroom", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting Potions.", buyPrice: 6 },
  { id: "POT_MUSHROOM_M", name: "Medium Mushroom", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting Potions.", buyPrice: 4 },
  { id: "POT_PURPLE_WHISP", name: "Purple Whisp", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting Potions.", buyPrice: 10 },
  { id: "POT_RED_FLOWER", name: "Red Flower", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting Potions.", buyPrice: 4 },
  { id: "POT_RED_WHISP", name: "Red Whisp", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting Potions.", buyPrice: 10 },
  { id: "POT_MUSHROOM_S", name: "Small Mushroom", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting Potions.", buyPrice: 2 },
  { id: "POT_WHITE_FLOWER", name: "White Flower", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting Potions.", buyPrice: 4 },
  { id: "POT_YELLOW_FLOWER", name: "Yellow Flower", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Used in crafting Potions.", buyPrice: 4 },

  // Campfire Items
  { id: "FOOD_CRAB", name: "Crab", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Fresh Crab!", buyPrice: 5 },
  { id: "FOOD_FISH", name: "Fish", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Fresh Fish!", buyPrice: 5 },
  { id: "FOOD_MEAT", name: "Meat", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Fresh Meat!", buyPrice: 5 },
  { id: "FOOD_SQUID", name: "Squid", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Fresh Squid!", buyPrice: 5 },
  { id: "FOOD_COOKED_CRAB", name: "Cooked Crab", type: "Resource", rarity: "Uncommon", tier: 1, stats: {}, description: "Regenerates 1% of your total health.", buyPrice: 15 },
  { id: "FOOD_COOKED_FISH", name: "Cooked Fish", type: "Resource", rarity: "Uncommon", tier: 1, stats: {}, description: "Regenerates 1% of your total Mana.", buyPrice: 15 },
  { id: "FOOD_COOKED_MEAT", name: "Cooked Meat", type: "Resource", rarity: "Uncommon", tier: 1, stats: {}, description: "Regenerates 3% of your total health.", buyPrice: 20 },
  { id: "FOOD_COOKED_SQUID", name: "Cooked squid", type: "Resource", rarity: "Uncommon", tier: 1, stats: {}, description: "Regenerates 3% of your total mana.", buyPrice: 20 },

  // Furnace Items
  { id: "ORE_METAL", name: "Metal Ore", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Raw ore.", buyPrice: 5 },
  { id: "ORE_SULFER", name: "Sulfer Ore", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Raw sulfer.", buyPrice: 8 },
  { id: "EGG_DRAKE_BONE", name: "Dragon Bone Drake Egg", type: "Resource", rarity: "Rare", tier: 3, stats: {}, description: "A fresh drake egg!", buyPrice: 500 },
  { id: "EGG_DRAKE_EMERALD", name: "Emerald Drake Egg", type: "Resource", rarity: "Rare", tier: 3, stats: {}, description: "A fresh drake egg!", buyPrice: 500 },
  { id: "EGG_DRAKE_FOREST", name: "Forest Drake Egg", type: "Resource", rarity: "Rare", tier: 3, stats: {}, description: "A fresh drake egg!", buyPrice: 500 },
  { id: "EGG_DRAKE_FRIGID", name: "Frigid Drake Egg", type: "Resource", rarity: "Rare", tier: 3, stats: {}, description: "A fresh drake egg!", buyPrice: 500 },
  { id: "EGG_DRAKE_FROST", name: "Frost Drake Egg", type: "Resource", rarity: "Rare", tier: 3, stats: {}, description: "A fresh drake egg!", buyPrice: 500 },
  { id: "EGG_DRAKE_HELLFIRE", name: "Hellfire Drake Egg", type: "Resource", rarity: "Rare", tier: 3, stats: {}, description: "A fresh drake egg!", buyPrice: 500 },
  { id: "EGG_DRAKE_LAVA", name: "Lava Drake Egg", type: "Resource", rarity: "Rare", tier: 3, stats: {}, description: "A fresh drake egg!", buyPrice: 500 },
  { id: "EGG_DRAKE_NIGHTSTALKER", name: "Nightstalker Drake Egg", type: "Resource", rarity: "Rare", tier: 3, stats: {}, description: "A fresh drake egg!", buyPrice: 500 },
  { id: "EGG_DRAKE_ROCK", name: "Rock Drake Egg", type: "Resource", rarity: "Rare", tier: 3, stats: {}, description: "A fresh drake egg!", buyPrice: 500 },
  { id: "EGG_DRAKE_VOID", name: "Void Drake Egg", type: "Resource", rarity: "Rare", tier: 3, stats: {}, description: "A fresh drake egg!", buyPrice: 500 },

  // Loom Items
  { id: "LOOM_HAIR", name: "Hair", type: "Resource", rarity: "Uncommon", tier: 1, stats: {}, description: "Used in crafting.", buyPrice: 5 },
  { id: "LOOM_HEMP_FIBER", name: "Hemp Fiber", type: "Resource", rarity: "Uncommon", tier: 1, stats: {}, description: "Used in crafting.", buyPrice: 6 },
  { id: "LOOM_SILK", name: "Silk", type: "Resource", rarity: "Uncommon", tier: 2, stats: {}, description: "Used in crafting.", buyPrice: 12 },

  // Pet Items
  { id: "PET_GROWTH_POTION", name: "Lv10 Drake Growth Potion", type: "Resource", rarity: "Rare", tier: 2, stats: {}, description: "Used in crafting.", buyPrice: 200 },
];


// ==========================================
// GENERATION LOGIC
// ==========================================

const generatedItems: GrudaItem[] = [];
const generatedRecipes: GrudaRecipe[] = [];
const generatedNodes: GrudaResourceNode[] = [];

// Helper for Stat Scaling (T2=2 stats, T3=3 stats, etc.)
const addBonusStats = (stats: Record<string, number>, tier: number, type: "Melee" | "Magic" | "Ranged" | "Defense") => {
  const newStats = { ...stats };
  
  if (tier >= 2) newStats[type === "Defense" ? "Vitality" : "Strength"] = tier * 2;
  if (tier >= 3) newStats[type === "Defense" ? "Resistance" : "Crit Chance"] = tier * 1;
  if (tier >= 4) newStats[type === "Defense" ? "Regen" : "Attack Speed"] = tier * 1;
  if (tier >= 5) newStats[type === "Defense" ? "Thorns" : "Lifesteal"] = tier * 0.5;
  if (tier >= 6) newStats["All Attributes"] = tier;
  if (tier >= 7) newStats["Mastery"] = tier * 2;
  if (tier >= 8) newStats["Divine Power"] = tier * 5;

  return newStats;
};

// 1. Generate Resources First
MATERIAL_TIERS.forEach(tierDef => {
  // Metal
  const oreId = `ORE_${tierDef.metal.toUpperCase().replace(" ", "_")}_T${tierDef.tier}`;
  const oreItem: Partial<GrudaItem> = { name: `${tierDef.metal} Ore`, type: "Resource", tier: tierDef.tier };
  generatedItems.push({
    id: oreId,
    name: `${tierDef.metal} Ore`,
    type: "Resource",
    rarity: "Common",
    tier: tierDef.tier,
    stats: {},
    image: resolveItemImage(oreItem),
    description: `Raw ${tierDef.metal} ore used for smelting.`,
    buyPrice: 5 * tierDef.tier
  });
  generatedNodes.push({
    id: `NODE_ORE_T${tierDef.tier}`,
    name: `${tierDef.metal} Deposit`,
    type: "Ore",
    tier: tierDef.tier,
    rarity: "Common",
    tool: "Pickaxe",
    profession: "Mining",
    minLevel: tierDef.level,
    location: `Zone Tier ${tierDef.tier}`,
    drops: [oreId]
  });

  // Wood
  const woodId = `WOOD_${tierDef.wood.toUpperCase().replace(" ", "_")}_T${tierDef.tier}`;
  const woodItem: Partial<GrudaItem> = { name: `${tierDef.wood} Log`, type: "Resource", tier: tierDef.tier };
  generatedItems.push({
    id: woodId,
    name: `${tierDef.wood} Log`,
    type: "Resource",
    rarity: "Common",
    tier: tierDef.tier,
    stats: {},
    image: resolveItemImage(woodItem),
    description: `Raw ${tierDef.wood} wood used for crafting.`,
    buyPrice: 4 * tierDef.tier
  });
  generatedNodes.push({
    id: `NODE_WOOD_T${tierDef.tier}`,
    name: `${tierDef.wood} Tree`,
    type: "Wood",
    tier: tierDef.tier,
    rarity: "Common",
    tool: "Axe",
    profession: "Logging",
    minLevel: tierDef.level,
    location: `Forest Tier ${tierDef.tier}`,
    drops: [woodId]
  });

  // Leather
  const leatherId = `LEATHER_${tierDef.leather.toUpperCase().replace(" ", "_")}_T${tierDef.tier}`;
  const leatherItem: Partial<GrudaItem> = { name: `${tierDef.leather} Leather`, type: "Resource", tier: tierDef.tier };
  generatedItems.push({
    id: leatherId,
    name: `${tierDef.leather} Leather`,
    type: "Resource",
    rarity: "Common",
    tier: tierDef.tier,
    stats: {},
    image: resolveItemImage(leatherItem),
    description: `Cured ${tierDef.leather} used for crafting.`,
    buyPrice: 7 * tierDef.tier
  });
  
  // Herbs
  const herbId = `HERB_${tierDef.herb.toUpperCase().replace(" ", "_")}_T${tierDef.tier}`;
  const herbItem: Partial<GrudaItem> = { name: `${tierDef.herb} Herb`, type: "Resource", tier: tierDef.tier };
  generatedItems.push({
    id: herbId,
    name: `${tierDef.herb} Herb`,
    type: "Resource",
    rarity: "Common",
    tier: tierDef.tier,
    stats: {},
    image: resolveItemImage(herbItem),
    description: `Magical ${tierDef.herb} herb used for alchemy.`,
    buyPrice: 6 * tierDef.tier
  });
});

// 2. Generate Weapons & Recipes from Grudge Warlords weapon sets
WEAPON_CONFIGS.forEach(config => {
  const weaponSet = GRUDGE_WEAPON_SETS[config.setKey];
  if (!weaponSet || !Array.isArray(weaponSet)) return;
  
  weaponSet.forEach(weapon => {
    MATERIAL_TIERS.forEach(tierDef => {
      const itemId = `GRUDA_WPN_${weapon.id.toUpperCase().replace(/-/g, '_')}_T${tierDef.tier}`;
      const resourceId = config.resourceType === 'metal' 
        ? `ORE_${tierDef.metal.toUpperCase().replace(/ /g, "_")}_T${tierDef.tier}`
        : `WOOD_${tierDef.wood.toUpperCase().replace(/ /g, "_")}_T${tierDef.tier}`;
      
      const baseDamage = Math.floor(config.baseDamage * tierDef.tier * 1.5);
      const isStaff = config.skillType === 'STAFF';
      const scaledStats = addBonusStats({ Damage: baseDamage }, tierDef.tier, isStaff ? "Magic" : "Melee");
      const skills = getSkillsForWeapon(config.skillType, tierDef.tier);

      const tempItem: Partial<GrudaItem> = { 
        name: weapon.name, 
        type: "Weapon", 
        tier: tierDef.tier,
        weaponId: weapon.id,
        weaponType: config.subtype
      };

      generatedItems.push({
        id: itemId,
        name: weapon.name,
        type: "Weapon",
        slot: "MainHand",
        rarity: tierDef.tier >= 6 ? "Rare" : tierDef.tier >= 4 ? "Uncommon" : "Common",
        tier: tierDef.tier,
        stats: scaledStats,
        skills: skills,
        image: resolveItemImage(tempItem),
        buyPrice: 50 * tierDef.tier * tierDef.tier,
        craftingProfession: config.profession,
        craftingLevel: tierDef.level,
        weaponId: weapon.id,
        weaponType: config.subtype,
        description: `${weapon.lore}. T${tierDef.tier} ${config.subtype}.`
      });

      generatedRecipes.push({
        id: `RECIPE_${weapon.id.toUpperCase().replace(/-/g, '_')}_T${tierDef.tier}`,
        outputItemId: itemId,
        profession: config.profession,
        levelRequired: tierDef.level,
        durationSeconds: 10 * tierDef.tier,
        ingredients: [
          { itemId: resourceId, quantity: 2 + tierDef.tier },
          { itemId: "COAL_T1", quantity: tierDef.tier }
        ]
      });
    });
  });
});

// 3. Generate Armor & Recipes from Grudge Warlords armor sets
Object.entries(GRUDGE_ARMOR_SETS).forEach(([setKey, setData]) => {
  ARMOR_MATERIALS.forEach(material => {
    ARMOR_SLOTS.forEach(slotName => {
      const slotData = ARMOR_SLOT_STATS[slotName] || { armor: 2, slot: slotName };
      
      MATERIAL_TIERS.forEach(tierDef => {
        const itemId = `GRUDA_ARM_${setKey.toUpperCase()}_${material.toUpperCase()}_${slotName.toUpperCase()}_T${tierDef.tier}`;
        
        const profession = material === 'metal' ? 'Miner' : material === 'leather' ? 'Forester' : 'Mystic';
        const resourceId = material === 'metal' 
          ? `ORE_${tierDef.metal.toUpperCase().replace(/ /g, "_")}_T${tierDef.tier}`
          : material === 'leather'
          ? `LEATHER_${tierDef.leather.toUpperCase().replace(/ /g, "_")}_T${tierDef.tier}`
          : `HERB_${tierDef.herb.toUpperCase().replace(/ /g, "_")}_T${tierDef.tier}`;
        
        const baseArmor = Math.floor(slotData.armor * tierDef.tier * 1.4);
        const scaledStats = addBonusStats({ Armor: baseArmor }, tierDef.tier, "Defense");

        const armorName = `${setData.name} ${slotName}`;
        const tempItem: Partial<GrudaItem> = { 
          name: armorName, 
          type: "Armor", 
          slot: slotData.slot, 
          tier: tierDef.tier,
          armorId: setKey,
          material: material
        };

        generatedItems.push({
          id: itemId,
          name: armorName,
          type: "Armor",
          slot: slotData.slot,
          rarity: tierDef.tier >= 6 ? "Rare" : tierDef.tier >= 4 ? "Uncommon" : "Common",
          tier: tierDef.tier,
          stats: scaledStats,
          effects: [setData.setBonus],
          image: resolveItemImage(tempItem),
          buyPrice: 40 * tierDef.tier * tierDef.tier,
          craftingProfession: profession,
          craftingLevel: tierDef.level,
          armorId: setKey,
          material: material,
          description: `${setData.lore}. T${tierDef.tier} ${material} ${slotName}.`
        });

        generatedRecipes.push({
          id: `RECIPE_${setKey.toUpperCase()}_${material.toUpperCase()}_${slotName.toUpperCase()}_T${tierDef.tier}`,
          outputItemId: itemId,
          profession: profession,
          levelRequired: tierDef.level,
          durationSeconds: 10 * tierDef.tier,
          ingredients: [
            { itemId: resourceId, quantity: 2 + tierDef.tier }
          ]
        });
      });
    });
  });
});

// 4. Add Accessories (T1-T8) with Grudge Warlords themed names
const GRUDGE_ACCESSORIES = [
  { type: 'Ring', slot: 'Ring', names: ['Bloodbound Ring', 'Wraithseal Ring', 'Oathsworn Ring', 'Grudgekeeper Ring', 'Duskward Ring', 'Emberseal Ring'] },
  { type: 'Necklace', slot: 'Necklace', names: ['Bloodfeud Pendant', 'Wraith Charm', 'Oathbreaker Amulet', 'Kinrend Medallion', 'Dusk Chain', 'Ember Collar'] },
];

GRUDGE_ACCESSORIES.forEach(accessory => {
  accessory.names.forEach((accName, nameIdx) => {
    MATERIAL_TIERS.forEach(tierDef => {
      const itemId = `GRUDA_ACC_${accName.toUpperCase().replace(/\s+/g, '_')}_T${tierDef.tier}`;
      const tempItem: Partial<GrudaItem> = { name: accName, type: "Accessory", tier: tierDef.tier };

      generatedItems.push({
        id: itemId,
        name: accName,
        type: "Accessory",
        slot: accessory.slot,
        rarity: tierDef.tier >= 6 ? "Rare" : "Uncommon",
        tier: tierDef.tier,
        stats: { DamageBonus: tierDef.tier },
        effects: [`+${tierDef.tier * 2} All Stats`],
        image: resolveItemImage(tempItem),
        buyPrice: 30 * tierDef.tier * tierDef.tier,
        craftingProfession: "Jewelcrafting",
        craftingLevel: tierDef.level,
        description: `A powerful ${accessory.type.toLowerCase()} forged from ancient grudges.`
      });
      
      generatedRecipes.push({
        id: `RECIPE_${accName.toUpperCase().replace(/\s+/g, '_')}_T${tierDef.tier}`,
        outputItemId: itemId,
        profession: "Jewelcrafting",
        levelRequired: tierDef.level,
        durationSeconds: 15 * tierDef.tier,
        ingredients: [
          { itemId: `ORE_${tierDef.metal.toUpperCase().replace(/ /g, "_")}_T${tierDef.tier}`, quantity: 2 },
          { itemId: "MANA_SHARD_T1", quantity: tierDef.tier }
        ]
      });
    });
  });
});


// 5. Add Legendaries
LEGENDARY_TEMPLATES.forEach((leg, idx) => {
  const tempItem: Partial<GrudaItem> = { name: leg.name, type: "Weapon", tier: leg.tier };
  const legendaryStats: Record<string, number> = { ...leg.stats };
  generatedItems.push({
    id: `LEGENDARY_${idx}`,
    name: leg.name,
    type: leg.type,
    slot: leg.slot,
    rarity: "Legendary",
    tier: leg.tier,
    stats: legendaryStats,
    effects: leg.effects,
    skills: ["Legendary Skill 1", "Legendary Skill 2", "Legendary Ultimate"],
    image: resolveItemImage(tempItem),
    description: "A weapon of immense power.",
    buyPrice: 10000 * leg.tier,
    sellPrice: 5000 * leg.tier
  });
});

// 6. Add Engineering Items & Recipes
const ENGINEERING_ITEMS: { tier: number; name: string; stats: Record<string, number>; desc: string }[] = [
  { tier: 1, name: "Basic Tool Kit", stats: { GatherSpeed: 5 }, desc: "Improves gathering efficiency." },
  { tier: 2, name: "Reinforced Grapple", stats: { MovementSpeed: 3 }, desc: "Used for climbing and traversal." },
  { tier: 3, name: "Clockwork Companion", stats: { Damage: 15, Defense: 5 }, desc: "A mechanical pet that aids in combat." },
  { tier: 4, name: "Steam-Powered Drill", stats: { GatherSpeed: 20 }, desc: "Dramatically increases mining speed." },
  { tier: 5, name: "Gyrocopter Mount", stats: { FlySpeed: 50 }, desc: "A personal flying machine." },
  { tier: 6, name: "Siege Ballista", stats: { Damage: 100 }, desc: "A powerful war machine for sieges." },
  { tier: 7, name: "Mech Suit Prototype", stats: { Damage: 80, Armor: 50, MaxHealth: 200 }, desc: "Advanced combat exoskeleton." },
  { tier: 8, name: "War Colossus Core", stats: { Damage: 150, Armor: 100, MaxHealth: 500 }, desc: "The heart of a legendary war machine." },
];

ENGINEERING_ITEMS.forEach(eng => {
  const itemId = `ENG_${eng.name.toUpperCase().replace(/\s+/g, '_')}_T${eng.tier}`;
  const tempItem: Partial<GrudaItem> = { name: eng.name, type: "Tool", tier: eng.tier };
  
  generatedItems.push({
    id: itemId,
    name: eng.name,
    type: "Tool",
    rarity: eng.tier >= 6 ? "Epic" : eng.tier >= 4 ? "Rare" : "Uncommon",
    tier: eng.tier,
    stats: eng.stats,
    effects: [`Engineering T${eng.tier}`],
    image: resolveItemImage(tempItem),
    description: eng.desc,
    buyPrice: 100 * eng.tier * eng.tier,
    craftingProfession: "Engineering",
    craftingLevel: eng.tier * 10
  });
  
  generatedRecipes.push({
    id: `RECIPE_ENG_T${eng.tier}`,
    outputItemId: itemId,
    profession: "Engineering",
    levelRequired: eng.tier * 10,
    durationSeconds: 30 * eng.tier,
    ingredients: [
      { itemId: "WS_METAL_GEAR", quantity: eng.tier * 2 },
      { itemId: "WS_WOODEN_COG", quantity: eng.tier }
    ]
  });
});

// 7. Add Cooking/Chef Recipes
const CHEF_RECIPES: { tier: number; name: string; color: string; stats: Record<string, number>; desc: string }[] = [
  { tier: 1, name: "Grilled Steak", color: "red", stats: { HealthRegen: 5, MaxHealth: 20 }, desc: "Hearty meal for warriors." },
  { tier: 2, name: "Spiced Roast", color: "red", stats: { AttackDamage: 5, Defense: 3 }, desc: "Boosts physical combat." },
  { tier: 3, name: "Warrior's Feast", color: "red", stats: { MaxHealth: 50, Block: 5 }, desc: "A mighty meal before battle." },
  { tier: 1, name: "Fish Soup", color: "blue", stats: { ManaRegen: 5, ManaPool: 20 }, desc: "Restores magical energy." },
  { tier: 2, name: "Clam Chowder", color: "blue", stats: { SpellDamage: 5, SpellSpeed: 2 }, desc: "Enhances spellcasting." },
  { tier: 3, name: "Arcane Broth", color: "blue", stats: { ManaPool: 50, Resistance: 10 }, desc: "Deep magical sustenance." },
  { tier: 1, name: "Garden Salad", color: "green", stats: { Stamina: 5, MovementSpeed: 2 }, desc: "Light and refreshing." },
  { tier: 2, name: "Herb Medley", color: "green", stats: { AttackSpeed: 3, CritChance: 2 }, desc: "Sharpens reflexes." },
  { tier: 3, name: "Verdant Feast", color: "green", stats: { Armor: 15, Stamina: 20 }, desc: "Nature's bounty." },
];

CHEF_RECIPES.forEach(food => {
  const itemId = `FOOD_${food.name.toUpperCase().replace(/\s+/g, '_')}_T${food.tier}`;
  const tempItem: Partial<GrudaItem> = { name: food.name, type: "Consumable", tier: food.tier };
  
  generatedItems.push({
    id: itemId,
    name: food.name,
    type: "Consumable",
    rarity: food.tier >= 3 ? "Rare" : "Uncommon",
    tier: food.tier,
    stats: food.stats,
    effects: [`${food.color === 'red' ? '🔴' : food.color === 'blue' ? '🔵' : '🟢'} ${food.color.charAt(0).toUpperCase() + food.color.slice(1)} Food`],
    image: resolveItemImage(tempItem),
    description: food.desc,
    buyPrice: 20 * food.tier,
    craftingProfession: "Cooking",
    craftingLevel: food.tier * 10
  });
  
  generatedRecipes.push({
    id: `RECIPE_FOOD_${food.color.toUpperCase()}_T${food.tier}`,
    outputItemId: itemId,
    profession: "Cooking",
    levelRequired: food.tier * 10,
    durationSeconds: 10 * food.tier,
    ingredients: [
      { itemId: food.color === 'red' ? 'FOOD_MEAT' : food.color === 'blue' ? 'FOOD_FISH' : 'POT_RED_FLOWER', quantity: food.tier * 2 }
    ]
  });
});

// 8. Add Base Reagents
const BASE_REAGENTS: GrudaItem[] = [
  { id: "COAL_T1", name: "Coal", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Fuel for smelting.", buyPrice: 2 },
  { id: "MANA_SHARD_T1", name: "Mana Shard", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Magical essence.", buyPrice: 20 },
  { id: "ESSENCE_COMMON_T1", name: "Common Essence", type: "Resource", rarity: "Common", tier: 1, stats: {}, description: "Magical dust.", buyPrice: 12 },
];

// ==========================================
// EXPORTS
// ==========================================

// ── Fallback data (generated procedurally above) ──
const FALLBACK_ITEMS = [...BASE_REAGENTS, ...WORKSTATION_ITEMS, ...generatedItems].map(item => ({
  ...item,
  image: item.image || resolveItemImage(item)
}));
const FALLBACK_RECIPES = [...generatedRecipes];
const FALLBACK_NODES = [...generatedNodes];

// ── Live exports — start as fallback, replaced by ObjectStore on sync ──
export let ITEMS: GrudaItem[] = FALLBACK_ITEMS;
export let RECIPES: GrudaRecipe[] = FALLBACK_RECIPES;
export let RESOURCE_NODES: GrudaResourceNode[] = FALLBACK_NODES;

/** Replace ITEMS with ObjectStore canonical data (called from App.tsx init) */
export async function syncItemsFromObjectStore(): Promise<void> {
  try {
    const [itemsData, weaponsData, armorData] = await Promise.all([
      fetchItemsDatabase(),
      fetchWeapons(),
      fetchArmor(),
    ]);

    // Items database from ObjectStore
    const osItems = (itemsData as any)?.items || (itemsData as any)?.weapons;
    if (Array.isArray(osItems) && osItems.length > 0) {
      const mapped: GrudaItem[] = osItems.map((item: any) => ({
        id: item.id || item.name?.replace(/\s+/g, '_').toUpperCase(),
        name: item.name,
        type: item.type || item.category || 'Weapon',
        slot: item.slot,
        rarity: item.rarity || (item.tier >= 7 ? 'Legendary' : item.tier >= 5 ? 'Epic' : item.tier >= 3 ? 'Rare' : 'Common'),
        tier: item.tier || 1,
        stats: item.stats || {},
        effects: item.abilities || item.passives || [],
        image: item.icon ? assetUrl(item.icon) : resolveItemImage({ name: item.name, type: item.type, tier: item.tier }),
        description: item.lore || item.description || '',
        buyPrice: item.buyPrice || item.tier * 100,
      }));
      // Merge: ObjectStore items take priority, keep fallback items not in ObjectStore
      const osIds = new Set(mapped.map(i => i.id));
      ITEMS = [...mapped, ...FALLBACK_ITEMS.filter(i => !osIds.has(i.id))];
      console.debug('[grudaDB] Synced', mapped.length, 'items from ObjectStore');
    }
  } catch (err) {
    console.warn('[grudaDB] ObjectStore sync failed, using fallback data:', err);
  }
}

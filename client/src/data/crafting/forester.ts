import { ProfessionData } from "@/lib/craftingTypes";

export const foresterData: ProfessionData = {
  name: "Forester",
  role: "Forester Specialization System",
  color: "text-green-500",
  icon: "🌲",
  treeData: [
    { id: 1, n: "Logging Basics", x: 50, y: 90, req: 0, p: null, nodeType: "stat" },
    { id: 2, n: "Skinning Basics", x: 50, y: 80, req: 5, p: 1, nodeType: "stat" },
    { id: 3, n: "Wood Seasoning", x: 40, y: 70, req: 10, p: 2, nodeType: "effect" },
    { id: 4, n: "Hide Curing", x: 60, y: 70, req: 10, p: 2, nodeType: "effect" },
    { id: 5, n: "Axe Forging I", x: 25, y: 65, req: 15, p: 3, nodeType: "recipe" },
    { id: 6, n: "Wood Wall Fab", x: 10, y: 60, req: 20, p: 5, nodeType: "recipe" },
    { id: 7, n: "Hardwood Mastery", x: 20, y: 50, req: 30, p: 5, nodeType: "stat" },
    { id: 8, n: "Skullsplitter Spec", x: 30, y: 45, req: 35, p: 7, nodeType: "combat" },
    { id: 9, n: "Stone Reinforce", x: 5, y: 45, req: 40, p: 6, nodeType: "effect" },
    { id: 10, n: "Ironmaw Forging", x: 25, y: 30, req: 60, p: 8, nodeType: "combat" },
    { id: 11, n: "Gorehowl Smith", x: 15, y: 15, req: 85, p: 10, nodeType: "recipe" },
    { id: 12, n: "Iron Clad Walls", x: 5, y: 20, req: 90, p: 9, nodeType: "recipe" },
    { id: 13, n: "Leather Stitching", x: 50, y: 55, req: 15, p: 4, nodeType: "recipe" },
    { id: 14, n: "Berry Foraging", x: 40, y: 45, req: 25, p: 13, nodeType: "stat" },
    { id: 15, n: "Leather Armor (Sets)", x: 60, y: 45, req: 30, p: 13, nodeType: "recipe" },
    { id: 16, n: "Pristine Skinning", x: 50, y: 40, req: 45, p: 15, nodeType: "effect" },
    { id: 17, n: "Exotic Dyes", x: 45, y: 30, req: 55, p: 16, nodeType: "effect" },
    { id: 18, n: "Legendary Pelts", x: 55, y: 25, req: 75, p: 16, nodeType: "stat" },
    { id: 19, n: "Mythic Skinning", x: 50, y: 10, req: 95, p: 18, nodeType: "recipe" },
    { id: 20, n: "Fletching Basics", x: 75, y: 65, req: 15, p: 4, nodeType: "recipe" },
    { id: 21, n: "Arrow Smithing", x: 90, y: 60, req: 20, p: 20, nodeType: "recipe" },
    { id: 22, n: "Crossbow Tech", x: 80, y: 50, req: 30, p: 20, nodeType: "combat" },
    { id: 23, n: "Watchtower Blueprint", x: 95, y: 45, req: 40, p: 21, nodeType: "recipe" },
    { id: 24, n: "Wraithbone Bow", x: 70, y: 45, req: 50, p: 22, nodeType: "combat" },
    { id: 25, n: "Shipbuilding I", x: 80, y: 35, req: 60, p: 24, nodeType: "recipe" },
    { id: 26, n: "Elemental Arrows", x: 90, y: 30, req: 70, p: 21, nodeType: "combat" },
    { id: 27, n: "Naval Architecture", x: 75, y: 20, req: 80, p: 25, nodeType: "effect" },
    { id: 28, n: "War Galleon", x: 85, y: 10, req: 95, p: 27, nodeType: "recipe" },
  ],
  recipes: [
    // ═══════════════════════════════════════════════════════════════
    // BOWS (6 weapons)
    // ═══════════════════════════════════════════════════════════════
    { id: "bow_1", n: "Wraithbone Bow", lvl: 1, icon: "🏹", mats: {"Bone": 3, "String": 2}, type: "Bow", desc: "Carved from wraith bones. Grudge Arrow: Builds Mark." },
    { id: "bow_2", n: "Bloodstring Bow", lvl: 5, icon: "🏹", mats: {"Wood": 3, "Blood": 2}, type: "Bow", desc: "Strung with blood. Crimson Shot: High bleed." },
    { id: "bow_3", n: "Shadowflight Bow", lvl: 10, icon: "🏹", mats: {"Dark Wood": 3, "Void Dust": 2}, type: "Bow", desc: "Flies shadows. Night Barrage: AoE Silence." },
    { id: "bow_4", n: "Emberthorn Bow", lvl: 15, icon: "🏹", mats: {"Fire Wood": 3, "Thorn": 2}, type: "Bow", desc: "Thorns of ember. Explosive Arrows: DoT AoE." },
    { id: "bow_5", n: "Ironvine Bow", lvl: 20, icon: "🏹", mats: {"Iron": 3, "Vine": 2}, type: "Bow", desc: "Vines of iron. Rooting Shot: Single Root." },
    { id: "bow_6", n: "Duskreaver Bow", lvl: 25, icon: "🏹", mats: {"Shadow Wood": 3, "Gem": 2}, type: "Bow", desc: "Reaves at dusk. Phantom Arrows: Multi hit." },

    // ═══════════════════════════════════════════════════════════════
    // LEATHER ARMOR - Stalker Set (6 pieces)
    // ═══════════════════════════════════════════════════════════════
    { id: "arm_stalker_head", n: "Stalker Hood", lvl: 5, icon: "🥷", mats: {"Leather": 4, "Silk": 1}, type: "Armor", desc: "Stalker Set (1/6): +Dex. Shadow hunter." },
    { id: "arm_stalker_chest", n: "Stalker Tunic", lvl: 10, icon: "🧥", mats: {"Leather": 8, "Silk": 2}, type: "Armor", desc: "Stalker Set (2/6): +Crit Chance. Silent." },
    { id: "arm_stalker_legs", n: "Stalker Leggings", lvl: 8, icon: "👖", mats: {"Leather": 6, "Silk": 1}, type: "Armor", desc: "Stalker Set (3/6): +Move Speed. Swift." },
    { id: "arm_stalker_hands", n: "Stalker Gloves", lvl: 6, icon: "🧤", mats: {"Leather": 3, "Silk": 1}, type: "Armor", desc: "Stalker Set (4/6): +Range. Precise." },
    { id: "arm_stalker_feet", n: "Stalker Boots", lvl: 7, icon: "👢", mats: {"Leather": 4}, type: "Armor", desc: "Stalker Set (5/6): +Stealth. Quiet." },
    { id: "arm_stalker_shoulder", n: "Stalker Pauldrons", lvl: 9, icon: "🎖️", mats: {"Leather": 5, "Silk": 1}, type: "Armor", desc: "Stalker Set (6/6): Set Bonus +20% Crit." },

    // ═══════════════════════════════════════════════════════════════
    // LEATHER ARMOR - Brawler Set (6 pieces)
    // ═══════════════════════════════════════════════════════════════
    { id: "arm_brawler_head", n: "Brawler Cap", lvl: 15, icon: "🧢", mats: {"Hide": 5}, type: "Armor", desc: "Brawler Set (1/6): +Str. Street tough." },
    { id: "arm_brawler_chest", n: "Brawler Jerkin", lvl: 20, icon: "🎽", mats: {"Hide": 10}, type: "Armor", desc: "Brawler Set (2/6): +Dodge. Agile." },
    { id: "arm_brawler_legs", n: "Brawler Pants", lvl: 18, icon: "👖", mats: {"Hide": 8}, type: "Armor", desc: "Brawler Set (3/6): +Stamina. Enduring." },
    { id: "arm_brawler_hands", n: "Brawler Wraps", lvl: 16, icon: "🧤", mats: {"Hide": 4}, type: "Armor", desc: "Brawler Set (4/6): +Unarmed Dmg. Fighter." },
    { id: "arm_brawler_feet", n: "Brawler Boots", lvl: 17, icon: "👢", mats: {"Hide": 4, "Leather": 2}, type: "Armor", desc: "Brawler Set (5/6): +Kick Dmg. Brutal." },
    { id: "arm_brawler_shoulder", n: "Brawler Guards", lvl: 19, icon: "🎖️", mats: {"Hide": 6}, type: "Armor", desc: "Brawler Set (6/6): Set Bonus +25% Dodge." },

    // ═══════════════════════════════════════════════════════════════
    // WOOD PROCESSING (6 recipes)
    // ═══════════════════════════════════════════════════════════════
    { id: "wood_1", n: "Pine Planks", lvl: 1, icon: "🪵", mats: {"Pine Log": 3}, type: "Wood", desc: "Basic wooden planks." },
    { id: "wood_2", n: "Oak Planks", lvl: 10, icon: "🪵", mats: {"Oak Log": 3}, type: "Wood", desc: "Sturdy oak planks." },
    { id: "wood_3", n: "Maple Planks", lvl: 20, icon: "🪵", mats: {"Maple Log": 3}, type: "Wood", desc: "Quality maple planks." },
    { id: "wood_4", n: "Ash Planks", lvl: 30, icon: "🪵", mats: {"Ash Log": 3}, type: "Wood", desc: "Flexible ash planks." },
    { id: "wood_5", n: "Ironwood Planks", lvl: 40, icon: "🪵", mats: {"Ironwood Log": 3}, type: "Wood", desc: "Metal-hard planks." },
    { id: "wood_6", n: "Worldtree Planks", lvl: 50, icon: "🪵", mats: {"Worldtree Log": 3}, type: "Wood", desc: "Divine planks." },

    // ═══════════════════════════════════════════════════════════════
    // LEATHER PROCESSING (6 recipes)
    // ═══════════════════════════════════════════════════════════════
    { id: "leather_1", n: "Rawhide Leather", lvl: 1, icon: "🦴", mats: {"Rawhide": 3}, type: "Leather", desc: "Basic leather." },
    { id: "leather_2", n: "Thick Leather", lvl: 10, icon: "🦴", mats: {"Thick Hide": 3}, type: "Leather", desc: "Sturdy leather." },
    { id: "leather_3", n: "Rugged Leather", lvl: 20, icon: "🦴", mats: {"Rugged Hide": 3}, type: "Leather", desc: "Tough leather." },
    { id: "leather_4", n: "Hardened Leather", lvl: 30, icon: "🦴", mats: {"Hardened Hide": 3}, type: "Leather", desc: "Armored leather." },
    { id: "leather_5", n: "Wyrm Leather", lvl: 40, icon: "🦴", mats: {"Wyrm Hide": 3}, type: "Leather", desc: "Dragon leather." },
    { id: "leather_6", n: "Divine Leather", lvl: 50, icon: "🦴", mats: {"Divine Hide": 3}, type: "Leather", desc: "Holy leather." },

    // ═══════════════════════════════════════════════════════════════
    // BACK - Capes (6 items)
    // ═══════════════════════════════════════════════════════════════
    { id: "back_1", n: "Traveler's Cloak", lvl: 5, icon: "🧥", mats: {"Leather": 4, "Silk": 2}, type: "Back", desc: "+Move Speed. Road worn." },
    { id: "back_2", n: "Hunter's Cape", lvl: 15, icon: "🧥", mats: {"Hide": 6, "Leather": 3}, type: "Back", desc: "+Stealth. Forest camouflage." },
    { id: "back_3", n: "Stalker's Shroud", lvl: 25, icon: "🧥", mats: {"Rugged Leather": 5, "Void Dust": 2}, type: "Back", desc: "+Crit Chance. Silent death." },
    { id: "back_4", n: "Beastmaster Cape", lvl: 35, icon: "🧥", mats: {"Wyrm Leather": 4, "Bone": 5}, type: "Back", desc: "+Pet Damage. Wild bond." },
    { id: "back_5", n: "Ranger's Mantle", lvl: 45, icon: "🧥", mats: {"Hardened Leather": 6, "Gem": 2}, type: "Back", desc: "+Range. Eagle eye." },
    { id: "back_6", n: "Shadowstalker Cloak", lvl: 55, icon: "🧥", mats: {"Divine Leather": 5, "Shadow Ingot": 2}, type: "Back", desc: "+Invisibility. Vanish." },

    // ═══════════════════════════════════════════════════════════════
    // NECKLACES (6 items)
    // ═══════════════════════════════════════════════════════════════
    { id: "neck_1", n: "Bone Pendant", lvl: 5, icon: "📿", mats: {"Bone": 3, "String": 1}, type: "Necklace", desc: "+5 Dexterity. Hunter trophy." },
    { id: "neck_2", n: "Fang Necklace", lvl: 15, icon: "📿", mats: {"Bone": 5, "Leather": 2}, type: "Necklace", desc: "+Crit Damage. Predator's." },
    { id: "neck_3", n: "Treeheart Amulet", lvl: 25, icon: "📿", mats: {"Ironwood Log": 2, "Gem": 1}, type: "Necklace", desc: "+Nature Resist. Forest gift." },
    { id: "neck_4", n: "Beastclaw Pendant", lvl: 35, icon: "📿", mats: {"Wyrm Hide": 3, "Bone": 5}, type: "Necklace", desc: "+Attack Speed. Savage." },
    { id: "neck_5", n: "Woodsinger Charm", lvl: 45, icon: "📿", mats: {"Worldtree Log": 1, "Gem": 2}, type: "Necklace", desc: "+All Skills. Nature's voice." },
    { id: "neck_6", n: "Spirit of the Wild", lvl: 55, icon: "📿", mats: {"Divine Leather": 3, "Holy Essence": 1}, type: "Necklace", desc: "+Dodge. Untamed spirit." },

    // ═══════════════════════════════════════════════════════════════
    // RELICS (6 items)
    // ═══════════════════════════════════════════════════════════════
    { id: "relic_1", n: "Acorn Charm", lvl: 10, icon: "🔮", mats: {"Oak Log": 3, "Leaf": 5}, type: "Relic", desc: "+Gathering Speed. Nature's luck." },
    { id: "relic_2", n: "Feather Token", lvl: 20, icon: "🔮", mats: {"Feather": 5, "Leather": 2}, type: "Relic", desc: "+Range Damage. Swift shot." },
    { id: "relic_3", n: "Antler Relic", lvl: 30, icon: "🔮", mats: {"Bone": 8, "Hide": 4}, type: "Relic", desc: "+Stamina Regen. Wild endurance." },
    { id: "relic_4", n: "Treant's Eye", lvl: 40, icon: "🔮", mats: {"Ironwood Log": 3, "Gem": 2}, type: "Relic", desc: "+Nature Magic. Ancient sight." },
    { id: "relic_5", n: "Wolf Fang Totem", lvl: 50, icon: "🔮", mats: {"Wyrm Hide": 4, "Bone": 6}, type: "Relic", desc: "+Pack Bonus. Alpha wolf." },
    { id: "relic_6", n: "Heart of the Forest", lvl: 60, icon: "🔮", mats: {"Worldtree Log": 2, "Divine Hide": 2}, type: "Relic", desc: "+All Stats. Nature's blessing." },

    // ═══════════════════════════════════════════════════════════════
    // TOOLS & MISC
    // ═══════════════════════════════════════════════════════════════
    { id: "tool_1", n: "Rough Wood Axe", lvl: 1, icon: "🪓", mats: {"Log": 2, "Twine": 1}, type: "Tool", desc: "Basic logging tool." },
    { id: "tool_2", n: "Skinning Knife", lvl: 5, icon: "🔪", mats: {"Iron": 1, "Wood": 1}, type: "Tool", desc: "For leather work." },
    { id: "struct_1", n: "Wood Wall Section", lvl: 20, icon: "🧱", mats: {"Log": 10}, type: "Structure", desc: "Defensive structure." },
    { id: "vehicle_1", n: "War Galleon", lvl: 95, icon: "🚢", mats: {"Ironwood": 50, "Silk": 20, "Iron": 100}, type: "Vehicle", desc: "Massive warship." },
    { id: "potion_1", n: "Barkskin Potion", lvl: 15, icon: "🧉", mats: {"Bark": 2, "Sap": 1}, type: "Potion", desc: "Increases armor." },
    { id: "potion_2", n: "Forest Salve", lvl: 10, icon: "🌿", mats: {"Herb": 1, "Water": 1}, type: "Potion", desc: "Heals wounds." },
  ],
  inventory: { "Log": 50, "Hide": 20, "Twine": 10, "Iron": 5, "Oak": 10, "Bone": 0, "Silk": 0, "Ironwood": 0 }
};

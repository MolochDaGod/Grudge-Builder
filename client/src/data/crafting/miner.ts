import { ProfessionData } from "@/lib/craftingTypes";
import { professionSkillTreeBackground } from "@/lib/artAssets";

export const minerData: ProfessionData = {
  name: "Miner",
  role: "Weaponsmith & Armorsmith",
  color: "text-amber-500", 
  icon: "⛏️",
  bgImage: professionSkillTreeBackground("Miner"),
  treeData: [
    // ═══════════════════════════════════════════════════════════════
    // CORE NODE - Central Hub (Bottom Center)
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 1, n: "Miner's Initiation", x: 50, y: 92, req: 0, p: null,
      branch: "Core",
      desc: "Begin your journey into the depths. Learn the fundamentals of mining and metalwork.",
      bonuses: [{ type: "successChance", value: 5, target: "all" }],
      unlocks: ["Flint Pickaxe", "Basic Smelting"],
      nodeType: "stat"
    },
    { 
      id: 2, n: "Ore Identification", x: 50, y: 82, req: 5, p: 1,
      branch: "Core",
      desc: "Learn to identify valuable ore deposits by sight and sound.",
      bonuses: [{ type: "qualityBoost", value: 8, target: "ores" }],
      unlocks: ["Copper Mining", "Iron Mining"],
      nodeType: "stat"
    },
    { 
      id: 3, n: "Metallurgy Basics", x: 50, y: 72, req: 10, p: 2,
      branch: "Core",
      desc: "Master the science of working with metals. Unlocks all three specialization paths.",
      bonuses: [{ type: "successChance", value: 8, target: "ingots" }],
      unlocks: ["T2 Smelting", "Steel Crafting"],
      nodeType: "recipe"
    },

    // ═══════════════════════════════════════════════════════════════
    // LEFT BRANCH - WEAPONS
    // Swords, Axes, Daggers, Hammers, Greataxes
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 10, n: "Blade Forging", x: 20, y: 65, req: 15, p: 3,
      branch: "Weapons",
      desc: "Learn to forge sharp blades from refined metals.",
      bonuses: [{ type: "successChance", value: 10, target: "swords" }, { type: "qualityBoost", value: 8, target: "swords" }],
      unlocks: ["Iron Sword", "Bloodfeud Blade"],
      nodeType: "recipe"
    },
    { 
      id: 11, n: "Edge Tempering", x: 12, y: 55, req: 25, p: 10,
      branch: "Weapons",
      desc: "Master the art of tempering blades for maximum sharpness and durability.",
      bonuses: [{ type: "qualityBoost", value: 12, target: "swords" }, { type: "enchantPower", value: 8, target: "swords" }],
      unlocks: ["Tempered Blade", "Wraithfang"],
      nodeType: "effect"
    },
    { 
      id: 12, n: "Axe Smithing", x: 8, y: 42, req: 35, p: 11,
      branch: "Weapons",
      desc: "Forge devastating axes designed to cleave through armor.",
      bonuses: [{ type: "successChance", value: 12, target: "axes" }, { type: "qualityBoost", value: 10, target: "axes" }],
      unlocks: ["Gorehowl", "Skullsplitter"],
      nodeType: "combat"
    },
    { 
      id: 13, n: "Dagger Crafting", x: 18, y: 35, req: 40, p: 11,
      branch: "Weapons",
      desc: "Craft precise daggers for quick, deadly strikes.",
      bonuses: [{ type: "successChance", value: 15, target: "daggers" }, { type: "qualityBoost", value: 12, target: "daggers" }],
      unlocks: ["Nightfang", "Bloodshiv"],
      nodeType: "combat"
    },
    { 
      id: 14, n: "Hammer Forging", x: 5, y: 28, req: 50, p: 12,
      branch: "Weapons",
      desc: "Create mighty hammers that crush bones and shatter shields.",
      bonuses: [{ type: "successChance", value: 12, target: "hammers" }, { type: "enchantPower", value: 10, target: "hammers" }],
      unlocks: ["Titanmaul"],
      nodeType: "combat"
    },
    { 
      id: 15, n: "Greataxe Mastery", x: 15, y: 20, req: 65, p: 14,
      branch: "Weapons",
      desc: "Forge massive two-handed axes that cleave through multiple foes.",
      bonuses: [{ type: "qualityBoost", value: 18, target: "greataxes" }, { type: "tierUnlock", value: 7, target: "greataxes" }],
      unlocks: ["Skullsunder", "Bloodreaver"],
      nodeType: "combat"
    },
    { 
      id: 16, n: "Legendary Weaponsmith", x: 10, y: 10, req: 90, p: 15,
      branch: "Weapons",
      desc: "Achieve legendary status. Craft weapons spoken of in tales.",
      bonuses: [{ type: "tierUnlock", value: 8, target: "weapons" }, { type: "qualityBoost", value: 25, target: "weapons" }, { type: "doubleYield", value: 10, target: "weapons" }],
      unlocks: ["World Breaker"],
      nodeType: "recipe"
    },

    // ═══════════════════════════════════════════════════════════════
    // MIDDLE BRANCH - RESOURCE GATHERING & REFINING
    // Mining rates, better quality, relics, gem cutting
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 20, n: "Efficient Mining", x: 42, y: 62, req: 15, p: 3,
      branch: "Gathering",
      desc: "Mine faster with improved technique and tool handling.",
      bonuses: [{ type: "speedBoost", value: 15, target: "mining" }, { type: "doubleYield", value: 8, target: "ores" }],
      unlocks: ["Faster Mining", "Double Ore Chance"],
      nodeType: "effect"
    },
    { 
      id: 21, n: "Deep Vein Sensing", x: 35, y: 50, req: 28, p: 20,
      branch: "Gathering",
      desc: "Sense hidden ore veins deep within the rock.",
      bonuses: [{ type: "qualityBoost", value: 15, target: "ores" }, { type: "doubleYield", value: 12, target: "ores" }],
      unlocks: ["Rare Ore Detection", "Hidden Vein Finder"],
      nodeType: "stat"
    },
    { 
      id: 22, n: "Master Smelting", x: 50, y: 45, req: 40, p: 21,
      branch: "Gathering",
      desc: "Smelt ores with minimal waste and maximum purity.",
      bonuses: [{ type: "materialReduction", value: 15, target: "ingots" }, { type: "qualityBoost", value: 18, target: "ingots" }],
      unlocks: ["Pure Ingots", "Alloy Crafting"]
    },
    { 
      id: 23, n: "Gem Extraction", x: 42, y: 35, req: 50, p: 22,
      branch: "Gathering",
      desc: "Extract gems from ore without damaging their structure.",
      bonuses: [{ type: "gemQuality", value: 20 }, { type: "doubleYield", value: 15, target: "gems" }],
      unlocks: ["Gem Mining", "Pristine Gems"]
    },
    { 
      id: 24, n: "Relic Detection", x: 58, y: 35, req: 55, p: 22,
      branch: "Gathering",
      desc: "Sense ancient relics buried in the earth.",
      bonuses: [{ type: "qualityBoost", value: 25, target: "relics" }, { type: "doubleYield", value: 10, target: "relics" }],
      unlocks: ["Ancient Relic Mining", "Artifact Discovery"]
    },
    { 
      id: 25, n: "Mythril Prospecting", x: 50, y: 22, req: 75, p: 23,
      branch: "Gathering",
      desc: "Locate and extract the legendary mythril ore.",
      bonuses: [{ type: "tierUnlock", value: 7, target: "ores" }, { type: "qualityBoost", value: 20, target: "ores" }],
      unlocks: ["Mythril Mining", "T7 Ores"]
    },
    { 
      id: 26, n: "Divine Ore Mastery", x: 50, y: 10, req: 95, p: 25,
      branch: "Gathering",
      desc: "Master the extraction of divine ores from the planet's core.",
      bonuses: [{ type: "tierUnlock", value: 8, target: "ores" }, { type: "doubleYield", value: 20, target: "all" }, { type: "qualityBoost", value: 30, target: "ores" }],
      unlocks: ["Divine Ore Mining", "T8 Resources"]
    },

    // ═══════════════════════════════════════════════════════════════
    // RIGHT BRANCH - ARMOR CRAFTING
    // Metal armor with special effects
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 30, n: "Plate Shaping", x: 80, y: 65, req: 15, p: 3,
      branch: "Armor",
      desc: "Shape metal plates into protective armor pieces.",
      bonuses: [{ type: "successChance", value: 10, target: "armor" }, { type: "qualityBoost", value: 8, target: "armor" }],
      unlocks: ["Iron Helm", "Guardian Set"]
    },
    { 
      id: 31, n: "Reinforced Plating", x: 88, y: 55, req: 28, p: 30,
      branch: "Armor",
      desc: "Add reinforced layers for extra protection.",
      bonuses: [{ type: "qualityBoost", value: 12, target: "armor" }, { type: "enchantPower", value: 10, target: "armor" }],
      unlocks: ["Steel Plate", "Guardian Set"]
    },
    { 
      id: 32, n: "Shield Crafting", x: 92, y: 42, req: 40, p: 31,
      branch: "Armor",
      desc: "Forge mighty shields that can block devastating blows.",
      bonuses: [{ type: "successChance", value: 15, target: "shields" }, { type: "qualityBoost", value: 15, target: "shields" }],
      unlocks: ["Iron Shield", "Tower Shield", "Obsidian Shield"]
    },
    { 
      id: 33, n: "Berserker Smithing", x: 82, y: 38, req: 45, p: 31,
      branch: "Armor",
      desc: "Craft armor that enhances offensive capabilities.",
      bonuses: [{ type: "enchantPower", value: 15, target: "armor" }, { type: "socketChance", value: 12, target: "armor" }],
      unlocks: ["Berserker Set", "Offensive Plate"]
    },
    { 
      id: 34, n: "Elemental Resistance", x: 95, y: 28, req: 60, p: 32,
      branch: "Armor",
      desc: "Imbue armor with elemental resistances.",
      bonuses: [{ type: "enchantPower", value: 20, target: "armor" }, { type: "qualityBoost", value: 15, target: "armor" }],
      unlocks: ["Fire Resistant Plate", "Frost Resistant Plate"]
    },
    { 
      id: 35, n: "Masterwork Plate", x: 85, y: 20, req: 75, p: 34,
      branch: "Armor",
      desc: "Craft masterwork quality plate armor with exceptional stats.",
      bonuses: [{ type: "tierUnlock", value: 7, target: "armor" }, { type: "qualityBoost", value: 22, target: "armor" }],
      unlocks: ["Masterwork Set"]
    },
    { 
      id: 36, n: "Divine Armorsmith", x: 90, y: 10, req: 95, p: 35,
      branch: "Armor",
      desc: "Forge armor blessed by the gods themselves.",
      bonuses: [{ type: "tierUnlock", value: 8, target: "armor" }, { type: "doubleYield", value: 15, target: "armor" }, { type: "qualityBoost", value: 30, target: "armor" }],
      unlocks: ["Divine Plate Set"]
    },

    // ═══════════════════════════════════════════════════════════════
    // CROSS-LINKS (Hybrid Nodes)
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 40, n: "Weapon Sockets", x: 25, y: 48, req: 45, p: 12,
      branch: "Hybrid",
      desc: "Add gem sockets to weapons during forging.",
      bonuses: [{ type: "socketChance", value: 18, target: "weapons" }, { type: "gemQuality", value: 10 }]
    },
    { 
      id: 41, n: "Armor Sockets", x: 75, y: 48, req: 45, p: 31,
      branch: "Hybrid",
      desc: "Add gem sockets to armor pieces during crafting.",
      bonuses: [{ type: "socketChance", value: 18, target: "armor" }, { type: "gemQuality", value: 10 }]
    },
    { 
      id: 42, n: "Ore Efficiency", x: 60, y: 55, req: 35, p: 21,
      branch: "Hybrid",
      desc: "Use less ore when crafting without sacrificing quality.",
      bonuses: [{ type: "materialReduction", value: 12, target: "weapons" }, { type: "materialReduction", value: 12, target: "armor" }]
    },
  ],
  recipes: [
    // ═══════════════════════════════════════════════════════════════
    // SWORDS - Each can be crafted at T1-T8 via tier selector
    // ═══════════════════════════════════════════════════════════════
    { id: "sword_bloodfeud", n: "Bloodfeud Blade", lvl: 1, icon: "⚔️", mats: {"Iron Ingot": 3, "Leather": 1}, type: "Sword", desc: "Forged in endless clan blood feuds. Vengeful Slash: Builds Grudge Mark stack." },
    { id: "sword_wraithfang", n: "Wraithfang", lvl: 10, icon: "🗡️", mats: {"Steel Ingot": 3, "Void Dust": 1}, type: "Sword", desc: "Whispers forgotten grudges. Shadow Edge: Dash + Stun." },
    { id: "sword_oathbreaker", n: "Oathbreaker", lvl: 20, icon: "🗡️", mats: {"Dark Iron Ingot": 3, "Obsidian": 1}, type: "Sword", desc: "Breaks ancient oaths. Lunging Strike: Ranged thrust." },
    { id: "sword_kinrend", n: "Kinrend", lvl: 30, icon: "🗡️", mats: {"Blood Stone": 3, "Bone": 2}, type: "Sword", desc: "Rends bonds of kinship. Kin Strike: High single target damage." },
    { id: "sword_dusksinger", n: "Dusksinger", lvl: 40, icon: "🗡️", mats: {"Shadow Ingot": 3, "Gem": 1}, type: "Sword", desc: "Sings of twilight. Dusk Blade: Invisible dash." },
    { id: "sword_emberclad", n: "Emberclad", lvl: 50, icon: "🗡️", mats: {"Fire Essence": 3, "Steel Ingot": 2}, type: "Sword", desc: "Clad in flames. Flame Slash: Applies burn." },
    
    // ═══════════════════════════════════════════════════════════════
    // AXES - Each can be crafted at T1-T8 via tier selector
    // ═══════════════════════════════════════════════════════════════
    { id: "axe_gorehowl", n: "Gorehowl", lvl: 1, icon: "🪓", mats: {"Iron Ingot": 3, "Wood": 2}, type: "Axe", desc: "Howls with gore. Rending Chop: Applies Bleed." },
    { id: "axe_skullsplitter", n: "Skullsplitter", lvl: 15, icon: "🪓", mats: {"Steel Ingot": 3, "Bone": 2}, type: "Axe", desc: "Splits skulls. Headcracker: Stun + Damage." },
    { id: "axe_veinreaver", n: "Veinreaver", lvl: 25, icon: "🪓", mats: {"Dark Iron Ingot": 3, "Blood": 2}, type: "Axe", desc: "Reaves veins. Blood Harvest: AoE Lifesteal." },
    { id: "axe_ironmaw", n: "Ironmaw", lvl: 35, icon: "🪓", mats: {"Iron Ingot": 5, "Obsidian": 1}, type: "Axe", desc: "Maw of iron. Iron Bite: Ignores defense." },
    { id: "axe_dreadcleaver", n: "Dreadcleaver", lvl: 45, icon: "🪓", mats: {"Shadow Ingot": 3, "Void Dust": 2}, type: "Axe", desc: "Cleaves dread. Frenzied Chop: High burst damage." },
    { id: "axe_bonehew", n: "Bonehew", lvl: 55, icon: "🪓", mats: {"Bone": 5, "Steel Ingot": 2}, type: "Axe", desc: "Hews bone. Bone Break: Reduces armor." },

    // ═══════════════════════════════════════════════════════════════
    // DAGGERS - Each can be crafted at T1-T8 via tier selector
    // ═══════════════════════════════════════════════════════════════
    { id: "dagger_nightfang", n: "Nightfang", lvl: 1, icon: "🗡️", mats: {"Iron Ingot": 2, "Leather": 1}, type: "Dagger", desc: "Fang of night. Shadow Stab: Builds Mark." },
    { id: "dagger_bloodshiv", n: "Bloodshiv", lvl: 12, icon: "🗡️", mats: {"Steel Ingot": 2, "Blood": 1}, type: "Dagger", desc: "Drips blood. Crimson Stab: High bleed." },
    { id: "dagger_wraithclaw", n: "Wraithclaw", lvl: 24, icon: "🗡️", mats: {"Dark Iron Ingot": 2, "Void Dust": 1}, type: "Dagger", desc: "Claw of wraith. Shadow Strike: AoE Silence." },
    { id: "dagger_emberfang", n: "Emberfang", lvl: 36, icon: "🗡️", mats: {"Fire Essence": 2, "Steel Ingot": 1}, type: "Dagger", desc: "Burning hate. Flame Dagger: Burn DoT." },
    { id: "dagger_ironspike", n: "Ironspike", lvl: 48, icon: "🗡️", mats: {"Iron Ingot": 4}, type: "Dagger", desc: "Unyielding iron. Pinning Stab: Root burst." },
    { id: "dagger_duskblade", n: "Duskblade", lvl: 60, icon: "🗡️", mats: {"Shadow Ingot": 2, "Gem": 1}, type: "Dagger", desc: "Blade of dusk. Frenzied Cuts: Multi burst." },

    // ═══════════════════════════════════════════════════════════════
    // SPEARS
    // ═══════════════════════════════════════════════════════════════
    { id: "spear_iron", n: "Iron Pike", lvl: 1, icon: "🔱", mats: {"Iron Ingot": 4, "Wood": 3}, type: "Spear", desc: "Basic iron spear. Thrust: Long range poke." },
    { id: "spear_steel", n: "Steel Lance", lvl: 15, icon: "🔱", mats: {"Steel Ingot": 4, "Wood": 3}, type: "Spear", desc: "Cavalry lance. Charge: Gap closer." },
    { id: "spear_mithril", n: "Mithril Javelin", lvl: 30, icon: "🔱", mats: {"Mithril Ingot": 4, "Leather": 2}, type: "Spear", desc: "Throwable spear. Hurl: Ranged attack." },
    { id: "spear_blood", n: "Bloodspear", lvl: 45, icon: "🔱", mats: {"Dark Iron Ingot": 5, "Blood": 3}, type: "Spear", desc: "Thirsting spear. Impale: Lifesteal." },
    { id: "spear_void", n: "Voidpiercer", lvl: 60, icon: "🔱", mats: {"Shadow Ingot": 5, "Void Essence": 2}, type: "Spear", desc: "Pierces dimensions. Phase Strike: Ignore armor." },
    { id: "spear_divine", n: "Divine Trident", lvl: 75, icon: "🔱", mats: {"Divine Ingot": 6, "Holy Essence": 3}, type: "Spear", desc: "Holy trident. Trinity Strike: Triple hit." },

    // ═══════════════════════════════════════════════════════════════
    // MACES
    // ═══════════════════════════════════════════════════════════════
    { id: "mace_iron", n: "Iron Cudgel", lvl: 1, icon: "🏏", mats: {"Iron Ingot": 5, "Wood": 2}, type: "Mace", desc: "Simple iron mace. Bash: Stun chance." },
    { id: "mace_steel", n: "Steel Flail", lvl: 15, icon: "🏏", mats: {"Steel Ingot": 5, "Chain": 2}, type: "Mace", desc: "Chained flail. Whirl: AoE damage." },
    { id: "mace_spiked", n: "Spiked Morningstar", lvl: 30, icon: "🏏", mats: {"Mithril Ingot": 5, "Iron Ingot": 3}, type: "Mace", desc: "Spiked ball. Crush: Armor break." },
    { id: "mace_blood", n: "Bloodbludgeon", lvl: 45, icon: "🏏", mats: {"Dark Iron Ingot": 6, "Blood": 3}, type: "Mace", desc: "Blood-soaked mace. Splatter: Bleed AoE." },
    { id: "mace_obsidian", n: "Obsidian Crusher", lvl: 60, icon: "🏏", mats: {"Obsidian": 8, "Shadow Ingot": 3}, type: "Mace", desc: "Volcanic mace. Shatter: Shield break." },
    { id: "mace_divine", n: "Divine Scepter", lvl: 75, icon: "🏏", mats: {"Divine Ingot": 6, "Holy Essence": 2}, type: "Mace", desc: "Holy scepter. Judgment: True damage." },

    // ═══════════════════════════════════════════════════════════════
    // HAMMERS
    // ═══════════════════════════════════════════════════════════════
    { id: "hammer_titan", n: "Titanmaul", lvl: 1, icon: "🔨", mats: {"Iron Ingot": 6, "Stone": 4}, type: "Hammer", desc: "Titanic grudge. Earthshatter: AoE Slow." },
    { id: "hammer_blood", n: "Bloodcrusher", lvl: 20, icon: "🔨", mats: {"Steel Ingot": 6, "Blood": 4}, type: "Hammer", desc: "Crushes with blood. Crimson Smash: AoE Bleed." },
    { id: "hammer_stone", n: "Stonebreaker", lvl: 35, icon: "🔨", mats: {"Mithril Ingot": 6, "Obsidian": 4}, type: "Hammer", desc: "Breaks stone. Shattering Blow: Armor Break." },
    { id: "hammer_oath", n: "Oathcrusher", lvl: 50, icon: "🔨", mats: {"Dark Iron Ingot": 6, "Void Dust": 2}, type: "Hammer", desc: "Crushes oaths. Oath Shatter: Dispel Buffs." },
    { id: "hammer_doom", n: "Doomhammer", lvl: 65, icon: "🔨", mats: {"Shadow Ingot": 6, "Bone": 4}, type: "Hammer", desc: "Hammer of doom. Cataclysmic Strike: Stun AoE." },
    { id: "hammer_divine", n: "Divine Maul", lvl: 80, icon: "🔨", mats: {"Divine Ingot": 6, "Holy Essence": 2}, type: "Hammer", desc: "Divine judgment. Holy Smash: True Damage." },

    // ═══════════════════════════════════════════════════════════════
    // GREATAXES
    // ═══════════════════════════════════════════════════════════════
    { id: "gaxe_skull", n: "Skullsunder", lvl: 1, icon: "🪓", mats: {"Iron Ingot": 5, "Wood": 3}, type: "Greataxe", desc: "Sunders skulls. Brutal Hew: AoE Bleed." },
    { id: "gaxe_blood", n: "Bloodreaver", lvl: 20, icon: "🪓", mats: {"Steel Ingot": 5, "Blood": 3}, type: "Greataxe", desc: "Reaves in arcs. Crimson Harvest: AoE Heal." },
    { id: "gaxe_world", n: "Worldsplitter", lvl: 40, icon: "🪓", mats: {"Mithril Ingot": 8, "Void Essence": 3}, type: "Greataxe", desc: "Splits the world. Cataclysm: Massive AoE." },
    { id: "gaxe_oath", n: "Oathcleaver", lvl: 55, icon: "🪓", mats: {"Dark Iron Ingot": 6, "Obsidian": 2}, type: "Greataxe", desc: "Cleaves oaths. Betrayer's Arc: Bonus vs Allies." },
    { id: "gaxe_dusk", n: "Duskrend", lvl: 70, icon: "🪓", mats: {"Shadow Ingot": 6, "Gem": 2}, type: "Greataxe", desc: "Rends at dusk. Twilight Cleave: Invisible." },
    { id: "gaxe_breaker", n: "World Breaker", lvl: 85, icon: "🪓", mats: {"Divine Ingot": 8, "Void Essence": 5}, type: "Greataxe", desc: "Breaks worlds. Apocalypse: Screen Clear." },

    // ═══════════════════════════════════════════════════════════════
    // GREATSWORDS
    // ═══════════════════════════════════════════════════════════════
    { id: "gsword_venge", n: "Vengeance Blade", lvl: 1, icon: "⚔️", mats: {"Iron Ingot": 8, "Leather": 2}, type: "Greatsword", desc: "Blade of vengeance. Grudge Sweep: Builds Mark." },
    { id: "gsword_blood", n: "Bloodwrath", lvl: 20, icon: "⚔️", mats: {"Steel Ingot": 8, "Blood": 4}, type: "Greatsword", desc: "Wrath of blood. Crimson Arc: AoE Lifesteal." },
    { id: "gsword_shadow", n: "Shadowcleave", lvl: 40, icon: "⚔️", mats: {"Dark Iron Ingot": 8, "Void Dust": 2}, type: "Greatsword", desc: "Cleaves shadows. Shadow Slash: Dash + AoE." },
    { id: "gsword_kin", n: "Kinslayer", lvl: 55, icon: "⚔️", mats: {"Blood Stone": 6, "Bone": 4}, type: "Greatsword", desc: "Slays kin. Family Grudge: High Single Target." },
    { id: "gsword_dusk", n: "Duskbringer", lvl: 70, icon: "⚔️", mats: {"Shadow Ingot": 8, "Gem": 2}, type: "Greatsword", desc: "Brings dusk. Twilight Wave: AoE Blind." },
    { id: "gsword_divine", n: "Divine Judgment", lvl: 85, icon: "⚔️", mats: {"Divine Ingot": 10, "Holy Essence": 3}, type: "Greatsword", desc: "Divine judgment. Holy Cleave: True Damage." },

    // ═══════════════════════════════════════════════════════════════
    // METAL ARMOR - Guardian Set (each piece can be T1-T8)
    // ═══════════════════════════════════════════════════════════════
    { id: "arm_guardian_helm", n: "Guardian Helm", lvl: 5, icon: "🪖", mats: {"Iron Ingot": 5}, type: "Armor", desc: "Guardian Set (1/6): +HP. Stalwart defense." },
    { id: "arm_guardian_chest", n: "Guardian Plate", lvl: 10, icon: "👕", mats: {"Iron Ingot": 10}, type: "Armor", desc: "Guardian Set (2/6): +Block. Unyielding." },
    { id: "arm_guardian_legs", n: "Guardian Greaves", lvl: 8, icon: "👖", mats: {"Iron Ingot": 8}, type: "Armor", desc: "Guardian Set (3/6): +Defense. Immovable." },
    { id: "arm_guardian_hands", n: "Guardian Gauntlets", lvl: 6, icon: "🧤", mats: {"Iron Ingot": 4}, type: "Armor", desc: "Guardian Set (4/6): +Parry. Iron grip." },
    { id: "arm_guardian_feet", n: "Guardian Boots", lvl: 7, icon: "👢", mats: {"Iron Ingot": 4, "Leather": 1}, type: "Armor", desc: "Guardian Set (5/6): +Stability. Unmovable." },
    { id: "arm_guardian_shoulder", n: "Guardian Pauldrons", lvl: 9, icon: "🎖️", mats: {"Iron Ingot": 6}, type: "Armor", desc: "Guardian Set (6/6): Set Bonus +20% Block." },

    // ═══════════════════════════════════════════════════════════════
    // METAL ARMOR - Berserker Set
    // ═══════════════════════════════════════════════════════════════
    { id: "arm_berserker_helm", n: "Berserker Helm", lvl: 25, icon: "🪖", mats: {"Steel Ingot": 5, "Blood": 1}, type: "Armor", desc: "Berserker Set (1/6): +Str. Fury unleashed." },
    { id: "arm_berserker_chest", n: "Berserker Plate", lvl: 30, icon: "👕", mats: {"Steel Ingot": 10, "Blood": 2}, type: "Armor", desc: "Berserker Set (2/6): +Crit Dmg. Bloodthirst." },
    { id: "arm_berserker_legs", n: "Berserker Greaves", lvl: 28, icon: "👖", mats: {"Steel Ingot": 8, "Blood": 1}, type: "Armor", desc: "Berserker Set (3/6): +Atk Speed. Rampage." },
    { id: "arm_berserker_hands", n: "Berserker Gauntlets", lvl: 26, icon: "🧤", mats: {"Steel Ingot": 4, "Blood": 1}, type: "Armor", desc: "Berserker Set (4/6): +Crit Chance. Savage." },
    { id: "arm_berserker_feet", n: "Berserker Boots", lvl: 27, icon: "👢", mats: {"Steel Ingot": 4, "Leather": 2}, type: "Armor", desc: "Berserker Set (5/6): +Move Speed. Charge." },
    { id: "arm_berserker_shoulder", n: "Berserker Pauldrons", lvl: 29, icon: "🎖️", mats: {"Steel Ingot": 6, "Blood": 2}, type: "Armor", desc: "Berserker Set (6/6): Set Bonus +25% Damage." },

    // ═══════════════════════════════════════════════════════════════
    // SHIELDS (each can be T1-T8)
    // ═══════════════════════════════════════════════════════════════
    { id: "shield_iron", n: "Iron Buckler", lvl: 1, icon: "🛡️", mats: {"Iron Ingot": 3}, type: "Shield", desc: "Basic iron shield. +10% Block." },
    { id: "shield_steel", n: "Steel Kite Shield", lvl: 20, icon: "🛡️", mats: {"Steel Ingot": 5}, type: "Shield", desc: "Kite shaped shield. +15% Block." },
    { id: "shield_obsidian", n: "Obsidian Shield", lvl: 35, icon: "🛡️", mats: {"Obsidian": 10, "Iron Ingot": 5}, type: "Shield", desc: "Volcanic protection. Fire Resist." },
    { id: "shield_mithril", n: "Mithril Tower Shield", lvl: 50, icon: "🛡️", mats: {"Mithril Ingot": 8}, type: "Shield", desc: "Massive tower shield. +25% Block." },
    { id: "shield_void", n: "Void Aegis", lvl: 65, icon: "🛡️", mats: {"Shadow Ingot": 6, "Void Essence": 3}, type: "Shield", desc: "Absorbs magic. Spell Reflect." },
    { id: "shield_divine", n: "Divine Bulwark", lvl: 80, icon: "🛡️", mats: {"Divine Ingot": 10, "Holy Essence": 5}, type: "Shield", desc: "Divine protection. Immunity Proc." },

    // ═══════════════════════════════════════════════════════════════
    // RINGS (accessories)
    // ═══════════════════════════════════════════════════════════════
    { id: "ring_iron", n: "Iron Band", lvl: 5, icon: "💍", mats: {"Iron Ingot": 2}, type: "Ring", desc: "+5 Strength. Simple iron." },
    { id: "ring_steel", n: "Steel Signet", lvl: 20, icon: "💍", mats: {"Steel Ingot": 2, "Gem": 1}, type: "Ring", desc: "+10 Strength. Steel crafted." },
    { id: "ring_mithril", n: "Mithril Loop", lvl: 35, icon: "💍", mats: {"Mithril Ingot": 2, "Gem": 1}, type: "Ring", desc: "+15 Strength. Lightweight." },
    { id: "ring_obsidian", n: "Obsidian Ring", lvl: 50, icon: "💍", mats: {"Obsidian": 3, "Iron Ingot": 1}, type: "Ring", desc: "+Fire Resist. Volcanic." },
    { id: "ring_shadow", n: "Shadow Band", lvl: 65, icon: "💍", mats: {"Shadow Ingot": 2, "Void Essence": 1}, type: "Ring", desc: "+20 Strength. Dark power." },
    { id: "ring_divine", n: "Divine Signet", lvl: 80, icon: "💍", mats: {"Divine Ingot": 2, "Holy Essence": 1}, type: "Ring", desc: "+25 Strength. Holy." },

    // ═══════════════════════════════════════════════════════════════
    // RELICS (accessories)
    // ═══════════════════════════════════════════════════════════════
    { id: "relic_ore", n: "Ore Charm", lvl: 10, icon: "🔮", mats: {"Iron Ore": 5, "Gem": 1}, type: "Relic", desc: "+Mining Speed. Lucky find." },
    { id: "relic_smelt", n: "Smelter's Token", lvl: 25, icon: "🔮", mats: {"Steel Ingot": 3, "Coal": 5}, type: "Relic", desc: "+Refining Bonus. Hot work." },
    { id: "relic_forge", n: "Forge Ember", lvl: 40, icon: "🔮", mats: {"Fire Essence": 2, "Iron Ingot": 3}, type: "Relic", desc: "+Weapon Crafting. Eternal flame." },
    { id: "relic_mountain", n: "Mountain Heart", lvl: 55, icon: "🔮", mats: {"Obsidian": 5, "Mithril Ingot": 2}, type: "Relic", desc: "+HP Regen. Stone endurance." },
    { id: "relic_earth", n: "Earthen Core", lvl: 70, icon: "🔮", mats: {"Shadow Ingot": 3, "Gem": 3}, type: "Relic", desc: "+Block Chance. Solid defense." },
    { id: "relic_titan", n: "Titan's Shard", lvl: 85, icon: "🔮", mats: {"Divine Ingot": 3, "Void Essence": 2}, type: "Relic", desc: "+All Stats. Godly fragment." },

    // ═══════════════════════════════════════════════════════════════
    // REFINING & TOOLS
    // ═══════════════════════════════════════════════════════════════
    { id: "tool_pickaxe", n: "Flint Pickaxe", lvl: 1, icon: "⛏️", mats: {"Stone": 5, "Stick": 2}, type: "Tool", desc: "Basic mining tool." },
    { id: "tool_iron_pick", n: "Iron Pickaxe", lvl: 15, icon: "⛏️", mats: {"Iron Ingot": 3, "Wood": 2}, spec: 20, type: "Tool", desc: "Mines faster than flint." },
    { id: "tool_steel_pick", n: "Steel Pickaxe", lvl: 30, icon: "⛏️", mats: {"Steel Ingot": 3, "Hardwood": 2}, spec: 21, type: "Tool", desc: "Professional mining tool." },
    { id: "refine_iron", n: "Iron Ingot", lvl: 10, icon: "⬛", mats: {"Iron Ore": 3, "Coal": 1}, spec: 22, type: "Refining", desc: "Refined iron for crafting." },
    { id: "refine_steel", n: "Steel Ingot", lvl: 20, icon: "⬜", mats: {"Iron Ingot": 2, "Coal": 2}, spec: 22, type: "Refining", desc: "Strong steel alloy." },
    { id: "refine_mithril", n: "Mithril Ingot", lvl: 50, icon: "💠", mats: {"Mithril Ore": 3, "Arcane Coal": 1}, spec: 25, type: "Refining", desc: "Legendary lightweight metal." },
  ],
  inventory: { 
    "Stone": 50, "Stick": 20, "Wood": 30, "Hardwood": 10,
    "Iron Ore": 15, "Coal": 10, "Mithril Ore": 3, "Arcane Coal": 2,
    "Iron Ingot": 5, "Steel Ingot": 2, "Mithril Ingot": 1,
    "Dark Iron Ingot": 1, "Shadow Ingot": 1, "Divine Ingot": 0,
    "Leather": 10, "Blood": 5, "Bone": 8,
    "Void Dust": 3, "Void Essence": 2, "Holy Essence": 1,
    "Fire Essence": 2, "Obsidian": 2, "Gem": 3, "Chain": 2,
    "Blood Stone": 1
  }
};

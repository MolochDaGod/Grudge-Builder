import { ProfessionData } from "@/lib/craftingTypes";
import { professionSkillTreeBackground } from "@/lib/artAssets";

export const mysticData: ProfessionData = {
  name: "Mystic",
  role: "Arcane Crafter & Enchanter",
  color: "text-purple-400",
  icon: "🔮",
  bgImage: professionSkillTreeBackground("Mystic"),
  treeData: [
    // ═══════════════════════════════════════════════════════════════
    // ASTRAL NEXUS - Central Hub (Bottom Center)
    // Core mana mastery that branches into 5 constellations
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 1, n: "Astral Nexus", x: 50, y: 92, req: 0, p: null,
      branch: "Nexus",
      desc: "The center of all mystical power. Begin your journey into the arcane arts.",
      bonuses: [{ type: "successChance", value: 5, target: "all" }],
      unlocks: ["Basic Enchanting", "Mana Potion"],
      nodeType: "stat"
    },
    { 
      id: 2, n: "Mana Weaving", x: 50, y: 82, req: 5, p: 1,
      branch: "Nexus",
      desc: "Learn to weave raw mana into stable patterns for crafting.",
      bonuses: [{ type: "essenceEfficiency", value: 8 }],
      unlocks: ["Essence Refinement"],
      nodeType: "effect"
    },
    { 
      id: 3, n: "Arcane Attunement", x: 50, y: 72, req: 10, p: 2,
      branch: "Nexus",
      desc: "Attune yourself to the cosmic energies. Unlocks all 5 constellation paths.",
      bonuses: [{ type: "qualityBoost", value: 5, target: "all" }],
      unlocks: ["T2 Crafting"],
      nodeType: "stat"
    },

    // ═══════════════════════════════════════════════════════════════
    // ENCHANTER'S CONSTELLATION (Upper Left)
    // Specializes in weapon/armor enchantments and stat augmentation
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 10, n: "Rune Inscription", x: 20, y: 65, req: 15, p: 3,
      branch: "Enchanter",
      desc: "Inscribe basic runes onto equipment to grant minor bonuses.",
      bonuses: [{ type: "enchantPower", value: 10, target: "enchants" }],
      unlocks: ["Minor Enchant: Strength", "Minor Enchant: Intellect"],
      nodeType: "recipe"
    },
    { 
      id: 11, n: "Glyph Mastery", x: 12, y: 55, req: 25, p: 10,
      branch: "Enchanter",
      desc: "Master complex glyphs that provide powerful stat increases.",
      bonuses: [{ type: "enchantPower", value: 15, target: "enchants" }, { type: "successChance", value: 8, target: "enchants" }],
      unlocks: ["Major Enchant: Might", "Major Enchant: Wisdom"],
      nodeType: "effect"
    },
    { 
      id: 12, n: "Elemental Infusion", x: 8, y: 42, req: 35, p: 11,
      branch: "Enchanter",
      desc: "Infuse weapons with elemental damage types.",
      bonuses: [{ type: "enchantPower", value: 12, target: "weapons" }],
      unlocks: ["Fire Infusion", "Frost Infusion", "Lightning Infusion"],
      nodeType: "combat"
    },
    { 
      id: 13, n: "Soul Binding", x: 18, y: 35, req: 50, p: 11,
      branch: "Enchanter",
      desc: "Bind souls to items, granting them sentience and power.",
      bonuses: [{ type: "qualityBoost", value: 15, target: "enchants" }, { type: "doubleYield", value: 5, target: "enchants" }],
      unlocks: ["Soul Enchant: Lifesteal", "Soul Enchant: Mana Leech"],
      nodeType: "effect"
    },
    { 
      id: 14, n: "Arcane Overcharge", x: 5, y: 25, req: 70, p: 12,
      branch: "Enchanter",
      desc: "Push enchantments beyond normal limits. Risk of failure but massive power.",
      bonuses: [{ type: "enchantPower", value: 25, target: "enchants" }],
      unlocks: ["Overcharged Enchantment"],
      nodeType: "combat"
    },
    { 
      id: 15, n: "Cosmic Inscription", x: 15, y: 12, req: 90, p: 14,
      branch: "Enchanter",
      desc: "Write enchantments using the language of the cosmos itself.",
      bonuses: [{ type: "enchantPower", value: 30, target: "enchants" }, { type: "tierUnlock", value: 8, target: "enchants" }],
      unlocks: ["Divine Enchantment", "T8 Enchanting"],
      nodeType: "recipe"
    },

    // ═══════════════════════════════════════════════════════════════
    // SPELLWRIGHT'S CONSTELLATION (Left)
    // Specializes in spell pages, scrolls, and tier spell upgrades
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 20, n: "Scroll Scribing", x: 32, y: 62, req: 15, p: 3,
      branch: "Spellwright",
      desc: "Learn to scribe spells onto scrolls for single-use casting.",
      bonuses: [{ type: "successChance", value: 10, target: "scrolls" }],
      unlocks: ["Scroll: Fireball", "Scroll: Frost Nova"],
      nodeType: "recipe"
    },
    { 
      id: 21, n: "Spell Page Crafting", x: 28, y: 50, req: 30, p: 20,
      branch: "Spellwright",
      desc: "Create spell pages that teach permanent spell upgrades.",
      bonuses: [{ type: "qualityBoost", value: 12, target: "spellpages" }],
      unlocks: ["Spell Page: Tier II", "Spell Page: Tier III"],
      nodeType: "recipe"
    },
    { 
      id: 22, n: "Arcane Lexicon", x: 22, y: 40, req: 45, p: 21,
      branch: "Spellwright",
      desc: "Compile spell pages into powerful lexicons of knowledge.",
      bonuses: [{ type: "materialReduction", value: 15, target: "spellpages" }, { type: "successChance", value: 10, target: "spellpages" }],
      unlocks: ["Lexicon of Fire", "Lexicon of Frost"],
      nodeType: "effect"
    },
    { 
      id: 23, n: "Grimoire Binding", x: 35, y: 32, req: 60, p: 22,
      branch: "Spellwright",
      desc: "Bind multiple spell pages into grimoires of immense power.",
      bonuses: [{ type: "tierUnlock", value: 6, target: "spellpages" }],
      unlocks: ["Spell Page: Tier V", "Spell Page: Tier VI"],
      nodeType: "recipe"
    },
    { 
      id: 24, n: "Tome of Mastery", x: 28, y: 20, req: 80, p: 23,
      branch: "Spellwright",
      desc: "Create master tomes that grant entire spell schools.",
      bonuses: [{ type: "qualityBoost", value: 20, target: "spellpages" }, { type: "doubleYield", value: 10, target: "scrolls" }],
      unlocks: ["Tome of Destruction", "Tome of Restoration"],
      nodeType: "effect"
    },
    { 
      id: 25, n: "Codex of Infinity", x: 32, y: 8, req: 95, p: 24,
      branch: "Spellwright",
      desc: "The ultimate spellcraft. Create codexes with limitless spell potential.",
      bonuses: [{ type: "tierUnlock", value: 8, target: "spellpages" }, { type: "successChance", value: 20, target: "spellpages" }],
      unlocks: ["Spell Page: Tier VIII", "Codex of the Void"],
      nodeType: "recipe"
    },

    // ═══════════════════════════════════════════════════════════════
    // ARCANIST FORGE (Upper Center)
    // Specializes in magical staves and arcane weapons
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 30, n: "Staff Shaping", x: 50, y: 60, req: 15, p: 3,
      branch: "Arcanist",
      desc: "Shape magical wood into conduits for arcane energy.",
      bonuses: [{ type: "successChance", value: 10, target: "staffs" }],
      unlocks: ["Apprentice Staff", "Fire Staff T1"],
      nodeType: "recipe"
    },
    { 
      id: 31, n: "Crystal Focus", x: 50, y: 48, req: 30, p: 30,
      branch: "Arcanist",
      desc: "Embed crystals into staves to focus and amplify magical power.",
      bonuses: [{ type: "qualityBoost", value: 15, target: "staffs" }, { type: "socketChance", value: 10, target: "staffs" }],
      unlocks: ["Crystal-Tipped Staff", "Frost Staff T2"],
      nodeType: "stat"
    },
    { 
      id: 32, n: "Elemental Core", x: 42, y: 38, req: 45, p: 31,
      branch: "Arcanist",
      desc: "Craft elemental cores that define a staff's magical affinity.",
      bonuses: [{ type: "enchantPower", value: 15, target: "staffs" }],
      unlocks: ["Fire Core", "Frost Core", "Holy Core", "Arcane Core"],
      nodeType: "combat"
    },
    { 
      id: 33, n: "Void Channeling", x: 58, y: 38, req: 45, p: 31,
      branch: "Arcanist",
      desc: "Channel void energy through staves for devastating attacks.",
      bonuses: [{ type: "qualityBoost", value: 12, target: "staffs" }, { type: "enchantPower", value: 10, target: "staffs" }],
      unlocks: ["Void Staff T4", "Lightning Staff T4"],
      nodeType: "combat"
    },
    { 
      id: 34, n: "Archmage Crafting", x: 50, y: 25, req: 70, p: 32,
      branch: "Arcanist",
      desc: "Craft staves worthy of archmages with multiple elemental affinities.",
      bonuses: [{ type: "tierUnlock", value: 7, target: "staffs" }, { type: "successChance", value: 15, target: "staffs" }],
      unlocks: ["Staff of Elements T7", "Archmage Staff"],
      nodeType: "recipe"
    },
    { 
      id: 35, n: "Staff of the Grudge", x: 50, y: 10, req: 95, p: 34,
      branch: "Arcanist",
      desc: "The legendary Staff of the Grudge. Ultimate mystical weapon.",
      bonuses: [{ type: "tierUnlock", value: 8, target: "staffs" }, { type: "qualityBoost", value: 25, target: "staffs" }],
      unlocks: ["Staff of the Grudge", "T8 Staff Crafting"],
      nodeType: "recipe"
    },

    // ═══════════════════════════════════════════════════════════════
    // SOULBINDER'S CONSTELLATION (Right)
    // Specializes in gems, necklaces, and soul-bound accessories
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 40, n: "Gem Cutting", x: 68, y: 62, req: 15, p: 3,
      branch: "Soulbinder",
      desc: "Cut raw gems into shapes that can hold magical energy.",
      bonuses: [{ type: "successChance", value: 10, target: "gems" }],
      unlocks: ["Cut Ruby", "Cut Sapphire", "Cut Emerald"],
      nodeType: "recipe"
    },
    { 
      id: 41, n: "Gem Faceting", x: 75, y: 52, req: 30, p: 40,
      branch: "Soulbinder",
      desc: "Create precise facets that maximize a gem's magical potential.",
      bonuses: [{ type: "gemQuality", value: 15 }, { type: "qualityBoost", value: 10, target: "gems" }],
      unlocks: ["Brilliant Cut", "Radiant Cut"],
      nodeType: "stat"
    },
    { 
      id: 42, n: "Necklace Smithing", x: 82, y: 45, req: 40, p: 41,
      branch: "Soulbinder",
      desc: "Craft magical necklaces that channel gem powers directly.",
      bonuses: [{ type: "successChance", value: 12, target: "necklaces" }, { type: "socketChance", value: 15, target: "necklaces" }],
      unlocks: ["Mana Pendant", "Amulet of Power"],
      nodeType: "recipe"
    },
    { 
      id: 43, n: "Soul Gem Crafting", x: 70, y: 38, req: 55, p: 41,
      branch: "Soulbinder",
      desc: "Infuse gems with captured souls for incredible power.",
      bonuses: [{ type: "gemQuality", value: 20 }, { type: "enchantPower", value: 15, target: "gems" }],
      unlocks: ["Soul Gem", "Trapped Essence"],
      nodeType: "effect"
    },
    { 
      id: 44, n: "Astral Jewelry", x: 78, y: 28, req: 75, p: 42,
      branch: "Soulbinder",
      desc: "Create jewelry that connects the wearer to astral planes.",
      bonuses: [{ type: "tierUnlock", value: 7, target: "necklaces" }, { type: "qualityBoost", value: 18, target: "necklaces" }],
      unlocks: ["Astral Amulet", "Cosmic Pendant T7"],
      nodeType: "recipe"
    },
    { 
      id: 45, n: "Divine Gems", x: 72, y: 15, req: 90, p: 44,
      branch: "Soulbinder",
      desc: "Cut gems blessed by the gods themselves.",
      bonuses: [{ type: "gemQuality", value: 30 }, { type: "tierUnlock", value: 8, target: "gems" }],
      unlocks: ["Divine Ruby", "Divine Sapphire", "T8 Gem Cutting"],
      nodeType: "recipe"
    },
    { 
      id: 46, n: "Heart of the Cosmos", x: 85, y: 12, req: 95, p: 45,
      branch: "Soulbinder",
      desc: "Create the legendary Heart of the Cosmos necklace.",
      bonuses: [{ type: "tierUnlock", value: 8, target: "necklaces" }, { type: "successChance", value: 25, target: "necklaces" }],
      unlocks: ["Heart of the Cosmos", "T8 Necklace Crafting"],
      nodeType: "recipe"
    },

    // ═══════════════════════════════════════════════════════════════
    // CHRONOWEAVER'S CONSTELLATION (Upper Right)
    // Specializes in cloth armor and time-woven fabrics
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 50, n: "Fabric Weaving", x: 80, y: 65, req: 15, p: 3,
      branch: "Chronoweaver",
      desc: "Weave magical threads into protective fabrics.",
      bonuses: [{ type: "successChance", value: 10, target: "cloth" }],
      unlocks: ["Linen Robe", "Apprentice Cloth Set"],
      nodeType: "recipe"
    },
    { 
      id: 51, n: "Enchanted Threads", x: 88, y: 55, req: 28, p: 50,
      branch: "Chronoweaver",
      desc: "Spin threads infused with raw magical essence.",
      bonuses: [{ type: "qualityBoost", value: 12, target: "cloth" }, { type: "materialReduction", value: 10, target: "cloth" }],
      unlocks: ["Silk Robe", "Enchanted Cloth T2"],
      nodeType: "effect"
    },
    { 
      id: 52, n: "Moonweave Crafting", x: 92, y: 42, req: 45, p: 51,
      branch: "Chronoweaver",
      desc: "Harvest moonlight into threads of ethereal beauty.",
      bonuses: [{ type: "qualityBoost", value: 15, target: "cloth" }, { type: "enchantPower", value: 10, target: "cloth" }],
      unlocks: ["Moonweave Robe", "Starweave Set T4"],
      nodeType: "recipe"
    },
    { 
      id: 53, n: "Starweave Mastery", x: 85, y: 32, req: 60, p: 52,
      branch: "Chronoweaver",
      desc: "Weave starlight into armor that protects against cosmic threats.",
      bonuses: [{ type: "tierUnlock", value: 6, target: "cloth" }, { type: "successChance", value: 15, target: "cloth" }],
      unlocks: ["Starweave Set T6", "Astral Robes"],
      nodeType: "combat"
    },
    { 
      id: 54, n: "Voidweave Secrets", x: 90, y: 22, req: 80, p: 53,
      branch: "Chronoweaver",
      desc: "Master the forbidden art of weaving void energy into fabric.",
      bonuses: [{ type: "qualityBoost", value: 22, target: "cloth" }, { type: "enchantPower", value: 20, target: "cloth" }],
      unlocks: ["Voidweave Set T7", "Robes of the Void"],
      nodeType: "effect"
    },
    { 
      id: 55, n: "Divine Vestments", x: 95, y: 10, req: 95, p: 54,
      branch: "Chronoweaver",
      desc: "Create vestments worn by gods and cosmic entities.",
      bonuses: [{ type: "tierUnlock", value: 8, target: "cloth" }, { type: "doubleYield", value: 15, target: "cloth" }],
      unlocks: ["Divine Cloth Set T8", "Vestments of Eternity"],
      nodeType: "recipe"
    },

    // ═══════════════════════════════════════════════════════════════
    // CROSS-LINKS (Hybrid Nodes connecting constellations)
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 60, n: "Enchanted Fabrics", x: 55, y: 50, req: 40, p: 31,
      branch: "Hybrid",
      desc: "Apply enchantments directly during cloth crafting.",
      bonuses: [{ type: "enchantPower", value: 12, target: "cloth" }, { type: "qualityBoost", value: 8, target: "cloth" }],
      nodeType: "effect"
    },
    { 
      id: 61, n: "Gemstone Staves", x: 60, y: 30, req: 65, p: 33,
      branch: "Hybrid",
      desc: "Integrate gem sockets directly into staff designs.",
      bonuses: [{ type: "socketChance", value: 20, target: "staffs" }, { type: "gemQuality", value: 10 }],
      nodeType: "stat"
    },
    { 
      id: 62, n: "Spell-Woven Cloth", x: 40, y: 55, req: 35, p: 20,
      branch: "Hybrid",
      desc: "Weave spell formulas directly into cloth armor.",
      bonuses: [{ type: "enchantPower", value: 10, target: "cloth" }, { type: "successChance", value: 8, target: "scrolls" }],
      nodeType: "effect"
    },
  ],
  recipes: [
    // ═══════════════════════════════════════════════════════════════
    // FIRE STAVES (6 weapons)
    // ═══════════════════════════════════════════════════════════════
    { id: "staff_fire_1", n: "Emberwrath Staff", lvl: 1, icon: "🔥", mats: {"Pine Log": 3, "Minor Fire Essence": 2}, type: "Staff", desc: "Fire Bolt: Builds Burn stacks." },
    { id: "staff_fire_2", n: "Sunfire Staff", lvl: 5, icon: "🔥", mats: {"Oak Log": 3, "Fire Essence": 2}, type: "Staff", desc: "Solar Flare: AoE Burn." },
    { id: "staff_fire_3", n: "Inferno Spire", lvl: 10, icon: "🔥", mats: {"Maple Log": 4, "Greater Fire Essence": 3}, type: "Staff", desc: "Inferno Wave: Line AoE." },
    { id: "staff_fire_4", n: "Phoenix Staff", lvl: 15, icon: "🔥", mats: {"Ash Log": 5, "Phoenix Feather": 1}, type: "Staff", desc: "Rebirth: Self-resurrect proc." },
    { id: "staff_fire_5", n: "Magma Spire", lvl: 20, icon: "🔥", mats: {"Ironwood Log": 6, "Lava Core": 2}, type: "Staff", desc: "Lava Surge: DoT Zone." },
    { id: "staff_fire_6", n: "Solar Judgment", lvl: 25, icon: "🔥", mats: {"Worldtree Log": 8, "Sun Essence": 5}, type: "Staff", desc: "Solar Strike: Ultimate fire." },

    // ═══════════════════════════════════════════════════════════════
    // FROST STAVES (6 weapons)
    // ═══════════════════════════════════════════════════════════════
    { id: "staff_frost_1", n: "Glacial Spire", lvl: 1, icon: "❄️", mats: {"Pine Log": 3, "Minor Frost Essence": 2}, type: "Staff", desc: "Frost Bolt: Applies Chill." },
    { id: "staff_frost_2", n: "Winter's Grudge", lvl: 5, icon: "❄️", mats: {"Oak Log": 3, "Frost Essence": 2}, type: "Staff", desc: "Blizzard: AoE Slow." },
    { id: "staff_frost_3", n: "Frostbite Staff", lvl: 10, icon: "❄️", mats: {"Maple Log": 4, "Greater Frost Essence": 3}, type: "Staff", desc: "Deep Freeze: Stun." },
    { id: "staff_frost_4", n: "Avalanche Spire", lvl: 15, icon: "❄️", mats: {"Ash Log": 5, "Snowflake Crystal": 1}, type: "Staff", desc: "Avalanche: Knockback AoE." },
    { id: "staff_frost_5", n: "Permafrost Staff", lvl: 20, icon: "❄️", mats: {"Ironwood Log": 6, "Ice Core": 2}, type: "Staff", desc: "Frozen Ground: Zone control." },
    { id: "staff_frost_6", n: "Absolute Zero", lvl: 25, icon: "❄️", mats: {"Worldtree Log": 8, "Void Ice": 5}, type: "Staff", desc: "Time Stop: Ultimate frost." },

    // ═══════════════════════════════════════════════════════════════
    // HOLY STAVES (6 weapons)
    // ═══════════════════════════════════════════════════════════════
    { id: "staff_holy_1", n: "Dawnspire", lvl: 1, icon: "✨", mats: {"Pine Log": 3, "Minor Holy Essence": 2}, type: "Staff", desc: "Holy Light: Heals allies." },
    { id: "staff_holy_2", n: "Redemption Staff", lvl: 5, icon: "✨", mats: {"Oak Log": 3, "Holy Essence": 2}, type: "Staff", desc: "Cleanse: Remove debuffs." },
    { id: "staff_holy_3", n: "Sacred Light", lvl: 10, icon: "✨", mats: {"Maple Log": 4, "Greater Holy Essence": 3}, type: "Staff", desc: "Divine Shield: Immunity." },
    { id: "staff_holy_4", n: "Archangel Staff", lvl: 15, icon: "✨", mats: {"Ash Log": 5, "Angel Feather": 1}, type: "Staff", desc: "Wings: Movement buff." },
    { id: "staff_holy_5", n: "Benediction", lvl: 20, icon: "✨", mats: {"Ironwood Log": 6, "Holy Core": 2}, type: "Staff", desc: "Mass Heal: Party heal." },
    { id: "staff_holy_6", n: "Divine Judgment", lvl: 25, icon: "✨", mats: {"Worldtree Log": 8, "Divine Essence": 5}, type: "Staff", desc: "Smite Evil: Ultimate holy." },

    // ═══════════════════════════════════════════════════════════════
    // LIGHTNING STAVES (6 weapons)
    // ═══════════════════════════════════════════════════════════════
    { id: "staff_lightning_1", n: "Stormwrath", lvl: 1, icon: "⚡", mats: {"Pine Log": 3, "Minor Storm Essence": 2}, type: "Staff", desc: "Thunder Bolt: Chain lightning." },
    { id: "staff_lightning_2", n: "Tempest Spire", lvl: 5, icon: "⚡", mats: {"Oak Log": 3, "Storm Essence": 2}, type: "Staff", desc: "Thunder Clap: AoE Stun." },
    { id: "staff_lightning_3", n: "Thunderlord Staff", lvl: 10, icon: "⚡", mats: {"Maple Log": 4, "Greater Storm Essence": 3}, type: "Staff", desc: "Lightning Strike: Burst dmg." },
    { id: "staff_lightning_4", n: "Stormcaller", lvl: 15, icon: "⚡", mats: {"Ash Log": 5, "Storm Crystal": 1}, type: "Staff", desc: "Call Storm: Weather control." },
    { id: "staff_lightning_5", n: "Mjolnir Staff", lvl: 20, icon: "⚡", mats: {"Ironwood Log": 6, "Thunder Core": 2}, type: "Staff", desc: "Hammer Throw: Return dmg." },
    { id: "staff_lightning_6", n: "Zeus's Fury", lvl: 25, icon: "⚡", mats: {"Worldtree Log": 8, "Divine Storm": 5}, type: "Staff", desc: "Godly Thunder: Ultimate." },

    // ═══════════════════════════════════════════════════════════════
    // ARCANE STAVES (6 weapons)
    // ═══════════════════════════════════════════════════════════════
    { id: "staff_arcane_1", n: "Voidspire", lvl: 1, icon: "🌀", mats: {"Pine Log": 3, "Void Dust": 2}, type: "Staff", desc: "Arcane Bolt: Marks targets." },
    { id: "staff_arcane_2", n: "Mystic Grudge", lvl: 5, icon: "🌀", mats: {"Oak Log": 3, "Arcane Essence": 2}, type: "Staff", desc: "Arcane Missiles: Multi-hit." },
    { id: "staff_arcane_3", n: "Ether Heart", lvl: 10, icon: "🌀", mats: {"Maple Log": 4, "Ether Dust": 3}, type: "Staff", desc: "Mana Burn: Drain mana." },
    { id: "staff_arcane_4", n: "Dimensional Staff", lvl: 15, icon: "🌀", mats: {"Ash Log": 5, "Void Crystal": 1}, type: "Staff", desc: "Blink: Teleport." },
    { id: "staff_arcane_5", n: "Reality Bender", lvl: 20, icon: "🌀", mats: {"Ironwood Log": 6, "Reality Core": 2}, type: "Staff", desc: "Warp: Distort space." },
    { id: "staff_arcane_6", n: "Staff of the Grudge", lvl: 25, icon: "🔱", mats: {"Worldtree Log": 10, "Divine Essence": 5, "Soul Core": 3}, type: "Staff", desc: "Legendary. All elements." },

    // ═══════════════════════════════════════════════════════════════
    // ENCHANTMENTS (6 recipes)
    // ═══════════════════════════════════════════════════════════════
    { id: "ench_str", n: "Enchant: Strength", lvl: 15, icon: "💪", mats: {"Minor Essence": 2, "Iron Dust": 1}, type: "Enchant", desc: "+10 Strength to weapon." },
    { id: "ench_int", n: "Enchant: Intellect", lvl: 15, icon: "🧠", mats: {"Minor Essence": 2, "Mana Dust": 1}, type: "Enchant", desc: "+10 Intellect to weapon." },
    { id: "ench_fire", n: "Fire Infusion", lvl: 35, icon: "🔥", mats: {"Fire Essence": 5, "Ruby": 1}, type: "Enchant", desc: "+Fire damage to weapon." },
    { id: "ench_frost", n: "Frost Infusion", lvl: 35, icon: "❄️", mats: {"Frost Essence": 5, "Sapphire": 1}, type: "Enchant", desc: "+Frost damage to weapon." },
    { id: "ench_soul", n: "Soul Enchant: Lifesteal", lvl: 50, icon: "💀", mats: {"Soul Core": 1, "Blood": 5}, type: "Enchant", desc: "Lifesteal on hit." },
    { id: "ench_divine", n: "Divine Enchantment", lvl: 90, icon: "👼", mats: {"Divine Essence": 3, "Holy Water": 5}, type: "Enchant", desc: "Ultimate enchant power." },

    // ═══════════════════════════════════════════════════════════════
    // SPELL PAGES - Crafted by Spellwright specialization
    // ═══════════════════════════════════════════════════════════════
    { id: "scroll_fire", n: "Scroll: Fireball", lvl: 15, icon: "📜🔥", mats: {"Paper": 1, "Fire Essence": 3}, spec: 20, type: "Scroll", desc: "Single-use fireball spell" },
    { id: "scroll_frost", n: "Scroll: Frost Nova", lvl: 15, icon: "📜❄️", mats: {"Paper": 1, "Frost Essence": 3}, spec: 20, type: "Scroll", desc: "Single-use frost nova" },
    { id: "page_t2", n: "Spell Page: Tier II", lvl: 30, icon: "📄", mats: {"Enchanted Paper": 2, "Lesser Essence": 5}, spec: 21, type: "SpellPage", desc: "Upgrade spell to Tier II" },
    { id: "page_t5", n: "Spell Page: Tier V", lvl: 60, icon: "📄", mats: {"Arcane Parchment": 3, "Refined Essence": 10}, spec: 23, type: "SpellPage", desc: "Upgrade spell to Tier V" },
    { id: "page_t8", n: "Spell Page: Tier VIII", lvl: 95, icon: "📄✨", mats: {"Divine Parchment": 5, "Divine Essence": 10}, spec: 25, type: "SpellPage", desc: "Upgrade spell to Tier VIII" },
    { id: "codex_void", n: "Codex of the Void", lvl: 95, icon: "📕🌀", mats: {"Void Parchment": 10, "Soul Core": 5}, spec: 25, type: "Codex", desc: "Grants all Void spells" },

    // ═══════════════════════════════════════════════════════════════
    // GEMS & NECKLACES - Crafted by Soulbinder specialization
    // ═══════════════════════════════════════════════════════════════
    { id: "gem_ruby", n: "Cut Ruby", lvl: 15, icon: "💎", mats: {"Rough Ruby": 1}, spec: 40, type: "Gem", desc: "+Fire power when socketed" },
    { id: "gem_sapphire", n: "Cut Sapphire", lvl: 15, icon: "💠", mats: {"Rough Sapphire": 1}, spec: 40, type: "Gem", desc: "+Frost power when socketed" },
    { id: "gem_soul", n: "Soul Gem", lvl: 55, icon: "💜", mats: {"Pristine Gem": 1, "Soul Core": 1}, spec: 43, type: "Gem", desc: "Stores captured soul essence" },
    { id: "neck_mana", n: "Mana Pendant", lvl: 40, icon: "📿", mats: {"Silver Chain": 1, "Sapphire": 2}, spec: 42, type: "Necklace", desc: "+50 Max Mana" },
    { id: "neck_cosmic", n: "Heart of the Cosmos", lvl: 95, icon: "💫", mats: {"Divine Chain": 1, "Divine Gem": 3, "Stardust": 10}, spec: 46, type: "Necklace", desc: "Legendary necklace" },

    // ═══════════════════════════════════════════════════════════════
    // CLOTH ARMOR - Scholar Set (6 pieces)
    // ═══════════════════════════════════════════════════════════════
    { id: "cloth_scholar_head", n: "Scholar's Hood", lvl: 1, icon: "🎓", mats: {"Linen Fabric": 4}, type: "Armor", desc: "Scholar Set (1/6): +Int. Knowledge." },
    { id: "cloth_scholar_chest", n: "Scholar's Robe", lvl: 5, icon: "👘", mats: {"Linen Fabric": 8}, type: "Armor", desc: "Scholar Set (2/6): +Mana. Studious." },
    { id: "cloth_scholar_legs", n: "Scholar's Pants", lvl: 4, icon: "👖", mats: {"Linen Fabric": 6}, type: "Armor", desc: "Scholar Set (3/6): +Spirit. Focused." },
    { id: "cloth_scholar_hands", n: "Scholar's Gloves", lvl: 2, icon: "🧤", mats: {"Linen Fabric": 3}, type: "Armor", desc: "Scholar Set (4/6): +Cast Speed." },
    { id: "cloth_scholar_feet", n: "Scholar's Slippers", lvl: 3, icon: "👟", mats: {"Linen Fabric": 4}, type: "Armor", desc: "Scholar Set (5/6): +Move Speed." },
    { id: "cloth_scholar_shoulder", n: "Scholar's Mantle", lvl: 6, icon: "🎖️", mats: {"Linen Fabric": 5}, type: "Armor", desc: "Scholar Set (6/6): +15% Mana." },

    // ═══════════════════════════════════════════════════════════════
    // CLOTH ARMOR - Archmage Set (6 pieces)
    // ═══════════════════════════════════════════════════════════════
    { id: "cloth_archmage_head", n: "Archmage's Cowl", lvl: 20, icon: "🧙", mats: {"Silk Fabric": 5, "Mana Thread": 2}, type: "Armor", desc: "Archmage Set (1/6): +Spell Power." },
    { id: "cloth_archmage_chest", n: "Archmage's Robes", lvl: 25, icon: "👘", mats: {"Silk Fabric": 10, "Mana Thread": 4}, type: "Armor", desc: "Archmage Set (2/6): +Spell Crit." },
    { id: "cloth_archmage_legs", n: "Archmage's Leggings", lvl: 23, icon: "👖", mats: {"Silk Fabric": 8, "Mana Thread": 3}, type: "Armor", desc: "Archmage Set (3/6): +Mana Regen." },
    { id: "cloth_archmage_hands", n: "Archmage's Gloves", lvl: 21, icon: "🧤", mats: {"Silk Fabric": 4, "Mana Thread": 1}, type: "Armor", desc: "Archmage Set (4/6): +Cooldown Red." },
    { id: "cloth_archmage_feet", n: "Archmage's Boots", lvl: 22, icon: "👟", mats: {"Silk Fabric": 5, "Mana Thread": 2}, type: "Armor", desc: "Archmage Set (5/6): +Mana." },
    { id: "cloth_archmage_shoulder", n: "Archmage's Mantle", lvl: 24, icon: "🎖️", mats: {"Silk Fabric": 6, "Mana Thread": 2}, type: "Armor", desc: "Archmage Set (6/6): +25% Spell Power." },

    // ═══════════════════════════════════════════════════════════════
    // CLOTH PROCESSING (6 recipes)
    // ═══════════════════════════════════════════════════════════════
    { id: "cloth_1", n: "Linen Fabric", lvl: 1, icon: "🧵", mats: {"Linen Thread": 3}, type: "Cloth", desc: "Basic fabric." },
    { id: "cloth_2", n: "Wool Fabric", lvl: 10, icon: "🧵", mats: {"Wool Thread": 3}, type: "Cloth", desc: "Warm fabric." },
    { id: "cloth_3", n: "Silk Fabric", lvl: 20, icon: "🧵", mats: {"Silk Thread": 3}, type: "Cloth", desc: "Elegant fabric." },
    { id: "cloth_4", n: "Moonweave Fabric", lvl: 30, icon: "🧵", mats: {"Moonweave Thread": 3}, type: "Cloth", desc: "Lunar fabric." },
    { id: "cloth_5", n: "Starweave Fabric", lvl: 40, icon: "🧵", mats: {"Starweave Thread": 3}, type: "Cloth", desc: "Stellar fabric." },
    { id: "cloth_6", n: "Voidweave Fabric", lvl: 50, icon: "🧵", mats: {"Voidweave Thread": 3}, type: "Cloth", desc: "Cosmic fabric." },

    // ═══════════════════════════════════════════════════════════════
    // BACK - Cloaks (6 items)
    // ═══════════════════════════════════════════════════════════════
    { id: "back_1", n: "Apprentice Cloak", lvl: 5, icon: "🧥", mats: {"Linen Fabric": 4}, type: "Back", desc: "+5 Intellect. Novice wear." },
    { id: "back_2", n: "Mage's Mantle", lvl: 15, icon: "🧥", mats: {"Silk Fabric": 5, "Mana Thread": 2}, type: "Back", desc: "+Mana Regen. Arcane flow." },
    { id: "back_3", n: "Starweave Cloak", lvl: 25, icon: "🧥", mats: {"Starweave Fabric": 4, "Stardust": 3}, type: "Back", desc: "+Spell Power. Cosmic." },
    { id: "back_4", n: "Voidtouched Cape", lvl: 35, icon: "🧥", mats: {"Voidweave Fabric": 5, "Void Essence": 3}, type: "Back", desc: "+Dark Magic. Void touched." },
    { id: "back_5", n: "Archmage's Shroud", lvl: 45, icon: "🧥", mats: {"Moonweave Fabric": 6, "Soul Core": 1}, type: "Back", desc: "+All Magic. Master's garb." },
    { id: "back_6", n: "Divine Vestment", lvl: 55, icon: "🧥", mats: {"Divine Thread": 8, "Divine Essence": 2}, type: "Back", desc: "+Transcendence. Holy cloak." },

    // ═══════════════════════════════════════════════════════════════
    // RINGS (6 items)
    // ═══════════════════════════════════════════════════════════════
    { id: "ring_1", n: "Mana Band", lvl: 5, icon: "💍", mats: {"Silver Chain": 1, "Minor Essence": 2}, type: "Ring", desc: "+20 Mana. Basic arcane." },
    { id: "ring_2", n: "Spell Ring", lvl: 15, icon: "💍", mats: {"Silver Chain": 1, "Sapphire": 1}, type: "Ring", desc: "+Spell Crit. Focused power." },
    { id: "ring_3", n: "Elemental Band", lvl: 25, icon: "💍", mats: {"Gold Chain": 1, "Fire Essence": 2, "Frost Essence": 2}, type: "Ring", desc: "+Elemental Damage. Dual nature." },
    { id: "ring_4", n: "Void Loop", lvl: 35, icon: "💍", mats: {"Shadow Chain": 1, "Void Essence": 3}, type: "Ring", desc: "+Dark Magic. Abyss touched." },
    { id: "ring_5", n: "Arcane Signet", lvl: 45, icon: "💍", mats: {"Divine Chain": 1, "Arcane Essence": 3}, type: "Ring", desc: "+Spell Power. Pure arcane." },
    { id: "ring_6", n: "Ring of the Cosmos", lvl: 55, icon: "💍", mats: {"Divine Chain": 1, "Divine Gem": 1, "Stardust": 5}, type: "Ring", desc: "+All Magic. Cosmic power." },

    // ═══════════════════════════════════════════════════════════════
    // RELICS (6 items)
    // ═══════════════════════════════════════════════════════════════
    { id: "relic_1", n: "Arcane Focus", lvl: 10, icon: "🔮", mats: {"Minor Essence": 5, "Gem": 1}, type: "Relic", desc: "+Cast Speed. Focused mind." },
    { id: "relic_2", n: "Mana Crystal", lvl: 20, icon: "🔮", mats: {"Sapphire": 2, "Mana Dust": 5}, type: "Relic", desc: "+Max Mana. Deep reserves." },
    { id: "relic_3", n: "Spellbook Charm", lvl: 30, icon: "🔮", mats: {"Enchanted Paper": 5, "Soul Core": 1}, type: "Relic", desc: "+Spell Slots. Extra knowledge." },
    { id: "relic_4", n: "Elemental Orb", lvl: 40, icon: "🔮", mats: {"Fire Essence": 3, "Frost Essence": 3, "Storm Essence": 3}, type: "Relic", desc: "+Elemental Mastery. Triple force." },
    { id: "relic_5", n: "Void Shard", lvl: 50, icon: "🔮", mats: {"Void Essence": 5, "Soul Core": 2}, type: "Relic", desc: "+Dark Power. Abyssal fragment." },
    { id: "relic_6", n: "Star of Creation", lvl: 60, icon: "🔮", mats: {"Divine Essence": 5, "Stardust": 10}, type: "Relic", desc: "+All Stats. Cosmic artifact." },

    // ═══════════════════════════════════════════════════════════════
    // POTIONS & CONSUMABLES
    // ═══════════════════════════════════════════════════════════════
    { id: "pot_mana", n: "Mana Potion", lvl: 5, icon: "🧪", mats: {"Mana Herb": 2, "Water": 1}, type: "Potion", desc: "Restores 100 mana" },
    { id: "pot_essence", n: "Essence Elixir", lvl: 30, icon: "🏺", mats: {"Essence Herb": 3, "Pure Water": 1}, type: "Potion", desc: "Boosts spell power" },
  ],
  inventory: { 
    "Pine Log": 10, "Oak Log": 5, "Maple Log": 3, 
    "Minor Essence": 20, "Mana Dust": 15, 
    "Paper": 10, "Linen Fabric": 8,
    "Rough Ruby": 3, "Rough Sapphire": 3,
    "Silver Chain": 1
  }
};

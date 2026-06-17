import { ProfessionData } from "@/lib/craftingTypes";
import { PROFESSION_SKILL_TREE_BACKGROUNDS } from "@/lib/artAssets";

export const engineerData: ProfessionData = {
  name: "Engineer",
  role: "Mechanist & Siege Master",
  color: "text-orange-500",
  icon: "🔧",
  bgImage: PROFESSION_SKILL_TREE_BACKGROUNDS.Engineer,
  treeData: [
    // ═══════════════════════════════════════════════════════════════
    // WORKSHOP CORE - Central starting nodes
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 1, n: "Tinkering Basics", x: 50, y: 92, req: 0, p: null,
      branch: "Core",
      desc: "The fundamentals of mechanical engineering. Every great invention starts here.",
      bonuses: [{ type: "successChance", value: 5, target: "all" }],
      nodeType: "stat"
    },
    { 
      id: 2, n: "Copper Wiring", x: 50, y: 82, req: 5, p: 1,
      branch: "Core",
      desc: "Master electrical connections for powering devices.",
      bonuses: [{ type: "speedBoost", value: 8, target: "components" }],
      nodeType: "stat"
    },
    { 
      id: 3, n: "Gear Grinding", x: 40, y: 72, req: 10, p: 2,
      branch: "Weaponry",
      desc: "Precision gear crafting for mechanical weapons.",
      bonuses: [{ type: "qualityBoost", value: 8, target: "weapons" }],
      nodeType: "recipe"
    },
    { 
      id: 4, n: "Soldering I", x: 60, y: 72, req: 10, p: 2,
      branch: "Automata",
      desc: "Join metal components with molten solder for durable constructs.",
      bonuses: [{ type: "materialReduction", value: 10, target: "automata" }],
      nodeType: "recipe"
    },

    // ═══════════════════════════════════════════════════════════════
    // WEAPONRY BRANCH (Left) - Crossbows, Guns, Explosives
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 5, n: "Gunpowder Alchemy", x: 25, y: 65, req: 15, p: 3,
      branch: "Weaponry",
      desc: "Mix volatile compounds to create explosive propellants.",
      bonuses: [{ type: "qualityBoost", value: 12, target: "explosives" }],
      nodeType: "recipe"
    },
    { 
      id: 6, n: "Crossbow Tuning", x: 10, y: 60, req: 20, p: 5,
      branch: "Weaponry",
      desc: "Fine-tune crossbow mechanisms for maximum power and accuracy.",
      bonuses: [{ type: "successChance", value: 15, target: "crossbows" }],
      nodeType: "effect"
    },
    { 
      id: 7, n: "Explosive Shells", x: 20, y: 50, req: 30, p: 5,
      branch: "Weaponry",
      desc: "Craft ammunition that detonates on impact.",
      bonuses: [{ type: "qualityBoost", value: 15, target: "ammo" }, { type: "speedBoost", value: 10, target: "ammo" }],
      nodeType: "combat"
    },
    { 
      id: 8, n: "Precision Sights", x: 30, y: 45, req: 35, p: 7,
      branch: "Weaponry",
      desc: "Craft optical sights for enhanced accuracy at range.",
      bonuses: [{ type: "qualityBoost", value: 18, target: "scopes" }],
      nodeType: "recipe"
    },
    { 
      id: 9, n: "Hidden Traps", x: 5, y: 45, req: 40, p: 6,
      branch: "Weaponry",
      desc: "Design concealed mechanical traps for ambushes.",
      bonuses: [{ type: "successChance", value: 20, target: "traps" }],
      nodeType: "combat"
    },
    { 
      id: 10, n: "Mortar Battery", x: 25, y: 30, req: 60, p: 8,
      branch: "Weaponry",
      desc: "Construct multi-barrel mortar systems for area bombardment.",
      bonuses: [{ type: "tierUnlock", value: 6, target: "siege" }, { type: "qualityBoost", value: 15, target: "siege" }],
      nodeType: "recipe"
    },
    { 
      id: 11, n: "Nuke-In-A-Box", x: 15, y: 15, req: 85, p: 10,
      branch: "Weaponry",
      desc: "The ultimate portable explosive device. Handle with extreme caution.",
      bonuses: [{ type: "tierUnlock", value: 8, target: "explosives" }, { type: "qualityBoost", value: 30, target: "explosives" }],
      nodeType: "combat"
    },
    { 
      id: 12, n: "Railgun Tech", x: 5, y: 20, req: 90, p: 9,
      branch: "Weaponry",
      desc: "Electromagnetic projectile acceleration for devastating firepower.",
      bonuses: [{ type: "tierUnlock", value: 8, target: "guns" }, { type: "doubleYield", value: 10, target: "guns" }],
      nodeType: "recipe"
    },

    // ═══════════════════════════════════════════════════════════════
    // AUTOMATA BRANCH (Center) - Drones, Mechs, AI
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 13, n: "Clockwork Heart", x: 50, y: 58, req: 15, p: 4,
      branch: "Automata",
      desc: "Create beating mechanical hearts to power automatons.",
      bonuses: [{ type: "successChance", value: 12, target: "automata" }],
      nodeType: "recipe"
    },
    { 
      id: 14, n: "Simple Drones", x: 40, y: 48, req: 25, p: 13,
      branch: "Automata",
      desc: "Build basic autonomous flying machines for reconnaissance.",
      bonuses: [{ type: "speedBoost", value: 15, target: "drones" }],
      nodeType: "recipe"
    },
    { 
      id: 15, n: "Mecha-Skeleton", x: 60, y: 48, req: 30, p: 13,
      branch: "Automata",
      desc: "Construct the internal framework for wearable mechanical suits.",
      bonuses: [{ type: "materialReduction", value: 15, target: "mechs" }],
      nodeType: "effect"
    },
    { 
      id: 16, n: "A.I. Neural Net", x: 50, y: 40, req: 45, p: 15,
      branch: "Automata",
      desc: "Program basic artificial intelligence for autonomous operation.",
      bonuses: [{ type: "qualityBoost", value: 20, target: "automata" }, { type: "successChance", value: 10, target: "automata" }],
      nodeType: "effect"
    },
    { 
      id: 17, n: "Power Cell Tech", x: 45, y: 30, req: 55, p: 16,
      branch: "Automata",
      desc: "Develop high-capacity power cells for extended operation.",
      bonuses: [{ type: "materialReduction", value: 12, target: "power" }, { type: "qualityBoost", value: 10, target: "power" }],
      nodeType: "recipe"
    },
    { 
      id: 18, n: "Mecha Mk.I Suit", x: 55, y: 25, req: 75, p: 16,
      branch: "Automata",
      desc: "The first pilotable mechanical battle suit. A marvel of engineering.",
      bonuses: [{ type: "tierUnlock", value: 7, target: "mechs" }],
      nodeType: "recipe"
    },
    { 
      id: 19, n: "Giga-Mech Lord", x: 50, y: 10, req: 95, p: 18,
      branch: "Automata",
      desc: "The ultimate mechanical titan. A walking fortress of destruction.",
      bonuses: [{ type: "tierUnlock", value: 8, target: "mechs" }, { type: "doubleYield", value: 15, target: "mechs" }],
      nodeType: "combat"
    },

    // ═══════════════════════════════════════════════════════════════
    // SIEGE BRANCH (Right) - Catapults, Vehicles, Airships
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 20, n: "Steel Framework", x: 75, y: 65, req: 15, p: 4,
      branch: "Siege",
      desc: "Build reinforced steel frames for large-scale constructions.",
      bonuses: [{ type: "qualityBoost", value: 10, target: "siege" }],
      nodeType: "stat"
    },
    { 
      id: 21, n: "Catapult Rigging", x: 90, y: 60, req: 20, p: 20,
      branch: "Siege",
      desc: "Design tension-based launching mechanisms for siege weapons.",
      bonuses: [{ type: "successChance", value: 15, target: "catapults" }],
      nodeType: "recipe"
    },
    { 
      id: 22, n: "Advanced Hydraulics", x: 80, y: 50, req: 30, p: 20,
      branch: "Siege",
      desc: "Master fluid-powered systems for heavy machinery.",
      bonuses: [{ type: "speedBoost", value: 12, target: "vehicles" }, { type: "materialReduction", value: 8, target: "vehicles" }],
      nodeType: "effect"
    },
    { 
      id: 23, n: "Ballista Array", x: 95, y: 45, req: 40, p: 21,
      branch: "Siege",
      desc: "Deploy multiple synchronized ballistae for rapid fire.",
      bonuses: [{ type: "qualityBoost", value: 18, target: "ballistae" }],
      nodeType: "combat"
    },
    { 
      id: 24, n: "Steam Engines", x: 70, y: 45, req: 50, p: 22,
      branch: "Siege",
      desc: "Harness steam power for mobile siege platforms.",
      bonuses: [{ type: "successChance", value: 15, target: "engines" }, { type: "speedBoost", value: 15, target: "engines" }],
      nodeType: "recipe"
    },
    { 
      id: 25, n: "Airship Skeleton", x: 80, y: 35, req: 60, p: 24,
      branch: "Siege",
      desc: "Construct the lightweight framework for flying vessels.",
      bonuses: [{ type: "materialReduction", value: 18, target: "airships" }],
      nodeType: "recipe"
    },
    { 
      id: 26, n: "Torsion Springs", x: 90, y: 30, req: 70, p: 21,
      branch: "Siege",
      desc: "Create powerful torsion mechanisms for siege artillery.",
      bonuses: [{ type: "qualityBoost", value: 20, target: "artillery" }],
      nodeType: "effect"
    },
    { 
      id: 27, n: "Aeronautics II", x: 75, y: 20, req: 80, p: 25,
      branch: "Siege",
      desc: "Advanced flight mechanics and navigation systems.",
      bonuses: [{ type: "tierUnlock", value: 7, target: "airships" }, { type: "successChance", value: 18, target: "airships" }],
      nodeType: "stat"
    },
    { 
      id: 28, n: "The Dreadnaught", x: 85, y: 10, req: 95, p: 27,
      branch: "Siege",
      desc: "The ultimate flying fortress. Armed to the teeth and nearly indestructible.",
      bonuses: [{ type: "tierUnlock", value: 8, target: "airships" }, { type: "qualityBoost", value: 25, target: "airships" }],
      nodeType: "recipe"
    },
  ],
  recipes: [
    // ═══════════════════════════════════════════════════════════════
    // CROSSBOWS (6 weapons)
    // ═══════════════════════════════════════════════════════════════
    { id: "xbow_1", n: "Ironveil Repeater", lvl: 1, icon: "🏹", mats: {"Iron": 3, "Wood": 2}, type: "Crossbow", desc: "Rapid fire. Heavy Bolt: Builds Mark." },
    { id: "xbow_2", n: "Skullpiercer", lvl: 5, icon: "🏹", mats: {"Steel": 3, "Bone": 2}, type: "Crossbow", desc: "Pierces skulls. Headshot: Silence." },
    { id: "xbow_3", n: "Bloodreaver", lvl: 10, icon: "🏹", mats: {"Dark Iron": 3, "Blood": 2}, type: "Crossbow", desc: "Reaves blood. Explosive Round: AoE." },
    { id: "xbow_4", n: "Wraithspike", lvl: 15, icon: "🏹", mats: {"Void Dust": 3, "Wood": 2}, type: "Crossbow", desc: "Spikes of wraith. Shadow Trap: Slow." },
    { id: "xbow_5", n: "Emberbolt", lvl: 20, icon: "🏹", mats: {"Fire Essence": 3, "Steel": 2}, type: "Crossbow", desc: "Burning ember. Firestorm Bolt: DoT." },
    { id: "xbow_6", n: "Ironshard", lvl: 25, icon: "🏹", mats: {"Iron": 5, "Obsidian": 1}, type: "Crossbow", desc: "Shards of iron. Shrapnel: Armor break." },

    // ═══════════════════════════════════════════════════════════════
    // GUNS (6 weapons)
    // ═══════════════════════════════════════════════════════════════
    { id: "gun_1", n: "Blackpowder Blaster", lvl: 1, icon: "🔫", mats: {"Iron": 3, "Powder": 2}, type: "Gun", desc: "Blackpowder grudge. Grudge Shot: Mark." },
    { id: "gun_2", n: "Ironstorm Gun", lvl: 5, icon: "🔫", mats: {"Steel": 3, "Iron": 2}, type: "Gun", desc: "Iron bullets. Sniper Round: Range." },
    { id: "gun_3", n: "Bloodcannon", lvl: 10, icon: "🔫", mats: {"Dark Iron": 3, "Blood": 2}, type: "Gun", desc: "Blood tribute. Crimson Blast: Lifesteal." },
    { id: "gun_4", n: "Wraithbarrel", lvl: 15, icon: "🔫", mats: {"Void Dust": 3, "Steel": 2}, type: "Gun", desc: "Wraith whispers. Shadow Shot: Silence." },
    { id: "gun_5", n: "Emberrifle", lvl: 20, icon: "🔫", mats: {"Fire Essence": 3, "Iron": 2}, type: "Gun", desc: "Ember flames. Flame Burst: DoT AoE." },
    { id: "gun_6", n: "Duskblaster", lvl: 25, icon: "🔫", mats: {"Shadow Ingot": 3, "Gem": 1}, type: "Gun", desc: "Dusk power. Shrapnel Spray: Pierce." },

    // ═══════════════════════════════════════════════════════════════
    // MECH ARMOR - Mechanist Set (6 pieces)
    // ═══════════════════════════════════════════════════════════════
    { id: "arm_mech_head", n: "Mechanist Helm", lvl: 5, icon: "🥽", mats: {"Iron": 4, "Glass": 2}, type: "Armor", desc: "Mechanist Set (1/6): +Perception." },
    { id: "arm_mech_chest", n: "Mechanist Chestplate", lvl: 10, icon: "👕", mats: {"Steel": 8, "Gears": 4}, type: "Armor", desc: "Mechanist Set (2/6): +Defense." },
    { id: "arm_mech_legs", n: "Mechanist Legplates", lvl: 8, icon: "👖", mats: {"Iron": 6, "Gears": 2}, type: "Armor", desc: "Mechanist Set (3/6): +Mobility." },
    { id: "arm_mech_hands", n: "Mechanist Gauntlets", lvl: 6, icon: "🧤", mats: {"Iron": 3, "Gears": 1}, type: "Armor", desc: "Mechanist Set (4/6): +Craft Speed." },
    { id: "arm_mech_feet", n: "Mechanist Boots", lvl: 7, icon: "👢", mats: {"Iron": 4, "Leather": 2}, type: "Armor", desc: "Mechanist Set (5/6): +Speed." },
    { id: "arm_mech_shoulder", n: "Mechanist Pauldrons", lvl: 9, icon: "🎖️", mats: {"Steel": 5, "Gears": 2}, type: "Armor", desc: "Mechanist Set (6/6): +20% Craft." },

    // ═══════════════════════════════════════════════════════════════
    // MECH ARMOR - Inventor Set (6 pieces)
    // ═══════════════════════════════════════════════════════════════
    { id: "arm_inv_head", n: "Inventor's Goggles", lvl: 15, icon: "🥽", mats: {"Steel": 4, "Glass": 3, "Gem": 1}, type: "Armor", desc: "Inventor Set (1/6): +Analysis." },
    { id: "arm_inv_chest", n: "Inventor's Coat", lvl: 20, icon: "🥼", mats: {"Leather": 8, "Steel": 4}, type: "Armor", desc: "Inventor Set (2/6): +Pocket slots." },
    { id: "arm_inv_legs", n: "Inventor's Pants", lvl: 18, icon: "👖", mats: {"Leather": 6, "Steel": 2}, type: "Armor", desc: "Inventor Set (3/6): +Tool belt." },
    { id: "arm_inv_hands", n: "Inventor's Gloves", lvl: 16, icon: "🧤", mats: {"Leather": 3, "Steel": 1}, type: "Armor", desc: "Inventor Set (4/6): +Precision." },
    { id: "arm_inv_feet", n: "Inventor's Boots", lvl: 17, icon: "👢", mats: {"Leather": 4, "Steel": 2}, type: "Armor", desc: "Inventor Set (5/6): +Jump Jets." },
    { id: "arm_inv_shoulder", n: "Inventor's Harness", lvl: 19, icon: "🎖️", mats: {"Steel": 6, "Gears": 4}, type: "Armor", desc: "Inventor Set (6/6): +25% Success." },

    // ═══════════════════════════════════════════════════════════════
    // TOOLS & COMPONENTS (6 recipes)
    // ═══════════════════════════════════════════════════════════════
    { id: "tool_wrench", n: "Rusty Wrench", lvl: 1, icon: "🔧", mats: {"Scrap": 2, "Oil": 1}, type: "Tool", desc: "Basic tool." },
    { id: "tool_bolt", n: "Iron Bolt", lvl: 5, icon: "🔩", mats: {"Scrap": 1}, type: "Component", desc: "Crafting part." },
    { id: "tool_gears", n: "Precision Gears", lvl: 10, icon: "⚙️", mats: {"Iron": 2, "Oil": 1}, type: "Component", desc: "Precision parts." },
    { id: "tool_springs", n: "Coiled Springs", lvl: 15, icon: "🔩", mats: {"Steel": 2}, type: "Component", desc: "Tension springs." },
    { id: "tool_circuits", n: "Power Circuits", lvl: 20, icon: "⚡", mats: {"Copper": 3, "Glass": 1}, type: "Component", desc: "Electrical circuits." },
    { id: "tool_core", n: "Power Core", lvl: 25, icon: "💠", mats: {"Titanium": 2, "Crystal": 1}, type: "Component", desc: "Energy core." },

    // ═══════════════════════════════════════════════════════════════
    // RINGS (6 items)
    // ═══════════════════════════════════════════════════════════════
    { id: "ring_1", n: "Gear Ring", lvl: 5, icon: "💍", mats: {"Iron": 2, "Gears": 1}, type: "Ring", desc: "+Craft Speed. Mechanical." },
    { id: "ring_2", n: "Copper Coil Ring", lvl: 15, icon: "💍", mats: {"Copper": 3, "Glass": 1}, type: "Ring", desc: "+Energy. Conductive." },
    { id: "ring_3", n: "Precision Band", lvl: 25, icon: "💍", mats: {"Steel": 2, "Gem": 1}, type: "Ring", desc: "+Accuracy. Fine tuned." },
    { id: "ring_4", n: "Power Core Ring", lvl: 35, icon: "💍", mats: {"Titanium": 2, "Crystal": 1}, type: "Ring", desc: "+Damage. Powered up." },
    { id: "ring_5", n: "Tesla Coil Band", lvl: 45, icon: "💍", mats: {"Copper": 5, "Storm Essence": 2}, type: "Ring", desc: "+Lightning Dmg. Shocking." },
    { id: "ring_6", n: "Quantum Ring", lvl: 55, icon: "💍", mats: {"Titanium": 3, "Void Essence": 2}, type: "Ring", desc: "+All Stats. Advanced tech." },

    // ═══════════════════════════════════════════════════════════════
    // RELICS (6 items)
    // ═══════════════════════════════════════════════════════════════
    { id: "relic_1", n: "Pocket Watch", lvl: 10, icon: "🔮", mats: {"Gears": 3, "Glass": 1}, type: "Relic", desc: "+Cooldown Reduction. Timekeeping." },
    { id: "relic_2", n: "Gyroscope", lvl: 20, icon: "🔮", mats: {"Iron": 3, "Gears": 3}, type: "Relic", desc: "+Stability. Balanced." },
    { id: "relic_3", n: "Power Cell", lvl: 30, icon: "🔮", mats: {"Copper": 5, "Crystal": 1}, type: "Relic", desc: "+Energy Regen. Rechargeable." },
    { id: "relic_4", n: "Targeting Module", lvl: 40, icon: "🔮", mats: {"Steel": 3, "Glass": 2, "Gem": 1}, type: "Relic", desc: "+Accuracy. Lock-on." },
    { id: "relic_5", n: "Overcharge Core", lvl: 50, icon: "🔮", mats: {"Titanium": 3, "Storm Essence": 3}, type: "Relic", desc: "+Crit Damage. Supercharged." },
    { id: "relic_6", n: "Infinity Engine", lvl: 60, icon: "🔮", mats: {"Titanium": 5, "PowerCell": 3, "Void Essence": 2}, type: "Relic", desc: "+All Stats. Perpetual motion." },

    // ═══════════════════════════════════════════════════════════════
    // NECKLACES (6 items)
    // ═══════════════════════════════════════════════════════════════
    { id: "neck_1", n: "Gear Pendant", lvl: 5, icon: "📿", mats: {"Iron": 2, "Gears": 2}, type: "Necklace", desc: "+Craft Bonus. Tinkerer's." },
    { id: "neck_2", n: "Bullet Chain", lvl: 15, icon: "📿", mats: {"Steel": 3, "Powder": 2}, type: "Necklace", desc: "+Ranged Damage. Gunslinger." },
    { id: "neck_3", n: "Circuit Necklace", lvl: 25, icon: "📿", mats: {"Copper": 4, "Glass": 2}, type: "Necklace", desc: "+Tech Bonus. Wired." },
    { id: "neck_4", n: "Steam Whistle", lvl: 35, icon: "📿", mats: {"Steel": 4, "Gears": 3}, type: "Necklace", desc: "+Siege Damage. Loud." },
    { id: "neck_5", n: "Tesla Amulet", lvl: 45, icon: "📿", mats: {"Titanium": 3, "Storm Essence": 2}, type: "Necklace", desc: "+Lightning. Electric field." },
    { id: "neck_6", n: "Core Reactor Pendant", lvl: 55, icon: "📿", mats: {"Titanium": 4, "PowerCell": 2, "Crystal": 2}, type: "Necklace", desc: "+All Stats. Fusion powered." },

    // ═══════════════════════════════════════════════════════════════
    // BACK - Capes (6 items)
    // ═══════════════════════════════════════════════════════════════
    { id: "back_1", n: "Work Apron", lvl: 5, icon: "🧥", mats: {"Leather": 3, "Iron": 1}, type: "Back", desc: "+Craft Defense. Protective." },
    { id: "back_2", n: "Mechanic's Cape", lvl: 15, icon: "🧥", mats: {"Leather": 5, "Gears": 3}, type: "Back", desc: "+Repair Speed. Handy." },
    { id: "back_3", n: "Inventor's Cloak", lvl: 25, icon: "🧥", mats: {"Silk": 4, "Steel": 3}, type: "Back", desc: "+Blueprint Bonus. Creative." },
    { id: "back_4", n: "Blast Shield Cape", lvl: 35, icon: "🧥", mats: {"Steel": 6, "Titanium": 2}, type: "Back", desc: "+Explosion Resist. Reinforced." },
    { id: "back_5", n: "Jetpack Harness", lvl: 45, icon: "🧥", mats: {"Titanium": 4, "PowerCell": 2}, type: "Back", desc: "+Jump Height. Flying." },
    { id: "back_6", n: "Exosuit Frame", lvl: 55, icon: "🧥", mats: {"Titanium": 6, "PowerCell": 3, "Gears": 5}, type: "Back", desc: "+All Stats. Powered armor." },

    // ═══════════════════════════════════════════════════════════════
    // SIEGE & VEHICLES
    // ═══════════════════════════════════════════════════════════════
    { id: "siege_boom", n: "Boom-Stick", lvl: 15, icon: "🧨", mats: {"Powder": 3, "Scrap": 2}, type: "Weapon", desc: "Simple explosive." },
    { id: "siege_sentry", n: "Auto-Sentry", lvl: 35, icon: "🤖", mats: {"Gears": 5, "Steel": 2}, type: "Utility", desc: "Defensive turret." },
    { id: "siege_cata", n: "Siege Catapult", lvl: 50, icon: "🏹", mats: {"Log": 20, "Steel": 10}, type: "Vehicle", desc: "Siege engine." },
    { id: "siege_mecha", n: "Mecha Suit Mk.I", lvl: 85, icon: "🦾", mats: {"Titanium": 10, "PowerCell": 5, "Gears": 20}, type: "Vehicle", desc: "Pilotable suit." },
    { id: "siege_air", n: "Armageddon Airship", lvl: 95, icon: "🛸", mats: {"Silk": 50, "Steel": 100, "Titanium": 20}, type: "Vehicle", desc: "Flying fortress." },
    { id: "siege_shield", n: "Clockwork Shield", lvl: 40, icon: "🛡️", mats: {"Gears": 10, "Bronze": 5}, type: "Shield", desc: "Mechanical defense." },
  ],
  inventory: { "Scrap": 50, "Oil": 20, "Powder": 15, "Gears": 10, "Steel": 5, "Log": 20, "Titanium": 0, "PowerCell": 0, "Silk": 0 }
};

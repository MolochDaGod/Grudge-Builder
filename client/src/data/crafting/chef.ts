import { ProfessionData } from "@/lib/craftingTypes";
import { professionSkillTreeBackground } from "@/lib/artAssets";

export const chefData: ProfessionData = {
  name: "Chef",
  role: "Culinary Master & Alchemist",
  color: "text-orange-500",
  icon: "🍲",
  bgImage: professionSkillTreeBackground("Chef"),
  treeData: [
    // ═══════════════════════════════════════════════════════════════
    // HEARTH CORE - Central starting node
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 1, n: "Fire Management", x: 50, y: 92, req: 0, p: null,
      branch: "Core",
      desc: "Master the art of controlling cooking flames. The foundation of all culinary arts.",
      bonuses: [{ type: "successChance", value: 5, target: "food" }],
      nodeType: "stat"
    },
    { 
      id: 2, n: "Ingredient Slicing", x: 50, y: 82, req: 5, p: 1,
      branch: "Core",
      desc: "Precise knife work for consistent ingredient preparation.",
      bonuses: [{ type: "speedBoost", value: 8, target: "food" }],
      nodeType: "stat"
    },
    { 
      id: 3, n: "Salt Refining", x: 40, y: 72, req: 10, p: 2,
      branch: "Butchery",
      desc: "Purify and enhance salt for better preservation and flavor.",
      bonuses: [{ type: "materialReduction", value: 10, target: "preservation" }],
      nodeType: "recipe"
    },
    { 
      id: 4, n: "Broth Base", x: 60, y: 72, req: 10, p: 2,
      branch: "Baking",
      desc: "Create rich, flavorful broth bases for soups and stews.",
      bonuses: [{ type: "qualityBoost", value: 8, target: "food" }],
      nodeType: "recipe"
    },

    // ═══════════════════════════════════════════════════════════════
    // BUTCHERY BRANCH (Left) - Meats, Roasting, Combat Foods
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 5, n: "Cleaver Mastery I", x: 25, y: 65, req: 15, p: 3,
      branch: "Butchery",
      desc: "Expert cleaver techniques for processing large cuts of meat.",
      bonuses: [{ type: "speedBoost", value: 12, target: "meat" }, { type: "materialReduction", value: 5, target: "meat" }],
      nodeType: "combat"
    },
    { 
      id: 6, n: "Slow Smoking", x: 10, y: 60, req: 20, p: 5,
      branch: "Butchery",
      desc: "Master the art of slow-smoking meats for deep flavor penetration.",
      bonuses: [{ type: "qualityBoost", value: 15, target: "smoked" }],
      nodeType: "effect"
    },
    { 
      id: 7, n: "Prime Rib Spec", x: 20, y: 50, req: 30, p: 5,
      branch: "Butchery",
      desc: "Specialize in preparing premium rib cuts for maximum tenderness.",
      bonuses: [{ type: "successChance", value: 15, target: "meat" }],
      nodeType: "recipe"
    },
    { 
      id: 8, n: "Wild Game Prep", x: 30, y: 45, req: 35, p: 7,
      branch: "Butchery",
      desc: "Techniques for preparing exotic wild game meats.",
      bonuses: [{ type: "qualityBoost", value: 12, target: "game" }, { type: "successChance", value: 10, target: "game" }],
      nodeType: "recipe"
    },
    { 
      id: 9, n: "Orcish Barbecue", x: 5, y: 45, req: 40, p: 6,
      branch: "Butchery",
      desc: "Learn brutal but effective Orcish grilling techniques.",
      bonuses: [{ type: "speedBoost", value: 20, target: "grilled" }],
      nodeType: "combat"
    },
    { 
      id: 10, n: "Cleaver of Feast", x: 25, y: 30, req: 60, p: 8,
      branch: "Butchery",
      desc: "Craft the legendary Cleaver of Feast, a weapon and tool in one.",
      bonuses: [{ type: "tierUnlock", value: 6, target: "weapons" }],
      nodeType: "recipe"
    },
    { 
      id: 11, n: "Dragon Steak", x: 15, y: 15, req: 85, p: 10,
      branch: "Butchery",
      desc: "The ultimate meat dish - seared dragon flank with liquid fire.",
      bonuses: [{ type: "tierUnlock", value: 8, target: "meat" }, { type: "qualityBoost", value: 25, target: "meat" }],
      nodeType: "recipe"
    },
    { 
      id: 12, n: "Goliath Roast", x: 5, y: 20, req: 90, p: 9,
      branch: "Butchery",
      desc: "Prepare massive roasts capable of feeding entire armies.",
      bonuses: [{ type: "doubleYield", value: 20, target: "roasts" }],
      nodeType: "effect"
    },

    // ═══════════════════════════════════════════════════════════════
    // BAKING BRANCH (Center) - Breads, Pastries, Preservation
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 13, n: "Basic Dough", x: 50, y: 58, req: 15, p: 4,
      branch: "Baking",
      desc: "Master the fundamentals of dough preparation.",
      bonuses: [{ type: "successChance", value: 10, target: "baked" }],
      nodeType: "recipe"
    },
    { 
      id: 14, n: "Hardtack (Preserve)", x: 40, y: 48, req: 25, p: 13,
      branch: "Baking",
      desc: "Create long-lasting hardtack for extended journeys.",
      bonuses: [{ type: "materialReduction", value: 15, target: "preserved" }],
      nodeType: "recipe"
    },
    { 
      id: 15, n: "Sugar Work", x: 60, y: 48, req: 30, p: 13,
      branch: "Baking",
      desc: "Artistry with sugar for decorative and delicious confections.",
      bonuses: [{ type: "qualityBoost", value: 18, target: "sweets" }],
      nodeType: "effect"
    },
    { 
      id: 16, n: "Battle Rations", x: 50, y: 40, req: 45, p: 15,
      branch: "Baking",
      desc: "Compact, high-energy rations for warriors in combat.",
      bonuses: [{ type: "speedBoost", value: 15, target: "rations" }, { type: "materialReduction", value: 10, target: "rations" }],
      nodeType: "combat"
    },
    { 
      id: 17, n: "Honey Glazing", x: 45, y: 30, req: 55, p: 16,
      branch: "Baking",
      desc: "Perfect honey glazes for enhanced flavor and preservation.",
      bonuses: [{ type: "qualityBoost", value: 12, target: "glazed" }],
      nodeType: "effect"
    },
    { 
      id: 18, n: "Pastry Mastery", x: 55, y: 25, req: 75, p: 16,
      branch: "Baking",
      desc: "Advanced pastry techniques for flaky, delicate creations.",
      bonuses: [{ type: "successChance", value: 20, target: "pastry" }, { type: "qualityBoost", value: 15, target: "pastry" }],
      nodeType: "recipe"
    },
    { 
      id: 19, n: "The Eternal Cake", x: 50, y: 10, req: 95, p: 18,
      branch: "Baking",
      desc: "A mythical cake that never spoils and grants divine buffs.",
      bonuses: [{ type: "tierUnlock", value: 8, target: "baked" }, { type: "doubleYield", value: 15, target: "baked" }],
      nodeType: "recipe"
    },

    // ═══════════════════════════════════════════════════════════════
    // ALCHEMY BRANCH (Right) - Spices, Potions, Elemental Cooking
    // ═══════════════════════════════════════════════════════════════
    { 
      id: 20, n: "Spice Extraction", x: 75, y: 65, req: 15, p: 4,
      branch: "Alchemy",
      desc: "Extract potent essences from herbs and spices.",
      bonuses: [{ type: "materialReduction", value: 12, target: "spices" }],
      nodeType: "recipe"
    },
    { 
      id: 21, n: "Fire Chilli Infusion", x: 90, y: 60, req: 20, p: 20,
      branch: "Alchemy",
      desc: "Infuse dishes with magical fire chilli for burn damage buffs.",
      bonuses: [{ type: "qualityBoost", value: 15, target: "fire_food" }],
      nodeType: "combat"
    },
    { 
      id: 22, n: "Cold-Press Oils", x: 80, y: 50, req: 30, p: 20,
      branch: "Alchemy",
      desc: "Create pure oils that preserve magical properties.",
      bonuses: [{ type: "successChance", value: 12, target: "oils" }],
      nodeType: "effect"
    },
    { 
      id: 23, n: "Poison Resistance", x: 95, y: 45, req: 40, p: 21,
      branch: "Alchemy",
      desc: "Cook dishes that grant temporary poison immunity.",
      bonuses: [{ type: "successChance", value: 18, target: "antidotes" }],
      nodeType: "combat"
    },
    { 
      id: 24, n: "Liquid Essence", x: 70, y: 45, req: 50, p: 22,
      branch: "Alchemy",
      desc: "Distill ingredients into their pure liquid essence form.",
      bonuses: [{ type: "qualityBoost", value: 20, target: "potions" }, { type: "materialReduction", value: 10, target: "potions" }],
      nodeType: "effect"
    },
    { 
      id: 25, n: "Grog Brewing", x: 80, y: 35, req: 60, p: 24,
      branch: "Alchemy",
      desc: "Brew powerful grog that enhances strength and courage.",
      bonuses: [{ type: "successChance", value: 15, target: "brews" }, { type: "speedBoost", value: 12, target: "brews" }],
      nodeType: "recipe"
    },
    { 
      id: 26, n: "Static Shock Herb", x: 90, y: 30, req: 70, p: 21,
      branch: "Alchemy",
      desc: "Cultivate herbs infused with lightning energy.",
      bonuses: [{ type: "qualityBoost", value: 18, target: "lightning_food" }],
      nodeType: "combat"
    },
    { 
      id: 27, n: "Astral Seasoning", x: 75, y: 20, req: 80, p: 25,
      branch: "Alchemy",
      desc: "Season dishes with extracts from astral plane ingredients.",
      bonuses: [{ type: "tierUnlock", value: 7, target: "potions" }],
      nodeType: "effect"
    },
    { 
      id: 28, n: "Nectar of Gods", x: 85, y: 10, req: 95, p: 27,
      branch: "Alchemy",
      desc: "The legendary ambrosia - grants temporary divine powers.",
      bonuses: [{ type: "tierUnlock", value: 8, target: "potions" }, { type: "qualityBoost", value: 30, target: "potions" }],
      nodeType: "recipe"
    },
  ],
  recipes: [
    // ═══════════════════════════════════════════════════════════════
    // RED FOODS - Meats, Attack/Damage Buffs (20 recipes)
    // ═══════════════════════════════════════════════════════════════
    { id: 1, n: "Burnt Skewer", lvl: 1, icon: "🍡", mats: {"Scrap Meat": 1, "Twig": 1}, type: "Food", category: "red" },
    { id: 2, n: "Roasted Rabbit", lvl: 5, icon: "🐰", mats: {"Rabbit Meat": 1, "Salt": 1}, type: "Food", category: "red" },
    { id: 3, n: "Grilled Sausage", lvl: 10, icon: "🌭", mats: {"Ground Meat": 2, "Casing": 1}, type: "Food", category: "red" },
    { id: 4, n: "Smoked Haunch", lvl: 15, icon: "🍗", mats: {"Prime Meat": 1, "Salt": 2}, type: "Food", category: "red" },
    { id: 5, n: "Grilled Steak", lvl: 20, icon: "🥩", mats: {"Beef": 2, "Pepper": 1}, type: "Food", category: "red" },
    { id: 6, n: "Bacon Strips", lvl: 22, icon: "🥓", mats: {"Pork Belly": 2, "Salt": 1}, type: "Food", category: "red" },
    { id: 7, n: "Spiced Ribs", lvl: 30, icon: "🍖", mats: {"Ribs": 3, "Spice": 2}, type: "Food", category: "red" },
    { id: 8, n: "Venison Cutlet", lvl: 35, icon: "🦌", mats: {"Deer Meat": 2, "Herbs": 2}, type: "Food", category: "red" },
    { id: 9, n: "Wild Boar Roast", lvl: 40, icon: "🐗", mats: {"Boar Meat": 2, "Herbs": 3}, type: "Food", category: "red" },
    { id: 10, n: "Braised Lamb", lvl: 45, icon: "🐑", mats: {"Lamb": 3, "Wine": 1}, type: "Food", category: "red" },
    { id: 11, n: "Inferno Curry", lvl: 50, icon: "🥘", mats: {"Spicy Herb": 5, "Meat": 2}, type: "Food", category: "red" },
    { id: 12, n: "Flame-Seared Boar", lvl: 55, icon: "🔥", mats: {"Boar Meat": 3, "Fire Spice": 2}, type: "Food", category: "red" },
    { id: 13, n: "Orcish BBQ Platter", lvl: 60, icon: "🍖", mats: {"Mixed Meats": 5, "Fire Spice": 3}, type: "Food", category: "red" },
    { id: 14, n: "Bear Roast", lvl: 65, icon: "🐻", mats: {"Bear Meat": 3, "Honey": 2}, type: "Food", category: "red" },
    { id: 15, n: "Wyvern Wings", lvl: 70, icon: "🦇", mats: {"Wyvern Meat": 2, "Hot Sauce": 3}, type: "Food", category: "red" },
    { id: 16, n: "Hellfire Steak", lvl: 75, icon: "🔥", mats: {"Demon Beef": 2, "Hellfire Salt": 1}, type: "Food", category: "red" },
    { id: 17, n: "Chimera Kebab", lvl: 80, icon: "🍢", mats: {"Chimera Meat": 3, "Exotic Spice": 2}, type: "Food", category: "red" },
    { id: 18, n: "Dragon Steak", lvl: 85, icon: "🐉", mats: {"Dragon Flank": 1, "Liquid Fire": 1}, type: "Food", category: "red" },
    { id: 19, n: "Phoenix Roast", lvl: 90, icon: "🔶", mats: {"Phoenix Meat": 2, "Eternal Flame": 1}, type: "Food", category: "red" },
    { id: 20, n: "Titan's Feast", lvl: 95, icon: "⚔️", mats: {"Giant Meat": 3, "Divine Salt": 1}, type: "Food", category: "red" },
    
    // ═══════════════════════════════════════════════════════════════
    // GREEN FOODS - Veggies/Herbs, Regen/Healing Buffs (20 recipes)
    // ═══════════════════════════════════════════════════════════════
    { id: 21, n: "Simple Salad", lvl: 1, icon: "🥗", mats: {"Lettuce": 2, "Tomato": 1}, type: "Food", category: "green" },
    { id: 22, n: "Vegetable Soup", lvl: 5, icon: "🥣", mats: {"Carrot": 1, "Potato": 1, "Water": 1}, type: "Food", category: "green" },
    { id: 23, n: "Herb Bundle", lvl: 10, icon: "🌿", mats: {"Herbs": 3}, type: "Food", category: "green" },
    { id: 24, n: "Stuffed Mushroom", lvl: 15, icon: "🍄", mats: {"Large Mushroom": 2, "Cheese": 1}, type: "Food", category: "green" },
    { id: 25, n: "Garden Medley", lvl: 20, icon: "🥕", mats: {"Carrot": 2, "Celery": 2, "Onion": 1}, type: "Food", category: "green" },
    { id: 26, n: "Cucumber Rolls", lvl: 25, icon: "🥒", mats: {"Cucumber": 3, "Rice": 2}, type: "Food", category: "green" },
    { id: 27, n: "Elven Greens", lvl: 30, icon: "🌱", mats: {"Forest Herbs": 3, "Moonpetal": 1}, type: "Food", category: "green" },
    { id: 28, n: "Healing Herb Tea", lvl: 35, icon: "🍵", mats: {"Healing Herb": 3, "Hot Water": 1}, type: "Potion", category: "green" },
    { id: 29, n: "Vitality Wrap", lvl: 40, icon: "🫔", mats: {"Leaf Wrap": 2, "Healing Herb": 3}, type: "Food", category: "green" },
    { id: 30, n: "Forest Stew", lvl: 45, icon: "🥬", mats: {"Wild Vegetables": 4, "Broth": 2}, type: "Food", category: "green" },
    { id: 31, n: "Druid's Feast", lvl: 50, icon: "🍀", mats: {"Sacred Vegetables": 5, "Dew": 2}, type: "Food", category: "green" },
    { id: 32, n: "Regeneration Salve", lvl: 55, icon: "💚", mats: {"Regen Herb": 4, "Aloe": 2}, type: "Potion", category: "green" },
    { id: 33, n: "Treant Bark Tea", lvl: 60, icon: "🌲", mats: {"Living Bark": 2, "Spring Water": 1}, type: "Potion", category: "green" },
    { id: 34, n: "Nature's Blessing", lvl: 65, icon: "🌳", mats: {"World Tree Fruit": 2, "Life Essence": 1}, type: "Food", category: "green" },
    { id: 35, n: "Fairy Ring Salad", lvl: 70, icon: "🧚", mats: {"Fairy Mushroom": 3, "Dewdrops": 2}, type: "Food", category: "green" },
    { id: 36, n: "Life Blossom Soup", lvl: 75, icon: "🌸", mats: {"Life Blossom": 3, "Pure Water": 2}, type: "Food", category: "green" },
    { id: 37, n: "Ambrosia Salad", lvl: 80, icon: "✨", mats: {"Divine Greens": 3, "Starfruit": 2}, type: "Food", category: "green" },
    { id: 38, n: "Eternal Spring Mix", lvl: 85, icon: "🌺", mats: {"Eternal Petals": 4, "Lifewater": 2}, type: "Food", category: "green" },
    { id: 39, n: "World Tree Nectar", lvl: 90, icon: "🌳", mats: {"World Tree Sap": 2, "Divine Pollen": 1}, type: "Potion", category: "green" },
    { id: 40, n: "Divine Restoration", lvl: 95, icon: "💎", mats: {"Divine Herbs": 5, "Holy Water": 2}, type: "Potion", category: "green" },
    
    // ═══════════════════════════════════════════════════════════════
    // BLUE FOODS - Stews/Brews, Mana/Magic Buffs (20 recipes)
    // ═══════════════════════════════════════════════════════════════
    { id: 41, n: "Basic Broth", lvl: 1, icon: "🥣", mats: {"Water": 2, "Salt": 1}, type: "Food", category: "blue" },
    { id: 42, n: "Wheat Bread", lvl: 5, icon: "🍞", mats: {"Flour": 2, "Water": 1}, type: "Food", category: "blue" },
    { id: 43, n: "Stamina Brew", lvl: 10, icon: "🍺", mats: {"Grain": 2, "Hops": 1}, type: "Potion", category: "blue" },
    { id: 44, n: "Warrior's Bread", lvl: 15, icon: "🥖", mats: {"Grain": 3, "Water": 1}, type: "Food", category: "blue" },
    { id: 45, n: "Fish Stew", lvl: 20, icon: "🐟", mats: {"Fish": 2, "Potato": 2, "Broth": 1}, type: "Food", category: "blue" },
    { id: 46, n: "Hearty Stew", lvl: 25, icon: "🍲", mats: {"Meat": 2, "Potato": 3, "Broth": 1}, type: "Food", category: "blue" },
    { id: 47, n: "Honey Bread", lvl: 30, icon: "🍯", mats: {"Flour": 3, "Honey": 2}, type: "Food", category: "blue" },
    { id: 48, n: "Mana Soup", lvl: 35, icon: "🔮", mats: {"Magic Mushroom": 3, "Arcane Water": 1}, type: "Potion", category: "blue" },
    { id: 49, n: "Sailor's Chowder", lvl: 40, icon: "🦐", mats: {"Shellfish": 3, "Cream": 2}, type: "Food", category: "blue" },
    { id: 50, n: "Mystic Gumbo", lvl: 45, icon: "🫕", mats: {"Seafood": 3, "Spellwort": 2, "Broth": 2}, type: "Food", category: "blue" },
    { id: 51, n: "Arcane Pastry", lvl: 50, icon: "🥧", mats: {"Magic Flour": 3, "Mana Butter": 2}, type: "Food", category: "blue" },
    { id: 52, n: "Grog of Courage", lvl: 55, icon: "🍻", mats: {"Strong Grain": 4, "Fire Water": 1}, type: "Potion", category: "blue" },
    { id: 53, n: "Wizard's Stew", lvl: 60, icon: "🧙", mats: {"Magic Ingredients": 4, "Mana Crystal": 1}, type: "Food", category: "blue" },
    { id: 54, n: "Enchanted Pie", lvl: 65, icon: "🥮", mats: {"Enchanted Fruit": 3, "Magic Crust": 2}, type: "Food", category: "blue" },
    { id: 55, n: "Astral Soup", lvl: 70, icon: "🌌", mats: {"Star Essence": 2, "Void Mushroom": 3}, type: "Potion", category: "blue" },
    { id: 56, n: "Void Bisque", lvl: 75, icon: "🌑", mats: {"Void Crab": 2, "Shadow Cream": 2}, type: "Food", category: "blue" },
    { id: 57, n: "Celestial Cake", lvl: 80, icon: "🎂", mats: {"Starlight Flour": 4, "Moon Sugar": 3}, type: "Food", category: "blue" },
    { id: 58, n: "Cosmic Brew", lvl: 85, icon: "🌠", mats: {"Cosmic Hops": 3, "Starwater": 2}, type: "Potion", category: "blue" },
    { id: 59, n: "Eternal Cake", lvl: 90, icon: "🍰", mats: {"Divine Flour": 5, "Eternal Sugar": 3}, type: "Food", category: "blue" },
    { id: 60, n: "Nectar of Gods", lvl: 95, icon: "🍷", mats: {"Astral Fruit": 10, "Holy Water": 1}, type: "Potion", category: "blue" },
    
    // ═══════════════════════════════════════════════════════════════
    // POTIONS - Combat & Utility (20 recipes)
    // ═══════════════════════════════════════════════════════════════
    { id: 61, n: "Minor Health Potion", lvl: 1, icon: "❤️", mats: {"Red Herb": 2, "Water": 1}, type: "Potion", category: "red" },
    { id: 62, n: "Minor Mana Potion", lvl: 1, icon: "💙", mats: {"Blue Herb": 2, "Water": 1}, type: "Potion", category: "blue" },
    { id: 63, n: "Minor Stamina Potion", lvl: 5, icon: "💛", mats: {"Yellow Herb": 2, "Water": 1}, type: "Potion", category: "green" },
    { id: 64, n: "Antidote", lvl: 10, icon: "💜", mats: {"Antitoxin Herb": 3, "Pure Water": 1}, type: "Potion", category: "green" },
    { id: 65, n: "Health Potion", lvl: 20, icon: "❤️", mats: {"Blood Moss": 3, "Distilled Water": 1}, type: "Potion", category: "red" },
    { id: 66, n: "Mana Potion", lvl: 20, icon: "💙", mats: {"Mana Bloom": 3, "Distilled Water": 1}, type: "Potion", category: "blue" },
    { id: 67, n: "Rage Potion", lvl: 30, icon: "🔴", mats: {"Berserker Root": 3, "Fire Essence": 1}, type: "Potion", category: "red" },
    { id: 68, n: "Speed Potion", lvl: 30, icon: "⚡", mats: {"Swift Herb": 3, "Wind Essence": 1}, type: "Potion", category: "green" },
    { id: 69, n: "Defense Potion", lvl: 35, icon: "🛡️", mats: {"Ironbark": 3, "Earth Essence": 1}, type: "Potion", category: "blue" },
    { id: 70, n: "Greater Health Potion", lvl: 40, icon: "❤️", mats: {"Heart Blossom": 4, "Life Essence": 1}, type: "Potion", category: "red" },
    { id: 71, n: "Greater Mana Potion", lvl: 40, icon: "💙", mats: {"Mana Crystal Dust": 4, "Arcane Water": 1}, type: "Potion", category: "blue" },
    { id: 72, n: "Invisibility Potion", lvl: 50, icon: "👻", mats: {"Ghost Orchid": 4, "Shadow Essence": 2}, type: "Potion", category: "blue" },
    { id: 73, n: "Fire Resistance", lvl: 55, icon: "🔥", mats: {"Firebloom": 4, "Ice Essence": 2}, type: "Potion", category: "red" },
    { id: 74, n: "Frost Resistance", lvl: 55, icon: "❄️", mats: {"Frostleaf": 4, "Fire Essence": 2}, type: "Potion", category: "blue" },
    { id: 75, n: "Super Health Potion", lvl: 60, icon: "❤️", mats: {"Dragon Blood Herb": 5, "Life Crystal": 1}, type: "Potion", category: "red" },
    { id: 76, n: "Super Mana Potion", lvl: 60, icon: "💙", mats: {"Arcane Lotus": 5, "Mana Crystal": 1}, type: "Potion", category: "blue" },
    { id: 77, n: "Berserker Elixir", lvl: 70, icon: "💢", mats: {"Rage Flower": 5, "Blood Essence": 2}, type: "Potion", category: "red" },
    { id: 78, n: "Titan Strength", lvl: 80, icon: "💪", mats: {"Giant's Blood": 3, "Power Crystal": 1}, type: "Potion", category: "red" },
    { id: 79, n: "Divine Health", lvl: 90, icon: "❤️", mats: {"Phoenix Tear": 2, "Divine Essence": 1}, type: "Potion", category: "red" },
    { id: 80, n: "Elixir of Immortality", lvl: 95, icon: "✨", mats: {"Philosopher's Stone": 1, "Dragon Blood": 3}, type: "Potion", category: "red" },
    
    // ═══════════════════════════════════════════════════════════════
    // INGREDIENTS & TOOLS (10 recipes)
    // ═══════════════════════════════════════════════════════════════
    { id: 81, n: "Refined Salt", lvl: 5, icon: "🧂", mats: {"Raw Salt": 3}, type: "Ingredient", category: "blue" },
    { id: 82, n: "Spicy Oil", lvl: 20, icon: "🌶️", mats: {"Chili": 5, "Oil": 1}, type: "Ingredient", category: "red" },
    { id: 83, n: "Herb Extract", lvl: 25, icon: "🌿", mats: {"Mixed Herbs": 5, "Alcohol": 1}, type: "Ingredient", category: "green" },
    { id: 84, n: "Meat Marinade", lvl: 30, icon: "🍯", mats: {"Wine": 2, "Spices": 3, "Honey": 1}, type: "Ingredient", category: "red" },
    { id: 85, n: "Magic Flour", lvl: 40, icon: "✨", mats: {"Wheat": 5, "Mana Dust": 1}, type: "Ingredient", category: "blue" },
    { id: 86, n: "Distilled Essence", lvl: 50, icon: "💧", mats: {"Pure Water": 5, "Magic Crystal": 1}, type: "Ingredient", category: "blue" },
    { id: 87, n: "Chef's Apron", lvl: 5, icon: "🎽", mats: {"Cloth": 2, "String": 1}, type: "Armor", category: "blue" },
    { id: 88, n: "Cleaver of Feast", lvl: 60, icon: "🔪", mats: {"Steel": 5, "Bone": 2}, type: "Weapon", category: "red" },
    { id: 89, n: "Master Chef Hat", lvl: 80, icon: "👨‍🍳", mats: {"Fine Cloth": 3, "Gold Thread": 1}, type: "Armor", category: "blue" },
    { id: 90, n: "Divine Spatula", lvl: 90, icon: "🥄", mats: {"Divine Metal": 2, "Enchanted Wood": 1}, type: "Weapon", category: "blue" }
  ],
  inventory: { "Scrap Meat": 10, "Twig": 10, "Grain": 5, "Water": 5, "Prime Meat": 0, "Salt": 0, "Spicy Herb": 0, "Dragon Flank": 0, "Liquid Fire": 0, "Steel": 0 }
};

import { db } from "./db";
import { races, classes, spriteSheets, dungeonTemplates, tilesets, items, spells, skills, monsters, loreEntities } from "@shared/schema";
import { ALL_WEAPONS, type Weapon } from "@shared/definitions/weaponsData";
import { ALL_EQUIPMENT, type EquipmentItem } from "@shared/definitions/equipmentData";
import { CRAFTING_MATERIALS, type CraftingMaterial } from "@shared/definitions/materials";
import { SPELLS, type SpellDefinition } from "@shared/definitions/spells";
import { SKILLS, type SkillDefinition } from "@shared/definitions/skills";
import { MONSTERS, type MonsterDefinition } from "@shared/definitions/monsters";
import { ITEMS } from "@shared/definitions/items";
import { ALL_FOOD_RECIPES, generateTieredFood } from "@shared/definitions/foods";
import { seedLoreEntities } from "./seeds/loreSeed";

async function seedRaces() {
  const raceData = [
    { id: "human", name: "Human", faction: "crusade", baseAttributes: { Strength: 2, Intellect: 2, Dexterity: 2, Endurance: 2 }, portraitPath: "/sprites/portraits/human.png" },
    { id: "orc", name: "Orc", faction: "legion", baseAttributes: { Strength: 4, Endurance: 3, Dexterity: 1, Intellect: 0 }, portraitPath: "/sprites/portraits/orc.png" },
    { id: "elf", name: "Elf", faction: "fabled", baseAttributes: { Dexterity: 4, Intellect: 3, Strength: 1, Endurance: 0 }, portraitPath: "/sprites/portraits/elf.png" },
    { id: "dwarf", name: "Dwarf", faction: "crusade", baseAttributes: { Endurance: 4, Strength: 3, Dexterity: 1, Intellect: 0 }, portraitPath: "/sprites/portraits/dwarf.png" },
    { id: "barbarian", name: "Barbarian", faction: "legion", baseAttributes: { Strength: 5, Endurance: 2, Dexterity: 1, Intellect: 0 }, portraitPath: "/sprites/portraits/barbarian.png" },
    { id: "undead", name: "Undead", faction: "fabled", baseAttributes: { Intellect: 4, Endurance: 2, Strength: 1, Dexterity: 1 }, portraitPath: "/sprites/portraits/undead.png" },
  ];
  
  for (const race of raceData) {
    await db.insert(races).values(race).onConflictDoNothing();
  }
  console.log(`Seeded ${raceData.length} races`);
}

async function seedClasses() {
  const classData = [
    { 
      id: "warrior", 
      name: "Warrior", 
      primaryAttribute: "Strength", 
      baseStats: { hp: 150, mana: 30, stamina: 100 }, 
      description: "A mighty fighter skilled in melee combat",
      startingAbilities: ["Slash", "PowerStrike", "Taunt"] // Using reference names (no spaces)
    },
    { 
      id: "mage", 
      name: "Mage Priest", 
      primaryAttribute: "Intellect", 
      baseStats: { hp: 80, mana: 150, stamina: 50 }, 
      description: "A wielder of arcane and holy magic",
      startingAbilities: ["Fireball", "HolyLight", "ArcaneMissiles"] // Using reference names (no spaces)
    },
    { 
      id: "ranger", 
      name: "Ranger Scout", 
      primaryAttribute: "Dexterity", 
      baseStats: { hp: 100, mana: 60, stamina: 120 }, 
      description: "A skilled archer and tracker",
      startingAbilities: ["AimedShot", "MultiShot", "Entangle"] // Using reference names (no spaces)
    },
    { 
      id: "shapeshifter", 
      name: "Worg Shapeshifter", 
      primaryAttribute: "Endurance", 
      baseStats: { hp: 120, mana: 80, stamina: 80 }, 
      description: "A druid who can transform into beasts",
      startingAbilities: ["FeralStrike", "SavagePounce", "Entangle"] // Using reference names (no spaces)
    },
  ];
  
  for (const cls of classData) {
    await db.insert(classes).values(cls).onConflictDoNothing();
  }
  console.log(`Seeded ${classData.length} classes with starting abilities`);
}

async function seedWeapons() {
  let count = 0;
  for (const weapon of ALL_WEAPONS) {
    const itemData = {
      id: weapon.id,
      name: weapon.name,
      type: "weapon",
      subType: weapon.type,
      rarity: "common",
      tier: 1,
      description: weapon.lore,
      stats: {
        damageBase: weapon.stats.damageBase,
        damagePerTier: weapon.stats.damagePerTier,
        speedBase: weapon.stats.speedBase,
        critBase: weapon.stats.critBase,
        blockBase: weapon.stats.blockBase,
        defenseBase: weapon.stats.defenseBase,
      },
      requirements: { level: 1 },
      stackable: false,
      maxStack: 1,
      sellValue: Math.round(weapon.stats.damageBase * 10),
    };
    await db.insert(items).values(itemData).onConflictDoNothing();
    count++;
  }
  console.log(`Seeded ${count} weapons`);
}

async function seedEquipment() {
  let count = 0;
  for (const equip of ALL_EQUIPMENT) {
    const itemData = {
      id: equip.id,
      name: equip.name,
      type: "armor",
      subType: equip.type,
      rarity: "common",
      tier: 1,
      description: equip.lore,
      stats: {
        hpBase: equip.stats.hpBase,
        hpPerTier: equip.stats.hpPerTier,
        manaBase: equip.stats.manaBase,
        manaPerTier: equip.stats.manaPerTier,
        critBase: equip.stats.critBase,
        blockBase: equip.stats.blockBase,
        defenseBase: equip.stats.defenseBase,
        passive: equip.passive,
        effect: equip.effect,
        proc: equip.proc,
        setBonus: equip.setBonus,
      },
      requirements: { level: 1 },
      stackable: false,
      maxStack: 1,
      sellValue: Math.round(equip.stats.hpBase + equip.stats.manaBase),
    };
    await db.insert(items).values(itemData).onConflictDoNothing();
    count++;
  }
  console.log(`Seeded ${count} armor pieces`);
}

async function seedMaterials() {
  let count = 0;
  for (const mat of CRAFTING_MATERIALS) {
    const itemData = {
      id: mat.id,
      name: mat.name,
      type: "material",
      subType: mat.category,
      rarity: mat.tier <= 2 ? "common" : mat.tier <= 4 ? "uncommon" : mat.tier <= 6 ? "rare" : "epic",
      tier: mat.tier,
      description: mat.description,
      stats: { gatheredBy: mat.gatheredBy },
      stackable: true,
      maxStack: 999,
      sellValue: mat.tier * 5,
    };
    await db.insert(items).values(itemData).onConflictDoNothing();
    count++;
  }
  console.log(`Seeded ${count} crafting materials`);
}

async function seedMiscItems() {
  let count = 0;
  for (const [id, item] of Object.entries(ITEMS)) {
    const itemData = {
      id: item.id,
      name: item.name,
      type: item.type,
      subType: item.weaponType || item.armorType || null,
      rarity: item.rarity || "common",
      tier: item.tier || 1,
      description: item.description,
      stats: item.stats || {},
      requirements: item.levelRequirement ? { level: item.levelRequirement } : null,
      stackable: item.stackable || false,
      maxStack: item.stackable ? 999 : 1,
      sellValue: item.sellValue || 1,
    };
    await db.insert(items).values(itemData).onConflictDoNothing();
    count++;
  }
  console.log(`Seeded ${count} misc items`);
}

async function seedFoods() {
  let count = 0;
  
  for (const recipe of ALL_FOOD_RECIPES) {
    for (let tier = 1; tier <= 8; tier++) {
      const food = generateTieredFood(recipe, tier);
      
      const itemData = {
        id: food.id,
        name: food.name,
        type: "consumable",
        subType: `food_${food.category}`,
        rarity: tier <= 2 ? "common" : tier <= 4 ? "uncommon" : tier <= 6 ? "rare" : "epic",
        tier: food.tier,
        description: `${food.baseName} - ${food.category.toUpperCase()} food`,
        stats: {
          effects: food.effects,
          cookTime: food.cookTime,
          ingredients: food.ingredients,
          special: food.special,
        },
        stackable: true,
        maxStack: 20,
        sellValue: tier * 10,
      };
      await db.insert(items).values(itemData).onConflictDoNothing();
      count++;
    }
  }
  console.log(`Seeded ${count} food items`);
}

async function seedSpells() {
  let count = 0;
  for (const [id, spell] of Object.entries(SPELLS)) {
    const spellData = {
      id: spell.id,
      name: spell.name,
      referenceName: spell.referenceName, // No spaces - for scripting references
      school: spell.school,
      damageType: spell.damageType,
      baseDamage: spell.baseDamage,
      manaCost: spell.manaCost,
      cooldown: spell.cooldown || 0,
      range: 1,
      areaOfEffect: spell.aoeRadius || 0,
      description: spell.description,
      levelRequired: spell.levelRequirement || 1,
      effects: spell.statusEffects?.map(e => ({
        type: e.type,
        value: Object.values(e.statModifiers || {})[0] || 0,
        duration: e.duration,
      })) || [],
      visualEffect: spell.visualEffect ? { animation: spell.animation || "default", color: spell.visualEffect } : null,
    };
    await db.insert(spells).values(spellData).onConflictDoNothing();
    count++;
  }
  console.log(`Seeded ${count} spells with reference names`);
}

async function seedSkills() {
  let count = 0;
  for (const [id, skill] of Object.entries(SKILLS)) {
    const skillData = {
      id: skill.id,
      name: skill.name,
      referenceName: skill.referenceName, // No spaces - for scripting references
      weaponType: skill.weaponType || "any",
      damageType: skill.damageType,
      damageMultiplier: skill.baseDamage ? Math.round(skill.baseDamage * 10) : 100,
      staminaCost: skill.staminaCost || 0,
      cooldown: skill.cooldown || 0,
      description: skill.description,
      levelRequired: skill.levelRequirement || 1,
      comboPosition: null,
      effects: skill.statusEffects?.map(e => ({
        type: e.type || e.id,
        value: Object.values(e.statModifiers || {})[0] || 0,
        duration: e.duration,
      })) || [],
      visualEffect: skill.visualEffect ? { animation: skill.animation || "default", color: skill.visualEffect } : null,
    };
    await db.insert(skills).values(skillData).onConflictDoNothing();
    count++;
  }
  console.log(`Seeded ${count} skills with reference names`);
}

async function seedMonsters() {
  let count = 0;
  for (const [id, monster] of Object.entries(MONSTERS)) {
    const monsterData = {
      id: monster.id,
      name: monster.name,
      level: monster.level,
      isBoss: monster.isBoss || false,
      hp: monster.baseHp,
      damage: monster.baseDamage,
      defense: monster.baseDefense || 0,
      speed: 10,
      xpReward: monster.xpReward,
      goldReward: monster.goldReward?.min || 0,
      abilities: monster.abilities || [],
      weaknesses: monster.weaknesses || [],
      resistances: monster.resistances || [],
      lootTable: monster.lootTable?.map(l => ({
        itemId: l.itemId,
        chance: l.chance,
        minQty: l.minQty,
        maxQty: l.maxQty,
      })) || [],
      spriteSheetId: monster.spriteSet?.toLowerCase() || null,
      description: monster.description,
    };
    await db.insert(monsters).values(monsterData).onConflictDoNothing();
    count++;
  }
  console.log(`Seeded ${count} monsters`);
}

async function seedSpriteSheets() {
  const spriteData = [
    {
      id: "hero_man1",
      name: "Hero Man 1",
      category: "character",
      filePath: "/sprites/dampdungeons/animations/Dungeon_HeroMan1.png",
      sheetWidth: 288,
      sheetHeight: 256,
      frameWidth: 48,
      frameHeight: 64,
      framesPerRow: 6,
      framesPerColumn: 4,
      anchorX: 50,
      anchorY: 100,
      animations: {
        idle_down: { row: 0, frameCount: 1, frameDuration: 200 },
        walk_down: { row: 0, frameCount: 3, frameDuration: 150 },
        idle_left: { row: 1, frameCount: 1, frameDuration: 200 },
        walk_left: { row: 1, frameCount: 3, frameDuration: 150 },
        idle_right: { row: 2, frameCount: 1, frameDuration: 200 },
        walk_right: { row: 2, frameCount: 3, frameDuration: 150 },
        idle_up: { row: 3, frameCount: 1, frameDuration: 200 },
        walk_up: { row: 3, frameCount: 3, frameDuration: 150 },
      }
    },
    {
      id: "hero_sword1",
      name: "Hero With Sword",
      category: "character",
      filePath: "/sprites/dampdungeons/animations/Dungeon_HeroManSword1.png",
      sheetWidth: 188,
      sheetHeight: 252,
      frameWidth: 47,
      frameHeight: 63,
      framesPerRow: 4,
      framesPerColumn: 4,
      anchorX: 50,
      anchorY: 100,
      animations: {
        idle_down: { row: 0, frameCount: 1, frameDuration: 200 },
        walk_down: { row: 0, frameCount: 3, frameDuration: 150 },
        idle_left: { row: 1, frameCount: 1, frameDuration: 200 },
        walk_left: { row: 1, frameCount: 3, frameDuration: 150 },
        idle_right: { row: 2, frameCount: 1, frameDuration: 200 },
        walk_right: { row: 2, frameCount: 3, frameDuration: 150 },
        idle_up: { row: 3, frameCount: 1, frameDuration: 200 },
        walk_up: { row: 3, frameCount: 3, frameDuration: 150 },
      }
    },
    {
      id: "monsters1",
      name: "Monsters Sheet 1",
      category: "monster",
      filePath: "/sprites/dampdungeons/animations/Dungeon_Monsters1.png",
      sheetWidth: 288,
      sheetHeight: 256,
      frameWidth: 48,
      frameHeight: 64,
      framesPerRow: 6,
      framesPerColumn: 4,
      anchorX: 50,
      anchorY: 100,
      animations: {
        idle_down: { row: 0, frameCount: 1, frameDuration: 200 },
        walk_down: { row: 0, frameCount: 3, frameDuration: 150 },
      }
    },
    {
      id: "monsters2",
      name: "Monsters Sheet 2",
      category: "monster",
      filePath: "/sprites/dampdungeons/animations/Dungeon_Monsters2.png",
      sheetWidth: 288,
      sheetHeight: 256,
      frameWidth: 48,
      frameHeight: 64,
      framesPerRow: 6,
      framesPerColumn: 4,
      anchorX: 50,
      anchorY: 100,
      animations: {
        idle_down: { row: 0, frameCount: 1, frameDuration: 200 },
        walk_down: { row: 0, frameCount: 3, frameDuration: 150 },
      }
    },
    {
      id: "slimes1",
      name: "Slimes",
      category: "monster",
      filePath: "/sprites/dampdungeons/animations/Dungeon_Slimes1.png",
      sheetWidth: 288,
      sheetHeight: 256,
      frameWidth: 48,
      frameHeight: 64,
      framesPerRow: 6,
      framesPerColumn: 4,
      anchorX: 50,
      anchorY: 100,
      animations: {
        idle_down: { row: 0, frameCount: 1, frameDuration: 200 },
        walk_down: { row: 0, frameCount: 3, frameDuration: 150 },
      }
    },
    {
      id: "spell_fireball",
      name: "Fire Ball",
      category: "spell",
      filePath: "/sprites/spells/fire-ball/",
      sheetWidth: 640,
      sheetHeight: 640,
      frameWidth: 640,
      frameHeight: 640,
      framesPerRow: 1,
      framesPerColumn: 1,
      anchorX: 50,
      anchorY: 50,
      animations: { default: { row: 0, frameCount: 10, frameDuration: 80 } }
    },
    {
      id: "spell_firebolt",
      name: "Fire Bolt",
      category: "spell",
      filePath: "/sprites/spells/fire-bolt/",
      sheetWidth: 640,
      sheetHeight: 640,
      frameWidth: 640,
      frameHeight: 640,
      framesPerRow: 1,
      framesPerColumn: 1,
      anchorX: 50,
      anchorY: 50,
      animations: { default: { row: 0, frameCount: 8, frameDuration: 80 } }
    },
    {
      id: "spell_waterball",
      name: "Water Ball",
      category: "spell",
      filePath: "/sprites/spells/water-ball/",
      sheetWidth: 640,
      sheetHeight: 640,
      frameWidth: 640,
      frameHeight: 640,
      framesPerRow: 1,
      framesPerColumn: 1,
      anchorX: 50,
      anchorY: 50,
      animations: { default: { row: 0, frameCount: 12, frameDuration: 80 } }
    },
    {
      id: "spell_waterarrow",
      name: "Water Arrow",
      category: "spell",
      filePath: "/sprites/spells/water-arrow/",
      sheetWidth: 640,
      sheetHeight: 640,
      frameWidth: 640,
      frameHeight: 640,
      framesPerRow: 1,
      framesPerColumn: 1,
      anchorX: 50,
      anchorY: 50,
      animations: { default: { row: 0, frameCount: 8, frameDuration: 80 } }
    },
    {
      id: "spell_waterspell",
      name: "Water Spell",
      category: "spell",
      filePath: "/sprites/spells/water-spell/",
      sheetWidth: 640,
      sheetHeight: 640,
      frameWidth: 640,
      frameHeight: 640,
      framesPerRow: 1,
      framesPerColumn: 1,
      anchorX: 50,
      anchorY: 50,
      animations: { default: { row: 0, frameCount: 8, frameDuration: 80 } }
    }
  ];
  
  for (const sprite of spriteData) {
    await db.insert(spriteSheets).values(sprite).onConflictDoNothing();
  }
  console.log(`Seeded ${spriteData.length} sprite sheets`);
}

async function seedDungeonTemplates() {
  const dungeonData = [
    { id: "goblin_caves", name: "Goblin Caves", minLevel: 1, maxLevel: 5, floorCount: 3, theme: "cave", description: "Dark caves infested with goblins" },
    { id: "undead_crypts", name: "Undead Crypts", minLevel: 5, maxLevel: 10, floorCount: 4, theme: "crypt", description: "Ancient burial grounds haunted by the undead" },
    { id: "demon_lair", name: "Demon Lair", minLevel: 10, maxLevel: 15, floorCount: 5, theme: "hell", description: "A fiery portal to the demon realm" },
    { id: "dragon_peak", name: "Dragon Peak", minLevel: 15, maxLevel: 20, floorCount: 6, theme: "mountain", description: "The legendary mountain where dragons dwell" },
    { id: "shadow_realm", name: "Shadow Realm", minLevel: 20, maxLevel: 25, floorCount: 7, theme: "shadow", description: "A dimension of pure darkness" },
  ];
  
  for (const dungeon of dungeonData) {
    await db.insert(dungeonTemplates).values(dungeon).onConflictDoNothing();
  }
  console.log(`Seeded ${dungeonData.length} dungeon templates`);
}

async function seedTilesets() {
  const tilesetData = [
    {
      id: "dungeon_basic",
      name: "Basic Dungeon",
      filePath: "/sprites/dampdungeons/tiles/Dungeon_Tiles.png",
      tileSize: 32,
      tileDefinitions: {
        floor: { x: 0, y: 0, walkable: true, transparent: true },
        wall: { x: 1, y: 0, walkable: false, transparent: false },
        door: { x: 2, y: 0, walkable: true, transparent: true },
        stairs_up: { x: 3, y: 0, walkable: true, transparent: true },
        stairs_down: { x: 4, y: 0, walkable: true, transparent: true },
      }
    }
  ];
  
  for (const tileset of tilesetData) {
    await db.insert(tilesets).values(tileset).onConflictDoNothing();
  }
  console.log(`Seeded ${tilesetData.length} tilesets`);
}

export async function seedDatabase() {
  console.log("Starting comprehensive database seed...");
  console.log("=========================================");
  
  try {
    console.log("\n[1/12] Seeding core game data...");
    await seedRaces();
    await seedClasses();
    
    console.log("\n[2/12] Seeding weapons...");
    await seedWeapons();
    
    console.log("\n[3/12] Seeding armor/equipment...");
    await seedEquipment();
    
    console.log("\n[4/12] Seeding crafting materials...");
    await seedMaterials();
    
    console.log("\n[5/12] Seeding misc items...");
    await seedMiscItems();
    
    console.log("\n[6/12] Seeding food items...");
    await seedFoods();
    
    console.log("\n[7/12] Seeding spells...");
    await seedSpells();
    
    console.log("\n[8/12] Seeding skills...");
    await seedSkills();
    
    console.log("\n[9/12] Seeding monsters...");
    await seedMonsters();
    
    console.log("\n[10/12] Seeding sprite sheets...");
    await seedSpriteSheets();
    
    console.log("\n[11/12] Seeding dungeon templates...");
    await seedDungeonTemplates();
    
    console.log("\n[12/13] Seeding tilesets...");
    await seedTilesets();
    
    console.log("\n[13/13] Seeding lore entities...");
    await seedLoreEntities();
    
    console.log("\n=========================================");
    console.log("Database seeding complete!");
    console.log("=========================================");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

export async function getSeedStats() {
  const stats = {
    races: await db.select().from(races).then(r => r.length),
    classes: await db.select().from(classes).then(r => r.length),
    items: await db.select().from(items).then(r => r.length),
    spells: await db.select().from(spells).then(r => r.length),
    skills: await db.select().from(skills).then(r => r.length),
    monsters: await db.select().from(monsters).then(r => r.length),
    spriteSheets: await db.select().from(spriteSheets).then(r => r.length),
    dungeonTemplates: await db.select().from(dungeonTemplates).then(r => r.length),
    tilesets: await db.select().from(tilesets).then(r => r.length),
    loreEntities: await db.select().from(loreEntities).then(r => r.length),
  };
  return stats;
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

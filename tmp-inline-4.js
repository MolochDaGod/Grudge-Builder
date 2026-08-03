
// ============================================================
// STATE
// ============================================================
const GRUDGE_API = window.GRUDGE_CONFIG.GAME_DATA;
const GRUDGE_AUTH = window.GRUDGE_CONFIG.AUTH_GATEWAY;

/** Profession icons from info.grudge-studio.com (professions.json iconUrl) */
const PROF_ICON_URLS = {
  Miner: 'https://info.grudge-studio.com/icons/skills/class/engineer/engineer_01.png',
  Forester: 'https://info.grudge-studio.com/icons/skills/class/hunter/hunter_01.png',
  Mystic: 'https://info.grudge-studio.com/icons/skills/class/bloodmage/bloodmage_01.png',
  Chef: 'https://info.grudge-studio.com/icons/skills/class/firemage/firemage_01.png',
  Engineer: 'https://assets.grudge-studio.com/icons/pack/weapons/Crossbow_01.png',
};

function blankProfessions() {
  return {
    Miner:     { level: 1, xp: 0, xpNext: 100, totalCrafts: 0, color: '#ef4444', icon: 'â›ï¸', iconUrl: PROF_ICON_URLS.Miner, role: 'Metal · Weapons · Armor' },
    Forester:  { level: 1, xp: 0, xpNext: 100, totalCrafts: 0, color: '#22c55e', icon: 'ðŸª“', iconUrl: PROF_ICON_URLS.Forester, role: 'Wood · Bows · Leather' },
    Mystic:    { level: 1, xp: 0, xpNext: 100, totalCrafts: 0, color: '#a78bfa', icon: 'ðŸ”®', iconUrl: PROF_ICON_URLS.Mystic, role: 'Cloth · Staves · Enchants' },
    Chef:      { level: 1, xp: 0, xpNext: 100, totalCrafts: 0, color: '#f59e0b', icon: 'ðŸ³', iconUrl: PROF_ICON_URLS.Chef, role: 'Food · Potions · Buffs' },
    Engineer:  { level: 1, xp: 0, xpNext: 100, totalCrafts: 0, color: '#60a5fa', icon: 'âš™ï¸', iconUrl: PROF_ICON_URLS.Engineer, role: 'Guns · Crossbows · Traps' },
  };
}
function blankEquipment() {
  return { head: null, chest: null, hands: null, feet: null, weapon: null, shield: null, ring: null, necklace: null };
}
function blankAttributes() {
  return { strength: 0, vitality: 0, endurance: 0, intellect: 0, wisdom: 0, dexterity: 0, agility: 0, tactics: 0 };
}
function blankCharSheet() {
  return {
    characterId: null,
    grudgeCode: null,
    professions: blankProfessions(),
    // Profession skill-tree node unlocks: { Miner: [1,2,10], ... }
    professionSkillNodes: { Miner: [], Forester: [], Mystic: [], Chef: [], Engineer: [] },
    equipment: blankEquipment(),
    attributes: blankAttributes(),
    unspentAttributePoints: 0,
    skillPoints: 1,
    // Class skill tree selections { tierLevel: skillName }
    selectedSkills: {},
    skillLoadouts: {},
    // Weapon mastery: { allocations: { swords: { sw_honed: 2 } }, sockets: {} }
    weaponMastery: { allocations: {}, sockets: {} },
    weaponSkillLevel: 1,
    weaponSkillSelections: {},
    equippedWeaponId: null,
    level: 1,
    xp: 0,
    stats: { totalCrafts: 0, itemsCrafted: 0, materialsUsed: 0, failedCrafts: 0 },
  };
}

/** Compact profession skill trees (core nodes) — unlocked by profession level */
const PROF_SKILL_TREES = {
  Miner: [
    { id: 1, n: "Miner's Initiation", req: 1, branch: 'Core', desc: '+5% craft success' },
    { id: 2, n: 'Ore Identification', req: 5, branch: 'Core', desc: '+8% ore quality' },
    { id: 3, n: 'Metallurgy Basics', req: 10, branch: 'Core', desc: 'Unlock T2 smelting paths' },
    { id: 10, n: 'Blade Forging', req: 15, branch: 'Weapons', desc: 'Sword / dagger recipes' },
    { id: 11, n: 'Edge Tempering', req: 25, branch: 'Weapons', desc: '+quality on blades' },
    { id: 20, n: 'Plate Crafting', req: 15, branch: 'Armor', desc: 'Metal armor recipes' },
    { id: 30, n: 'Master Smith', req: 40, branch: 'Core', desc: 'T5+ metal unlocks' },
  ],
  Forester: [
    { id: 1, n: 'Woodlore', req: 1, branch: 'Core', desc: 'Basic woodworking' },
    { id: 2, n: 'Seasoning', req: 5, branch: 'Core', desc: '+plank quality' },
    { id: 10, n: 'Bowcraft', req: 15, branch: 'Weapons', desc: 'Bow recipes' },
    { id: 20, n: 'Tanning', req: 15, branch: 'Armor', desc: 'Leather armor' },
    { id: 30, n: 'Master Forester', req: 40, branch: 'Core', desc: 'T5+ wood unlocks' },
  ],
  Mystic: [
    { id: 1, n: 'Arcane Thread', req: 1, branch: 'Core', desc: 'Cloth basics' },
    { id: 2, n: 'Essence Binding', req: 5, branch: 'Core', desc: '+essence efficiency' },
    { id: 10, n: 'Staff Turning', req: 15, branch: 'Weapons', desc: 'Staff recipes' },
    { id: 20, n: 'Robe Weaving', req: 15, branch: 'Armor', desc: 'Cloth armor' },
    { id: 30, n: 'Archmystic', req: 40, branch: 'Core', desc: 'T5+ arcane unlocks' },
  ],
  Chef: [
    { id: 1, n: 'Camp Cook', req: 1, branch: 'Core', desc: 'Basic foods' },
    { id: 2, n: 'Seasoning Arts', req: 5, branch: 'Core', desc: '+food buff duration' },
    { id: 10, n: 'Brewing', req: 15, branch: 'Potions', desc: 'Potion recipes' },
    { id: 20, n: 'Banquet', req: 25, branch: 'Food', desc: 'Party buffs' },
    { id: 30, n: 'Master Chef', req: 40, branch: 'Core', desc: 'T5+ culinary unlocks' },
  ],
  Engineer: [
    { id: 1, n: 'Tinkerer', req: 1, branch: 'Core', desc: 'Basic mechanisms' },
    { id: 2, n: 'Precision', req: 5, branch: 'Core', desc: '+gear quality' },
    { id: 10, n: 'Crossbows', req: 15, branch: 'Weapons', desc: 'Crossbow recipes' },
    { id: 20, n: 'Firearms', req: 25, branch: 'Weapons', desc: 'Gun recipes' },
    { id: 30, n: 'Master Engineer', req: 40, branch: 'Core', desc: 'T5+ siege unlocks' },
  ],
};

/**
 * Survival kit mesh nodes (free_survival_asset_kit.glb) â†’ WCS stations.
 * Placeable in any camp, home island, or boat cabin.
 * CDN: assets.grudge-studio.com/models/survival/free_survival_asset_kit.glb
 */
const SURVIVAL_KIT = {
  packUrl: 'https://assets.grudge-studio.com/models/survival/free_survival_asset_kit.glb',
  /** Starter camp always has these building ids */
  starterBuildings: ['campfire', 'tent', 'workbench', 'camp'],
  benches: [
    { id: 'tent_stage_1', label: 'Tent Frame', node: 'tentHalf', stations: ['camp'] },
    { id: 'tent_stage_2', label: 'Closed Tent', node: 'tentClosed', stations: ['camp'] },
    { id: 'tent', label: 'Camp Tent', node: 'tent', stations: ['camp'] },
    { id: 'camp', label: 'Camp', node: 'tent', stations: ['camp'] },
    { id: 'campfire', label: 'Campfire', node: 'campfire', stations: ['camp', 'cooking'] },
    { id: 'cooking_bench', label: 'Cooking Bench', node: 'fishingStand', stations: ['cooking'] },
    { id: 'workbench', label: 'Workbench (hammer + note)', node: 'workbench', stations: ['camp', 'tinker'] },
    { id: 'grind_wheel', label: 'Sharpening Wheel', node: 'workbenchGrind', stations: ['smithing'] },
    { id: 'anvil', label: 'Anvil', node: 'workbenchAnvil', stations: ['smithing', 'tinker'] },
    { id: 'forge', label: 'Forge', node: 'workbenchAnvil', stations: ['smithing'] },
    { id: 'chest', label: 'Storage Chest', node: 'chest', stations: [] },
    { id: 'fence', label: 'Fence', node: 'fence', stations: [] },
    { id: 'floor', label: 'Floor', node: 'floor', stations: [] },
  ],
};

/** Canonical WCS stations â†’ profession + unlock keys + info.* icons */
const ASSET_CDN_ROOT = (typeof window !== 'undefined' && window.GRUDGE_CONFIG && window.GRUDGE_CONFIG.ASSETS)
  || 'https://assets.grudge-studio.com';
const INFO_CDN_ROOT = (typeof window !== 'undefined' && window.GRUDGE_CONFIG && window.GRUDGE_CONFIG.INFO_ORIGIN)
  || 'https://info.grudge-studio.com';
const WCS_STATIONS = [
  { id: 'camp',     name: 'Camp Bench',     icon: 'â›º', prof: 'All',      color: '#d4a843', always: true,
    iconUrl: INFO_CDN_ROOT + '/icons/pack/misc/Effect.png',
    bgUrl: INFO_CDN_ROOT + '/icons/pack/armor/Chest_01.png',
    unlockKeys: ['camp', 'campfire', 'tent', 'tent_stage', 'tenthalf', 'tentclosed', 'workbench', 'crafting bench', 'starter'],
    desc: 'T0 universal recipes — always at owned starter camp (tent + fire + workbench).' },
  { id: 'smithing', name: 'Smithing Table', icon: 'âš’ï¸', prof: 'Miner',     color: '#ef4444', always: false,
    iconUrl: INFO_CDN_ROOT + '/icons/skills/class/engineer/engineer_01.png',
    bgUrl: INFO_CDN_ROOT + '/icons/pack/weapons/Hammer_01.png',
    unlockKeys: ['smithing', 'forge', 'anvil', 'workbenchanvil', 'grind_wheel', 'workbenchgrind', 'smithy', 'smelter', 'sharpen'],
    desc: 'Miner station — anvil / forge / grind wheel (survival kit workbenchAnvil + workbenchGrind).' },
  { id: 'lumber',   name: 'Lumber Table',   icon: 'ðŸŒ²', prof: 'Forester',  color: '#22c55e', always: false,
    iconUrl: INFO_CDN_ROOT + '/icons/skills/class/hunter/hunter_01.png',
    bgUrl: INFO_CDN_ROOT + '/icons/pack/weapons/Axe_01.png',
    unlockKeys: ['lumber', 'sawmill', 'lumbermill', 'woodwork', 'carpentry', 'tanner', 'toolaxe'],
    desc: 'Forester station — bows, leather, planks (lumbermill / sawmill building).' },
  { id: 'loom',     name: 'Loom Table',     icon: 'ðŸ§µ', prof: 'Mystic',    color: '#a78bfa', always: false,
    iconUrl: INFO_CDN_ROOT + '/icons/skills/class/bloodmage/bloodmage_01.png',
    bgUrl: INFO_CDN_ROOT + '/icons/pack/weapons/Staff_01.png',
    unlockKeys: ['loom', 'spell_table', 'spelltable', 'enchanter', 'arcane table', 'tailor', 'structurecloth'],
    desc: 'Mystic station — cloth, staves, essence (spell table / loom).' },
  { id: 'cooking',  name: 'Cooking Table',  icon: 'ðŸ³', prof: 'Chef',      color: '#f59e0b', always: false,
    iconUrl: INFO_CDN_ROOT + '/icons/skills/class/firemage/firemage_01.png',
    bgUrl: INFO_CDN_ROOT + '/icons/pack/misc/Effect.png',
    unlockKeys: ['cooking', 'kitchen', 'campfire', 'cookfire', 'cooking_bench', 'cooking table', 'stove', 'hearth', 'fishingstand'],
    desc: 'Chef station — campfire or cooking bench (kit campfire + fishingStand). Starter always has campfire.' },
  { id: 'tinker',   name: 'Tinker Table',   icon: 'ðŸ”§', prof: 'Engineer',  color: '#60a5fa', always: false,
    iconUrl: INFO_CDN_ROOT + '/icons/pack/weapons/Crossbow_01.png',
    bgUrl: INFO_CDN_ROOT + '/icons/pack/weapons/Hammer_01.png',
    unlockKeys: ['tinker', 'tinker table', 'workshop', 'engineer', 'workbench', 'gunsmith', 'anvil', 'workbenchanvil'],
    desc: 'Engineer station — workbench (hammer+note) or anvil from survival kit.' },
];

const WCS_TIER_NAMES = { 0:'Broken',1:'Copper',2:'Iron',3:'Steel',4:'Mithril',5:'Adamantine',6:'Orichalcum',7:'Starmetal',8:'Divine' };
const WCS_MAT_TIERS = {
  0: { ingot:'Scrap Metal', plank:'Rotted Wood', cloth:'Torn Rag', leather:'Leather Scraps', gem:'Pebble' },
  1: { ingot:'Copper Ingot', plank:'Pine Plank', cloth:'Linen Cloth', leather:'Rawhide', gem:'Rough Gem' },
  2: { ingot:'Iron Ingot', plank:'Oak Plank', cloth:'Cotton Cloth', leather:'Thick Hide', gem:'Flawed Gem' },
  3: { ingot:'Steel Ingot', plank:'Maple Plank', cloth:'Wool Cloth', leather:'Rugged Leather', gem:'Standard Gem' },
  4: { ingot:'Mithril Ingot', plank:'Ash Plank', cloth:'Silk Cloth', leather:'Hardened Leather', gem:'Fine Gem' },
  5: { ingot:'Adamantine Ingot', plank:'Ironwood Plank', cloth:'Moonweave Cloth', leather:'Wyrm Leather', gem:'Pristine Gem' },
  6: { ingot:'Orichalcum Ingot', plank:'Ebony Plank', cloth:'Starweave Cloth', leather:'Infernal Leather', gem:'Flawless Gem' },
  7: { ingot:'Starmetal Ingot', plank:'Wyrmwood Plank', cloth:'Voidweave Cloth', leather:'Titan Leather', gem:'Radiant Gem' },
  8: { ingot:'Divine Ingot', plank:'Worldtree Plank', cloth:'Divine Cloth', leather:'Divine Leather', gem:'Divine Gem' },
};

const STATE = {
  user: null,
  grudgeToken: null,
  grudgeCharacters: [],
  activeCharacterId: null,
  currentPage: 'dashboard',
  acctTab: 'characters',
  // Per-character craft log
  characterCrafting: {},
  // Per-character professions + equipment + craft stats (NOT inventory)
  characterSheets: {},
  islandData: {},
  // Camps the player owns or is friendly with (benches unlock stations)
  camps: [],
  unlockedStations: { camp: true, cooking: true }, // campfire default
  activeStation: 'camp',
  selectedRecipe: null,
  filterTier: 'all',
  filterType: 'all',
  isCrafting: false,
  // Active character view of professions/equipment (swapped on select)
  professions: blankProfessions(),
  // ACCOUNT-SHARED inventory — one bag across all characters
  inventory: {
    'Wood Scraps': 20, 'Stone Fragments': 15, 'Plant Fiber': 25, 'Animal Hide': 8,
    'Animal Bone': 6, 'Raw Meat': 10, 'Wild Herbs': 12, 'Water': 20,
    'Junk Ore': 10, 'Scrap Metal': 5, 'Torn Rag': 15, 'Leather Scraps': 8,
    'Charcoal': 6, 'Rotted Wood': 18, 'Copper Ore': 8, 'Iron Ore': 4,
    'Pine Log': 10, 'Oak Log': 5, 'Arcane Dust': 3, 'Herb': 10,
  },
  equipment: blankEquipment(),
  log: [],
  stats: { totalCrafts: 0, itemsCrafted: 0, materialsUsed: 0, failedCrafts: 0 },
  gatherStreak: 0,
};

// ============================================================
// RECIPES DATABASE
// ============================================================
const RECIPES = [
  // === T0 UNIVERSAL ===
  { id:'parchment', n:'Parchment', prof:'All', type:'Refining', tier:0, icon:'ðŸ“œ', mats:{'Plant Fiber':3}, desc:'Thin writing surface' },
  { id:'simple-thread', n:'Simple Thread', prof:'All', type:'Refining', tier:0, icon:'ðŸ§µ', mats:{'Plant Fiber':5}, desc:'Basic thread spun from fibers' },
  { id:'ink', n:'Ink', prof:'All', type:'Refining', tier:0, icon:'ðŸ–‹ï¸', mats:{'Charcoal':1,'Water':1}, desc:'Dark writing fluid' },
  { id:'crude-bandage', n:'Crude Bandage', prof:'All', type:'Consumable', tier:0, icon:'ðŸ©¹', mats:{'Torn Rag':2}, desc:'Stops bleeding, +10 HP/10s' },
  { id:'simple-bandage', n:'Simple Bandage', prof:'All', type:'Consumable', tier:0, icon:'ðŸ©¹', mats:{'Simple Thread':2,'Herb':1}, desc:'+20 HP/10s' },
  { id:'minor-hp', n:'Minor Health Potion', prof:'All', type:'Consumable', tier:0, icon:'â¤ï¸', mats:{'Herb':2,'Water':1}, desc:'Restores 25 HP' },
  { id:'minor-mp', n:'Minor Mana Potion', prof:'All', type:'Consumable', tier:0, icon:'ðŸ’™', mats:{'Arcane Dust':1,'Water':2}, desc:'Restores 25 Mana' },
  { id:'wooden-club', n:'Wooden Club', prof:'All', type:'Weapon', tier:0, icon:'ðŸ', mats:{'Rotted Wood':3}, desc:'Crude bludgeon, 3 DMG' },
  { id:'stone-knife', n:'Stone Knife', prof:'All', type:'Weapon', tier:0, icon:'ðŸ”ª', mats:{'Stone Fragments':2,'Simple Thread':1}, desc:'Sharp stone dagger, 2 DMG' },
  { id:'makeshift-spear', n:'Makeshift Spear', prof:'All', type:'Weapon', tier:0, icon:'ðŸ—¡ï¸', mats:{'Rotted Wood':2,'Stone Fragments':1}, desc:'Pointed stick, 4 DMG' },
  { id:'wooden-sword', n:'Wooden Sword', prof:'All', type:'Weapon', tier:0, icon:'âš”ï¸', mats:{'Wood Scraps':3,'Plant Fiber':1}, desc:'Starter sword, 3 DMG' },
  { id:'tattered-shirt', n:'Tattered Shirt', prof:'All', type:'Armor', tier:0, icon:'ðŸ‘•', mats:{'Torn Rag':4,'Simple Thread':2}, desc:'+1 Defense' },
  { id:'ragged-pants', n:'Ragged Pants', prof:'All', type:'Armor', tier:0, icon:'ðŸ‘–', mats:{'Torn Rag':3,'Simple Thread':1}, desc:'+1 Defense' },
  { id:'scrap-helm', n:'Scrap Helm', prof:'All', type:'Armor', tier:0, icon:'â›‘ï¸', mats:{'Scrap Metal':2}, desc:'+1 Defense' },
  { id:'hand-wraps', n:'Hand Wraps', prof:'All', type:'Armor', tier:0, icon:'ðŸ§¤', mats:{'Torn Rag':2}, desc:'+1 Defense' },
  { id:'tent', n:'Tent', prof:'All', type:'Building', tier:0, icon:'â›º', mats:{'Rotted Wood':4,'Torn Rag':6,'Simple Thread':3}, desc:'Camp stage 3 — open tent (kit: tent). Unlocks Camp Bench.' },
  { id:'tent-half', n:'Tent Frame', prof:'All', type:'Building', tier:0, icon:'â›º', mats:{'Rotted Wood':3,'Torn Rag':3}, desc:'Camp stage 1 (kit: tentHalf)' },
  { id:'tent-closed', n:'Closed Tent', prof:'All', type:'Building', tier:0, icon:'â›º', mats:{'Rotted Wood':4,'Torn Rag':5,'Simple Thread':2}, desc:'Camp stage 2 (kit: tentClosed)' },
  { id:'campfire-b', n:'Campfire', prof:'All', type:'Building', tier:0, icon:'ðŸ”¥', mats:{'Stone Fragments':5,'Rotted Wood':3}, desc:'Fireplace (kit: campfire). Unlocks Cooking Table.' },
  { id:'cooking-bench-b', n:'Cooking Bench', prof:'Chef', type:'Building', tier:0, icon:'ðŸ³', mats:{'Rotted Wood':6,'Stone Fragments':2}, desc:'Cooking stand (kit: fishingStand)' },
  { id:'workbench-b', n:'Workbench', prof:'All', type:'Building', tier:0, icon:'ðŸ”¨', mats:{'Rotted Wood':8,'Scrap Metal':2}, desc:'Hammer + note table (kit: workbench). Unlocks Tinker.' },
  { id:'grind-wheel-b', n:'Sharpening Wheel', prof:'Miner', type:'Building', tier:0, icon:'âš™ï¸', mats:{'Stone Fragments':8,'Rotted Wood':4,'Scrap Metal':2}, desc:'Miner grind (kit: workbenchGrind). Unlocks Smithing.' },
  { id:'anvil-b', n:'Anvil', prof:'Engineer', type:'Building', tier:0, icon:'âš’ï¸', mats:{'Scrap Metal':10,'Stone Fragments':6}, desc:'Engineer anvil (kit: workbenchAnvil). Unlocks Smithing + Tinker.' },
  { id:'storage-chest', n:'Storage Chest', prof:'All', type:'Building', tier:0, icon:'ðŸ“¦', mats:{'Rotted Wood':5,'Scrap Metal':1}, desc:'Item storage (kit: chest)' },

  // === MINER T0 ===
  { id:'smelt-scrap', n:'Smelt Scrap Metal', prof:'Miner', type:'Refining', tier:0, icon:'ðŸ”©', mats:{'Junk Ore':3}, desc:'Salvage metal from junk' },
  { id:'broken-blade', n:'Broken Blade', prof:'Miner', type:'Weapon', tier:0, icon:'ðŸ—¡ï¸', mats:{'Scrap Metal':3,'Simple Thread':1}, desc:'Crude forged blade, 5 DMG' },
  { id:'rusty-mace', n:'Rusty Mace', prof:'Miner', type:'Weapon', tier:0, icon:'ðŸ”¨', mats:{'Scrap Metal':2,'Rotted Wood':1}, desc:'Heavy bludgeon, 6 DMG' },
  { id:'stone-hatchet', n:'Stone Hatchet', prof:'Miner', type:'Weapon', tier:0, icon:'ðŸª“', mats:{'Stone Fragments':2,'Wood Scraps':1,'Plant Fiber':1}, desc:'Stone axe, 5 DMG' },
  { id:'bone-sword', n:'Sharpened Bone Blade', prof:'Miner', type:'Weapon', tier:0, icon:'ðŸ¦´', mats:{'Animal Bone':2,'Plant Fiber':1}, desc:'Bone sword, 4 DMG' },

  // === MINER T1 ===
  { id:'copper-ingot', n:'Copper Ingot', prof:'Miner', type:'Refining', tier:1, icon:'ðŸŸ ', mats:{'Copper Ore':3}, desc:'Refined copper bar' },
  { id:'iron-ingot', n:'Iron Ingot', prof:'Miner', type:'Refining', tier:1, icon:'â¬œ', mats:{'Iron Ore':3}, desc:'Refined iron bar' },
  { id:'bloodfeud-blade', n:'Bloodfeud Blade', prof:'Miner', type:'Weapon', tier:1, icon:'âš”ï¸', mats:{'Copper Ingot':3,'Wooden Sword':1,'Simple Thread':2}, desc:'T1 Sword · 12 DMG · Bloodfeud set' },
  { id:'gorehowl', n:'Gorehowl', prof:'Miner', type:'Weapon', tier:1, icon:'ðŸª“', mats:{'Iron Ingot':2,'Stone Hatchet':1,'Animal Hide':1}, desc:'T1 Axe · 14 DMG · Gore set' },
  { id:'grudgehammer', n:'Grudgehammer', prof:'Miner', type:'Weapon', tier:1, icon:'ðŸ”¨', mats:{'Iron Ingot':3,'Rusty Mace':1}, desc:'T1 Hammer · 16 DMG' },
  { id:'bloodshiv', n:'Bloodshiv', prof:'Miner', type:'Weapon', tier:1, icon:'ðŸ—¡ï¸', mats:{'Copper Ingot':2,'Stone Knife':1}, desc:'T1 Dagger · 8 DMG · Fast' },
  { id:'iron-helm', n:'Iron Helm', prof:'Miner', type:'Armor', tier:1, icon:'â›‘ï¸', mats:{'Iron Ingot':2,'Scrap Helm':1}, desc:'+5 Def · Metal' },
  { id:'iron-chest', n:'Iron Chestplate', prof:'Miner', type:'Armor', tier:1, icon:'ðŸ›¡ï¸', mats:{'Iron Ingot':4,'Tattered Shirt':1}, desc:'+8 Def · Metal' },

  // === FORESTER T0 ===
  { id:'rough-plank', n:'Rough Plank', prof:'Forester', type:'Refining', tier:0, icon:'ðŸªµ', mats:{'Rotted Wood':2}, desc:'Crude wooden plank' },
  { id:'shortbow', n:'Shortbow', prof:'Forester', type:'Weapon', tier:0, icon:'ðŸ¹', mats:{'Wood Scraps':3,'Plant Fiber':2}, desc:'Basic bow, 4 DMG' },
  { id:'crude-leather', n:'Crude Leather', prof:'Forester', type:'Refining', tier:0, icon:'ðŸŸ¤', mats:{'Animal Hide':2}, desc:'Tanned hide piece' },
  { id:'leather-vest', n:'Leather Vest', prof:'Forester', type:'Armor', tier:0, icon:'ðŸ¦º', mats:{'Crude Leather':3,'Simple Thread':2}, desc:'+2 Def · Leather' },
  // === FORESTER T1 ===
  { id:'pine-plank', n:'Pine Plank', prof:'Forester', type:'Refining', tier:1, icon:'ðŸªµ', mats:{'Pine Log':2}, desc:'Refined pine wood' },
  { id:'oak-plank', n:'Oak Plank', prof:'Forester', type:'Refining', tier:1, icon:'ðŸªµ', mats:{'Oak Log':2}, desc:'Strong oak plank' },
  { id:'wraithbone-bow', n:'Wraithbone Bow', prof:'Forester', type:'Weapon', tier:1, icon:'ðŸ¹', mats:{'Pine Plank':2,'Shortbow':1,'Simple Thread':3}, desc:'T1 Bow · 11 DMG · Spectral' },
  { id:'hardened-leather', n:'Hardened Leather', prof:'Forester', type:'Refining', tier:1, icon:'ðŸŸ¤', mats:{'Crude Leather':2,'Pine Plank':1}, desc:'Treated leather' },
  { id:'leather-armor-t1', n:'Ranger Leathers', prof:'Forester', type:'Armor', tier:1, icon:'ðŸ¦º', mats:{'Hardened Leather':4,'Simple Thread':2}, desc:'+6 Def · +2 Agi' },

  // === MYSTIC T0 ===
  { id:'raw-essence', n:'Raw Essence', prof:'Mystic', type:'Refining', tier:0, icon:'âœ¨', mats:{'Arcane Dust':2,'Water':1}, desc:'Unrefined magical energy' },
  { id:'crude-staff', n:'Crude Staff', prof:'Mystic', type:'Weapon', tier:0, icon:'ðŸª„', mats:{'Rotted Wood':3,'Raw Essence':1}, desc:'Basic staff, 3 DMG + 5 SP' },
  { id:'linen-cloth', n:'Linen Cloth', prof:'Mystic', type:'Refining', tier:0, icon:'ðŸ§µ', mats:{'Plant Fiber':4}, desc:'Rough woven cloth' },
  { id:'acolyte-robe', n:'Acolyte Robe', prof:'Mystic', type:'Armor', tier:0, icon:'ðŸ‘˜', mats:{'Linen Cloth':3,'Simple Thread':2}, desc:'+1 Def · +3 SP' },
  // === MYSTIC T1 ===
  { id:'minor-essence', n:'Minor Essence', prof:'Mystic', type:'Refining', tier:1, icon:'âœ¨', mats:{'Raw Essence':3}, desc:'Concentrated magical energy' },
  { id:'emberwrath', n:'Emberwrath', prof:'Mystic', type:'Weapon', tier:1, icon:'ðŸ”¥', mats:{'Crude Staff':1,'Minor Essence':2,'Copper Ingot':1}, desc:'T1 Fire Staff · 10 DMG + 15 SP' },
  { id:'frostbite-staff', n:'Frostbite', prof:'Mystic', type:'Weapon', tier:1, icon:'â„ï¸', mats:{'Crude Staff':1,'Minor Essence':2,'Water':3}, desc:'T1 Frost Staff · 9 DMG + 18 SP' },
  { id:'silk-robe', n:'Mystic Silks', prof:'Mystic', type:'Armor', tier:1, icon:'ðŸ‘˜', mats:{'Linen Cloth':4,'Minor Essence':1,'Simple Thread':3}, desc:'+3 Def · +8 SP' },

  // === CHEF T0 ===
  { id:'charred-meat', n:'Charred Meat', prof:'Chef', type:'Consumable', tier:0, icon:'ðŸ¥©', mats:{'Raw Meat':1}, desc:'+15 HP · Basic food' },
  { id:'herb-soup', n:'Herb Soup', prof:'Chef', type:'Consumable', tier:0, icon:'ðŸ¥£', mats:{'Wild Herbs':2,'Water':2}, desc:'+20 HP · +5 MP' },
  { id:'trail-mix', n:'Trail Mix', prof:'Chef', type:'Consumable', tier:0, icon:'ðŸ¥œ', mats:{'Wild Herbs':1,'Plant Fiber':2}, desc:'+10 Stamina regen' },
  // === CHEF T1 ===
  { id:'seasoned-steak', n:'Seasoned Steak', prof:'Chef', type:'Consumable', tier:1, icon:'ðŸ¥©', mats:{'Raw Meat':2,'Wild Herbs':1,'Charred Meat':1}, desc:'+40 HP · +5 STR buff 5min' },
  { id:'mana-stew', n:'Mana Stew', prof:'Chef', type:'Consumable', tier:1, icon:'ðŸ¥˜', mats:{'Wild Herbs':3,'Water':2,'Arcane Dust':1}, desc:'+30 MP · +5 INT buff 5min' },
  { id:'hp-potion-t1', n:'Health Potion', prof:'Chef', type:'Consumable', tier:1, icon:'â¤ï¸', mats:{'Herb':3,'Water':2,'Minor Health Potion':1}, desc:'Restores 75 HP' },
  { id:'mp-potion-t1', n:'Mana Potion', prof:'Chef', type:'Consumable', tier:1, icon:'ðŸ’™', mats:{'Arcane Dust':2,'Water':3,'Minor Mana Potion':1}, desc:'Restores 75 MP' },

  // === ENGINEER T0 ===
  { id:'crude-parts', n:'Crude Mechanism', prof:'Engineer', type:'Refining', tier:0, icon:'âš™ï¸', mats:{'Scrap Metal':2,'Stone Fragments':1}, desc:'Basic mechanical parts' },
  { id:'slingshot', n:'Slingshot', prof:'Engineer', type:'Weapon', tier:0, icon:'ðŸŽ¯', mats:{'Wood Scraps':2,'Leather Scraps':2}, desc:'Ranged weapon, 3 DMG' },
  { id:'bear-trap', n:'Bear Trap', prof:'Engineer', type:'Utility', tier:0, icon:'ðŸª¤', mats:{'Scrap Metal':3,'Crude Mechanism':1}, desc:'Immobilize target 3s' },
  // === ENGINEER T1 ===
  { id:'gears', n:'Precision Gears', prof:'Engineer', type:'Refining', tier:1, icon:'âš™ï¸', mats:{'Copper Ingot':2,'Crude Mechanism':1}, desc:'Refined mechanical parts' },
  { id:'shadowflight', n:'Shadowflight Crossbow', prof:'Engineer', type:'Weapon', tier:1, icon:'ðŸ¹', mats:{'Pine Plank':2,'Precision Gears':2,'Slingshot':1}, desc:'T1 Crossbow · 13 DMG' },
  { id:'bloodcannon', n:'Bloodcannon', prof:'Engineer', type:'Weapon', tier:1, icon:'ðŸ”«', mats:{'Iron Ingot':3,'Precision Gears':2,'Crude Mechanism':1}, desc:'T1 Gun · 15 DMG · Slow' },
  { id:'spike-trap', n:'Spike Trap', prof:'Engineer', type:'Utility', tier:1, icon:'ðŸª¤', mats:{'Iron Ingot':2,'Precision Gears':1,'Bear Trap':1}, desc:'25 DMG + Bleed' },
];

// Map profession â†’ WCS station (canonical)
const PROF_TO_STATION = { All: 'camp', Miner: 'smithing', Forester: 'lumber', Mystic: 'loom', Chef: 'cooking', Engineer: 'tinker' };
// Attach station field to base recipes
RECIPES.forEach((r) => { if (!r.station) r.station = PROF_TO_STATION[r.prof] || 'camp'; });

// === WCS T2—T8 extended recipes (from Warlord Crafting Suite canon) ===
const WCS_EXTRA_RECIPES = [
  // Smithing refining T2—T4
  { id:'wcs-steel-ingot', n:'Steel Ingot', prof:'Miner', type:'Refining', tier:3, station:'smithing', icon:'â¬œ', mats:{'Iron Ingot':2,'Charcoal':2}, desc:'WCS T3 refined metal' },
  { id:'wcs-mithril-ingot', n:'Mithril Ingot', prof:'Miner', type:'Refining', tier:4, station:'smithing', icon:'ðŸ”·', mats:{'Steel Ingot':2,'Arcane Dust':1}, desc:'WCS T4 lightweight metal' },
  { id:'wcs-doomspire', n:'Doomspire', prof:'Miner', type:'Weapon', tier:5, station:'smithing', icon:'âš”ï¸', mats:{'Iron Ingot':8,'Hardened Leather':2}, desc:'WCS T5 greatsword' },
  { id:'wcs-metal-helm-t2', n:'Bloodfeud Helm (Metal)', prof:'Miner', type:'Armor', tier:2, station:'smithing', icon:'â›‘ï¸', mats:{'Iron Ingot':4,'Leather Scraps':2}, desc:'WCS T2 metal helm' },
  // Lumber
  { id:'wcs-maple-plank', n:'Maple Plank', prof:'Forester', type:'Refining', tier:3, station:'lumber', icon:'ðŸªµ', mats:{'Oak Log':3}, desc:'WCS T3 hardwood' },
  { id:'wcs-bloodstring-bow', n:'Bloodstring Bow', prof:'Forester', type:'Weapon', tier:3, station:'lumber', icon:'ðŸ¹', mats:{'Maple Plank':3,'Simple Thread':3,'Hardened Leather':1}, desc:'WCS T3 bow' },
  { id:'wcs-leather-helm-t2', n:'Bloodfeud Helm (Leather)', prof:'Forester', type:'Armor', tier:2, station:'lumber', icon:'ðŸª–', mats:{'Hardened Leather':3,'Pine Plank':1}, desc:'WCS T2 leather helm' },
  // Loom
  { id:'wcs-wool-cloth', n:'Wool Cloth', prof:'Mystic', type:'Refining', tier:2, station:'loom', icon:'ðŸ§¶', mats:{'Linen Cloth':2,'Minor Essence':1}, desc:'WCS T2 cloth' },
  { id:'wcs-silk-cloth', n:'Silk Cloth', prof:'Mystic', type:'Refining', tier:4, station:'loom', icon:'ðŸ§µ', mats:{'Wool Cloth':2,'Minor Essence':2}, desc:'WCS T4 silk' },
  { id:'wcs-emberwrath-t3', n:'Emberwrath Staff', prof:'Mystic', type:'Weapon', tier:3, station:'loom', icon:'ðŸ”¥', mats:{'Wool Cloth':2,'Oak Plank':2,'Minor Essence':3}, desc:'WCS T3 fire staff' },
  { id:'wcs-cloth-helm-t2', n:'Bloodfeud Helm (Cloth)', prof:'Mystic', type:'Armor', tier:2, station:'loom', icon:'ðŸ§¢', mats:{'Wool Cloth':3,'Minor Essence':1}, desc:'WCS T2 cloth helm' },
  // Cooking
  { id:'wcs-meat-stew', n:'Meat Stew', prof:'Chef', type:'Consumable', tier:2, station:'cooking', icon:'ðŸ¥£', mats:{'Raw Meat':2,'Wild Herbs':2,'Water':1}, desc:'WCS T2 food' },
  { id:'wcs-mana-brew', n:'Mana Brew', prof:'Chef', type:'Consumable', tier:3, station:'cooking', icon:'ðŸ§ª', mats:{'Wild Herbs':3,'Arcane Dust':1,'Water':2}, desc:'WCS T3 mana food' },
  { id:'wcs-stamina-elixir', n:'Stamina Elixir', prof:'Chef', type:'Consumable', tier:3, station:'cooking', icon:'âš¡', mats:{'Herb':4,'Wild Herbs':2,'Water':1}, desc:'WCS T3 utility' },
  // Tinker
  { id:'wcs-iron-gear', n:'Iron Gear', prof:'Engineer', type:'Refining', tier:2, station:'tinker', icon:'âš™ï¸', mats:{'Iron Ingot':2,'Crude Mechanism':1}, desc:'WCS T2 mechanism' },
  { id:'wcs-steel-crossbow', n:'Skullpiercer', prof:'Engineer', type:'Weapon', tier:3, station:'tinker', icon:'ðŸ¹', mats:{'Iron Gear':3,'Oak Plank':3,'Simple Thread':2}, desc:'WCS T3 crossbow' },
  { id:'wcs-blackpowder', n:'Blackpowder Blaster', prof:'Engineer', type:'Weapon', tier:3, station:'tinker', icon:'ðŸ”«', mats:{'Iron Gear':4,'Iron Ingot':2,'Charcoal':3}, desc:'WCS T3 gun' },
  { id:'wcs-auto-turret', n:'Auto-Turret', prof:'Engineer', type:'Utility', tier:4, station:'tinker', icon:'ðŸŽ¯', mats:{'Precision Gears':4,'Iron Ingot':6,'Crude Mechanism':2}, desc:'WCS T4 defense' },
];
// Merge (skip id collisions)
const _existingIds = new Set(RECIPES.map((r) => r.id));
WCS_EXTRA_RECIPES.forEach((r) => { if (!_existingIds.has(r.id)) RECIPES.push(r); });

// Map recipe output names to inventory items for crafting chains
const RECIPE_OUTPUT_MAP = {};
RECIPES.forEach(r => { RECIPE_OUTPUT_MAP[r.n] = r.id; });

// ============================================================
// MATERIAL ICONS
// ============================================================
const MAT_ICONS = {
  'Wood Scraps':'ðŸªµ','Stone Fragments':'ðŸª¨','Plant Fiber':'ðŸŒ¿','Animal Hide':'ðŸ¦Œ',
  'Animal Bone':'ðŸ¦´','Raw Meat':'ðŸ¥©','Wild Herbs':'ðŸŒ¿','Water':'ðŸ’§',
  'Junk Ore':'â›ï¸','Scrap Metal':'ðŸ”©','Torn Rag':'ðŸ§µ','Leather Scraps':'ðŸŸ¤',
  'Charcoal':'â¬›','Rotted Wood':'ðŸªµ','Copper Ore':'ðŸŸ ','Iron Ore':'â¬œ',
  'Pine Log':'ðŸŒ²','Oak Log':'ðŸŒ³','Arcane Dust':'âœ¨','Herb':'ðŸŒ¿',
  'Simple Thread':'ðŸ§µ','Crude Leather':'ðŸŸ¤','Raw Essence':'âœ¨','Linen Cloth':'ðŸ§¶',
  'Crude Mechanism':'âš™ï¸','Rough Plank':'ðŸªµ','Pine Plank':'ðŸªµ','Oak Plank':'ðŸªµ',
  'Copper Ingot':'ðŸŸ ','Iron Ingot':'â¬œ','Hardened Leather':'ðŸŸ¤',
  'Minor Essence':'ðŸ’«','Precision Gears':'âš™ï¸','Parchment':'ðŸ“œ','Ink':'ðŸ–‹ï¸',
};

// ============================================================
// ACCESS GATE — must be logged in + own character selected
// ============================================================
/** Characters owned by the current Grudge account (Railway roster). */
function getOwnedCharacters() {
  try {
    if (typeof GrudgeFleet !== 'undefined' && typeof GrudgeFleet.getCharacters === 'function') {
      const fleet = GrudgeFleet.getCharacters() || [];
      if (fleet.length) return fleet;
    }
  } catch { /* fleet optional during boot */ }
  return Array.isArray(STATE.grudgeCharacters) ? STATE.grudgeCharacters : [];
}

/**
 * Active character only if it belongs to this account's roster.
 * Stale IDs from other sessions do not count.
 */
function getActiveOwnedCharacterId() {
  const chars = getOwnedCharacters();
  if (!chars.length) return null;
  let id = STATE.activeCharacterId || null;
  try {
    if (!id && typeof GrudgeFleet !== 'undefined' && typeof GrudgeFleet.getActiveId === 'function') {
      id = GrudgeFleet.getActiveId();
    }
  } catch { /* ignore */ }
  if (!id) return null;
  const owned = chars.some((c) => String(c.id) === String(id));
  if (!owned) return null;
  if (String(STATE.activeCharacterId || '') !== String(id)) STATE.activeCharacterId = id;
  return id;
}

/**
 * True when Railway session + active owned character are ready for mutates
 * (craft / gather / bag sync). Browse mode never requires this.
 */
function isAccessReady() {
  try {
    if (typeof GrudgeFleet === 'undefined' || typeof GrudgeFleet.isLoggedIn !== 'function') return false;
    if (!GrudgeFleet.isLoggedIn()) return false;
    return !!getActiveOwnedCharacterId();
  } catch {
    return false;
  }
}

/**
 * Soft-gate mutates only (craft, gather, progress writes). Never locks navigation/browse.
 * @returns {boolean} true if access allowed
 */
function requireAccess(actionLabel) {
  if (isAccessReady()) return true;
  updateAccessGate();
  const label = actionLabel || 'craft';
  try {
    if (typeof GrudgeFleet === 'undefined' || !GrudgeFleet.isLoggedIn()) {
      showToast('Sign in with Grudge ID to ' + label, 'error');
    } else if (!getOwnedCharacters().length) {
      showToast('Create a Warlords character first, then return here', 'error');
    } else {
      showToast('Select a character on Account tab to ' + label, 'error');
      try { navigate('account'); } catch { /* ok */ }
    }
  } catch {
    showToast('Sign in and select a character to ' + label, 'error');
  }
  return false;
}

/**
 * Never blocks the suite. Updates soft banner + keeps body.access-ready always.
 * Character pick is optional (Account tab) until you craft.
 */
function updateAccessGate() {
  document.body.classList.add('access-ready');
  const gate = document.getElementById('access-gate');
  if (gate) {
    gate.classList.add('hidden');
    gate.setAttribute('aria-hidden', 'true');
  }

  const fleetReady = typeof GrudgeFleet !== 'undefined';
  const loggedIn = fleetReady && typeof GrudgeFleet.isLoggedIn === 'function' && GrudgeFleet.isLoggedIn();
  const chars = getOwnedCharacters();
  const activeId = getActiveOwnedCharacterId();

  if (chars.length && (!STATE.grudgeCharacters || STATE.grudgeCharacters.length !== chars.length)) {
    STATE.grudgeCharacters = chars;
  }
  if (activeId) STATE.activeCharacterId = activeId;

  const banner = document.getElementById('soft-auth-banner');
  const msg = document.getElementById('soft-auth-msg');
  if (!banner) return;

  if (loggedIn && activeId) {
    banner.classList.remove('show');
    return;
  }

  banner.classList.add('show');
  if (!fleetReady) {
    if (msg) msg.innerHTML = 'Loading fleet bridge… recipes still browseable.';
    return;
  }
  if (!loggedIn) {
    if (msg) {
      msg.innerHTML = 'Browse recipes freely. <strong>Sign in with Grudge ID</strong> when you want to craft (shared bag + per-character XP).';
    }
    return;
  }
  if (!chars.length) {
    if (msg) {
      msg.innerHTML = 'Signed in — no Warlords heroes on this account. <a href="https://character.grudge-studio.com?era=warlords" target="_blank" rel="noopener" style="color:var(--gold)">Create one</a>, or pick Account â†’ Switch account.';
    }
    return;
  }
  if (msg) {
    msg.innerHTML = 'Signed in — select a character on the <strong>Account</strong> tab to bind profession XP when you craft.';
  }
}

// ============================================================
// AUTH
// ============================================================
/**
 * Sign in via Grudge ID (canonical).
 * Redirects to id.grudge-studio.com â†’ returns with sso_token / grudge_token â†’
 * Railway JWT for the REAL Warlords account.
 * Do NOT use Puter-only bridge as primary login (empty puter:* roster).
 */
/** Build Grudge ID login URL that always returns here with sso_token. */
function buildCraftingLoginUrl(mode) {
  const gateway = (window.GRUDGE_CONFIG && GRUDGE_CONFIG.AUTH_GATEWAY) || 'https://id.grudge-studio.com';
  let ret = window.location.origin + window.location.pathname;
  try {
    const u = new URL(window.location.href);
    ['token','sso_token','jwt','access_token','grudge_token','launch_token','grudge_id','grudgeId','username','grudge_username'].forEach((k) => u.searchParams.delete(k));
    ret = u.origin + u.pathname + (u.search || '');
  } catch (e) {}
  const q = new URLSearchParams();
  q.set('redirect_uri', ret);
  q.set('redirect', ret);
  if (mode === 'register') q.set('mode', 'register');
  return gateway.replace(/\/$/, '') + '/login?' + q.toString();
}

async function doSignIn() {
  try {
    const hasToken =
      (typeof GrudgeFleet !== 'undefined' && GrudgeFleet.isLoggedIn && GrudgeFleet.isLoggedIn()) ||
      !!(localStorage.getItem('grudge_auth_token') || localStorage.getItem('grudge_session_token'));

    if (hasToken && typeof GrudgeFleet !== 'undefined') {
      try { if (typeof GrudgeFleet.syncFromBackend === 'function') await GrudgeFleet.syncFromBackend(); } catch (e) {}
      await fetchGrudgeCharacters();
      const chars = getOwnedCharacters();
      if (chars.length === 1 && !getActiveOwnedCharacterId()) {
        try { await selectCharacter(chars[0].id); } catch (e) { console.warn(e); }
      }
      updateAuthUI();
      updateAccessGate();
      if (chars.length > 0) {
        showToast('Signed in — ' + chars.length + ' hero' + (chars.length === 1 ? '' : 'es') + ' loaded', 'success');
        return;
      }
      if (confirm('This Grudge account has no Warlords heroes.\n\nOpen character create?')) {
        window.open('https://character.grudge-studio.com/?era=warlords&mode=create&returnTo=' + encodeURIComponent(window.location.href), '_blank', 'noopener');
      }
      return;
    }

    showToast('Redirecting to Grudge ID…', 'success');
    if (typeof GrudgeFleet !== 'undefined' && typeof GrudgeFleet.signIn === 'function') {
      try {
        await GrudgeFleet.signIn({ mode: 'grudge-id', returnUrl: window.location.origin + window.location.pathname });
        return;
      } catch (e) { console.warn('[doSignIn] fleet.signIn failed', e); }
    }
    window.location.href = buildCraftingLoginUrl();
  } catch (e) {
    console.error(e);
    showToast('Sign in failed — opening Grudge ID…', 'error');
    window.location.href = buildCraftingLoginUrl();
  }
}

/** Alias for older onclick handlers *//** Alias for older onclick handlers */
async function doAuth() {
  return doSignIn();
}

/** Create a new Grudge ID account, then return here. */
function doCreateAccount() {
  try {
    showToast('Opening create account…', 'success');
    if (typeof GrudgeFleet !== 'undefined' && typeof GrudgeFleet.createAccount === 'function') {
      try {
        GrudgeFleet.createAccount(window.location.origin + window.location.pathname);
        return;
      } catch (e) { console.warn(e); }
    }
    window.location.href = buildCraftingLoginUrl('register');
  } catch (e) {
    console.error(e);
    window.location.href = buildCraftingLoginUrl('register');
  }
}

/** Sign out current grudge_id/** Sign out current grudge_id and open login for a different account. */
async function doSwitchAccount() {
  try {
    if (typeof GrudgeFleet === 'undefined') {
      showToast('Fleet bridge not loaded', 'error');
      return;
    }
    if (!confirm('Switch Grudge account?\n\nYou will sign out of this account and open Grudge ID login.')) {
      return;
    }
    showToast('Switching account…', 'success');
    if (typeof GrudgeFleet.switchAccount === 'function') {
      await GrudgeFleet.switchAccount();
      return;
    }
    if (typeof GrudgeFleet.signOut === 'function') GrudgeFleet.signOut();
    await GrudgeFleet.signIn({ mode: 'grudge-id' });
  } catch (e) {
    console.error(e);
    showToast('Switch account failed: ' + (e.message || e), 'error');
  }
}

/** Clear JWT + local fleet identity; stay on crafting (gate shows sign-in). */
function doSignOut() {
  try {
    if (typeof GrudgeFleet !== 'undefined' && typeof GrudgeFleet.signOut === 'function') {
      GrudgeFleet.signOut();
    }
    STATE.activeCharacterId = null;
    STATE.grudgeCharacters = [];
    STATE.user = null;
    STATE.inventory = {};
    updateAuthUI();
    updateAccessGate();
    renderCharactersList();
    updateCharacterUI();
    showToast('Signed out — sign in with Grudge ID to continue', 'success');
  } catch (e) {
    console.error(e);
    showToast('Sign out failed', 'error');
  }
}

/**
 * Account-shared inventory from Railway Postgres (same account as characters).
 * Railway is SSOT — Puter KV is cache only and must not override a successful load.
 */
async function loadAccountInventory() {
  if (!GrudgeFleet.isLoggedIn()) return false;
  try {
    const getter = GrudgeFleet.getAccountInventory || GrudgeFleet.getInventory;
    if (typeof getter !== 'function') return false;
    const rows = await getter.call(GrudgeFleet, STATE.activeCharacterId);
    if (!Array.isArray(rows)) return false;
    const map = {};
    for (const row of rows) {
      const name = row.name || row.itemName || row.item_id || row.itemId || row.id;
      const qty = Number(row.qty ?? row.quantity ?? row.stack ?? 1);
      if (name && qty > 0) map[name] = (map[name] || 0) + qty;
    }
    // Always adopt Railway bag when signed in (empty bag is valid SSOT)
    STATE.inventory = map;
    STATE._inventoryFromRailway = true;
    updateSidebarBadges();
    // Refresh Puter cache from Railway so offline mirrors stay aligned
    try {
      if (STATE.user && typeof puter !== 'undefined' && puter.kv) {
        await puter.kv.set('grudge-account-inventory', JSON.stringify(STATE.inventory));
      }
    } catch { /* cache optional */ }
    return true;
  } catch (e) {
    console.warn('loadAccountInventory Railway failed — keeping cache:', e);
    return false;
  }
}
/** @deprecated name — inventory is account-shared */
async function loadCharacterInventory(_charId) {
  return loadAccountInventory();
}

function ensureCharSheet(charId) {
  if (!charId) return blankCharSheet();
  if (!STATE.characterSheets[charId]) STATE.characterSheets[charId] = blankCharSheet();
  return STATE.characterSheets[charId];
}

/** Stash full per-character progress into sheet keyed by Grudge UUID */
function stashActiveCharacterSheet() {
  const id = STATE.activeCharacterId;
  if (!id) return;
  const sheet = ensureCharSheet(id);
  sheet.characterId = id;
  sheet.professions = JSON.parse(JSON.stringify(STATE.professions));
  sheet.equipment = { ...STATE.equipment };
  sheet.stats = { ...STATE.stats };
  if (STATE._activeAttrs) sheet.attributes = { ...STATE._activeAttrs };
  if (STATE._activeSelectedSkills) sheet.selectedSkills = { ...STATE._activeSelectedSkills };
  if (STATE._activeWeaponMastery) sheet.weaponMastery = JSON.parse(JSON.stringify(STATE._activeWeaponMastery));
  if (STATE._activeProfNodes) sheet.professionSkillNodes = JSON.parse(JSON.stringify(STATE._activeProfNodes));
  if (STATE._skillPoints != null) sheet.skillPoints = STATE._skillPoints;
  if (STATE._unspentAttrs != null) sheet.unspentAttributePoints = STATE._unspentAttrs;
  if (STATE._weaponSkillLevel != null) sheet.weaponSkillLevel = STATE._weaponSkillLevel;
  if (STATE._charLevel != null) sheet.level = STATE._charLevel;
  if (STATE._grudgeCode) sheet.grudgeCode = STATE._grudgeCode;
}

/** Load full per-character progress (inventory stays shared) */
function loadCharacterSheet(charId) {
  if (!charId) return;
  const sheet = ensureCharSheet(charId);
  STATE.professions = JSON.parse(JSON.stringify(sheet.professions || blankProfessions()));
  STATE.equipment = { ...(sheet.equipment || blankEquipment()) };
  if (sheet.stats) STATE.stats = { ...sheet.stats };
  STATE._activeAttrs = { ...(sheet.attributes || blankAttributes()) };
  STATE._activeSelectedSkills = { ...(sheet.selectedSkills || {}) };
  STATE._activeWeaponMastery = JSON.parse(JSON.stringify(sheet.weaponMastery || { allocations: {}, sockets: {} }));
  STATE._activeProfNodes = JSON.parse(JSON.stringify(sheet.professionSkillNodes || blankCharSheet().professionSkillNodes));
  STATE._skillPoints = sheet.skillPoints ?? 1;
  STATE._unspentAttrs = sheet.unspentAttributePoints ?? 0;
  STATE._weaponSkillLevel = sheet.weaponSkillLevel ?? 1;
  STATE._charLevel = sheet.level ?? 1;
  STATE._grudgeCode = sheet.grudgeCode || null;
  // Auto-unlock profession nodes by level
  for (const [prof, nodes] of Object.entries(PROF_SKILL_TREES)) {
    const lvl = STATE.professions[prof]?.level || 1;
    const unlocked = new Set(STATE._activeProfNodes[prof] || []);
    nodes.forEach((n) => { if (lvl >= n.req) unlocked.add(n.id); });
    STATE._activeProfNodes[prof] = [...unlocked];
  }
  updateSidebarBadges();
}

async function refreshFleetState() {
  STATE.grudgeToken = GrudgeFleet.getToken();
  STATE.grudgeCharacters = GrudgeFleet.getCharacters();
  // Only adopt fleet active id when it is on this account's roster
  const fleetActive = GrudgeFleet.getActiveId();
  const roster = STATE.grudgeCharacters || [];
  const ownedActive = fleetActive && roster.some((c) => String(c.id) === String(fleetActive))
    ? fleetActive
    : null;
  STATE.activeCharacterId = ownedActive || (roster.some((c) => String(c.id) === String(STATE.activeCharacterId))
    ? STATE.activeCharacterId
    : null);
  if (STATE.activeCharacterId) {
    applyCharacterToState(GrudgeFleet.getActiveCharacter() || roster.find((c) => String(c.id) === String(STATE.activeCharacterId)));
  }
  // Puter guest cloud is optional — never call whoami when not signed in (401 spam)
  try {
    if (typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn && puter.auth.isSignedIn()) {
      STATE.user = await puter.auth.getUser();
    }
  } catch { /* puter optional */ }
  updateAuthUI();
  updateAccessGate();
  // 1) Puter KV = offline UI cache only (must not overwrite Railway bag / professions)
  await loadSaveData();
  // 2) Re-apply Railway character progress AFTER Puter cache (SSOT wins)
  const fleetChar = typeof GrudgeFleet !== 'undefined'
    ? (GrudgeFleet.getActiveCharacter?.() || null)
    : null;
  if (fleetChar && GrudgeFleet.isLoggedIn()) {
    applyCharacterToState(fleetChar);
  }
  // 3) Railway account bag + camps (same Postgres as Warlords)
  if (isAccessReady()) {
    await loadAccountInventory();
    await refreshCampsAndBenches();
  }
  renderCharactersList();
  updateCharacterUI();
  updateStationLockBadges();
  updateAccessGate();
}

async function checkAuth() {
  try {
    updateAccessGate();
    const embedded = window.parent !== window;
    // init picks up ?sso_token= (preferred) / ?grudge_token= and loads Railway JWT
    await GrudgeFleet.init({ mode: embedded ? 'embedded' : 'standalone' });
    // Restore existing JWT only — do NOT silent-mint puter guests (empty roster trap)
    if (!GrudgeFleet.isLoggedIn()) {
      await GrudgeFleet.ensureSession({ allowPuterGuest: false });
    }
    if (GrudgeFleet.isLoggedIn()) await GrudgeFleet.syncFromBackend();
    await refreshFleetState();
    const charsBoot = getOwnedCharacters();
    if (GrudgeFleet.isLoggedIn() && charsBoot.length === 1 && !getActiveOwnedCharacterId()) {
      try { await selectCharacter(charsBoot[0].id); } catch (e) { console.warn(e); }
    }
    updateAuthUI();
    // After SSO: only enter suite when an owned character is selected
    if (GrudgeFleet.isLoggedIn()) {
      if (typeof renderAll === 'function') renderAll();
      const n = (GrudgeFleet.getCharacters() || []).length;
      if (isAccessReady()) {
        try {
          if (typeof navigate === 'function') navigate('dashboard');
        } catch { /* panel optional */ }
        showToast('Ready — crafting as active character', 'success');
      } else if (n > 0) {
        showToast('Select a character to unlock crafting', 'error');
      } else {
        showToast('Signed in — no Warlords characters on this account yet', 'error');
      }
    }
    updateAccessGate();
    // Keep UI in sync when character changes (other tabs / VFX studio SSO)
    if (typeof GrudgeFleet.onCharacterChange === 'function') {
      GrudgeFleet.onCharacterChange(async (char) => {
        if (!char) {
          STATE.activeCharacterId = null;
          updateAccessGate();
          return;
        }
        // Only accept characters from this account's roster
        const owned = getOwnedCharacters().some((c) => String(c.id) === String(char.id));
        if (!owned) {
          updateAccessGate();
          return;
        }
        applyCharacterToState(char);
        // Inventory stays account-shared — do not swap bag
        renderCharactersList();
        updateCharacterUI();
        updateStationLockBadges();
        updateAccessGate();
        if (typeof renderInventoryPage === 'function') renderInventoryPage();
        if (typeof renderDashboard === 'function' && STATE.currentPage === 'dashboard') renderDashboard();
        if (STATE.currentPage === 'crafting') renderCraftingPage();
      });
    }
    window.addEventListener('grudge:auth:ready', () => {
      refreshFleetState().then(() => {
        if (typeof renderAll === 'function') renderAll();
        updateAccessGate();
      }).catch(() => {});
    });
    window.addEventListener('grudge:characters:loaded', () => {
      refreshFleetState().catch(() => {});
    });
    window.addEventListener('grudge:auth:mismatch', () => {
      showToast('Account mismatch — signed out. Sign in with the correct Grudge ID.', 'error');
      updateAuthUI();
      updateAccessGate();
    });
    window.addEventListener('grudge:auth:logout', () => {
      updateAuthUI();
      updateAccessGate();
    });
  } catch (e) {
    console.warn('Auth check:', e);
    updateAccessGate();
  }
}

function updateAuthUI() {
  const dot = document.getElementById('acctDot');
  const name = document.getElementById('acctName');
  const sub = document.getElementById('acctSub');
  const btn = document.getElementById('authBtn');
  const btnSignIn = document.getElementById('btnSignIn');
  const btnCreate = document.getElementById('btnCreateAccount');
  const btnSwitch = document.getElementById('btnSwitchAccount');
  const btnOut = document.getElementById('btnSignOut');
  const fleetUser = (typeof GrudgeFleet !== 'undefined' && GrudgeFleet.getUser) ? GrudgeFleet.getUser() : null;
  const gid = (typeof GrudgeFleet !== 'undefined' && GrudgeFleet.getGrudgeId)
    ? GrudgeFleet.getGrudgeId()
    : (fleetUser && fleetUser.grudgeId) || localStorage.getItem('grudge_id') || '';
  const displayName =
    (fleetUser && (fleetUser.username || fleetUser.displayName)) ||
    localStorage.getItem('grudge_username') ||
    (STATE.user && STATE.user.username) || '';
  const loggedIn =
    (typeof GrudgeFleet !== 'undefined' && GrudgeFleet.isLoggedIn && GrudgeFleet.isLoggedIn()) ||
    !!(localStorage.getItem('grudge_auth_token') || localStorage.getItem('grudge_session_token'));
  const chars = (typeof getOwnedCharacters === 'function') ? getOwnedCharacters() : [];
  const charCount = chars.length;
  const ready = typeof isAccessReady === 'function' ? isAccessReady() : false;
  const activeId = typeof getActiveOwnedCharacterId === 'function' ? getActiveOwnedCharacterId() : null;
  const activeChar = chars.find((x) => String(x.id) === String(activeId));
  if (typeof syncTopBar === 'function') {
    syncTopBar({ loggedIn: loggedIn, displayName: displayName, gid: gid, charCount: charCount, ready: ready, chars: chars, activeId: activeId, activeChar: activeChar });
  }
  if (loggedIn) {
    if (dot) dot.classList.add('on');
    if (name) name.textContent = displayName || (charCount ? 'Account' : 'Account (no chars)');
    if (sub) {
      sub.textContent = gid ? (gid.length > 18 ? gid.slice(0, 16) + '…' : gid) : (charCount + ' hero' + (charCount === 1 ? '' : 'es') + ' · era warlords');
      sub.title = gid || '';
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Switch';
      btn.title = 'Switch Grudge account';
      btn.onclick = function () { doSwitchAccount(); };
    }
    if (btnSignIn) btnSignIn.hidden = true;
    if (btnCreate) btnCreate.hidden = true;
    if (btnSwitch) btnSwitch.hidden = false;
    if (btnOut) btnOut.hidden = false;
  } else {
    if (dot) dot.classList.remove('on');
    if (name) name.textContent = 'Not signed in';
    if (sub) { sub.textContent = 'Grudge ID required'; sub.title = ''; }
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sign In';
      btn.title = 'Sign in with Grudge ID';
      btn.onclick = function () { doSignIn(); };
    }
    if (btnSignIn) btnSignIn.hidden = false;
    if (btnCreate) btnCreate.hidden = false;
    if (btnSwitch) btnSwitch.hidden = true;
    if (btnOut) btnOut.hidden = true;
  }
  updateAccessGate();
}

function syncTopBar(s) {
  const topDot = document.getElementById('topDot');
  const topName = document.getElementById('topAcctName');
  const topSub = document.getElementById('topAcctSub');
  const topScope = document.getElementById('topScope');
  const sel = document.getElementById('topCharSelect');
  const bIn = document.getElementById('topBtnSignIn');
  const bCreate = document.getElementById('topBtnCreate');
  const bSwitch = document.getElementById('topBtnSwitch');
  const bOut = document.getElementById('topBtnOut');
  if (topDot) topDot.classList.toggle('on', !!s.loggedIn);
  if (topName) topName.textContent = s.loggedIn ? (s.displayName || 'Grudge Account') : 'Not signed in';
  if (topSub) {
    if (!s.loggedIn) topSub.textContent = 'Sign in with Grudge ID to load heroes';
    else if (!s.charCount) topSub.textContent = (s.gid ? String(s.gid).slice(0, 20) + '… · ' : '') + 'No Warlords heroes yet';
    else if (s.activeChar) {
      topSub.textContent = (s.activeChar.name || 'Hero') + ' · ' +
        (s.activeChar.raceId || s.activeChar.race || '') + ' ' +
        (s.activeChar.classId || s.activeChar.class || '') +
        ' · bag SHARED · XP PER CHAR';
    } else {
      topSub.textContent = s.charCount + ' hero' + (s.charCount === 1 ? '' : 'es') + ' — select one to craft';
    }
    topSub.title = s.gid || '';
  }
  if (topScope) {
    if (s.ready) { topScope.textContent = 'READY'; topScope.className = 'topbar-scope ok'; }
    else if (s.loggedIn) { topScope.textContent = s.charCount ? 'PICK HERO' : 'NO HEROES'; topScope.className = 'topbar-scope'; }
    else { topScope.textContent = 'GUEST'; topScope.className = 'topbar-scope'; }
  }
  if (sel) {
    const prev = sel.value;
    sel.innerHTML = '';
    if (!s.loggedIn) {
      sel.disabled = true;
      sel.innerHTML = '<option value="">Sign in to load characters…</option>';
    } else if (!s.chars || !s.chars.length) {
      sel.disabled = true;
      sel.innerHTML = '<option value="">No Warlords characters — create one</option>';
    } else {
      sel.disabled = false;
      const opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = '— Select character —';
      sel.appendChild(opt0);
      for (let i = 0; i < s.chars.length; i++) {
        const ch = s.chars[i];
        const o = document.createElement('option');
        o.value = ch.id;
        const race = ch.raceId || ch.race || '';
        const cls = ch.classId || ch.class || '';
        o.textContent = (ch.name || 'Hero') + (race || cls ? (' (' + race + ' ' + cls + ')').trim() : '') + ' · Lv ' + (ch.level || 1);
        sel.appendChild(o);
      }
      const want = s.activeId || prev || '';
      if (want) {
        for (let j = 0; j < sel.options.length; j++) {
          if (sel.options[j].value === String(want)) { sel.value = String(want); break; }
        }
      }
    }
    if (!sel.dataset.bound) {
      sel.dataset.bound = '1';
      sel.addEventListener('change', function () {
        const id = sel.value;
        if (id) selectCharacter(id);
      });
    }
  }
  if (bIn) bIn.hidden = !!s.loggedIn;
  if (bCreate) bCreate.hidden = !!s.loggedIn;
  if (bSwitch) bSwitch.hidden = !s.loggedIn;
  if (bOut) bOut.hidden = !s.loggedIn;
}

function applyCharacterToState(char) {
  if (!char) return;
  const nextId = char.id || STATE.activeCharacterId;
  // Stash previous character's full sheet before switching
  if (STATE.activeCharacterId && String(STATE.activeCharacterId) !== String(nextId)) {
    stashActiveCharacterSheet();
  }
  STATE.activeCharacterId = nextId;
  loadCharacterSheet(nextId);

  // Railway professionLevels are SSOT for this character UUID (forceRemote).
  // Shared account bag is separate — never read char.inventory here.
  if (typeof GrudgeFleet.mergeProfessionsFromCharacter === 'function') {
    STATE.professions = GrudgeFleet.mergeProfessionsFromCharacter(
      char,
      blankProfessions(),
      { forceRemote: true },
    );
  }
  if (char.equipment && Object.keys(char.equipment).length) {
    const slotMap = { Helm:'head', Chest:'chest', Hands:'hands', Feet:'feet', Weapon:'weapon', MainHand:'weapon', Offhand:'shield' };
    for (const [k, v] of Object.entries(char.equipment)) {
      const slot = slotMap[k] || k.toLowerCase();
      if (STATE.equipment[slot] !== undefined && v) STATE.equipment[slot] = v;
    }
  }
  // Attributes / stats
  const attrs = char.attributes || char.stats || {};
  if (attrs && typeof attrs === 'object') {
    const base = blankAttributes();
    for (const k of Object.keys(base)) {
      const v = attrs[k] ?? attrs[k.charAt(0).toUpperCase() + k.slice(1)] ?? attrs[k.toUpperCase()];
      if (v != null) base[k] = Number(v) || 0;
    }
    // also accept Strength-style keys
    const map = { Strength:'strength', Vitality:'vitality', Endurance:'endurance', Intellect:'intellect', Wisdom:'wisdom', Dexterity:'dexterity', Agility:'agility', Tactics:'tactics' };
    for (const [K, k] of Object.entries(map)) if (attrs[K] != null) base[k] = Number(attrs[K]) || 0;
    STATE._activeAttrs = base;
  }
  if (char.selectedSkills) STATE._activeSelectedSkills = { ...char.selectedSkills };
  const mastery = (typeof GrudgeFleet.getWeaponMasteryFromCharacter === 'function'
    ? GrudgeFleet.getWeaponMasteryFromCharacter(char)
    : null) || char.weaponSkillSelections?.mastery;
  if (mastery) STATE._activeWeaponMastery = JSON.parse(JSON.stringify(mastery));
  if (char.weaponSkillLevel != null) STATE._weaponSkillLevel = char.weaponSkillLevel;
  if (char.skillPoints != null) STATE._skillPoints = char.skillPoints;
  if (char.unspentAttributePoints != null) STATE._unspentAttrs = char.unspentAttributePoints;
  if (char.level != null) STATE._charLevel = char.level;
  if (char.grudgeCode || char.grudgeDisplayId) STATE._grudgeCode = char.grudgeCode || char.grudgeDisplayId;
  // Profession tree nodes from professionLevels.*.unlockedNodes
  if (char.professionLevels) {
    for (const [key, val] of Object.entries(char.professionLevels)) {
      const label = { miner:'Miner', forester:'Forester', mystic:'Mystic', chef:'Chef', engineer:'Engineer' }[key] || key;
      if (val?.unlockedNodes && STATE._activeProfNodes[label]) {
        STATE._activeProfNodes[label] = [...new Set([...(STATE._activeProfNodes[label] || []), ...val.unlockedNodes])];
      }
    }
  }
  // NOTE: inventory is account-shared — never replace bag from character.inventory
  stashActiveCharacterSheet();
}

async function syncCharacterToBackend() {
  const id = STATE.activeCharacterId || GrudgeFleet.getActiveId();
  if (!GrudgeFleet.isLoggedIn()) return;
  stashActiveCharacterSheet();

  // Account-shared inventory
  try {
    if (typeof GrudgeFleet.saveAccountInventory === 'function') {
      await GrudgeFleet.saveAccountInventory(STATE.inventory);
    } else if (typeof GrudgeFleet.saveInventory === 'function') {
      await GrudgeFleet.saveInventory(id, STATE.inventory);
    }
  } catch (e) { console.warn('saveAccountInventory:', e); }

  // Full per-character progress bound to UUID
  if (!id) return;
  try {
    const pl = GrudgeFleet.professionsToPayload(STATE.professions);
    // attach unlockedNodes onto profession payload
    if (STATE._activeProfNodes) {
      for (const [label, nodes] of Object.entries(STATE._activeProfNodes)) {
        const key = label.toLowerCase();
        pl[key] = { ...(pl[key] || { level: 1, xp: 0 }), unlockedNodes: nodes };
      }
    }
    const payload = {
      schemaVersion: 1,
      expectedRevision: typeof GrudgeFleet.getProgressRevision === 'function'
        ? GrudgeFleet.getProgressRevision(id)
        : undefined,
      idempotencyKey: STATE._lastCraftIdempotencyKey || undefined,
      professionLevels: pl,
      equipment: STATE.equipment,
      attributes: STATE._activeAttrs || blankAttributes(),
      selectedSkills: STATE._activeSelectedSkills || {},
      classSkillPicks: STATE._activeSelectedSkills || {},
      weaponMastery: STATE._activeWeaponMastery || { allocations: {}, sockets: {} },
      weaponSkillLevel: STATE._weaponSkillLevel || 1,
      skillPoints: STATE._skillPoints ?? 1,
      unspentAttributePoints: STATE._unspentAttrs ?? 0,
      professionSkillNodes: STATE._activeProfNodes,
    };
    // one-shot craft key
    STATE._lastCraftIdempotencyKey = null;
    if (typeof GrudgeFleet.saveCharacterProgress === 'function') {
      await GrudgeFleet.saveCharacterProgress(id, payload);
    } else {
      await GrudgeFleet.saveCharacter(id, payload);
    }
  } catch (e) { console.warn('saveCharacterProgress:', e); }
}

// ============================================================
// PERSISTENCE (Puter KV)
// inventory = account; characterSheets = per-char XP/gear
// ============================================================
async function saveData() {
  try {
    stashActiveCharacterSheet();
    const data = {
      version: 5,
      inventory: STATE.inventory, // ACCOUNT shared
      characterSheets: STATE.characterSheets, // per-char professions + equipment
      characterCrafting: STATE.characterCrafting,
      unlockedStations: STATE.unlockedStations,
      camps: STATE.camps,
      activeCharacterId: STATE.activeCharacterId,
      activeStation: STATE.activeStation,
      log: STATE.log.slice(-50),
      // legacy fields for older loaders
      professions: STATE.professions,
      equipment: STATE.equipment,
      stats: STATE.stats,
    };
    if (STATE.user) await puter.kv.set('grudge-crafting-save', JSON.stringify(data));
    // Also store account bag under a dedicated key
    if (STATE.user) await puter.kv.set('grudge-account-inventory', JSON.stringify(STATE.inventory));
    await syncCharacterToBackend();
  } catch(e) { console.error('Save failed:', e); }
}

async function loadSaveData() {
  // Puter KV needs a Puter session; Railway JWT alone is enough for crafting SSOT
  const puterReady = typeof puter !== 'undefined' && puter.kv &&
    puter.auth && puter.auth.isSignedIn && puter.auth.isSignedIn();
  if (!puterReady && !STATE.user) return;
  try {
    // Puter KV = offline UI cache only. Never treat as inventory/profession SSOT when Railway session exists.
    const railwayLoggedIn = typeof GrudgeFleet !== 'undefined' && GrudgeFleet.isLoggedIn();

    if (!railwayLoggedIn) {
      try {
        const invRaw = await puter.kv.get('grudge-account-inventory');
        if (invRaw) {
          const inv = typeof invRaw === 'string' ? JSON.parse(invRaw) : invRaw;
          if (inv && typeof inv === 'object') STATE.inventory = inv;
        }
      } catch { /* ignore */ }
    }

    const raw = await puter.kv.get('grudge-crafting-save');
    if (raw) {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      // Only use Puter inventory cache when not signed into Railway account
      if (data.inventory && !railwayLoggedIn) STATE.inventory = data.inventory;

      // Soft-merge character sheets (cache) — do not clobber Railway-applied sheets
      if (data.characterSheets && typeof data.characterSheets === 'object') {
        for (const [id, sheet] of Object.entries(data.characterSheets)) {
          if (!STATE.characterSheets[id]) {
            STATE.characterSheets[id] = sheet;
          }
        }
      }
      if (data.characterCrafting) {
        STATE.characterCrafting = { ...data.characterCrafting, ...STATE.characterCrafting };
      }
      if (data.unlockedStations) STATE.unlockedStations = { ...STATE.unlockedStations, ...data.unlockedStations };
      if (data.camps && !railwayLoggedIn) STATE.camps = data.camps;
      if (data.activeStation) STATE.activeStation = data.activeStation;
      if (data.log) STATE.log = data.log;

      // Migrate legacy flat professions/equipment into active character sheet
      if (!data.characterSheets && data.professions && !railwayLoggedIn) {
        const id = STATE.activeCharacterId || 'legacy';
        ensureCharSheet(id);
        STATE.characterSheets[id].professions = data.professions;
        if (data.equipment) STATE.characterSheets[id].equipment = data.equipment;
        if (data.stats) STATE.characterSheets[id].stats = data.stats;
      }

      // CRITICAL: when Railway is logged in, never loadCharacterSheet from Puter
      // (that was overwriting per-character profession levels from Postgres).
      if (!railwayLoggedIn) {
        if (data.activeCharacterId) STATE.activeCharacterId = data.activeCharacterId;
        if (STATE.activeCharacterId) loadCharacterSheet(STATE.activeCharacterId);
        else if (data.professions) Object.assign(STATE.professions, data.professions);
      }

      renderAll();
      if (!railwayLoggedIn) showToast('Offline save loaded', 'success');
    }
  } catch(e) { console.error('Load failed:', e); }
}

// ============================================================
// NAVIGATION
// ============================================================
function navigate(page) {
  // Browse always allowed — no login gate on navigation
  STATE.currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  const btn = document.querySelector(`[data-page="${page}"]`);
  if (btn) btn.classList.add('active');
  renderCurrentPage();
}

document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.page));
});

// ============================================================
// RENDER FUNCTIONS
// ============================================================
function renderAll() {
  updateSidebarBadges();
  renderCurrentPage();
}

function renderCurrentPage() {
  const p = STATE.currentPage;
  if (p === 'dashboard') renderDashboard();
  else if (p === 'crafting') renderCraftingPage();
  else if (p === 'inventory') renderInventoryPage();
  else if (p === 'account') renderAccountPage();
  else if (p === 'item-database') renderItemDatabase();
  else if (p === 'camps') renderCampsPage();
  else if (p === 'wcs-arsenal') renderWcsArsenal();
  else if (p === 'wcs-materials') renderWcsMaterials();
  else if (p === 'char-progress') renderCharProgressPage();
  else if (p.startsWith('prof-')) renderProfessionPage(p.replace('prof-',''));
}

/** Open class skill tree with SSO token + character UUID */
function openCharacterSkillTree() {
  if (!requireAccess('open the skill tree')) return;
  const base = window.GRUDGE_CONFIG.SKILL_TREE_URL || './skill-tree.html';
  const url = (typeof GrudgeFleet !== 'undefined' && GrudgeFleet.buildSSOUrl)
    ? GrudgeFleet.buildSSOUrl(base, { characterId: STATE.activeCharacterId })
    : base + (STATE.activeCharacterId ? '?characterId=' + encodeURIComponent(STATE.activeCharacterId) : '');
  window.open(url, '_blank', 'noopener');
}
function openCharacterWeaponMastery() {
  if (!requireAccess('open weapon mastery')) return;
  const base = window.GRUDGE_CONFIG.WEAPON_MASTERY_URL || './weaponmastery.html';
  const url = (typeof GrudgeFleet !== 'undefined' && GrudgeFleet.buildSSOUrl)
    ? GrudgeFleet.buildSSOUrl(base, { characterId: STATE.activeCharacterId })
    : base + (STATE.activeCharacterId ? '?characterId=' + encodeURIComponent(STATE.activeCharacterId) : '');
  window.open(url, '_blank', 'noopener');
}

function masterySpentTotal(mastery) {
  if (!mastery?.allocations) return 0;
  return Object.values(mastery.allocations).reduce((sum, tree) => {
    if (!tree || typeof tree !== 'object') return sum;
    return sum + Object.values(tree).reduce((s, n) => s + (Number(n) || 0), 0);
  }, 0);
}

function renderCharProgressPage() {
  const el = document.getElementById('char-progress-body');
  if (!el) return;
  const id = STATE.activeCharacterId;
  const char = STATE.grudgeCharacters.find((c) => String(c.id) === String(id));
  if (!id) {
    el.innerHTML = `<div class="card"><p style="font-size:12px;color:var(--text-dim)">Select a character first. All skill trees, mastery, attributes, and equipment bind to that character's Grudge UUID.</p></div>`;
    return;
  }
  const attrs = STATE._activeAttrs || blankAttributes();
  const attrNames = Object.keys(attrs);
  const skills = STATE._activeSelectedSkills || {};
  const masteryPts = masterySpentTotal(STATE._activeWeaponMastery);
  const skillCount = Object.keys(skills).length;

  el.innerHTML = `
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">âš” ${char?.name || 'Character'}
        <span style="float:right;font-size:10px;color:var(--text-dim);font-family:Inter;font-weight:400">UUID ${String(id).slice(0, 13)}…</span>
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">
        ${char ? `${char.race || char.raceId || ''} ${char.class || char.classId || ''} · Lv ${STATE._charLevel || char.level || 1}` : ''}
        ${STATE._grudgeCode ? ` · <span style="color:var(--gold)">${STATE._grudgeCode}</span>` : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <span class="scope-pill character">Skill pts: ${STATE._skillPoints ?? 1}</span>
        <span class="scope-pill character">Unspent attrs: ${STATE._unspentAttrs ?? 0}</span>
        <span class="scope-pill character">Weapon skill lv: ${STATE._weaponSkillLevel ?? 1}</span>
        <span class="scope-pill character">Mastery spent: ${masteryPts}</span>
        <span class="scope-pill character">Class skills: ${skillCount}</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="filter-btn" onclick="openCharacterSkillTree()">ðŸŒ³ Class Skill Tree</button>
        <button class="filter-btn" onclick="openCharacterWeaponMastery()">âš” Weapon Mastery</button>
        <button class="filter-btn" onclick="hydrateActiveCharacterDetail()">ðŸ”„ Refresh from API</button>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="card-title">Attributes</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          ${attrNames.map((a) => `
            <div style="text-align:center;padding:10px 4px;background:rgba(0,0,0,.25);border:1px solid var(--border);border-radius:6px">
              <div style="font-family:'JetBrains Mono';font-size:18px;color:var(--gold)">${attrs[a] || 0}</div>
              <div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em">${a.slice(0, 3)}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Equipment <span class="scope-pill character">this char</span></div>
        <div id="progress-equip"></div>
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <div class="card-title">Profession Skill Trees</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
        ${Object.entries(STATE.professions).map(([name, p]) => {
          const nodes = PROF_SKILL_TREES[name] || [];
          const unlocked = new Set(STATE._activeProfNodes?.[name] || []);
          const nUnlock = nodes.filter((n) => unlocked.has(n.id)).length;
          return `<div class="codex-card" style="cursor:pointer" onclick="navigate('prof-${name.toLowerCase()}')">
            <h4 style="display:flex;align-items:center;gap:8px">${p.iconUrl ? `<img referrerpolicy="no-referrer" src="${p.iconUrl}" alt="" width="22" height="22" style="object-fit:contain;border-radius:4px">` : p.icon} ${name} · Lv ${p.level}</h4>
            <p>${nUnlock}/${nodes.length} nodes unlocked</p>
            <div class="prof-xp-bar" style="margin-top:6px"><div class="prof-xp-fill" style="width:${Math.min(100,(p.xp/p.xpNext)*100)}%;background:${p.color}"></div></div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <div class="card-title">Class Skill Picks</div>
      ${skillCount ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${Object.entries(skills).map(([t,s]) =>
        `<span class="scope-pill character">T${t}: ${Array.isArray(s) ? s.join(', ') : s}</span>`).join('')}</div>`
        : `<p style="font-size:11px;color:var(--text-dim)">No class skills selected yet. Open the Class Skill Tree to pick skills for this UUID.</p>`}
    </div>
  `;
  // equipment mini
  const slots = ['head','chest','hands','feet','weapon','shield','ring','necklace'];
  const eqEl = document.getElementById('progress-equip');
  if (eqEl) {
    eqEl.innerHTML = slots.map((s) => {
      const item = STATE.equipment[s];
      return `<div class="equip-slot"><span class="slot-label">${s}</span>${item ? `<span class="slot-item">${item}</span>` : `<span class="slot-empty">Empty</span>`}</div>`;
    }).join('');
  }
}

async function hydrateActiveCharacterDetail() {
  const id = STATE.activeCharacterId || GrudgeFleet.getActiveId();
  if (!id || !GrudgeFleet.isLoggedIn()) {
    showToast('Sign in and select a character', 'error');
    return;
  }
  try {
    const char = typeof GrudgeFleet.getCharacterDetail === 'function'
      ? await GrudgeFleet.getCharacterDetail(id)
      : null;
    if (char) {
      applyCharacterToState(char);
      showToast('Character progress loaded from API', 'success');
      renderCharProgressPage();
      updateCharacterUI();
    } else showToast('Could not load character detail', 'error');
  } catch (e) {
    console.warn(e);
    showToast('Load failed', 'error');
  }
}

function updateSidebarBadges() {
  document.querySelectorAll('.prof-lvl').forEach(el => {
    const prof = el.dataset.prof;
    if (STATE.professions[prof]) el.textContent = STATE.professions[prof].level;
  });
  const items = Object.values(STATE.inventory).reduce((a,b) => a+b, 0);
  document.getElementById('inv-count').textContent = items;
  updateCharacterUI();
}

// â”€â”€ Character UI helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CLASS_ICONS  = { warrior:'âš”ï¸', mage:'ðŸ”®', rogue:'ðŸ—¡ï¸', cleric:'âœ¨', worg:'ðŸº', ranger:'ðŸ¹' };
const RACE_COLORS  = { human:'#60a5fa', orc:'#22c55e', elf:'#a78bfa', dwarf:'#f59e0b', undead:'#8b5cf6', barbarian:'#ef4444', demon:'#dc2626' };

/** Updates the sidebar character panel and the dashboard banner. */
function updateCharacterUI() {
  const panel = document.getElementById('sidebar-char-panel');
  if (!panel) return;

  const char = STATE.grudgeCharacters.find(c => c.id === STATE.activeCharacterId);

  if (!char) {
    // No character selected — show a prompt to sign in or select
    if (STATE.grudgeCharacters.length > 0) {
      panel.style.display = 'block';
      panel.innerHTML = `<div class="char-none">âš” Pick your Warlord â†‘</div>`;
    } else if (STATE.user) {
      panel.style.display = 'block';
      panel.innerHTML = `<div class="char-none">Loading characters…</div>`;
    } else {
      panel.style.display = 'none';
    }
    return;
  }

  const classIcon  = CLASS_ICONS[char.class?.toLowerCase()]  || 'âš”ï¸';
  const raceColor  = RACE_COLORS[char.race?.toLowerCase()]   || 'var(--gold)';
  const lvl        = char.level || 1;
  // XP bar: use a rough 0-100% based on level progress if available
  const xpPct      = char.xp_percent ?? Math.min(100, ((lvl % 10) / 10) * 100);

  panel.style.display = 'block';
  panel.innerHTML = `
    <div class="char-panel-inner">
      <div class="char-avatar" style="border-color:${raceColor};box-shadow:0 0 8px ${raceColor}40">${classIcon}</div>
      <div class="char-info">
        <div class="char-name">${char.name}</div>
        <div class="char-sub">${char.race} ${char.class} · Lv ${lvl}</div>
        <div class="char-lvl-bar">
          <div class="char-lvl-fill" style="width:${xpPct}%;background:${raceColor}"></div>
        </div>
      </div>
    </div>`;
}

// === DASHBOARD ===
function renderDashboard() {
  // â”€â”€ Character banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const bannerEl = document.getElementById('dash-char-banner');
  if (bannerEl) {
    const char = STATE.grudgeCharacters.find(c => c.id === STATE.activeCharacterId);
    if (char) {
      const classIcon = CLASS_ICONS[char.class?.toLowerCase()] || 'âš”ï¸';
      const raceColor = RACE_COLORS[char.race?.toLowerCase()]   || 'var(--gold)';
      const stats     = char.stats || {};
      const attrMap   = [
        {k:'strength',a:'STR',col:'#e74c3c'}, {k:'vitality',a:'VIT',col:'#27ae60'},
        {k:'endurance',a:'END',col:'#95a5a6'},{k:'intellect',a:'INT',col:'#3498db'},
        {k:'wisdom',a:'WIS',col:'#9b59b6'},  {k:'dexterity',a:'DEX',col:'#f39c12'},
        {k:'agility',a:'AGI',col:'#1abc9c'}, {k:'tactics',a:'TAC',col:'#7f8c8d'},
      ];
      const attrHtml = attrMap.some(a => (stats[a.k] || 0) > 0)
        ? attrMap.map(a => `<span class="char-attr-mini" style="color:${a.col};border-color:${a.col}40">${a.a} ${stats[a.k] || 0}</span>`).join('')
        : '';
      bannerEl.innerHTML = `
        <div class="char-banner" onclick="navigate('account')">
          <div class="char-banner-avatar" style="border-color:${raceColor};box-shadow:0 0 16px ${raceColor}40">${classIcon}</div>
          <div class="char-banner-info">
            <div class="char-banner-name">${char.name}</div>
            <div class="char-banner-sub">${char.race} · ${char.class} · Level ${char.level || 1} · ${char.gold || 0} Gold</div>
            ${attrHtml ? `<div class="char-banner-attrs">${attrHtml}</div>` : ''}
          </div>
          <div style="flex-shrink:0;text-align:right">
            <div style="font-size:9px;color:var(--text-dim);margin-bottom:4px">Active Warlord</div>
            <a href="https://grudgewarlords.com" target="_blank" onclick="event.stopPropagation()"
               style="font-size:10px;color:var(--gold);text-decoration:none;border:1px solid var(--border);
                      padding:3px 8px;border-radius:4px;white-space:nowrap;display:block">ðŸŒ Warlords</a>
          </div>
        </div>`;
    } else if (STATE.user && STATE.grudgeCharacters.length === 0) {
      bannerEl.innerHTML = `
        <div class="char-banner" onclick="navigate('account')">
          <div class="char-banner-none">
            <span style="font-size:28px">âš”</span>
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--gold)">No character selected</div>
              <div style="font-size:11px;margin-top:2px">Connect your Grudge Warlords characters to personalize crafting</div>
            </div>
            <a href="https://grudgewarlords.com" target="_blank" onclick="event.stopPropagation()"
               style="margin-left:auto;font-size:10px;color:var(--gold);text-decoration:none;border:1px solid var(--border);
                      padding:4px 10px;border-radius:4px;white-space:nowrap">Open Warlords â†’</a>
          </div>
        </div>`;
    } else {
      bannerEl.innerHTML = '';
    }
  }

  const totalLvl = Object.values(STATE.professions).reduce((a,p) => a + p.level, 0);
  const totalItems = Object.values(STATE.inventory).reduce((a,b) => a+b, 0);
  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-card"><div class="stat-val">${STATE.stats.totalCrafts}</div><div class="stat-label">Total Crafts</div></div>
    <div class="stat-card"><div class="stat-val">${totalLvl}</div><div class="stat-label">Combined Level</div></div>
    <div class="stat-card"><div class="stat-val">${RECIPES.length}</div><div class="stat-label">Known Recipes</div></div>
    <div class="stat-card"><div class="stat-val">${totalItems}</div><div class="stat-label">Materials</div></div>
    <div class="stat-card"><div class="stat-val">${Object.keys(STATE.inventory).length}</div><div class="stat-label">Unique Items</div></div>
    <div class="stat-card"><div class="stat-val">${STATE.stats.materialsUsed}</div><div class="stat-label">Materials Used</div></div>
  `;
  document.getElementById('dash-professions').innerHTML = Object.entries(STATE.professions).map(([name, p]) => {
    const pct = Math.min(100, (p.xp / p.xpNext) * 100);
    const kind = p.iconUrl && /\/skills\//i.test(p.iconUrl) ? "skill" : "pack";
    const iconHtml = p.iconUrl
      ? `<img referrerpolicy="no-referrer" data-icon-kind="${kind}" src="${p.iconUrl}" alt="${name}" width="32" height="32" style="object-fit:${kind === "skill" ? "cover" : "contain"};object-position:center 18%;border-radius:6px;flex-shrink:0;background:rgba(0,0,0,.4);border:1px solid rgba(212,168,67,.25)" loading="lazy" decoding="async">`
      : `<span style="font-size:24px">${p.icon}</span>`;
    return `<div class="prof-card" onclick="navigate('prof-${name.toLowerCase()}')" style="margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:10px">
        ${iconHtml}
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${name}</div>
          <div style="font-size:10px;color:var(--text-dim)">${p.role}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'JetBrains Mono';font-size:12px;color:${p.color}">Lv ${p.level}</div>
          <div style="font-size:9px;color:var(--text-dim)">${p.xp}/${p.xpNext} XP</div>
        </div>
      </div>
      <div class="prof-xp-bar"><div class="prof-xp-fill" style="width:${pct}%;background:${p.color}"></div></div>
    </div>`;
  }).join('');
  renderLog('dash-log');
}

// === WCS STATION TABS + CRAFTING ===
function isStationUnlocked(stationId) {
  const st = WCS_STATIONS.find((s) => s.id === stationId);
  if (!st) return false;
  if (st.always) return true;
  return !!STATE.unlockedStations[stationId];
}

function openStation(stationId) {
  // Browse benches without login; craft still soft-gated
  if (!isStationUnlocked(stationId)) {
    showToast('Station locked — need a friendly/owned camp with this bench', 'error');
    navigate('camps');
    return;
  }
  STATE.activeStation = stationId;
  STATE.selectedRecipe = null;
  navigate('crafting');
}

function stationIconHtml(st, size) {
  if (st && st.iconUrl) {
    const s = size || 18;
    const kind = /\/skills\//i.test(st.iconUrl) ? "skill" : "pack";
    const fb =
      (typeof INFO_CDN !== "undefined" ? INFO_CDN : "https://info.grudge-studio.com") +
      "/icons/pack/misc/Effect.png";
    return `<img referrerpolicy="no-referrer" data-icon-kind="${kind}" src="${st.iconUrl}" alt="" width="${s}" height="${s}" loading="lazy" decoding="async" onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src='${fb}';this.dataset.iconKind='pack'}">`;
  }
  return st?.icon || "âš’";
}

function applyStationScene(st) {
  const page = document.getElementById('page-crafting');
  const scene = document.getElementById('station-scene');
  const iconEl = document.getElementById('station-scene-icon');
  const titleEl = document.getElementById('station-scene-title');
  const descEl = document.getElementById('station-scene-desc');
  if (!st) return;
  if (page) {
    page.style.setProperty('--station-glow', (st.color || '#d4a843') + '55');
  }
  if (scene) {
    if (st.bgUrl) scene.style.setProperty('--station-bg', `url("${st.bgUrl}")`);
    else scene.style.removeProperty('--station-bg');
  }
  if (iconEl) {
    iconEl.innerHTML = st.iconUrl
      ? `<img referrerpolicy="no-referrer" data-icon-kind="${/\/skills\//i.test(st.iconUrl) ? "skill" : "pack"}" src="${st.iconUrl}" alt="${st.name}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://assets.grudge-studio.com/icons/pack/misc/Effect.png';this.dataset.iconKind='pack'">`
      : (st.icon || "âš’");
  }
  if (titleEl) titleEl.textContent = st.name;
  if (descEl) descEl.textContent = st.desc || '';
}

function updateStationLockBadges() {
  WCS_STATIONS.forEach((st) => {
    const el = document.getElementById('lock-' + st.id);
    if (!el) return;
    const unlocked = isStationUnlocked(st.id);
    el.textContent = unlocked ? 'âœ“' : 'ðŸ”’';
    el.style.color = unlocked ? 'var(--green)' : 'var(--text-dim)';
  });
}

function renderStationTabs() {
  const el = document.getElementById('station-tabs');
  if (!el) return;
  el.innerHTML = WCS_STATIONS.map((st) => {
    const unlocked = isStationUnlocked(st.id);
    const active = STATE.activeStation === st.id;
    return `<button class="station-tab ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}"
      onclick="${unlocked ? `STATE.activeStation='${st.id}';STATE.selectedRecipe=null;renderCraftingPage()` : `showToast('Locked — unlock at Camps & Benches','error')`}"
      title="${st.desc}">
      <span class="st-icon">${stationIconHtml(st, 18)}</span>
      <span>${st.name}</span>
      ${unlocked ? '' : '<span class="lock">ðŸ”’</span>'}
    </button>`;
  }).join('');

  const hint = document.getElementById('station-hint');
  const st = WCS_STATIONS.find((s) => s.id === STATE.activeStation) || WCS_STATIONS[0];
  applyStationScene(st);
  const unlocked = isStationUnlocked(st.id);
  const char = STATE.grudgeCharacters.find((c) => c.id === STATE.activeCharacterId);
  if (hint) {
    hint.innerHTML = unlocked
      ? `<strong style="display:inline-flex;align-items:center;gap:6px">${stationIconHtml(st,16)} ${st.name}</strong> · ${st.desc}
         ${st.prof !== 'All' ? ` · XP goes to <strong>${st.prof}</strong>${char ? ` (${char.name})` : ''}` : ''}
         · <span class="scope-pill account">shared bag</span>`
      : `<strong>ðŸ”’ ${st.name} locked</strong> — unlock by owning or befriending a camp with this bench. <a href="#" onclick="navigate('camps');return false" style="color:var(--gold)">View camps</a>`;
  }
  updateStationLockBadges();
}

function renderCraftingPage() {
  // Ensure active station unlocked (fall back to camp)
  if (!isStationUnlocked(STATE.activeStation)) STATE.activeStation = 'camp';
  renderStationTabs();

  const st = WCS_STATIONS.find((s) => s.id === STATE.activeStation) || WCS_STATIONS[0];
  const stationRecipes = RECIPES.filter((r) => (r.station || PROF_TO_STATION[r.prof] || 'camp') === st.id);

  const filtered = stationRecipes.filter((r) => {
    if (STATE.filterTier !== 'all' && r.tier !== parseInt(STATE.filterTier)) return false;
    if (STATE.filterType !== 'all' && r.type.toLowerCase() !== STATE.filterType) return false;
    return true;
  });

  const tiers = [...new Set(stationRecipes.map((r) => r.tier))].sort((a, b) => a - b);
  document.getElementById('tier-filters').innerHTML =
    `<button class="filter-btn ${STATE.filterTier==='all'?'active':''}" onclick="STATE.filterTier='all';renderCraftingPage()">All Tiers</button>` +
    tiers.map((t) => `<button class="filter-btn ${STATE.filterTier==String(t)?'active':''}" onclick="STATE.filterTier='${t}';renderCraftingPage()">T${t} ${WCS_TIER_NAMES[t]||''}</button>`).join('');

  const types = [...new Set(stationRecipes.map((r) => r.type.toLowerCase()))];
  document.getElementById('type-filters').innerHTML =
    `<button class="filter-btn ${STATE.filterType==='all'?'active':''}" onclick="STATE.filterType='all';renderCraftingPage()">All Types</button>` +
    types.map((t) => `<button class="filter-btn ${STATE.filterType===t?'active':''}" onclick="STATE.filterType='${t}';renderCraftingPage()">${t[0].toUpperCase()+t.slice(1)}</button>`).join('');

  const locked = !isStationUnlocked(st.id);
  document.getElementById('recipe-list').innerHTML = locked
    ? `<div style="padding:24px;text-align:center;color:var(--text-dim)">ðŸ”’ Unlock <strong>${st.name}</strong> at a friendly or owned camp.</div>`
    : filtered.map((r) => {
      const canCraft = checkCanCraft(r);
      const sel = STATE.selectedRecipe && STATE.selectedRecipe.id === r.id;
      const tierColors = ['#666','#22c55e','#60a5fa','#a78bfa','#f59e0b','#ef4444','#ec4899','#f97316','#dc2626'];
      return `<div class="recipe-item ${sel?'selected':''} ${canCraft?'':'cant-craft'}" onclick="selectRecipe('${r.id}')">
        <span class="recipe-icon">${itemIcon(r.n, r.icon || 'ðŸ“¦', 'item-img', 28)}</span>
        <div class="recipe-info">
          <div class="recipe-name">${r.n}</div>
          <div class="recipe-meta">${r.prof} · ${r.type} · ${st.name}</div>
        </div>
        <span class="recipe-tier" style="color:${tierColors[r.tier]||'#888'};border-color:${(tierColors[r.tier]||'#888')}30">T${r.tier}</span>
      </div>`;
    }).join('') || '<div style="padding:20px;text-align:center;color:var(--text-dim)">No recipes match filters</div>';

  renderBenchDetail();
}

function selectRecipe(id) {
  STATE.selectedRecipe = RECIPES.find(r => r.id === id) || null;
  renderCraftingPage();
}

function renderBenchDetail() {
  const r = STATE.selectedRecipe;
  const el = document.getElementById('bench-detail');
  if (!r) {
    el.innerHTML = '<div class="card-title">Select a Recipe</div><p style="font-size:11px;color:var(--text-dim)">Choose a recipe from the list to begin crafting.</p>';
    return;
  }
  const canCraft = checkCanCraft(r);
  const mats = Object.entries(r.mats || {});
  const slotsHtml = mats.map(([name, qty]) => {
    const have = STATE.inventory[name] || 0;
    const enough = have >= qty;
    return `<div class="slot ${enough?'filled':'missing'}">
      <span>${itemIcon(name, MAT_ICONS[name]||'ðŸ“¦', 'item-img', 22)}</span>
      <span class="slot-qty ${enough?'enough':'short'}">${have}/${qty}</span>
      <span class="slot-name">${name}</span>
    </div>`;
  }).join('');
  // Pad empty slots
  const emptySlots = Math.max(0, 6 - mats.length);
  const emptySlotsHtml = Array(emptySlots).fill('<div class="slot"></div>').join('');

  el.innerHTML = `
    <div class="card-title" style="display:flex;align-items:center;gap:8px">${itemIcon(r.n, r.icon||'ðŸ“¦', 'item-img', 28)} ${r.n}</div>
    <p style="font-size:11px;color:var(--text-dim);margin-bottom:12px">${r.desc || ''}</p>
    <div style="font-size:9px;color:var(--text-dim);margin-bottom:6px;letter-spacing:0.1em">MATERIALS REQUIRED</div>
    <div class="bench-slots">${slotsHtml}${emptySlotsHtml}</div>
    <div class="craft-result">
      <span class="craft-arrow">â†’</span>
      <span class="result-icon">${itemIcon(r.n, r.icon||'ðŸ“¦', 'item-img', 36)}</span>
      <div>
        <div class="result-name">${r.n}</div>
        <div style="font-size:9px;color:var(--text-dim)">${r.prof} · T${r.tier} · ${r.type}</div>
      </div>
    </div>
    <button class="craft-btn" ${canCraft && !STATE.isCrafting ? '' : 'disabled'} onclick="craftItem('${r.id}')">
      ${STATE.isCrafting ? 'â³ Crafting...' : canCraft ? 'ðŸ”¨ Craft Item' : 'âŒ Missing Materials'}
    </button>
    <div class="craft-progress"><div class="craft-progress-fill" id="craft-bar"></div></div>
  `;
}

function checkCanCraft(recipe) {
  if (!recipe.mats) return true;
  return Object.entries(recipe.mats).every(([name, qty]) => (STATE.inventory[name] || 0) >= qty);
}

async function craftItem(id) {
  if (!requireAccess('craft')) return;
  const recipe = RECIPES.find(r => r.id === id);
  if (!recipe || !checkCanCraft(recipe) || STATE.isCrafting) return;
  const stId = recipe.station || PROF_TO_STATION[recipe.prof] || 'camp';
  if (!isStationUnlocked(stId)) {
    showToast('Station locked — visit a friendly/owned camp bench', 'error');
    return;
  }
  // XP always applies to the active owned character sheet
  const ownedId = getActiveOwnedCharacterId();
  if (!ownedId) {
    showToast('Select one of your characters before crafting', 'error');
    updateAccessGate();
    return;
  }
  STATE.activeCharacterId = ownedId;

  STATE.isCrafting = true;
  renderBenchDetail();

  // Animate progress bar
  const bar = document.getElementById('craft-bar');
  const duration = 1500;
  const start = Date.now();
  const animate = () => {
    const elapsed = Date.now() - start;
    const pct = Math.min(100, (elapsed / duration) * 100);
    if (bar) bar.style.width = pct + '%';
    if (pct < 100) requestAnimationFrame(animate);
    else finishCraft(recipe);
  };
  requestAnimationFrame(animate);
}

function finishCraft(recipe) {
  // Consume materials
  let matsUsed = 0;
  Object.entries(recipe.mats || {}).forEach(([name, qty]) => {
    STATE.inventory[name] = (STATE.inventory[name] || 0) - qty;
    if (STATE.inventory[name] <= 0) delete STATE.inventory[name];
    matsUsed += qty;
  });

  // Add result to inventory
  STATE.inventory[recipe.n] = (STATE.inventory[recipe.n] || 0) + 1;

  // XP & leveling
  const xpGain = 15 + recipe.tier * 10;
  const prof = recipe.prof === 'All' ? 'Miner' : recipe.prof; // Universal gives Miner XP by default
  if (STATE.professions[prof]) {
    STATE.professions[prof].xp += xpGain;
    STATE.professions[prof].totalCrafts++;
    // Level up check
    while (STATE.professions[prof].xp >= STATE.professions[prof].xpNext) {
      STATE.professions[prof].xp -= STATE.professions[prof].xpNext;
      STATE.professions[prof].level++;
      STATE.professions[prof].xpNext = Math.floor(STATE.professions[prof].xpNext * 1.5);
      // Unlock profession skill-tree nodes for this character UUID
      const tree = PROF_SKILL_TREES[prof] || [];
      if (!STATE._activeProfNodes) STATE._activeProfNodes = blankCharSheet().professionSkillNodes;
      if (!STATE._activeProfNodes[prof]) STATE._activeProfNodes[prof] = [];
      const set = new Set(STATE._activeProfNodes[prof]);
      tree.forEach((n) => { if (STATE.professions[prof].level >= n.req) set.add(n.id); });
      STATE._activeProfNodes[prof] = [...set];
      addLog(`ðŸŽ‰ ${prof} leveled up to ${STATE.professions[prof].level}!`, 'level');
      if (STATE.activeCharacterId) syncCharacterToBackend();
      // Full-screen level-up banner + floating XP pop
      showLevelUpBanner(
        prof,
        STATE.professions[prof].level,
        STATE.professions[prof].color,
        STATE.professions[prof].iconUrl || STATE.professions[prof].icon
      );
      spawnRewardPop([
        { text: `ðŸŽ‰ LEVEL UP!`, cls: 'lvl' },
        { text: `${prof} â†’ Lv ${STATE.professions[prof].level}`, cls: 'gold' },
      ]);
    }
  }

  // Stats
  STATE.stats.totalCrafts++;
  STATE.stats.itemsCrafted++;
  STATE.stats.materialsUsed += matsUsed;

  // Tag craft to active character for the Crafting Log sub-tab
  if (STATE.activeCharacterId) {
    if (!STATE.characterCrafting[STATE.activeCharacterId]) STATE.characterCrafting[STATE.activeCharacterId] = [];
    STATE.characterCrafting[STATE.activeCharacterId].unshift({
      item: recipe.n, icon: recipe.icon || 'ðŸ“¦',
      profession: prof, tier: recipe.tier, xp: xpGain,
      time: new Date().toISOString(),
    });
    // Cap per-character history to 200 entries
    if (STATE.characterCrafting[STATE.activeCharacterId].length > 200)
      STATE.characterCrafting[STATE.activeCharacterId].length = 200;
  }

  addLog(`ðŸ”¨ Crafted ${recipe.n} (+${xpGain} ${prof} XP)`, 'craft');
  stashActiveCharacterSheet(); // persist per-char XP/levels
  STATE.isCrafting = false;
  showToast(`Crafted ${recipe.icon} ${recipe.n}!`);
  updateSidebarBadges();
  renderCraftingPage();
  // Idempotent craft save key (prevents double-apply on retry)
  STATE._lastCraftIdempotencyKey = 'craft:' + (STATE.activeCharacterId || 'anon') + ':' + recipe.id + ':' + Date.now();
  saveData();
}

// === INVENTORY ===
function renderInventoryPage() {
  const items = Object.entries(STATE.inventory).sort((a,b) => b[1] - a[1]);

  document.getElementById('inv-filters').innerHTML =
    `<button class="filter-btn active" onclick="renderInvFiltered('all',this)">All (${items.length})</button>
     <button class="filter-btn" onclick="renderInvFiltered('material',this)">Materials</button>
     <button class="filter-btn" onclick="renderInvFiltered('crafted',this)">Crafted</button>`;

  // Ready-to-craft panel above the grid
  const readyEl = document.getElementById('inv-craft-ready');
  if (readyEl) {
    const { ready } = getCraftSuggestions(STATE.inventory);
    if (ready.length > 0) {
      readyEl.innerHTML = `
        <div style="margin-bottom:10px">
          <div style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;
                      color:var(--gold-dim);margin-bottom:8px;display:flex;align-items:center;gap:8px">
            âœ¨ READY TO CRAFT
            ${STATE.gatherStreak >= 3
              ? `<span class="streak-badge">ðŸ”¥ Streak Ã—${STATE.gatherStreak}</span>`
              : ''}
          </div>
          ${ready.slice(0,6).map(r => `
            <div class="craft-hint" onclick="navigate('crafting');selectRecipe('${r.id}');renderCraftingPage()">
              <span class="ch-icon">${itemIcon(r.n, r.icon||'ðŸ“¦', 'item-img', 28)}</span>
              <div class="ch-info">
                <div class="ch-name">${r.n}</div>
                <div class="ch-sub">${r.prof} · T${r.tier} · ${r.desc}</div>
              </div>
              <span class="ch-badge ready">âœ“ CRAFT NOW</span>
            </div>`).join('')}
        </div>`;
    } else {
      readyEl.innerHTML = '';
    }
  }

  renderInvItems(items);
}

function renderInvFiltered(type, btn) {
  document.querySelectorAll('#inv-filters .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  let items = Object.entries(STATE.inventory).sort((a,b) => b[1] - a[1]);
  if (type === 'crafted') items = items.filter(([n]) => RECIPES.some(r => r.n === n));
  else if (type === 'material') items = items.filter(([n]) => !RECIPES.some(r => r.n === n));
  renderInvItems(items);
}

function renderInvItems(items) {
  document.getElementById('inv-grid').innerHTML = items.map(([name, qty]) => {
    const emoji = MAT_ICONS[name] || (RECIPES.find(r=>r.n===name)?.icon) || 'ðŸ“¦';
    return `<div class="inv-item">
      <span class="icon">${itemIcon(name, emoji, 'item-img', 24)}</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span>
      <span class="qty">Ã—${qty}</span>
    </div>`;
  }).join('') || '<div style="padding:20px;text-align:center;color:var(--text-dim)">Inventory is empty</div>';
}

// ============================================================
// REWARD UX: level-up banner, floating pops, craft suggestions
// ============================================================

/**
 * Show the full-screen level-up overlay with confetti.
 */
function showLevelUpBanner(profName, level, color, icon) {
  const overlay = document.getElementById('lvl-overlay');
  if (!overlay) return;

  const badge = document.getElementById('lvl-badge');
  const iconVal = icon || STATE.professions[profName]?.iconUrl || PROF_ICON_URLS[profName] || 'âš’ï¸';
  if (badge) {
    if (typeof iconVal === 'string' && (iconVal.startsWith('http') || iconVal.startsWith('/'))) {
      const src = iconVal.startsWith('http') ? iconVal : (INFO_CDN + iconVal);
      badge.innerHTML = `<img referrerpolicy="no-referrer" src="${src}" alt="${profName}" style="width:64px;height:64px;object-fit:contain">`;
    } else {
      badge.textContent = iconVal;
    }
  }
  document.getElementById('lvl-prof').textContent   = profName;
  document.getElementById('lvl-prof').style.color   = color;
  document.getElementById('lvl-number').textContent = level;
  document.getElementById('lvl-number').style.textShadow = `0 0 50px ${color}, 0 0 20px ${color}50`;

  // Profession-specific level desc
  const descs = {
    Miner:'New ore veins unlocked. Forge stronger weapons.',
    Forester:'Deeper timber and better leather await.',
    Mystic:'Arcane energies bend to your will.',
    Chef:'Richer recipes and mightier buffs unlocked.',
    Engineer:'Advanced mechanisms are now within reach.',
  };
  document.getElementById('lvl-desc').textContent = descs[profName] || 'New crafting recipes unlocked!';

  // Confetti burst
  const confettiEl = document.getElementById('lvl-confetti');
  confettiEl.innerHTML = '';
  const colors = [color, '#f0c040', '#ffffff', '#22c55e', '#60a5fa', '#a78bfa'];
  for (let i = 0; i < 22; i++) {
    const dot = document.createElement('div');
    dot.className = 'confetti-dot';
    dot.style.cssText = [
      `left:${5 + Math.random() * 90}%`,
      `top:${10 + Math.random() * 60}%`,
      `background:${colors[i % colors.length]}`,
      `animation-delay:${Math.random() * 0.4}s`,
      `animation-duration:${0.8 + Math.random() * 0.7}s`,
      `width:${4 + Math.random() * 6}px`,
      `height:${4 + Math.random() * 6}px`,
    ].join(';');
    confettiEl.appendChild(dot);
  }

  // Restart animation
  overlay.classList.remove('show');
  void overlay.offsetWidth; // reflow
  overlay.classList.add('show');

  // Auto-dismiss after 2.8s
  setTimeout(() => overlay.classList.remove('show'), 2800);
}

/**
 * Spawn a floating reward popup at the center-bottom of the screen.
 * items: array of { text, cls } where cls is 'gold'|'green'|'blue'|'lvl'
 */
function spawnRewardPop(items) {
  const pop = document.createElement('div');
  pop.className = 'reward-popup';
  // Position roughly center of viewport, slightly above bottom
  const vx = window.innerWidth  * 0.5;
  const vy = window.innerHeight * 0.65;
  pop.style.left = (vx - 60) + 'px';
  pop.style.top  = vy + 'px';
  items.forEach(({ text, cls }) => {
    const line = document.createElement('div');
    line.className = 'reward-line ' + (cls || 'green');
    line.textContent = text;
    pop.appendChild(line);
  });
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 1900);
}

/**
 * Compute craft suggestions from a given inventory map.
 * Returns { ready: Recipe[], almost: Recipe[] } — ready = all mats present;
 * almost = missing at most 1 unique material type.
 */
function getCraftSuggestions(inv) {
  const ready = [], almost = [];
  for (const r of RECIPES) {
    if (!r.mats) continue;
    const mats = Object.entries(r.mats);
    const missingMats = mats.filter(([n, q]) => (inv[n] || 0) < q);
    if (missingMats.length === 0) {
      ready.push(r);
    } else if (missingMats.length === 1) {
      const [n, need] = missingMats[0];
      const have = inv[n] || 0;
      // Only "almost" if at least 50% of that one material is in stock
      if (have >= need * 0.5) almost.push(r);
    }
  }
  return { ready: ready.slice(0, 8), almost: almost.slice(0, 6) };
}

/**
 * Render craft suggestion cards into a DOM element by id.
 * source: 'inventory' | 'island'
 */
function renderCraftSuggestionsPanel(elId, inv, source) {
  const el = document.getElementById(elId);
  if (!el) return;
  const { ready, almost } = getCraftSuggestions(inv);

  if (ready.length === 0 && almost.length === 0) {
    el.innerHTML = `<div style="font-size:11px;color:var(--text-dim);padding:4px">
      Gather more materials to unlock crafting suggestions.
    </div>`;
    return;
  }

  const cards = [
    ...ready.map(r => ({
      r, badge: 'ready', label: 'âœ“ READY',
      sub: r.prof + ' · T' + r.tier + ' · ' + r.type + ' · ' + r.desc,
    })),
    ...almost.map(r => {
      const missMat = Object.entries(r.mats).find(([n,q]) => (inv[n]||0) < q);
      const stillNeed = missMat ? `${r.mats[missMat[0]] - (inv[missMat[0]]||0)}Ã— ${missMat[0]}` : '';
      return { r, badge: 'almost', label: `â‰ˆ ALMOST (+${stillNeed})`,
        sub: r.prof + ' · T' + r.tier + ' · ' + r.desc };
    }),
  ];

  el.innerHTML = cards.map(({ r, badge, label, sub }) =>
    `<div class="craft-hint ${badge === 'ready' ? 'new-unlock' : ''}" onclick="navigate('crafting');selectRecipe('${r.id}');renderCraftingPage()">
      <span class="ch-icon">${r.icon || '\ud83d\udce6'}</span>
      <div class="ch-info">
        <div class="ch-name">${r.n}</div>
        <div class="ch-sub">${sub}</div>
      </div>
      <span class="ch-badge ${badge}">${label}</span>
    </div>`
  ).join('');
}

/**
 * Render material-progress bars toward the nearest recipe needing each mat.
 * Renders into `elId`.
 */
function renderMatProgressBars(elId, inv) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!inv || Object.keys(inv).length === 0) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text-dim)">No resources stockpiled yet.</div>';
    return;
  }

  // For each material in inv, find the maximum required qty across recipes
  const rows = Object.entries(inv)
    .map(([mat, have]) => {
      const maxNeeded = RECIPES.reduce((mx, r) => {
        return Math.max(mx, r.mats?.[mat] || 0);
      }, 0);
      return { mat, have, need: maxNeeded || have };
    })
    .sort((a, b) => (b.have / b.need) - (a.have / a.need))
    .slice(0, 16);

  if (rows.length === 0) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text-dim)">No resources.</div>';
    return;
  }

  el.innerHTML = rows.map(({ mat, have, need }) => {
    const pct = Math.min(100, Math.round((have / need) * 100));
    const color = pct >= 100 ? 'var(--green)' : pct >= 50 ? 'var(--gold)' : 'var(--orange)';
    return `<div class="mat-prog-row">
      <span class="mat-prog-icon">${MAT_ICONS[mat] || '\ud83d\udce6'}</span>
      <span class="mat-prog-name">${mat}</span>
      <div class="mat-prog-wrap"><div class="mat-prog-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="mat-prog-qty" style="color:${pct>=100?'var(--green)':'var(--gold)'}">Ã—${have}</span>
    </div>`;
  }).join('');
}

// ============================================================
// ENHANCED GATHER MATERIALS
// ============================================================
function gatherMaterials() {
  if (!requireAccess('gather materials')) return;
  const gatherables = [
    'Wood Scraps','Stone Fragments','Plant Fiber','Animal Hide','Animal Bone',
    'Raw Meat','Wild Herbs','Water','Junk Ore','Torn Rag','Leather Scraps',
    'Charcoal','Rotted Wood','Herb','Copper Ore','Pine Log','Arcane Dust'
  ];

  // Bonus rolls every 3rd consecutive gather (streak system)
  STATE.gatherStreak = (STATE.gatherStreak || 0) + 1;
  const bonusRolls = Math.floor(STATE.gatherStreak / 3);
  const count = 3 + Math.floor(Math.random() * 5) + bonusRolls;

  const gathered = [];
  const newlyUnlocked = []; // recipes just-become-craftable this gather

  // Snapshot crafting state before gather to detect newly unlocked recipes
  const preReady = new Set(RECIPES.filter(r => checkCanCraft(r)).map(r => r.id));

  for (let i = 0; i < count; i++) {
    const mat = gatherables[Math.floor(Math.random() * gatherables.length)];
    const qty = 1 + Math.floor(Math.random() * 3);
    STATE.inventory[mat] = (STATE.inventory[mat] || 0) + qty;
    gathered.push({ mat, qty, icon: MAT_ICONS[mat] || '\ud83d\udce6' });
  }

  // Detect newly-craftable recipes after gather
  RECIPES.forEach(r => {
    if (!preReady.has(r.id) && checkCanCraft(r)) newlyUnlocked.push(r);
  });

  // Log
  const logStr = gathered.map(g => `${g.qty}Ã— ${g.mat}`).join(', ');
  addLog(`ðŸŒ¿ Gathered: ${logStr}${bonusRolls ? ' (+bonus roll!)' : ''}`, 'craft');

  // --- Floating reward pop ---
  const popItems = gathered.slice(0, 5).map(g => ({
    text: `+${g.qty}  ${g.icon} ${g.mat}`,
    cls: 'green',
  }));
  if (gathered.length > 5) popItems.push({ text: `+${gathered.length - 5} more…`, cls: 'gold' });
  if (newlyUnlocked.length > 0) {
    popItems.push({ text: `âœ¨ ${newlyUnlocked.length} recipe${newlyUnlocked.length > 1 ? 's' : ''} ready!`, cls: 'lvl' });
  }
  if (bonusRolls > 0) {
    popItems.unshift({ text: `ðŸ”¥ Streak x${STATE.gatherStreak} — bonus items!`, cls: 'gold' });
  }
  spawnRewardPop(popItems);

  // --- Streak badge in log area ---
  if (STATE.gatherStreak >= 3) {
    showToast(`ðŸ”¥ Gather streak ${STATE.gatherStreak}! Bonus loot added.`, 'success');
  } else {
    showToast(`Gathered ${count} items!`, 'success');
  }

  updateSidebarBadges();
  renderInventoryPage();
  saveData();

  // --- Newly-unlocked recipe toast with small delay ---
  if (newlyUnlocked.length > 0) {
    setTimeout(() => {
      showToast(`âœ¨ ${newlyUnlocked[0].n} is now craftable!`, 'success');
    }, 600);
  }
}

// === GRUDGE WARLORDS API (via GrudgeFleet â†’ Railway Postgres) ===
async function fetchGrudgeCharacters() {
  if (!GrudgeFleet.isLoggedIn()) {
    updateAccessGate();
    return;
  }
  await GrudgeFleet.syncFromBackend();
  STATE.grudgeToken = GrudgeFleet.getToken();
  STATE.grudgeCharacters = GrudgeFleet.getCharacters() || [];
  const fleetActive = GrudgeFleet.getActiveId();
  const ownedActive = fleetActive && STATE.grudgeCharacters.some((c) => String(c.id) === String(fleetActive))
    ? fleetActive
    : getActiveOwnedCharacterId();
  STATE.activeCharacterId = ownedActive;
  if (STATE.activeCharacterId) {
    applyCharacterToState(GrudgeFleet.getActiveCharacter()
      || STATE.grudgeCharacters.find((c) => String(c.id) === String(STATE.activeCharacterId)));
  }
  try { if (isAccessReady()) await loadAccountInventory(); } catch {}
  updateAuthUI();
  updateAccessGate();
  renderCharactersList();
  updateCharacterUI();
  if (isAccessReady()) renderAll();
  if (STATE.grudgeCharacters.length) {
    if (isAccessReady()) {
      showToast('Loaded ' + STATE.grudgeCharacters.length + ' characters from Railway', 'success');
    } else {
      showToast('Loaded ' + STATE.grudgeCharacters.length + ' characters — select one to continue', 'success');
    }
  }
}

/**
 * Refresh roster from Railway, or send user to Grudge ID if no real session.
 * "Refresh" with an empty puter:* guest must NOT spin forever — re-auth.
 */
async function loginToGrudge() {
  try {
    if (GrudgeFleet.isLoggedIn()) {
      await fetchGrudgeCharacters();
      if (STATE.grudgeCharacters.length === 0) {
        showToast('No characters on this account — sign in with your Warlords Grudge ID', 'error');
        // Offer re-login after a beat so user sees the toast
        setTimeout(() => {
          if (confirm('This session has no Warlords characters.\n\nSign in with Grudge ID to load your real roster?')) {
            if (typeof GrudgeFleet.signOut === 'function') GrudgeFleet.signOut();
            GrudgeFleet.signIn({ mode: 'grudge-id' });
          }
        }, 200);
      }
      return;
    }
    await GrudgeFleet.signIn({ mode: 'grudge-id' });
  } catch (e) {
    console.warn('Fleet auth failed:', e);
    showToast('Could not load characters', 'error');
  }
}

async function selectCharacter(charId) {
  if (typeof GrudgeFleet === 'undefined' || !GrudgeFleet.isLoggedIn()) {
    showToast('Sign in with Grudge ID first', 'error');
    updateAccessGate();
    return;
  }
  // Must belong to this account's Railway roster
  const roster = getOwnedCharacters();
  const owned = roster.find((x) => String(x.id) === String(charId));
  if (!owned) {
    showToast('That character is not on your account', 'error');
    updateAccessGate();
    return;
  }
  // Stash current char progress, load target UUID — inventory stays shared
  stashActiveCharacterSheet();
  STATE.activeCharacterId = charId;
  STATE.grudgeCharacters = roster;
  GrudgeFleet.selectCharacter(charId);
  // Prefer full detail (attrs, skills, mastery) from API
  let char = GrudgeFleet.getActiveCharacter() || owned || { id: charId };
  try {
    if (typeof GrudgeFleet.getCharacterDetail === 'function' && GrudgeFleet.isLoggedIn()) {
      const detail = await GrudgeFleet.getCharacterDetail(charId);
      if (detail) char = detail;
    }
  } catch (e) { console.warn('character detail:', e); }
  applyCharacterToState(char);
  try { await loadAccountInventory(); } catch { /* optional */ }
  try { await refreshCampsAndBenches(); } catch { /* optional */ }
  renderCharactersList();
  renderActiveCharacter();
  updateCharacterUI();
  updateStationLockBadges();
  updateAccessGate();
  if (isAccessReady()) {
    if (STATE.currentPage === 'dashboard') renderDashboard();
    if (STATE.currentPage === 'crafting') renderCraftingPage();
    if (STATE.currentPage === 'inventory') renderInventoryPage();
    if (STATE.currentPage === 'char-progress') renderCharProgressPage();
    if (STATE.currentPage.startsWith('prof-')) renderProfessionPage(STATE.currentPage.replace('prof-', ''));
    renderAll();
  }
  saveData();
  const c = roster.find((x) => String(x.id) === String(charId));
  updateAuthUI();
  showToast(c ? c.name + ' selected — professions for this hero' : 'Character selected!', 'success');
}

// ============================================================
// CAMPS & BENCH UNLOCKS (own or friendly — any camp / boat cabin)
// ============================================================
function normalizeBuildingName(b) {
  if (!b) return '';
  if (typeof b === 'string') return b.toLowerCase().replace(/[\s-]+/g, '_');
  const raw = String(b.type || b.name || b.id || b.buildingType || b.kind || b.nodeName || b.kitNode || '').toLowerCase();
  return raw.replace(/[\s-]+/g, '_');
}

/** Expand aliases so TI placeables + kit nodes all match unlockKeys */
function buildingAliases(name) {
  const n = normalizeBuildingName(name);
  const out = new Set([n]);
  // tent stages
  if (/^tent_stage_[123]$/.test(n) || n === 'tenthalf' || n === 'tent_closed' || n === 'tentclosed') {
    out.add('tent'); out.add('camp'); out.add(n.replace(/_/g, ''));
  }
  if (n === 'tent' || n === 'camp') { out.add('tent'); out.add('camp'); }
  // fireplace / cooking
  if (n === 'campfire' || n === 'fireplace') { out.add('campfire'); out.add('cooking'); }
  if (n === 'cooking_bench' || n === 'fishingstand' || n === 'fishing_stand') {
    out.add('cooking_bench'); out.add('cooking'); out.add('fishingstand');
  }
  // craft tables
  if (n === 'workbench') { out.add('workbench'); out.add('tinker'); out.add('camp'); }
  if (n === 'grind_wheel' || n === 'workbenchgrind' || n === 'sharpening_wheel') {
    out.add('grind_wheel'); out.add('workbenchgrind'); out.add('smithing'); out.add('sharpen');
  }
  if (n === 'anvil' || n === 'workbenchanvil' || n === 'forge') {
    out.add('anvil'); out.add('workbenchanvil'); out.add('forge'); out.add('smithing'); out.add('tinker');
  }
  // strip underscores for key matching
  out.add(n.replace(/_/g, ''));
  return [...out];
}

function unlockStationsFromBuildings(buildings, campMeta) {
  const names = [];
  (buildings || []).forEach((b) => buildingAliases(b).forEach((a) => names.push(a)));
  // Owned / starter camp always: Camp Bench + Cooking (campfire contract)
  if (campMeta && (campMeta.relation === 'owned' || campMeta.starter)) {
    STATE.unlockedStations.camp = true;
    STATE.unlockedStations.cooking = true;
  }
  if (campMeta && campMeta.relation === 'friendly') {
    STATE.unlockedStations.camp = true;
  }
  // Explicit campfire / cooking bench
  if (names.some((n) => /campfire|hearth|stove|cook|fishingstand/.test(n))) {
    STATE.unlockedStations.cooking = true;
  }
  for (const st of WCS_STATIONS) {
    if (st.always) { STATE.unlockedStations[st.id] = true; continue; }
    for (const key of st.unlockKeys) {
      const k = key.toLowerCase().replace(/[\s-]+/g, '_').replace(/_/g, '');
      if (names.some((n) => {
        const nn = n.replace(/_/g, '');
        return nn.includes(k) || k.includes(nn) || n.includes(key.toLowerCase());
      })) {
        STATE.unlockedStations[st.id] = true;
        break;
      }
    }
  }
}

function collectBuildingsFromState(state) {
  const placed = [];
  if (!state || typeof state !== 'object') return placed;
  const arrKeys = ['buildings', 'structures', 'benches', 'props', 'placedBuildings'];
  for (const k of arrKeys) {
    if (Array.isArray(state[k])) placed.push(...state[k]);
  }
  if (Array.isArray(state.nodes)) {
    placed.push(...state.nodes.filter((n) =>
      n && (n.kind === 'building' || n.type === 'building' || n.survivalKitNode || n.kitNode || n.category === 'production' || n.category === 'structure')
    ));
  }
  // flat single props
  ['workshop', 'camp', 'campfire', 'forge', 'anvil', 'workbench', 'cabin'].forEach((k) => {
    if (state[k]) placed.push(state[k]);
  });
  return placed;
}

async function refreshCampsAndBenches() {
  const camps = [];
  // Owned home island
  try {
    if (typeof GrudgeFleet !== 'undefined' && GrudgeFleet.isLoggedIn() && typeof GrudgeFleet.getHomeIsland === 'function') {
      const island = await GrudgeFleet.getHomeIsland();
      if (island) {
        const state = island.state || island;
        const placed = collectBuildingsFromState(state);
        const starter = [...SURVIVAL_KIT.starterBuildings];
        camps.push({
          id: island.id || 'home',
          name: island.name || 'Home Island — Starter Camp',
          relation: 'owned',
          starter: true,
          kind: 'camp',
          buildings: [...new Set([...starter, ...placed.map(normalizeBuildingName)])],
          meshPack: SURVIVAL_KIT.packUrl,
        });
      }
    }
  } catch (e) { console.warn('home island:', e); }

  // Boat cabin / ship workshops (island state or character bag flags)
  try {
    const id = STATE.activeCharacterId;
    const boat = STATE.islandData[id]?.boatCabin || STATE.islandData[id]?.cabin;
    if (boat) {
      const placed = collectBuildingsFromState(boat);
      camps.push({
        id: boat.id || 'boat-cabin',
        name: boat.name || 'Boat Cabin',
        relation: 'owned',
        kind: 'cabin',
        buildings: placed.map(normalizeBuildingName),
        meshPack: SURVIVAL_KIT.packUrl,
      });
    }
  } catch { /* ignore */ }

  // Friendly camps from islandData / API
  try {
    const id = STATE.activeCharacterId;
    const friendly = STATE.islandData[id]?.friendlyCamps || STATE.islandData[id]?.camps || [];
    for (const fc of friendly) {
      if (fc.relation === 'enemy' || fc.hostile) continue;
      camps.push({
        id: fc.id || fc.name,
        name: fc.name || 'Friendly Camp',
        relation: fc.relation === 'owned' ? 'owned' : 'friendly',
        kind: fc.kind || 'camp',
        buildings: (fc.buildings || fc.benches || []).map(normalizeBuildingName),
        meshPack: SURVIVAL_KIT.packUrl,
      });
    }
  } catch { /* ignore */ }

  // Local starter when offline / no remote camps
  if (!camps.length) {
    camps.push({
      id: 'local-starter',
      name: 'Starter Camp (local)',
      relation: 'owned',
      starter: true,
      kind: 'camp',
      buildings: [...SURVIVAL_KIT.starterBuildings],
      meshPack: SURVIVAL_KIT.packUrl,
    });
  }

  STATE.camps = camps;
  // Reset then re-apply from all owned/friendly sites
  STATE.unlockedStations = { camp: true, cooking: true };
  for (const c of camps) {
    if (c.relation === 'owned' || c.relation === 'friendly') {
      unlockStationsFromBuildings(c.buildings, c);
    }
  }

  updateStationLockBadges();
  if (STATE.currentPage === 'camps') renderCampsPage();
  if (STATE.currentPage === 'crafting') renderCraftingPage();
  return camps;
}

function labelForBuilding(id) {
  const n = normalizeBuildingName(id);
  const hit = SURVIVAL_KIT.benches.find((b) => b.id === n || b.node === n || n.includes(b.id) || n.includes(b.node));
  return hit ? hit.label : id;
}

function renderCampsPage() {
  const list = document.getElementById('camps-list');
  const unlockEl = document.getElementById('unlocked-stations-list');
  const mapEl = document.getElementById('bench-map-list');
  if (mapEl) {
    mapEl.innerHTML = SURVIVAL_KIT.benches
      .filter((b) => b.stations.length)
      .map((b) => `<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)">
        <code style="color:var(--gold);min-width:120px">${b.node}</code>
        <span style="flex:1">${b.label}</span>
        <span style="color:var(--text-dim)">${b.stations.map((s) => WCS_STATIONS.find((x) => x.id === s)?.name || s).join(', ')}</span>
      </div>`).join('');
  }
  if (!list) return;
  if (!STATE.camps.length) {
    list.innerHTML = `<div class="card"><p style="font-size:12px;color:var(--text-dim)">No camps loaded. Sign in and refresh to pull your home island / boat cabin.</p>
      <button class="filter-btn" onclick="refreshCampsAndBenches()">ðŸ”„ Refresh</button></div>`;
  } else {
    list.innerHTML = STATE.camps.map((c) => {
      const relColor = c.relation === 'owned' ? 'var(--green)' : c.relation === 'friendly' ? 'var(--blue)' : 'var(--text-dim)';
      const kindIcon = c.kind === 'cabin' ? 'â›µ' : c.relation === 'owned' ? 'ðŸ ' : 'ðŸ¤';
      const benches = (c.buildings || []).filter(Boolean);
      return `<div class="card" style="margin-bottom:10px">
        <div class="card-title">${kindIcon} ${c.name}
          <span style="float:right;font-size:10px;color:${relColor};font-family:Inter;font-weight:500">${c.relation}${c.starter ? ' · starter' : ''}</span>
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">Benches / buildings
          ${c.meshPack ? `<span style="opacity:.7"> · kit meshes</span>` : ''}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${benches.length ? benches.map((b) => `<span class="scope-pill" style="font-size:10px" title="${b}">${labelForBuilding(b)}</span>`).join('') : '<span class="scope-pill">none listed</span>'}
        </div>
      </div>`;
    }).join('');
  }
  if (unlockEl) {
    unlockEl.innerHTML = WCS_STATIONS.map((st) => {
      const ok = isStationUnlocked(st.id);
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
        <span>${st.icon}</span>
        <span style="flex:1">${st.name}<div style="font-size:10px;color:var(--text-dim);font-weight:400">${st.desc || ''}</div></span>
        <span style="color:${ok ? 'var(--green)' : 'var(--text-dim)'};font-size:11px">${ok ? 'âœ“ Unlocked' : 'ðŸ”’ Locked'}</span>
        ${ok ? `<button class="filter-btn" onclick="openStation('${st.id}')">Open</button>` : ''}
      </div>`;
    }).join('');
  }
}

function renderWcsArsenal() {
  const el = document.getElementById('wcs-arsenal-body');
  if (!el) return;
  const weapons = RECIPES.filter((r) => /weapon/i.test(r.type));
  const armor = RECIPES.filter((r) => /armor/i.test(r.type));
  const util = RECIPES.filter((r) => /util|consumable|building/i.test(r.type));
  const section = (title, items) => `
    <div class="card" style="grid-column:1/-1;margin-bottom:8px"><div class="card-title">${title} (${items.length})</div></div>
    ${items.slice(0, 120).map((r) => `<div class="codex-card">
      <h4>${itemIcon(r.n, r.icon || 'ðŸ“¦', 'codex-icon', 32)} ${r.n}</h4>
      <p>T${r.tier} ${WCS_TIER_NAMES[r.tier] || ''} · ${r.prof} · ${r.station || PROF_TO_STATION[r.prof] || 'camp'}</p>
      <p>${r.desc || ''}</p>
    </div>`).join('')}`;
  el.innerHTML = section('Weapons', weapons) + section('Armor', armor) + section('Utilities / Consumables', util);
}

function renderWcsMaterials() {
  const el = document.getElementById('wcs-materials-body');
  if (!el) return;
  el.innerHTML = `<div class="codex-grid">` + Object.entries(WCS_MAT_TIERS).map(([t, mats]) => `
    <div class="codex-card">
      <h4>T${t} — ${WCS_TIER_NAMES[t] || ''}</h4>
      ${['ingot','plank','cloth','leather','gem'].map((k) => {
        const n = mats[k];
        const q = STATE.inventory[n] || 0;
        return `<p style="display:flex;align-items:center;gap:6px;margin:4px 0">
          ${itemIcon(n, MAT_ICONS[n] || 'ðŸ§±', 'codex-icon', 22)}
          <span>${k}: <strong style="color:var(--gold)">${n}</strong>
          <span class="scope-pill ${q ? 'account' : ''}" style="margin-left:4px">${q}</span></span>
        </p>`;
      }).join('')}
    </div>`).join('') + `</div>`;
}

function renderCharactersList() {
  const el = document.getElementById('acct-characters-list');
  if (!el) return;
  if (STATE.grudgeCharacters.length === 0) {
    const loggedIn = typeof GrudgeFleet !== 'undefined' && GrudgeFleet.isLoggedIn();
    if (loggedIn) {
      el.innerHTML = `<div style="padding:10px;font-size:11px;color:var(--text-dim);line-height:1.5">
        No characters on this Grudge account.<br/>
        <button class="filter-btn" onclick="doAuth()" style="margin:8px 8px 0 0">Sign in with Grudge ID</button>
        <a href="https://grudgewarlords.com/character" target="_blank" style="color:var(--gold)">Create character</a>
        <div style="margin-top:8px;font-size:10px;opacity:0.8">Uses the same Railway DB as grudgewarlords.com — sign in with the same account you use there.</div>
      </div>`;
    } else {
      el.innerHTML = `<div style="padding:10px;font-size:11px;color:var(--text-dim);line-height:1.5">
        Sign in with <strong style="color:var(--gold)">Grudge ID</strong> to load characters from Railway (same DB as Warlords).<br/>
        <button class="filter-btn" onclick="doAuth()" style="margin-top:8px">Sign In</button>
      </div>`;
    }
    return;
  }
  const classIcons = { warrior:'âš”ï¸', mage:'ðŸ”®', rogue:'ðŸ—¡ï¸', cleric:'âœ¨', worg:'ðŸº', ranger:'ðŸ¹' };
  const raceColors = { human:'#60a5fa', orc:'#22c55e', elf:'#a78bfa', dwarf:'#f59e0b', undead:'#8b5cf6', barbarian:'#ef4444', demon:'#dc2626' };
  el.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">' +
    STATE.grudgeCharacters.map(c => {
      const active = STATE.activeCharacterId === c.id;
      const raceColor = raceColors[c.race?.toLowerCase()] || '#888';
      const classIcon = classIcons[c.class?.toLowerCase()] || 'âš”ï¸';
      return `<div onclick="selectCharacter('${c.id}')" style="
        padding:12px;border-radius:8px;cursor:pointer;transition:all 0.15s;
        background:${active ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.02)'};
        border:1px solid ${active ? 'var(--gold)' : 'var(--border)'};
        ${active ? 'box-shadow:0 0 12px rgba(212,168,67,0.2);' : ''}
      ">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:50%;background:rgba(${active?'212,168,67':'255,255,255'},0.08);border:2px solid ${active?'var(--gold)':raceColor};display:flex;align-items:center;justify-content:center;font-size:18px">${classIcon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:${active?'var(--gold)':'var(--text)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name || c.grudgeCode || 'Warlord'}</div>
            <div style="font-size:10px;color:${raceColor}">${c.race || c.raceId || ''} ${c.class || c.classId || ''} · Lv ${c.level || 1}</div>
            ${c.grudgeCode ? `<div style="font-size:9px;font-family:monospace;color:var(--gold-dim);margin-top:2px;opacity:0.85">${c.grudgeCode}</div>` : ''}
          </div>
        </div>
        ${active ? '<div style="font-size:9px;color:var(--gold);margin-top:6px;text-align:center;letter-spacing:0.1em">âœ“ ACTIVE</div>' : ''}
      </div>`;
    }).join('') + '</div>';
}

function renderActiveCharacter() {
  const card = document.getElementById('acct-active-char-card');
  const el = document.getElementById('acct-active-char');
  const char = STATE.grudgeCharacters.find(c => c.id === STATE.activeCharacterId);
  if (!char) { card.style.display = 'none'; return; }
  card.style.display = 'block';

  const stats = char.stats || {};
  const attrNames = ['strength','vitality','endurance','intellect','wisdom','dexterity','agility','tactics'];
  const attrAbbr = { strength:'STR', vitality:'VIT', endurance:'END', intellect:'INT', wisdom:'WIS', dexterity:'DEX', agility:'AGI', tactics:'TAC' };
  const attrColors = { strength:'#e74c3c', vitality:'#27ae60', endurance:'#95a5a6', intellect:'#3498db', wisdom:'#9b59b6', dexterity:'#f39c12', agility:'#1abc9c', tactics:'#34495e' };

  const hasAttrs = attrNames.some(a => (stats[a] || 0) > 0);

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
      <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,rgba(212,168,67,0.2),rgba(212,168,67,0.05));border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;font-size:24px">âš”</div>
      <div>
        <div style="font-size:16px;font-weight:700;color:var(--gold);font-family:Cinzel,serif">${char.name}</div>
        <div style="font-size:11px;color:var(--text-dim)">${char.race} ${char.class} · Level ${char.level || 1}</div>
        <div style="font-size:10px;color:var(--gold-dim);margin-top:2px">${char.gold || 0} Gold</div>
      </div>
    </div>
    ${hasAttrs ? `
      <div style="font-size:10px;color:var(--text-dim);margin-bottom:6px;letter-spacing:0.1em;text-transform:uppercase">Attributes</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px">
        ${attrNames.map(a => `
          <div style="text-align:center;padding:8px 4px;background:rgba(0,0,0,0.2);border:1px solid ${attrColors[a]}30;border-radius:6px">
            <div style="font-family:'JetBrains Mono';font-size:16px;font-weight:700;color:${attrColors[a]}">${stats[a] || 0}</div>
            <div style="font-size:9px;color:${attrColors[a]}80;letter-spacing:0.05em">${attrAbbr[a]}</div>
          </div>
        `).join('')}
      </div>
    ` : '<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">No attributes allocated yet. <a href="https://grudgewarlords.com/character" target="_blank" style="color:var(--gold)">Allocate at grudgewarlords.com</a></div>'}
    <div style="display:flex;gap:8px">
      <a href="https://grudgewarlords.com/character" target="_blank" style="flex:1;text-align:center;padding:8px;border:1px solid var(--border);border-radius:6px;color:var(--gold);font-size:11px;text-decoration:none;transition:all 0.15s" onmouseover="this.style.background='rgba(212,168,67,0.1)'" onmouseout="this.style.background='none'">ðŸ“‹ Character Sheet</a>
      <a href="https://grudgewarlords.com/dungeon" target="_blank" style="flex:1;text-align:center;padding:8px;border:1px solid var(--border);border-radius:6px;color:var(--red);font-size:11px;text-decoration:none;transition:all 0.15s" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='none'">âš” Dungeons</a>
    </div>
  `;
}

// ============================================================
// ACCOUNT PAGE — sub-tab dispatch
// ============================================================
function renderAccountPage() {
  // Fetch characters if not loaded yet
  if (STATE.grudgeCharacters.length === 0 && (STATE.user || GrudgeFleet.isLoggedIn())) loginToGrudge();

  // Route to active sub-tab
  const t = STATE.acctTab;
  if (t === 'characters') renderAcctCharacters();
  else if (t === 'crafting')  renderAcctCrafting();
  else if (t === 'island')    renderAcctIsland();
}

// Wire tab buttons (runs once after DOM ready)
function initAcctTabs() {
  document.querySelectorAll('.acct-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.acct-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.acct-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const id = 'acct-tab-' + btn.dataset.acctTab;
      document.getElementById(id)?.classList.add('active');
      STATE.acctTab = btn.dataset.acctTab;
      renderAccountPage();
    });
  });
}

// --- Characters sub-tab ---
function renderAcctCharacters() {
  renderCharactersList();
  renderActiveCharacter();

  // Equipment
  const slots = ['head','chest','hands','feet','weapon','shield','ring','necklace'];
  const slotIcons = {head:'\u26d1\ufe0f',chest:'\ud83e\udde5',hands:'\ud83e\udde4',feet:'\ud83d\udc62',weapon:'\u2694\ufe0f',shield:'\ud83d\udee1\ufe0f',ring:'\ud83d\udc8d',necklace:'\ud83d\udc9f'};
  document.getElementById('acct-equip').innerHTML = slots.map(s => {
    const item = STATE.equipment[s];
    return `<div class="equip-slot">
      <span class="slot-label">${slotIcons[s]} ${s}</span>
      ${item ? `<span class="slot-item">${item}</span>` : `<span class="slot-empty">Empty</span>`}
    </div>`;
  }).join('');

  // Save/Load
  document.getElementById('acct-save').innerHTML = `
    <p style="font-size:11px;color:var(--text-dim);margin-bottom:10px">
      ${STATE.user ? `Signed in as <strong>${STATE.user.username}</strong>. Data auto-saves to Puter cloud.` : 'Sign in to enable cloud saves.'}
      <br><span class="scope-pill account">Inventory shared</span>
      <span class="scope-pill character">XP / levels / equipment = this character</span>
    </p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="filter-btn" onclick="saveData();showToast('Saved!','success')" ${STATE.user?'':'disabled'}>\ud83d\udcbe Save Now</button>
      <button class="filter-btn" onclick="loadSaveData()" ${STATE.user?'':'disabled'}>\ud83d\udcc2 Reload</button>
      <button class="filter-btn" onclick="resetData()" style="border-color:rgba(239,68,68,0.3);color:#f87171">\ud83d\uddd1\ufe0f Reset</button>
    </div>
  `;
}

// --- Crafting Log sub-tab ---
function renderAcctCrafting() {
  // Stats
  document.getElementById('acct-stats').innerHTML = `
    <div class="stat-card"><div class="stat-val">${STATE.stats.totalCrafts}</div><div class="stat-label">Crafts</div></div>
    <div class="stat-card"><div class="stat-val">${STATE.stats.materialsUsed}</div><div class="stat-label">Mats Used</div></div>
    <div class="stat-card"><div class="stat-val">${STATE.stats.failedCrafts}</div><div class="stat-label">Failed</div></div>
  `;

  // Per-character craft list
  const char = STATE.grudgeCharacters.find(c => c.id === STATE.activeCharacterId);
  const labelEl = document.getElementById('acct-crafting-char-label');
  if (labelEl) labelEl.textContent = char ? `— ${char.name}` : '(no character selected)';

  const listEl = document.getElementById('acct-char-craft-list');
  if (!listEl) return;
  const charCrafts = (STATE.activeCharacterId && STATE.characterCrafting[STATE.activeCharacterId]) || [];

  if (!STATE.activeCharacterId) {
    listEl.innerHTML = '<div style="padding:12px;font-size:11px;color:var(--text-dim)">Select a character from the Characters tab.</div>';
  } else if (charCrafts.length === 0) {
    listEl.innerHTML = '<div style="padding:12px;font-size:11px;color:var(--text-dim)">No crafts recorded for this character yet. Go craft something!</div>';
  } else {
    const profColors = { Miner:'#ef4444',Forester:'#22c55e',Mystic:'#a78bfa',Chef:'#f59e0b',Engineer:'#60a5fa',All:'#888' };
    listEl.innerHTML = charCrafts.slice(0, 60).map(r => {
      const t = new Date(r.time).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
      const col = profColors[r.profession] || '#888';
      return `<div class="harvest-row">
        <span class="mat-icon">${r.icon || '\ud83d\udce6'}</span>
        <span class="mat-name">${r.item}</span>
        <span style="font-size:9px;color:${col};min-width:60px">${r.profession} T${r.tier}</span>
        <span class="mat-qty">+${r.xp} XP</span>
        <span class="mat-time">${t}</span>
      </div>`;
    }).join('');
  }

  renderLog('acct-log');
}

// --- Home Island sub-tab (fully enhanced) ---
function renderAcctIsland() {
  const id = STATE.activeCharacterId;
  const island = id ? STATE.islandData[id] : null;

  const harvestEl  = document.getElementById('acct-island-harvest');
  const queueEl    = document.getElementById('acct-island-queue');
  const resEl      = document.getElementById('acct-island-resources');
  const suggestEl  = document.getElementById('island-craft-suggestions');

  if (!id) {
    if (harvestEl)  harvestEl.innerHTML  = '<div style="padding:8px;font-size:11px;color:var(--text-dim)">Select a character from the Characters tab first.</div>';
    if (queueEl)    queueEl.innerHTML    = '<div style="font-size:11px;color:var(--text-dim)">No character selected.</div>';
    if (resEl)      resEl.innerHTML      = '';
    if (suggestEl)  suggestEl.innerHTML  = '<div style="font-size:11px;color:var(--text-dim)">Select a character to see suggestions.</div>';
    return;
  }

  if (!island) {
    if (harvestEl)  harvestEl.innerHTML  = '<div style="padding:8px;font-size:11px;color:var(--text-dim)">Fetching island data…</div>';
    if (suggestEl)  suggestEl.innerHTML  = '<div style="font-size:11px;color:var(--text-dim)">Loading…</div>';
    fetchIslandData(id);
    return;
  }

  // â”€â”€ Craft suggestions from island stockpile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const resources  = island.resources || {};
  renderCraftSuggestionsPanel('island-craft-suggestions', resources, 'island');

  // â”€â”€ Auto-harvest live feed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const harvests = island.harvests || [];
  if (harvestEl) {
    if (harvests.length === 0) {
      harvestEl.innerHTML = `<div style="padding:12px;font-size:11px;color:var(--text-dim);text-align:center">
        ðŸŒ³ Your island workers are en route. Check back soon!
      </div>`;
    } else {
      // Running total across all harvests
      const totals = {};
      harvests.forEach(h => { totals[h.material] = (totals[h.material] || 0) + h.quantity; });
      const totalLines = Object.entries(totals)
        .sort((a,b) => b[1] - a[1]).slice(0, 4)
        .map(([m,q]) => `<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(34,197,94,0.12);color:var(--green)">${MAT_ICONS[m]||'\ud83d\udce6'} ${q}</span>`).join(' ');

      harvestEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
          <span style="font-size:10px;color:var(--text-dim)">This session:</span>
          ${totalLines}
          <span style="font-size:9px;color:var(--text-dim);margin-left:auto">${harvests.length} harvest events</span>
        </div>
        <div style="max-height:240px;overflow-y:auto">
          ${harvests.map((h, i) => `
            <div class="harvest-row ${i < 3 ? 'harvest-entry-new' : ''}" style="animation-delay:${i * 0.05}s">
              <span class="mat-icon">${MAT_ICONS[h.material] || '\ud83d\udce6'}</span>
              <span class="mat-name">${h.material}</span>
              <span style="font-size:9px;color:var(--text-dim);min-width:55px">${h.source || 'Island'}</span>
              <span class="mat-qty">+${h.quantity}</span>
              <span class="mat-time">${h.elapsed || ''}</span>
            </div>`).join('')}
        </div>`;
    }
  }

  // â”€â”€ Resource progress bars â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  renderMatProgressBars('acct-island-resources', resources);

  // â”€â”€ Crafting queue with progress bars â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const queue = island.craftingQueue || [];
  if (queueEl) {
    if (queue.length === 0) {
      queueEl.innerHTML = `<div style="font-size:11px;color:var(--text-dim)">
        No crafts queued. <a href="https://grudgewarlords.com" target="_blank" style="color:var(--gold)">Visit grudgewarlords.com</a> to queue island crafts.
      </div>`;
    } else {
      const totalDone = queue.filter(q => (q.progress||0) >= 100).length;
      queueEl.innerHTML = `
        ${totalDone > 0 ? `<div style="font-size:10px;color:var(--green);margin-bottom:8px">âœ“ ${totalDone} craft${totalDone>1?'s':''} complete — collect in game!</div>` : ''}
        ${queue.map(q => {
          const pct = q.progress || 0;
          const done = pct >= 100;
          const barColor = done ? 'var(--green)' : 'var(--gold)';
          return `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
              <span style="font-size:12px">${q.icon||'\ud83d\udce6'} ${q.item}</span>
              <span style="font-size:10px;color:${done?'var(--green)':'var(--text-dim)'}">${done ? 'âœ“ Done' : pct + '%'}</span>
            </div>
            <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width 0.5s ease"></div>
            </div>
          </div>`;
        }).join('')}`;
    }
  }
}

// --- Fetch island data from Grudge API (with Puter KV fallback) ---
async function fetchIslandData(charId) {
  try {
    if (STATE.grudgeToken) {
      const res = await fetch(`${GRUDGE_API}/api/characters/${charId}/island`, {
        headers: { 'Authorization': 'Bearer ' + STATE.grudgeToken }
      });
      if (res.ok) {
        STATE.islandData[charId] = await res.json();
        if (STATE.acctTab === 'island') renderAcctIsland();
        // Cache result in Puter KV
        if (STATE.user) {
          try { await puter.kv.set(`grudge-island-${charId}`, JSON.stringify(STATE.islandData[charId])); } catch {}
        }
        return;
      }
    }
  } catch(e) { console.warn('Island API failed:', e); }

  // Puter KV fallback
  try {
    if (STATE.user) {
      const raw = await puter.kv.get(`grudge-island-${charId}`);
      if (raw) {
        STATE.islandData[charId] = JSON.parse(raw);
        if (STATE.acctTab === 'island') renderAcctIsland();
        return;
      }
    }
  } catch {}

  // Nothing found — show empty state
  STATE.islandData[charId] = { harvests: [], craftingQueue: [], resources: {} };
  const el = document.getElementById('acct-island-harvest');
  if (el) el.innerHTML = `<div style="padding:8px;font-size:11px;color:var(--text-dim)">
    Island data not available yet. <a href="https://grudgewarlords.com" target="_blank" style="color:var(--gold)">Visit grudgewarlords.com</a> to set up your home island.
  </div>`;
}

// Refresh button handler for island tab
function refreshIslandData() {
  const id = STATE.activeCharacterId;
  if (!id) { showToast('Select a character first', 'error'); return; }
  delete STATE.islandData[id];
  renderAcctIsland();
}

function resetData() {
  if (!requireAccess('reset local craft cache')) return;
  if (!confirm('Reset all crafting data? This cannot be undone.')) return;
  STATE.professions = blankProfessions();
  STATE.equipment = blankEquipment();
  STATE.characterSheets = {};
  if (STATE.activeCharacterId) STATE.characterSheets[STATE.activeCharacterId] = blankCharSheet();
  STATE.inventory = { 'Wood Scraps': 20, 'Stone Fragments': 15, 'Plant Fiber': 25, 'Water': 20, 'Rotted Wood': 18, 'Wild Herbs': 12, 'Herb': 10 };
  STATE.stats = { totalCrafts:0, itemsCrafted:0, materialsUsed:0, failedCrafts:0 };
  STATE.unlockedStations = { camp: true, cooking: true };
  STATE.camps = [];
  STATE.log = [];
  addLog('ðŸ—‘ï¸ Data reset', 'fail');
  renderAll();
  saveData();
  showToast('Data reset!', 'error');
}

// === PROFESSION PAGE (+ skill tree nodes for this character UUID) ===
function renderProfessionPage(name) {
  const profName = name.charAt(0).toUpperCase() + name.slice(1);
  const prof = STATE.professions[profName];
  if (!prof) return;

  const recipes = RECIPES.filter(r => r.prof === profName);
  const pct = Math.min(100, (prof.xp / prof.xpNext) * 100);
  const tree = PROF_SKILL_TREES[profName] || [];
  const unlocked = new Set(STATE._activeProfNodes?.[profName] || []);
  const char = STATE.grudgeCharacters.find((c) => String(c.id) === String(STATE.activeCharacterId));

  document.getElementById('page-prof-' + name).innerHTML = `
    <div class="page-header">
      <h2 class="page-title">${prof.iconUrl ? '<span class="page-title-icon"><img referrerpolicy="no-referrer" data-icon-kind="skill" src="'+prof.iconUrl+'" alt=""></span> ' : (prof.icon||'')} ${profName}</h2>
      <span style="font-family:'JetBrains Mono';font-size:12px;color:${prof.color}">Level ${prof.level} · ${prof.xp}/${prof.xpNext} XP</span>
      <span class="scope-pill character">${char ? char.name : 'no character'} · UUID scoped</span>
    </div>
    <div class="card">
      <div class="card-title">Progression</div>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
        <span style="font-size:48px">${prof.icon}</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:${prof.color}">${profName}</div>
          <div style="font-size:11px;color:var(--text-dim)">${prof.role}</div>
          <div class="prof-xp-bar" style="margin-top:8px;height:8px"><div class="prof-xp-fill" style="width:${pct}%;background:${prof.color}"></div></div>
          <div style="font-size:10px;color:var(--text-dim);margin-top:4px">Total crafts: ${prof.totalCrafts} · Next level: ${prof.xpNext - prof.xp} XP needed</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Skill Tree · ${unlocked.size}/${tree.length} nodes
        <span style="font-size:10px;color:var(--text-dim);font-family:Inter;font-weight:400">unlocks with profession level on this character</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">
        ${tree.map((n) => {
          const ok = unlocked.has(n.id) || prof.level >= n.req;
          return `<div class="codex-card" style="opacity:${ok?1:0.45};border-color:${ok ? prof.color + '55' : 'var(--border)'}">
            <h4>${ok ? 'âœ“' : 'ðŸ”’'} ${n.n}</h4>
            <p>${n.branch} · req Lv ${n.req}</p>
            <p>${n.desc || ''}</p>
          </div>`;
        }).join('') || '<p style="font-size:11px;color:var(--text-dim)">No tree data</p>'}
      </div>
    </div>
    <div class="card">
      <div class="card-title">${profName} Recipes (${recipes.length})</div>
      <div class="recipe-grid">
        ${recipes.map(r => {
          const canCraft = checkCanCraft(r);
          const tierColors = ['#666','#22c55e','#60a5fa','#a78bfa','#f59e0b','#ef4444','#ec4899','#f97316','#dc2626'];
          return `<div class="recipe-item ${canCraft?'':'cant-craft'}" onclick="openStation('${r.station || PROF_TO_STATION[profName] || 'camp'}');selectRecipe('${r.id}');">
            <span class="recipe-icon">${r.icon||'ðŸ“¦'}</span>
            <div class="recipe-info">
              <div class="recipe-name">${r.n}</div>
              <div class="recipe-meta">${r.desc || ''}</div>
            </div>
            <span class="recipe-tier" style="color:${tierColors[r.tier]};border-color:${tierColors[r.tier]}30">T${r.tier}</span>
          </div>`;
        }).join('') || '<div style="color:var(--text-dim)">No recipes yet</div>'}
      </div>
    </div>
  `;
}

// ============================================================
// UTILITIES
// ============================================================
function addLog(msg, type='') {
  const time = new Date().toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'});
  STATE.log.unshift({ time, msg, type });
  if (STATE.log.length > 100) STATE.log.pop();
}

function renderLog(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = STATE.log.slice(0, 20).map(e =>
    `<div class="log-entry ${e.type}"><span class="time">${e.time}</span>${e.msg}</div>`
  ).join('') || '<div style="font-size:11px;color:var(--text-dim);padding:8px">No activity yet</div>';
}

function showToast(msg, type='') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ============================================================
// OBJECTSTORE ITEM DATABASE + CANONICAL ICONS
// ============================================================
// Binary icons: assets.grudge-studio.com (R2)
// JSON catalog: objectstore|info …/api/v1/master-items.json
// Category folders on CDN (/icons/swords/…) are HTML shells — map to pack/.
let ITEM_DB = [];
let ITEM_DB_CATEGORIES = [];
let ITEM_ICON_MAP = {};
let dbFilterCat = 'all';
let MASTER_RECIPES_LOADED = false;

const ASSET_CDN = (window.GRUDGE_CONFIG && window.GRUDGE_CONFIG.ASSETS) || 'https://assets.grudge-studio.com';
/** Icon host SSOT — skill class icons live on info.*; pack weapons on both (prefer info). */
const INFO_CDN = (window.GRUDGE_CONFIG && window.GRUDGE_CONFIG.INFO_ORIGIN) || 'https://info.grudge-studio.com';

/** Definition base URLs — info first (objectstore recipe/item paths currently 404). */
function definitionBases() {
  const cfg = window.GRUDGE_CONFIG || {};
  const list = [
    cfg.INFO_URL,
    'https://info.grudge-studio.com/api/v1',
    cfg.OBJECTSTORE_URL,
    'https://objectstore.grudge-studio.com/api/v1',
  ]
    .filter(Boolean)
    .map((u) => String(u).replace(/\/$/, ''));
  return [...new Set(list)];
}

/**
 * Absolute icon host for a path under /icons/…
 * - skills/* only on info (assets 404)
 * - pack/* prefer assets (more complete; info has HTML shells for some Staff/Shield/etc.)
 * - onerror still falls back via iconImgTag
 */
function iconCdnForPath(path) {
  const p = String(path || '');
  // skills/* only on info (assets 404). pack/* on assets CDN (reliable PNGs).
  if (/\/icons\/skills\//i.test(p)) return INFO_CDN;
  if (/\/icons\/pack\//i.test(p)) return ASSET_CDN;
  if (/\/icons\//i.test(p)) return ASSET_CDN;
  return ASSET_CDN;
}

/** GET JSON from first definition host that returns ok. */
async function fetchDefinitionJson(file) {
  let lastErr = null;
  for (const base of definitionBases()) {
    try {
      const res = await fetch(base + '/' + file.replace(/^\//, ''));
      if (!res.ok) {
        lastErr = new Error(file + ' HTTP ' + res.status + ' @ ' + base);
        continue;
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('definition unavailable: ' + file);
}

function mapMasterCategoryToType(category) {
  const c = String(category || '').toLowerCase();
  if (/food|potion|consumable|bandage|stew|meat|soup/.test(c)) return 'Consumable';
  if (/armor|helm|chest|boot|glove|robe|leather|plate|shield/.test(c)) return 'Armor';
  if (/sword|axe|bow|staff|dagger|hammer|gun|crossbow|spear|weapon|mace|club/.test(c)) return 'Weapon';
  if (/build|camp|bench|anvil|tent|chest|trap|util/.test(c)) return 'Utility';
  if (/ingot|plank|thread|refin|essence|leather|cloth|gear|mat/.test(c)) return 'Refining';
  return 'Craft';
}

function normalizeProfession(prof) {
  const p = String(prof || 'All').trim();
  const known = ['Miner', 'Forester', 'Mystic', 'Chef', 'Engineer', 'All'];
  const hit = known.find((k) => k.toLowerCase() === p.toLowerCase());
  return hit || (p || 'All');
}

/**
 * Merge ObjectStore master-recipes (2k+) into inline RECIPES so Puter crafting
 * matches Warlords production definitions. Inline recipes win on id collisions.
 */
async function loadMasterRecipes() {
  try {
    const data = await fetchDefinitionJson('master-recipes.json');
    const raw = Array.isArray(data.recipes) ? data.recipes : Array.isArray(data) ? data : [];
    if (!raw.length) throw new Error('master-recipes empty');

    const existing = new Set(RECIPES.map((r) => r.id));
    let added = 0;
    for (const mr of raw) {
      const resultName = mr.resultName || mr.name || mr.result || '';
      if (!resultName) continue;
      const id =
        String(mr.uuid || mr.id || resultName)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 80) || `recp-${added}`;
      if (existing.has(id)) continue;

      const mats = {};
      const materials = Array.isArray(mr.materials) ? mr.materials : [];
      for (const m of materials) {
        const name = m.name || m.itemName || m.id;
        const qty = Number(m.quantity ?? m.qty ?? m.count ?? 1) || 1;
        if (name) mats[name] = qty;
      }

      const prof = normalizeProfession(mr.profession || mr.prof || 'All');
      const type = mapMasterCategoryToType(mr.category || mr.type);
      const recipe = {
        id,
        n: resultName,
        prof,
        type,
        tier: Number(mr.tier ?? mr.level ?? 0) || 0,
        icon: mr.icon || mr.emoji || 'âš’ï¸',
        mats,
        desc: mr.name && mr.name !== resultName ? mr.name : (mr.description || resultName),
        station: PROF_TO_STATION[prof] || 'camp',
        uuid: mr.uuid || null,
        resultItemId: mr.resultItemId || null,
        source: 'objectstore',
      };
      RECIPES.push(recipe);
      existing.add(id);
      RECIPE_OUTPUT_MAP[recipe.n] = recipe.id;
      added++;
    }

    MASTER_RECIPES_LOADED = true;
    console.log('[ObjectStore] Merged ' + added + ' master recipes (total ' + RECIPES.length + ')');
    const badge = document.getElementById('recipe-count') || document.querySelector('[data-recipe-count]');
    if (badge) badge.textContent = String(RECIPES.length);
    renderAll();
  } catch (e) {
    console.warn('[ObjectStore] master-recipes merge skipped:', e);
  }
}

/** master-items category â†’ pack/weapons stem (PascalCase file prefix) */
const ICON_CAT_TO_PACK = {
  swords: 'Sword', sword: 'Sword',
  axes1h: 'Axe', axe: 'Axe', greataxes: 'Axe', greataxe: 'Axe',
  daggers: 'Dagger', dagger: 'Dagger',
  hammers1h: 'Hammer', hammers2h: 'Hammer', hammer: 'Hammer',
  greatswords: 'Sword', greatsword: 'Sword',
  spears: 'Spear', spear: 'Spear',
  bows: 'Bow', bow: 'Bow',
  crossbows: 'Crossbow', crossbow: 'Crossbow',
  guns: 'Crossbow', gun: 'Crossbow',
  shields: 'Shield', shield: 'Shield',
  fireStaves: 'Staff', frostStaves: 'Staff', holyStaves: 'Staff',
  lightningStaves: 'Staff', natureStaves: 'Staff', wands: 'Staff',
  staff: 'Staff', staves: 'Staff', tools: 'Hammer',
};

const ICON_PACK_FALLBACK = {
  armor: '/icons/pack/armor/Chest_01.png',
  greenFoods: '/icons/pack/misc/Effect.png',
  blueFoods: '/icons/pack/misc/Effect.png',
  redFoods: '/icons/pack/misc/Effect.png',
  mysticPotions: '/icons/pack/misc/Effect.png',
  engineerConsumables: '/icons/pack/misc/Effect.png',
  tools: '/icons/pack/weapons/Hammer_01.png',
  default: '/icons/pack/misc/Effect.png',
};

function rewriteIconHost(url) {
  if (!url || typeof url !== 'string') return '';
  // Keep info.grudge-studio.com (skill icons only exist there). Map legacy hosts â†’ path only.
  return url
    .replace(/https?:\/\/molochdagod\.github\.io\/ObjectStore/gi, '')
    .replace(/https?:\/\/grudge-objectstore\.pages\.dev/gi, '')
    .replace(/https?:\/\/objectstore\.grudge-studio\.com(?!\/api)/gi, '')
    .replace(/https?:\/\/assets\.grudge-studio\.com/gi, '')
    .replace(/https?:\/\/info\.grudge-studio\.com(\/api\/v1)?/gi, '');
}

/**
 * Resolve any icon field to a working PNG on info.grudge-studio.com (preferred)
 * or assets when needed. Category folders (swords/, axes1h/, …) â†’ pack weapons.
 * Skill class icons MUST stay on info (assets.grudge-studio.com/icons/skills/* 404).
 */
function resolveCanonicalIcon(urlOrPath, category, name) {
  const cat = (category || '').toString();
  let raw = (urlOrPath || '').trim();
  let path = rewriteIconHost(raw);

  if (raw.startsWith('http') && path.startsWith('http')) {
    try { path = new URL(raw).pathname; } catch { /* keep */ }
  }
  if (path && path.startsWith('http')) {
    try { path = new URL(path).pathname; } catch { /* keep */ }
  }
  if (path && !path.startsWith('/') && !path.startsWith('http')) path = '/' + path;
  path = (path || '').replace(/^\/api\/v1/, '');

  // Skill trees / class packs — always info
  if (/\/icons\/skills\//i.test(path)) {
    return INFO_CDN + path;
  }

  // Already a pack path
  if (/\/icons\/pack\//i.test(path)) {
    return iconCdnForPath(path) + path;
  }
  // Armor atlas
  if (/\/icons\/armor_full\//i.test(path)) {
    return iconCdnForPath(path) + path;
  }
  if (/\/icons\/food\//i.test(path) || /\/icons\/consumables\//i.test(path)) {
    return iconCdnForPath(path) + path;
  }

  // /icons/{category}/{stem}_{num}.png â†’ /icons/pack/weapons/{Pack}_{num}.png
  const m = path.match(/\/icons\/([^/]+)\/([A-Za-z_]*?)(\d+)\.(png|webp|jpe?g)$/i);
  if (m) {
    const folder = m[1];
    const num = m[3].padStart(2, '0');
    if (folder === 'skills' || folder === 'class') {
      return INFO_CDN + path;
    }
    const stem = ICON_CAT_TO_PACK[folder] || ICON_CAT_TO_PACK[folder.toLowerCase()];
    if (stem) {
      const packPath = `/icons/pack/weapons/${stem}_${num}.png`;
      return iconCdnForPath(packPath) + packPath;
    }
    if (folder === 'armor' || folder === 'armor_full') {
      const file = path.split('/').pop();
      const packPath = `/icons/pack/armor/${file}`;
      return iconCdnForPath(packPath) + packPath;
    }
  }

  // Category-only fallback
  if (ICON_CAT_TO_PACK[cat] || ICON_CAT_TO_PACK[cat.toLowerCase()]) {
    const stem = ICON_CAT_TO_PACK[cat] || ICON_CAT_TO_PACK[cat.toLowerCase()];
    const packPath = `/icons/pack/weapons/${stem}_01.png`;
    return iconCdnForPath(packPath) + packPath;
  }
  if (cat === 'armor' || /armor|helm|chest|boot|bracer|shoulder|ring|necklace/i.test(name || '')) {
    return iconCdnForPath(ICON_PACK_FALLBACK.armor) + ICON_PACK_FALLBACK.armor;
  }
  if (ICON_PACK_FALLBACK[cat]) {
    return iconCdnForPath(ICON_PACK_FALLBACK[cat]) + ICON_PACK_FALLBACK[cat];
  }

  if (path && path.startsWith('/icons/')) return iconCdnForPath(path) + path;
  if (raw.startsWith('https://info.grudge-studio.com')) return raw;
  if (raw.startsWith(ASSET_CDN) && /\/icons\/skills\//i.test(raw)) {
    return raw.replace(ASSET_CDN, INFO_CDN);
  }
  if (raw.startsWith(ASSET_CDN) || raw.startsWith(INFO_CDN)) return raw;
  return INFO_CDN + ICON_PACK_FALLBACK.default;
}

function iconImgTag(url, name, cssClass, size) {
  const cls = cssClass || "item-img";
  const fallbackInfo = INFO_CDN + ICON_PACK_FALLBACK.default;
  const fallbackAsset = ASSET_CDN + ICON_PACK_FALLBACK.default;
  let safe = (url || fallbackInfo).replace(/"/g, "");
  // assets.grudge-studio.com/icons/skills/* always 404 â†’ rewrite to info
  if (/assets\.grudge-studio\.com\/icons\/skills\//i.test(safe)) {
    safe = safe.replace(/https?:\/\/assets\.grudge-studio\.com/i, INFO_CDN);
  }
  const alt = (name || "item").replace(/"/g, "");
  const dim = size ? ` style="width:${size}px;height:${size}px"` : "";
  const kind = /\/skills\//i.test(safe) ? "skill" : "pack";
  // onerror chain: primary â†’ info default â†’ assets default
  return `<img referrerpolicy="no-referrer" class="${cls}" data-icon-kind="${kind}" referrerpolicy="no-referrer" referrerpolicy="no-referrer" src="${safe}" alt="${alt}" loading="lazy" decoding="async"${dim} onerror="if(this.dataset.fb==='2'){return}if(this.dataset.fb==='1'){this.dataset.fb='2';this.src='${fallbackAsset}'}else{this.dataset.fb='1';this.src='${fallbackInfo}'}">`;
}

/**
 * Pull profession iconUrl from info …/professions.json and patch nav + STATE + stations.
 */
async function loadProfessionIconsFromInfo() {
  try {
    const data = await fetchDefinitionJson('professions.json');
    const map = data.professions || data;
    if (!map || typeof map !== 'object') return;
    const nameMap = {
      miner: 'Miner', forester: 'Forester', mystic: 'Mystic', chef: 'Chef', engineer: 'Engineer',
    };
    for (const [key, def] of Object.entries(map)) {
      const name = nameMap[key.toLowerCase()] || (def && def.name) || key;
      if (!STATE.professions[name]) continue;
      let iconPath = def.iconUrl || def.icon || '';
      if (!iconPath || String(iconPath).length < 4 || /[\u{1F300}-\u{1FAFF}]/u.test(String(iconPath))) {
        iconPath = PROF_ICON_URLS[name] || '';
      }
      const url = resolveCanonicalIcon(iconPath, name, name);
      if (url) {
        STATE.professions[name].iconUrl = url;
        PROF_ICON_URLS[name] = url;
        // Engineer shares engineer skill pack with Miner — keep Crossbow for visual distinction
        if (name === 'Engineer' && /engineer_01\.png/i.test(url)) {
          STATE.professions[name].iconUrl = PROF_ICON_URLS.Engineer =
            INFO_CDN + '/icons/pack/weapons/Crossbow_01.png';
        }
      }
    }
    // Patch nav imgs + station cards
    document.querySelectorAll('img[data-prof-icon]').forEach((img) => {
      const n = img.getAttribute('data-prof-icon');
      const u = STATE.professions[n]?.iconUrl || PROF_ICON_URLS[n];
      if (u) img.src = u;
    });
    for (const st of WCS_STATIONS) {
      if (st.prof && PROF_ICON_URLS[st.prof]) st.iconUrl = PROF_ICON_URLS[st.prof];
      if (st.prof === 'All') st.iconUrl = INFO_CDN + '/icons/pack/misc/Effect.png';
    }
    console.log('[info] Profession icons applied from professions.json');
  } catch (e) {
    console.warn('[info] professions icons load skipped:', e);
  }
}

async function loadItemDatabase() {
  try {
    try {
      if (typeof GrudgeFleet !== 'undefined' && GrudgeFleet.getGamesLibrary) {
        await GrudgeFleet.getGamesLibrary();
      } else {
        await fetchDefinitionJson('games-library.json');
      }
    } catch (libErr) {
      console.warn('[ObjectStore] games-library optional fail', libErr);
    }

    const data = await fetchDefinitionJson('master-items.json');
    const raw = data.items || [];
    ITEM_DB = raw.map(item => {
      const category = item.category || item.type || 'weapon';
      const icon = resolveCanonicalIcon(item.iconUrl || item.icon || item.iconPath, category, item.name);
      return {
        name: item.name,
        category,
        icon,
        stats: item.stats || {},
        tier: item.tier,
        uuid: item.uuid,
      };
    });
    const cats = new Set(ITEM_DB.map(i => i.category).filter(Boolean));
    ITEM_DB_CATEGORIES = Array.from(cats).sort();
    ITEM_ICON_MAP = {};
    ITEM_DB.forEach(item => {
      if (item.icon && item.name) ITEM_ICON_MAP[item.name.toLowerCase()] = item.icon;
    });
    if (typeof RECIPES !== 'undefined') {
      RECIPES.forEach(r => {
        const u = ITEM_ICON_MAP[(r.n || '').toLowerCase()];
        if (u) r.iconUrl = u;
      });
    }
    const el = document.getElementById('db-count');
    if (el) el.textContent = ITEM_DB.length;
    console.log('[ObjectStore] Loaded ' + ITEM_DB.length + ' items with canonical CDN icons');
    renderAll();
  } catch(e) {
    console.error('[ObjectStore] Failed:', e);
    const el = document.getElementById('db-count');
    if (el) el.textContent = '!';
    const sum = document.getElementById('db-summary');
    if (sum) sum.textContent = 'Failed to load — check console';
  }
}

function itemIcon(name, emoji, cssClass, size) {
  const cls = cssClass || 'item-img';
  const key = (name || '').toLowerCase();
  const url = ITEM_ICON_MAP[key] || resolveCanonicalIcon(null, null, name);
  // Prefer real icon; keep emoji only if no map and no sensible URL
  if (ITEM_ICON_MAP[key] || (url && !url.endsWith('/Effect.png'))) {
    return iconImgTag(url, name, cls, size);
  }
  // Still try default pack icon over emoji when we have a name
  if (name) return iconImgTag(url, name, cls, size);
  return emoji || 'ðŸ“¦';
}

function renderItemDatabase() {
  const query = (document.getElementById('db-search')?.value || '').toLowerCase().trim();
  document.getElementById('db-cat-filters').innerHTML =
    `<button class="filter-btn ${dbFilterCat==='all'?'active':''}" onclick="dbFilterCat='all';renderItemDatabase()">All</button>` +
    ITEM_DB_CATEGORIES.map(c =>
      `<button class="filter-btn ${dbFilterCat===c?'active':''}" onclick="dbFilterCat='${c}';renderItemDatabase()">${c[0].toUpperCase()+c.slice(1)}</button>`
    ).join('');

  let items = ITEM_DB;
  if (dbFilterCat !== 'all') items = items.filter(i => i.category === dbFilterCat);
  if (query) items = items.filter(i => i.name.toLowerCase().includes(query));

  document.getElementById('db-summary').textContent = `${items.length} of ${ITEM_DB.length} items · icons: assets.grudge-studio.com`;
  const showing = items.slice(0, 200);
  document.getElementById('db-grid').innerHTML = showing.map(item => {
    const statsArr = [];
    if (item.stats?.damage) statsArr.push(`DMG <span>${item.stats.damage}</span>`);
    if (item.stats?.defense) statsArr.push(`DEF <span>${item.stats.defense}</span>`);
    if (item.stats?.requiredLevel) statsArr.push(`Lv <span>${item.stats.requiredLevel}</span>`);
    const iconHtml = item.icon
      ? iconImgTag(item.icon, item.name, '', 48)
      : '<div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:28px">ðŸ“¦</div>';
    return `<div class="db-card">
      ${iconHtml}
      <div>
        <div class="db-card-name">${item.name}</div>
        <div class="db-card-cat">${item.category || ''}${item.tier != null ? ' · T' + item.tier : ''}</div>
        ${statsArr.length ? `<div class="db-card-stats">${statsArr.join(' · ')}</div>` : ''}
      </div>
    </div>`;
  }).join('') || '<div style="padding:20px;text-align:center;color:var(--text-dim)">No items found</div>';
}

GrudgeFleet.onCharacterChange((char) => {
  STATE.activeCharacterId = char?.id || null;
  STATE.grudgeCharacters = GrudgeFleet.getCharacters();
  applyCharacterToState(char);
  updateCharacterUI();
  renderAll();
});

window.addEventListener('grudge:auth:ready', () => { void refreshFleetState(); });
window.addEventListener('grudge:sync:complete', () => { renderCharactersList(); updateCharacterUI(); });

// ============================================================
// INIT
// ============================================================
addLog('âš” Grudge Crafting Suite v' + (window.GRUDGE_CONFIG?.VERSION || '?') + ' — browse open · sign-in only to craft · shared bag · per-char XP');
initAcctTabs();
// Suite always open — soft banner only when not ready to craft
document.body.classList.add('access-ready');
try {
  var _lo = document.getElementById('lvl-overlay');
  if (_lo) { _lo.classList.remove('show'); _lo.setAttribute('aria-hidden','true'); }
} catch (_e) {}
// Deep-link from main-panel: ?station=smithing&embed=1
try {
  const params = new URLSearchParams(window.location.search || '');
  const st = (params.get('station') || params.get('bench') || '').toLowerCase();
  if (st && WCS_STATIONS.some((s) => s.id === st)) {
    STATE.activeStation = st;
    STATE.currentPage = 'crafting';
  }
  if (params.get('embed') === '1' || params.get('embed') === 'true' || window.parent !== window) {
    document.body.classList.add('embed-mode');
    const style = document.createElement('style');
    style.textContent = 'body.embed-mode .sidebar{width:64px} body.embed-mode .sidebar .nav-btn span:not(.icon),.embed-mode .sidebar-logo small,.embed-mode .sidebar-section-title,.embed-mode .sidebar-account .account-meta,.embed-mode .sidebar-account .auth-menu-btns{display:none}';
    document.head.appendChild(style);
  }
  const pageQ = (params.get('page') || params.get('tab') || '').toLowerCase();
  if (pageQ && document.getElementById('page-' + pageQ)) STATE.currentPage = pageQ;
} catch (e) { console.warn('[init] query', e); }
updateAccessGate();
// Definitions load immediately (no auth required)
void (async () => {
  try {
    await Promise.all([loadItemDatabase(), loadMasterRecipes(), loadProfessionIconsFromInfo()]);
    if (typeof renderAll === 'function') renderAll();
    if (typeof navigate === 'function' && STATE.currentPage) navigate(STATE.currentPage);
  } catch (e) {
    console.warn('[init] definition load', e);
  }
})();
// Render dashboard/stations immediately from inline recipes
try {
  if (STATE.currentPage && STATE.currentPage !== 'dashboard') navigate(STATE.currentPage);
  else {
    if (typeof renderStationTabs === 'function') renderStationTabs();
    if (typeof renderDashboard === 'function') renderDashboard();
  }
} catch (e) { console.warn('[init] first paint', e); }

if (typeof GrudgeFleet !== 'undefined') {
  checkAuth();
} else {
  let tries = 0;
  const waitFleet = setInterval(() => {
    tries++;
    if (typeof GrudgeFleet !== 'undefined') {
      clearInterval(waitFleet);
      checkAuth();
    } else if (tries > 40) {
      clearInterval(waitFleet);
      updateAccessGate();
    }
  }, 100);
}

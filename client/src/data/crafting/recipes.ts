import { WEAPON_SETS } from './tieredCrafting';

export type RecipeAcquisition = 'purchasable' | 'skillTree' | 'dropOnly';

export interface Recipe {
  id: string;
  name: string;
  category: 'weapon' | 'armor' | 'consumable' | 'material';
  subCategory: string;
  acquisition: RecipeAcquisition;
  profession: string;
  unlockNode?: string;
  dropSource?: string;
  purchaseCost?: number;
  tierRange: [number, number];
  description: string;
}

const ARMOR_SLOTS = ['helm', 'shoulder', 'chest', 'hands', 'feet', 'ring', 'necklace', 'relic'] as const;
const ARMOR_SETS = ['bloodfeud', 'wraithfang', 'oathbreaker', 'kinrend', 'dusksinger', 'emberclad'] as const;
const ARMOR_MATERIALS = ['cloth', 'leather', 'metal'] as const;

function generateWeaponRecipes(): Recipe[] {
  const recipes: Recipe[] = [];
  
  const professionMap: Record<string, string> = {
    swords: 'Miner', axes1h: 'Miner', daggers: 'Miner', greatswords: 'Miner',
    greataxes: 'Miner', hammers1h: 'Miner', hammers2h: 'Miner',
    spears: 'Miner', maces: 'Miner',
    daggersShared: 'Miner',
    bows: 'Forester', natureStaves: 'Forester',
    crossbows: 'Engineer', guns: 'Engineer',
    fireStaves: 'Mystic', frostStaves: 'Mystic', holyStaves: 'Mystic',
    lightningStaves: 'Mystic', arcaneStaves: 'Mystic', thunderGrudge: 'Mystic'
  };

  const dropOnlyWeapons = new Set([
    'doomspire', 'skullsplitter', 'shadowflight', 'skullpiercer', 'bloodcannon',
    'glacialspire', 'voidspire', 'doomhammer', 'divine-judgment', 'chaos-spire'
  ]);

  const skillTreeWeapons = new Set([
    'bloodfeud-blade', 'oathbreaker', 'kinrend', 'dusksinger', 'emberclad',
    'gorehowl', 'bloodshiv', 'titanmaul', 'skullsunder', 'bloodreaver',
    'wraithbone', 'bloodstring', 'verdant-wrath', 'thorn-grudge',
    'ironveil', 'blackpowder', 'ironstorm',
    'emberwrath', 'sunfire', 'inferno-spire', 'frostbite', 'winter-grudge',
    'dawnspire', 'redemption', 'sacred-light', 'stormwrath', 'tempest-spire',
    'arcane-fury', 'mystic-grudge', 'ether-heart'
  ]);

  Object.entries(WEAPON_SETS).forEach(([category, weapons]) => {
    const profession = professionMap[category] || 'Miner';
    
    weapons.forEach((weapon, index) => {
      let acquisition: RecipeAcquisition = 'purchasable';
      let dropSource: string | undefined;
      let unlockNode: string | undefined;
      let purchaseCost: number | undefined;
      
      if (dropOnlyWeapons.has(weapon.id)) {
        acquisition = 'dropOnly';
        dropSource = 'Boss chests, Elite dungeons, World events';
      } else if (skillTreeWeapons.has(weapon.id)) {
        acquisition = 'skillTree';
        unlockNode = `${profession} Master Crafter`;
      } else {
        acquisition = 'purchasable';
        purchaseCost = 500 + (index * 250);
      }

      recipes.push({
        id: `recipe-${weapon.id}`,
        name: weapon.name,
        category: 'weapon',
        subCategory: category,
        acquisition,
        profession,
        unlockNode,
        dropSource,
        purchaseCost,
        tierRange: [1, 8],
        description: weapon.lore
      });
    });
  });

  return recipes;
}

function generateArmorRecipes(): Recipe[] {
  const recipes: Recipe[] = [];

  const materialProfession: Record<string, string> = {
    cloth: 'Mystic',
    leather: 'Forester',
    metal: 'Miner'
  };

  const dropOnlyPatterns = [
    { set: 'bloodfeud', slot: 'helm' },
    { set: 'bloodfeud', slot: 'relic' },
    { set: 'wraithfang', slot: 'chest' },
    { set: 'wraithfang', slot: 'necklace' },
    { set: 'oathbreaker', slot: 'helm' },
    { set: 'oathbreaker', slot: 'relic' },
  ];

  const skillTreePatterns = [
    { set: 'kinrend', slot: 'helm' },
    { set: 'kinrend', slot: 'shoulder' },
    { set: 'kinrend', slot: 'chest' },
    { set: 'kinrend', slot: 'hands' },
    { set: 'dusksinger', slot: 'helm' },
    { set: 'dusksinger', slot: 'shoulder' },
    { set: 'dusksinger', slot: 'chest' },
    { set: 'dusksinger', slot: 'feet' },
    { set: 'emberclad', slot: 'helm' },
    { set: 'emberclad', slot: 'shoulder' },
    { set: 'emberclad', slot: 'hands' },
    { set: 'emberclad', slot: 'relic' },
    { set: 'bloodfeud', slot: 'shoulder' },
    { set: 'bloodfeud', slot: 'hands' },
    { set: 'wraithfang', slot: 'shoulder' },
    { set: 'wraithfang', slot: 'hands' },
    { set: 'oathbreaker', slot: 'shoulder' },
    { set: 'oathbreaker', slot: 'chest' },
  ];

  const isDropOnly = (set: string, slot: string) => 
    dropOnlyPatterns.some(p => p.set === set && p.slot === slot);
  
  const isSkillTree = (set: string, slot: string) =>
    skillTreePatterns.some(p => p.set === set && p.slot === slot);

  ARMOR_MATERIALS.forEach(material => {
    const profession = materialProfession[material];
    
    ARMOR_SETS.forEach((set, setIndex) => {
      ARMOR_SLOTS.forEach((slot, slotIndex) => {
        const id = `${set}-${material}-${slot}`;
        const name = `${set.charAt(0).toUpperCase() + set.slice(1)} ${material.charAt(0).toUpperCase() + material.slice(1)} ${slot.charAt(0).toUpperCase() + slot.slice(1)}`;
        
        let acquisition: RecipeAcquisition = 'purchasable';
        let dropSource: string | undefined;
        let unlockNode: string | undefined;
        let purchaseCost: number | undefined;
        
        if (isDropOnly(set, slot)) {
          acquisition = 'dropOnly';
          dropSource = 'Raid bosses, World events, Elite dungeons';
        } else if (isSkillTree(set, slot)) {
          acquisition = 'skillTree';
          unlockNode = `${profession} Armorsmith`;
        } else {
          acquisition = 'purchasable';
          purchaseCost = 300 + (setIndex * 100) + (slotIndex * 50);
        }

        recipes.push({
          id: `recipe-${id}`,
          name,
          category: 'armor',
          subCategory: `${material}-${slot}`,
          acquisition,
          profession,
          unlockNode,
          dropSource,
          purchaseCost,
          tierRange: [1, 8],
          description: `${set.charAt(0).toUpperCase() + set.slice(1)} set ${slot} made of ${material}`
        });
      });
    });
  });

  return recipes;
}

function generateConsumableRecipes(): Recipe[] {
  const consumables = [
    // === CHEF POTIONS (20) ===
    { id: 'health-potion', name: 'Health Potion', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 100, sub: 'potion' },
    { id: 'mana-potion', name: 'Mana Potion', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 100, sub: 'potion' },
    { id: 'stamina-potion', name: 'Stamina Potion', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 100, sub: 'potion' },
    { id: 'strength-elixir', name: 'Strength Elixir', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Elixir Brewer', sub: 'potion' },
    { id: 'defense-elixir', name: 'Defense Elixir', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Elixir Brewer', sub: 'potion' },
    { id: 'speed-elixir', name: 'Speed Elixir', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Elixir Brewer', sub: 'potion' },
    { id: 'focus-tonic', name: 'Focus Tonic', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 150, sub: 'potion' },
    { id: 'resistance-potion', name: 'Resistance Potion', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 150, sub: 'potion' },
    { id: 'rage-potion', name: 'Rage Potion', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Battle Alchemist', sub: 'potion' },
    { id: 'invisibility-elixir', name: 'Invisibility Elixir', profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Shadow dungeons', sub: 'potion' },
    { id: 'fire-resist-potion', name: 'Fire Resistance Potion', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 120, sub: 'potion' },
    { id: 'frost-resist-potion', name: 'Frost Resistance Potion', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 120, sub: 'potion' },
    { id: 'poison-cure', name: 'Poison Cure', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 80, sub: 'potion' },
    { id: 'regeneration-potion', name: 'Regeneration Potion', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Herbalist', sub: 'potion' },
    { id: 'titan-elixir', name: 'Titan Elixir', profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Titan raids', sub: 'potion' },
    { id: 'berserker-brew', name: 'Berserker Brew', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Battle Alchemist', sub: 'potion' },
    { id: 'arcane-elixir', name: 'Arcane Elixir', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Mystic Brewer', sub: 'potion' },
    { id: 'divine-elixir', name: 'Divine Elixir', profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Holy temples', sub: 'potion' },
    { id: 'shadow-potion', name: 'Shadow Potion', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Dark Alchemist', sub: 'potion' },
    { id: 'giants-blood', name: "Giant's Blood", profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Giant world bosses', sub: 'potion' },
    
    // === CHEF RED FOODS - Meat (20) ===
    { id: 'roast-beef', name: 'Roast Beef', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 80, sub: 'food-red' },
    { id: 'grilled-steak', name: 'Grilled Steak', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 100, sub: 'food-red' },
    { id: 'smoked-ham', name: 'Smoked Ham', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 90, sub: 'food-red' },
    { id: 'honey-glazed-ribs', name: 'Honey Glazed Ribs', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Butcher', sub: 'food-red' },
    { id: 'dragon-steak', name: 'Dragon Steak', profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Dragon lairs', sub: 'food-red' },
    { id: 'boar-roast', name: 'Boar Roast', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 85, sub: 'food-red' },
    { id: 'venison-chops', name: 'Venison Chops', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 95, sub: 'food-red' },
    { id: 'bacon-strips', name: 'Bacon Strips', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 60, sub: 'food-red' },
    { id: 'sausage-links', name: 'Sausage Links', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 70, sub: 'food-red' },
    { id: 'meat-pie', name: 'Meat Pie', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Pie Baker', sub: 'food-red' },
    { id: 'prime-rib', name: 'Prime Rib', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Master Chef', sub: 'food-red' },
    { id: 'lamb-shank', name: 'Lamb Shank', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 110, sub: 'food-red' },
    { id: 'turkey-leg', name: 'Turkey Leg', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 75, sub: 'food-red' },
    { id: 'chicken-wings', name: 'Chicken Wings', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 65, sub: 'food-red' },
    { id: 'beef-jerky', name: 'Beef Jerky', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 50, sub: 'food-red' },
    { id: 'rabbit-stew', name: 'Rabbit Stew', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 80, sub: 'food-red' },
    { id: 'hunters-feast', name: "Hunter's Feast", profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Grand Chef', sub: 'food-red' },
    { id: 'beast-platter', name: 'Beast Platter', profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Hunting grounds', sub: 'food-red' },
    { id: 'titan-steak', name: 'Titan Steak', profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Titan raids', sub: 'food-red' },
    { id: 'divine-roast', name: 'Divine Roast', profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Holy temples', sub: 'food-red' },
    
    // === CHEF GREEN FOODS - Vegetables (20) ===
    { id: 'garden-salad', name: 'Garden Salad', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 40, sub: 'food-green' },
    { id: 'grilled-vegetables', name: 'Grilled Vegetables', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 50, sub: 'food-green' },
    { id: 'stuffed-peppers', name: 'Stuffed Peppers', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 60, sub: 'food-green' },
    { id: 'mushroom-medley', name: 'Mushroom Medley', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Forager', sub: 'food-green' },
    { id: 'herb-salad', name: 'Herb Salad', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 45, sub: 'food-green' },
    { id: 'roasted-corn', name: 'Roasted Corn', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 35, sub: 'food-green' },
    { id: 'baked-potato', name: 'Baked Potato', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 30, sub: 'food-green' },
    { id: 'carrot-cake', name: 'Carrot Cake', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Pastry Chef', sub: 'food-green' },
    { id: 'spinach-quiche', name: 'Spinach Quiche', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Gourmet', sub: 'food-green' },
    { id: 'veggie-burger', name: 'Veggie Burger', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 70, sub: 'food-green' },
    { id: 'pumpkin-soup', name: 'Pumpkin Soup', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 55, sub: 'food-green' },
    { id: 'pickled-vegetables', name: 'Pickled Vegetables', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 40, sub: 'food-green' },
    { id: 'stuffed-mushrooms', name: 'Stuffed Mushrooms', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Forager', sub: 'food-green' },
    { id: 'vegetable-curry', name: 'Vegetable Curry', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Spice Master', sub: 'food-green' },
    { id: 'forest-feast', name: 'Forest Feast', profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Forest spirits', sub: 'food-green' },
    { id: 'druids-bounty', name: "Druid's Bounty", profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Sacred groves', sub: 'food-green' },
    { id: 'enchanted-greens', name: 'Enchanted Greens', profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Fey gardens', sub: 'food-green' },
    { id: 'harvest-platter', name: 'Harvest Platter', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Grand Chef', sub: 'food-green' },
    { id: 'farmers-delight', name: "Farmer's Delight", profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 65, sub: 'food-green' },
    { id: 'nature-blessing', name: "Nature's Blessing", profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Nature temples', sub: 'food-green' },
    
    // === CHEF BLUE FOODS - Stews/Fish (20) ===
    { id: 'fish-stew', name: 'Fish Stew', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 70, sub: 'food-blue' },
    { id: 'clam-chowder', name: 'Clam Chowder', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 80, sub: 'food-blue' },
    { id: 'grilled-salmon', name: 'Grilled Salmon', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 90, sub: 'food-blue' },
    { id: 'shrimp-cocktail', name: 'Shrimp Cocktail', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Seafood Chef', sub: 'food-blue' },
    { id: 'lobster-tail', name: 'Lobster Tail', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Master Chef', sub: 'food-blue' },
    { id: 'crab-cakes', name: 'Crab Cakes', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 85, sub: 'food-blue' },
    { id: 'seafood-platter', name: 'Seafood Platter', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Grand Chef', sub: 'food-blue' },
    { id: 'ocean-stew', name: 'Ocean Stew', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 75, sub: 'food-blue' },
    { id: 'fishermans-catch', name: "Fisherman's Catch", profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 65, sub: 'food-blue' },
    { id: 'sushi-roll', name: 'Sushi Roll', profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Eastern Cuisine', sub: 'food-blue' },
    { id: 'hearty-stew', name: 'Hearty Stew', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 60, sub: 'food-blue' },
    { id: 'beef-stew', name: 'Beef Stew', profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 70, sub: 'food-blue' },
    { id: 'hunters-stew', name: "Hunter's Stew", profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 80, sub: 'food-blue' },
    { id: 'warriors-stew', name: "Warrior's Stew", profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Battle Cook', sub: 'food-blue' },
    { id: 'leviathan-stew', name: 'Leviathan Stew', profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Sea monsters', sub: 'food-blue' },
    { id: 'kraken-tentacle', name: 'Kraken Tentacle', profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Kraken battles', sub: 'food-blue' },
    { id: 'divine-feast', name: 'Divine Feast', profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Epic world bosses', sub: 'food-blue' },
    { id: 'mermaid-sashimi', name: 'Mermaid Sashimi', profession: 'Chef', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Underwater temples', sub: 'food-blue' },
    { id: 'sailors-special', name: "Sailor's Special", profession: 'Chef', acquisition: 'purchasable' as RecipeAcquisition, cost: 55, sub: 'food-blue' },
    { id: 'captains-feast', name: "Captain's Feast", profession: 'Chef', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Naval Cook', sub: 'food-blue' },
    
    // === FORESTER UTILITY (10) ===
    { id: 'bandage', name: 'Bandage', profession: 'Forester', acquisition: 'purchasable' as RecipeAcquisition, cost: 50, sub: 'utility' },
    { id: 'advanced-bandage', name: 'Advanced Bandage', profession: 'Forester', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Field Medic', sub: 'utility' },
    { id: 'master-bandage', name: 'Master Bandage', profession: 'Forester', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Healer dungeons', sub: 'utility' },
    { id: 'poison-antidote', name: 'Poison Antidote', profession: 'Forester', acquisition: 'purchasable' as RecipeAcquisition, cost: 80, sub: 'utility' },
    { id: 'herbal-salve', name: 'Herbal Salve', profession: 'Forester', acquisition: 'purchasable' as RecipeAcquisition, cost: 60, sub: 'utility' },
    { id: 'hunters-trap', name: "Hunter's Trap", profession: 'Forester', acquisition: 'purchasable' as RecipeAcquisition, cost: 100, sub: 'utility' },
    { id: 'camouflage-kit', name: 'Camouflage Kit', profession: 'Forester', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Tracker', sub: 'utility' },
    { id: 'arrow-bundle', name: 'Arrow Bundle', profession: 'Forester', acquisition: 'purchasable' as RecipeAcquisition, cost: 40, sub: 'utility' },
    { id: 'fire-arrows', name: 'Fire Arrows', profession: 'Forester', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Elemental Fletcher', sub: 'utility' },
    { id: 'poison-arrows', name: 'Poison Arrows', profession: 'Forester', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Toxicologist', sub: 'utility' },
    
    // === ENGINEER UTILITY (15) ===
    { id: 'grenade', name: 'Grenade', profession: 'Engineer', acquisition: 'purchasable' as RecipeAcquisition, cost: 200, sub: 'utility' },
    { id: 'sticky-bomb', name: 'Sticky Bomb', profession: 'Engineer', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Demolition Expert', sub: 'utility' },
    { id: 'siege-bomb', name: 'Siege Bomb', profession: 'Engineer', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Siege events', sub: 'utility' },
    { id: 'smoke-bomb', name: 'Smoke Bomb', profession: 'Engineer', acquisition: 'purchasable' as RecipeAcquisition, cost: 120, sub: 'utility' },
    { id: 'flash-bomb', name: 'Flash Bomb', profession: 'Engineer', acquisition: 'purchasable' as RecipeAcquisition, cost: 150, sub: 'utility' },
    { id: 'caltrops', name: 'Caltrops', profession: 'Engineer', acquisition: 'purchasable' as RecipeAcquisition, cost: 80, sub: 'utility' },
    { id: 'turret-kit', name: 'Turret Kit', profession: 'Engineer', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Automata Master', sub: 'utility' },
    { id: 'repair-kit', name: 'Repair Kit', profession: 'Engineer', acquisition: 'purchasable' as RecipeAcquisition, cost: 100, sub: 'utility' },
    { id: 'ammo-crate', name: 'Ammo Crate', profession: 'Engineer', acquisition: 'purchasable' as RecipeAcquisition, cost: 150, sub: 'utility' },
    { id: 'siege-kit', name: 'Siege Kit', profession: 'Engineer', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Siege Master', sub: 'utility' },
    { id: 'flying-drone', name: 'Flying Drone', profession: 'Engineer', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Tech dungeons', sub: 'utility' },
    { id: 'emp-grenade', name: 'EMP Grenade', profession: 'Engineer', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Tech Specialist', sub: 'utility' },
    { id: 'healing-drone', name: 'Healing Drone', profession: 'Engineer', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Medical Engineer', sub: 'utility' },
    { id: 'portable-forge', name: 'Portable Forge', profession: 'Engineer', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Field Engineer', sub: 'utility' },
    { id: 'mechanical-mount', name: 'Mechanical Mount', profession: 'Engineer', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Mech dungeons', sub: 'utility' },
    
    // === MINER MATERIALS (15) ===
    { id: 'refining-flux', name: 'Refining Flux', profession: 'Miner', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Master Smelter', sub: 'material' },
    { id: 'copper-ingot', name: 'Copper Ingot', profession: 'Miner', acquisition: 'purchasable' as RecipeAcquisition, cost: 50, sub: 'material' },
    { id: 'iron-ingot', name: 'Iron Ingot', profession: 'Miner', acquisition: 'purchasable' as RecipeAcquisition, cost: 100, sub: 'material' },
    { id: 'steel-ingot', name: 'Steel Ingot', profession: 'Miner', acquisition: 'purchasable' as RecipeAcquisition, cost: 200, sub: 'material' },
    { id: 'mithril-ingot', name: 'Mithril Ingot', profession: 'Miner', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Rare Metals', sub: 'material' },
    { id: 'adamantine-ingot', name: 'Adamantine Ingot', profession: 'Miner', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Master Smelter', sub: 'material' },
    { id: 'orichalcum-ingot', name: 'Orichalcum Ingot', profession: 'Miner', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Legendary Smelter', sub: 'material' },
    { id: 'starmetal-ingot', name: 'Starmetal Ingot', profession: 'Miner', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Meteor sites', sub: 'material' },
    { id: 'divine-ingot', name: 'Divine Ingot', profession: 'Miner', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Divine forges', sub: 'material' },
    { id: 'iron-shield', name: 'Iron Shield', profession: 'Miner', acquisition: 'purchasable' as RecipeAcquisition, cost: 150, sub: 'shield' },
    { id: 'steel-shield', name: 'Steel Shield', profession: 'Miner', acquisition: 'purchasable' as RecipeAcquisition, cost: 300, sub: 'shield' },
    { id: 'tower-shield', name: 'Tower Shield', profession: 'Miner', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Shield Smith', sub: 'shield' },
    { id: 'mithril-buckler', name: 'Mithril Buckler', profession: 'Miner', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Master Smith', sub: 'shield' },
    { id: 'divine-aegis', name: 'Divine Aegis', profession: 'Miner', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Divine temples', sub: 'shield' },
    { id: 'grudge-bulwark', name: 'Grudge Bulwark', profession: 'Miner', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Grudge lords', sub: 'shield' },
    
    // === MYSTIC ENCHANTS & MATERIALS (15) ===
    { id: 'enhancement-crystal', name: 'Enhancement Crystal', profession: 'Mystic', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Crystal Weaver', sub: 'material' },
    { id: 'divine-crystal', name: 'Divine Crystal', profession: 'Mystic', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Arcane dungeons', sub: 'material' },
    { id: 'minor-essence', name: 'Minor Essence', profession: 'Mystic', acquisition: 'purchasable' as RecipeAcquisition, cost: 50, sub: 'material' },
    { id: 'greater-essence', name: 'Greater Essence', profession: 'Mystic', acquisition: 'purchasable' as RecipeAcquisition, cost: 150, sub: 'material' },
    { id: 'refined-essence', name: 'Refined Essence', profession: 'Mystic', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Essence Refiner', sub: 'material' },
    { id: 'ancient-essence', name: 'Ancient Essence', profession: 'Mystic', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Ancient ruins', sub: 'material' },
    { id: 'strength-enchant', name: 'Strength Enchant', profession: 'Mystic', acquisition: 'purchasable' as RecipeAcquisition, cost: 200, sub: 'enchant' },
    { id: 'intellect-enchant', name: 'Intellect Enchant', profession: 'Mystic', acquisition: 'purchasable' as RecipeAcquisition, cost: 200, sub: 'enchant' },
    { id: 'speed-enchant', name: 'Speed Enchant', profession: 'Mystic', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Glyph Mastery', sub: 'enchant' },
    { id: 'lifesteal-enchant', name: 'Lifesteal Enchant', profession: 'Mystic', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Blood Magic', sub: 'enchant' },
    { id: 'fire-enchant', name: 'Fire Enchant', profession: 'Mystic', acquisition: 'purchasable' as RecipeAcquisition, cost: 250, sub: 'enchant' },
    { id: 'frost-enchant', name: 'Frost Enchant', profession: 'Mystic', acquisition: 'purchasable' as RecipeAcquisition, cost: 250, sub: 'enchant' },
    { id: 'arcane-enchant', name: 'Arcane Enchant', profession: 'Mystic', acquisition: 'skillTree' as RecipeAcquisition, unlockNode: 'Arcane Mastery', sub: 'enchant' },
    { id: 'divine-enchant', name: 'Divine Enchant', profession: 'Mystic', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Holy temples', sub: 'enchant' },
    { id: 'void-enchant', name: 'Void Enchant', profession: 'Mystic', acquisition: 'dropOnly' as RecipeAcquisition, dropSource: 'Void rifts', sub: 'enchant' },
  ];

  return consumables.map(c => ({
    id: `recipe-${c.id}`,
    name: c.name,
    category: 'consumable' as const,
    subCategory: c.sub || 'utility',
    acquisition: c.acquisition,
    profession: c.profession,
    unlockNode: c.unlockNode,
    dropSource: c.dropSource,
    purchaseCost: c.cost,
    tierRange: [1, 8] as [number, number],
    description: `Craftable ${c.name.toLowerCase()}`
  }));
}

export const ALL_RECIPES: Recipe[] = [
  ...generateWeaponRecipes(),
  ...generateArmorRecipes(),
  ...generateConsumableRecipes()
];

export function getRecipesByAcquisition(acquisition: RecipeAcquisition): Recipe[] {
  return ALL_RECIPES.filter(r => r.acquisition === acquisition);
}

export function getPurchasableRecipes(): Recipe[] {
  return ALL_RECIPES.filter(r => r.acquisition === 'purchasable');
}

export function getSkillTreeRecipes(): Recipe[] {
  return ALL_RECIPES.filter(r => r.acquisition === 'skillTree');
}

export function getDropOnlyRecipes(): Recipe[] {
  return ALL_RECIPES.filter(r => r.acquisition === 'dropOnly');
}

export function getRecipesByProfession(profession: string): Recipe[] {
  return ALL_RECIPES.filter(r => r.profession === profession);
}

export function getRecipesByCategory(category: Recipe['category']): Recipe[] {
  return ALL_RECIPES.filter(r => r.category === category);
}

export function getRecipeById(id: string): Recipe | undefined {
  return ALL_RECIPES.find(r => r.id === id);
}

export function calculateQualityChance(baseTier: number, materialTier: number): { 
  normal: number; 
  enhanced: number; 
  masterwork: number; 
  legendary: number 
} {
  const tierDiff = materialTier - baseTier;
  
  if (tierDiff <= 0) {
    return { normal: 85, enhanced: 12, masterwork: 2.5, legendary: 0.5 };
  } else if (tierDiff === 1) {
    return { normal: 70, enhanced: 22, masterwork: 6, legendary: 2 };
  } else if (tierDiff === 2) {
    return { normal: 55, enhanced: 30, masterwork: 11, legendary: 4 };
  } else if (tierDiff >= 3) {
    return { normal: 40, enhanced: 35, masterwork: 18, legendary: 7 };
  }
  
  return { normal: 85, enhanced: 12, masterwork: 2.5, legendary: 0.5 };
}

const purchasable = ALL_RECIPES.filter(r => r.acquisition === 'purchasable').length;
const skillTree = ALL_RECIPES.filter(r => r.acquisition === 'skillTree').length;
const dropOnly = ALL_RECIPES.filter(r => r.acquisition === 'dropOnly').length;

export const RECIPE_STATS = {
  total: ALL_RECIPES.length,
  purchasable,
  skillTree,
  dropOnly,
  purchasablePercent: Math.round((purchasable / ALL_RECIPES.length) * 100),
  skillTreePercent: Math.round((skillTree / ALL_RECIPES.length) * 100),
  dropOnlyPercent: Math.round((dropOnly / ALL_RECIPES.length) * 100),
};

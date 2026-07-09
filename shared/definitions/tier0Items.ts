export interface T0ItemDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'consumable' | 'equipment' | 'material' | 'weapon' | 'accessory' | 'offhand';
  subType?: string;
  slot?: string;
  stats?: Record<string, number>;
  effect?: string;
  stackable: boolean;
  maxStack?: number;
  sellValue: number;
  craftable: boolean;
  craftingRecipe?: T0CraftingRecipe;
  usedInT1Crafting?: string[];
}

export interface T0CraftingRecipe {
  ingredients: { itemId: string; quantity: number }[];
  profession?: string;
  professionLevel?: number;
  craftTime?: number;
  gold?: number;
}

export const T0_CONSUMABLES: Record<string, T0ItemDefinition> = {
  t0_health_potion: {
    id: 't0_health_potion',
    name: 'Weak Health Potion',
    description: 'A crude potion that restores a small amount of health.',
    icon: '🧪',
    type: 'consumable',
    subType: 'potion',
    effect: 'Restores 25 HP',
    stackable: true,
    maxStack: 50,
    sellValue: 2,
    craftable: true,
    craftingRecipe: {
      ingredients: [
        { itemId: 't0_herb', quantity: 2 },
        { itemId: 't0_water_vial', quantity: 1 }
      ],
      profession: 'Alchemy',
      professionLevel: 1,
      craftTime: 5,
      gold: 1
    },
    usedInT1Crafting: ['health_potion']
  },
  t0_mana_potion: {
    id: 't0_mana_potion',
    name: 'Weak Mana Potion',
    description: 'A basic potion that restores a small amount of mana.',
    icon: '💧',
    type: 'consumable',
    subType: 'potion',
    effect: 'Restores 15 Mana',
    stackable: true,
    maxStack: 50,
    sellValue: 2,
    craftable: true,
    craftingRecipe: {
      ingredients: [
        { itemId: 't0_moonflower', quantity: 2 },
        { itemId: 't0_water_vial', quantity: 1 }
      ],
      profession: 'Alchemy',
      professionLevel: 1,
      craftTime: 5,
      gold: 1
    },
    usedInT1Crafting: ['mana_potion']
  },
  t0_cooked_meat: {
    id: 't0_cooked_meat',
    name: 'Charred Meat',
    description: 'Barely edible meat that provides minimal sustenance.',
    icon: '🍖',
    type: 'consumable',
    subType: 'food',
    effect: 'Restores 10 HP over 10s, +2 Stamina Regen',
    stackable: true,
    maxStack: 50,
    sellValue: 1,
    craftable: true,
    craftingRecipe: {
      ingredients: [
        { itemId: 't0_raw_meat', quantity: 1 }
      ],
      profession: 'Cooking',
      professionLevel: 1,
      craftTime: 3,
      gold: 0
    },
    usedInT1Crafting: ['cooked_meat']
  },
  t0_cooked_fish: {
    id: 't0_cooked_fish',
    name: 'Smoked Fish',
    description: 'A simply prepared fish that provides light nourishment.',
    icon: '🐟',
    type: 'consumable',
    subType: 'food',
    effect: 'Restores 8 HP over 10s, +3 Mana Regen',
    stackable: true,
    maxStack: 50,
    sellValue: 1,
    craftable: true,
    craftingRecipe: {
      ingredients: [
        { itemId: 't0_raw_fish', quantity: 1 }
      ],
      profession: 'Cooking',
      professionLevel: 1,
      craftTime: 3,
      gold: 0
    },
    usedInT1Crafting: ['cooked_fish']
  }
};

export const T0_MATERIALS: Record<string, T0ItemDefinition> = {
  t0_herb: {
    id: 't0_herb',
    name: 'Common Herb',
    description: 'A basic herb found growing wild.',
    icon: '🌿',
    type: 'material',
    subType: 'herb',
    stackable: true,
    maxStack: 200,
    sellValue: 1,
    craftable: false,
    usedInT1Crafting: ['herb_bundle']
  },
  t0_moonflower: {
    id: 't0_moonflower',
    name: 'Moonflower Petal',
    description: 'A pale petal with faint magical properties.',
    icon: '🌸',
    type: 'material',
    subType: 'herb',
    stackable: true,
    maxStack: 200,
    sellValue: 1,
    craftable: false,
    usedInT1Crafting: ['moonflower_bundle']
  },
  t0_water_vial: {
    id: 't0_water_vial',
    name: 'Water Vial',
    description: 'A small vial of clean water.',
    icon: '💧',
    type: 'material',
    subType: 'reagent',
    stackable: true,
    maxStack: 200,
    sellValue: 1,
    craftable: false
  },
  t0_raw_meat: {
    id: 't0_raw_meat',
    name: 'Raw Meat',
    description: 'Uncooked meat from wild game.',
    icon: '🥩',
    type: 'material',
    subType: 'meat',
    stackable: true,
    maxStack: 100,
    sellValue: 1,
    craftable: false,
    usedInT1Crafting: ['quality_meat']
  },
  t0_raw_fish: {
    id: 't0_raw_fish',
    name: 'Raw Fish',
    description: 'A freshly caught fish.',
    icon: '🐟',
    type: 'material',
    subType: 'fish',
    stackable: true,
    maxStack: 100,
    sellValue: 1,
    craftable: false,
    usedInT1Crafting: ['quality_fish']
  },
  t0_grass_fiber: {
    id: 't0_grass_fiber',
    name: 'Grass Fiber',
    description: 'Rough plant fibers harvested from tall grass.',
    icon: '🌾',
    type: 'material',
    subType: 'fiber',
    stackable: true,
    maxStack: 200,
    sellValue: 1,
    craftable: false,
    usedInT1Crafting: ['woven_fiber']
  },
  t0_scrap_cloth: {
    id: 't0_scrap_cloth',
    name: 'Scrap Cloth',
    description: 'Rough cloth scraps suitable for basic crafting.',
    icon: '🧵',
    type: 'material',
    subType: 'cloth',
    stackable: true,
    maxStack: 200,
    sellValue: 1,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_grass_fiber', quantity: 3 }],
      profession: 'Tailoring',
      professionLevel: 1,
      craftTime: 2
    },
    usedInT1Crafting: ['fine_cloth']
  },
  t0_rough_leather: {
    id: 't0_rough_leather',
    name: 'Rough Hide',
    description: 'Untreated animal hide, stiff and unrefined.',
    icon: '🟤',
    type: 'material',
    subType: 'leather',
    stackable: true,
    maxStack: 200,
    sellValue: 1,
    craftable: false,
    usedInT1Crafting: ['cured_leather']
  },
  t0_scrap_metal: {
    id: 't0_scrap_metal',
    name: 'Scrap Metal',
    description: 'Bits of rusty metal that can be melted down.',
    icon: '⚙️',
    type: 'material',
    subType: 'ore',
    stackable: true,
    maxStack: 200,
    sellValue: 1,
    craftable: false,
    usedInT1Crafting: ['iron_ingot']
  },
  t0_wood_scrap: {
    id: 't0_wood_scrap',
    name: 'Wood Scraps',
    description: 'Small pieces of rough wood.',
    icon: '🪵',
    type: 'material',
    subType: 'wood',
    stackable: true,
    maxStack: 200,
    sellValue: 1,
    craftable: false,
    usedInT1Crafting: ['plank']
  }
};

export const T0_CLOTH_EQUIPMENT: Record<string, T0ItemDefinition> = {
  t0_cloth_helm: {
    id: 't0_cloth_helm',
    name: 'Tattered Hood',
    description: 'A worn cloth hood that offers minimal protection.',
    icon: '🎭',
    type: 'equipment',
    slot: 'Helm',
    subType: 'cloth',
    stats: { HP: 5, Mana: 10, Defense: 1 },
    stackable: false,
    sellValue: 3,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_scrap_cloth', quantity: 3 }],
      profession: 'Tailoring',
      professionLevel: 1,
      craftTime: 10,
      gold: 5
    },
    usedInT1Crafting: ['cloth_helm_t1']
  },
  t0_cloth_chest: {
    id: 't0_cloth_chest',
    name: 'Tattered Robe',
    description: 'A threadbare robe that barely keeps the cold out.',
    icon: '👘',
    type: 'equipment',
    slot: 'Chest',
    subType: 'cloth',
    stats: { HP: 8, Mana: 15, Defense: 2 },
    stackable: false,
    sellValue: 5,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_scrap_cloth', quantity: 5 }],
      profession: 'Tailoring',
      professionLevel: 1,
      craftTime: 15,
      gold: 8
    },
    usedInT1Crafting: ['cloth_chest_t1']
  },
  t0_cloth_hands: {
    id: 't0_cloth_hands',
    name: 'Frayed Gloves',
    description: 'Worn cloth gloves with holes in the fingers.',
    icon: '🧤',
    type: 'equipment',
    slot: 'Hands',
    subType: 'cloth',
    stats: { HP: 3, Mana: 8, Defense: 1 },
    stackable: false,
    sellValue: 2,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_scrap_cloth', quantity: 2 }],
      profession: 'Tailoring',
      professionLevel: 1,
      craftTime: 8,
      gold: 3
    },
    usedInT1Crafting: ['cloth_hands_t1']
  },
  t0_cloth_feet: {
    id: 't0_cloth_feet',
    name: 'Worn Sandals',
    description: 'Simple sandals made from cloth and rope.',
    icon: '🩴',
    type: 'equipment',
    slot: 'Feet',
    subType: 'cloth',
    stats: { HP: 4, Mana: 10, Defense: 1 },
    stackable: false,
    sellValue: 2,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_scrap_cloth', quantity: 2 }, { itemId: 't0_grass_fiber', quantity: 2 }],
      profession: 'Tailoring',
      professionLevel: 1,
      craftTime: 8,
      gold: 3
    },
    usedInT1Crafting: ['cloth_feet_t1']
  }
};

export const T0_LEATHER_EQUIPMENT: Record<string, T0ItemDefinition> = {
  t0_leather_helm: {
    id: 't0_leather_helm',
    name: 'Crude Leather Cap',
    description: 'A stiff leather cap that smells of animal.',
    icon: '🧢',
    type: 'equipment',
    slot: 'Helm',
    subType: 'leather',
    stats: { HP: 10, Evasion: 2, Defense: 3 },
    stackable: false,
    sellValue: 4,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_rough_leather', quantity: 3 }],
      profession: 'Leatherworking',
      professionLevel: 1,
      craftTime: 10,
      gold: 6
    },
    usedInT1Crafting: ['leather_helm_t1']
  },
  t0_leather_chest: {
    id: 't0_leather_chest',
    name: 'Crude Leather Vest',
    description: 'A poorly cured leather vest that provides basic protection.',
    icon: '🦺',
    type: 'equipment',
    slot: 'Chest',
    subType: 'leather',
    stats: { HP: 15, Evasion: 3, Defense: 5 },
    stackable: false,
    sellValue: 6,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_rough_leather', quantity: 5 }],
      profession: 'Leatherworking',
      professionLevel: 1,
      craftTime: 15,
      gold: 10
    },
    usedInT1Crafting: ['leather_chest_t1']
  },
  t0_leather_hands: {
    id: 't0_leather_hands',
    name: 'Crude Leather Gloves',
    description: 'Stiff leather gloves that restrict finger movement.',
    icon: '🧤',
    type: 'equipment',
    slot: 'Hands',
    subType: 'leather',
    stats: { HP: 6, Evasion: 1, Defense: 2 },
    stackable: false,
    sellValue: 3,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_rough_leather', quantity: 2 }],
      profession: 'Leatherworking',
      professionLevel: 1,
      craftTime: 8,
      gold: 4
    },
    usedInT1Crafting: ['leather_hands_t1']
  },
  t0_leather_feet: {
    id: 't0_leather_feet',
    name: 'Crude Leather Boots',
    description: 'Heavy leather boots that slow you down slightly.',
    icon: '👢',
    type: 'equipment',
    slot: 'Feet',
    subType: 'leather',
    stats: { HP: 8, Evasion: 2, Defense: 3 },
    stackable: false,
    sellValue: 4,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_rough_leather', quantity: 3 }],
      profession: 'Leatherworking',
      professionLevel: 1,
      craftTime: 10,
      gold: 5
    },
    usedInT1Crafting: ['leather_feet_t1']
  }
};

export const T0_METAL_EQUIPMENT: Record<string, T0ItemDefinition> = {
  t0_metal_helm: {
    id: 't0_metal_helm',
    name: 'Rusty Helmet',
    description: 'A dented iron helmet covered in rust.',
    icon: '⛑️',
    type: 'equipment',
    slot: 'Helm',
    subType: 'metal',
    stats: { HP: 15, Block: 2, Defense: 5 },
    stackable: false,
    sellValue: 5,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_scrap_metal', quantity: 4 }],
      profession: 'Smithing',
      professionLevel: 1,
      craftTime: 15,
      gold: 8
    },
    usedInT1Crafting: ['metal_helm_t1']
  },
  t0_metal_chest: {
    id: 't0_metal_chest',
    name: 'Rusty Breastplate',
    description: 'A heavy iron breastplate with several dents.',
    icon: '🛡️',
    type: 'equipment',
    slot: 'Chest',
    subType: 'metal',
    stats: { HP: 20, Block: 3, Defense: 8 },
    stackable: false,
    sellValue: 8,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_scrap_metal', quantity: 6 }],
      profession: 'Smithing',
      professionLevel: 1,
      craftTime: 20,
      gold: 12
    },
    usedInT1Crafting: ['metal_chest_t1']
  },
  t0_metal_hands: {
    id: 't0_metal_hands',
    name: 'Rusty Gauntlets',
    description: 'Iron gauntlets that creak when you flex your fingers.',
    icon: '🧤',
    type: 'equipment',
    slot: 'Hands',
    subType: 'metal',
    stats: { HP: 8, Block: 1, Defense: 3 },
    stackable: false,
    sellValue: 4,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_scrap_metal', quantity: 3 }],
      profession: 'Smithing',
      professionLevel: 1,
      craftTime: 12,
      gold: 6
    },
    usedInT1Crafting: ['metal_hands_t1']
  },
  t0_metal_feet: {
    id: 't0_metal_feet',
    name: 'Rusty Greaves',
    description: 'Heavy iron leg guards that slow your movement.',
    icon: '🦵',
    type: 'equipment',
    slot: 'Feet',
    subType: 'metal',
    stats: { HP: 12, Block: 2, Defense: 4 },
    stackable: false,
    sellValue: 5,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_scrap_metal', quantity: 4 }],
      profession: 'Smithing',
      professionLevel: 1,
      craftTime: 15,
      gold: 7
    },
    usedInT1Crafting: ['metal_feet_t1']
  }
};

export const T0_ACCESSORIES: Record<string, T0ItemDefinition> = {
  t0_ring: {
    id: 't0_ring',
    name: 'Tarnished Ring',
    description: 'A simple ring with a faded gemstone.',
    icon: '💍',
    type: 'accessory',
    slot: 'Ring',
    stats: { HP: 5, Mana: 5 },
    stackable: false,
    sellValue: 3,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_scrap_metal', quantity: 1 }],
      profession: 'Jewelcrafting',
      professionLevel: 1,
      craftTime: 8,
      gold: 5
    },
    usedInT1Crafting: ['copper_ring']
  },
  t0_necklace: {
    id: 't0_necklace',
    name: 'Frayed Cord Necklace',
    description: 'A cord necklace with a small charm.',
    icon: '📿',
    type: 'accessory',
    slot: 'Necklace',
    stats: { HP: 5, Mana: 5 },
    stackable: false,
    sellValue: 3,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_grass_fiber', quantity: 3 }, { itemId: 't0_scrap_metal', quantity: 1 }],
      profession: 'Jewelcrafting',
      professionLevel: 1,
      craftTime: 8,
      gold: 5
    },
    usedInT1Crafting: ['copper_necklace']
  },
  t0_back: {
    id: 't0_back',
    name: 'Ragged Cloak',
    description: 'A worn cloak that provides little warmth.',
    icon: '🧥',
    type: 'accessory',
    slot: 'Back',
    stats: { HP: 5, Defense: 1 },
    stackable: false,
    sellValue: 3,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_scrap_cloth', quantity: 4 }],
      profession: 'Tailoring',
      professionLevel: 1,
      craftTime: 12,
      gold: 6
    },
    usedInT1Crafting: ['wool_cloak']
  }
};

export const T0_OFFHAND: Record<string, T0ItemDefinition> = {
  t0_shield: {
    id: 't0_shield',
    name: 'Wooden Buckler',
    description: 'A small wooden shield with a cracked center.',
    icon: '🛡️',
    type: 'offhand',
    slot: 'Offhand',
    subType: 'shield',
    stats: { HP: 10, Block: 5, Defense: 3 },
    stackable: false,
    sellValue: 5,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_wood_scrap', quantity: 5 }, { itemId: 't0_scrap_metal', quantity: 2 }],
      profession: 'Woodworking',
      professionLevel: 1,
      craftTime: 15,
      gold: 8
    },
    usedInT1Crafting: ['iron_buckler']
  },
  t0_torch: {
    id: 't0_torch',
    name: 'Makeshift Torch',
    description: 'A crude torch that provides dim light.',
    icon: '🔥',
    type: 'offhand',
    slot: 'Offhand',
    subType: 'torch',
    stats: { LightRadius: 3 },
    effect: 'Illuminates dark areas',
    stackable: false,
    sellValue: 2,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_wood_scrap', quantity: 2 }, { itemId: 't0_scrap_cloth', quantity: 1 }],
      profession: 'Survival',
      professionLevel: 1,
      craftTime: 5,
      gold: 2
    },
    usedInT1Crafting: ['oil_torch']
  },
  t0_spellbook: {
    id: 't0_spellbook',
    name: 'Apprentice Grimoire',
    description: 'A small book with faded magical inscriptions.',
    icon: '📕',
    type: 'offhand',
    slot: 'Offhand',
    subType: 'spellbook',
    stats: { Mana: 15, SpellPower: 3 },
    stackable: false,
    sellValue: 5,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_wood_scrap', quantity: 2 }, { itemId: 't0_scrap_cloth', quantity: 2 }],
      profession: 'Inscription',
      professionLevel: 1,
      craftTime: 20,
      gold: 10
    },
    usedInT1Crafting: ['novice_grimoire']
  }
};

export const T0_WEAPONS: Record<string, T0ItemDefinition> = {
  t0_sword: {
    id: 't0_sword',
    name: 'Rusty Shortsword',
    description: 'A dull, rusty blade that can barely cut.',
    icon: '🗡️',
    type: 'weapon',
    subType: 'sword',
    stats: { 'Phys Dmg': 5 },
    stackable: false,
    sellValue: 3,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_scrap_metal', quantity: 3 }, { itemId: 't0_wood_scrap', quantity: 1 }],
      profession: 'Smithing',
      professionLevel: 1,
      craftTime: 15,
      gold: 8
    },
    usedInT1Crafting: ['iron_sword']
  },
  t0_axe: {
    id: 't0_axe',
    name: 'Worn Hatchet',
    description: 'A chipped hatchet better suited for kindling.',
    icon: '🪓',
    type: 'weapon',
    subType: 'axe',
    stats: { 'Phys Dmg': 6 },
    stackable: false,
    sellValue: 3,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_scrap_metal', quantity: 2 }, { itemId: 't0_wood_scrap', quantity: 2 }],
      profession: 'Smithing',
      professionLevel: 1,
      craftTime: 12,
      gold: 7
    },
    usedInT1Crafting: ['iron_axe']
  },
  t0_dagger: {
    id: 't0_dagger',
    name: 'Sharpened Bone',
    description: 'An animal bone sharpened to a point.',
    icon: '🦴',
    type: 'weapon',
    subType: 'dagger',
    stats: { 'Phys Dmg': 3, Crit: 5 },
    stackable: false,
    sellValue: 2,
    craftable: false,
    usedInT1Crafting: ['iron_dagger']
  },
  t0_bow: {
    id: 't0_bow',
    name: 'Crude Shortbow',
    description: 'A poorly strung bow with limited range.',
    icon: '🏹',
    type: 'weapon',
    subType: 'bow',
    stats: { 'Phys Dmg': 4, Range: 10 },
    stackable: false,
    sellValue: 3,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_wood_scrap', quantity: 3 }, { itemId: 't0_grass_fiber', quantity: 2 }],
      profession: 'Woodworking',
      professionLevel: 1,
      craftTime: 15,
      gold: 6
    },
    usedInT1Crafting: ['hunting_bow']
  },
  t0_staff: {
    id: 't0_staff',
    name: 'Gnarled Branch',
    description: 'A twisted branch that barely channels magic.',
    icon: '🪄',
    type: 'weapon',
    subType: 'staff',
    stats: { 'Mag Dmg': 4, Mana: 10 },
    stackable: false,
    sellValue: 2,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_wood_scrap', quantity: 3 }],
      profession: 'Woodworking',
      professionLevel: 1,
      craftTime: 10,
      gold: 5
    },
    usedInT1Crafting: ['oak_staff']
  },
  t0_hammer: {
    id: 't0_hammer',
    name: 'Stone Hammer',
    description: 'A heavy stone lashed to a wooden handle.',
    icon: '🔨',
    type: 'weapon',
    subType: 'hammer',
    stats: { 'Phys Dmg': 7, 'Atk Spd': -5 },
    stackable: false,
    sellValue: 3,
    craftable: true,
    craftingRecipe: {
      ingredients: [{ itemId: 't0_wood_scrap', quantity: 2 }, { itemId: 't0_grass_fiber', quantity: 2 }],
      profession: 'Smithing',
      professionLevel: 1,
      craftTime: 10,
      gold: 5
    },
    usedInT1Crafting: ['iron_hammer']
  }
};

export const ALL_T0_ITEMS: Record<string, T0ItemDefinition> = {
  ...T0_CONSUMABLES,
  ...T0_MATERIALS,
  ...T0_CLOTH_EQUIPMENT,
  ...T0_LEATHER_EQUIPMENT,
  ...T0_METAL_EQUIPMENT,
  ...T0_ACCESSORIES,
  ...T0_OFFHAND,
  ...T0_WEAPONS
};

export function getT0Item(id: string): T0ItemDefinition | undefined {
  return ALL_T0_ITEMS[id];
}

export function getT0ItemsByType(type: T0ItemDefinition['type']): T0ItemDefinition[] {
  return Object.values(ALL_T0_ITEMS).filter(item => item.type === type);
}

export function getT0CraftableItems(): T0ItemDefinition[] {
  return Object.values(ALL_T0_ITEMS).filter(item => item.craftable && item.craftingRecipe);
}

export function getT0ItemsForT1Crafting(t1ItemId: string): T0ItemDefinition[] {
  return Object.values(ALL_T0_ITEMS).filter(item => 
    item.usedInT1Crafting?.includes(t1ItemId)
  );
}

export interface ClassStartingGear {
  equipment: Record<string, string>;
  inventory: { itemId: string; quantity: number; tier?: number }[];
}

/**
 * Freeform ARPG starter kit — same for everyone.
 * Soft "class" labels may still exist on the character sheet as flavor only.
 */
export const FREEFORM_STARTING_GEAR: ClassStartingGear = {
  equipment: {
    Chest: 't0_leather_chest',
    Hands: 't0_leather_hands',
    Feet: 't0_leather_feet',
    Weapon: 't0_sword',
  },
  inventory: [
    { itemId: 't0_torch', quantity: 1 },
    { itemId: 't0_bow', quantity: 1 },
    { itemId: 't0_staff', quantity: 1 },
  ],
};

/** @deprecated Use FREEFORM_STARTING_GEAR — kept so old call sites still resolve. */
export const CLASS_STARTING_GEAR: Record<string, ClassStartingGear> = {
  warrior: FREEFORM_STARTING_GEAR,
  mage: FREEFORM_STARTING_GEAR,
  ranger: FREEFORM_STARTING_GEAR,
  worg: FREEFORM_STARTING_GEAR,
  worge: FREEFORM_STARTING_GEAR,
  adventurer: FREEFORM_STARTING_GEAR,
};

/** Freeform: class id does not change starter loot. */
export function getClassStartingGear(_classId?: string): ClassStartingGear {
  return FREEFORM_STARTING_GEAR;
}

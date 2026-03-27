import { assetUrl } from "@/lib/assetConfig";
export interface SpriteSheet {
  id: string;
  name: string;
  path: string;
  width?: number;
  height?: number;
}

export const UI_SPRITES = {
  panels: {
    actionPanel: assetUrl("/sprites/ui/PNG/Action_panel.png"),
    characterPanel: assetUrl("/sprites/ui/PNG/character_panel.png"),
    inventory: assetUrl("/sprites/ui/PNG/Inventory.png"),
    equipment: assetUrl("/sprites/ui/PNG/Equipment.png"),
    craft: assetUrl("/sprites/ui/PNG/Craft.png"),
    shop: assetUrl("/sprites/ui/PNG/Shop.png"),
    settings: assetUrl("/sprites/ui/PNG/Settings.png"),
    mainMenu: assetUrl("/sprites/ui/PNG/Main_menu.png"),
    circleMenu: assetUrl("/sprites/ui/PNG/Circle_menu.png"),
    winLoose: assetUrl("/sprites/ui/PNG/Win_loose.png"),
    levels: assetUrl("/sprites/ui/PNG/Levels.png")
  },
  elements: {
    buttons: assetUrl("/sprites/ui/PNG/Buttons.png"),
    icons: assetUrl("/sprites/ui/PNG/Icons.png"),
    numbers: assetUrl("/sprites/ui/PNG/Numbers.png"),
    numbersLevels: assetUrl("/sprites/ui/PNG/Numbers_levels.png"),
    text1: assetUrl("/sprites/ui/PNG/Text1.png"),
    text2: assetUrl("/sprites/ui/PNG/Text2.png"),
    mainTiles: assetUrl("/sprites/ui/PNG/Main_tiles.png"),
    decorativeCracks: assetUrl("/sprites/ui/PNG/Decorative_cracks.png")
  }
};

export const EMOJI_ICONS = {
  withBackground: (id: number) => assetUrl(`/sprites/emoji/PNG/background/${id}.png`),
  transparent: (id: number) => assetUrl(`/sprites/emoji/PNG/without background/${id}.png`),
  count: 50
};

export const TINY_SWORDS = {
  buildings: {
    black: {
      archery: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Black Buildings/Archery.png"),
      barracks: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Black Buildings/Barracks.png"),
      castle: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Black Buildings/Castle.png"),
      house1: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Black Buildings/House1.png"),
      house2: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Black Buildings/House2.png"),
      house3: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Black Buildings/House3.png"),
      monastery: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Black Buildings/Monastery.png"),
      tower: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Black Buildings/Tower.png")
    },
    blue: {
      archery: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Blue Buildings/Archery.png"),
      barracks: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Blue Buildings/Barracks.png"),
      castle: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Blue Buildings/Castle.png"),
      house1: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Blue Buildings/House1.png"),
      house2: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Blue Buildings/House2.png"),
      house3: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Blue Buildings/House3.png"),
      monastery: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Blue Buildings/Monastery.png"),
      tower: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Blue Buildings/Tower.png")
    },
    red: {
      archery: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Red Buildings/Archery.png"),
      barracks: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Red Buildings/Barracks.png"),
      castle: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Red Buildings/Castle.png"),
      house1: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Red Buildings/House1.png"),
      house2: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Red Buildings/House2.png"),
      house3: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Red Buildings/House3.png"),
      monastery: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Red Buildings/Monastery.png"),
      tower: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Red Buildings/Tower.png")
    },
    yellow: {
      archery: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Yellow Buildings/Archery.png"),
      barracks: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Yellow Buildings/Barracks.png"),
      castle: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Yellow Buildings/Castle.png"),
      house1: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Yellow Buildings/House1.png"),
      house2: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Yellow Buildings/House2.png"),
      house3: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Yellow Buildings/House3.png"),
      monastery: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Yellow Buildings/Monastery.png"),
      tower: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets/Buildings/Yellow Buildings/Tower.png")
    }
  },
  basePath: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)/2DAssets")
};

export const ITEM_MODELS_3D = {
  weapons: {
    claymore: '/models/items/Claymore.glb',
    dagger: '/models/items/Dagger.glb',
    knife: '/models/items/Knife.glb',
    sword: '/models/items/Sword.glb',
    axeDouble: '/models/items/Axe Double.glb',
    axeSmall: '/models/items/Axe Small.glb',
    scythe: '/models/items/Scythe.glb',
    spear: '/models/items/Spear.glb',
    woodenBow: '/models/items/Wooden Bow.glb',
    arrow: '/models/items/Arrow.glb'
  },
  armor: {
    armorGolden: '/models/items/Armor Golden.glb',
    armorLeather: '/models/items/Armor Leather.glb',
    armorMetal: '/models/items/Armor Metal.glb',
    glove: '/models/items/Glove.glb',
    crown: '/models/items/Crown.glb'
  },
  shields: {
    shieldCelticGolden: '/models/items/Shield Celtic Golden.glb',
    shieldHeater: '/models/items/Shield Heater.glb',
    shieldRound: '/models/items/Shield Round.glb'
  },
  consumables: {
    potionBottle: '/models/items/Potion Bottle.glb',
    scroll: '/models/items/Scroll.glb',
    parchment: '/models/items/Parchment.glb'
  },
  valuables: {
    coin: '/models/items/Coin.glb',
    coinPouch: '/models/items/Coin Pouch.glb',
    goldIngots: '/models/items/Gold Ingots.glb',
    chalice: '/models/items/Chalice.glb',
    chest: '/models/items/Chest.glb',
    mineral: '/models/items/Mineral.glb',
    necklace: '/models/items/Necklace.glb'
  },
  misc: {
    book: '/models/items/Book.glb',
    bookOpen: '/models/items/Book Open.glb',
    backpack: '/models/items/Backpack.glb',
    bag: '/models/items/Bag.glb',
    bone: '/models/items/Bone.glb',
    skull: '/models/items/Skull.glb',
    key: '/models/items/Key.glb',
    padlock: '/models/items/Padlock.glb'
  }
};

export const getItemModel = (category: keyof typeof ITEM_MODELS_3D, item: string): string | undefined => {
  const cat = ITEM_MODELS_3D[category];
  return cat ? (cat as Record<string, string>)[item] : undefined;
};

export const getBuildingSprite = (faction: 'black' | 'blue' | 'red' | 'yellow', building: string): string | undefined => {
  const factionBuildings = TINY_SWORDS.buildings[faction];
  return factionBuildings ? (factionBuildings as Record<string, string>)[building] : undefined;
};

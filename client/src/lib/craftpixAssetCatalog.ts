import { assetUrl } from "@/lib/assetConfig";
export type SpriteCategory = 
  | "hero" 
  | "enemy" 
  | "magic" 
  | "icon" 
  | "ui" 
  | "building" 
  | "environment" 
  | "animal" 
  | "boat" 
  | "weapon"
  | "template";

export type AnimationType = 
  | "idle" 
  | "walk" 
  | "run" 
  | "attack" 
  | "hurt" 
  | "dead" 
  | "jump" 
  | "special";

export type SpriteDirection = "side" | "topdown" | "8-direction" | "4-direction";

export interface SpriteAsset {
  id: string;
  name: string;
  category: SpriteCategory;
  path: string;
  animations: AnimationType[];
  direction: SpriteDirection;
  frameSize?: { width: number; height: number };
  source?: string;
  usedIn?: string[];
}

export interface SpritePack {
  id: string;
  name: string;
  category: SpriteCategory;
  basePath: string;
  assets: SpriteAsset[];
  source: string;
}

export const CRAFTPIX_ASSET_CATALOG: SpritePack[] = [
  {
    id: "heroes-race",
    name: "Hero Race Sprites",
    category: "hero",
    basePath: assetUrl("/sprites/heroes"),
    source: "Craftpix",
    assets: [
      {
        id: "hero-barbarian",
        name: "Barbarian Hero",
        category: "hero",
        path: assetUrl("/sprites/heroes/barbarian"),
        animations: ["idle", "attack", "dead"],
        direction: "side",
        usedIn: ["character-builder", "dungeon-crawler"],
      },
      {
        id: "hero-dwarf",
        name: "Dwarf Hero",
        category: "hero",
        path: assetUrl("/sprites/heroes/dwarf"),
        animations: ["idle", "attack", "dead"],
        direction: "side",
        usedIn: ["character-builder", "dungeon-crawler"],
      },
      {
        id: "hero-elf",
        name: "Elf Hero",
        category: "hero",
        path: assetUrl("/sprites/heroes/elf"),
        animations: ["idle", "attack", "dead"],
        direction: "side",
        usedIn: ["character-builder", "dungeon-crawler"],
      },
      {
        id: "hero-human",
        name: "Human Hero",
        category: "hero",
        path: assetUrl("/sprites/heroes/human"),
        animations: ["idle", "attack", "dead"],
        direction: "side",
        usedIn: ["character-builder", "dungeon-crawler"],
      },
      {
        id: "hero-orc",
        name: "Orc Hero",
        category: "hero",
        path: assetUrl("/sprites/heroes/orc"),
        animations: ["idle", "attack", "dead"],
        direction: "side",
        usedIn: ["character-builder", "dungeon-crawler"],
      },
      {
        id: "hero-undead",
        name: "Undead Hero",
        category: "hero",
        path: assetUrl("/sprites/heroes/undead"),
        animations: ["idle", "attack", "dead"],
        direction: "side",
        usedIn: ["character-builder", "dungeon-crawler"],
      },
    ],
  },
  {
    id: "enemies-fantasy",
    name: "Fantasy Enemies",
    category: "enemy",
    basePath: assetUrl("/sprites/enemies/fantasy"),
    source: "Craftpix",
    assets: [
      {
        id: "enemy-skeleton",
        name: "Skeleton",
        category: "enemy",
        path: assetUrl("/sprites/enemies/fantasy/Skeleton"),
        animations: ["idle", "walk", "run", "attack", "hurt", "dead", "jump", "special"],
        direction: "side",
        usedIn: ["dungeon-crawler"],
      },
      {
        id: "enemy-fire-spirit",
        name: "Fire Spirit",
        category: "enemy",
        path: assetUrl("/sprites/enemies/fantasy/Fire_Spirit"),
        animations: ["idle", "walk", "run", "attack", "hurt", "dead"],
        direction: "side",
      },
      {
        id: "enemy-plent",
        name: "Plant Monster",
        category: "enemy",
        path: assetUrl("/sprites/enemies/fantasy/Plent"),
        animations: ["idle", "walk", "attack", "hurt", "dead"],
        direction: "side",
      },
    ],
  },
  {
    id: "enemies-vampire",
    name: "Vampire Enemies",
    category: "enemy",
    basePath: assetUrl("/sprites/enemies/vampire"),
    source: "Craftpix",
    assets: [
      {
        id: "enemy-converted-vampire",
        name: "Converted Vampire",
        category: "enemy",
        path: assetUrl("/sprites/enemies/vampire/Converted_Vampire"),
        animations: ["idle", "walk", "run", "attack", "hurt", "dead", "jump"],
        direction: "side",
      },
      {
        id: "enemy-countess-vampire",
        name: "Countess Vampire",
        category: "enemy",
        path: assetUrl("/sprites/enemies/vampire/Countess_Vampire"),
        animations: ["idle", "walk", "run", "attack", "hurt", "dead", "jump"],
        direction: "side",
      },
      {
        id: "enemy-vampire-girl",
        name: "Vampire Girl",
        category: "enemy",
        path: assetUrl("/sprites/enemies/vampire/Vampire_Girl"),
        animations: ["idle", "walk", "run", "attack", "hurt", "dead", "jump"],
        direction: "side",
      },
    ],
  },
  {
    id: "topdown-goblin",
    name: "Top-Down Goblin Characters",
    category: "enemy",
    basePath: assetUrl("/sprites/topdown/goblin"),
    source: "Craftpix",
    assets: [
      {
        id: "goblin-chief",
        name: "Chief Goblin",
        category: "enemy",
        path: assetUrl("/sprites/topdown/goblin/Chief Goblin/PNG"),
        animations: ["idle", "walk", "run", "attack", "hurt", "dead"],
        direction: "4-direction",
      },
      {
        id: "goblin-female",
        name: "Female Goblin",
        category: "enemy",
        path: assetUrl("/sprites/topdown/goblin/Female Goblin/PNG"),
        animations: ["idle", "walk", "run", "attack", "hurt", "dead"],
        direction: "4-direction",
      },
    ],
  },
  {
    id: "magic-effects",
    name: "Magic Spell Effects",
    category: "magic",
    basePath: assetUrl("/sprites/magic"),
    source: "Craftpix",
    assets: [
      {
        id: "magic-fire-arrow",
        name: "Fire Arrow",
        category: "magic",
        path: assetUrl("/sprites/magic/fire_arrow"),
        animations: ["idle"],
        direction: "side",
      },
      {
        id: "magic-fire-ball",
        name: "Fire Ball",
        category: "magic",
        path: assetUrl("/sprites/magic/fire_ball"),
        animations: ["idle"],
        direction: "side",
      },
      {
        id: "magic-fire-spell",
        name: "Fire Spell",
        category: "magic",
        path: assetUrl("/sprites/magic/fire_spell"),
        animations: ["idle"],
        direction: "side",
      },
      {
        id: "magic-water-arrow",
        name: "Water Arrow",
        category: "magic",
        path: assetUrl("/sprites/magic/water_arrow"),
        animations: ["idle"],
        direction: "side",
      },
      {
        id: "magic-water-ball",
        name: "Water Ball",
        category: "magic",
        path: assetUrl("/sprites/magic/water_ball"),
        animations: ["idle"],
        direction: "side",
      },
      {
        id: "magic-water-spell",
        name: "Water Spell",
        category: "magic",
        path: assetUrl("/sprites/magic/water_spell"),
        animations: ["idle"],
        direction: "side",
      },
    ],
  },
  {
    id: "spells-effects",
    name: "Spell Effects (Duplicate)",
    category: "magic",
    basePath: assetUrl("/sprites/spells"),
    source: "Craftpix",
    assets: [
      {
        id: "spell-fire-arrow",
        name: "Fire Arrow Spell",
        category: "magic",
        path: assetUrl("/sprites/spells/fire-arrow"),
        animations: ["idle"],
        direction: "side",
      },
      {
        id: "spell-fire-ball",
        name: "Fire Ball Spell",
        category: "magic",
        path: assetUrl("/sprites/spells/fire-ball"),
        animations: ["idle"],
        direction: "side",
      },
      {
        id: "spell-water-arrow",
        name: "Water Arrow Spell",
        category: "magic",
        path: assetUrl("/sprites/spells/water-arrow"),
        animations: ["idle"],
        direction: "side",
      },
    ],
  },
  {
    id: "ui-elements",
    name: "UI Elements",
    category: "ui",
    basePath: assetUrl("/sprites/ui"),
    source: "Craftpix",
    assets: [
      {
        id: "ui-png",
        name: "UI PNG Assets",
        category: "ui",
        path: assetUrl("/sprites/ui/PNG"),
        animations: [],
        direction: "side",
      },
    ],
  },
  {
    id: "tiny-swords",
    name: "Tiny Swords Asset Pack",
    category: "environment",
    basePath: assetUrl("/sprites/tiny_swords"),
    source: "Craftpix",
    assets: [
      {
        id: "tiny-swords-pack",
        name: "Tiny Swords Free Pack",
        category: "environment",
        path: assetUrl("/sprites/tiny_swords/Tiny Swords (Free Pack)"),
        animations: [],
        direction: "topdown",
      },
    ],
  },
  {
    id: "damp-dungeons",
    name: "Damp Dungeons Tileset",
    category: "environment",
    basePath: assetUrl("/sprites/dampdungeons"),
    source: "Craftpix",
    assets: [
      {
        id: "dampdungeons-tiles",
        name: "Dungeon Tiles",
        category: "environment",
        path: assetUrl("/sprites/dampdungeons/tiles"),
        animations: [],
        direction: "topdown",
        usedIn: ["dungeon-crawler"],
      },
      {
        id: "dampdungeons-animations",
        name: "Dungeon Animations",
        category: "environment",
        path: assetUrl("/sprites/dampdungeons/animations"),
        animations: ["idle"],
        direction: "topdown",
        usedIn: ["dungeon-crawler"],
      },
    ],
  },
  {
    id: "emoji-expressions",
    name: "Emoji Expressions",
    category: "ui",
    basePath: assetUrl("/sprites/emoji"),
    source: "Craftpix",
    assets: [
      {
        id: "emoji-png",
        name: "Emoji PNGs",
        category: "ui",
        path: assetUrl("/sprites/emoji/PNG"),
        animations: [],
        direction: "side",
      },
    ],
  },
  {
    id: "eris-templates",
    name: "Eris Character Templates",
    category: "template",
    basePath: assetUrl("/sprites/templates/eris"),
    source: "Eris_Esra",
    assets: [
      {
        id: "template-16x16",
        name: "16x16 Character Template",
        category: "template",
        path: assetUrl("/sprites/templates/eris/16x16"),
        animations: ["idle", "walk", "run", "jump"],
        direction: "8-direction",
        frameSize: { width: 16, height: 16 },
      },
      {
        id: "template-16x32",
        name: "16x32 Character Template",
        category: "template",
        path: assetUrl("/sprites/templates/eris/16x32"),
        animations: ["idle", "walk", "run", "jump"],
        direction: "8-direction",
        frameSize: { width: 16, height: 32 },
      },
    ],
  },
  {
    id: "boats",
    name: "Ship/Boat Sprites",
    category: "boat",
    basePath: assetUrl("/sprites/boats"),
    source: "Craftpix",
    assets: [
      {
        id: "boats-collection",
        name: "Boat Collection",
        category: "boat",
        path: assetUrl("/sprites/boats"),
        animations: [],
        direction: "topdown",
        usedIn: ["world-map", "sailing"],
      },
    ],
  },
  {
    id: "buildings",
    name: "Building Sprites",
    category: "building",
    basePath: assetUrl("/sprites/buildings"),
    source: "Craftpix",
    assets: [
      {
        id: "buildings-collection",
        name: "Building Collection",
        category: "building",
        path: assetUrl("/sprites/buildings"),
        animations: [],
        direction: "topdown",
        usedIn: ["island", "home-island"],
      },
    ],
  },
  {
    id: "weapons",
    name: "Weapon Sprites",
    category: "weapon",
    basePath: assetUrl("/sprites/weapons"),
    source: "Craftpix",
    assets: [
      {
        id: "weapons-collection",
        name: "Weapon Collection",
        category: "weapon",
        path: assetUrl("/sprites/weapons"),
        animations: [],
        direction: "side",
        usedIn: ["character-builder", "inventory"],
      },
    ],
  },
  {
    id: "animals",
    name: "Animal Sprites",
    category: "animal",
    basePath: assetUrl("/sprites/animals"),
    source: "Craftpix",
    assets: [
      {
        id: "animals-collection",
        name: "Animal Collection",
        category: "animal",
        path: assetUrl("/sprites/animals"),
        animations: ["idle", "walk"],
        direction: "side",
      },
    ],
  },
  {
    id: "portraits",
    name: "Character Portraits",
    category: "ui",
    basePath: assetUrl("/sprites/portraits"),
    source: "Craftpix",
    assets: [
      {
        id: "portraits-collection",
        name: "Portrait Collection",
        category: "ui",
        path: assetUrl("/sprites/portraits"),
        animations: [],
        direction: "side",
        usedIn: ["character-builder", "party"],
      },
    ],
  },
  {
    id: "adventurer",
    name: "Adventurer Character",
    category: "hero",
    basePath: assetUrl("/sprites/adventurer"),
    source: "Craftpix",
    assets: [
      {
        id: "adventurer-base",
        name: "Adventurer Base",
        category: "hero",
        path: assetUrl("/sprites/adventurer"),
        animations: ["idle", "walk", "run", "attack"],
        direction: "side",
      },
      {
        id: "adventurer-bow",
        name: "Adventurer with Bow",
        category: "hero",
        path: assetUrl("/sprites/adventurer-bow"),
        animations: ["idle", "walk", "run", "attack"],
        direction: "side",
      },
      {
        id: "adventurer-combat",
        name: "Adventurer Hand Combat",
        category: "hero",
        path: assetUrl("/sprites/adventurer-hand-combat"),
        animations: ["idle", "walk", "run", "attack"],
        direction: "side",
      },
    ],
  },
  {
    id: "freeknight",
    name: "Free Knight Character",
    category: "hero",
    basePath: assetUrl("/sprites/freeknight"),
    source: "Craftpix",
    assets: [
      {
        id: "freeknight-base",
        name: "Free Knight",
        category: "hero",
        path: assetUrl("/sprites/freeknight"),
        animations: ["idle", "walk", "run", "attack"],
        direction: "side",
      },
    ],
  },
  {
    id: "pirate",
    name: "Pirate Character",
    category: "hero",
    basePath: assetUrl("/sprites/pirate"),
    source: "Craftpix",
    assets: [
      {
        id: "pirate-base",
        name: "Pirate",
        category: "hero",
        path: assetUrl("/sprites/pirate"),
        animations: ["idle", "walk", "run", "attack"],
        direction: "side",
        usedIn: ["sailing", "world-map"],
      },
    ],
  },
];

export function getAssetsByCategory(category: SpriteCategory): SpriteAsset[] {
  return CRAFTPIX_ASSET_CATALOG
    .filter(pack => pack.category === category)
    .flatMap(pack => pack.assets);
}

export function getAssetById(assetId: string): SpriteAsset | undefined {
  for (const pack of CRAFTPIX_ASSET_CATALOG) {
    const asset = pack.assets.find(a => a.id === assetId);
    if (asset) return asset;
  }
  return undefined;
}

export function getAssetsUsedIn(feature: string): SpriteAsset[] {
  return CRAFTPIX_ASSET_CATALOG
    .flatMap(pack => pack.assets)
    .filter(asset => asset.usedIn?.includes(feature));
}

export function getAllTemplates(): SpriteAsset[] {
  return getAssetsByCategory("template");
}

export function getEnemyAssets(): SpriteAsset[] {
  return getAssetsByCategory("enemy");
}

export function getMagicAssets(): SpriteAsset[] {
  return getAssetsByCategory("magic");
}

export const ASSET_SUMMARY = {
  totalPacks: CRAFTPIX_ASSET_CATALOG.length,
  categories: {
    hero: getAssetsByCategory("hero").length,
    enemy: getAssetsByCategory("enemy").length,
    magic: getAssetsByCategory("magic").length,
    ui: getAssetsByCategory("ui").length,
    environment: getAssetsByCategory("environment").length,
    template: getAssetsByCategory("template").length,
    boat: getAssetsByCategory("boat").length,
    building: getAssetsByCategory("building").length,
    weapon: getAssetsByCategory("weapon").length,
    animal: getAssetsByCategory("animal").length,
  },
};

import { assetUrl } from "@/lib/assetConfig";
export type HeroRace = 'elf' | 'orc' | 'human' | 'barbarian' | 'dwarf' | 'undead';
export type AnimationType = 'walk' | 'death' | 'attack' | 'magic' | 'idle';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  frameIndex: number;
  row: number;
  col: number;
}

export interface AnimationData {
  spriteSheet: string;
  boundingBoxes: BoundingBox[];
  frameCount: number;
  fps: number;
  loop: boolean;
}

export interface HeroSpriteConfig {
  race: HeroRace;
  displayName: string;
  faction: 'crusade' | 'legion' | 'fabled';
  referenceImage: string;
  animations: Partial<Record<AnimationType, AnimationData>>;
}

const WALK_BBOX: BoundingBox[] = [
  {"x":336,"y":206,"width":77,"height":159,"frameIndex":0,"row":0,"col":0},
  {"x":423,"y":214,"width":98,"height":155,"frameIndex":1,"row":0,"col":1},
  {"x":554,"y":222,"width":118,"height":151,"frameIndex":2,"row":0,"col":2},
  {"x":693,"y":232,"width":125,"height":144,"frameIndex":3,"row":0,"col":3},
  {"x":351,"y":372,"width":72,"height":142,"frameIndex":4,"row":1,"col":0},
  {"x":423,"y":380,"width":98,"height":138,"frameIndex":5,"row":1,"col":1},
  {"x":554,"y":388,"width":118,"height":134,"frameIndex":6,"row":1,"col":2},
  {"x":693,"y":398,"width":125,"height":127,"frameIndex":7,"row":1,"col":3},
  {"x":336,"y":538,"width":72,"height":126,"frameIndex":8,"row":2,"col":0},
  {"x":423,"y":546,"width":98,"height":122,"frameIndex":9,"row":2,"col":1},
  {"x":554,"y":554,"width":118,"height":118,"frameIndex":10,"row":2,"col":2},
  {"x":693,"y":564,"width":125,"height":111,"frameIndex":11,"row":2,"col":3},
  {"x":336,"y":704,"width":72,"height":110,"frameIndex":12,"row":3,"col":0},
  {"x":423,"y":712,"width":98,"height":106,"frameIndex":13,"row":3,"col":1},
  {"x":554,"y":720,"width":118,"height":102,"frameIndex":14,"row":3,"col":2},
];

const DEATH_BBOX: BoundingBox[] = [
  {"x":281,"y":171,"width":152,"height":199,"frameIndex":0,"row":0,"col":0},
  {"x":421,"y":172,"width":135,"height":198,"frameIndex":1,"row":0,"col":1},
  {"x":538,"y":172,"width":123,"height":197,"frameIndex":2,"row":0,"col":2},
  {"x":617,"y":174,"width":106,"height":196,"frameIndex":3,"row":0,"col":3},
  {"x":306,"y":370,"width":89,"height":197,"frameIndex":4,"row":1,"col":0},
  {"x":384,"y":378,"width":97,"height":193,"frameIndex":5,"row":1,"col":1},
  {"x":462,"y":386,"width":105,"height":189,"frameIndex":6,"row":1,"col":2},
  {"x":540,"y":394,"width":113,"height":185,"frameIndex":7,"row":1,"col":3},
  {"x":281,"y":538,"width":157,"height":130,"frameIndex":8,"row":2,"col":0},
  {"x":421,"y":546,"width":147,"height":126,"frameIndex":9,"row":2,"col":1},
  {"x":538,"y":554,"width":137,"height":122,"frameIndex":10,"row":2,"col":2},
  {"x":617,"y":562,"width":127,"height":118,"frameIndex":11,"row":2,"col":3},
  {"x":281,"y":704,"width":167,"height":114,"frameIndex":12,"row":3,"col":0},
  {"x":421,"y":712,"width":157,"height":110,"frameIndex":13,"row":3,"col":1},
];

const ATTACK_BBOX: BoundingBox[] = [
  {"x":336,"y":206,"width":77,"height":159,"frameIndex":0,"row":0,"col":0},
  {"x":423,"y":214,"width":98,"height":155,"frameIndex":1,"row":0,"col":1},
  {"x":554,"y":222,"width":118,"height":151,"frameIndex":2,"row":0,"col":2},
  {"x":693,"y":232,"width":125,"height":144,"frameIndex":3,"row":0,"col":3},
  {"x":351,"y":372,"width":72,"height":142,"frameIndex":4,"row":1,"col":0},
  {"x":423,"y":380,"width":98,"height":138,"frameIndex":5,"row":1,"col":1},
  {"x":554,"y":388,"width":118,"height":134,"frameIndex":6,"row":1,"col":2},
  {"x":693,"y":398,"width":125,"height":127,"frameIndex":7,"row":1,"col":3},
  {"x":336,"y":538,"width":72,"height":126,"frameIndex":8,"row":2,"col":0},
  {"x":423,"y":546,"width":98,"height":122,"frameIndex":9,"row":2,"col":1},
  {"x":554,"y":554,"width":118,"height":118,"frameIndex":10,"row":2,"col":2},
  {"x":693,"y":564,"width":125,"height":111,"frameIndex":11,"row":2,"col":3},
  {"x":336,"y":704,"width":72,"height":110,"frameIndex":12,"row":3,"col":0},
  {"x":423,"y":712,"width":98,"height":106,"frameIndex":13,"row":3,"col":1},
  {"x":554,"y":720,"width":118,"height":102,"frameIndex":14,"row":3,"col":2},
];

const IDLE_BBOX: BoundingBox[] = [
  {"x":336,"y":206,"width":77,"height":159,"frameIndex":0,"row":0,"col":0},
  {"x":423,"y":214,"width":98,"height":155,"frameIndex":1,"row":0,"col":1},
  {"x":554,"y":222,"width":118,"height":151,"frameIndex":2,"row":0,"col":2},
  {"x":423,"y":214,"width":98,"height":155,"frameIndex":3,"row":0,"col":1},
];

function createHeroConfig(race: HeroRace, displayName: string, faction: 'crusade' | 'legion' | 'fabled'): HeroSpriteConfig {
  return {
    race,
    displayName,
    faction,
    referenceImage: assetUrl(`/sprites/heroes/heros_reference.png`),
    animations: {
      idle: {
        spriteSheet: assetUrl(`/sprites/heroes/${race}/walk.png`),
        boundingBoxes: IDLE_BBOX,
        frameCount: 4,
        fps: 4,
        loop: true,
      },
      walk: {
        spriteSheet: assetUrl(`/sprites/heroes/${race}/walk.png`),
        boundingBoxes: WALK_BBOX,
        frameCount: 15,
        fps: 12,
        loop: true,
      },
      death: {
        spriteSheet: assetUrl(`/sprites/heroes/${race}/death.png`),
        boundingBoxes: DEATH_BBOX,
        frameCount: 14,
        fps: 10,
        loop: false,
      },
      attack: {
        spriteSheet: assetUrl(`/sprites/heroes/${race}/attack.png`),
        boundingBoxes: ATTACK_BBOX,
        frameCount: 15,
        fps: 14,
        loop: false,
      },
      magic: {
        spriteSheet: assetUrl(`/sprites/heroes/${race}/magic.png`),
        boundingBoxes: ATTACK_BBOX,
        frameCount: 15,
        fps: 12,
        loop: false,
      },
    },
  };
}

export const HERO_SPRITES: Record<HeroRace, HeroSpriteConfig> = {
  elf: createHeroConfig('elf', 'Elf', 'fabled'),
  orc: createHeroConfig('orc', 'Orc', 'legion'),
  human: createHeroConfig('human', 'Human', 'crusade'),
  barbarian: createHeroConfig('barbarian', 'Barbarian', 'legion'),
  dwarf: createHeroConfig('dwarf', 'Dwarf', 'crusade'),
  undead: createHeroConfig('undead', 'Undead', 'legion'),
};

export function getHeroSprite(race: HeroRace): HeroSpriteConfig {
  return HERO_SPRITES[race] || HERO_SPRITES.human;
}

export function getHeroAnimation(race: HeroRace, animation: AnimationType): AnimationData | null {
  const hero = getHeroSprite(race);
  return hero.animations[animation] || null;
}

export const HERO_RACE_LIST: HeroRace[] = ['elf', 'orc', 'human', 'barbarian', 'dwarf', 'undead'];

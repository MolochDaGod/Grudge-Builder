import { assetUrl } from "@/lib/assetConfig";
export interface AsepriteFrame {
  duration: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AsepriteTag {
  name: string;
  from: number;
  to: number;
  direction: "forward" | "reverse" | "pingpong";
}

export interface AsepriteLayer {
  name: string;
  visible: boolean;
  opacity: number;
}

export interface AsepriteParsedData {
  filename: string;
  width: number;
  height: number;
  frameCount: number;
  frames: AsepriteFrame[];
  tags: AsepriteTag[];
  layers: AsepriteLayer[];
  palette: string[];
}

export interface SpriteMapping {
  asepriteFile: string;
  pngPath: string;
  animations: Record<string, {
    frames: number[];
    fps: number;
    loop: boolean;
  }>;
}

const ASEPRITE_BASE_PATH = assetUrl("/sprites/GrudgeRPGAssets2d/Aseprite file");
const CHARACTER_BASE_PATH = assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)");

export const ASEPRITE_CHARACTER_MAPPINGS: Record<string, SpriteMapping> = {
  "Archer": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Archer.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Archer/Archer`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Knight": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Knight.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Knight/Knight`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Wizard": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Wizard.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Wizard/Wizard`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: false },
      cast: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Priest": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Priest.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Priest/Priest`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: false },
      heal: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Orc": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Orc.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Orc/Orc`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Elite Orc": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Elite Orc.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Elite Orc/Elite Orc`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Armored Orc": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Armored Orc.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Armored Orc/Armored Orc`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Skeleton": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Skeleton.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Skeleton/Skeleton`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Skeleton Archer": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Skeleton Archer.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Skeleton Archer/Skeleton Archer`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Armored Skeleton": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Armored Skeleton.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Armored Skeleton/Armored Skeleton`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Greatsword Skeleton": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Greatsword Skeleton.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Greatsword Skeleton/Greatsword Skeleton`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Werewolf": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Werewolf.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Werewolf/Werewolf`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Werebear": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Werebear.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Werebear/Werebear`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Slime": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Slime.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Slime/Slime`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5], fps: 10, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Soldier": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Soldier.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Soldier/Soldier`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Swordsman": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Swordsman.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Swordsman/Swordsman`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Knight Templar": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Knight Templar.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Knight Templar/Knight Templar`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Lancer": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Lancer.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Lancer/Lancer`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Armored Axeman": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Armored Axeman.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Armored Axeman/Armored Axeman`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  },
  "Orc rider": {
    asepriteFile: `${ASEPRITE_BASE_PATH}/Orc rider.aseprite`,
    pngPath: `${CHARACTER_BASE_PATH}/Orc rider/Orc rider`,
    animations: {
      idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: true },
      walk: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 10, loop: true },
      attack: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 12, loop: false },
      hurt: { frames: [0, 1, 2], fps: 10, loop: false },
      death: { frames: [0, 1, 2, 3, 4, 5], fps: 8, loop: false }
    }
  }
};

export function getCharacterMapping(name: string): SpriteMapping | undefined {
  return ASEPRITE_CHARACTER_MAPPINGS[name];
}

export function getSpritePngPath(name: string, animation: string): string | undefined {
  const mapping = getCharacterMapping(name);
  if (!mapping) return undefined;
  
  const animMap: Record<string, string> = {
    idle: "Idle",
    walk: "Walk",
    run: "Run",
    attack: "Attack01",
    attack2: "Attack02",
    cast: "Attack01",
    heal: "Attack01",
    hurt: "Hurt",
    death: "Death",
    block: "Block"
  };
  
  const animSuffix = animMap[animation] || "Idle";
  return `${mapping.pngPath}-${animSuffix}.png`;
}

export function getAllCharacterNames(): string[] {
  return Object.keys(ASEPRITE_CHARACTER_MAPPINGS);
}

export function getAnimationData(name: string, animation: string) {
  const mapping = getCharacterMapping(name);
  if (!mapping) return undefined;
  return mapping.animations[animation];
}

export const ASEPRITE_FILES = [
  { name: "Archer", path: `${ASEPRITE_BASE_PATH}/Archer.aseprite`, category: "hero" },
  { name: "Knight", path: `${ASEPRITE_BASE_PATH}/Knight.aseprite`, category: "hero" },
  { name: "Wizard", path: `${ASEPRITE_BASE_PATH}/Wizard.aseprite`, category: "hero" },
  { name: "Priest", path: `${ASEPRITE_BASE_PATH}/Priest.aseprite`, category: "hero" },
  { name: "Soldier", path: `${ASEPRITE_BASE_PATH}/Soldier.aseprite`, category: "hero" },
  { name: "Swordsman", path: `${ASEPRITE_BASE_PATH}/Swordsman.aseprite`, category: "hero" },
  { name: "Knight Templar", path: `${ASEPRITE_BASE_PATH}/Knight Templar.aseprite`, category: "hero" },
  { name: "Lancer", path: `${ASEPRITE_BASE_PATH}/Lancer.aseprite`, category: "hero" },
  { name: "Armored Axeman", path: `${ASEPRITE_BASE_PATH}/Armored Axeman.aseprite`, category: "hero" },
  { name: "Orc", path: `${ASEPRITE_BASE_PATH}/Orc.aseprite`, category: "monster" },
  { name: "Elite Orc", path: `${ASEPRITE_BASE_PATH}/Elite Orc.aseprite`, category: "monster" },
  { name: "Armored Orc", path: `${ASEPRITE_BASE_PATH}/Armored Orc.aseprite`, category: "monster" },
  { name: "Orc rider", path: `${ASEPRITE_BASE_PATH}/Orc rider.aseprite`, category: "monster" },
  { name: "Skeleton", path: `${ASEPRITE_BASE_PATH}/Skeleton.aseprite`, category: "monster" },
  { name: "Skeleton Archer", path: `${ASEPRITE_BASE_PATH}/Skeleton Archer.aseprite`, category: "monster" },
  { name: "Armored Skeleton", path: `${ASEPRITE_BASE_PATH}/Armored Skeleton.aseprite`, category: "monster" },
  { name: "Greatsword Skeleton", path: `${ASEPRITE_BASE_PATH}/Greatsword Skeleton.aseprite`, category: "monster" },
  { name: "Werewolf", path: `${ASEPRITE_BASE_PATH}/Werewolf.aseprite`, category: "monster" },
  { name: "Werebear", path: `${ASEPRITE_BASE_PATH}/Werebear.aseprite`, category: "monster" },
  { name: "Slime", path: `${ASEPRITE_BASE_PATH}/Slime.aseprite`, category: "monster" }
];

// ============================================
// SPRITE FRAME COUNTING UTILITIES
// ============================================

export interface SpriteFrameInfo {
  path: string;
  filename: string;
  character: string;
  animation: string;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
}

export interface CharacterSpriteData {
  name: string;
  basePath: string;
  animations: Record<string, SpriteFrameInfo>;
  totalFrames: number;
}

export interface SpriteScanResult {
  characters: CharacterSpriteData[];
  totalCharacters: number;
  totalAnimations: number;
  totalFrames: number;
}

let cachedManifest: SpriteScanResult | null = null;

export async function fetchSpriteFrameCounts(): Promise<SpriteScanResult> {
  if (cachedManifest) return cachedManifest;
  
  try {
    const response = await fetch('/api/sprites/frame-counts');
    if (!response.ok) throw new Error('Failed to fetch frame counts');
    cachedManifest = await response.json();
    return cachedManifest!;
  } catch (error) {
    console.error('Error fetching sprite frame counts:', error);
    return { characters: [], totalCharacters: 0, totalAnimations: 0, totalFrames: 0 };
  }
}

export async function getCharacterFrameCounts(characterName: string): Promise<Record<string, number> | null> {
  try {
    const response = await fetch(`/api/sprites/frame-counts/${encodeURIComponent(characterName)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.animations;
  } catch (error) {
    console.error('Error fetching character frame counts:', error);
    return null;
  }
}

export async function analyzePngSprite(spritePath: string, frameSize: number = 100): Promise<SpriteFrameInfo | null> {
  try {
    const response = await fetch(`/api/sprites/analyze-png?path=${encodeURIComponent(spritePath)}&frameSize=${frameSize}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error analyzing PNG sprite:', error);
    return null;
  }
}

export function countFramesFromDimensions(width: number, height: number, frameSize: number = 100): number {
  const isHorizontal = width > height;
  return isHorizontal 
    ? Math.floor(width / frameSize)
    : Math.floor(height / frameSize);
}

export function generateFrameArray(frameCount: number): number[] {
  return Array.from({ length: frameCount }, (_, i) => i);
}

export function getAnimationConfig(frameCount: number, isLooping: boolean = false, baseFps: number = 10) {
  return {
    frames: generateFrameArray(frameCount),
    fps: baseFps,
    loop: isLooping,
    duration: (frameCount / baseFps) * 1000
  };
}

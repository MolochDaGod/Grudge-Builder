import * as fs from 'fs';
import * as path from 'path';

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

function getImageDimensions(filePath: string): { width: number; height: number } | null {
  try {
    const buffer = fs.readFileSync(filePath);
    
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    return null;
  } catch (error) {
    return null;
  }
}

function parseAnimationName(filename: string): string {
  const match = filename.match(/-([A-Za-z0-9]+)\.png$/);
  if (match) {
    return match[1].toLowerCase();
  }
  return 'default';
}

export function countSpriteFrames(filePath: string, expectedFrameSize: number = 100): SpriteFrameInfo | null {
  const dims = getImageDimensions(filePath);
  if (!dims) return null;

  const filename = path.basename(filePath);
  const character = filename.split('-')[0] || filename.replace('.png', '');
  const animation = parseAnimationName(filename);
  
  const isHorizontal = dims.width > dims.height;
  const frameWidth = isHorizontal ? expectedFrameSize : dims.width;
  const frameHeight = isHorizontal ? dims.height : expectedFrameSize;
  const frameCount = isHorizontal 
    ? Math.floor(dims.width / expectedFrameSize)
    : Math.floor(dims.height / expectedFrameSize);

  return {
    path: filePath,
    filename,
    character,
    animation,
    width: dims.width,
    height: dims.height,
    frameWidth,
    frameHeight,
    frameCount
  };
}

export function scanCharacterSprites(baseDir: string, frameSize: number = 100): SpriteScanResult {
  const characters: CharacterSpriteData[] = [];
  let totalAnimations = 0;
  let totalFrames = 0;

  try {
    const characterDirs = fs.readdirSync(baseDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const charName of characterDirs) {
      const charPath = path.join(baseDir, charName);
      const innerPath = path.join(charPath, charName);
      
      const spritePath = fs.existsSync(innerPath) ? innerPath : charPath;
      
      const animations: Record<string, SpriteFrameInfo> = {};
      let charTotalFrames = 0;

      try {
        const files = fs.readdirSync(spritePath)
          .filter(f => f.endsWith('.png') && !f.includes('Shadow'));

        for (const file of files) {
          const filePath = path.join(spritePath, file);
          const info = countSpriteFrames(filePath, frameSize);
          
          if (info) {
            animations[info.animation] = info;
            charTotalFrames += info.frameCount;
            totalAnimations++;
          }
        }
      } catch (error) {
        continue;
      }

      if (Object.keys(animations).length > 0) {
        characters.push({
          name: charName,
          basePath: spritePath,
          animations,
          totalFrames: charTotalFrames
        });
        totalFrames += charTotalFrames;
      }
    }
  } catch (error) {
    console.error('Error scanning character sprites:', error);
  }

  return {
    characters,
    totalCharacters: characters.length,
    totalAnimations,
    totalFrames
  };
}

export function getSpriteManifest(): SpriteScanResult {
  const baseDir = path.join(process.cwd(), 'client/public/sprites/GrudgeRPGAssets2d/Characters(100x100)');
  return scanCharacterSprites(baseDir, 100);
}

export function getCharacterFrameCounts(characterName: string): Record<string, number> | null {
  const manifest = getSpriteManifest();
  const character = manifest.characters.find(c => c.name.toLowerCase() === characterName.toLowerCase());
  
  if (!character) return null;
  
  const frameCounts: Record<string, number> = {};
  for (const [anim, info] of Object.entries(character.animations)) {
    frameCounts[anim] = info.frameCount;
  }
  return frameCounts;
}

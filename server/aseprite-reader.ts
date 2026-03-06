import Aseprite from 'ase-parser';
import * as fs from 'fs';
import * as path from 'path';

export interface AsepriteLayer {
  name: string;
  type: number;
  visible: boolean;
}

export interface AsepriteTag {
  name: string;
  from: number;
  to: number;
  frameCount: number;
}

export interface AsepriteFileInfo {
  filename: string;
  name: string;
  width: number;
  height: number;
  totalFrames: number;
  layers: AsepriteLayer[];
  tags: AsepriteTag[];
  paletteColors: number;
  fileSizeBytes: number;
}

export interface AsepriteScanResult {
  directory: string;
  files: AsepriteFileInfo[];
  totalFiles: number;
  totalFrames: number;
  uniqueAnimations: string[];
}

const ASEPRITE_FOLDER = 'public/sprites/GrudgeRPGAssets2d/Aseprite file';

export function readAsepriteFile(filePath: string): AsepriteFileInfo | null {
  try {
    const buffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    const aseFile = new Aseprite(buffer, filename);
    aseFile.parse();

    const layers: AsepriteLayer[] = (aseFile.layers || []).map((layer: any) => ({
      name: layer.name,
      type: layer.type,
      visible: layer.flags?.visible ?? true
    }));

    const tags: AsepriteTag[] = (aseFile.tags || []).map((tag: any) => ({
      name: tag.name,
      from: tag.from,
      to: tag.to,
      frameCount: tag.to - tag.from + 1
    }));

    const stats = fs.statSync(filePath);

    return {
      filename,
      name: path.basename(filename, '.aseprite'),
      width: aseFile.width,
      height: aseFile.height,
      totalFrames: aseFile.numFrames,
      layers,
      tags,
      paletteColors: aseFile.palette?.colors?.length || 0,
      fileSizeBytes: stats.size
    };
  } catch (error) {
    console.error(`Error reading Aseprite file ${filePath}:`, error);
    return null;
  }
}

export function scanAsepriteDirectory(directory?: string): AsepriteScanResult {
  const dir = directory || ASEPRITE_FOLDER;
  const files: AsepriteFileInfo[] = [];
  const animationSet = new Set<string>();
  let totalFrames = 0;

  try {
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
      if (entry.endsWith('.aseprite') || entry.endsWith('.ase')) {
        const filePath = path.join(dir, entry);
        const info = readAsepriteFile(filePath);
        
        if (info) {
          files.push(info);
          totalFrames += info.totalFrames;
          info.tags.forEach(tag => animationSet.add(tag.name));
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }

  return {
    directory: dir,
    files: files.sort((a, b) => a.name.localeCompare(b.name)),
    totalFiles: files.length,
    totalFrames,
    uniqueAnimations: Array.from(animationSet).sort()
  };
}

export function getAsepriteStats(): {
  summary: {
    totalFiles: number;
    totalFrames: number;
    uniqueAnimations: string[];
    commonDimensions: string;
  };
  files: AsepriteFileInfo[];
} {
  const result = scanAsepriteDirectory();
  
  const dimensionCounts: Record<string, number> = {};
  for (const file of result.files) {
    const dim = `${file.width}x${file.height}`;
    dimensionCounts[dim] = (dimensionCounts[dim] || 0) + 1;
  }
  
  const commonDimensions = Object.entries(dimensionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([dim, count]) => `${dim} (${count} files)`)
    .join(', ');

  return {
    summary: {
      totalFiles: result.totalFiles,
      totalFrames: result.totalFrames,
      uniqueAnimations: result.uniqueAnimations,
      commonDimensions
    },
    files: result.files
  };
}

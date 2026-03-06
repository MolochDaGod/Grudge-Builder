import fs from "fs";
import path from "path";
import { PNG } from "pngjs";

export interface AnimationTemplate {
  name: string;
  filename: string;
  localPath: string;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  directionCount: number;
  framesPerDirection: number;
}

export interface TemplateMetadata {
  basePath: string;
  spriteSize: { width: number; height: number };
  animations: AnimationTemplate[];
  directions: string[];
}

const ERIS_DIRECTIONS = [
  "south",
  "south-west",
  "west",
  "north-west",
  "north",
  "north-east",
  "east",
  "south-east",
];

export function analyzeErisTemplate(templateDir: string): TemplateMetadata {
  const animations: AnimationTemplate[] = [];
  const spriteSize = { width: 16, height: 32 };

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template directory not found: ${templateDir}`);
  }

  const files = fs.readdirSync(templateDir);
  const pngFiles = files.filter(
    (f) => f.endsWith("-Sheet.png") || f === "16x32 All Animations.png"
  );

  for (const filename of pngFiles) {
    const filePath = path.join(templateDir, filename);

    try {
      const data = fs.readFileSync(filePath);
      const png = PNG.sync.read(data);

      const animName = filename
        .replace("-Sheet.png", "")
        .replace("16x32 ", "")
        .replace(".png", "");

      const frameWidth = spriteSize.width;
      const frameHeight = spriteSize.height;
      const columns = Math.floor(png.width / frameWidth);
      const rows = Math.floor(png.height / frameHeight);

      const directionCount = rows >= 8 ? 8 : rows;
      const framesPerDirection = columns;

      animations.push({
        name: animName,
        filename,
        localPath: filePath,
        width: png.width,
        height: png.height,
        frameWidth,
        frameHeight,
        frameCount: columns * rows,
        directionCount,
        framesPerDirection,
      });
    } catch (error) {
      console.error(`Error analyzing ${filename}:`, error);
    }
  }

  return {
    basePath: templateDir,
    spriteSize,
    animations,
    directions: ERIS_DIRECTIONS,
  };
}

export function getAnimationFrameCounts(): Record<string, number> {
  return {
    Idle: 4,
    Walk: 6,
    Run: 6,
    Jump: 6,
    Rotate: 8,
    Interact: 4,
    Attack: 6,
    Spell: 8,
  };
}

export function getDirectionDescriptions(): Record<string, string> {
  return {
    south: "facing directly toward the camera, front view",
    "south-west": "facing diagonally toward bottom-left, 3/4 front view",
    west: "facing left, perfect side profile view",
    "north-west": "facing diagonally toward top-left, 3/4 back view",
    north: "facing directly away from camera, back view",
    "north-east": "facing diagonally toward top-right, 3/4 back view",
    east: "facing right, perfect side profile view",
    "south-east": "facing diagonally toward bottom-right, 3/4 front view",
  };
}

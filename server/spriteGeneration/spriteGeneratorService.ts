import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import {
  analyzeErisTemplate,
  getAnimationFrameCounts,
  getDirectionDescriptions,
} from "./templateAnalyzer";
import {
  buildMasterSystemPrompt,
  getBarbarian16x32Prompt,
  BARBARIAN_REFERENCE,
} from "./promptTemplates";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface GenerationJob {
  id: string;
  characterName: string;
  animationType: string;
  direction: string;
  status: "pending" | "generating" | "completed" | "failed";
  prompt: string;
  outputPath?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface GenerationResult {
  success: boolean;
  imagePath?: string;
  base64Data?: string;
  error?: string;
  prompt: string;
}

const DIRECTIONS = [
  "south",
  "south-west",
  "west",
  "north-west",
  "north",
  "north-east",
  "east",
  "south-east",
];

const ANIMATIONS = [
  "Idle",
  "Walk",
  "Run",
  "Jump",
  "Rotate",
  "Interact",
  "Attack",
  "Spell",
];

export class SpriteGeneratorService {
  private outputDir: string;
  private jobs: Map<string, GenerationJob> = new Map();

  constructor(outputDir?: string) {
    this.outputDir =
      outputDir ||
      path.join(process.cwd(), "public", "sprites", "generated", "barbarian");
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateSingleSprite(
    animationType: string,
    direction: string,
    frameCount: number,
    weaponType: string = "axe"
  ): Promise<GenerationResult> {
    const prompt = getBarbarian16x32Prompt(
      animationType,
      direction,
      frameCount,
      weaponType
    );

    console.log(`Generating sprite: ${animationType} - ${direction}`);
    console.log(`Prompt: ${prompt.substring(0, 200)}...`);

    try {
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: `${buildMasterSystemPrompt()}\n\n${prompt}`,
        n: 1,
        size: "1024x1024",
      });

      const imageData = response.data[0];

      if (!imageData.b64_json) {
        throw new Error("No image data returned");
      }

      const filename = `${animationType.toLowerCase()}_${direction.replace("-", "_")}.png`;
      const outputPath = path.join(this.outputDir, filename);

      const buffer = Buffer.from(imageData.b64_json, "base64");
      fs.writeFileSync(outputPath, buffer);

      console.log(`Saved to: ${outputPath}`);

      return {
        success: true,
        imagePath: outputPath,
        base64Data: imageData.b64_json,
        prompt,
      };
    } catch (error) {
      console.error(`Generation failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        prompt,
      };
    }
  }

  async generateAnimationSheet(
    animationType: string,
    weaponType: string = "axe"
  ): Promise<GenerationResult[]> {
    const frameCounts = getAnimationFrameCounts();
    const frameCount = frameCounts[animationType] || 4;
    const results: GenerationResult[] = [];

    for (const direction of DIRECTIONS) {
      const result = await this.generateSingleSprite(
        animationType,
        direction,
        frameCount,
        weaponType
      );
      results.push(result);

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return results;
  }

  async generateAllAnimations(
    weaponType: string = "axe"
  ): Promise<Map<string, GenerationResult[]>> {
    const allResults = new Map<string, GenerationResult[]>();

    for (const animation of ANIMATIONS) {
      console.log(`\n=== Generating ${animation} animation ===\n`);
      const results = await this.generateAnimationSheet(animation, weaponType);
      allResults.set(animation, results);
    }

    return allResults;
  }

  getTemplateInfo() {
    const templateDir = path.join(
      process.cwd(),
      "public",
      "sprites",
      "templates",
      "eris",
      "16x32"
    );
    return analyzeErisTemplate(templateDir);
  }

  getJobStatus(jobId: string): GenerationJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): GenerationJob[] {
    return Array.from(this.jobs.values());
  }

  async generateWithReference(
    referenceImagePath: string,
    animationType: string,
    direction: string
  ): Promise<GenerationResult> {
    const frameCounts = getAnimationFrameCounts();
    const frameCount = frameCounts[animationType] || 4;

    const prompt = `Based on this reference character, create a 16x32 pixel art sprite.

REFERENCE: Use the character's costume, colors, and features as inspiration.
Convert to tiny chibi pixel art style.

ANIMATION: ${animationType}
DIRECTION: ${direction}
FRAMES: ${frameCount} frames arranged horizontally

OUTPUT: ${16 * frameCount}x32 pixel spritesheet

STYLE: Classic 16-bit RPG pixel art, limited 16-24 color palette, clean pixel edges, transparent background`;

    try {
      let imageInput: OpenAI.Images.ImageEditParams.Image | undefined;

      if (fs.existsSync(referenceImagePath)) {
        const imageBuffer = fs.readFileSync(referenceImagePath);
        imageInput = {
          type: "base64",
          media_type: "image/png",
          data: imageBuffer.toString("base64"),
        } as any;
      }

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: `${buildMasterSystemPrompt()}\n\n${prompt}`,
        n: 1,
        size: "1024x1024",
      });

      const imageData = response.data[0];

      if (!imageData.b64_json) {
        throw new Error("No image data returned");
      }

      const filename = `ref_${animationType.toLowerCase()}_${direction.replace("-", "_")}.png`;
      const outputPath = path.join(this.outputDir, filename);

      const buffer = Buffer.from(imageData.b64_json, "base64");
      fs.writeFileSync(outputPath, buffer);

      return {
        success: true,
        imagePath: outputPath,
        base64Data: imageData.b64_json,
        prompt,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        prompt,
      };
    }
  }
}

export const spriteGenerator = new SpriteGeneratorService();

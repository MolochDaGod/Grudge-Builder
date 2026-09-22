import { isPuterAvailable } from "./puterIntegration";
import { aiGateway } from "./aiGateway";
import { AI_DEFAULTS } from "@shared/aiModels";
import { buildPromptFromSpec, DEFAULT_ANIMATIONS, getSpriteFilename, getSpriteUnitFolderStructure } from "@shared/definitions/spriteGeneration";
import type { AnimationSlot, SpriteUnitSpec, SpriteGenerationJob } from "@shared/schema";
import { AnimationSlots } from "@shared/schema";

export interface GenerationProgress {
  specId: string;
  unitId: string;
  currentStep: AnimationSlot | "init" | "complete" | "failed";
  progress: number;
  generatedImages: Record<AnimationSlot, string>;
  errors: Array<{ step: string; message: string; timestamp: number }>;
}

export interface GenerationResult {
  success: boolean;
  unitId: string;
  images: Record<string, string>;
  errors: string[];
}

const activeJobs = new Map<string, GenerationProgress>();

export async function generateSpriteFromPrompt(
  prompt: string,
  options?: {
    size?: string;
    quality?: string;
    model?: string;
    transparent?: boolean;
  }
): Promise<string | null> {
  // Use Grudge AI Gateway (ai.grudge-studio.com) — fail-closed, no Puter fallback
  try {
    const result = await aiGateway.image({
      prompt,
      model: options?.model || AI_DEFAULTS.image.default,
      size: options?.size || '1024x1024',
      quality: options?.quality || 'medium',
      transparent: options?.transparent ?? true,
      upload_to_r2: true,
    });
    // Prefer CDN URL, fall back to base64
    const img = result.images?.[0];
    return img?.url || (img?.b64_json ? `data:image/png;base64,${img.b64_json}` : null);
  } catch (gatewayError) {
    console.error('AI Gateway sprite generation failed:', gatewayError);
    return null;
  }
}

export async function generateAnimationFrame(
  spec: SpriteUnitSpec,
  animation: AnimationSlot,
  onProgress?: (msg: string) => void
): Promise<string | null> {
  const traits = spec.traits || {};
  const prompt = buildPromptFromSpec(
    spec.race || "human",
    spec.classType || "warrior",
    {
      weapon: traits.weapon,
      armor: traits.armor,
      style: traits.style,
      features: traits.features,
      colors: traits.colors,
    },
    animation
  );

  onProgress?.(`Generating ${animation} animation...`);
  
  const enhancedPrompt = `${prompt}, spritesheet ${spec.frameWidth}x${spec.frameHeight}px frames, transparent background, pixel art game asset`;
  
  return generateSpriteFromPrompt(enhancedPrompt, {
    size: "1024x1024",
    quality: "medium",
  });
}

export async function startSpriteGeneration(
  spec: SpriteUnitSpec,
  onProgress?: (progress: GenerationProgress) => void
): Promise<GenerationResult> {
  const jobId = spec.id;
  
  const progress: GenerationProgress = {
    specId: spec.id,
    unitId: spec.unitId,
    currentStep: "init",
    progress: 0,
    generatedImages: {} as Record<AnimationSlot, string>,
    errors: [],
  };
  
  activeJobs.set(jobId, progress);
  onProgress?.(progress);

  const serverJob = await startGenerationJob(spec.id);
  const serverJobId = serverJob?.id;

  const enabledAnimations = AnimationSlots.filter((slot) => {
    const config = spec.animations?.[slot] || DEFAULT_ANIMATIONS[slot];
    return config?.enabled;
  });

  const totalSteps = enabledAnimations.length;
  const results: Record<string, string> = {};
  const errors: string[] = [];

  for (let i = 0; i < enabledAnimations.length; i++) {
    const animation = enabledAnimations[i];
    progress.currentStep = animation;
    progress.progress = Math.round((i / totalSteps) * 100);
    onProgress?.(progress);

    if (serverJobId) {
      await updateGenerationJobProgress(serverJobId, {
        currentStep: animation,
        progress: progress.progress,
      });
    }

    try {
      const imageUrl = await generateAnimationFrame(spec, animation, (msg) => {
        console.log(`[${spec.unitId}] ${msg}`);
      });

      if (imageUrl) {
        results[animation] = imageUrl;
        progress.generatedImages[animation] = imageUrl;
      } else {
        errors.push(`Failed to generate ${animation}`);
        progress.errors.push({
          step: animation,
          message: `Generation returned null`,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`${animation}: ${errorMsg}`);
      progress.errors.push({
        step: animation,
        message: errorMsg,
        timestamp: Date.now(),
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  progress.currentStep = errors.length === 0 ? "complete" : "failed";
  progress.progress = 100;
  onProgress?.(progress);

  if (serverJobId) {
    await updateGenerationJobProgress(serverJobId, {
      status: errors.length === 0 ? "completed" : "failed",
      progress: 100,
      completedAt: Date.now(),
      generatedImages: results,
      errors: progress.errors,
    });
  }
  
  activeJobs.delete(jobId);

  return {
    success: errors.length === 0,
    unitId: spec.unitId,
    images: results,
    errors,
  };
}

async function updateGenerationJobProgress(
  jobId: string,
  updates: {
    status?: string;
    currentStep?: string;
    progress?: number;
    completedAt?: number;
    generatedImages?: Record<string, string>;
    errors?: Array<{ step: string; message: string; timestamp: number }>;
  }
): Promise<void> {
  try {
    await fetch(`/api/sprite-generation-jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  } catch (error) {
    console.error("Failed to update generation job progress:", error);
  }
}

export async function saveSpriteToStorage(
  unitId: string,
  animation: AnimationSlot,
  imageDataUrl: string
): Promise<{ localPath: string; objectPath?: string } | null> {
  if (!isPuterAvailable() || !window.puter?.fs) {
    console.warn("Puter FS not available for sprite storage");
    return null;
  }

  try {
    const folderStructure = getSpriteUnitFolderStructure(unitId, "/GrudgeWarlords/sprites");
    
    await window.puter.fs.mkdir(folderStructure.root).catch(() => {});
    await window.puter.fs.mkdir(folderStructure.base).catch(() => {});
    
    const filename = getSpriteFilename(unitId, animation);
    const filePath = `${folderStructure.base}/${filename}`;
    
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    
    await window.puter.fs.write(filePath, blob);
    
    return {
      localPath: filePath,
    };
  } catch (error) {
    console.error("Failed to save sprite to storage:", error);
    return null;
  }
}

export function getActiveJob(jobId: string): GenerationProgress | undefined {
  return activeJobs.get(jobId);
}

export function getAllActiveJobs(): GenerationProgress[] {
  return Array.from(activeJobs.values());
}

export async function createSpriteUnitSpec(spec: Omit<SpriteUnitSpec, "id" | "createdAt" | "updatedAt">): Promise<SpriteUnitSpec | null> {
  try {
    const response = await fetch("/api/sprite-specs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(spec),
    });
    if (!response.ok) throw new Error("Failed to create spec");
    return response.json();
  } catch (error) {
    console.error("Failed to create sprite spec:", error);
    return null;
  }
}

export async function fetchSpriteUnitSpecs(): Promise<SpriteUnitSpec[]> {
  try {
    const response = await fetch("/api/sprite-specs");
    if (!response.ok) throw new Error("Failed to fetch specs");
    return response.json();
  } catch (error) {
    console.error("Failed to fetch sprite specs:", error);
    return [];
  }
}

export async function updateSpriteUnitSpec(
  id: string,
  updates: Partial<SpriteUnitSpec>
): Promise<SpriteUnitSpec | null> {
  try {
    const response = await fetch(`/api/sprite-specs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error("Failed to update spec");
    return response.json();
  } catch (error) {
    console.error("Failed to update sprite spec:", error);
    return null;
  }
}

export async function startGenerationJob(specId: string): Promise<SpriteGenerationJob | null> {
  try {
    const response = await fetch(`/api/sprite-specs/${specId}/generate`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to start generation job");
    return response.json();
  } catch (error) {
    console.error("Failed to start generation job:", error);
    return null;
  }
}

export async function fetchGenerationJobs(specId?: string): Promise<SpriteGenerationJob[]> {
  try {
    const url = specId ? `/api/sprite-generation-jobs?specId=${specId}` : "/api/sprite-generation-jobs";
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch jobs");
    return response.json();
  } catch (error) {
    console.error("Failed to fetch generation jobs:", error);
    return [];
  }
}

export const GENERATION_PRESETS = {
  warrior: {
    race: "human",
    classType: "warrior",
    traits: {
      weapon: "sword",
      armor: "plate",
      style: "dark",
    },
  },
  mage: {
    race: "elf",
    classType: "mage",
    traits: {
      weapon: "staff",
      armor: "robes",
      style: "arcane",
    },
  },
  orc: {
    race: "orc",
    classType: "berserker",
    traits: {
      weapon: "axe",
      armor: "leather",
      style: "blood",
    },
  },
  undead: {
    race: "undead",
    classType: "necromancer",
    traits: {
      weapon: "scythe",
      armor: "robes",
      style: "shadow",
    },
  },
  ranger: {
    race: "elf",
    classType: "ranger",
    traits: {
      weapon: "bow",
      armor: "leather",
      style: "nature",
    },
  },
  paladin: {
    race: "human",
    classType: "paladin",
    traits: {
      weapon: "mace",
      armor: "plate",
      style: "holy",
    },
  },
};

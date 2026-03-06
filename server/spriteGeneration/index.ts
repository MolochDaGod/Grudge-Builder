export {
  analyzeErisTemplate,
  getAnimationFrameCounts,
  getDirectionDescriptions,
  type AnimationTemplate,
  type TemplateMetadata,
} from "./templateAnalyzer";

export {
  buildMasterSystemPrompt,
  buildCharacterPrompt,
  buildDirectionStripPrompt,
  buildReferenceBasedPrompt,
  getBarbarian16x32Prompt,
  BARBARIAN_REFERENCE,
  type SpritePromptConfig,
} from "./promptTemplates";

export {
  SpriteGeneratorService,
  spriteGenerator,
  type GenerationJob,
  type GenerationResult,
} from "./spriteGeneratorService";

export {
  processGeneratedSprite,
  batchProcess,
  createDefaultProcessingOptions,
  type ProcessingOptions,
  type ProcessedSprite,
} from "./postProcessor";

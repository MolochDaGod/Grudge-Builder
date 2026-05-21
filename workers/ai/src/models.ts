/**
 * Grudge AI Gateway — Model Registry (Worker Entry)
 *
 * Re-exports from the shared module (shared/aiModels.ts) which is the single
 * source of truth across client, server, and worker.
 *
 * Dashboard: https://dash.cloudflare.com/ee475864561b02d4588180b8b9acf694/ai/models
 */

export {
  MODEL_REGISTRY,
  AI_DEFAULTS as DEFAULTS,
  AGENT_MODELS,
  AVATAR_VOICES,
  getModel,
  getModelsByCapability,
  isValidModel,
  resolveModel,
} from '../../../shared/aiModels';
export type { ModelDef, ModelCapability, CostTier } from '../../../shared/aiModels';

/**
 * Grudge AI Gateway — Shared Model Registry
 *
 * Single source of truth for AI model IDs, capabilities, cost tiers, and smart
 * defaults.  Import from here in client, server, and worker code — never
 * hardcode model strings elsewhere.
 *
 * The authoritative runtime list is served by the AI Gateway Worker at
 * GET /v1/models  (ai.grudge-studio.com).  This file mirrors it so that
 * compile-time type-checking and autocomplete work everywhere.
 *
 * @module shared/aiModels
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type ModelCapability = 'chat' | 'image' | 'video' | 'speech' | 'music' | 'image-to-video';
export type CostTier = 'free' | 'budget' | 'standard' | 'premium';

export interface ModelDef {
  id: string;
  provider: string;
  capability: ModelCapability;
  costTier: CostTier;
  maxContext?: number;
  supportsToolCalling?: boolean;
  supportsTransparency?: boolean;
  supportsAudio?: boolean;
  notes?: string;
}

// ── Full Model Registry ──────────────────────────────────────────────────────

export const MODEL_REGISTRY: ModelDef[] = [
  // ─── Text Generation ────────────────────────────────────────────────────────
  { id: 'claude-opus-4.7',      provider: 'anthropic', capability: 'chat',  costTier: 'premium',  maxContext: 1_000_000, notes: 'Best reasoning. Code Architect, QA Analyst.' },
  { id: 'gpt-5.5',              provider: 'openai',    capability: 'chat',  costTier: 'premium',  maxContext: 1_000_000, notes: 'Flagship. Loremaster, Mission Designer.' },
  { id: 'gpt-5.5-pro',          provider: 'openai',    capability: 'chat',  costTier: 'premium',  maxContext: 1_000_000, notes: 'Responses API + built-in tools.' },
  { id: 'gpt-5.4-pro',          provider: 'openai',    capability: 'chat',  costTier: 'standard', maxContext: 1_000_000, notes: 'Fast. Low-latency chat.' },
  { id: 'kimi-k2.6',            provider: 'moonshot',  capability: 'chat',  costTier: 'standard', maxContext: 262_144,  supportsToolCalling: true, notes: 'Agentic. 262k ctx + tool calling.' },
  { id: 'qwen3.5-397b-a17b',    provider: 'alibaba',   capability: 'chat',  costTier: 'budget',   notes: 'MoE 397B/17B active. Budget reasoning.' },
  { id: 'qwen3-max',            provider: 'alibaba',   capability: 'chat',  costTier: 'budget',   notes: 'Budget. Balance Engineer, bulk tasks.' },

  // ─── Text-to-Image ──────────────────────────────────────────────────────────
  { id: 'gpt-image-1.5',        provider: 'openai',    capability: 'image', costTier: 'standard', supportsTransparency: true,  notes: 'Transparent PNGs. Critical for sprite sheets.' },
  { id: 'gpt-image-2',          provider: 'openai',    capability: 'image', costTier: 'premium',  supportsTransparency: false, notes: 'High quality. Scene art, backgrounds.' },
  { id: 'recraftv3',            provider: 'recraft',   capability: 'image', costTier: 'standard', notes: 'Design-grade. Faction logos, UI assets, accurate text.' },
  { id: 'wan-2.6-image',        provider: 'alibaba',   capability: 'image', costTier: 'free',     notes: 'Bulk generation, concept art. Free tier.' },
  { id: 'grok-imagine-image',   provider: 'xai',       capability: 'image', costTier: 'standard', notes: 'Inpainting, reference-image edits.' },

  // ─── Text-to-Video ──────────────────────────────────────────────────────────
  { id: 'seedance-2.0',         provider: 'bytedance', capability: 'video', costTier: 'premium',  supportsAudio: true,  notes: 'Best quality + native audio.' },
  { id: 'seedance-2.0-fast',    provider: 'bytedance', capability: 'video', costTier: 'standard', supportsAudio: true,  notes: 'Faster variant. Previews/iteration.' },
  { id: 'grok-imagine-video',   provider: 'xai',       capability: 'video', costTier: 'standard', supportsAudio: true,  notes: 'Extend/edit clips + dialogue/SFX/music audio.' },
  { id: 'gen-4.5',              provider: 'runwayml',  capability: 'video', costTier: 'premium',  notes: 'Image-to-video. Splash screens.' },
  { id: 'hh1-t2v',              provider: 'alibaba',   capability: 'video', costTier: 'budget',   notes: 'Text-to-video. 3-15s.' },
  { id: 'hh1-i2v',              provider: 'alibaba',   capability: 'image-to-video', costTier: 'budget', notes: 'Image-to-video. 720p/1080p.' },
  { id: 'v6',                   provider: 'pixverse',  capability: 'video', costTier: 'budget',   supportsAudio: true,  notes: 'Up to 15s. Audio generation.' },
  { id: 'v5.6',                 provider: 'pixverse',  capability: 'video', costTier: 'budget',   supportsAudio: true,  notes: '1080p. Text/image-to-video.' },
  { id: 'q3-turbo',             provider: 'vidu',      capability: 'video', costTier: 'budget',   supportsAudio: true,  notes: 'Fast. Up to 16s.' },
  { id: 'q3-pro',               provider: 'vidu',      capability: 'video', costTier: 'standard', supportsAudio: true,  notes: 'High quality. Up to 16s.' },

  // ─── Text-to-Speech ─────────────────────────────────────────────────────────
  { id: 'tts-2',                provider: 'inworld',   capability: 'speech', costTier: 'standard', notes: 'Expressive TTS. Natural language steering. 15 languages.' },

  // ─── Music Generation ───────────────────────────────────────────────────────
  { id: 'music-2.6',            provider: 'minimax',   capability: 'music', costTier: 'standard', notes: 'Full songs with vocals/instrumental. BPM/key control.' },
];

// ── Smart Defaults ───────────────────────────────────────────────────────────

export const AI_DEFAULTS = {
  chat: {
    default:   'gpt-5.4-pro',
    premium:   'gpt-5.5',
    reasoning: 'claude-opus-4.7',
    agentic:   'kimi-k2.6',
    budget:    'qwen3-max',
  },
  image: {
    default: 'gpt-image-1.5',     // Transparent PNG by default
    quality: 'gpt-image-2',
    design:  'recraftv3',
    bulk:    'wan-2.6-image',
    edit:    'grok-imagine-image',
  },
  video: {
    default:        'seedance-2.0',
    fast:           'seedance-2.0-fast',
    edit:           'grok-imagine-video',
    image_to_video: 'hh1-i2v',
    budget:         'hh1-t2v',
  },
  speech: {
    default: 'tts-2',
  },
  music: {
    default: 'music-2.6',
  },
} as const;

// ── Agent → Model Mapping ────────────────────────────────────────────────────

export const AGENT_MODELS: Record<string, string> = {
  code_architect:   'claude-opus-4.7',
  art_director:     'gpt-5.5',
  loremaster:       'gpt-5.5',
  balance_engineer: 'qwen3-max',
  qa_analyst:       'claude-opus-4.7',
  mission_designer: 'gpt-5.5',
};

// ── Avatar → Voice Mapping ───────────────────────────────────────────────────

export const AVATAR_VOICES: Record<string, { voice: string; style: string }> = {
  'crusade-ninja': { voice: 'nova',    style: 'quick and energetic' },
  'legion-viking': { voice: 'onyx',    style: 'deep and commanding' },
  'fabled-mage':   { voice: 'shimmer', style: 'calm and wise' },
};

// ── Lookup Helpers ───────────────────────────────────────────────────────────

const _byId = new Map(MODEL_REGISTRY.map(m => [m.id, m]));
const _byCapability = new Map<ModelCapability, ModelDef[]>();
for (const m of MODEL_REGISTRY) {
  const list = _byCapability.get(m.capability) || [];
  list.push(m);
  _byCapability.set(m.capability, list);
}

export function getModel(id: string): ModelDef | undefined {
  return _byId.get(id);
}

export function getModelsByCapability(cap: ModelCapability): ModelDef[] {
  return _byCapability.get(cap) || [];
}

export function isValidModel(id: string): boolean {
  return _byId.has(id);
}

/** Resolve model: explicit → agent default → capability default → fallback */
export function resolveModel(
  explicit: string | undefined,
  capability: ModelCapability,
  agent?: string,
): string {
  if (explicit && isValidModel(explicit)) return explicit;
  if (agent && AGENT_MODELS[agent]) return AGENT_MODELS[agent];
  const defaults = AI_DEFAULTS[capability as keyof typeof AI_DEFAULTS];
  if (defaults && 'default' in defaults) return (defaults as any).default;
  return 'gpt-5.4-pro';
}

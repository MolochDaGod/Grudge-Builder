/**
 * Grudge AI Gateway — Client SDK
 *
 * Typed client for all AI Gateway endpoints at ai.grudge-studio.com.
 * Uses shared model registry for compile-time validation and dynamic selection.
 *
 * Usage:
 *   import { aiGateway } from '@/lib/aiGateway';
 *   const result = await aiGateway.image({ prompt: '...', transparent: true });
 *
 * @module client/lib/aiGateway
 */

import { AI_GATEWAY, authHeaders } from './grudgeConfig';
import { AI_DEFAULTS, MODEL_REGISTRY, getModelsByCapability } from '@shared/aiModels';
import type { ModelCapability, ModelDef } from '@shared/aiModels';

// ── Response Envelope ────────────────────────────────────────────────────────

interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  request_id?: string;
}

// ── Request/Response Types ───────────────────────────────────────────────────

export interface ChatOptions {
  model?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  agent?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatResult {
  id: string;
  model: string;
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface ImageOptions {
  model?: string;
  prompt: string;
  negative_prompt?: string;
  size?: string;
  quality?: string;
  transparent?: boolean;
  upload_to_r2?: boolean;
  r2_path?: string;
  reference_image?: string;
  n?: number;
}

export interface ImageResult {
  id: string;
  model: string;
  images: Array<{
    b64_json?: string;
    url?: string;
    r2_path?: string;
    revised_prompt?: string;
  }>;
}

export interface VideoOptions {
  model?: string;
  prompt: string;
  reference_image?: string;
  duration?: number;
  aspect_ratio?: string;
  audio?: boolean;
  upload_to_r2?: boolean;
  r2_path?: string;
}

export interface SpeechOptions {
  model?: string;
  text: string;
  avatar?: string;
  voice?: string;
  language?: string;
  upload_to_r2?: boolean;
  r2_path?: string;
}

export interface MusicOptions {
  model?: string;
  prompt: string;
  lyrics?: string;
  bpm?: number;
  key?: string;
  instrumental?: boolean;
  duration?: number;
  upload_to_r2?: boolean;
  r2_path?: string;
}

export interface JobResult {
  job_id: string;
  type: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  model: string;
  result?: unknown;
  error?: string;
  created_at: string;
  completed_at?: string;
}

/** All tool names the agent pipeline can invoke. */
export type AgentToolName =
  | 'image_gen' | 'video_gen' | 'speech_gen' | 'music_gen'
  | 'poll_job' | 'lore_lookup' | 'balance_calc' | 'chat';

export interface AgentOptions {
  model?: string;
  task: string;
  context?: Record<string, unknown>;
  max_steps?: number;
  tools?: AgentToolName[];
  agent?: string;
}

export interface AgentStep {
  step: number;
  agent: string;
  model: string;
  action: string;
  input: string;
  output: string;
  tool_used?: string;
  tokens: number;
  duration_ms: number;
}

export interface PendingJob {
  job_id: string;
  type: string;
  model: string;
  status: string;
}

export interface AgentResult {
  id: string;
  task: string;
  steps: AgentStep[];
  result: unknown;
  total_tokens: number;
  duration_ms: number;
  /** Jobs that didn't resolve within the 25s auto-await window. Poll via pollJob(). */
  pending_jobs?: PendingJob[];
}

// ── Core fetch helper ────────────────────────────────────────────────────────

async function gatewayFetch<T>(path: string, body?: unknown): Promise<T> {
  const isGet = !body;
  const res = await fetch(`${AI_GATEWAY}${path}`, {
    method: isGet ? 'GET' : 'POST',
    headers: authHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json: ApiResponse<T> = await res.json();

  if (!json.ok) {
    throw new Error(json.error || `AI Gateway error: ${res.status}`);
  }

  return json.data as T;
}

// ── Public SDK ───────────────────────────────────────────────────────────────

export const aiGateway = {
  /**
   * Text generation.
   * Default model: gpt-5.4-pro (fast) | Use agent param for Legion personas.
   */
  async chat(opts: ChatOptions): Promise<ChatResult> {
    return gatewayFetch<ChatResult>('/v1/chat', {
      model: opts.model || AI_DEFAULTS.chat.default,
      ...opts,
    });
  },

  /**
   * Image generation.
   * Default model: gpt-image-1.5 (transparent PNGs).
   * Set transparent: true for sprite sheets.
   */
  async image(opts: ImageOptions): Promise<ImageResult> {
    const model = opts.model
      || (opts.transparent ? AI_DEFAULTS.image.default : AI_DEFAULTS.image.quality);
    return gatewayFetch<ImageResult>('/v1/image', { ...opts, model });
  },

  /**
   * Video generation (async — returns job_id).
   * Default model: seedance-2.0.
   */
  async video(opts: VideoOptions): Promise<JobResult> {
    return gatewayFetch<JobResult>('/v1/video', {
      model: opts.model || AI_DEFAULTS.video.default,
      ...opts,
    });
  },

  /**
   * Text-to-speech.
   * Default model: tts-2.  Use avatar param for Grudge NPC voice presets.
   */
  async speech(opts: SpeechOptions): Promise<JobResult> {
    return gatewayFetch<JobResult>('/v1/speech', {
      model: opts.model || AI_DEFAULTS.speech.default,
      ...opts,
    });
  },

  /**
   * Music generation (async — returns job_id).
   * Default model: music-2.6.
   */
  async music(opts: MusicOptions): Promise<JobResult> {
    return gatewayFetch<JobResult>('/v1/music', {
      model: opts.model || AI_DEFAULTS.music.default,
      ...opts,
    });
  },

  /**
   * Self-prompting agent pipeline.
   * Autonomously breaks a task into steps, calling tools (image_gen, video_gen,
   * speech_gen, music_gen, lore_lookup, balance_calc, chat) as needed.
   */
  async agent(opts: AgentOptions): Promise<AgentResult> {
    return gatewayFetch<AgentResult>('/v1/agent', opts);
  },

  /** Poll an async job by ID (video/music generation). */
  async pollJob(jobId: string): Promise<JobResult> {
    return gatewayFetch<JobResult>(`/v1/jobs/${jobId}`);
  },

  /** List all available models from the live gateway. */
  async listModels(): Promise<{ models: ModelDef[]; defaults: typeof AI_DEFAULTS; total: number }> {
    return gatewayFetch('/v1/models');
  },

  /** Health check (public, no auth). */
  async health(): Promise<{ ok: boolean; models: number; version: string }> {
    const res = await fetch(`${AI_GATEWAY}/health`);
    return res.json();
  },

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Get all models for a given capability from the shared registry. */
  getModels(capability: ModelCapability): ModelDef[] {
    return getModelsByCapability(capability);
  },

  /** Get the default model ID for a capability. */
  getDefault(capability: keyof typeof AI_DEFAULTS): string {
    return AI_DEFAULTS[capability].default;
  },

  /** The full shared model registry (for building UIs). */
  registry: MODEL_REGISTRY,

  /** Smart defaults by capability. */
  defaults: AI_DEFAULTS,
};

export default aiGateway;

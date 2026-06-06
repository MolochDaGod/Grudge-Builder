/**
 * Grudge AI Gateway — Shared Types
 */

// ── Cloudflare Bindings ──────────────────────────────────────────────────────

export interface Env {
  AI: Ai;
  ASSETS: R2Bucket;
  JOBS_DB: D1Database;
  JOB_QUEUE: Queue;
  JWT_SECRET: string;
  CF_AI_GATEWAY_TOKEN?: string;
  ENVIRONMENT: string;
  ASSETS_CDN_URL: string;
  CF_ACCOUNT_ID: string;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface GrudgeUser {
  grudge_id: string;
  account_id?: string;
  username?: string;
  tier?: 'master_admin' | 'admin' | 'member' | 'pleb';
}

// ── Model Types ──────────────────────────────────────────────────────────────

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

// ── Request/Response Types ───────────────────────────────────────────────────

// POST /v1/chat
export interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
  agent?: string;        // Legion agent ID — injects system prompt
  temperature?: number;
  max_tokens?: number;
  tools?: ToolDef[];
  stream?: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

export interface ToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  model: string;
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

// POST /v1/image
export interface ImageRequest {
  model?: string;
  prompt: string;
  negative_prompt?: string;
  size?: string;           // "1024x1024", "512x512", etc.
  quality?: string;        // "low", "medium", "high"
  transparent?: boolean;   // Force gpt-image-1.5 for alpha
  upload_to_r2?: boolean;
  r2_path?: string;        // e.g. "sprites/generated/barbarian_idle.png"
  reference_image?: string; // URL for inpainting/editing
  n?: number;              // Number of images (default 1)
}

export interface ImageResponse {
  id: string;
  model: string;
  images: GeneratedImage[];
}

export interface GeneratedImage {
  b64_json?: string;
  url?: string;              // CDN URL if uploaded to R2
  r2_path?: string;
  revised_prompt?: string;
}

// POST /v1/video
export interface VideoRequest {
  model?: string;
  prompt: string;
  reference_image?: string;
  reference_video?: string;
  duration?: number;          // seconds
  aspect_ratio?: string;
  audio?: boolean;
  upload_to_r2?: boolean;
  r2_path?: string;
}

// POST /v1/speech
export interface SpeechRequest {
  model?: string;
  text: string;
  avatar?: string;           // Kira/Varg/Sage — maps to voice preset
  voice?: string;
  language?: string;
  upload_to_r2?: boolean;
  r2_path?: string;
}

// POST /v1/music
export interface MusicRequest {
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

// POST /v1/agent (self-prompting pipeline)
export interface AgentRequest {
  model?: string;
  task: string;
  context?: Record<string, unknown>;
  max_steps?: number;        // Default 5
  tools?: string[];          // Tool names: "image_gen", "lore_lookup", "balance_calc", etc.
  agent?: string;            // Agent persona to start with
}

export interface AgentResponse {
  id: string;
  task: string;
  steps: AgentStep[];
  result: unknown;
  total_tokens: number;
  duration_ms: number;
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

// ── Async Job ────────────────────────────────────────────────────────────────

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type JobType = 'video' | 'music' | 'agent' | 'batch_image';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  model: string;
  request: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  grudge_id: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  result?: Record<string, unknown>;
  error?: string;
  created_at: string;
  updated_at: string;
}

// ── Standard API Response ────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  request_id: string;
}

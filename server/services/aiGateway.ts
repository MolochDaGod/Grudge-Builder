/**
 * Unified AI Gateway Service
 *
 * Routes AI requests to the best available provider:
 *   1. Ollama (local) — free, fast, offline-capable
 *   2. ai.grudge-studio.com (cloud) — 137+ models via CF AI Gateway
 *   3. OpenAI direct — fallback for image gen
 *
 * Task-based model routing:
 *   code     → qwen2.5-coder:7b (local) | kimi-k2.6 (cloud)
 *   game     → grudge-dev (local) | gpt-4o-mini (cloud)
 *   vision   → llama3.2-vision:11b (local) | gpt-4o (cloud)
 *   chat     → qwen3:8b (local) | gpt-4o-mini (cloud)
 *   embed    → nomic-embed-text (local) | text-embedding-3-small (cloud)
 *   quick    → gemma3:4b (local) | gpt-4o-mini (cloud)
 *   debug    → qwen2.5-coder:7b (local) | gpt-4o-mini (cloud)
 *   generate → grudge-dev (local) | gpt-4o (cloud)
 */

export type AITaskType = "code" | "game" | "vision" | "chat" | "embed" | "quick" | "debug" | "generate" | "image" | "speech" | "music" | "video";
export type AIProvider = "ollama" | "cloud" | "openai";

// ── Model routing table ─────────────────────────────────────────────

export interface ModelRoute {
  ollama: string;
  cloud: string;
  description: string;
}

export const MODEL_ROUTES: Record<AITaskType, ModelRoute> = {
  code:     { ollama: "qwen2.5-coder:7b",      cloud: "kimi-k2.6",         description: "Code completion, refactoring, debugging" },
  game:     { ollama: "grudge-dev",             cloud: "gpt-4o-mini",       description: "Game design, balance, NPC dialogue" },
  vision:   { ollama: "llama3.2-vision:11b",    cloud: "gpt-4o",            description: "Image analysis, sprite understanding" },
  chat:     { ollama: "qwen3:8b",               cloud: "gpt-4o-mini",       description: "General chat, reasoning, Q&A" },
  embed:    { ollama: "nomic-embed-text",        cloud: "text-embedding-3-small", description: "Semantic search, RAG embeddings" },
  quick:    { ollama: "gemma3:4b",              cloud: "gpt-4o-mini",       description: "Fast lightweight tasks" },
  debug:    { ollama: "qwen2.5-coder:7b",       cloud: "gpt-4o-mini",       description: "Error analysis, stack traces" },
  generate: { ollama: "grudge-dev",             cloud: "gpt-4o",            description: "Content generation, lore, missions" },
  image:    { ollama: "",                       cloud: "gpt-image-1",       description: "Image generation (cloud only)" },
  speech:   { ollama: "",                       cloud: "openai/tts-1",      description: "Text-to-speech (cloud only)" },
  music:    { ollama: "",                       cloud: "suno/v3.5",         description: "Music generation (cloud only)" },
  video:    { ollama: "",                       cloud: "kling/v1",          description: "Video generation (cloud only)" },
};

// ── Provider status ─────────────────────────────────────────────────

const OLLAMA_BASE = process.env.OLLAMA_HOST || "http://localhost:11434";
const CLOUD_BASE = "https://ai.grudge-studio.com";

interface ProviderStatus {
  online: boolean;
  models: string[];
  checkedAt: number;
}

const providerCache: Record<string, ProviderStatus> = {
  ollama: { online: false, models: [], checkedAt: 0 },
  cloud:  { online: false, models: [], checkedAt: 0 },
};

const CACHE_TTL = 30_000; // 30s

export async function checkOllamaStatus(): Promise<ProviderStatus> {
  const now = Date.now();
  if (now - providerCache.ollama.checkedAt < CACHE_TTL) return providerCache.ollama;

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error("not ok");
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    providerCache.ollama = {
      online: true,
      models: data.models?.map(m => m.name) ?? [],
      checkedAt: now,
    };
  } catch {
    providerCache.ollama = { online: false, models: [], checkedAt: now };
  }
  return providerCache.ollama;
}

export async function checkCloudStatus(): Promise<ProviderStatus> {
  const now = Date.now();
  if (now - providerCache.cloud.checkedAt < CACHE_TTL) return providerCache.cloud;

  try {
    const res = await fetch(`${CLOUD_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("not ok");
    const data = await res.json() as { ok: boolean; models?: number };
    providerCache.cloud = {
      online: data.ok,
      models: [], // cloud has 137+ models, don't enumerate
      checkedAt: now,
    };
  } catch {
    providerCache.cloud = { online: false, models: [], checkedAt: now };
  }
  return providerCache.cloud;
}

// ── Resolve best provider for a task ────────────────────────────────

export interface ResolvedRoute {
  provider: AIProvider;
  model: string;
  baseUrl: string;
  available: boolean;
}

export async function resolveProvider(
  task: AITaskType,
  preferLocal = true,
): Promise<ResolvedRoute> {
  const route = MODEL_ROUTES[task];
  if (!route) {
    return { provider: "cloud", model: "gpt-4o-mini", baseUrl: CLOUD_BASE, available: false };
  }

  // Cloud-only tasks (image, speech, music, video)
  if (!route.ollama) {
    const cloud = await checkCloudStatus();
    return { provider: "cloud", model: route.cloud, baseUrl: CLOUD_BASE, available: cloud.online };
  }

  if (preferLocal) {
    const ollama = await checkOllamaStatus();
    if (ollama.online && ollama.models.some(m => m.startsWith(route.ollama.split(":")[0]))) {
      return { provider: "ollama", model: route.ollama, baseUrl: OLLAMA_BASE, available: true };
    }
  }

  const cloud = await checkCloudStatus();
  return { provider: "cloud", model: route.cloud, baseUrl: CLOUD_BASE, available: cloud.online };
}

// ── Unified chat call ───────────────────────────────────────────────

export interface GatewayMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GatewayChatOptions {
  task?: AITaskType;
  provider?: AIProvider;       // force a specific provider
  model?: string;              // force a specific model
  messages: GatewayMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  agent?: string;              // Legion agent persona (cloud only)
}

export interface GatewayChatResult {
  provider: AIProvider;
  model: string;
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export async function gatewayChat(opts: GatewayChatOptions): Promise<GatewayChatResult> {
  const task = opts.task || "chat";
  const resolved = opts.provider
    ? { provider: opts.provider, model: opts.model || MODEL_ROUTES[task]?.[opts.provider === "ollama" ? "ollama" : "cloud"] || "gpt-4o-mini", baseUrl: opts.provider === "ollama" ? OLLAMA_BASE : CLOUD_BASE, available: true }
    : await resolveProvider(task);

  if (!resolved.available) {
    throw new Error(`No AI provider available for task "${task}"`);
  }

  const model = opts.model || resolved.model;

  if (resolved.provider === "ollama") {
    // Direct Ollama call
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: opts.messages,
        stream: false,
        options: opts.temperature !== undefined ? { temperature: opts.temperature } : undefined,
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const data = await res.json() as { message?: { content: string }; eval_count?: number; prompt_eval_count?: number };
    return {
      provider: "ollama",
      model,
      content: data.message?.content ?? "",
      usage: {
        prompt_tokens: data.prompt_eval_count ?? 0,
        completion_tokens: data.eval_count ?? 0,
        total_tokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      },
    };
  }

  // Cloud call via ai.grudge-studio.com
  const token = process.env.GRUDGE_AUTH_TOKEN || process.env.JWT_SECRET || "";
  const res = await fetch(`${CLOUD_BASE}/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      ...(opts.agent ? { agent: opts.agent } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Cloud AI ${res.status}`);
  const data = await res.json() as { ok: boolean; data?: { content: string; usage?: any }; error?: string };
  if (!data.ok) throw new Error(data.error || "Cloud AI error");

  return {
    provider: "cloud",
    model,
    content: data.data?.content ?? "",
    usage: data.data?.usage,
  };
}

// ── Status endpoint data ────────────────────────────────────────────

export async function getFullStatus() {
  const [ollama, cloud] = await Promise.all([checkOllamaStatus(), checkCloudStatus()]);
  return {
    ollama: { ...ollama, host: OLLAMA_BASE },
    cloud: { ...cloud, host: CLOUD_BASE },
    routing: Object.entries(MODEL_ROUTES).map(([task, route]) => ({
      task,
      localModel: route.ollama || null,
      cloudModel: route.cloud,
      localAvailable: !!route.ollama && ollama.online && ollama.models.some(m => m.startsWith(route.ollama.split(":")[0])),
      cloudAvailable: cloud.online,
      description: route.description,
    })),
  };
}

/**
 * Grudge AI Client — frontend service manager.
 *
 * Detects Ollama (local) and ai.grudge-studio.com (cloud) availability,
 * routes requests by task type, provides React-friendly hooks.
 *
 * Usage:
 *   import { aiClient, useAIStatus } from "@/lib/aiClient";
 *   const result = await aiClient.chat("code", "Fix this bug: ...");
 *   const { status } = useAIStatus();
 */

import { useQuery } from "@tanstack/react-query";

// ── Types ───────────────────────────────────────────────────────────

export type AITaskType = "code" | "game" | "vision" | "chat" | "embed" | "quick" | "debug" | "generate" | "image" | "speech" | "music" | "video";
export type AIProvider = "ollama" | "cloud" | "auto";

export interface AIRouteInfo {
  task: string;
  localModel: string | null;
  cloudModel: string;
  localAvailable: boolean;
  cloudAvailable: boolean;
  description: string;
}

export interface AIStatus {
  ollama: { online: boolean; models: string[]; host: string };
  cloud: { online: boolean; host: string };
  routing: AIRouteInfo[];
}

export interface AIChatResult {
  provider: string;
  model: string;
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// ── Preferences (persisted to localStorage) ─────────────────────────

const PREFS_KEY = "grudge_ai_prefs";

export interface AIPrefs {
  preferLocal: boolean;           // default: true (Ollama first)
  taskOverrides: Partial<Record<AITaskType, AIProvider>>; // per-task force
  defaultModel?: string;          // global model override
}

function loadPrefs(): AIPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : { preferLocal: true, taskOverrides: {} };
  } catch {
    return { preferLocal: true, taskOverrides: {} };
  }
}

function savePrefs(prefs: AIPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

// ── Client ──────────────────────────────────────────────────────────

class GrudgeAIClient {
  private prefs: AIPrefs;
  private statusCache: AIStatus | null = null;
  private statusCacheTime = 0;

  constructor() {
    this.prefs = loadPrefs();
  }

  // ── Status ──

  async getStatus(force = false): Promise<AIStatus> {
    const now = Date.now();
    if (!force && this.statusCache && now - this.statusCacheTime < 15_000) {
      return this.statusCache;
    }

    const res = await fetch("/api/ai/gateway/status");
    if (!res.ok) throw new Error("Failed to fetch AI status");
    const data = await res.json();
    this.statusCache = data;
    this.statusCacheTime = now;
    return data;
  }

  // ── Preferences ──

  getPrefs(): AIPrefs { return { ...this.prefs }; }

  setPreferLocal(v: boolean) {
    this.prefs.preferLocal = v;
    savePrefs(this.prefs);
  }

  setTaskOverride(task: AITaskType, provider: AIProvider | "auto") {
    if (provider === "auto") {
      delete this.prefs.taskOverrides[task];
    } else {
      this.prefs.taskOverrides[task] = provider;
    }
    savePrefs(this.prefs);
  }

  // ── Chat (non-streaming) ──

  async chat(task: AITaskType, userMessage: string, systemMessage?: string): Promise<AIChatResult> {
    const messages: Array<{ role: string; content: string }> = [];
    if (systemMessage) messages.push({ role: "system", content: systemMessage });
    messages.push({ role: "user", content: userMessage });

    return this.chatRaw({ task, messages });
  }

  async chatRaw(opts: {
    task?: AITaskType;
    messages: Array<{ role: string; content: string }>;
    provider?: AIProvider;
    model?: string;
    temperature?: number;
    agent?: string;
  }): Promise<AIChatResult> {
    const body = {
      task: opts.task || "chat",
      messages: opts.messages,
      preferLocal: this.prefs.preferLocal,
      provider: opts.provider || this.prefs.taskOverrides[opts.task || "chat"],
      model: opts.model,
      temperature: opts.temperature,
      agent: opts.agent,
    };

    const res = await fetch("/api/ai/gateway/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as any).error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ── Streaming chat (SSE) ──

  async *chatStream(task: AITaskType, userMessage: string, systemMessage?: string): AsyncGenerator<string> {
    const override = this.prefs.taskOverrides[task];

    // If forced to local or auto-local, use Ollama streaming
    const body = {
      task,
      messages: [
        ...(systemMessage ? [{ role: "system", content: systemMessage }] : []),
        { role: "user", content: userMessage },
      ],
      preferLocal: this.prefs.preferLocal,
      provider: override,
    };

    const res = await fetch("/api/ai/gateway/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) throw new Error(`Stream failed: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") return;
        try {
          const parsed = JSON.parse(payload);
          const token = parsed.message?.content || parsed.choices?.[0]?.delta?.content || "";
          if (token) yield token;
        } catch { /* partial JSON */ }
      }
    }
  }
}

export const aiClient = new GrudgeAIClient();

// ── React Hooks ─────────────────────────────────────────────────────

export function useAIStatus() {
  return useQuery<AIStatus>({
    queryKey: ["ai", "status"],
    queryFn: () => aiClient.getStatus(),
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 1,
  });
}

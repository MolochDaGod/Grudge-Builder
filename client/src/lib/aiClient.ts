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
import { isPuterReady } from "./puterIntegration";

// ── Types ───────────────────────────────────────────────────────────

export type AITaskType = "code" | "game" | "vision" | "chat" | "embed" | "quick" | "debug" | "generate" | "image" | "speech" | "music" | "video";
export type AIProvider = "ollama" | "cloud" | "puter" | "auto";

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
  puter: { online: boolean; model: string };
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

    // Try cloud gateway first
    let cloudOnline = false;
    let ollamaOnline = false;
    let ollamaModels: string[] = [];
    let routing: AIRouteInfo[] = [];

    try {
      const res = await fetch("/api/ai/gateway/status");
      if (res.ok) {
        const data = await res.json();
        cloudOnline = data.cloud?.online ?? false;
        ollamaOnline = data.ollama?.online ?? false;
        ollamaModels = data.ollama?.models ?? [];
        routing = data.routing ?? [];
      }
    } catch { /* gateway unreachable */ }

    // Puter AI: always available if SDK loaded + user signed in
    const puterOnline = isPuterReady();

    const status: AIStatus = {
      ollama: { online: ollamaOnline, models: ollamaModels, host: "localhost:11434" },
      cloud: { online: cloudOnline, host: "ai.grudge-studio.com" },
      puter: { online: puterOnline, model: "gpt-4o-mini" },
      routing,
    };

    this.statusCache = status;
    this.statusCacheTime = now;
    return status;
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
    // Puter SDK is not a client path — Railway /api/ai/chat is SSOT (Legion then Puter backup).
    const forceRouter = opts.provider === "puter";
    const status = this.statusCache;
    const cloudDown = status && !status.cloud.online && !status.ollama.online;

    if (forceRouter || cloudDown) {
      return this.chatViaRouter(opts);
    }

    // Try cloud/ollama gateway
    try {
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
        return this.chatViaRouter(opts);
      }
      return res.json();
    } catch (gatewayErr) {
      try {
        return await this.chatViaRouter(opts);
      } catch {
        throw gatewayErr;
      }
    }
  }

  /** Chat via Railway gruda-ai-router (Legion first, Puter backup server-side). */
  private async chatViaRouter(opts: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
  }): Promise<AIChatResult> {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: opts.messages,
        model: opts.model || "cheap",
        page: "warlords_aiClient",
        maxTokens: 1000,
        tier: "cheap",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || "ai_router_failed");
    }
    return {
      provider: data.modelUsed || "gruda-ai-router",
      model: data.modelUsed || "auto",
      content: data.text || "",
      usage: data.usage,
    };
  }

  // ── Streaming chat (SSE) ──

  async *chatStream(task: AITaskType, userMessage: string, systemMessage?: string): AsyncGenerator<string> {
    const override = this.prefs.taskOverrides[task];
    const messages = [
      ...(systemMessage ? [{ role: "system", content: systemMessage }] : []),
      { role: "user", content: userMessage },
    ];

    const status = this.statusCache;
    const cloudDown = status && !status.cloud.online && !status.ollama.online;

    if (override === "puter" || cloudDown) {
      const result = await this.chatViaRouter({ messages });
      yield result.content;
      return;
    }

    // Try cloud/ollama streaming gateway
    try {
      const body = {
        task,
        messages,
        preferLocal: this.prefs.preferLocal,
        provider: override,
      };

      const res = await fetch("/api/ai/gateway/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        const result = await this.chatViaRouter({ messages });
        yield result.content;
        return;
      }

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
    } catch (err) {
      try {
        const result = await this.chatViaRouter({ messages });
        yield result.content;
        return;
      } catch {
        throw err;
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

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
import { isPuterAvailable, isPuterReady, puterAI } from "./puterIntegration";

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
    // If explicitly forcing puter, or cloud is down and puter is ready → use Puter AI
    const forcePuter = opts.provider === "puter";
    const status = this.statusCache;
    const cloudDown = status && !status.cloud.online && !status.ollama.online;
    const puterReady = isPuterReady();

    if ((forcePuter || cloudDown) && puterReady) {
      return this.chatViaPuter(opts);
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
        // Gateway returned error — fall back to Puter if available
        if (puterReady) return this.chatViaPuter(opts);
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as any).error || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (gatewayErr) {
      // Network error or gateway down — fall back to Puter
      if (puterReady) return this.chatViaPuter(opts);
      throw gatewayErr;
    }
  }

  /** Chat via Puter SDK (free, user-pays model). */
  private async chatViaPuter(opts: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
  }): Promise<AIChatResult> {
    // Build a single prompt from messages (Puter chat takes a string or message array)
    const prompt = opts.messages.map(m => {
      if (m.role === "system") return `[System] ${m.content}`;
      if (m.role === "user") return m.content;
      return `[Assistant] ${m.content}`;
    }).join("\n\n");

    const result = await puterAI.chat(prompt, {
      temperature: opts.temperature,
      maxTokens: 1000,
    });

    if (!result) throw new Error("Puter AI returned no response");

    return {
      provider: "puter",
      model: "gpt-4o-mini",
      content: result,
    };
  }

  // ── Streaming chat (SSE) ──

  async *chatStream(task: AITaskType, userMessage: string, systemMessage?: string): AsyncGenerator<string> {
    const override = this.prefs.taskOverrides[task];
    const messages = [
      ...(systemMessage ? [{ role: "system", content: systemMessage }] : []),
      { role: "user", content: userMessage },
    ];

    // Check if we should use Puter AI directly (no streaming, but works)
    const status = this.statusCache;
    const cloudDown = status && !status.cloud.online && !status.ollama.online;
    const puterReady = isPuterReady();

    if ((override === "puter" || cloudDown) && puterReady) {
      // Puter doesn't support SSE streaming — do a full request and yield the result
      const result = await this.chatViaPuter({ messages, temperature: undefined });
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
        // Stream failed — fall back to Puter non-streaming
        if (puterReady) {
          const result = await this.chatViaPuter({ messages, temperature: undefined });
          yield result.content;
          return;
        }
        throw new Error(`Stream failed: ${res.status}`);
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
      // Gateway network error — fall back to Puter
      if (puterReady) {
        const result = await this.chatViaPuter({ messages, temperature: undefined });
        yield result.content;
        return;
      }
      throw err;
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

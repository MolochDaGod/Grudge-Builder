/**
 * AnythingLLM Developer API client — local RAG knowledge layer for Grudge Studio.
 * Docs: http://localhost:3001/api/docs
 */

export type AnythingLLMWorkspaceSlug =
  | "grudge-fleet"
  | "grudge-game-data"
  | "grudge-backend"
  | "grudge-supabase"
  | "my-workspace";

export type AnythingLLMChatMode = "automatic" | "query" | "chat";

export interface AnythingLLMChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AnythingLLMChatResult {
  id: string;
  type: string;
  textResponse: string | null;
  sources: Array<{ title?: string; chunk?: string; text?: string }>;
  close: boolean;
  error: string | null;
}

const BASE_URL = (process.env.ANYTHINGLLM_BASE_URL || "http://localhost:3001/api").replace(/\/$/, "");
const API_KEY = process.env.ANYTHINGLLM_API_KEY || "";
const DEFAULT_WORKSPACE = (process.env.ANYTHINGLLM_DEFAULT_WORKSPACE || "grudge-fleet") as AnythingLLMWorkspaceSlug;

function headers(json = true): HeadersInit {
  const h: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_KEY) {
    throw new Error("ANYTHINGLLM_API_KEY is not configured");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers as Record<string, string> | undefined) },
    signal: init?.signal ?? AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AnythingLLM ${path} failed (${res.status}): ${text || res.statusText}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function getAnythingLLMConfig() {
  return {
    baseUrl: BASE_URL,
    defaultWorkspace: DEFAULT_WORKSPACE,
    configured: Boolean(API_KEY),
    uiUrl: BASE_URL.replace(/\/api$/, ""),
  };
}

export async function checkAnythingLLMStatus() {
  if (!API_KEY) {
    return { online: false, authenticated: false, workspaces: [] as string[], error: "missing_api_key" };
  }

  try {
    const auth = await request<{ authenticated: boolean }>("/v1/auth", { method: "GET" });
    const list = await request<{ workspaces: Array<{ slug: string; name: string }> }>("/v1/workspaces", { method: "GET" });
    return {
      online: true,
      authenticated: auth.authenticated,
      workspaces: list.workspaces?.map((w) => w.slug) ?? [],
      error: null as string | null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AnythingLLM unreachable";
    return { online: false, authenticated: false, workspaces: [] as string[], error: message };
  }
}

export async function listWorkspaces() {
  const data = await request<{ workspaces: unknown[] }>("/v1/workspaces");
  return data.workspaces ?? [];
}

export async function uploadLink(url: string, title: string) {
  return request<{ success: boolean; documents?: Array<{ id: string; title: string }> }>("/v1/document/upload-link", {
    method: "POST",
    body: JSON.stringify({ link: url, metadata: { title } }),
  });
}

export async function uploadRawText(textContent: string, title: string) {
  return request<{ success: boolean; documents?: Array<{ id: string; title: string }> }>("/v1/document/raw-text", {
    method: "POST",
    body: JSON.stringify({ textContent, metadata: { title } }),
  });
}

export async function attachDocumentsToWorkspace(slug: AnythingLLMWorkspaceSlug, adds: string[], deletes: string[] = []) {
  return request<{ workspace: unknown }>(`/v1/workspace/${slug}/update-embeddings`, {
    method: "POST",
    body: JSON.stringify({ adds, deletes }),
  });
}

export async function workspaceChat(options: {
  workspace?: AnythingLLMWorkspaceSlug;
  message: string;
  mode?: AnythingLLMChatMode;
  sessionId?: string;
}) {
  const slug = options.workspace ?? DEFAULT_WORKSPACE;
  return request<AnythingLLMChatResult>(`/v1/workspace/${slug}/chat`, {
    method: "POST",
    body: JSON.stringify({
      message: options.message,
      mode: options.mode ?? "query",
      sessionId: options.sessionId,
    }),
  });
}

export async function workspaceVectorSearch(options: {
  workspace?: AnythingLLMWorkspaceSlug;
  query: string;
  topN?: number;
}) {
  const slug = options.workspace ?? DEFAULT_WORKSPACE;
  return request<unknown>(`/v1/workspace/${slug}/vector-search`, {
    method: "POST",
    body: JSON.stringify({
      query: options.query,
      topN: options.topN ?? 4,
    }),
  });
}

/** Map Grudge task types to the best RAG workspace. */
export function resolveRagWorkspace(task?: string): AnythingLLMWorkspaceSlug {
  switch (task) {
    case "game":
    case "crafting":
    case "items":
    case "recipes":
    case "professions":
      return "grudge-game-data";
    case "supabase":
    case "database":
    case "schema":
      return "grudge-supabase";
    case "code":
    case "debug":
    case "api":
      return "grudge-backend";
    case "fleet":
    case "deploy":
    case "infra":
      return "grudge-fleet";
    default:
      return DEFAULT_WORKSPACE;
  }
}
import type { Character } from "./characterManager";
import { authHeaders } from "./grudgeBackend";
import { fleetApi } from "./grudgeFleet";
import {
  ERA_META,
  mergeEraSlots,
  normalizeGameEra,
  type AccountEraSlots,
  type GameEra,
} from "@shared/definitions/gameEras";

export interface CharacterEnvelope {
  characters: Character[];
  era: GameEra | null;
  eraSlots: AccountEraSlots;
  eraMeta: typeof ERA_META;
}

/**
 * Grudge Builder — Backend API Client
 * =====================================
 * All game data lives on Railway (grudge-api-production) — Postgres SSOT.
 * Auth: Bearer JWT via grudgeBackend.ts authHeaders()
 * Base: same-origin /api/* — Vercel rewrites → Railway game-data API (see @shared/fleet).
 */

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 < Date.now() - 5000;
  } catch {
    return false;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...(options.headers as Record<string, string> | undefined),
  };
  // Private roster/wallet routes: skip network when there is no Bearer (quiet guests)
  const needsAuth =
    path.includes("/characters") ||
    path.includes("/wallet") ||
    path.includes("/treaty") ||
    path.includes("/account");
  if (needsAuth && !headers.Authorization) {
    throw new Error(`Not signed in — open Sign in to load your heroes`);
  }
  const res = await fetch(fleetApi(path), {
    ...options,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    // Only clear token when JWT is clearly expired — never wipe a good session
    // on transient 401 / secret mismatch (that made /home look "empty" forever).
    if (res.status === 401 || res.status === 403) {
      try {
        const { getToken, clearToken } = await import("./grudgeBackend");
        const t = getToken();
        if (t && isJwtExpired(t)) clearToken();
      } catch {
        /* ignore */
      }
      throw new Error(
        body?.error ||
          `Session rejected (${res.status}). Sign in again to load your characters.`,
      );
    }
    throw new Error(body?.error || `API ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export const WARLORDS_ERA: GameEra = "warlords";

export const characterAPI = {
  getAll: async (era: GameEra = WARLORDS_ERA): Promise<Character[]> => {
    // Propagate errors to home UI (do not swallow as empty roster)
    const envelope = await characterAPI.getEnvelope(era);
    return envelope.characters;
  },

  getEnvelope: async (era: GameEra = WARLORDS_ERA): Promise<CharacterEnvelope> => {
    // Always request envelope so eraSlots + full roster shape is consistent
    const data = await apiFetch<CharacterEnvelope | Character[]>(
      `/api/characters?era=${encodeURIComponent(era)}&envelope=1`,
    );
    if (Array.isArray(data)) {
      return {
        characters: data,
        era,
        eraSlots: mergeEraSlots(),
        eraMeta: ERA_META,
      };
    }
    return {
      characters: data.characters ?? [],
      era: data.era ? normalizeGameEra(data.era) : era,
      eraSlots: mergeEraSlots(data.eraSlots),
      eraMeta: data.eraMeta ?? ERA_META,
    };
  },

  activate: async (
    id: string,
    gameEra: GameEra = WARLORDS_ERA,
  ): Promise<{ character: Character; eraSlots: AccountEraSlots }> =>
    apiFetch(`/api/characters/${id}/activate`, {
      method: "PUT",
      body: JSON.stringify({ gameEra }),
    }),

  get: async (id: string): Promise<Character> =>
    apiFetch<Character>(`/api/characters/${id}`),

  create: async (
    character: Omit<Character, "id" | "createdAt" | "userId">,
  ): Promise<Character> =>
    apiFetch<Character>("/api/characters", {
      method: "POST",
      body: JSON.stringify(character),
    }),

  update: async (
    id: string,
    updates: Partial<Omit<Character, "id" | "userId">>,
  ): Promise<Character> =>
    apiFetch<Character>(`/api/characters/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  equip: async (
    id: string,
    slot: string,
    itemId: string | null,
    accountInventoryId?: string,
  ): Promise<Character> =>
    apiFetch<Character>(`/api/characters/${id}/equip`, {
      method: "POST",
      body: JSON.stringify({ slot, itemId, accountInventoryId }),
    }),

  delete: async (id: string): Promise<void> => {
    await apiFetch<{ success: boolean }>(`/api/characters/${id}`, { method: "DELETE" });
  },

  regenerateAvatar: async (id: string): Promise<Character> =>
    apiFetch<Character>(`/api/characters/${id}/regenerate-avatar`, { method: "POST" }),

  getNFTStatus: async (characterId: string): Promise<{ hasMint: boolean; status?: string; mintAddress?: string }> => {
    try {
      const d = await apiFetch<{ status: string; mintAddress?: string }>(`/api/nfts/${characterId}`);
      return { hasMint: !!d.mintAddress, status: d.status, mintAddress: d.mintAddress };
    } catch { return { hasMint: false }; }
  },

  mintCNFT: async (characterId: string, avatarUrl?: string): Promise<{ success: boolean; mintAddress?: string; assetId?: string; error?: string; alreadyMinted?: boolean }> => {
    try {
      return await apiFetch<{ success: boolean; mintAddress?: string; assetId?: string; alreadyMinted?: boolean }>(
        `/api/characters/${characterId}/mint`, {
          method: "POST",
          body: JSON.stringify({ avatarUrl: avatarUrl || undefined }),
        },
      );
    } catch (e: any) { return { success: false, error: e.message }; }
  },
};

// ── Party API ──────────────────────────────────────────────────────

export interface Party {
  characterIds: string[];
  userId?: string;
  accountId?: string;
  updatedAt?: number;
}

export const partyAPI = {
  get: async (): Promise<Party> => {
    try { return await apiFetch<Party>("/api/party"); }
    catch { return { characterIds: [] }; }
  },

  update: async (characterIds: string[]): Promise<Party> =>
    apiFetch<Party>("/api/party", {
      method: "POST",
      body: JSON.stringify({ characterIds: characterIds.slice(0, 3) }),
    }),
};

// ── Resource/Economy API ─────────────────────────────────────────────

export interface ResourceNode {
  nodeId: string;
  lastGathered: number | null;
}

export interface PlayerResources {
  userId?: string;
  accountId?: string;
  resources: Record<string, number>;
}

export const resourceNodeAPI = {
  get: async (nodeId: string): Promise<ResourceNode> => {
    try { return await apiFetch<ResourceNode>(`/api/resource-nodes/${nodeId}`); }
    catch { return { nodeId, lastGathered: null }; }
  },

  gather: async (nodeId: string, lastGathered: number): Promise<ResourceNode> =>
    apiFetch<ResourceNode>(`/api/resource-nodes/${nodeId}`, {
      method: "POST",
      body: JSON.stringify({ lastGathered }),
    }),
};

export const playerResourcesAPI = {
  get: async (): Promise<PlayerResources> => {
    try { return await apiFetch<PlayerResources>("/api/account/resources"); }
    catch { return { resources: {} }; }
  },

  update: async (resources: Record<string, number>): Promise<PlayerResources> =>
    apiFetch<PlayerResources>("/api/account/resources", {
      method: "POST",
      body: JSON.stringify({ resources }),
    }),

  add: async (resourceId: string, amount: number): Promise<PlayerResources> =>
    apiFetch<PlayerResources>("/api/account/resources/add", {
      method: "POST",
      body: JSON.stringify({ resourceId, amount }),
    }),

  batchAdd: async (items: Array<{ resourceId: string; amount: number }>): Promise<PlayerResources> =>
    apiFetch<PlayerResources>("/api/account/resources/batch", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
};

// ── Profession API (local — profession XP lives on character object) ────

export interface ProfessionLevels {
  [professionId: string]: { level: number; xp: number; lastGainAt: number | null };
}

export interface GatherResult {
  success: boolean;
  profession: { id: string; level: number; xp: number; xpGained: number; leveledUp: boolean };
  loot: { resourceId: string; quantity: number };
}

export interface CraftResult {
  success: boolean;
  craftedItem: { id: string; itemId: string; name: string; tier: number; rarity: string };
  profession: { id: string; level: number; xp: number; xpGained: number; leveledUp: boolean };
}

export interface CraftPayload {
  professionId: string;
  recipeId: string;
  outputItemId: string;
  outputItemName: string;
  outputItemTier?: number;
  outputItemRarity?: string;
  ingredients: Array<{ itemId: string; quantity: number }>;
}

export interface GatherPayload {
  professionId: string;
  resourceId: string;
  resourceTier: number;
  quantity: number;
}

export const professionAPI = {
  /** Authoritative profession levels from Railway (characterProfessions table). */
  getLevels: async (characterId: string): Promise<ProfessionLevels> => {
    try {
      const data = await apiFetch<{ professions: ProfessionLevels }>(`/api/professions/${characterId}`);
      return data.professions || {};
    } catch {
      try {
        const char = await characterAPI.get(characterId);
        return (char.professionLevels || {}) as ProfessionLevels;
      } catch {
        return {};
      }
    }
  },

  gather: async (characterId: string, payload: GatherPayload): Promise<GatherResult> =>
    apiFetch<GatherResult>(`/api/professions/${characterId}/gather`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  craft: async (characterId: string, payload: CraftPayload): Promise<CraftResult> =>
    apiFetch<CraftResult>(`/api/professions/${characterId}/craft`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

// ── Account inventory API ───────────────────────────────────────

export interface InventoryItem {
  id: string;
  itemId: string;
  quantity: number;
  tier?: number | null;
  quality?: string | null;
  boundToCharacterId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CharacterInventoryBundle {
  characterId: string;
  accountId: string;
  items: InventoryItem[];
  resources: Record<string, number>;
}

export const inventoryAPI = {
  getAll: async (): Promise<InventoryItem[]> => {
    try { return await apiFetch<InventoryItem[]>("/api/account/inventory"); }
    catch { return []; }
  },

  getForCharacter: async (characterId: string): Promise<CharacterInventoryBundle | null> => {
    try {
      return await apiFetch<CharacterInventoryBundle>(`/api/inventory/${characterId}`);
    } catch {
      return null;
    }
  },

  add: async (item: { itemId: string; quantity?: number; tier?: number; quality?: string; boundToCharacterId?: string | null; metadata?: object }): Promise<InventoryItem> =>
    apiFetch<InventoryItem>("/api/account/inventory", {
      method: "POST",
      body: JSON.stringify(item),
    }),

  update: async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> =>
    apiFetch<InventoryItem>(`/api/account/inventory/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  remove: async (id: string): Promise<void> => {
    await apiFetch<{ success: boolean }>(`/api/account/inventory/${id}`, { method: "DELETE" });
  },

  transfer: async (itemId: string, characterId: string | null): Promise<InventoryItem> =>
    apiFetch<InventoryItem>(`/api/account/inventory/${itemId}/transfer`, {
      method: "POST",
      body: JSON.stringify({ characterId }),
    }),
};

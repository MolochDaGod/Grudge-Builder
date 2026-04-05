import type { Character } from "./characterManager";
import { authHeaders, logout } from "./grudgeBackend";

/** Canonical Grudge backend — routed through Vercel rewrites.
 *  /api/game/:path* → https://api.grudge-studio.com/:path*
 *  This ensures same-origin requests (no CORS) and correct path stripping. */
const GAME_API = "/api/game";
import {
  type VpsCharacter,
  toVpsCreatePayload,
  fromVpsCharacter,
  saveExtendedData,
  deleteExtendedData,
} from "./characterAdapter";

// ── Helper: fetch with auth, auto-redirect on 401 ────────────
async function authFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = {
    ...authHeaders(),
    ...(init.headers as Record<string, string> || {}),
  };
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) {
    logout();
    window.location.href = "/";
    throw new Error("Session expired");
  }
  return res;
}

// ── Character API (routes to api.grudge-studio.com via Vercel rewrite) ──
export const characterAPI = {
  getAll: async (): Promise<Character[]> => {
    const res = await authFetch(`${GAME_API}/characters`);
    if (!res.ok) throw new Error("Failed to fetch characters");
    const data = await res.json();
    // Unified backend returns { success, characters: [...] }
    const charList = data.characters || data;
    const vpsChars: VpsCharacter[] = Array.isArray(charList) ? charList : [];
    return vpsChars.map(fromVpsCharacter);
  },

  get: async (id: string): Promise<Character> => {
    const res = await authFetch(`${GAME_API}/characters/${id}`);
    if (!res.ok) throw new Error("Failed to fetch character");
    const data = await res.json();
    const vps: VpsCharacter = data.character || data;
    return fromVpsCharacter(vps);
  },

  /**
   * Create a character via the canonical unified backend.
   * Backend validates race/class, computes attributes (base + race + class + manual),
   * generates AI avatar, mints cNFT, and returns the full character.
   */
  create: async (
    character: Omit<Character, "id" | "createdAt" | "userId">,
  ): Promise<Character> => {
    const payload = toVpsCreatePayload(character);
    const res = await authFetch(`${GAME_API}/characters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        manualAttributes: character.attributes || {},
        gameOrigin: "wcs",
      }),
    });
    if (!res.ok) throw new Error("Failed to create character");
    const data = await res.json();
    const vps: VpsCharacter = data.character || data;
    const built = fromVpsCharacter(vps);
    // Save the extended builder data locally
    saveExtendedData(built.id, { ...character, ...built });
    return built;
  },

  update: async (
    id: string,
    updates: Partial<Omit<Character, "id" | "userId">>,
  ): Promise<Character> => {
    // Push stat changes to VPS if they include VPS-supported fields
    const vpsStats: Record<string, number> = {};
    if (updates.hp !== undefined) vpsStats.hp = updates.hp;
    if (updates.level !== undefined) vpsStats.level = updates.level;
    if (updates.attributes?.strength !== undefined)
      vpsStats.strength = updates.attributes.strength;
    if (updates.attributes?.dexterity !== undefined)
      vpsStats.dexterity = updates.attributes.dexterity;
    if (updates.attributes?.intelligence !== undefined)
      vpsStats.intelligence = updates.attributes.intelligence;

    if (Object.keys(vpsStats).length > 0) {
      await authFetch(`${GAME_API}/characters/${id}/stats`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vpsStats),
      }).catch((e) => console.warn("VPS stat sync failed:", e));
    }

    // Always save extended data (VPS-authoritative + localStorage cache)
    const current = await characterAPI.get(id).catch(() => null);
    const merged = { ...current, ...updates };
    await saveExtendedData(id, merged);
    return { ...merged, id } as Character;
  },

  delete: async (id: string): Promise<void> => {
    const res = await authFetch(`${GAME_API}/characters/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete character");
    deleteExtendedData(id);
  },

  regenerateAvatar: async (id: string): Promise<Character> => {
    const char = await characterAPI.get(id);
    // Use Puter AI txt2img to generate a new avatar on the user's own account
    try {
      const { puterAI } = await import('./puterIntegration');
      const avatarUrl = await puterAI.generateHeroAvatar(
        char.name,
        char.raceId,
        char.classId,
      );
      if (avatarUrl) {
        return await characterAPI.update(id, { avatarUrl } as any);
      }
    } catch (e) {
      console.warn('Puter avatar regen failed, trying VPS:', e);
    }
    // Fallback: VPS server-side generation
    try {
      const res = await authFetch(`${GAME_API}/characters/${id}/regenerate-avatar`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const vps: VpsCharacter = data.character || data;
        return fromVpsCharacter(vps);
      }
    } catch { /* VPS unavailable */ }
    return char;
  },

  /**
   * Mint a character as a compressed NFT on Solana.
   * Sends to user's server-side wallet, or admin agent wallet as fallback.
   */
  /** Mint or re-mint character cNFT via the canonical backend */
  mintCNFT: async (characterId: string, _avatarUrl?: string, _targetWallet?: string): Promise<{
    success: boolean;
    nftId?: string;
    mintAddress?: string;
    assetId?: string;
    error?: string;
  }> => {
    try {
      const res = await authFetch(`${GAME_API}/characters/${characterId}/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || `Mint failed (${res.status})` };
      }
      const data = await res.json();
      return {
        success: true,
        nftId: data.mintId,
        mintAddress: data.mintId,
      };
    } catch (e) {
      console.error('cNFT mint error:', e);
      return { success: false, error: e instanceof Error ? e.message : 'Mint failed' };
    }
  },
};

// ── Game Data ─────────────────────────────────────────────────────────
// DEPRECATED: gameDataAPI removed — /game-data/* routes never existed on
// the backend. Use ObjectStore hooks instead:
//   import { useRaces, useClasses } from "@/hooks/use-object-store";
//   import { fetchRaces, fetchClasses } from "@/lib/objectStoreApi";

// ── Party API (backend-first with localStorage fallback) ────────────

export interface Party {
  characterIds: string[];
}

export const partyAPI = {
  get: async (): Promise<Party> => {
    try {
      const res = await authFetch(`${GAME_API}/crews/mine`);
      if (res.ok) {
        const crews = await res.json();
        // Extract character IDs from crew members
        return { characterIds: Array.isArray(crews) ? crews.map((c: any) => String(c.id)) : [] };
      }
    } catch { /* VPS unavailable, fall through */ }
    // Fallback: localStorage
    try {
      const raw = localStorage.getItem("grudge_party");
      return raw ? JSON.parse(raw) : { characterIds: [] };
    } catch {
      return { characterIds: [] };
    }
  },

  update: async (characterIds: string[]): Promise<Party> => {
    const party = { characterIds: characterIds.slice(0, 3) };
    // Save to localStorage as cache
    localStorage.setItem("grudge_party", JSON.stringify(party));
    return party;
  },
};

// ── Resource/Economy API (backend-first with localStorage fallback) ────

export interface ResourceNode {
  nodeId: string;
  lastGathered: number | null;
}

export interface PlayerResources {
  userId: string;
  resources: Record<string, number>;
}

export const resourceNodeAPI = {
  get: async (
    nodeId: string,
  ): Promise<ResourceNode | { nodeId: string; lastGathered: null }> => {
    // Resource nodes are local state (cooldown timers), localStorage is fine
    try {
      const nodes = JSON.parse(
        localStorage.getItem("grudge_resource_nodes") || "{}",
      );
      return nodes[nodeId] || { nodeId, lastGathered: null };
    } catch {
      return { nodeId, lastGathered: null };
    }
  },

  gather: async (
    nodeId: string,
    lastGathered: number,
  ): Promise<ResourceNode> => {
    const nodes = JSON.parse(
      localStorage.getItem("grudge_resource_nodes") || "{}",
    );
    nodes[nodeId] = { nodeId, lastGathered };
    localStorage.setItem("grudge_resource_nodes", JSON.stringify(nodes));
    return nodes[nodeId];
  },
};

export const playerResourcesAPI = {
  get: async (): Promise<
    PlayerResources | { userId: string; resources: Record<string, number> }
  > => {
    // Try VPS economy balance first
    try {
      const chars = await characterAPI.getAll();
      if (chars.length > 0) {
        const res = await authFetch(`${GAME_API}/economy/balance?char_id=${chars[0].id}`);
        if (res.ok) {
          const data = await res.json();
          return { userId: "player", resources: { gold: data.balance || 0 } };
        }
      }
    } catch { /* VPS unavailable */ }
    // Fallback: localStorage
    try {
      const raw = localStorage.getItem("grudge_player_resources");
      return raw
        ? JSON.parse(raw)
        : { userId: "player", resources: {} };
    } catch {
      return { userId: "player", resources: {} };
    }
  },

  update: async (
    resources: Record<string, number>,
  ): Promise<PlayerResources> => {
    const data = { userId: "player", resources } as PlayerResources;
    localStorage.setItem("grudge_player_resources", JSON.stringify(data));
    return data;
  },
};

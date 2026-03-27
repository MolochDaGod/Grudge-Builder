import type { Character } from "./characterManager";
import { API_BASE, authHeaders, clearToken, logout } from "./grudgeBackend";

const GAME_API = `${API_BASE}/game`;
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
    const vpsChars: VpsCharacter[] = await res.json();
    return vpsChars.map(fromVpsCharacter);
  },

  get: async (id: string): Promise<Character> => {
    const res = await authFetch(`${GAME_API}/characters/${id}`);
    if (!res.ok) throw new Error("Failed to fetch character");
    const vps: VpsCharacter = await res.json();
    return fromVpsCharacter(vps);
  },

  create: async (
    character: Omit<Character, "id" | "createdAt" | "userId">,
  ): Promise<Character> => {
    const payload = toVpsCreatePayload(character);
    const res = await authFetch(`${GAME_API}/characters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create character");
    const vps: VpsCharacter = await res.json();
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

    // Always save extended data locally
    const current = await characterAPI.get(id).catch(() => null);
    const merged = { ...current, ...updates };
    saveExtendedData(id, merged);
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
    // Avatar generation requires the Express server; for now return current char
    const char = await characterAPI.get(id);
    return char;
  },

  /**
   * Mint a character as a compressed NFT on Solana.
   * Sends to user's server-side wallet, or admin agent wallet as fallback.
   */
  mintCNFT: async (characterId: string, avatarUrl: string, targetWallet?: string): Promise<{
    success: boolean;
    nftId?: string;
    mintAddress?: string;
    assetId?: string;
    error?: string;
  }> => {
    try {
      // Determine target wallet: user's server wallet → admin agent wallet fallback
      let wallet = targetWallet;
      if (!wallet) {
        // Try to get from wallet status
        const statusRes = await fetch('/api/wallet/status').catch(() => null);
        if (statusRes?.ok) {
          const status = await statusRes.json();
          wallet = status.walletAddress || undefined;
        }
      }
      if (!wallet) {
        // Fallback to admin agent wallet from config
        const configRes = await fetch('/api/wallet/config').catch(() => null);
        if (configRes?.ok) {
          const config = await configRes.json();
          wallet = config.aiAgentWallet || undefined;
        }
      }

      const res = await authFetch(`${GAME_API}/nfts/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          avatarUrl,
          targetWallet: wallet,
          isCompressed: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || `Mint failed (${res.status})` };
      }

      const data = await res.json();
      return {
        success: true,
        nftId: data.nftId || data.id,
        mintAddress: data.mintAddress,
        assetId: data.assetId,
      };
    } catch (e) {
      console.error('cNFT mint error:', e);
      return { success: false, error: e instanceof Error ? e.message : 'Mint failed' };
    }
  },
};

// ── Party API (localStorage until VPS supports it) ────────────
const PARTY_KEY = "grudge_party";

export interface Party {
  characterIds: string[];
}

export const partyAPI = {
  get: async (): Promise<Party> => {
    try {
      const raw = localStorage.getItem(PARTY_KEY);
      return raw ? JSON.parse(raw) : { characterIds: [] };
    } catch {
      return { characterIds: [] };
    }
  },

  update: async (characterIds: string[]): Promise<Party> => {
    const party = { characterIds: characterIds.slice(0, 3) };
    localStorage.setItem(PARTY_KEY, JSON.stringify(party));
    return party;
  },
};

// ── Resource Node API (localStorage until VPS supports it) ────
const RESOURCE_NODES_KEY = "grudge_resource_nodes";
const PLAYER_RESOURCES_KEY = "grudge_player_resources";

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
    try {
      const nodes = JSON.parse(
        localStorage.getItem(RESOURCE_NODES_KEY) || "{}",
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
      localStorage.getItem(RESOURCE_NODES_KEY) || "{}",
    );
    nodes[nodeId] = { nodeId, lastGathered };
    localStorage.setItem(RESOURCE_NODES_KEY, JSON.stringify(nodes));
    return nodes[nodeId];
  },
};

export const playerResourcesAPI = {
  get: async (): Promise<
    PlayerResources | { userId: string; resources: Record<string, number> }
  > => {
    try {
      const raw = localStorage.getItem(PLAYER_RESOURCES_KEY);
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
    localStorage.setItem(PLAYER_RESOURCES_KEY, JSON.stringify(data));
    return data;
  },
};

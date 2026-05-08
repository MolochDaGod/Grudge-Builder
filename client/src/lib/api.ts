import type { Character } from "./characterManager";
import { puterKV } from "./puterIntegration";

/**
 * Character API — Puter KV backed (no VPS).
 * All character data lives in the user's Puter cloud storage.
 * Keys: grudge:characters → Character[] list
 *       grudge:character:{id} → single Character (for fast lookup)
 */

const CHARS_KEY = "grudge:characters";

/** Read all characters from Puter KV, falling back to localStorage */
async function loadAllChars(): Promise<Character[]> {
  const kv = await puterKV.get<Character[]>(CHARS_KEY);
  if (kv && Array.isArray(kv)) return kv;
  // localStorage fallback
  try {
    const raw = localStorage.getItem(CHARS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

/** Persist character list to Puter KV + localStorage */
async function saveAllChars(chars: Character[]): Promise<void> {
  await puterKV.set(CHARS_KEY, chars).catch(() => {});
  try { localStorage.setItem(CHARS_KEY, JSON.stringify(chars)); } catch {}
}

export const characterAPI = {
  getAll: async (): Promise<Character[]> => {
    return loadAllChars();
  },

  get: async (id: string): Promise<Character> => {
    const chars = await loadAllChars();
    const found = chars.find(c => c.id === id);
    if (!found) throw new Error(`Character ${id} not found`);
    return found;
  },

  create: async (
    character: Omit<Character, "id" | "createdAt" | "userId">,
  ): Promise<Character> => {
    const newChar: Character = {
      ...character,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    } as Character;
    const chars = await loadAllChars();
    chars.push(newChar);
    await saveAllChars(chars);
    return newChar;
  },

  update: async (
    id: string,
    updates: Partial<Omit<Character, "id" | "userId">>,
  ): Promise<Character> => {
    const chars = await loadAllChars();
    const idx = chars.findIndex(c => c.id === id);
    if (idx === -1) throw new Error(`Character ${id} not found`);
    const merged = { ...chars[idx], ...updates };
    chars[idx] = merged;
    await saveAllChars(chars);
    return merged;
  },

  delete: async (id: string): Promise<void> => {
    const chars = await loadAllChars();
    const filtered = chars.filter(c => c.id !== id);
    await saveAllChars(filtered);
  },

  regenerateAvatar: async (id: string): Promise<Character> => {
    const char = await characterAPI.get(id);
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
      console.warn('Puter avatar regen failed:', e);
    }
    return char;
  },

  /** NFT status — stored in Puter KV (no VPS) */
  getNFTStatus: async (characterId: string): Promise<{
    hasMint: boolean;
    status?: string;
    mintAddress?: string;
  }> => {
    const data = await puterKV.get<{ status: string; mintAddress?: string }>(`grudge:nft:${characterId}`);
    if (data?.mintAddress) return { hasMint: true, status: data.status, mintAddress: data.mintAddress };
    return { hasMint: false };
  },

  /** Mint stub — records intent in Puter KV. Actual on-chain mint requires a future service. */
  mintCNFT: async (characterId: string): Promise<{
    success: boolean;
    mintAddress?: string;
    error?: string;
    alreadyMinted?: boolean;
  }> => {
    const existing = await characterAPI.getNFTStatus(characterId);
    if (existing.hasMint) return { success: true, mintAddress: existing.mintAddress, alreadyMinted: true };
    // Record mint intent
    await puterKV.set(`grudge:nft:${characterId}`, { status: 'pending', requestedAt: Date.now() });
    return { success: true };
  },
};

// ── Party API (Puter KV + localStorage) ───────────────────────────

export interface Party {
  characterIds: string[];
}

const PARTY_KEY = "grudge:party";

export const partyAPI = {
  get: async (): Promise<Party> => {
    const kv = await puterKV.get<Party>(PARTY_KEY);
    if (kv) return kv;
    try {
      const raw = localStorage.getItem("grudge_party");
      return raw ? JSON.parse(raw) : { characterIds: [] };
    } catch {
      return { characterIds: [] };
    }
  },

  update: async (characterIds: string[]): Promise<Party> => {
    const party = { characterIds: characterIds.slice(0, 3) };
    await puterKV.set(PARTY_KEY, party).catch(() => {});
    localStorage.setItem("grudge_party", JSON.stringify(party));
    return party;
  },
};

// ── Resource/Economy API (Puter KV + localStorage) ───────────────────

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
      const nodes = JSON.parse(localStorage.getItem("grudge_resource_nodes") || "{}");
      return nodes[nodeId] || { nodeId, lastGathered: null };
    } catch {
      return { nodeId, lastGathered: null };
    }
  },

  gather: async (nodeId: string, lastGathered: number): Promise<ResourceNode> => {
    const nodes = JSON.parse(localStorage.getItem("grudge_resource_nodes") || "{}");
    nodes[nodeId] = { nodeId, lastGathered };
    localStorage.setItem("grudge_resource_nodes", JSON.stringify(nodes));
    return nodes[nodeId];
  },
};

const RESOURCES_KEY = "grudge:resources";

export const playerResourcesAPI = {
  get: async (): Promise<PlayerResources> => {
    const kv = await puterKV.get<PlayerResources>(RESOURCES_KEY);
    if (kv) return kv;
    try {
      const raw = localStorage.getItem("grudge_player_resources");
      return raw ? JSON.parse(raw) : { userId: "player", resources: {} };
    } catch {
      return { userId: "player", resources: {} };
    }
  },

  update: async (resources: Record<string, number>): Promise<PlayerResources> => {
    const data: PlayerResources = { userId: "player", resources };
    await puterKV.set(RESOURCES_KEY, data).catch(() => {});
    localStorage.setItem("grudge_player_resources", JSON.stringify(data));
    return data;
  },
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

export const professionAPI = {
  /** Get profession levels from the character object (no server call) */
  getLevels: async (characterId: string): Promise<ProfessionLevels> => {
    try {
      const char = await characterAPI.get(characterId);
      return (char as any).professionLevels || {};
    } catch {
      return {};
    }
  },

  /** Gather/craft are handled client-side in island.tsx — these are stubs */
  gather: async (): Promise<GatherResult> => {
    throw new Error("Gathering is handled client-side via island auto-harvest");
  },
  craft: async (): Promise<CraftResult> => {
    throw new Error("Crafting is handled client-side via crafting page");
  },
};

// ── Inventory API (Puter KV) ─────────────────────────────────────

export interface AccountInventoryData {
  characterId: string;
  accountId: string;
  items: Array<{
    id: string;
    itemId: string;
    quantity: number;
    tier: number | null;
    quality: string | null;
    boundToCharacterId: string | null;
    metadata: Record<string, unknown> | null;
  }>;
  resources: Record<string, number>;
}

const INVENTORY_KEY = "grudge:inventory";

export const inventoryAPI = {
  get: async (characterId: string): Promise<AccountInventoryData> => {
    const kv = await puterKV.get<AccountInventoryData>(`${INVENTORY_KEY}:${characterId}`);
    if (kv) return kv;
    return { characterId, accountId: "", items: [], resources: {} };
  },

  transfer: async (): Promise<{ success: boolean }> => {
    // Item transfer is local — handled via character update
    return { success: true };
  },
};

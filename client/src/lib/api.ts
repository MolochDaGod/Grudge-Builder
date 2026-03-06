import type { Character, Party, PlayerResources, ResourceNode } from "@shared/schema";

const API_BASE = "/api";

// Helper to get admin mode header
const getAdminHeaders = (): Record<string, string> => {
  const isAdmin = localStorage.getItem("grudge_admin") === "true";
  return isAdmin ? { "x-admin-mode": "true" } : {};
};

// Character API
export const characterAPI = {
  getAll: async (): Promise<Character[]> => {
    const res = await fetch(`${API_BASE}/characters`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch characters");
    return res.json();
  },

  get: async (id: string): Promise<Character> => {
    const res = await fetch(`${API_BASE}/characters/${id}`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch character");
    return res.json();
  },

  create: async (character: Omit<Character, "id" | "createdAt" | "userId">): Promise<Character> => {
    const res = await fetch(`${API_BASE}/characters`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminHeaders() },
      body: JSON.stringify(character),
    });
    if (!res.ok) throw new Error("Failed to create character");
    return res.json();
  },

  update: async (id: string, updates: Partial<Omit<Character, "id" | "userId">>): Promise<Character> => {
    const res = await fetch(`${API_BASE}/characters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAdminHeaders() },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update character");
    return res.json();
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/characters/${id}`, {
      method: "DELETE",
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete character");
  },

  regenerateAvatar: async (id: string): Promise<Character> => {
    const res = await fetch(`${API_BASE}/characters/${id}/regenerate-avatar`, {
      method: "POST",
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to regenerate avatar");
    return res.json();
  },
};

// Party API
export const partyAPI = {
  get: async (): Promise<Party> => {
    const res = await fetch(`${API_BASE}/party`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch party");
    return res.json();
  },

  update: async (characterIds: string[]): Promise<Party> => {
    const res = await fetch(`${API_BASE}/party`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminHeaders() },
      body: JSON.stringify({ characterIds }),
    });
    if (!res.ok) throw new Error("Failed to update party");
    return res.json();
  },
};

// Resource Node API
export const resourceNodeAPI = {
  get: async (nodeId: string): Promise<ResourceNode | { nodeId: string; lastGathered: null }> => {
    const res = await fetch(`${API_BASE}/resource-nodes/${nodeId}`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch resource node");
    return res.json();
  },

  gather: async (nodeId: string, lastGathered: number): Promise<ResourceNode> => {
    const res = await fetch(`${API_BASE}/resource-nodes/${nodeId}/gather`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminHeaders() },
      body: JSON.stringify({ lastGathered }),
    });
    if (!res.ok) throw new Error("Failed to gather resource");
    return res.json();
  },
};

// Player Resources API
export const playerResourcesAPI = {
  get: async (): Promise<PlayerResources | { userId: string; resources: Record<string, number> }> => {
    const res = await fetch(`${API_BASE}/resources`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch resources");
    return res.json();
  },

  update: async (resources: Record<string, number>): Promise<PlayerResources> => {
    const res = await fetch(`${API_BASE}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminHeaders() },
      body: JSON.stringify({ resources }),
    });
    if (!res.ok) throw new Error("Failed to update resources");
    return res.json();
  },
};

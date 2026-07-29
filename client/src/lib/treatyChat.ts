/**
 * Treaty chat client — Grudge ID account social (friends, DMs, groups).
 * Same-origin /api/treaty/* → Railway Postgres SSOT.
 */
import { API_BASE, authHeaders } from "./grudgeBackend";

export interface TreatyFriendProfile {
  id: string;
  status: string;
  accountId: string;
  grudgeId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isIncoming: boolean;
}

export interface TreatySocial {
  friends: TreatyFriendProfile[];
  pendingIncoming: TreatyFriendProfile[];
  pendingOutgoing: TreatyFriendProfile[];
}

export interface TreatyDmThread {
  threadId: string;
  otherAccountId: string;
  grudgeId: string | null;
  displayName: string;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: number;
  unread: number;
}

export interface TreatyMessage {
  id: string;
  threadId: string;
  senderAccountId: string;
  content: string;
  readAt: number | null;
  createdAt: number;
}

export interface TreatyGroupSummary {
  groupId: string;
  name: string;
  description: string | null;
  ownerAccountId: string;
  avatarUrl: string | null;
  role: string;
  memberCount: number;
  lastMessage: string | null;
  lastMessageAt: number;
  unread: number;
  updatedAt: number;
}

export interface TreatyGroupMessage {
  id: string;
  groupId: string;
  senderAccountId: string;
  content: string;
  createdAt: number;
  senderDisplayName?: string | null;
  senderGrudgeId?: string | null;
}

export interface TreatyGroupMember {
  accountId: string;
  role: string;
  joinedAt: number;
  grudgeId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

async function treatyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/treaty${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Treaty request failed (${res.status})`);
  return data as T;
}

/** Soft unread badge — 401/403 → 0 (public pages with stale JWT stay quiet). */
export async function fetchTreatyUnread(): Promise<{ unread: number }> {
  try {
    const res = await fetch(`${API_BASE}/treaty/unread`, { headers: authHeaders() });
    if (res.status === 401 || res.status === 403) return { unread: 0 };
    if (!res.ok) return { unread: 0 };
    const data = (await res.json().catch(() => ({}))) as { unread?: number };
    return { unread: Number(data.unread) || 0 };
  } catch {
    return { unread: 0 };
  }
}

// ── Social / friends ────────────────────────────────────────────────────

export async function fetchTreatySocial(): Promise<TreatySocial> {
  return treatyFetch<TreatySocial>("/social");
}

export async function sendTreatyFriendRequest(query: string) {
  return treatyFetch<{ request: unknown; target: unknown }>("/friends/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
}

export async function respondTreatyFriendRequest(requestId: string, accept: boolean) {
  return treatyFetch<{ request: unknown }>(`/friends/${requestId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accept }),
  });
}

// ── DMs ─────────────────────────────────────────────────────────────────

export async function fetchTreatyDmThreads(): Promise<{ threads: TreatyDmThread[] }> {
  return treatyFetch<{ threads: TreatyDmThread[] }>("/dm/threads");
}

export async function openTreatyDmThread(friendAccountId: string) {
  return treatyFetch<{ thread: { id: string } }>("/dm/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ friendAccountId }),
  });
}

export async function fetchTreatyMessages(threadId: string): Promise<{ messages: TreatyMessage[] }> {
  return treatyFetch<{ messages: TreatyMessage[] }>(`/dm/threads/${threadId}/messages`);
}

export async function sendTreatyMessage(threadId: string, content: string) {
  return treatyFetch<{ message: TreatyMessage }>(`/dm/threads/${threadId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

// ── Groups ──────────────────────────────────────────────────────────────

export async function fetchTreatyGroups(): Promise<{ groups: TreatyGroupSummary[] }> {
  return treatyFetch<{ groups: TreatyGroupSummary[] }>("/groups");
}

export async function createTreatyGroup(name: string, description?: string, members?: string[]) {
  return treatyFetch<{ group: { id: string; name: string }; memberCount: number }>("/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, members }),
  });
}

export async function fetchTreatyGroupDetail(groupId: string) {
  return treatyFetch<{
    group: { id: string; name: string; description: string | null; ownerAccountId: string };
    members: TreatyGroupMember[];
  }>(`/groups/${groupId}`);
}

export async function inviteToTreatyGroup(groupId: string, query: string) {
  return treatyFetch<{ member: unknown; target: unknown }>(`/groups/${groupId}/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
}

export async function leaveTreatyGroup(groupId: string) {
  return treatyFetch<{ left?: boolean; deleted?: boolean }>(`/groups/${groupId}/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

export async function fetchTreatyGroupMessages(
  groupId: string,
): Promise<{ messages: TreatyGroupMessage[] }> {
  return treatyFetch<{ messages: TreatyGroupMessage[] }>(`/groups/${groupId}/messages`);
}

export async function sendTreatyGroupMessage(groupId: string, content: string) {
  return treatyFetch<{ message: TreatyGroupMessage }>(`/groups/${groupId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

// ── Unread ──────────────────────────────────────────────────────────────

export async function fetchTreatyUnread(): Promise<{ unread: number }> {
  return treatyFetch<{ unread: number }>("/unread");
}

// ── Server / fleet chat (all games + studio) ─────────────────────────────

export interface TreatyServerChannel {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  gameId: string;
  sortOrder: number;
}

export interface TreatyServerMessage {
  id: string;
  channelId: string;
  channelSlug: string;
  content: string;
  createdAt: number;
  senderAccountId: string;
  senderDisplayName: string | null;
  senderGrudgeId: string | null;
  senderAvatarUrl: string | null;
}

export async function fetchTreatyServers(gameId?: string) {
  const q = gameId ? `?game=${encodeURIComponent(gameId)}` : "";
  return treatyFetch<{ channels: TreatyServerChannel[] }>(`/servers${q}`);
}

export async function fetchTreatyServerMessages(slug: string, limit = 80) {
  return treatyFetch<{
    channel: TreatyServerChannel;
    messages: TreatyServerMessage[];
  }>(`/servers/${encodeURIComponent(slug)}/messages?limit=${limit}`);
}

export async function sendTreatyServerMessage(slug: string, content: string) {
  return treatyFetch<{ message: TreatyServerMessage }>(
    `/servers/${encodeURIComponent(slug)}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );
}

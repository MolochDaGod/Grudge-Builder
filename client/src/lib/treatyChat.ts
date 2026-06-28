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

async function treatyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/treaty${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Treaty request failed (${res.status})`);
  return data as T;
}

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

export async function fetchTreatyUnread(): Promise<{ unread: number }> {
  return treatyFetch<{ unread: number }>("/unread");
}
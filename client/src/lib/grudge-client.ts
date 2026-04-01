/**
 * grudge-client.ts — Grudge Studio unified API client (frontend)
 *
 * ALL API calls from grudge-builder go through the Vercel proxy routes
 * defined in vercel.json:
 *
 *   /api/auth/*    → id.grudge-studio.com/auth/*
 *   /api/account/* → account.grudge-studio.com/*
 *   /api/game/*    → api.grudge-studio.com/*
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RULES (enforced by this file):
 *  • NEVER bypass the proxy with a direct `api.grudge-studio.com` call from
 *    browser code — it will break CORS in production.
 *  • NEVER supply grudge_id, role, or wallet address in a request body and
 *    expect the server to trust it. The server extracts these from the JWT.
 *  • NEVER store the JWT in localStorage if you can avoid it.
 *    This module uses sessionStorage (cleared on tab close) with a
 *    localStorage fallback for "remember me" scenarios only.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Quick start:
 *
 *   import { grudgeAuth, grudgeCharacters, grudgeEconomy } from '@/lib/grudge-client';
 *
 *   // Auth
 *   await grudgeAuth.init();                        // pick up URL token on load
 *   await grudgeAuth.login('user', 'pass');
 *   grudgeAuth.discord();                           // OAuth redirect
 *
 *   // Characters
 *   const chars = await grudgeCharacters.list();
 *   const char  = await grudgeCharacters.create({ name: 'Drax', race: 'orc', class: 'warrior' });
 *
 *   // Economy
 *   const bal = await grudgeEconomy.balance(char.id);
 *   await grudgeEconomy.spend(char.id, 50, 'purchase');
 */

// ── Token management ──────────────────────────────────────────────────────────

const TOKEN_KEY = 'grudge_token';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
}

export function setToken(t: string | null): void {
  if (t) {
    sessionStorage.setItem(TOKEN_KEY, t);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers as Record<string, string> || {}) },
  });
  if (res.status === 401) {
    setToken(null);
    if (typeof window !== 'undefined') window.location.href = '/';
    throw new Error('Session expired — redirecting to login');
  }
  return res;
}

async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `GET ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function apiPost<T = unknown>(
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
  const res = await apiFetch(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `POST ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function apiPatch<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `PATCH ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function apiDelete<T = unknown>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `DELETE ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ── Route prefixes (Vercel rewrite targets) ───────────────────────────────────
//   /api/auth/*    → id.grudge-studio.com/auth/*
//   /api/account/* → account.grudge-studio.com/*
//   /api/game/*    → api.grudge-studio.com/*

const AUTH    = '/api/auth'    as const;
const ACCOUNT = '/api/account' as const;
const GAME    = '/api/game'    as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export type GrudgeRole = 'guest' | 'pleb' | 'member' | 'admin' | 'master';

export interface GrudgeUser {
  grudge_id:   string;
  username:    string;
  role:        GrudgeRole;
  puter_id?:   string | null;
  is_guest?:   boolean;
  faction?:    string;
  avatar_url?: string;
  discord_tag?: string;
}

export interface UserProfile {
  grudge_id:    string;
  username:     string;
  discord_tag?: string;
  faction?:     string;
  race?:        string;
  class?:       string;
  member_since?: string;
  avatar_url?:  string;
  bio?:         string;
  social_links?: Record<string, string>;
  country?:     string;
}

export interface Character {
  id:           number;
  grudge_id:    string;
  name:         string;
  race:         string;
  class:        string;
  level:        number;
  hp:           number;
  max_hp:       number;
  mana?:        number;
  max_mana?:    number;
  faction?:     string;
  avatar_url?:  string;
  is_active?:   boolean;
  created_at?:  string;
}

export interface InventoryItem {
  instance_id: string;
  item_id:     string;
  item_name:   string;
  quantity:    number;
  slot?:       string;
  equipped?:   boolean;
  rarity?:     string;
  tier?:       number;
}

export interface EconomyBalance {
  char_id:       number;
  balance:       number;
  transactions?: unknown[];
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const grudgeAuth = {
  /**
   * Pick up an OAuth/SSO token from URL params on page load.
   * Call this once at app startup.
   */
  init(): void {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token') || params.get('sso_token');
    if (t) {
      setToken(t);
      window.history.replaceState({}, '', window.location.pathname);
    }
  },

  /** Username/email + password login */
  async login(identifier: string, password: string): Promise<{ token: string; user: GrudgeUser }> {
    const d = await apiPost<{ token: string; user: GrudgeUser }>(
      `${AUTH}/login`, { identifier, password }
    );
    setToken(d.token);
    return d;
  },

  /** Register new account */
  async register(
    username: string,
    password: string,
    email?: string,
  ): Promise<{ token: string; user: GrudgeUser }> {
    const d = await apiPost<{ token: string; user: GrudgeUser }>(
      `${AUTH}/register`, { username, password, email }
    );
    setToken(d.token);
    return d;
  },

  /** Guest login — instant, no credentials, creates a Grudge ID */
  async guest(deviceId?: string): Promise<{ token: string; user: GrudgeUser }> {
    const id = deviceId
      || `web_${(crypto as Crypto).randomUUID?.()?.slice(0, 12) ?? Math.random().toString(36).slice(2, 14)}`;
    const d = await apiPost<{ token: string; user: GrudgeUser }>(
      `${AUTH}/guest`, { deviceId: id }
    );
    setToken(d.token);
    return d;
  },

  /** Redirect to Discord OAuth flow */
  discord(redirectUri?: string): void {
    const redir = redirectUri || window.location.origin;
    window.location.href = `${AUTH}/discord?redirect_uri=${encodeURIComponent(redir)}`;
  },

  /** Redirect to Google OAuth flow */
  google(redirectUri?: string): void {
    const redir = redirectUri || window.location.origin;
    window.location.href = `${AUTH}/google?redirect_uri=${encodeURIComponent(redir)}`;
  },

  /** Verify the stored JWT (or an explicit token) */
  verify(token?: string): Promise<{ valid: boolean; payload?: GrudgeUser }> {
    return apiPost(`${AUTH}/verify`, { token: token ?? getToken() });
  },

  /** Get the currently authenticated user's identity */
  me(): Promise<GrudgeUser> {
    return apiGet<GrudgeUser>(`${AUTH}/me`);
  },

  /** SSO check — redirect to id.grudge-studio.com if not logged in */
  ssoCheck(returnUrl?: string): void {
    const ret = returnUrl || window.location.href;
    window.location.href =
      `https://id.grudge-studio.com/auth/sso-check?return=${encodeURIComponent(ret)}`;
  },

  /** Logout — clears local token and redirects to home */
  logout(): void {
    setToken(null);
    window.location.href = '/';
  },

  token:     getToken,
  setToken,
  isLoggedIn: () => !!getToken(),
};

// ── Account ───────────────────────────────────────────────────────────────────

export const grudgeAccount = {
  getProfile(grudgeId: string)  { return apiGet<UserProfile>(`${ACCOUNT}/profile/${grudgeId}`); },
  updateProfile(data: Partial<UserProfile>) { return apiPatch<{ ok: boolean }>(`${ACCOUNT}/profile`, data); },

  getFriends()                  { return apiGet<UserProfile[]>(`${ACCOUNT}/friends`); },
  addFriend(grudgeId: string)   { return apiPost(`${ACCOUNT}/friends/${grudgeId}`); },
  removeFriend(grudgeId: string){ return apiDelete(`${ACCOUNT}/friends/${grudgeId}`); },

  getNotifications()            { return apiGet(`${ACCOUNT}/notifications`); },
  readNotification(id: string)  { return apiPatch(`${ACCOUNT}/notifications/${id}/read`); },

  getAchievements()             { return apiGet(`${ACCOUNT}/achievements`); },
  getSessions()                 { return apiGet(`${ACCOUNT}/sessions`); },
  revokeSession(id: string)     { return apiDelete(`${ACCOUNT}/sessions/${id}`); },

  linkPuter(puterUuid: string, puterUsername: string) {
    return apiPost(`${ACCOUNT}/puter/link`, { puterUuid, puterUsername });
  },
};

// ── Characters ────────────────────────────────────────────────────────────────

export const grudgeCharacters = {
  list()                                    { return apiGet<Character[]>(`${GAME}/characters`); },
  get(id: number)                           { return apiGet<Character>(`${GAME}/characters/${id}`); },

  create(data: Omit<Character, 'id' | 'grudge_id' | 'created_at'>) {
    return apiPost<Character>(`${GAME}/characters`, data);
  },

  update(id: number, data: Partial<Omit<Character, 'id' | 'grudge_id'>>) {
    return apiPatch<Character>(`${GAME}/characters/${id}`, data);
  },

  delete(id: number)  { return apiDelete(`${GAME}/characters/${id}`); },

  /** Mint or re-mint the character as a compressed NFT. Server writes to wallet. */
  mintCNFT(id: number) {
    return apiPost<{ success: boolean; mintId?: string; error?: string }>(
      `${GAME}/characters/${id}/mint`
    );
  },
};

// ── Inventory ─────────────────────────────────────────────────────────────────

export const grudgeInventory = {
  list(charId: number)               { return apiGet<InventoryItem[]>(`${GAME}/inventory?char_id=${charId}`); },

  /** Pass an idempotencyKey to prevent duplicate item grants on network retry */
  add(charId: number, item: Partial<InventoryItem>, idempotencyKey?: string) {
    return apiPost<InventoryItem>(
      `${GAME}/inventory`, { char_id: charId, ...item }, idempotencyKey
    );
  },

  update(instanceId: string, updates: Partial<InventoryItem>) {
    return apiPatch(`${GAME}/inventory/${instanceId}`, updates);
  },

  remove(instanceId: string) { return apiDelete(`${GAME}/inventory/${instanceId}`); },
};

// ── Economy ───────────────────────────────────────────────────────────────────

export const grudgeEconomy = {
  balance(charId: number) {
    return apiGet<EconomyBalance>(`${GAME}/economy/balance?char_id=${charId}`);
  },

  /** Pass an idempotencyKey to prevent double-charges on network retry */
  spend(charId: number, amount: number, type: string, idempotencyKey?: string) {
    return apiPost(
      `${GAME}/economy/spend`, { char_id: charId, amount, type }, idempotencyKey
    );
  },

  transfer(fromCharId: number, toGrudgeId: string, amount: number, idempotencyKey?: string) {
    return apiPost(
      `${GAME}/economy/transfer`,
      { from_char_id: fromCharId, to_grudge_id: toGrudgeId, amount },
      idempotencyKey,
    );
  },
};

// ── Crafting ──────────────────────────────────────────────────────────────────

export const grudgeCrafting = {
  recipes(charClass?: string, tier?: number) {
    const q = new URLSearchParams();
    if (charClass) q.set('class', charClass);
    if (tier)      q.set('tier', String(tier));
    return apiGet(`${GAME}/crafting/recipes?${q}`);
  },

  queue()     { return apiGet(`${GAME}/crafting/queue`); },

  start(recipeId: string, charId: number, idempotencyKey?: string) {
    return apiPost(
      `${GAME}/crafting/start`, { recipe_id: recipeId, char_id: charId }, idempotencyKey
    );
  },

  complete(queueId: string) { return apiPatch(`${GAME}/crafting/${queueId}/complete`); },
};

// ── Missions ──────────────────────────────────────────────────────────────────

export const grudgeMissions = {
  list()           { return apiGet(`${GAME}/missions`); },
};

// ── World / Social ────────────────────────────────────────────────────────────

export const grudgeWorld = {
  islands()        { return apiGet(`${GAME}/islands`); },
  leaderboard()    { return apiGet(`${GAME}/combat/leaderboard`); },
  factions()       { return apiGet(`${GAME}/factions`); },
  professions()    { return apiGet(`${GAME}/professions`); },
};

// ── Crews ─────────────────────────────────────────────────────────────────────

export const grudgeCrews = {
  list()           { return apiGet(`${GAME}/crews`); },
  create(data: { name: string; members: string[] }) {
    return apiPost(`${GAME}/crews`, data);
  },
};

// ── Convenience re-export for backwards compatibility ─────────────────────────

/** @deprecated Import from grudge-client named exports instead */
export const GrudgeClient = {
  auth:        grudgeAuth,
  account:     grudgeAccount,
  characters:  grudgeCharacters,
  inventory:   grudgeInventory,
  economy:     grudgeEconomy,
  crafting:    grudgeCrafting,
  missions:    grudgeMissions,
  world:       grudgeWorld,
  crews:       grudgeCrews,
};

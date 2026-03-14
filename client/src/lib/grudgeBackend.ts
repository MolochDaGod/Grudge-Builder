/**
 * Grudge Backend Integration
 *
 * All API calls go through Vercel rewrites (defined in vercel.json):
 *   /api/auth/*    → id.grudge-studio.com/auth/*
 *   /api/game/*    → api.grudge-studio.com/*
 *   /api/account/* → account.grudge-studio.com/*
 *
 * This avoids CORS issues since the client calls same-origin paths.
 */

// ── API base paths (routed through Vercel rewrites) ──────────
export const AUTH_API = "/api/auth";
export const GAME_API = "/api/game";
export const ACCOUNT_API = "/api/account";

// ── Token management ─────────────────────────────────────────
const TOKEN_KEY = "grudge_token";
const USER_KEY = "grudge_user";
const DEVICE_ID_KEY = "grudge_device_id";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ── Auth headers for authenticated requests ──────────────────
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── User state (cached VPS user object) ──────────────────────
export interface GrudgeUser {
  id?: number;
  grudgeId: string;
  username: string;
  displayName?: string;
  email?: string;
  isPremium?: boolean;
  isGuest?: boolean;
  gold?: number;
  gbuxBalance?: number;
  walletAddress?: string;
  serverWalletAddress?: string;
  faction?: string;
  race?: string;
  class?: string;
  avatarUrl?: string;
}

export function getCurrentUser(): GrudgeUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: GrudgeUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearCurrentUser(): void {
  localStorage.removeItem(USER_KEY);
}

// ── Full logout ──────────────────────────────────────────────
export function logout(): void {
  clearToken();
  clearCurrentUser();
  // Keep device ID and extended character data
}

// ── Device ID for guest login ────────────────────────────────
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id =
      "gb_" +
      Date.now().toString(36) +
      Math.random().toString(36).substring(2, 10);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// ── Auth API helpers ─────────────────────────────────────────

interface AuthResponse {
  success: boolean;
  token: string;
  grudgeId: string;
  username: string;
  user: GrudgeUser;
  message?: string;
  isGuest?: boolean;
  isNewUser?: boolean;
}

async function handleAuthResponse(res: Response): Promise<AuthResponse> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Auth failed (${res.status})`);
  }
  const data: AuthResponse = await res.json();
  if (data.token) setToken(data.token);
  if (data.user) setCurrentUser(data.user);
  return data;
}

export async function loginWithCredentials(
  username: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return handleAuthResponse(res);
}

export async function registerAccount(
  username: string,
  password: string,
  email?: string,
): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_API}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, email }),
  });
  return handleAuthResponse(res);
}

export async function loginAsGuest(): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_API}/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId: getDeviceId() }),
  });
  return handleAuthResponse(res);
}

export async function loginWithWallet(
  wallet_address: string,
  web3auth_token?: string,
): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_API}/wallet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet_address, web3auth_token }),
  });
  return handleAuthResponse(res);
}

export async function loginWithPuter(
  puterUuid: string,
  puterUsername?: string,
): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_API}/puter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ puterUuid, puterUsername }),
  });
  return handleAuthResponse(res);
}

export async function verifyToken(): Promise<{
  valid: boolean;
  payload?: Record<string, unknown>;
}> {
  const token = getToken();
  if (!token) return { valid: false };
  try {
    const res = await fetch(`${AUTH_API}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return { valid: false };
    return await res.json();
  } catch {
    return { valid: false };
  }
}

/**
 * Grudge Backend Integration — Auth & Session Management
 *
 * Auth is Puter-first (puter.auth.signIn). No VPS backend.
 * Session tokens and user data live in localStorage.
 * Puter KV is used for persistent player data (characters, island, inventory).
 */

// ── API base (legacy, kept for any remaining fetch calls) ─────────
export const API_BASE = "/api";

// ── Token / Session management ───────────────────────────────────────
// Use the canonical auth token key for cross-app SSO, while mirroring the
// legacy builder token key for backward compatibility.
const AUTH_TOKEN_KEY = "grudge_auth_token";
const LEGACY_SESSION_TOKEN_KEY = "grudge_session_token";
const SESSION_KEY = "grudge-session";
const DEVICE_ID_KEY = "grudge_device_id";

// ── Session data shape (stored in localStorage) ─────────────────────
export interface GrudgeSession {
  type: "grudge" | "discord" | "puter" | "wallet" | "guest" | "phone";
  username: string;
  grudgeId?: string;
  accountId?: number;
  walletAddress?: string;
  puterUsername?: string;
  loginTime: number;
}

// ── User shape (from API responses) ──────────────────────────────────
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
  discordId?: string;
  role?: string;
  /** Linked auth providers (e.g. ["puter", "discord", "phantom"]) — returned by buildAuthResponse */
  providers?: string[];
}

// ── SSO token pickup (from cross-app redirects) ────────────────────

(function pickupSsoToken() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get("sso_token");
    if (ssoToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, ssoToken);
      localStorage.setItem(LEGACY_SESSION_TOKEN_KEY, ssoToken);
      const returnedGrudgeId = params.get("grudge_id") || params.get("grudgeId") || "";
      const returnedUsername = params.get("grudge_username") || params.get("username") || "";
      if (returnedGrudgeId) localStorage.setItem("grudge_id", returnedGrudgeId);
      if (returnedUsername) localStorage.setItem("grudge_username", returnedUsername);
      if (returnedGrudgeId) localStorage.setItem("grudge_account_id", returnedGrudgeId);
      // Also set cookies so Edge Middleware picks them up immediately
      const maxAge = 7 * 24 * 60 * 60;
      document.cookie = `grudge_auth_token=${encodeURIComponent(ssoToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;
      if (returnedGrudgeId) document.cookie = `grudge_id=${encodeURIComponent(returnedGrudgeId)}; path=/; max-age=${maxAge}; SameSite=Lax`;
      // Clean URL without reload
      params.delete("sso_token");
      params.delete("grudge_id");
      params.delete("grudgeId");
      params.delete("grudge_username");
      params.delete("username");
      const clean = params.toString();
      const newUrl = window.location.pathname + (clean ? `?${clean}` : "") + window.location.hash;
      window.history.replaceState(null, "", newUrl);
    }
  } catch { /* ignore in SSR/test */ }
})();

// ── Token helpers ────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_SESSION_TOKEN_KEY);
}

/** Cookie TTL — 7 days, matches a typical session lifetime */
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

function setCookie(name: string, value: string, maxAge = COOKIE_MAX_AGE): void {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch { /* SSR/test guard */ }
}

function clearCookie(name: string): void {
  try {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  } catch { /* SSR/test guard */ }
}

export function setToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(LEGACY_SESSION_TOKEN_KEY, token);
  // Mirror to cookie so Vercel Edge Middleware can read it
  setCookie("grudge_auth_token", token);
}

export function clearToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
  clearCookie("grudge_auth_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

// ── Session helpers ──────────────────────────────────────────────────

export function getSession(): GrudgeSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session: GrudgeSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  // Mirror grudge_id to cookie for Edge Middleware single-account enforcement
  if (session.grudgeId) setCookie("grudge_id", session.grudgeId);
}

export function getCurrentUser(): GrudgeUser | null {
  const session = getSession();
  if (!session) {
    const token = getToken();
    if (!token) return null;
    const grudgeId = localStorage.getItem("grudge_id") || "";
    const username = localStorage.getItem("grudge_username") || "";
    const userId = localStorage.getItem("grudge_user_id");
    if (!grudgeId && !username) return null;
    return {
      id: userId ? Number(userId) : undefined,
      grudgeId,
      username: username || "Player",
    };
  }
  return {
    grudgeId: session.grudgeId || "",
    username: session.username,
    walletAddress: session.walletAddress,
  };
}

export function logout(): void {
  clearToken();
  clearCookie("grudge_id");
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("grudge_user_id");
  localStorage.removeItem("grudge_id");
  localStorage.removeItem("grudge_username");
  localStorage.removeItem("grudge_account_id");
}

// ── Device ID (for guest login) ──────────────────────────────────────

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

// ── Auth API response shape ──────────────────────────────────────────

interface AuthResponse {
  success: boolean;
  sessionToken: string;
  token: string;
  grudgeId: string;
  username: string;
  user: GrudgeUser;
  message?: string;
}

// ── Core auth handler ────────────────────────────────────────────────

async function handleAuthResponse(
  res: Response,
  sessionType: GrudgeSession["type"],
  extra?: Partial<GrudgeSession>,
): Promise<AuthResponse> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Auth failed (${res.status})`);
  }

  const data: AuthResponse = await res.json();

  // Store session token under both canonical and legacy keys
  const token = data.sessionToken || data.token;
  if (token) setToken(token);

  // Store session data (same format as GrudgeWars)
  const user = data.user || ({} as GrudgeUser);
  const resolvedUserId = user.id ? String(user.id) : "";
  const resolvedGrudgeId = user.grudgeId || data.grudgeId || "";
  const resolvedUsername = user.displayName || user.username || data.username || "Unknown";
  if (resolvedUserId) localStorage.setItem("grudge_user_id", resolvedUserId);
  if (resolvedGrudgeId) localStorage.setItem("grudge_id", resolvedGrudgeId);
  if (resolvedUsername) localStorage.setItem("grudge_username", resolvedUsername);
  // Sync account ID for CharacterManager scoping (prevents "guest" fallback)
  const accountIdForScope = resolvedGrudgeId || resolvedUserId || '';
  if (accountIdForScope) localStorage.setItem("grudge_account_id", accountIdForScope);
  const session: GrudgeSession = {
    type: sessionType,
    username: resolvedUsername,
    grudgeId: resolvedGrudgeId || undefined,
    accountId: user.id,
    loginTime: Date.now(),
    ...extra,
  };
  setSession(session);

  return data;
}

// ── Auth methods ─────────────────────────────────────────────────────

/** Username + password login */
export async function loginWithCredentials(
  username: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return handleAuthResponse(res, "grudge");
}

/** Create new account with username + password */
export async function registerAccount(
  username: string,
  password: string,
  email?: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, email }),
  });
  return handleAuthResponse(res, "grudge");
}

/** Grudge Auth via Puter SDK (Google, guest, etc.) */
export async function loginWithPuter(
  puterUuid: string,
  puterUsername?: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/puter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ puterId: puterUuid, displayName: puterUsername }),
  });
  return handleAuthResponse(res, "puter", { puterUsername });
}

/** Solana wallet connect — auto-creates account if new */
export async function loginWithWallet(
  walletAddress: string,
  web3authToken?: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/wallet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet_address: walletAddress, web3auth_token: web3authToken }),
  });
  return handleAuthResponse(res, "wallet", { walletAddress });
}

/** Guest login — uses Puter quiet guest under the hood */
export async function loginAsGuest(): Promise<AuthResponse> {
  // Try Puter quiet guest first
  const hasPuter = typeof window !== "undefined" && !!(window as any).puter;
  if (hasPuter) {
    try {
      const puter = (window as any).puter;
      if (!puter.auth?.isSignedIn?.()) {
        await puter.auth.signIn();
      }
      const user = await puter.auth.getUser();
      if (user?.uuid) {
        return loginWithPuter(user.uuid, user.username);
      }
    } catch {
      // Fall through to device-based guest
    }
  }

  // Fallback: device-based guest
  const res = await fetch(`${API_BASE}/auth/puter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      puterId: `guest_${getDeviceId()}`,
      displayName: "Guest",
    }),
  });
  return handleAuthResponse(res, "guest");
}

/**
 * Discord OAuth (2026-04-27 — client-built URL).
 *
 * The backend `/auth/discord/start` endpoint returns 404 right now, but
 * `/auth/discord/callback` is alive. We build the discord.com authorize
 * URL on the client and redirect there directly. Discord then redirects
 * back to `id.grudge-studio.com/auth/discord/callback` with the code; the
 * backend exchanges it for a Grudge JWT and redirects to `state` with
 * `?sso_token=...` (picked up by the IIFE at the top of this file).
 */
export async function startDiscordLogin(): Promise<string> {
  const { buildDiscordOAuthUrl } = await import("./grudgeConfig");
  return buildDiscordOAuthUrl(window.location.origin + '/');
}

/**
 * Google sign-in (2026-04-27 — routes through Puter SDK).
 *
 * The backend `/auth/google/start` endpoint returns 404 right now. Instead
 * of failing, we delegate to the Puter SDK — `puter.auth.signIn()` shows
 * a Puter popup that includes Google as a provider. The resulting Puter
 * UUID is then exchanged for a Grudge JWT via `/auth/puter` (alive).
 *
 * Per project rule i5j4NUBegZNoyEEBjTkREl the visible button stays
 * branded "Continue with Google" — the Puter chrome is just the popup
 * that Puter renders during sign-in.
 *
 * Returns a sentinel URL (`__puter_sdk__`) so callers in login.tsx can
 * detect the in-place auth flow and not attempt a `window.location.href`
 * redirect. Prefer calling `loginWithPuterSDK()` directly when possible.
 */
export async function startGoogleLogin(): Promise<string> {
  await loginWithPuterSDK();
  return '__puter_sdk__';
}

/**
 * GitHub OAuth — same shape as Discord. The backend `/auth/github/start`
 * endpoint is also currently 404; left as-is until the backend restores
 * either the start endpoint or this can be moved to a client-built URL
 * (would require VITE_GITHUB_CLIENT_ID in env).
 */
export async function startGithubLogin(): Promise<string> {
  const state = encodeURIComponent(window.location.origin + '/');
  const res = await fetch(`${API_BASE}/auth/github/start?state=${state}`);
  const data = await res.json();
  return data.url;
}

// ── Twilio Phone Auth ────────────────────────────────────────────────

/** Send SMS verification code via Twilio */
export async function sendPhoneCode(phone: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/auth/phone/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to send code");
  return data;
}

/** Verify SMS code → login or create account */
export async function verifyPhoneCode(
  phone: string,
  code: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/phone/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  return handleAuthResponse(res, "phone");
}

// ── Direct browser wallet connect (Phantom / Solflare) ───────────────

interface SolanaProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  connect: () => Promise<{ publicKey: { toBase58(): string } }>;
  publicKey?: { toBase58(): string } | null;
}

/** Detect available Solana browser wallets */
export function getAvailableWallets(): string[] {
  const wallets: string[] = [];
  if (typeof window === "undefined") return wallets;
  if ((window as any).solana?.isPhantom) wallets.push("phantom");
  if ((window as any).solflare?.isSolflare) wallets.push("solflare");
  return wallets;
}

/** Connect to a browser wallet and authenticate */
export async function connectBrowserWallet(
  walletName: "phantom" | "solflare" = "phantom",
): Promise<AuthResponse> {
  let provider: SolanaProvider | null = null;
  if (walletName === "phantom") provider = (window as any).solana;
  else if (walletName === "solflare") provider = (window as any).solflare;

  if (!provider) {
    throw new Error(
      walletName === "phantom"
        ? "Phantom wallet not installed. Get it at phantom.app"
        : "Solflare wallet not installed. Get it at solflare.com",
    );
  }

  const resp = await provider.connect();
  const address = resp.publicKey.toBase58();
  return loginWithWallet(address);
}

// ── Puter SDK sign-in (explicit user-triggered) ──────────────────────

/** Trigger Puter sign-in flow and authenticate with Grudge backend */
export async function loginWithPuterSDK(): Promise<AuthResponse> {
  const puter = (window as any).puter;
  if (!puter) throw new Error("Puter SDK not loaded");
  if (!puter.auth?.isSignedIn?.()) {
    await puter.auth.signIn();
  }
  const user = await puter.auth.getUser();
  if (!user?.uuid) throw new Error("Puter sign-in cancelled");
  return loginWithPuter(user.uuid, user.username);
}

// ── Token verification ───────────────────────────────────────────────

export async function verifyToken(): Promise<{
  valid: boolean;
  grudgeId?: string;
  username?: string;
}> {
  const token = getToken();
  if (!token) return { valid: false };

  // Client-side only validation (no VPS). If it's a JWT, check expiry.
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.warn("[Auth] Token expired, logging out");
        logout();
        return { valid: false };
      }
    }
  } catch {
    // Not a JWT — treat any non-empty token as valid (Puter session tokens aren't JWTs)
  }

  // Token exists and isn't expired — valid
  const grudgeId = localStorage.getItem("grudge_id") || undefined;
  const username = localStorage.getItem("grudge_username") || undefined;
  return { valid: true, grudgeId, username };
}

// ── Periodic token re-verification (every 5 minutes) ─────────────────

let _tokenCheckInterval: ReturnType<typeof setInterval> | null = null;
const TOKEN_CHECK_MS = 5 * 60 * 1000;

export function startTokenMonitor(): void {
  if (_tokenCheckInterval) return;
  _tokenCheckInterval = setInterval(async () => {
    if (!getToken()) return;
    const result = await verifyToken();
    if (!result.valid && getToken()) {
      // Token was present but invalid — it was revoked or expired
      console.warn("[Auth] Session expired, clearing");
      logout();
    }
  }, TOKEN_CHECK_MS);
}

export function stopTokenMonitor(): void {
  if (_tokenCheckInterval) {
    clearInterval(_tokenCheckInterval);
    _tokenCheckInterval = null;
  }
}

// Auto-start in browser
if (typeof window !== "undefined") {
  startTokenMonitor();
}

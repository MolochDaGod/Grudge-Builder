/**
 * Grudge Backend Integration — Unified Auth
 *
 * Auth flows through grudgewarlords.com API (proxied via Vercel rewrites):
 *   /api/auth/login          → username/password
 *   /api/auth/register       → new account (username/password)
 *   /api/auth/puter          → Grudge Auth (Puter SDK — Google, guest)
 *   /api/auth/verify         → validate session token
 *   /api/auth/wallet         → Solana wallet connect
 *   /api/auth/phone/send     → Twilio SMS verification code
 *   /api/auth/phone/verify   → verify SMS code → login/create
 *   /api/auth/discord/start  → Discord OAuth redirect
 *   /api/auth/google/start   → Google OAuth redirect
 *
 * On any account creation the backend automatically:
 *   1. Creates DB row
 *   2. Generates server-side Solana wallet
 *   3. Assigns Grudge ID
 *   4. Creates Puter cloud storage
 *
 * Uses same localStorage keys as GrudgeWars for cross-app compatibility.
 */

// ── API base (routed through Vercel rewrites in vercel.json) ─────────
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
}

// ── SSO token pickup (from cross-app redirects like GrudgeWars) ──────
const SSO_AUTH_URL = "https://id.grudge-studio.com";

(function pickupSsoToken() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get("sso_token");
    if (ssoToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, ssoToken);
      localStorage.setItem(LEGACY_SESSION_TOKEN_KEY, ssoToken);
      const returnedUserId = params.get("grudge_user_id") || params.get("userId") || "";
    const returnedGrudgeId = params.get("grudge_id") || params.get("grudgeId") || "";
      const returnedUsername = params.get("grudge_username") || params.get("username") || "";
      if (returnedUserId) localStorage.setItem("grudge_user_id", returnedUserId);
      if (returnedGrudgeId) localStorage.setItem("grudge_id", returnedGrudgeId);
      if (returnedUsername) localStorage.setItem("grudge_username", returnedUsername);
      // Sync account ID for CharacterManager scoping
      const ssoAccountId = returnedGrudgeId || returnedUserId || '';
      if (ssoAccountId) localStorage.setItem("grudge_account_id", ssoAccountId);
      // Clean URL without reload
      params.delete("sso_token");
      params.delete("sso_required");
      params.delete("grudge_user_id");
      params.delete("userId");
      params.delete("grudge_id");
      params.delete("grudgeId");
      params.delete("grudge_username");
      params.delete("username");
      const clean = params.toString();
      const newUrl = window.location.pathname + (clean ? `?${clean}` : "") + window.location.hash;
      window.history.replaceState(null, "", newUrl);
      return; // token captured, done
    }

    // Auto SSO-check disabled (2026-04-27): id.grudge-studio.com/auth/sso-check
    // currently returns 404, which produced a redirect loop on every page load
    // for unauthenticated users. The login page (route "/") handles missing auth
    // explicitly; protected routes guard with isAuthenticated().
    // Re-enable once /auth/sso-check is restored on the auth host — see
    // docs/audit-report.md §16.
    // const hasToken = !!localStorage.getItem(AUTH_TOKEN_KEY) || !!localStorage.getItem(LEGACY_SESSION_TOKEN_KEY);
    // const ssoRequired = params.get("sso_required");
    // if (!hasToken && !ssoRequired && window.location.pathname !== "/") {
    //   const returnUrl = encodeURIComponent(window.location.href);
    //   window.location.href = `${SSO_AUTH_URL}/auth/sso-check?return=${returnUrl}`;
    // }
  } catch { /* ignore in SSR/test */ }
})();

// ── Token helpers ────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_SESSION_TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(LEGACY_SESSION_TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
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
    body: JSON.stringify({ puterUuid, puterUsername }),
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
      puterUuid: `guest_${getDeviceId()}`,
      puterUsername: "Guest",
    }),
  });
  return handleAuthResponse(res, "guest");
}

/** Discord OAuth — returns redirect URL */
export async function startDiscordLogin(): Promise<string> {
  const state = encodeURIComponent(window.location.origin + '/');
  const res = await fetch(`${API_BASE}/auth/discord/start?state=${state}`);
  const data = await res.json();
  return data.url;
}

/** Google OAuth — returns redirect URL */
export async function startGoogleLogin(): Promise<string> {
  const state = encodeURIComponent(window.location.origin + '/');
  const res = await fetch(`${API_BASE}/auth/google/start?state=${state}`);
  const data = await res.json();
  return data.url;
}

/** GitHub OAuth — returns redirect URL */
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

  // Quick client-side JWT expiry check (avoids unnecessary network call)
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.warn("[Auth] Token expired, logging out");
      logout();
      return { valid: false };
    }
  } catch {
    // Not a JWT or malformed — fall through to server verification
  }

  try {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      // Server says invalid — clear stale session
      if (res.status === 401) logout();
      return { valid: false };
    }
    const data = await res.json();
    return {
      valid: data.valid === true,
      grudgeId: data.grudgeId,
      username: data.username,
    };
  } catch {
    // Network error — don't log out (backend might just be down)
    return { valid: false };
  }
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

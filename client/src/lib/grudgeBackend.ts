/**
 * Grudge Backend Integration — Auth & Session Management
 *
 * Auth is Puter-first (puter.auth.signIn). No backend.
 * Session tokens and user data live in localStorage.
 * Puter KV is used for persistent player data (characters, island, inventory).
 */

import { AUTH_GATEWAY } from "./grudgeConfig";

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

/** Bridge id.grudge-studio.com launch token → Railway JWT for the real Warlords account. */
export async function bridgeGrudgeLaunchToken(launchToken: string): Promise<boolean> {
  const body = JSON.stringify({
    token: launchToken,
    audience: window.location.origin,
  });
  const paths = [
    `${API_BASE}/auth/grudge-bridge`,
    `${API_BASE}/auth/session/exchange`,
  ];
  for (const path of paths) {
    try {
      const bridge = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!bridge.ok) continue;
      await handleAuthResponse(bridge, "grudge");
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("grudge:auth:ready", { detail: { source: path } }),
        );
      }
      return true;
    } catch {
      /* try next bridge endpoint */
    }
  }
  return false;
}

(function pickupSsoToken() {
  try {
    const params = new URLSearchParams(window.location.search);
    const launchToken = params.get("grudge_token");
    if (launchToken) {
      params.delete("grudge_token");
      const clean = params.toString();
      const newUrl = window.location.pathname + (clean ? `?${clean}` : "") + window.location.hash;
      window.history.replaceState(null, "", newUrl);
      bridgeGrudgeLaunchToken(launchToken).catch(() => {});
      return;
    }
    const ssoToken = params.get("sso_token") || params.get("token");
    if (ssoToken) {
      setToken(ssoToken);
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
      params.delete("token");
      params.delete("grudge_id");
      params.delete("grudgeId");
      params.delete("grudge_username");
      params.delete("username");
      params.delete("provider");
      const clean = params.toString();
      const newUrl = window.location.pathname + (clean ? `?${clean}` : "") + window.location.hash;
      window.history.replaceState(null, "", newUrl);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("grudge:auth:ready", { detail: { source: "sso_token" } }),
        );
      }
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
  // RTS / GrudgeSession cross-app keys
  localStorage.setItem("grudge.token", token);
  localStorage.setItem("grudge.token.exp", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  // Mirror to cookie so Vercel Edge Middleware can read it
  setCookie("grudge_auth_token", token);
}

export function clearToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
  localStorage.removeItem("grudge.token");
  localStorage.removeItem("grudge.token.exp");
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
  // Detect backend-down: if we got HTML back instead of JSON, the API
  // proxy is routing to a frontend deployment instead of Express.
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    throw new Error(
      "Server is temporarily unavailable. Try again in a moment.",
    );
  }

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
  email?: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/puter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ puterId: puterUuid, displayName: puterUsername, ...(email ? { email } : {}) }),
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

/** Guest login — device-based by default, upgrades to Puter if already signed in.
 *  Never opens a popup — that's `loginWithPuterSDK()`. */
export async function loginAsGuest(): Promise<AuthResponse> {
  // If the user already has a Puter session, use it (no popup)
  if (isPuterReady()) {
    try {
      const puter = (window as any).puter;
      if (puter.auth?.isSignedIn?.()) {
        const user = await puter.auth.getUser();
        if (user?.uuid) {
          console.debug("[Auth] Guest → existing Puter session", user.username);
          return loginWithPuter(user.uuid, user.username);
        }
      }
    } catch (e) {
      console.warn("[Auth] Puter session check failed, using device guest", e);
    }
  }

  // Device-based guest — always works, no SDK needed
  console.debug("[Auth] Guest → device-based", getDeviceId());
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
 * Discord OAuth — canonical Grudge ID gateway redirect.
 * Scopes: identify + email only. Returns sentinel for in-place redirect.
 */
export async function startDiscordLogin(): Promise<string> {
  const returnUrl = encodeURIComponent(`${window.location.origin}/auth/callback`);
  window.location.href = `${AUTH_GATEWAY}/auth/discord/start?return=${returnUrl}`;
  return "__discord_redirect__";
}

/** In-place Discord login (no return value needed). */
export function redirectDiscordLogin(returnPath = "/auth/callback"): void {
  const returnUrl = encodeURIComponent(`${window.location.origin}${returnPath}`);
  window.location.href = `${AUTH_GATEWAY}/auth/discord/start?return=${returnUrl}`;
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

// ── Phantom Embedded SDK ──────────────────────────────────────────────

import { BrowserSDK, AddressType } from '@phantom/browser-sdk';

/** Phantom Portal app ID — registered for grudge-studio.com + grudgewarlords.com */
const PHANTOM_APP_ID = '656b4ef2-7acc-44fe-bec7-4b288cfdd2e9';

let _phantomSdk: InstanceType<typeof BrowserSDK> | null = null;

/** Get or create the Phantom embedded SDK singleton */
function getPhantomSDK(): InstanceType<typeof BrowserSDK> {
  if (!_phantomSdk) {
    _phantomSdk = new BrowserSDK({
      providerType: 'embedded',
      addressTypes: [AddressType.solana],
      appId: PHANTOM_APP_ID,
      authOptions: {
        authUrl: 'https://connect.phantom.app/login',
        redirectUrl: window.location.origin,
      },
    });
  }
  return _phantomSdk;
}

/**
 * Connect via Phantom Embedded SDK → authenticate with Grudge backend.
 * Works without the browser extension installed — Phantom provides
 * an embedded wallet via their SDK.
 */
export async function connectPhantomEmbedded(): Promise<AuthResponse> {
  const sdk = getPhantomSDK();
  const { addresses } = await sdk.connect();
  const solAddress = addresses?.find((a: any) => a.type === 'solana');
  if (!solAddress) {
    throw new Error('No Solana address returned from Phantom. Please try again.');
  }
  const address = typeof solAddress === 'string' ? solAddress : (solAddress as any).address || (solAddress as any).publicKey;
  if (!address) {
    throw new Error('Could not read Solana address from Phantom response.');
  }
  return loginWithWallet(address);
}

// ── Direct browser wallet connect (Solflare extension) ───────────────

interface SolanaProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  connect: () => Promise<{ publicKey: { toBase58(): string } }>;
  publicKey?: { toBase58(): string } | null;
}

/** Detect available Solana browser wallets (extension-based) */
export function getAvailableWallets(): string[] {
  const wallets: string[] = [];
  if (typeof window === "undefined") return wallets;
  // Phantom is always available via embedded SDK — no extension needed
  wallets.push('phantom');
  if ((window as any).solflare?.isSolflare) wallets.push('solflare');
  return wallets;
}

/** Connect to a browser wallet and authenticate */
export async function connectBrowserWallet(
  walletName: "phantom" | "solflare" = "phantom",
): Promise<AuthResponse> {
  // Phantom uses embedded SDK (no extension required)
  if (walletName === 'phantom') {
    return connectPhantomEmbedded();
  }

  // Solflare still uses browser extension
  const provider: SolanaProvider | null = (window as any).solflare;
  if (!provider) {
    throw new Error('Solflare wallet not installed. Get it at solflare.com');
  }

  const resp = await provider.connect();
  const address = resp.publicKey.toBase58();
  return loginWithWallet(address);
}

// ── Third-party wallet link (Phantom / Solflare) ─────────────────────

export interface WalletOverview {
  gbuxBalance: number;
  primaryWallet: string | null;
  walletType: string | null;
  linkedWallets: Array<{
    id: string;
    walletAddress: string;
    provider: string;
    label: string | null;
    isPrimary: boolean;
  }>;
  onChain: Array<{
    walletAddress: string;
    sol: number | null;
    gbux: number | null;
    usdt: number | null;
    rpcConfigured?: boolean;
  }>;
  treasuryAddress: string | null;
  rates: { gbuxUsd: number; purchaseFeePercent: number };
}

export async function fetchWalletOverview(): Promise<WalletOverview> {
  const res = await fetch(`${API_BASE}/wallet/overview`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load wallet overview");
  return res.json();
}

async function connectSolanaForLink(provider: "phantom" | "solflare"): Promise<string> {
  if (provider === "phantom") {
    const phantom = (window as any).phantom?.solana;
    if (phantom?.connect) {
      const { publicKey } = await phantom.connect();
      return publicKey.toBase58();
    }
    const sdk = getPhantomSDK();
    const { addresses } = await sdk.connect();
    const sol = addresses?.find((a: { type?: string }) => a.type === "solana");
    const addr =
      typeof sol === "string"
        ? sol
        : (sol as { address?: string; publicKey?: string })?.address ||
          (sol as { publicKey?: string })?.publicKey;
    if (!addr) throw new Error("No Solana address from Phantom");
    return addr;
  }
  const solflare = (window as any).solflare;
  if (!solflare) throw new Error("Solflare not installed");
  const resp = await solflare.connect();
  return resp.publicKey.toBase58();
}

async function signSolanaLinkMessage(
  message: string,
  provider: "phantom" | "solflare",
): Promise<string> {
  const encoded = new TextEncoder().encode(message);
  const bs58 = (await import("bs58")).default;

  if (provider === "phantom") {
    const phantom = (window as any).phantom?.solana;
    if (!phantom?.signMessage) {
      throw new Error("Phantom signMessage unavailable — install the Phantom extension");
    }
    const { signature } = await phantom.signMessage(encoded, "utf8");
    return bs58.encode(signature);
  }

  const solflare = (window as any).solflare;
  if (!solflare) throw new Error("Solflare not installed");
  const signed = await solflare.signMessage(encoded, "utf8");
  const sigBytes = signed.signature || signed;
  return bs58.encode(sigBytes);
}

/** Sign a link challenge and attach wallet to the logged-in Grudge account. */
export async function linkThirdPartyWallet(
  provider: "phantom" | "solflare" = "phantom",
): Promise<string> {
  const walletAddress = await connectSolanaForLink(provider);

  const challengeRes = await fetch(`${API_BASE}/wallet/link/challenge`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress }),
  });
  if (!challengeRes.ok) {
    const err = await challengeRes.json().catch(() => ({}));
    throw new Error(err.error || "Failed to start wallet link");
  }
  const { message } = await challengeRes.json();
  const signature = await signSolanaLinkMessage(message, provider);

  const confirmRes = await fetch(`${API_BASE}/wallet/link/confirm`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, message, signature, provider }),
  });
  if (!confirmRes.ok) {
    const err = await confirmRes.json().catch(() => ({}));
    throw new Error(err.error || "Failed to confirm wallet link");
  }
  return walletAddress;
}

export async function quoteWalletPurchase(currency: "SOL" | "USDT", amount: number) {
  const res = await fetch(`${API_BASE}/wallet/purchase/quote`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ currency, amount }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Quote failed");
  }
  return res.json();
}

export async function createWalletPurchaseIntent(
  currency: "SOL" | "USDT",
  amount: number,
  linkedWalletAddress?: string,
) {
  const res = await fetch(`${API_BASE}/wallet/purchase/intent`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ currency, amount, linkedWalletAddress }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Could not create purchase");
  }
  return res.json();
}

// ── Puter SDK readiness ──────────────────────────────────────────────

/** True when the Puter SDK script has loaded and the global is available. */
export function isPuterReady(): boolean {
  return typeof window !== "undefined" && !!(window as any).puter?.auth;
}

/** Wait for the Puter SDK to become available (max 8 s). Resolves true if
 *  ready, false if the script never loaded. */
function waitForPuter(timeoutMs = 8000): Promise<boolean> {
  if (isPuterReady()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (isPuterReady()) return resolve(true);
      if (Date.now() - start > timeoutMs) {
        console.warn("[Auth] Puter SDK did not load within", timeoutMs, "ms");
        return resolve(false);
      }
      setTimeout(check, 200);
    };
    check();
  });
}

// ── Puter SDK sign-in (explicit user-triggered) ──────────────────────

/** Trigger Puter sign-in flow and authenticate with Grudge backend.
 *  Waits for the SDK to load, opens the sign-in popup, then exchanges
 *  the resulting Puter UUID for a Grudge JWT. */
export async function loginWithPuterSDK(): Promise<AuthResponse> {
  const ready = await waitForPuter();
  if (!ready) {
    throw new Error(
      "Sign-in service is still loading. Please wait a moment and try again.",
    );
  }

  const puter = (window as any).puter;
  console.debug("[Auth] Puter SDK ready, starting sign-in flow");

  try {
    if (!puter.auth?.isSignedIn?.()) {
      await puter.auth.signIn();
    }
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error("[Auth] Puter signIn() failed:", msg, e);
    if (msg.includes("referrer") || msg.includes("popup") || msg.includes("blocked")) {
      throw new Error(
        "Sign-in popup was blocked by your browser. Allow popups for this site and try again.",
      );
    }
    if (msg.includes("cancel") || msg.includes("closed")) {
      throw new Error("Sign-in was cancelled.");
    }
    throw new Error(`Sign-in failed: ${msg}`);
  }

  let user: any;
  try {
    user = await puter.auth.getUser();
    console.debug("[Auth] Puter user:", user?.username, user?.uuid?.slice(0, 8));
  } catch (e) {
    console.error("[Auth] puter.auth.getUser() failed:", e);
    throw new Error("Could not retrieve your account. Please try again.");
  }

  if (!user?.uuid) {
    console.warn("[Auth] Puter user has no UUID — sign-in was cancelled or incomplete");
    throw new Error("Sign-in was cancelled.");
  }

  const email: string | undefined = user.email || undefined;
  console.debug("[Auth] Puter email check:", email ? "email present" : "no email");
  return loginWithPuter(user.uuid, user.username, email);
}

// ── Token verification ───────────────────────────────────────────────

export async function verifyToken(): Promise<{
  valid: boolean;
  grudgeId?: string;
  username?: string;
}> {
  const token = getToken();
  if (!token) return { valid: false };

  // Client-side only validation (No separate backend). If it's a JWT, check expiry.
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

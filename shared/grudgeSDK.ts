/**
 * Grudge SDK — lightweight client SDK for any Grudge Studio game.
 *
 * Provides: Auth, Inventory (with UUID), Assets, UUID utilities.
 * Import this from GrudgeBuilder, grudge-drive, or any future game.
 *
 * All methods use relative paths when running inside the GrudgeBuilder
 * Vercel frontend, or absolute URLs when used from external games.
 */

// ── Config ──────────────────────────────────────────────────────────

export interface GrudgeSDKConfig {
  /** Base URL for the Grudge API. Default: "https://api.grudge-studio.com" */
  apiBase?: string;
  /** Base URL for auth. Default: "https://id.grudge-studio.com" */
  authBase?: string;
  /** Base URL for assets CDN. Default: "https://assets.grudge-studio.com" */
  assetsBase?: string;
  /** Base URL for ObjectStore. Default: "https://info.grudge-studio.com" */
  objectStoreBase?: string;
  /** Pre-set JWT token (skip login). */
  token?: string;
}

const DEFAULT_CONFIG: Required<GrudgeSDKConfig> = {
  apiBase: "https://api.grudge-studio.com",
  authBase: "https://id.grudge-studio.com",
  assetsBase: "https://assets.grudge-studio.com",
  objectStoreBase: "https://info.grudge-studio.com",
  token: "",
};

// ── Core ────────────────────────────────────────────────────────────

let _cfg: Required<GrudgeSDKConfig> = { ...DEFAULT_CONFIG };
let _token: string = "";
let _accountId: string = "";

export function initGrudgeSDK(config?: GrudgeSDKConfig) {
  _cfg = { ...DEFAULT_CONFIG, ...config };
  if (_cfg.token) _token = _cfg.token;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (_token) h["Authorization"] = `Bearer ${_token}`;
  return h;
}

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${_cfg.apiBase}${path}`;
  const res = await fetch(url, { ...init, headers: { ...headers(), ...(init?.headers as Record<string, string> ?? {}) } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status, body });
  }
  return res.json();
}

// ── Auth ────────────────────────────────────────────────────────────

export const GrudgeAuth = {
  /** Login with email + password. Returns JWT + accountId. */
  async login(email: string, password: string) {
    const data = await api<{ token: string; accountId: string }>(`${_cfg.authBase}/api/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    _token = data.token;
    _accountId = data.accountId;
    return data;
  },

  /** Register a new account. */
  async register(email: string, password: string, displayName?: string) {
    const data = await api<{ token: string; accountId: string }>(`${_cfg.authBase}/api/register`, {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    });
    _token = data.token;
    _accountId = data.accountId;
    return data;
  },

  /** Create a guest session (auto Grudge ID). */
  async guest() {
    const data = await api<{ token: string; accountId: string; grudgeId: string }>(`${_cfg.authBase}/api/guest`, {
      method: "POST",
    });
    _token = data.token;
    _accountId = data.accountId;
    return data;
  },

  /** Verify current token. */
  async verify() {
    return api<{ valid: boolean; userId: string; accountId: string }>(`${_cfg.authBase}/api/verify`);
  },

  /** Set token from external source (e.g. localStorage). */
  setToken(token: string, accountId?: string) {
    _token = token;
    if (accountId) _accountId = accountId;
  },

  getToken: () => _token,
  getAccountId: () => _accountId,
  isAuthenticated: () => !!_token,

  logout() {
    _token = "";
    _accountId = "";
  },
};

// ── Inventory (UUID-backed) ─────────────────────────────────────────

export const GrudgeInventory = {
  /** Get all items for the current account. */
  async getItems() {
    return api<any[]>("/api/account/inventory");
  },

  /** Get all UUIDs for the current account (with state filter). */
  async getUUIDs(state?: "ACTIVE" | "ARCHIVED" | "CONSUMED" | "DESTROYED") {
    const qs = state ? `?state=${state}` : "";
    return api<any>(`/api/ledger/account/${_accountId}${qs}`);
  },

  /** Resolve loot drops — stamps UUIDs on each item via the backend. */
  async resolveDrops(drops: Array<{ itemId: string; name: string; quantity: number; tier: number | null }>, sourceType = "drop", sourceRef?: string, characterId?: string) {
    return api<{ success: boolean; count: number; items: any[] }>("/api/island/resolve-drops", {
      method: "POST",
      body: JSON.stringify({ drops, accountId: _accountId, sourceType, sourceRef, characterId }),
    });
  },

  /** Execute a crafting operation with UUID validation + consumption. */
  async craft(params: {
    inputUuids: string[];
    recipeId: string;
    outputSlot: string;
    outputTier: number;
    outputItemName: string;
    characterId?: string;
  }) {
    return api<{ success: boolean; craftedItem: any }>("/api/crafting/craft", {
      method: "POST",
      body: JSON.stringify({ ...params, accountId: _accountId }),
    });
  },

  /** Grant reward items with UUID stamping. */
  async grantRewards(items: Array<{ itemId: string; name: string; quantity: number; tier: number | null }>, sourceType = "reward", sourceRef?: string, characterId?: string) {
    return api<{ success: boolean; items: any[] }>("/api/rewards/grant", {
      method: "POST",
      body: JSON.stringify({ items, accountId: _accountId, sourceType, sourceRef, characterId }),
    });
  },

  /** Validate a UUID belongs to this account and is ACTIVE. */
  async validate(grudgeUuid: string) {
    return api<{ uuid: string; isValid: boolean; currentState: string }>(`/api/ledger/validate/${grudgeUuid}`);
  },

  /** Transfer UUID to another account. */
  async transfer(grudgeUuid: string, toAccountId: string, sourceRef?: string) {
    return api<{ success: boolean }>("/api/uuid/transfer", {
      method: "POST",
      body: JSON.stringify({ grudgeUuid, fromAccountId: _accountId, toAccountId, sourceRef }),
    });
  },
};

// ── Assets ──────────────────────────────────────────────────────────

export const GrudgeAssets = {
  /** Get full CDN URL for an asset path. */
  url(path: string): string {
    if (path.startsWith("http")) return path;
    return `${_cfg.assetsBase}/${path.replace(/^\//, "")}`;
  },

  /** Fetch JSON from ObjectStore. */
  async fetchData<T = unknown>(endpoint: string): Promise<T> {
    const url = `${_cfg.objectStoreBase}/api/v1/${endpoint.replace(/^\//, "")}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`ObjectStore: ${res.status}`);
    return res.json();
  },

  /** Fetch master items list. */
  items: () => GrudgeAssets.fetchData<any>("master-items.json"),
  /** Fetch master recipes list. */
  recipes: () => GrudgeAssets.fetchData<any>("master-recipes.json"),
  /** Fetch master materials list. */
  materials: () => GrudgeAssets.fetchData<any>("master-materials.json"),
  /** Fetch races. */
  races: () => GrudgeAssets.fetchData<any>("races.json"),
  /** Fetch classes. */
  classes: () => GrudgeAssets.fetchData<any>("classes.json"),
  /** Fetch professions. */
  professions: () => GrudgeAssets.fetchData<any>("professions.json"),
};

// ── UUID utilities (re-export) ──────────────────────────────────────

export {
  generateGrudgeUUID,
  parseGrudgeUUID,
  describeGrudgeUUID,
  isValidGrudgeUUID,
  SLOT_CODES,
  CODE_TO_SLOT,
  TIER_CODES,
  getSlotCode,
  tierToCode,
  codeToTier,
  batchGenerateUUIDs,
} from "./grudgeUUID";

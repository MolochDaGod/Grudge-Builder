/**
 * GrudgeAccountSDK
 *
 * Portable, framework-agnostic account + character module for ALL Grudge Studio apps.
 * No React dependency — works in vanilla JS, Vue, Svelte, or any game engine.
 *
 * ─── Two operating modes ─────────────────────────────────────────────────────
 *
 *  STANDALONE (The-ENGINE, grudgeDot launcher, nexus-nemesis, etc.)
 *    → Makes same-origin fetch() calls to /api/* (Vercel → Railway game data) using stored JWT.
 *
 *  EMBEDDED (grudge-crafting.puter.site inside grudgewarlords.com iframe)
 *    → Listens for GRUDGE_AUTH postMessage from parent, exposes GRUDGE_READY.
 *    → Falls back to URL ?token=&characterId= params on first load.
 *
 * ─── Integration ─────────────────────────────────────────────────────────────
 *
 *  // In any Grudge app (standalone):
 *  import { GrudgeAccountSDK } from '@grudge-studio/account-sdk';
 *  await GrudgeAccountSDK.init(); // same-origin /api → Railway
 *  const characters = await GrudgeAccountSDK.getCharacters();
 *
 *  // In an embedded iframe (e.g. grudge-crafting.puter.site):
 *  import { GrudgeAccountSDK } from '@grudge-studio/account-sdk';
 *  GrudgeAccountSDK.initEmbedded();
 *  GrudgeAccountSDK.onCharacterChange((char) => { craftingUI.setCharacter(char); });
 *
 * ─── Emitted events (DOM, for apps that don't import the SDK directly) ────────
 *  'grudge:auth:ready'              — fired when token is available
 *  'grudge:character:selected'      — { detail: { characterId } }
 *  'grudge:character:updated'       — { detail: { character } }  (backend update)
 *  'grudge:sync:complete'           — fired after a backend sync
 */

// ── Constants ──────────────────────────────────────────────────────────────────

const TOKEN_KEY      = 'grudge_auth_token';
const CHAR_ACTIVE    = 'gruda_active_character';
const GRUDGE_ID_KEY  = 'grudge_id';
const USERNAME_KEY   = 'grudge_username';
const ACCOUNT_ID_KEY = 'grudge_account_id';
const POLL_MS        = 60_000;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GrudgeCharacter {
  id:               string;
  name:             string;
  /** Canonical hero code GRDG-{RACE3}{CLASS3}-{suffix} */
  grudgeCode?:      string | null;
  raceId:           string;
  classId:          string;
  level:            number;
  xp:               number;
  hp?:              number;
  energy?:          number;
  avatarUrl?:       string | null;
  attributes?:      Record<string, number>;
  professionLevels?: Record<string, { level: number; xp: number }>;
  equipment?:       Record<string, string | null>;
  inventory?:       Array<{ itemId: string; quantity: number }>;
  createdAt?:       number;
}

export interface GrudgeUser {
  grudgeId:  string;
  username:  string;
  displayName?: string;
  email?:    string;
  gbuxBalance?: number;
  walletAddress?: string;
  isPremium?: boolean;
}

type CharacterCallback = (character: GrudgeCharacter | null) => void;

// ── SDK singleton ──────────────────────────────────────────────────────────────

function defaultApiBase(): string {
  // Browser: same-origin /api → Vercel fleet rewrites → Railway game data
  if (typeof window !== 'undefined') return '';
  return 'https://grudge-api-production-0d46.up.railway.app';
}

class _GrudgeAccountSDK {
  private _apiBase    = defaultApiBase();
  private _token: string | null = null;
  private _user: GrudgeUser | null = null;
  private _characters: GrudgeCharacter[] = [];
  private _activeId: string | null = null;
  private _callbacks: CharacterCallback[] = [];
  private _pollTimer: ReturnType<typeof setInterval> | null = null;
  private _embedded = false;
  private _ready    = false;

  // ── Init ────────────────────────────────────────────────────────────────────

  /**
   * STANDALONE init — call from any non-embedded Grudge app.
   * Reads token from localStorage, then fetches user + characters.
   */
  async init(apiBase?: string): Promise<void> {
    if (apiBase) this._apiBase = apiBase;
    this._token   = this._readToken();
    this._activeId = this._readActiveId();
    if (this._token) {
      await this.syncFromBackend();
    }
    this._startPoll();
    this._dispatch('grudge:auth:ready');
    this._ready = true;
  }

  /**
   * EMBEDDED init — call from apps running inside an iframe
   * (e.g. grudge-crafting.puter.site inside grudgewarlords.com).
   *
   * Reads ?token=&characterId= from URL first, then waits for
   * GRUDGE_AUTH postMessage from parent and fires GRUDGE_READY back.
   */
  initEmbedded(): void {
    this._embedded = true;

    // 1. Try URL params (first load fast path)
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const urlToken = p.get('token');
      const urlChar  = p.get('characterId');
      if (urlToken) { this._token = urlToken; this._saveToken(urlToken); }
      if (urlChar)  { this._activeId = urlChar; this._saveActiveId(urlChar); }

      // 2. Listen for GRUDGE_AUTH from parent
      window.addEventListener('message', (e: MessageEvent) => {
        if (e.data?.type !== 'GRUDGE_AUTH') return;
        const { token, characterId, grudgeId, username } = e.data;
        if (token)       { this._token = token; this._saveToken(token); }
        if (characterId) { this._activeId = characterId; this._saveActiveId(characterId); }
        if (grudgeId)    localStorage.setItem(GRUDGE_ID_KEY, grudgeId);
        if (username)    localStorage.setItem(USERNAME_KEY, username);
        if (this._token) this.syncFromBackend();
        this._dispatch('grudge:auth:ready');
      });

      // Signal parent we're ready to receive auth
      window.parent?.postMessage({ type: 'GRUDGE_READY' }, '*');
    }

    this._startPoll();
    this._ready = true;
  }

  // ── Token helpers ───────────────────────────────────────────────────────────

  private _readToken(): string | null {
    return (
      (typeof localStorage !== 'undefined' && localStorage.getItem(TOKEN_KEY)) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('grudge_session_token')) ||
      null
    );
  }

  private _saveToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem('grudge_session_token', token);
    }
  }

  private _readActiveId(): string | null {
    if (typeof localStorage === 'undefined') return null;
    const grudgeId = localStorage.getItem(ACCOUNT_ID_KEY) || 'guest';
    const key = `${CHAR_ACTIVE}_${grudgeId}`;
    return localStorage.getItem(key) || localStorage.getItem(CHAR_ACTIVE);
  }

  private _saveActiveId(id: string): void {
    if (typeof localStorage === 'undefined') return;
    const grudgeId = localStorage.getItem(ACCOUNT_ID_KEY) || 'guest';
    localStorage.setItem(`${CHAR_ACTIVE}_${grudgeId}`, id);
    localStorage.setItem(CHAR_ACTIVE, id); // legacy compat
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  getToken(): string | null { return this._token || this._readToken(); }

  getUser(): GrudgeUser | null { return this._user; }

  getCharacters(): GrudgeCharacter[] { return this._characters; }

  getActiveId(): string | null { return this._activeId || this._readActiveId(); }

  getActiveCharacter(): GrudgeCharacter | null {
    const id = this.getActiveId();
    return id ? (this._characters.find(c => c.id === id) ?? null) : null;
  }

  /**
   * Select a character as the active crafter/player.
   * Persists to localStorage, fires callbacks, and dispatches DOM event.
   */
  selectCharacter(id: string): void {
    this._activeId = id;
    this._saveActiveId(id);
    const char = this._characters.find(c => c.id === id) ?? null;
    this._notifyCallbacks(char);
    this._dispatch('grudge:character:selected', { characterId: id });

    // If embedded, notify parent frame
    if (this._embedded && typeof window !== 'undefined') {
      window.parent?.postMessage({ type: 'GRUDGE_CHARACTER_CHANGE', characterId: id }, '*');
    }
  }

  /** Subscribe to active character changes */
  onCharacterChange(cb: CharacterCallback): () => void {
    this._callbacks.push(cb);
    return () => { this._callbacks = this._callbacks.filter(f => f !== cb); };
  }

  // ── Backend sync ────────────────────────────────────────────────────────────

  /**
   * Fetch user + characters from Railway via same-origin /api/characters.
   * Safe to call at any time — no-ops if token is missing.
   */
  async syncFromBackend(): Promise<void> {
    const token = this.getToken();
    if (!token) return;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'X-Session-Token': token,
      'Content-Type': 'application/json',
    };

    try {
      // Fetch user profile
      const userRes = await fetch(`${this._apiBase}/api/account`, { headers });
      if (userRes.ok) {
        const userData = await userRes.json();
        this._user = {
          grudgeId:    userData.grudgeId || localStorage.getItem(GRUDGE_ID_KEY) || '',
          username:    userData.username || localStorage.getItem(USERNAME_KEY) || '',
          displayName: userData.displayName,
          email:       userData.email,
          gbuxBalance: Number(userData.gbuxBalance ?? 0),
          walletAddress: userData.walletAddress,
          isPremium:   userData.isPremium,
        };
        if (this._user.grudgeId) localStorage.setItem(GRUDGE_ID_KEY, this._user.grudgeId);
      }

      // Fetch characters
      const charRes = await fetch(`${this._apiBase}/api/characters?era=warlords`, { headers });
      if (charRes.ok) {
        const raw = await charRes.json();
        const chars: GrudgeCharacter[] = Array.isArray(raw) ? raw : (raw.characters ?? []);
        this._characters = chars;

        // Restore or auto-select active character
        const stored = this.getActiveId();
        if (stored && chars.some(c => c.id === stored)) {
          this._activeId = stored;
        } else if (chars.length > 0) {
          this._activeId = chars[0].id;
          this._saveActiveId(chars[0].id);
        }

        const activeChar = this.getActiveCharacter();
        this._notifyCallbacks(activeChar);
        this._dispatch('grudge:character:updated', { character: activeChar });
      }

      this._dispatch('grudge:sync:complete');
    } catch (err) {
      console.warn('[GrudgeAccountSDK] sync failed:', err);
    }
  }

  /**
   * Save a character update to the backend (partial update).
   */
  /**
   * Create a new hero on Railway SSOT (POST /api/characters).
   * Server always stamps grudgeCode (GRDG-HUMWAR-…); pass name for display.
   * Optional grudgeCode / grudgeDisplayId is accepted and normalized server-side.
   */
  async createCharacter(
    data: Pick<GrudgeCharacter, 'name' | 'raceId' | 'classId'> &
      Partial<GrudgeCharacter> & {
        grudgeCode?: string;
        grudgeDisplayId?: string;
        model3d?: Record<string, unknown>;
        gameEra?: string;
      },
  ): Promise<GrudgeCharacter | null> {
    const token = this.getToken();
    if (!token) return null;
    const BASE = 10;
    const attrs = data.attributes ?? {
      Strength: BASE, Vitality: BASE, Endurance: BASE, Intellect: BASE,
      Wisdom: BASE, Dexterity: BASE, Agility: BASE, Tactics: BASE,
    };
    try {
      const res = await fetch(`${this._apiBase}/api/characters`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          attributes: attrs,
          gameOrigin: 'grudge-fleet',
          grudgeCode: data.grudgeCode ?? data.grudgeDisplayId,
        }),
      });
      if (!res.ok) return null;
      const created: GrudgeCharacter = await res.json();
      this._characters.push(created);
      this.selectCharacter(created.id);
      return created;
    } catch {
      return null;
    }
  }

  /** Mint character as Solana cNFT via Crossmint (server-side wallet). */
  async mintCharacterCNFT(characterId: string, avatarUrl?: string): Promise<{
    success: boolean; mintAddress?: string; assetId?: string; error?: string;
  }> {
    const token = this.getToken();
    if (!token) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch(`${this._apiBase}/api/characters/${characterId}/mint`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatarUrl }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e?.message || 'Mint failed' };
    }
  }

  /** Ensure Crossmint server wallet exists for this account. */
  async ensureWallet(): Promise<{ walletAddress?: string; error?: string }> {
    const token = this.getToken();
    if (!token) return { error: 'Not authenticated' };
    try {
      const status = await fetch(`${this._apiBase}/api/wallet/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (status.ok) {
        const d = await status.json();
        if (d.walletAddress) return { walletAddress: d.walletAddress };
      }
      const create = await fetch(`${this._apiBase}/api/wallet/create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!create.ok) return { error: 'Wallet creation failed' };
      const d = await create.json();
      return { walletAddress: d.walletAddress };
    } catch (e: any) {
      return { error: e?.message };
    }
  }

  async saveCharacter(id: string, updates: Partial<GrudgeCharacter>): Promise<GrudgeCharacter | null> {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${this._apiBase}/api/characters/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) return null;
      const updated: GrudgeCharacter = await res.json();
      this._characters = this._characters.map(c => c.id === id ? updated : c);
      if (id === this._activeId) {
        this._notifyCallbacks(updated);
        this._dispatch('grudge:character:updated', { character: updated });
      }
      return updated;
    } catch {
      return null;
    }
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private _notifyCallbacks(char: GrudgeCharacter | null): void {
    this._callbacks.forEach(cb => { try { cb(char); } catch { } });
  }

  private _dispatch(name: string, detail?: Record<string, unknown>): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }
  }

  private _startPoll(): void {
    if (this._pollTimer) return;
    if (typeof setInterval === 'undefined') return;
    this._pollTimer = setInterval(() => {
      if (this.getToken()) this.syncFromBackend();
    }, POLL_MS);
  }

  destroy(): void {
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
    this._callbacks = [];
  }
}

// ── Singleton export ───────────────────────────────────────────────────────────

export const GrudgeAccountSDK = new _GrudgeAccountSDK();

/**
 * ─── How to use in each app ────────────────────────────────────────────────────
 *
 * GRUDGE WARLORDS (main app, React):
 *   import { GrudgeAccountSDK } from '@/lib/GrudgeAccountSDK';
 *   await GrudgeAccountSDK.init();
 *   // Characters auto-populated via useCharacters() hook
 *
 * GRUDGE-CRAFTING (puter site, embedded iframe):
 *   import { GrudgeAccountSDK } from './GrudgeAccountSDK';
 *   GrudgeAccountSDK.initEmbedded();
 *   GrudgeAccountSDK.onCharacterChange((char) => craftingUI.load(char));
 *
 * THE-ENGINE (3D game, vanilla TS):
 *   import { GrudgeAccountSDK } from '@/lib/GrudgeAccountSDK';
 *   await GrudgeAccountSDK.init('https://api.grudge-studio.com');
 *   const char = GrudgeAccountSDK.getActiveCharacter();
 *   // Apply char.attributes to CharacterStats
 *
 * GDEVELOP ASSISTANT (tab app):
 *   // Include as <script> or npm package
 *   GrudgeAccountSDK.init();
 *   GrudgeAccountSDK.onCharacterChange(char => updateCharacterPreview(char));
 *
 * NEXUS-NEMESIS (game portal):
 *   GrudgeAccountSDK.init();
 *   const chars = GrudgeAccountSDK.getCharacters(); // for matchmaking
 */

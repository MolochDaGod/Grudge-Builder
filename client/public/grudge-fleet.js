/**
 * Grudge Fleet Bridge — vanilla JS auth + character sync for Puter/external apps.
 * Mirrors GrudgeAccountSDK + wireGrudgeFleet from grudge-builder.
 *
 * @version 2.1.1
 * Character-scoped session + multi-app SSO (crafting, vfx-studio, warlords).
 */
(function (global) {
  'use strict';

  const CFG = (typeof window !== 'undefined' && window.GRUDGE_CONFIG) || {};
  const FLEET = {
    auth: CFG.AUTH_GATEWAY || 'https://id.grudge-studio.com',
    identityApi: CFG.IDENTITY_API || 'https://grudge-studio.com',
    gameData: CFG.GAME_DATA || 'https://grudge-api-production-0d46.up.railway.app',
    objectStore: CFG.OBJECTSTORE_URL || 'https://objectstore.grudge-studio.com/api/v1',
    assets: CFG.ASSETS || 'https://assets.grudge-studio.com',
    wcs: CFG.WCS_URL || 'https://wcs.grudge-studio.com',
    crafting: CFG.CRAFTING_URL || 'https://grudge-crafting.puter.site',
    vfxStudio: CFG.VFX_STUDIO_URL || 'https://vfx-studio-sigma.vercel.app',
    gamesLibrary: (CFG.OBJECTSTORE_URL || 'https://objectstore.grudge-studio.com/api/v1') + '/games-library.json',
  };

  // Canonical keys + SDK aliases so we never multi-login across fleet apps
  const TOKEN_KEY = 'grudge_auth_token';
  const LEGACY_TOKEN_KEY = 'grudge_session_token';
  const STUDIO_TOKEN_KEY = 'grudge_studio_session';
  const SDK_TOKEN_KEY = 'grudge_auth_token'; // ObjectStore SDK
  const GRUDGE_ID_KEY = 'grudge_id';
  const SDK_USER_ID_KEY = 'grudge_user_id';
  const USERNAME_KEY = 'grudge_username';
  const ACCOUNT_ID_KEY = 'grudge_account_id';
  const SESSION_BLOB_KEY = 'grudge-session';
  const CHAR_ACTIVE_PREFIX = 'gruda_active_character';
  const CHAR_ACTIVE_ALT = 'grudge.activeCharId';
  const POLL_MS = 60_000;

  let _token = null;
  let _user = null;
  let _characters = [];
  let _activeId = null;
  let _callbacks = [];
  let _pollTimer = null;
  let _embedded = false;

  function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch {} }

  function ssGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch {} }

  function readToken() {
    if (_token) return _token;
    return (
      lsGet(TOKEN_KEY) ||
      lsGet(LEGACY_TOKEN_KEY) ||
      lsGet(STUDIO_TOKEN_KEY) ||
      lsGet(SDK_TOKEN_KEY) ||
      ssGet(TOKEN_KEY) ||
      (() => {
        try {
          const blob = JSON.parse(lsGet(SESSION_BLOB_KEY) || '{}');
          return blob.token || blob.sessionToken || null;
        } catch { return null; }
      })()
    );
  }

  function saveToken(t) {
    _token = t;
    if (t) {
      lsSet(TOKEN_KEY, t);
      lsSet(LEGACY_TOKEN_KEY, t);
      lsSet(STUDIO_TOKEN_KEY, t);
      ssSet(TOKEN_KEY, t);
      try {
        const blob = JSON.parse(lsGet(SESSION_BLOB_KEY) || '{}');
        blob.token = t;
        blob.updatedAt = Date.now();
        lsSet(SESSION_BLOB_KEY, JSON.stringify(blob));
      } catch {
        lsSet(SESSION_BLOB_KEY, JSON.stringify({ token: t, updatedAt: Date.now() }));
      }
    } else {
      [TOKEN_KEY, LEGACY_TOKEN_KEY, STUDIO_TOKEN_KEY].forEach(lsDel);
      try { sessionStorage.removeItem(TOKEN_KEY); } catch {}
    }
  }

  function readActiveId() {
    const gid = lsGet(ACCOUNT_ID_KEY) || lsGet(GRUDGE_ID_KEY) || lsGet(SDK_USER_ID_KEY) || 'guest';
    return (
      lsGet(`${CHAR_ACTIVE_PREFIX}_${gid}`) ||
      lsGet(CHAR_ACTIVE_ALT) ||
      lsGet('grudge_active_character') ||
      ssGet('grudge_active_character') ||
      _activeId
    );
  }

  function saveActiveId(id) {
    _activeId = id;
    const gid = lsGet(ACCOUNT_ID_KEY) || lsGet(GRUDGE_ID_KEY) || lsGet(SDK_USER_ID_KEY) || 'guest';
    if (id) {
      lsSet(`${CHAR_ACTIVE_PREFIX}_${gid}`, id);
      lsSet(CHAR_ACTIVE_ALT, id);
      lsSet('grudge_active_character', id);
      ssSet('grudge_active_character', id);
    }
  }

  function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    const t = readToken();
    if (t) {
      h.Authorization = 'Bearer ' + t;
      h['X-Session-Token'] = t;
    }
    return h;
  }

  function dispatch(name, detail) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }
  }

  function getActiveCharacterLocal() {
    const id = readActiveId();
    return id ? (_characters.find((c) => String(c.id) === String(id)) ?? null) : null;
  }

  function notifyCallbacks(char) {
    const c = char !== undefined ? char : getActiveCharacterLocal();
    _callbacks.forEach((cb) => { try { cb(c); } catch {} });
  }

  function normalizeCharacter(c) {
    if (!c) return c;
    return {
      ...c,
      race: c.race || c.raceId || '',
      class: c.class || c.classId || '',
      raceId: c.raceId || c.race || '',
      classId: c.classId || c.class || '',
      stats: c.stats || c.attributes || {},
      attributes: c.attributes || c.stats || {},
    };
  }

  function applyAuthResponse(data) {
    const token = data.sessionToken || data.token;
    if (token) saveToken(token);
    const u = data.user || data;
    const gid = u.grudgeId || data.grudgeId;
    const un = u.username || data.username;
    if (gid) {
      lsSet(GRUDGE_ID_KEY, gid);
      lsSet(ACCOUNT_ID_KEY, gid);
      lsSet(SDK_USER_ID_KEY, gid);
    }
    if (un) lsSet(USERNAME_KEY, un);
    _user = {
      grudgeId: gid || lsGet(GRUDGE_ID_KEY) || '',
      username: un || lsGet(USERNAME_KEY) || '',
      displayName: u.displayName || data.displayName,
      gbuxBalance: Number(u.gbuxBalance ?? data.gbuxBalance ?? 0),
      walletAddress: u.walletAddress || data.walletAddress,
      isPremium: u.isPremium,
    };
    return data;
  }

  function parseCharactersPayload(raw) {
    const list = Array.isArray(raw) ? raw : (raw && raw.characters) || [];
    return list.map(normalizeCharacter);
  }

  /** On *.puter.site, puter.net.fetch bypasses CORS for Grudge API calls. */
  async function fleetFetch(url, init) {
    if (typeof puter !== 'undefined' && puter.net && puter.net.fetch) {
      try {
        return await puter.net.fetch(url, init);
      } catch {
        /* fall through to browser fetch */
      }
    }
    return fetch(url, init);
  }

  /** grudge_token → Railway JWT for the real Warlords account (not a synthetic puter user). */
  async function bridgeGrudgeLaunchToken(launchToken) {
    const audience = typeof window !== 'undefined' ? window.location.origin : '';
    const body = JSON.stringify({ token: launchToken, audience });
    const endpoints = [
      FLEET.gameData + '/api/auth/grudge-bridge',
      FLEET.identityApi + '/api/auth/grudge-bridge',
      FLEET.gameData + '/api/auth/session/exchange',
      FLEET.identityApi + '/api/auth/session/exchange',
    ];
    for (const url of endpoints) {
      try {
        const bridge = await fleetFetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        if (!bridge.ok) continue;
        applyAuthResponse(await bridge.json());
        return true;
      } catch {
        /* try next endpoint */
      }
    }
    return false;
  }

  function pickupUrlTokens(skipLaunchToken) {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    // Also accept hash: #token=...&characterId=...
    let hashParams = null;
    if (window.location.hash && window.location.hash.length > 1) {
      hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    }

    function pget(k) {
      return params.get(k) || (hashParams && hashParams.get(k)) || null;
    }

    const launchToken = !skipLaunchToken && (pget('grudge_token') || pget('launch_token'));
    if (launchToken) return launchToken;

    const sso = pget('token') || pget('sso_token') || pget('jwt') || pget('access_token');
    if (sso) {
      saveToken(sso);
      const gid = pget('grudge_id') || pget('grudgeId') || pget('user_id') || '';
      const un = pget('grudge_username') || pget('username') || '';
      if (gid) {
        lsSet(GRUDGE_ID_KEY, gid);
        lsSet(ACCOUNT_ID_KEY, gid);
        lsSet(SDK_USER_ID_KEY, gid);
      }
      if (un) lsSet(USERNAME_KEY, un);
      [
        'token', 'sso_token', 'jwt', 'access_token', 'grudge_token', 'launch_token',
        'grudge_id', 'grudgeId', 'user_id', 'grudge_username', 'username',
      ].forEach((k) => params.delete(k));
      const clean = params.toString();
      window.history.replaceState(
        null,
        '',
        window.location.pathname + (clean ? '?' + clean : '') +
          // strip token from hash too
          (window.location.hash && !/token|jwt|grudge_token/i.test(window.location.hash)
            ? window.location.hash
            : '')
      );
    }

    const charId = pget('characterId') || pget('char_id') || pget('charId') || pget('activeCharacter');
    if (charId) saveActiveId(charId);
  }

  /** Restore Puter session or quietly provision a guest (no popup). */
  async function ensurePuterSession(opts) {
    opts = opts || {};
    if (typeof puter === 'undefined' || !puter.auth) return null;
    const asGuest = opts.asGuest !== false;
    if (!puter.auth.isSignedIn()) {
      const result = await puter.auth.signIn(
        asGuest ? { attempt_temp_user_creation: true } : undefined,
      );
      if (result && result.success === false) {
        throw new Error(result.error || 'Puter sign-in failed');
      }
    }
    return puter.auth.getUser();
  }

  async function bridgePuterUser(pu) {
    const res = await fleetFetch(FLEET.gameData + '/api/auth/puter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        puterUuid: pu.uuid,
        puterId: pu.uuid,
        puterUsername: pu.username,
        displayName: pu.username,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Puter auth bridge failed');
    }
    const data = await res.json();
    applyAuthResponse(data);
    if (!_user?.username) _user = { ...(_user || {}), username: pu.username };
    return data;
  }

  async function authPuter(forcePopup) {
    if (typeof puter === 'undefined' || !puter.auth) throw new Error('Puter SDK not loaded');
    if (forcePopup || !puter.auth.isSignedIn()) {
      await puter.auth.signIn();
    }
    const pu = await puter.auth.getUser();
    return bridgePuterUser(pu);
  }

  async function syncFromBackend() {
    const token = readToken();
    if (!token) return;

    try {
      const userRes = await fleetFetch(FLEET.gameData + '/api/account', { headers: authHeaders() });
      if (userRes.ok) {
        const userData = await userRes.json();
        _user = {
          grudgeId: userData.grudgeId || lsGet(GRUDGE_ID_KEY) || '',
          username: userData.username || lsGet(USERNAME_KEY) || '',
          displayName: userData.displayName,
          gbuxBalance: Number(userData.gbuxBalance ?? 0),
        };
        if (_user.grudgeId) {
          lsSet(GRUDGE_ID_KEY, _user.grudgeId);
          lsSet(ACCOUNT_ID_KEY, _user.grudgeId);
          lsSet(SDK_USER_ID_KEY, _user.grudgeId);
        }
      }

      // Characters — try era filter then bare list
      let charRes = await fleetFetch(FLEET.gameData + '/api/characters?era=warlords', { headers: authHeaders() });
      if (!charRes.ok) {
        charRes = await fleetFetch(FLEET.gameData + '/api/characters', { headers: authHeaders() });
      }
      if (!charRes.ok) {
        // api.grudge-studio.com fallback shape
        charRes = await fleetFetch('https://api.grudge-studio.com/characters', { headers: authHeaders() });
      }
      if (charRes && charRes.ok) {
        _characters = parseCharactersPayload(await charRes.json());

        const stored = readActiveId();
        if (stored && _characters.some((c) => String(c.id) === String(stored))) {
          _activeId = stored;
        } else if (_characters.length > 0) {
          saveActiveId(_characters[0].id);
        }

        notifyCallbacks(getActiveCharacterLocal());
        dispatch('grudge:character:updated', { character: getActiveCharacterLocal() });
        dispatch('grudge:characters:loaded', { characters: _characters, activeId: readActiveId() });
      }

      dispatch('grudge:sync:complete');
      dispatch('grudge:auth:ready');
    } catch (err) {
      console.warn('[GrudgeFleet] sync failed:', err);
    }
  }

  function startPoll() {
    if (_pollTimer || typeof setInterval === 'undefined') return;
    _pollTimer = setInterval(() => {
      if (readToken()) syncFromBackend();
    }, POLL_MS);
  }

  const fleet = {
    config: FLEET,

    async init(opts) {
      opts = opts || {};

      if (!opts.skipAuthPickup && typeof window !== 'undefined') {
        const launch = pickupUrlTokens(false);
        if (launch) {
          const params = new URLSearchParams(window.location.search);
          params.delete('grudge_token');
          const clean = params.toString();
          window.history.replaceState(null, '', window.location.pathname + (clean ? '?' + clean : '') + window.location.hash);
          await bridgeGrudgeLaunchToken(launch);
        } else {
          pickupUrlTokens(true);
        }
      }

      _token = readToken();
      _activeId = readActiveId();

      if (opts.mode === 'embedded') {
        fleet.initEmbedded();
      } else if (readToken()) {
        await syncFromBackend();
      }

      // Multi-tab / same-origin sync
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', (e) => {
          if (!e.key) return;
          if (e.key === TOKEN_KEY || e.key === LEGACY_TOKEN_KEY || e.key === STUDIO_TOKEN_KEY) {
            _token = e.newValue;
            if (e.newValue) syncFromBackend();
          }
          if (e.key === CHAR_ACTIVE_ALT || e.key === 'grudge_active_character' ||
              (e.key && e.key.startsWith(CHAR_ACTIVE_PREFIX))) {
            _activeId = e.newValue;
            notifyCallbacks(getActiveCharacterLocal());
            dispatch('grudge:character:selected', { characterId: e.newValue });
          }
        });
      }

      startPoll();
      return fleet;
    },

    initEmbedded() {
      _embedded = true;
      if (typeof window === 'undefined') return;

      window.addEventListener('message', (e) => {
        const t = e.data?.type;
        if (t !== 'GRUDGE_AUTH' && t !== 'grudge:auth' && t !== 'GRUDGE_SESSION') return;
        const { token, characterId, grudgeId, username, sessionToken } = e.data;
        if (token || sessionToken) saveToken(token || sessionToken);
        if (characterId) saveActiveId(characterId);
        if (grudgeId) {
          lsSet(GRUDGE_ID_KEY, grudgeId);
          lsSet(ACCOUNT_ID_KEY, grudgeId);
          lsSet(SDK_USER_ID_KEY, grudgeId);
        }
        if (username) lsSet(USERNAME_KEY, username);
        if (readToken()) syncFromBackend();
        dispatch('grudge:auth:ready');
      });

      window.parent?.postMessage({ type: 'GRUDGE_READY' }, '*');
      if (readToken()) syncFromBackend();
    },

    async login(identifier, password) {
      const res = await fleetFetch(FLEET.gameData + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Login failed');
      applyAuthResponse(data);
      await syncFromBackend();
      return data;
    },

    async register(username, password, opts) {
      opts = opts || {};
      const res = await fleetFetch(FLEET.gameData + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          email: opts.email,
          displayName: opts.displayName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      applyAuthResponse(data);
      await syncFromBackend();
      return data;
    },

    async guest() {
      const res = await fleetFetch(FLEET.gameData + '/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Guest login failed');
      applyAuthResponse(data);
      await syncFromBackend();
      return data;
    },

    async signIn() {
      const data = await authPuter(true);
      await syncFromBackend();
      dispatch('grudge:auth:ready');
      return data;
    },

    bridgeGrudgeLaunchToken,
    ensurePuterSession,

    /** Guest-first bootstrap: restore JWT, Puter session, or silent guest → Railway bridge. */
    async ensureSession(opts) {
      return fleet.tryAutoAuth(opts);
    },

    async tryAutoAuth() {
      if (readToken()) {
        await syncFromBackend();
        return true;
      }
      try {
        const pu = await ensurePuterSession({ asGuest: true });
        if (pu) {
          await bridgePuterUser(pu);
          await syncFromBackend();
          dispatch('grudge:auth:ready');
          return true;
        }
      } catch (err) {
        console.warn('[GrudgeFleet] tryAutoAuth:', err);
      }
      return false;
    },

    getToken: readToken,
    getUser: () => _user,
    isLoggedIn: () => !!readToken(),
    getCharacters: () => _characters,
    getActiveId: readActiveId,
    getActiveCharacter: getActiveCharacterLocal,

    /** Select first character matching race id/name (for VFX Character Lab sync) */
    selectCharacterByRace(race) {
      if (!race || !_characters.length) return null;
      const r = String(race).toLowerCase();
      const match = _characters.find((c) => {
        const cr = String(c.race || c.raceId || '').toLowerCase();
        return cr === r || cr.includes(r) || r.includes(cr);
      });
      if (match) {
        fleet.selectCharacter(match.id);
        return match;
      }
      return null;
    },

    selectCharacter(id) {
      saveActiveId(id);
      const char = _characters.find((c) => String(c.id) === String(id)) ?? null;
      notifyCallbacks(char);
      dispatch('grudge:character:selected', { characterId: id, character: char });
      if (_embedded) {
        window.parent?.postMessage({ type: 'GRUDGE_CHARACTER_CHANGE', characterId: id, character: char }, '*');
      }
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('grudge-fleet');
          bc.postMessage({ type: 'character', characterId: id });
          bc.close();
        }
      } catch { /* ignore */ }
    },

    onCharacterChange(cb) {
      _callbacks.push(cb);
      try { cb(getActiveCharacterLocal()); } catch { /* ignore */ }
      return () => { _callbacks = _callbacks.filter((f) => f !== cb); };
    },

    syncFromBackend,

    /**
     * Build SSO deep-link for another fleet app (crafting, vfx, warlords).
     * Passes token + active character so the target doesn't re-login.
     */
    buildSSOUrl(baseUrl, opts) {
      opts = opts || {};
      const u = new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : 'https://grudge-studio.com');
      const token = readToken();
      const charId = opts.characterId || readActiveId();
      const gid = lsGet(GRUDGE_ID_KEY) || lsGet(SDK_USER_ID_KEY) || '';
      const un = lsGet(USERNAME_KEY) || '';
      if (token) {
        u.searchParams.set('token', token);
        u.searchParams.set('grudge_token', token);
      }
      if (charId) u.searchParams.set('characterId', charId);
      if (gid) u.searchParams.set('grudge_id', gid);
      if (un) u.searchParams.set('username', un);
      if (opts.path) u.pathname = opts.path;
      if (opts.params) {
        Object.entries(opts.params).forEach(([k, v]) => {
          if (v != null) u.searchParams.set(k, String(v));
        });
      }
      return u.toString();
    },

    openCrafting(opts) {
      const url = fleet.buildSSOUrl(FLEET.crafting, opts);
      window.open(url, opts?.target || '_blank', 'noopener');
      return url;
    },

    openVfxStudio(opts) {
      const url = fleet.buildSSOUrl(FLEET.vfxStudio, opts);
      window.open(url, opts?.target || '_blank', 'noopener');
      return url;
    },

    /** Fetch inventory scoped to active (or given) character.
     * Prefers dedicated inventory routes; falls back to GET /api/characters/:id.inventory
     * (Railway SSOT stores bag on the character row). */
    async getInventory(charId) {
      const id = charId || readActiveId();
      if (!id || !readToken()) return [];
      const asRows = (inv) => {
        if (!inv) return [];
        if (Array.isArray(inv)) return inv;
        if (typeof inv === 'object') {
          return Object.entries(inv).map(([name, qty]) => ({ name, qty: Number(qty) || 0 }));
        }
        return [];
      };
      try {
        let res = await fleetFetch(
          FLEET.gameData + '/api/inventory?char_id=' + encodeURIComponent(id),
          { headers: authHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          const rows = Array.isArray(data) ? data : (data.items || data.inventory || []);
          if (rows && (Array.isArray(rows) ? rows.length : Object.keys(rows).length)) {
            return asRows(rows);
          }
        }
        // Character detail — inventory lives on the character document
        res = await fleetFetch(
          FLEET.gameData + '/api/characters/' + encodeURIComponent(id),
          { headers: authHeaders() }
        );
        if (res.ok) {
          const char = normalizeCharacter(await res.json());
          // Keep local cache fresh
          const idx = _characters.findIndex((c) => String(c.id) === String(id));
          if (idx >= 0) _characters[idx] = char;
          else _characters.push(char);
          return asRows(char.inventory);
        }
        // Last resort: in-memory character list
        const cached = _characters.find((c) => String(c.id) === String(id));
        return asRows(cached?.inventory);
      } catch {
        const cached = _characters.find((c) => String(c.id) === String(id));
        return asRows(cached?.inventory);
      }
    },

    /** Merge crafting bag map into character.inventory and PATCH */
    async saveInventory(charId, inventoryMap) {
      const id = charId || readActiveId();
      if (!id || !readToken()) return null;
      // Normalize { name: qty } map → array form used by characters API when needed
      let inventory = inventoryMap;
      if (inventory && !Array.isArray(inventory) && typeof inventory === 'object') {
        inventory = Object.entries(inventory).map(([name, qty]) => ({
          name,
          itemId: name,
          quantity: Number(qty) || 0,
          qty: Number(qty) || 0,
        }));
      }
      return fleet.saveCharacter(id, { inventory });
    },

    /** GET home island (Railway SSOT — seed, mountainTriad, rtsHeightmap). */
    async getHomeIsland() {
      const token = readToken();
      if (!token) return null;
      try {
        const res = await fleetFetch(FLEET.gameData + '/api/island', { headers: authHeaders() });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    /** PATCH home island state JSONB (nodes, terrainZones, mountainTriad, etc.). */
    async saveHomeIslandState(state) {
      const token = readToken();
      if (!token) return null;
      try {
        const body = JSON.stringify({
          state: { ...state, lastUpdate: Date.now() },
        });
        const res = await fleetFetch(FLEET.gameData + '/api/island/state', {
          method: 'PATCH',
          headers: authHeaders(),
          body,
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    /** Load canonical games-library.json from ObjectStore. */
    async getGamesLibrary() {
      const res = await fleetFetch(FLEET.gamesLibrary);
      if (!res.ok) throw new Error('games-library unavailable');
      return res.json();
    },

    /** PATCH character on Railway (professionLevels, equipment, inventory, etc.) */
    async saveCharacter(id, updates) {
      const token = readToken();
      if (!token) return null;
      try {
        const res = await fleetFetch(FLEET.gameData + '/api/characters/' + encodeURIComponent(id), {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(updates),
        });
        if (!res.ok) return null;
        const updated = normalizeCharacter(await res.json());
        _characters = _characters.map((c) => (c.id === id ? updated : c));
        if (id === readActiveId()) {
          notifyCallbacks(updated);
          dispatch('grudge:character:updated', { character: updated });
        }
        return updated;
      } catch {
        return null;
      }
    },

    /** Build professionLevels payload from crafting STATE.professions */
    professionsToPayload(professions) {
      const map = { Miner: 'miner', Forester: 'forester', Chef: 'chef', Engineer: 'engineer', Mystic: 'mystic' };
      const out = {};
      for (const [label, key] of Object.entries(map)) {
        const p = professions[label];
        if (p) out[key] = { level: p.level, xp: p.xp };
      }
      return out;
    },

    /** Merge remote professionLevels into local STATE.professions (never regress) */
    mergeProfessionsFromCharacter(char, professions) {
      if (!char?.professionLevels) return professions;
      const keyMap = { miner: 'Miner', forester: 'Forester', chef: 'Chef', engineer: 'Engineer', mystic: 'Mystic' };
      for (const [key, label] of Object.entries(keyMap)) {
        const remote = char.professionLevels[key];
        if (!remote || !professions[label]) continue;
        if (remote.level > professions[label].level) {
          professions[label].level = remote.level;
          professions[label].xp = remote.xp || 0;
        }
      }
      return professions;
    },

    logout() {
      saveToken(null);
      _user = null;
      _characters = [];
      _activeId = null;
    },
  };

  global.GrudgeFleet = fleet;
})(typeof window !== 'undefined' ? window : globalThis);
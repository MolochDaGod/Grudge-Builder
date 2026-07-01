/**
 * Grudge Fleet Bridge — vanilla JS auth + character sync for Puter/external apps.
 * Mirrors GrudgeAccountSDK + wireGrudgeFleet from grudge-builder.
 *
 * @version 2.0.0
 */
(function (global) {
  'use strict';

  const CFG = (typeof window !== 'undefined' && window.GRUDGE_CONFIG) || {};
  const FLEET = {
    auth: CFG.AUTH_GATEWAY || 'https://id.grudge-studio.com',
    identityApi: CFG.IDENTITY_API || 'https://api.grudge-studio.com',
    gameData: CFG.GAME_DATA || 'https://grudge-api-production-0d46.up.railway.app',
    objectStore: CFG.OBJECTSTORE_URL || 'https://objectstore.grudge-studio.com/api/v1',
    assets: CFG.ASSETS || 'https://assets.grudge-studio.com',
    wcs: CFG.WCS_URL || 'https://wcs.grudge-studio.com',
    gamesLibrary: (CFG.OBJECTSTORE_URL || 'https://objectstore.grudge-studio.com/api/v1') + '/games-library.json',
  };

  const TOKEN_KEY = 'grudge_auth_token';
  const LEGACY_TOKEN_KEY = 'grudge_session_token';
  const GRUDGE_ID_KEY = 'grudge_id';
  const USERNAME_KEY = 'grudge_username';
  const ACCOUNT_ID_KEY = 'grudge_account_id';
  const CHAR_ACTIVE_PREFIX = 'gruda_active_character';
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

  function readToken() {
    return _token || lsGet(TOKEN_KEY) || lsGet(LEGACY_TOKEN_KEY);
  }

  function saveToken(t) {
    _token = t;
    if (t) {
      lsSet(TOKEN_KEY, t);
      lsSet(LEGACY_TOKEN_KEY, t);
    } else {
      lsDel(TOKEN_KEY);
      lsDel(LEGACY_TOKEN_KEY);
    }
  }

  function readActiveId() {
    const gid = lsGet(ACCOUNT_ID_KEY) || lsGet(GRUDGE_ID_KEY) || 'guest';
    return lsGet(`${CHAR_ACTIVE_PREFIX}_${gid}`) || lsGet('grudge.activeCharId') || _activeId;
  }

  function saveActiveId(id) {
    _activeId = id;
    const gid = lsGet(ACCOUNT_ID_KEY) || lsGet(GRUDGE_ID_KEY) || 'guest';
    if (id) {
      lsSet(`${CHAR_ACTIVE_PREFIX}_${gid}`, id);
      lsSet('grudge.activeCharId', id);
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

  function notifyCallbacks(char) {
    _callbacks.forEach((cb) => { try { cb(char); } catch {} });
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

    const launchToken = !skipLaunchToken && params.get('grudge_token');
    if (launchToken) return launchToken;

    const sso = params.get('token') || params.get('sso_token');
    if (sso) {
      saveToken(sso);
      const gid = params.get('grudge_id') || params.get('grudgeId') || '';
      const un = params.get('grudge_username') || params.get('username') || '';
      if (gid) { lsSet(GRUDGE_ID_KEY, gid); lsSet(ACCOUNT_ID_KEY, gid); }
      if (un) lsSet(USERNAME_KEY, un);
      ['token', 'sso_token', 'grudge_id', 'grudgeId', 'grudge_username', 'username'].forEach((k) => params.delete(k));
      const clean = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (clean ? '?' + clean : '') + window.location.hash);
    }

    const charId = params.get('characterId');
    if (charId) saveActiveId(charId);
  }

  async function authPuter() {
    if (typeof puter === 'undefined' || !puter.auth) throw new Error('Puter SDK not loaded');
    await puter.auth.signIn();
    const pu = await puter.auth.getUser();
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
        if (_user.grudgeId) lsSet(GRUDGE_ID_KEY, _user.grudgeId);
        if (_user.grudgeId) lsSet(ACCOUNT_ID_KEY, _user.grudgeId);
      }

      const charRes = await fleetFetch(FLEET.gameData + '/api/characters?era=warlords', { headers: authHeaders() });
      if (charRes.ok) {
        _characters = parseCharactersPayload(await charRes.json());

        const stored = readActiveId();
        if (stored && _characters.some((c) => c.id === stored)) {
          _activeId = stored;
        } else if (_characters.length > 0) {
          saveActiveId(_characters[0].id);
        }

        notifyCallbacks(getActiveCharacter());
        dispatch('grudge:character:updated', { character: getActiveCharacter() });
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

      startPoll();
      return fleet;
    },

    initEmbedded() {
      _embedded = true;
      if (typeof window === 'undefined') return;

      window.addEventListener('message', (e) => {
        if (e.data?.type !== 'GRUDGE_AUTH') return;
        const { token, characterId, grudgeId, username } = e.data;
        if (token) saveToken(token);
        if (characterId) saveActiveId(characterId);
        if (grudgeId) { lsSet(GRUDGE_ID_KEY, grudgeId); lsSet(ACCOUNT_ID_KEY, grudgeId); }
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
      const data = await authPuter();
      await syncFromBackend();
      return data;
    },

    bridgeGrudgeLaunchToken,

    async tryAutoAuth() {
      if (readToken()) {
        await syncFromBackend();
        return true;
      }
      try {
        if (typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn()) {
          await authPuter();
          await syncFromBackend();
          return true;
        }
      } catch {}
      return false;
    },

    getToken: readToken,
    getUser: () => _user,
    isLoggedIn: () => !!readToken(),
    getCharacters: () => _characters,
    getActiveId: readActiveId,
    getActiveCharacter() {
      const id = readActiveId();
      return id ? (_characters.find((c) => c.id === id) ?? null) : null;
    },

    selectCharacter(id) {
      saveActiveId(id);
      const char = _characters.find((c) => c.id === id) ?? null;
      notifyCallbacks(char);
      dispatch('grudge:character:selected', { characterId: id });
      if (_embedded) window.parent?.postMessage({ type: 'GRUDGE_CHARACTER_CHANGE', characterId: id }, '*');
    },

    onCharacterChange(cb) {
      _callbacks.push(cb);
      return () => { _callbacks = _callbacks.filter((f) => f !== cb); };
    },

    syncFromBackend,

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
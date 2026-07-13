/**
 * Grudge Fleet Bridge — vanilla JS auth + character sync for Puter/external apps.
 * Mirrors GrudgeAccountSDK + wireGrudgeFleet from grudge-builder.
 *
 * @version 2.8.1
 * Character progress SSOT + account inventory/resources on Railway only (same DB as Warlords).
 * ONE TRUTH: grudge_id account · Warlords character UUID · Railway Postgres only.
 * Hard-fail when JWT grudge_id ≠ stored account; roster is era=warlords only.
 * Active character must be a UUID owned by the signed-in account.
 * Sign-in defaults to Grudge ID (id.grudge-studio.com) — never puter:* as primary.
 * SSO: prefer sso_token (full JWT) over grudge_token bridge.
 * @see docs/CHARACTER_PROGRESS_SSOT.md · docs/CANONICAL_IDENTITY.md
 */
(function (global) {
  'use strict';

  const CFG = (typeof window !== 'undefined' && window.GRUDGE_CONFIG) || {};
  /** Prefer same-origin /api on fleet frontends (avoids CORS); absolute Railway as fallback. */
  function resolveGameDataBase() {
    if (CFG.GAME_DATA) return String(CFG.GAME_DATA).replace(/\/$/, '');
    try {
      var h = typeof location !== 'undefined' ? location.hostname || '' : '';
      // Puter hosts have NO Vercel /api rewrites — always use Railway absolute URL
      if (/\.puter\.site$/i.test(h) || /\.puter\.work$/i.test(h)) {
        return 'https://grudge-api-production-0d46.up.railway.app';
      }
      // First-party fleet frontends: same-origin /api/* → Railway
      if (/(^|\.)grudge-studio\.com$|(^|\.)grudgewarlords\.com$|\.vercel\.app$/i.test(h)) {
        return '';
      }
    } catch (_) {}
    return 'https://grudge-api-production-0d46.up.railway.app';
  }

  const FLEET = {
    auth: CFG.AUTH_GATEWAY || 'https://id.grudge-studio.com',
    identityApi: CFG.IDENTITY_API || 'https://grudge-studio.com',
    gameData: resolveGameDataBase(),
    objectStore: CFG.OBJECTSTORE_URL || 'https://objectstore.grudge-studio.com/api/v1',
    assets: CFG.ASSETS || 'https://assets.grudge-studio.com',
    wcs: CFG.WCS_URL || 'https://wcs.grudge-studio.com',
    crafting: CFG.CRAFTING_URL || 'https://grudge-crafting.puter.site',
    vfxStudio: CFG.VFX_STUDIO_URL || 'https://vfx-studio-sigma.vercel.app',
    /** Full Treaty app (Warlords / client shell) */
    treaty: CFG.TREATY_URL || 'https://grudgewarlords.com/treaty',
    /** Embeddable Treaty UI for any studio page / game */
    treatyEmbed: CFG.TREATY_EMBED_URL || 'https://grudgewarlords.com/treaty-embed.html',
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
  /** characterId → last known progressRevision for If-Match / expectedRevision */
  const _progressRevisions = Object.create(null);
  const PROGRESS_SCHEMA_VERSION = 1;

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

  /** Decode JWT payload (no verify — Railway verifies). Returns null if not a JWT. */
  function decodeJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64 + '==='.slice((b64.length + 3) % 4);
      const json = typeof atob === 'function'
        ? atob(pad)
        : (typeof Buffer !== 'undefined' ? Buffer.from(pad, 'base64').toString('utf8') : null);
      if (!json) return null;
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  /** Extract canonical grudge_id from JWT claims (various issuer shapes). */
  function grudgeIdFromToken(token) {
    const p = decodeJwtPayload(token);
    if (!p || typeof p !== 'object') return '';
    const raw =
      p.grudgeId || p.grudge_id || p.sub || p.userId || p.user_id || p.accountId || p.account_id || '';
    const s = String(raw || '').trim();
    // Reject non-account subjects (pure guest markers)
    if (!s || /^puter:/i.test(s) || /^guest_/i.test(s)) return s.startsWith('puter:') || s.startsWith('guest_') ? s : s;
    return s;
  }

  function storedGrudgeId() {
    return String(
      lsGet(ACCOUNT_ID_KEY) || lsGet(GRUDGE_ID_KEY) || lsGet(SDK_USER_ID_KEY) || (_user && _user.grudgeId) || '',
    ).trim();
  }

  /**
   * Hard-fail split-brain: JWT account must match stored grudge_id when both present.
   * Returns true if session is consistent (or only one side known).
   * On mismatch: wipe session and return false.
   */
  function enforceAccountConsistency(jwtGid, apiGid, reason) {
    const a = String(jwtGid || '').trim();
    const b = String(apiGid || '').trim();
    const stored = storedGrudgeId();
    const candidates = [a, b, stored].filter(Boolean);
    if (candidates.length < 2) return true;

    const norm = (x) => x.toLowerCase();
    const primary = norm(a || b || stored);
    for (const c of candidates) {
      if (norm(c) !== primary) {
        console.error(
          '[GrudgeFleet] ACCOUNT MISMATCH — clearing session.',
          { jwt: a || null, api: b || null, stored: stored || null, reason: reason || 'mismatch' },
        );
        clearSessionLocal('account_mismatch');
        dispatch('grudge:auth:mismatch', {
          jwtGrudgeId: a || null,
          apiGrudgeId: b || null,
          storedGrudgeId: stored || null,
          reason: reason || 'mismatch',
        });
        return false;
      }
    }
    return true;
  }

  /** Wipe JWT + identity + active character (local only). */
  function clearSessionLocal(reason) {
    saveToken(null);
    _user = null;
    _characters = [];
    _activeId = null;
    const gid = lsGet(ACCOUNT_ID_KEY) || lsGet(GRUDGE_ID_KEY) || 'guest';
    [
      GRUDGE_ID_KEY, ACCOUNT_ID_KEY, SDK_USER_ID_KEY, USERNAME_KEY, SESSION_BLOB_KEY,
      CHAR_ACTIVE_ALT, 'grudge_active_character', `${CHAR_ACTIVE_PREFIX}_${gid}`,
      `${CHAR_ACTIVE_PREFIX}_guest`,
    ].forEach(lsDel);
    try { sessionStorage.removeItem('grudge_active_character'); } catch {}
    if (reason) {
      try { console.warn('[GrudgeFleet] session cleared:', reason); } catch {}
    }
  }

  function isOwnedCharacterId(id) {
    if (!id) return false;
    return _characters.some((c) => String(c.id) === String(id));
  }

  /** Warlords-era only — never mix nexus/armada into crafting/warlords shells. */
  const WARLORDS_ERA = 'warlords';

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
    const grudgeCode =
      c.grudgeCode ||
      c.grudgeDisplayId ||
      (c.model3d && (c.model3d.grudgeCode || c.model3d.grudgeDisplayId)) ||
      (typeof c.name === 'string' && /^GRDG-/i.test(c.name) ? c.name : '') ||
      '';
    // Prefer real display name; fall back to code only for legacy rows
    const name =
      c.name && !(typeof c.name === 'string' && /^GRDG-/i.test(c.name) && grudgeCode && c.name === grudgeCode)
        ? c.name
        : (c.displayName || c.name || grudgeCode || 'Warlord');
    return {
      ...c,
      name,
      grudgeCode: grudgeCode || null,
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
    if (token) {
      const jwtGid = grudgeIdFromToken(token);
      const bodyGid = String((data.user && (data.user.grudgeId || data.user.grudge_id)) || data.grudgeId || data.grudge_id || '').trim();
      if (jwtGid && bodyGid && !enforceAccountConsistency(jwtGid, bodyGid, 'apply_auth')) {
        return data;
      }
      // New login: if stored account differs from JWT, wipe then save (switch account)
      if (jwtGid && storedGrudgeId() && storedGrudgeId().toLowerCase() !== jwtGid.toLowerCase()) {
        clearSessionLocal('apply_auth_switch');
      }
      saveToken(token);
    }
    const u = data.user || data;
    const gid = u.grudgeId || u.grudge_id || data.grudgeId || data.grudge_id || grudgeIdFromToken(token);
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
    // Prefer native fetch first for Grudge APIs (Bearer + CORS). puter.net.fetch can
    // silently fail or strip headers on some Puter builds — Open uses native fetch.
    try {
      const r = await fetch(url, init);
      if (r) return r;
    } catch {
      /* try puter net */
    }
    if (typeof puter !== 'undefined' && puter.net && puter.net.fetch) {
      try {
        return await puter.net.fetch(url, init);
      } catch {
        /* fall through */
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

  /**
   * Read dual handoff params from query + hash.
   * Returns { sso, launch, grudgeId, username, characterId } without mutating URL.
   */
  function readUrlAuthTokens() {
    if (typeof window === 'undefined') {
      return { sso: null, launch: null, grudgeId: '', username: '', characterId: null };
    }
    const params = new URLSearchParams(window.location.search);
    let hashParams = null;
    if (window.location.hash && window.location.hash.length > 1) {
      hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    }
    function pget(k) {
      return params.get(k) || (hashParams && hashParams.get(k)) || null;
    }
    // Prefer full session JWT (sso_token/token) — no bridge needed on puter.site
    const sso = pget('sso_token') || pget('token') || pget('jwt') || pget('access_token');
    const launch = pget('grudge_token') || pget('launch_token');
    return {
      sso: sso || null,
      launch: launch || null,
      grudgeId: pget('grudge_id') || pget('grudgeId') || pget('user_id') || '',
      username: pget('grudge_username') || pget('username') || '',
      characterId: pget('characterId') || pget('char_id') || pget('charId') || pget('activeCharacter'),
    };
  }

  function scrubAuthFromUrl() {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    [
      'token', 'sso_token', 'jwt', 'access_token', 'grudge_token', 'launch_token',
      'grudge_id', 'grudgeId', 'user_id', 'grudge_username', 'username',
    ].forEach((k) => params.delete(k));
    const clean = params.toString();
    const hashSafe =
      window.location.hash && !/token|jwt|grudge_token|sso_token/i.test(window.location.hash)
        ? window.location.hash
        : '';
    window.history.replaceState(
      null,
      '',
      window.location.pathname + (clean ? '?' + clean : '') + hashSafe,
    );
  }

  /** @deprecated use readUrlAuthTokens + apply in init — kept for callers */
  function pickupUrlTokens(skipLaunchToken) {
    const t = readUrlAuthTokens();
    if (t.grudgeId) {
      lsSet(GRUDGE_ID_KEY, t.grudgeId);
      lsSet(ACCOUNT_ID_KEY, t.grudgeId);
      lsSet(SDK_USER_ID_KEY, t.grudgeId);
    }
    if (t.username) lsSet(USERNAME_KEY, t.username);
    if (t.characterId) saveActiveId(t.characterId);
    if (t.sso) {
      saveToken(t.sso);
      scrubAuthFromUrl();
      return null;
    }
    if (!skipLaunchToken && t.launch) return t.launch;
    return null;
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

  /** Fetch Warlords-era roster only from Railway (same Postgres as Warlords / GCS). */
  async function fetchCharacterRoster() {
    const headers = authHeaders();
    // SSOT: era=warlords only for craft/play shells. Bare list is fallback if era query 404s.
    // On Puter, also try open.grudge-studio.com (Vercel rewrite → Railway) — same path Open uses successfully.
    const openProxy =
      typeof location !== 'undefined' && /\.puter\.(site|work)$/i.test(location.hostname)
        ? 'https://open.grudge-studio.com/api/characters?era=' + encodeURIComponent(WARLORDS_ERA)
        : null;
    const urls = [
      FLEET.gameData + '/api/characters?era=' + encodeURIComponent(WARLORDS_ERA),
      FLEET.gameData + '/api/characters?gameEra=' + encodeURIComponent(WARLORDS_ERA),
      openProxy,
      FLEET.gameData + '/api/characters?era=' + encodeURIComponent(WARLORDS_ERA),
    ].filter(Boolean);
    let best = [];
    let warlordsOk = false;
    for (const url of urls) {
      try {
        const res = await fleetFetch(url, { headers });
        if (!res || !res.ok) {
          if (res && (res.status === 401 || res.status === 403)) {
            clearSessionLocal('characters_unauthorized');
            return [];
          }
          continue;
        }
        warlordsOk = true;
        const list = parseCharactersPayload(await res.json());
        // Filter defensively if API ignored era
        const warlords = list.filter((c) => {
          const era = String(c.gameEra || c.era || WARLORDS_ERA).toLowerCase();
          return !era || era === WARLORDS_ERA || era === 'default';
        });
        if (warlords.length > best.length) best = warlords;
        if (best.length > 0) break;
        if (list.length && !warlords.length) best = list; // era field missing — trust API filter
      } catch (e) {
        console.warn('[GrudgeFleet] characters fetch failed:', url, e);
      }
    }
    // Last resort only when era endpoints failed entirely (legacy API)
    if (!warlordsOk && best.length === 0) {
      try {
        const res = await fleetFetch(FLEET.gameData + '/api/characters', { headers });
        if (res && res.ok) {
          best = parseCharactersPayload(await res.json()).filter((c) => {
            const era = String(c.gameEra || c.era || WARLORDS_ERA).toLowerCase();
            return !era || era === WARLORDS_ERA || era === 'default';
          });
        }
      } catch (e) {
        console.warn('[GrudgeFleet] bare characters fetch failed:', e);
      }
    }
    return best;
  }

  async function syncFromBackend() {
    const token = readToken();
    if (!token) return;

    const jwtGid = grudgeIdFromToken(token);
    // Pre-check: stored account must not disagree with JWT before we trust either
    if (jwtGid && storedGrudgeId() && !enforceAccountConsistency(jwtGid, null, 'pre_sync')) {
      return;
    }

    try {
      const userRes = await fleetFetch(FLEET.gameData + '/api/account', { headers: authHeaders() });
      if (userRes.ok) {
        const userData = await userRes.json();
        const apiGid = String(userData.grudgeId || userData.grudge_id || userData.id || '').trim();
        if (!enforceAccountConsistency(jwtGid, apiGid, 'account_sync')) {
          return;
        }
        const gid = apiGid || jwtGid || storedGrudgeId();
        _user = {
          grudgeId: gid,
          username: userData.username || lsGet(USERNAME_KEY) || '',
          displayName: userData.displayName,
          gbuxBalance: Number(userData.gbuxBalance ?? 0),
          email: userData.email || null,
        };
        if (gid) {
          lsSet(GRUDGE_ID_KEY, gid);
          lsSet(ACCOUNT_ID_KEY, gid);
          lsSet(SDK_USER_ID_KEY, gid);
        }
        if (_user.username) lsSet(USERNAME_KEY, _user.username);
      } else if (userRes.status === 401 || userRes.status === 403) {
        console.warn('[GrudgeFleet] /api/account unauthorized — clearing session');
        clearSessionLocal('account_unauthorized');
        dispatch('grudge:auth:logout');
        return;
      }

      // Characters — Railway Warlords era only
      _characters = await fetchCharacterRoster();
      if (!readToken()) return; // cleared mid-fetch

      const stored = readActiveId();
      if (stored && isOwnedCharacterId(stored)) {
        _activeId = stored;
        saveActiveId(stored); // re-scope keys under current grudge_id
      } else {
        // Stale active id from another account — do not auto-pick silently for craft gate;
        // still pick first so single-hero accounts unlock, multi-hero UIs re-prompt if needed.
        if (stored && !isOwnedCharacterId(stored)) {
          console.warn('[GrudgeFleet] active character not on this account roster — clearing', stored);
          _activeId = null;
          lsDel('grudge_active_character');
          lsDel(CHAR_ACTIVE_ALT);
        }
        if (_characters.length === 1) {
          saveActiveId(_characters[0].id);
        } else if (_characters.length > 1 && !readActiveId()) {
          // Leave unset so UI forces selection
          _activeId = null;
        } else if (_characters.length > 0 && !readActiveId()) {
          saveActiveId(_characters[0].id);
        }
      }

      notifyCallbacks(getActiveCharacterLocal());
      dispatch('grudge:character:updated', { character: getActiveCharacterLocal() });
      dispatch('grudge:characters:loaded', {
        characters: _characters,
        activeId: readActiveId(),
        era: WARLORDS_ERA,
        grudgeId: storedGrudgeId(),
      });

      dispatch('grudge:sync:complete');
      dispatch('grudge:auth:ready');
    } catch (err) {
      console.warn('[GrudgeFleet] sync failed:', err);
    }
  }

  /**
   * Canonical Grudge ID login URL.
   * Auth page returns sso_token / grudge_token for Railway JWT bound to real account.
   */
  function buildLoginUrl(returnUrl) {
    const base = (returnUrl || (typeof window !== 'undefined'
      ? (window.location.origin + window.location.pathname)
      : FLEET.crafting)).split('#')[0];
    let clean = base;
    try {
      const u = new URL(base, typeof window !== 'undefined' ? window.location.origin : FLEET.crafting);
      ['token', 'sso_token', 'jwt', 'access_token', 'grudge_token', 'launch_token'].forEach((k) => u.searchParams.delete(k));
      clean = u.origin + u.pathname + (u.search || '');
    } catch { /* keep base */ }
    return FLEET.auth.replace(/\/$/, '') + '/login?redirect_uri=' + encodeURIComponent(clean);
  }

  /** Create-account entry on Grudge ID (same redirect_uri). */
  function buildRegisterUrl(returnUrl) {
    const login = buildLoginUrl(returnUrl);
    try {
      const u = new URL(login);
      u.searchParams.set('mode', 'register');
      return u.toString();
    } catch {
      return login + (login.includes('?') ? '&' : '?') + 'mode=register';
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
        const handoff = readUrlAuthTokens();
        if (handoff.grudgeId) {
          lsSet(GRUDGE_ID_KEY, handoff.grudgeId);
          lsSet(ACCOUNT_ID_KEY, handoff.grudgeId);
          lsSet(SDK_USER_ID_KEY, handoff.grudgeId);
        }
        if (handoff.username) lsSet(USERNAME_KEY, handoff.username);
        if (handoff.characterId) saveActiveId(handoff.characterId);

        // 1) Full session JWT first (no network) — puter.site reliable path
        if (handoff.sso) {
          saveToken(handoff.sso);
        }

        // 2) Launch token bridge only if we still need a session (or to refresh)
        if (handoff.launch && !readToken()) {
          const bridged = await bridgeGrudgeLaunchToken(handoff.launch);
          if (!bridged) {
            console.warn('[GrudgeFleet] grudge-bridge failed; no sso_token either');
          }
        } else if (handoff.launch && handoff.sso) {
          // Optional: upgrade via bridge in background; keep sso if bridge fails
          try {
            await bridgeGrudgeLaunchToken(handoff.launch);
          } catch {
            /* keep sso */
          }
        }

        if (handoff.sso || handoff.launch) scrubAuthFromUrl();
      }

      _token = readToken();
      _activeId = readActiveId();

      if (opts.mode === 'embedded') {
        fleet.initEmbedded();
      } else if (readToken()) {
        await syncFromBackend();
        if (readToken()) dispatch('grudge:auth:ready');
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

    /**
     * Primary sign-in for fleet apps (crafting, puter.site, etc.).
     *
     * Default: redirect to id.grudge-studio.com so the user lands on their
     * real Grudge/Warlords account and returns with ?grudge_token= for grudge-bridge.
     *
     * opts.mode:
     *   'grudge-id' (default) — browser redirect to Grudge ID
     *   'puter' — Puter popup + /api/auth/puter (may create empty puter:* account)
     * opts.returnUrl — override redirect_uri
     */
    async signIn(opts) {
      opts = opts || {};
      const mode = opts.mode || 'grudge-id';
      if (mode === 'puter') {
        const data = await authPuter(true);
        await syncFromBackend();
        dispatch('grudge:auth:ready');
        return data;
      }
      if (typeof window === 'undefined') {
        throw new Error('Grudge ID login requires a browser window');
      }
      const url = buildLoginUrl(opts.returnUrl);
      window.location.href = url;
      return { redirected: true, url };
    },

    /** Explicit Grudge ID redirect (same as signIn default). */
    loginWithGrudgeId(returnUrl) {
      if (typeof window === 'undefined') throw new Error('No window');
      const url = buildLoginUrl(returnUrl);
      window.location.href = url;
      return url;
    },

    buildLoginUrl,
    buildRegisterUrl,

    /** Puter-only auth (legacy / guest cloud). Prefer signIn() for account characters. */
    async signInWithPuter() {
      const data = await authPuter(true);
      await syncFromBackend();
      dispatch('grudge:auth:ready');
      return data;
    },

    bridgeGrudgeLaunchToken,
    ensurePuterSession,

    /**
     * Session restore only — does NOT mint silent puter guests.
     * Silent puter guest bridge creates empty rosters disconnected from Warlords.
     * Use signIn() for interactive login.
     */
    async ensureSession(opts) {
      return fleet.tryAutoAuth(opts);
    },

    async tryAutoAuth(opts) {
      opts = opts || {};
      if (readToken()) {
        await syncFromBackend();
        // If token was cleared as invalid, treat as logged out
        if (!readToken()) return false;
        return true;
      }
      // Opt-in only: silent Puter guest → Railway. Default off so crafting
      // does not look "signed in" with zero Warlords characters.
      if (opts.allowPuterGuest === true) {
        try {
          const pu = await ensurePuterSession({ asGuest: true });
          if (pu) {
            await bridgePuterUser(pu);
            await syncFromBackend();
            dispatch('grudge:auth:ready');
            return true;
          }
        } catch (err) {
          console.warn('[GrudgeFleet] tryAutoAuth puter guest:', err);
        }
      }
      return false;
    },

    /** Clear JWT + local fleet identity (keeps Puter session if any). */
    signOut() {
      clearSessionLocal('sign_out');
      dispatch('grudge:auth:logout');
    },

    /**
     * Sign out then redirect to Grudge ID login (switch account).
     * Always clears local state first so the next account cannot inherit UUID/bag cache.
     */
    async switchAccount(returnUrl) {
      clearSessionLocal('switch_account');
      dispatch('grudge:auth:logout');
      if (typeof window === 'undefined') return { redirected: false };
      const url = buildLoginUrl(returnUrl);
      window.location.href = url;
      return { redirected: true, url };
    },

    /** Redirect to Grudge ID create-account (mode=register). */
    createAccount(returnUrl) {
      if (typeof window === 'undefined') throw new Error('No window');
      clearSessionLocal('create_account');
      const url = buildRegisterUrl(returnUrl);
      window.location.href = url;
      return url;
    },

    getToken: readToken,
    getUser: () => _user,
    getGrudgeId: () => storedGrudgeId() || (_user && _user.grudgeId) || '',
    isLoggedIn: () => !!readToken(),
    /** True when we have a JWT but roster is still empty (wrong account / no chars yet). */
    hasEmptyRoster: () => !!readToken() && _characters.length === 0,
    /** True when JWT present, roster loaded, and active UUID is owned. */
    isReady: () => !!readToken() && !!readActiveId() && isOwnedCharacterId(readActiveId()),
    getCharacters: () => _characters.slice(),
    getActiveId: () => {
      const id = readActiveId();
      return id && isOwnedCharacterId(id) ? id : null;
    },
    getActiveCharacter: getActiveCharacterLocal,
    warlordsEra: WARLORDS_ERA,
    version: '2.8.1',

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
      if (!id) return null;
      if (!isOwnedCharacterId(id)) {
        console.error('[GrudgeFleet] selectCharacter rejected — UUID not on account roster', id);
        dispatch('grudge:character:rejected', { characterId: id, reason: 'not_owned' });
        return null;
      }
      saveActiveId(id);
      const char = _characters.find((c) => String(c.id) === String(id)) ?? null;
      notifyCallbacks(char);
      dispatch('grudge:character:selected', { characterId: id, character: char, era: WARLORDS_ERA });
      if (_embedded) {
        window.parent?.postMessage({ type: 'GRUDGE_CHARACTER_CHANGE', characterId: id, character: char }, '*');
      }
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('grudge-fleet');
          bc.postMessage({ type: 'character', characterId: id, era: WARLORDS_ERA });
          bc.close();
        }
      } catch { /* ignore */ }
      return char;
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
    /**
     * Build cross-app deep link.
     * Safer default: put secrets in the URL hash (not sent to servers as Referer path query).
     * Still stripped by pickupUrlTokens on load. Prefer cookie SSO long-term.
     * opts.tokenMode: 'hash' | 'query' | 'none' (default 'hash')
     */
    buildSSOUrl(baseUrl, opts) {
      opts = opts || {};
      const u = new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : 'https://grudge-studio.com');
      const token = readToken();
      const charId = opts.characterId || readActiveId();
      const gid = lsGet(GRUDGE_ID_KEY) || lsGet(SDK_USER_ID_KEY) || '';
      const un = lsGet(USERNAME_KEY) || '';
      const tokenMode = opts.tokenMode || 'hash';
      // Non-secret identity always in query for analytics/deep links
      if (charId) u.searchParams.set('characterId', charId);
      if (gid) u.searchParams.set('grudge_id', gid);
      if (un) u.searchParams.set('username', un);
      if (opts.path) u.pathname = opts.path;
      if (opts.params) {
        Object.entries(opts.params).forEach(([k, v]) => {
          if (v != null) u.searchParams.set(k, String(v));
        });
      }
      if (token && tokenMode !== 'none') {
        if (tokenMode === 'query') {
          u.searchParams.set('token', token);
          u.searchParams.set('grudge_token', token);
        } else {
          // hash fragment — not sent in Referer to third parties
          const hp = new URLSearchParams();
          hp.set('token', token);
          hp.set('grudge_token', token);
          if (charId) hp.set('characterId', charId);
          u.hash = hp.toString();
        }
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

    /**
     * Account-shared bag from Railway (same DB as Warlords account characters).
     * Combines GET /api/account/resources + /api/account/inventory.
     * Does NOT use Puter KV or api.grudge-studio.com.
     */
    async getAccountInventory(charId) {
      if (!readToken()) return [];
      const asRows = (inv) => {
        if (!inv) return [];
        if (Array.isArray(inv)) return inv;
        if (typeof inv === 'object') {
          if (Array.isArray(inv.items)) return inv.items;
          if (inv.resources && typeof inv.resources === 'object') {
            return Object.entries(inv.resources).map(([name, qty]) => ({
              name, itemId: name, quantity: Number(qty) || 0, qty: Number(qty) || 0,
            }));
          }
          // skip non-item metadata keys
          return Object.entries(inv)
            .filter(([k]) => !['accountId', 'id', 'updatedAt', 'createdAt'].includes(k))
            .map(([name, qty]) => ({
              name, itemId: name, quantity: Number(qty) || 0, qty: Number(qty) || 0,
            }));
        }
        return [];
      };
      const rows = [];
      const seen = new Set();
      const pushRows = (list) => {
        for (const row of list) {
          const name = row.name || row.itemName || row.item_id || row.itemId || row.id;
          if (!name || seen.has(String(name))) continue;
          seen.add(String(name));
          rows.push(row);
        }
      };
      try {
        // Materials / resource bag (primary for crafting mats)
        const resRes = await fleetFetch(FLEET.gameData + '/api/account/resources', { headers: authHeaders() });
        if (resRes.ok) {
          const data = await resRes.json();
          pushRows(asRows(data.resources || data));
        }
        // Structured account inventory rows
        let res = await fleetFetch(FLEET.gameData + '/api/account/inventory', { headers: authHeaders() });
        if (res.ok) pushRows(asRows(await res.json()));
        // Character-scoped inventory route still returns account items
        const id = charId || readActiveId();
        if (id && rows.length === 0) {
          res = await fleetFetch(
            FLEET.gameData + '/api/inventory/' + encodeURIComponent(id),
            { headers: authHeaders() }
          );
          if (res.ok) {
            const data = await res.json();
            pushRows(asRows(data.items || data));
            if (data.resources && typeof data.resources === 'object') {
              pushRows(asRows(data.resources));
            }
          }
        }
      } catch (e) {
        console.warn('[GrudgeFleet] getAccountInventory Railway error', e);
      }
      return rows;
    },

    /** Alias — inventory is account-scoped, not per-character */
    async getInventory(charId) {
      return fleet.getAccountInventory(charId);
    },

    /**
     * Persist account inventory bag to Railway Postgres (same account as characters).
     * Uses POST /api/account/resources { resources } (full set).
     * Does NOT write character.inventory; Puter KV is app-level cache only.
     */
    async saveAccountInventory(inventoryMap) {
      if (!readToken()) return null;
      try {
        const resources = {};
        if (inventoryMap && !Array.isArray(inventoryMap) && typeof inventoryMap === 'object') {
          for (const [k, v] of Object.entries(inventoryMap)) {
            if (k === 'accountId' || k === 'id') continue;
            const n = Number(v);
            if (n > 0) resources[k] = Math.floor(n);
          }
        }
        // Full replace of resource map (crafting mat bag)
        const res = await fleetFetch(FLEET.gameData + '/api/account/resources', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ resources }),
        });
        if (res.ok) return await res.json();
        console.warn('[GrudgeFleet] saveAccountInventory HTTP', res.status);
        // Fallback: batch add (only positive deltas if set endpoint fails)
        const items = Object.entries(resources).map(([resourceId, amount]) => ({ resourceId, amount }));
        if (items.length) {
          const batch = await fleetFetch(FLEET.gameData + '/api/account/resources/batch', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ items }),
          });
          if (batch.ok) return await batch.json();
        }
      } catch (e) {
        console.warn('[GrudgeFleet] saveAccountInventory', e);
      }
      return null;
    },

    /** @deprecated use saveAccountInventory — kept for callers */
    async saveInventory(_charId, inventoryMap) {
      return fleet.saveAccountInventory(inventoryMap);
    },

    getProgressRevision(id) {
      const charId = id || readActiveId();
      if (!charId) return 0;
      if (_progressRevisions[charId] != null) return _progressRevisions[charId];
      const c = _characters.find((x) => String(x.id) === String(charId));
      return Number(c?.progressRevision) || 0;
    },

    /**
     * Save per-character progress keyed by character UUID.
     * Never writes account inventory.
     * Uses POST /api/characters/:id/progress with expectedRevision + schemaVersion.
     * On 409, refreshes character and dispatches grudge:progress:conflict.
     */
    async saveCharacterProgress(id, progress = {}) {
      if (!id || !readToken()) return null;
      const body = {
        schemaVersion: progress.schemaVersion != null ? progress.schemaVersion : PROGRESS_SCHEMA_VERSION,
        expectedRevision: progress.expectedRevision != null
          ? progress.expectedRevision
          : fleet.getProgressRevision(id),
      };
      if (progress.idempotencyKey) body.idempotencyKey = progress.idempotencyKey;

      const allowed = [
        'professionLevels', 'equipment', 'attributes', 'selectedSkills',
        'skillLoadouts', 'skillPoints', 'weaponSkillLevel', 'weaponSkillSelections',
        'unspentAttributePoints', 'equippedWeaponId', 'stats', 'level', 'xp',
        'weaponMastery',
      ];
      for (const k of allowed) {
        if (progress[k] !== undefined) body[k] = progress[k];
      }
      if (progress.classSkillPicks !== undefined) {
        body.selectedSkills = progress.classSkillPicks;
      }
      if (progress.professionSkillNodes !== undefined && (progress.professionLevels || body.professionLevels)) {
        const pl = { ...(progress.professionLevels || body.professionLevels || {}) };
        for (const [prof, nodes] of Object.entries(progress.professionSkillNodes)) {
          const key = String(prof).toLowerCase();
          pl[key] = { ...(pl[key] || { level: 1, xp: 0 }), unlockedNodes: nodes };
        }
        body.professionLevels = pl;
      }

      try {
        const headers = authHeaders();
        headers['X-Progress-Revision'] = String(body.expectedRevision || 0);
        headers['If-Match'] = String(body.expectedRevision || 0);

        let res = await fleetFetch(
          FLEET.gameData + '/api/characters/' + encodeURIComponent(id) + '/progress',
          { method: 'POST', headers, body: JSON.stringify(body) }
        );
        // Fallback to PATCH if progress route not deployed yet
        if (res.status === 404) {
          res = await fleetFetch(
            FLEET.gameData + '/api/characters/' + encodeURIComponent(id),
            { method: 'PATCH', headers, body: JSON.stringify(body) }
          );
        }

        if (res.status === 409) {
          const conflict = await res.json().catch(() => ({}));
          dispatch('grudge:progress:conflict', { characterId: id, conflict });
          // Refresh and retry once if caller allows
          if (progress.retryOnConflict !== false) {
            await fleet.getCharacterDetail(id);
            if (progress._retried) return null;
            return fleet.saveCharacterProgress(id, { ...progress, _retried: true, expectedRevision: fleet.getProgressRevision(id) });
          }
          return null;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.warn('[GrudgeFleet] saveCharacterProgress', res.status, err);
          dispatch('grudge:progress:error', { characterId: id, status: res.status, err });
          return null;
        }
        const updated = normalizeCharacter(await res.json());
        if (updated.progressRevision != null) {
          _progressRevisions[id] = Number(updated.progressRevision);
        }
        _characters = _characters.map((c) => (String(c.id) === String(id) ? { ...c, ...updated } : c));
        if (String(id) === String(readActiveId())) {
          notifyCallbacks(updated);
          dispatch('grudge:character:updated', { character: updated });
        }
        return updated;
      } catch (e) {
        console.warn('[GrudgeFleet] saveCharacterProgress', e);
        return null;
      }
    },

    /** Fetch full character detail by UUID (attributes, skills, mastery, gear). */
    async getCharacterDetail(id) {
      const charId = id || readActiveId();
      if (!charId || !readToken()) return null;
      try {
        const res = await fleetFetch(
          FLEET.gameData + '/api/characters/' + encodeURIComponent(charId),
          { headers: authHeaders() }
        );
        if (!res.ok) return null;
        const char = normalizeCharacter(await res.json());
        if (char.progressRevision != null) {
          _progressRevisions[charId] = Number(char.progressRevision);
        } else if (char.skillLoadouts && char.skillLoadouts.__progress) {
          _progressRevisions[charId] = Number(char.skillLoadouts.__progress.revision) || 0;
          char.progressRevision = _progressRevisions[charId];
        }
        const idx = _characters.findIndex((c) => String(c.id) === String(charId));
        if (idx >= 0) _characters[idx] = { ..._characters[idx], ...char };
        else _characters.push(char);
        return char;
      } catch {
        return null;
      }
    },

    /** Extract weapon mastery blob from character.weaponSkillSelections.mastery */
    getWeaponMasteryFromCharacter(char) {
      if (!char) return null;
      const wss = char.weaponSkillSelections;
      if (wss && wss.mastery) return wss.mastery;
      return null;
    },

    /** Extract class skill picks from character.selectedSkills */
    getClassSkillsFromCharacter(char) {
      if (!char) return null;
      return char.selectedSkills || null;
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
      // Route progress-shaped updates through the validated progress path
      const progressKeys = [
        'professionLevels', 'equipment', 'attributes', 'selectedSkills',
        'skillLoadouts', 'skillPoints', 'weaponSkillLevel', 'weaponSkillSelections',
        'weaponMastery', 'unspentAttributePoints', 'equippedWeaponId',
      ];
      const looksLikeProgress = progressKeys.some((k) => updates && updates[k] !== undefined);
      if (looksLikeProgress) {
        return fleet.saveCharacterProgress(id, updates);
      }
      try {
        const res = await fleetFetch(FLEET.gameData + '/api/characters/' + encodeURIComponent(id), {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(updates),
        });
        if (!res.ok) return null;
        const updated = normalizeCharacter(await res.json());
        if (updated.progressRevision != null) _progressRevisions[id] = Number(updated.progressRevision);
        _characters = _characters.map((c) => (String(c.id) === String(id) ? updated : c));
        if (String(id) === String(readActiveId())) {
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

    /**
     * Treaty — Grudge ID account social (friends, DMs, groups, server chat).
     * Account-scoped; never character-scoped. Railway Postgres SSOT.
     * Uses same-origin /api when hosted on fleet frontends.
     */
    async treatyFetch(path, init) {
      if (!readToken()) throw new Error('Sign in required for Treaty');
      const base = (FLEET.gameData || '') + '/api/treaty';
      const res = await fleetFetch(base + path, {
        ...init,
        headers: { ...authHeaders(), ...(init && init.headers) || {} },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Treaty request failed (' + res.status + ')');
      return data;
    },

    getTreatySocial() {
      return fleet.treatyFetch('/social');
    },

    getTreatyDmThreads() {
      return fleet.treatyFetch('/dm/threads');
    },

    getTreatyGroups() {
      return fleet.treatyFetch('/groups');
    },

    getTreatyUnread() {
      return fleet.treatyFetch('/unread');
    },

    /** Fleet + per-game server channels (public account chat). */
    getTreatyServers(gameId) {
      var q = gameId ? ('?game=' + encodeURIComponent(gameId)) : '';
      return fleet.treatyFetch('/servers' + q);
    },

    getTreatyServerMessages(slug, limit) {
      var q = limit ? ('?limit=' + encodeURIComponent(String(limit))) : '';
      return fleet.treatyFetch('/servers/' + encodeURIComponent(slug) + '/messages' + q);
    },

    sendTreatyServerMessage(slug, content) {
      return fleet.treatyFetch('/servers/' + encodeURIComponent(slug) + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: String(content || '') }),
      });
    },

    sendTreatyFriendRequest(query) {
      return fleet.treatyFetch('/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: String(query || '').trim() }),
      });
    },

    sendTreatyDm(threadId, content) {
      return fleet.treatyFetch('/dm/threads/' + encodeURIComponent(threadId) + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: String(content || '') }),
      });
    },

    sendTreatyGroupMessage(groupId, content) {
      return fleet.treatyFetch('/groups/' + encodeURIComponent(groupId) + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: String(content || '') }),
      });
    },

    createTreatyGroup(name, members) {
      return fleet.treatyFetch('/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(name || '').trim(),
          members: Array.isArray(members) ? members : [],
        }),
      });
    },

    /** Open full Treaty app with SSO handoff when possible. */
    openTreaty(opts) {
      opts = opts || {};
      const url = fleet.buildSSOUrl(FLEET.treaty, opts);
      if (typeof window !== 'undefined') {
        window.open(url, opts.target || '_blank', 'noopener');
      }
      return url;
    },

    /**
     * Open embeddable Treaty panel (server chat + deep link to full app).
     * opts.game — warlords | genesis | grudge6 | forge | fleet
     */
    openTreatyEmbed(opts) {
      opts = opts || {};
      var game = opts.game || 'fleet';
      var base = FLEET.treatyEmbed + (FLEET.treatyEmbed.indexOf('?') >= 0 ? '&' : '?') + 'game=' + encodeURIComponent(game);
      var url = fleet.buildSSOUrl ? fleet.buildSSOUrl(base, opts) : base;
      if (typeof window !== 'undefined') {
        if (opts.iframe && opts.iframe.appendChild) {
          var frame = document.createElement('iframe');
          frame.src = url;
          frame.title = 'Grudge Treaty';
          frame.style.cssText = opts.iframeStyle || 'width:100%;height:100%;border:0;border-radius:12px;';
          opts.iframe.innerHTML = '';
          opts.iframe.appendChild(frame);
          return frame;
        }
        window.open(url, opts.target || 'grudge-treaty', 'noopener,width=420,height=640');
      }
      return url;
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
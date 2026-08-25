/**
 * grudge-game-bootstrap.js — Fleet auth for any Grudge HTML/JS deployment.
 * Drop in <head> before your app bundle. Handles SSO return + login redirects.
 *
 *   <script src="https://id.grudge-studio.com/grudge-game-bootstrap.js"></script>
 *   <script>window.GRUDGE_AUTH_GATEWAY = 'https://id.grudge-studio.com';</script>
 *
 * Session policy (must stay aligned with server JWT_SESSION_TTL, default 365d):
 * - Stores JWT under all fleet token keys for max satellite compatibility
 * - Picks up query + hash handoff (grudge_token, sso_token, token)
 * - Bridges launch tokens via grudge-bridge / session/exchange
 * - Silent claim via cookie (*.grudge-studio.com) so one login covers the fleet
 * - Silent refresh via POST /api/auth/refresh while JWT still valid
 */
(function (global) {
  'use strict';

  var GATEWAY = global.GRUDGE_AUTH_GATEWAY || 'https://id.grudge-studio.com';
  /** Default session window — 365 days (max allowed / matches Railway JWT_SESSION_TTL). */
  var SESSION_MS = (typeof global.GRUDGE_SESSION_MS === 'number' && global.GRUDGE_SESSION_MS > 0)
    ? global.GRUDGE_SESSION_MS
    : 365 * 24 * 60 * 60 * 1000;
  var TOKEN_KEYS = [
    'grudge_auth_token',
    'grudge_session_token',
    'grudge.token',
    'sso_token',
    'grudge_token',
  ];
  var TOKEN_KEY = TOKEN_KEYS[0];
  var LEGACY_KEY = TOKEN_KEYS[1];
  var EXP_KEY = 'grudge.token.exp';
  var REFRESH_MARGIN_MS = 2 * 24 * 60 * 60 * 1000; // refresh if <2d left

  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (_) {} }

  function cleanUrl(keys) {
    try {
      var u = new URL(global.location.href);
      keys.forEach(function (k) { u.searchParams.delete(k); });
      // Strip handoff params from hash too
      if (u.hash && u.hash.length > 1) {
        var hp = new URLSearchParams(u.hash.replace(/^#/, ''));
        var changed = false;
        keys.forEach(function (k) {
          if (hp.has(k)) { hp.delete(k); changed = true; }
        });
        if (changed) {
          var h = hp.toString();
          u.hash = h ? h : '';
        }
      }
      var q = u.searchParams.toString();
      var hash = u.hash || '';
      global.history.replaceState(null, '', u.pathname + (q ? '?' + q : '') + hash);
    } catch (_) {}
  }

  function cookieOpts(maxAgeSec) {
    var secure = (global.location && global.location.protocol === 'https:') ? '; Secure' : '';
    // Mirror on parent domain when on *.grudge-studio.com so other subdomains pick up JS cookie
    var domain = '';
    try {
      var h = global.location.hostname || '';
      if (h === 'grudge-studio.com' || h.endsWith('.grudge-studio.com')) {
        domain = '; Domain=.grudge-studio.com';
      }
    } catch (_) {}
    return '; path=/; max-age=' + maxAgeSec + '; SameSite=Lax' + secure + domain;
  }

  function isStudioHost() {
    try {
      var h = global.location.hostname || '';
      return h === 'grudge-studio.com' || h.endsWith('.grudge-studio.com') ||
        h === 'grudgewarlords.com' || h === 'www.grudgewarlords.com';
    } catch (_) {
      return false;
    }
  }

  function storeToken(token, grudgeId, username, maxAgeMs, opts) {
    if (!token) return;
    var options = opts || {};
    // Skip no-op writes (stops cross-tab broadcast loops)
    if (readStoredToken() === token && !options.force) {
      if (grudgeId) {
        lsSet('grudge_id', grudgeId);
        lsSet('grudge_account_id', grudgeId);
      }
      if (username) lsSet('grudge_username', username);
      return;
    }
    var ttl = typeof maxAgeMs === 'number' && maxAgeMs > 0 ? maxAgeMs : SESSION_MS;
    var exp = Date.now() + ttl;
    TOKEN_KEYS.forEach(function (k) { lsSet(k, token); });
    lsSet(EXP_KEY, String(exp));
    if (grudgeId) {
      lsSet('grudge_id', grudgeId);
      lsSet('grudge_account_id', grudgeId);
      lsSet('grudge_user_id', grudgeId);
    }
    if (username) lsSet('grudge_username', username);
    try {
      var maxAge = Math.floor(ttl / 1000);
      var cOpts = cookieOpts(maxAge);
      document.cookie = 'grudge_auth_token=' + encodeURIComponent(token) + cOpts;
      document.cookie = 'sso_token=' + encodeURIComponent(token) + cOpts;
      if (grudgeId) document.cookie = 'grudge_id=' + encodeURIComponent(grudgeId) + cOpts;
    } catch (_) {}
    // Cross-tab sync (optional)
    if (!options.silent) {
      try {
        global.dispatchEvent(new CustomEvent('grudge:auth:stored', {
          detail: { token: token, grudgeId: grudgeId || '', username: username || '', exp: exp },
        }));
        if (global.BroadcastChannel) {
          var bc = new BroadcastChannel('grudge-auth');
          bc.postMessage({ type: 'token', token: token, grudgeId: grudgeId, username: username, exp: exp });
          bc.close();
        }
      } catch (_) {}
    }
  }

  function readStoredToken() {
    for (var i = 0; i < TOKEN_KEYS.length; i++) {
      var t = lsGet(TOKEN_KEYS[i]);
      if (t) return t;
    }
    return null;
  }

  /** Decode JWT exp without verify (client hint only). */
  function jwtExpMs(token) {
    try {
      var parts = String(token).split('.');
      if (parts.length < 2) return 0;
      var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      var json = JSON.parse(atob(b64));
      return json.exp ? json.exp * 1000 : 0;
    } catch (_) {
      return 0;
    }
  }

  function paramFromSearchOrHash(name) {
    try {
      var qs = new URLSearchParams(global.location.search);
      var v = qs.get(name);
      if (v) return v;
      if (global.location.hash && global.location.hash.length > 1) {
        var hp = new URLSearchParams(global.location.hash.replace(/^#/, ''));
        return hp.get(name);
      }
    } catch (_) {}
    return null;
  }

  function pickupTokens() {
    var launch = paramFromSearchOrHash('grudge_token') || paramFromSearchOrHash('launch_token');
    var sso =
      paramFromSearchOrHash('sso_token') ||
      paramFromSearchOrHash('token') ||
      paramFromSearchOrHash('access_token');
    var grudgeId =
      paramFromSearchOrHash('grudge_id') ||
      paramFromSearchOrHash('grudgeId') ||
      '';
    var username =
      paramFromSearchOrHash('username') ||
      paramFromSearchOrHash('grudge_username') ||
      '';

    var cleanKeys = [
      'grudge_token', 'launch_token', 'sso_token', 'token', 'access_token',
      'grudge_id', 'grudgeId', 'username', 'grudge_username', 'provider',
    ];

    // Prefer short launch bridge when present (maps to real Railway session)
    if (launch) {
      cleanUrl(cleanKeys);
      return bridgeLaunchToken(launch).then(function (ok) {
        if (ok) return true;
        // Fall back to sso_token if bridge failed but long token was dual-written
        if (sso) {
          storeToken(sso, grudgeId, username);
          global.dispatchEvent(new CustomEvent('grudge:auth:ready', { detail: { token: sso } }));
          return true;
        }
        return false;
      });
    }

    if (sso) {
      storeToken(sso, grudgeId, username);
      cleanUrl(cleanKeys);
      global.dispatchEvent(new CustomEvent('grudge:auth:ready', { detail: { token: sso } }));
      scheduleRefresh();
      return Promise.resolve(true);
    }

    if (readStoredToken()) {
      scheduleRefresh();
      return Promise.resolve(true);
    }
    // Silent fleet re-entry: studio cookie → JWT without login UI
    return silentClaim();
  }

  function hasFleetCookie() {
    try {
      var c = document.cookie || '';
      return /(?:^|;\s*)(grudge_auth_token|sso_token|grudge_session)=/.test(c);
    } catch (e) {
      return false;
    }
  }

  /**
   * Claim a long-lived session from the id hub cookie (one login → all deployments).
   * Works for *.grudge-studio.com / grudgewarlords.com with credentials.
   * Guest (no cookie): skip — POST claim is 401 and spams the lab console.
   */
  function silentClaim() {
    if (!hasFleetCookie()) return Promise.resolve(false);
    var urls = [
      GATEWAY + '/api/auth/session/claim',
      '/api/auth/session/claim',
    ];
    var chain = Promise.resolve(false);
    urls.forEach(function (url) {
      chain = chain.then(function (done) {
        if (done) return true;
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          credentials: 'include',
          body: '{}',
        })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (!data) return false;
            var t = data.sessionToken || data.token;
            if (!t) return false;
            var ttl = (typeof data.maxAgeSec === 'number' && data.maxAgeSec > 0)
              ? data.maxAgeSec * 1000
              : SESSION_MS;
            storeToken(
              t,
              data.grudgeId || (data.user && data.user.grudgeId) || '',
              data.username || (data.user && data.user.username) || '',
              ttl,
            );
            global.dispatchEvent(new CustomEvent('grudge:auth:ready', { detail: { token: t, claimed: true } }));
            scheduleRefresh();
            return true;
          })
          .catch(function () { return false; });
      });
    });
    return chain;
  }

  function bridgeLaunchToken(launchToken) {
    var body = JSON.stringify({ token: launchToken, audience: global.location.origin });
    // Prefer same-origin proxy, then ID gateway, then Railway (CORS-allowlisted)
    var bases = [
      '',
      GATEWAY,
      'https://grudge-api-production-0d46.up.railway.app',
    ];
    var paths = ['/api/auth/grudge-bridge', '/api/auth/session/exchange'];
    var chain = Promise.resolve(false);
    bases.forEach(function (base) {
      paths.forEach(function (path) {
        chain = chain.then(function (done) {
          if (done) return true;
          var url = (base || '') + path;
          return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
            credentials: base === '' || base === GATEWAY ? 'include' : 'omit',
          })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
              if (!data) return false;
              var t = data.sessionToken || data.token;
              if (t) {
                storeToken(t, data.grudgeId || (data.user && data.user.grudgeId) || '', data.username || (data.user && data.user.username) || '');
                global.dispatchEvent(new CustomEvent('grudge:auth:ready', { detail: { token: t } }));
                scheduleRefresh();
                return true;
              }
              return false;
            })
            .catch(function () { return false; });
        });
      });
    });
    return chain;
  }

  function refreshSession() {
    var t = readStoredToken();
    if (!t) return Promise.resolve(false);
    var body = JSON.stringify({ token: t });
    var urls = [
      '/api/auth/refresh',
      GATEWAY + '/api/auth/refresh',
      'https://grudge-api-production-0d46.up.railway.app/api/auth/refresh',
    ];
    var chain = Promise.resolve(false);
    urls.forEach(function (url) {
      chain = chain.then(function (done) {
        if (done) return true;
        return fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + t,
            'X-Session-Token': t,
          },
          body: body,
          credentials: url.indexOf('http') === 0 && url.indexOf(GATEWAY) !== 0 ? 'omit' : 'include',
        })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (!data) return false;
            var nt = data.sessionToken || data.token;
            if (nt) {
              storeToken(
                nt,
                data.grudgeId || (data.user && data.user.grudgeId) || lsGet('grudge_id') || '',
                data.username || (data.user && data.user.username) || lsGet('grudge_username') || '',
              );
              return true;
            }
            return false;
          })
          .catch(function () { return false; });
      });
    });
    return chain;
  }

  var refreshTimer = null;
  function scheduleRefresh() {
    if (refreshTimer) {
      try { clearTimeout(refreshTimer); } catch (_) {}
      refreshTimer = null;
    }
    var t = readStoredToken();
    if (!t) return;
    var exp = parseInt(lsGet(EXP_KEY) || '0', 10) || jwtExpMs(t);
    if (!exp) {
      // No exp hint — refresh after 12h of activity
      refreshTimer = setTimeout(function () {
        refreshSession().then(function () { scheduleRefresh(); });
      }, 12 * 60 * 60 * 1000);
      return;
    }
    var wait = Math.max(60 * 1000, exp - Date.now() - REFRESH_MARGIN_MS);
    refreshTimer = setTimeout(function () {
      refreshSession().then(function () { scheduleRefresh(); });
    }, wait);
    // Also refresh immediately if already inside margin
    if (exp - Date.now() < REFRESH_MARGIN_MS) {
      refreshSession().then(function () { scheduleRefresh(); });
    }
  }

  /**
   * Prefer silent SSO (skips form when studio cookie exists), else full login.
   * Longest entry: sso-check reuses id session; handoff returns 90d JWT.
   */
  function login(returnUrl) {
    loginPage(returnUrl);
  }

  function loginPage(returnPath) {
    var origin = global.location.origin;
    var path = returnPath || '/auth/callback';
    var dest = path.indexOf('http') === 0 ? path : origin + (path.charAt(0) === '/' ? path : '/' + path);
    // sso-check: if already signed in on id, redirect back with tokens (no form)
    global.location.href = GATEWAY + '/auth/sso-check?return=' + encodeURIComponent(dest);
  }

  /** Force full login UI even if a session cookie exists. */
  function loginForce(returnPath) {
    var origin = global.location.origin;
    var path = returnPath || '/auth/callback';
    var dest = path.indexOf('http') === 0 ? path : origin + (path.charAt(0) === '/' ? path : '/' + path);
    global.location.href = GATEWAY + '/login?redirect_uri=' + encodeURIComponent(dest);
  }

  function isAuthenticated() {
    return !!readStoredToken();
  }

  function authHeaders() {
    var t = readStoredToken();
    var h = { 'Content-Type': 'application/json' };
    if (t) {
      h.Authorization = 'Bearer ' + t;
      h['X-Session-Token'] = t;
    }
    return h;
  }

  function logout() {
    TOKEN_KEYS.forEach(lsDel);
    lsDel(EXP_KEY);
    lsDel('grudge_id');
    lsDel('grudge_account_id');
    lsDel('grudge_user_id');
    lsDel('grudge_username');
    try {
      document.cookie = 'grudge_auth_token=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'sso_token=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'grudge_id=; path=/; max-age=0; SameSite=Lax';
    } catch (_) {}
  }

  // Cross-tab: accept token from sibling tabs (silent — do not re-broadcast)
  try {
    if (global.BroadcastChannel) {
      var bcListen = new BroadcastChannel('grudge-auth');
      bcListen.onmessage = function (ev) {
        if (ev && ev.data && ev.data.type === 'token' && ev.data.token) {
          var remain = (ev.data.exp || 0) > Date.now() ? (ev.data.exp - Date.now()) : SESSION_MS;
          storeToken(ev.data.token, ev.data.grudgeId || '', ev.data.username || '', remain, { silent: true });
          scheduleRefresh();
        }
      };
    }
  } catch (_) {}

  // Re-check on focus / visibility (user returned to tab after days)
  try {
    global.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && readStoredToken()) scheduleRefresh();
    });
    global.addEventListener('focus', function () {
      if (readStoredToken()) scheduleRefresh();
    });
  } catch (_) {}

  global.GrudgeAuth = {
    gateway: GATEWAY,
    sessionMs: SESSION_MS,
    pickup: pickupTokens,
    login: login,
    loginPage: loginPage,
    loginForce: loginForce,
    claim: silentClaim,
    isAuthenticated: isAuthenticated,
    getToken: readStoredToken,
    authHeaders: authHeaders,
    storeToken: storeToken,
    refresh: refreshSession,
    logout: logout,
    require: function (returnUrl) {
      if (isAuthenticated()) return;
      // Try silent claim first (no navigation), then SSO redirect
      silentClaim().then(function (ok) {
        if (!ok) login(returnUrl);
      });
    },
  };

  pickupTokens();
})(typeof window !== 'undefined' ? window : globalThis);

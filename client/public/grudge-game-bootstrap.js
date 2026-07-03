/**
 * grudge-game-bootstrap.js — Fleet auth for any Grudge HTML/JS deployment.
 * Drop in <head> before your app bundle. Handles SSO return + login redirects.
 *
 *   <script src="https://id.grudge-studio.com/grudge-game-bootstrap.js"></script>
 *   <script>window.GRUDGE_AUTH_GATEWAY = 'https://id.grudge-studio.com';</script>
 */
(function (global) {
  'use strict';

  var GATEWAY = global.GRUDGE_AUTH_GATEWAY || 'https://id.grudge-studio.com';
  var TOKEN_KEY = 'grudge_auth_token';
  var LEGACY_KEY = 'grudge_session_token';

  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }

  function cleanUrl(keys) {
    try {
      var u = new URL(global.location.href);
      keys.forEach(function (k) { u.searchParams.delete(k); });
      var q = u.searchParams.toString();
      global.history.replaceState(null, '', u.pathname + (q ? '?' + q : '') + u.hash);
    } catch (_) {}
  }

  function storeToken(token, grudgeId, username) {
    if (!token) return;
    lsSet(TOKEN_KEY, token);
    lsSet(LEGACY_KEY, token);
    lsSet('grudge.token', token);
    lsSet('grudge.token.exp', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    if (grudgeId) {
      lsSet('grudge_id', grudgeId);
      lsSet('grudge_account_id', grudgeId);
    }
    if (username) lsSet('grudge_username', username);
    try {
      var maxAge = 7 * 24 * 60 * 60;
      document.cookie = 'grudge_auth_token=' + encodeURIComponent(token) + '; path=/; max-age=' + maxAge + '; SameSite=Lax';
      if (grudgeId) document.cookie = 'grudge_id=' + encodeURIComponent(grudgeId) + '; path=/; max-age=' + maxAge + '; SameSite=Lax';
    } catch (_) {}
  }

  function pickupTokens() {
    var params = new URLSearchParams(global.location.search);
    var launch = params.get('grudge_token');
    if (launch) {
      cleanUrl(['grudge_token']);
      return bridgeLaunchToken(launch);
    }
    var token = params.get('sso_token') || params.get('token');
    if (token) {
      storeToken(token, params.get('grudge_id') || params.get('grudgeId') || '', params.get('username') || params.get('grudge_username') || '');
      cleanUrl(['sso_token', 'token', 'grudge_id', 'grudgeId', 'username', 'grudge_username', 'provider']);
      global.dispatchEvent(new CustomEvent('grudge:auth:ready', { detail: { token: token } }));
      return Promise.resolve(true);
    }
    if (lsGet(TOKEN_KEY) || lsGet(LEGACY_KEY)) return Promise.resolve(true);
    return Promise.resolve(false);
  }

  function bridgeLaunchToken(launchToken) {
    var body = JSON.stringify({ token: launchToken, audience: global.location.origin });
    var paths = ['/api/auth/grudge-bridge', '/api/auth/session/exchange'];
    var chain = Promise.resolve(false);
    paths.forEach(function (path) {
      chain = chain.then(function (done) {
        if (done) return true;
        return fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, credentials: 'include' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (!data) return false;
            var t = data.sessionToken || data.token;
            if (t) {
              storeToken(t, data.grudgeId || (data.user && data.user.grudgeId) || '', data.username || (data.user && data.user.username) || '');
              global.dispatchEvent(new CustomEvent('grudge:auth:ready', { detail: { token: t } }));
              return true;
            }
            return false;
          })
          .catch(function () { return false; });
      });
    });
    return chain;
  }

  function login(returnUrl) {
    var ret = returnUrl || global.location.href;
    global.location.href = GATEWAY + '/auth/sso-check?return=' + encodeURIComponent(ret);
  }

  function loginPage(returnPath) {
    var origin = global.location.origin;
    var path = returnPath || '/auth/callback';
    var dest = path.indexOf('http') === 0 ? path : origin + (path.charAt(0) === '/' ? path : '/' + path);
    global.location.href = GATEWAY + '/login?redirect_uri=' + encodeURIComponent(dest);
  }

  function isAuthenticated() {
    return !!(lsGet(TOKEN_KEY) || lsGet(LEGACY_KEY));
  }

  function authHeaders() {
    var t = lsGet(TOKEN_KEY) || lsGet(LEGACY_KEY);
    var h = { 'Content-Type': 'application/json' };
    if (t) {
      h.Authorization = 'Bearer ' + t;
      h['X-Session-Token'] = t;
    }
    return h;
  }

  global.GrudgeAuth = {
    gateway: GATEWAY,
    pickup: pickupTokens,
    login: login,
    loginPage: loginPage,
    isAuthenticated: isAuthenticated,
    getToken: function () { return lsGet(TOKEN_KEY) || lsGet(LEGACY_KEY); },
    authHeaders: authHeaders,
    require: function (returnUrl) { if (!isAuthenticated()) login(returnUrl); },
  };

  pickupTokens();
})(typeof window !== 'undefined' ? window : globalThis);
/**
 * ══════════════════════════════════════════════════════════════════════
 *  Grudge Auth Modal — Standalone JS Module
 *  Drop-in auth modal for any Grudge Studio project.
 *
 *  Usage:
 *    <link rel="stylesheet" href="https://id.grudge-studio.com/grudge-auth-modal.css">
 *    <script src="https://id.grudge-studio.com/grudge-auth-modal.js"></script>
 *    <button onclick="openGrudgeAuthModal()">Sign In</button>
 *
 *  Config (optional — set BEFORE loading script or call grudgeAuthConfig()):
 *    window.GRUDGE_AUTH_BASE = '/api';   // API base URL (default: '' = same origin)
 *    window.GRUDGE_AUTH_RETURN = '/home'; // redirect after auth (default: current page)
 * ══════════════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────────
  var AUTH_BASE = window.GRUDGE_AUTH_BASE !== undefined ? window.GRUDGE_AUTH_BASE : 'https://id.grudge-studio.com';
  var AUTH_RETURN = window.GRUDGE_AUTH_RETURN || null;
  var INJECTED = false;

  // Allow runtime config
  window.grudgeAuthConfig = function (opts) {
    if (opts.authBase !== undefined) AUTH_BASE = opts.authBase;
    if (opts.returnUrl !== undefined) AUTH_RETURN = opts.returnUrl;
  };

  // ── SVG Icons (inline so no FontAwesome dependency) ────────────────
  var ICONS = {
    shield: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>',
    close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    discord: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>',
    google: '<svg width="13" height="13" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>',
    github: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>',
    wallet: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
    cloud: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>',
    phone: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H8C6.34 1 5 2.34 5 4v16c0 1.66 1.34 3 3 3h8c1.66 0 3-1.34 3-3V4c0-1.66-1.34-3-3-3zm-2 20h-4v-1h4v1zm3.25-3H6.75V4h10.5v14z"/></svg>',
    guest: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
  };

  // ── Modal HTML Template ────────────────────────────────────────────
  function buildModalHTML() {
    return '' +
      '<div class="grudge-auth-overlay" id="grudgeAuthOverlay" onclick="if(event.target===this)closeGrudgeAuthModal()">' +
        '<div class="grudge-auth-modal">' +
          '<div class="grudge-auth-modal-header">' +
            '<h2><img src="https://grudge-studio.com/grudge-logo.png" alt="Grudge Studio" style="width:28px;height:28px;margin-right:8px;vertical-align:middle;border-radius:4px;object-fit:contain" onerror="this.style.display=\'none\'"> GRUDGE ID</h2>' +
            '<button class="grudge-auth-close" onclick="closeGrudgeAuthModal()">' + ICONS.close + '</button>' +
          '</div>' +
          '<div id="grudgeAuthError" class="grudge-auth-error"></div>' +
          '<div id="grudgeAuthSuccess" class="grudge-auth-success"></div>' +

          /* Primary Auth — 2×2 grid: the 4 ways to connect */
          '<div class="grudge-social-grid grudge-social-grid-2x2">' +
            '<button class="grudge-social-btn google" onclick="window._grudgeAuth.doGoogle()">' + ICONS.google + ' Google</button>' +
            '<button class="grudge-social-btn phantom" onclick="window._grudgeAuth.doWallet()">' + ICONS.wallet + ' Wallet</button>' +
            '<button class="grudge-social-btn discord" onclick="window._grudgeAuth.doDiscord()">' + ICONS.discord + ' Discord</button>' +
            '<button class="grudge-social-btn guest-primary" onclick="window._grudgeAuth.doGuest()">' + ICONS.guest + ' Guest</button>' +
          '</div>' +

          '<div class="grudge-auth-divider"><span>or sign in with email</span></div>' +

          /* Sign In / Register Toggle */
          '<div class="grudge-form-toggle">' +
            '<button class="grudge-form-toggle-btn active" id="grudgeBtnSignIn" onclick="window._grudgeAuth.setMode(\'signin\')">Sign In</button>' +
            '<button class="grudge-form-toggle-btn" id="grudgeBtnRegister" onclick="window._grudgeAuth.setMode(\'register\')">Create Account</button>' +
          '</div>' +

          /* Sign In Form */
          '<div id="grudgeFormSignIn">' +
            '<input class="grudge-auth-field" id="grudgeLoginId" placeholder="Email, username, or Grudge ID" />' +
            '<input class="grudge-auth-field" id="grudgeLoginPass" type="password" placeholder="Password" />' +
            '<button class="grudge-btn-gold" onclick="window._grudgeAuth.doLogin()">Sign In</button>' +
          '</div>' +

          /* Register Form */
          '<div id="grudgeFormRegister" style="display:none">' +
            '<input class="grudge-auth-field" id="grudgeRegUser" placeholder="Username (3\u201320 chars)" />' +
            '<input class="grudge-auth-field" id="grudgeRegEmail" placeholder="Email" type="email" />' +
            '<input class="grudge-auth-field" id="grudgeRegPass" type="password" placeholder="Password (4+ chars)" />' +
            '<button class="grudge-btn-gold" onclick="window._grudgeAuth.doRegister()">Create Account</button>' +
          '</div>' +

          '<div class="grudge-auth-footer">' +
            '<p class="grudge-puter-note">' + ICONS.shield + ' Every account is linked to a Grudge ID for cross-game sync</p>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // ── Inject modal into DOM ──────────────────────────────────────────
  function ensureInjected() {
    if (INJECTED) return;
    INJECTED = true;
    // Load Google Fonts for Cinzel, Jost, IM Fell English SC if not already present
    if (!document.querySelector('link[href*="Cinzel"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=IM+Fell+English+SC&family=Jost:wght@300;400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
    var wrapper = document.createElement('div');
    wrapper.innerHTML = buildModalHTML();
    document.body.appendChild(wrapper.firstChild);
  }

  // ── localStorage keys (matching all Grudge apps) ───────────────────
  var TK = 'grudge_auth_token';
  var UID = 'grudge_user_id';
  var GID = 'grudge_id';
  var UNAME = 'grudge_username';
  var DEVICE = 'grudge_device_id';

  function getAuthToken() { return localStorage.getItem(TK); }

  var COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

  function setCookie(name, value) {
    try {
      document.cookie = name + '=' + encodeURIComponent(value) + '; path=/; max-age=' + COOKIE_MAX_AGE + '; SameSite=Lax';
    } catch (_) {}
  }

  function setAuthData(data) {
    var token = data.sessionToken || data.token;
    if (token) {
      localStorage.setItem(TK, token);
      setCookie('grudge_auth_token', token);
    }
    if (data.userId) localStorage.setItem(UID, data.userId);
    if (data.grudgeId) {
      localStorage.setItem(GID, data.grudgeId);
      setCookie('grudge_id', data.grudgeId);
    }
    if (data.username) localStorage.setItem(UNAME, data.username);
    // Also store in grudge_user / grudge-session for cross-app compat
    try {
      var user = data.user || { username: data.username, grudgeId: data.grudgeId };
      localStorage.setItem('grudge_user', JSON.stringify(user));
      localStorage.setItem('grudge-session', JSON.stringify({
        type: data.type || 'grudge',
        username: data.username || '',
        grudgeId: data.grudgeId || '',
        loginTime: Date.now()
      }));
    } catch (_) {}
  }

  function clearAuthData() {
    [TK, UID, GID, UNAME, 'grudge_user', 'grudge-session', 'grudge_auth_user'].forEach(function (k) {
      localStorage.removeItem(k);
    });
    // Clear cookies so middleware sees logout
    try {
      document.cookie = 'grudge_auth_token=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'grudge_id=; path=/; max-age=0; SameSite=Lax';
    } catch (_) {}
  }

  // ── UI Helpers ─────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function showError(msg) {
    var el = $('grudgeAuthError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    var s = $('grudgeAuthSuccess');
    if (s) s.style.display = 'none';
  }
  function showSuccess(msg) {
    var el = $('grudgeAuthSuccess');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    var e = $('grudgeAuthError');
    if (e) e.style.display = 'none';
  }
  function clearMessages() {
    var e = $('grudgeAuthError'); if (e) e.style.display = 'none';
    var s = $('grudgeAuthSuccess'); if (s) s.style.display = 'none';
  }

  function toast(msg) {
    var d = document.createElement('div');
    d.className = 'grudge-auth-toast';
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2500);
  }

  // ── Post-auth handler ──────────────────────────────────────────────
  function onAuthSuccess(data, msg) {
    closeGrudgeAuthModal();
    toast(msg || 'Signed in!');
    // Build the SSO callback redirect URL with all three params
    var token = data.sessionToken || data.token || '';
    var gid = data.grudgeId || '';
    var uname = data.username || '';
    var callbackUrl = '/auth/callback'
      + '?sso_token=' + encodeURIComponent(token)
      + '&grudge_id=' + encodeURIComponent(gid)
      + '&grudge_username=' + encodeURIComponent(uname);
    // Redirect through the SSO callback — pickupSsoToken() handles storage
    setTimeout(function () { window.location.href = callbackUrl; }, 200);
  }

  // ── Puter ID linker (runs silently after every auth) ───────────────
  function linkPuterIdentity(token) {
    return new Promise(function (resolve) {
      if (!localStorage.getItem('grudge_puter_guest_id')) {
        var arr = new Uint8Array(8);
        crypto.getRandomValues(arr);
        var hex = Array.from(arr).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('').toUpperCase();
        localStorage.setItem('grudge_puter_guest_id', 'PGID-' + hex);
      }
      if (typeof puter !== 'undefined') {
        try {
          var loggedIn = puter.auth.isLoggedIn ? puter.auth.isLoggedIn() : false;
          if (loggedIn) {
            puter.auth.getUser().then(function (puterUser) {
              fetch(AUTH_BASE + '/api/auth/puter-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ puterId: puterUser.uuid, displayName: puterUser.username }),
              }).then(resolve).catch(resolve);
            }).catch(resolve);
            return;
          }
        } catch (_) {}
      }
      resolve();
    });
  }

  // ── Auth Handlers ──────────────────────────────────────────────────

  // Username / Password Login
  function doLogin() {
    var identifier = ($('grudgeLoginId') || {}).value;
    var password = ($('grudgeLoginPass') || {}).value;
    if (!identifier || !password) return showError('Enter username/email and password');
    showSuccess('Signing in\u2026');
    fetch(AUTH_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: identifier.trim(), password: password }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success && !data.token) return showError(data.error || 'Login failed');
        onAuthSuccess(data, 'Signed in as ' + (data.username || 'User'));
      })
      .catch(function (e) { showError('Network error: ' + e.message); });
  }

  // Register
  function doRegister() {
    var username = ($('grudgeRegUser') || {}).value;
    var email = ($('grudgeRegEmail') || {}).value;
    var phone = ($('grudgeRegPhone') || {}).value;
    var password = ($('grudgeRegPass') || {}).value;
    if (!username || !password) return showError('Username and password required');
    showSuccess('Creating account\u2026');
    fetch(AUTH_BASE + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim(),
        email: email || undefined,
        phone: phone || undefined,
        password: password,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success && !data.token) return showError(data.error || 'Registration failed');
        onAuthSuccess(data, data.message || 'Welcome to Grudge Warlords!');
      })
      .catch(function (e) { showError('Network error: ' + e.message); });
  }

  // ── OAuth client config (2026-04-27) ───────────────────────────────
  // The backend `/api/auth/<provider>/start` rewrites all 404 right now,
  // but the matching `/auth/<provider>/callback` endpoints on
  // id.grudge-studio.com are alive. We build the provider authorize URL
  // on the client and let the provider redirect straight to the callback.
  var DISCORD_CLIENT_ID = (window.GRUDGE_DISCORD_CLIENT_ID) || '1342593452793270302';
  var DISCORD_REDIRECT_URI = (window.GRUDGE_DISCORD_REDIRECT_URI) || 'https://id.grudge-studio.com/auth/discord/callback';
  var DISCORD_OAUTH_SCOPES = (window.GRUDGE_DISCORD_OAUTH_SCOPES) || 'identify email';

  function buildDiscordOAuthUrl(returnUrl) {
    var qs = 'client_id=' + encodeURIComponent(DISCORD_CLIENT_ID)
      + '&redirect_uri=' + encodeURIComponent(DISCORD_REDIRECT_URI)
      + '&response_type=code'
      + '&scope=' + encodeURIComponent(DISCORD_OAUTH_SCOPES)
      + '&state=' + encodeURIComponent(returnUrl)
      + '&prompt=consent';
    return 'https://discord.com/api/oauth2/authorize?' + qs;
  }

  // Discord OAuth — canonical gateway (identify + email scopes only).
  function doDiscord() {
    showSuccess('Redirecting to Discord\u2026');
    var returnUrl = encodeURIComponent(window.location.origin + '/auth/callback');
    window.location.href = AUTH_BASE + '/auth/discord/start?return=' + returnUrl;
  }

  // Google OAuth — delegated to Puter SDK (was: /api/auth/google/start which is 404).
  // puter.auth.signIn() shows a Puter popup that includes Google as a provider.
  // Per project rule i5j4NUBegZNoyEEBjTkREl the visible button stays branded
  // "Google"; only the popup chrome is Puter's.
  function doGoogle() {
    showSuccess('Opening Google sign-in\u2026');
    doPuter();
  }

  // GitHub OAuth — removed from primary UI; endpoint is 404.
  function doGitHub() {
    showError('GitHub login is coming soon. Use Google, Discord, or Wallet.');
  }

  // ── Solana Wallet (Phantom, Solflare, Backpack, any standard wallet) ──
  function detectSolanaWallet() {
    // Try each known provider in priority order
    if (window.phantom && window.phantom.solana && window.phantom.solana.isPhantom)
      return { provider: window.phantom.solana, name: 'Phantom' };
    if (window.solana && window.solana.isPhantom)
      return { provider: window.solana, name: 'Phantom' };
    if (window.solflare && window.solflare.isSolflare)
      return { provider: window.solflare, name: 'Solflare' };
    if (window.backpack && window.backpack.solana)
      return { provider: window.backpack.solana, name: 'Backpack' };
    // Generic standard wallet adapter
    if (window.solana)
      return { provider: window.solana, name: 'Solana Wallet' };
    return null;
  }

  function doWallet() {
    var wallet = detectSolanaWallet();
    if (!wallet) {
      return showError('No Solana wallet found. Install Phantom (phantom.app) or Solflare (solflare.com).');
    }
    showSuccess('Connecting ' + wallet.name + '\u2026');
    wallet.provider.connect()
      .then(function (resp) {
        var walletAddress = resp.publicKey.toString();
        return fetch(AUTH_BASE + '/api/auth/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet_address: walletAddress }),
        });
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) return showError(data.error || 'Wallet auth failed');
        onAuthSuccess(data, 'Signed in via ' + wallet.name);
      })
      .catch(function (e) { showError('Wallet error: ' + e.message); });
  }

  // Puter Auth
  function doPuter() {
    if (typeof puter === 'undefined') {
      showSuccess('Loading Puter SDK\u2026');
      var script = document.createElement('script');
      script.src = 'https://js.puter.com/v2/';
      script.onload = function () { doPuterAuth(); };
      document.head.appendChild(script);
    } else {
      doPuterAuth();
    }
  }
  function doPuterAuth() {
    showSuccess('Connecting to Puter\u2026');
    Promise.resolve()
      .then(function () {
        var alreadySignedIn = puter.auth.isSignedIn ? puter.auth.isSignedIn() : false;
        if (!alreadySignedIn) return puter.auth.signIn();
      })
      .then(function () { return puter.auth.getUser(); })
      .then(function (user) {
        if (!user || !user.uuid) return showError('Could not retrieve Puter user info.');
        return fetch(AUTH_BASE + '/api/auth/puter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puterId: user.uuid, displayName: user.username }),
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (!data.success) return showError(data.error || 'Puter auth failed');
            onAuthSuccess(data, 'Signed in via Puter as ' + (data.username || user.username));
          });
      })
      .catch(function (e) { showError('Puter error: ' + e.message); });
  }

  // Guest
  function doGuest() {
    showSuccess('Entering as guest\u2026');
    var deviceId = localStorage.getItem(DEVICE);
    if (!deviceId) {
      deviceId = crypto.randomUUID ? crypto.randomUUID() : 'dev-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      localStorage.setItem(DEVICE, deviceId);
    }
    fetch(AUTH_BASE + '/api/auth/puter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puterId: 'guest_' + deviceId, displayName: 'Guest' }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success && !data.token) return showError(data.error || 'Guest login failed');
        data.type = 'guest';
        onAuthSuccess(data, 'Playing as guest \u2014 upgrade anytime!');
      })
      .catch(function (e) { showError('Network error: ' + e.message); });
  }

  // Phone
  function sendPhoneCode() {
    var phone = ($('grudgePhoneNum') || {}).value;
    if (!phone) return showError('Enter a phone number');
    showSuccess('Sending code\u2026');
    fetch(AUTH_BASE + '/api/auth/phone/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim() }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) return showError(data.error || 'Failed to send code');
        showSuccess('Code sent! Check your messages.');
        var sec = $('grudgePhoneCodeSection');
        if (sec) sec.style.display = '';
      })
      .catch(function (e) { showError('Network error: ' + e.message); });
  }
  function verifyPhoneCode() {
    var phone = ($('grudgePhoneNum') || {}).value;
    var code = ($('grudgePhoneCode') || {}).value;
    if (!code) return showError('Enter the verification code');
    showSuccess('Verifying\u2026');
    fetch(AUTH_BASE + '/api/auth/phone/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) return showError(data.error || 'Invalid code');
        onAuthSuccess(data, 'Signed in via phone');
      })
      .catch(function (e) { showError('Network error: ' + e.message); });
  }

  // ── Form Mode Toggle ──────────────────────────────────────────────
  function setMode(mode) {
    var isSignIn = mode === 'signin';
    var fs = $('grudgeFormSignIn'); if (fs) fs.style.display = isSignIn ? '' : 'none';
    var fr = $('grudgeFormRegister'); if (fr) fr.style.display = isSignIn ? 'none' : '';
    var bs = $('grudgeBtnSignIn'); if (bs) bs.classList.toggle('active', isSignIn);
    var br = $('grudgeBtnRegister'); if (br) br.classList.toggle('active', !isSignIn);
    clearMessages();
  }

  function togglePhone() {
    var p = $('grudgePhonePanel');
    if (p) p.style.display = p.style.display === 'none' ? '' : 'none';
  }

  // ── OAuth Callback Handler (runs on page load) ─────────────────────
  function handleOAuthCallback() {
    var params = new URLSearchParams(window.location.search);
    var token = params.get('auth_token') || params.get('token') || params.get('sso_token');
    var username = params.get('auth_user') || params.get('username');
    var grudgeId = params.get('auth_grudge_id') || params.get('grudgeId');
    var err = params.get('auth_error') || params.get('error');

    if (err) {
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(function () {
        openGrudgeAuthModal();
        showError(decodeURIComponent(err));
      }, 300);
      return;
    }
    if (token) {
      var data = {
        token: token,
        username: username || 'User',
        grudgeId: grudgeId || '',
        success: true,
      };
      setAuthData(data);
      // Clean URL
      var clean = new URL(window.location.href);
      ['auth_token', 'token', 'sso_token', 'auth_user', 'username', 'auth_grudge_id', 'grudgeId', 'provider'].forEach(function (k) {
        clean.searchParams.delete(k);
      });
      window.history.replaceState({}, '', clean.pathname + clean.search);
      toast('Signed in as ' + (username || 'User'));
      window.dispatchEvent(new CustomEvent('grudge:auth:success', { detail: data }));
      linkPuterIdentity(token).catch(function () {});
    }
  }

  // ── Public API ─────────────────────────────────────────────────────
  window.openGrudgeAuthModal = function () {
    ensureInjected();
    var overlay = $('grudgeAuthOverlay');
    if (overlay) overlay.classList.add('open');
    clearMessages();
  };

  window.closeGrudgeAuthModal = function () {
    var overlay = $('grudgeAuthOverlay');
    if (overlay) overlay.classList.remove('open');
  };

  // Expose for use by other scripts
  window.grudgeAuthIsLoggedIn = function () { return !!getAuthToken(); };
  window.grudgeAuthGetUser = function () {
    try { return JSON.parse(localStorage.getItem('grudge_user') || 'null'); } catch (_) { return null; }
  };
  window.grudgeAuthLogout = function () {
    clearAuthData();
    toast('Signed out');
    window.dispatchEvent(new CustomEvent('grudge:auth:logout'));
  };

  // Internal handlers — exposed on window._grudgeAuth for onclick bindings
  window._grudgeAuth = {
    doLogin: doLogin,
    doRegister: doRegister,
    doDiscord: doDiscord,
    doGoogle: doGoogle,
    doGitHub: doGitHub,
    doWallet: doWallet,
    doPuter: doPuter,
    doGuest: doGuest,
    setMode: setMode,
  };

  // ── Auto-run on load ───────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleOAuthCallback);
  } else {
    handleOAuthCallback();
  }

})();

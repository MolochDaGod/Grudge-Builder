/**
 * Grudge Fleet Connect — full self-hosted SDK (v1.1.0)
 *
 * Canonical host: https://grudge-studio.com/grudge-fleet-connect.js
 * (nexus.grudge-studio.com / grudachain-rho are dead DNS — do not use.)
 *
 * API:
 *   GrudgeFleetConnect.autoMount({ mode: 'pill' | 'inline', target?: HTMLElement })
 *   GrudgeFleetConnect.refresh()
 *   GrudgeFleetConnect.getSession()
 *   GrudgeFleetConnect.signIn()
 *   GrudgeFleetConnect.signOut()
 *   GrudgeFleetConnect.openGame(id)
 *   GrudgeFleetConnect.version
 *
 * Integrates with:
 *   - window.GrudgeGameBootstrap / GRUDGE_FLEET (bootstrap.js)
 *   - window.GrudgeFleet (grudge-fleet.js auth+character bridge)
 *   - localStorage grudge_auth_token / grudge_id / grudge_username
 */
(function (global) {
  "use strict";

  var VERSION = "1.1.0";
  var STYLE_ID = "grudge-fleet-connect-style";
  var ROOT_ID = "grudge-fleet-connect-root";
  var PANEL_ID = "grudge-fleet-connect-panel";

  var TOKEN_KEY = "grudge_auth_token";
  var ID_KEY = "grudge_id";
  var USER_KEY = "grudge_username";

  var AUTH = "https://id.grudge-studio.com";
  var PORTAL = "https://grudge-studio.com";

  /** Curated live forge fleet for the connect panel */
  var FLEET_GAMES = [
    { id: "warlords", name: "Grudge Warlords", url: "https://client.grudge-studio.com", auth: true, tag: "MMO" },
    { id: "warlord-genesis", name: "Warlord Genesis", url: "https://genesis.grudge-studio.com/play", auth: false, tag: "RTS" },
    { id: "grudge-arena", name: "Grudge Arena", url: "https://grudge-arena.grudge-studio.com", auth: true, tag: "PvP" },
    { id: "survival-game", name: "Grudges Survival", url: "https://grudges.grudge-studio.com", auth: true, tag: "ARPG" },
    { id: "annihilate-demo", name: "Annihilate Demo", url: PORTAL + "/annihilate-demo", auth: false, tag: "Engine" },
    { id: "grudge-fishing", name: "Grudge Fishing", url: PORTAL + "/grudge-fishing", auth: false, tag: "Solo" },
    { id: "nemesis-tcg", name: "Nexus Nemesis TCG", url: "https://nemesis.grudge-studio.com", auth: true, tag: "TCG" },
    { id: "rts-grudge", name: "Grudge Warlords RTS", url: "https://rts-grudge.vercel.app", auth: false, tag: "RTS" },
    { id: "dungeon-crawler", name: "Dungeon Crawler", url: "https://dcq.grudge-studio.com", auth: false, tag: "PvP" },
    { id: "grudge-drive", name: "Grudge Drive", url: "https://drive.grudge-studio.com", auth: true, tag: "Arena" },
    { id: "super-engine", name: "Super Engine", url: PORTAL + "/super-engine", auth: false, tag: "Hub" },
    { id: "roster", name: "Hero Roster", url: PORTAL + "/roster", auth: false, tag: "Heroes" },
  ];

  function lsGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function lsSet(k, v) {
    try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {}
  }

  function getSession() {
    if (global.GrudgeGameBootstrap && typeof global.GrudgeGameBootstrap.getSession === "function") {
      try {
        var bs = global.GrudgeGameBootstrap.getSession();
        if (bs) {
          return {
            token: bs.token || lsGet(TOKEN_KEY),
            grudgeId: bs.grudgeId || lsGet(ID_KEY),
            username: bs.username || lsGet(USER_KEY),
            signedIn: !!(bs.signedIn || bs.token || lsGet(TOKEN_KEY)),
          };
        }
      } catch (e) {}
    }
    if (global.GrudgeFleet && typeof global.GrudgeFleet.isLoggedIn === "function") {
      try {
        var logged = global.GrudgeFleet.isLoggedIn();
        var u = global.GrudgeFleet.getUser && global.GrudgeFleet.getUser();
        return {
          token: global.GrudgeFleet.getToken ? global.GrudgeFleet.getToken() : lsGet(TOKEN_KEY),
          grudgeId: (global.GrudgeFleet.getGrudgeId && global.GrudgeFleet.getGrudgeId()) || lsGet(ID_KEY),
          username: (u && (u.displayName || u.username)) || lsGet(USER_KEY),
          signedIn: !!logged,
        };
      } catch (e) {}
    }
    var token = lsGet(TOKEN_KEY);
    return {
      token: token,
      grudgeId: lsGet(ID_KEY),
      username: lsGet(USER_KEY),
      signedIn: !!token,
    };
  }

  function buildLoginUrl(returnUrl) {
    if (global.GrudgeGameBootstrap && typeof global.GrudgeGameBootstrap.buildLoginUrl === "function") {
      try { return global.GrudgeGameBootstrap.buildLoginUrl("fleet", returnUrl || location.href); } catch (e) {}
    }
    return AUTH + "/api/auth/page?app=fleet&redirect=" + encodeURIComponent(returnUrl || location.href);
  }

  function signIn() {
    if (global.GrudgeFleet && typeof global.GrudgeFleet.signIn === "function") {
      try {
        global.GrudgeFleet.signIn({ mode: "grudge-id", returnUrl: location.href });
        return;
      } catch (e) {}
    }
    if (global.GrudgeGameBootstrap && typeof global.GrudgeGameBootstrap.openLogin === "function") {
      try { global.GrudgeGameBootstrap.openLogin("fleet"); return; } catch (e) {}
    }
    var url = buildLoginUrl(location.href);
    var w = 480, h = 640;
    var left = Math.max(0, (screen.width - w) / 2);
    var top = Math.max(0, (screen.height - h) / 2);
    var popup = global.open(
      url,
      "grudge-id-login",
      "width=" + w + ",height=" + h + ",left=" + left + ",top=" + top + ",noopener"
    );
    if (!popup) location.href = url;
  }

  function signOut() {
    if (global.GrudgeFleet && typeof global.GrudgeFleet.signOut === "function") {
      try { global.GrudgeFleet.signOut(); } catch (e) {}
    }
    if (global.GrudgeGameBootstrap && typeof global.GrudgeGameBootstrap.clearSession === "function") {
      try { global.GrudgeGameBootstrap.clearSession(); } catch (e) {}
    }
    lsSet(TOKEN_KEY, null);
    lsSet(ID_KEY, null);
    lsSet(USER_KEY, null);
    lsSet("grudge_user_id", null);
    try { document.dispatchEvent(new CustomEvent("grudge-auth-changed")); } catch (e) {}
    refresh();
  }

  function withSSO(url) {
    var s = getSession();
    if (!s.token) return url;
    try {
      var u = new URL(url, location.href);
      // Same-origin relative paths stay clean
      if (u.origin === location.origin && url.charAt(0) === "/") return url;
      u.searchParams.set("sso_token", s.token);
      if (s.grudgeId) u.searchParams.set("grudge_id", s.grudgeId);
      if (s.username) u.searchParams.set("username", s.username);
      return u.toString();
    } catch (e) {
      return url;
    }
  }

  function openGame(id) {
    var g = null;
    for (var i = 0; i < FLEET_GAMES.length; i++) {
      if (FLEET_GAMES[i].id === id) { g = FLEET_GAMES[i]; break; }
    }
    if (!g) return;
    var s = getSession();
    if (g.auth && !s.signedIn) {
      signIn();
      return;
    }
    var dest = withSSO(g.url);
    if (g.url.charAt(0) === "/") {
      location.href = dest;
    } else {
      global.open(dest, "_blank", "noopener");
    }
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = [
      "#" + ROOT_ID + "{position:fixed;right:12px;bottom:12px;z-index:9998;font:12px/1.35 system-ui,Segoe UI,sans-serif;color:#e8d5a3}",
      "#" + ROOT_ID + " *{box-sizing:border-box}",
      "#" + ROOT_ID + " .gfc-pill{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;",
      "background:rgba(12,10,6,.88);border:1px solid rgba(212,175,55,.4);color:#e8d5a3;",
      "box-shadow:0 6px 22px rgba(0,0,0,.4);backdrop-filter:blur(10px);cursor:pointer;",
      "user-select:none;transition:border-color .15s,transform .12s}",
      "#" + ROOT_ID + " .gfc-pill:hover{border-color:rgba(212,175,55,.75);transform:translateY(-1px)}",
      "#" + ROOT_ID + " .gfc-dot{width:8px;height:8px;border-radius:50%;background:#666;flex-shrink:0}",
      "#" + ROOT_ID + " .gfc-dot.on{background:#3ddc84;box-shadow:0 0 8px #3ddc84}",
      "#" + ROOT_ID + " .gfc-label{font-weight:600;letter-spacing:.02em;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      "#" + ROOT_ID + " .gfc-chev{opacity:.55;font-size:10px}",
      "#" + PANEL_ID + "{position:absolute;right:0;bottom:46px;width:min(320px,calc(100vw - 24px));",
      "background:rgba(10,8,5,.94);border:1px solid rgba(212,175,55,.35);border-radius:14px;",
      "box-shadow:0 12px 40px rgba(0,0,0,.55);backdrop-filter:blur(14px);overflow:hidden;",
      "animation:gfc-in .16s ease-out}",
      "@keyframes gfc-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
      "#" + PANEL_ID + " .gfc-head{padding:12px 14px;border-bottom:1px solid rgba(212,175,55,.18);display:flex;align-items:center;justify-content:space-between;gap:8px}",
      "#" + PANEL_ID + " .gfc-title{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#d4af37;font-weight:700}",
      "#" + PANEL_ID + " .gfc-user{font-size:11px;color:#cbb98a;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      "#" + PANEL_ID + " .gfc-actions{display:flex;gap:6px;padding:10px 12px;border-bottom:1px solid rgba(212,175,55,.12)}",
      "#" + PANEL_ID + " .gfc-btn{flex:1;padding:7px 8px;border-radius:8px;border:1px solid rgba(212,175,55,.3);",
      "background:rgba(212,175,55,.1);color:#e8d5a3;font-size:11px;font-weight:600;cursor:pointer}",
      "#" + PANEL_ID + " .gfc-btn:hover{background:rgba(212,175,55,.2)}",
      "#" + PANEL_ID + " .gfc-btn.primary{background:linear-gradient(135deg,rgba(212,175,55,.35),rgba(180,120,30,.25));border-color:rgba(212,175,55,.55)}",
      "#" + PANEL_ID + " .gfc-list{max-height:280px;overflow:auto;padding:6px}",
      "#" + PANEL_ID + " .gfc-item{display:flex;align-items:center;gap:8px;width:100%;text-align:left;",
      "padding:8px 10px;border:0;border-radius:8px;background:transparent;color:#e8d5a3;cursor:pointer}",
      "#" + PANEL_ID + " .gfc-item:hover{background:rgba(212,175,55,.1)}",
      "#" + PANEL_ID + " .gfc-item .name{flex:1;font-size:12px;font-weight:600}",
      "#" + PANEL_ID + " .gfc-item .tag{font-size:9px;text-transform:uppercase;letter-spacing:.06em;",
      "color:#9a8860;border:1px solid rgba(212,175,55,.2);padding:2px 5px;border-radius:4px}",
      "#" + PANEL_ID + " .gfc-foot{padding:8px 12px 10px;font-size:10px;color:#7a6a48;border-top:1px solid rgba(212,175,55,.12)}",
      "#" + PANEL_ID + " .gfc-foot a{color:#d4af37;text-decoration:none}",
    ].join("");
    document.head.appendChild(s);
  }

  var _open = false;
  var _inlineTarget = null;

  function closePanel() {
    _open = false;
    var p = document.getElementById(PANEL_ID);
    if (p) p.remove();
  }

  function renderPanel(root) {
    closePanel();
    _open = true;
    var s = getSession();
    var panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Grudge Fleet Connect");

    var head = document.createElement("div");
    head.className = "gfc-head";
    head.innerHTML =
      '<div><div class="gfc-title">Grudge Fleet</div>' +
      '<div class="gfc-user">' +
      (s.signedIn
        ? escapeHtml(s.username || s.grudgeId || "Signed in")
        : "Guest — connect Grudge ID") +
      "</div></div>";
    panel.appendChild(head);

    var actions = document.createElement("div");
    actions.className = "gfc-actions";
    if (s.signedIn) {
      var outBtn = document.createElement("button");
      outBtn.type = "button";
      outBtn.className = "gfc-btn";
      outBtn.textContent = "Sign out";
      outBtn.onclick = function () { signOut(); };
      actions.appendChild(outBtn);
      var acct = document.createElement("a");
      acct.className = "gfc-btn primary";
      acct.href = withSSO(PORTAL + "/account");
      acct.textContent = "Account";
      acct.style.textAlign = "center";
      acct.style.textDecoration = "none";
      actions.appendChild(acct);
    } else {
      var inBtn = document.createElement("button");
      inBtn.type = "button";
      inBtn.className = "gfc-btn primary";
      inBtn.textContent = "Connect Grudge ID";
      inBtn.onclick = function () { signIn(); };
      actions.appendChild(inBtn);
      var portal = document.createElement("a");
      portal.className = "gfc-btn";
      portal.href = PORTAL;
      portal.textContent = "Portal";
      portal.style.textAlign = "center";
      portal.style.textDecoration = "none";
      actions.appendChild(portal);
    }
    panel.appendChild(actions);

    var list = document.createElement("div");
    list.className = "gfc-list";
    FLEET_GAMES.forEach(function (g) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gfc-item";
      btn.innerHTML =
        '<span class="name">' + escapeHtml(g.name) + "</span>" +
        '<span class="tag">' + escapeHtml(g.tag) + (g.auth ? " · ID" : "") + "</span>";
      btn.onclick = function () { openGame(g.id); };
      list.appendChild(btn);
    });
    panel.appendChild(list);

    var foot = document.createElement("div");
    foot.className = "gfc-foot";
    foot.innerHTML =
      'Fleet Connect v' + VERSION +
      ' · <a href="' + PORTAL + '/super-engine" target="_blank" rel="noopener">Super Engine</a>';
    panel.appendChild(foot);

    root.appendChild(panel);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function paintPill(root) {
    var s = getSession();
    root.innerHTML = "";
    closePanel();

    var pill = document.createElement("button");
    pill.type = "button";
    pill.className = "gfc-pill";
    pill.setAttribute("aria-haspopup", "dialog");
    pill.innerHTML =
      '<span class="gfc-dot' + (s.signedIn ? " on" : "") + '"></span>' +
      '<span class="gfc-label">' +
      (s.signedIn ? escapeHtml(s.username || "Grudge ID") : "Grudge Fleet") +
      "</span>" +
      '<span class="gfc-chev">▾</span>';
    pill.onclick = function (e) {
      e.stopPropagation();
      if (_open) closePanel();
      else renderPanel(root);
    };
    root.appendChild(pill);
  }

  function paintInline(target) {
    if (!target) return;
    var s = getSession();
    target.innerHTML = "";
    target.setAttribute("data-grudge-fleet", "inline");
    var wrap = document.createElement("div");
    wrap.style.cssText = "font:12px system-ui,sans-serif;color:#e8d5a3";
    wrap.innerHTML =
      '<div style="margin-bottom:8px;font-weight:700;color:#d4af37">Grudge Fleet</div>' +
      '<div style="margin-bottom:8px;opacity:.85">' +
      (s.signedIn ? "Signed in as " + escapeHtml(s.username || s.grudgeId) : "Not connected") +
      "</div>";
    var row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";
    if (s.signedIn) {
      var out = document.createElement("button");
      out.textContent = "Sign out";
      out.onclick = signOut;
      row.appendChild(out);
    } else {
      var inn = document.createElement("button");
      inn.textContent = "Connect Grudge ID";
      inn.onclick = signIn;
      row.appendChild(inn);
    }
    wrap.appendChild(row);
    target.appendChild(wrap);
  }

  function autoMount(opts) {
    opts = opts || {};
    ensureStyle();

    if (opts.mode === "inline") {
      var t = opts.target;
      if (typeof t === "string") t = document.querySelector(t);
      if (!t) return null;
      _inlineTarget = t;
      paintInline(t);
      return t;
    }

    var root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement("div");
      root.id = ROOT_ID;
      root.setAttribute("data-grudge-fleet", "v" + VERSION);
      (document.body || document.documentElement).appendChild(root);
    }
    paintPill(root);
    return root;
  }

  function refresh() {
    var root = document.getElementById(ROOT_ID);
    if (root) paintPill(root);
    if (_inlineTarget) paintInline(_inlineTarget);
  }

  // Close panel on outside click / Escape
  document.addEventListener("click", function (e) {
    if (!_open) return;
    var root = document.getElementById(ROOT_ID);
    if (root && !root.contains(e.target)) closePanel();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePanel();
  });
  document.addEventListener("grudge-auth-changed", refresh);
  global.addEventListener("message", function (ev) {
    try {
      var d = ev.data;
      if (!d) return;
      if (d.type === "grudge-auth:success" || d.type === "grudge:auth:ready") refresh();
    } catch (e) {}
  });
  global.addEventListener("storage", function (e) {
    if (e.key === TOKEN_KEY || e.key === USER_KEY || e.key === ID_KEY) refresh();
  });

  // Replace any prior stub (allow upgrade)
  global.GrudgeFleetConnect = {
    autoMount: autoMount,
    refresh: refresh,
    getSession: getSession,
    signIn: signIn,
    signOut: signOut,
    openGame: openGame,
    withSSO: withSSO,
    games: FLEET_GAMES.slice(),
    version: VERSION,
  };

  // Announce ready for late subscribers
  try {
    document.dispatchEvent(new CustomEvent("grudge-fleet-connect:ready", { detail: { version: VERSION } }));
  } catch (e) {}
})(typeof window !== "undefined" ? window : globalThis);

/* Gruda wallet hub — ONE Wallet Standard + SIWS link path.
   Session = Grudge ID JWT. Connect only writes linked_wallets.
   Do not call /api/auth/phantom/* from this page (that is ID-gateway login).
   Do not SIWS the trader vault or house aUp3. */
(function () {
  if (window.__GRUDA_APP_LOADED) return;
  window.__GRUDA_APP_LOADED = true;

  const G = window.GRUDA || {};
  const RAILWAY = G.railway || "https://grudge-api-production-0d46.up.railway.app";
  const ID_GW = G.idGw || "https://id.grudge-studio.com";
  const POKER = G.poker || "https://poker.grudge-studio.com";
  const TRADER = G.trader || "https://trader.grudge-studio.com";
  const HOUSE = "aUp3XZqAt27phQNEM7k5KiP6cL3ihyG7uEJuEADbEks";
  const LINK_CAP = 8;
  const FALLBACKS = [
    { id: "phantom", name: "Phantom", install: "https://phantom.app" },
    { id: "solflare", name: "Solflare", install: "https://solflare.com" },
    { id: "backpack", name: "Backpack", install: "https://backpack.app" },
  ];
  const KEYS = ["grudge.open.token", "grudge_auth_token", "grudge_session_token", "grudge.token", "sso_token", "grudge_token", "access_token"];
  const ALPH = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

  const $ = (id) => document.getElementById(id);
  const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  function note(id, text, ok) {
    const el = $(id);
    if (!el) return;
    el.textContent = text || "";
    el.className = "msg" + (ok === true ? " ok" : ok === false ? " err" : "");
  }
  function toast(text, ok) { note("toast", text, ok); }

  let linkedCache = [];
  let vaultPubkey = "";
  let walletType = "";
  const standardWallets = [];

  function getTok() {
    try {
      for (const k of KEYS) {
        const v = localStorage.getItem(k);
        if (v) return v;
      }
    } catch (e) {}
    try {
      const m = document.cookie.match(/(?:^|; )(?:grudge_auth_token|sso_token)=([^;]+)/);
      if (m) return decodeURIComponent(m[1]);
    } catch (e) {}
    return "";
  }
  function storeFleetToken(token, extra) {
    if (!token) return;
    try {
      KEYS.forEach((k) => localStorage.setItem(k, token));
      if (extra && extra.grudgeId) localStorage.setItem("grudge_id", extra.grudgeId);
      if (extra && extra.username) localStorage.setItem("grudge_username", extra.username);
    } catch (e) {}
    try {
      const maxAge = 604800;
      document.cookie = "grudge_auth_token=" + encodeURIComponent(token) + "; path=/; max-age=" + maxAge + "; Domain=.grudge-studio.com; SameSite=Lax; Secure";
      document.cookie = "sso_token=" + encodeURIComponent(token) + "; path=/; max-age=" + maxAge + "; Domain=.grudge-studio.com; SameSite=Lax; Secure";
    } catch (e) {}
  }
  function captureAuthFromUrl() {
    try {
      const u = new URL(location.href);
      const hash = new URLSearchParams((u.hash || "").replace(/^#/, ""));
      const sp = u.searchParams;
      const session = sp.get("sso_token") || sp.get("token") || hash.get("sso_token") || hash.get("token") || "";
      const launch = sp.get("grudge_token") || hash.get("grudge_token") || "";
      const grudgeId = sp.get("grudgeId") || sp.get("grudge_id") || hash.get("grudgeId") || "";
      const username = sp.get("username") || sp.get("grudge_username") || hash.get("username") || "";
      if (session) storeFleetToken(session, { grudgeId, username });
      if (launch && launch !== session) { try { localStorage.setItem("grudge_launch_token", launch); } catch (e) {} }
      ["sso_token", "token", "grudge_token", "grudgeId", "grudge_id", "username", "grudge_username", "gid"].forEach((k) => { sp.delete(k); hash.delete(k); });
      if (session || launch) history.replaceState(null, "", u.pathname + (sp.toString() ? "?" + sp : "") + (hash.toString() ? "#" + hash : ""));
    } catch (e) {}
  }
  async function api(path, opt) {
    const headers = Object.assign({ Accept: "application/json" }, (opt && opt.headers) || {});
    const tok = getTok();
    if (tok) headers.Authorization = "Bearer " + tok;
    if (opt && opt.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    const urls = [path, RAILWAY + path];
    let last = null;
    for (const url of urls) {
      try {
        const r = await fetch(url, Object.assign({}, opt, { headers: headers, credentials: "include" }));
        const data = await r.json().catch(() => ({}));
        return { ok: r.ok, status: r.status, data: data };
      } catch (e) { last = e; }
    }
    throw last || new Error("fetch failed");
  }
  async function traderApi(path, opt) {
    const headers = Object.assign({ Accept: "application/json" }, (opt && opt.headers) || {});
    const tok = getTok();
    if (tok) headers.Authorization = "Bearer " + tok;
    if (opt && opt.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    const r = await fetch(TRADER + path, Object.assign({}, opt, { headers: headers, credentials: "include" }));
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data: data };
  }

  function b58encode(bytes) {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    let zeros = 0;
    while (zeros < u8.length && u8[zeros] === 0) zeros++;
    const size = (((u8.length - zeros) * 138) / 100 + 1) | 0;
    const b = new Uint8Array(size);
    let length = 0;
    for (let i = zeros; i < u8.length; i++) {
      let carry = u8[i];
      let j = size - 1;
      for (; j >= 0 && (carry || size - 1 - j < length); j--) {
        carry += 256 * b[j];
        b[j] = carry % 58;
        carry = (carry / 58) | 0;
      }
      length = size - 1 - j;
    }
    let it = size - length;
    while (it < size && b[it] === 0) it++;
    let s = "1".repeat(zeros);
    for (; it < size; it++) s += ALPH[b[it]];
    return s;
  }
  function short(a) {
    const s = String(a || "");
    return s.length > 10 ? s.slice(0, 4) + "\u2026" + s.slice(-4) : s || "\u2014";
  }
  function loginHref() {
    return ID_GW + "/login?redirect_uri=" + encodeURIComponent("https://wallet.grudge-studio.com/auth/callback") +
      "&return=" + encodeURIComponent("https://wallet.grudge-studio.com/auth/callback") +
      "&app=wallet&origin=" + encodeURIComponent("https://wallet.grudge-studio.com");
  }
  function showSheet(id) {
    document.querySelectorAll(".sheet").forEach((s) => s.classList.remove("on"));
    if (id && $(id)) $(id).classList.add("on");
    if (id === "sheet-connect") renderPicker();
  }
  function showPanel(name) {
    document.querySelectorAll("[data-dock]").forEach((b) => b.classList.toggle("on", b.dataset.dock === name));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("on", p.id === "panel-" + name));
  }
  function providerId(name) {
    const n = String(name || "").toLowerCase();
    if (n.includes("phantom")) return "phantom";
    if (n.includes("solflare")) return "solflare";
    if (n.includes("backpack")) return "backpack";
    return "other";
  }
  function feat(wallet, key) {
    return (wallet && wallet.features && wallet.features[key]) || null;
  }
  function registerStandard(wallet) {
    if (!wallet || !wallet.name) return;
    const chains = wallet.chains || [];
    if (chains.length && !chains.some((c) => String(c).startsWith("solana:"))) return;
    if (standardWallets.some((w) => w.name === wallet.name)) return;
    standardWallets.push(wallet);
  }
  function bootStandard() {
    if (window.__GRUDA_STD_BOOTED) return;
    window.__GRUDA_STD_BOOTED = true;
    try {
      window.addEventListener("wallet-standard:register-wallet", (ev) => {
        try { ev.detail.register(registerStandard); } catch (e) {}
      });
      window.dispatchEvent(new CustomEvent("wallet-standard:app-ready", { detail: { register: registerStandard } }));
    } catch (e) {}
  }
  function legacy(id) {
    const w = window;
    if (id === "phantom") return (w.phantom && w.phantom.solana) || (w.solana && w.solana.isPhantom ? w.solana : null);
    if (id === "solflare") return w.solflare || w.solflareSolana;
    if (id === "backpack") return w.backpack || (w.xnft && w.xnft.solana);
    return null;
  }
  function listProviders() {
    bootStandard();
    const out = [];
    const seen = new Set();
    standardWallets.forEach((w) => {
      const id = providerId(w.name);
      seen.add(id);
      out.push({ id: id, name: w.name, available: true, standard: w, legacy: null, install: null });
    });
    FALLBACKS.forEach((f) => {
      if (seen.has(f.id)) return;
      const leg = legacy(f.id);
      out.push({ id: f.id, name: f.name, available: Boolean(leg), standard: null, legacy: leg, install: f.install });
    });
    return out;
  }
  function renderPicker() {
    const box = $("wallet-picker");
    if (!box) return;
    const rows = listProviders();
    box.innerHTML = "";
    rows.forEach((row) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "prov";
      b.dataset.sol = row.id;
      b.textContent = row.available ? row.name : row.name + " — install";
      b.addEventListener("click", () => linkProvider(row));
      box.appendChild(b);
    });
  }
  async function connectHandle(row) {
    if (row.standard) {
      const c = feat(row.standard, "standard:connect");
      if (!c || typeof c.connect !== "function") throw new Error(row.name + " cannot connect");
      const acc = await c.connect();
      const a = acc && acc.accounts && acc.accounts[0];
      const pk = a && (a.address || a.publicKey);
      if (!pk) throw new Error("no account");
      return { address: String(pk), handle: row.standard, account: a, provider: row.id };
    }
    if (!row.legacy) {
      if (row.install) window.open(row.install, "_blank", "noopener");
      throw new Error(row.name + " is not installed");
    }
    const res = await row.legacy.connect();
    const pk = (res && res.publicKey) || row.legacy.publicKey;
    const address = pk && pk.toBase58 ? pk.toBase58() : String(pk || "");
    if (address.length < 32) throw new Error("connect failed");
    return { address: address, handle: row.legacy, account: null, provider: row.id };
  }
  async function signMessage(handle, message, account) {
    const enc = new TextEncoder().encode(message);
    const s = feat(handle, "solana:signMessage");
    if (s && typeof s.signMessage === "function") {
      const out = await s.signMessage({ account: account, message: enc });
      const row = Array.isArray(out) ? out[0] : out;
      const sig = (row && row.signature) || row;
      return typeof sig === "string" ? sig : b58encode(sig);
    }
    if (handle && handle.signMessage) {
      const out = await handle.signMessage(enc, "utf8");
      const sig = (out && out.signature) || out;
      return typeof sig === "string" ? sig : b58encode(sig);
    }
    throw new Error("wallet cannot signMessage");
  }
  async function linkProvider(row) {
    note("connect-msg", "Connecting " + row.name + "\u2026");
    try {
      if (!getTok()) {
        note("connect-msg", "Sign in with Grudge ID first. Wallet connect links; it does not log you in.", false);
        location.href = loginHref();
        return;
      }
      if (linkedCache.length >= LINK_CAP) {
        note("connect-msg", "Maximum 8 linked wallets on this Grudge ID.", false);
        return;
      }
      const conn = await connectHandle(row);
      if (conn.address === HOUSE) throw new Error("House wallet cannot be linked");
      if (vaultPubkey && conn.address === vaultPubkey) throw new Error("That key is the trader vault — it is not a browser wallet");
      if (linkedCache.some((w) => (w.walletAddress || w.address) === conn.address)) {
        note("connect-msg", "Already linked " + short(conn.address), true);
        return;
      }
      const ch = await api("/api/wallet/link/challenge", {
        method: "POST",
        body: JSON.stringify({ walletAddress: conn.address, origin: location.origin, purpose: "link" }),
      });
      if (!ch.ok || !ch.data || !ch.data.message) throw new Error((ch.data && (ch.data.error || ch.data.message)) || "SIWS challenge failed");
      const signature = await signMessage(conn.handle, ch.data.message, conn.account);
      const label = "Wallet " + (linkedCache.length + 1);
      const done = await api("/api/wallet/link/confirm", {
        method: "POST",
        body: JSON.stringify({
          walletAddress: conn.address,
          message: ch.data.message,
          signature: signature,
          provider: conn.provider,
          label: label,
        }),
      });
      if (!done.ok) throw new Error((done.data && done.data.error) || "link failed");
      note("connect-msg", "Linked " + short(conn.address) + " as " + label, true);
      await refresh();
    } catch (e) {
      note("connect-msg", e.message || String(e), false);
    }
  }
  function renderLinked(list, playAddr) {
    const box = $("linked-list");
    if (!box) return;
    const rows = Array.isArray(list) ? list.slice() : [];
    rows.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
    let html = "";
    if (!rows.length) {
      html += '<div class="row"><div class="av">1</div><div class="meta"><b>Wallet 1</b><span class="mono">Not linked</span></div><div class="bal"><span>funding</span></div></div>';
    } else {
      rows.forEach((w, i) => {
        const addr = w.walletAddress || w.address || "";
        const n = i + 1;
        const pill = w.isPrimary ? ' <span class="pill">Primary</span>' : "";
        const prov = String(w.provider || w.label || "wallet");
        html += '<div class="row">' +
          '<div class="av">' + n + "</div>" +
          '<div class="meta"><b>Wallet ' + n + pill + '</b><span class="mono">' + short(addr) + " · " + prov + "</span></div>" +
          '<div class="bal">' +
            (w.isPrimary ? "<span>funding</span>" : '<button type="button" class="tiny" data-primary="' + addr + '">Primary</button>') +
            '<button type="button" class="tiny" data-unlink="' + addr + '">Unlink</button>' +
          "</div></div>";
      });
    }
    if (walletType === "crossmint" && playAddr && !rows.some((w) => (w.walletAddress || w.address) === playAddr)) {
      html += '<div class="row"><div class="av">P</div><div class="meta"><b>Play wallet</b><span class="mono">' + short(playAddr) + " · Crossmint</span></div><div class="bal"><span>custodial</span></div></div>";
    }
    box.innerHTML = html;
    box.querySelectorAll("[data-primary]").forEach((b) => {
      b.addEventListener("click", async () => {
        try {
          const r = await api("/api/wallet/primary", { method: "POST", body: JSON.stringify({ walletAddress: b.dataset.primary }) });
          toast(r.ok ? "Primary updated" : (r.data && r.data.error) || "Could not set primary", r.ok);
          await refresh();
        } catch (e) { toast(e.message || String(e), false); }
      });
    });
    box.querySelectorAll("[data-unlink]").forEach((b) => {
      b.addEventListener("click", async () => {
        try {
          const r = await api("/api/wallet/linked/" + encodeURIComponent(b.dataset.unlink), { method: "DELETE" });
          toast(r.ok ? "Unlinked" : (r.data && r.data.error) || "Could not unlink", r.ok);
          await refresh();
        } catch (e) { toast(e.message || String(e), false); }
      });
    });
  }
  async function refresh() {
    const tok = getTok();
    if ($("btn-logout")) $("btn-logout").hidden = !tok;
    if (!tok) {
      setText("name", "Sign in");
      setText("gid", "Grudge ID");
      linkedCache = [];
      renderLinked([], "");
      return;
    }
    try {
      const me = await api("/api/auth/me");
      const d = me.data || {};
      if (d.token || d.sessionToken) storeFleetToken(d.token || d.sessionToken, d);
      setText("name", d.username || d.displayName || "Signed in");
      setText("gid", d.grudgeId || d.id || "Grudge ID");
      const bag = d.gbuxBalance != null ? d.gbuxBalance : "0";
      setText("gbux", bag);
      setText("tok-gbux", bag);
    } catch (e) { toast(e.message || String(e), false); }
    try {
      const ov = await api("/api/wallet/overview");
      const o = ov.data || {};
      linkedCache = o.linkedWallets || [];
      walletType = o.walletType || "";
      const play = o.primaryWallet || "";
      renderLinked(linkedCache, play);
      const primary = linkedCache.find((w) => w.isPrimary) || linkedCache[0];
      const addr = (primary && (primary.walletAddress || primary.address)) || "";
      if (addr) setText("w1", short(addr));
      if ($("play") && o.playGbux != null) setText("play", o.playGbux);
    } catch (e) {}
    try {
      const h = await traderApi("/api/gruda/holdings");
      const d = h.data || {};
      const sol = d.sol != null ? Number(d.sol).toFixed(4) : "0.00";
      ["fig-sol", "tr-sol", "vault-sol", "tok-sol"].forEach((id) => setText(id, sol));
      const pk = d.vault || d.tradingPubkey || d.publicKey;
      if (pk) {
        vaultPubkey = pk;
        if ($("vault-addr")) $("vault-addr").textContent = pk;
        if ($("btn-solscan")) $("btn-solscan").href = "https://solscan.io/account/" + pk;
      }
    } catch (e) {}
  }
  function bind() {
    bootStandard();
    document.querySelectorAll("[data-dock]").forEach((b) => { b.onclick = () => showPanel(b.dataset.dock); });
    document.querySelectorAll("[data-close]").forEach((b) => { b.onclick = () => showSheet(null); });
    document.querySelectorAll(".sheet").forEach((s) => { s.addEventListener("click", (e) => { if (e.target === s) showSheet(null); }); });
    if ($("act-recv")) $("act-recv").onclick = () => showSheet("sheet-recv");
    if ($("act-send")) $("act-send").onclick = () => showSheet("sheet-send");
    if ($("act-swap")) $("act-swap").onclick = () => { location.href = TRADER; };
    if ($("act-connect")) $("act-connect").onclick = () => showSheet("sheet-connect");
    if ($("act-add")) $("act-add").onclick = () => showSheet("sheet-connect");
    if ($("btn-logout")) $("btn-logout").onclick = () => {
      KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} });
      try {
        document.cookie = "grudge_auth_token=; path=/; max-age=0; Domain=.grudge-studio.com; SameSite=Lax";
        document.cookie = "sso_token=; path=/; max-age=0; Domain=.grudge-studio.com; SameSite=Lax";
      } catch (e) {}
      location.reload();
    };
    if ($("set-refresh")) $("set-refresh").onclick = () => refresh();
    if ($("btn-copy-vault")) $("btn-copy-vault").onclick = async () => {
      const v = ($("vault-addr") && $("vault-addr").textContent.trim()) || "";
      if (!v || v.indexOf("Sign in") === 0 || v.indexOf("Enable") >= 0) { note("recv-msg", "Sign in and Enable trader first.", false); return; }
      try { await navigator.clipboard.writeText(v); note("recv-msg", "Copied vault address.", true); }
      catch (e) { note("recv-msg", v, true); }
    };
    if ($("btn-enroll")) $("btn-enroll").onclick = async () => {
      if (!getTok()) { note("recv-msg", "Sign in with Grudge ID first.", false); location.href = loginHref(); return; }
      note("recv-msg", "Enabling trader vault\u2026");
      try {
        const r = await traderApi("/api/gruda/enable", { method: "POST", body: "{}" });
        note("recv-msg", r.ok ? "Vault ready. Copy the address and send SOL from Wallet 1. Keep 0.02 for fees. Buys need more than 0.03." : (r.data && (r.data.error || r.data.message)) || "Enable failed (" + r.status + ")", r.ok);
        await refresh();
      } catch (e) { note("recv-msg", e.message || String(e), false); }
    };
    if ($("btn-play")) $("btn-play").onclick = async () => {
      if (!getTok()) { note("send-msg", "Sign in with Grudge ID first.", false); location.href = loginHref(); return; }
      const amount = Math.floor(Number(($("send-amt") && $("send-amt").value) || 0));
      if (amount < 1) { note("send-msg", "Enter a GBUX amount.", false); return; }
      note("send-msg", "Sending\u2026");
      try {
        const r = await api("/api/wallet/transfer-to-play", { method: "POST", body: JSON.stringify({ amount: amount, game: "poker" }) });
        note("send-msg", r.ok ? "Sent " + amount + " GBUX to poker play." : (r.data && r.data.error) || "Send failed", r.ok);
        await refresh();
      } catch (e) { note("send-msg", e.message || String(e), false); }
    };
    renderPicker();
    refresh();
  }
  captureAuthFromUrl();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();

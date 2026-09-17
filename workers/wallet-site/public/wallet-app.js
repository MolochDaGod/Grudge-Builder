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
  const GBUX_MINT = "55TpSoMNxbfsNJ9U1dQoo9H3dRtDmjBZVMcKqvU2nray";
  const WSOL = "So11111111111111111111111111111111111111112";
  const ART = (G.art) || {
    sol: "/media/sol.png",
    gbux: "/media/gbux.png",
    id: "/media/grudge-id.png",
    play: "/media/crossmint.png",
  };
  const WALLET_GLYPH = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#e0c36a" stroke-width="1.6"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></svg>');
  const WATCH_KEY = "gruda.watch.mints";
  const DAPPS_FALLBACK = [
    { id: "trader", name: "Auto-trader", tagline: "SOL desk · rotating capital", category: "Desk", featured: true, row: "hero", href: "https://trader.grudge-studio.com", img: "https://trader.grudge-studio.com/art/fabledgrudge.jpeg", developer: "Grudge Studio", blurb: "Fund the vault from Wallet 1. Engine key, not SIWS." },
    { id: "poker", name: "BUDB Poker", tagline: "Holdem · slots · blackjack", category: "Play", row: "must", href: "https://poker.grudge-studio.com/lobby", img: "https://poker.grudge-studio.com/media/og-image.jpg", developer: "Grudge Studio", blurb: "Sit with bag GBUX from this hub." },
    { id: "poker-wallet", name: "Poker wallet", tagline: "BUDB play · fund · sit", category: "Play", row: "must", href: "https://poker.grudge-studio.com/wallet", img: "https://poker.grudge-studio.com/media/felt-budb-green.jpg", developer: "Grudge Studio", blurb: "Move GBUX onto the felt." },
    { id: "warlords", name: "Warlords", tagline: "Home island · play", category: "Play", row: "must", href: "https://client.grudge-studio.com/home", img: "https://client.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", blurb: "Hero cNFTs mint to your Crossmint play wallet." },
    { id: "grudox", name: "GRUDOX", tagline: "Arcade cabinets", category: "Play", row: "must", href: "https://grudox.grudge-studio.com", img: "https://grudox.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", blurb: "Cabinets, same Grudge ID." },
    { id: "mine", name: "Mine-Loader", tagline: "Voxel realms", category: "Play", row: "must", href: "https://mineloader.grudge-studio.com", img: "https://mineloader.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", blurb: "Voxel worlds on your ID." },
    { id: "foundry", name: "Character Foundry", tagline: "Create · 4 slots", category: "Studio", row: "studio", href: "https://character.grudge-studio.com/?era=warlords", img: "https://character.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", blurb: "Mint lands on Crossmint play — shows in cNFTs." },
    { id: "forge", name: "Forge", tagline: "Map / scene editor", category: "Studio", row: "studio", href: "https://forge.grudge-studio.com", img: "https://forge.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", blurb: "Build scenes for Warlords." },
    { id: "open", name: "Grudge Open", tagline: "Danger · library", category: "Studio", row: "studio", href: "https://open.grudge-studio.com", img: "https://open.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", blurb: "Research library, same session." },
    { id: "studio", name: "Studio portal", tagline: "grudge-studio.com", category: "Studio", row: "studio", href: "https://grudge-studio.com", img: "https://grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", blurb: "Home of the fleet." },
  ];
  const LINK_CAP = 8;
  const FALLBACKS = [
    { id: "phantom", name: "Phantom", install: "https://phantom.app" },
    { id: "solflare", name: "Solflare", install: "https://solflare.com" },
    { id: "backpack", name: "Backpack", install: "https://backpack.app" },
  ];
  const providerIcons = Object.create(null);
  function tokenLogo(mint, symbol, remote) {
    const m = String(mint || "");
    const s = String(symbol || "").toUpperCase();
    if (m === "SOL" || m === WSOL || s === "SOL") return ART.sol;
    if (m === GBUX_MINT || s === "GBUX") return ART.gbux;
    return remote || "";
  }
  function avImg(src) {
    if (src) return '<div class="av"><img src="' + esc(src) + '" alt="" onerror="this.remove()"></div>';
    return '<div class="av"></div>';
  }

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
  let playWallet = "";
  let addrs = { gid: "", play: "", w1: "", vault: "" };
  let coinOwner = "all";
  let dappCat = "all";
  let dappQuery = "";
  let dappCatalog = DAPPS_FALLBACK.slice();
  let pendingToken = null;
  let suggestTimer = 0;
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
      const h = location.hostname;
      const studio = h === "grudge-studio.com" || h.endsWith(".grudge-studio.com") || h === "grudge.studio" || h.endsWith(".grudge.studio");
      const domain = studio ? "; Domain=.grudge-studio.com" : "";
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = "grudge_auth_token=" + encodeURIComponent(token) + "; path=/; max-age=" + maxAge + domain + "; SameSite=Lax" + secure;
      document.cookie = "sso_token=" + encodeURIComponent(token) + "; path=/; max-age=" + maxAge + domain + "; SameSite=Lax" + secure;
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
  function clip7(a) {
    const s = String(a || "");
    return s.length > 7 ? s.slice(0, 7) + "\u2026" : (s || "\u2014");
  }
  function short(a) {
    const s = String(a || "");
    return s.length > 10 ? s.slice(0, 4) + "\u2026" + s.slice(-4) : s || "\u2014";
  }
  function loginHref() {
    const dest = location.origin + "/auth/callback";
    return ID_GW + "/login?redirect_uri=" + encodeURIComponent(dest) +
      "&return=" + encodeURIComponent(dest) +
      "&origin=" + encodeURIComponent(location.origin) +
      "&app=wallet&scope=identity";
  }
  function showSheet(id) {
    document.querySelectorAll(".sheet").forEach((s) => s.classList.remove("on"));
    if (id && $(id)) $(id).classList.add("on");
    if (id === "sheet-connect") renderPicker();
  }
  function showPanel(name) {
    document.querySelectorAll("[data-dock]").forEach((b) => b.classList.toggle("on", b.dataset.dock === name));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("on", p.id === "panel-" + name));
    if (name === "coins") loadCoins();
    if (name === "nfts") loadNfts();
    if (name === "dapps") renderDapps();
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
      if (w.icon) providerIcons[id] = w.icon;
      out.push({ id: id, name: w.name, available: true, standard: w, legacy: null, install: null, icon: w.icon || providerIcons[id] || "" });
    });
    FALLBACKS.forEach((f) => {
      if (seen.has(f.id)) return;
      const leg = legacy(f.id);
      out.push({ id: f.id, name: f.name, available: Boolean(leg), standard: null, legacy: leg, install: f.install, icon: providerIcons[f.id] || "" });
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
      const img = document.createElement("img");
      img.src = row.icon || WALLET_GLYPH;
      img.alt = "";
      img.width = 28;
      img.height = 28;
      img.addEventListener("error", () => { img.src = WALLET_GLYPH; });
      b.appendChild(img);
      b.appendChild(document.createTextNode(row.available ? row.name : row.name + " — install"));
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
  function walletCard(opts) {
    const addr = opts.address || "";
    const copyBtn = addr
      ? '<button type="button" class="copychip" data-copyaddr="' + esc(addr) + '" title="Copy">' + esc(clip7(addr)) + "</button>"
      : '<span class="mono">—</span>';
    const extra = opts.actions || "";
    return '<article class="card">' +
      '<div class="card-hit">' +
        avImg(opts.icon) +
        '<div class="meta"><b>' + opts.title + (opts.pill || "") + "</b>" + copyBtn + "</div>" +
        '<div class="bal">' + (opts.right || "") + extra + "</div>" +
      "</div></article>";
  }
  function bindCopyChips(root) {
    if (!root) return;
    root.querySelectorAll("[data-copyaddr]").forEach((b) => {
      b.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const v = b.getAttribute("data-copyaddr") || "";
        if (!v) return;
        try { await navigator.clipboard.writeText(v); toast("Copied " + clip7(v), true); }
        catch (err) { toast(v, true); }
      });
    });
  }
  function renderLinked(list, playAddr) {
    const box = $("linked-list");
    if (!box) return;
    const rows = Array.isArray(list) ? list.slice() : [];
    let html = "";
    if (playAddr) {
      html += walletCard({
        icon: ART.play,
        title: "Play",
        pill: ' <span class="pill">Primary</span>',
        address: playAddr,
        right: "<span>Crossmint</span>",
      });
    } else {
      html += walletCard({
        icon: ART.play,
        title: "Play",
        pill: ' <span class="pill">Primary</span>',
        address: "",
        right: "<span>sign in</span>",
      });
    }
    if (!rows.length) {
      html += walletCard({
        icon: WALLET_GLYPH,
        title: "Linked",
        address: "",
        right: "<span>none</span>",
      });
    } else {
      rows.forEach((w, i) => {
        const addr = w.walletAddress || w.address || "";
        const prov = String(w.provider || w.label || "wallet");
        const icon = providerIcons[String(prov).toLowerCase()] || WALLET_GLYPH;
        html += walletCard({
          icon: icon,
          title: "Linked " + (i + 1),
          address: addr,
          right: "<span>" + esc(prov) + "</span>",
          actions: '<button type="button" class="tiny" data-unlink="' + esc(addr) + '">Unlink</button>',
        });
      });
    }
    box.innerHTML = html;
    bindCopyChips(box);
    box.querySelectorAll("[data-unlink]").forEach((b) => {
      b.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          const r = await api("/api/wallet/linked/" + encodeURIComponent(b.dataset.unlink), { method: "DELETE" });
          toast(r.ok ? "Unlinked" : (r.data && r.data.error) || "Could not unlink", r.ok);
          await refresh();
        } catch (err) { toast(err.message || String(err), false); }
      });
    });
  }
  function fillSettings() {
    setText("set-name", ($("name") && $("name").textContent) || "Sign in");
    const gid = ($("gid") && $("gid").textContent) || "—";
    setText("set-gid", gid === "Grudge ID" ? "—" : gid);
    addrs.gid = gid && gid !== "Grudge ID" && gid !== "—" ? gid : "";
    setText("set-play", playWallet ? clip7(playWallet) : "—");
    addrs.play = playWallet || "";
    const linked = (linkedCache[0] && (linkedCache[0].walletAddress || linkedCache[0].address)) || "";
    setText("set-w1", linked ? clip7(linked) : "None");
    addrs.w1 = linked;
    setText("set-vault", vaultPubkey ? clip7(vaultPubkey) : "Not enabled");
    addrs.vault = vaultPubkey || "";
    if ($("set-logout")) $("set-logout").hidden = !getTok();
  }
  async function copyAddr(key) {
    const v = addrs[key] || "";
    if (!v) { toast("Nothing to copy", false); return; }
    try { await navigator.clipboard.writeText(v); toast("Copied", true); }
    catch (e) { toast(v, true); }
  }
  function signOut() {
    KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} });
    try {
      document.cookie = "grudge_auth_token=; path=/; max-age=0; Domain=.grudge-studio.com; SameSite=Lax";
      document.cookie = "sso_token=; path=/; max-age=0; Domain=.grudge-studio.com; SameSite=Lax";
    } catch (e) {}
    location.reload();
  }
  async function refresh() {
    const tok = getTok();
    if ($("btn-logout")) $("btn-logout").hidden = !tok;
    if ($("set-logout")) $("set-logout").hidden = !tok;
    if (!tok) {
      setText("name", "Sign in");
      setText("gid", "Grudge ID");
      linkedCache = [];
      playWallet = "";
      vaultPubkey = "";
      renderLinked([], "");
      fillSettings();
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
      walletType = o.walletType || "crossmint";
      playWallet = o.primaryWallet || o.custodialWallet || o.walletAddress || "";
      if (!playWallet) {
        try {
          const st = await api("/api/wallet/status");
          if (st.data && st.data.walletAddress) {
            playWallet = st.data.walletAddress;
            walletType = st.data.walletType || walletType;
          }
        } catch (e2) {}
      }
      renderLinked(linkedCache, playWallet);
      if ($("play") && o.playGbux != null) setText("play", o.playGbux);
    } catch (e) {}
    try {
      const h = await traderApi("/api/gruda/holdings");
      const d = h.data || {};
      const sol = d.sol != null ? Number(d.sol).toFixed(4) : "0.00";
      ["tr-sol", "vault-sol"].forEach((id) => setText(id, sol));
      const pk = d.vault || d.tradingPubkey || d.publicKey;
      if (pk) {
        vaultPubkey = pk;
        if ($("vault-addr")) $("vault-addr").textContent = pk;
        if ($("btn-solscan")) $("btn-solscan").href = "https://solscan.io/account/" + pk;
      }
    } catch (e) {}
    fillSettings();
    loadCoins();
  }
  function readWatch() {
    try {
      const raw = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter(Boolean) : [];
    } catch (e) { return []; }
  }
  function writeWatch(list) {
    try { localStorage.setItem(WATCH_KEY, JSON.stringify(list.slice(0, 40))); } catch (e) {}
  }
  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => {
      if (c === "&") return "&" + "amp;";
      if (c === "<") return "&" + "lt;";
      if (c === ">") return "&" + "gt;";
      if (c === '"') return "&" + "quot;";
      return "&#39;";
    });
  }
  function fmtAmt(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "0";
    if (Math.abs(x) >= 1000) return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (Math.abs(x) >= 1) return x.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    return x.toFixed(6).replace(/0+$/, "").replace(/\.$/, "") || "0";
  }
  function handoffUrl(base) {
    const tok = getTok();
    if (!tok) return base;
    try {
      const u = new URL(base, location.origin);
      u.hash = "sso_token=" + encodeURIComponent(tok);
      const gid = localStorage.getItem("grudge_id") || "";
      const name = localStorage.getItem("grudge_username") || "";
      if (gid) { u.searchParams.set("grudge_id", gid); u.searchParams.set("grudgeId", gid); }
      if (name) u.searchParams.set("username", name);
      return u.toString();
    } catch (e) { return base; }
  }
  async function rpc(method, params) {
    const body = JSON.stringify({ jsonrpc: "2.0", id: "gruda", method: method, params: params });
    const urls = ["/api/solana/rpc", RAILWAY + "/api/solana/rpc"];
    let last = null;
    for (const url of urls) {
      try {
        const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: body, credentials: "include" });
        const text = await r.text();
        let j = {};
        try { j = JSON.parse(text); } catch (e) { last = text.slice(0, 120); continue; }
        if (j && j.result) return j.result;
        last = (j && j.error && (j.error.message || j.error)) || ("rpc " + r.status);
      } catch (e) { last = e; }
    }
    if (method !== "searchAssets" && method.indexOf("getAsset") !== 0) {
      const r = await fetch("https://api.mainnet-beta.solana.com", { method: "POST", headers: { "content-type": "application/json" }, body: body });
      const j = await r.json();
      if (j && j.result) return j.result;
      last = (j && j.error && j.error.message) || last;
    }
    throw last || new Error("rpc failed");
  }
  async function searchTokens(q) {
    const query = String(q || "").trim();
    if (!query) return [];
    try {
      const r = await api("/api/wallet/token-meta?q=" + encodeURIComponent(query));
      if (r.ok && r.data) {
        if (Array.isArray(r.data.items) && r.data.items.length) {
          return r.data.items.filter((t) => t.mint && t.mint !== GBUX_MINT);
        }
        if (r.data.mint && r.data.mint !== GBUX_MINT) return [r.data];
      }
    } catch (e) {}
    try {
      const jr = await fetch("https://lite-api.jup.ag/tokens/v2/search?query=" + encodeURIComponent(query));
      const rows = await jr.json();
      return (Array.isArray(rows) ? rows : [])
        .filter((row) => row && row.id && row.id !== GBUX_MINT)
        .slice(0, 8)
        .map((row) => ({
          mint: row.id,
          symbol: row.symbol || "",
          name: row.name || row.symbol || "Token",
          logo: row.icon || row.logoURI || "",
          decimals: Number(row.decimals || 0),
        }));
    } catch (e) {}
    return [];
  }
  async function lookupToken(q) {
    const items = await searchTokens(q);
    if (items[0]) return items[0];
    throw new Error("Token not found on Solana");
  }
  function renderSuggest(boxId, items, onPick) {
    const box = $(boxId);
    if (!box) return;
    if (!items || !items.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML = items.map((t, i) => {
      const av = avImg(tokenLogo(t.mint, t.symbol, t.logo));
      return '<button type="button" data-idx="' + i + '">' + av +
        '<div class="meta"><b>' + esc(t.symbol || t.name) + "</b><span>" + esc(t.name || "") +
        '</span><span class="mint mono">' + esc(short(t.mint)) + "</span></div></button>";
    }).join("");
    box.querySelectorAll("button").forEach((b) => {
      b.onclick = () => {
        const t = items[Number(b.dataset.idx)];
        if (t) onPick(t);
      };
    });
  }
  function debounceSuggest(fromSheet) {
    clearTimeout(suggestTimer);
    const id = fromSheet ? "token-q" : "coin-q";
    const boxId = fromSheet ? "token-suggest" : "coin-suggest";
    const q = (($(id) && $(id).value) || "").trim();
    if (q.length < 2) {
      renderSuggest(boxId, [], null);
      return;
    }
    suggestTimer = setTimeout(async () => {
      try {
        const items = await searchTokens(q);
        renderSuggest(boxId, items, (t) => {
          pendingToken = t;
          renderSuggest(boxId, [], null);
          if (fromSheet) {
            renderTokenPreview(t);
            note("token-msg", "Found " + (t.symbol || t.name), true);
          } else {
            confirmAddToken();
          }
        });
      } catch (e) {
        renderSuggest(boxId, [], null);
      }
    }, 280);
  }
  function listOwners() {
    const out = [];
    if (playWallet && playWallet !== HOUSE) out.push({ id: "play", label: "Play", address: playWallet });
    (linkedCache || []).forEach((w, i) => {
      const addr = w.walletAddress || w.address || "";
      if (!addr || addr === HOUSE || addr === playWallet) return;
      out.push({ id: "linked", label: w.provider || w.label || ("Linked " + (i + 1)), address: addr });
    });
    if (vaultPubkey && vaultPubkey !== HOUSE) out.push({ id: "trader", label: "Trader", address: vaultPubkey });
    return out;
  }
  async function rpcBag(address) {
    const bag = { sol: 0, tokens: {} };
    if (!address || address === HOUSE) return bag;
    try {
      const solLamports = await rpc("getBalance", [address]);
      bag.sol = (solLamports && solLamports.value != null ? solLamports.value : Number(solLamports || 0)) / 1e9;
    } catch (e) {}
    try {
      const parsed = await rpc("getTokenAccountsByOwner", [
        address,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed" },
      ]);
      const accs = (parsed && parsed.value) || [];
      for (const a of accs) {
        const info = a.account && a.account.data && a.account.data.parsed && a.account.data.parsed.info;
        if (!info || !info.mint) continue;
        const tok = info.tokenAmount || {};
        bag.tokens[info.mint] = Number(tok.uiAmount || 0);
      }
    } catch (e) {}
    return bag;
  }
  function tokenRow(t) {
    const mint = t.mint || "";
    const logo = tokenLogo(mint, t.symbol, t.logo || t.logoUrl || t.image);
    const holds = Array.isArray(t.holds) ? t.holds.filter((h) => Number(h.amount) !== 0 || t.watched) : [];
    const drop = holds.map((h) =>
      '<button type="button" class="hold" data-copyaddr="' + esc(h.address) + '">' +
        '<span class="copychip">' + esc(clip7(h.address)) + "</span>" +
        "<span>" + esc(h.label) + "</span>" +
        "<b style=\"margin-left:auto\">" + fmtAmt(h.amount) + "</b></button>"
    ).join("");
    const chev = holds.length > 1 ? '<svg class="chev" viewBox="0 0 12 12"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>' : "";
    const remove = t.watched ? '<button type="button" class="tiny" data-unwatch="' + esc(mint) + '">Remove</button>' : "";
    return '<article class="card tok" data-mint="' + esc(mint) + '">' +
      '<button type="button" class="card-hit" data-toggle="1">' +
        avImg(logo) +
        '<div class="meta"><b>' + esc(t.symbol || t.name || "Token") + "</b><span>" + (holds.length > 1 ? holds.length + " wallets" : (holds[0] ? holds[0].label : "Play")) + "</span></div>" +
        '<div class="bal"><b>' + fmtAmt(t.uiAmount) + "</b>" + chev + remove + "</div>" +
      "</button>" +
      (drop ? '<div class="drop">' + drop + "</div>" : "") +
      "</article>";
  }
  function bindCoinList() {
    const box = $("coin-list");
    if (!box) return;
    bindCopyChips(box);
    box.querySelectorAll("[data-toggle]").forEach((b) => {
      b.addEventListener("click", () => {
        const card = b.closest(".card");
        if (card) card.classList.toggle("on");
      });
    });
    box.querySelectorAll("[data-unwatch]").forEach((b) => {
      b.addEventListener("click", async (e) => {
        e.stopPropagation();
        const mint = b.dataset.unwatch;
        writeWatch(readWatch().filter((m) => m !== mint));
        try { await api("/api/wallet/tokens/" + encodeURIComponent(mint), { method: "DELETE" }); } catch (err) {}
        loadCoins();
      });
    });
  }
  async function loadCoins() {
    const box = $("coin-list");
    if (!box) return;
    const watch = readWatch();
    if (!getTok()) {
      box.innerHTML = '<p class="empty">Sign in with Grudge ID to load balances, then add any Solana mint.</p>';
      return;
    }
    box.innerHTML = '<p class="empty">Reading wallets…</p>';
    const owners = listOwners().filter((o) => coinOwner === "all" || o.id === coinOwner);
    if (!owners.length) {
      box.innerHTML = '<p class="empty">No Play wallet yet. Sign in — Crossmint is created with your Grudge ID.</p>';
      return;
    }
    const bags = await Promise.all(owners.map(async (o) => {
      const bag = await rpcBag(o.address);
      return { owner: o, bag: bag };
    }));
    const byMint = Object.create(null);
    function addHold(mint, symbol, name, logo, amount, owner, extra) {
      if (!byMint[mint]) byMint[mint] = { mint: mint, symbol: symbol, name: name, logo: logo, uiAmount: 0, holds: [], watched: watch.includes(mint) };
      const row = byMint[mint];
      if (symbol && symbol.length > (row.symbol || "").length) row.symbol = symbol;
      if (name) row.name = name;
      if (logo) row.logo = logo;
      row.uiAmount += Number(amount) || 0;
      row.holds.push({ label: owner.label, address: owner.address, amount: Number(amount) || 0 });
      if (extra) Object.assign(row, extra);
    }
    bags.forEach(({ owner, bag }) => {
      addHold("SOL", "SOL", "Solana", ART.sol, bag.sol, owner, { native: true });
      Object.keys(bag.tokens).forEach((mint) => {
        const amt = bag.tokens[mint];
        const gbux = mint === GBUX_MINT;
        addHold(mint, gbux ? "GBUX" : "", gbux ? "GBUX" : "", gbux ? ART.gbux : "", amt, owner, gbux ? { feeOnly: true } : null);
      });
    });
    watch.forEach((m) => {
      if (!byMint[m]) addHold(m, short(m), "Token", "", 0, owners[0], { watched: true });
    });
    const rows = Object.keys(byMint).map((k) => byMint[k]).sort((a, b) => Number(b.uiAmount) - Number(a.uiAmount));
    const sol = byMint.SOL ? byMint.SOL.uiAmount : 0;
    setText("fig-sol", Number(sol).toFixed(4));
    setText("tok-sol", Number(sol).toFixed(4));
    box.innerHTML = rows.length ? rows.map(tokenRow).join("") : '<p class="empty">No tokens on these wallets yet.</p>';
    bindCoinList();
    const home = $("home-tokens");
    if (home) home.innerHTML = rows.slice(0, 6).map(tokenRow).join("");
    if (home) bindCopyChips(home);
  }
  function renderTokenPreview(meta) {
    pendingToken = meta;
    const box = $("token-preview");
    if (!box || !meta) return;
    box.innerHTML = '<div class="preview">' +
      avImg(tokenLogo(meta.mint, meta.symbol, meta.logo)) +
      '<div class="meta"><b>' + esc(meta.symbol || "Token") + "</b><span class=\"mono\">" + esc(meta.name || "") + " · " + esc(short(meta.mint)) + "</span></div></div>" +
      '<button class="primary" type="button" id="btn-token-add">Add to Coins</button>';
    if ($("btn-token-add")) $("btn-token-add").onclick = confirmAddToken;
  }
  async function runLookup(fromSheet) {
    const id = fromSheet ? "token-q" : "coin-q";
    const msg = fromSheet ? "token-msg" : "coin-msg";
    const q = (($(id) && $(id).value) || "").trim();
    note(msg, "Searching Jupiter…");
    try {
      const meta = await lookupToken(q);
      if (meta.mint === GBUX_MINT) { note(msg, "GBUX is already on your bag — fee / play, not a watch token.", false); return; }
      if (fromSheet) {
        renderSuggest("token-suggest", [], null);
        renderTokenPreview(meta);
        note(msg, "Found " + (meta.symbol || meta.name), true);
      } else {
        renderSuggest("coin-suggest", [], null);
        pendingToken = meta;
        await confirmAddToken();
      }
    } catch (e) { note(msg, e.message || String(e), false); }
  }
  async function confirmAddToken() {
    if (!pendingToken || !pendingToken.mint) { note("token-msg", "Look up a mint first.", false); return; }
    const mint = pendingToken.mint;
    const list = readWatch();
    if (!list.includes(mint)) { list.push(mint); writeWatch(list); }
    try {
      await api("/api/wallet/tokens", { method: "POST", body: JSON.stringify({ mint: mint }) });
    } catch (e) {}
    note("coin-msg", "Added " + (pendingToken.symbol || short(mint)), true);
    note("token-msg", "Added to Coins.", true);
    showSheet(null);
    showPanel("coins");
    loadCoins();
  }
  function paintNfts(items, ownerAddr) {
    const grid = $("nft-grid");
    if (!grid) return;
    if (ownerAddr && $("nft-empty")) {
      $("nft-empty").textContent = ownerAddr ? "Play · " + short(ownerAddr) : "Heroes and islands from Foundry show here.";
    }
    if (!items.length) {
      grid.innerHTML = '<p class="empty" style="grid-column:1/-1">No heroes yet. Mint one in Foundry.</p>';
      return;
    }
    grid.innerHTML = items.map((n) => {
      const href = n.mint ? "https://solscan.io/token/" + encodeURIComponent(n.mint) : "#";
      const img = n.imageUrl || n.image || "";
      const tag = n.compressed || n.kind === "cnft" ? "cNFT" : "NFT";
      return '<a class="nftc" href="' + esc(href) + '" target="_blank" rel="noopener">' +
        (img ? '<img src="' + esc(img) + '" alt="" onerror="this.remove()">' : "") +
        "<span>" + esc(n.name || "cNFT") + "</span>" +
        '<span class="tag">' + tag + (n.source ? " · " + esc(n.source) : "") + "</span></a>";
    }).join("");
  }
  async function loadNfts() {
    const grid = $("nft-grid");
    if (!grid) return;
    if (!getTok()) {
      grid.innerHTML = "";
      if ($("nft-empty")) $("nft-empty").textContent = "Sign in to sync cNFTs from your Crossmint play wallet.";
      return;
    }
    grid.innerHTML = '<p class="empty" style="grid-column:1/-1">Reading Crossmint play wallet…</p>';
    try {
      const r = await api("/api/wallet/nfts");
      const items = (r.data && r.data.items) || [];
      if (r.ok && (items.length || (r.data && r.data.crossmint))) {
        paintNfts(items, (r.data && r.data.crossmint) || playWallet);
        return;
      }
    } catch (e) {}
    if (playWallet && playWallet !== HOUSE) {
      try {
        const page = await rpc("searchAssets", { ownerAddress: playWallet, tokenType: "compressedNft", page: 1, limit: 50 });
        const assets = (page && page.items) || [];
        const items = assets.map((a) => {
          const meta = (a.content && a.content.metadata) || {};
          const img = (a.content && a.content.links && a.content.links.image) || "";
          return {
            mint: a.id || "",
            name: meta.name || "cNFT",
            imageUrl: img,
            compressed: true,
            kind: "cnft",
            source: "das",
          };
        });
        paintNfts(items, playWallet);
        return;
      } catch (e) {}
    }
    paintNfts([], playWallet);
  }
  function bindHandoff() {
    document.querySelectorAll("[data-handoff]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        location.href = handoffUrl(a.getAttribute("href"));
      });
    });
  }
  function renderDapps() {
    const feat = $("dapp-feat");
    const list = $("dapp-list");
    const must = $("dapp-must");
    if ($("store-today")) {
      $("store-today").textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    }
    if (!list) return;
    const q = dappQuery.toLowerCase();
    const items = dappCatalog.filter((g) => {
      if (dappCat !== "all" && g.category !== dappCat) return false;
      if (!q) return true;
      return (g.name + " " + (g.tagline || "") + " " + (g.blurb || "") + " " + (g.category || "")).toLowerCase().indexOf(q) >= 0;
    });
    const featured = items.find((g) => g.featured || g.row === "hero") || items[0];
    if (feat) {
      feat.innerHTML = featured
        ? '<a class="story" href="' + esc(featured.href) + '" data-handoff="1"><img src="' + esc(featured.img) + '" alt="" onerror="this.remove()"><span class="get">GET</span><div class="cap"><small>Featured</small><strong>' + esc(featured.name) + "</strong><em>" + esc(featured.blurb || featured.tagline || "") + "</em></div></a>"
        : "";
    }
    const mustItems = items.filter((g) => g.row === "must" || g.category === "Play");
    if (must) {
      must.innerHTML = mustItems.map((g) =>
        '<a class="iconapp" href="' + esc(g.href) + '" data-handoff="1"><img src="' + esc(g.img) + '" alt="" onerror="this.remove()"><b>' + esc(g.name) + "</b><span>" + esc(g.tagline || "") + '</span><span class="get">GET</span></a>'
      ).join("");
    }
    if ($("must-head")) $("must-head").style.display = mustItems.length ? "" : "none";
    const rest = items.filter((g) => !featured || g.id !== featured.id);
    list.innerHTML = rest.map((g) =>
      '<a class="appc" href="' + esc(g.href) + '" data-handoff="1"><img src="' + esc(g.img) + '" alt="" onerror="this.remove()"><div class="meta"><b>' + esc(g.name) + "</b><span>" + esc(g.tagline || g.category || "") + '</span><span class="dev">' + esc(g.developer || "Grudge Studio") + "</span></div><span class=\"get\">GET</span></a>"
    ).join("") || '<p class="empty">No apps in this category.</p>';
    bindHandoff();
  }
  async function loadDapps() {
    try {
      const r = await api("/api/wallet/dapps");
      if (r.ok && r.data && Array.isArray(r.data.items) && r.data.items.length) dappCatalog = r.data.items;
    } catch (e) {}
    renderDapps();
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
    if ($("btn-login")) $("btn-login").href = loginHref();
    if ($("btn-logout")) $("btn-logout").onclick = signOut;
    if ($("set-logout")) $("set-logout").onclick = signOut;
    if ($("set-copy-gid")) $("set-copy-gid").onclick = () => copyAddr("gid");
    document.querySelectorAll("[data-copy]").forEach((b) => {
      b.onclick = () => copyAddr(b.dataset.copy);
    });
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
    document.querySelectorAll("[data-owner]").forEach((b) => {
      b.onclick = () => {
        coinOwner = b.dataset.owner || "crossmint";
        document.querySelectorAll("[data-owner]").forEach((x) => x.classList.toggle("on", x === b));
        loadCoins();
      };
    });
    document.querySelectorAll("[data-cat]").forEach((b) => {
      b.onclick = () => {
        dappCat = b.dataset.cat || "all";
        document.querySelectorAll("[data-cat]").forEach((x) => x.classList.toggle("on", x === b));
        renderDapps();
      };
    });
    if ($("dapp-q")) $("dapp-q").addEventListener("input", () => { dappQuery = $("dapp-q").value || ""; renderDapps(); });
    if ($("btn-add-token")) $("btn-add-token").onclick = () => showSheet("sheet-token");
    if ($("btn-lookup")) $("btn-lookup").onclick = () => runLookup(false);
    if ($("coin-q")) {
      $("coin-q").addEventListener("keydown", (e) => { if (e.key === "Enter") runLookup(false); });
      $("coin-q").addEventListener("input", () => debounceSuggest(false));
    }
    if ($("btn-token-lookup")) $("btn-token-lookup").onclick = () => runLookup(true);
    if ($("token-q")) {
      $("token-q").addEventListener("keydown", (e) => { if (e.key === "Enter") runLookup(true); });
      $("token-q").addEventListener("input", () => debounceSuggest(true));
    }
    if ($("nft-foundry")) {
      $("nft-foundry").addEventListener("click", (e) => {
        e.preventDefault();
        location.href = handoffUrl("https://character.grudge-studio.com/?era=warlords");
      });
    }
    if ($("btn-nft-sync")) $("btn-nft-sync").onclick = async () => {
      note("nft-msg", "Syncing…");
      try {
        const r = await api("/api/wallet/nfts/sync", { method: "POST", body: "{}" });
        note("nft-msg", r.ok ? "Synced " + (((r.data && r.data.items) || []).length) : (r.data && r.data.error) || "Sync failed", r.ok);
        await loadNfts();
      } catch (e) { note("nft-msg", e.message || String(e), false); }
    };
    if ($("set-refresh")) {
      const prev = $("set-refresh").onclick;
      $("set-refresh").onclick = async () => { await refresh(); loadCoins(); loadNfts(); };
      void prev;
    }
    renderPicker();
    loadDapps();
    refresh();
  }
  captureAuthFromUrl();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();

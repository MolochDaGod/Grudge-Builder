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
  const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const THC_MINT = "BmwJNuAAjFdKMfE9sWFb1YJJReJJGHLFsENPLkhjLbuT";
  const CORE = [
    { mint: "SOL", symbol: "SOL", name: "Solana" },
    { mint: GBUX_MINT, symbol: "GBUX", name: "GBUX" },
    { mint: USDC_MINT, symbol: "USDC", name: "USD Coin" },
    { mint: THC_MINT, symbol: "THC", name: "THC Labz" },
  ];
  const ART = (G.art) || {
    sol: "/media/sol.png",
    gbux: "/media/gbux.png",
    id: "/media/grudge-id.png",
    play: "/media/play.png",
    thc: "/media/thc.png",
    usdc: "/media/usdc.png",
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
  const ADAPTER_ICON = "https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/";
  const CATALOG = [
    { id: "phantom", name: "Phantom", install: "https://phantom.app/download", easy: 1, mobile: "https://phantom.app/ul/browse/" },
    { id: "solflare", name: "Solflare", install: "https://solflare.com/download", easy: 2, mobile: "https://solflare.com/ul/v1/browse/" },
    { id: "backpack", name: "Backpack", install: "https://backpack.app/download", easy: 3 },
    { id: "trust", name: "Trust Wallet", install: "https://trustwallet.com/download", easy: 4, mobile: "https://link.trustwallet.com/open_url?coin_id=501&url=" },
    { id: "okx", name: "OKX Wallet", install: "https://www.okx.com/download", easy: 5 },
    { id: "coinbase", name: "Coinbase Wallet", install: "https://www.coinbase.com/wallet/downloads", easy: 6 },
    { id: "exodus", name: "Exodus", install: "https://www.exodus.com/download", easy: 7 },
    { id: "glow", name: "Glow", install: "https://glow.app", easy: 8 },
    { id: "magiceden", name: "Magic Eden", install: "https://wallet.magiceden.io", easy: 9 },
    { id: "nightly", name: "Nightly", install: "https://nightly.app", easy: 10 },
    { id: "bitget", name: "Bitget Wallet", install: "https://web3.bitget.com/en/wallet-download", easy: 11, iconFile: "bitkeep.svg" },
  ];
  function catalogIcon(id, file) {
    const f = file || (id === "magiceden" ? "" : id + ".svg");
    return f ? ADAPTER_ICON + f : "";
  }
  const providerIcons = Object.create(null);
  function tokenLogo(mint, symbol, remote) {
    const m = String(mint || "");
    const s = String(symbol || "").toUpperCase();
    if (m === "SOL" || m === WSOL || s === "SOL") return ART.sol;
    if (m === GBUX_MINT || s === "GBUX") return ART.gbux;
    if (m === USDC_MINT || s === "USDC") return ART.usdc || remote;
    if (m === THC_MINT || s === "THC") return ART.thc || remote;
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
  let vaultSol = "0.00";
  let walletType = "";
  let playWallet = "";
  let playBagGbux = 0;
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
    if (n.includes("trust")) return "trust";
    if (n.includes("okx")) return "okx";
    if (n.includes("coinbase")) return "coinbase";
    if (n.includes("exodus")) return "exodus";
    if (n.includes("glow")) return "glow";
    if (n.includes("magic eden") || n.includes("magiceden")) return "magiceden";
    if (n.includes("nightly")) return "nightly";
    if (n.includes("bitget") || n.includes("bitkeep")) return "bitget";
    const slug = n.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return slug || "wallet";
  }
  function isPhone() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
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
    const sheet = $("sheet-connect");
    if (sheet && sheet.classList.contains("on")) renderPicker();
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
    if (id === "trust") return (w.trustwallet && w.trustwallet.solana) || (w.solana && w.solana.isTrust ? w.solana : null);
    if (id === "okx") return (w.okxwallet && (w.okxwallet.solana || w.okxwallet)) || null;
    if (id === "coinbase") return w.coinbaseSolana || (w.coinbaseWalletExtension && w.coinbaseWalletExtension.solana) || null;
    if (id === "exodus") return w.exodus && w.exodus.solana;
    if (id === "glow") return w.glowSolana || w.glow;
    if (id === "magiceden") return w.magicEden && w.magicEden.solana;
    if (id === "nightly") return w.nightly && (w.nightly.solana || w.nightly);
    if (id === "bitget") return (w.bitkeep && w.bitkeep.solana) || (w.bitget && w.bitget.solana) || null;
    return null;
  }
  function listProviders() {
    bootStandard();
    const installed = [];
    const seen = new Set();
    standardWallets.forEach((w) => {
      const id = providerId(w.name);
      seen.add(id);
      if (w.icon) providerIcons[id] = w.icon;
      installed.push({
        id: id,
        name: w.name,
        available: true,
        standard: w,
        legacy: null,
        install: null,
        icon: w.icon || providerIcons[id] || catalogIcon(id),
      });
    });
    CATALOG.forEach((f) => {
      if (seen.has(f.id)) return;
      const leg = legacy(f.id);
      if (!leg) return;
      seen.add(f.id);
      installed.push({
        id: f.id,
        name: f.name,
        available: true,
        standard: null,
        legacy: leg,
        install: f.install,
        icon: providerIcons[f.id] || catalogIcon(f.id, f.iconFile),
      });
    });
    const install = CATALOG
      .filter((f) => !seen.has(f.id))
      .sort((a, b) => a.easy - b.easy)
      .map((f) => ({
        id: f.id,
        name: f.name,
        available: false,
        standard: null,
        legacy: null,
        install: f.install,
        mobile: f.mobile || "",
        icon: catalogIcon(f.id, f.iconFile),
        easy: f.easy,
      }));
    return { installed: installed, install: install };
  }
  function pickerButton(row, kind) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "prov" + (kind === "install" ? " install" : "");
    b.dataset.sol = row.id;
    const img = document.createElement("img");
    img.src = row.icon || WALLET_GLYPH;
    img.alt = "";
    img.width = 28;
    img.height = 28;
    img.addEventListener("error", () => { img.src = WALLET_GLYPH; });
    const meta = document.createElement("div");
    meta.className = "meta";
    const title = document.createElement("b");
    title.textContent = row.name;
    const sub = document.createElement("span");
    if (kind === "installed") sub.textContent = "Ready on this device";
    else if (isPhone() && row.mobile) sub.textContent = "Open in app";
    else sub.textContent = row.easy && row.easy <= 4 ? "Easy setup" : "Get the extension or app";
    meta.appendChild(title);
    meta.appendChild(sub);
    b.appendChild(img);
    b.appendChild(meta);
    b.addEventListener("click", () => {
      if (kind === "install") {
        if (isPhone() && row.mobile) {
          const dest = row.mobile + encodeURIComponent(location.href);
          location.href = dest;
          return;
        }
        if (row.install) window.open(row.install, "_blank", "noopener");
        note("connect-msg", "Install " + row.name + ", then come back and tap it under On this device.", true);
        return;
      }
      linkProvider(row);
    });
    return b;
  }
  function renderPicker() {
    const on = $("wallet-installed");
    const off = $("wallet-install");
    if (!on || !off) return;
    const { installed, install } = listProviders();
    on.innerHTML = "";
    off.innerHTML = "";
    if (!installed.length) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = isPhone()
        ? "No wallet in this browser. Open this page inside Phantom, Solflare, Backpack, or Trust — or install one below."
        : "No Solana wallet in this browser yet. Install one below, then return here.";
      on.appendChild(p);
    } else {
      installed.forEach((row) => on.appendChild(pickerButton(row, "installed")));
    }
    install.forEach((row) => off.appendChild(pickerButton(row, "install")));
    const wrap = $("wallet-install-wrap");
    if (wrap) wrap.open = installed.length === 0;
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
    renderTraderCard();
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
  function renderTraderCard() {
    const host = $("trader-card");
    if (!host) return;
    const addr = vaultPubkey;
    const solEl = $("vault-sol") || $("tr-sol");
    const sol = (solEl && solEl.textContent) || vaultSol || "0.00";
    host.innerHTML = walletCard({
      icon: ART.sol,
      title: "Trader",
      pill: addr ? ' <span class="pill">On</span>' : "",
      address: addr,
      right: addr
        ? "<b>" + esc(sol) + "</b><span>SOL</span>"
        : "<span>off</span>",
      actions: addr
        ? '<a class="tiny" href="' + TRADER + '" style="text-decoration:none">Open</a>'
        : '<button type="button" class="tiny" id="home-enroll">Enable</button>',
    });
    bindCopyChips(host);
    if ($("home-enroll")) $("home-enroll").onclick = () => showSheet("sheet-recv");
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
      playBagGbux = Number(bag) || 0;
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
      vaultSol = sol;
      ["tr-sol", "vault-sol"].forEach((id) => setText(id, sol));
      const pk = d.vault || d.tradingPubkey || d.publicKey;
      if (pk) {
        vaultPubkey = pk;
        if ($("vault-addr")) $("vault-addr").textContent = pk;
        if ($("btn-solscan")) $("btn-solscan").href = "https://solscan.io/account/" + pk;
      }
      renderTraderCard();
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
    const remove = t.watched && !t.core ? '<button type="button" class="tiny" data-unwatch="' + esc(mint) + '">Remove</button>' : "";
    const actions = '<button type="button" class="tiny" data-info="' + esc(mint) + '">Open</button>' +
      '<button type="button" class="tiny" data-swap="' + esc(mint) + '" data-dir="in">In</button>' +
      '<button type="button" class="tiny" data-swap="' + esc(mint) + '" data-dir="out">Out</button>';
    return '<article class="card tok" data-mint="' + esc(mint) + '">' +
      '<button type="button" class="card-hit" data-open="' + esc(mint) + '">' +
        avImg(logo) +
        '<div class="meta"><b>' + esc(t.symbol || t.name || "Token") + "</b><span>" + (holds.length > 1 ? holds.length + " wallets" : (holds[0] ? holds[0].label : "Play")) + "</span></div>" +
        '<div class="bal"><b>' + fmtAmt(t.uiAmount) + "</b>" + (holds.length > 1 ? '<span class="chev-hit" data-toggle="1">' + chev + "</span>" : chev) + "</div>" +
      "</button>" +
      '<div class="drop">' + (drop || "") + '<div class="tok-acts">' + actions + remove + "</div>" +
      '<div class="swapbox" data-swapbox="' + esc(mint) + '" hidden></div></div>' +
      "</article>";
  }
  function bindCoinList() {
    bindTokenRoot($("coin-list"));
  }
  function bindCoinListHome(root) {
    bindTokenRoot(root);
  }
  function bindTokenRoot(box) {
    if (!box) return;
    bindCopyChips(box);
    box.querySelectorAll("[data-toggle]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const card = b.closest(".card");
        if (card) card.classList.toggle("on");
      });
    });
    box.querySelectorAll("[data-open]").forEach((b) => {
      b.addEventListener("click", (e) => {
        if (e.target.closest("[data-toggle]")) return;
        openTokenDetail(b.dataset.open, "info");
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
    box.querySelectorAll("[data-info]").forEach((b) => {
      b.addEventListener("click", (e) => { e.stopPropagation(); openTokenDetail(b.dataset.info, "info"); });
    });
    box.querySelectorAll("[data-swap]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        openTokenDetail(b.dataset.swap, "swap", b.dataset.dir || "in");
      });
    });
  }
  let swapMint = USDC_MINT;
  let swapDir = "in";
  const DEC = {};
  DEC[WSOL] = 9;
  DEC.SOL = 9;
  DEC[USDC_MINT] = 6;
  DEC[GBUX_MINT] = 6;
  DEC[THC_MINT] = 6;
  function decOf(m) { return DEC[m] || DEC[mintForJup(m)] || 6; }
  function mintForJup(m) {
    if (!m || m === "SOL") return WSOL;
    return m;
  }
  function uiToRaw(ui, mint) {
    const n = Number(ui);
    if (!(n > 0)) return "0";
    const d = decOf(mint);
    const s = n.toFixed(d).replace(/\./, "");
    return s.replace(/^0+/, "") || "0";
  }
  function rawToUi(raw, mint) {
    const d = decOf(mint);
    const s = String(raw || "0");
    if (s.length <= d) return Number("0." + s.padStart(d, "0"));
    return Number(s.slice(0, s.length - d) + "." + s.slice(s.length - d));
  }
  function swapPair(mint, dir) {
    const token = mintForJup(mint);
    if (dir === "out") return { pay: token, get: WSOL, payLabel: symbolOf(mint), getLabel: "SOL" };
    if (mint === "SOL") return { pay: USDC_MINT, get: WSOL, payLabel: "USDC", getLabel: "SOL" };
    return { pay: WSOL, get: token, payLabel: "SOL", getLabel: symbolOf(mint) };
  }
  function symbolOf(mint) {
    const c = CORE.find((x) => x.mint === mint || mintForJup(x.mint) === mint);
    if (c) return c.symbol;
    if (mint === WSOL || mint === "SOL") return "SOL";
    return short(mint);
  }
  async function quoteSwap(pay, get, raw, taker) {
    const q = new URLSearchParams({
      inputMint: mintForJup(pay),
      outputMint: mintForJup(get),
      amount: raw,
      slippageBps: "100",
    });
    if (taker) q.set("taker", taker);
    let r = await fetch("/api/swap/quote?" + q).then((x) => x.json()).catch(() => null);
    if (!r || !r.outAmount) {
      r = await fetch("https://lite-api.jup.ag/swap/v2/order?" + q).then((x) => x.json()).catch(() => ({}));
      if (r.outAmount) r = { ok: true, inAmount: r.inAmount, outAmount: r.outAmount, requestId: r.requestId, transaction: r.transaction, slippageBps: r.slippageBps };
    }
    return r || {};
  }
  async function signLinkedTx(address, txB64) {
    const providers = listProviders();
    const installed = providers.installed || [];
    let conn = null;
    for (const row of installed) {
      try {
        const c = await connectHandle(row);
        if (c.address === address) { conn = c; break; }
      } catch (e) {}
    }
    if (!conn) throw new Error("Connect the wallet that holds this bag");
    const raw = Uint8Array.from(atob(txB64), (ch) => ch.charCodeAt(0));
    const s = feat(conn.handle, "solana:signTransaction");
    if (s && typeof s.signTransaction === "function") {
      const out = await s.signTransaction({ account: conn.account, transaction: raw });
      const signed = Array.isArray(out) ? (out[0].signedTransaction || out[0]) : (out.signedTransaction || out);
      const bytes = signed instanceof Uint8Array ? signed : new Uint8Array(signed);
      let bin = "";
      bytes.forEach((b) => { bin += String.fromCharCode(b); });
      return btoa(bin);
    }
    if (conn.handle && typeof conn.handle.signTransaction === "function") {
      throw new Error("Open this wallet's in-app browser, or use a Wallet Standard wallet (Phantom, Solflare, Backpack, Trust)");
    }
    throw new Error("This wallet cannot sign a swap");
  }
  function fillSwapBox(box, mint, dir) {
    if (!box) return;
    const pair = swapPair(mint, dir);
    const owners = listOwners().filter((o) => o.id !== "trader");
    const payLogo = tokenLogo(pair.pay === WSOL ? "SOL" : pair.pay, pair.payLabel);
    const getLogo = tokenLogo(pair.get === WSOL ? "SOL" : pair.get, pair.getLabel);
    box.hidden = false;
    box.innerHTML =
      '<div class="chips">' +
        '<button type="button" class="chip' + (dir === "in" ? " on" : "") + '" data-swdir="in">In · buy</button>' +
        '<button type="button" class="chip' + (dir === "out" ? " on" : "") + '" data-swdir="out">Out · sell</button>' +
      "</div>" +
      '<label>From</label>' +
      '<select class="input sw-owner">' +
        (owners.map((o) => '<option value="' + esc(o.address) + '" data-kind="' + esc(o.id) + '">' + esc(o.label) + " · " + esc(clip7(o.address)) + "</option>").join("") || "<option>Sign in</option>") +
      "</select>" +
      '<div class="sw-row">' + avImg(payLogo) + '<input class="sw-amt" type="number" min="0" step="any" placeholder="0" /><span>' + esc(pair.payLabel) + '</span><button type="button" class="tiny sw-max">Max</button></div>' +
      '<div class="sw-row">' + avImg(getLogo) + '<b class="sw-out">—</b><span>' + esc(pair.getLabel) + "</span></div>" +
      '<p class="hint sw-rate">Quote appears as you type.</p>' +
      '<button type="button" class="primary sw-go">Swap</button>' +
      '<p class="msg sw-msg"></p>';
    const amtEl = box.querySelector(".sw-amt");
    const outEl = box.querySelector(".sw-out");
    const rateEl = box.querySelector(".sw-rate");
    const msgEl = box.querySelector(".sw-msg");
    const ownerEl = box.querySelector(".sw-owner");
    const goEl = box.querySelector(".sw-go");
    let timer = 0;
    let last = null;
    const say = (t, ok) => { if (msgEl) { msgEl.textContent = t || ""; msgEl.className = "msg" + (ok === true ? " ok" : ok === false ? " err" : ""); } };
    async function refreshQuote() {
      const raw = uiToRaw(amtEl.value, pair.pay);
      if (raw === "0") { outEl.textContent = "—"; last = null; return; }
      say("Quoting…");
      const q = await quoteSwap(pair.pay, pair.get, raw, ownerEl.value);
      if (!q.outAmount) { say(q.error || "No route", false); last = null; outEl.textContent = "—"; return; }
      last = q;
      const got = rawToUi(q.outAmount, pair.get);
      outEl.textContent = fmtAmt(got);
      rateEl.textContent = fmtAmt(amtEl.value) + " " + pair.payLabel + " → " + fmtAmt(got) + " " + pair.getLabel;
      say("");
    }
    amtEl.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(refreshQuote, 280); });
    box.querySelectorAll("[data-swdir]").forEach((b) => {
      b.onclick = () => openTokenSwap(mint, b.dataset.swdir);
    });
    const maxBtn = box.querySelector(".sw-max");
    if (maxBtn) maxBtn.onclick = () => {
      const addr = ownerEl.value;
      const t = pendingToken; // unused
      const card = box.closest(".tok");
      const holds = (card && window.__coinRows && window.__coinRows[mint] && window.__coinRows[mint].holds) || [];
      const payMint = pair.pay === WSOL ? "SOL" : pair.pay;
      const row = window.__coinRows && window.__coinRows[payMint];
      const hit = ((row && row.holds) || holds).find((h) => h.address === addr);
      const bal = hit ? hit.amount : 0;
      amtEl.value = String(bal || "");
      refreshQuote();
    };
    goEl.onclick = async () => {
      const raw = uiToRaw(amtEl.value, pair.pay);
      if (raw === "0") { say("Enter an amount", false); return; }
      const opt = ownerEl.options[ownerEl.selectedIndex];
      const kind = opt && opt.dataset.kind;
      const taker = ownerEl.value;
      if (!taker || taker.length < 32) { say("No wallet", false); return; }
      if (kind === "trader") { say("Trader swaps on trader.grudge-studio.com", false); return; }
      goEl.disabled = true;
      say("Swapping…");
      try {
        if (kind === "play") {
          const r = await api("/api/wallet/swap", {
            method: "POST",
            body: JSON.stringify({
              inputMint: mintForJup(pair.pay),
              outputMint: mintForJup(pair.get),
              amount: raw,
              slippageBps: 100,
            }),
          });
          if (!r.ok) throw new Error((r.data && (r.data.error || r.data.message)) || "Play swap failed");
          say("Done " + short((r.data && (r.data.signature || r.data.swapTx)) || ""), true);
          loadCoins();
          return;
        }
        const q = await quoteSwap(pair.pay, pair.get, raw, taker);
        if (!q.transaction) throw new Error(q.error || "No unsigned swap — connect that wallet");
        const signed = await signLinkedTx(taker, q.transaction);
        const ex = await fetch("/api/swap/execute", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ signedTransaction: signed, requestId: q.requestId }),
        }).then((x) => x.json());
        if (!ex.ok && !ex.signature) throw new Error(ex.error || "execute failed");
        say("Done " + short(ex.signature), true);
        loadCoins();
      } catch (e) {
        say(e.message || String(e), false);
      } finally {
        goEl.disabled = false;
      }
    };
  }
  function openTokenSwap(mint, dir) {
    swapMint = mint || USDC_MINT;
    swapDir = dir === "out" ? "out" : "in";
    const card = document.querySelector('.tok[data-mint="' + (window.CSS && CSS.escape ? CSS.escape(swapMint) : swapMint) + '"]');
    const box = card && card.querySelector("[data-swapbox]");
    if (card && box) {
      document.querySelectorAll(".card.tok.on").forEach((c) => { if (c !== card) c.classList.remove("on"); });
      card.classList.add("on");
      document.querySelectorAll("[data-swapbox]").forEach((el) => { if (el !== box) { el.hidden = true; el.innerHTML = ""; } });
      fillSwapBox(box, swapMint, swapDir);
      showSheet(null);
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    const sheetBox = $("sheet-swap-box");
    fillSwapBox(sheetBox, swapMint, swapDir);
    showSheet("sheet-swap");
  }
  async function dexFor(mint) {
    const m = mintForJup(mint);
    let pairs = [];
    try {
      const data = await fetch("/api/token/dex?mint=" + encodeURIComponent(m)).then((r) => r.json());
      pairs = Array.isArray(data && data.pairs) ? data.pairs : (Array.isArray(data) ? data : []);
    } catch (e) {}
    if (!pairs.length) {
      try {
        const data = await fetch("https://api.dexscreener.com/token-pairs/v1/solana/" + encodeURIComponent(m)).then((r) => r.json());
        pairs = Array.isArray(data) ? data : (data.pairs || []);
      } catch (e2) {}
    }
    pairs = pairs.filter((p) => p && (p.chainId === "solana" || !p.chainId));
    const quoteRank = (p) => {
      const q = ((p.quoteToken && p.quoteToken.symbol) || "").toUpperCase();
      if (q === "SOL" || q === "WSOL") return 3;
      if (q === "USDC" || q === "USDT") return 2;
      return 1;
    };
    pairs.sort((a, b) => {
      const lq = Number((b.liquidity && b.liquidity.usd) || 0) - Number((a.liquidity && a.liquidity.usd) || 0);
      if (lq) return lq;
      return quoteRank(b) - quoteRank(a);
    });
    return { pair: pairs[0] || null, pairs: pairs };
  }
  function fmtUsd(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "—";
    if (x >= 1e9) return "$" + (x / 1e9).toFixed(2) + "B";
    if (x >= 1e6) return "$" + (x / 1e6).toFixed(2) + "M";
    if (x >= 1e3) return "$" + (x / 1e3).toFixed(1) + "k";
    if (x >= 1) return "$" + x.toFixed(4);
    return "$" + x.toPrecision(3);
  }
  function tokenUses(mint) {
    const out = [];
    if (mint === "SOL" || mint === WSOL) {
      out.push({ href: TRADER, name: "Auto-trader", blurb: "Fund the vault with SOL" });
    }
    if (mint === GBUX_MINT) {
      out.push({ href: POKER + "/lobby", name: "BUDB Poker", blurb: "Sit with bag GBUX" });
      out.push({ href: POKER + "/wallet", name: "Poker wallet", blurb: "Move GBUX onto the felt" });
      out.push({ href: TRADER, name: "Trader fee", blurb: "Desk fee is GBUX" });
    }
    if (mint === THC_MINT) {
      out.push({ href: POKER + "/lobby", name: "THC Labz play", blurb: "Same Grudge ID · Budz bag" });
    }
    if (mint === USDC_MINT) {
      out.push({ href: "#swap", name: "Swap", blurb: "USDC in or out of this wallet" });
    }
    return out;
  }
  let tokMint = USDC_MINT;
  let tokTab = "info";
  let tokDir = "in";
  async function openTokenDetail(mint, tab, dir) {
    tokMint = mint || USDC_MINT;
    tokTab = tab || "info";
    if (dir) tokDir = dir;
    const page = $("tok-page") || $("info-body");
    if (!page) { openTokenSwap(tokMint, tokDir); return; }
    showSheet("sheet-info");
    if (page.dataset.mint === tokMint && window.__tokDex && page.querySelector("#tok-pane")) {
      page.querySelectorAll("[data-toktab]").forEach((b) => b.classList.toggle("on", b.dataset.toktab === tokTab));
      paintTokPane(page.querySelector("#tok-pane"), window.__tokDex.meta, window.__tokDex.pair, window.__tokDex.dex);
      return;
    }
    const core = CORE.find((c) => c.mint === tokMint) || {};
    page.innerHTML = "<p>Loading…</p>";
    let meta = { symbol: core.symbol || short(tokMint), name: core.name || "", logo: tokenLogo(tokMint, core.symbol) };
    try {
      if (tokMint !== "SOL") {
        const extra = await lookupToken(tokMint);
        if (extra) meta = Object.assign(meta, extra);
      }
    } catch (e) {}
    const dex = tokMint === "BUDZ" ? { pair: null } : await dexFor(tokMint);
    const pair = dex.pair;
    const price = pair ? pair.priceUsd : null;
    const chg = pair && pair.priceChange ? pair.priceChange.h24 : null;
    const logo = tokenLogo(tokMint, meta.symbol, meta.logo || meta.logoURI);
    const tabs = ["info", "swap", "graph", "news"];
    const labels = { info: "Info", swap: "Swap", graph: "Graph", news: "News" };
    const chgTxt = chg == null ? "" : ((Number(chg) >= 0 ? "+" : "") + Number(chg).toFixed(2) + "% 24h");
    page.dataset.mint = tokMint;
    window.__tokDex = { meta: meta, pair: pair, dex: dex };
    page.innerHTML =
      '<div class="tok-head">' + avImg(logo) +
        '<div class="meta"><b>' + esc(meta.symbol || "Token") + "</b><span>" + esc(meta.name || "") + "</span></div>" +
        '<div class="tok-price"><b>' + (price ? fmtUsd(price) : "—") + "</b><span>" + esc(chgTxt) + "</span></div></div>" +
      '<div class="tok-tabs">' + tabs.map((t) =>
        '<button type="button" class="' + (t === tokTab ? "on" : "") + '" data-toktab="' + t + '">' + labels[t] + "</button>"
      ).join("") + "</div>" +
      '<div id="tok-pane"></div>';
    page.querySelectorAll("[data-toktab]").forEach((b) => {
      b.onclick = () => openTokenDetail(tokMint, b.dataset.toktab, tokDir);
    });
    paintTokPane(page.querySelector("#tok-pane"), meta, pair, dex);
  }
  function paintTokPane(pane, meta, pair, dex) {
    if (!pane) return;
    const mint = tokMint;
    const jupMint = mintForJup(mint);
    if (tokTab === "swap") {
      pane.innerHTML = '<div class="swapbox" id="tok-swapbox"></div>';
      fillSwapBox(pane.querySelector("#tok-swapbox"), mint, tokDir);
      return;
    }
    if (tokTab === "graph") {
      const pairAddr = pair && pair.pairAddress;
      if (!pairAddr && mint !== "BUDZ") {
        pane.innerHTML = "<p>No Dexscreener pool indexed for this mint yet. Chart appears after a SOL/USDC pair exists.</p>";
        return;
      }
      const srcMint = pairAddr || mintForJup(mint);
      const src = "https://dexscreener.com/solana/" + encodeURIComponent(srcMint) + "?embed=1&theme=dark&trades=0&info=0";
      pane.innerHTML =
        (mint === "BUDZ"
          ? "<p>Budz is off-chain play GBUX. No on-chain chart.</p>"
          : '<iframe class="chartframe" title="Dexscreener" src="' + src + '" loading="lazy" referrerpolicy="no-referrer"></iframe>') +
        '<a class="ghost btn" href="https://dexscreener.com/solana/' + encodeURIComponent(srcMint) + '" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin-top:8px">Open Dexscreener</a>';
      return;
    }
    if (tokTab === "news") {
      const info = (pair && pair.info) || {};
      const sites = Array.isArray(info.websites) ? info.websites : [];
      const socials = Array.isArray(info.socials) ? info.socials : [];
      const links = [];
      sites.forEach((w) => { if (w && w.url) links.push({ label: w.label || "Site", href: w.url }); });
      socials.forEach((s) => { if (s && s.url) links.push({ label: s.type || "Social", href: s.url }); });
      if (mint !== "SOL" && mint !== "BUDZ") {
        links.push({ label: "X search", href: "https://x.com/search?q=" + encodeURIComponent(jupMint) });
        links.push({ label: "Dexscreener", href: "https://dexscreener.com/solana/" + encodeURIComponent((pair && pair.pairAddress) || jupMint) });
      }
      if (!links.length) {
        pane.innerHTML = "<p>No project links indexed for this mint. We do not invent headlines.</p>";
        return;
      }
      pane.innerHTML = "<p class=\"hint\">From Dexscreener token profile. Not made-up news.</p>" +
        links.map((l) =>
          '<a class="use-row" href="' + esc(l.href) + '" target="_blank" rel="noopener"><div class="meta"><b>' + esc(l.label) + "</b><span>" + esc(l.href) + "</span></div></a>"
        ).join("");
      return;
    }
    const liq = pair && pair.liquidity ? pair.liquidity.usd : null;
    const vol = pair && pair.volume ? pair.volume.h24 : null;
    const fdv = pair && pair.fdv;
    const uses = tokenUses(mint);
    const holds = (window.__coinRows && window.__coinRows[mint] && window.__coinRows[mint].holds) || [];
    pane.innerHTML =
      (mint !== "SOL" && mint !== "BUDZ"
        ? '<button type="button" class="copymint" data-copyaddr="' + esc(jupMint) + '">' + esc(jupMint) + "</button>"
        : mint === "SOL" ? "<p>Native SOL.</p>" : "<p>Budz play GBUX is the off-chain bag (poker + THC Labz). Not a mint.</p>") +
      '<div class="statg">' +
        "<div><span>Liquidity</span><b>" + (liq != null ? fmtUsd(liq) : "—") + "</b></div>" +
        "<div><span>Volume 24h</span><b>" + (vol != null ? fmtUsd(vol) : "—") + "</b></div>" +
        "<div><span>FDV</span><b>" + (fdv != null ? fmtUsd(fdv) : "—") + "</b></div>" +
        "<div><span>DEX</span><b>" + esc((pair && pair.dexId) || "—") + "</b></div></div>" +
      (holds.length
        ? "<p class=\"hint\">Your bags</p>" + holds.map((h) =>
          '<button type="button" class="hold" data-copyaddr="' + esc(h.address) + '"><span class="copychip">' + esc(clip7(h.address)) + "</span><span>" + esc(h.label) + "</span><b style=\"margin-left:auto\">" + fmtAmt(h.amount) + "</b></button>"
        ).join("")
        : "") +
      (uses.length ? "<p class=\"hint\">Use in Grudge</p>" + uses.map((u) =>
        u.href === "#swap"
          ? '<button type="button" class="use-row" data-useswap="1"><div class="meta"><b>' + esc(u.name) + "</b><span>" + esc(u.blurb) + "</span></div></button>"
          : '<a class="use-row" href="' + esc(u.href) + '"><div class="meta"><b>' + esc(u.name) + "</b><span>" + esc(u.blurb) + "</span></div></a>"
      ).join("") : "") +
      (mint !== "BUDZ"
        ? '<a class="ghost btn" href="https://solscan.io/' + (mint === "SOL" ? "" : "token/" + encodeURIComponent(jupMint)) + '" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin-top:8px">Solscan</a>'
        : "");
    bindCopyChips(pane);
    const sw = pane.querySelector("[data-useswap]");
    if (sw) sw.onclick = () => openTokenDetail(mint, "swap", "in");
  }
  async function openTokenInfo(mint) {
    return openTokenDetail(mint, "info");
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
        const thc = mint === THC_MINT;
        const usdc = mint === USDC_MINT;
        addHold(mint, gbux ? "GBUX" : thc ? "THC" : usdc ? "USDC" : "", gbux ? "GBUX" : thc ? "THC Labz" : usdc ? "USD Coin" : "", tokenLogo(mint), amt, owner, gbux ? { feeOnly: true } : { core: gbux || thc || usdc });
      });
    });
    watch.forEach((m) => {
      if (!byMint[m]) addHold(m, short(m), "Token", "", 0, owners[0], { watched: true });
    });
    CORE.forEach((c) => {
      if (!byMint[c.mint]) addHold(c.mint, c.symbol, c.name, tokenLogo(c.mint, c.symbol), 0, owners[0] || { label: "Play", address: playWallet }, { core: true });
      else {
        byMint[c.mint].core = true;
        byMint[c.mint].symbol = c.symbol;
        byMint[c.mint].name = c.name;
        byMint[c.mint].logo = tokenLogo(c.mint, c.symbol, byMint[c.mint].logo);
      }
    });
    if (playBagGbux) {
      addHold(GBUX_MINT, "GBUX", "GBUX", ART.gbux, Number(playBagGbux) || 0, { label: "Budz play", address: playWallet || "play-bag" }, { bag: playBagGbux });
    }
    const rows = Object.keys(byMint).map((k) => byMint[k]).sort((a, b) => Number(b.uiAmount) - Number(a.uiAmount));
    window.__coinRows = byMint;
    const sol = byMint.SOL ? byMint.SOL.uiAmount : 0;
    setText("fig-sol", Number(sol).toFixed(4));
    setText("tok-sol", Number(sol).toFixed(4));
    box.innerHTML = rows.length ? rows.map(tokenRow).join("") : '<p class="empty">No tokens on these wallets yet.</p>';
    bindCoinList();
    const home = $("home-tokens");
    if (home) {
      home.innerHTML = rows.slice(0, 6).map(tokenRow).join("");
      bindCoinListHome(home);
    }
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
  let nftFilter = "all";
  let nftCache = [];
  function classifyNft(n) {
    const blob = [n.name, n.collectionName, n.collection, n.era, n.kind, n.project]
      .filter(Boolean).join(" ").toLowerCase();
    if (n.project && n.project !== "other") return { project: n.project, label: n.collectionName || n.project, access: Boolean(n.access) };
    if (/nemesis|nexus card|season 0/.test(blob) || n.era === "nexus") return { project: "nemesis", label: "Nexus Nemesis", access: false };
    if (/grudox|voxel/.test(blob) || n.era === "voxel") return { project: "voxel", label: "Voxel", access: false };
    if (/armada|\bmech\b/.test(blob) || n.era === "armada") return { project: "armada", label: "Armada", access: false };
    if (/island|find land/.test(blob) || n.kind === "island") return { project: "island", label: "Home island", access: false };
    if (/warlord|grudge6/.test(blob) || n.era === "warlords") return { project: "warlords", label: "Warlords", access: false };
    if (/grower/.test(blob)) return { project: "growerz", label: "THC Growerz", access: true };
    if (/bad seed/.test(blob)) return { project: "badseeds", label: "Bad Seeds", access: true };
    if (/kronic|thc labz|zalez/.test(blob)) return { project: "thc", label: "THC Labz", access: true };
    return { project: n.project || "other", label: n.collectionName || "Other", access: Boolean(n.access) };
  }
  function nftGroup(p) {
    if (p === "island") return "island";
    if (p === "nemesis") return "nemesis";
    if (p === "growerz" || p === "badseeds" || p === "thc") return "access";
    if (p === "warlords" || p === "voxel" || p === "armada") return "characters";
    return "other";
  }
  function paintNfts(items, ownerAddr) {
    const grid = $("nft-grid");
    if (!grid) return;
    nftCache = Array.isArray(items) ? items : [];
    if ($("nft-empty")) {
      $("nft-empty").textContent = ownerAddr
        ? "Play · " + short(ownerAddr) + " · " + nftCache.length + " NFTs"
        : "Play + linked wallets. Characters, islands, Nemesis, Growerz, Bad Seeds.";
    }
    const shown = nftCache.filter((n) => {
      const c = classifyNft(n);
      n.project = c.project;
      n.access = c.access;
      n.collectionName = n.collectionName || c.label;
      if (nftFilter === "all") return true;
      return nftGroup(c.project) === nftFilter || c.project === nftFilter;
    });
    if (!shown.length) {
      grid.innerHTML = '<p class="empty" style="grid-column:1/-1">' +
        (nftCache.length ? "Nothing in this filter." : "No NFTs on Play or linked wallets yet.") +
        "</p>";
      return;
    }
    grid.innerHTML = shown.map((n) => {
      const href = n.mint ? "https://solscan.io/token/" + encodeURIComponent(n.mint) : "#";
      const img = n.imageUrl || n.image || "";
      const tag = n.compressed || n.kind === "cnft" ? "cNFT" : "NFT";
      const c = classifyNft(n);
      const bag = n.ownerKind === "linked" ? "linked" : "play";
      return '<a class="nftc" href="' + esc(href) + '" target="_blank" rel="noopener">' +
        (img ? '<img src="' + esc(img) + '" alt="" onerror="this.remove()">' : "") +
        "<span>" + esc(n.name || c.label) + "</span>" +
        '<span class="tag">' + esc(c.label) + " · " + tag + " · " + bag + "</span></a>";
    }).join("");
  }
  async function dasNftsFor(addr) {
    if (!addr || addr === HOUSE) return [];
    const out = [];
    for (const tokenType of ["compressedNft", "regularNft"]) {
      try {
        const page = await rpc("searchAssets", { ownerAddress: addr, tokenType: tokenType, page: 1, limit: 50 });
        const assets = (page && page.items) || [];
        assets.forEach((a) => {
          const meta = (a.content && a.content.metadata) || {};
          const img = (a.content && a.content.links && a.content.links.image) || "";
          const collection = ((a.grouping || []).find((g) => g.group_key === "collection") || {}).group_value || "";
          out.push({
            mint: a.id || "",
            name: meta.name || "NFT",
            imageUrl: img,
            compressed: Boolean(a.compression && a.compression.compressed),
            kind: a.compression && a.compression.compressed ? "cnft" : "nft",
            source: "das",
            collection: collection,
            collectionName: (meta.collection && meta.collection.name) || "",
            ownerWallet: addr,
            ownerKind: addr === playWallet ? "crossmint" : "linked",
          });
        });
      } catch (e) {}
    }
    return out;
  }
  async function loadNfts() {
    const grid = $("nft-grid");
    if (!grid) return;
    if (!getTok()) {
      grid.innerHTML = "";
      if ($("nft-empty")) $("nft-empty").textContent = "Sign in to sync NFTs from Play and linked wallets.";
      return;
    }
    grid.innerHTML = '<p class="empty" style="grid-column:1/-1">Reading Play + linked wallets…</p>';
    let items = [];
    let owner = playWallet;
    try {
      const r = await api("/api/wallet/nfts");
      items = (r.data && r.data.items) || [];
      owner = (r.data && r.data.crossmint) || playWallet;
    } catch (e) {}
    if (!items.length) {
      const addrs = listOwners().map((o) => o.address);
      const bags = await Promise.all(addrs.map(dasNftsFor));
      const seen = Object.create(null);
      bags.flat().forEach((n) => {
        if (!n.mint || seen[n.mint]) return;
        seen[n.mint] = 1;
        items.push(n);
      });
    }
    paintNfts(items, owner);
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
    if ($("act-swap")) $("act-swap").onclick = () => openTokenDetail(USDC_MINT, "swap", "in");
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
    document.querySelectorAll("[data-nft]").forEach((b) => {
      b.onclick = () => {
        nftFilter = b.dataset.nft || "all";
        document.querySelectorAll("[data-nft]").forEach((x) => x.classList.toggle("on", x === b));
        paintNfts(nftCache, playWallet);
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

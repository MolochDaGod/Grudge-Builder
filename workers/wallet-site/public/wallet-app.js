const RAILWAY = (window.GRUDA && window.GRUDA.railway) || "https://grudge-api-production-0d46.up.railway.app";
const TRADER = (window.GRUDA && window.GRUDA.trader) || "https://trader.grudge-studio.com";
const KEYS = ["grudge.open.token","grudge_auth_token","grudge_session_token","grudge.token","sso_token","grudge_token","access_token"];
const $ = (id) => document.getElementById(id);
function toast(text, ok) {
  const el = $("toast");
  if (!el) return;
  el.textContent = text || "";
  el.className = "msg" + (ok === true ? " ok" : ok === false ? " err" : "");
}
function getTok() {
  try {
    for (const k of KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
  } catch (e) {}
  const m = document.cookie.match(/(?:^|;\s*)grudge_auth_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}
function setTok(t, extra) {
  if (!t) return;
  try {
    localStorage.setItem("grudge_auth_token", t);
    if (extra && extra.grudgeId) localStorage.setItem("grudge_id", extra.grudgeId);
    if (extra && extra.username) localStorage.setItem("grudge_username", extra.username);
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
function provider(id) {
  const w = window;
  if (id === "phantom") return (w.phantom && w.phantom.solana) || (w.solana && w.solana.isPhantom ? w.solana : null);
  if (id === "solflare") return w.solflare || w.solflareSolana;
  if (id === "backpack") return w.backpack || (w.xnft && w.xnft.solana);
  return null;
}
function showSheet(id) {
  document.querySelectorAll(".sheet").forEach((s) => s.classList.remove("on"));
  if (id && $(id)) $(id).classList.add("on");
}
function showPanel(name) {
  document.querySelectorAll("[data-dock]").forEach((b) => b.classList.toggle("on", b.dataset.dock === name));
  document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("on", p.id === "panel-" + name));
}
function short(a) {
  const s = String(a || "");
  return s.length > 10 ? s.slice(0, 4) + "\u2026" + s.slice(-4) : s || "\u2014";
}
function onReady() {
  if (!$("act-recv")) return setTimeout(onReady, 20);
  document.querySelectorAll("[data-dock]").forEach((b) => { b.onclick = () => showPanel(b.dataset.dock); });
  document.querySelectorAll("[data-close]").forEach((b) => { b.onclick = () => showSheet(null); });
  document.querySelectorAll(".sheet").forEach((s) => {
    s.addEventListener("click", (e) => { if (e.target === s) showSheet(null); });
  });
  $("act-recv").onclick = () => showSheet("sheet-recv");
  $("act-send").onclick = () => showSheet("sheet-send");
  $("act-swap").onclick = () => { location.href = TRADER; };
  $("act-connect").onclick = () => showSheet("sheet-connect");
  if ($("act-add")) $("act-add").onclick = () => showSheet("sheet-connect");
  if ($("btn-logout")) $("btn-logout").onclick = () => {
    KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} });
    location.reload();
  };
  if ($("set-refresh")) $("set-refresh").onclick = () => refresh();
  if ($("btn-copy-vault")) $("btn-copy-vault").onclick = async () => {
    const v = $("vault-addr").textContent.trim();
    if (!v || v.indexOf("Sign in") === 0) { $("recv-msg").textContent = "Enable first."; return; }
    try { await navigator.clipboard.writeText(v); $("recv-msg").textContent = "Copied."; $("recv-msg").className = "msg ok"; }
    catch (e) { $("recv-msg").textContent = v; }
  };
  if ($("btn-enroll")) $("btn-enroll").onclick = async () => {
    $("recv-msg").textContent = "Enabling\u2026";
    try {
      const r = await traderApi("/api/gruda/enable", { method: "POST", body: "{}" });
      $("recv-msg").textContent = r.ok ? "Vault ready. Copy the address and send SOL from Wallet 1." : ((r.data && r.data.error) || "Enable failed");
      $("recv-msg").className = r.ok ? "msg ok" : "msg err";
      await refresh();
    } catch (e) {
      $("recv-msg").textContent = e.message || String(e);
      $("recv-msg").className = "msg err";
    }
  };
  if ($("btn-play")) $("btn-play").onclick = async () => {
    const amount = Math.floor(Number($("send-amt").value) || 0);
    $("send-msg").textContent = "Sending\u2026";
    try {
      const r = await api("/api/wallet/transfer-to-play", {
        method: "POST",
        body: JSON.stringify({ amount: amount, game: "poker" }),
      });
      $("send-msg").textContent = r.ok ? "Sent " + amount + " GBUX to play." : ((r.data && r.data.error) || "Send failed");
      $("send-msg").className = r.ok ? "msg ok" : "msg err";
      await refresh();
    } catch (e) {
      $("send-msg").textContent = e.message || String(e);
      $("send-msg").className = "msg err";
    }
  };
  document.querySelectorAll("[data-sol]").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.sol;
      const msg = $("connect-msg");
      msg.textContent = "Connecting " + id + "\u2026";
      try {
        if (!getTok()) { msg.textContent = "Sign in with Grudge ID first."; return; }
        const p = provider(id);
        if (!p) { msg.textContent = id + " is not installed."; return; }
        const res = await p.connect();
        const pk = res && res.publicKey ? res.publicKey : p.publicKey;
        const address = pk && pk.toBase58 ? pk.toBase58() : String(pk || "");
        if (address.length < 32) throw new Error("no address");
        const ch = await api("/api/wallet/link/challenge", {
          method: "POST",
          body: JSON.stringify({ walletAddress: address, origin: location.origin }),
        });
        if (!ch.ok || !ch.data || !ch.data.message) throw new Error((ch.data && ch.data.error) || "challenge failed");
        const signed = await p.signMessage(new TextEncoder().encode(ch.data.message), "utf8");
        const sig = signed && signed.signature ? signed.signature : signed;
        const b58 = typeof sig === "string" ? sig : b58encode(sig);
        const done = await api("/api/wallet/link/confirm", {
          method: "POST",
          body: JSON.stringify({ walletAddress: address, message: ch.data.message, signature: b58, provider: id, label: id }),
        });
        if (!done.ok) throw new Error((done.data && done.data.error) || "link failed");
        msg.textContent = "Linked " + short(address);
        msg.className = "msg ok";
        if ($("w1")) $("w1").textContent = short(address);
        await refresh();
      } catch (e) {
        msg.textContent = e.message || String(e);
        msg.className = "msg err";
      }
    };
  });
  refresh();
}
function b58encode(bytes) {
  const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
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
  for (; it < size; it++) s += A[b[it]];
  return s;
}
async function refresh() {
  const tok = getTok();
  if ($("btn-logout")) $("btn-logout").hidden = !tok;
  if (!tok) {
    if ($("name")) $("name").textContent = "Sign in";
    if ($("gid")) $("gid").textContent = "Grudge ID";
    return;
  }
  try {
    const me = await api("/api/auth/me");
    const d = me.data || {};
    if (d.token || d.sessionToken) setTok(d.token || d.sessionToken, d);
    if ($("name")) $("name").textContent = d.username || d.displayName || "Signed in";
    if ($("gid")) $("gid").textContent = d.grudgeId || d.id || "Grudge ID";
    if ($("gbux")) $("gbux").textContent = d.gbuxBalance != null ? d.gbuxBalance : "0";
    if ($("tok-gbux")) $("tok-gbux").textContent = $("gbux") ? $("gbux").textContent : "0";
  } catch (e) { toast(e.message || String(e), false); }
  try {
    const ov = await api("/api/wallet/overview");
    const o = ov.data || {};
    const linked = (o.linkedWallets || [])[0];
    const addr = (linked && (linked.walletAddress || linked.address)) || o.primaryWallet || "";
    if (addr && $("w1")) $("w1").textContent = short(addr);
  } catch (e) {}
  try {
    const h = await traderApi("/api/gruda/holdings");
    const d = h.data || {};
    const sol = d.sol != null ? Number(d.sol).toFixed(4) : "0.00";
    ["fig-sol","tr-sol","vault-sol","tok-sol"].forEach((id) => { if ($(id)) $(id).textContent = sol; });
    const pk = d.vault || d.tradingPubkey || d.publicKey;
    if (pk && $("vault-addr")) {
      $("vault-addr").textContent = pk;
      if ($("btn-solscan")) $("btn-solscan").href = "https://solscan.io/account/" + pk;
    }
  } catch (e) {}
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady);
else onReady();

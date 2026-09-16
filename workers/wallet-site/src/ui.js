/**
 * Production wallet.grudge-studio.com UI — fleet bag, play fund, games, reconnect.
 * Images from live CDN hosts that return real image/* (not HTML shells).
 */
export function htmlPage(env) {
  const railway = env.RAILWAY_API_ORIGIN || "https://grudge-api-production-0d46.up.railway.app";
  const idGw = env.ID_GATEWAY_ORIGIN || "https://id.grudge-studio.com";
  const client = env.CLIENT_ORIGIN || "https://client.grudge-studio.com";
  const portal = env.PORTAL_ORIGIN || "https://grudge-studio.com";
  const assets = env.ASSETS_CDN || "https://assets.grudge-studio.com";
  const poker = env.POKER_ORIGIN || "https://poker.grudge-studio.com";
  const trader = env.TRADER_ORIGIN || "https://trader.grudge-studio.com";
  const logo = idGw + "/grudge-id-logo.png";
  const gbuxCoin = poker + "/media/gbux-coin.png";
  const art = {
    trader: trader + "/art/fabledgrudge.jpeg",
    pokerFelt: poker + "/media/felt-budb-green.jpg",
    pokerOg: poker + "/media/og-image.jpg",
    warlords: client + "/opengraph.jpg",
    foundry: "https://character.grudge-studio.com/opengraph.jpg",
    open: "https://open.grudge-studio.com/opengraph.jpg",
    grudox: "https://grudox.grudge-studio.com/opengraph.jpg",
    mine: "https://mineloader.grudge-studio.com/opengraph.jpg",
    forge: "https://forge.grudge-studio.com/opengraph.jpg",
    portal: portal + "/opengraph.jpg",
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Grudge Studio Wallet</title>
<meta name="description" content="Grudge Studio wallet — one Grudge ID, fleet bag GBUX, send to games." />
<meta name="theme-color" content="#d4af37" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Gruda Wallet" />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="icon" href="${logo}" />
<link rel="apple-touch-icon" href="${logo}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Jost:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
:root{--bg:#07070c;--panel:rgba(18,18,26,.92);--border:rgba(212,175,55,.28);--gold:#d4af37;--gold2:#f3d9a4;--text:#f4f4f5;--dim:#a1a1aa;--ok:#22c55e;--err:#ef4444;--purple:#a855f7;--cyan:#22d3ee}
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;font-family:Jost,system-ui,sans-serif;color:var(--text);
background:#07070c;display:flex;flex-direction:column;align-items:center;padding:0 0 72px;position:relative}
.bg{position:fixed;inset:0;z-index:0;background:
radial-gradient(ellipse 70% 45% at 15% 0%,rgba(168,85,247,.18),transparent 55%),
radial-gradient(ellipse 60% 40% at 90% 10%,rgba(212,175,55,.12),transparent 50%),
linear-gradient(180deg,#0b0b14,#07070c);pointer-events:none}
.bg2{position:fixed;inset:0;z-index:0;background:linear-gradient(180deg,rgba(7,7,12,.15),rgba(7,7,12,.55) 70%,#07070c);pointer-events:none}
.wrap{position:relative;z-index:1;width:100%;max-width:920px}
.nav{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--gold);font-family:Cinzel,serif;font-size:1.05rem}
.brand img{width:36px;height:36px;border-radius:8px;object-fit:cover;border:1px solid var(--border)}
.links{display:flex;gap:6px;flex-wrap:wrap}
.links a{color:var(--dim);text-decoration:none;font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;padding:7px 10px;border-radius:999px;border:1px solid transparent}
.links a:hover{color:var(--gold2);border-color:rgba(212,175,55,.35)}
.hero{border-radius:18px;overflow:hidden;border:1px solid var(--border);margin-bottom:16px;position:relative;min-height:120px}
.hero img{width:100%;height:140px;object-fit:cover;display:block}
.hero .cap{position:relative;min-height:120px;background:linear-gradient(120deg,rgba(18,12,28,.95),rgba(12,14,24,.72));display:flex;flex-direction:column;justify-content:center;padding:20px 22px}
.hero h1{font-family:Cinzel,serif;color:var(--gold2);font-size:1.55rem;margin-bottom:4px}
.hero p{color:var(--dim);font-size:.88rem;max-width:420px;line-height:1.45}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:720px){.grid{grid-template-columns:1fr}}
.card{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:18px 16px;backdrop-filter:blur(12px);box-shadow:0 16px 40px rgba(0,0,0,.4)}
.card h2{font-family:Cinzel,serif;color:var(--gold2);font-size:1rem;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.card h2 img{width:22px;height:22px}
.row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:.88rem}
.row:last-child{border-bottom:none}
.k{color:var(--dim)}.v{font-weight:600;text-align:right;word-break:break-all}
.addr{font-family:ui-monospace,monospace;font-size:.72rem;color:#c4b5fd;background:#0a0a12;border:1px solid rgba(168,85,247,.3);border-radius:10px;padding:10px;margin-top:10px;word-break:break-all;display:none}
.btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
button,.btn{appearance:none;border:none;cursor:pointer;font-family:inherit;font-weight:600;font-size:.82rem;padding:10px 14px;border-radius:10px;text-decoration:none;display:inline-flex;align-items:center;gap:6px;color:inherit}
button.primary,.btn.primary{background:linear-gradient(180deg,#e0c05a,#b8922a);color:#1a1405}
button.ghost,.btn.ghost{background:transparent;color:var(--gold2);border:1px solid rgba(212,175,55,.4)}
button.cyan{background:linear-gradient(180deg,#22d3ee,#0891b2);color:#042f2e;border:none}
button:disabled{opacity:.45;cursor:not-allowed}
.msg{margin-top:10px;font-size:.8rem;color:var(--dim);min-height:1.1em}
.msg.err{color:#fca5a5}.msg.ok{color:#86efac}
.input{width:100%;background:#0a0a12;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;color:var(--text);font:inherit;margin:6px 0 10px}
.gamess{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.game{display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.35);text-decoration:none;color:var(--text);transition:border .15s,transform .15s}
.game:hover{border-color:rgba(212,175,55,.45);transform:translateY(-2px)}
.game img{width:100%;height:88px;object-fit:cover;object-position:center;background:#0a0a12;border-radius:8px;border:1px solid rgba(212,175,55,.15)}
.tok img.coin{border-radius:50%;object-fit:contain;background:transparent;mix-blend-mode:multiply;filter:contrast(1.15)}
.game strong{font-size:.88rem;color:var(--gold2)}
.game span{font-size:.72rem;color:var(--dim);line-height:1.35}
.badge{display:inline-flex;font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:999px;border:1px solid rgba(34,197,94,.35);color:#86efac;background:rgba(34,197,94,.08);margin-bottom:8px}
.foot{margin-top:22px;font-size:.65rem;color:#52525b;letter-spacing:.08em;text-transform:uppercase;text-align:center}
.tabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
.tabs button{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08);color:var(--dim);padding:7px 12px;border-radius:999px;font-size:.75rem}
.tabs button.on{border-color:var(--gold);color:var(--gold2)}
.panel{display:none}.panel.on{display:block}
.legal-back{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:40;display:none;align-items:center;justify-content:center;padding:16px}
.legal-back.on{display:flex}
.legal-card{max-width:560px;max-height:80vh;overflow:auto;background:#12121a;border:1px solid rgba(212,175,55,.35);border-radius:14px;padding:20px 22px}
.legal-card h3{font-family:Cinzel,serif;color:var(--gold);margin-bottom:10px}
.legal-card p,.legal-card li{font-size:.82rem;color:var(--dim);line-height:1.5;margin:0 0 8px}
.shell{max-width:430px;margin:0 auto;padding:12px 14px 24px}
.w-head{display:flex;align-items:center;gap:10px;padding:8px 0 4px}
.acct{flex:1;display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:999px;padding:6px 10px 6px 6px;min-width:0}
.acct img{width:28px;height:28px;border-radius:50%}
.acct b{font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.acct span{font-size:.65rem;color:var(--dim);display:block}
.hero-bal{text-align:center;padding:22px 8px 8px}
.hero-bal .sym{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin-bottom:4px}
.hero-bal .fig{font-size:2.35rem;font-weight:700;letter-spacing:-.03em;line-height:1.1}
.hero-bal .sub{color:var(--dim);font-size:.82rem;margin-top:6px}
.act{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}
.act a,.act button{flex-direction:column;justify-content:center;gap:4px;padding:12px 6px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);font-size:.68rem;color:var(--gold2);text-align:center}
.act .ic{font-size:1.15rem}
.dock{position:fixed;left:0;right:0;bottom:0;z-index:20;display:flex;justify-content:center;gap:0;background:rgba(10,10,16,.94);border-top:1px solid var(--border);padding:8px 12px calc(8px + env(safe-area-inset-bottom))}
.dock button{flex:1;max-width:120px;background:transparent;border:0;color:var(--dim);font-size:.72rem;padding:8px}
.dock button.on{color:var(--gold2)}
.dock-panel{display:none}.dock-panel.on{display:block}
.tok{display:flex;align-items:center;gap:10px;padding:12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);margin:8px 0}
.tok img{width:36px;height:36px;border-radius:50%}
.tok .meta{flex:1;min-width:0}
.tok .meta b{display:block;font-size:.88rem}
.tok .meta span{font-size:.7rem;color:var(--dim)}
.tok .bal{text-align:right;font-weight:700}
.store{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
</style>
</head>
<body>
<div class="bg" aria-hidden="true"></div>
<div class="bg2" aria-hidden="true"></div>
<div class="wrap shell">
  <header class="w-head">
    <div class="acct">
      <img src="${logo}" alt="" width="28" height="28" />
      <div style="min-width:0">
        <b id="sess">loading…</b>
        <span id="gid">Grudge ID —</span>
      </div>
    </div>
    <button class="cyan" type="button" id="btn-siws">Connect Phantom</button>
    <a class="btn ghost" id="btn-login" href="${idGw}/login?redirect_uri=${encodeURIComponent("https://wallet.grudge-studio.com/")}&app=wallet&origin=${encodeURIComponent("https://wallet.grudge-studio.com")}">Grudge ID</a>
    <button class="ghost" type="button" id="btn-logout" style="display:none">Out</button>
    <button class="ghost" type="button" id="btn-install" style="display:none">Install</button>
  </header>

  <div class="hero-bal">
    <div class="sym">Gruda Wallet · mainnet</div>
    <div class="fig"><span id="gbux">—</span></div>
    <div class="sub">GBUX bag · play <span id="play">—</span></div>
    <div class="sub">Trader vault <span id="tr-sol">—</span> · spendable <span id="tr-spend">—</span></div>
    <div class="badge" id="edge-badge">Solana</div>
  </div>

  <div class="act">
    <button type="button" id="btn-tr-copy"><span class="ic">↓</span>Receive</button>
    <button type="button" id="btn-go-send"><span class="ic">↑</span>Send</button>
    <button type="button" id="btn-go-swap"><span class="ic">⇄</span>Swap</button>
    <button type="button" id="btn-go-connect"><span class="ic">◎</span>Connect</button>
  </div>
  <p class="msg" id="msg"></p>

  <div class="dock-panel on" id="dock-assets">
    <div class="tok"><img class="coin" src="${gbuxCoin}" alt="GBUX coin" /><div class="meta"><b>GBUX</b><span>coin · bag · Crossmint</span></div><div class="bal" id="tok-gbux">—</div></div>
    <div class="tok"><img src="${logo}" alt="" /><div class="meta"><b>SOL vault</b><span id="tr-vault">trader house</span></div><div class="bal" id="tok-sol">—</div></div>
    <span id="cmint" hidden></span><span id="net" hidden></span><span id="mint" hidden></span>
    <div class="addr" id="addr"></div>
    <div class="addr" id="tr-vault-full"></div>
    <p style="font-size:.72rem;color:var(--dim);margin:8px 0">Keep 0.02 SOL in the trader vault. Close fee 0.005 SOL → GBUX; TP +5%.</p>
    <div class="row"><span class="k">Enrolled</span><span class="v" id="tr-enroll">—</span></div>
    <div id="w-linked">Sign in to list linked Phantom accounts.</div>
    <div class="row"><span class="k">Crossmint</span><span class="v" id="w-cm">—</span></div>
    <div id="w-detect" class="btns"></div>
    <div class="btns">
      <button class="cyan" type="button" id="btn-link-ph" disabled>Phantom</button>
      <button class="ghost" type="button" id="btn-link-sf" disabled>Solflare</button>
      <button class="ghost" type="button" id="btn-link-bp" disabled>Backpack</button>
      <a class="btn ghost" id="btn-open-phantom" href="#" style="display:none">Open in Phantom</a>
      <button class="ghost" type="button" id="btn-create-wallet" style="display:none">Create Gruda</button>
      <button class="primary" type="button" id="btn-refresh">Refresh</button>
    </div>
    <p class="msg" id="w-msg"></p>
  </div>

  <div class="dock-panel" id="dock-dapps">
    <p style="font-size:.8rem;color:var(--dim);margin:0 0 10px">Dapp store · opens with your Grudge ID session</p>
    <div class="store gamess" id="games"></div>
    <div id="hero-list" style="font-size:.75rem;color:var(--dim);margin-top:12px"></div>
    <div class="btns">
      <a class="btn primary" id="btn-trader" href="${trader}">Trader</a>
      <a class="btn ghost" id="btn-phantom" href="${poker}/wallet">Poker wallet</a>
    </div>
  </div>

  <div class="dock-panel" id="dock-activity">
    <p style="font-size:.8rem;color:var(--dim);line-height:1.45">Receive: copy vault, send SOL from Phantom, Record deposit. Send: withdraw to a linked wallet. Vault keeps 0.02 SOL.</p>
    <label class="k" style="font-size:.75rem">From / to (linked Solana)</label>
    <input class="input" id="tr-from" placeholder="Linked wallet address" />
    <label class="k" style="font-size:.75rem">Amount SOL</label>
    <input class="input" id="tr-amt" type="number" min="0" step="0.01" value="0.05" />
    <div class="btns">
      <button class="cyan" type="button" id="btn-tr-dep" disabled>Record deposit</button>
      <button class="ghost" type="button" id="btn-tr-wd" disabled>Withdraw</button>
      <button class="ghost" type="button" id="btn-tr-enroll" disabled>Enable trader</button>
    </div>
    <p class="msg" id="tr-msg"></p>
    <div class="tabs">
      <button type="button" class="on" data-tab="play">Play ledger</button>
      <button type="button" data-tab="swap">Swap bag</button>
    </div>
    <div class="panel on" id="tab-play">
      <input class="input" id="play-amt" type="number" min="1" step="1" value="100" />
      <button class="cyan" type="button" id="btn-fund-play" disabled>Send GBUX to Poker play</button>
    </div>
    <div class="panel" id="tab-swap">
      <select class="input" id="swap-dir">
        <option value="sol-to-gbux">SOL → GBUX</option>
        <option value="gbux-to-sol">GBUX → SOL</option>
      </select>
      <input class="input" id="swap-amt" type="number" min="0" step="any" value="0.1" />
      <div class="btns">
        <button class="ghost" type="button" id="btn-quote" disabled>Quote</button>
        <button class="primary" type="button" id="btn-swap" disabled>Swap</button>
      </div>
      <pre id="swap-out" style="font-size:.7rem;color:var(--dim);margin-top:8px;white-space:pre-wrap;max-height:100px;overflow:auto"></pre>
    </div>
    <p class="msg" id="tx-msg"></p>
  </div>

  <nav class="dock" aria-label="Wallet sections">
    <button type="button" class="on" data-dock="assets">Assets</button>
    <button type="button" data-dock="dapps">Dapps</button>
    <button type="button" data-dock="activity">Activity</button>
  </nav>
  <p class="foot">
    <button type="button" id="btn-privacy">Privacy</button> ·
    <button type="button" id="btn-tos">Terms</button>
  </p>
</div>
<div class="legal-back" id="legal-back" hidden>
  <div class="legal-card">
    <h3 id="legal-title">Privacy</h3>
    <div id="legal-body"></div>
    <button class="primary" type="button" id="legal-close">Close</button>
  </div>
</div>
<script>
const RAILWAY = ${JSON.stringify(railway)};
const ID_GW = ${JSON.stringify(idGw)};
const POKER = ${JSON.stringify(poker)};
const TRADER = ${JSON.stringify(trader)};
const FLEET_KEYS = ['grudge.open.token','grudge_auth_token','grudge_session_token','grudge.token','sso_token','grudge_token','access_token'];
const $ = (id) => document.getElementById(id);
let signedIn = false;
let walletAddr = '';

const GAMES = [
  { name: 'Auto-trader', desc: 'SOL desk · rotating capital', href: TRADER, img: '${art.trader}' },
  { name: 'Poker wallet', desc: 'BUDB play · fund · sit', href: POKER + '/wallet', img: '${art.pokerFelt}' },
  { name: 'BUDB Poker', desc: 'Holdem · slots · BJ', href: POKER + '/lobby', img: '${art.pokerOg}' },
  { name: 'Warlords play', desc: 'Client · home island', href: '${client}/home', img: '${art.warlords}' },
  { name: 'Character Foundry', desc: 'Create · 4 slots', href: 'https://character.grudge-studio.com/?era=warlords', img: '${art.foundry}' },
  { name: 'Grudge Open', desc: 'Danger · library', href: 'https://open.grudge-studio.com', img: '${art.open}' },
  { name: 'GRUDOX', desc: 'Arcade cabinets', href: 'https://grudox.grudge-studio.com', img: '${art.grudox}' },
  { name: 'Mine-Loader', desc: 'Voxel realms', href: 'https://mineloader.grudge-studio.com', img: '${art.mine}' },
  { name: 'Forge', desc: 'Map / scene editor', href: 'https://forge.grudge-studio.com', img: '${art.forge}' },
  { name: 'Studio portal', desc: 'grudge-studio.com', href: '${portal}', img: '${art.portal}' },
];

function storeFleetToken(token, meta) {
  if (!token) return;
  try {
    FLEET_KEYS.forEach((k) => localStorage.setItem(k, token));
    if (meta && meta.grudgeId) {
      localStorage.setItem('grudge_id', meta.grudgeId);
      localStorage.setItem('grudge_account_id', meta.grudgeId);
    }
    if (meta && meta.username) localStorage.setItem('grudge_username', meta.username);
    document.cookie = 'sso_token=' + encodeURIComponent(token) + '; Path=/; Secure; SameSite=Lax; Max-Age=604800; Domain=.grudge-studio.com';
  } catch {}
}
function getAuthToken() {
  try {
    for (const k of FLEET_KEYS) {
      const v = localStorage.getItem(k); if (v && v.trim()) return v.trim();
    }
    const m = document.cookie.match(/(?:^|; )sso_token=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch {}
  return '';
}
function clearFleetAuth() {
  try {
    FLEET_KEYS.forEach((k) => localStorage.removeItem(k));
    ['grudge_id','grudge_account_id','grudge_user_id','grudge_username'].forEach((k) => localStorage.removeItem(k));
  } catch {}
}
function consumeAuthFromUrl() {
  const u = new URL(location.href);
  const hash = new URLSearchParams((u.hash || '').replace(/^#/, ''));
  const sp = u.searchParams;
  const session = sp.get('sso_token') || sp.get('token') || hash.get('sso_token') || hash.get('token') || '';
  const launch = sp.get('grudge_token') || hash.get('grudge_token') || '';
  const grudgeId = sp.get('grudgeId') || sp.get('grudge_id') || hash.get('grudgeId') || '';
  const username = sp.get('username') || sp.get('grudge_username') || hash.get('username') || '';
  const primary = session || launch;
  if (primary) {
    storeFleetToken(primary, { grudgeId, username });
    if (launch && launch !== session) try { localStorage.setItem('grudge_launch_token', launch); } catch {}
  }
  ['sso_token','token','grudge_token','grudgeId','grudge_id','username','grudge_username','gid'].forEach((k) => { sp.delete(k); hash.delete(k); });
  history.replaceState(null, '', u.pathname + (sp.toString() ? '?' + sp : '') + (hash.toString() ? '#' + hash : ''));
  return !!primary;
}
async function api(path, opts = {}) {
  const headers = Object.assign({ Accept: 'application/json' }, opts.headers || {});
  const tok = getAuthToken();
  if (tok) headers.Authorization = 'Bearer ' + tok;
  const urls = [path, RAILWAY + path];
  let lastErr;
  for (const url of urls) {
    try {
      const r = await fetch(url, { ...opts, headers, credentials: 'include' });
      const text = await r.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
      return { ok: r.ok, status: r.status, data };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('fetch failed');
}
async function bridgeIfNeeded() {
  const tok = getAuthToken();
  if (!tok) return false;
  const me = await api('/api/auth/me');
  if (me.ok && me.data) {
    storeFleetToken(me.data.token || me.data.sessionToken || tok, {
      grudgeId: me.data.grudgeId || me.data.id || '',
      username: me.data.username || me.data.displayName || '',
    });
    return true;
  }
  let launch = tok;
  try { launch = localStorage.getItem('grudge_launch_token') || tok; } catch {}
  const br = await api('/api/auth/grudge-bridge', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: launch, audience: location.origin }),
  });
  if (br.ok && br.data) {
    const t = br.data.sessionToken || br.data.token || br.data.access_token;
    if (t) {
      storeFleetToken(t, { grudgeId: br.data.grudgeId || '', username: br.data.username || '' });
      return true;
    }
  }
  const claim = await api('/api/auth/session/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (claim.ok && claim.data) {
    const t = claim.data.sessionToken || claim.data.token;
    if (t) {
      storeFleetToken(t, { grudgeId: claim.data.grudgeId || '', username: claim.data.username || '' });
      return true;
    }
  }
  return false;
}
function handoffUrl(base) {
  const tok = getAuthToken();
  if (!tok) return base;
  try {
    const u = new URL(base, location.origin);
    u.hash = 'sso_token=' + encodeURIComponent(tok);
    const gid = localStorage.getItem('grudge_id') || '';
    const name = localStorage.getItem('grudge_username') || '';
    if (gid) { u.searchParams.set('grudge_id', gid); u.searchParams.set('grudgeId', gid); }
    if (name) { u.searchParams.set('username', name); }
    const maxAge = 7 * 24 * 60 * 60;
    document.cookie = 'grudge_auth_token=' + encodeURIComponent(tok) + '; path=/; max-age=' + maxAge + '; Domain=.grudge-studio.com; SameSite=Lax; Secure';
    document.cookie = 'sso_token=' + encodeURIComponent(tok) + '; path=/; max-age=' + maxAge + '; Domain=.grudge-studio.com; SameSite=Lax; Secure';
    return u.toString();
  } catch { return base; }
}
function setAuthedUi(on) {
  signedIn = on;
  const login = $('btn-login');
  const logout = $('btn-logout');
  if (login) login.style.display = on ? 'none' : '';
  if (logout) logout.style.display = on ? '' : 'none';
  const siwsBtn = $('btn-siws');
  if (siwsBtn) siwsBtn.textContent = on ? 'Link Phantom' : 'Connect Phantom';
  $('btn-fund-play').disabled = !on;
  $('btn-quote').disabled = !on;
  $('btn-swap').disabled = !on;
  const lp = $('btn-link-ph');
  const ls = $('btn-link-sf');
  if (lp) lp.disabled = !on;
  if (ls) ls.disabled = !on;
  const lb = $('btn-link-bp');
  if (lb) lb.disabled = !on;
  paintDetectedWallets();
}
function b58encode(bytes) {
  const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let zeros = 0;
  while (zeros < u8.length && u8[zeros] === 0) zeros++;
  const size = ((u8.length - zeros) * 138 / 100 + 1) | 0;
  const b = new Uint8Array(size);
  let length = 0;
  for (let i = zeros; i < u8.length; i++) {
    let carry = u8[i];
    let j = size - 1;
    for (; j >= 0 && (carry || (size - 1 - j) < length); j--) {
      carry += 256 * b[j];
      b[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    length = size - 1 - j;
  }
  let it = size - length;
  while (it < size && b[it] === 0) it++;
  let s = '1'.repeat(zeros);
  for (; it < size; it++) s += A[b[it]];
  return s;
}

/** Poker SSOT: docs/PHANTOM_EMBEDDED_SSOT.md · client/src/lib/solana-wallets.ts
 * Prefer window.phantom.solana (not hijackable window.solana). No auto-connect. */
function getInjectedProvider(id) {
  if (id === 'phantom') return (window.phantom && window.phantom.solana) || (window.solana && window.solana.isPhantom ? window.solana : null);
  if (id === 'solflare') return window.solflare || (window.solana && window.solana.isSolflare ? window.solana : null);
  if (id === 'backpack') return window.backpack || null;
  if (window.solana && !window.solana.isPhantom && !window.solana.isSolflare) return window.solana;
  return null;
}
function detectInjected() {
  return [
    { id: 'phantom', name: 'Phantom', install: 'https://phantom.app' },
    { id: 'solflare', name: 'Solflare', install: 'https://solflare.com' },
    { id: 'backpack', name: 'Backpack', install: 'https://backpack.app' },
  ].map((w) => Object.assign(w, { available: Boolean(getInjectedProvider(w.id)) }));
}
function paintDetectedWallets() {
  const box = $('w-detect');
  if (!box) return;
  const list = detectInjected();
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const inPhantom = /Phantom/i.test(navigator.userAgent) || Boolean(window.phantom && window.phantom.solana);
  box.innerHTML = list.map((w) => {
    if (w.available) return '<span class="v" style="font-size:.75rem">' + w.name + ' ready</span>';
    return '<a class="btn ghost" href="' + w.install + '" target="_blank" rel="noopener">' + w.name + ' install</a>';
  }).join('');
  const openPh = $('btn-open-phantom');
  if (openPh && mobile && !inPhantom) {
    openPh.style.display = '';
    openPh.href = 'https://phantom.app/ul/browse/' + encodeURIComponent(location.href);
  }
}

async function siwsLogin() {
  const msg = $('msg') || $('w-msg');
  const w = getInjectedProvider('phantom') || getInjectedProvider('solflare') || getInjectedProvider('backpack');
  const name = getInjectedProvider('phantom') ? 'phantom' : getInjectedProvider('solflare') ? 'solflare' : 'backpack';
  if (!w) {
    if (msg) { msg.className = 'msg err'; msg.textContent = 'Install Phantom, Solflare, or Backpack.'; }
    window.open('https://phantom.app/', '_blank');
    return;
  }
  if (msg) { msg.className = 'msg'; msg.textContent = 'Approve SIWS in ' + name + '...'; }
  const resp = await w.connect({ onlyIfTrusted: false });
  const address = String((resp && resp.publicKey && resp.publicKey.toString()) || (w.publicKey && w.publicKey.toString()) || '');
  if (!address) throw new Error('no public key');
  const ch = await api('/api/auth/phantom/nonce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, origin: location.origin }),
  });
  if (!ch.ok || !(ch.data && (ch.data.message || ch.data.siws))) {
    throw new Error((ch.data && ch.data.error) || 'SIWS challenge failed');
  }
  const challenge = ch.data;
  let message = challenge.message;
  let signature;
  let addr = address;
  if (typeof w.signIn === 'function' && challenge.siws && challenge.siws.nonce) {
    const out = await w.signIn(challenge.siws);
    const signed = out.signedMessage || out.signed_message || message;
    message = typeof signed === 'string' ? signed : new TextDecoder().decode(signed);
    signature = typeof out.signature === 'string' ? out.signature : b58encode(out.signature);
    addr = String((out.address && out.address.toString && out.address.toString()) || (out.account && out.account.address) || address);
  } else {
    const encoded = new TextEncoder().encode(message);
    const signed = await w.signMessage(encoded, 'utf8');
    signature = typeof signed === 'string' ? signed : b58encode(signed.signature || signed);
  }
  const verified = await api('/api/auth/phantom/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: addr, nonce: challenge.nonce, message, signature, provider: name }),
  });
  const body = verified.data || {};
  const tok = body.token || body.sessionToken || body.sso_token;
  if (!verified.ok && !body.success && !tok) throw new Error(body.error || 'SIWS verify failed');
  if (tok) {
    storeFleetToken(tok, { grudgeId: body.grudgeId || body.grudge_id || '', username: body.username || '' });
  }
  if (msg) { msg.className = 'msg ok'; msg.textContent = body.linked ? 'Wallet linked to Grudge ID' : 'Signed in with ' + name; }
  await load();
  await loadTraderCash();
  await loadLinkedWallets();
}

async function connectAndLink(kind) {
  const msg = $('w-msg');
  msg.className = 'msg';
  msg.textContent = 'Connecting ' + kind + '…';
  const p = getInjectedProvider(kind);
  if (!p) {
    msg.className = 'msg err';
    const install = kind === 'solflare' ? 'https://solflare.com' : kind === 'backpack' ? 'https://backpack.app' : 'https://phantom.app';
    msg.innerHTML = kind + ' not injected. <a href="' + install + '" target="_blank" rel="noopener">Install</a> or Open in Phantom on mobile.';
    return;
  }
  const resp = await p.connect({ onlyIfTrusted: false });
  const walletAddress = (resp && resp.publicKey && resp.publicKey.toString()) || (p.publicKey && p.publicKey.toString()) || '';
  if (!walletAddress) throw new Error('Wallet did not return a public key');
  const ch = await api('/api/wallet/link/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, origin: location.origin }),
  });
  if (!ch.ok) throw new Error(ch.data && ch.data.error || 'challenge failed');
  const encoded = new TextEncoder().encode(ch.data.message);
  const signed = await p.signMessage(encoded, 'utf8');
  const sigBytes = signed.signature || signed;
  const signature = b58encode(sigBytes);
  const conf = await api('/api/wallet/link/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, message: ch.data.message, signature, provider: kind }),
  });
  if (!conf.ok) throw new Error(conf.data && conf.data.error || 'confirm failed');
  msg.className = 'msg ok';
  msg.textContent = 'Linked ' + walletAddress.slice(0, 8) + '… (does not replace Crossmint)';
  if ($('tr-from') && !$('tr-from').value) $('tr-from').value = walletAddress;
  await loadLinkedWallets();
}

async function loadLinkedWallets() {
  const box = $('w-linked');
  const cm = $('w-cm');
  if (cm) cm.textContent = walletAddr ? walletAddr.slice(0, 8) + '…' : 'none';
  if (!getAuthToken()) {
    box.textContent = 'Sign in to list linked wallets.';
    return;
  }
  const r = await api('/api/wallet/linked');
  const list = (r.data && (r.data.linkedWallets || r.data.wallets)) || [];
  if (!r.ok) {
    box.textContent = (r.data && r.data.error) || 'Could not load linked wallets.';
    return;
  }
  if (!list.length) {
    box.textContent = 'No Phantom/Solflare linked yet. Connect below — Crossmint stays the Gruda game wallet.';
    return;
  }
  box.innerHTML = list.map((w) => {
    const a = w.walletAddress || w.address || '';
    const prov = w.provider || w.walletType || 'linked';
    return '<div class="row"><span class="k">' + prov + '</span><span class="v" title="' + a + '">' + (a ? a.slice(0, 6) + '…' + a.slice(-4) : '—') + '</span></div>';
  }).join('');
  const first = list[0] && (list[0].walletAddress || list[0].address);
  if (first && $('tr-from') && !$('tr-from').value) $('tr-from').value = first;
}

function renderGames() {
  $('games').innerHTML = GAMES.map((g) =>
    '<a class="game" href="' + g.href + '" data-handoff="1"><img src="' + g.img + '" alt="" onerror="this.remove()"><strong>' + g.name + '</strong><span>' + g.desc + '</span></a>'
  ).join('');
  $('games').querySelectorAll('a[data-handoff]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      location.href = handoffUrl(a.getAttribute('href'));
    });
  });
}
async function loadPlayBalance(addr) {
  if (!addr || addr.length < 32) { $('play').textContent = '—'; return; }
  try {
    const r = await fetch(POKER + '/api/wallet/scopes?wallet=' + encodeURIComponent(addr));
    const j = await r.json();
    const play = j.playWallet?.balance ?? j.unified?.playGbux ?? 0;
    $('play').textContent = Number(play).toLocaleString() + ' play';
  } catch {
    $('play').textContent = '—';
  }
}
async function load() {
  if ($('sess')) $('sess').textContent = 'loading…';
  $('msg').textContent = '';
  $('msg').className = 'msg';
  $('hero-list').textContent = '';
  try {
    consumeAuthFromUrl();
    await bridgeIfNeeded();
    const cfg = await api('/api/wallet/config');
    if (cfg.ok && cfg.data) {
      $('net').textContent = cfg.data.network || 'mainnet-beta';
      const m = cfg.data.gbuxMint || '';
      $('mint').textContent = m ? m.slice(0, 6) + '…' + m.slice(-4) : '—';
    }
    const me = await api('/api/auth/me');
    if (!me.ok) {
      setAuthedUi(false);
      $('sess').textContent = 'signed out';
      $('gid').textContent = '—';
      $('gbux').textContent = '—';
      $('play').textContent = '—';
      $('cmint').textContent = '—';
      $('addr').style.display = 'none';
      $('btn-create-wallet').style.display = 'none';
      if (me.status === 401) $('msg').textContent = 'Sign in with Grudge ID to manage bag & fund play.';
      return;
    }
    const profile = me.data || {};
    const name = profile.displayName || profile.username || profile.name || 'Player';
    const grudgeId = profile.grudgeId || profile.grudge_id || localStorage.getItem('grudge_id') || '—';
    setAuthedUi(true);
    $('sess').textContent = 'signed in · ' + name;
    $('gid').textContent = grudgeId;
    storeFleetToken(getAuthToken(), { grudgeId, username: name });

    const st = await api('/api/wallet/status');
    if (st.ok && st.data) {
      const bag = Number(st.data.gbuxBalance ?? 0).toLocaleString();
    $('gbux').textContent = bag;
    if ($('tok-gbux')) $('tok-gbux').textContent = bag;
      if (st.data.hasWallet && st.data.walletAddress) {
        walletAddr = st.data.walletAddress;
        $('cmint').textContent = (st.data.walletType || 'crossmint') + ' · exists';
        $('addr').style.display = 'block';
        $('addr').textContent = walletAddr;
        $('btn-create-wallet').style.display = 'none';
        await loadPlayBalance(walletAddr);
      } else {
        $('cmint').textContent = 'none — create only if missing';
        $('btn-create-wallet').style.display = '';
      }
    }
    const ov = await api('/api/wallet/overview');
    if (ov.ok && ov.data) {
      const bag2 = Number(ov.data.gbuxBalance ?? $('gbux').textContent.replace(/,/g,'') ?? 0).toLocaleString();
      $('gbux').textContent = bag2;
      if ($('tok-gbux')) $('tok-gbux').textContent = bag2;
      const linked = ov.data.primaryWallet || ov.data.linkedWallets?.[0]?.walletAddress || '';
      if (!walletAddr && linked) {
        walletAddr = linked;
        $('addr').style.display = 'block';
        $('addr').textContent = walletAddr;
        await loadPlayBalance(walletAddr);
      }
    }

    const ch = await api('/api/characters?era=warlords');
    if (ch.ok && ch.data) {
      const list = Array.isArray(ch.data) ? ch.data : (ch.data.characters || []);
      if (list.length) {
        $('hero-list').innerHTML = '<ul style="margin:0 0 0 16px">' + list.map((h) => {
          const n = h.name || 'Hero';
          const race = h.raceId || h.race || '?';
          const cls = h.classId || h.class || '?';
          return '<li>' + n + ' · ' + race + '/' + cls + '</li>';
        }).join('') + '</ul>';
      } else $('hero-list').textContent = 'No heroes yet — open Foundry.';
    }
    try {
      const maxAge = 7 * 24 * 60 * 60;
      const tok = getAuthToken();
      if (tok) {
        document.cookie = 'grudge_auth_token=' + encodeURIComponent(tok) + '; path=/; max-age=' + maxAge + '; Domain=.grudge-studio.com; SameSite=Lax; Secure';
        document.cookie = 'sso_token=' + encodeURIComponent(tok) + '; path=/; max-age=' + maxAge + '; Domain=.grudge-studio.com; SameSite=Lax; Secure';
      }
    } catch {}
    loadTraderCash();
    loadLinkedWallets();
  } catch (e) {
    $('msg').textContent = 'Error: ' + (e && e.message ? e.message : e);
    $('msg').className = 'msg err';
  }
}

document.querySelectorAll('[data-dock]').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('[data-dock]').forEach((x) => x.classList.remove('on'));
    document.querySelectorAll('.dock-panel').forEach((p) => p.classList.remove('on'));
    b.classList.add('on');
    const pan = $('dock-' + b.dataset.dock);
    if (pan) pan.classList.add('on');
  };
});
function showDock(name) {
  const b = document.querySelector('[data-dock="' + name + '"]');
  if (b) b.click();
}
if ($('btn-go-send')) $('btn-go-send').onclick = () => showDock('activity');
if ($('btn-go-swap')) $('btn-go-swap').onclick = () => { showDock('activity'); const t = document.querySelector('[data-tab="swap"]'); if (t) t.click(); };
if ($('btn-go-connect')) $('btn-go-connect').onclick = () => showDock('assets');

document.querySelectorAll('.tabs button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('on'));
    $('tab-' + b.dataset.tab).classList.add('on');
  };
});
$('btn-refresh').onclick = () => { load(); loadTraderCash(); loadLinkedWallets(); };
$('btn-link-ph').onclick = () => connectAndLink('phantom').catch((e) => { $('w-msg').className = 'msg err'; $('w-msg').textContent = e.message || String(e); });
$('btn-link-sf').onclick = () => connectAndLink('solflare').catch((e) => { $('w-msg').className = 'msg err'; $('w-msg').textContent = e.message || String(e); });
if ($('btn-link-bp')) $('btn-link-bp').onclick = () => connectAndLink('backpack').catch((e) => { $('w-msg').className = 'msg err'; $('w-msg').textContent = e.message || String(e); });
if ($('btn-siws')) {
  $('btn-siws').onclick = () => siwsLogin().catch((e) => {
    const m = $('msg') || $('w-msg');
    if (m) { m.className = 'msg err'; m.textContent = e.message || String(e); }
  });
}
if ($('btn-login') && $('btn-login').tagName === 'BUTTON') {
  $('btn-login').onclick = () => {
    const redir = encodeURIComponent(location.origin + '/');
    location.href = ID_GW + '/login?redirect_uri=' + redir + '&return=' + redir + '&origin=' + encodeURIComponent(location.origin) + '&app=grudge-wallet';
  };
}
$('btn-logout').onclick = () => {
  clearFleetAuth();
  try {
    document.cookie = 'grudge_auth_token=; path=/; max-age=0; Domain=.grudge-studio.com; SameSite=Lax';
    document.cookie = 'sso_token=; path=/; max-age=0; Domain=.grudge-studio.com; SameSite=Lax';
  } catch {}
  location.reload();
};
$('btn-phantom').onclick = (e) => {
  e.preventDefault();
  location.href = handoffUrl(POKER + '/wallet');
};
$('btn-trader').onclick = (e) => {
  e.preventDefault();
  location.href = handoffUrl(TRADER);
};
$('btn-create-wallet').onclick = async () => {
  $('msg').className = 'msg';
  $('msg').textContent = 'Checking Railway wallet…';
  try {
    const st = await api('/api/wallet/status');
    if (st.ok && st.data && st.data.hasWallet && st.data.walletAddress) {
      $('msg').textContent = 'Wallet already exists.';
      $('msg').className = 'msg ok';
      await load();
      return;
    }
    const me = await api('/api/auth/me');
    const email = me.data?.email || me.data?.user_email || '';
    if (!email) {
      $('msg').textContent = 'Grudge ID needs an email before Crossmint mint.';
      $('msg').className = 'msg err';
      return;
    }
    const r = await api('/api/wallet/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!r.ok) throw new Error(r.data?.error || 'Create failed');
    $('msg').textContent = r.data?.message || 'Wallet ready';
    $('msg').className = 'msg ok';
    await load();
  } catch (e) {
    $('msg').textContent = e.message || String(e);
    $('msg').className = 'msg err';
  }
};
$('btn-fund-play').onclick = async () => {
  const amount = Math.floor(parseFloat($('play-amt').value) || 0);
  $('tx-msg').className = 'msg';
  if (amount < 1) { $('tx-msg').textContent = 'Enter GBUX ≥ 1'; $('tx-msg').className = 'msg err'; return; }
  $('btn-fund-play').disabled = true;
  $('tx-msg').textContent = 'Moving fleet bag → play…';
  try {
    const r = await api('/api/wallet/transfer-to-play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, game: 'poker', walletAddress: walletAddr || $('tr-from') && $('tr-from').value || undefined }),
    });
    if (!r.ok) throw new Error(r.data?.error || 'Transfer failed');
    $('tx-msg').textContent = 'Funded play +' + amount + ' · bag ' + (r.data.gbuxBalance ?? '—') + ' · play ' + (r.data.play?.playGbux ?? '—');
    $('tx-msg').className = 'msg ok';
    await load();
  } catch (e) {
    $('tx-msg').textContent = e.message || String(e);
    $('tx-msg').className = 'msg err';
  } finally {
    $('btn-fund-play').disabled = !signedIn;
  }
};
$('btn-quote').onclick = async () => {
  const amount = parseFloat($('swap-amt').value);
  const direction = $('swap-dir').value;
  const r = await api('/api/exchange/quote', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, direction }),
  });
  $('swap-out').textContent = JSON.stringify(r.data, null, 2);
};
$('btn-swap').onclick = async () => {
  const amount = parseFloat($('swap-amt').value);
  const direction = $('swap-dir').value;
  $('tx-msg').textContent = 'Swapping…';
  const r = await api('/api/exchange/swap', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, direction }),
  });
  if (!r.ok) {
    $('tx-msg').textContent = r.data?.error || r.data?.message || 'Swap failed';
    $('tx-msg').className = 'msg err';
  } else {
    $('tx-msg').textContent = r.data?.message || 'Swap ok';
    $('tx-msg').className = 'msg ok';
    await load();
  }
  $('swap-out').textContent = JSON.stringify(r.data, null, 2);
};

const PRIVACY_HTML = '<p>Grudge Studio Wallet (wallet.grudge-studio.com) is the fleet bag for your Grudge ID. We store session tokens in the browser, account identity on Railway (grudge_id), Crossmint game-wallet addresses, and the auto-trader cash ledger (deposits/withdrawals/NAV) keyed by grudge_id. We do not sell personal data. On-chain SOL and token balances are public. Admin identities (grudachain / molochdadev) can halt the desk and flatten the house vault. Do not send funds you cannot lose. Contact: existing Grudge ID support paths.</p><p>Cookies: sso_token / Grudge ID session on .grudge-studio.com. No third-party ads. Analytics: none beyond host logs.</p>';
const TOS_HTML = '<p>The auto-trader is experimental. You send SOL to the house trade vault. Buys, sells, and fees spend that vault. You must keep at least 0.02 SOL in the vault for network fees or new clips halt. Close fee: 0.005 SOL of proceeds swapped to GBUX; take-profit also takes 5%. Remaining SOL stays as your spendable NAV on the same ledger. Withdrawals only to a wallet that deposited or is linked on Grudge ID. Not financial advice. Markets can go to zero. Grudge Studio may halt, refuse, or change fee rates. Enabling the trader opts you into this ledger. Privacy and these terms apply to the installed PWA the same as the site.</p>';

function openLegal(title, html) {
  $('legal-title').textContent = title;
  $('legal-body').innerHTML = html;
  const back = $('legal-back');
  back.hidden = false;
  back.classList.add('on');
}
$('btn-privacy').onclick = () => openLegal('Privacy', PRIVACY_HTML);
$('btn-tos').onclick = () => openLegal('Terms of service', TOS_HTML);
$('legal-close').onclick = () => { $('legal-back').hidden = true; $('legal-back').classList.remove('on'); };
$('legal-back').onclick = (e) => { if (e.target === $('legal-back')) { $('legal-back').hidden = true; $('legal-back').classList.remove('on'); } };

async function traderApi(path, opt) {
  const tok = getAuthToken();
  const headers = { Accept: 'application/json', ...(opt && opt.headers || {}) };
  if (tok) headers.Authorization = 'Bearer ' + tok;
  if (opt && opt.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const r = await fetch(TRADER + path, { ...opt, headers });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

async function loadTraderCash() {
  const msg = $('tr-msg');
  try {
    const ready = await fetch(TRADER + '/live-ready', { cache: 'no-store' }).then((r) => r.json());
    const gw = await traderApi('/api/gruda/wallet');
    const pk = (gw.data && gw.data.tradingPubkey) || '';
    $('tr-vault').textContent = pk ? pk.slice(0, 8) + '…' + pk.slice(-4) : 'Enable trader first';
    const tsol = gw.data && gw.data.tradingSol != null ? gw.data.tradingSol : ready.sol;
    $('tr-sol').textContent = tsol != null ? Number(tsol).toFixed(4) + ' SOL' : '—';
    if ($('tok-sol')) $('tok-sol').textContent = $('tr-sol').textContent;
    if (pk) {
      $('tr-vault-full').style.display = 'block';
      $('tr-vault-full').textContent = pk;
    }
    $('btn-tr-copy').onclick = () => { if (pk) navigator.clipboard.writeText(pk); };
    const port = await traderApi('/api/portfolio');
    $('tr-enroll').textContent = gw.data && gw.data.enrolled ? 'yes' : 'no';
    const spend = gw.data && gw.data.spendableSol != null ? gw.data.spendableSol : port.data && port.data.availableSol;
    $('tr-spend').textContent = spend != null ? Number(spend).toFixed(4) + ' SOL' : '—';
    const on = Boolean(getAuthToken());
    $('btn-tr-dep').disabled = !on;
    $('btn-tr-wd').disabled = !on;
    $('btn-tr-enroll').disabled = !on;
    if (gw.data && gw.data.walletAddress && !$('tr-from').value) $('tr-from').value = gw.data.walletAddress;
    else if (port.data && port.data.sourceWallets && port.data.sourceWallets[0] && !$('tr-from').value) $('tr-from').value = port.data.sourceWallets[0];
  } catch (e) {
    if (msg) { msg.textContent = e.message || String(e); msg.className = 'msg err'; }
  }
}

$('btn-tr-enroll').onclick = async () => {
  $('tr-msg').className = 'msg';
  $('tr-msg').textContent = 'Enabling…';
  const r = await traderApi('/api/gruda/enable', { method: 'POST', body: '{}' });
  $('tr-msg').textContent = r.ok ? 'Enrolled. Deposit SOL to the vault, then Record deposit.' : (r.data.error || 'Enable failed');
  $('tr-msg').className = r.ok ? 'msg ok' : 'msg err';
  await loadTraderCash();
};
$('btn-tr-dep').onclick = async () => {
  const sourceWallet = $('tr-from').value.trim();
  const amountSol = parseFloat($('tr-amt').value);
  $('tr-msg').textContent = 'Recording deposit…';
  const r = await traderApi('/api/ledger/deposit', {
    method: 'POST',
    body: JSON.stringify({ sourceWallet, amountSol }),
  });
  $('tr-msg').textContent = r.ok ? 'Deposit recorded. Keep 0.02 SOL in the vault for fees.' : (r.data.error || 'Deposit failed');
  $('tr-msg').className = r.ok ? 'msg ok' : 'msg err';
  await loadTraderCash();
};
$('btn-tr-wd').onclick = async () => {
  const sourceWallet = $('tr-from').value.trim();
  const amountSol = parseFloat($('tr-amt').value);
  $('tr-msg').textContent = 'Withdrawing…';
  const r = await traderApi('/api/ledger/withdraw', {
    method: 'POST',
    body: JSON.stringify({ sourceWallet, amountSol }),
  });
  $('tr-msg').textContent = r.ok ? ('Sent ' + (r.data.paid || amountSol) + ' SOL') : (r.data.error || 'Withdraw failed');
  $('tr-msg').className = r.ok ? 'msg ok' : 'msg err';
  await loadTraderCash();
};

renderGames();
paintDetectedWallets();
load();
loadTraderCash();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  const b = $('btn-install');
  if (b) b.style.display = '';
});
const installBtn = $('btn-install');
if (installBtn) {
  installBtn.onclick = async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice.catch(() => {});
    deferredInstall = null;
    installBtn.style.display = 'none';
  };
}
</script>
</body>
</html>`;
}

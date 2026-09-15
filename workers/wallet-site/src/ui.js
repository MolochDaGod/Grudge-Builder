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
  const gbux = poker + "/media/gbux-logo-64.png";

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
background:#07070c;display:flex;flex-direction:column;align-items:center;padding:20px 14px 48px;position:relative}
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
.game strong{font-size:.88rem;color:var(--gold2)}
.game span{font-size:.72rem;color:var(--dim);line-height:1.35}
.badge{display:inline-flex;font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:999px;border:1px solid rgba(34,197,94,.35);color:#86efac;background:rgba(34,197,94,.08);margin-bottom:8px}
.foot{margin-top:22px;font-size:.65rem;color:#52525b;letter-spacing:.08em;text-transform:uppercase;text-align:center}
.tabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
.tabs button{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08);color:var(--dim);padding:7px 12px;border-radius:999px;font-size:.75rem}
.tabs button.on{border-color:var(--gold);color:var(--gold2)}
.panel{display:none}.panel.on{display:block}
</style>
</head>
<body>
<div class="bg" aria-hidden="true"></div>
<div class="bg2" aria-hidden="true"></div>
<div class="wrap">
  <nav class="nav">
    <a class="brand" href="${portal}"><img src="${logo}" alt="" width="36" height="36" /> Grudge Studio Wallet</a>
    <div class="links">
      <a href="${portal}">Studio</a>
      <a href="${poker}/wallet">Poker</a>
      <a href="${client}">Warlords</a>
      <a href="https://grudox.grudge-studio.com">GRUDOX</a>
      <a href="${idGw}/login?redirect_uri=${encodeURIComponent("https://wallet.grudge-studio.com/")}&app=wallet&origin=${encodeURIComponent("https://wallet.grudge-studio.com")}">Sign in</a>
      <button class="ghost" type="button" id="btn-install" style="display:none">Install app</button>
    </div>
  </nav>

  <div class="hero">
    <div class="cap" style="position:relative;min-height:120px">
      <div class="badge" id="edge-badge">fleet · production</div>
      <h1>Studio Wallet</h1>
      <p>One Grudge ID · Crossmint game wallet (create only if missing) · bag GBUX · auto-trader at trader.grudge-studio.com.</p>
    </div>
  </div>

  <div class="grid">
    <section class="card">
      <h2><img src="${gbux}" alt="" /> Balances</h2>
      <div class="row"><span class="k">Session</span><span class="v" id="sess">…</span></div>
      <div class="row"><span class="k">Grudge ID</span><span class="v" id="gid">—</span></div>
      <div class="row"><span class="k">Fleet bag GBUX</span><span class="v" id="gbux">—</span></div>
      <div class="row"><span class="k">Play GBUX</span><span class="v" id="play">—</span></div>
      <div class="row"><span class="k">Network</span><span class="v" id="net">…</span></div>
      <div class="row"><span class="k">Mint</span><span class="v" id="mint">…</span></div>
      <div class="row"><span class="k">Gruda / Crossmint</span><span class="v" id="cmint">—</span></div>
      <div class="addr" id="addr"></div>
      <p style="font-size:.75rem;color:var(--dim);margin-top:8px;line-height:1.4">Auto-trader fee: 0.005 SOL → GBUX on each close; TP +5%. Remainder stays in the trading wallet.</p>
      <div class="btns">
        <button class="primary" type="button" id="btn-refresh">Refresh</button>
        <button class="ghost" type="button" id="btn-login">Sign in</button>
        <button class="ghost" type="button" id="btn-logout" style="display:none">Sign out</button>
        <button class="cyan" type="button" id="btn-create-wallet" style="display:none">Create Gruda wallet</button>
        <a class="btn ghost" id="btn-trader" href="${trader}">Auto-trader</a>
        <a class="btn ghost" id="btn-phantom" href="${poker}/wallet">Poker wallet</a>
      </div>
      <p class="msg" id="msg"></p>
    </section>

    <section class="card">
      <h2>Move GBUX</h2>
      <div class="tabs">
        <button type="button" class="on" data-tab="play">→ Play ledger</button>
        <button type="button" data-tab="swap">Bag SOL↔GBUX</button>
      </div>
      <div class="panel on" id="tab-play">
        <p style="font-size:.8rem;color:var(--dim);line-height:1.45;margin-bottom:8px">Send bag GBUX to Poker play ledger (no chain fee). Requires Grudge ID. Poker-branded wallet: poker.grudge-studio.com/wallet</p>
        <label class="k" style="font-size:.75rem">Amount (GBUX)</label>
        <input class="input" id="play-amt" type="number" min="1" step="1" value="100" />
        <button class="cyan" type="button" id="btn-fund-play" disabled>Send to Poker play</button>
      </div>
      <div class="panel" id="tab-swap">
        <p style="font-size:.8rem;color:var(--dim);line-height:1.45;margin-bottom:8px">Server bag swap on Railway (SOL ↔ GBUX). Not table chips until you Fund play.</p>
        <label class="k" style="font-size:.75rem">Direction</label>
        <select class="input" id="swap-dir">
          <option value="sol-to-gbux">SOL → GBUX</option>
          <option value="gbux-to-sol">GBUX → SOL</option>
        </select>
        <label class="k" style="font-size:.75rem">Amount</label>
        <input class="input" id="swap-amt" type="number" min="0" step="any" value="0.1" />
        <div class="btns">
          <button class="ghost" type="button" id="btn-quote" disabled>Quote</button>
          <button class="primary" type="button" id="btn-swap" disabled>Swap</button>
        </div>
        <pre id="swap-out" style="font-size:.7rem;color:var(--dim);margin-top:8px;white-space:pre-wrap;max-height:100px;overflow:auto"></pre>
      </div>
      <p class="msg" id="tx-msg"></p>
    </section>
  </div>

  <section class="card" style="margin-top:14px">
    <h2>Games · re-enter with session</h2>
    <div class="gamess" id="games"></div>
  </section>

  <section class="card" style="margin-top:14px">
    <h2>Heroes (Railway)</h2>
    <div id="hero-list" style="font-size:.82rem;color:var(--dim)">—</div>
  </section>

  <p class="foot">wallet.grudge-studio.com · Grudge Studio fleet bag · Railway SSOT</p>
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
  { name: 'Auto-trader', desc: 'SOL desk · GBUX fee · rotating capital', href: TRADER, img: '${gbux}' },
  { name: 'Poker wallet', desc: 'BUDB play · fund · sit', href: POKER + '/wallet', img: '${gbux}' },
  { name: 'BUDB Poker', desc: 'Hold\\'em · slots · BJ · play GBUX', href: POKER + '/lobby', img: '${gbux}' },
  { name: 'Nexus Nemesis', desc: 'TCG · Nexus era', href: 'https://nexus.grudge-studio.com', img: '${gbux}' },
  { name: 'Warlords play', desc: 'Client · home island', href: '${client}/home', img: '${logo}' },
  { name: 'Character Foundry', desc: 'Create · 4 slots', href: 'https://character.grudge-studio.com/?era=warlords', img: '${logo}' },
  { name: 'Grudge Open', desc: 'Danger · library', href: 'https://open.grudge-studio.com', img: '${gbux}' },
  { name: 'GRUDOX', desc: 'Arcade cabinets', href: 'https://grudox.grudge-studio.com', img: '${logo}' },
  { name: 'Mine-Loader', desc: 'Voxel realms', href: 'https://mine.grudge-studio.com', img: '${gbux}' },
  { name: 'Forge', desc: 'Map / scene editor', href: 'https://forge.grudge-studio.com', img: '${logo}' },
  { name: 'Casting lab', desc: 'Warlords skills VFX', href: 'https://casting.grudge-studio.com', img: '${gbux}' },
  { name: 'Portal', desc: 'grudge-studio.com', href: '${portal}', img: '${logo}' },
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
  $('btn-login').style.display = on ? 'none' : '';
  $('btn-logout').style.display = on ? '' : 'none';
  $('btn-fund-play').disabled = !on;
  $('btn-quote').disabled = !on;
  $('btn-swap').disabled = !on;
}
function renderGames() {
  $('games').innerHTML = GAMES.map((g) =>
    '<a class="game" href="' + g.href + '" data-handoff="1"><strong>' + g.name + '</strong><span>' + g.desc + '</span></a>'
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
      $('gbux').textContent = Number(st.data.gbuxBalance ?? 0).toLocaleString();
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
      $('gbux').textContent = Number(ov.data.gbuxBalance ?? $('gbux').textContent.replace(/,/g,'') ?? 0).toLocaleString();
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
  } catch (e) {
    $('msg').textContent = 'Error: ' + (e && e.message ? e.message : e);
    $('msg').className = 'msg err';
  }
}

document.querySelectorAll('.tabs button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('on'));
    $('tab-' + b.dataset.tab).classList.add('on');
  };
});
$('btn-refresh').onclick = () => load();
$('btn-login').onclick = () => {
  const redir = encodeURIComponent(location.origin + '/');
  location.href = ID_GW + '/login?redirect_uri=' + redir + '&return=' + redir + '&origin=' + encodeURIComponent(location.origin) + '&app=grudge-wallet';
};
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
      body: JSON.stringify({ amount, game: 'poker', walletAddress: walletAddr || undefined }),
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

renderGames();
load();
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

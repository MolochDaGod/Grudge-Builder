/**
 * grudge-wallet-site — production edge for wallet.grudge-studio.com
 *
 * - Serves wallet UI (no VPS origin)
 * - Proxies /api/* → Railway game-state SSOT
 * - Auth handoff → id.grudge-studio.com
 * - /health for uptime monitors
 */

const CORS_ALLOW = [
  'https://wallet.grudge-studio.com',
  'https://client.grudge-studio.com',
  'https://grudge-studio.com',
  'https://www.grudge-studio.com',
  'https://id.grudge-studio.com',
  'https://grudgewarlords.com',
  'https://dash.grudge-studio.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allow =
    CORS_ALLOW.includes(origin) ||
    /\.grudge-studio\.com$/.test(new URL(origin || 'http://x').hostname) ||
    /\.vercel\.app$/.test(new URL(origin || 'http://x').hostname)
      ? origin
      : CORS_ALLOW[0];
  return {
    'Access-Control-Allow-Origin': allow || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Grudge-Token, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extra,
    },
  });
}

async function proxyTo(origin, request, pathWithSearch) {
  const url = new URL(pathWithSearch, origin);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('X-Forwarded-Host', 'wallet.grudge-studio.com');
  headers.set('X-Forwarded-Proto', 'https');
  headers.set('X-Grudge-Edge', 'grudge-wallet-site');

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(url.toString(), init);
  const outHeaders = new Headers(upstream.headers);
  outHeaders.set('X-Grudge-Edge', 'grudge-wallet-site');
  outHeaders.set('X-Grudge-Upstream', origin);
  // Don't leak upstream CORS if any
  outHeaders.delete('Access-Control-Allow-Origin');
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

function htmlPage(env) {
  const railway = env.RAILWAY_API_ORIGIN || 'https://grudge-api-production-0d46.up.railway.app';
  const idGw = env.ID_GATEWAY_ORIGIN || 'https://id.grudge-studio.com';
  const client = env.CLIENT_ORIGIN || 'https://client.grudge-studio.com';
  const portal = env.PORTAL_ORIGIN || 'https://grudge-studio.com';
  const assets = env.ASSETS_CDN || 'https://assets.grudge-studio.com';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Wallet · Grudge Studio</title>
<meta name="description" content="Grudge Studio production wallet — Solana, GBUX, Crossmint, fleet auth." />
<meta name="robots" content="noindex" />
<link rel="icon" href="${portal}/favicon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Jost:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
:root {
  --bg:#07070c; --panel:#12121a; --border:rgba(212,175,55,.22);
  --gold:#d4af37; --gold2:#f3d9a4; --text:#f4f4f5; --dim:#a1a1aa;
  --ok:#22c55e; --warn:#f59e0b; --err:#ef4444; --purple:#a855f7;
}
*{box-sizing:border-box;margin:0;padding:0}
body{
  min-height:100vh;font-family:Jost,system-ui,sans-serif;color:var(--text);
  background:
    radial-gradient(ellipse 70% 45% at 50% -5%, rgba(212,175,55,.16), transparent 55%),
    radial-gradient(circle at 85% 20%, rgba(168,85,247,.08), transparent 40%),
    linear-gradient(180deg,#0c0c12,#07070c);
  display:flex;flex-direction:column;align-items:center;padding:28px 16px 48px;
}
.nav{width:100%;max-width:720px;display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;gap:12px;flex-wrap:wrap}
.brand{font-family:Cinzel,serif;color:var(--gold);font-size:1.05rem;letter-spacing:.06em;text-decoration:none;display:flex;align-items:center;gap:10px}
.brand img{width:28px;height:28px;border-radius:6px}
.links{display:flex;gap:8px;flex-wrap:wrap;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase}
.links a{color:var(--dim);text-decoration:none;padding:6px 10px;border-radius:999px;border:1px solid transparent}
.links a:hover{color:var(--gold2);border-color:rgba(212,175,55,.35)}
.card{
  width:100%;max-width:520px;background:rgba(18,18,26,.88);
  border:1px solid var(--border);border-radius:16px;padding:28px 24px;
  box-shadow:0 24px 60px rgba(0,0,0,.45);backdrop-filter:blur(12px);
}
h1{font-family:Cinzel,serif;color:var(--gold2);font-size:1.45rem;margin-bottom:6px}
.sub{color:var(--dim);font-size:.85rem;margin-bottom:22px;line-height:1.5}
.badge{display:inline-flex;align-items:center;gap:6px;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;
  padding:4px 10px;border-radius:999px;border:1px solid rgba(34,197,94,.35);color:#86efac;background:rgba(34,197,94,.08);margin-bottom:14px}
.row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:.9rem}
.row:last-child{border-bottom:none}
.k{color:var(--dim)}.v{color:var(--text);font-weight:500;text-align:right;word-break:break-all}
.addr{font-family:ui-monospace,monospace;font-size:.78rem;color:var(--purple);background:#0a0a12;
  border:1px solid rgba(168,85,247,.25);border-radius:10px;padding:12px;margin:14px 0;display:none;word-break:break-all}
.btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
button,.btn{
  appearance:none;border:none;cursor:pointer;font-family:inherit;font-weight:600;font-size:.88rem;
  padding:11px 18px;border-radius:10px;transition:transform .15s,opacity .15s;
}
button.primary,.btn.primary{background:linear-gradient(180deg,#e0c05a,#b8922a);color:#1a1405}
button.ghost,.btn.ghost{background:transparent;color:var(--gold2);border:1px solid rgba(212,175,55,.4)}
button:hover{transform:translateY(-1px);opacity:.95}
button:disabled{opacity:.5;cursor:not-allowed;transform:none}
.msg{margin-top:14px;font-size:.82rem;color:var(--dim);min-height:1.2em}
.msg.err{color:#fca5a5}.msg.ok{color:#86efac}
.foot{margin-top:28px;font-size:.68rem;color:#52525b;letter-spacing:.08em;text-transform:uppercase;text-align:center}
</style>
</head>
<body>
  <nav class="nav">
    <a class="brand" href="${portal}">
      <img src="${portal}/grudge-logo.png" alt="" width="28" height="28" />
      Grudge Studio
    </a>
    <div class="links">
      <a href="${client}">Play</a>
      <a href="${idGw}/login?redirect_uri=${encodeURIComponent('https://wallet.grudge-studio.com/')}">Sign in</a>
      <a href="${portal}">Portal</a>
    </div>
  </nav>

  <main class="card">
    <div class="badge" id="edge-badge">edge · production</div>
    <h1>Fleet Wallet</h1>
    <p class="sub">Server-side Solana wallets (Crossmint) and GBUX — backed by Railway Postgres SSOT, not the old VPS.</p>

    <div id="status-block">
      <div class="row"><span class="k">Network</span><span class="v" id="net">…</span></div>
      <div class="row"><span class="k">Crossmint</span><span class="v" id="xm">…</span></div>
      <div class="row"><span class="k">GBUX mint</span><span class="v" id="mint">…</span></div>
      <div class="row"><span class="k">Session</span><span class="v" id="sess">checking…</span></div>
    </div>

    <div class="addr" id="addr"></div>

    <div class="btns">
      <button class="primary" type="button" id="btn-refresh">Refresh</button>
      <button class="ghost" type="button" id="btn-login">Sign in with Grudge ID</button>
      <a class="btn ghost" href="${client}">Open client</a>
    </div>
    <p class="msg" id="msg"></p>
  </main>

  <p class="foot">wallet.grudge-studio.com · grudge-wallet-site · Railway API</p>

<script>
const RAILWAY = ${JSON.stringify(railway)};
const ID_GW = ${JSON.stringify(idGw)};
const $ = (id) => document.getElementById(id);

function tokenFromUrl() {
  const u = new URL(location.href);
  const t = u.searchParams.get('grudge_token') || u.searchParams.get('sso_token') || u.searchParams.get('token');
  if (t) {
    try { localStorage.setItem('grudge_token', t); } catch {}
    u.searchParams.delete('grudge_token');
    u.searchParams.delete('sso_token');
    u.searchParams.delete('token');
    history.replaceState(null, '', u.pathname + u.search);
  }
  try { return localStorage.getItem('grudge_token') || ''; } catch { return ''; }
}

async function api(path, opts = {}) {
  const headers = Object.assign({ 'Accept': 'application/json' }, opts.headers || {});
  const tok = tokenFromUrl();
  if (tok) headers['Authorization'] = 'Bearer ' + tok;
  // Same-origin proxy first (edge), fallback Railway absolute
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

async function load() {
  $('msg').textContent = '';
  $('msg').className = 'msg';
  try {
    const cfg = await api('/api/wallet/config');
    if (cfg.ok && cfg.data) {
      $('net').textContent = cfg.data.network || '—';
      $('xm').textContent = cfg.data.crossmintEnabled ? 'enabled' : 'disabled';
      const m = cfg.data.gbuxMint || '';
      $('mint').textContent = m ? m.slice(0, 6) + '…' + m.slice(-4) : '—';
    }
    const st = await api('/api/wallet/status');
    if (st.status === 401 || st.status === 403) {
      $('sess').textContent = 'signed out';
      $('addr').style.display = 'none';
      return;
    }
    if (st.ok && st.data) {
      $('sess').textContent = st.data.hasWallet ? (st.data.walletType || 'wallet') : 'no wallet';
      if (st.data.walletAddress) {
        $('addr').style.display = 'block';
        $('addr').textContent = st.data.walletAddress;
      }
    } else {
      $('sess').textContent = 'status ' + st.status;
    }
  } catch (e) {
    $('msg').textContent = 'Edge/API error: ' + (e && e.message ? e.message : e);
    $('msg').className = 'msg err';
  }
}

$('btn-refresh').onclick = () => load();
$('btn-login').onclick = () => {
  const redir = encodeURIComponent(location.origin + '/');
  location.href = ID_GW + '/login?redirect_uri=' + redir;
};
load();
</script>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Health / meta
    if (url.pathname === '/health' || url.pathname === '/api/edge/health') {
      return json(
        {
          ok: true,
          service: 'grudge-wallet-site',
          environment: env.ENVIRONMENT || 'production',
          railway: env.RAILWAY_API_ORIGIN,
          time: new Date().toISOString(),
          vps_origin: false,
        },
        200,
        cors,
      );
    }

    const railway = env.RAILWAY_API_ORIGIN || 'https://grudge-api-production-0d46.up.railway.app';
    const idGw = env.ID_GATEWAY_ORIGIN || 'https://id.grudge-studio.com';

    // Auth API → id gateway (session exchange, etc.)
    if (
      url.pathname.startsWith('/api/auth') ||
      url.pathname === '/login' ||
      url.pathname.startsWith('/auth/')
    ) {
      const res = await proxyTo(idGw, request, url.pathname + url.search);
      const h = new Headers(res.headers);
      Object.entries(cors).forEach(([k, v]) => h.set(k, v));
      return new Response(res.body, { status: res.status, headers: h });
    }

    // Game-state wallet API → Railway SSOT
    if (url.pathname.startsWith('/api/')) {
      const res = await proxyTo(railway, request, url.pathname + url.search);
      const h = new Headers(res.headers);
      Object.entries(cors).forEach(([k, v]) => h.set(k, v));
      return new Response(res.body, { status: res.status, headers: h });
    }

    // SPA shell
    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/wallet') {
      return new Response(htmlPage(env), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
          'X-Grudge-Edge': 'grudge-wallet-site',
          ...cors,
        },
      });
    }

    // Unknown path → shell (SPA)
    return new Response(htmlPage(env), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
        'X-Grudge-Edge': 'grudge-wallet-site',
        ...cors,
      },
    });
  },
};

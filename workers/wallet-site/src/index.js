/**
 * grudge-wallet-site — production edge for wallet.grudge-studio.com
 */
import { htmlPage, downloadPage } from "./ui.js";
import { parseSwap, parseExecute, parseMint, rpcParamsOk } from "./swap-validate.js";

export const WALLET_BUILD = "2026-09-18-download";

const CORS_ALLOW = [
  "https://wallet.grudge-studio.com",
  "https://client.grudge-studio.com",
  "https://poker.grudge-studio.com",
  "https://grudge-studio.com",
  "https://www.grudge-studio.com",
  "https://id.grudge-studio.com",
  "https://grudgewarlords.com",
  "https://open.grudge-studio.com",
  "https://grudox.grudge-studio.com",
  "https://character.grudge-studio.com",
  "https://trader.grudge-studio.com",
  "https://dash.grudge-studio.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  let allow = CORS_ALLOW[0];
  try {
    const host = new URL(origin || "http://x").hostname;
    if (
      CORS_ALLOW.includes(origin) ||
      /\.grudge-studio\.com$/.test(host) ||
      /\.grudge\.studio$/.test(host) ||
      /\.grok-sandbox\.com$/.test(host) ||
      /\.vercel\.app$/.test(host) ||
      /\.puter\.site$/.test(host)
    ) {
      allow = origin || CORS_ALLOW[0];
    }
  } catch {
    /* keep default */
  }
  return {
    "Access-Control-Allow-Origin": allow || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Grudge-Token, X-Requested-With, X-Fleet-Play-Secret",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}

async function proxyTo(origin, request, pathWithSearch) {
  const url = new URL(pathWithSearch, origin);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("X-Forwarded-Host", "wallet.grudge-studio.com");
  headers.set("X-Forwarded-Proto", "https");
  headers.set("X-Grudge-Edge", "grudge-wallet-site");
  const init = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }
  const upstream = await fetch(url.toString(), init);
  const outHeaders = new Headers(upstream.headers);
  outHeaders.set("X-Grudge-Edge", "grudge-wallet-site");
  outHeaders.set("X-Grudge-Upstream", origin);
  outHeaders.delete("Access-Control-Allow-Origin");
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

const HTML_PATHS = new Set([
  "/",
  "/index.html",
  "/wallet",
  "/wallet/",
  "/auth/callback",
  "/auth/callback/",
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/health" || url.pathname === "/api/edge/health") {
      return json(
        {
          ok: true,
          service: "grudge-wallet-site",
          build: WALLET_BUILD,
          environment: env.ENVIRONMENT || "production",
          railway: env.RAILWAY_API_ORIGIN,
          poker: env.POKER_ORIGIN || "https://poker.grudge-studio.com",
          trader: env.TRADER_ORIGIN || "https://trader.grudge-studio.com",
          time: new Date().toISOString(),
          vps_origin: false,
          features: [
            "play-primary-crossmint",
            "linked-wallets",
            "combined-balances",
            "in-wallet-swap",
            "token-page-dexscreener",
            "cnft-das",
            "dapps-catalog",
            "auth-callback",
            "pwa-install",
            "windows-download",
            "gbux-circulating",
          ],
        },
        200,
        cors,
      );
    }

    if (url.pathname === "/wallet-app.js") {
      if (env.ASSETS) {
        const asset = await env.ASSETS.fetch(request);
        if (asset.status !== 404) {
          const h = new Headers(asset.headers);
          h.set("Content-Type", "text/javascript; charset=utf-8");
          h.set("Cache-Control", "no-store");
          h.set("X-Grudge-Wallet-Build", WALLET_BUILD);
          Object.entries(cors).forEach(([k, v]) => h.set(k, v));
          return new Response(asset.body, { status: 200, headers: h });
        }
      }
      return new Response("/* wallet-app missing */", {
        status: 200,
        headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store", ...cors },
      });
    }

    if (url.pathname.startsWith("/media/") && env.ASSETS) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) {
        const h = new Headers(asset.headers);
        h.set("X-Grudge-Edge", "grudge-wallet-site");
        h.set("Cache-Control", "public, max-age=86400");
        Object.entries(cors).forEach(([k, v]) => h.set(k, v));
        return new Response(asset.body, { status: asset.status, headers: h });
      }
    }

    const railway =
      env.RAILWAY_API_ORIGIN ||
      "https://grudge-api-production-0d46.up.railway.app";
    const idGw = env.ID_GATEWAY_ORIGIN || "https://id.grudge-studio.com";

    if (url.pathname === "/login") {
      const dest = `${url.origin}/auth/callback`;
      const loc =
        `${idGw}/login?redirect_uri=${encodeURIComponent(dest)}` +
        `&return=${encodeURIComponent(dest)}` +
        `&origin=${encodeURIComponent(url.origin)}` +
        `&app=wallet&scope=identity`;
      return Response.redirect(loc, 302);
    }

    if (url.pathname === "/download" || url.pathname === "/download/") {
      return new Response(downloadPage(), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Grudge-Wallet-Build": WALLET_BUILD,
          ...cors,
        },
      });
    }

    if (url.pathname === "/manifest.webmanifest" || url.pathname === "/manifest.json") {
      return new Response(
        JSON.stringify({
          name: "Gruda Wallet",
          short_name: "Gruda Wallet",
          description: "Grudge ID Play wallet on Solana",
          start_url: "/",
          scope: "/",
          display: "standalone",
          display_override: ["standalone", "minimal-ui"],
          orientation: "portrait-primary",
          background_color: "#07070c",
          theme_color: "#e0c36a",
          id: "https://wallet.grudge-studio.com/",
          categories: ["finance", "utilities"],
          icons: [
            { src: "/favicon-32.png", sizes: "32x32", type: "image/png", purpose: "any" },
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=300", ...cors },
        },
      );
    }

    if (url.pathname === "/icon.svg") {
      return Response.redirect(new URL("/icon-192.png", url.origin).toString(), 302);
    }

    if (url.pathname === "/sw.js") {
      const sw = `const C='gruda-wallet-2026-09-18';
const SHELL=['/','/wallet-app.js','/manifest.webmanifest','/icon-192.png','/icon-512.png','/favicon-32.png','/download'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const x=r.clone();caches.open(C).then(c=>c.put(e.request,x));}return r;}).catch(()=>caches.match(e.request).then(h=>h||caches.match('/'))));
});`;
      return new Response(sw, {
        status: 200,
        headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store", ...cors },
      });
    }

    if (url.pathname === "/api/solana/rpc" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const method = String(body.method || "");
      const allow = new Set([
        "getBalance",
        "getTokenAccountsByOwner",
        "getTokenAccountBalance",
        "getAccountInfo",
        "getMultipleAccounts",
        "getTokenSupply",
      ]);
      if (!allow.has(method) || !rpcParamsOk(method, body.params || [])) {
        return json({ error: "method not allowed" }, 403, cors);
      }
      const rpcs = [env.SOLANA_RPC_URL, "https://api.mainnet-beta.solana.com"].filter(Boolean);
      let last = "rpc failed";
      for (const rpc of [...new Set(rpcs)]) {
        try {
          const r = await fetch(rpc, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: body.id || "gruda", method, params: body.params || [] }),
          });
          const text = await r.text();
          try {
            JSON.parse(text);
            return new Response(text, {
              status: 200,
              headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors },
            });
          } catch {
            last = text.slice(0, 80);
          }
        } catch (err) {
          last = String(err && err.message || err);
        }
      }
      return json({ error: last }, 502, cors);
    }

    if (url.pathname === "/api/gbux/circulating" || url.pathname === "/api/gbux/supply") {
      try {
        const rpc = env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
        const mint = "55TpSoMNxbfsNJ9U1dQoo9H3dRtDmjBZVMcKqvU2nray";
        const r = await fetch(rpc, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: "gbux", method: "getTokenSupply", params: [mint] }),
        });
        const j = await r.json();
        const v = j && j.result && j.result.value;
        if (!v || v.amount == null) return json({ error: "getTokenSupply failed" }, 502, cors);
        const ui = v.uiAmountString || String(v.uiAmount || "");
        if (url.pathname === "/api/gbux/circulating") {
          return new Response(ui, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=30", ...cors },
          });
        }
        return json(
          {
            ok: true,
            mint,
            decimals: v.decimals,
            amount: String(v.amount),
            circulating: Number(ui),
            circulatingString: ui,
            total: Number(ui),
            totalString: ui,
            source: "solana-getTokenSupply",
            at: new Date().toISOString(),
          },
          200,
          cors,
        );
      } catch (err) {
        return json({ error: "supply unavailable" }, 502, cors);
      }
    }

    if (url.pathname === "/api/token/dex" && request.method === "GET") {
      const mint = (url.searchParams.get("mint") || "").trim();
      const mints = (url.searchParams.get("mints") || "").split(",").map((s) => s.trim()).filter(Boolean);
      const list = (mints.length ? mints : (mint ? [mint] : [])).slice(0, 30).filter((m) => parseMint(m).ok);
      if (!list.length) return json({ error: "mint required" }, 400, cors);
      try {
        const DS = "https://api.dexscreener.com";
        let pairs = [];
        if (list.length === 1) {
          const r = await fetch(`${DS}/token-pairs/v1/solana/${encodeURIComponent(list[0])}`, {
            headers: { accept: "application/json" },
          });
          const body = await r.json().catch(() => []);
          pairs = Array.isArray(body) ? body : (body.pairs || []);
        } else {
          const r = await fetch(`${DS}/tokens/v1/solana/${list.map(encodeURIComponent).join(",")}`, {
            headers: { accept: "application/json" },
          });
          const body = await r.json().catch(() => []);
          pairs = Array.isArray(body) ? body : (body.pairs || []);
        }
        pairs = pairs.filter((p) => p && p.chainId === "solana" && list.includes(p.baseToken && p.baseToken.address));
        return json({ ok: true, source: "dexscreener-v1", pairs }, 200, cors);
      } catch (err) {
        return json({ error: "dexscreener failed" }, 502, cors);
      }
    }

    if (url.pathname === "/api/token/price" && request.method === "GET") {
      const ids = (url.searchParams.get("ids") || url.searchParams.get("mint") || "")
        .split(",")
        .map((s) => s.trim())
        .filter((m) => parseMint(m).ok)
        .slice(0, 50);
      if (!ids.length) return json({ error: "ids required" }, 400, cors);
      const urls = [
        "https://lite-api.jup.ag/price/v3?ids=" + ids.map(encodeURIComponent).join(","),
        "https://api.jup.ag/price/v3?ids=" + ids.map(encodeURIComponent).join(","),
      ];
      let last = "price failed";
      for (const src of urls) {
        try {
          const r = await fetch(src, { headers: { accept: "application/json" } });
          const body = await r.json().catch(() => ({}));
          if (body && typeof body === "object") return json({ ok: true, source: "jupiter-price-v3", prices: body }, 200, cors);
        } catch (err) {
          last = String(err && err.message || err);
        }
      }
      return json({ error: last }, 502, cors);
    }

    if (url.pathname.startsWith("/api/swap/")) {
      const jup = (env.JUPITER_SWAP_URL || "https://lite-api.jup.ag/swap/v2").replace(/\/$/, "");
      const jh = { accept: "application/json" };
      if (env.JUPITER_API_KEY) jh["x-api-key"] = env.JUPITER_API_KEY;
      try {
        if (url.pathname === "/api/swap/quote" && request.method === "GET") {
          const q = url.searchParams;
          const parsed = parseSwap({
            inputMint: q.get("inputMint") || "",
            outputMint: q.get("outputMint") || "",
            amount: q.get("amount") || "",
            slippageBps: q.get("slippageBps") || "100",
            taker: q.get("taker") || "",
          });
          if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400, cors);
          const orderUrl = `${jup}/order?${new URLSearchParams({
            inputMint: parsed.inputMint,
            outputMint: parsed.outputMint,
            amount: parsed.amount,
            slippageBps: String(parsed.slippageBps),
            ...(parsed.taker ? { taker: parsed.taker } : {}),
          })}`;
          const r = await fetch(orderUrl, { headers: jh });
          const body = await r.json().catch(() => ({}));
          return json(
            {
              ok: r.ok && Boolean(body.outAmount),
              inAmount: body.inAmount,
              outAmount: body.outAmount,
              otherAmountThreshold: body.otherAmountThreshold,
              slippageBps: body.slippageBps,
              requestId: body.requestId,
              transaction: body.transaction || null,
              error: body.errorMessage || body.error || null,
            },
            r.ok ? 200 : r.status,
            cors,
          );
        }
        if (url.pathname === "/api/swap/execute" && request.method === "POST") {
          const payload = await request.json().catch(() => ({}));
          const parsed = parseExecute(payload);
          if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400, cors);
          const r = await fetch(`${jup}/execute`, {
            method: "POST",
            headers: { ...jh, "content-type": "application/json" },
            body: JSON.stringify({
              signedTransaction: parsed.signedTransaction,
              requestId: parsed.requestId,
            }),
          });
          const body = await r.json().catch(() => ({}));
          return json(
            {
              ok: r.ok && Boolean(body.signature),
              signature: body.signature,
              status: body.status,
              error: body.error || null,
              result: body,
            },
            r.ok ? 200 : r.status,
            cors,
          );
        }
        return json({ error: "unknown swap route" }, 404, cors);
      } catch (err) {
        return json({ ok: false, error: "swap upstream failed" }, 502, cors);
      }
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        const res = await proxyTo(railway, request, url.pathname + url.search);
        const h = new Headers(res.headers);
        Object.entries(cors).forEach(([k, v]) => h.set(k, v));
        return new Response(res.body, { status: res.status, headers: h });
      } catch (err) {
        return json({ ok: false, error: "railway upstream unavailable", service: "grudge-wallet-site" }, 502, cors);
      }
    }

    if (HTML_PATHS.has(url.pathname) || (request.headers.get("Accept") || "").includes("text/html")) {
      return new Response(htmlPage(env), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Grudge-Edge": "grudge-wallet-site",
          "X-Grudge-Wallet-Build": WALLET_BUILD,
          ...cors,
        },
      });
    }

    if (env.ASSETS) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) {
        const h = new Headers(asset.headers);
        Object.entries(cors).forEach(([k, v]) => h.set(k, v));
        return new Response(asset.body, { status: asset.status, headers: h });
      }
    }

    return new Response(htmlPage(env), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Grudge-Edge": "grudge-wallet-site",
        "X-Grudge-Wallet-Build": WALLET_BUILD,
        ...cors,
      },
    });
  },
};

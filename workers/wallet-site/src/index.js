/**
 * grudge-wallet-site — production edge for wallet.grudge-studio.com
 */
import { htmlPage } from "./ui.js";

export const WALLET_BUILD = "2026-09-16-store-v2";

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

const RPC_ALLOW = new Set([
  "getAsset",
  "getAssets",
  "getAssetBatch",
  "getAssetsByOwner",
  "searchAssets",
  "getBalance",
  "getTokenAccountsByOwner",
  "getTokenAccountBalance",
  "getAccountInfo",
  "getMultipleAccounts",
]);

const DAPPS = [
  { id: "trader", name: "Auto-trader", tagline: "SOL desk · rotating capital", category: "Desk", featured: true, row: "hero", href: "https://trader.grudge-studio.com", img: "https://trader.grudge-studio.com/art/fabledgrudge.jpeg", developer: "Grudge Studio", rating: "4.9", age: "18+", blurb: "Fund the vault from Wallet 1. Engine key, not SIWS." },
  { id: "poker", name: "BUDB Poker", tagline: "Holdem · slots · blackjack", category: "Play", row: "must", href: "https://poker.grudge-studio.com/lobby", img: "https://poker.grudge-studio.com/media/og-image.jpg", developer: "Grudge Studio", rating: "4.8", age: "18+", blurb: "Sit with bag GBUX from this hub." },
  { id: "poker-wallet", name: "Poker wallet", tagline: "BUDB play · fund · sit", category: "Play", row: "must", href: "https://poker.grudge-studio.com/wallet", img: "https://poker.grudge-studio.com/media/felt-budb-green.jpg", developer: "Grudge Studio", rating: "4.7", age: "18+", blurb: "Move GBUX onto the felt." },
  { id: "warlords", name: "Warlords", tagline: "Home island · play", category: "Play", row: "must", href: "https://client.grudge-studio.com/home", img: "https://client.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", rating: "4.8", age: "13+", blurb: "Hero cNFTs mint to your Crossmint play wallet." },
  { id: "grudox", name: "GRUDOX", tagline: "Arcade cabinets", category: "Play", row: "must", href: "https://grudox.grudge-studio.com", img: "https://grudox.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", rating: "4.6", age: "13+", blurb: "Cabinets, same Grudge ID." },
  { id: "mine", name: "Mine-Loader", tagline: "Voxel realms", category: "Play", row: "must", href: "https://mineloader.grudge-studio.com", img: "https://mineloader.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", rating: "4.5", age: "9+", blurb: "Voxel worlds on your ID." },
  { id: "foundry", name: "Character Foundry", tagline: "Create · 4 slots", category: "Studio", row: "studio", href: "https://character.grudge-studio.com/?era=warlords", img: "https://character.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", rating: "4.7", age: "13+", blurb: "Mint lands on Crossmint play — shows in cNFTs." },
  { id: "forge", name: "Forge", tagline: "Map / scene editor", category: "Studio", row: "studio", href: "https://forge.grudge-studio.com", img: "https://forge.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", rating: "4.4", age: "13+", blurb: "Build scenes for Warlords." },
  { id: "open", name: "Grudge Open", tagline: "Danger · library", category: "Studio", row: "studio", href: "https://open.grudge-studio.com", img: "https://open.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", rating: "4.3", age: "18+", blurb: "Research library, same session." },
  { id: "studio", name: "Studio portal", tagline: "grudge-studio.com", category: "Studio", row: "studio", href: "https://grudge-studio.com", img: "https://grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", rating: "4.6", age: "13+", blurb: "Home of the fleet." },
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

function rpcUrl(env) {
  if (env.SOLANA_RPC_URL) return env.SOLANA_RPC_URL;
  if (env.HELIUS_API_KEY) return "https://mainnet.helius-rpc.com/?api-key=" + env.HELIUS_API_KEY;
  return "";
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

async function handleRpc(request, env, cors) {
  if (request.method !== "POST") return json({ error: "POST JSON-RPC" }, 405, cors);
  const url = rpcUrl(env) || "https://api.mainnet-beta.solana.com";
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400, cors);
  }
  const method = String(body.method || "");
  if (!RPC_ALLOW.has(method)) return json({ error: "method not allowed" }, 403, cors);
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: body.id || "gruda", method, params: body.params }),
  });
  const text = await upstream.text();
  try {
    return json(JSON.parse(text), 200, cors);
  } catch {
    const pub = "https://api.mainnet-beta.solana.com";
    const das = method.startsWith("getAsset") || method === "searchAssets";
    if (das) return json({ error: text.slice(0, 180) || "DAS unavailable" }, 502, cors);
    const fallback = await fetch(pub, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: body.id || "gruda", method, params: body.params }),
    });
    return json(await fallback.json(), 200, cors);
  }
}

async function handleTokenMeta(request, cors) {
  const q = new URL(request.url).searchParams.get("q") || new URL(request.url).searchParams.get("mint") || "";
  if (!q.trim()) return json({ error: "q or mint required" }, 400, cors);
  try {
    const jr = await fetch("https://lite-api.jup.ag/tokens/v2/search?query=" + encodeURIComponent(q.trim()));
    const rows = await jr.json();
    const items = (Array.isArray(rows) ? rows : [])
      .filter((row) => row && row.id)
      .slice(0, 8)
      .map((row) => ({
        mint: row.id,
        symbol: row.symbol || "",
        name: row.name || row.symbol || "Token",
        logo: row.icon || row.logoURI || "",
        decimals: Number(row.decimals || 0),
      }));
    if (items.length) {
      return json({ ...items[0], items }, 200, cors);
    }
  } catch {
    /* fall through */
  }
  return json({ error: "Token not found" }, 404, cors);
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
          rpc: Boolean(rpcUrl(env)),
          time: new Date().toISOString(),
          vps_origin: false,
          features: [
            "fleet-bag",
            "transfer-to-play",
            "sheets-recv-send-wallets",
            "wallet-standard-siws",
            "linked-wallets",
            "trader-vault-enable",
            "auth-callback",
            "pwa-install",
            "coins-rpc-add-token",
            "cnfts-crossmint",
            "dapps-app-store",
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
        `&app=wallet`;
      return Response.redirect(loc, 302);
    }

    if (url.pathname === "/manifest.webmanifest" || url.pathname === "/manifest.json") {
      const logo = `${idGw}/grudge-id-logo.png`;
      return new Response(
        JSON.stringify({
          name: "Gruda Wallet",
          short_name: "Gruda Wallet",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#07070c",
          theme_color: "#e0c36a",
          icons: [
            { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
            { src: logo, sizes: "192x192", type: "image/png" },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "no-store", ...cors },
        },
      );
    }

    if (url.pathname === "/icon.svg") {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#07070c"/><path d="M256 48l176 80v128c0 112-75 198-176 240C155 454 80 368 80 256V128z" fill="#1a1405" stroke="#d4af37" stroke-width="22"/><text x="256" y="300" text-anchor="middle" font-family="Georgia,serif" font-size="140" fill="#d4af37">G</text></svg>`;
      return new Response(svg, {
        status: 200,
        headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400", ...cors },
      });
    }

    if (url.pathname === "/sw.js") {
      const sw = `self.addEventListener('install',(e)=>{self.skipWaiting();});self.addEventListener('activate',(e)=>{e.waitUntil(self.clients.claim());});self.addEventListener('fetch',(e)=>{const u=new URL(e.request.url);if(u.pathname.startsWith('/api/')||u.pathname==='/'||u.pathname==='/wallet-app.js')return;});`;
      return new Response(sw, {
        status: 200,
        headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store", ...cors },
      });
    }

    if (url.pathname === "/api/solana/rpc") {
      return handleRpc(request, env, cors);
    }
    if (url.pathname === "/api/wallet/dapps" && request.method === "GET") {
      return json({ store: "Grudge Apps", copy: "Opens with your Grudge ID session.", items: DAPPS }, 200, cors);
    }
    if (url.pathname === "/api/wallet/token-meta" && request.method === "GET") {
      const edge = await handleTokenMeta(request, cors);
      if (edge.status !== 404) return edge;
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        const res = await proxyTo(railway, request, url.pathname + url.search);
        const h = new Headers(res.headers);
        Object.entries(cors).forEach(([k, v]) => h.set(k, v));
        if (url.pathname === "/api/wallet/token-meta" && (res.status === 404 || res.status === 502)) {
          return handleTokenMeta(request, cors);
        }
        return new Response(res.body, { status: res.status, headers: h });
      } catch (err) {
        if (url.pathname === "/api/wallet/token-meta") return handleTokenMeta(request, cors);
        if (url.pathname === "/api/wallet/dapps") {
          return json({ store: "Grudge Apps", items: DAPPS }, 200, cors);
        }
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

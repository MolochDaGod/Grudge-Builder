/**
 * grudge-wallet-site — production edge for wallet.grudge-studio.com
 */
import { htmlPage } from "./ui.js";

export const WALLET_BUILD = "2026-09-17-tokpage-v1";

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
            "fleet-bag",
            "transfer-to-play",
            "sheets-recv-send-wallets",
            "wallet-standard-siws",
            "linked-wallets",
            "trader-vault-enable",
            "auth-callback",
            "pwa-install",
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

    if (url.pathname === "/manifest.webmanifest" || url.pathname === "/manifest.json") {
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
      const sw = `self.addEventListener('install',(e)=>{self.skipWaiting();});self.addEventListener('activate',(e)=>{e.waitUntil(self.clients.claim());});self.addEventListener('fetch',(e)=>{const u=new URL(e.request.url);if(u.pathname.startsWith('/api/')||u.pathname==='/'||u.pathname==='/wallet-app.js')return;});`;
      return new Response(sw, {
        status: 200,
        headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store", ...cors },
      });
    }

    if (url.pathname === "/api/token/dex" && request.method === "GET") {
      const mint = url.searchParams.get("mint") || "";
      if (!mint) return json({ error: "mint required" }, 400, cors);
      try {
        const r = await fetch("https://api.dexscreener.com/latest/dex/tokens/" + encodeURIComponent(mint), {
          headers: { accept: "application/json" },
        });
        const body = await r.json().catch(() => ({}));
        return json(body, r.ok ? 200 : r.status, cors);
      } catch (err) {
        return json({ error: "dexscreener failed" }, 502, cors);
      }
    }

    if (url.pathname.startsWith("/api/swap/")) {
      const jup = (env.JUPITER_SWAP_URL || "https://lite-api.jup.ag/swap/v2").replace(/\/$/, "");
      const jh = { accept: "application/json" };
      if (env.JUPITER_API_KEY) jh["x-api-key"] = env.JUPITER_API_KEY;
      try {
        if (url.pathname === "/api/swap/quote" && request.method === "GET") {
          const q = url.searchParams;
          const orderUrl = `${jup}/order?${new URLSearchParams({
            inputMint: q.get("inputMint") || "",
            outputMint: q.get("outputMint") || "",
            amount: q.get("amount") || "",
            slippageBps: q.get("slippageBps") || "100",
            ...(q.get("taker") ? { taker: q.get("taker") } : {}),
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
          const r = await fetch(`${jup}/execute`, {
            method: "POST",
            headers: { ...jh, "content-type": "application/json" },
            body: JSON.stringify({
              signedTransaction: payload.signedTransaction,
              requestId: payload.requestId,
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

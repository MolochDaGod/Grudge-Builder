/**
 * grudge-wallet-site — production edge for wallet.grudge-studio.com
 *
 * - Clean multi-game wallet UI (images, reconnect, fund play, bag swap)
 * - Proxies /api/* → Railway game-state SSOT
 * - Auth handoff → id.grudge-studio.com
 * - /health for uptime monitors
 */
import { htmlPage } from "./ui.js";

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
      /\.vercel\.app$/.test(host)
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

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };
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
          environment: env.ENVIRONMENT || "production",
          railway: env.RAILWAY_API_ORIGIN,
          poker: env.POKER_ORIGIN || "https://poker.grudge-studio.com",
          trader: env.TRADER_ORIGIN || "https://trader.grudge-studio.com",
          time: new Date().toISOString(),
          vps_origin: false,
          features: [
            "fleet-bag",
            "transfer-to-play",
            "exchange-swap",
            "game-handoff",
            "phantom-reconnect",
            "crossmint-check-first",
            "auto-trader-handoff",
            "pwa-install",
          ],
        },
        200,
        cors,
      );
    }

    const railway =
      env.RAILWAY_API_ORIGIN ||
      "https://grudge-api-production-0d46.up.railway.app";
    const idGw = env.ID_GATEWAY_ORIGIN || "https://id.grudge-studio.com";

    const railwayAuth =
      url.pathname.startsWith("/api/auth/") || url.pathname === "/api/auth";
    if (railwayAuth) {
      const res = await proxyTo(railway, request, url.pathname + url.search);
      const h = new Headers(res.headers);
      Object.entries(cors).forEach(([k, v]) => h.set(k, v));
      return new Response(res.body, { status: res.status, headers: h });
    }

    if (url.pathname === "/login" || url.pathname.startsWith("/auth/")) {
      const res = await proxyTo(idGw, request, url.pathname + url.search);
      const h = new Headers(res.headers);
      Object.entries(cors).forEach(([k, v]) => h.set(k, v));
      return new Response(res.body, { status: res.status, headers: h });
    }

    if (url.pathname.startsWith("/api/")) {
      const res = await proxyTo(railway, request, url.pathname + url.search);
      const h = new Headers(res.headers);
      Object.entries(cors).forEach(([k, v]) => h.set(k, v));
      return new Response(res.body, { status: res.status, headers: h });
    }

    if (url.pathname === "/manifest.webmanifest" || url.pathname === "/manifest.json") {
      const logo = `${idGw}/grudge-id-logo.png`;
      const manifest = {
        name: "Grudge Studio Wallet",
        short_name: "Gruda Wallet",
        description: "One Grudge ID · Crossmint game wallet · fleet bag · auto-trader",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#07070c",
        theme_color: "#d4af37",
        id: "https://wallet.grudge-studio.com/",
        icons: [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: logo, sizes: "192x192", type: "image/png", purpose: "any" },
          { src: logo, sizes: "512x512", type: "image/png", purpose: "any" },
        ],
      };
      return new Response(JSON.stringify(manifest), {
        status: 200,
        headers: {
          "Content-Type": "application/manifest+json; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          ...cors,
        },
      });
    }

    if (url.pathname === "/icon.svg") {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="96" fill="#07070c"/>
<path d="M256 48l176 80v128c0 112-75 198-176 240C155 454 80 368 80 256V128z" fill="#1a1405" stroke="#d4af37" stroke-width="22"/>
<text x="256" y="300" text-anchor="middle" font-family="Georgia,serif" font-size="140" fill="#d4af37">G</text>
</svg>`;
      return new Response(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
          ...cors,
        },
      });
    }

    if (url.pathname === "/sw.js") {
      const sw = `self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (u.pathname.startsWith('/api/')) return;
});`;
      return new Response(sw, {
        status: 200,
        headers: {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=60",
          ...cors,
        },
      });
    }

    if (
      url.pathname === "/" ||
      url.pathname === "/index.html" ||
      url.pathname === "/wallet"
    ) {
      return new Response(htmlPage(env), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=30",
          "X-Grudge-Edge": "grudge-wallet-site",
          ...cors,
        },
      });
    }

    return new Response(htmlPage(env), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=30",
        "X-Grudge-Edge": "grudge-wallet-site",
        ...cors,
      },
    });
  },
};

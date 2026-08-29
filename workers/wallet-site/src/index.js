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
          time: new Date().toISOString(),
          vps_origin: false,
          features: [
            "fleet-bag",
            "transfer-to-play",
            "exchange-swap",
            "game-handoff",
            "phantom-reconnect",
            "app-tiles",
            "auth-callback",
          ],
        },
        200,
        cors,
      );
    }

    if (url.pathname.startsWith("/media/") && env.ASSETS) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) {
        const h = new Headers(asset.headers);
        h.set("X-Grudge-Edge", "grudge-wallet-site");
        h.set("Cache-Control", "public, max-age=86400");
        Object.entries(cors).forEach(([k, v]) => h.set(k, v));
        return new Response(asset.body, {
          status: asset.status,
          statusText: asset.statusText,
          headers: h,
        });
      }
    }

    const railway =
      env.RAILWAY_API_ORIGIN ||
      "https://grudge-api-production-0d46.up.railway.app";
    const idGw = env.ID_GATEWAY_ORIGIN || "https://id.grudge-studio.com";

    // Never fetch id.grudge-studio.com from this Worker (same-zone orange-cloud → 526).
    // Browser goes to Grudge ID; return lands on /auth/callback HTML.
    if (url.pathname === "/login") {
      const dest = `${url.origin}/auth/callback`;
      const loc =
        `${idGw}/login?redirect_uri=${encodeURIComponent(dest)}` +
        `&return=${encodeURIComponent(dest)}` +
        `&origin=${encodeURIComponent(url.origin)}` +
        `&app=grudge-wallet`;
      return Response.redirect(loc, 302);
    }

    const htmlPaths = new Set([
      "/",
      "/index.html",
      "/wallet",
      "/wallet/",
      "/auth/callback",
      "/auth/callback/",
    ]);
    if (htmlPaths.has(url.pathname)) {
      return new Response(htmlPage(env), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Grudge-Edge": "grudge-wallet-site",
          ...cors,
        },
      });
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        const res = await proxyTo(railway, request, url.pathname + url.search);
        const h = new Headers(res.headers);
        Object.entries(cors).forEach(([k, v]) => h.set(k, v));
        return new Response(res.body, { status: res.status, headers: h });
      } catch (err) {
        return json(
          {
            ok: false,
            error: "railway upstream unavailable",
            service: "grudge-wallet-site",
          },
          502,
          cors,
        );
      }
    }

    return new Response(htmlPage(env), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Grudge-Edge": "grudge-wallet-site",
        ...cors,
      },
    });
  },
};

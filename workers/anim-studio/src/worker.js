/**
 * Cloudflare Worker — anim.grudge-studio.com
 * Serves Anim Studio SPA + proxies /api/* → anim-ai-worker.
 */

const AI_UPSTREAM = "https://anim-ai-worker.grudge.workers.dev";

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=()",
  "X-Frame-Options": "SAMEORIGIN",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...SECURITY,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Debug
    if (path === "/__whoami") {
      return Response.json(
        {
          service: "anim-studio",
          path,
          hasAssets: !!env.ASSETS,
          upstream: env.AI_UPSTREAM || AI_UPSTREAM,
        },
        { headers: SECURITY },
      );
    }

    // API proxy → anim-ai-worker
    if (path === "/api" || path.startsWith("/api/")) {
      let upstreamPath = path.slice("/api".length) || "/";
      if (!upstreamPath.startsWith("/")) upstreamPath = "/" + upstreamPath;
      const target = AI_UPSTREAM + upstreamPath + url.search;
      try {
        const init = {
          method: request.method,
          headers: {
            "Content-Type": request.headers.get("Content-Type") || "application/json",
            Accept: request.headers.get("Accept") || "application/json",
          },
        };
        if (request.method !== "GET" && request.method !== "HEAD") {
          init.body = await request.text();
        }
        const upstream = await fetch(target, init);
        const text = await upstream.text();
        return new Response(text, {
          status: upstream.status,
          headers: {
            "Content-Type":
              upstream.headers.get("Content-Type") || "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": upstreamPath.includes("health")
              ? "public, max-age=30"
              : "no-store",
            ...SECURITY,
          },
        });
      } catch (err) {
        return Response.json(
          { error: "Upstream unreachable", detail: String(err), target },
          { status: 502, headers: SECURITY },
        );
      }
    }

    // Static assets
    if (env.ASSETS) {
      let res = await env.ASSETS.fetch(request);
      if (res.status === 404 && request.method === "GET") {
        res = await env.ASSETS.fetch(new URL("/index.html", url).toString());
      }
      const headers = new Headers(res.headers);
      for (const [k, v] of Object.entries(SECURITY)) headers.set(k, v);
      const immutable =
        path.startsWith("/assets/") || path.endsWith(".wasm");
      headers.set(
        "Cache-Control",
        immutable
          ? "public, max-age=31536000, immutable"
          : path.endsWith(".html") || path === "/"
            ? "public, max-age=60, must-revalidate"
            : "public, max-age=3600",
      );
      return new Response(res.body, { status: res.status, headers });
    }

    return new Response("ASSETS binding missing", { status: 500, headers: SECURITY });
  },
};

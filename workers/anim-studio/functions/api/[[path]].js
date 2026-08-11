/**
 * Cloudflare Pages Function — proxy /api/* → anim-ai-worker
 */
const UPSTREAM = "https://anim-ai-worker.grudge.workers.dev";

export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const parts = params.path;
  const sub =
    !parts || (Array.isArray(parts) && parts.length === 0)
      ? ""
      : Array.isArray(parts)
        ? parts.join("/")
        : String(parts);
  const target = `${UPSTREAM}/${sub}${url.search}`.replace(/([^:]\/)\/+/g, "$1");

  const init = {
    method: request.method,
    headers: {
      Accept: request.headers.get("Accept") || "application/json",
      "Content-Type": request.headers.get("Content-Type") || "application/json",
    },
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  try {
    const res = await fetch(target, init);
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": sub.includes("health") ? "public, max-age=30" : "no-store",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Upstream unreachable", detail: String(err), target }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}

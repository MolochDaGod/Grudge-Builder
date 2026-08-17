/**
 * Same-origin R2 proxy.
 *
 * Browser → /api/assets/* (Referer: grudgewarlords.com)
 *   → this function fetches assets.grudge-studio.com WITHOUT Referer
 *   → Cloudflare Hotlink Protection (error 1011) does not fire
 *
 * Vercel rewrites forward Referer, so they 403. Filesystem /api wins over
 * the /api/assets rewrite when this function is deployed.
 */
export const config = { runtime: "edge" };

const CDN = "https://assets.grudge-studio.com";
const MAX_PATH = 512;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Expose-Headers":
    "ETag, Accept-Ranges, Content-Length, Content-Type, Content-Range",
  "Access-Control-Max-Age": "86400",
  "X-Grudge-Asset-Proxy": "strip-referer",
};

function corsHeaders(extra?: Headers): Headers {
  const out = extra ? new Headers(extra) : new Headers();
  for (const [k, v] of Object.entries(CORS)) out.set(k, v);
  return out;
}

function assetKeyFromRequest(req: Request): string | null {
  const url = new URL(req.url);
  const prefix = "/api/assets/";
  if (!url.pathname.startsWith(prefix)) return null;
  let key = url.pathname.slice(prefix.length);
  try {
    key = decodeURIComponent(key);
  } catch {
    return null;
  }
  if (!key || key.length > MAX_PATH) return null;
  if (key.includes("..") || key.includes("\\") || key.includes("://")) return null;
  if (key.startsWith("/") || key.includes("//")) return null;
  if (!/^[A-Za-z0-9._\-/% ]+$/.test(key)) return null;
  return key;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders(),
    });
  }

  const key = assetKeyFromRequest(req);
  if (!key) {
    return new Response("Bad Request", { status: 400, headers: corsHeaders() });
  }

  const url = new URL(req.url);
  const upstream = `${CDN}/${key}${url.search}`;
  const headers = new Headers();
  // Do not forward Referer or Origin — zone Hotlink Protection 1011.
  const range = req.headers.get("range");
  const ifNone = req.headers.get("if-none-match");
  const accept = req.headers.get("accept");
  if (range) headers.set("Range", range);
  if (ifNone) headers.set("If-None-Match", ifNone);
  if (accept) headers.set("Accept", accept);
  headers.set("User-Agent", "grudge-vercel-asset-proxy");

  let res: Response;
  try {
    res = await fetch(upstream, {
      method: req.method,
      headers,
      redirect: "follow",
    });
  } catch {
    return new Response("Bad Gateway", { status: 502, headers: corsHeaders() });
  }

  const out = new Headers();
  for (const name of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
    "cache-control",
  ]) {
    const v = res.headers.get(name);
    if (v) out.set(name, v);
  }
  if (!out.has("Cache-Control")) {
    out.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
  }
  const headersOut = corsHeaders(out);

  return new Response(req.method === "HEAD" ? null : res.body, {
    status: res.status,
    headers: headersOut,
  });
}

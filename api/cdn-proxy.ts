/**
 * Same-origin R2 proxy (Vercel Node function).
 *
 * vercel.json rewrites:
 *   /api/assets/:path* → /api/cdn-proxy?key=:path*
 *   /sprites|/icons    → /api/cdn-proxy?key=…
 *
 * Uses node:https (not fetch). Vercel fetch forwards the incoming Referer,
 * which Cloudflare Hotlink Protection 1011s.
 */
import https from "node:https";
import { Readable } from "node:stream";

export const config = { runtime: "nodejs" };

const CDN_HOST = "assets.grudge-studio.com";
const MAX_PATH = 512;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Expose-Headers":
    "ETag, Accept-Ranges, Content-Length, Content-Type, Content-Range",
  "Access-Control-Max-Age": "86400",
  "X-Grudge-Asset-Proxy": "cdn-proxy",
};

function corsHeaders(extra?: Headers): Headers {
  const out = extra ? new Headers(extra) : new Headers();
  for (const [k, v] of Object.entries(CORS)) out.set(k, v);
  return out;
}

function sanitizeKey(raw: string): string | null {
  let key = raw.trim();
  try {
    key = decodeURIComponent(key);
  } catch {
    return null;
  }
  key = key.replace(/^\/+/, "");
  if (!key || key.length > MAX_PATH) return null;
  if (key.includes("..") || key.includes("\\") || key.includes("://")) return null;
  if (key.includes("//")) return null;
  if (!/^[A-Za-z0-9._\-/% ]+$/.test(key)) return null;
  return key;
}

function assetKeyFromRequest(req: Request): string | null {
  const url = new URL(req.url);
  const q = url.searchParams.get("key");
  if (q) return sanitizeKey(q);
  for (const prefix of ["/api/cdn-proxy/", "/api/assets/"]) {
    if (url.pathname.startsWith(prefix)) {
      return sanitizeKey(url.pathname.slice(prefix.length));
    }
  }
  return null;
}

function cdnRequest(
  method: string,
  key: string,
  extraSearch: string,
  reqHeaders: Request,
): Promise<{ status: number; headers: Headers; stream: Readable }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      Host: CDN_HOST,
      Accept: reqHeaders.headers.get("accept") || "*/*",
      "User-Agent": "grudge-vercel-asset-proxy",
      Referer: `https://${CDN_HOST}/`,
    };
    const range = reqHeaders.headers.get("range");
    const ifNone = reqHeaders.headers.get("if-none-match");
    if (range) headers.Range = range;
    if (ifNone) headers["If-None-Match"] = ifNone;

    const qs = extraSearch.replace(/^\?/, "");
    const filtered = qs
      .split("&")
      .filter((p) => p && !p.startsWith("key="))
      .join("&");
    const path = `/${key}${filtered ? `?${filtered}` : ""}`;

    const req = https.request(
      {
        protocol: "https:",
        hostname: CDN_HOST,
        path,
        method,
        headers,
      },
      (res) => {
        const out = new Headers();
        for (const [k, v] of Object.entries(res.headers)) {
          if (v == null) continue;
          out.set(k, Array.isArray(v) ? v.join(", ") : v);
        }
        resolve({
          status: res.statusCode || 502,
          headers: out,
          stream: res,
        });
      },
    );
    req.setTimeout(20000, () => {
      req.destroy(new Error("cdn timeout"));
    });
    req.on("error", reject);
    req.end();
  });
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
  let upstream: { status: number; headers: Headers; stream: Readable };
  try {
    upstream = await cdnRequest(req.method, key, url.search, req);
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
    const v = upstream.headers.get(name);
    if (v) out.set(name, v);
  }
  if (!out.has("Cache-Control")) {
    out.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
  }
  out.set("X-Upstream-Status", String(upstream.status));
  const headersOut = corsHeaders(out);

  if (req.method === "HEAD") {
    upstream.stream.resume();
    return new Response(null, { status: upstream.status, headers: headersOut });
  }

  return new Response(Readable.toWeb(upstream.stream) as unknown as BodyInit, {
    status: upstream.status,
    headers: headersOut,
  });
}

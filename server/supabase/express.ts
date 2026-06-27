import type {
  Request as ExpressRequest,
  Response,
  NextFunction,
} from "express";
import {
  withSupabase,
  createSupabaseContext,
  type SupabaseContext,
  type WithSupabaseConfig,
} from "@supabase/server";

export type { SupabaseContext };

declare global {
  namespace Express {
    interface Request {
      supabaseContext?: SupabaseContext;
    }
  }
}

/** Map an Express request to the Web Fetch API Request that @supabase/server expects. */
export function toWebRequest(req: ExpressRequest): globalThis.Request {
  const host = req.get("host") ?? "localhost";
  const proto = req.protocol === "https" ? "https" : "http";
  const url = `${proto}://${host}${req.originalUrl}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  const init: globalThis.RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD" && req.body != null) {
    init.body =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
  }

  return new globalThis.Request(url, init);
}

/** Send a Web Response through Express. */
export async function sendWebResponse(res: Response, webRes: globalThis.Response) {
  res.status(webRes.status);
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    res.setHeader(key, value);
  });
  const body = await webRes.text();
  res.send(body);
}

/**
 * Express middleware — validates auth and attaches ctx to req.supabaseContext.
 * Mirrors withSupabase({ auth }) for a single route group.
 */
export function supabaseAuth(config: WithSupabaseConfig) {
  return async (req: ExpressRequest, res: Response, next: NextFunction) => {
    const { data, error } = await createSupabaseContext(toWebRequest(req), config);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }
    req.supabaseContext = data;
    next();
  };
}

/**
 * Mount a withSupabase fetch handler on an Express path (all methods).
 * Useful when you want identical handlers on Railway and Edge Functions.
 */
type WebRequest = globalThis.Request;
type WebResponse = globalThis.Response;

export function mountSupabaseHandler(
  config: WithSupabaseConfig,
  handler: (req: WebRequest, ctx: SupabaseContext) => Promise<WebResponse>,
) {
  const fetchHandler = withSupabase(config, handler);

  return async (req: ExpressRequest, res: Response) => {
    const webRes = await fetchHandler(toWebRequest(req));
    await sendWebResponse(res, webRes);
  };
}
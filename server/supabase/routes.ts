import type { Express, Request, Response } from "express";

/**
 * Supabase compatibility routes — health probe for fleet wiring audits.
 * Legacy data may still live in Supabase; this endpoint reports connectivity only.
 */
export function registerSupabaseRoutes(app: Express) {
  app.get("/api/supabase/health", async (_req: Request, res: Response) => {
    const url = process.env.SUPABASE_URL;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasAnonKey = !!process.env.SUPABASE_ANON_KEY;

    if (!url) {
      return res.json({
        ok: false,
        configured: false,
        detail: "SUPABASE_URL not set — using MySQL/Railway as primary datastore",
        primary: "mysql",
      });
    }

    try {
      const probeUrl = `${url.replace(/\/$/, "")}/rest/v1/`;
      const r = await fetch(probeUrl, {
        method: "HEAD",
        headers: hasAnonKey
          ? { apikey: process.env.SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY!}` }
          : undefined,
        signal: AbortSignal.timeout(6000),
      });
      res.json({
        ok: r.ok || r.status === 401,
        configured: true,
        status: r.status,
        hasServiceKey,
        hasAnonKey,
        primary: "mysql",
        detail: r.ok ? "reachable" : "configured but REST probe returned non-OK",
      });
    } catch (e: unknown) {
      res.json({
        ok: false,
        configured: true,
        hasServiceKey,
        hasAnonKey,
        primary: "mysql",
        detail: e instanceof Error ? e.message : "unreachable",
      });
    }
  });
}
import type { Express, Request, Response } from "express";

/**
 * Optional Supabase connectivity probe — NOT game-data SSOT.
 *
 * Production Warlords stack:
 *   Vercel (client) · Railway Postgres + Colyseus (grudge-api) · Cloudflare (R2/Workers)
 *
 * `/api/supabase/*` exists only for fleet audits. Leave SUPABASE_URL unset in prod.
 * Do not write characters / islands / bag / JWT sessions to Supabase.
 */
export function registerSupabaseRoutes(app: Express) {
  app.get("/api/supabase/health", async (_req: Request, res: Response) => {
    const url = process.env.SUPABASE_URL;
    const hasServiceKey = !!(
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    );
    const hasAnonKey = !!(
      process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY
    );

    const primary = {
      engine: "postgres",
      host: "railway",
      service: "grudge-api",
      role: "player SSOT (DATABASE_URL / Drizzle)",
    } as const;

    if (!url) {
      return res.json({
        ok: true,
        configured: false,
        required: false,
        deprecated: true,
        detail:
          "SUPABASE_URL not set — correct for production. Player data is Railway Postgres.",
        primary,
        stack: ["vercel", "railway", "colyseus", "cloudflare"],
      });
    }

    try {
      const probeUrl = `${url.replace(/\/$/, "")}/rest/v1/`;
      const r = await fetch(probeUrl, {
        method: "HEAD",
        headers: hasAnonKey
          ? {
              apikey:
                process.env.SUPABASE_ANON_KEY ||
                process.env.SUPABASE_PUBLISHABLE_KEY ||
                "",
              Authorization: `Bearer ${
                process.env.SUPABASE_ANON_KEY ||
                process.env.SUPABASE_PUBLISHABLE_KEY ||
                ""
              }`,
            }
          : undefined,
        signal: AbortSignal.timeout(6000),
      });
      res.json({
        ok: r.ok || r.status === 401,
        configured: true,
        required: false,
        deprecated: true,
        status: r.status,
        hasServiceKey,
        hasAnonKey,
        detail: r.ok
          ? "reachable (optional/legacy — not SSOT)"
          : "configured but REST probe returned non-OK",
        primary,
        stack: ["vercel", "railway", "colyseus", "cloudflare"],
      });
    } catch (e: unknown) {
      res.json({
        ok: false,
        configured: true,
        required: false,
        deprecated: true,
        hasServiceKey,
        hasAnonKey,
        detail: e instanceof Error ? e.message : "unreachable",
        primary,
        stack: ["vercel", "railway", "colyseus", "cloudflare"],
      });
    }
  });
}

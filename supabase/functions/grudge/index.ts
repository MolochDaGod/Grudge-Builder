import { withSupabase } from "npm:@supabase/server@1";

/**
 * Authenticated Grudge API stub on Supabase Edge Functions.
 * Replace the query with your tables once migrations are applied.
 */
export default {
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    const { userClaims, jwtClaims, authMode } = ctx;

    return Response.json({
      ok: true,
      authMode,
      user: userClaims,
      jwtSub: jwtClaims?.sub ?? null,
      hint: "Use ctx.supabase for RLS-scoped queries, ctx.supabaseAdmin to bypass RLS.",
    });
  }),
};
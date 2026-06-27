import { withSupabase } from "npm:@supabase/server@1";

/** Public health check — no credentials required. */
export default {
  fetch: withSupabase({ auth: "none" }, async () => {
    return Response.json({ status: "ok", service: "supabase-edge" });
  }),
};
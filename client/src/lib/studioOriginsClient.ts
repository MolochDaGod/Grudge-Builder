import type { StudioOriginOpts } from "@shared/fleet/studioOrigins";

/**
 * Client runtime adapter for the pure shared studio-origin allowlist.
 * Defaults to PRODUCTION: localhost is allowed only when Vite explicitly
 * signals a dev server (import.meta.env.DEV === true). Production builds
 * compile DEV to false, so localhost is always rejected there.
 */
export function clientStudioOriginOpts(): StudioOriginOpts {
  const env = import.meta.env;
  return {
    dev: env?.DEV === true,
    extraHosts: String(env?.VITE_AUTH_ALLOWED_RETURN_HOSTS || ""),
  };
}

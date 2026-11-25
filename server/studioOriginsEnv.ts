import type { StudioOriginOpts } from "@shared/fleet/studioOrigins";

/**
 * Server runtime adapter for the pure shared studio-origin allowlist.
 * Defaults to PRODUCTION: localhost is allowed only when NODE_ENV is exactly
 * "development". Extra exact hosts come from AUTH_ALLOWED_RETURN_HOSTS
 * (legacy AUTH_EXTRA_RETURN_HOSTS / GRUDGE_AUTH_EXTRA_HOSTS still honoured).
 */
export function serverStudioOriginOpts(): StudioOriginOpts {
  const dev = process.env.NODE_ENV === "development";
  const extraHosts = [
    process.env.AUTH_ALLOWED_RETURN_HOSTS,
    process.env.AUTH_EXTRA_RETURN_HOSTS,
    process.env.GRUDGE_AUTH_EXTRA_HOSTS,
  ]
    .filter(Boolean)
    .join(",");
  return { dev, extraHosts };
}

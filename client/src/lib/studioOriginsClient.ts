import type { StudioOriginOpts } from "@shared/fleet/studioOrigins";

export function clientStudioOriginOpts(): StudioOriginOpts {
  const env = (import.meta as { env?: Record<string, unknown> }).env || {};
  return {
    dev: env.DEV === true,
    extraHosts: String(env.VITE_AUTH_ALLOWED_RETURN_HOSTS || ""),
  };
}

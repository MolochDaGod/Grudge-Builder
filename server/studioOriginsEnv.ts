import type { StudioOriginOpts } from "@shared/fleet/studioOrigins";

export function serverStudioOriginOpts(): StudioOriginOpts {
  const nodeEnv = String(process.env.NODE_ENV || "").toLowerCase();
  const dev = nodeEnv === "development";
  const extraHosts = [
    process.env.AUTH_ALLOWED_RETURN_HOSTS,
    process.env.AUTH_EXTRA_RETURN_HOSTS,
    process.env.GRUDGE_AUTH_EXTRA_HOSTS,
  ]
    .filter(Boolean)
    .join(",");
  return { dev, extraHosts };
}

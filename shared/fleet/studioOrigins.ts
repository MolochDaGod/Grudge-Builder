export const STUDIO_HOSTS = [
  "grudge-studio.com",
  "www.grudge-studio.com",
  "id.grudge-studio.com",
  "client.grudge-studio.com",
  "character.grudge-studio.com",
  "characters.grudge-studio.com",
  "forge.grudge-studio.com",
  "launcher.grudge-studio.com",
  "dash.grudge-studio.com",
  "fleet.grudge-studio.com",
  "ai.grudge-studio.com",
  "ui.grudge-studio.com",
  "apps.grudge-studio.com",
  "account.grudge-studio.com",
  "mine.grudge-studio.com",
  "anim.grudge-studio.com",
  "grudox.grudge-studio.com",
  "carrier.grudge-studio.com",
  "water.grudge-studio.com",
  "wcs.grudge-studio.com",
  "warstrat.grudge-studio.com",
  "trader.grudge-studio.com",
  "nexus.grudge-studio.com",
  "game.grudge-studio.com",
  "open.grudge-studio.com",
  "coder.grudge-studio.com",
  "grudachain.grudge-studio.com",
  "grudge6.grudge-studio.com",
  "survival.grudge-studio.com",
  "grudges.grudge-studio.com",
  "metaverse.grudge-studio.com",
  "play.grudge-studio.com",
  "studio.grudge-studio.com",
  "poker.grudge-studio.com",
  "docs.grudge-studio.com",
  "test.grudge-studio.com",
  "warlord3d.grudge-studio.com",
  "grudge-arena.grudge-studio.com",
  "dcq.grudge-studio.com",
  "wow.grudge-studio.com",
  "engine.grudge-studio.com",
  "pvp.grudge-studio.com",
  "wartrailer.grudge-studio.com",
  "grudgewarlords.com",
  "www.grudgewarlords.com",
  "play.grudgewarlords.com",
  "client.grudgewarlords.com",
  "airship.grudgewarlords.com",
  "home.grudgewarlords.com",
  "map.grudgewarlords.com",
  "scenes.grudgewarlords.com",
  "craft.grudgewarlords.com",
  "foundry.grudgewarlords.com",
  "grudge.studio",
  "www.grudge.studio",
  "warlords.grudge.studio",
  "nexus.grudge.studio",
  "voxel.grudge.studio",
  "account.grudge.studio",
  "apps.grudge.studio",
  "poker.grudge.studio",
  "casting.grudge.studio",
  "play.grudge.studio",
  "grudgestudio.org",
  "grudgeplatform.io",
  "puter.com",
  "www.puter.com",
  "app.puter.com",
  "grudge-crafting.puter.site",
  "grudgewarlords.puter.site",
  "grudgestudio.puter.site",
  "grudge-studio.puter.site",
  "grudge-heros.puter.site",
  "grudge-studio-tool.vercel.app",
  "grudge-builder.vercel.app",
  "grudge-builder-grudgenexus.vercel.app",
  "gameopen.vercel.app",
  "warlord-genesis.vercel.app",
  "rts-grudge.vercel.app",
  "voxgrudge.vercel.app",
  "casting-abilities-threejs.vercel.app",
  "grudge-studio-editor.vercel.app",
  "grudge-three-port.vercel.app",
  "flare-boss-arena.vercel.app",
  "mech-playground.vercel.app",
  "mine-loader.vercel.app",
  "grudge-drive.vercel.app",
  "anim-studio.pages.dev",
  "grudge-studio-dash.pages.dev",
] as const;

type ValidateReturnOptions = {
  base?: string;
  production?: boolean;
  fallback?: string;
};

type StudioOriginOptions = {
  production?: boolean;
};

function isProductionEnv(explicit?: boolean): boolean {
  if (typeof explicit === "boolean") return explicit;
  const env =
    (typeof process !== "undefined" && process.env?.NODE_ENV) ||
    (typeof process !== "undefined" && process.env?.ENVIRONMENT) ||
    "";
  return String(env).toLowerCase() === "production";
}

function readHostEnv(): string {
  try {
    if (typeof process !== "undefined" && process.env) {
      return [
        process.env.AUTH_ALLOWED_RETURN_HOSTS,
        process.env.AUTH_EXTRA_RETURN_HOSTS,
        process.env.GRUDGE_AUTH_EXTRA_HOSTS,
      ]
        .filter(Boolean)
        .join(",");
    }
  } catch {
    /* noop */
  }
  try {
    if (typeof globalThis !== "undefined") {
      const g = globalThis as {
        AUTH_ALLOWED_RETURN_HOSTS?: string;
        AUTH_EXTRA_RETURN_HOSTS?: string;
        GRUDGE_AUTH_EXTRA_HOSTS?: string;
      };
      return [g.AUTH_ALLOWED_RETURN_HOSTS, g.AUTH_EXTRA_RETURN_HOSTS, g.GRUDGE_AUTH_EXTRA_HOSTS]
        .filter(Boolean)
        .join(",");
    }
  } catch {
    /* noop */
  }
  return "";
}

function normalizeHost(raw: string): string | null {
  const cleaned = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
  if (!cleaned) return null;
  if (!/^[a-z0-9.-]+$/.test(cleaned)) return null;
  if (cleaned.includes("..")) return null;
  if (cleaned.startsWith(".") || cleaned.endsWith(".")) return null;
  return cleaned;
}

function hasDefaultPort(url: URL): boolean {
  if (!url.port) return true;
  return (
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
  );
}

function isLocalhost(hostname: string): boolean {
  const host = String(hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
}

export function getAllowedHosts({ production }: { production?: boolean } = {}): string[] {
  const hosts = new Set<string>(STUDIO_HOSTS);
  for (const entry of readHostEnv().split(",")) {
    const normalized = normalizeHost(entry);
    if (normalized) hosts.add(normalized);
  }
  if (!isProductionEnv(production)) {
    hosts.add("localhost");
    hosts.add("127.0.0.1");
  }
  return [...hosts];
}

export function isStudioOrigin(origin: string, opts: StudioOriginOptions = {}): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (url.username || url.password) return false;
    const production = isProductionEnv(opts.production);
    const host = url.hostname.toLowerCase();
    if (isLocalhost(host)) {
      if (production) return false;
      return url.protocol === "http:";
    }
    if (url.protocol !== "https:") return false;
    if (!hasDefaultPort(url)) return false;
    const allowed = new Set(getAllowedHosts({ production }));
    return allowed.has(host);
  } catch {
    return false;
  }
}

function rejectSuspiciousRaw(raw: string): boolean {
  if (!raw) return true;
  if (raw !== raw.trim()) return true;
  if (/[\u0000-\u001f\u007f\s]/.test(raw)) return true;
  if (raw.includes("\\")) return true;
  if (raw.startsWith("//")) return true;
  return false;
}

export function validateReturnUrl(raw: string, options: ValidateReturnOptions = {}): string {
  const fallback = options.fallback ?? "";
  const value = String(raw || "");
  if (!value || rejectSuspiciousRaw(value)) return fallback;
  const production = isProductionEnv(options.production);

  if (value.startsWith("/")) {
    if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
    const base = options.base;
    if (!base) return fallback;
    try {
      const resolved = new URL(value, base);
      if (!resolved.pathname.startsWith("/")) return fallback;
      return resolved.toString();
    } catch {
      return fallback;
    }
  }

  try {
    const url = new URL(value);
    if (url.username || url.password) return fallback;
    if (url.protocol !== "https:" && url.protocol !== "http:") return fallback;
    const host = url.hostname.toLowerCase();
    if (isLocalhost(host)) {
      if (production) return fallback;
      if (url.protocol !== "http:") return fallback;
      return url.toString();
    }
    if (url.protocol !== "https:" || !hasDefaultPort(url)) return fallback;
    const allowed = new Set(getAllowedHosts({ production }));
    if (!allowed.has(host)) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

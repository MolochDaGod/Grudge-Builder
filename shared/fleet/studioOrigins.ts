export const STUDIO_HOSTS = [
  // grudge-studio.com
  "grudge-studio.com",
  "www.grudge-studio.com",
  "id.grudge-studio.com",
  "ai.grudge-studio.com",
  "anim.grudge-studio.com",
  "apps.grudge-studio.com",
  "arena.grudge-studio.com",
  "armada.grudge-studio.com",
  "arpg.grudge-studio.com",
  "assets.grudge-studio.com",
  "blox.grudge-studio.com",
  "builder.grudge-studio.com",
  "carrier.grudge-studio.com",
  "casting.grudge-studio.com",
  "character.grudge-studio.com",
  "client.grudge-studio.com",
  "coder.grudge-studio.com",
  "codex.grudge-studio.com",
  "combat.grudge-studio.com",
  "crafting.grudge-studio.com",
  "danger-ai.grudge-studio.com",
  "dash.grudge-studio.com",
  "dcq.grudge-studio.com",
  "dev.grudge-studio.com",
  "docs.grudge-studio.com",
  "drive.grudge-studio.com",
  "duelyst.grudge-studio.com",
  "fleet.grudge-studio.com",
  "forge.grudge-studio.com",
  "game.grudge-studio.com",
  "grok-builder.grudge-studio.com",
  "grudachain.grudge-studio.com",
  "grudge-arena.grudge-studio.com",
  "grudge6.grudge-studio.com",
  "grudgedot.grudge-studio.com",
  "grudges.grudge-studio.com",
  "grudox.grudge-studio.com",
  "homefront.grudge-studio.com",
  "info.grudge-studio.com",
  "launcher.grudge-studio.com",
  "legion-ai.grudge-studio.com",
  "libs.grudge-studio.com",
  "metaverse.grudge-studio.com",
  "mine.grudge-studio.com",
  "mineloader.grudge-studio.com",
  "models.grudge-studio.com",
  "nemesis.grudge-studio.com",
  "objectstore.grudge-studio.com",
  "open.grudge-studio.com",
  "pipeline.grudge-studio.com",
  "play.grudge-studio.com",
  "poker.grudge-studio.com",
  "puter.grudge-studio.com",
  "story-gst.grudge-studio.com",
  "studio.grudge-studio.com",
  "survival.grudge-studio.com",
  "tactics.grudge-studio.com",
  "test.grudge-studio.com",
  "trader.grudge-studio.com",
  "trait.grudge-studio.com",
  "traits.grudge-studio.com",
  "tv.grudge-studio.com",
  "ui.grudge-studio.com",
  "vfx.grudge-studio.com",
  "wallet.grudge-studio.com",
  "warlord3d.grudge-studio.com",
  "warstrat.grudge-studio.com",
  "wartrailer.grudge-studio.com",
  "water.grudge-studio.com",
  "wcs.grudge-studio.com",
  "weapon-skills.grudge-studio.com",
  // grudgewarlords.com
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
  // thc-labz.xyz
  "thc-labz.xyz",
  "admin.thc-labz.xyz",
  "api.thc-labz.xyz",
  "battle.thc-labz.xyz",
  "collection.thc-labz.xyz",
  "dopebudz.thc-labz.xyz",
  "growerz.thc-labz.xyz",
  "growerz-3d.thc-labz.xyz",
  "market.thc-labz.xyz",
  "orbit.thc-labz.xyz",
  "poolwallet.thc-labz.xyz",
  "preview2.thc-labz.xyz",
  "site.thc-labz.xyz",
  "staking.thc-labz.xyz",
  "traits.thc-labz.xyz",
  "value.thc-labz.xyz",
  "value-img.thc-labz.xyz",
  "wallet.thc-labz.xyz",
  // grudge.studio
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
  "traits.grudge.studio",
  "genesis.grudge.studio",
  // other studio apexes
  "grudgestudio.org",
  "grudgeplatform.io",
  // puter.site
  "grudge-crafting.puter.site",
  "grudgewarlords.puter.site",
  "grudgestudio.puter.site",
  "grudge-heros.puter.site",
  // vercel
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
  "grudge-dungeons.vercel.app",
  // pages.dev hosts removed: ownership unverified (can be re-added after verification)
  // "anim-studio.pages.dev",
  // "grudge-studio-dash.pages.dev",
] as const;

export type StudioOriginOpts = {
  dev?: boolean;
  extraHosts?: string | string[];
};

export type ValidateReturnUrlOpts = StudioOriginOpts & {
  base?: string;
  fallback?: string;
};

function asStrictDev(dev: unknown): boolean {
  return dev === true;
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

export function parseHostList(csv: string): string[] {
  return String(csv || "")
    .split(",")
    .map((part) => normalizeHost(part))
    .filter((host): host is string => Boolean(host));
}

function parseExtraHosts(extraHosts?: string | string[]): string[] {
  if (Array.isArray(extraHosts)) {
    return extraHosts
      .map((entry) => normalizeHost(entry))
      .filter((host): host is string => Boolean(host));
  }
  return parseHostList(extraHosts || "");
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

function isValidRelativePath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.startsWith("/\\")) return false;
  return true;
}

function rejectSuspiciousRaw(raw: string): boolean {
  if (!raw) return true;
  if (raw !== raw.trim()) return true;
  if (/[\u0000-\u001f\u007f\s]/.test(raw)) return true;
  if (raw.includes("\\")) return true;
  if (raw.startsWith("//")) return true;
  return false;
}

export function getAllowedHosts({ dev, extraHosts }: StudioOriginOpts = {}): string[] {
  const hosts = new Set<string>(STUDIO_HOSTS);
  for (const host of parseExtraHosts(extraHosts)) {
    hosts.add(host);
  }
  if (asStrictDev(dev)) {
    hosts.add("localhost");
    hosts.add("127.0.0.1");
  }
  return Array.from(hosts);
}

export function isStudioOrigin(origin: string, opts: StudioOriginOpts = {}): boolean {
  if (!origin || rejectSuspiciousRaw(origin)) return false;
  const dev = asStrictDev(opts.dev);
  try {
    const url = new URL(origin);
    if (url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (isLocalhost(host)) {
      if (!dev) return false;
      if (url.protocol !== "http:") return false;
      return true;
    }
    if (url.protocol !== "https:") return false;
    if (!hasDefaultPort(url)) return false;
    const allowed = new Set(getAllowedHosts({ dev, extraHosts: opts.extraHosts }));
    return allowed.has(host);
  } catch {
    return false;
  }
}

export function validateReturnUrl(raw: string, options: ValidateReturnUrlOpts = {}): string {
  const fallback = options.fallback ?? "";
  const value = String(raw || "");
  if (!value || rejectSuspiciousRaw(value)) return fallback;
  const dev = asStrictDev(options.dev);

  if (value.startsWith("/")) {
    if (!isValidRelativePath(value)) return fallback;
    if (!options.base) return fallback;
    try {
      const resolved = new URL(value, options.base);
      if (!resolved.pathname.startsWith("/")) return fallback;
      return resolved.toString();
    } catch {
      return fallback;
    }
  }

  try {
    const url = new URL(value);
    if (url.username || url.password) return fallback;
    const host = url.hostname.toLowerCase();
    if (isLocalhost(host)) {
      if (!dev) return fallback;
      if (url.protocol !== "http:") return fallback;
      return url.toString();
    }
    if (url.protocol !== "https:") return fallback;
    if (!hasDefaultPort(url)) return fallback;
    const allowed = new Set(getAllowedHosts({ dev, extraHosts: options.extraHosts }));
    if (!allowed.has(host)) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

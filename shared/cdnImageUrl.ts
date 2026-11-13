/**
 * Absolute CDN image URLs for game sprites, icons, and VFX.
 *
 * Every image resolves to https://assets.grudge-studio.com. There is no
 * fallback to info.grudge-studio.com or GitHub Pages. A missing object
 * (403, HTML body, or non-image bytes) should show the existing
 * "icon missing" marker — no substitute art.
 *
 * /sprites/gbux-token.png stays on the Warlords SPA (not on R2).
 * /effects/ has no Vercel rewrite and is pointed straight at the CDN.
 */
export const ASSET_CDN_ORIGIN = "https://assets.grudge-studio.com";
export const LOCAL_GBUX_TOKEN_SRC = "/sprites/gbux-token.png";

const DEPRECATED_HOST_RE =
  /^https?:\/\/(?:www\.)?(?:molochdagod\.github\.io\/ObjectStore|raw\.githubusercontent\.com\/MolochDaGod\/ObjectStore\/(?:main|master)|(?:info|objectstore)\.grudge-studio\.com|grudge-objectstore\.pages\.dev|assets\.grudge-studio\.com)/i;

export function isLocalGbuxToken(pathOrUrl: string): boolean {
  const p = String(pathOrUrl || "")
    .split("?")[0]
    .replace(/\\/g, "/");
  return /(^|\/)sprites\/gbux-token\.png$/i.test(p);
}

/** Decode a path segment, ignoring malformed escapes. */
function decodeSeg(seg: string): string {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

/**
 * Encode each path segment with encodeURIComponent so `+` becomes `%2B`,
 * spaces become `%20`, and parentheses are escaped. Does not rename keys.
 */
export function encodeCdnKey(pathname: string): string {
  const raw = String(pathname || "");
  const leading = raw.startsWith("/") ? "/" : "";
  const trimmed = raw.replace(/^\/+/, "");
  if (!trimmed) return leading;
  return (
    leading +
    trimmed
      .split("/")
      .map((seg) => encodeURIComponent(decodeSeg(seg)))
      .join("/")
  );
}

/** Strip a deprecated or CDN host (and /api/assets) down to a leading-slash path. */
export function toCdnPathname(pathOrUrl: string): string {
  let raw = String(pathOrUrl || "").trim();
  if (!raw) return "";
  raw = raw.split("#")[0];
  const q = raw.indexOf("?");
  if (q >= 0) raw = raw.slice(0, q);
  raw = raw.replace(/\\/g, "/");
  if (raw.startsWith("//")) raw = `https:${raw}`;
  raw = raw.replace(DEPRECATED_HOST_RE, "");
  raw = raw.replace(/^\/api\/assets\/?/i, "/");
  if (/^https?:\/\//i.test(raw)) {
    try {
      raw = new URL(raw).pathname;
    } catch {
      return "";
    }
  }
  if (raw && !raw.startsWith("/")) raw = `/${raw}`;
  return raw;
}

/**
 * Build an absolute assets.grudge-studio.com URL (encoded).
 * Leaves data:/blob: and the local GBUX token sprite unchanged.
 * Rewrites info, GitHub Pages, raw GitHub, and root-relative
 * /sprites, /icons, /effects, /game-assets paths onto the CDN.
 */
export function cdnImageUrl(pathOrUrl: string): string {
  const raw = String(pathOrUrl || "").trim();
  if (!raw) return "";
  if (/^(data:|blob:)/i.test(raw)) return raw;
  if (isLocalGbuxToken(raw)) return LOCAL_GBUX_TOKEN_SRC;
  const pathname = toCdnPathname(raw);
  if (!pathname || pathname === "/") return "";
  return `${ASSET_CDN_ORIGIN}${encodeCdnKey(pathname)}`;
}

const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPEG = [0xff, 0xd8, 0xff];
const GIF = [0x47, 0x49, 0x46];
const BMP = [0x42, 0x4d];
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46];

function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false;
  return sig.every((b, i) => bytes[offset + i] === b);
}

/** True when the body is a real PNG, JPEG, GIF, WEBP, or BMP. */
export function hasImageMagic(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 4) return false;
  if (startsWith(bytes, PNG)) return true;
  if (startsWith(bytes, JPEG)) return true;
  if (startsWith(bytes, GIF)) return true;
  if (startsWith(bytes, BMP)) return true;
  if (startsWith(bytes, WEBP_RIFF) && bytes.length >= 12) {
    return (
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}

/** True when the body looks like HTML (including lying image/png Hub pages). */
export function looksLikeHtml(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length === 0) return false;
  let i = 0;
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    i = 3;
  }
  while (i < bytes.length && bytes[i] <= 32) i++;
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(i, Math.min(i + 64, bytes.length)))
    .toLowerCase();
  return (
    head.startsWith("<!doctype") ||
    head.startsWith("<html") ||
    head.startsWith("<head") ||
    head.startsWith("<body") ||
    head.startsWith("<div") ||
    head.startsWith("<script")
  );
}

/**
 * Treat 403, non-OK, HTML bodies, and non-image magic as missing.
 * Content-Type is not proof — the CDN may label Hub HTML as image/png.
 */
export function isMissingImageBody(bytes: Uint8Array, status?: number): boolean {
  if (status === 403) return true;
  if (status != null && status >= 400) return true;
  if (looksLikeHtml(bytes)) return true;
  return !hasImageMagic(bytes);
}

const MARKER_CLASS = "icon-missing";
const HOST_CLASS = "has-icon-missing";

/**
 * Existing skill-tree marker: hide the img and show "icon missing".
 * No substitute art (no I_Rock01, no Pages, no info host).
 */
export function showIconMissing(img: HTMLImageElement | null | undefined): void {
  if (!img || typeof document === "undefined") return;
  img.style.display = "none";
  img.removeAttribute("src");
  const host = img.parentElement;
  if (host && !host.querySelector(`.${MARKER_CLASS}`)) {
    const m = document.createElement("span");
    m.className = MARKER_CLASS;
    m.textContent = "icon missing";
    const label = img.getAttribute("alt") || "";
    if (label) m.setAttribute("title", label);
    host.appendChild(m);
    host.classList.add(HOST_CLASS);
  }
}

/** img onError handler — show the missing marker, no fallback host. */
export function cdnImageOnError(ev: { currentTarget?: EventTarget | null; target?: EventTarget | null }): void {
  const img = (ev.currentTarget || ev.target) as HTMLImageElement | null;
  if (img && img.tagName === "IMG") showIconMissing(img);
}

/** Inline styles matching public/skill-tree.html `.icon-missing`. */
export const ICON_MISSING_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  minHeight: "28px",
  padding: "3px 4px",
  boxSizing: "border-box" as const,
  font: "700 8px/1.15 Inter,system-ui,sans-serif",
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  textAlign: "center" as const,
  color: "#f3c14a",
  background: "rgba(80,16,16,.72)",
  border: "1px solid rgba(243,193,74,.7)",
};

/**
 * Load fleet fonts from R2 CDN + expose game typography options.
 */
import {
  FLEET_FONTS,
  FLEET_FONT_DEFAULTS,
  KAPH_FONT_CSS_URL,
  buildKaphFontFaceCss,
  getFleetFontById,
  getFleetFontStack,
  type FleetFontOption,
} from "@shared/fleet/fonts";

const STORAGE_KEY = "grudge_font_prefs";

export type FontPrefs = {
  title?: string;
  ui?: string;
  display?: string;
};

let kaphInjected = false;

/** Inject Kaph @font-face (link tag to CDN CSS, or inline fallback). */
export function loadKaphFont(): void {
  if (kaphInjected || typeof document === "undefined") return;
  kaphInjected = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = KAPH_FONT_CSS_URL;
  link.crossOrigin = "anonymous";
  link.onerror = () => {
    const style = document.createElement("style");
    style.setAttribute("data-fleet-font", "kaph");
    style.textContent = buildKaphFontFaceCss();
    document.head.appendChild(style);
  };
  document.head.appendChild(link);
}

/** Preload all CDN fonts marked preload:true in fleet catalog */
export function loadFleetCdnFonts(): void {
  for (const font of FLEET_FONTS) {
    if (font.source === "cdn" && font.preload) {
      if (font.id === "kaph") loadKaphFont();
    }
  }
}

export function getFontOptions(): FleetFontOption[] {
  return FLEET_FONTS;
}

export function getFontPrefs(): FontPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FontPrefs) : {};
  } catch {
    return {};
  }
}

export function setFontPrefs(prefs: FontPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function resolveTitleFont(): string {
  const prefs = getFontPrefs();
  return getFleetFontStack(prefs.title ?? FLEET_FONT_DEFAULTS.title);
}

export function resolveUiFont(): string {
  const prefs = getFontPrefs();
  return getFleetFontStack(prefs.ui ?? FLEET_FONT_DEFAULTS.ui);
}

export function resolveDisplayFont(): string {
  const prefs = getFontPrefs();
  return getFleetFontStack(prefs.display ?? FLEET_FONT_DEFAULTS.display);
}

export {
  FLEET_FONTS,
  FLEET_FONT_DEFAULTS,
  getFleetFontById,
  getFleetFontStack,
  KAPH_FONT_CSS_URL,
};
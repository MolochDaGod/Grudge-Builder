/**
 * Fleet font catalog — SSOT for studio + game UI typography.
 * Binaries on R2: assets.grudge-studio.com/fonts/*
 */
import { FLEET_URLS } from "./manifest";

const CDN = FLEET_URLS.assets;

export type FleetFontSource = "cdn" | "google" | "system";

export interface FleetFontFace {
  /** CSS font-family name */
  family: string;
  /** R2 path under fonts/ (cdn source only) */
  r2Prefix?: string;
  files?: {
    woff2?: string;
    woff?: string;
    ttf?: string;
    otf?: string;
  };
  license?: string;
  licenseUrl?: string;
}

export interface FleetFontOption {
  id: string;
  label: string;
  /** CSS font-family stack for inline styles / Phaser / Three.js HTML */
  stack: string;
  source: FleetFontSource;
  role: "title" | "ui" | "mono" | "display";
  /** Preload woff2 on game boot (cdn fonts only) */
  preload?: boolean;
  face?: FleetFontFace;
}

/** Ready-made @font-face sheet URL (relative URLs inside CSS resolve on CDN) */
export const KAPH_FONT_CSS_URL = `${CDN}/fonts/kaph/kaph.css`;

export const FLEET_FONTS: FleetFontOption[] = [
  {
    id: "cinzel",
    label: "Cinzel",
    stack: "'Cinzel', serif",
    source: "google",
    role: "title",
    preload: false,
  },
  {
    id: "inter",
    label: "Inter",
    stack: "'Inter', sans-serif",
    source: "google",
    role: "ui",
    preload: false,
  },
  {
    id: "jost",
    label: "Jost",
    stack: "'Jost', sans-serif",
    source: "google",
    role: "ui",
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    stack: "'JetBrains Mono', monospace",
    source: "google",
    role: "mono",
  },
  {
    id: "kaph",
    label: "Kaph",
    stack: "'Kaph', sans-serif",
    source: "cdn",
    role: "display",
    preload: true,
    face: {
      family: "Kaph",
      r2Prefix: "fonts/kaph",
      files: {
        woff2: "Kaph-Regular.woff2",
        woff: "Kaph-Regular.woff",
      },
      license: "SIL Open Font License 1.1",
      licenseUrl: `${CDN}/fonts/kaph/LICENSE.txt`,
    },
  },
];

export const FLEET_FONT_DEFAULTS = {
  title: "cinzel",
  ui: "inter",
  display: "kaph",
  mono: "jetbrains-mono",
} as const;

export function getFleetFontById(id: string): FleetFontOption | undefined {
  return FLEET_FONTS.find((f) => f.id === id);
}

export function getFleetFontStack(id: string): string {
  return getFleetFontById(id)?.stack ?? "'Inter', sans-serif";
}

export function kaphFontFileUrl(filename: string): string {
  return `${CDN}/fonts/kaph/${filename}`;
}

/** CSS text for @font-face blocks (also uploaded as fonts/kaph/kaph.css) */
export function buildKaphFontFaceCss(cdnBase: string = `${CDN}/fonts/kaph`): string {
  return `@font-face {
  font-family: 'Kaph';
  src: url('${cdnBase}/Kaph-Regular.woff2') format('woff2'),
       url('${cdnBase}/Kaph-Regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Kaph';
  src: url('${cdnBase}/Kaph-Italic.woff2') format('woff2'),
       url('${cdnBase}/Kaph-Italic.woff') format('woff');
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}
`;
}
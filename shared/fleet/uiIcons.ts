/**
 * Small UI icons on R2 — use assetUrl() in client, never Vercel-static paths.
 */
import { FLEET_URLS } from "./manifest";

const CDN = FLEET_URLS.assets;

/** GBUX token chip — site-relative; wrap with assetUrl() in the browser. */
export const GBUX_TOKEN_ICON_PATH = "/sprites/gbux-token.png";

/** Absolute CDN (SSR / email). Browser HUD must use assetUrl(GBUX_TOKEN_ICON_PATH). */
export const GBUX_TOKEN_ICON = `${CDN}/sprites/gbux-token.png`;

/** Element tome icons — R2 keys under icons/tomes/ */
export const TOME_ICON_PATHS = {
  fire: "/icons/tomes/fire.png",
  frost: "/icons/tomes/frost.png",
  nature: "/icons/tomes/nature.png",
  holy: "/icons/tomes/holy.png",
  arcane: "/icons/tomes/arcane.png",
  lightning: "/icons/tomes/lightning.png",
} as const;

export function tomeIconCdnUrl(element: keyof typeof TOME_ICON_PATHS): string {
  return `${CDN}${TOME_ICON_PATHS[element]}`;
}
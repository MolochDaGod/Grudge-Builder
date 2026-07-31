/**
 * Fleet video catalog — SSOT for cinematics on R2 (assets.grudge-studio.com).
 * Client: fleetVideo.ts hydrates from GET /api/videos/catalog.
 */
import { FLEET_URLS } from "./manifest";

const CDN = FLEET_URLS.assets;

export interface FleetVideoEntry {
  key: string;
  label: string;
  r2_key: string;
  r2_url: string;
  contentType: string;
}

/** Catalog keys match FleetVideoKey in client/src/lib/fleetVideo.ts */
export const FLEET_VIDEO_CATALOG: Record<string, FleetVideoEntry> = {
  warlordsIntro: {
    key: "warlordsIntro",
    label: "Warlords intro cinematic (NOT island-3d — use ShipwreckTutorialCinema)",
    r2_key: "gruda-armada/grudge-warlords/videos/intro.mp4",
    r2_url: `${CDN}/gruda-armada/grudge-warlords/videos/intro.mp4`,
    contentType: "video/mp4",
  },
  warlordsLoadscreen: {
    key: "warlordsLoadscreen",
    label: "Warlords mode transition loadscreen",
    r2_key: "gruda-armada/grudge-warlords/videos/intro.mp4",
    r2_url: `${CDN}/gruda-armada/grudge-warlords/videos/intro.mp4`,
    contentType: "video/mp4",
  },
  warlordsPvpLoadscreen: {
    key: "warlordsPvpLoadscreen",
    label: "PvP lobby / world-entry loadscreen",
    r2_key: "gruda-armada/grudge-warlords/videos/pvp-loadscreen.mp4",
    r2_url: `${CDN}/gruda-armada/grudge-warlords/videos/pvp-loadscreen.mp4`,
    contentType: "video/mp4",
  },
  armadaIntro: {
    key: "armadaIntro",
    label: "Gruda Armada RTS Star — opening cinematic",
    r2_key: "gruda-armada/space/videos/intro.mp4",
    r2_url: `${CDN}/gruda-armada/space/videos/intro.mp4`,
    contentType: "video/mp4",
  },
};
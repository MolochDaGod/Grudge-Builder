/**
 * Grudge Studio R2 bucket layout — industry-standard game-studio taxonomy.
 * Binary SSOT: R2 bucket `grudge-assets` → CDN `assets.grudge-studio.com`.
 *
 * Rules:
 * - Lowercase paths, kebab-case file names (except legacy fish paths with spaces).
 * - One concern per top-level prefix; no machine-specific roots (/attached_assets).
 * - JSON catalogs live on ObjectStore, not R2 (except manifest.json index).
 */
import { FLEET_URLS } from "./manifest";

export const R2_BUCKET_ASSETS = "grudge-assets" as const;

export const R2_CDN_BASE = FLEET_URLS.assets;

/** Top-level R2 prefixes — mirrors AAA/AA indie CDN conventions. */
export const R2_LAYOUT = {
  version: 1,
  bucket: R2_BUCKET_ASSETS,
  cdn: R2_CDN_BASE,
  /** CDN root index — GET /manifest.json */
  manifestKey: "manifest.json",
  prefixes: {
    fonts: {
      path: "fonts/",
      description: "Web fonts (woff2/woff/ttf) + per-family CSS",
      example: "fonts/kaph/Kaph-Regular.woff2",
    },
    icons: {
      path: "icons/",
      description: "UI icons — pack/, tomes/, weapons/",
      example: "icons/tomes/fire.png",
    },
    sprites: {
      path: "sprites/",
      description: "2D sprite sheets and token art",
      example: "sprites/gbux-token.png",
    },
    models: {
      path: "models/",
      description: "GLB/FBX — characters, environment, weapons, ships, creatures",
      subfolders: [
        "characters",
        "environment",
        "weapons",
        "ships",
        "creatures/fish",
        "creatures/land",
        "grudge6/races",
        "vfx",
      ],
      example: "models/grudge6/races/WK_Characters.fbx",
    },
    textures: {
      path: "textures/",
      description: "PBR sets, polyhaven, ship materials",
      subfolders: ["pbr/ground", "pbr/lobby", "ships", "polyhaven"],
      example: "textures/pbr/ground/Ground_1_BaseColor.png",
    },
    audio: {
      path: "audio/",
      description: "SFX, music/BGM, voice, dialogue packs",
      subfolders: ["sfx", "music", "voice", "dialogue"],
      example: "audio/dialogue/super-pack/",
    },
    cinematics: {
      path: "cinematics/",
      description: "Marketing/trailer MP4 (alias of legacy gruda-armada paths)",
      legacyAlias: "gruda-armada/grudge-warlords/videos/",
      example: "gruda-armada/grudge-warlords/videos/intro.mp4",
    },
    vfx: {
      path: "vfx/",
      description: "Particle atlases, flipbooks (future)",
    },
    generated: {
      path: "generated/",
      description: "AI/procedural outputs — never commit to git",
    },
    /** Legacy sailing fish paths — migrate to models/creatures/fish/ over time */
    fish: {
      path: "fish/",
      description: "Legacy FishManager GLBs (spaces in filenames preserved)",
      migrateTo: "models/creatures/fish/",
      deprecated: true,
    },
  },
} as const;

/** Critical paths HEAD-checked in CI (scripts/verify-fleet-assets.mjs). */
export const R2_REQUIRED_KEYS = [
  "/manifest.json",
  "/sprites/gbux-token.png",
  "/icons/tomes/fire.png",
  "/models/grudge6/races/WK_Characters.fbx",
  "/fonts/kaph/Kaph-Regular.woff2",
  "/gruda-armada/grudge-warlords/videos/intro.mp4",
  "/models/ships/ship-small.glb",
  "/fish/Clownfish.glb",
  "/textures/ships/weathered_oak_hull.png",
] as const;

/** Vercel same-origin rewrites → CDN (order: specific before catch-all). */
export const R2_CDN_REWRITE_PREFIXES = [
  "sprites",
  "icons",
  "videos",
  "fonts",
  "models",
  "textures",
  "audio",
  "fish",
  "vfx",
  "cinematics",
] as const;

export type R2LayoutPrefix = keyof typeof R2_LAYOUT.prefixes;

export function r2CdnUrl(key: string): string {
  const clean = key.startsWith("/") ? key.slice(1) : key;
  return `${R2_CDN_BASE}/${clean}`;
}
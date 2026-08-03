/**
 * Fleet UI art registry — SSOT consumer for ObjectStore /ui-art.json.
 *
 * Embedded fallback mirrors ObjectStore so sync getters work before fetch.
 * Source art: grudge-skill-tree/class-selector.html
 */

export type UiRaceId =
  | "elf"
  | "human"
  | "dwarf"
  | "orc"
  | "barbarian"
  | "undead";

export type UiClassId = "mage" | "warrior" | "ranger" | "worge" | "worg";

export interface UiArtRaceEntry {
  portrait: string;
  cdn?: string;
}

export interface UiArtClassEntry {
  hero: string;
  cdn?: string;
  accent: string;
}

export interface UiArtViewerTokens {
  canvas: {
    cameraPosition: [number, number, number];
    fov: number;
    target: [number, number, number];
    dpr: [number, number];
    minDistance: number;
    maxDistance: number;
  };
  gcs: {
    cameraPosition: [number, number, number];
    cameraTarget: [number, number, number];
    fov: number;
    minDistance: number;
    maxDistance: number;
  };
  portraitTile: {
    aspectRatio: string;
    objectPosition: string;
  };
  equipmentPortrait: {
    width: number;
    height: number;
    aspectRatio: string;
    objectPosition: string;
  };
  gizmo: {
    size: number;
  };
}

export interface UiArtRegistry {
  version: string;
  updated: string;
  source: string;
  cdnBase: string;
  races: Record<UiRaceId, UiArtRaceEntry>;
  classes: Record<UiClassId, UiArtClassEntry>;
  panels: {
    parchment: string;
    parchmentCdn?: string;
  };
  combatClassBackgrounds: Record<string, string>;
  viewer: UiArtViewerTokens;
}

/**
 * Production race portraits (SPA public/ + R2).
 * NEVER use imgur / placeholder art on Warlords product surfaces.
 */
export const WARLORDS_RACE_PORTRAIT_PATHS: Record<UiRaceId, string> = {
  human: "/races/human-portrait.png",
  barbarian: "/races/barbarian-portrait.png",
  elf: "/races/elf-portrait.png",
  dwarf: "/races/dwarf-portrait.png",
  orc: "/races/orc-portrait.png",
  undead: "/races/undead-portrait.png",
};

const ASSETS_CDN = "https://assets.grudge-studio.com";

/** Embedded fallback — production paths only (no imgur) */
export const UI_ART_FALLBACK: UiArtRegistry = {
  version: "1.1.0",
  updated: "2026-08-02",
  source: "client/public/races/*-portrait.png + assets.grudge-studio.com",
  cdnBase: ASSETS_CDN,
  races: {
    human: {
      portrait: WARLORDS_RACE_PORTRAIT_PATHS.human,
      cdn: `${ASSETS_CDN}/races/human-portrait.png`,
    },
    barbarian: {
      portrait: WARLORDS_RACE_PORTRAIT_PATHS.barbarian,
      cdn: `${ASSETS_CDN}/races/barbarian-portrait.png`,
    },
    elf: {
      portrait: WARLORDS_RACE_PORTRAIT_PATHS.elf,
      cdn: `${ASSETS_CDN}/races/elf-portrait.png`,
    },
    dwarf: {
      portrait: WARLORDS_RACE_PORTRAIT_PATHS.dwarf,
      cdn: `${ASSETS_CDN}/races/dwarf-portrait.png`,
    },
    orc: {
      portrait: WARLORDS_RACE_PORTRAIT_PATHS.orc,
      cdn: `${ASSETS_CDN}/races/orc-portrait.png`,
    },
    undead: {
      portrait: WARLORDS_RACE_PORTRAIT_PATHS.undead,
      cdn: `${ASSETS_CDN}/races/undead-portrait.png`,
    },
  },
  classes: {
    // Class hero stills — use race production portraits as reliable fleet art
    // (dedicated class PNGs are not on CDN yet; accents drive UI chrome)
    mage: {
      hero: WARLORDS_RACE_PORTRAIT_PATHS.elf,
      cdn: WARLORDS_RACE_PORTRAIT_PATHS.elf,
      accent: "#6aa9ff",
    },
    warrior: {
      hero: WARLORDS_RACE_PORTRAIT_PATHS.human,
      cdn: WARLORDS_RACE_PORTRAIT_PATHS.human,
      accent: "#ff6b57",
    },
    ranger: {
      hero: WARLORDS_RACE_PORTRAIT_PATHS.barbarian,
      cdn: WARLORDS_RACE_PORTRAIT_PATHS.barbarian,
      accent: "#6bdc8b",
    },
    worge: {
      hero: WARLORDS_RACE_PORTRAIT_PATHS.orc,
      cdn: WARLORDS_RACE_PORTRAIT_PATHS.orc,
      accent: "#c792ff",
    },
    worg: {
      hero: WARLORDS_RACE_PORTRAIT_PATHS.orc,
      cdn: WARLORDS_RACE_PORTRAIT_PATHS.orc,
      accent: "#c792ff",
    },
  },
  panels: {
    parchment: `${ASSETS_CDN}/backgrounds/main-menu.png`,
    parchmentCdn: "/backgrounds/main-menu.png",
  },
  combatClassBackgrounds: {
    melee: "warrior",
    caster: "mage",
    ranger: "ranger",
  },
  viewer: {
    canvas: {
      cameraPosition: [0, 1.2, 3],
      fov: 45,
      target: [0, 0.9, 0],
      dpr: [1, 1.5],
      minDistance: 0.5,
      maxDistance: 10,
    },
    gcs: {
      cameraPosition: [-2.2368, 1.1513, 2.2612],
      cameraTarget: [0, 0.8, 0],
      fov: 30,
      minDistance: 1,
      maxDistance: 4,
    },
    portraitTile: {
      aspectRatio: "1 / 1",
      objectPosition: "center top",
    },
    equipmentPortrait: {
      width: 110,
      height: 180,
      aspectRatio: "11 / 18",
      objectPosition: "top center",
    },
    gizmo: { size: 0.4 },
  },
};

let cachedRegistry: UiArtRegistry = UI_ART_FALLBACK;

export function setUiArtRegistry(data: UiArtRegistry): void {
  cachedRegistry = data;
}

export function getUiArtRegistry(): UiArtRegistry {
  return cachedRegistry;
}

/**
 * Race portrait for UI tiles (intro, creator, roster).
 * Prefer same-origin production files under /races/*-portrait.png.
 */
export function getRacePortraitUrl(race: string): string {
  const key = race.toLowerCase() as UiRaceId;
  // Hard SSOT: local public portraits always win over stale registry imgur URLs
  if (key in WARLORDS_RACE_PORTRAIT_PATHS) {
    return WARLORDS_RACE_PORTRAIT_PATHS[key as UiRaceId];
  }
  const entry = cachedRegistry.races[key] ?? cachedRegistry.races.human;
  // Reject banned placeholder hosts if registry ever reintroduces them
  const p = entry.portrait || "";
  if (/imgur\.com|placehold|via\.placeholder|dummyimage/i.test(p)) {
    return WARLORDS_RACE_PORTRAIT_PATHS.human;
  }
  return p || WARLORDS_RACE_PORTRAIT_PATHS.human;
}

export function getClassHeroUrl(cls: string): string {
  const key = cls.toLowerCase() as UiClassId;
  return (
    cachedRegistry.classes[key]?.hero ??
    cachedRegistry.classes.warrior.hero
  );
}

export function getClassAccentColor(cls: string): string {
  const key = cls.toLowerCase() as UiClassId;
  return (
    cachedRegistry.classes[key]?.accent ??
    cachedRegistry.classes.warrior.accent
  );
}

export function getPanelParchmentUrl(): string {
  return cachedRegistry.panels.parchment;
}

export function getCombatClassBackgroundKey(combatClass: string): string {
  return cachedRegistry.combatClassBackgrounds[combatClass] ?? "warrior";
}

export function getCombatClassBackgroundUrl(combatClass: string): string {
  const clsKey = getCombatClassBackgroundKey(combatClass);
  return getClassHeroUrl(clsKey);
}

export const CHARACTER_VIEWER_TOKENS = UI_ART_FALLBACK.viewer;

/** Dot-path lookup: race.portrait.elf, class.hero.mage, panels.parchment */
export function getUiArt(path: string): string | number | boolean | undefined {
  const parts = path.split(".");
  let cur: unknown = cachedRegistry;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  if (typeof cur === "string" || typeof cur === "number" || typeof cur === "boolean") {
    return cur;
  }
  return undefined;
}
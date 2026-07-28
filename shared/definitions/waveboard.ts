/**
 * Waveboard — dock-craftable back-slot open-water mount (Grudge6).
 *
 * Recipe (dock / woodwork): 2× Wood Scraps + 2× Scrap Cloth
 * Slot: Back (deploy on open water when equipped)
 *
 * Gameplay inspired by tslda (Wind Waker TSL) boat control:
 *   wind · wave ride · jump · shoot splash — with Grudge6 character + custom rig.
 *
 * Asset: /models/watercraft/waveboard_rig.glb
 *   (source: Documents/windsurfing_rig_silhouette.glb — dark wood base, yellow handles, canvas sail)
 */

export const WAVEBOARD_ITEM_ID = "waveboard" as const;
export const WAVEBOARD_GLB = "/models/watercraft/waveboard_rig.glb";

/** Back-slot equipment definition */
export interface WaveboardItemDef {
  id: typeof WAVEBOARD_ITEM_ID;
  name: string;
  description: string;
  icon: string;
  type: "equipment";
  slot: "Back";
  subType: "waveboard";
  stackable: false;
  sellValue: number;
  craftable: true;
  /** Materials for dock craft */
  craft: {
    wood: number;
    cloth: number;
    station: "dock" | "forester" | "engineer";
    craftTimeSec: number;
  };
  glbPath: string;
  /** Equip → open water deploy key */
  deployHotkey: string;
}

export const WAVEBOARD_ITEM: WaveboardItemDef = {
  id: WAVEBOARD_ITEM_ID,
  name: "Waveboard",
  description:
    "Wind-powered board for open water. Equip in the Back slot, deploy at the dock or on the ocean. Ride waves, jump, and cast water bolts. Sails canvas; dark wood hull; yellow grips.",
  icon: "🏄",
  type: "equipment",
  slot: "Back",
  subType: "waveboard",
  stackable: false,
  sellValue: 12,
  craftable: true,
  craft: {
    wood: 2,
    cloth: 2,
    station: "dock",
    craftTimeSec: 8,
  },
  glbPath: WAVEBOARD_GLB,
  deployHotkey: "B",
};

/** Material ids (tier0) for recipe */
export const WAVEBOARD_RECIPE = {
  id: "recipe_waveboard",
  itemId: WAVEBOARD_ITEM_ID,
  name: "Waveboard",
  category: "equipment" as const,
  subCategory: "back",
  profession: "Forester",
  station: "dock",
  ingredients: [
    { itemId: "t0_wood_scrap", name: "Wood Scraps", quantity: 2 },
    { itemId: "t0_scrap_cloth", name: "Scrap Cloth", quantity: 2 },
  ],
  craftTime: 8,
  description: "Craft at the dock: 2 Wood Scraps + 2 Scrap Cloth → Back-slot Waveboard.",
};

/** Material color SSOT for rig mesh (silhouette recolor) */
export const WAVEBOARD_MATERIALS = {
  /** Dark wooden board / base */
  wood: { color: 0x2a1810, roughness: 0.88, metalness: 0.05 },
  /** Yellow handles / boom grips */
  handle: { color: 0xe8b923, roughness: 0.55, metalness: 0.15 },
  /** Canvas sail */
  sail: { color: 0xe6dcc0, roughness: 0.92, metalness: 0.02, doubleSide: true },
  /** Mast / spar (mid wood) */
  spar: { color: 0x4a3220, roughness: 0.85, metalness: 0.08 },
} as const;

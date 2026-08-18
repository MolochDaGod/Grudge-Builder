/**
 * Character ↔ mesh bridge — joins DB character records to CDN assets.
 *
 * Two ID systems (do not confuse):
 *   - characterId (char_ / UUID) — player's hero row in Postgres
 *   - asset paths on R2 — resolved via raceId + model3d slot maps
 *
 * grudge6 uses ONE race FBX/GLB per race; equipment is child-mesh toggles.
 */

export interface Model3DField {
  baseModelId: string;
  equippedMeshes: Record<string, string>;
  weaponSlots: Record<string, string>;
  faceVariant: string;
  skinColor: string;
  armorColor: string;
  capeEnabled: boolean;
  scale: number;
}

export interface Grudge6RaceConfig {
  modelId: string;
  prefix: string;
  label: string;
  /**
   * CDN-relative race kit path for GLTFLoader (Warlords / island3d).
   * Canonical modular kit: /models/grudge6/races/{STEM}_Characters.glb
   * FBX SSOT (browse / Three FBXLoader): see RACE_FBX_PATHS / resolveFbxPath.
   */
  cdnPath: string;
  scale: number;
  faction: "crusade" | "fabled" | "legion" | "wild";
  /** Optional stem used in baseModelId (e.g. WK_Characters) */
  baseModelStem?: string;
}

/**
 * Canonical grudge6 race kits on R2 (not legacy /models/characters/races/*).
 * Equipment = child-mesh visibility via setupGrudge6Equipment / grudge6-kit EquipmentManager.
 */
export const RACE_GRUDGE6: Record<string, Grudge6RaceConfig> = {
  human:     { modelId: "human",     prefix: "WK_",  label: "Human",     cdnPath: "/asset-packs/toon-rts-characters/glb/characters/human.glb",     scale: 1.0,  faction: "crusade", baseModelStem: "WK_Characters" },
  barbarian: { modelId: "barbarian", prefix: "BRB_", label: "Barbarian", cdnPath: "/asset-packs/toon-rts-characters/glb/characters/barbarian.glb", scale: 1.1,  faction: "crusade", baseModelStem: "BRB_Characters" },
  elf:       { modelId: "elf",       prefix: "ELF_", label: "Elf",       cdnPath: "/asset-packs/toon-rts-characters/glb/characters/elf.glb",       scale: 1.0,  faction: "fabled",  baseModelStem: "ELF_Characters" },
  dwarf:     { modelId: "dwarf",     prefix: "DWF_", label: "Dwarf",     cdnPath: "/asset-packs/toon-rts-characters/glb/characters/dwarf.glb",     scale: 0.85, faction: "crusade", baseModelStem: "DWF_Characters" },
  orc:       { modelId: "orc",       prefix: "ORC_", label: "Orc",       cdnPath: "/asset-packs/toon-rts-characters/glb/characters/orc.glb",       scale: 1.15, faction: "legion",  baseModelStem: "ORC_Characters" },
  undead:    { modelId: "undead",    prefix: "UD_",  label: "Undead",    cdnPath: "/asset-packs/toon-rts-characters/glb/characters/undead.glb",    scale: 1.0,  faction: "legion",  baseModelStem: "UD_Characters" },
};

/**
 * Normalize race keys from DB / Colyseus / model3d baseModelId.
 * Accepts: human | WK_ | WK_Characters_customizable | /models/…/human.glb
 */
export function normalizeRaceId(raceOrBaseModel: string | null | undefined): string {
  const raw = (raceOrBaseModel ?? "human").trim();
  if (!raw) return "human";
  const s = raw.toLowerCase();

  if (RACE_GRUDGE6[s]) return s;

  // Exact modelId / prefix / baseModelId stem match
  for (const [id, cfg] of Object.entries(RACE_GRUDGE6)) {
    if (s === cfg.modelId.toLowerCase()) return id;
    const pref = cfg.prefix.toLowerCase();
    if (s === pref || s === pref.replace(/_$/, "")) return id;
    if (s.includes(pref)) return id;
    if (s.includes(`/${cfg.modelId}.glb`) || s.endsWith(`${cfg.modelId}.glb`)) return id;
    const stem = (cfg.baseModelStem ?? `${cfg.prefix}Characters`).toLowerCase();
    if (s.includes(stem)) return id;
  }

  // Fuzzy tokens
  if (s.includes("barb")) return "barbarian";
  if (s.includes("elf")) return "elf";
  if (s.includes("dwarf") || s.includes("dwf")) return "dwarf";
  if (s.includes("orc")) return "orc";
  if (s.includes("undead") || s.includes("ud_") || s === "ud") return "undead";
  if (s.includes("human") || s.includes("wk")) return "human";

  return "human";
}

/** Mesh prefix for a race (WK_, ELF_, …) */
export function raceMeshPrefix(raceId: string): string {
  const id = normalizeRaceId(raceId);
  return (RACE_GRUDGE6[id] ?? RACE_GRUDGE6.human).prefix;
}

/**
 * Warlords play kits — Toon RTS GLB only (`loadRaceKit` / `deployToonPlayKit`).
 * Not races bake / FBX / metaverse.
 */
export const RACE_TOON_RTS_PATHS: Record<string, string> = {
  human: "/asset-packs/toon-rts-characters/glb/characters/human.glb",
  barbarian: "/asset-packs/toon-rts-characters/glb/characters/barbarian.glb",
  elf: "/asset-packs/toon-rts-characters/glb/characters/elf.glb",
  dwarf: "/asset-packs/toon-rts-characters/glb/characters/dwarf.glb",
  orc: "/asset-packs/toon-rts-characters/glb/characters/orc.glb",
  undead: "/asset-packs/toon-rts-characters/glb/characters/undead.glb",
};

/** Production grudge6 FBX path (materials correct; prefer over stripped GLB) */
export const RACE_FBX_PATHS: Record<string, string> = {
  human:     "/models/grudge6/races/WK_Characters.fbx",
  barbarian: "/models/grudge6/races/BRB_Characters.fbx",
  elf:       "/models/grudge6/races/ELF_Characters.fbx",
  dwarf:     "/models/grudge6/races/DWF_Characters.fbx",
  orc:       "/models/grudge6/races/ORC_Characters.fbx",
  undead:    "/models/grudge6/races/UD_Characters.fbx",
};

/**
 * Resolve race model path for loaders.
 * prefer "fbx" for production materials (CDN verified); "glb" for web-only loaders.
 */
export function resolveRaceModelPath(
  raceId: string,
  prefer: "fbx" | "glb" = "fbx",
): string {
  const id = normalizeRaceId(raceId);
  if (prefer === "fbx") {
    return RACE_FBX_PATHS[id] ?? RACE_FBX_PATHS.human;
  }
  return (RACE_GRUDGE6[id] ?? RACE_GRUDGE6.human).cdnPath;
}

/** Atlas webp under textures/grudge6/… (CDN SSOT) */
export const RACE_TEXTURE_R2_KEYS: Record<string, string> = {
  human: "textures/grudge6/western-kingdoms/WK_Standard_Units.webp",
  barbarian: "textures/grudge6/barbarians/BRB_StandardUnits_texture.webp",
  dwarf: "textures/grudge6/dwarves/DWF_Standard_Units.webp",
  elf: "textures/grudge6/elves/ELF_HighElves_Texture.webp",
  orc: "textures/grudge6/orcs/ORC_StandardUnits.webp",
  undead: "textures/grudge6/undead/UD_Standard_Units.webp",
};

export function resolveRaceTextureR2Key(raceId: string): string {
  const id = normalizeRaceId(raceId);
  return RACE_TEXTURE_R2_KEYS[id] ?? RACE_TEXTURE_R2_KEYS.human;
}

const ARMOR_SLOTS = new Set(["body", "arms", "legs", "head", "shoulders", "bag", "wood", "quiver"]);
const WEAPON_SLOTS = new Set([
  "axe",
  "hammer",
  "sword",
  "dagger",
  "pick",
  "spear",
  "bow",
  "staff",
  "shield",
]);

export function splitEquippedSlots(
  equipped: Record<string, string | boolean>,
): { equippedMeshes: Record<string, string>; weaponSlots: Record<string, string> } {
  const equippedMeshes: Record<string, string> = {};
  const weaponSlots: Record<string, string> = {};

  for (const [slot, raw] of Object.entries(equipped)) {
    const variant = raw === true ? "A" : String(raw);
    if (WEAPON_SLOTS.has(slot)) weaponSlots[slot] = variant;
    else if (ARMOR_SLOTS.has(slot) || !WEAPON_SLOTS.has(slot)) equippedMeshes[slot] = variant;
  }

  return { equippedMeshes, weaponSlots };
}

export function defaultModel3d(raceId: string, overrides?: Partial<Model3DField>): Model3DField {
  const race = RACE_GRUDGE6[raceId] ?? RACE_GRUDGE6.human;
  return {
    baseModelId: `${race.prefix}Characters_customizable`,
    equippedMeshes: {},
    weaponSlots: {},
    faceVariant: "A",
    skinColor: "#ffffff",
    armorColor: "#ffffff",
    capeEnabled: false,
    scale: race.scale,
    ...overrides,
  };
}

/** Build model3d JSON from playground/creator equipped slot map. */
export function model3dFromEquipped(
  raceId: string,
  equipped: Record<string, string | boolean>,
  opts?: Partial<Pick<Model3DField, "skinColor" | "armorColor" | "scale" | "faceVariant" | "capeEnabled">>,
): Model3DField {
  const { equippedMeshes, weaponSlots } = splitEquippedSlots(equipped);
  return defaultModel3d(raceId, {
    equippedMeshes,
    weaponSlots,
    ...opts,
  });
}

export function resolveRaceCdnUrl(raceId: string, assetsBase = "https://assets.grudge-studio.com"): string {
  const race = RACE_GRUDGE6[normalizeRaceId(raceId)] ?? RACE_GRUDGE6.human;
  return `${assetsBase.replace(/\/$/, "")}${race.cdnPath}`;
}

export function resolveFbxPath(raceId: string, assetsBase = "https://assets.grudge-studio.com"): string {
  const id = normalizeRaceId(raceId);
  const rel = RACE_FBX_PATHS[id] ?? RACE_FBX_PATHS.human;
  return `${assetsBase.replace(/\/$/, "")}${rel}`;
}

/** Per-piece modular library mesh (D1 meshes.glb_url target). */
export function resolveLibraryMeshUrl(
  raceId: string,
  meshFileName: string,
  assetsBase = "https://assets.grudge-studio.com",
): string {
  const id = normalizeRaceId(raceId);
  const file = meshFileName.endsWith(".glb") ? meshFileName : `${meshFileName}.glb`;
  return `${assetsBase.replace(/\/$/, "")}/models/grudge6/races/library/${id}/${file}`;
}

/**
 * Rewrite known-bad / legacy race model paths to canonical grudge6 kits.
 * Mirrors ObjectStore js/grudge6-kit.js resolveCanonicalAssetUrl (GLB branch for games).
 */
export function resolveCanonicalRaceModelPath(urlOrKey: string): string {
  if (!urlOrKey) return urlOrKey;
  const s = String(urlOrKey);
  const key = s
    .replace(/^https?:\/\/assets\.grudge-studio\.com\//i, "")
    .replace(/^\//, "");

  // /models/characters/races/{race}.glb → kit
  const legacyRace = key.match(/^models\/characters\/races\/([a-z_]+)\.glb$/i);
  if (legacyRace) {
    const id = normalizeRaceId(legacyRace[1]);
    return (RACE_GRUDGE6[id] ?? RACE_GRUDGE6.human).cdnPath;
  }

  // models/characters/grudge6/{race}.glb → kit
  const g6 = key.match(/^models\/characters\/grudge6\/(?:race\/|metaverse\/)?([a-z_]+)\.glb$/i);
  if (g6) {
    const id = normalizeRaceId(g6[1]);
    return (RACE_GRUDGE6[id] ?? RACE_GRUDGE6.human).cdnPath;
  }

  return s.startsWith("/") || s.startsWith("http") ? s : `/${key}`;
}

/**
 * Panel equipment slot names (main-panel paperdoll + character.equipment jsonb).
 * SecondaryWeapon is a non-drop Q-swap reserve — not a paperdoll drop slot for loot.
 * See namingSsot WEAPON_SLOTS.
 */
export type PanelEquipmentSlot =
  | "Head" | "Back" | "Shoulder" | "Chest" | "Hands"
  | "Accessory1" | "MainHand" | "OffHand" | "SecondaryWeapon"
  | "Legs" | "Feet" | "Accessory2";

export type PanelEquipment = Partial<Record<PanelEquipmentSlot, string | null>>;

const VARIANT_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"] as const;

/** Map item tier (T1–T8) to grudge6 mesh variant letter */
export function tierToVariant(tier: number, max = 5): string {
  const idx = Math.min(Math.max(tier, 1), max) - 1;
  return VARIANT_LETTERS[idx] ?? "A";
}

const GRUDA_ARM_SLOT_MAP: Record<string, string> = {
  HEAD: "head",
  CHEST: "body",
  HANDS: "arms",
  LEGS: "legs",
  FEET: "legs",
  SHOULDER: "shoulders",
};

const GRUDA_WPN_MESH_MAP: Record<string, string> = {
  SWORD: "sword",
  AXE: "axe",
  MACE: "hammer",
  DAGGER: "dagger",
  STAFF: "staff",
  BOW: "bow",
  HAMMER: "hammer",
  SPEAR: "spear",
  XBOW: "bow",
  GUN: "bow",
  SHIELD: "shield",
  PICK: "pick",
};

/** T0 item id → race kit mesh slot (see t0WeaponVisuals.ts for GLB URLs). */
const T0_ITEM_MESH_MAP: Record<string, { meshSlot: string; variant: string }> = {
  t0_sword: { meshSlot: "sword", variant: "A" },
  t0_training_sword: { meshSlot: "sword", variant: "A" },
  t0_axe: { meshSlot: "axe", variant: "A" },
  t0_hatchet: { meshSlot: "axe", variant: "A" },
  t0_dagger: { meshSlot: "dagger", variant: "A" },
  t0_bone_dagger: { meshSlot: "dagger", variant: "A" },
  t0_bow: { meshSlot: "bow", variant: "_default" },
  t0_staff: { meshSlot: "staff", variant: "A" },
  t0_hammer: { meshSlot: "hammer", variant: "A" },
  t0_pickaxe: { meshSlot: "pick", variant: "_default" },
  t0_knife: { meshSlot: "dagger", variant: "A" },
  t0_shield: { meshSlot: "shield", variant: "A" },
};

/**
 * Freeform ARPG: no class-locked starter kit.
 * Empty hands → simple sword mesh; any race can equip any weapon later.
 */
const FREEFORM_STARTER_WEAPONS: Record<string, string> = {
  sword: "A",
};

const DEFAULT_ARMOR_VARIANTS: Record<string, string> = {
  body: "A",
  arms: "A",
  legs: "A",
  head: "A",
};

/** Parse GRUDA_* item id → mesh slot + variant */
export function grudaItemToMesh(
  itemId: string,
): { meshSlot: string; variant: string; isWeapon: boolean } | null {
  const tierMatch = itemId.match(/_T(\d)$/i);
  const tier = tierMatch ? parseInt(tierMatch[1], 10) : 1;

  if (itemId.startsWith("GRUDA_ARM_")) {
    const sub = itemId.replace("GRUDA_ARM_", "").split("_")[0].toUpperCase();
    const meshSlot = GRUDA_ARM_SLOT_MAP[sub];
    if (!meshSlot) return null;
    const max = meshSlot === "head" ? 9 : meshSlot === "body" ? 5 : meshSlot === "arms" ? 4 : 3;
    return { meshSlot, variant: tierToVariant(tier, max), isWeapon: false };
  }

  if (itemId.startsWith("GRUDA_WPN_")) {
    const sub = itemId.replace("GRUDA_WPN_", "").split("_")[0].toUpperCase();
    const meshSlot = GRUDA_WPN_MESH_MAP[sub];
    if (!meshSlot) return null;
    const noVariant = ["pick", "spear", "bow"].includes(meshSlot);
    const max = meshSlot === "staff" ? 3 : 2;
    return {
      meshSlot,
      variant: noVariant ? "_default" : tierToVariant(tier, max),
      isWeapon: true,
    };
  }

  if (itemId.startsWith("GRUDA_ACC_")) {
    const sub = itemId.replace("GRUDA_ACC_", "").split("_")[0].toUpperCase();
    if (sub === "BAG" || sub === "BACK") return { meshSlot: "bag", variant: "_default", isWeapon: false };
    if (sub === "QUIVER") return { meshSlot: "quiver", variant: "_default", isWeapon: false };
  }

  // T0 starter items (tier0Items + bone dagger)
  const t0 = T0_ITEM_MESH_MAP[itemId] ?? T0_ITEM_MESH_MAP[itemId.toLowerCase()];
  if (t0) {
    return { meshSlot: t0.meshSlot, variant: t0.variant, isWeapon: true };
  }

  // T1 race-element staffs
  if (/^t1_staff_/i.test(itemId) || itemId.toLowerCase().includes("staff_human") || itemId.toLowerCase().includes("staff_elf")) {
    return { meshSlot: "staff", variant: tierToVariant(Math.max(tier, 1), 3), isWeapon: true };
  }

  // Legacy / ObjectStore items — infer from id or name patterns
  const lower = itemId.toLowerCase();
  if (lower.includes("shield")) return { meshSlot: "shield", variant: tierToVariant(tier, 4), isWeapon: true };
  if (lower.includes("bow")) return { meshSlot: "bow", variant: "_default", isWeapon: true };
  if (lower.includes("staff") || lower.includes("scepter") || lower.includes("cane")) {
    return { meshSlot: "staff", variant: tierToVariant(tier, 3), isWeapon: true };
  }
  if (lower.includes("spear")) return { meshSlot: "spear", variant: "_default", isWeapon: true };
  if (lower.includes("axe")) return { meshSlot: "axe", variant: tierToVariant(tier, 2), isWeapon: true };
  if (lower.includes("hammer") || lower.includes("mace")) return { meshSlot: "hammer", variant: tierToVariant(tier, 2), isWeapon: true };
  // Dagger before sword (bone dagger / iron_dagger)
  if (lower.includes("dagger") || lower.includes("knife") || lower.includes("bone_dagger")) {
    return { meshSlot: "dagger", variant: tierToVariant(tier, 2), isWeapon: true };
  }
  if (lower.includes("sword")) return { meshSlot: "sword", variant: tierToVariant(tier, 2), isWeapon: true };
  if (lower.includes("helm") || lower.includes("head") || lower.includes("hood")) return { meshSlot: "head", variant: tierToVariant(tier, 9), isWeapon: false };
  if (lower.includes("chest") || lower.includes("vest") || lower.includes("robe")) return { meshSlot: "body", variant: tierToVariant(tier, 5), isWeapon: false };
  if (lower.includes("hand") || lower.includes("glove")) return { meshSlot: "arms", variant: tierToVariant(tier, 4), isWeapon: false };
  if (lower.includes("leg") || lower.includes("boot") || lower.includes("feet")) return { meshSlot: "legs", variant: tierToVariant(tier, 3), isWeapon: false };
  if (lower.includes("shoulder") || lower.includes("pauldron")) return { meshSlot: "shoulders", variant: tierToVariant(tier, 2), isWeapon: false };
  if (lower.includes("bag") || lower.includes("backpack")) return { meshSlot: "bag", variant: "_default", isWeapon: false };
  if (lower.includes("quiver")) return { meshSlot: "quiver", variant: "_default", isWeapon: false };

  return null;
}

/**
 * Convert main-panel equipment slots → model3d equippedMeshes + weaponSlots.
 * Freeform ARPG: what you equip is what you render — no class weapon locks.
 * `classId` kept for call-site compatibility only (ignored for mesh defaults).
 */
export function panelEquipmentToModel3d(
  raceId: string,
  _classId: string,
  equipment: PanelEquipment,
  opts?: Partial<Pick<Model3DField, "skinColor" | "armorColor" | "scale" | "faceVariant" | "capeEnabled">>,
): Model3DField {
  const equippedMeshes: Record<string, string> = {};
  const weaponSlots: Record<string, string> = {};

  const panelToItem: Array<[PanelEquipmentSlot, string | null | undefined]> = [
    ["Head", equipment.Head],
    ["Chest", equipment.Chest],
    ["Hands", equipment.Hands],
    ["Legs", equipment.Legs],
    ["Feet", equipment.Feet],
    ["Shoulder", equipment.Shoulder],
    ["Back", equipment.Back],
    ["MainHand", equipment.MainHand],
    ["OffHand", equipment.OffHand],
  ];

  for (const [, itemId] of panelToItem) {
    if (!itemId) continue;
    const mesh = grudaItemToMesh(itemId);
    if (!mesh) continue;
    if (mesh.isWeapon) weaponSlots[mesh.meshSlot] = mesh.variant;
    else equippedMeshes[mesh.meshSlot] = mesh.variant;
  }

  // Base armor so the character is never naked
  for (const [slot, variant] of Object.entries(DEFAULT_ARMOR_VARIANTS)) {
    if (!equippedMeshes[slot]) equippedMeshes[slot] = variant;
  }

  // Freeform starter: only fill a sword if nothing is equipped in hands
  const hasMainWeapon = Object.keys(weaponSlots).some((s) => s !== "shield");
  if (!hasMainWeapon) {
    for (const [slot, variant] of Object.entries(FREEFORM_STARTER_WEAPONS)) {
      if (WEAPON_SLOTS.has(slot)) weaponSlots[slot] = variant;
      else equippedMeshes[slot] = variant;
    }
  }

  // Off-hand shield only if the player actually equipped one (no class auto-shield)
  return defaultModel3d(raceId, { equippedMeshes, weaponSlots, ...opts });
}

/**
 * Infer animation weapon type from equipped meshes only.
 * Freeform ARPG: class does not gate animations or combat style.
 * `classId` optional/legacy — unused.
 */
export function weaponTypeFromModel3d(
  model3d: Model3DField,
  _classId?: string,
): string {
  const ws = model3d.weaponSlots ?? {};
  if (ws.bow) return "bow";
  if (ws.staff) return "arcane-staff";
  if (ws.spear) return "spear";
  if (ws.axe) return "axe";
  if (ws.hammer) return "hammer1h";
  if (ws.dagger) return "dagger";
  if (ws.sword && ws.shield) return "sword-shield";
  if (ws.sword) return "sword";
  if (ws.shield) return "sword-shield";
  if (ws.pick) return "unarmed";
  return "sword";
}

/** Colyseus / multiplayer join payload derived from a character row. */
export function characterToJoinOptions(char: {
  id: string;
  name: string;
  raceId: string;
  classId: string;
  level?: number;
  model3d?: Partial<Model3DField>;
}) {
  const model3d = { ...defaultModel3d(char.raceId), ...char.model3d };
  const race = RACE_GRUDGE6[char.raceId] ?? RACE_GRUDGE6.human;
  return {
    characterId: char.id,
    characterName: char.name,
    heroClass: char.classId,
    heroRace: char.raceId,
    faction: race.faction,
    level: char.level ?? 1,
    baseModelId: model3d.baseModelId,
    equippedMeshes: model3d.equippedMeshes,
    weaponSlots: model3d.weaponSlots,
    skinColor: model3d.skinColor,
    armorColor: model3d.armorColor,
    sourceGame: "grudge-fleet",
  };
}
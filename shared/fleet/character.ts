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
  /** CDN-relative race model path */
  cdnPath: string;
  scale: number;
  faction: "crusade" | "fabled" | "legion" | "wild";
}

export const RACE_GRUDGE6: Record<string, Grudge6RaceConfig> = {
  human:     { modelId: "human",     prefix: "WK_",  label: "Human",     cdnPath: "/models/characters/races/human.glb",     scale: 1.0,  faction: "crusade" },
  barbarian: { modelId: "barbarian", prefix: "BRB_", label: "Barbarian", cdnPath: "/models/characters/races/barbarian.glb", scale: 1.1,  faction: "crusade" },
  elf:       { modelId: "elf",       prefix: "ELF_", label: "Elf",       cdnPath: "/models/characters/races/elf.glb",       scale: 1.0,  faction: "fabled" },
  dwarf:     { modelId: "dwarf",     prefix: "DWF_", label: "Dwarf",     cdnPath: "/models/characters/races/dwarf.glb",     scale: 0.85, faction: "crusade" },
  orc:       { modelId: "orc",       prefix: "ORC_", label: "Orc",       cdnPath: "/models/characters/races/orc.glb",       scale: 1.15, faction: "legion" },
  undead:    { modelId: "undead",    prefix: "UD_",  label: "Undead",    cdnPath: "/models/characters/races/undead.glb",    scale: 1.0,  faction: "legion" },
};

/** Legacy grudge6 FBX path (character creator playground) */
export const RACE_FBX_PATHS: Record<string, string> = {
  human:     "/models/grudge6/races/WK_Characters.fbx",
  barbarian: "/models/grudge6/races/BRB_Characters.fbx",
  elf:       "/models/grudge6/races/ELF_Characters.fbx",
  dwarf:     "/models/grudge6/races/DWF_Characters.fbx",
  orc:       "/models/grudge6/races/ORC_Characters.fbx",
  undead:    "/models/grudge6/races/UD_Characters.fbx",
};

const ARMOR_SLOTS = new Set(["body", "arms", "legs", "head", "shoulders", "bag", "wood", "quiver"]);
const WEAPON_SLOTS = new Set(["axe", "hammer", "sword", "pick", "spear", "bow", "staff", "shield"]);

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
  const race = RACE_GRUDGE6[raceId] ?? RACE_GRUDGE6.human;
  return `${assetsBase.replace(/\/$/, "")}${race.cdnPath}`;
}

export function resolveFbxPath(raceId: string, assetsBase = "https://assets.grudge-studio.com"): string {
  const rel = RACE_FBX_PATHS[raceId] ?? RACE_FBX_PATHS.human;
  return `${assetsBase.replace(/\/$/, "")}${rel}`;
}

/** Panel equipment slot names from character-builder / main equipment UI */
export type PanelEquipmentSlot =
  | "Head" | "Back" | "Shoulder" | "Chest" | "Hands"
  | "Accessory1" | "MainHand" | "OffHand" | "Legs" | "Feet" | "Accessory2";

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
  DAGGER: "sword",
  STAFF: "staff",
  BOW: "bow",
  HAMMER: "hammer",
  SPEAR: "spear",
  XBOW: "bow",
  GUN: "bow",
  SHIELD: "shield",
  PICK: "pick",
};

const CLASS_DEFAULT_WEAPONS: Record<string, Record<string, string>> = {
  warrior: { sword: "A", shield: "A" },
  ranger:  { bow: "_default", quiver: "_default" },
  mage:    { staff: "A" },
  worg:    { axe: "A" },
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

  // Legacy / ObjectStore items — infer from id or name patterns
  const lower = itemId.toLowerCase();
  if (lower.includes("shield")) return { meshSlot: "shield", variant: tierToVariant(tier, 4), isWeapon: true };
  if (lower.includes("bow")) return { meshSlot: "bow", variant: "_default", isWeapon: true };
  if (lower.includes("staff")) return { meshSlot: "staff", variant: tierToVariant(tier, 3), isWeapon: true };
  if (lower.includes("spear")) return { meshSlot: "spear", variant: "_default", isWeapon: true };
  if (lower.includes("axe")) return { meshSlot: "axe", variant: tierToVariant(tier, 2), isWeapon: true };
  if (lower.includes("hammer") || lower.includes("mace")) return { meshSlot: "hammer", variant: tierToVariant(tier, 2), isWeapon: true };
  if (lower.includes("sword") || lower.includes("dagger")) return { meshSlot: "sword", variant: tierToVariant(tier, 2), isWeapon: true };
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
 * Fills class-default weapons and base armor when slots are empty.
 */
export function panelEquipmentToModel3d(
  raceId: string,
  classId: string,
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

  // Class-default weapons when MainHand is empty
  const hasMainWeapon = Object.keys(weaponSlots).some((s) => s !== "shield");
  if (!hasMainWeapon) {
    const defaults = CLASS_DEFAULT_WEAPONS[classId] ?? CLASS_DEFAULT_WEAPONS.warrior;
    for (const [slot, variant] of Object.entries(defaults)) {
      if (slot === "shield") {
        if (!weaponSlots.shield && !equipment.OffHand) weaponSlots.shield = variant;
      } else if (!weaponSlots[slot]) {
        if (WEAPON_SLOTS.has(slot)) weaponSlots[slot] = variant;
        else equippedMeshes[slot] = variant;
      }
    }
  }

  // Warrior sword+shield: add shield when sword equipped and no offhand
  if (weaponSlots.sword && !weaponSlots.shield && !equipment.OffHand && classId === "warrior") {
    weaponSlots.shield = "A";
  }

  return defaultModel3d(raceId, { equippedMeshes, weaponSlots, ...opts });
}

/** Infer animation weapon type from model3d weapon slots */
export function weaponTypeFromModel3d(
  model3d: Model3DField,
  classId: string,
): string {
  const ws = model3d.weaponSlots ?? {};
  if (ws.bow) return "bow";
  if (ws.staff) return "arcane-staff";
  if (ws.spear || ws.axe || ws.hammer) return classId === "worg" ? "greatsword" : "axe";
  if (ws.sword && ws.shield) return "sword";
  if (ws.sword) return "sword";
  if (ws.shield) return "sword-shield";
  const classDefaults: Record<string, string> = {
    warrior: "sword",
    ranger: "bow",
    mage: "arcane-staff",
    worg: "greatsword",
  };
  return classDefaults[classId] ?? "sword";
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
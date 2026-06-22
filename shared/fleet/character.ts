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
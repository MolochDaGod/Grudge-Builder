/**
 * Foundry / character-viewer → /play handoff.
 *
 * Hash format matches game-content buildHandoff.ts
 * (`#grudge-launch=` base64url JSON, v=1). Do not invent a second payload.
 *
 * Out of scope: feet IK, traversal walls, water, damage, mount, locomotion forks.
 */
import { normalizeRaceId } from "@shared/fleet";
import {
  getWeaponTypeDefinition,
  normalizeWeaponTypeId,
  type SlotType,
} from "@shared/definitions/weaponSkillsNew";
import {
  emptyHotbar,
  type PlayerHotbar,
  WEAPON_SKILL_SLOTS,
} from "@/lib/hotbarLayout";
import type { Character } from "@/lib/characterManager";

export const VIEWER_LAUNCH_HASH_PREFIX = "grudge-launch=";
export const VIEWER_LAUNCH_KEY = "grudge:launch-build:v1";

export type ViewerLaunchMode = "world" | "tutorial";

export interface ViewerLaunchBuild {
  v: 1;
  mode: ViewerLaunchMode;
  kitRace: string;
  classId: string | null;
  harvestMode: boolean;
  grudgeId: string | null;
  activePrefabId: string | null;
  skillStore: Record<string, string[]>;
  attributePoints: Record<string, number> | null;
  weaponBagId: string | null;
  offhandBagId: string | null;
  gearBagIds: string[];
  level: number;
  worldClassBar: Array<string | null> | null;
  spawnCode: string | null;
  activeMasteryTree: string | null;
  bakedGlbUrl: string | null;
}

/** Viewer starter-bag id → play weapon type (not class, not mesh name substring). */
export const LAUNCH_BAG_WEAPON: Record<string, string> = {
  "bag-gorehowl": "axe",
  "bag-wraithfang": "sword",
  "bag-emberwrath": "staff",
  "bag-shadowflight": "bow",
  "bag-aegis": "shield",
};

/** Viewer starter-bag id → paperdoll / kit slot. */
export const LAUNCH_BAG_SLOT: Record<string, string> = {
  "bag-gorehowl": "MainHand",
  "bag-wraithfang": "MainHand",
  "bag-emberwrath": "MainHand",
  "bag-shadowflight": "MainHand",
  "bag-aegis": "OffHand",
  "bag-arcane-grimoire": "OffHand",
  "bag-ironpauldron": "Shoulder",
  "bag-ironpauldrons": "Shoulder",
  "bag-shadowweave": "Chest",
  "bag-padded": "Legs",
  "bag-tracker": "Feet",
  "bag-hawkring": "Accessory1",
  "bag-archergloves": "Hands",
  "bag-camocloak": "Back",
  "bag-scouthood": "Head",
  "bag-eagleeye": "Accessory2",
  "bag-soullantern": "Accessory2",
};

const PLAY_TO_CATALOG: Record<string, string> = {
  axe: "AXE",
  greataxe: "AXE",
  sword: "SWORD",
  "sword-shield": "SWORD",
  bow: "BOW",
  longbow: "BOW",
  crossbow: "CROSSBOW",
  staff: "STAFF",
  "arcane-staff": "STAFF",
  "fire-staff": "STAFF",
  "frost-staff": "STAFF",
  "nature-staff": "STAFF",
  "holy-staff": "STAFF",
  "lightning-staff": "STAFF",
  hammer1h: "HAMMER",
  hammer2h: "HAMMER",
  mace: "MACE",
  spear: "SPEAR",
  dagger: "DAGGER",
  greatsword: "TWO_HAND_SWORD",
  gun: "GUN",
  shield: "SHIELD",
};

function base64ToUtf8(b64: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function decodeLaunchHandoff(encoded: string): ViewerLaunchBuild | null {
  try {
    let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = base64ToUtf8(b64);
    const build = JSON.parse(json) as ViewerLaunchBuild;
    return build?.v === 1 ? build : null;
  } catch {
    return null;
  }
}

export function readViewerLaunchFromHash(
  hash: string = typeof window !== "undefined" ? window.location.hash : "",
): ViewerLaunchBuild | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw.startsWith(VIEWER_LAUNCH_HASH_PREFIX)) return null;
  return decodeLaunchHandoff(raw.slice(VIEWER_LAUNCH_HASH_PREFIX.length));
}

export function readViewerLaunchFromSession(): ViewerLaunchBuild | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(VIEWER_LAUNCH_KEY);
    if (!raw) return null;
    const build = JSON.parse(raw) as ViewerLaunchBuild;
    return build?.v === 1 ? build : null;
  } catch {
    return null;
  }
}

/** Hash wins (cross-subdomain). Persist a copy so engine apply can re-read. */
export function readViewerLaunchBuild(): ViewerLaunchBuild | null {
  const fromHash = readViewerLaunchFromHash();
  if (fromHash) {
    try {
      sessionStorage.setItem(VIEWER_LAUNCH_KEY, JSON.stringify(fromHash));
    } catch {
      /* private mode */
    }
    return fromHash;
  }
  return readViewerLaunchFromSession();
}

export function weaponTypeFromLaunchBag(bagId: string | null | undefined): string | null {
  if (!bagId) return null;
  return LAUNCH_BAG_WEAPON[bagId] ?? null;
}

export function catalogKeyForPlayWeapon(weaponType: string): string {
  const key = String(weaponType || "").toLowerCase();
  const mapped = PLAY_TO_CATALOG[key] ?? key.replace(/-/g, "_").toUpperCase();
  return normalizeWeaponTypeId(mapped);
}

/** 1–5 = primary · secondary · ability · leftover · ultimate for the equipped weapon. */
export function defaultHotbarFromWeaponType(weaponType: string): PlayerHotbar {
  const hotbar = emptyHotbar();
  const def = getWeaponTypeDefinition(catalogKeyForPlayWeapon(weaponType));
  if (!def) return hotbar;

  const firstOf = (type: SlotType) => def.slots.find((s) => s.type === type)?.skills[0]?.id ?? null;
  const picked: Array<string | null> = [
    firstOf("primary"),
    firstOf("secondary"),
    firstOf("ability") ?? firstOf("utility"),
    null,
    firstOf("ultimate"),
  ];
  const used = new Set(picked.filter((id): id is string => !!id));
  if (!picked[3]) {
    for (const slot of def.slots) {
      for (const sk of slot.skills) {
        if (used.has(sk.id)) continue;
        picked[3] = sk.id;
        used.add(sk.id);
        break;
      }
      if (picked[3]) break;
    }
  }
  for (const s of WEAPON_SKILL_SLOTS) {
    hotbar.weaponSkills[s] = picked[s - 1] ?? null;
  }
  return hotbar;
}

export function equipmentFromLaunchBags(build: ViewerLaunchBuild): Record<string, string | null> {
  const equipment: Record<string, string | null> = {};
  const ids = [
    ...(build.gearBagIds ?? []),
    build.weaponBagId,
    build.offhandBagId,
  ].filter((id): id is string => !!id);
  for (const id of ids) {
    const slot = LAUNCH_BAG_SLOT[id];
    if (slot && !equipment[slot]) equipment[slot] = id;
  }
  return equipment;
}

export function model3dFromLaunch(build: ViewerLaunchBuild, raceId: string) {
  const weaponType = weaponTypeFromLaunchBag(build.weaponBagId) ?? "sword";
  const offType = weaponTypeFromLaunchBag(build.offhandBagId);
  const weaponSlots: Record<string, string> = {};
  if (weaponType && weaponType !== "shield") weaponSlots[weaponType] = "A";
  if (offType) weaponSlots[offType] = "A";
  return {
    baseModelId: raceId,
    equippedMeshes: { body: "A", arms: "A", legs: "A", head: "A" },
    weaponSlots,
    faceVariant: "A",
    skinColor: "#ffffff",
    armorColor: "#ffffff",
    capeEnabled: false,
    scale: 1,
  };
}

export function classBarFromLaunch(build: ViewerLaunchBuild): Record<number, string | null> {
  const bar: Record<number, string | null> = { 1: null, 2: null, 3: null, 4: null, 5: null };
  const slots = build.worldClassBar ?? [];
  for (let i = 0; i < 5; i++) {
    bar[i + 1] = slots[i] ?? null;
  }
  return bar;
}

export function hotbarFromLaunch(build: ViewerLaunchBuild): PlayerHotbar {
  const weaponType = weaponTypeFromLaunchBag(build.weaponBagId) ?? "sword";
  const hotbar = defaultHotbarFromWeaponType(weaponType);
  hotbar.classAbilities = classBarFromLaunch(build);
  return hotbar;
}

export function characterFromLaunch(
  build: ViewerLaunchBuild,
  base?: Character | null,
): Character {
  const raceId = normalizeRaceId(build.kitRace || base?.raceId || "human");
  const classId = build.classId || base?.classId || "warrior";
  const equipment = {
    ...(base?.equipment ?? {}),
    ...equipmentFromLaunchBags(build),
  };
  const model3d = model3dFromLaunch(build, raceId);
  const hotbar = hotbarFromLaunch(build);
  const name =
    base?.name && base.name !== "Guest Captain" && base.name !== "Trailer Guest"
      ? base.name
      : classId === "worge"
        ? "Worge"
        : classId.charAt(0).toUpperCase() + classId.slice(1);

  return {
    ...(base ?? {
      xp: 0,
      attributes: build.attributePoints ?? {},
      inventory: [],
      professionLevels: {},
      createdAt: Date.now(),
    }),
    id: base?.id && !base.id.startsWith("guest") ? base.id : build.grudgeId || "launch-guest",
    name,
    raceId,
    classId,
    level: build.level || base?.level || 20,
    equipment,
    model3d,
    weaponBar: hotbar.weaponSkills,
    actionBar: hotbar.weaponSkills,
    classAbilityBar: hotbar.classAbilities,
    equippedWeaponId: build.weaponBagId,
    grudgeCode: build.grudgeId,
  } as Character;
}

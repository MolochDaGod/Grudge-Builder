/**
 * ObjectStore API Type Definitions
 *
 * TypeScript interfaces matching the ObjectStore api/v1/*.json schemas.
 * These are the canonical shapes returned by the ObjectStore API.
 */

// ── Common ───────────────────────────────────────────────────────────────────

export type AttributeKey =
  | "Strength"
  | "Intellect"
  | "Vitality"
  | "Dexterity"
  | "Endurance"
  | "Wisdom"
  | "Agility"
  | "Tactics";

export type FactionId = "crusade" | "legion" | "fabled";
export type ClassId = "warrior" | "mage" | "worge" | "ranger";
export type RaceId = "human" | "orc" | "elf" | "undead" | "barbarian" | "dwarf";

// ── Attributes (/api/v1/attributes.json) ─────────────────────────────────────

export interface OSAttribute {
  id: string;
  name: AttributeKey;
  icon: string;
  color: string;
  description: string;
  formula: string;
  emoji: string;
}

export interface OSAttributesResponse {
  version: string;
  updated: string;
  total: number;
  attributes: OSAttribute[];
}

// ── Factions (/api/v1/factions.json) ─────────────────────────────────────────

export interface OSFaction {
  id: FactionId;
  name: string;
  patron: string;
  color: string;
  races: RaceId[];
  description: string;
  lore: string;
  emoji: string;
}

export interface OSFactionsResponse {
  version: string;
  updated: string;
  total: number;
  factions: Record<FactionId, OSFaction>;
}

// ── Races (/api/v1/races.json) ───────────────────────────────────────────────

export interface OSRace {
  id: RaceId;
  name: string;
  icon: string;
  color: string;
  faction: FactionId;
  trait: string;
  description: string;
  lore: string;
  bonuses: Record<AttributeKey, number>;
  passive: string;
  emoji: string;
}

export interface OSRacesResponse {
  version: string;
  updated: string;
  total: number;
  grudgeType: string;
  races: Record<RaceId, OSRace>;
}

// ── Classes (/api/v1/classes.json) ───────────────────────────────────────────

export interface OSAbility {
  id: string;
  name: string;
  grudgeType: string;
  icon: string;
  description: string;
  type: string;
  damage: number;
  manaCost: number;
  staminaCost: number;
  cooldown: number;
  target: string;
  manaGain?: number;
  staminaGain?: number;
  healPercent?: number;
  isAoE?: boolean;
  guaranteedCrit?: boolean;
  duration?: number;
  effect?: {
    type?: string;
    stat?: string;
    damage?: number;
    multiplier?: number;
    flat?: number;
    duration: number;
  };
  defenseBoost?: {
    stat: string;
    flat: number;
    duration: number;
  };
  totemType?: string;
  companionType?: string;
}

export interface OSClass {
  id: ClassId;
  name: string;
  icon: string;
  color: string;
  description: string;
  lore: string;
  startingAttributes: Record<AttributeKey, number>;
  weaponTypes: string[];
  armorTypes: string[];
  abilities: OSAbility[];
  signatureAbility: OSAbility;
  emoji: string;
}

export interface OSClassesResponse {
  version: string;
  updated: string;
  total: number;
  grudgeType: string;
  classes: Record<ClassId, OSClass>;
  tiers: Array<{
    minRank: number;
    maxRank: number;
    name: string;
    color: string;
  }>;
}

// ── Weapons (/api/v1/weapons.json) ───────────────────────────────────────────

export interface OSWeapon {
  id: string;
  name: string;
  type: string;
  category: string;
  tier: number;
  damage: number;
  speed: number;
  stats: Record<string, number>;
  abilities?: string[];
  passives?: string[];
  lore?: string;
  icon?: string;
}

export interface OSWeaponsResponse {
  version: string;
  categories: Record<
    string,
    {
      craftedBy: string;
      category: string;
      items: OSWeapon[];
    }
  >;
}

// ── Armor (/api/v1/armor.json) ───────────────────────────────────────────────

export interface OSArmorPiece {
  id: string;
  name: string;
  slot: string;
  material: string;
  set: string;
  tier: number;
  stats: Record<string, number>;
  icon?: string;
}

export interface OSArmorResponse {
  version: string;
  sets: Record<string, unknown>;
}

// ── Materials (/api/v1/materials.json) ───────────────────────────────────────

export interface OSMaterial {
  id: string;
  name: string;
  type: string;
  tier: number;
  description: string;
  icon?: string;
  profession?: string;
  gatherLevel?: number;
}

export interface OSMaterialsResponse {
  version: string;
  materials: OSMaterial[];
}

// ── Sprite Maps (/api/v1/spriteMaps.json) ────────────────────────────────────

export interface OSSpriteMap {
  weaponMaps: Record<string, string>;
  armorMaps: Record<string, string>;
}

// ── 3D Race Models (/api/v1/race-models.json) ────────────────────────────────

export type MountType = 'horse' | 'warhorse' | 'stag' | 'boar' | 'wolf' | 'skeletal_horse';
export type ColorVariant = 'black' | 'blue' | 'brown' | 'green' | 'red' | 'white';
export type EquipSlotGroup = 'armor' | 'mainHand' | 'offHand' | 'shield' | 'utility';

export interface OSEquipSlotDef {
  variants?: string[];
  single?: boolean;
  mesh: string;
}

export interface OSBoneContainers {
  mainHand: string;   // R_hand_container
  offHand: string;    // L_hand_container
  shield: string;     // L_shield_container
  back: string;       // Bone_bag
  woodSlot: string;   // Bone_wood
  quiver: string;     // Quiver_container
}

export interface OSEquipmentSlots {
  armor: Record<string, OSEquipSlotDef>;
  mainHand: Record<string, OSEquipSlotDef>;
  offHand: Record<string, OSEquipSlotDef>;
  shield: Record<string, OSEquipSlotDef>;
  utility: Record<string, OSEquipSlotDef>;
}

export interface OSSubRaceTexture {
  texture: string;
  colorVariants: ColorVariant[];
}

export interface OSRaceModel3D {
  id: RaceId;
  name: string;
  prefix: string;
  faction: FactionId;
  factionColor: string;
  characterModel: string;
  cavalryModel: string | null;
  siegeModel: string | null;
  mountType: MountType;
  defaultTexture: string;
  mountTexture: string | null;
  colorVariants: ColorVariant[];
  subRaces?: Record<string, OSSubRaceTexture>;
  extraWeapons: string[];
  animationSets: string[];
}

export interface OSRaceModelsResponse {
  version: string;
  updated: string;
  total: number;
  grudgeType: 'raceModels3D';
  cdnBase: string;
  skeleton: string;
  boneContainers: OSBoneContainers;
  equipmentSlots: OSEquipmentSlots;
  races: Record<RaceId, OSRaceModel3D>;
  sharedAnimationPacks: string[];
}

// ── Generic API response wrapper ─────────────────────────────────────────────

export interface OSApiResponse<T> {
  version: string;
  updated?: string;
  total?: number;
  data: T;
}

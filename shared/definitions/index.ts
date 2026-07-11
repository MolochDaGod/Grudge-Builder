export * from "./types";
export * from "./spells";
export * from "./skills";
export * from "./items";
export * from "./monsters";
export * from "./animations";
export * from "./dungeons";
export * from "./tier0Items";
export * from "./weaponArsenal";
export * from "./buildSystem";
export * from "./survivalKitBuildCatalog";
export * from "./warlordsEraAssets";
export * from "./homeIslandMines";
export * from "./homeIslandMountain";
export * from "./homeIslandNodeRules";
export * from "./ultimateFantasyRtsCatalog";
export * from "./ultimateFantasyRtsBuildPieces";
export * from "./medievalBattleScene";
export * from "./mapRegistry";
export * from "./biomeEcosystemCatalog";
export * from "./biomeHarvestAssets";
export * from "./resolveAsset";
export * from "./terrainPackage";
export * from "./tutorialFlow";

import { SPELLS, getSpell, getSpellByReferenceName, getSpellsBySchool, getSpellsByLevel } from "./spells";
import { SKILLS, getSkill, getSkillByReferenceName, getSkillsByWeapon, getSkillsByLevel } from "./skills";
import { ITEMS, getItem, getItemsByType, getItemsByRarity, getWeapons, getWeaponsByType } from "./items";
import { MONSTERS, getMonster, getMonstersByLevel, getBosses, getMonstersByWeakness } from "./monsters";
import { ANIMATION_CONFIGS, DAMAGE_TYPE_TO_EFFECT, getAnimationConfig, getEffectForDamageType } from "./animations";
import { TILES, DUNGEON_FLOORS, getTile, getDungeonFloor, getDungeonsByLevelRange, getBossFloors } from "./dungeons";
import { ALL_T0_ITEMS, getT0Item, getT0ItemsByType, getT0CraftableItems, getT0ItemsForT1Crafting } from "./tier0Items";
import type { AbilityDefinition, SpellDefinition, SkillDefinition, ItemDefinition, MonsterDefinition, EffectVisual, DamageType } from "./types";

export const GameDefinitions = {
  spells: {
    all: SPELLS,
    get: getSpell,
    byReferenceName: getSpellByReferenceName,
    bySchool: getSpellsBySchool,
    byLevel: getSpellsByLevel
  },
  skills: {
    all: SKILLS,
    get: getSkill,
    byReferenceName: getSkillByReferenceName,
    byWeapon: getSkillsByWeapon,
    byLevel: getSkillsByLevel
  },
  items: {
    all: ITEMS,
    get: getItem,
    byType: getItemsByType,
    byRarity: getItemsByRarity,
    weapons: getWeapons,
    weaponsByType: getWeaponsByType
  },
  monsters: {
    all: MONSTERS,
    get: getMonster,
    byLevel: getMonstersByLevel,
    bosses: getBosses,
    byWeakness: getMonstersByWeakness
  },
  animations: {
    configs: ANIMATION_CONFIGS,
    damageTypeToEffect: DAMAGE_TYPE_TO_EFFECT,
    getConfig: getAnimationConfig,
    getEffectForDamage: getEffectForDamageType
  },
  dungeons: {
    tiles: TILES,
    floors: DUNGEON_FLOORS,
    getTile,
    getFloor: getDungeonFloor,
    byLevelRange: getDungeonsByLevelRange,
    bossFloors: getBossFloors
  },
  tier0: {
    all: ALL_T0_ITEMS,
    get: getT0Item,
    byType: getT0ItemsByType,
    craftable: getT0CraftableItems,
    forT1Crafting: getT0ItemsForT1Crafting
  }
};

export function getAbilityById(id: string): AbilityDefinition | undefined {
  return getSpell(id) || getSkill(id);
}

export function getAbilityByReferenceName(referenceName: string): AbilityDefinition | undefined {
  return getSpellByReferenceName(referenceName) || getSkillByReferenceName(referenceName);
}

export function getEffectForAbility(ability: AbilityDefinition): EffectVisual {
  return ability.visualEffect;
}

export function getMonsterAbilities(monster: MonsterDefinition): AbilityDefinition[] {
  return monster.abilities
    .map(id => getAbilityById(id))
    .filter((a): a is AbilityDefinition => a !== undefined);
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function createCharacterId(): string {
  return `char_${generateUUID()}`;
}

export function createItemInstanceId(): string {
  return `item_inst_${generateUUID()}`;
}

export function createDungeonRunId(): string {
  return `run_${generateUUID()}`;
}

export function createCombatLogId(): string {
  return `combat_${generateUUID()}`;
}

export function createSaveId(): string {
  return `save_${generateUUID()}`;
}

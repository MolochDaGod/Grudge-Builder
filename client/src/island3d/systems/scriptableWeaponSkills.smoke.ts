/**
 * Smoke: every weaponSkillsNew option is a scriptable skill + storage prefab.
 * Run: npx tsx client/src/island3d/systems/scriptableWeaponSkills.smoke.ts
 */
import {
  WEAPON_TYPE_DEFINITIONS,
  getWeaponTypeDefinition,
  findWeaponSkillById,
} from '@shared/definitions/weaponSkillsNew.ts';
import {
  ensureWeaponSkillCombatCatalog,
  getProductionSkillCombat,
} from '@shared/definitions/weaponSkillCombatCatalog.ts';
import {
  PRODUCTION_WEAPON_TYPES,
  getWeaponPrefab,
} from '@shared/definitions/weaponPrefabCatalog.ts';
import { getWeaponSkillDisplay } from '@shared/definitions/weaponSkillDisplay.generated.ts';
import { ScriptableSkillRuntime } from './ScriptableSkillRuntime.ts';

function assert(c: boolean, m: string) {
  if (!c) throw new Error(m);
}

let optionCount = 0;
const optionIds: string[] = [];
for (const def of Object.values(WEAPON_TYPE_DEFINITIONS)) {
  for (const slot of def.slots) {
    for (const sk of slot.skills) {
      optionCount++;
      optionIds.push(sk.id);
    }
  }
  if (def.formSkills) {
    for (const form of def.formSkills) {
      for (const sk of form.skills) {
        optionCount++;
        optionIds.push(sk.id);
      }
    }
  }
}

const catalog = ensureWeaponSkillCombatCatalog();
assert(catalog.size >= optionCount, `catalog ${catalog.size} < options ${optionCount}`);

let missingCombat = 0;
for (const id of optionIds) {
  if (!getProductionSkillCombat(id)) missingCombat++;
}
assert(missingCombat === 0, `${missingCombat} options lack ProductionSkillCombatDef`);

const scene = { add() {}, remove() {} } as unknown as import('three').Scene;
const rt = new ScriptableSkillRuntime(scene);
const n = rt.registerAllWeaponSkills();
assert(n >= optionCount, `scriptable registered ${n} < ${optionCount}`);

const sample = ScriptableSkillRuntime.fromProductionCombat(
  getProductionSkillCombat(optionIds[0])!,
);
assert(!!sample.id && sample.cooldownSec >= 0, 'scriptable mapper');
assert(typeof sample.castTimeSec === 'number', 'castTimeSec = windup');

let missingPrefabType = 0;
for (const wt of PRODUCTION_WEAPON_TYPES) {
  if (!getWeaponPrefab(wt, 1)) missingPrefabType++;
}
assert(missingPrefabType === 0, `${missingPrefabType} weapon types have no storage prefab row`);

assert(!!getWeaponTypeDefinition('GREATSWORD'), 'GREATSWORD aliases TWO_HAND_SWORD tree');
assert(!!getWeaponPrefab('CROSSBOW', 1), 'CROSSBOW aliases BOW prefab row');
assert(!!getWeaponPrefab('TWO_HAND_SWORD', 1), 'TWO_HAND_SWORD aliases GREATSWORD prefab');
assert(findWeaponSkillById('axe_rending_chop')?.skill.name === 'Rending Chop', 'catalog name Rending Chop');
assert(getWeaponSkillDisplay('axe_rending_chop')?.name === 'Rending Chop', 'display map official name');
assert(!!getWeaponSkillDisplay('mace_battle_cry') || !!findWeaponSkillById('mace_battle_cry'), 'local-only mace cry still findable');

console.log(
  `scriptable weapon skills ok · options=${optionCount} catalog=${catalog.size} registered=${n} prefabTypes=${PRODUCTION_WEAPON_TYPES.length}`,
);

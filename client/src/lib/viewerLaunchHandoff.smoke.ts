/**
 * Smoke: #grudge-launch= hydrates race + Gorehowl axe skills (not grim_*).
 * Run: npx tsx client/src/lib/viewerLaunchHandoff.smoke.ts
 */
import {
  characterFromLaunch,
  decodeLaunchHandoff,
  defaultHotbarFromWeaponType,
  equipmentFromLaunchBags,
  hotbarFromLaunch,
  readViewerLaunchFromHash,
  weaponTypeFromLaunchBag,
  type ViewerLaunchBuild,
} from './viewerLaunchHandoff.ts';

function assert(c: boolean, m: string) {
  if (!c) throw new Error(m);
}

const HAVEN_HASH =
  '#grudge-launch=eyJ2IjoxLCJtb2RlIjoid29ybGQiLCJraXRSYWNlIjoiYmFyYmFyaWFucyIsImNsYXNzSWQiOiJ3b3JnZSIsImhhcnZlc3RNb2RlIjpmYWxzZSwiZ3J1ZGdlSWQiOiJHUkRHLThCMDVFMSIsImFjdGl2ZVByZWZhYklkIjpudWxsLCJza2lsbFN0b3JlIjp7fSwiYXR0cmlidXRlUG9pbnRzIjp7IlN0cmVuZ3RoIjo0LCJJbnRlbGxlY3QiOjAsIlZpdGFsaXR5IjozLCJEZXh0ZXJpdHkiOjAsIkVuZHVyYW5jZSI6MiwiV2lzZG9tIjowLCJBZ2lsaXR5IjozLCJUYWN0aWNzIjoxfSwid2VhcG9uQmFnSWQiOiJiYWctZ29yZWhvd2wiLCJvZmZoYW5kQmFnSWQiOm51bGwsImdlYXJCYWdJZHMiOlsiYmFnLWdvcmVob3dsIiwiYmFnLWlyb25wYXVsZHJvbiIsImJhZy1zaGFkb3d3ZWF2ZSIsImJhZy1wYWRkZWQiLCJiYWctdHJhY2tlciIsImJhZy1oYXdrcmluZyJdLCJsZXZlbCI6MjAsIndvcmxkQ2xhc3NCYXIiOlsid29yZ2UuYmVhci1mb3JtIixudWxsLG51bGwsbnVsbCxudWxsXSwic3Bhd25Db2RlIjoiR1JERzEuZXlKMklqb3hMQ0p5WVdObElqb2lZbUZ5WW1GeWFXRnVJaXdpWTJ4aGMzTWlPaUozYjNKblpTSXNJbXhsZG1Wc0lqb3lNQ3dpZDJWaGNHOXVJam9pWVhobElpd2lZV2tpT25zaVpHbG1abWxqZFd4MGVTSTZJbTFsWkdsMWJTSXNJbUpsYUdGMmFXOXlJam9pWkdWbVpXNXphWFpsSW4wc0luTjVjM1JsYlhNaU9uc2ljR0YwYUdacGJtUnBibWNpT25SeWRXVXNJbU52Ym5SeWIyeHNaWElpT25SeWRXVXNJbUZ1YVcxaGRHbHZibk1pT25SeWRXVjlmUSIsImFjdGl2ZU1hc3RlcnlUcmVlIjpudWxsLCJiYWtlZEdsYlVybCI6bnVsbH0';

const build = readViewerLaunchFromHash(HAVEN_HASH);
assert(!!build, 'decode haven_shore launch hash');
assert(build!.kitRace === 'barbarians', `kitRace ${build!.kitRace}`);
assert(build!.classId === 'worge', `classId ${build!.classId}`);
assert(build!.weaponBagId === 'bag-gorehowl', `weapon ${build!.weaponBagId}`);
assert(weaponTypeFromLaunchBag(build!.weaponBagId) === 'axe', 'gorehowl → axe');

const equip = equipmentFromLaunchBags(build!);
assert(equip.MainHand === 'bag-gorehowl', 'MainHand gorehowl');
assert(
  !!equip.Shoulder && equip.Shoulder.startsWith('bag-ironpauldron'),
  `Shoulder ${equip.Shoulder}`,
);

const hotbar = hotbarFromLaunch(build!);
assert(hotbar.weaponSkills[1] === 'axe_rending_chop', `slot1 ${hotbar.weaponSkills[1]}`);
assert(hotbar.weaponSkills[2] === 'axe_adrenaline_surge', `slot2 ${hotbar.weaponSkills[2]}`);
assert(hotbar.weaponSkills[3] === 'axe_carnage_spin', `slot3 ${hotbar.weaponSkills[3]}`);
assert(hotbar.weaponSkills[5] === 'axe_apocalypse_cleave', `slot5 ${hotbar.weaponSkills[5]}`);
assert(hotbar.classAbilities[1] === 'worge.bear-form', `class1 ${hotbar.classAbilities[1]}`);
assert(
  !Object.values(hotbar.weaponSkills).some((id) => id?.startsWith('grim_')),
  'no grimoire demo skills on gorehowl',
);

const char = characterFromLaunch(build!);
assert(char.raceId === 'barbarian', `race ${char.raceId}`);
assert(char.classId === 'worge', `class ${char.classId}`);
assert(char.level === 20, `level ${char.level}`);
assert(char.model3d?.weaponSlots?.axe === 'A', 'model3d axe slot');

const swordBar = defaultHotbarFromWeaponType('sword');
assert(swordBar.weaponSkills[1] === 'sword_vengeful_slash', `sword slot1 ${swordBar.weaponSkills[1]}`);

const encoded = HAVEN_HASH.slice('#grudge-launch='.length);
const again = decodeLaunchHandoff(encoded) as ViewerLaunchBuild;
assert(again.grudgeId === 'GRDG-8B05E1', 'grudgeId');

console.log(
  `viewer launch handoff ok · race=${char.raceId} class=${char.classId} ` +
    `weapon=${build!.weaponBagId} skills=${[1, 2, 3, 4, 5].map((s) => hotbar.weaponSkills[s]).join(',')}`,
);

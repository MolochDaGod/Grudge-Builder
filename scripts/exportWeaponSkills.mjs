/**
 * Export weapon skills from weaponSkillsNew.ts to ObjectStore JSON format.
 * Run: node scripts/exportWeaponSkills.mjs
 * Output: writes to D:\GitHub\ObjectStore\api\v1\weaponSkills.json
 */

// We can't import TS directly, so we parse the exported data structure.
// This script reads the compiled output or we inline the data.
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Compile the TS file to a temp JS file
const srcFile = path.resolve('shared/definitions/weaponSkillsNew.ts');
const tmpFile = path.resolve('scripts/_tmpWeaponSkills.mjs');

console.log('Compiling weaponSkillsNew.ts...');
execSync(`npx esbuild "${srcFile}" --bundle --format=esm --outfile="${tmpFile}" --platform=node`, { stdio: 'inherit' });

// Dynamic import the compiled module
const mod = await import('file:///' + tmpFile.replace(/\\/g, '/'));

const { WEAPON_TYPE_DEFINITIONS, CLASS_COMBAT_TREES } = mod;

// Build the output JSON
const weaponTypes = [];
let totalSkills = 0;

for (const [key, def] of Object.entries(WEAPON_TYPE_DEFINITIONS)) {
  let typeSkillCount = 0;
  const slots = def.slots.map(slot => {
    typeSkillCount += slot.skills.length;
    return {
      type: slot.type,
      label: slot.label,
      unlockTier: slot.unlockTier,
      recipeSource: slot.recipeSource || null,
      skills: slot.skills.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon,
        tier: s.tier,
        damage: s.damage,
        cooldown: s.cooldown,
        effects: s.effects,
        sourceWeaponType: s.sourceWeaponType || null,
      })),
    };
  });

  // Count form skills too
  let formSkillsList = null;
  if (def.formSkills) {
    formSkillsList = def.formSkills.map(form => {
      typeSkillCount += form.skills.length;
      return {
        formId: form.formId,
        formName: form.formName,
        formIcon: form.formIcon,
        formType: form.formType,
        description: form.description,
        skills: form.skills.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          icon: s.icon,
          tier: s.tier,
          damage: s.damage,
          cooldown: s.cooldown,
          effects: s.effects,
        })),
      };
    });
  }

  totalSkills += typeSkillCount;

  weaponTypes.push({
    id: def.id,
    name: def.name,
    icon: def.icon,
    hotbarSlots: def.hotbarSlots || 4,
    totalSkills: typeSkillCount,
    slots,
    formSkills: formSkillsList,
  });
}

// Build class combat trees
const classTrees = [];
let totalClassSkills = 0;
if (CLASS_COMBAT_TREES) {
  for (const [key, tree] of Object.entries(CLASS_COMBAT_TREES)) {
    totalClassSkills += tree.skills.length;
    classTrees.push({
      classId: tree.classId,
      className: tree.className,
      classIcon: tree.classIcon,
      description: tree.description,
      totalSkills: tree.skills.length,
      skills: tree.skills.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon,
        tier: s.tier,
        damage: s.damage,
        cooldown: s.cooldown,
        effects: s.effects,
      })),
    });
  }
}

// Class restrictions (per game design rules)
const classRestrictions = {
  Warrior: ["SWORD", "AXE", "HAMMER", "SHIELD", "TWO_HAND_SWORD", "MACE", "SPEAR", "SCYTHE"],
  Mage: ["STAFF", "WAND", "MACE", "DAGGER"],
  Ranger: ["BOW", "CROSSBOW", "GUN", "DAGGER", "TWO_HAND_SWORD", "SPEAR", "SCYTHE"],
  Worge: ["GRIMOIRE", "STAFF", "SPEAR", "DAGGER", "BOW", "HAMMER", "MACE", "SCYTHE"],
};

// Notes about non-weapon equipment
const equipmentNotes = {
  TOME: "Off-hand modifier — equipping a Tome replaces main-hand weapon slots 1-2-3 with tome-type-specific skills. Not a weapon. See tomeOverrides.ts.",
  RELIC: "Equipment trinket slot — provides passive stats, resistances, on-use actives, and proc effects. Like a WoW trinket. Not a weapon. See relicDatabase.ts.",
  CAPE: "Equipment slot with active effect and cooldown. Cape-swapping is prevented by shared cooldown across all capes.",
};

const output = {
  version: "3.0.0",
  generatedAt: new Date().toISOString(),
  totalWeaponTypes: weaponTypes.length,
  totalWeaponSkills: totalSkills,
  totalClassTreeSkills: totalClassSkills,
  totalSkills: totalSkills + totalClassSkills,
  classRestrictions,
  equipmentNotes,
  weaponTypes,
  classCombatTrees: classTrees,
};

const outPath = path.resolve('D:/GitHub/ObjectStore/api/v1/weaponSkills.json');
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\nWritten ${outPath}`);
console.log(`  ${weaponTypes.length} weapon types, ${totalSkills} weapon skills`);
console.log(`  ${classTrees.length} class trees, ${totalClassSkills} class skills`);
console.log(`  Total: ${totalSkills + totalClassSkills} skills`);

// Also write master version
const masterPath = path.resolve('D:/GitHub/ObjectStore/api/v1/master-weaponSkills.json');
writeFileSync(masterPath, JSON.stringify(output, null, 2));
console.log(`  Copied to ${masterPath}`);

// Cleanup temp file
import { unlinkSync } from 'fs';
try { unlinkSync(tmpFile); } catch {}

console.log('\nDone!');

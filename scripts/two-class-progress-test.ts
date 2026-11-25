/**
 * Two-class /progress merge test for PR #133.
 *
 * Runs warrior, then ranger, then a payload that omits warrior, through the
 * real shared/characterProgress.ts applyCharacterProgressUpdate.
 * Both class builds must survive the shallow skillLoadouts merge.
 *
 * Run from the repo root:
 *   npx tsx scripts/two-class-progress-test.ts
 *
 * This is a Node script (tsx is already a repo devDependency). It is not
 * part of `npm run test:client` (that vitest config is the Vite client only).
 */
import { applyCharacterProgressUpdate } from "../shared/characterProgress";

/** Mirror of public/grudge-fleet.js allowed-key filter + classSkillPicks clobber. */
function fleetBody(progress: Record<string, unknown>) {
  const allowed = [
    "professionLevels", "equipment", "attributes", "selectedSkills",
    "skillLoadouts", "skillPoints", "weaponSkillLevel", "weaponSkillSelections",
    "unspentAttributePoints", "equippedWeaponId", "stats", "level", "xp",
    "weaponMastery",
  ];
  const body: Record<string, unknown> = {};
  for (const k of allowed) if (progress[k] !== undefined) body[k] = progress[k];
  // Unchanged fleet behaviour: a leftover top-level classSkillPicks would
  // overwrite selectedSkills. The page at c51e no longer sends that field.
  if (progress.classSkillPicks !== undefined) {
    body.selectedSkills = progress.classSkillPicks;
  }
  return body;
}

/** Mirror of skill-tree.html syncSkillTreeToCharacter at c51e (no top-level classSkillPicks). */
function pagePayload(active: string, allPicks: Record<string, unknown>, race = "human") {
  const selectedSkills: Record<string, unknown> = {};
  const classPicks = (allPicks[active] || {}) as Record<string, unknown>;
  for (const [tier, skill] of Object.entries(classPicks)) {
    if (skill != null) selectedSkills[String(tier)] = skill;
  }
  const skillLoadouts: Record<string, unknown> = {
    _meta: { race, cls: active, characterId: "char-1" },
  };
  for (const [cid, picks] of Object.entries(allPicks)) {
    skillLoadouts[cid] = {
      picks,
      classSkillPicks: picks,
      ...(cid === active ? { race } : {}),
    };
  }
  return { selectedSkills, skillLoadouts };
}

function applyAndStore(character: any, progress: Record<string, unknown>) {
  const body = fleetBody(progress);
  const result = applyCharacterProgressUpdate(character, body as any);
  if (!result.ok) throw new Error("update failed: " + JSON.stringify(result));
  const next = { ...character, ...result.updates };
  return { result, character: next, body };
}

function hydratePicks(char: any, activeClass: string) {
  const picks: Record<string, any> = {};
  if (char.selectedSkills && typeof char.selectedSkills === "object" && activeClass) {
    picks[activeClass] = { ...(picks[activeClass] || {}) };
    for (const [tier, skill] of Object.entries(char.selectedSkills)) {
      picks[activeClass][tier] = skill;
    }
  }
  if (char.skillLoadouts && typeof char.skillLoadouts === "object") {
    for (const [cid, entry] of Object.entries(char.skillLoadouts) as any) {
      if (!entry || typeof entry !== "object") continue;
      if (cid === "_meta" || cid === "__progress") continue;
      const id = cid === "worg" ? "worge" : cid === "rogue" ? "thief" : cid;
      const p = entry.picks || entry.classSkillPicks;
      if (p && typeof p === "object") picks[id] = { ...(picks[id] || {}), ...p };
    }
  }
  return picks;
}

const warriorPicks = { "1": ["Quick Strike"], "5": ["Damage Surge"] };
const rangerPicks = { "1": ["Precision"], "5": ["Multi Shot"] };

let char: any = { id: "char-1", skillLoadouts: null, selectedSkills: null };
const fail: string[] = [];
const log: string[] = [];

// A: warrior edit
{
  const payload = pagePayload("warrior", { warrior: warriorPicks });
  const { character, body } = applyAndStore(char, payload);
  char = character;
  log.push("A after warrior " + JSON.stringify({ selectedSkills: char.selectedSkills, skillLoadouts: char.skillLoadouts }));
  if (body.classSkillPicks !== undefined) fail.push("A: top-level classSkillPicks in fleet body");
  if (JSON.stringify(body.selectedSkills) !== JSON.stringify(warriorPicks))
    fail.push("A: selectedSkills not warrior flatten: " + JSON.stringify(body.selectedSkills));
  if (!char.skillLoadouts?.warrior?.picks) fail.push("A: missing skillLoadouts.warrior.picks");
  if (!char.skillLoadouts?.warrior?.classSkillPicks) fail.push("A: missing nested classSkillPicks");
  const hydrated = hydratePicks(char, "warrior");
  if (JSON.stringify(hydrated.warrior) !== JSON.stringify(warriorPicks))
    fail.push("A hydrate warrior wrong: " + JSON.stringify(hydrated));
}

// B: ranger edit, payload includes both persisted classes
{
  const payload = pagePayload("ranger", { warrior: warriorPicks, ranger: rangerPicks });
  const { character } = applyAndStore(char, payload);
  char = character;
  log.push("B after ranger (both keys) " + JSON.stringify({ selectedSkills: char.selectedSkills, warrior: char.skillLoadouts.warrior, ranger: char.skillLoadouts.ranger }));
  if (JSON.stringify(char.selectedSkills) !== JSON.stringify(rangerPicks))
    fail.push("B: selectedSkills should be ranger only, got " + JSON.stringify(char.selectedSkills));
  if (JSON.stringify(char.skillLoadouts.warrior.picks) !== JSON.stringify(warriorPicks))
    fail.push("B: warrior loadout wiped: " + JSON.stringify(char.skillLoadouts.warrior));
  if (JSON.stringify(char.skillLoadouts.ranger.picks) !== JSON.stringify(rangerPicks))
    fail.push("B: ranger loadout missing");
  const asRanger = hydratePicks(char, "ranger");
  if (JSON.stringify(asRanger.warrior?.["1"]) !== JSON.stringify(["Quick Strike"]))
    fail.push("B hydrate did not restore warrior: " + JSON.stringify(asRanger));
  if (JSON.stringify(asRanger.ranger?.["1"]) !== JSON.stringify(["Precision"]))
    fail.push("B hydrate ranger wrong: " + JSON.stringify(asRanger));
}

// C: ranger-only payload (warrior omitted) — server shallow merge must keep warrior
{
  const payload = pagePayload("ranger", { ranger: rangerPicks });
  const { character } = applyAndStore(char, payload);
  if (JSON.stringify(character.skillLoadouts.warrior.picks) !== JSON.stringify(warriorPicks))
    fail.push("C: omitting warrior from payload wiped it: " + JSON.stringify(character.skillLoadouts.warrior));
  if (JSON.stringify(character.selectedSkills) !== JSON.stringify(rangerPicks))
    fail.push("C: selectedSkills not ranger");
  log.push("C omit-warrior still has warrior: " + JSON.stringify(character.skillLoadouts.warrior.picks));
}

if (fail.length) {
  console.log("FAIL " + fail.length);
  fail.forEach((f) => console.log(" - " + f));
  process.exit(1);
}
console.log("PASS two-class /progress: warrior then ranger then omit-warrior; both builds survive applyCharacterProgressUpdate");
log.forEach((l) => console.log(l));

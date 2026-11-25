/**
 * Publish the one class skill tree.
 *   npx tsx scripts/publish-class-skill-trees.mjs
 *
 * Writes:
 *   shared/definitions/published/class-skill-trees.json
 *   _skill-tree-assets/grudge-skill-tree/class-skill-trees.js
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exportClassSkillTreesJson } from "../shared/definitions/classSkillTrees.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const payload = exportClassSkillTreesJson();
const json = JSON.stringify(payload, null, 2) + "\n";

const published = join(root, "shared/definitions/published/class-skill-trees.json");
mkdirSync(dirname(published), { recursive: true });
writeFileSync(published, json, "utf8");

const jsBody =
  "/* Generated from shared/definitions/classSkillTrees.ts. Do not edit. */\n" +
  "window.GRUDGE_CLASS_SKILL_TREES = " +
  JSON.stringify(payload) +
  ";\n";
for (const rel of [
  "_skill-tree-assets/grudge-skill-tree/class-skill-trees.js",
  "public/class-skill-trees.js",
]) {
  const js = join(root, rel);
  mkdirSync(dirname(js), { recursive: true });
  writeFileSync(js, jsBody, "utf8");
}

const ids = Object.keys(payload.classes);
console.log(`classes=${ids.join(",")} → ${published}`);

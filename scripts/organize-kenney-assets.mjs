/**
 * organize-kenney-assets.mjs
 *
 * Reads 4 extracted Kenney packs from D:\kenney-assets\, renames every file to
 * descriptive kebab-case, copies into an organized folder tree at
 * D:\kenney-assets\organized\, and writes kenney-manifest.json.
 *
 * Usage:  node scripts/organize-kenney-assets.mjs
 */

import fs from "node:fs";
import path from "node:path";

const SRC = "D:/kenney-assets";
const OUT = "D:/kenney-assets/organized";
const CDN = "https://assets.grudge-studio.com";

// ── helpers ──────────────────────────────────────────────────────────

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** camelCase / PascalCase / snake_case → kebab-case */
function toKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2") // camelCase split
    .replace(/[_\s]+/g, "-")                  // underscores / spaces
    .replace(/'/g, "")                        // apostrophes (it's → its)
    .replace(/-+/g, "-")                      // collapse dashes
    .toLowerCase();
}

/** Zero-pad variant numbers: 000 → 01, 004 → 05  (1-indexed, 2-digit) */
function fixVariantNum(name) {
  return name.replace(/(\d{3})$/, (_m, d) => String(Number(d) + 1).padStart(2, "0"));
}

function copyFile(src, destDir, destName) {
  ensureDir(destDir);
  const dest = path.join(destDir, destName);
  fs.copyFileSync(src, dest);
  return dest;
}

// ── manifest accumulator ─────────────────────────────────────────────

const manifest = {
  generatedAt: new Date().toISOString(),
  cdnBase: CDN,
  categories: {},
};

let totalFiles = 0;

function record(category, subcat, originalFile, r2Key) {
  if (!manifest.categories[category]) manifest.categories[category] = {};
  if (!manifest.categories[category][subcat]) manifest.categories[category][subcat] = [];
  manifest.categories[category][subcat].push({
    file: path.basename(r2Key),
    r2Key,
    cdnUrl: `${CDN}/${r2Key}`,
    original: originalFile,
  });
  totalFiles++;
}

// =====================================================================
// 1.  IMPACT SOUNDS
// =====================================================================

function organizeImpacts() {
  const src = path.join(SRC, "impact-sounds/Audio");
  if (!fs.existsSync(src)) return;
  const files = fs.readdirSync(src).filter((f) => f.endsWith(".ogg"));

  for (const f of files) {
    // Parse original names like: impactMetal_heavy_003.ogg, footstep_grass_001.ogg
    let subcat, newName;

    if (f.startsWith("footstep_")) {
      // footstep_grass_001.ogg → footsteps/footstep-grass-02.ogg
      subcat = "footsteps";
      newName = fixVariantNum(toKebab(f.replace(".ogg", ""))) + ".ogg";
    } else if (f.startsWith("impactMining")) {
      subcat = "mining";
      newName = fixVariantNum(toKebab(f.replace("impact", "").replace(".ogg", ""))) + ".ogg";
    } else if (f.startsWith("impact")) {
      // impactPunch_heavy_002.ogg → punch/punch-heavy-03.ogg
      const body = f.replace("impact", "").replace(".ogg", "");
      // First word = material (Glass, Metal, Punch, etc.)
      const match = body.match(/^([A-Z][a-z]+)(.*)/);
      if (match) {
        subcat = match[1].toLowerCase();
        const rest = match[2]; // _heavy_002
        newName = fixVariantNum(toKebab(subcat + rest)) + ".ogg";
      } else {
        subcat = "generic";
        newName = fixVariantNum(toKebab(body)) + ".ogg";
      }
    } else {
      subcat = "other";
      newName = toKebab(f);
    }

    const r2Key = `audio/kenney/impacts/${subcat}/${newName}`;
    copyFile(path.join(src, f), path.join(OUT, `audio/kenney/impacts/${subcat}`), newName);
    record("impacts", subcat, f, r2Key);
  }
}

// =====================================================================
// 2.  RPG AUDIO
// =====================================================================

function organizeRpg() {
  const src = path.join(SRC, "rpg-audio/Audio");
  if (!fs.existsSync(src)) return;
  const files = fs.readdirSync(src).filter((f) => f.endsWith(".ogg"));

  // Classification map
  const classify = (f) => {
    const n = f.toLowerCase();
    if (n.startsWith("belt") || n.startsWith("cloth") || n.startsWith("drop") || n.startsWith("handle"))
      return "inventory";
    if (n.startsWith("book")) return "books";
    if (n.startsWith("door") || n.startsWith("creak")) return "doors";
    if (n.startsWith("knife") || n.startsWith("draw") || n.startsWith("chop")) return "weapons";
    if (n.startsWith("footstep")) return "footsteps";
    if (n.startsWith("metal")) return "metal";
    return "misc";
  };

  for (const f of files) {
    const subcat = classify(f);
    const newName = fixVariantNum(toKebab(f.replace(".ogg", ""))) + ".ogg";
    const r2Key = `audio/kenney/rpg/${subcat}/${newName}`;
    copyFile(path.join(src, f), path.join(OUT, `audio/kenney/rpg/${subcat}`), newName);
    record("rpg", subcat, f, r2Key);
  }
}

// =====================================================================
// 3.  VOICEOVER FIGHTER
// =====================================================================

function organizeVoiceover() {
  const src = path.join(SRC, "voiceover-fighter/Audio");
  if (!fs.existsSync(src)) return;
  const files = fs.readdirSync(src).filter((f) => f.endsWith(".ogg"));

  const rounds = new Set(["round_1", "round_2", "round_3", "round_4", "round_5", "final_round"]);
  const results = new Set([
    "winner", "loser", "you_win", "you_lose", "tie", "it's_a_tie",
    "flawless_victory", "combo", "combo_breaker", "multi_kill",
    "kill_her", "kill_him", "kill_it",
  ]);
  const modes = new Set([
    "arcade_mode", "battle_mode", "championship_mode",
    "story_mode", "survival_mode", "deathmatch",
  ]);
  const numbers = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);

  for (const f of files) {
    const stem = f.replace(".ogg", "");
    let subcat;
    if (rounds.has(stem)) subcat = "rounds";
    else if (results.has(stem)) subcat = "results";
    else if (modes.has(stem)) subcat = "modes";
    else if (numbers.has(stem)) subcat = "numbers";
    else subcat = "announcer";

    const newName = toKebab(stem) + ".ogg";
    const r2Key = `audio/kenney/voiceover/${subcat}/${newName}`;
    copyFile(path.join(src, f), path.join(OUT, `audio/kenney/voiceover/${subcat}`), newName);
    record("voiceover", subcat, f, r2Key);
  }
}

// =====================================================================
// 4.  CURSORS
// =====================================================================

function organizeCursors() {
  const base = path.join(SRC, "cursor-pack/PNG");
  if (!fs.existsSync(base)) return;

  const variants = [
    { dir: "Basic/Default", out: "basic" },
    { dir: "Basic/Double", out: "basic-2x" },
    { dir: "Outline/Default", out: "outline" },
    { dir: "Outline/Double", out: "outline-2x" },
  ];

  for (const v of variants) {
    const src = path.join(base, v.dir);
    if (!fs.existsSync(src)) continue;
    const files = fs.readdirSync(src).filter((f) => f.endsWith(".png"));
    for (const f of files) {
      const newName = toKebab(f.replace(".png", "")) + ".png";
      const r2Key = `cursors/kenney/${v.out}/${newName}`;
      copyFile(path.join(src, f), path.join(OUT, `cursors/kenney/${v.out}`), newName);
      record("cursors", v.out, f, r2Key);
    }
  }

  // SVGs — Basic only (vector folder has one set)
  const svgBasic = path.join(SRC, "cursor-pack/Vector/Basic");
  if (fs.existsSync(svgBasic)) {
    const files = fs.readdirSync(svgBasic).filter((f) => f.endsWith(".svg"));
    for (const f of files) {
      const newName = toKebab(f.replace(".svg", "")) + ".svg";
      const r2Key = `cursors/kenney/vector/${newName}`;
      copyFile(path.join(svgBasic, f), path.join(OUT, "cursors/kenney/vector"), newName);
      record("cursors", "vector", f, r2Key);
    }
  }

  const svgOutline = path.join(SRC, "cursor-pack/Vector/Outline");
  if (fs.existsSync(svgOutline)) {
    const files = fs.readdirSync(svgOutline).filter((f) => f.endsWith(".svg"));
    for (const f of files) {
      const newName = toKebab(f.replace(".svg", "")) + ".svg";
      const r2Key = `cursors/kenney/vector-outline/${newName}`;
      copyFile(path.join(svgOutline, f), path.join(OUT, "cursors/kenney/vector-outline"), newName);
      record("cursors", "vector-outline", f, r2Key);
    }
  }
}

// =====================================================================
// RUN
// =====================================================================

console.log("Organizing Kenney assets...");
ensureDir(OUT);

organizeImpacts();
console.log("  ✓ Impact sounds organized");

organizeRpg();
console.log("  ✓ RPG audio organized");

organizeVoiceover();
console.log("  ✓ Voiceover fighter organized");

organizeCursors();
console.log("  ✓ Cursors organized");

// Write manifest
const manifestPath = path.join(OUT, "kenney-manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

// Summary
const catSummary = Object.entries(manifest.categories).map(
  ([cat, subs]) => `  ${cat}: ${Object.values(subs).reduce((n, a) => n + a.length, 0)} files`
).join("\n");

console.log(`\nDone! ${totalFiles} files organized into ${OUT}`);
console.log(catSummary);
console.log(`Manifest: ${manifestPath}`);

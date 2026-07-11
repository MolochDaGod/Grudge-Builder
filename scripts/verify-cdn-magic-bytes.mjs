#!/usr/bin/env node
/**
 * verify-cdn-magic-bytes.mjs
 *
 * Production gate: fetch seeded CDN keys and assert real binary magic bytes
 * (reject HTML fake-200 from R2/CDN misconfig).
 *
 * Usage:
 *   node scripts/verify-cdn-magic-bytes.mjs
 *   node scripts/verify-cdn-magic-bytes.mjs --strict   # exit 1 on any fail
 *   CDN=https://assets.grudge-studio.com node scripts/verify-cdn-magic-bytes.mjs
 */

const CDN = (process.env.CDN || process.env.VITE_ASSETS_URL || "https://assets.grudge-studio.com").replace(
  /\/$/,
  "",
);
const STRICT = process.argv.includes("--strict");

/** Keys from seed-warlords-d1 + grudge6 textures (must stay real). */
const KEYS = [
  "models/grudge6/races/WK_Characters.fbx",
  "models/grudge6/races/BRB_Characters.fbx",
  "models/grudge6/races/DWF_Characters.fbx",
  "models/grudge6/races/ELF_Characters.fbx",
  "models/grudge6/races/ORC_Characters.fbx",
  "models/grudge6/races/UD_Characters.fbx",
  "textures/grudge6/western-kingdoms/WK_Standard_Units.webp",
  "textures/grudge6/barbarians/BRB_StandardUnits_texture.webp",
  "textures/grudge6/dwarves/DWF_Standard_Units.webp",
  "textures/grudge6/elves/ELF_HighElves_Texture.webp",
  "textures/grudge6/orcs/ORC_StandardUnits.webp",
  "textures/grudge6/undead/UD_Standard_Units.webp",
  "models/nature/stylized/biome/nature_vegetation.glb",
  "models/nature/stylized/biome/tropical_plants.glb",
  "models/nature/stylized/biome/realistic_trees.glb",
  "models/nature/stylized/rocks/stylised_rocks.glb",
  "models/nature/stylized/harvest/ore_nodes.glb",
  "models/nature/stylized/harvest/minerals_pack.glb",
  "models/nature/stylized/harvest/flowers_pack.glb",
  "models/nature/stylized/harvest/foliage_pack.glb",
  "models/nature/stylized/concept/example_home_island.glb",
  "models/survival/free_survival_asset_kit.glb",
  "models/environment/note-of-arms/note_of_arms_v2.glb",
  "models/fauna/farm/Llama.fbx",
  "models/fauna/farm/Pig.fbx",
  "models/fauna/farm/Sheep.fbx",
];

function kindOf(key) {
  const l = key.toLowerCase();
  if (l.endsWith(".glb")) return "glb";
  if (l.endsWith(".fbx")) return "fbx";
  if (l.endsWith(".webp")) return "webp";
  if (l.endsWith(".png")) return "png";
  return "unknown";
}

function checkMagic(buf, kind) {
  if (!buf || buf.length < 12) return { ok: false, reason: "too short" };
  const head = Buffer.from(buf.slice(0, 64)).toString("utf8");
  if (head.includes("<!DOCTYPE") || head.includes("<html") || head.includes("<HTML")) {
    return { ok: false, reason: "HTML fake-200" };
  }
  if (kind === "glb") {
    // glTF binary magic "glTF"
    if (buf[0] === 0x67 && buf[1] === 0x6c && buf[2] === 0x54 && buf[3] === 0x46) {
      return { ok: true };
    }
    return { ok: false, reason: "not glTF binary" };
  }
  if (kind === "fbx") {
    if (head.startsWith("Kaydara FBX Binary") || head.includes("Kaydara")) return { ok: true };
    // some binary FBX without ascii header — accept non-HTML + size
    if (buf.length > 1024) return { ok: true, reason: "binary-ish FBX" };
    return { ok: false, reason: "not FBX" };
  }
  if (kind === "webp") {
    // RIFF....WEBP
    if (
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    ) {
      return { ok: true };
    }
    return { ok: false, reason: "not WEBP" };
  }
  if (kind === "png") {
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ok: true };
    return { ok: false, reason: "not PNG" };
  }
  return { ok: true, reason: "unchecked kind" };
}

async function probe(key) {
  const url = `${CDN}/${key}`;
  const kind = kindOf(key);
  try {
    const res = await fetch(url, {
      headers: { Range: "bytes=0-255" },
    });
    if (!res.ok) return { key, url, ok: false, reason: `HTTP ${res.status}` };
    const ab = await res.arrayBuffer();
    const buf = new Uint8Array(ab);
    const magic = checkMagic(buf, kind);
    const len = res.headers.get("content-length") || res.headers.get("content-range") || "?";
    return {
      key,
      url,
      ok: magic.ok,
      reason: magic.reason || "ok",
      kind,
      bytes: buf.length,
      contentLength: len,
      contentType: res.headers.get("content-type") || "",
    };
  } catch (e) {
    return { key, url, ok: false, reason: e.message || String(e), kind };
  }
}

async function main() {
  console.log(`CDN magic-byte verify — ${KEYS.length} keys @ ${CDN}\n`);
  let ok = 0;
  let fail = 0;
  for (const key of KEYS) {
    const r = await probe(key);
    if (r.ok) {
      ok++;
      console.log(`OK   ${r.kind.padEnd(5)} ${key}`);
    } else {
      fail++;
      console.log(`FAIL ${r.kind?.padEnd(5) || "?"} ${key} — ${r.reason}`);
    }
  }
  console.log(`\n${ok} ok · ${fail} fail`);
  if (STRICT && fail > 0) process.exit(1);
  if (fail > 0 && !STRICT) process.exitCode = 0; // report but don't block default CI soft mode
  // Soft default: exit 1 only if majority fail (CDN outage)
  if (fail > KEYS.length / 2) process.exit(1);
}

main();

#!/usr/bin/env node
/**
 * Convert Ultimate Fantasy RTS FBX pack → staged GLB (+ keep FBX).
 *
 * Source: Documents/Ultimate Fantasy RTS.../FBX
 * Dest:   client/public/models/warlords/rts/{mines,mountains,buildings,resources,props}/
 *
 *   node scripts/convert-ultimate-fantasy-rts.mjs
 *   node scripts/convert-ultimate-fantasy-rts.mjs --priority   # mine + mountains + L1 buildings
 *   node scripts/convert-ultimate-fantasy-rts.mjs --upload
 *
 * Prefers ObjectStore grudge-convert (fbx2gltf). Falls back to FBX stage-only.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const SRC =
  process.env.UFRTS_FBX_DIR ||
  path.join(
    process.env.USERPROFILE || "",
    "Documents",
    "Ultimate Fantasy RTS - Aug 2022-20260503T235302Z-3-001",
    "Ultimate Fantasy RTS - Aug 2022",
    "FBX",
  );
const DST = path.join(root, "client", "public", "models", "warlords", "rts");
const OBJECT_STORE = path.join(root, "..", "ObjectStore");
const PRIORITY = process.argv.includes("--priority");
const UPLOAD = process.argv.includes("--upload");
const FORCE = process.argv.includes("--force");

const PRIORITY_STEMS = new Set([
  "Mine",
  "Mountain_Group_1",
  "Mountain_Group_2",
  "Mountain_Single",
  "MountainLarge_Single",
  "Barracks_FirstAge_Level1",
  "Archery_FirstAge_Level1",
  "Farm_FirstAge_Level1",
  "Temple_FirstAge_Level1",
  "TownCenter_FirstAge_Level1",
  "Market_FirstAge_Level1",
  "Storage_FirstAge_Level1",
  "Dock_FirstAge",
  "Port_FirstAge_Level1",
  "WatchTower_FirstAge_Level1",
  "Wall_FirstAge",
  "Houses_FirstAge_1_Level1",
  "Windmill_FirstAge",
  "Resource_Tree1",
  "Resource_Rock_1",
  "Resource_node_1",
]);

function folderFor(stem) {
  if (stem === "Mine") return "mines";
  if (stem.startsWith("Mountain")) return "mountains";
  if (
    stem.startsWith("Resource_") ||
    stem === "Rock" ||
    stem === "Rock_Group"
  ) {
    return "resources";
  }
  if (/^(Barrel|Crate|Logs)/.test(stem)) return "props";
  return "buildings";
}

function heightFor(stem) {
  if (stem === "Mine") return 5.5;
  if (stem.startsWith("MountainLarge")) return 40;
  if (stem.startsWith("Mountain")) return 30;
  if (stem.startsWith("TownCenter")) return 12;
  if (stem.startsWith("Wonder")) return 18;
  if (stem.startsWith("Barracks") || stem.startsWith("Archery")) return 8;
  if (stem.startsWith("Temple")) return 10;
  if (stem.startsWith("WatchTower") || stem.startsWith("TowerHouse")) return 10;
  if (stem.startsWith("Windmill")) return 12;
  if (stem.startsWith("Wall")) return 4.5;
  if (stem.startsWith("Farm") || stem.startsWith("Dock")) return 3;
  if (stem.startsWith("Resource_Tree") || stem.includes("Pine")) return 8;
  if (stem.includes("Rock") || stem.includes("node")) return 2;
  return 6;
}

function ensureDirs() {
  for (const f of ["mines", "mountains", "buildings", "resources", "props"]) {
    fs.mkdirSync(path.join(DST, f), { recursive: true });
  }
}

function copyFbx(stem, srcFile) {
  const folder = folderFor(stem);
  const dest = path.join(DST, folder, `${stem}.fbx`);
  fs.copyFileSync(srcFile, dest);
  return dest;
}

function tryConvert(stem, fbxPath) {
  const folder = folderFor(stem);
  const outGlb = path.join(DST, folder, `${stem}.glb`);
  if (fs.existsSync(outGlb) && !FORCE) {
    console.log(`skip (exists) ${stem}.glb`);
    return true;
  }

  const height = heightFor(stem);
  // Call grudge-convert binary directly (no shell) so paths with spaces stay intact
  const convertBin = path.join(
    OBJECT_STORE,
    "tools",
    "grudge-convert",
    "bin",
    "grudge-convert.mjs",
  );
  if (fs.existsSync(convertBin)) {
    const r = spawnSync(
      process.execPath,
      [
        convertBin,
        "fbx2gltf",
        fbxPath,
        "-o",
        outGlb,
        "--height",
        String(height),
        "--cm-to-m",
        "--texture-size",
        "1024",
      ],
      {
        cwd: OBJECT_STORE,
        shell: false,
        stdio: "inherit",
        env: {
          ...process.env,
          BLENDER_PATH:
            process.env.BLENDER_PATH ||
            "C:\\Users\\nugye\\tools\\Blender\\blender.exe",
        },
        timeout: 180000,
      },
    );
    if (r.status === 0 && fs.existsSync(outGlb)) {
      console.log(`✓ GLB ${stem}`);
      return true;
    }
  }

  // FBX2glTF binary (bundled with grudge-convert)
  const fbx2exe = path.join(
    OBJECT_STORE,
    "tools",
    "grudge-convert",
    "node_modules",
    "fbx2gltf",
    "bin",
    "Windows_NT",
    "FBX2glTF.exe",
  );
  if (fs.existsSync(fbx2exe)) {
    const outBase = outGlb.replace(/\.glb$/i, "");
    const fbx2 = spawnSync(
      fbx2exe,
      ["-i", fbxPath, "-o", outBase, "-b"],
      { shell: false, encoding: "utf8", timeout: 120000 },
    );
    // FBX2glTF may write .glb next to -o base
    const produced =
      fs.existsSync(outGlb) ||
      fs.existsSync(`${outBase}.glb`) ||
      fs.existsSync(`${outBase}_out.glb`);
    if (fbx2.status === 0 && produced) {
      if (!fs.existsSync(outGlb)) {
        const alt = fs.existsSync(`${outBase}.glb`)
          ? `${outBase}.glb`
          : `${outBase}_out.glb`;
        if (fs.existsSync(alt)) fs.renameSync(alt, outGlb);
      }
      if (fs.existsSync(outGlb)) {
        console.log(`✓ FBX2glTF ${stem}`);
        return true;
      }
    }
  }

  console.warn(`⚠ FBX staged only (no convert): ${stem}`);
  return false;
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error("Source FBX dir missing:", SRC);
    process.exit(1);
  }
  ensureDirs();
  const files = fs.readdirSync(SRC).filter((f) => /\.fbx$/i.test(f));
  let converted = 0;
  let staged = 0;

  for (const file of files) {
    const stem = path.basename(file, path.extname(file));
    if (PRIORITY && !PRIORITY_STEMS.has(stem)) continue;
    const srcFile = path.join(SRC, file);
    copyFbx(stem, srcFile);
    staged++;
    if (tryConvert(stem, srcFile)) converted++;
  }

  console.log(`\nStaged FBX: ${staged}, converted GLB: ${converted}`);
  console.log(`Out: ${DST}`);

  if (UPLOAD) {
    const up = spawnSync("node", ["scripts/upload-warlords-assets.mjs"], {
      cwd: root,
      shell: true,
      stdio: "inherit",
    });
    process.exit(up.status ?? 1);
  }
}

main();

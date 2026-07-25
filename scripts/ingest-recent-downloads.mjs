#!/usr/bin/env node
/**
 * Ingest last-N-hours downloads into layered Warlords asset staging.
 *
 * Layers (fleet SSOT):
 *   equipment/weapons | equipment/tools | equipment/bags | anims/combat
 *   harvest/* | nature/* | buildings/* | ships/* | terrain/* | maps/*
 *   gameflow/* | creatures/* | props/* | multipacks/*
 *
 * Multi-mesh GLBs get a .meshes.json sibling (meshName isolation list).
 * Does NOT invent D1 rows — writes local registry for upload-session + ObjectStore.
 *
 *   node scripts/ingest-recent-downloads.mjs
 *   node scripts/ingest-recent-downloads.mjs --hours 6 --inspect-multipack
 */
import { createReadStream, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const hours = Number(process.argv.find((a, i, arr) => arr[i - 1] === "--hours") ?? 3);
const inspectMp = process.argv.includes("--inspect-multipack");
const cutoff = Date.now() - hours * 3600 * 1000;

const SCAN_ROOTS = [
  join(process.env.USERPROFILE || "", "Documents"),
  join(process.env.USERPROFILE || "", "Downloads"),
  "D:\\Games\\Models",
];

const EXTS = new Set([".glb", ".gltf", ".fbx", ".zip", ".rar", ".7z"]);

/** Layer taxonomy + path under client/public/models/warlords/intake/ */
const RULES = [
  { layer: "anims/combat", re: /sworattack|sword.?attack|samurai|combo|retarget|anim/i, tags: ["animation", "combat", "2h_sword"] },
  { layer: "equipment/weapons", re: /sword|spear|axe|mace|hammer|staff|javelin|shuriken|chakram|blade|greatsword|falchion|saber|dagger|knife|scythe|glaive|polearm|hook.?sword|oathkeeper|felbound|dragonbone|electric.?melee|melee|weapon(?!vendor)|grenade|gun|turret|nordique|faux|scifi/i, tags: ["equipment", "weapon"] },
  { layer: "equipment/tools", re: /tool|pickaxe|hatchet|scythe|blacksmith|workshop.?tool|survival.?tool/i, tags: ["equipment", "tool", "harvest"] },
  { layer: "equipment/bags", re: /bag|backpack|satchel|adventure.?bag/i, tags: ["equipment", "bag"] },
  { layer: "harvest/gems", re: /gem|crystal|bejeweled|ruby|emerald|diamond|ore|mineral|orbs|shard|valkyrie/i, tags: ["harvest", "mining"] },
  { layer: "harvest/crops", re: /crop|farm|hay|harvestmount/i, tags: ["harvest", "farming"] },
  { layer: "harvest/food", re: /stew|cook|pot|food|drink|merchant.?bazar/i, tags: ["harvest", "prop"] },
  { layer: "nature/rocks", re: /rock|mountain|crater|haytor|biggerrock|evil.?rock|stylized.?rock/i, tags: ["nature", "rock", "terrain"] },
  { layer: "nature/scene", re: /nature.?scene|box.?stylized/i, tags: ["nature", "scatter"] },
  { layer: "islands/shells", re: /island|isle|isla_|aogashima|snake.?isle|squid.?game.?island|baselowpoly|mystical.?island|falcias/i, tags: ["island", "section", "shell"] },
  { layer: "terrain/heightfield", re: /terrain|hill|big.?terrain|death.?valley|mars|olympus|blender.?procedural|landscape/i, tags: ["terrain", "heightfield"] },
  { layer: "buildings/houses", re: /house|home|cabin|quarters|desk|wardrobe|grandma|outpost|market.?stall/i, tags: ["building", "interior"] },
  { layer: "buildings/fortress", re: /fortress|castle|ruins|vault|tower|kitbash|siberian|welcoming.?sign|temple/i, tags: ["building", "fortress", "map"] },
  { layer: "buildings/vendor", re: /weaponvendor|vendor|merchant|shop/i, tags: ["building", "npc", "gameflow"] },
  { layer: "ships/pirate", re: /pirate|ship|siren|cartoonic.?pirate|3pirate|captain|kraken/i, tags: ["ship", "lobby", "gameflow"] },
  { layer: "terrain/desert", re: /desert|egypt|sandy.?castle|egyptian/i, tags: ["terrain", "biome", "ashen"] },
  { layer: "terrain/water", re: /river|bhop.?river|fruzer/i, tags: ["terrain", "water"] },
  { layer: "maps/city", re: /city|oxenfurt|witcher|crusademain|town|village|gaea/i, tags: ["map", "sector"] },
  { layer: "maps/dungeon", re: /dangerroom|underground|dungeon|cemetery|halloween|trashpile|horror|phaaze|leviathan|phazon|invasion/i, tags: ["map", "dungeon", "gameflow"] },
  { layer: "creatures/hero", re: /stylized.?hero|ds_-_stylized|grappling.?hook|mask|crown|climb|hero/i, tags: ["creature", "hero_prop"] },
  { layer: "creatures/wildlife", re: /creature|snake|kraken/i, tags: ["creature", "wildlife"] },
  { layer: "props/misc", re: /book|target|contraption|meteor|sign|stew|box/i, tags: ["prop"] },
  { layer: "multipacks/weapons", re: /weapons|weapon.?pack|twinblade|tf2.?stock|lowpoly.?melee|steampunk.?grenade|electric.?melee|dragonbone.?weapon/i, tags: ["multipack", "weapon"] },
  { layer: "multipacks/environment", re: /environment.?pack|props.?pack|pack|kit|polygons.?total/i, tags: ["multipack", "environment"] },
];

function classify(name) {
  const n = name.replace(/[_\-]+/g, " ");
  for (const r of RULES) {
    if (r.re.test(n) || r.re.test(name)) return r;
  }
  return { layer: "unsorted", re: null, tags: ["unsorted"] };
}

function slug(name) {
  return name
    .replace(extname(name), "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}

function scanFiles() {
  const hits = [];
  for (const dir of SCAN_ROOTS) {
    if (!existsSync(dir)) continue;
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      const ext = extname(ent.name).toLowerCase();
      if (!EXTS.has(ext)) continue;
      const full = join(dir, ent.name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      const t = Math.max(st.mtimeMs, st.birthtimeMs || 0);
      if (t < cutoff) continue;
      hits.push({
        path: full,
        name: ent.name,
        ext,
        bytes: st.size,
        mtime: new Date(st.mtimeMs).toISOString(),
      });
    }
  }
  return hits.sort((a, b) => b.bytes - a.bytes);
}

async function listGlbMeshes(filePath) {
  // Prefer @gltf-transform/core if present; else three GLTFLoader
  try {
    const { NodeIO } = await import("@gltf-transform/core");
    const io = new NodeIO();
    const doc = await io.read(filePath);
    const root = doc.getRoot();
    const meshes = root.listMeshes().map((m, i) => ({
      index: i,
      name: m.getName() || `mesh_${i}`,
      primitives: m.listPrimitives().length,
    }));
    const nodes = root.listNodes().map((n, i) => ({
      index: i,
      name: n.getName() || `node_${i}`,
      mesh: n.getMesh()?.getName() || null,
    }));
    const anims = root.listAnimations().map((a) => a.getName() || "anim");
    return { engine: "gltf-transform", meshes, nodes, animations: anims };
  } catch {
    /* fall through */
  }
  try {
    const THREE = require("three");
    const { GLTFLoader } = require("three/examples/jsm/loaders/GLTFLoader.js");
    // Node path: use fs + FileLoader is browser — skip heavy three parse without polyfills
    return { engine: "none", meshes: [], nodes: [], animations: [], note: "install @gltf-transform/core for mesh isolation" };
  } catch {
    return { engine: "none", meshes: [], nodes: [], animations: [] };
  }
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

async function main() {
  const hits = scanFiles();
  const outRoot = join(root, "client/public/models/warlords/intake");
  const stagingRoot = join(root, "staging/ingest");
  ensureDir(outRoot);
  ensureDir(stagingRoot);

  const registry = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    hours,
    cutoff: new Date(cutoff).toISOString(),
    totalFiles: hits.length,
    totalBytes: hits.reduce((s, h) => s + h.bytes, 0),
    layers: {},
    assets: [],
    multipacks: [],
    pipeline: {
      next: [
        "glb2glb bake large multipacks (ObjectStore grudge-convert)",
        "wrangler r2 put grudge-assets/models/warlords/intake/... --remote",
        "seed D1 asset_registry rows from this registry",
        "wire multipack meshName isolation in loaders",
      ],
    },
  };

  for (const h of hits) {
    const cls = classify(h.name);
    const id = slug(h.name);
    const layerDir = join(outRoot, cls.layer);
    ensureDir(layerDir);
    const destName = `${id}${h.ext}`;
    const dest = join(layerDir, destName);
    const relPublic = `/models/warlords/intake/${cls.layer}/${destName}`.replace(/\\/g, "/");
    const cdnKey = `models/warlords/intake/${cls.layer}/${destName}`.replace(/\\/g, "/");

    try {
      if (!existsSync(dest) || statSync(dest).size !== h.bytes) {
        copyFileSync(h.path, dest);
      }
    } catch (e) {
      console.warn("[skip copy]", h.name, e.message);
      continue;
    }

    const entry = {
      id,
      sourcePath: h.path,
      name: h.name,
      layer: cls.layer,
      tags: cls.tags,
      bytes: h.bytes,
      mb: +(h.bytes / 1e6).toFixed(2),
      localPath: relPublic,
      cdnKey,
      cdnUrl: `https://assets.grudge-studio.com/${cdnKey}`,
      mtime: h.mtime,
      multipack: false,
      meshIsolation: null,
      animations: [],
    };

    // Heuristic multipack: large GLB or name contains pack/set/weapons/environment
    const looksMulti =
      h.ext === ".glb" &&
      (h.bytes > 8_000_000 ||
        /pack|set|kit|weapons|environment|props|melee|grenade|dragonbone|electric/i.test(h.name));

    if (looksMulti && h.ext === ".glb" && inspectMp) {
      try {
        const iso = await listGlbMeshes(dest);
        entry.multipack = (iso.meshes?.length || 0) > 1 || (iso.nodes?.length || 0) > 3;
        entry.meshIsolation = iso;
        entry.animations = iso.animations || [];
        if (entry.multipack) {
          const meshJson = join(layerDir, `${id}.meshes.json`);
          writeFileSync(meshJson, JSON.stringify(iso, null, 2));
          registry.multipacks.push({
            id,
            meshCount: iso.meshes?.length || 0,
            nodeCount: iso.nodes?.length || 0,
            animCount: iso.animations?.length || 0,
            meshesJson: relPublic.replace(/\.glb$/, ".meshes.json"),
          });
        }
      } catch (e) {
        entry.meshIsolation = { error: String(e.message || e) };
      }
    } else if (looksMulti) {
      entry.multipack = true;
      entry.meshIsolation = { deferred: true, hint: "re-run with --inspect-multipack" };
      registry.multipacks.push({ id, deferred: true });
    }

    // Samurai anim pack special-case
    if (/sworattackssamurai/i.test(h.name)) {
      entry.tags = [...new Set([...entry.tags, "retarget_source", "2h_sword", "samurai", "bip001_target"])];
      entry.combatMap = {
        sourceGlb: relPublic,
        targetSkeleton: "bip001",
        weaponPack: "greatsword",
        slots: {
          1: {
            role: "normal_attack_combo",
            clips: ["2combo_1", "3combo_2"],
            note: "Two-hit combo LMB / focus primary",
          },
          2: {
            role: "teleport_strike",
            clips: ["4combo"],
            note: "Standalone skill + teleport",
            vfx: "cast_from_sword_shield_magic_pack",
          },
          3: {
            role: "opener_slash_dash",
            clips: ["attack1"],
            note: "2H sword opener slashing dash",
          },
          4: {
            role: "flaming_fissure",
            clips: ["/* use sword_shield cast / magic_cast */"],
            skill: "gs_flaming_fissure",
            note: "Cast anim from sword pack; ground fissure VFX toward enemy",
          },
        },
      };
    }

    registry.assets.push(entry);
    registry.layers[cls.layer] = (registry.layers[cls.layer] || 0) + 1;
  }

  // Layer index files for loaders
  const byLayer = {};
  for (const a of registry.assets) {
    (byLayer[a.layer] ||= []).push(a);
  }
  for (const [layer, assets] of Object.entries(byLayer)) {
    const layerDir = join(outRoot, layer);
    ensureDir(layerDir);
    writeFileSync(
      join(layerDir, "_layer.json"),
      JSON.stringify(
        {
          layer,
          count: assets.length,
          assets: assets.map((a) => ({
            id: a.id,
            localPath: a.localPath,
            cdnKey: a.cdnKey,
            tags: a.tags,
            multipack: a.multipack,
            mb: a.mb,
          })),
        },
        null,
        2,
      ),
    );
  }

  // D1-shaped registry rows (for seed script)
  const d1Rows = registry.assets.map((a) => ({
    id: `ingest_${a.id}`,
    name: a.name,
    category: a.layer.split("/")[0],
    subcategory: a.layer.split("/")[1] || "general",
    r2Key: a.cdnKey,
    cdnUrl: a.cdnUrl,
    tags: a.tags.join(","),
    multipack: a.multipack ? 1 : 0,
    bytes: a.bytes,
    source: "documents_ingest_3h",
    status: "staged_local",
  }));

  const regPath = join(stagingRoot, `registry-${hours}h.json`);
  const d1Path = join(stagingRoot, `d1-rows-${hours}h.json`);
  const layerSumPath = join(outRoot, "_INGEST_SUMMARY.json");

  writeFileSync(regPath, JSON.stringify(registry, null, 2));
  writeFileSync(d1Path, JSON.stringify(d1Rows, null, 2));
  writeFileSync(
    layerSumPath,
    JSON.stringify(
      {
        generatedAt: registry.generatedAt,
        hours,
        totalFiles: registry.totalFiles,
        totalMB: +(registry.totalBytes / 1e6).toFixed(1),
        layers: registry.layers,
        multipackCount: registry.multipacks.length,
        registryPath: relative(root, regPath).replace(/\\/g, "/"),
        d1RowsPath: relative(root, d1Path).replace(/\\/g, "/"),
        publicRoot: "/models/warlords/intake/",
      },
      null,
      2,
    ),
  );

  // Human markdown catalog
  const md = [];
  md.push(`# Ingest catalog (${hours}h)`);
  md.push("");
  md.push(`Generated: ${registry.generatedAt}`);
  md.push(`Files: **${registry.totalFiles}** · **${(registry.totalBytes / 1e6).toFixed(1)} MB**`);
  md.push("");
  md.push("## Layers");
  md.push("");
  md.push("| Layer | Count | Role |");
  md.push("|-------|------:|------|");
  const roleHint = {
    "anims/combat": "Retarget → Bip001 / greatsword pack",
    "equipment/weapons": "Hand attach / equip meshes",
    "equipment/tools": "Harvest tools",
    "equipment/bags": "Inventory / back props",
    "harvest/gems": "Mining harvest nodes",
    "buildings/houses": "Island / town interiors",
    "buildings/fortress": "Sector fortresses / ruins",
    "buildings/vendor": "Game-flow vendor NPCs",
    "ships/pirate": "Lobby / sailing",
    "terrain/desert": "Ashen wastes / desert sectors",
    "terrain/water": "Water / river shells",
    "maps/city": "Sector city shells",
    "maps/dungeon": "Dungeon / danger room",
    "creatures/hero": "Hero props / masks",
    "props/misc": "Scatter props",
    multipacks: "Isolate meshName before place",
    unsorted: "Needs manual reclass",
  };
  for (const [layer, n] of Object.entries(registry.layers).sort((a, b) => b[1] - a[1])) {
    const top = layer.split("/")[0];
    md.push(`| \`${layer}\` | ${n} | ${roleHint[layer] || roleHint[top] || "—"} |`);
  }
  md.push("");
  md.push("## Assets");
  md.push("");
  for (const a of registry.assets.sort((x, y) => x.layer.localeCompare(y.layer))) {
    md.push(`- **${a.id}** → \`${a.layer}\` (${a.mb} MB) tags: ${a.tags.join(", ")}`);
    if (a.combatMap) {
      md.push(`  - combatMap: slot1 combo · slot2 teleport · slot3 dash opener · fissure cast`);
    }
  }
  md.push("");
  md.push("## Next");
  md.push("");
  for (const s of registry.pipeline.next) md.push(`1. ${s}`);
  md.push("");

  const mdPath = join(root, "docs/INGEST_RECENT_DOWNLOADS.md");
  writeFileSync(mdPath, md.join("\n"));

  console.log(
    JSON.stringify(
      {
        ok: true,
        files: registry.totalFiles,
        totalMB: +(registry.totalBytes / 1e6).toFixed(1),
        layers: registry.layers,
        multipacks: registry.multipacks.length,
        regPath: relative(root, regPath),
        mdPath: relative(root, mdPath),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

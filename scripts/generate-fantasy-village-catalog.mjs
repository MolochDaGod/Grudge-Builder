/**
 * Generate fantasy village multipack catalog + TypeScript SSOT from GLB node names.
 * Usage: node scripts/generate-fantasy-village-catalog.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const glbPath = path.join(
  root,
  "client/public/models/buildings/fantasy/fantasy_village_kit.glb",
);
const outJson = path.join(
  root,
  "client/public/models/buildings/fantasy/fantasy_village_kit.catalog.json",
);
const outTs = path.join(root, "shared/definitions/fantasyVillageBuildCatalog.ts");

const buf = fs.readFileSync(glbPath);
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));

function isJunk(n) {
  if (/^(Object_|UCX_|Sketchfab|RootNode|Assets\.|Scene)/.test(n)) return true;
  if (/LOD[123]$|_LOD[123]$/.test(n)) return true;
  if (/001$|00[4-9]$|Wall_Example|Village1_Wall_Example/.test(n)) return true;
  return false;
}
function isTreePlant(n) {
  return /^(Birch_|Deciduous_|Oak_|Pine_|Willow_|Bush|Fern|Flower|Grass|Mushroom|Rye|Sunflower|ground_)/.test(
    n,
  );
}
function isMaterialLeaf(n, hasMesh, hasKids) {
  return hasMesh && !hasKids && /_.+_0$/.test(n);
}
function toId(name) {
  return (
    "fv_" +
    name
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
  );
}
function toLabel(name) {
  return name
    .replace(/_LOD0$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function categorize(name) {
  if (/WoodenWall_|Wall_|Gate|Tower|Entrance|Entrace|Stairs|Corner/i.test(name))
    return "defense";
  if (/House|Tavern|Windmill|WoodenHouse/i.test(name)) return "structure";
  if (/door|Door|shutter|blade|fireplace|Fireplace/.test(name)) return "structure";
  if (
    /Furniture_|bed|chair|table|cupboard|candle|scroll|book|elixir|chandelier|curtain|lamp/.test(
      name,
    )
  )
    return "furniture";
  if (/storage_|barrel|bag|basket|jug|chest/.test(name)) return "storage";
  if (/cart/i.test(name)) return "transport";
  if (/Food_/.test(name)) return "decoration";
  if (/Rock|Stone/.test(name)) return "nature";
  return "decoration";
}
function sizeGuess(name) {
  if (/Wall_tower|WoodenWall_Towers|Tower/i.test(name)) return [4, 10, 4];
  if (/House|Tavern|Windmill_LOD|WoodenHouse_[123]/.test(name)) return [8, 6, 8];
  if (/Wall_|WoodenWall_|Gate|Stairs|Corner|Entrance|Entrace/.test(name))
    return [4, 3.5, 0.4];
  if (/cart/i.test(name)) return [2.5, 1.5, 1.5];
  if (/Rock|Stone/.test(name)) return [1.5, 1.2, 1.5];
  if (/Furniture_bed/.test(name)) return [2, 1.2, 3];
  if (/Furniture_table/.test(name)) return [1.5, 1, 1.5];
  if (/Furniture_chair/.test(name)) return [0.6, 1, 0.6];
  if (/storage_barrel/.test(name)) return [0.8, 1.2, 0.8];
  if (/storage_bag/.test(name)) return [0.6, 0.8, 0.6];
  if (/door|Door|shutter|blade/.test(name)) return [1.2, 2.2, 0.15];
  if (/fireplace/.test(name)) return [1.5, 1.5, 1];
  if (/Furniture_/.test(name)) return [1, 1, 1];
  if (/Food_/.test(name)) return [0.4, 0.4, 0.4];
  return [1.5, 1.5, 1.5];
}

const seen = new Set();
const pieces = [];
for (const n of gltf.nodes) {
  const name = n.name;
  if (!name || isJunk(name) || isTreePlant(name)) continue;
  const hasKids = n.children && n.children.length > 0;
  const hasMesh = n.mesh != null;
  if (!hasKids && !hasMesh) continue;
  if (isMaterialLeaf(name, hasMesh, hasKids)) continue;
  if (seen.has(name)) continue;
  seen.add(name);
  const category = categorize(name);
  const harvestable = /^(Rock|Stone)/.test(name);
  pieces.push({
    id: toId(name),
    name: toLabel(name),
    nodeName: name,
    category,
    placement:
      category === "defense" ||
      /Wall_|House|Tower|Gate|Stairs|Corner|Entrance|Entrace/.test(name)
        ? "structural"
        : "prop",
    layer: /House|Tavern|Windmill_LOD|WoodenHouse_[123]/.test(name)
      ? "rts"
      : "modular",
    harvestable,
    harvestResource: harvestable ? "stone" : null,
    sourcePack: "fantasy_village_kit",
    sourceGlb: "/models/buildings/fantasy/fantasy_village_kit.glb",
  });
}

const byCat = {};
for (const p of pieces) byCat[p.category] = (byCat[p.category] || 0) + 1;

const catalog = {
  version: 2,
  generatedAt: new Date().toISOString(),
  pack: {
    id: "fantasy_village_kit",
    file: "fantasy_village_kit.glb",
    path: "/models/buildings/fantasy/fantasy_village_kit.glb",
    sourceFile: "fantasy_assets.glb",
    meshCount: gltf.meshes.length,
    nodeCount: gltf.nodes.length,
    materialCount: gltf.materials.length,
    placeableCount: pieces.length,
    byCategory: byCat,
    excluded: [
      "trees/plants/grass/flowers",
      "LOD1+",
      "UCX collision",
      "Object_ wrappers",
      "scene example instances",
    ],
  },
  api: {
    loader: "PackModelLoader.loadBuildAssetModel",
    fields: {
      id: "stable save/API id (fv_*)",
      name: "player-facing label",
      nodeName: "exact GLB parent node for clone",
      modelPath: "multipack path",
      category: "BuildModePanel tab",
      placement: "structural snap | prop free",
      buildLayer: "modular | rts | camp | ...",
    },
  },
  pieces,
};

fs.writeFileSync(outJson, JSON.stringify(catalog, null, 2));

let ts = `/**
 * Fantasy Village Kit — modular placeables for player build + faction towns.
 * Multipack: client/public/models/buildings/fantasy/fantasy_village_kit.glb
 * Catalog JSON: fantasy_village_kit.catalog.json
 * Render API: PackModelLoader clones exact \`nodeName\` from multipack.
 * Trees/plants excluded (high-quality nature packs only).
 * Generated by scripts/generate-fantasy-village-catalog.mjs — do not hand-edit IDs.
 */
import type { BuildPieceDef } from './buildSystem';
import { BUILD_PACK_PATHS } from './buildSystem';

const PACK = BUILD_PACK_PATHS.fantasyVillageKit;

function fv(
  partial: Omit<BuildPieceDef, 'sourceGlb' | 'tier' | 'placeYOffset'> &
    Partial<Pick<BuildPieceDef, 'tier' | 'placeYOffset' | 'sourceGlb'>>,
): BuildPieceDef {
  return {
    sourceGlb: PACK,
    placeYOffset: 0,
    placement: 'prop',
    requiresFloor: false,
    terrainPlaceable: true,
    scale: 1,
    size: [1.5, 1.5, 1.5],
    cost: [],
    tier: 1,
    ...partial,
    sourceGlb: partial.sourceGlb ?? PACK,
  };
}

/** GLB parent node names — must match multipack hierarchy exactly. */
export const FANTASY_VILLAGE_NODES = {
`;

for (const p of pieces) {
  const key = p.id.replace(/^fv_/, "");
  ts += `  ${key}: '${p.nodeName}',\n`;
}
ts += `} as const;\n\nexport const FANTASY_VILLAGE_PIECES: BuildPieceDef[] = [\n`;

for (const p of pieces) {
  const name = p.nodeName;
  let layer = "modular";
  let placement = "prop";
  let bcat = "storage";
  let reqFloor = false;
  let terrain = true;
  let cost = [{ itemId: "wood", quantity: 2 }];
  let effect = null;
  let notes = null;
  const size = sizeGuess(name);

  if (/Rock|Stone/.test(name)) {
    bcat = "fence";
    cost = [];
    notes = "Harvestable world prop - stone";
    effect = {
      type: "storage",
      value: 0,
      description: "Harvestable stone node",
    };
  } else if (
    /WoodenWall_|Wall_part|Wall_corner|Wall_entrance|Wall_gate|Stairs|Corner|Entrace|Entrance|Gate/.test(
      name,
    )
  ) {
    bcat = "wall";
    layer = "modular";
    placement = "structural";
    cost = [
      { itemId: "wood", quantity: 12 },
      { itemId: "stone", quantity: 4 },
    ];
    effect = {
      type: "defense",
      value: 15,
      description: "Modular wall / gate segment",
    };
  } else if (/Tower|tower/.test(name)) {
    bcat = "tower";
    layer = "modular";
    placement = "structural";
    cost = [
      { itemId: "wood", quantity: 20 },
      { itemId: "stone", quantity: 10 },
    ];
    effect = {
      type: "defense",
      value: 40,
      description: "Defensive wall tower",
    };
  } else if (/House|Tavern|Windmill_LOD|WoodenHouse_[123]/.test(name)) {
    bcat = "rts_building";
    layer = "rts";
    placement = "prop";
    cost = [
      { itemId: "wood", quantity: 40 },
      { itemId: "stone", quantity: 20 },
    ];
    effect = {
      type: "comfort",
      value: 10,
      description: "Faction town building",
    };
  } else if (/door|Door|shutter|blade|fireplace/.test(name)) {
    bcat = "wall";
    layer = "modular";
    placement = "prop";
    cost = [{ itemId: "wood", quantity: 4 }];
    effect = {
      type: "defense",
      value: 5,
      description: "Door / shutter / mill part",
    };
  } else if (/cart/i.test(name)) {
    bcat = "dock";
    layer = "modular";
    cost = [
      { itemId: "wood", quantity: 10 },
      { itemId: "iron", quantity: 2 },
    ];
    effect = { type: "storage", value: 20, description: "Transport cart" };
  } else if (/storage_/.test(name)) {
    bcat = "storage";
    cost = [{ itemId: "wood", quantity: 4 }];
    effect = { type: "storage", value: 12, description: "Storage container" };
  } else if (/Furniture_bed/.test(name)) {
    bcat = "sleep";
    reqFloor = true;
    terrain = false;
    cost = [
      { itemId: "wood", quantity: 8 },
      { itemId: "cloth", quantity: 4 },
    ];
    effect = { type: "respawn", value: 1, description: "Set spawn / rest" };
  } else if (/Furniture_/.test(name)) {
    bcat = "storage";
    reqFloor = true;
    terrain = false;
    cost = [{ itemId: "wood", quantity: 3 }];
    effect = { type: "comfort", value: 4, description: "Interior furniture" };
  } else if (/Food_/.test(name)) {
    bcat = "tool";
    cost = [{ itemId: "wood", quantity: 1 }];
    effect = { type: "comfort", value: 1, description: "Table prop" };
  } else if (/chandelier|curtain|lamp|interior/.test(name)) {
    bcat = "storage";
    cost = [
      { itemId: "wood", quantity: 2 },
      { itemId: "iron", quantity: 1 },
    ];
    effect = { type: "comfort", value: 3, description: "Interior prop" };
  }

  const esc = p.name.replace(/'/g, "\\'");
  ts += `  fv({\n`;
  ts += `    id: '${p.id}',\n`;
  ts += `    name: '${esc}',\n`;
  ts += `    layer: '${layer}',\n`;
  ts += `    category: '${bcat}',\n`;
  ts += `    nodeName: '${name}',\n`;
  ts += `    placement: '${placement}',\n`;
  ts += `    requiresFloor: ${reqFloor},\n`;
  ts += `    terrainPlaceable: ${terrain},\n`;
  ts += `    size: [${size.join(", ")}],\n`;
  ts += `    cost: ${JSON.stringify(cost)},\n`;
  if (effect) {
    ts += `    effect: { type: '${effect.type}' as const, value: ${effect.value}, description: '${effect.description.replace(/'/g, "\\'")}' },\n`;
  }
  if (notes) ts += `    notes: '${notes}',\n`;
  ts += `  }),\n`;
}

ts += `];\n\nexport const FANTASY_VILLAGE_HARVESTABLES = FANTASY_VILLAGE_PIECES.filter((p) =>\n  p.notes?.includes('Harvestable'),\n);\n`;

fs.writeFileSync(outTs, ts);

console.log("Wrote", outJson);
console.log("Wrote", outTs);
console.log("pieces", pieces.length, byCat);
console.log(
  "sample",
  pieces.slice(0, 6).map((p) => `${p.id} <- ${p.nodeName}`),
);
console.log(
  "walls/towers",
  pieces.filter((p) => p.category === "defense").map((p) => p.nodeName),
);

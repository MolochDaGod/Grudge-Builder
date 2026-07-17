/**
 * Catalog ice_biome_kit.glb parent nodes for snow/mountain/event islands.
 * Includes harvestables, placeables, recipe-learn targets (E once per asset).
 * Usage: node scripts/generate-ice-biome-catalog.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const glbPath = path.join(root, "client/public/models/biomes/ice/ice_biome_kit.glb");
const outJson = path.join(root, "client/public/models/biomes/ice/ice_biome_kit.catalog.json");
const outTs = path.join(root, "shared/definitions/iceBiomeCatalog.ts");
const outRecipes = path.join(root, "shared/definitions/iceBiomeRecipes.ts");

const buf = fs.readFileSync(glbPath);
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));

function isJunk(n) {
  if (/^(Object_|UCX_|Sketchfab|RootNode|fe30981f|RootNode)/.test(n)) return true;
  if (/_M_Sandman_0$/.test(n)) return true; // material leaf
  return false;
}

function toId(name) {
  return (
    "ice_" +
    name
      .replace(/\.001$/, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
  );
}

function toLabel(name) {
  return name
    .replace(/\.001$/, "")
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bSleepering\b/gi, "Sleeper")
    .replace(/\bSleppering\b/gi, "Sleeper")
    .replace(/\bPannel\b/gi, "Panel");
}

/**
 * Game systems classification for each mesh.
 */
function classify(name) {
  const n = name;
  // Terrain / biome backdrop (not inventory items)
  if (/^Mountain_|^Snowy_mountain_|^Iceberg_/.test(n)) {
    return {
      role: "terrain",
      biome: "snow",
      harvestable: false,
      learnable: false,
      placeable: true,
      placement: "prop",
      buildCategory: "terrain",
      itemType: null,
      recipe: null,
      use: "Mountain/snow backdrop for frostbite_expanse / event snow islands",
    };
  }
  if (/^Grass_/.test(n)) {
    return {
      role: "scatter",
      biome: "snow",
      harvestable: true,
      harvestResource: "fiber",
      learnable: false,
      placeable: true,
      placement: "prop",
      buildCategory: "nature",
      itemType: "resource",
      recipe: null,
      use: "Snow grass tuft scatter / fiber forage",
    };
  }
  if (/^Path_rock_/.test(n)) {
    return {
      role: "harvestable",
      biome: "snow",
      harvestable: true,
      harvestResource: "stone",
      learnable: false,
      placeable: true,
      placement: "prop",
      buildCategory: "nature",
      itemType: "resource_node",
      recipe: null,
      use: "Path stone node — harvest stone on mountain trails",
    };
  }
  if (/^Pine_|^Snowy_pine_|^Tree_|^Snowy_tree_/.test(n)) {
    return {
      role: "harvestable",
      biome: "snow",
      harvestable: true,
      harvestResource: "wood",
      learnable: false,
      placeable: true,
      placement: "prop",
      buildCategory: "nature",
      itemType: "resource_node",
      recipe: null,
      use: "Snow/pine tree — harvest wood (event mountain biome only; stylized pack trees OK for ice)",
    };
  }
  if (/^Trunk_|^trunk_|^Snowy_trunk_/.test(n)) {
    return {
      role: "harvestable",
      biome: "snow",
      harvestable: true,
      harvestResource: "wood",
      learnable: false,
      placeable: true,
      placement: "prop",
      buildCategory: "nature",
      itemType: "resource_node",
      recipe: null,
      use: "Fallen log / stump — secondary wood node",
    };
  }
  if (/^Fence_|^Snowy_fence_/.test(n)) {
    return {
      role: "build",
      biome: "snow",
      harvestable: false,
      learnable: true,
      placeable: true,
      placement: "structural",
      buildCategory: "defense",
      itemType: "structure",
      recipe: {
        profession: "camp",
        tier: 1,
        inputs: [
          { itemId: "wood", quantity: 6 },
          { itemId: "fiber", quantity: 2 },
        ],
      },
      use: "Modular fence for snow camps / NPC bases — learn recipe with E once",
    };
  }
  if (/^Bridge/.test(n)) {
    return {
      role: "build",
      biome: "snow",
      harvestable: false,
      learnable: true,
      placeable: true,
      placement: "prop",
      buildCategory: "structure",
      itemType: "structure",
      recipe: {
        profession: "camp",
        tier: 2,
        inputs: [
          { itemId: "wood", quantity: 20 },
          { itemId: "rope", quantity: 4 },
        ],
      },
      use: "Crossing bridge for ravines / ice paths",
    };
  }
  if (/^Boat$/.test(n)) {
    return {
      role: "transport",
      biome: "snow",
      harvestable: false,
      learnable: true,
      placeable: true,
      placement: "prop",
      buildCategory: "transport",
      itemType: "vehicle",
      recipe: {
        profession: "engineering",
        tier: 2,
        inputs: [
          { itemId: "wood", quantity: 30 },
          { itemId: "cloth", quantity: 8 },
          { itemId: "iron", quantity: 4 },
        ],
      },
      use: "Water travel boat for snow shore / ice edge landings",
    };
  }
  if (/^Sled$/.test(n)) {
    return {
      role: "transport",
      biome: "snow",
      harvestable: false,
      learnable: true,
      placeable: true,
      placement: "prop",
      buildCategory: "transport",
      itemType: "vehicle",
      recipe: {
        profession: "engineering",
        tier: 1,
        inputs: [
          { itemId: "wood", quantity: 12 },
          { itemId: "fiber", quantity: 6 },
        ],
      },
      use: "Over-snow sled transport",
    };
  }
  if (/^Chest$/.test(n)) {
    return {
      role: "interact_chest",
      biome: "snow",
      harvestable: false,
      learnable: true,
      placeable: true,
      placement: "prop",
      buildCategory: "storage",
      itemType: "container",
      learnSource: "chest",
      recipe: {
        profession: "camp",
        tier: 1,
        inputs: [
          { itemId: "wood", quantity: 8 },
          { itemId: "iron", quantity: 2 },
        ],
      },
      use: "World chest — open for loot; E once learns storage chest recipe",
    };
  }
  if (/^Box$|^Snowy_box$/.test(n)) {
    return {
      role: "interact_chest",
      biome: "snow",
      harvestable: false,
      learnable: true,
      placeable: true,
      placement: "prop",
      buildCategory: "storage",
      itemType: "container",
      learnSource: "chest",
      recipe: {
        profession: "camp",
        tier: 0,
        inputs: [{ itemId: "wood", quantity: 4 }],
      },
      use: "Supply crate — loot + E to learn crate recipe",
    };
  }
  if (/Barrel|Snowy_barrel|powder_crate|powder_bag|Sleepering_bag|Sleppering/.test(n)) {
    const powder = /powder/i.test(n);
    return {
      role: powder ? "crafting_station" : "storage",
      biome: "snow",
      harvestable: false,
      learnable: true,
      placeable: true,
      placement: "prop",
      buildCategory: "storage",
      itemType: powder ? "reagent_container" : "container",
      learnSource: "world_prop",
      recipe: {
        profession: powder ? "mystic" : "camp",
        tier: powder ? 2 : 1,
        inputs: powder
          ? [
              { itemId: "cloth", quantity: 4 },
              { itemId: "herbs", quantity: 2 },
            ]
          : [
              { itemId: "wood", quantity: 4 },
              { itemId: "iron", quantity: 1 },
            ],
      },
      use: powder
        ? "Dream powder bag/crate — mystic reagent storage; E learns recipe"
        : "Barrel storage for camps / deserted islands",
    };
  }
  if (/extractor|seed_dryer|crusher|Bag/.test(n)) {
    return {
      role: "crafting_station",
      biome: "snow",
      harvestable: false,
      learnable: true,
      placeable: true,
      placement: "prop",
      buildCategory: "crafting",
      itemType: "station",
      learnSource: "npc_base",
      recipe: {
        profession: "mystic",
        tier: 2,
        inputs: [
          { itemId: "wood", quantity: 16 },
          { itemId: "stone", quantity: 8 },
          { itemId: "iron", quantity: 4 },
        ],
      },
      use: "Sleeper craft station (extractor / dryer / crusher / bag bench) — NPC base teach via E",
    };
  }
  if (/Campfire/.test(n)) {
    return {
      role: "crafting_station",
      biome: "snow",
      harvestable: false,
      learnable: true,
      placeable: true,
      placement: "prop",
      buildCategory: "crafting",
      itemType: "station",
      learnSource: "camp",
      recipe: {
        profession: "cooking",
        tier: 0,
        inputs: [
          { itemId: "stone", quantity: 6 },
          { itemId: "wood", quantity: 4 },
        ],
      },
      use: "Campfire — cook; E at fire learns campfire recipe if not known",
    };
  }
  if (/Sandman_house|Sandman_House|Sandman_Bed|Sandman_pillow|well/.test(n)) {
    return {
      role: "build",
      biome: "snow",
      harvestable: false,
      learnable: true,
      placeable: true,
      placement: "prop",
      buildCategory: /Bed|pillow/.test(n) ? "furniture" : "structure",
      itemType: "structure",
      learnSource: "npc_base",
      recipe: {
        profession: "camp",
        tier: 2,
        inputs: [
          { itemId: "wood", quantity: 24 },
          { itemId: "stone", quantity: 12 },
          { itemId: "cloth", quantity: 6 },
        ],
      },
      use: "Snow faction / event settlement building",
    };
  }
  if (/Pannel_|Panel_/.test(n)) {
    return {
      role: "build",
      biome: "snow",
      harvestable: false,
      learnable: true,
      placeable: true,
      placement: "structural",
      buildCategory: "structure",
      itemType: "modular_panel",
      learnSource: "world_prop",
      recipe: {
        profession: "camp",
        tier: 1,
        inputs: [
          { itemId: "wood", quantity: 8 },
          { itemId: "iron", quantity: 2 },
        ],
      },
      use: "Modular wall/panel piece for snow bases",
    };
  }
  if (/Book_table|Harp|Dream_catcher|Swing|Tomb/.test(n)) {
    return {
      role: "decor",
      biome: "snow",
      harvestable: false,
      learnable: true,
      placeable: true,
      placement: "prop",
      buildCategory: "decoration",
      itemType: "decor",
      learnSource: "world_prop",
      recipe: {
        profession: "camp",
        tier: 1,
        inputs: [
          { itemId: "wood", quantity: 6 },
          { itemId: "fiber", quantity: 4 },
        ],
      },
      use: "Event island decor / lore prop — E learns craft recipe",
    };
  }
  if (/Sleepering|Young_sleepering|Sleepering_empty|Sleepering_Baby|Sleepering_Adult/.test(n)) {
    return {
      role: "npc_prop",
      biome: "snow",
      harvestable: false,
      learnable: false,
      placeable: true,
      placement: "prop",
      buildCategory: "decoration",
      itemType: "npc_prop",
      recipe: null,
      use: "Sleeper creature prop / NPC marker for event camps (not a recipe item)",
    };
  }
  return {
    role: "prop",
    biome: "snow",
    harvestable: false,
    learnable: true,
    placeable: true,
    placement: "prop",
    buildCategory: "decoration",
    itemType: "prop",
    learnSource: "world_prop",
    recipe: {
      profession: "camp",
      tier: 0,
      inputs: [{ itemId: "wood", quantity: 2 }],
    },
    use: "Generic snow biome prop",
  };
}

const seen = new Set();
const pieces = [];
for (const n of gltf.nodes) {
  const name = n.name;
  if (!name || isJunk(name)) continue;
  const hasKids = n.children && n.children.length > 0;
  // Parent placeables are groups with one mesh child (pattern X / X_M_Sandman_0)
  if (!hasKids) continue;
  if (seen.has(name)) continue;
  seen.add(name);

  const cls = classify(name);
  const id = toId(name);
  const recipeId = cls.recipe ? `recipe_${id}` : null;
  const itemId = cls.itemType ? `item_${id}` : null;

  pieces.push({
    id,
    name: toLabel(name),
    nodeName: name,
    ...cls,
    recipeId,
    itemId,
    sourcePack: "ice_biome_kit",
    sourceGlb: "/models/biomes/ice/ice_biome_kit.glb",
    biomes: ["frostbite_expanse", "snow", "mountain", "event_snow", "event_mountain"],
  });
}

const byRole = {};
for (const p of pieces) byRole[p.role] = (byRole[p.role] || 0) + 1;

const catalog = {
  version: 1,
  generatedAt: new Date().toISOString(),
  pack: {
    id: "ice_biome_kit",
    title: "Ice / Snow / Mountain event biome kit",
    sketchfabTitle: "Sandman Lair - Low Poly Stylized Asset Pack",
    license: "CC-BY-4.0 (artikora)",
    file: "ice_biome_kit.glb",
    path: "/models/biomes/ice/ice_biome_kit.glb",
    material: "M_Sandman (atlas)",
    textures: 2,
    placeableCount: pieces.length,
    byRole,
  },
  learnSystem: {
    key: "E",
    rule: "Once per character per asset id — standing over world prop, chest, camp station, or NPC base piece",
    sources: ["chest", "camp", "npc_base", "world_prop", "deserted_island", "event_island"],
    storage: "unlocked_recipes table + local cache grudge_learned_recipes",
    api: "POST /api/characters/:id/recipes/unlock { recipeId, sourceAssetId }",
  },
  api: {
    loader: "PackModelLoader.loadBuildAssetModel",
    id: "stable API/save id (ice_*)",
    nodeName: "exact GLB parent for clone",
    harvestResource: "wood|stone|fiber when harvestable",
    recipeId: "recipe_ice_* unlocked via E",
  },
  pieces,
};

fs.writeFileSync(outJson, JSON.stringify(catalog, null, 2));

// TypeScript catalog
let ts = `/**
 * Ice / snow / mountain event biome multipack catalog.
 * Source GLB: client/public/models/biomes/ice/ice_biome_kit.glb
 * Generated by scripts/generate-ice-biome-catalog.mjs
 *
 * Systems: placeable build · harvestables · E-to-learn recipes (1× per character per asset)
 */
import type { BuildPieceDef } from './buildSystem';
import { BUILD_PACK_PATHS } from './buildSystem';

const PACK = BUILD_PACK_PATHS.iceBiomeKit;

export type IceLearnSource =
  | 'chest'
  | 'camp'
  | 'npc_base'
  | 'world_prop'
  | 'deserted_island'
  | 'event_island';

export interface IceBiomePiece {
  id: string;
  name: string;
  nodeName: string;
  role: string;
  biome: string;
  biomes: string[];
  harvestable: boolean;
  harvestResource?: string | null;
  learnable: boolean;
  learnSource?: IceLearnSource | null;
  placeable: boolean;
  placement: 'structural' | 'prop';
  buildCategory: string;
  itemType?: string | null;
  itemId?: string | null;
  recipeId?: string | null;
  recipe?: {
    profession: string;
    tier: number;
    inputs: Array<{ itemId: string; quantity: number }>;
  } | null;
  use: string;
  sourceGlb: string;
  sourcePack: string;
}

export const ICE_BIOME_PIECES: IceBiomePiece[] = ${JSON.stringify(pieces, null, 2)};

export const ICE_BIOME_NODES = Object.fromEntries(
  ICE_BIOME_PIECES.map((p) => [p.id.replace(/^ice_/, ''), p.nodeName]),
) as Record<string, string>;

export const ICE_BIOME_HARVESTABLES = ICE_BIOME_PIECES.filter((p) => p.harvestable);
export const ICE_BIOME_LEARNABLES = ICE_BIOME_PIECES.filter((p) => p.learnable && p.recipeId);

/** BuildPieceDef rows for BUILD_ASSETS registration */
export const ICE_BIOME_BUILD_PIECES: BuildPieceDef[] = ICE_BIOME_PIECES.filter(
  (p) => p.placeable,
).map((p) => ({
  id: p.id,
  name: p.name,
  layer: p.role === 'terrain' ? 'modular' : p.buildCategory === 'defense' ? 'modular' : p.role === 'build' || p.role === 'crafting_station' ? 'camp' : 'modular',
  tier: (p.recipe?.tier ?? 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
  category:
    p.buildCategory === 'defense'
      ? 'fence'
      : p.buildCategory === 'crafting'
        ? 'bench'
        : p.buildCategory === 'storage'
          ? 'storage'
          : p.buildCategory === 'transport'
            ? 'dock'
            : p.buildCategory === 'furniture'
              ? 'sleep'
              : p.buildCategory === 'structure'
                ? 'rts_building'
                : p.buildCategory === 'nature' || p.buildCategory === 'terrain'
                  ? 'fence'
                  : 'tool',
  sourceGlb: PACK,
  nodeName: p.nodeName,
  scale: 1,
  size: [1.5, 1.5, 1.5] as [number, number, number],
  placeYOffset: 0,
  placement: p.placement,
  requiresFloor: false,
  terrainPlaceable: true,
  cost: p.recipe?.inputs ?? [],
  profession: p.recipe?.profession as BuildPieceDef['profession'],
  craftUnlockLevel: p.recipe?.tier,
  effect: p.harvestable
    ? {
        type: 'storage' as const,
        value: 0,
        description: \`Harvest \${p.harvestResource} (\${p.use})\`,
      }
    : p.recipe
      ? {
          type: (p.buildCategory === 'defense' ? 'defense' : p.buildCategory === 'storage' ? 'storage' : 'crafting') as 'defense' | 'storage' | 'crafting',
          value: p.recipe.tier + 1,
          description: p.use,
        }
      : undefined,
  notes: [
    p.use,
    p.learnable ? \`Learn: E once (\${p.learnSource ?? 'world_prop'}) → \${p.recipeId}\` : null,
    p.harvestable ? \`Harvestable → \${p.harvestResource}\` : null,
    \`Biomes: \${p.biomes.join(', ')}\`,
  ]
    .filter(Boolean)
    .join(' | '),
}));
`;

fs.writeFileSync(outTs, ts);

// Recipes file
const recipes = pieces
  .filter((p) => p.recipe && p.recipeId)
  .map((p) => ({
    id: p.recipeId,
    name: `Recipe: ${p.name}`,
    resultItemId: p.itemId,
    resultAssetId: p.id,
    nodeName: p.nodeName,
    profession: p.recipe.profession,
    tier: p.recipe.tier,
    inputs: p.recipe.inputs,
    learnOnce: true,
    learnSources: [p.learnSource || "world_prop", "chest", "camp", "npc_base", "event_island"],
    biomes: p.biomes,
    description: `Learn by standing over ${p.name} and pressing E (once per character). ${p.use}`,
  }));

const recipesTs = `/**
 * Ice biome craft recipes unlocked by exploring world props (E once).
 * Generated by scripts/generate-ice-biome-catalog.mjs
 */
export interface IceBiomeRecipe {
  id: string;
  name: string;
  resultItemId: string | null | undefined;
  resultAssetId: string;
  nodeName: string;
  profession: string;
  tier: number;
  inputs: Array<{ itemId: string; quantity: number }>;
  learnOnce: true;
  learnSources: string[];
  biomes: string[];
  description: string;
}

export const ICE_BIOME_RECIPES: IceBiomeRecipe[] = ${JSON.stringify(recipes, null, 2)};

export function getIceBiomeRecipe(id: string): IceBiomeRecipe | undefined {
  return ICE_BIOME_RECIPES.find((r) => r.id === id);
}

export function getIceBiomeRecipeByAssetId(assetId: string): IceBiomeRecipe | undefined {
  return ICE_BIOME_RECIPES.find((r) => r.resultAssetId === assetId);
}
`;

fs.writeFileSync(outRecipes, recipesTs);

console.log("pieces", pieces.length, byRole);
console.log("learnable recipes", recipes.length);
console.log("harvestables", pieces.filter((p) => p.harvestable).map((p) => p.nodeName));
console.log("sample", pieces.slice(0, 5));
console.log("Wrote", outJson, outTs, outRecipes);

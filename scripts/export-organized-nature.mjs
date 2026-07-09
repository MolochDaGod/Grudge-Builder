#!/usr/bin/env node
/**
 * Export organized nature assets from environment multi-mesh packs.
 *
 * Reads:
 *   client/public/models/environment/island_tree.glb
 *   client/public/models/environment/island_rock.glb
 *
 * Writes individual variant GLBs (no megakit):
 *   client/public/models/nature/organized/trees/*.glb
 *   client/public/models/nature/organized/rocks/*.glb
 *   client/public/models/nature/realistic/...  (catalog layout aliases)
 *
 * Also writes:
 *   shared/definitions/published/organized-nature-manifest.json
 *
 * Usage:
 *   node scripts/export-organized-nature.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractAllNamedRoots } from './lib/glbExtract.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODELS = path.join(ROOT, 'client', 'public', 'models');
const TREE_PACK = path.join(MODELS, 'environment', 'island_tree.glb');
const ROCK_PACK = path.join(MODELS, 'environment', 'island_rock.glb');
const OUT_TREES = path.join(MODELS, 'nature', 'organized', 'trees');
const OUT_ROCKS = path.join(MODELS, 'nature', 'organized', 'rocks');
const REALISTIC = path.join(MODELS, 'nature', 'realistic');
const MANIFEST = path.join(ROOT, 'shared', 'definitions', 'published', 'organized-nature-manifest.json');

/** Tree variants used by home-island harvest + biomes (skip decorative clutter). */
const TREE_ALLOW = new Set([
  'pine2_14',
  'pine9_15',
  'birch2_4',
  'birch6_5',
  'ancient_tree_2_0',
  'garden_tree_pink_11',
  'creepy_tree1_10',
  'palm2_13',
  'coconut2_9',
  'banana2_3',
]);

/** All rock variants */
const ROCK_ALLOW = new Set([
  'rock_1', 'rock_2', 'rock_3', 'rock_4',
  'rock_5', 'rock_6', 'rock_7', 'rock_8',
]);

/** Map pack names → realistic catalog slots */
const REALISTIC_TREE_MAP = {
  pine2_14: 'trees/pine/pine_a.glb',
  pine9_15: 'trees/pine/pine_b.glb',
  birch2_4: 'trees/deciduous/birch_a.glb',
  birch6_5: 'trees/deciduous/oak_a.glb',
  palm2_13: 'trees/palm/palm_a.glb',
  coconut2_9: 'trees/palm/palm_b.glb',
  ancient_tree_2_0: 'trees/deciduous/oak_b.glb',
  garden_tree_pink_11: 'trees/deciduous/flowering_a.glb',
  creepy_tree1_10: 'trees/deciduous/gnarled_a.glb',
  // snow uses pine_a until dedicated snow mesh
  // mapped after copy
};

const REALISTIC_ROCK_MAP = {
  rock_1: 'rocks/boulder_a.glb',
  rock_2: 'rocks/boulder_b.glb',
  rock_3: 'rocks/cliff_chunk_a.glb',
  rock_4: 'rocks/boulder_c.glb',
  rock_5: 'rocks/boulder_d.glb',
  rock_6: 'rocks/boulder_e.glb',
  rock_7: 'rocks/cliff_chunk_b.glb',
  rock_8: 'rocks/boulder_f.glb',
};

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function main() {
  if (!fs.existsSync(TREE_PACK)) {
    console.error('Missing tree pack:', TREE_PACK);
    process.exit(1);
  }
  if (!fs.existsSync(ROCK_PACK)) {
    console.error('Missing rock pack:', ROCK_PACK);
    process.exit(1);
  }

  console.log('Extracting tree variants…');
  const trees = extractAllNamedRoots(TREE_PACK, OUT_TREES, { allowlist: TREE_ALLOW });
  console.log(`  ${trees.length} trees → ${OUT_TREES}`);

  console.log('Extracting rock variants…');
  const rocks = extractAllNamedRoots(ROCK_PACK, OUT_ROCKS, { allowlist: ROCK_ALLOW });
  console.log(`  ${rocks.length} rocks → ${OUT_ROCKS}`);

  // Mirror into realistic catalog layout (runtimeReady targets)
  const realistic = [];
  for (const t of trees) {
    const rel = REALISTIC_TREE_MAP[t.sourceName];
    if (!rel) continue;
    const dest = path.join(REALISTIC, rel);
    copyFile(t.path, dest);
    realistic.push({
      id: path.basename(rel, '.glb'),
      category: rel.includes('/pine/') ? 'tree_pine'
        : rel.includes('/palm/') ? 'tree_palm'
        : 'tree_deciduous',
      path: `/models/nature/realistic/${rel.replace(/\\/g, '/')}`,
      local: dest,
      bytes: t.bytes,
      source: t.sourceName,
    });
  }
  // snow_pine_a from pine_a
  const pineA = realistic.find((r) => r.path.endsWith('pine_a.glb'));
  if (pineA) {
    const dest = path.join(REALISTIC, 'trees/snow/snow_pine_a.glb');
    copyFile(pineA.local, dest);
    realistic.push({
      id: 'snow_pine_a',
      category: 'tree_snow',
      path: '/models/nature/realistic/trees/snow/snow_pine_a.glb',
      local: dest,
      bytes: pineA.bytes,
      source: pineA.source,
    });
  }
  for (const r of rocks) {
    const rel = REALISTIC_ROCK_MAP[r.sourceName];
    if (!rel) continue;
    const dest = path.join(REALISTIC, rel);
    copyFile(r.path, dest);
    realistic.push({
      id: path.basename(rel, '.glb'),
      category: 'rock',
      path: `/models/nature/realistic/${rel.replace(/\\/g, '/')}`,
      local: dest,
      bytes: r.bytes,
      source: r.sourceName,
    });
  }

  const manifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    policy: 'Extracted from environment multi-mesh packs — not Quaternius megakit. Megakit remains banned.',
    sourcePacks: {
      trees: '/models/environment/island_tree.glb',
      rocks: '/models/environment/island_rock.glb',
    },
    organized: {
      trees: trees.map((t) => ({
        name: t.name,
        sourceName: t.sourceName,
        path: `/models/nature/organized/trees/${t.name}.glb`,
        bytes: t.bytes,
      })),
      rocks: rocks.map((r) => ({
        name: r.name,
        sourceName: r.sourceName,
        path: `/models/nature/organized/rocks/${r.name}.glb`,
        bytes: r.bytes,
      })),
    },
    realistic: realistic.map(({ id, category, path: p, bytes, source }) => ({
      id, category, path: p, bytes, source, runtimeReady: true,
    })),
  };

  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log('Manifest →', MANIFEST);
  console.log('Realistic slots:', realistic.length);
  console.log('Done.');
}

main();

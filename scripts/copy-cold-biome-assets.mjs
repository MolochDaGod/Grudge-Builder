/**
 * Copy / hardlink recently downloaded cold biome GLBs into client public.
 *
 * Sources (author machine):
 *   D:\Games\Models\dwarf_modelkit.glb
 *   D:\Games\Models\low_poly_arctic_scene.glb
 *   D:\Games\Models\wizards_house.glb
 *   D:\Games\Models\iceland_scene_for_canimatic.glb
 *
 * Dest: client/public/models/biomes/cold/
 *
 * Large files (>50MB) stay gitignored — use R2 CDN for production.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const destDir = path.join(root, 'client/public/models/biomes/cold');

const SOURCES = [
  process.env.COLD_MODELS_DIR,
  'D:/Games/Models',
  'C:/Games/Models',
].filter(Boolean);

/** destRel under client/public → source filename in Models dir */
const MAP = [
  ['models/biomes/cold/dwarf_modelkit.glb', 'dwarf_modelkit.glb'],
  ['models/biomes/cold/low_poly_arctic_scene.glb', 'low_poly_arctic_scene.glb'],
  ['models/biomes/cold/wizards_house.glb', 'wizards_house.glb'],
  ['models/biomes/cold/iceland_scene_for_canimatic.glb', 'iceland_scene_for_canimatic.glb'],
  ['models/biomes/ethereal/lyoko_mountain_sector.glb', 'lyoko_mountain_sector (1).glb'],
  ['models/biomes/event/spiral_mountain_reimagined.glb', 'spiral_mountain_reimagined.glb'],
  ['models/biomes/frozen/hoth_boss_room_low_poly.glb', 'hoth_boss_room_low_poly.glb'],
  ['models/biomes/forest/scary_forest.glb', 'scary_forest.glb'],
  ['models/biomes/desert/bossinstanceisland.glb', 'bossinstanceisland.glb'],
  ['models/biomes/volcanic/low_poly_lava_fighting_arenastage.glb', 'low_poly_lava_fighting_arenastage.glb'],
];

function findSource(fileName) {
  for (const dir of SOURCES) {
    const p = path.join(dir, fileName);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

for (const [destRel, srcName] of MAP) {
  const dest = path.join(root, 'client/public', destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    console.log('exists', destRel);
    continue;
  }
  const src = findSource(srcName);
  if (!src) {
    console.warn('missing source for', srcName);
    continue;
  }
  try {
    fs.linkSync(src, dest);
    console.log('hardlink', destRel);
  } catch {
    fs.copyFileSync(src, dest);
    console.log('copied', destRel, `(${(fs.statSync(dest).size / 1e6).toFixed(1)} MB)`);
  }
}

console.log('Done.');

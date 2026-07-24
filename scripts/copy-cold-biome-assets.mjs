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

const FILES = [
  'dwarf_modelkit.glb',
  'low_poly_arctic_scene.glb',
  'wizards_house.glb',
  'iceland_scene_for_canimatic.glb',
];

const SOURCES = [
  process.env.COLD_MODELS_DIR,
  'D:/Games/Models',
  'C:/Games/Models',
].filter(Boolean);

fs.mkdirSync(destDir, { recursive: true });

for (const name of FILES) {
  const dest = path.join(destDir, name);
  if (fs.existsSync(dest)) {
    console.log('exists', name);
    continue;
  }
  let src = null;
  for (const dir of SOURCES) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      src = p;
      break;
    }
  }
  if (!src) {
    console.warn('missing source for', name);
    continue;
  }
  try {
    fs.linkSync(src, dest);
    console.log('hardlink', name);
  } catch {
    fs.copyFileSync(src, dest);
    console.log('copied', name, `(${(fs.statSync(dest).size / 1e6).toFixed(1)} MB)`);
  }
}

console.log('Done →', destDir);

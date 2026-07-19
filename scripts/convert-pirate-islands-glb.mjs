/**
 * Convert pirate-islands scene.gltf (+ bin + textures) → scene.glb
 * for single-file Forge mesh editing.
 *
 * Sources (priority):
 *   1. public/models/lobby/pirate-islands/ (local)
 *   2. Download from assets.grudge-studio.com
 *
 * Usage:
 *   node scripts/convert-pirate-islands-glb.mjs
 *   node scripts/convert-pirate-islands-glb.mjs --download
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const localDir = path.join(root, 'public', 'models', 'lobby', 'pirate-islands');
const CDN = 'https://assets.grudge-studio.com/models/lobby/pirate-islands';

const wantDownload = process.argv.includes('--download');

async function download(url, dest) {
  console.log(`  GET ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const body = res.body;
  if (!body) throw new Error('no body');
  await pipeline(Readable.fromWeb(body), createWriteStream(dest));
  const st = fs.statSync(dest);
  console.log(`  OK ${(st.size / 1024 / 1024).toFixed(1)} MB → ${dest}`);
}

async function ensureLocal() {
  fs.mkdirSync(localDir, { recursive: true });
  const gltf = path.join(localDir, 'scene.gltf');
  const bin = path.join(localDir, 'scene.bin');
  const needGltf = !fs.existsSync(gltf) || fs.statSync(gltf).size < 1000;
  const needBin = !fs.existsSync(bin);

  if (needGltf || needBin || wantDownload) {
    console.log('[pirate-glb] fetching from CDN…');
    if (needGltf || wantDownload) await download(`${CDN}/scene.gltf`, gltf);
    if (needBin || wantDownload) await download(`${CDN}/scene.bin`, bin);
    // textures listed in gltf — optional full fetch if missing
    const texDir = path.join(localDir, 'textures');
    if (!fs.existsSync(texDir) || fs.readdirSync(texDir).length === 0) {
      console.log('[pirate-glb] textures/ empty — glb may miss textures unless CDN embeds or you sync textures');
    }
  }
  return { gltf, bin };
}

async function convertWithGltfPipeline(gltfPath) {
  let gltfToGlb;
  try {
    const mod = await import('gltf-pipeline');
    gltfToGlb = mod.gltfToGlb ?? mod.default?.gltfToGlb;
  } catch {
    console.error('[pirate-glb] gltf-pipeline not installed. Run: npm i -D gltf-pipeline');
    console.error('  Or open scene.gltf in Blender / Forge Model Converter and export .glb');
    return null;
  }
  if (!gltfToGlb) {
    console.error('[pirate-glb] gltfToGlb export missing from gltf-pipeline');
    return null;
  }

  const gltf = JSON.parse(fs.readFileSync(gltfPath, 'utf8'));
  const results = await gltfToGlb(gltf, {
    resourceDirectory: path.dirname(gltfPath) + path.sep,
  });
  const out = path.join(localDir, 'scene.glb');
  fs.writeFileSync(out, Buffer.from(results.glb));
  return out;
}

async function main() {
  console.log('[pirate-glb] target dir', localDir);
  const { gltf } = await ensureLocal();
  if (!fs.existsSync(gltf) || fs.statSync(gltf).size < 1000) {
    console.error('[pirate-glb] scene.gltf missing/empty. Use --download');
    process.exit(1);
  }

  console.log('[pirate-glb] converting to scene.glb (may take a few minutes for ~127MB)…');
  const out = await convertWithGltfPipeline(gltf);
  if (out) {
    const mb = (fs.statSync(out).size / 1024 / 1024).toFixed(1);
    console.log(`[pirate-glb] DONE ${out} (${mb} MB)`);
    console.log('[pirate-glb] Upload to R2: models/lobby/pirate-islands/scene.glb');
    console.log('[pirate-glb] Forge preferred geometry path now valid once CDN has the file.');
  } else {
    console.log('[pirate-glb] conversion skipped — package still uses scene.gltf (live on CDN).');
    process.exitCode = 2;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

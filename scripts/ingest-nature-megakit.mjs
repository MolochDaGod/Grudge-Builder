#!/usr/bin/env node
/**
 * Ingest Nature Megakit glTF → GLB → R2 CDN (models/nature/*)
 *
 * Source: D:\grudge-assets\models\environment\nature-megakit\glTF.zip
 *
 * Usage:
 *   node scripts/ingest-nature-megakit.mjs [--dry-run] [--force] [--skip-upload]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import {
  loadEnvFiles,
  getR2Config,
  createR2Client,
  uploadFile,
} from './lib/r2Upload.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadEnvFiles(ROOT);

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const skipUpload = process.argv.includes('--skip-upload');

const MEGAKIT_ROOT =
  process.env.NATURE_MEGAKIT_ROOT ||
  'D:/grudge-assets/models/environment/nature-megakit';
const ZIP_PATH = path.join(MEGAKIT_ROOT, 'glTF.zip');
const EXTRACT_DIR = path.join(MEGAKIT_ROOT, 'glTF');
const OUT_DIR = path.join(ROOT, 'client/public/models/nature');

const cfg = getR2Config();
const client = dryRun || skipUpload ? null : createR2Client(cfg);
const io = new NodeIO();

function ensureExtracted() {
  const hasGltf =
    fs.existsSync(EXTRACT_DIR) &&
    fs.readdirSync(EXTRACT_DIR, { recursive: true }).some((f) => String(f).endsWith('.gltf'));
  if (hasGltf) return EXTRACT_DIR;

  if (!fs.existsSync(ZIP_PATH)) {
    throw new Error(`Missing ${ZIP_PATH} — place nature-megakit glTF.zip first`);
  }
  fs.mkdirSync(EXTRACT_DIR, { recursive: true });
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${ZIP_PATH.replace(/'/g, "''")}' -DestinationPath '${EXTRACT_DIR.replace(/'/g, "''")}' -Force"`,
    { stdio: 'inherit' },
  );
  return EXTRACT_DIR;
}

function collectGltfFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectGltfFiles(full));
    else if (entry.name.endsWith('.gltf')) out.push(full);
  }
  return out;
}

async function convertOne(gltfPath) {
  const base = path.basename(gltfPath, '.gltf');
  const outGlb = path.join(OUT_DIR, `${base}.glb`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const doc = await io.read(gltfPath);
  await io.write(outGlb, doc);
  return { base, outGlb, r2Key: `models/nature/${base}.glb` };
}

async function main() {
  const srcDir = ensureExtracted();
  const gltfs = collectGltfFiles(srcDir);
  console.log(`Found ${gltfs.length} glTF files in ${srcDir}`);

  let converted = 0;
  let uploaded = 0;
  let failed = 0;

  for (const gltfPath of gltfs) {
    try {
      const { base, outGlb, r2Key } = await convertOne(gltfPath);
      converted++;
      console.log(`convert ${base}.glb (${fs.statSync(outGlb).size} bytes)`);

      if (!skipUpload && client) {
        const res = await uploadFile(client, cfg.bucket, outGlb, r2Key, { force, dryRun });
        if (res.ok && !res.skipped) uploaded++;
        else if (res.skipped) console.log(`  skip upload ${r2Key}`);
        else {
          console.error(`  FAIL upload ${r2Key}: ${res.reason}`);
          failed++;
        }
      }
    } catch (err) {
      console.error(`FAIL ${gltfPath}:`, err.message || err);
      failed++;
    }
  }

  console.log(`\nDone: ${converted} converted, ${uploaded} uploaded, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
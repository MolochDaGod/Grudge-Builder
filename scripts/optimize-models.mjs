#!/usr/bin/env node
/**
 * optimize-models.mjs — Batch optimize all GLB models for production.
 *
 * Runs gltf-transform on every .glb in public/models/ to:
 *   1. Weld + dedup + prune (cleanup)
 *   2. Compress geometry with Meshopt (fast decode, no WASM at runtime)
 *   3. Compress textures to WebP (smaller than PNG/JPEG)
 *   4. Generate LOD variants (50% and 15% triangle count)
 *
 * Usage:
 *   node scripts/optimize-models.mjs                    # optimize all
 *   node scripts/optimize-models.mjs --input raw/       # custom input dir
 *   node scripts/optimize-models.mjs --no-lod           # skip LOD generation
 *   node scripts/optimize-models.mjs --draco            # use Draco instead of Meshopt
 *
 * Requires:
 *   npm install @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions
 */

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  resample, prune, dedup, weld, quantize,
  meshopt, simplify, textureCompress,
} from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── CLI Args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const inputDir = args.find(a => a.startsWith('--input='))?.split('=')[1]
  || path.join(ROOT, 'public', 'models');
const outputDir = args.find(a => a.startsWith('--output='))?.split('=')[1]
  || inputDir; // in-place by default
const skipLod = args.includes('--no-lod');
const useDraco = args.includes('--draco');
const textureSize = parseInt(args.find(a => a.startsWith('--texture-size='))?.split('=')[1] || '1024');

// ── Setup ────────────────────────────────────────────────────────────────────

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
    'meshopt.decoder': MeshoptDecoder,
  });

// ── Find GLB files ───────────────────────────────────────────────────────────

function findGlbs(dir, prefix = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relPath = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      results.push(...findGlbs(path.join(dir, entry.name), relPath));
    } else if (entry.name.endsWith('.glb') && !entry.name.startsWith('lod')) {
      results.push(relPath);
    }
  }
  return results;
}

const glbFiles = findGlbs(inputDir);
console.log(`\n🔍 Found ${glbFiles.length} GLB files in ${inputDir}\n`);

if (glbFiles.length === 0) {
  console.log('No .glb files found. Nothing to optimize.');
  process.exit(0);
}

// ── Process ──────────────────────────────────────────────────────────────────

let processed = 0;
let totalSaved = 0;

for (const relPath of glbFiles) {
  const inputPath = path.join(inputDir, relPath);
  const outputPath = path.join(outputDir, relPath);
  const inputSize = fs.statSync(inputPath).size;

  console.log(`⚙️  ${relPath} (${(inputSize / 1024).toFixed(0)}KB)`);

  try {
    const doc = await io.read(inputPath);

    // Core optimization transforms
    const transforms = [
      weld(),
      dedup(),
      resample(),
      prune(),
    ];

    // Geometry compression
    if (useDraco) {
      // Draco requires draco3dgltf — skip if not installed
      try {
        const draco3d = await import('draco3dgltf');
        const { draco } = await import('@gltf-transform/functions');
        io.registerDependencies({
          'draco3d.encoder': await draco3d.createEncoderModule(),
          'draco3d.decoder': await draco3d.createDecoderModule(),
        });
        transforms.push(draco());
      } catch {
        console.log('  ⚠️  draco3dgltf not installed, falling back to meshopt');
        transforms.push(meshopt());
      }
    } else {
      transforms.push(meshopt());
    }

    // Texture compression (requires sharp)
    try {
      const sharp = (await import('sharp')).default;
      transforms.push(textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        resize: [textureSize, textureSize],
      }));
    } catch {
      console.log('  ⚠️  sharp not installed, skipping texture compression');
    }

    await doc.transform(...transforms);

    // Write optimized
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    await io.write(outputPath, doc);

    const outputSize = fs.statSync(outputPath).size;
    const saved = inputSize - outputSize;
    const pct = ((saved / inputSize) * 100).toFixed(1);
    totalSaved += Math.max(0, saved);

    console.log(`  ✅ ${(outputSize / 1024).toFixed(0)}KB (${saved > 0 ? `-${pct}%` : 'same'})`);

    // Generate LOD variants
    if (!skipLod) {
      for (const [suffix, ratio] of [['lod1', 0.5], ['lod2', 0.15]]) {
        try {
          const lodDoc = await io.read(outputPath);
          await lodDoc.transform(simplify({ ratio }));

          const lodName = relPath.replace('.glb', `-${suffix}.glb`);
          const lodPath = path.join(outputDir, lodName);
          await io.write(lodPath, lodDoc);

          const lodSize = fs.statSync(lodPath).size;
          console.log(`  📐 ${suffix}: ${(lodSize / 1024).toFixed(0)}KB (${(ratio * 100)}% tris)`);
        } catch (e) {
          console.log(`  ⚠️  LOD ${suffix} failed: ${e.message}`);
        }
      }
    }

    processed++;
  } catch (err) {
    console.error(`  ❌ Failed: ${err.message}`);
  }
}

console.log(`\n✨ Done! Processed ${processed}/${glbFiles.length} files.`);
if (totalSaved > 0) {
  console.log(`💾 Total saved: ${(totalSaved / 1024 / 1024).toFixed(1)}MB`);
}

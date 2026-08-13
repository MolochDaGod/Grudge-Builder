#!/usr/bin/env node
/**
 * Optimize scene (7).glb for R2 opener-scene.glb.
 * Keep node names (Object_163_1 / Object_16 / Object_111). No flatten, no join, no 72 m fit.
 *
 *   node scripts/optimize-airship-opener.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = process.argv[2] || 'D:\\Games\\Models\\scene (7).glb';
const OUT = process.argv[3] || path.join(ROOT, 'tmp', 'airship-zone', 'opener-scene.glb');

if (!fs.existsSync(SRC)) {
  console.error('missing source', SRC);
  process.exit(1);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(SRC);
await doc.transform(
  dedup(),
  prune(),
  textureCompress({
    encoder: sharp,
    targetFormat: 'webp',
    resize: [1024, 1024],
  }),
);
await io.write(OUT, doc);
const srcSt = fs.statSync(SRC);
const outSt = fs.statSync(OUT);
console.log(
  `wrote ${OUT}  ${(outSt.size / 1024 / 1024).toFixed(2)} MiB  (from ${(srcSt.size / 1024 / 1024).toFixed(2)} MiB)`,
);

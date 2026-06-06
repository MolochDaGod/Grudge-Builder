#!/usr/bin/env node
/**
 * calibrate-town-assets.mjs
 *
 * Reads every GLB in public/models/towns/**, parses the glTF JSON chunk,
 * computes the mesh bounding box from accessor min/max values, and outputs
 * a manifest with:
 *   - original bounding box dimensions (model units)
 *   - scale factor to normalize to a target size (meters)
 *   - center offset to place the model at world origin
 *
 * Target sizes:
 *   - exterior towns: ~80m across (fits within town navmesh bounds)
 *   - interiors: ~20m across
 *   - shrines/temples: ~15m across
 *   - arena: ~60m across
 *
 * Usage: node scripts/calibrate-town-assets.mjs
 * Output: public/models/towns/town-asset-manifest.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOWNS_DIR = path.resolve(__dirname, '..', 'public', 'models', 'towns');

// Target widths in meters per asset category
const TARGET_SIZES = {
  'crusade/exterior':    80,
  'crusade/tavern':      20,
  'crusade/cottage':     12,
  'crusade/cathedral':   30,
  'legion/dark_town':    80,
  'legion/orc_buildings': 60,  // full set spread
  'legion/madra_shrine': 15,
  'legion/cave_forge':   15,
  'fabled/platforms':    80,
  'fabled/dwarf_gate':   40,
  'fabled/cottage':      12,
  'fabled/library':      30,
  'fabled/forest_lodge': 15,
  'center/neutral_hub':  100,
  'center/arena':        60,
  'shared/inn':          20,
  'shared/modular_terrain': 40,
  'shared/training_field':  40,
};

// ── Parse GLB and extract bounding box ───────────────────────────────────────

function parseGLB(filePath) {
  const buf = fs.readFileSync(filePath);

  // GLB header: magic(4) version(4) length(4) chunkLen(4) chunkType(4) json...
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546C67) throw new Error('Not a valid GLB');

  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));

  // Collect min/max from all mesh accessors
  let globalMin = [Infinity, Infinity, Infinity];
  let globalMax = [-Infinity, -Infinity, -Infinity];

  const accessors = json.accessors || [];
  const meshes = json.meshes || [];

  for (const mesh of meshes) {
    for (const prim of (mesh.primitives || [])) {
      const posIdx = prim.attributes?.POSITION;
      if (posIdx === undefined) continue;
      const acc = accessors[posIdx];
      if (!acc || !acc.min || !acc.max) continue;

      for (let i = 0; i < 3; i++) {
        globalMin[i] = Math.min(globalMin[i], acc.min[i]);
        globalMax[i] = Math.max(globalMax[i], acc.max[i]);
      }
    }
  }

  // Handle case with no valid accessors
  if (globalMin[0] === Infinity) {
    return { valid: false };
  }

  const size = [
    globalMax[0] - globalMin[0],
    globalMax[1] - globalMin[1],
    globalMax[2] - globalMin[2],
  ];
  const center = [
    (globalMin[0] + globalMax[0]) / 2,
    (globalMin[1] + globalMax[1]) / 2,
    (globalMin[2] + globalMax[2]) / 2,
  ];

  return {
    valid: true,
    min: globalMin,
    max: globalMax,
    size,
    center,
    maxDimension: Math.max(...size),
    meshCount: meshes.length,
    materialCount: (json.materials || []).length,
    nodeCount: (json.nodes || []).length,
    fileSizeMB: +(buf.length / 1048576).toFixed(1),
  };
}

// ── Scan all GLBs ────────────────────────────────────────────────────────────

function scanDir(dir, baseDir = dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDir(full, baseDir));
    } else if (entry.name.endsWith('.glb')) {
      const relPath = path.relative(baseDir, full).replace(/\\/g, '/');
      results.push({ relPath, fullPath: full });
    }
  }
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const glbFiles = scanDir(TOWNS_DIR);
const manifest = {};

console.log(`Scanning ${glbFiles.length} GLBs in ${TOWNS_DIR}\n`);

for (const { relPath, fullPath } of glbFiles) {
  const key = relPath.replace('.glb', '');

  try {
    const info = parseGLB(fullPath);
    if (!info.valid) {
      console.log(`  SKIP ${relPath} — no position data`);
      continue;
    }

    const targetSize = TARGET_SIZES[key] || 40; // default 40m
    const scaleFactor = targetSize / info.maxDimension;

    const entry = {
      file: relPath,
      originalSize: info.size.map(v => +v.toFixed(2)),
      originalCenter: info.center.map(v => +v.toFixed(2)),
      maxDimension: +info.maxDimension.toFixed(2),
      scaleFactor: +scaleFactor.toFixed(4),
      scaledSize: info.size.map(v => +(v * scaleFactor).toFixed(1)),
      // Offset to center the model at world origin after scaling
      centerOffset: info.center.map(v => +(-v * scaleFactor).toFixed(2)),
      meshCount: info.meshCount,
      materialCount: info.materialCount,
      nodeCount: info.nodeCount,
      fileSizeMB: info.fileSizeMB,
      targetSize,
    };

    manifest[key] = entry;

    console.log(`  ${relPath}`);
    console.log(`    original: ${info.size.map(v => v.toFixed(1)).join(' × ')} (max ${info.maxDimension.toFixed(1)})`);
    console.log(`    target: ${targetSize}m → scale ${scaleFactor.toFixed(4)}`);
    console.log(`    scaled: ${entry.scaledSize.join(' × ')} | offset: [${entry.centerOffset.join(', ')}]`);
    console.log(`    ${info.meshCount} meshes, ${info.materialCount} mats, ${info.fileSizeMB} MB`);
    console.log('');
  } catch (err) {
    console.log(`  ERROR ${relPath}: ${err.message}`);
  }
}

// ── Write manifest ───────────────────────────────────────────────────────────

const outPath = path.join(TOWNS_DIR, 'town-asset-manifest.json');
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`\nManifest written to ${outPath}`);
console.log(`${Object.keys(manifest).length} assets calibrated.`);

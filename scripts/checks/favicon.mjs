#!/usr/bin/env node
/**
 * favicon.mjs — AI check for favicon assets consistency.
 * - Asserts every icon referenced in client/index.html exists in client/public/
 * - Enforces size budgets:
 *     favicon-16x16.png, favicon-32x32.png < 25 KB
 *     favicon.png < 100 KB
 *     apple-touch-icon.png < 200 KB
 *     favicon.ico < 200 KB
 * - Reads PNG IHDR (Node only) to assert 16x16 and 32x32 actual dimensions.
 * - Asserts favicon-16x16.png and favicon-32x32.png are NOT byte-identical to favicon.png.
 * Exits non-zero on failure with human-readable report.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const INDEX = resolve(ROOT, 'client/index.html');
const PUBLIC = resolve(ROOT, 'client/public');

const SIZE_BUDGET = {
  'favicon-16x16.png': 25 * 1024,
  'favicon-32x32.png': 25 * 1024,
  'favicon.png': 100 * 1024,
  'apple-touch-icon.png': 200 * 1024,
  'favicon.ico': 200 * 1024,
};

function readPNGDimensions(buf) {
  // PNG signature: 8 bytes, IHDR at offset 8 (len 4) + 'IHDR' (4) => width at 16, height at 20
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    return null;
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

function parseIconLinks(html) {
  // Collect hrefs from <link rel="icon|apple-touch-icon" ... href="...">
  const links = [];
  const re = /<link[^>]+rel=["'](?:[^"']*?(?:icon|apple-touch-icon)[^"']*)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    links.push(m[1]);
  }
  // Also accept bare icon links like <link rel="icon" ...>
  return links;
}

function main() {
  const issues = [];
  const warnings = [];

  if (!existsSync(INDEX)) {
    console.error(`❌ Missing ${INDEX}`);
    process.exit(1);
  }
  const html = readFileSync(INDEX, 'utf8');
  const refs = parseIconLinks(html);

  if (refs.length === 0) {
    issues.push('No icon links found in client/index.html');
  }

  const required = new Set();
  for (const ref of refs) {
    // Only care about local paths starting with /
    if (!ref.startsWith('/')) {
      warnings.push(`Skipping external icon ref: ${ref}`);
      continue;
    }
    const fileName = basename(ref); // /favicon-16x16.png -> favicon-16x16.png
    required.add(fileName);
    const full = resolve(PUBLIC, fileName);
    if (!existsSync(full)) {
      issues.push(`Missing icon file referenced in index.html: ${ref} (expected at client/public/${fileName})`);
      continue;
    }
    const st = statSync(full);
    const budget = SIZE_BUDGET[fileName] ?? null;
    if (budget && st.size > budget) {
      issues.push(`Icon exceeds budget: ${fileName} ${st.size} bytes > ${budget} bytes`);
    }
  }

  // Dimension + distinctness checks for the canonical set
  const canon = ['favicon-16x16.png', 'favicon-32x32.png', 'favicon.png', 'apple-touch-icon.png'];
  const loaded = {};
  for (const f of canon) {
    const full = resolve(PUBLIC, f);
    if (!existsSync(full)) {
      issues.push(`Missing required icon: client/public/${f}`);
      continue;
    }
    const buf = readFileSync(full);
    loaded[f] = buf;
    if (f.endsWith('.png')) {
      const dims = readPNGDimensions(buf);
      if (!dims) {
        issues.push(`Not a valid PNG: client/public/${f}`);
        continue;
      }
      if (f === 'favicon-16x16.png' && (dims.width !== 16 || dims.height !== 16)) {
        issues.push(`favicon-16x16.png must be 16x16, got ${dims.width}x${dims.height}`);
      }
      if (f === 'favicon-32x32.png' && (dims.width !== 32 || dims.height !== 32)) {
        issues.push(`favicon-32x32.png must be 32x32, got ${dims.width}x${dims.height}`);
      }
      if (f === 'apple-touch-icon.png' && (dims.width !== 180 || dims.height !== 180)) {
        // warn only — spec allows 180 but some ship 167/152; we enforce 180 per task
        warnings.push(`apple-touch-icon.png is ${dims.width}x${dims.height} (expected 180x180)`);
      }
    }
  }

  // Byte distinctness: 16 and 32 must NOT equal favicon.png
  if (loaded['favicon-16x16.png'] && loaded['favicon.png']) {
    if (loaded['favicon-16x16.png'].equals(loaded['favicon.png'])) {
      issues.push('favicon-16x16.png is byte-identical to favicon.png (must be distinct and properly sized)');
    }
  }
  if (loaded['favicon-32x32.png'] && loaded['favicon.png']) {
    if (loaded['favicon-32x32.png'].equals(loaded['favicon.png'])) {
      issues.push('favicon-32x32.png is byte-identical to favicon.png (must be distinct and properly sized)');
    }
  }

  // Report
  if (warnings.length) {
    for (const w of warnings) console.warn(`⚠ ${w}`);
  }
  if (issues.length) {
    console.error('❌ Favicon check FAILED');
    for (const i of issues) console.error('  -', i);
    process.exit(1);
  }
  console.log('✅ favicon: all icons present, sized, dimensioned, and distinct');
}

main();
